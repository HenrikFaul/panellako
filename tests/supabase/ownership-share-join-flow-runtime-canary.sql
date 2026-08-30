\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  ('66666666-6666-4666-8666-666666615101', 'share.manager@example.test', now(), '{"full_name":"Share Manager"}'::jsonb),
  ('66666666-6666-4666-8666-666666615102', 'share.invited@example.test', now(), '{"full_name":"Invited Co-owner"}'::jsonb),
  ('66666666-6666-4666-8666-666666615103', 'share.requester@example.test', now(), '{"full_name":"Requesting Co-owner"}'::jsonb),
  ('66666666-6666-4666-8666-666666615104', 'share.offer@example.test', now(), '{"full_name":"Offer Requester"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

SELECT private.bootstrap_profile(fixture.id, fixture.email, fixture.display_name)
FROM (
  VALUES
    ('66666666-6666-4666-8666-666666615101'::uuid, 'share.manager@example.test', 'Share Manager'),
    ('66666666-6666-4666-8666-666666615102'::uuid, 'share.invited@example.test', 'Invited Co-owner'),
    ('66666666-6666-4666-8666-666666615103'::uuid, 'share.requester@example.test', 'Requesting Co-owner'),
    ('66666666-6666-4666-8666-666666615104'::uuid, 'share.offer@example.test', 'Offer Requester')
) AS fixture(id, email, display_name);

DO $canary$
DECLARE
  v_workspace_id constant uuid := '66666666-6666-4666-8666-666666615001';
  v_unit_id constant uuid := '66666666-6666-4666-8666-666666615011';
  v_manager_id constant uuid := '66666666-6666-4666-8666-666666615101';
  v_invited_id constant uuid := '66666666-6666-4666-8666-666666615102';
  v_requester_id constant uuid := '66666666-6666-4666-8666-666666615103';
  v_offer_requester_id constant uuid := '66666666-6666-4666-8666-666666615104';
  v_manager_membership_id constant uuid := '66666666-6666-4666-8666-666666615201';
  v_mandate_id constant uuid := '66666666-6666-4666-8666-666666615301';
  v_role_assignment_id constant uuid := '66666666-6666-4666-8666-666666615401';
  v_stale_request_id constant uuid := '66666666-6666-4666-8666-666666615601';
  v_terminal_request_id constant uuid := '66666666-6666-4666-8666-666666615602';
  v_expired_request_id constant uuid := '66666666-6666-4666-8666-666666615603';
  v_offer_request_id constant uuid := '66666666-6666-4666-8666-666666615604';
  v_stale_offer_id constant uuid := '66666666-6666-4666-8666-666666615701';
  v_latest_offer_id constant uuid := '66666666-6666-4666-8666-666666615702';
  v_terminal_offer_id constant uuid := '66666666-6666-4666-8666-666666615703';
  v_expired_offer_id constant uuid := '66666666-6666-4666-8666-666666615704';
  v_invitation record;
  v_membership record;
  v_join record;
  v_review record;
  v_accept record;
  v_detail text;
BEGIN
  INSERT INTO public.buildings (id, name, address)
  VALUES (v_workspace_id, 'Ownership Share Canary House', 'Budapest, Share utca 1.');

  INSERT INTO public.physical_buildings (id, canonical_name, status, address_verification_status)
  VALUES (v_workspace_id, 'Ownership Share Canary House', 'ACTIVE', 'VERIFIED');

  INSERT INTO public.workspaces (
    id, name, legal_form, governance_mode, status, created_by_profile_id
  ) VALUES (
    v_workspace_id, 'Ownership Share Canary House', 'CONDOMINIUM',
    'REPRESENTATIVE_MANAGED', 'ACTIVE', v_manager_id
  );

  INSERT INTO public.workspace_buildings (
    workspace_id, physical_building_id, is_primary, valid_from
  ) VALUES (v_workspace_id, v_workspace_id, true, now());

  INSERT INTO public.units (
    id, building_id, unit_label, unit_type, workspace_id,
    physical_building_id, designation, normalized_designation,
    unit_category, created_by_profile_id, status
  ) VALUES (
    v_unit_id, v_workspace_id, '1', 'Lakas', v_workspace_id,
    v_workspace_id, '1', '1', 'APARTMENT', v_manager_id, 'ACTIVE'
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
    'OWNERSHIP_SHARE_RUNTIME_CANARY', v_manager_id
  );

  INSERT INTO public.management_mandates (
    id, workspace_id, mandate_party_id, mandate_type, status,
    verification_status, evidence_reference, valid_from, valid_to,
    created_by_profile_id
  ) VALUES (
    v_mandate_id, v_workspace_id, v_manager_id,
    'COMMON_REPRESENTATIVE', 'ACTIVE', 'VERIFIED',
    'runtime-canary:ownership-share-mandate',
    now() - interval '1 day', now() + interval '30 days', v_manager_id
  );

  INSERT INTO public.role_assignments (
    id, workspace_id, membership_id, role_key, source_mandate_id,
    status, valid_from, valid_to, granted_by_profile_id, reason
  ) VALUES (
    v_role_assignment_id, v_workspace_id, v_manager_membership_id,
    'COMMON_REPRESENTATIVE_ADMIN', v_mandate_id,
    'ACTIVE', now() - interval '1 day', now() + interval '30 days',
    v_manager_id, 'OWNERSHIP_SHARE_RUNTIME_CANARY'
  );

  INSERT INTO public.memberships (profile_id, building_id, role, active)
  VALUES (v_manager_id, v_workspace_id, 'kozos_kepviselo', true);

  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id,
      'email', 'share.manager@example.test',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp',
        'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );

  -- A rolling old client may still invite a tenant, but cannot silently
  -- create an owner invitation without an explicit legal fraction.
  BEGIN
    PERFORM * FROM public.issue_membership_invitation(
      v_workspace_id, 'share.invited@example.test', v_unit_id, 'OWNER',
      now() + interval '7 days', '66666666-6666-4666-8666-666666615801'
    );
    RAISE EXCEPTION 'legacy owner invitation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%OWNERSHIP_SHARE_REQUIRED%' THEN
      RAISE;
    END IF;
  END;

  SELECT * INTO v_invitation
  FROM public.issue_membership_invitation(
    v_workspace_id, 'share.invited@example.test', v_unit_id, 'OWNER',
    1, 2, now() + interval '7 days',
    '66666666-6666-4666-8666-666666615802'
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.membership_invitations invitation
    WHERE invitation.id = v_invitation.invitation_id
      AND invitation.share_numerator = 1
      AND invitation.share_denominator = 2
  ) THEN
    RAISE EXCEPTION 'owner invitation did not persist 1/2';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_invited_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_invited_id,
      'email', 'share.invited@example.test',
      'aal', 'aal1'
    )::text,
    true
  );

  SELECT * INTO v_membership
  FROM public.accept_membership_invitation(
    v_invitation.invitation_token,
    '66666666-6666-4666-8666-666666615803'
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.unit_ownerships ownership
    JOIN public.person_account_links link
      ON link.person_id = ownership.party_id
     AND link.profile_id = v_invited_id
     AND link.status = 'ACTIVE'
     AND link.valid_to IS NULL
    WHERE ownership.workspace_id = v_workspace_id
      AND ownership.unit_id = v_unit_id
      AND ownership.source = 'INVITATION'
      AND ownership.status = 'CLAIMED'
      AND ownership.ownership_type = 'CO_OWNER'
      AND ownership.share_numerator = 1
      AND ownership.share_denominator = 2
  ) THEN
    RAISE EXCEPTION 'accepted owner invitation did not carry 1/2 into ownership';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_requester_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_requester_id, 'email', 'share.requester@example.test', 'aal', 'aal1')::text,
    true
  );

  BEGIN
    PERFORM * FROM public.submit_join_request(
      v_workspace_id, v_unit_id, 'OWNER', 'Old client owner request',
      '66666666-6666-4666-8666-666666615811'
    );
    RAISE EXCEPTION 'legacy owner join request unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%OWNERSHIP_SHARE_REQUIRED%' THEN
      RAISE;
    END IF;
  END;

  SELECT * INTO v_join
  FROM public.submit_join_request(
    v_workspace_id, v_unit_id, 'OWNER', 1, 2,
    'Verified 1/2 ownership request',
    '66666666-6666-4666-8666-666666615812'
  );

  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id,
      'email', 'share.manager@example.test',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp',
        'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );

  SELECT * INTO v_review
  FROM public.review_join_request(
    v_join.request_id, 'APPROVE', NULL, NULL, NULL, NULL,
    'Share proof verified', '66666666-6666-4666-8666-666666615813'
  );

  IF v_review.request_status <> 'APPROVED' OR NOT EXISTS (
    SELECT 1 FROM public.unit_ownerships ownership
    JOIN public.person_account_links link
      ON link.person_id = ownership.party_id
     AND link.profile_id = v_requester_id
     AND link.status = 'ACTIVE'
     AND link.valid_to IS NULL
    WHERE ownership.workspace_id = v_workspace_id
      AND ownership.unit_id = v_unit_id
      AND ownership.source = 'JOIN_REQUEST'
      AND ownership.status = 'VERIFIED'
      AND ownership.ownership_type = 'CO_OWNER'
      AND ownership.share_numerator = 1
      AND ownership.share_denominator = 2
  ) THEN
    RAISE EXCEPTION 'approved owner join request did not create verified 1/2';
  END IF;

  -- Stale, terminal and expired offers must never reopen a request.
  INSERT INTO public.join_requests (
    id, workspace_id, requested_unit_id, requester_profile_id,
    requested_relationship_type, status, version, expires_at, idempotency_key
  ) VALUES
    (v_stale_request_id, v_workspace_id, v_unit_id, v_offer_requester_id, 'TENANT', 'NEEDS_EVIDENCE', 2, now() + interval '30 days', '66666666-6666-4666-8666-666666615821'),
    (v_terminal_request_id, v_workspace_id, v_unit_id, v_offer_requester_id, 'TENANT', 'REJECTED', 2, now() + interval '30 days', '66666666-6666-4666-8666-666666615822'),
    (v_expired_request_id, v_workspace_id, v_unit_id, v_offer_requester_id, 'TENANT', 'NEEDS_EVIDENCE', 2, now() - interval '1 day', '66666666-6666-4666-8666-666666615823'),
    (v_offer_request_id, v_workspace_id, v_unit_id, v_offer_requester_id, 'TENANT', 'PENDING', 1, now() + interval '30 days', '66666666-6666-4666-8666-666666615824');

  INSERT INTO public.join_request_offers (
    id, join_request_id, workspace_id, event_type,
    offered_relationship_type, offered_unit_id, actor_profile_id, reason, created_at
  ) VALUES
    (v_stale_offer_id, v_stale_request_id, v_workspace_id, 'COUNTER_OFFER', 'TENANT', v_unit_id, v_manager_id, 'Older offer', now() - interval '2 minutes'),
    (v_latest_offer_id, v_stale_request_id, v_workspace_id, 'COUNTER_OFFER', 'TENANT', v_unit_id, v_manager_id, 'Latest offer', now() - interval '1 minute'),
    (v_terminal_offer_id, v_terminal_request_id, v_workspace_id, 'COUNTER_OFFER', 'TENANT', v_unit_id, v_manager_id, 'Terminal request offer', now()),
    (v_expired_offer_id, v_expired_request_id, v_workspace_id, 'COUNTER_OFFER', 'TENANT', v_unit_id, v_manager_id, 'Expired request offer', now());

  -- Also exercise the share-aware review path for a new owner counter-offer.
  SELECT * INTO v_review
  FROM public.review_join_request(
    v_offer_request_id, 'COUNTER_OFFER', 'OWNER', v_unit_id, 1, 2,
    'Counter-offer with explicit share', '66666666-6666-4666-8666-666666615825'
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.join_request_offers offer
    WHERE offer.id = v_review.offer_id
      AND offer.offered_share_numerator = 1
      AND offer.offered_share_denominator = 2
  ) THEN
    RAISE EXCEPTION 'owner counter-offer did not persist 1/2';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_offer_requester_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_offer_requester_id, 'email', 'share.offer@example.test', 'aal', 'aal1')::text,
    true
  );

  BEGIN
    PERFORM * FROM public.accept_join_request_offer(v_stale_request_id, v_stale_offer_id);
    RAISE EXCEPTION 'stale counter-offer unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%COUNTER_OFFER_STALE%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM * FROM public.accept_join_request_offer(v_terminal_request_id, v_terminal_offer_id);
    RAISE EXCEPTION 'terminal request unexpectedly reopened';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%JOIN_REQUEST_COUNTER_OFFER_NOT_PENDING%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM * FROM public.accept_join_request_offer(v_expired_request_id, v_expired_offer_id);
    RAISE EXCEPTION 'expired request unexpectedly reopened';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%JOIN_REQUEST_EXPIRED%' THEN
      RAISE;
    END IF;
  END;

  SELECT * INTO v_accept
  FROM public.accept_join_request_offer(v_offer_request_id, v_review.offer_id);
  IF v_accept.request_status <> 'PENDING' OR NOT EXISTS (
    SELECT 1 FROM public.join_requests request
    WHERE request.id = v_offer_request_id
      AND request.requested_relationship_type = 'OWNER'
      AND request.requested_share_numerator = 1
      AND request.requested_share_denominator = 2
  ) THEN
    RAISE EXCEPTION 'accepted owner counter-offer did not transfer 1/2';
  END IF;

  SELECT * INTO v_accept
  FROM public.accept_join_request_offer(v_offer_request_id, v_review.offer_id);
  IF v_accept.request_status <> 'PENDING' THEN
    RAISE EXCEPTION 'counter-offer idempotent retry changed the result';
  END IF;
END;
$canary$;

ROLLBACK;

\echo ownership share join-flow runtime canary PASS
