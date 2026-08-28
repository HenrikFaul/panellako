-- PanelLako v0.10.1 - announcement delivery outbox
--
-- Email delivery must use exactly the same verified audience predicate as the
-- announcement read policy. The authenticated command below snapshots only
-- recipient profile IDs into a default-deny outbox; a separate trusted worker
-- may later resolve delivery preferences and email addresses.

BEGIN;

CREATE TABLE IF NOT EXISTS public.announcement_delivery_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  recipient_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  channel text NOT NULL DEFAULT 'EMAIL',
  status text NOT NULL DEFAULT 'PENDING',
  idempotency_key uuid NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcement_delivery_outbox_channel_check
    CHECK (channel IN ('EMAIL')),
  CONSTRAINT announcement_delivery_outbox_status_check
    CHECK (status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED')),
  CONSTRAINT announcement_delivery_outbox_attempt_count_check
    CHECK (attempt_count >= 0),
  CONSTRAINT announcement_delivery_outbox_recipient_uq
    UNIQUE (announcement_id, recipient_profile_id, channel)
);

CREATE INDEX IF NOT EXISTS announcement_delivery_outbox_worker_idx
  ON public.announcement_delivery_outbox(status, available_at, created_at)
  WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX IF NOT EXISTS announcement_delivery_outbox_workspace_idx
  ON public.announcement_delivery_outbox(workspace_id, announcement_id, created_at);

ALTER TABLE public.announcement_delivery_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_delivery_outbox FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.announcement_delivery_outbox
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, UPDATE ON TABLE public.announcement_delivery_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_announcement_delivery(
  p_workspace_id uuid,
  p_announcement_id uuid,
  p_idempotency_key uuid
)
RETURNS TABLE (
  announcement_id uuid,
  queued_count bigint,
  queue_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing_resource_id uuid;
  v_queued_count bigint;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Authentication is required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  IF p_workspace_id IS NULL OR p_announcement_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Workspace, announcement and idempotency key are required',
      DETAIL = '{"error_code":"INPUT_INVALID"}';
  END IF;

  v_existing_resource_id := private.lock_idempotent_command(
    v_actor, 'enqueue_announcement_delivery', p_idempotency_key
  );
  IF v_existing_resource_id IS NOT NULL THEN
    IF v_existing_resource_id IS DISTINCT FROM p_announcement_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Idempotency key was used for another announcement',
        DETAIL = '{"error_code":"IDEMPOTENCY_KEY_REUSED"}';
    END IF;

    SELECT COUNT(*) INTO v_queued_count
    FROM public.announcement_delivery_outbox outbox
    WHERE outbox.workspace_id = p_workspace_id
      AND outbox.announcement_id = p_announcement_id;

    RETURN QUERY SELECT p_announcement_id, v_queued_count, 'EXISTING'::text;
    RETURN;
  END IF;

  PERFORM 1
  FROM public.announcements announcement
  WHERE announcement.id = p_announcement_id
    AND announcement.workspace_id = p_workspace_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Announcement does not belong to the workspace',
      DETAIL = '{"error_code":"ANNOUNCEMENT_SCOPE_MISMATCH"}';
  END IF;

  IF NOT private.has_workspace_capability(v_actor, p_workspace_id, 'COMMUNICATION_MANAGE') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Announcement delivery capability is required',
      DETAIL = '{"error_code":"CAPABILITY_REQUIRED"}';
  END IF;

  INSERT INTO public.announcement_delivery_outbox (
    workspace_id,
    announcement_id,
    recipient_profile_id,
    requested_by_profile_id,
    channel,
    status,
    idempotency_key
  )
  SELECT
    p_workspace_id,
    p_announcement_id,
    membership.profile_id,
    v_actor,
    'EMAIL',
    'PENDING',
    p_idempotency_key
  FROM public.workspace_memberships membership
  WHERE membership.workspace_id = p_workspace_id
    AND membership.status = 'ACTIVE'
    AND private.can_read_announcement(membership.profile_id, p_announcement_id)
  ON CONFLICT ON CONSTRAINT announcement_delivery_outbox_recipient_uq DO NOTHING;

  SELECT COUNT(*) INTO v_queued_count
  FROM public.announcement_delivery_outbox outbox
  WHERE outbox.workspace_id = p_workspace_id
    AND outbox.announcement_id = p_announcement_id;

  PERFORM private.record_idempotent_command(
    v_actor, 'enqueue_announcement_delivery', p_idempotency_key, p_announcement_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id,
    'ANNOUNCEMENT_DELIVERY_ENQUEUED',
    'announcement',
    p_announcement_id,
    'STATE_CHANGE',
    'VERIFIED_AUDIENCE_SNAPSHOT',
    jsonb_build_object('channel', 'EMAIL', 'queued_count', v_queued_count)
  );

  RETURN QUERY SELECT p_announcement_id, v_queued_count, 'QUEUED'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_announcement_delivery(uuid, uuid, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_announcement_delivery(uuid, uuid, uuid)
  TO authenticated;

COMMIT;
