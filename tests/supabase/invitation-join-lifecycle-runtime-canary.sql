\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  (
    '77777777-7777-4777-8777-777777713101',
    'lifecycle.manager@example.test',
    now(),
    '{"full_name":"Lifecycle Manager"}'::jsonb
  ),
  (
    '77777777-7777-4777-8777-777777713102',
    'lifecycle.requester@example.test',
    now(),
    '{"full_name":"Lifecycle Requester"}'::jsonb
  ),
  (
    '77777777-7777-4777-8777-777777713103',
    'lifecycle.outsider@example.test',
    now(),
    '{"full_name":"Lifecycle Outsider"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

SELECT private.bootstrap_profile(fixture.id, fixture.email, fixture.display_name)
FROM (
  VALUES
    (
      '77777777-7777-4777-8777-777777713101'::uuid,
      'lifecycle.manager@example.test',
      'Lifecycle Manager'
    ),
    (
      '77777777-7777-4777-8777-777777713102'::uuid,
      'lifecycle.requester@example.test',
      'Lifecycle Requester'
    ),
    (
      '77777777-7777-4777-8777-777777713103'::uuid,
      'lifecycle.outsider@example.test',
      'Lifecycle Outsider'
    )
) AS fixture(id, email, display_name);

DO $canary$
DECLARE
  v_workspace_id constant uuid := '77777777-7777-4777-8777-777777713001';
  v_other_workspace_id constant uuid := '77777777-7777-4777-8777-777777713002';
  v_unit_id constant uuid := '77777777-7777-4777-8777-777777713011';
  v_other_unit_id constant uuid := '77777777-7777-4777-8777-777777713012';
  v_manager_id constant uuid := '77777777-7777-4777-8777-777777713101';
  v_requester_id constant uuid := '77777777-7777-4777-8777-777777713102';
  v_outsider_id constant uuid := '77777777-7777-4777-8777-777777713103';
  v_manager_membership_id constant uuid := '77777777-7777-4777-8777-777777713201';
  v_mandate_id constant uuid := '77777777-7777-4777-8777-777777713301';
  v_role_assignment_id constant uuid := '77777777-7777-4777-8777-777777713401';
  v_invitation_id constant uuid := '77777777-7777-4777-8777-777777713501';
  v_other_invitation_id constant uuid := '77777777-7777-4777-8777-777777713502';
  v_cancel_request_id constant uuid := '77777777-7777-4777-8777-777777713601';
  v_evidence_request_id constant uuid := '77777777-7777-4777-8777-777777713602';
  v_counter_request_id constant uuid := '77777777-7777-4777-8777-777777713603';
  v_revoke record;
  v_revoke_retry record;
  v_cancel record;
  v_cancel_retry record;
  v_resubmit record;
  v_resubmit_retry record;
  v_listed_version integer;
  v_detail text;
BEGIN
  -- Two independent active tenant fixtures preserve the rollout UUID identity
  -- invariant. Only the first workspace grants the manager any authority.
  INSERT INTO public.buildings (id, name, address)
  VALUES
    (v_workspace_id, 'Lifecycle Canary House', 'Budapest, Lifecycle utca 1.'),
    (v_other_workspace_id, 'Foreign Lifecycle House', 'Budapest, Lifecycle utca 2.');

  INSERT INTO public.physical_buildings (
    id, canonical_name, status, address_verification_status
  ) VALUES
    (v_workspace_id, 'Lifecycle Canary House', 'ACTIVE', 'VERIFIED'),
    (v_other_workspace_id, 'Foreign Lifecycle House', 'ACTIVE', 'VERIFIED');

  INSERT INTO public.workspaces (
    id, name, legal_form, governance_mode, status, created_by_profile_id
  ) VALUES
    (
      v_workspace_id, 'Lifecycle Canary House', 'CONDOMINIUM',
      'REPRESENTATIVE_MANAGED', 'ACTIVE', v_manager_id
    ),
    (
      v_other_workspace_id, 'Foreign Lifecycle House', 'CONDOMINIUM',
      'REPRESENTATIVE_MANAGED', 'ACTIVE', v_outsider_id
    );

  INSERT INTO public.workspace_buildings (
    workspace_id, physical_building_id, is_primary, valid_from
  ) VALUES
    (v_workspace_id, v_workspace_id, true, now()),
    (v_other_workspace_id, v_other_workspace_id, true, now());

  INSERT INTO public.units (
    id, building_id, unit_label, unit_type, workspace_id,
    physical_building_id, designation, normalized_designation,
    unit_category, created_by_profile_id, status
  ) VALUES
    (
      v_unit_id, v_workspace_id, '1', 'Lakas', v_workspace_id,
      v_workspace_id, '1', '1', 'APARTMENT', v_manager_id, 'ACTIVE'
    ),
    (
      v_other_unit_id, v_other_workspace_id, '1', 'Lakas', v_other_workspace_id,
      v_other_workspace_id, '1', '1', 'APARTMENT', v_outsider_id, 'ACTIVE'
    );

  INSERT INTO public.workspace_memberships (
    id, workspace_id, profile_id, status, source, created_by_profile_id
  ) VALUES (
    v_manager_membership_id, v_workspace_id, v_manager_id,
    'ACTIVE', 'ADMIN', v_manager_id
  );

  INSERT INTO public.membership_periods (
    workspace_id, membership_id, start_reason, created_by_profile_id
  ) VALUES (
    v_workspace_id, v_manager_membership_id,
    'INVITATION_JOIN_LIFECYCLE_RUNTIME_CANARY', v_manager_id
  );

  INSERT INTO public.management_mandates (
    id, workspace_id, mandate_party_id, mandate_type, status,
    verification_status, evidence_reference, valid_from, valid_to,
    created_by_profile_id
  ) VALUES (
    v_mandate_id, v_workspace_id, v_manager_id,
    'COMMON_REPRESENTATIVE', 'ACTIVE', 'VERIFIED',
    'runtime-canary:lifecycle-mandate',
    now() - interval '1 day', now() + interval '30 days', v_manager_id
  );

  INSERT INTO public.role_assignments (
    id, workspace_id, membership_id, role_key, source_mandate_id,
    status, valid_from, valid_to, granted_by_profile_id, reason
  ) VALUES (
    v_role_assignment_id, v_workspace_id, v_manager_membership_id,
    'COMMON_REPRESENTATIVE_ADMIN', v_mandate_id,
    'ACTIVE', now() - interval '1 day', now() + interval '30 days',
    v_manager_id, 'INVITATION_JOIN_LIFECYCLE_RUNTIME_CANARY'
  );

  INSERT INTO public.memberships (profile_id, building_id, role, active)
  VALUES (v_manager_id, v_workspace_id, 'kozos_kepviselo', true);

  INSERT INTO public.membership_invitations (
    id, workspace_id, invited_email_normalized, unit_id,
    relationship_type, token_hash, status, expires_at,
    created_by_profile_id, idempotency_key, grantor_membership_id,
    source_mandate_id, issued_authority_role_key
  ) VALUES
    (
      v_invitation_id, v_workspace_id, 'lifecycle.requester@example.test',
      v_unit_id, 'TENANT', repeat('a', 64), 'PENDING', now() + interval '7 days',
      v_manager_id, '77777777-7777-4777-8777-777777713801',
      v_manager_membership_id, v_mandate_id, 'COMMON_REPRESENTATIVE_ADMIN'
    ),
    (
      v_other_invitation_id, v_other_workspace_id, 'foreign@example.test',
      v_other_unit_id, 'TENANT', repeat('b', 64), 'PENDING', now() + interval '7 days',
      v_outsider_id, '77777777-7777-4777-8777-777777713802',
      NULL, NULL, NULL
    );

  INSERT INTO public.join_requests (
    id, workspace_id, requested_unit_id, requester_profile_id,
    requested_relationship_type, message, status, version,
    expires_at, idempotency_key
  ) VALUES
    (
      v_cancel_request_id, v_workspace_id, v_unit_id, v_requester_id,
      'TENANT', 'Cancel lifecycle request', 'PENDING', 1,
      now() + interval '30 days', '77777777-7777-4777-8777-777777713811'
    ),
    (
      v_evidence_request_id, v_workspace_id, v_unit_id, v_requester_id,
      'TENANT', 'Evidence lifecycle request', 'NEEDS_EVIDENCE', 2,
      now() + interval '30 days', '77777777-7777-4777-8777-777777713812'
    ),
    (
      v_counter_request_id, v_workspace_id, v_unit_id, v_requester_id,
      'OWNER', 'Counter-offer lifecycle request', 'NEEDS_EVIDENCE', 2,
      now() + interval '30 days', '77777777-7777-4777-8777-777777713813'
    );

  INSERT INTO public.join_request_offers (
    id, join_request_id, workspace_id, event_type,
    offered_relationship_type, offered_unit_id, actor_profile_id, reason
  ) VALUES
    (
      '77777777-7777-4777-8777-777777713701',
      v_evidence_request_id, v_workspace_id, 'REVIEW_NOTE',
      NULL, NULL, v_manager_id, 'Please provide an opaque lease reference.'
    ),
    (
      '77777777-7777-4777-8777-777777713702',
      v_counter_request_id, v_workspace_id, 'COUNTER_OFFER',
      'TENANT', v_unit_id, v_manager_id, 'The submitted owner role is not supported.'
    );

  -- Neither a different user nor an administrator of another scope can mutate
  -- requester-owned or foreign-tenant state.
  PERFORM set_config('request.jwt.claim.sub', v_outsider_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_outsider_id,
      'email', 'lifecycle.outsider@example.test',
      'aal', 'aal1'
    )::text,
    true
  );

  BEGIN
    PERFORM * FROM public.cancel_join_request(
      v_cancel_request_id, 1, 'Outsider cancellation attempt.',
      '77777777-7777-4777-8777-777777713821'
    );
    RAISE EXCEPTION 'cross-user join cancellation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%JOIN_REQUEST_NOT_CANCELLABLE%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM * FROM public.resubmit_join_request_evidence(
      v_evidence_request_id, 2,
      ARRAY['document:outsider-proof'],
      'Outsider evidence attempt.',
      '77777777-7777-4777-8777-777777713822'
    );
    RAISE EXCEPTION 'cross-user evidence resubmission unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%JOIN_REQUEST_EVIDENCE_NOT_AVAILABLE%' THEN
      RAISE;
    END IF;
  END;

  -- The requester list exposes the exact optimistic version used by the two
  -- requester-owned commands.
  PERFORM set_config('request.jwt.claim.sub', v_requester_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester_id,
      'email', 'lifecycle.requester@example.test',
      'aal', 'aal1'
    )::text,
    true
  );

  SELECT listed.request_version INTO v_listed_version
  FROM public.list_my_join_requests() listed
  WHERE listed.request_id = v_cancel_request_id;
  IF v_listed_version IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'request list did not expose the authoritative version';
  END IF;

  BEGIN
    PERFORM * FROM public.cancel_join_request(
      v_cancel_request_id, 99, 'Requester cancellation.',
      '77777777-7777-4777-8777-777777713823'
    );
    RAISE EXCEPTION 'stale join request version unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%JOIN_REQUEST_VERSION_CONFLICT%' THEN
      RAISE;
    END IF;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.join_requests request
    WHERE request.id = v_cancel_request_id
      AND request.status = 'PENDING'
      AND request.version = 1
  ) THEN
    RAISE EXCEPTION 'version conflict changed the join request';
  END IF;

  SELECT * INTO v_cancel
  FROM public.cancel_join_request(
    v_cancel_request_id, 1, 'Requester cancellation.',
    '77777777-7777-4777-8777-777777713824'
  );
  SELECT * INTO v_cancel_retry
  FROM public.cancel_join_request(
    v_cancel_request_id, 1, 'Requester cancellation.',
    '77777777-7777-4777-8777-777777713824'
  );
  IF v_cancel.request_status <> 'CANCELLED'
     OR v_cancel.request_version <> 2
     OR v_cancel.cancelled_at IS NULL
     OR v_cancel_retry.request_version IS DISTINCT FROM v_cancel.request_version THEN
    RAISE EXCEPTION 'requester cancellation or its idempotent replay failed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.join_requests request
    WHERE request.id = v_cancel_request_id
      AND request.status = 'CANCELLED'
      AND request.version = 2
      AND request.cancelled_by_profile_id = v_requester_id
      AND request.cancellation_reason = 'Requester cancellation.'
      AND request.cancelled_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'requester cancellation was not persisted atomically';
  END IF;

  SELECT * INTO v_resubmit
  FROM public.resubmit_join_request_evidence(
    v_evidence_request_id,
    2,
    ARRAY['document:lifecycle-proof-1', 'attestation:lifecycle-proof-2'],
    'The requested tenancy evidence is attached.',
    '77777777-7777-4777-8777-777777713825'
  );
  SELECT * INTO v_resubmit_retry
  FROM public.resubmit_join_request_evidence(
    v_evidence_request_id,
    2,
    ARRAY['document:lifecycle-proof-1', 'attestation:lifecycle-proof-2'],
    'The requested tenancy evidence is attached.',
    '77777777-7777-4777-8777-777777713825'
  );
  IF v_resubmit.request_status <> 'PENDING'
     OR v_resubmit.request_version <> 3
     OR v_resubmit.evidence_event_id IS NULL
     OR v_resubmit_retry.evidence_event_id IS DISTINCT FROM v_resubmit.evidence_event_id THEN
    RAISE EXCEPTION 'evidence resubmission or its idempotent replay failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.join_requests request
    JOIN public.join_request_evidence_events evidence
      ON evidence.workspace_id = request.workspace_id
     AND evidence.join_request_id = request.id
     AND evidence.requester_profile_id = request.requester_profile_id
    WHERE request.id = v_evidence_request_id
      AND request.status = 'PENDING'
      AND request.version = 3
      AND request.evidence_reference = 'document:lifecycle-proof-1'
      AND request.reviewer_profile_id IS NULL
      AND request.review_reason IS NULL
      AND request.reviewed_at IS NULL
      AND evidence.id = v_resubmit.evidence_event_id
      AND evidence.request_version = 3
      AND evidence.evidence_references = ARRAY[
        'document:lifecycle-proof-1',
        'attestation:lifecycle-proof-2'
      ]::text[]
  ) THEN
    RAISE EXCEPTION 'evidence state and immutable history diverged';
  END IF;

  BEGIN
    PERFORM * FROM public.resubmit_join_request_evidence(
      v_counter_request_id, 2,
      ARRAY['document:counter-offer-bypass'],
      'Attempt to bypass the counter-offer.',
      '77777777-7777-4777-8777-777777713826'
    );
    RAISE EXCEPTION 'pending counter-offer was bypassed by evidence resubmission';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%JOIN_REQUEST_COUNTER_OFFER_PENDING%' THEN
      RAISE;
    END IF;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.join_requests request
    WHERE request.id = v_counter_request_id
      AND request.status = 'NEEDS_EVIDENCE'
      AND request.version = 2
  ) OR EXISTS (
    SELECT 1 FROM public.join_request_evidence_events evidence
    WHERE evidence.join_request_id = v_counter_request_id
  ) THEN
    RAISE EXCEPTION 'counter-offer rejection left a partial evidence write';
  END IF;

  -- Invitation revocation is both tenant- and capability-bound, then requires
  -- the manager's fresh AAL2 proof.
  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id,
      'email', 'lifecycle.manager@example.test',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp',
        'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );

  BEGIN
    PERFORM * FROM public.revoke_membership_invitation(
      v_other_invitation_id,
      'Cross-tenant revocation attempt.',
      '77777777-7777-4777-8777-777777713827'
    );
    RAISE EXCEPTION 'cross-tenant invitation revocation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%MEMBERSHIP_INVITATION_NOT_REVOCABLE%' THEN
      RAISE;
    END IF;
  END;

  SELECT * INTO v_revoke
  FROM public.revoke_membership_invitation(
    v_invitation_id,
    'The resident invitation is no longer required.',
    '77777777-7777-4777-8777-777777713828'
  );
  SELECT * INTO v_revoke_retry
  FROM public.revoke_membership_invitation(
    v_invitation_id,
    'The resident invitation is no longer required.',
    '77777777-7777-4777-8777-777777713828'
  );
  IF v_revoke.invitation_status <> 'REVOKED'
     OR v_revoke.revoked_at IS NULL
     OR v_revoke_retry.revoked_at IS DISTINCT FROM v_revoke.revoked_at THEN
    RAISE EXCEPTION 'invitation revocation or its idempotent replay failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.membership_invitations invitation
    WHERE invitation.id = v_invitation_id
      AND invitation.workspace_id = v_workspace_id
      AND invitation.status = 'REVOKED'
      AND invitation.revoked_by_profile_id = v_manager_id
      AND invitation.revocation_reason = 'The resident invitation is no longer required.'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.membership_invitations invitation
    WHERE invitation.id = v_other_invitation_id
      AND invitation.workspace_id = v_other_workspace_id
      AND invitation.status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'invitation revocation crossed a tenant boundary';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.authorization_audit_events event
    WHERE event.workspace_id = v_workspace_id
      AND event.action_key = 'MEMBERSHIP_INVITATION_REVOKED'
      AND event.object_id = v_invitation_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.authorization_audit_events event
    WHERE event.workspace_id = v_workspace_id
      AND event.action_key = 'JOIN_REQUEST_CANCELLED'
      AND event.object_id = v_cancel_request_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.authorization_audit_events event
    WHERE event.workspace_id = v_workspace_id
      AND event.action_key = 'JOIN_REQUEST_EVIDENCE_RESUBMITTED'
      AND event.object_id = v_evidence_request_id
  ) THEN
    RAISE EXCEPTION 'invitation/join lifecycle authorization audit trail is incomplete';
  END IF;

  RAISE NOTICE 'invitation/join lifecycle runtime canary PASS';
END;
$canary$;

ROLLBACK;

SELECT 'invitation/join lifecycle runtime canary PASS' AS result;
