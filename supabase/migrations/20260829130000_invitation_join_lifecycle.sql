-- PanelLako v0.10.4 - membership invitation revocation and requester-owned join-request lifecycle.
--
-- This migration closes three state transitions without granting direct table
-- writes to authenticated clients:
--   * an authorized manager can revoke a pending resident invitation;
--   * a requester can cancel their own active join request;
--   * a requester can append opaque evidence and resubmit NEEDS_EVIDENCE.

BEGIN;

-- ---------------------------------------------------------------------------
-- Durable lifecycle metadata.
-- ---------------------------------------------------------------------------

ALTER TABLE public.membership_invitations
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by_profile_id uuid,
  ADD COLUMN IF NOT EXISTS revocation_reason text;

ALTER TABLE public.join_requests
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by_profile_id uuid,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'membership_invitations_revoked_by_fk'
      AND conrelid = 'public.membership_invitations'::regclass
  ) THEN
    ALTER TABLE public.membership_invitations
      ADD CONSTRAINT membership_invitations_revoked_by_fk
      FOREIGN KEY (revoked_by_profile_id)
      REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'join_requests_cancelled_by_fk'
      AND conrelid = 'public.join_requests'::regclass
  ) THEN
    ALTER TABLE public.join_requests
      ADD CONSTRAINT join_requests_cancelled_by_fk
      FOREIGN KEY (cancelled_by_profile_id)
      REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'join_requests_workspace_id_id_uq'
      AND conrelid = 'public.join_requests'::regclass
  ) THEN
    ALTER TABLE public.join_requests
      ADD CONSTRAINT join_requests_workspace_id_id_uq UNIQUE (workspace_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'join_requests_workspace_id_id_requester_uq'
      AND conrelid = 'public.join_requests'::regclass
  ) THEN
    ALTER TABLE public.join_requests
      ADD CONSTRAINT join_requests_workspace_id_id_requester_uq
      UNIQUE (workspace_id, id, requester_profile_id);
  END IF;
END;
$$;

-- Backfill any legacy terminal rows before validating the new state shape.
UPDATE public.membership_invitations
SET revoked_at = COALESCE(revoked_at, updated_at, created_at),
    revoked_by_profile_id = COALESCE(revoked_by_profile_id, created_by_profile_id),
    revocation_reason = COALESCE(NULLIF(BTRIM(revocation_reason), ''), 'LEGACY_REVOKED')
WHERE status = 'REVOKED'
  AND (
    revoked_at IS NULL
    OR revoked_by_profile_id IS NULL
    OR NULLIF(BTRIM(revocation_reason), '') IS NULL
  );

UPDATE public.join_requests
SET cancelled_at = COALESCE(cancelled_at, updated_at, created_at),
    cancelled_by_profile_id = COALESCE(cancelled_by_profile_id, requester_profile_id),
    cancellation_reason = COALESCE(NULLIF(BTRIM(cancellation_reason), ''), 'LEGACY_CANCELLED')
WHERE status = 'CANCELLED'
  AND (
    cancelled_at IS NULL
    OR cancelled_by_profile_id IS NULL
    OR NULLIF(BTRIM(cancellation_reason), '') IS NULL
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'membership_invitations_revocation_shape_check'
      AND conrelid = 'public.membership_invitations'::regclass
  ) THEN
    ALTER TABLE public.membership_invitations
      ADD CONSTRAINT membership_invitations_revocation_shape_check CHECK (
        (
          status = 'REVOKED'
          AND revoked_at IS NOT NULL
          AND NULLIF(BTRIM(revocation_reason), '') IS NOT NULL
        )
        OR (
          status <> 'REVOKED'
          AND revoked_at IS NULL
          AND revoked_by_profile_id IS NULL
          AND revocation_reason IS NULL
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'join_requests_cancellation_shape_check'
      AND conrelid = 'public.join_requests'::regclass
  ) THEN
    ALTER TABLE public.join_requests
      ADD CONSTRAINT join_requests_cancellation_shape_check CHECK (
        (
          status = 'CANCELLED'
          AND cancelled_at IS NOT NULL
          AND NULLIF(BTRIM(cancellation_reason), '') IS NOT NULL
          AND (
            cancelled_by_profile_id IS NULL
            OR cancelled_by_profile_id = requester_profile_id
          )
        )
        OR (
          status <> 'CANCELLED'
          AND cancelled_at IS NULL
          AND cancelled_by_profile_id IS NULL
          AND cancellation_reason IS NULL
        )
      ) NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.membership_invitations
  VALIDATE CONSTRAINT membership_invitations_revocation_shape_check;
ALTER TABLE public.join_requests
  VALIDATE CONSTRAINT join_requests_cancellation_shape_check;

-- Evidence references are deliberately opaque locators, not filenames, URLs,
-- document bodies or PII-bearing free text. A bounded array supports a single
-- resubmission containing several independently stored proofs.
CREATE OR REPLACE FUNCTION private.is_valid_opaque_evidence_references(
  p_references text[]
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT
    p_references IS NOT NULL
    AND CARDINALITY(p_references) BETWEEN 1 AND 10
    AND CARDINALITY(p_references) = (
      SELECT COUNT(DISTINCT reference_value)::integer
      FROM UNNEST(p_references) AS reference_value
    )
    AND NOT EXISTS (
      SELECT 1
      FROM UNNEST(p_references) AS reference_value
      WHERE reference_value IS NULL
        OR reference_value IS DISTINCT FROM BTRIM(reference_value)
        OR CHAR_LENGTH(reference_value) NOT BETWEEN 5 AND 223
        OR reference_value !~ '^[a-z][a-z0-9_-]{1,31}:[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$'
    );
$$;

REVOKE ALL ON FUNCTION private.is_valid_opaque_evidence_references(text[])
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_valid_opaque_evidence_references(text[])
  TO service_role;

CREATE TABLE IF NOT EXISTS public.join_request_evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  join_request_id uuid NOT NULL,
  requester_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  request_version integer NOT NULL,
  evidence_references text[] NOT NULL,
  reason text NOT NULL,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT join_request_evidence_events_request_fk
    FOREIGN KEY (workspace_id, join_request_id, requester_profile_id)
    REFERENCES public.join_requests(workspace_id, id, requester_profile_id) ON DELETE RESTRICT,
  CONSTRAINT join_request_evidence_events_version_check CHECK (request_version > 1),
  CONSTRAINT join_request_evidence_events_references_check CHECK (
    private.is_valid_opaque_evidence_references(evidence_references)
  ),
  CONSTRAINT join_request_evidence_events_reason_check CHECK (
    CHAR_LENGTH(BTRIM(reason)) BETWEEN 3 AND 500
  ),
  CONSTRAINT join_request_evidence_events_actor_idempotency_uq
    UNIQUE (requester_profile_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS join_request_evidence_events_request_idx
  ON public.join_request_evidence_events (workspace_id, join_request_id, request_version DESC);

ALTER TABLE public.join_request_evidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_request_evidence_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS join_request_evidence_events_scoped_select
  ON public.join_request_evidence_events;
CREATE POLICY join_request_evidence_events_scoped_select
ON public.join_request_evidence_events
FOR SELECT TO authenticated
USING (
  requester_profile_id = auth.uid()
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'MEMBERSHIP_REVIEW')
);

-- No authenticated INSERT, UPDATE or DELETE policy exists. State changes are
-- possible only through the audited SECURITY DEFINER command below.
REVOKE ALL ON TABLE public.join_request_evidence_events
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.join_request_evidence_events TO authenticated;
GRANT SELECT ON TABLE public.join_request_evidence_events TO service_role;

CREATE OR REPLACE FUNCTION private.reject_join_request_evidence_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000', MESSAGE = 'Join request evidence events are immutable',
    DETAIL = '{"error_code":"JOIN_REQUEST_EVIDENCE_EVENT_IMMUTABLE"}';
END;
$$;

REVOKE ALL ON FUNCTION private.reject_join_request_evidence_event_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reject_join_request_evidence_event_mutation()
  TO service_role;

DROP TRIGGER IF EXISTS trg_join_request_evidence_events_immutable
  ON public.join_request_evidence_events;
CREATE TRIGGER trg_join_request_evidence_events_immutable
BEFORE UPDATE OR DELETE ON public.join_request_evidence_events
FOR EACH ROW EXECUTE FUNCTION private.reject_join_request_evidence_event_mutation();

-- The optimistic requester commands need the authoritative row version. The
-- new field is appended so every pre-existing output column keeps its position
-- and meaning for current callers.
DROP FUNCTION IF EXISTS public.list_my_join_requests();
CREATE OR REPLACE FUNCTION public.list_my_join_requests()
RETURNS TABLE (
  request_id uuid,
  workspace_id uuid,
  workspace_name text,
  request_status text,
  requested_relationship_type text,
  requested_unit_id uuid,
  requested_unit_designation text,
  review_reason text,
  submitted_at timestamptz,
  expires_at timestamptz,
  latest_counter_offer_id uuid,
  latest_counter_offer_relationship_type text,
  latest_counter_offer_unit_id uuid,
  latest_counter_offer_unit_designation text,
  latest_counter_offer_reason text,
  latest_counter_offer_accepted boolean,
  request_version integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT
    jr.id,
    jr.workspace_id,
    w.name,
    jr.status,
    jr.requested_relationship_type,
    jr.requested_unit_id,
    requested_unit.designation,
    jr.review_reason,
    jr.created_at,
    jr.expires_at,
    latest_offer.id,
    latest_offer.offered_relationship_type,
    latest_offer.offered_unit_id,
    offered_unit.designation,
    latest_offer.reason,
    CASE
      WHEN latest_offer.id IS NULL THEN false
      ELSE EXISTS (
        SELECT 1
        FROM public.join_request_offers accepted
        WHERE accepted.supersedes_offer_id = latest_offer.id
          AND accepted.event_type = 'ACCEPTED'
      )
    END,
    jr.version
  FROM public.join_requests jr
  JOIN public.workspaces w ON w.id = jr.workspace_id
  LEFT JOIN public.units requested_unit
    ON requested_unit.id = jr.requested_unit_id
   AND requested_unit.workspace_id = jr.workspace_id
  LEFT JOIN LATERAL (
    SELECT jro.id, jro.offered_relationship_type, jro.offered_unit_id, jro.reason
    FROM public.join_request_offers jro
    WHERE jro.join_request_id = jr.id
      AND jro.workspace_id = jr.workspace_id
      AND jro.event_type = 'COUNTER_OFFER'
    ORDER BY jro.created_at DESC, jro.id DESC
    LIMIT 1
  ) latest_offer ON true
  LEFT JOIN public.units offered_unit
    ON offered_unit.id = latest_offer.offered_unit_id
   AND offered_unit.workspace_id = jr.workspace_id
  WHERE auth.uid() IS NOT NULL
    AND jr.requester_profile_id = auth.uid()
  ORDER BY jr.created_at DESC, jr.id DESC;
$$;

REVOKE ALL ON FUNCTION public.list_my_join_requests()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_join_requests()
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Authorized invitation revocation.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.revoke_membership_invitation(
  p_invitation_id uuid,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  invitation_id uuid,
  invitation_status text,
  revoked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_invitation public.membership_invitations%ROWTYPE;
  v_reason text := NULLIF(BTRIM(COALESCE(p_reason, '')), '');
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  IF v_reason IS NULL OR CHAR_LENGTH(v_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Invitation revocation reason is invalid',
      DETAIL = '{"error_code":"INVITATION_REVOCATION_REASON_INVALID"}';
  END IF;

  SELECT * INTO v_invitation
  FROM public.membership_invitations mi
  WHERE mi.id = p_invitation_id
  FOR UPDATE;

  IF v_invitation.id IS NULL
     OR NOT private.has_workspace_capability(
       v_actor,
       v_invitation.workspace_id,
       'MEMBERSHIP_INVITE'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Membership invitation is not revocable',
      DETAIL = '{"error_code":"MEMBERSHIP_INVITATION_NOT_REVOCABLE"}';
  END IF;

  PERFORM private.require_workspace_capability(
    v_invitation.workspace_id,
    'MEMBERSHIP_INVITE'
  );
  PERFORM private.require_recent_aal2(interval '15 minutes');

  v_existing := private.lock_idempotent_command(
    v_actor,
    'revoke_membership_invitation',
    p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    IF v_existing <> p_invitation_id
       OR v_invitation.status <> 'REVOKED'
       OR v_invitation.revoked_by_profile_id IS DISTINCT FROM v_actor
       OR v_invitation.revocation_reason IS DISTINCT FROM v_reason THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505', MESSAGE = 'Idempotency key was reused with different input',
        DETAIL = '{"error_code":"IDEMPOTENCY_CONFLICT"}';
    END IF;

    RETURN QUERY
    SELECT mi.id, mi.status, mi.revoked_at
    FROM public.membership_invitations mi
    WHERE mi.id = v_existing;
    RETURN;
  END IF;

  IF v_invitation.status <> 'PENDING' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Membership invitation is not pending',
      DETAIL = '{"error_code":"MEMBERSHIP_INVITATION_NOT_PENDING"}';
  END IF;

  UPDATE public.membership_invitations AS mi
  SET status = 'REVOKED',
      revoked_at = now(),
      revoked_by_profile_id = v_actor,
      revocation_reason = v_reason,
      updated_at = now()
  WHERE mi.id = v_invitation.id;

  PERFORM private.record_idempotent_command(
    v_actor,
    'revoke_membership_invitation',
    p_idempotency_key,
    v_invitation.id
  );
  PERFORM private.write_authorization_event(
    v_invitation.workspace_id,
    'MEMBERSHIP_INVITATION_REVOKED',
    'membership_invitation',
    v_invitation.id,
    'STATE_CHANGE',
    'MANAGER_REVOKED',
    jsonb_build_object(
      'relationship_type', v_invitation.relationship_type,
      'unit_id', v_invitation.unit_id
    )
  );

  RETURN QUERY
  SELECT mi.id, mi.status, mi.revoked_at
  FROM public.membership_invitations mi
  WHERE mi.id = v_invitation.id;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_membership_invitation(uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_membership_invitation(uuid, text, uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Requester-owned cancellation with optimistic concurrency.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_join_request(
  p_request_id uuid,
  p_expected_version integer,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  request_version integer,
  cancelled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_request public.join_requests%ROWTYPE;
  v_reason text := NULLIF(BTRIM(COALESCE(p_reason, '')), '');
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  IF p_expected_version IS NULL OR p_expected_version < 1
     OR v_reason IS NULL OR CHAR_LENGTH(v_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Join request cancellation input is invalid',
      DETAIL = '{"error_code":"JOIN_REQUEST_CANCELLATION_INPUT_INVALID"}';
  END IF;

  v_existing := private.lock_idempotent_command(
    v_actor,
    'cancel_join_request',
    p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_request
    FROM public.join_requests jr
    WHERE jr.id = v_existing
      AND jr.requester_profile_id = v_actor;

    IF v_existing <> p_request_id
       OR v_request.id IS NULL
       OR v_request.status <> 'CANCELLED'
       OR v_request.cancelled_by_profile_id IS DISTINCT FROM v_actor
       OR v_request.cancellation_reason IS DISTINCT FROM v_reason THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505', MESSAGE = 'Idempotency key was reused with different input',
        DETAIL = '{"error_code":"IDEMPOTENCY_CONFLICT"}';
    END IF;

    RETURN QUERY
    SELECT jr.id, jr.status, jr.version, jr.cancelled_at
    FROM public.join_requests jr
    WHERE jr.id = v_existing;
    RETURN;
  END IF;

  SELECT * INTO v_request
  FROM public.join_requests jr
  WHERE jr.id = p_request_id
    AND jr.requester_profile_id = v_actor
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Join request is not cancellable',
      DETAIL = '{"error_code":"JOIN_REQUEST_NOT_CANCELLABLE"}';
  END IF;

  IF v_request.version <> p_expected_version THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001', MESSAGE = 'Join request version conflict',
      DETAIL = jsonb_build_object(
        'error_code', 'JOIN_REQUEST_VERSION_CONFLICT',
        'current_version', v_request.version
      )::text;
  END IF;

  IF v_request.status NOT IN ('DRAFT', 'PENDING', 'NEEDS_EVIDENCE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request is not in a cancellable state',
      DETAIL = '{"error_code":"JOIN_REQUEST_NOT_CANCELLABLE"}';
  END IF;

  UPDATE public.join_requests AS jr
  SET status = 'CANCELLED',
      version = jr.version + 1,
      cancelled_at = now(),
      cancelled_by_profile_id = v_actor,
      cancellation_reason = v_reason,
      updated_at = now()
  WHERE jr.id = v_request.id
    AND jr.version = p_expected_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001', MESSAGE = 'Join request version conflict',
      DETAIL = '{"error_code":"JOIN_REQUEST_VERSION_CONFLICT"}';
  END IF;

  PERFORM private.record_idempotent_command(
    v_actor,
    'cancel_join_request',
    p_idempotency_key,
    v_request.id
  );
  PERFORM private.write_authorization_event(
    v_request.workspace_id,
    'JOIN_REQUEST_CANCELLED',
    'join_request',
    v_request.id,
    'STATE_CHANGE',
    'REQUESTER_CANCELLED',
    jsonb_build_object('request_version', v_request.version + 1)
  );

  RETURN QUERY
  SELECT jr.id, jr.status, jr.version, jr.cancelled_at
  FROM public.join_requests jr
  WHERE jr.id = v_request.id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_join_request(uuid, integer, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_join_request(uuid, integer, text, uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Requester-owned evidence supplement and resubmission.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resubmit_join_request_evidence(
  p_request_id uuid,
  p_expected_version integer,
  p_evidence_references text[],
  p_reason text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  request_version integer,
  evidence_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_request public.join_requests%ROWTYPE;
  v_event public.join_request_evidence_events%ROWTYPE;
  v_event_id uuid := gen_random_uuid();
  v_references text[];
  v_reason text := NULLIF(BTRIM(COALESCE(p_reason, '')), '');
  v_next_version integer;
  v_latest_review_event text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  SELECT COALESCE(ARRAY_AGG(BTRIM(reference_value) ORDER BY ordinal_position), ARRAY[]::text[])
  INTO v_references
  FROM UNNEST(COALESCE(p_evidence_references, ARRAY[]::text[]))
    WITH ORDINALITY AS submitted(reference_value, ordinal_position);

  IF p_expected_version IS NULL OR p_expected_version < 1
     OR NOT private.is_valid_opaque_evidence_references(v_references)
     OR v_reason IS NULL OR CHAR_LENGTH(v_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Join request evidence input is invalid',
      DETAIL = '{"error_code":"JOIN_REQUEST_EVIDENCE_INPUT_INVALID"}';
  END IF;

  v_existing := private.lock_idempotent_command(
    v_actor,
    'resubmit_join_request_evidence',
    p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_event
    FROM public.join_request_evidence_events jree
    WHERE jree.id = v_existing
      AND jree.requester_profile_id = v_actor;

    IF v_event.id IS NULL
       OR v_event.join_request_id <> p_request_id
       OR v_event.evidence_references IS DISTINCT FROM v_references
       OR v_event.reason IS DISTINCT FROM v_reason THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505', MESSAGE = 'Idempotency key was reused with different input',
        DETAIL = '{"error_code":"IDEMPOTENCY_CONFLICT"}';
    END IF;

    RETURN QUERY
    SELECT
      v_event.join_request_id,
      'PENDING'::text,
      v_event.request_version,
      v_event.id;
    RETURN;
  END IF;

  SELECT * INTO v_request
  FROM public.join_requests jr
  WHERE jr.id = p_request_id
    AND jr.requester_profile_id = v_actor
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Join request evidence cannot be submitted',
      DETAIL = '{"error_code":"JOIN_REQUEST_EVIDENCE_NOT_AVAILABLE"}';
  END IF;

  IF v_request.version <> p_expected_version THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001', MESSAGE = 'Join request version conflict',
      DETAIL = jsonb_build_object(
        'error_code', 'JOIN_REQUEST_VERSION_CONFLICT',
        'current_version', v_request.version
      )::text;
  END IF;

  IF v_request.status <> 'NEEDS_EVIDENCE' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request is not awaiting evidence',
      DETAIL = '{"error_code":"JOIN_REQUEST_NOT_AWAITING_EVIDENCE"}';
  END IF;

  IF v_request.expires_at <= now() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request has expired',
      DETAIL = '{"error_code":"JOIN_REQUEST_EXPIRED"}';
  END IF;

  SELECT jro.event_type INTO v_latest_review_event
  FROM public.join_request_offers jro
  WHERE jro.join_request_id = v_request.id
    AND jro.workspace_id = v_request.workspace_id
    AND jro.event_type IN ('COUNTER_OFFER', 'REVIEW_NOTE')
  ORDER BY jro.created_at DESC, jro.id DESC
  LIMIT 1;

  IF v_latest_review_event = 'COUNTER_OFFER' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'A counter-offer must be handled separately',
      DETAIL = '{"error_code":"JOIN_REQUEST_COUNTER_OFFER_PENDING"}';
  END IF;

  v_next_version := v_request.version + 1;

  INSERT INTO public.join_request_evidence_events (
    id,
    workspace_id,
    join_request_id,
    requester_profile_id,
    request_version,
    evidence_references,
    reason,
    idempotency_key
  ) VALUES (
    v_event_id,
    v_request.workspace_id,
    v_request.id,
    v_actor,
    v_next_version,
    v_references,
    v_reason,
    p_idempotency_key
  );

  -- Keep the first opaque reference in the legacy summary field. The complete,
  -- immutable evidence set remains authoritative in the event table.
  UPDATE public.join_requests AS jr
  SET status = 'PENDING',
      version = v_next_version,
      evidence_reference = v_references[1],
      reviewer_profile_id = NULL,
      review_reason = NULL,
      reviewed_at = NULL,
      updated_at = now()
  WHERE jr.id = v_request.id
    AND jr.version = p_expected_version
    AND jr.status = 'NEEDS_EVIDENCE';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001', MESSAGE = 'Join request version conflict',
      DETAIL = '{"error_code":"JOIN_REQUEST_VERSION_CONFLICT"}';
  END IF;

  PERFORM private.record_idempotent_command(
    v_actor,
    'resubmit_join_request_evidence',
    p_idempotency_key,
    v_event_id
  );
  PERFORM private.write_authorization_event(
    v_request.workspace_id,
    'JOIN_REQUEST_EVIDENCE_RESUBMITTED',
    'join_request',
    v_request.id,
    'STATE_CHANGE',
    'REQUESTER_RESUBMITTED',
    jsonb_build_object(
      'evidence_event_id', v_event_id,
      'evidence_count', CARDINALITY(v_references),
      'request_version', v_next_version
    )
  );

  RETURN QUERY
  SELECT v_request.id, 'PENDING'::text, v_next_version, v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resubmit_join_request_evidence(uuid, integer, text[], text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resubmit_join_request_evidence(uuid, integer, text[], text, uuid)
  TO authenticated;

COMMIT;
