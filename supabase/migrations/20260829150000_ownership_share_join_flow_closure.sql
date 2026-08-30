-- PanelLako v0.10.4 - explicit ownership shares across invitation and join flows.
--
-- The registry invariant rejects verified ownership without a legal fraction.
-- This closure persists that fraction at the request boundary and carries it
-- through counter-offer, acceptance and approval without assuming 1/1.

BEGIN;

ALTER TABLE public.membership_invitations
  ADD COLUMN IF NOT EXISTS share_numerator bigint,
  ADD COLUMN IF NOT EXISTS share_denominator bigint;

ALTER TABLE public.join_requests
  ADD COLUMN IF NOT EXISTS requested_share_numerator bigint,
  ADD COLUMN IF NOT EXISTS requested_share_denominator bigint;

ALTER TABLE public.join_request_offers
  ADD COLUMN IF NOT EXISTS offered_share_numerator bigint,
  ADD COLUMN IF NOT EXISTS offered_share_denominator bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'membership_invitations_share_shape_check'
      AND conrelid = 'public.membership_invitations'::regclass
  ) THEN
    ALTER TABLE public.membership_invitations
      ADD CONSTRAINT membership_invitations_share_shape_check CHECK (
        (share_numerator IS NULL AND share_denominator IS NULL)
        OR (
          share_numerator > 0
          AND share_denominator > 0
          AND share_numerator <= share_denominator
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'join_requests_share_shape_check'
      AND conrelid = 'public.join_requests'::regclass
  ) THEN
    ALTER TABLE public.join_requests
      ADD CONSTRAINT join_requests_share_shape_check CHECK (
        (requested_share_numerator IS NULL AND requested_share_denominator IS NULL)
        OR (
          requested_share_numerator > 0
          AND requested_share_denominator > 0
          AND requested_share_numerator <= requested_share_denominator
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'join_request_offers_share_shape_check'
      AND conrelid = 'public.join_request_offers'::regclass
  ) THEN
    ALTER TABLE public.join_request_offers
      ADD CONSTRAINT join_request_offers_share_shape_check CHECK (
        (offered_share_numerator IS NULL AND offered_share_denominator IS NULL)
        OR (
          offered_share_numerator > 0
          AND offered_share_denominator > 0
          AND offered_share_numerator <= offered_share_denominator
        )
      );
  END IF;
END;
$$;

-- Preserve the latest hardened legacy implementations as private cores. The
-- public compatibility signatures below fail closed for owner requests while
-- continuing to support non-owner clients during a rolling deployment.
DO $$
BEGIN
  IF to_regprocedure('private.submit_join_request_without_share_legacy(uuid,uuid,text,text,uuid)') IS NULL THEN
    ALTER FUNCTION public.submit_join_request(uuid, uuid, text, text, uuid) SET SCHEMA private;
    ALTER FUNCTION private.submit_join_request(uuid, uuid, text, text, uuid)
      RENAME TO submit_join_request_without_share_legacy;
  END IF;

  IF to_regprocedure('private.issue_membership_invitation_without_share_legacy(uuid,text,uuid,text,timestamptz,uuid)') IS NULL THEN
    ALTER FUNCTION public.issue_membership_invitation(uuid, text, uuid, text, timestamptz, uuid) SET SCHEMA private;
    ALTER FUNCTION private.issue_membership_invitation(uuid, text, uuid, text, timestamptz, uuid)
      RENAME TO issue_membership_invitation_without_share_legacy;
  END IF;

  IF to_regprocedure('private.accept_membership_invitation_without_share_legacy(text,uuid)') IS NULL THEN
    ALTER FUNCTION public.accept_membership_invitation(text, uuid) SET SCHEMA private;
    ALTER FUNCTION private.accept_membership_invitation(text, uuid)
      RENAME TO accept_membership_invitation_without_share_legacy;
  END IF;

  IF to_regprocedure('private.review_join_request_without_offer_share_legacy(uuid,text,text,uuid,text,uuid)') IS NULL THEN
    ALTER FUNCTION public.review_join_request(uuid, text, text, uuid, text, uuid) SET SCHEMA private;
    ALTER FUNCTION private.review_join_request(uuid, text, text, uuid, text, uuid)
      RENAME TO review_join_request_without_offer_share_legacy;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.submit_join_request_without_share_legacy(uuid, uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.issue_membership_invitation_without_share_legacy(uuid, text, uuid, text, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.accept_membership_invitation_without_share_legacy(text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.review_join_request_without_offer_share_legacy(uuid, text, text, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.submit_join_request_without_share_legacy(uuid, uuid, text, text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.issue_membership_invitation_without_share_legacy(uuid, text, uuid, text, timestamptz, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.accept_membership_invitation_without_share_legacy(text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.review_join_request_without_offer_share_legacy(uuid, text, text, uuid, text, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_workspace_id uuid,
  p_unit_id uuid,
  p_relationship_type text,
  p_share_numerator bigint,
  p_share_denominator bigint,
  p_message text,
  p_idempotency_key uuid
)
RETURNS TABLE (request_id uuid, request_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_relationship_type text := UPPER(BTRIM(COALESCE(p_relationship_type, '')));
  v_result record;
  v_request public.join_requests%ROWTYPE;
BEGIN
  IF v_relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
    IF p_share_numerator IS NULL OR p_share_denominator IS NULL
       OR p_share_numerator <= 0 OR p_share_denominator <= 0
       OR p_share_numerator > p_share_denominator THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Owner join request requires an explicit share',
        DETAIL = '{"error_code":"OWNERSHIP_SHARE_REQUIRED"}';
    END IF;
  ELSIF p_share_numerator IS NOT NULL OR p_share_denominator IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Non-owner join request cannot carry a share',
      DETAIL = '{"error_code":"OWNERSHIP_SHARE_NOT_APPLICABLE"}';
  END IF;

  SELECT * INTO v_result
  FROM private.submit_join_request_without_share_legacy(
    p_workspace_id, p_unit_id, v_relationship_type, p_message, p_idempotency_key
  );

  SELECT * INTO v_request
  FROM public.join_requests request
  WHERE request.id = v_result.request_id
    AND request.requester_profile_id = auth.uid()
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request receipt is invalid',
      DETAIL = '{"error_code":"JOIN_REQUEST_RECEIPT_INVALID"}';
  END IF;
  IF (v_request.requested_share_numerator IS NOT NULL OR v_request.requested_share_denominator IS NOT NULL)
     AND (
       v_request.requested_share_numerator IS DISTINCT FROM p_share_numerator
       OR v_request.requested_share_denominator IS DISTINCT FROM p_share_denominator
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Idempotency key payload mismatch',
      DETAIL = '{"error_code":"IDEMPOTENCY_PAYLOAD_MISMATCH"}';
  END IF;

  UPDATE public.join_requests request
  SET requested_share_numerator = p_share_numerator,
      requested_share_denominator = p_share_denominator,
      updated_at = CASE
        WHEN request.requested_share_numerator IS DISTINCT FROM p_share_numerator
          OR request.requested_share_denominator IS DISTINCT FROM p_share_denominator
        THEN now()
        ELSE request.updated_at
      END
  WHERE request.id = v_request.id;

  RETURN QUERY SELECT v_result.request_id, v_result.request_status;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_join_request(uuid, uuid, text, bigint, bigint, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, uuid, text, bigint, bigint, text, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_workspace_id uuid,
  p_unit_id uuid,
  p_relationship_type text,
  p_message text,
  p_idempotency_key uuid
)
RETURNS TABLE (request_id uuid, request_status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT * FROM public.submit_join_request(
    p_workspace_id, p_unit_id, p_relationship_type,
    NULL::bigint, NULL::bigint, p_message, p_idempotency_key
  );
$$;

REVOKE ALL ON FUNCTION public.submit_join_request(uuid, uuid, text, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, uuid, text, text, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_membership_invitation(
  p_workspace_id uuid,
  p_email text,
  p_unit_id uuid,
  p_relationship_type text,
  p_share_numerator bigint,
  p_share_denominator bigint,
  p_expires_at timestamptz,
  p_idempotency_key uuid
)
RETURNS TABLE (invitation_id uuid, invitation_token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_relationship_type text := UPPER(BTRIM(COALESCE(p_relationship_type, '')));
  v_result record;
  v_invitation public.membership_invitations%ROWTYPE;
BEGIN
  IF v_relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
    IF p_share_numerator IS NULL OR p_share_denominator IS NULL
       OR p_share_numerator <= 0 OR p_share_denominator <= 0
       OR p_share_numerator > p_share_denominator THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Owner invitation requires an explicit share',
        DETAIL = '{"error_code":"OWNERSHIP_SHARE_REQUIRED"}';
    END IF;
  ELSIF p_share_numerator IS NOT NULL OR p_share_denominator IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Non-owner invitation cannot carry a share',
      DETAIL = '{"error_code":"OWNERSHIP_SHARE_NOT_APPLICABLE"}';
  END IF;

  SELECT * INTO v_result
  FROM private.issue_membership_invitation_without_share_legacy(
    p_workspace_id, p_email, p_unit_id, v_relationship_type,
    p_expires_at, p_idempotency_key
  );

  SELECT * INTO v_invitation
  FROM public.membership_invitations invitation
  WHERE invitation.id = v_result.invitation_id
    AND invitation.created_by_profile_id = auth.uid()
  FOR UPDATE;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Invitation receipt is invalid',
      DETAIL = '{"error_code":"MEMBERSHIP_INVITATION_RECEIPT_INVALID"}';
  END IF;
  IF (v_invitation.share_numerator IS NOT NULL OR v_invitation.share_denominator IS NOT NULL)
     AND (
       v_invitation.share_numerator IS DISTINCT FROM p_share_numerator
       OR v_invitation.share_denominator IS DISTINCT FROM p_share_denominator
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Idempotency key payload mismatch',
      DETAIL = '{"error_code":"IDEMPOTENCY_PAYLOAD_MISMATCH"}';
  END IF;

  UPDATE public.membership_invitations invitation
  SET share_numerator = p_share_numerator,
      share_denominator = p_share_denominator,
      updated_at = CASE
        WHEN invitation.share_numerator IS DISTINCT FROM p_share_numerator
          OR invitation.share_denominator IS DISTINCT FROM p_share_denominator
        THEN now()
        ELSE invitation.updated_at
      END
  WHERE invitation.id = v_invitation.id;

  RETURN QUERY SELECT v_result.invitation_id, v_result.invitation_token, v_result.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_membership_invitation(
  uuid, text, uuid, text, bigint, bigint, timestamptz, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_membership_invitation(
  uuid, text, uuid, text, bigint, bigint, timestamptz, uuid
) TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_membership_invitation(
  p_workspace_id uuid,
  p_email text,
  p_unit_id uuid,
  p_relationship_type text,
  p_expires_at timestamptz,
  p_idempotency_key uuid
)
RETURNS TABLE (invitation_id uuid, invitation_token text, expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT * FROM public.issue_membership_invitation(
    p_workspace_id, p_email, p_unit_id, p_relationship_type,
    NULL::bigint, NULL::bigint, p_expires_at, p_idempotency_key
  );
$$;

REVOKE ALL ON FUNCTION public.issue_membership_invitation(uuid, text, uuid, text, timestamptz, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_membership_invitation(uuid, text, uuid, text, timestamptz, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_membership_invitation(
  p_token text,
  p_idempotency_key uuid
)
RETURNS TABLE (membership_id uuid, workspace_id uuid, membership_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_result record;
  v_invitation public.membership_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_invitation
  FROM public.membership_invitations invitation
  WHERE invitation.token_hash = encode(digest(COALESCE(p_token, ''), 'sha256'), 'hex');

  SELECT * INTO v_result
  FROM private.accept_membership_invitation_without_share_legacy(
    p_token, p_idempotency_key
  );

  IF v_invitation.id IS NOT NULL
     AND v_invitation.relationship_type IN ('OWNER', 'OWNER_OCCUPANT')
     AND v_invitation.share_numerator IS NOT NULL
     AND v_invitation.share_denominator IS NOT NULL THEN
    UPDATE public.unit_ownerships ownership
    SET ownership_type = CASE
          WHEN v_invitation.share_numerator = v_invitation.share_denominator THEN 'SOLE_OWNER'
          ELSE 'CO_OWNER'
        END,
        share_numerator = v_invitation.share_numerator,
        share_denominator = v_invitation.share_denominator,
        updated_at = now()
    WHERE ownership.workspace_id = v_invitation.workspace_id
      AND ownership.unit_id = v_invitation.unit_id
      AND ownership.source = 'INVITATION'
      AND ownership.evidence_reference = v_invitation.id::text
      AND ownership.status <> 'ENDED'
      AND ownership.valid_to IS NULL;
  END IF;

  RETURN QUERY SELECT v_result.membership_id, v_result.workspace_id, v_result.membership_status;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_membership_invitation(text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_membership_invitation(text, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.review_join_request(
  p_request_id uuid,
  p_decision text,
  p_offered_relationship_type text,
  p_offered_unit_id uuid,
  p_offered_share_numerator bigint,
  p_offered_share_denominator bigint,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  offer_id uuid,
  workspace_membership_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_decision text := UPPER(BTRIM(COALESCE(p_decision, '')));
  v_relationship_type text := UPPER(BTRIM(COALESCE(p_offered_relationship_type, '')));
  v_request public.join_requests%ROWTYPE;
  v_existing uuid;
  v_offer_id uuid;
BEGIN
  IF v_decision <> 'COUNTER_OFFER' THEN
    IF p_offered_share_numerator IS NOT NULL OR p_offered_share_denominator IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Offered share is only valid for a counter-offer',
        DETAIL = '{"error_code":"OWNERSHIP_SHARE_NOT_APPLICABLE"}';
    END IF;
    RETURN QUERY
    SELECT * FROM private.review_join_request_without_offer_share_legacy(
      p_request_id, v_decision, p_offered_relationship_type,
      p_offered_unit_id, p_reason, p_idempotency_key
    );
    RETURN;
  END IF;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  SELECT * INTO v_request
  FROM public.join_requests request
  WHERE request.id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request was not found',
      DETAIL = '{"error_code":"JOIN_REQUEST_NOT_FOUND"}';
  END IF;

  PERFORM private.require_workspace_capability(v_request.workspace_id, 'MEMBERSHIP_REVIEW');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF v_request.requester_profile_id = v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Self approval is forbidden',
      DETAIL = '{"error_code":"SELF_APPROVAL_FORBIDDEN"}';
  END IF;

  v_existing := private.lock_idempotent_command(
    v_actor, 'review_join_request', p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    RETURN QUERY
    SELECT request.id,
           request.status,
           (
             SELECT event.id
             FROM public.join_request_offers event
             WHERE event.join_request_id = request.id
               AND event.actor_profile_id = v_actor
             ORDER BY event.created_at DESC, event.id DESC
             LIMIT 1
           ),
           (
             SELECT membership.id
             FROM public.workspace_memberships membership
             WHERE membership.workspace_id = request.workspace_id
               AND membership.profile_id = request.requester_profile_id
           )
    FROM public.join_requests request
    WHERE request.id = v_existing;
    RETURN;
  END IF;

  IF v_request.status NOT IN ('PENDING', 'NEEDS_EVIDENCE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request is not reviewable',
      DETAIL = '{"error_code":"JOIN_REQUEST_NOT_REVIEWABLE"}';
  END IF;
  IF v_request.expires_at <= now() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request has expired',
      DETAIL = '{"error_code":"JOIN_REQUEST_EXPIRED"}';
  END IF;
  IF v_relationship_type NOT IN (
    'OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.units unit
    WHERE unit.id = p_offered_unit_id
      AND unit.workspace_id = v_request.workspace_id
      AND unit.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Counter-offer is invalid',
      DETAIL = '{"error_code":"COUNTER_OFFER_INVALID"}';
  END IF;

  IF v_relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
    IF p_offered_share_numerator IS NULL OR p_offered_share_denominator IS NULL
       OR p_offered_share_numerator <= 0 OR p_offered_share_denominator <= 0
       OR p_offered_share_numerator > p_offered_share_denominator THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Owner counter-offer requires an explicit share',
        DETAIL = '{"error_code":"OWNERSHIP_SHARE_REQUIRED"}';
    END IF;
  ELSIF p_offered_share_numerator IS NOT NULL OR p_offered_share_denominator IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Non-owner counter-offer cannot carry a share',
      DETAIL = '{"error_code":"OWNERSHIP_SHARE_NOT_APPLICABLE"}';
  END IF;

  v_offer_id := gen_random_uuid();
  INSERT INTO public.join_request_offers (
    id, join_request_id, workspace_id, event_type,
    offered_relationship_type, offered_unit_id,
    offered_share_numerator, offered_share_denominator,
    actor_profile_id, reason
  ) VALUES (
    v_offer_id, v_request.id, v_request.workspace_id, 'COUNTER_OFFER',
    v_relationship_type, p_offered_unit_id,
    p_offered_share_numerator, p_offered_share_denominator,
    v_actor, NULLIF(BTRIM(p_reason), '')
  );

  UPDATE public.join_requests request
  SET status = 'NEEDS_EVIDENCE',
      version = version + 1,
      reviewer_profile_id = v_actor,
      review_reason = p_reason,
      reviewed_at = now(),
      updated_at = now()
  WHERE request.id = v_request.id;

  PERFORM private.record_idempotent_command(
    v_actor, 'review_join_request', p_idempotency_key, v_request.id
  );
  PERFORM private.write_authorization_event(
    v_request.workspace_id,
    'JOIN_REQUEST_REVIEWED',
    'join_request',
    v_request.id,
    'STATE_CHANGE',
    'COUNTER_OFFER',
    jsonb_build_object(
      'offer_id', v_offer_id,
      'offered_share_numerator', p_offered_share_numerator,
      'offered_share_denominator', p_offered_share_denominator
    )
  );

  RETURN QUERY SELECT v_request.id, 'NEEDS_EVIDENCE'::text, v_offer_id, NULL::uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.review_join_request(
  uuid, text, text, uuid, bigint, bigint, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_join_request(
  uuid, text, text, uuid, bigint, bigint, text, uuid
) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_join_request(
  p_request_id uuid,
  p_decision text,
  p_offered_relationship_type text,
  p_offered_unit_id uuid,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  offer_id uuid,
  workspace_membership_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT * FROM public.review_join_request(
    p_request_id, p_decision, p_offered_relationship_type, p_offered_unit_id,
    NULL::bigint, NULL::bigint, p_reason, p_idempotency_key
  );
$$;

REVOKE ALL ON FUNCTION public.review_join_request(uuid, text, text, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_join_request(uuid, text, text, uuid, text, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_join_request_offer(
  p_request_id uuid,
  p_offer_id uuid
)
RETURNS TABLE (request_id uuid, request_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_request public.join_requests%ROWTYPE;
  v_offer public.join_request_offers%ROWTYPE;
  v_latest_offer_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  SELECT * INTO v_request
  FROM public.join_requests request
  WHERE request.id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL OR v_request.requester_profile_id <> v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Join request offer is not available',
      DETAIL = '{"error_code":"JOIN_OFFER_NOT_AVAILABLE"}';
  END IF;

  SELECT * INTO v_offer
  FROM public.join_request_offers offer
  WHERE offer.id = p_offer_id
    AND offer.join_request_id = p_request_id
    AND offer.workspace_id = v_request.workspace_id
    AND offer.event_type = 'COUNTER_OFFER'
  FOR UPDATE;

  IF v_offer.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Counter-offer is not available',
      DETAIL = '{"error_code":"COUNTER_OFFER_NOT_AVAILABLE"}';
  END IF;

  -- A repeated delivery of the same accept command is harmless even though
  -- the request already returned to PENDING.
  IF EXISTS (
    SELECT 1 FROM public.join_request_offers accepted
    WHERE accepted.supersedes_offer_id = p_offer_id
      AND accepted.event_type = 'ACCEPTED'
  ) THEN
    RETURN QUERY SELECT v_request.id, v_request.status;
    RETURN;
  END IF;

  IF v_request.status <> 'NEEDS_EVIDENCE' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request is not awaiting a counter-offer decision',
      DETAIL = '{"error_code":"JOIN_REQUEST_COUNTER_OFFER_NOT_PENDING"}';
  END IF;
  IF v_request.expires_at <= now() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request has expired',
      DETAIL = '{"error_code":"JOIN_REQUEST_EXPIRED"}';
  END IF;

  SELECT current_offer.id INTO v_latest_offer_id
  FROM public.join_request_offers current_offer
  WHERE current_offer.join_request_id = v_request.id
    AND current_offer.workspace_id = v_request.workspace_id
    AND current_offer.event_type = 'COUNTER_OFFER'
  ORDER BY current_offer.created_at DESC, current_offer.id DESC
  LIMIT 1;

  IF v_latest_offer_id IS DISTINCT FROM v_offer.id
     OR EXISTS (
       SELECT 1 FROM public.join_request_offers terminal_event
       WHERE terminal_event.supersedes_offer_id = v_offer.id
         AND terminal_event.event_type IN ('ACCEPTED', 'WITHDRAWN')
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Counter-offer is stale',
      DETAIL = '{"error_code":"COUNTER_OFFER_STALE"}';
  END IF;

  IF v_offer.offered_relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
    IF v_offer.offered_share_numerator IS NULL OR v_offer.offered_share_denominator IS NULL
       OR v_offer.offered_share_numerator <= 0 OR v_offer.offered_share_denominator <= 0
       OR v_offer.offered_share_numerator > v_offer.offered_share_denominator THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Owner counter-offer has no valid share',
        DETAIL = '{"error_code":"OWNERSHIP_SHARE_REQUIRED"}';
    END IF;
  ELSIF v_offer.offered_share_numerator IS NOT NULL OR v_offer.offered_share_denominator IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Non-owner counter-offer carries an invalid share',
      DETAIL = '{"error_code":"OWNERSHIP_SHARE_NOT_APPLICABLE"}';
  END IF;

  INSERT INTO public.join_request_offers (
    join_request_id, workspace_id, event_type,
    offered_relationship_type, offered_unit_id,
    offered_share_numerator, offered_share_denominator,
    supersedes_offer_id, actor_profile_id, reason
  ) VALUES (
    v_request.id, v_request.workspace_id, 'ACCEPTED',
    v_offer.offered_relationship_type, v_offer.offered_unit_id,
    v_offer.offered_share_numerator, v_offer.offered_share_denominator,
    v_offer.id, v_actor, 'REQUESTER_ACCEPTED_COUNTER_OFFER'
  );

  UPDATE public.join_requests request
  SET requested_relationship_type = v_offer.offered_relationship_type,
      requested_unit_id = v_offer.offered_unit_id,
      requested_share_numerator = v_offer.offered_share_numerator,
      requested_share_denominator = v_offer.offered_share_denominator,
      status = 'PENDING',
      version = version + 1,
      reviewer_profile_id = NULL,
      review_reason = NULL,
      reviewed_at = NULL,
      updated_at = now()
  WHERE request.id = v_request.id
    AND request.status = 'NEEDS_EVIDENCE';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001', MESSAGE = 'Join request state changed concurrently',
      DETAIL = '{"error_code":"JOIN_REQUEST_VERSION_CONFLICT"}';
  END IF;

  PERFORM private.write_authorization_event(
    v_request.workspace_id,
    'JOIN_COUNTER_OFFER_ACCEPTED',
    'join_request',
    v_request.id,
    'STATE_CHANGE',
    NULL,
    jsonb_build_object(
      'offer_id', v_offer.id,
      'accepted_request_version', v_request.version + 1
    )
  );

  RETURN QUERY SELECT v_request.id, 'PENDING'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_join_request_offer(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_join_request_offer(uuid, uuid)
  TO authenticated;

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
  request_version integer,
  requested_share_numerator bigint,
  requested_share_denominator bigint,
  latest_counter_offer_share_numerator bigint,
  latest_counter_offer_share_denominator bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT
    request.id,
    request.workspace_id,
    workspace.name,
    request.status,
    request.requested_relationship_type,
    request.requested_unit_id,
    requested_unit.designation,
    request.review_reason,
    request.created_at,
    request.expires_at,
    latest_offer.id,
    latest_offer.offered_relationship_type,
    latest_offer.offered_unit_id,
    offered_unit.designation,
    latest_offer.reason,
    CASE
      WHEN latest_offer.id IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.join_request_offers accepted
        WHERE accepted.supersedes_offer_id = latest_offer.id
          AND accepted.event_type = 'ACCEPTED'
      )
    END,
    request.version,
    request.requested_share_numerator,
    request.requested_share_denominator,
    latest_offer.offered_share_numerator,
    latest_offer.offered_share_denominator
  FROM public.join_requests request
  JOIN public.workspaces workspace ON workspace.id = request.workspace_id
  LEFT JOIN public.units requested_unit
    ON requested_unit.id = request.requested_unit_id
   AND requested_unit.workspace_id = request.workspace_id
  LEFT JOIN LATERAL (
    SELECT offer.id,
           offer.offered_relationship_type,
           offer.offered_unit_id,
           offer.offered_share_numerator,
           offer.offered_share_denominator,
           offer.reason
    FROM public.join_request_offers offer
    WHERE offer.join_request_id = request.id
      AND offer.workspace_id = request.workspace_id
      AND offer.event_type = 'COUNTER_OFFER'
    ORDER BY offer.created_at DESC, offer.id DESC
    LIMIT 1
  ) latest_offer ON true
  LEFT JOIN public.units offered_unit
    ON offered_unit.id = latest_offer.offered_unit_id
   AND offered_unit.workspace_id = request.workspace_id
  WHERE auth.uid() IS NOT NULL
    AND request.requester_profile_id = auth.uid()
  ORDER BY request.created_at DESC, request.id DESC;
$$;

REVOKE ALL ON FUNCTION public.list_my_join_requests()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_join_requests()
  TO authenticated;

DROP FUNCTION IF EXISTS public.list_workspace_join_requests(uuid);
CREATE OR REPLACE FUNCTION public.list_workspace_join_requests(p_workspace_id uuid)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  requested_relationship_type text,
  requested_unit_id uuid,
  unit_designation text,
  requester_display_name text,
  submitted_at timestamptz,
  expires_at timestamptz,
  latest_offer_id uuid,
  latest_offer_relationship_type text,
  latest_offer_unit_id uuid,
  requested_share_numerator bigint,
  requested_share_denominator bigint,
  latest_offer_share_numerator bigint,
  latest_offer_share_denominator bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'MEMBERSHIP_REVIEW');

  RETURN QUERY
  SELECT
    request.id,
    request.status,
    request.requested_relationship_type,
    request.requested_unit_id,
    unit.designation,
    profile.display_name,
    request.created_at,
    request.expires_at,
    latest_offer.id,
    latest_offer.offered_relationship_type,
    latest_offer.offered_unit_id,
    request.requested_share_numerator,
    request.requested_share_denominator,
    latest_offer.offered_share_numerator,
    latest_offer.offered_share_denominator
  FROM public.join_requests request
  JOIN public.profiles profile ON profile.id = request.requester_profile_id
  LEFT JOIN public.units unit
    ON unit.id = request.requested_unit_id
   AND unit.workspace_id = request.workspace_id
  LEFT JOIN LATERAL (
    SELECT offer.id,
           offer.offered_relationship_type,
           offer.offered_unit_id,
           offer.offered_share_numerator,
           offer.offered_share_denominator
    FROM public.join_request_offers offer
    WHERE offer.join_request_id = request.id
      AND offer.workspace_id = request.workspace_id
      AND offer.event_type = 'COUNTER_OFFER'
    ORDER BY offer.created_at DESC, offer.id DESC
    LIMIT 1
  ) latest_offer ON true
  WHERE request.workspace_id = p_workspace_id
    AND request.status IN ('PENDING', 'NEEDS_EVIDENCE')
  ORDER BY request.created_at, request.id
  LIMIT 500;
END;
$$;

REVOKE ALL ON FUNCTION public.list_workspace_join_requests(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_workspace_join_requests(uuid)
  TO authenticated;

COMMIT;
