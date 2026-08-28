-- PanelLako v0.10.1 - announcement delivery worker closure
--
-- Adds a service-role-only lease protocol around the PII-free audience outbox.
-- Delivery context remains resolved by the trusted worker at send time so an
-- old queue snapshot can never freeze an email address or notification choice.

BEGIN;

ALTER TABLE public.announcement_delivery_outbox
  ADD COLUMN IF NOT EXISTS claim_token uuid,
  ADD COLUMN IF NOT EXISTS claim_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz;

-- A worker did not exist before this migration. Recover any manually-created
-- legacy PROCESSING rows into the retry queue before enforcing lease shape.
UPDATE public.announcement_delivery_outbox
SET
  status = 'FAILED',
  available_at = now(),
  claimed_at = NULL,
  claim_token = NULL,
  claim_expires_at = NULL,
  failure_code = 'LEGACY_CLAIM_RECOVERED',
  failed_at = now(),
  updated_at = now()
WHERE status = 'PROCESSING'
  AND (claim_token IS NULL OR claim_expires_at IS NULL OR claimed_at IS NULL);

ALTER TABLE public.announcement_delivery_outbox
  DROP CONSTRAINT IF EXISTS announcement_delivery_outbox_status_check;
ALTER TABLE public.announcement_delivery_outbox
  ADD CONSTRAINT announcement_delivery_outbox_status_check
  CHECK (status IN (
    'PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED', 'DEAD_LETTER'
  ));

ALTER TABLE public.announcement_delivery_outbox
  DROP CONSTRAINT IF EXISTS announcement_delivery_outbox_claim_shape_check;
ALTER TABLE public.announcement_delivery_outbox
  ADD CONSTRAINT announcement_delivery_outbox_claim_shape_check
  CHECK (
    (
      status = 'PROCESSING'
      AND claimed_at IS NOT NULL
      AND claim_token IS NOT NULL
      AND claim_expires_at IS NOT NULL
      AND claim_expires_at > claimed_at
    )
    OR (
      status <> 'PROCESSING'
      AND claim_token IS NULL
      AND claim_expires_at IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS announcement_delivery_outbox_claim_idx
  ON public.announcement_delivery_outbox(status, available_at, claim_expires_at, created_at)
  WHERE status IN ('PENDING', 'FAILED', 'PROCESSING');

CREATE OR REPLACE FUNCTION public.claim_announcement_delivery_batch(
  p_limit integer DEFAULT 10,
  p_lease_seconds integer DEFAULT 600,
  p_max_attempts integer DEFAULT 5
)
RETURNS TABLE (
  outbox_id uuid,
  workspace_id uuid,
  announcement_id uuid,
  recipient_profile_id uuid,
  attempt_count integer,
  claim_token uuid,
  claimed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
  v_lease_seconds integer := LEAST(GREATEST(COALESCE(p_lease_seconds, 600), 60), 1800);
  v_max_attempts integer := LEAST(GREATEST(COALESCE(p_max_attempts, 5), 1), 20);
BEGIN
  -- A process can disappear after claiming its final attempt. Close those
  -- expired leases in a bounded, lock-safe pass instead of leaving them stuck.
  WITH exhausted AS (
    SELECT candidate.id
    FROM public.announcement_delivery_outbox AS candidate
    WHERE candidate.attempt_count >= v_max_attempts
      AND (
        (
          candidate.status IN ('PENDING', 'FAILED')
          AND candidate.available_at <= v_now
        )
        OR (
          candidate.status = 'PROCESSING'
          AND candidate.claim_expires_at <= v_now
        )
      )
    ORDER BY COALESCE(candidate.claim_expires_at, candidate.available_at), candidate.created_at, candidate.id
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.announcement_delivery_outbox AS outbox
  SET
    status = 'DEAD_LETTER',
    claim_token = NULL,
    claim_expires_at = NULL,
    failed_at = COALESCE(outbox.failed_at, v_now),
    dead_lettered_at = COALESCE(outbox.dead_lettered_at, v_now),
    failure_code = COALESCE(outbox.failure_code, 'MAX_ATTEMPTS_EXHAUSTED'),
    updated_at = v_now
  FROM exhausted
  WHERE outbox.id = exhausted.id;

  RETURN QUERY
  WITH candidates AS (
    SELECT candidate.id
    FROM public.announcement_delivery_outbox AS candidate
    WHERE candidate.attempt_count < v_max_attempts
      AND (
        (
          candidate.status IN ('PENDING', 'FAILED')
          AND candidate.available_at <= v_now
        )
        OR (
          candidate.status = 'PROCESSING'
          AND candidate.claim_expires_at <= v_now
        )
      )
    ORDER BY COALESCE(candidate.claim_expires_at, candidate.available_at), candidate.created_at, candidate.id
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  ), claimed AS (
    UPDATE public.announcement_delivery_outbox AS outbox
    SET
      status = 'PROCESSING',
      attempt_count = outbox.attempt_count + 1,
      claimed_at = v_now,
      claim_token = gen_random_uuid(),
      claim_expires_at = v_now + make_interval(secs => v_lease_seconds),
      failed_at = NULL,
      failure_code = NULL,
      dead_lettered_at = NULL,
      provider_message_id = NULL,
      updated_at = v_now
    FROM candidates
    WHERE outbox.id = candidates.id
    RETURNING
      outbox.id,
      outbox.workspace_id,
      outbox.announcement_id,
      outbox.recipient_profile_id,
      outbox.attempt_count,
      outbox.claim_token,
      outbox.claimed_at
  )
  SELECT
    claimed.id,
    claimed.workspace_id,
    claimed.announcement_id,
    claimed.recipient_profile_id,
    claimed.attempt_count,
    claimed.claim_token,
    claimed.claimed_at
  FROM claimed
  ORDER BY claimed.claimed_at, claimed.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_announcement_delivery(
  p_outbox_id uuid,
  p_claim_token uuid,
  p_provider_message_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
  v_provider_message_id text := NULLIF(BTRIM(COALESCE(p_provider_message_id, '')), '');
BEGIN
  IF p_outbox_id IS NULL OR p_claim_token IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Outbox id and claim token are required';
  END IF;
  IF v_provider_message_id IS NULL OR v_provider_message_id LIKE 'stub\_%' ESCAPE '\' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'A real provider message id is required',
      DETAIL = '{"error_code":"PROVIDER_MESSAGE_ID_INVALID"}';
  END IF;

  UPDATE public.announcement_delivery_outbox AS outbox
  SET
    status = 'DELIVERED',
    provider_message_id = LEFT(v_provider_message_id, 255),
    delivered_at = clock_timestamp(),
    failed_at = NULL,
    failure_code = NULL,
    dead_lettered_at = NULL,
    claim_token = NULL,
    claim_expires_at = NULL,
    updated_at = clock_timestamp()
  WHERE outbox.id = p_outbox_id
    AND outbox.status = 'PROCESSING'
    AND outbox.claim_token = p_claim_token
  RETURNING outbox.status INTO v_status;

  IF FOUND THEN
    RETURN 'DELIVERED';
  END IF;

  SELECT outbox.status INTO v_status
  FROM public.announcement_delivery_outbox AS outbox
  WHERE outbox.id = p_outbox_id;

  IF v_status = 'DELIVERED' THEN
    RETURN 'ALREADY_DELIVERED';
  END IF;
  IF v_status IS NULL THEN
    RETURN 'NOT_FOUND';
  END IF;
  RETURN 'CLAIM_LOST';
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_announcement_delivery(
  p_outbox_id uuid,
  p_claim_token uuid,
  p_failure_code text,
  p_retryable boolean DEFAULT true,
  p_max_attempts integer DEFAULT 5,
  p_base_backoff_seconds integer DEFAULT 30,
  p_max_backoff_seconds integer DEFAULT 3600
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_status text;
  v_attempt_count integer;
  v_max_attempts integer := LEAST(GREATEST(COALESCE(p_max_attempts, 5), 1), 20);
  v_base_backoff integer := LEAST(GREATEST(COALESCE(p_base_backoff_seconds, 30), 5), 3600);
  v_max_backoff integer := LEAST(GREATEST(COALESCE(p_max_backoff_seconds, 3600), 5), 86400);
  v_backoff integer;
  v_failure_code text;
BEGIN
  IF p_outbox_id IS NULL OR p_claim_token IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Outbox id and claim token are required';
  END IF;

  v_failure_code := LEFT(
    REGEXP_REPLACE(UPPER(COALESCE(p_failure_code, 'WORKER_FAILURE')), '[^A-Z0-9_]', '_', 'g'),
    64
  );
  IF v_failure_code = '' THEN
    v_failure_code := 'WORKER_FAILURE';
  END IF;

  SELECT outbox.status, outbox.attempt_count
  INTO v_status, v_attempt_count
  FROM public.announcement_delivery_outbox AS outbox
  WHERE outbox.id = p_outbox_id
    AND outbox.status = 'PROCESSING'
    AND outbox.claim_token = p_claim_token
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT outbox.status INTO v_status
    FROM public.announcement_delivery_outbox AS outbox
    WHERE outbox.id = p_outbox_id;
    IF v_status IN ('FAILED', 'DEAD_LETTER', 'CANCELLED', 'DELIVERED') THEN
      RETURN 'ALREADY_' || v_status;
    END IF;
    IF v_status IS NULL THEN
      RETURN 'NOT_FOUND';
    END IF;
    RETURN 'CLAIM_LOST';
  END IF;

  IF NOT COALESCE(p_retryable, false) OR v_attempt_count >= v_max_attempts THEN
    UPDATE public.announcement_delivery_outbox AS outbox
    SET
      status = 'DEAD_LETTER',
      failure_code = v_failure_code,
      failed_at = v_now,
      dead_lettered_at = v_now,
      claim_token = NULL,
      claim_expires_at = NULL,
      updated_at = v_now
    WHERE outbox.id = p_outbox_id;
    RETURN 'DEAD_LETTER';
  END IF;

  v_backoff := LEAST(
    v_max_backoff,
    (v_base_backoff::numeric * POWER(2::numeric, GREATEST(v_attempt_count - 1, 0)))::integer
  );

  UPDATE public.announcement_delivery_outbox AS outbox
  SET
    status = 'FAILED',
    failure_code = v_failure_code,
    failed_at = v_now,
    available_at = v_now + make_interval(secs => v_backoff),
    claim_token = NULL,
    claim_expires_at = NULL,
    updated_at = v_now
  WHERE outbox.id = p_outbox_id;
  RETURN 'RETRY_SCHEDULED';
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_announcement_delivery(
  p_outbox_id uuid,
  p_claim_token uuid,
  p_reason_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
  v_reason_code text;
BEGIN
  IF p_outbox_id IS NULL OR p_claim_token IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Outbox id and claim token are required';
  END IF;

  v_reason_code := LEFT(
    REGEXP_REPLACE(UPPER(COALESCE(p_reason_code, 'DELIVERY_CANCELLED')), '[^A-Z0-9_]', '_', 'g'),
    64
  );
  IF v_reason_code = '' THEN
    v_reason_code := 'DELIVERY_CANCELLED';
  END IF;

  UPDATE public.announcement_delivery_outbox AS outbox
  SET
    status = 'CANCELLED',
    failure_code = v_reason_code,
    failed_at = clock_timestamp(),
    claim_token = NULL,
    claim_expires_at = NULL,
    updated_at = clock_timestamp()
  WHERE outbox.id = p_outbox_id
    AND outbox.status = 'PROCESSING'
    AND outbox.claim_token = p_claim_token
  RETURNING outbox.status INTO v_status;

  IF FOUND THEN
    RETURN 'CANCELLED';
  END IF;

  SELECT outbox.status INTO v_status
  FROM public.announcement_delivery_outbox AS outbox
  WHERE outbox.id = p_outbox_id;
  IF v_status = 'CANCELLED' THEN
    RETURN 'ALREADY_CANCELLED';
  END IF;
  IF v_status IS NULL THEN
    RETURN 'NOT_FOUND';
  END IF;
  RETURN 'CLAIM_LOST';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_announcement_delivery_batch(integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_announcement_delivery(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_announcement_delivery(uuid, uuid, text, boolean, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_announcement_delivery(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_announcement_delivery_batch(integer, integer, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_announcement_delivery(uuid, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_announcement_delivery(uuid, uuid, text, boolean, integer, integer, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_announcement_delivery(uuid, uuid, text)
  TO service_role;

COMMIT;
