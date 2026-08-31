\set ON_ERROR_STOP on

-- Rollback-only runtime proof for the platform operator authority boundary.
-- Run with psql after all migrations. It intentionally never persists data.
BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  ('a8100000-0000-4000-8000-000000000001', 'authority.actor@example.test', now(), '{"full_name":"Authority Actor"}'::jsonb),
  ('a8100000-0000-4000-8000-000000000002', 'authority.approver@example.test', now(), '{"full_name":"Authority Approver"}'::jsonb),
  ('a8100000-0000-4000-8000-000000000003', 'authority.target@example.test', now(), '{"full_name":"Authority Target"}'::jsonb),
  ('a8100000-0000-4000-8000-000000000004', 'authority.trial@example.test', now(), '{"full_name":"Authority Trial"}'::jsonb);

SELECT private.bootstrap_profile(fixture.id, fixture.email, fixture.display_name)
FROM (
  VALUES
    ('a8100000-0000-4000-8000-000000000001'::uuid, 'authority.actor@example.test', 'Authority Actor'),
    ('a8100000-0000-4000-8000-000000000002'::uuid, 'authority.approver@example.test', 'Authority Approver'),
    ('a8100000-0000-4000-8000-000000000003'::uuid, 'authority.target@example.test', 'Authority Target'),
    ('a8100000-0000-4000-8000-000000000004'::uuid, 'authority.trial@example.test', 'Authority Trial')
) AS fixture(id, email, display_name);

INSERT INTO public.workspaces (
  id, name, legal_form, governance_mode, status, created_by_profile_id
) VALUES (
  'a8200000-0000-4000-8000-000000000001',
  'Platform authority runtime canary',
  'CONDOMINIUM',
  'REPRESENTATIVE_MANAGED',
  'ACTIVE',
  'a8100000-0000-4000-8000-000000000001'
);

INSERT INTO public.features (
  id, feature_key, name, description, module, route_path, menu_path, tier, enabled, sort_order
) VALUES (
  'a8300000-0000-4000-8000-000000000001',
  'platform_authority_runtime_canary',
  'Platform authority runtime canary',
  'Rollback-only fixture',
  'governance',
  '/superadmin',
  'Platform authority',
  'alap',
  true,
  99999
);

INSERT INTO public.addresses (
  id, country_code, postal_code, settlement, street_name, street_type,
  house_number_from, address_level, formatted_address, canonical_key,
  source_system, verification_status
) VALUES
  (
    'a8500000-0000-4000-8000-000000000001', 'HU', '1135', 'Budapest',
    'Runtime canary Gidófalvy Lajos', 'utca', '9', 'BUILDING',
    '1135 Budapest, Runtime canary Gidófalvy Lajos utca 9.',
    'hu|1135|budapest|runtime canary gidofalvy lajos utca|9',
    'MANUAL', 'SOURCE_MATCHED'
  ),
  (
    'a8500000-0000-4000-8000-000000000002', 'HU', '1135', 'Budapest',
    'Runtime canary Gidófalvy Lajos', 'utca', '9/A', 'BUILDING',
    '1135 Budapest, Runtime canary Gidófalvy Lajos utca 9/A.',
    'hu|1135|budapest|runtime canary gidofalvy lajos utca|9a',
    'MANUAL', 'SOURCE_MATCHED'
  ),
  (
    'a8500000-0000-4000-8000-000000000003', 'HU', '1111', 'Budapest',
    'Runtime canary Self Review', 'utca', '1', 'BUILDING',
    '1111 Budapest, Runtime canary Self Review utca 1.',
    'hu|1111|budapest|runtime canary self review utca|1',
    'MANUAL', 'SOURCE_MATCHED'
  );

INSERT INTO public.community_creation_requests (
  id, reserved_workspace_id, claimant_profile_id, address_id,
  community_name, legal_form, governance_mode, declared_unit_count,
  status, address_lease_expires_at, idempotency_key
) VALUES
  (
    'a8600000-0000-4000-8000-000000000001',
    'a8610000-0000-4000-8000-000000000001',
    'a8100000-0000-4000-8000-000000000003',
    'a8500000-0000-4000-8000-000000000001',
    'Runtime canary primary community', 'CONDOMINIUM', 'REPRESENTATIVE_MANAGED', 12,
    'PENDING_VERIFICATION', clock_timestamp() + interval '1 day',
    'a8620000-0000-4000-8000-000000000001'
  ),
  (
    'a8600000-0000-4000-8000-000000000002',
    'a8610000-0000-4000-8000-000000000002',
    'a8100000-0000-4000-8000-000000000004',
    'a8500000-0000-4000-8000-000000000002',
    'Runtime canary address candidate', 'CONDOMINIUM', 'REPRESENTATIVE_MANAGED', 8,
    'PENDING_VERIFICATION', clock_timestamp() + interval '1 day',
    'a8620000-0000-4000-8000-000000000002'
  ),
  (
    'a8600000-0000-4000-8000-000000000003',
    'a8610000-0000-4000-8000-000000000003',
    'a8100000-0000-4000-8000-000000000001',
    'a8500000-0000-4000-8000-000000000003',
    'Runtime canary self-review community', 'CONDOMINIUM', 'REPRESENTATIVE_MANAGED', 4,
    'PENDING_VERIFICATION', clock_timestamp() + interval '1 day',
    'a8620000-0000-4000-8000-000000000003'
  );

-- The bootstrap contract is deliberately global. Existing assignments are
-- removed only inside this transaction and are restored by the final ROLLBACK.
DELETE FROM public.platform_operator_assignments;
DELETE FROM public.platform_settings WHERE key = 'map_theme';

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('role', 'service_role')::text,
  true
);
SELECT public.bootstrap_first_platform_operator(
  'a8100000-0000-4000-8000-000000000001',
  'PLATFORM_ADMIN',
  'Runtime canary first operator bootstrap'
);
RESET ROLE;

INSERT INTO public.platform_operator_assignments (
  profile_id, role_key, valid_from, valid_to, granted_by_profile_id, grant_reason
) VALUES (
  'a8100000-0000-4000-8000-000000000002',
  'SECURITY_OPERATOR',
  clock_timestamp() - interval '1 minute',
  NULL,
  'a8100000-0000-4000-8000-000000000001',
  'Runtime canary independent approver'
);

INSERT INTO public.platform_support_sessions (
  id, requester_profile_id, scope_type, workspace_id, capability_keys,
  access_mode, reason, idempotency_key, requested_at, expires_at
) VALUES (
  'a8700000-0000-4000-8000-000000000001',
  'a8100000-0000-4000-8000-000000000001',
  'WORKSPACE',
  'a8200000-0000-4000-8000-000000000001',
  ARRAY['workspace.read'],
  'READ_ONLY',
  'Runtime canary already expired support request',
  'a8400000-0000-4000-8000-000000000026',
  clock_timestamp() - interval '10 minutes',
  clock_timestamp() - interval '5 minutes'
);

SET LOCAL ROLE authenticated;

DO $canary$
DECLARE
  v_actor constant uuid := 'a8100000-0000-4000-8000-000000000001';
  v_approver constant uuid := 'a8100000-0000-4000-8000-000000000002';
  v_target constant uuid := 'a8100000-0000-4000-8000-000000000003';
  v_trial_target constant uuid := 'a8100000-0000-4000-8000-000000000004';
  v_workspace constant uuid := 'a8200000-0000-4000-8000-000000000001';
  v_feature constant uuid := 'a8300000-0000-4000-8000-000000000001';
  v_community_request constant uuid := 'a8600000-0000-4000-8000-000000000001';
  v_candidate_address constant uuid := 'a8500000-0000-4000-8000-000000000002';
  v_self_request constant uuid := 'a8600000-0000-4000-8000-000000000003';
  v_prepared jsonb;
  v_changed_prepared jsonb;
  v_payload jsonb;
  v_digest text;
  v_approval jsonb;
  v_approval_id uuid;
  v_authorize_approval_id uuid;
  v_result jsonb;
  v_replay jsonb;
  v_index integer;
  v_grant_from timestamptz := clock_timestamp() + interval '1 second';
  v_support jsonb;
  v_support_id uuid;
  v_release_payload jsonb;
  v_release_approval jsonb;
  v_release_approval_id uuid;
  v_detail text;
BEGIN
  -- A capability alone is insufficient at AAL1.
  PERFORM set_config('request.jwt.claim.sub', v_actor::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_actor,
      'role', 'authenticated',
      'aal', 'aal1',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'password', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  BEGIN
    PERFORM public.update_platform_user_trial(
      v_trial_target, clock_timestamp(), 45, true,
      'Runtime canary AAL1 denial',
      'a8400000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'AAL1 platform mutation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%MFA_STEP_UP_REQUIRED%' THEN RAISE; END IF;
  END;
  v_payload := jsonb_build_object(
    'request_id', v_community_request,
    'decision', 'NEEDS_EVIDENCE',
    'reason', 'Runtime canary AAL1 community denial',
    'verification_method', 'OFFICIAL_REGISTER',
    'evidence_refs', '{}'::jsonb
  );
  v_digest := public.get_platform_payload_digest(v_payload);
  BEGIN
    PERFORM public.review_platform_community_creation_request(
      v_community_request, 'NEEDS_EVIDENCE',
      'Runtime canary AAL1 community denial', 'OFFICIAL_REGISTER', '{}'::jsonb,
      'a8400000-0000-4000-8000-000000000020', v_digest
    );
    RAISE EXCEPTION 'AAL1 community review unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%MFA_STEP_UP_REQUIRED%' THEN RAISE; END IF;
  END;

  -- Switch to a fresh AAL2 token for all authority actions.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_actor,
      'role', 'authenticated',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );

  -- Community moderation derives auth.uid(), binds the exact payload digest,
  -- persists deterministic receipts and rejects claimant self-review.
  v_payload := jsonb_build_object(
    'request_id', v_community_request,
    'candidate_address_id', v_candidate_address,
    'resolution', 'NOT_DUPLICATE',
    'reason', 'Runtime canary distinct entrance evidence',
    'evidence_refs', jsonb_build_object(
      'duplicate_override_reference', 'duplicate-override:RUNTIME-CANARY-1'
    )
  );
  v_digest := public.get_platform_payload_digest(v_payload);
  v_result := public.resolve_platform_community_address_candidate(
    v_community_request, v_candidate_address, 'NOT_DUPLICATE',
    'Runtime canary distinct entrance evidence',
    jsonb_build_object('duplicate_override_reference', 'duplicate-override:RUNTIME-CANARY-1'),
    'a8400000-0000-4000-8000-000000000021', v_digest
  );
  v_replay := public.resolve_platform_community_address_candidate(
    v_community_request, v_candidate_address, 'NOT_DUPLICATE',
    'Runtime canary distinct entrance evidence',
    jsonb_build_object('duplicate_override_reference', 'duplicate-override:RUNTIME-CANARY-1'),
    'a8400000-0000-4000-8000-000000000021', v_digest
  );
  IF v_result ->> 'outcome' <> 'resolved'
     OR v_replay ->> 'replayed' <> 'true'
     OR v_result ->> 'resolution_id' IS DISTINCT FROM v_replay ->> 'resolution_id' THEN
    RAISE EXCEPTION 'community address resolution receipt replay failed';
  END IF;
  v_payload := jsonb_build_object(
    'request_id', v_community_request,
    'candidate_address_id', v_candidate_address,
    'resolution', 'NOT_DUPLICATE',
    'reason', 'Runtime canary changed distinct entrance evidence',
    'evidence_refs', jsonb_build_object(
      'duplicate_override_reference', 'duplicate-override:RUNTIME-CANARY-1'
    )
  );
  v_digest := public.get_platform_payload_digest(v_payload);
  BEGIN
    PERFORM public.resolve_platform_community_address_candidate(
      v_community_request, v_candidate_address, 'NOT_DUPLICATE',
      'Runtime canary changed distinct entrance evidence',
      jsonb_build_object('duplicate_override_reference', 'duplicate-override:RUNTIME-CANARY-1'),
      'a8400000-0000-4000-8000-000000000021', v_digest
    );
    RAISE EXCEPTION 'community address idempotency payload mismatch unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%IDEMPOTENCY_PAYLOAD_MISMATCH%' THEN RAISE; END IF;
  END;

  v_payload := jsonb_build_object(
    'request_id', v_community_request,
    'decision', 'APPROVE',
    'reason', 'Runtime canary official register match',
    'verification_method', 'OFFICIAL_REGISTER',
    'evidence_refs', jsonb_build_object(
      'official_register_reference', 'official-register:RUNTIME-CANARY-1'
    )
  );
  v_digest := public.get_platform_payload_digest(v_payload);
  v_result := public.review_platform_community_creation_request(
    v_community_request, 'APPROVE', 'Runtime canary official register match',
    'OFFICIAL_REGISTER',
    jsonb_build_object('official_register_reference', 'official-register:RUNTIME-CANARY-1'),
    'a8400000-0000-4000-8000-000000000022', v_digest
  );
  v_replay := public.review_platform_community_creation_request(
    v_community_request, 'APPROVE', 'Runtime canary official register match',
    'OFFICIAL_REGISTER',
    jsonb_build_object('official_register_reference', 'official-register:RUNTIME-CANARY-1'),
    'a8400000-0000-4000-8000-000000000022', v_digest
  );
  IF v_result ->> 'outcome' <> 'reviewed'
     OR v_replay ->> 'replayed' <> 'true'
     OR v_result ->> 'review_id' IS DISTINCT FROM v_replay ->> 'review_id' THEN
    RAISE EXCEPTION 'community review receipt replay failed';
  END IF;

  v_payload := jsonb_build_object(
    'request_id', v_self_request,
    'decision', 'NEEDS_EVIDENCE',
    'reason', 'Runtime canary self review denial',
    'verification_method', 'OFFICIAL_REGISTER',
    'evidence_refs', '{}'::jsonb
  );
  v_digest := public.get_platform_payload_digest(v_payload);
  BEGIN
    PERFORM public.review_platform_community_creation_request(
      v_self_request, 'NEEDS_EVIDENCE', 'Runtime canary self review denial',
      'OFFICIAL_REGISTER', '{}'::jsonb,
      'a8400000-0000-4000-8000-000000000023', v_digest
    );
    RAISE EXCEPTION 'community claimant self-review unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%REVIEWER_SELF_APPROVAL_FORBIDDEN%' THEN RAISE; END IF;
  END;

  v_prepared := public.prepare_platform_operator_grant_payload(
    v_target,
    'SUPPORT_OPERATOR',
    v_grant_from,
    NULL,
    'Runtime canary operator grant'
  );
  v_payload := v_prepared -> 'payload';
  v_digest := v_prepared ->> 'payload_digest';
  IF v_digest IS DISTINCT FROM public.get_platform_payload_digest(v_payload) THEN
    RAISE EXCEPTION 'canonical grant payload digest diverged';
  END IF;

  v_approval := public.create_platform_command_approval(
    'platform.operators.manage',
    'platform.operators.grant',
    'platform_operator',
    v_target::text,
    v_payload,
    'Runtime canary operator grant approval',
    'a8400000-0000-4000-8000-000000000002',
    interval '10 minutes'
  );
  v_approval_id := (v_approval ->> 'approval_id')::uuid;

  BEGIN
    PERFORM public.decide_platform_command_approval(
      v_approval_id, 'APPROVE', v_digest, 'Runtime canary self approval denial'
    );
    RAISE EXCEPTION 'four-eyes self approval unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%PLATFORM_SELF_APPROVAL_FORBIDDEN%' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', v_approver::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_approver,
      'role', 'authenticated',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  BEGIN
    PERFORM public.decide_platform_command_approval(
      v_approval_id,
      'APPROVE',
      'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      'Runtime canary wrong digest denial'
    );
    RAISE EXCEPTION 'approval with a wrong digest unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%PLATFORM_APPROVAL_PAYLOAD_MISMATCH%' THEN RAISE; END IF;
  END;
  v_result := public.decide_platform_command_approval(
    v_approval_id, 'APPROVE', v_digest, 'Runtime canary independent approval'
  );
  IF v_result ->> 'outcome' <> 'decided' THEN
    RAISE EXCEPTION 'approval decision did not complete';
  END IF;
  FOR v_index IN 1..61 LOOP
    v_replay := public.decide_platform_command_approval(
      v_approval_id, 'APPROVE', v_digest, 'Runtime canary independent approval replay'
    );
    IF v_replay ->> 'outcome' <> 'already_decided'
       OR v_replay ->> 'status' <> 'APPROVED' THEN
      RAISE EXCEPTION 'approval decision replay was not stable';
    END IF;
  END LOOP;

  PERFORM set_config('request.jwt.claim.sub', v_actor::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_actor,
      'role', 'authenticated',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  v_result := public.grant_platform_operator_assignment(
    v_target, 'SUPPORT_OPERATOR', v_grant_from, NULL,
    'Runtime canary operator grant',
    'a8400000-0000-4000-8000-000000000003',
    v_digest,
    v_approval_id
  );
  v_replay := public.grant_platform_operator_assignment(
    v_target, 'SUPPORT_OPERATOR', v_grant_from, NULL,
    'Runtime canary operator grant',
    'a8400000-0000-4000-8000-000000000003',
    v_digest,
    v_approval_id
  );
  IF v_result ->> 'outcome' <> 'granted'
     OR v_replay ->> 'replayed' <> 'true'
     OR v_result -> 'assignment' ->> 'assignment_id'
        IS DISTINCT FROM v_replay -> 'assignment' ->> 'assignment_id' THEN
    RAISE EXCEPTION 'operator grant receipt replay failed';
  END IF;

  v_changed_prepared := public.prepare_platform_operator_grant_payload(
    v_target,
    'SUPPORT_OPERATOR',
    v_grant_from,
    NULL,
    'Runtime canary changed operator grant'
  );
  BEGIN
    PERFORM public.grant_platform_operator_assignment(
      v_target, 'SUPPORT_OPERATOR', v_grant_from, NULL,
      'Runtime canary changed operator grant',
      'a8400000-0000-4000-8000-000000000003',
      v_changed_prepared ->> 'payload_digest',
      v_approval_id
    );
    RAISE EXCEPTION 'operator grant idempotency payload mismatch unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%IDEMPOTENCY_PAYLOAD_MISMATCH%' THEN RAISE; END IF;
  END;

  -- The public authorization wrapper must replay the consumption result
  -- without duplicating its authorization audit side effect.
  v_payload := jsonb_build_object(
    'migration_head', 'runtime-canary',
    'reason', 'Runtime canary migration authorization'
  );
  v_digest := public.get_platform_payload_digest(v_payload);
  v_approval := public.create_platform_command_approval(
    'platform.migrations.apply',
    'platform.migrations.apply',
    'migration_release',
    'runtime-canary',
    v_payload,
    'Runtime canary migration authorization',
    'a8400000-0000-4000-8000-000000000024',
    interval '10 minutes'
  );
  v_authorize_approval_id := (v_approval ->> 'approval_id')::uuid;

  PERFORM set_config('request.jwt.claim.sub', v_approver::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_approver,
      'role', 'authenticated',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  PERFORM public.decide_platform_command_approval(
    v_authorize_approval_id,
    'APPROVE',
    v_digest,
    'Runtime canary independent migration authorization approval'
  );

  PERFORM set_config('request.jwt.claim.sub', v_actor::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_actor,
      'role', 'authenticated',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  v_result := public.authorize_platform_action(
    v_authorize_approval_id,
    'platform.migrations.apply',
    v_payload,
    'a8400000-0000-4000-8000-000000000025'
  );
  v_replay := public.authorize_platform_action(
    v_authorize_approval_id,
    'platform.migrations.apply',
    v_payload,
    'a8400000-0000-4000-8000-000000000025'
  );
  IF v_result ->> 'outcome' <> 'authorized'
     OR v_replay ->> 'outcome' <> 'replayed' THEN
    RAISE EXCEPTION 'platform action authorization replay failed';
  END IF;

  -- Atomic, typed control-plane updates and deterministic receipt replay.
  v_result := public.update_platform_user_trial(
    v_trial_target,
    clock_timestamp() + interval '1 day',
    45,
    true,
    'Runtime canary trial update',
    'a8400000-0000-4000-8000-000000000004'
  );
  v_replay := public.update_platform_user_trial(
    v_trial_target,
    (v_result -> 'trial' ->> 'free_trial_start')::timestamptz,
    45,
    true,
    'Runtime canary trial update',
    'a8400000-0000-4000-8000-000000000004'
  );
  IF v_result ->> 'outcome' <> 'updated' OR v_replay ->> 'replayed' <> 'true' THEN
    RAISE EXCEPTION 'trial update receipt replay failed';
  END IF;

  v_payload := jsonb_build_object(
    'feature_id', v_feature,
    'patch', jsonb_build_object('enabled', false)
  );
  v_digest := public.get_platform_payload_digest(v_payload);
  v_result := public.update_platform_feature(
    v_feature,
    jsonb_build_object('enabled', false),
    'Runtime canary feature update',
    'a8400000-0000-4000-8000-000000000005',
    v_digest
  );
  v_replay := public.update_platform_feature(
    v_feature,
    jsonb_build_object('enabled', false),
    'Runtime canary feature update',
    'a8400000-0000-4000-8000-000000000005',
    v_digest
  );
  IF v_result ->> 'outcome' <> 'updated' OR v_replay ->> 'replayed' <> 'true' THEN
    RAISE EXCEPTION 'feature update receipt replay failed';
  END IF;

  v_payload := jsonb_build_object('key', 'map_theme', 'value', jsonb_build_object('id', 'nature'));
  v_digest := public.get_platform_payload_digest(v_payload);
  v_result := public.update_platform_setting(
    'map_theme',
    jsonb_build_object('id', 'nature'),
    'Runtime canary setting update',
    'a8400000-0000-4000-8000-000000000006',
    v_digest
  );
  IF v_result ->> 'outcome' <> 'updated' THEN
    RAISE EXCEPTION 'platform setting update failed';
  END IF;

  -- Scoped support requires an independent decision and remains exact-scope.
  v_support := public.request_platform_support_session(
    'WORKSPACE',
    v_workspace,
    NULL,
    ARRAY['workspace.read'],
    'READ_ONLY',
    'Runtime canary scoped support',
    'a8400000-0000-4000-8000-000000000007',
    interval '15 minutes'
  );
  v_support_id := (v_support ->> 'support_session_id')::uuid;

  PERFORM set_config('request.jwt.claim.sub', v_approver::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_approver,
      'role', 'authenticated',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  v_result := public.decide_platform_support_session(
    v_support_id, 'APPROVE', 'Runtime canary support approval'
  );
  IF v_result ->> 'outcome' <> 'decided' THEN
    RAISE EXCEPTION 'support decision did not complete';
  END IF;
  FOR v_index IN 1..31 LOOP
    v_replay := public.decide_platform_support_session(
      v_support_id, 'APPROVE', 'Runtime canary support approval replay'
    );
    IF v_replay ->> 'outcome' <> 'already_decided'
       OR v_replay ->> 'status' <> 'ACTIVE' THEN
      RAISE EXCEPTION 'support decision replay was not stable';
    END IF;
  END LOOP;
  v_result := public.decide_platform_support_session(
    'a8700000-0000-4000-8000-000000000001',
    'APPROVE',
    'Runtime canary expired support decision'
  );
  IF v_result ->> 'outcome' <> 'expired' THEN
    RAISE EXCEPTION 'lazy support expiry did not complete';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_actor::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_actor,
      'role', 'authenticated',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  v_result := public.authorize_platform_support_action(
    v_support_id, 'workspace.read', v_workspace, NULL
  );
  IF v_result ->> 'outcome' <> 'authorized' THEN
    RAISE EXCEPTION 'exact-scope support authorization failed';
  END IF;
  BEGIN
    PERFORM public.authorize_platform_support_action(
      v_support_id,
      'workspace.read',
      'a8200000-0000-4000-8000-000000000099',
      NULL
    );
    RAISE EXCEPTION 'cross-scope support authorization unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%SUPPORT_SESSION_SCOPE_MISMATCH%' THEN RAISE; END IF;
  END;

  v_payload := jsonb_build_object(
    'support_session_id', v_support_id,
    'revocation_reason', 'Runtime canary support revoke'
  );
  v_digest := public.get_platform_payload_digest(v_payload);
  PERFORM public.revoke_platform_support_session(
    v_support_id,
    'Runtime canary support revoke',
    'a8400000-0000-4000-8000-000000000008',
    v_digest
  );
  BEGIN
    PERFORM public.authorize_platform_support_action(
      v_support_id, 'workspace.read', v_workspace, NULL
    );
    RAISE EXCEPTION 'revoked support session unexpectedly authorized access';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%SUPPORT_SESSION_NOT_ACTIVE%' THEN RAISE; END IF;
  END;

  -- Release attestation consumes a second exact-payload four-eyes approval.
  v_release_payload := jsonb_build_object(
    'environment', 'staging',
    'deployment_id', 'authority-canary-20260830',
    'commit_sha', repeat('a', 40),
    'artifact_digest', 'sha256:' || repeat('b', 64),
    'manifest_fingerprint', 'sha256:' || repeat('c', 64),
    'migration_head', '20260830140000_platform_operator_authority',
    'outcome', 'PASS'
  );
  v_digest := public.get_platform_payload_digest(v_release_payload);
  v_release_approval := public.create_platform_command_approval(
    'platform.release.attest',
    'platform.release.attest',
    'deployment',
    'authority-canary-20260830',
    v_release_payload,
    'Runtime canary release approval',
    'a8400000-0000-4000-8000-000000000009',
    interval '10 minutes'
  );
  v_release_approval_id := (v_release_approval ->> 'approval_id')::uuid;

  PERFORM set_config('request.jwt.claim.sub', v_approver::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_approver,
      'role', 'authenticated',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  PERFORM public.decide_platform_command_approval(
    v_release_approval_id, 'APPROVE', v_digest, 'Runtime canary release approval decision'
  );

  PERFORM set_config('request.jwt.claim.sub', v_actor::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_actor,
      'role', 'authenticated',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  v_result := public.attest_platform_release(
    'staging',
    'authority-canary-20260830',
    repeat('a', 40),
    'sha256:' || repeat('b', 64),
    'sha256:' || repeat('c', 64),
    '20260830140000_platform_operator_authority',
    'PASS',
    'Runtime canary release attestation',
    'a8400000-0000-4000-8000-000000000010',
    v_digest,
    v_release_approval_id
  );
  v_replay := public.attest_platform_release(
    'staging',
    'authority-canary-20260830',
    repeat('a', 40),
    'sha256:' || repeat('b', 64),
    'sha256:' || repeat('c', 64),
    '20260830140000_platform_operator_authority',
    'PASS',
    'Runtime canary release attestation',
    'a8400000-0000-4000-8000-000000000010',
    v_digest,
    v_release_approval_id
  );
  IF v_result ->> 'outcome' <> 'attested' OR v_replay ->> 'replayed' <> 'true' THEN
    RAISE EXCEPTION 'release attestation receipt replay failed';
  END IF;
END;
$canary$;

RESET ROLE;

-- Owner-side invariant checks and terminal-state mutation denial.
DO $canary$
DECLARE
  v_support_id uuid;
  v_detail text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.platform_operator_assignments
    WHERE profile_id = 'a8100000-0000-4000-8000-000000000003'
      AND role_key = 'SUPPORT_OPERATOR'
      AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'operator assignment was not persisted inside canary transaction';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = 'a8100000-0000-4000-8000-000000000004'
      AND free_trial_days = 45
      AND free_trial_never_expires
  ) THEN
    RAISE EXCEPTION 'trial update state is incorrect';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.features
    WHERE id = 'a8300000-0000-4000-8000-000000000001' AND NOT enabled
  ) THEN
    RAISE EXCEPTION 'feature update state is incorrect';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_settings
    WHERE key = 'map_theme' AND value = '{"id":"nature"}'::jsonb
  ) THEN
    RAISE EXCEPTION 'platform setting update state is incorrect';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_address_duplicate_resolutions resolution
    WHERE resolution.community_creation_request_id = 'a8600000-0000-4000-8000-000000000001'
      AND resolution.candidate_address_id = 'a8500000-0000-4000-8000-000000000002'
      AND resolution.resolution = 'NOT_DUPLICATE'
      AND resolution.reviewer_profile_id = 'a8100000-0000-4000-8000-000000000001'
      AND resolution.reviewer_actor = 'authority.actor@example.test'
  ) THEN
    RAISE EXCEPTION 'community address resolution actor provenance is incorrect';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_creation_reviews review
    WHERE review.community_creation_request_id = 'a8600000-0000-4000-8000-000000000001'
      AND review.decision = 'APPROVE'
      AND review.reviewer_profile_id = 'a8100000-0000-4000-8000-000000000001'
      AND review.reviewer_actor = 'authority.actor@example.test'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.community_creation_requests request
    WHERE request.id = 'a8600000-0000-4000-8000-000000000001'
      AND request.status = 'APPROVED'
      AND request.reviewed_by_profile_id = 'a8100000-0000-4000-8000-000000000001'
      AND request.activation_expires_at > clock_timestamp()
  ) THEN
    RAISE EXCEPTION 'community review actor provenance or request state is incorrect';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_audit_events
    WHERE actor_profile_id = 'a8100000-0000-4000-8000-000000000001'
      AND action = 'superadmin.community.address_candidate.resolve'
      AND outcome = 'RESOLVED'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.platform_audit_events
    WHERE actor_profile_id = 'a8100000-0000-4000-8000-000000000001'
      AND action = 'superadmin.community.review'
      AND outcome = 'REVIEWED'
  ) THEN
    RAISE EXCEPTION 'community platform audit trail is incomplete';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_release_attestations
    WHERE deployment_id = 'authority-canary-20260830' AND outcome = 'PASS'
  ) THEN
    RAISE EXCEPTION 'release attestation state is incorrect';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.platform_operator_role_capabilities
    WHERE role_key = 'PLATFORM_OBSERVER'
      AND capability_key = 'platform.features.read'
      AND risk_class = 'R0'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.platform_operator_role_capabilities
    WHERE role_key = 'PLATFORM_ADMIN'
      AND capability_key = 'platform.features.read'
      AND risk_class = 'R0'
  ) THEN
    RAISE EXCEPTION 'platform feature read capability seed is incomplete';
  END IF;
  IF NOT has_function_privilege(
    'authenticated',
    'public.resolve_platform_community_address_candidate(uuid,uuid,text,text,jsonb,uuid,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'authenticated',
    'public.review_platform_community_creation_request(uuid,text,text,text,jsonb,uuid,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'service_role',
    'public.resolve_platform_community_address_candidate(uuid,uuid,text,text,jsonb,uuid,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'service_role',
    'public.review_platform_community_creation_request(uuid,text,text,text,jsonb,uuid,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'community authority RPC grants are incorrect';
  END IF;

  SELECT id INTO STRICT v_support_id
  FROM public.platform_support_sessions
  WHERE requester_profile_id = 'a8100000-0000-4000-8000-000000000001'
    AND idempotency_key = 'a8400000-0000-4000-8000-000000000007';
  BEGIN
    UPDATE public.platform_support_sessions
    SET status = 'ACTIVE'
    WHERE id = v_support_id;
    RAISE EXCEPTION 'terminal support session reactivation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%SUPPORT_SESSION_TERMINAL%' THEN RAISE; END IF;
  END;

  IF has_table_privilege('service_role', 'public.platform_audit_events', 'UPDATE')
     OR has_table_privilege('service_role', 'public.platform_support_session_events', 'UPDATE')
     OR has_table_privilege('service_role', 'public.platform_release_attestations', 'UPDATE') THEN
    RAISE EXCEPTION 'service role has UPDATE on append-only platform history';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.platform_audit_events', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.platform_audit_events', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.platform_support_session_events', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.platform_support_session_events', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.platform_release_attestations', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.platform_release_attestations', 'INSERT') THEN
    RAISE EXCEPTION 'service role append-only history grants are incomplete';
  END IF;
END;
$canary$;

-- Even a temporary direct table grant must not bypass the RPC-only mutation
-- triggers. These grants and all fixture state are rolled back below.
GRANT SELECT, UPDATE ON public.profiles TO service_role;
GRANT SELECT, UPDATE ON public.features TO service_role;
GRANT SELECT, UPDATE ON public.platform_settings TO service_role;

SET LOCAL ROLE service_role;
DO $canary$
DECLARE
  v_detail text;
BEGIN
  BEGIN
    UPDATE public.profiles
    SET free_trial_days = free_trial_days + 1
    WHERE id = 'a8100000-0000-4000-8000-000000000004';
    RAISE EXCEPTION 'direct service-role trial update unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%PLATFORM_AUTHORITY_RPC_REQUIRED%' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.features
    SET enabled = true
    WHERE id = 'a8300000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'direct service-role feature update unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%PLATFORM_AUTHORITY_RPC_REQUIRED%' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.platform_settings
    SET value = '{"id":"minimal"}'::jsonb
    WHERE key = 'map_theme';
    RAISE EXCEPTION 'direct service-role setting update unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%PLATFORM_AUTHORITY_RPC_REQUIRED%' THEN RAISE; END IF;
  END;
END;
$canary$;
RESET ROLE;

DO $audit_canary$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.platform_audit_events audit
  WHERE audit.action = 'superadmin.action.authorized'
    AND audit.idempotency_key = 'a8400000-0000-4000-8000-000000000025';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'authorization replay emitted % audit rows instead of one', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.platform_audit_events audit
  WHERE audit.action = 'superadmin.support.expired'
    AND audit.support_session_id = 'a8700000-0000-4000-8000-000000000001';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'lazy support expiry emitted % platform audit rows instead of one', v_count;
  END IF;
END;
$audit_canary$;

ROLLBACK;

\echo platform operator authority runtime canary PASS
