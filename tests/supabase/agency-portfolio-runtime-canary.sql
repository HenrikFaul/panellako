\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'self.manager@example.test', now(), '{"full_name":"Self Manager"}'::jsonb),
  ('55555555-5555-4555-8555-555555555551', 'agency.staff@example.test', now(), '{"full_name":"Agency Staff"}'::jsonb),
  ('55555555-5555-4555-8555-555555555552', 'agency.admin@example.test', now(), '{"full_name":"Agency Admin"}'::jsonb),
  ('55555555-5555-4555-8555-555555555553', 'stale.target@example.test', now(), '{"full_name":"Stale Target"}'::jsonb),
  ('55555555-5555-4555-8555-555555555554', 'agency.outsider@example.test', now(), '{"full_name":"Agency Outsider"}'::jsonb),
  ('55555555-5555-4555-8555-555555555555', 'expired.admin@example.test', now(), '{"full_name":"Expired Admin"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

SELECT private.bootstrap_profile(
  fixture.id,
  fixture.email,
  fixture.display_name
)
FROM (
  VALUES
    ('33333333-3333-3333-3333-333333333333'::uuid, 'self.manager@example.test', 'Self Manager'),
    ('55555555-5555-4555-8555-555555555551'::uuid, 'agency.staff@example.test', 'Agency Staff'),
    ('55555555-5555-4555-8555-555555555552'::uuid, 'agency.admin@example.test', 'Agency Admin'),
    ('55555555-5555-4555-8555-555555555553'::uuid, 'stale.target@example.test', 'Stale Target'),
    ('55555555-5555-4555-8555-555555555554'::uuid, 'agency.outsider@example.test', 'Agency Outsider'),
    ('55555555-5555-4555-8555-555555555555'::uuid, 'expired.admin@example.test', 'Expired Admin')
) AS fixture(id, email, display_name);

-- Isolated tenant fixture. The active workspace preserves the rollout identity
-- invariant: workspace, primary physical building, and legacy building share
-- the same UUID. The second workspace intentionally has no manager grant.
INSERT INTO public.addresses (
  id, country_code, postal_code, settlement, street_name, street_type,
  house_number_from, address_level, formatted_address, canonical_key,
  source_system, verification_status
) VALUES (
  '66666666-6666-4666-8666-66666666a001', 'HU', '1135', 'Budapest',
  'Canary', 'utca', '1', 'BUILDING', '1135 Budapest, Canary utca 1.',
  'hu|1135|budapest|canary|utca|1', 'MANUAL', 'VERIFIED'
);

INSERT INTO public.buildings (id, name, address)
VALUES (
  'e84e0281-b012-4aa0-8bac-14b91fe8cf0d',
  'Agency Canary House',
  '1135 Budapest, Canary utca 1.'
);

INSERT INTO public.physical_buildings (
  id, canonical_name, status, address_verification_status
) VALUES (
  'e84e0281-b012-4aa0-8bac-14b91fe8cf0d',
  'Agency Canary House', 'ACTIVE', 'VERIFIED'
);

INSERT INTO public.workspaces (
  id, name, legal_form, governance_mode, governance_legal_basis,
  status, created_by_profile_id
) VALUES
  (
    'e84e0281-b012-4aa0-8bac-14b91fe8cf0d', 'Agency Canary House',
    'CONDOMINIUM', 'REPRESENTATIVE_MANAGED', 'SIGNED_MANDATE',
    'ACTIVE', '33333333-3333-3333-3333-333333333333'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000001', 'Foreign Tenant',
    'CONDOMINIUM', 'REPRESENTATIVE_MANAGED', NULL,
    'PENDING_VERIFICATION', '55555555-5555-4555-8555-555555555554'
  );

INSERT INTO public.workspace_buildings (
  workspace_id, physical_building_id, is_primary, valid_from
) VALUES (
  'e84e0281-b012-4aa0-8bac-14b91fe8cf0d',
  'e84e0281-b012-4aa0-8bac-14b91fe8cf0d',
  true, now()
);

INSERT INTO public.building_address_assignments (
  physical_building_id, address_id, assignment_role, valid_from,
  is_verified, source, created_by_profile_id
) VALUES (
  'e84e0281-b012-4aa0-8bac-14b91fe8cf0d',
  '66666666-6666-4666-8666-66666666a001',
  'PRIMARY', now(), true, 'PLATFORM_REVIEW',
  '33333333-3333-3333-3333-333333333333'
);

INSERT INTO public.workspace_memberships (
  id, workspace_id, profile_id, status, source, created_by_profile_id
) VALUES (
  '66666666-6666-4666-8666-66666666a101',
  'e84e0281-b012-4aa0-8bac-14b91fe8cf0d',
  '33333333-3333-3333-3333-333333333333',
  'ACTIVE', 'BOOTSTRAP', '33333333-3333-3333-3333-333333333333'
);

INSERT INTO public.membership_periods (
  workspace_id, membership_id, started_at, start_reason,
  created_by_profile_id
) VALUES (
  'e84e0281-b012-4aa0-8bac-14b91fe8cf0d',
  '66666666-6666-4666-8666-66666666a101',
  now() - interval '1 day', 'COMMUNITY_ACTIVATION',
  '33333333-3333-3333-3333-333333333333'
);

INSERT INTO public.management_mandates (
  id, workspace_id, mandate_party_id, mandate_type, status,
  verification_status, evidence_reference, appointment_reference,
  valid_from, valid_to, created_by_profile_id
) VALUES (
  '66666666-6666-4666-8666-66666666b101',
  'e84e0281-b012-4aa0-8bac-14b91fe8cf0d',
  '33333333-3333-3333-3333-333333333333',
  'COMMON_REPRESENTATIVE', 'ACTIVE', 'VERIFIED',
  'runtime-canary-direct-evidence', 'runtime-canary-direct-mandate',
  now() - interval '1 day', now() + interval '90 days',
  '33333333-3333-3333-3333-333333333333'
);

INSERT INTO public.role_assignments (
  id, workspace_id, membership_id, role_key, source_mandate_id,
  status, valid_from, valid_to, granted_by_profile_id, reason
) VALUES (
  '66666666-6666-4666-8666-66666666c101',
  'e84e0281-b012-4aa0-8bac-14b91fe8cf0d',
  '66666666-6666-4666-8666-66666666a101',
  'COMMON_REPRESENTATIVE_ADMIN',
  '66666666-6666-4666-8666-66666666b101',
  'ACTIVE', now() - interval '1 day', now() + interval '90 days',
  '33333333-3333-3333-3333-333333333333',
  'RUNTIME_CANARY_DIRECT_AUTHORITY'
);

SELECT private.project_legacy_workspace_role(
  'e84e0281-b012-4aa0-8bac-14b91fe8cf0d',
  '33333333-3333-3333-3333-333333333333',
  'COMMON_REPRESENTATIVE_ADMIN',
  true
);

DO $canary$
DECLARE
  -- Prerequisite: the multitenancy foundation fixture used by the preceding
  -- runtime canaries. This test adds no alternate tenant shortcut.
  v_workspace_id constant uuid := 'e84e0281-b012-4aa0-8bac-14b91fe8cf0d';
  v_other_workspace_id constant uuid := 'bbbbbbbb-0001-0001-0001-000000000001';
  v_manager_id constant uuid := '33333333-3333-3333-3333-333333333333';
  v_staff_id constant uuid := '55555555-5555-4555-8555-555555555551';
  v_agency_admin_id constant uuid := '55555555-5555-4555-8555-555555555552';
  v_stale_target_id constant uuid := '55555555-5555-4555-8555-555555555553';
  v_outsider_id constant uuid := '55555555-5555-4555-8555-555555555554';
  v_expired_admin_id constant uuid := '55555555-5555-4555-8555-555555555555';
  v_staff_workspace_membership_id constant uuid := '55555555-5555-4555-8555-55555555a001';
  v_expired_workspace_membership_id constant uuid := '55555555-5555-4555-8555-55555555a005';
  v_expired_mandate_id constant uuid := '55555555-5555-4555-8555-55555555b005';
  v_expired_role_assignment_id constant uuid := '55555555-5555-4555-8555-55555555c005';
  v_agency record;
  v_agency_retry record;
  v_outsider_agency record;
  v_assignment record;
  v_assignment_retry record;
  v_invitation record;
  v_invitation_retry record;
  v_accept record;
  v_accept_retry record;
  v_admin_invitation record;
  v_admin_accept record;
  v_stale_invitation record;
  v_revoke record;
  v_revoke_retry record;
  v_end record;
  v_end_retry record;
  v_staff_organization_membership_id uuid;
  v_owner_organization_membership_id uuid;
  v_agency_grant public.agency_workspace_grants%ROWTYPE;
  v_expired_person_id uuid;
  v_detail text;
BEGIN
  -- agency create -> assignment -> invitation/accept -> projection -> revoke/end
  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id,
      'email', 'self.manager@example.test',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );

  SELECT * INTO v_agency
  FROM public.create_management_agency(
    'Canary Portfolio Kft.', 'Canary Portfolio Kft.', '01-09-999999',
    '12345678-2-42', 'registry:canary-portfolio',
    '60000000-0000-4000-8000-000000000001'
  );
  SELECT * INTO v_agency_retry
  FROM public.create_management_agency(
    'Canary Portfolio Kft.', 'Canary Portfolio Kft.', '01-09-999999',
    '12345678-2-42', 'registry:canary-portfolio',
    '60000000-0000-4000-8000-000000000001'
  );
  IF v_agency.agency_id IS DISTINCT FROM v_agency_retry.agency_id
     OR v_agency_retry.command_status <> 'EXISTING' THEN
    RAISE EXCEPTION 'agency create idempotency failed';
  END IF;

  BEGIN
    PERFORM * FROM public.create_management_agency(
      'Different Agency Name', 'Canary Portfolio Kft.', '01-09-999999',
      '12345678-2-42', 'registry:canary-portfolio',
      '60000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'agency create idempotency conflict unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%IDEMPOTENCY_CONFLICT%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM * FROM public.assign_agency_to_workspace(
      v_agency.agency_id, v_other_workspace_id,
      'signed-mandate:cross-tenant-denied', now() + interval '30 days',
      '60000000-0000-4000-8000-000000000002'
    );
    RAISE EXCEPTION 'cross-tenant portfolio assignment unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%DIRECT_ADMIN_GRANT_REQUIRED%' THEN RAISE; END IF;
  END;

  SELECT * INTO v_assignment
  FROM public.assign_agency_to_workspace(
    v_agency.agency_id, v_workspace_id,
    'signed-mandate:canary-portfolio-2026', now() + interval '30 days',
    '60000000-0000-4000-8000-000000000003'
  );
  SELECT * INTO v_assignment_retry
  FROM public.assign_agency_to_workspace(
    v_agency.agency_id, v_workspace_id,
    'signed-mandate:canary-portfolio-2026', now() + interval '30 days',
    '60000000-0000-4000-8000-000000000003'
  );
  IF v_assignment.portfolio_assignment_id IS DISTINCT FROM v_assignment_retry.portfolio_assignment_id
     OR v_assignment.mandate_id IS DISTINCT FROM v_assignment_retry.mandate_id THEN
    RAISE EXCEPTION 'portfolio assignment idempotency failed';
  END IF;

  BEGIN
    PERFORM * FROM public.assign_agency_to_workspace(
      v_agency.agency_id, v_other_workspace_id,
      'signed-mandate:canary-portfolio-2026', now() + interval '30 days',
      '60000000-0000-4000-8000-000000000003'
    );
    RAISE EXCEPTION 'portfolio assignment idempotency scope conflict unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%IDEMPOTENCY_CONFLICT%' THEN RAISE; END IF;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.management_mandates mandate
    JOIN public.agency_portfolio_assignments assignment
      ON assignment.workspace_id = mandate.workspace_id
     AND assignment.mandate_id = mandate.id
     AND assignment.agency_id = mandate.agency_id
    WHERE assignment.id = v_assignment.portfolio_assignment_id
      AND mandate.status = 'ACTIVE'
      AND mandate.verification_status = 'VERIFIED'
      AND mandate.valid_to = assignment.valid_to
  ) THEN
    RAISE EXCEPTION 'agency mandate validity or composite scope is incorrect';
  END IF;

  INSERT INTO public.workspace_memberships(
    id, workspace_id, profile_id, status, source, created_by_profile_id
  ) VALUES (
    v_staff_workspace_membership_id, v_workspace_id, v_staff_id,
    'ENDED', 'ADMIN', v_manager_id
  )
  ON CONFLICT (workspace_id, profile_id) DO UPDATE
  SET status = 'ENDED', updated_at = clock_timestamp();

  INSERT INTO public.agency_staff_invitations(
    id, agency_id, invited_email_normalized, organization_role, token_hash,
    status, expires_at, invited_by_profile_id, idempotency_key,
    request_fingerprint, created_at
  ) VALUES (
    '70000000-0000-4000-8000-000000000001', v_agency.agency_id,
    'agency.staff@example.test', 'PORTFOLIO_MANAGER', repeat('a', 64),
    'PENDING', now() - interval '1 day', v_manager_id,
    '70000000-0000-4000-8000-000000000002', repeat('0', 64),
    now() - interval '2 days'
  );

  SELECT * INTO v_invitation
  FROM public.issue_agency_staff_invitation(
    v_agency.agency_id, 'agency.staff@example.test', 'PORTFOLIO_MANAGER',
    now() + interval '7 days', '60000000-0000-4000-8000-000000000004'
  );
  SELECT * INTO v_invitation_retry
  FROM public.issue_agency_staff_invitation(
    v_agency.agency_id, 'agency.staff@example.test', 'PORTFOLIO_MANAGER',
    now() + interval '7 days', '60000000-0000-4000-8000-000000000004'
  );
  IF v_invitation.invitation_id IS DISTINCT FROM v_invitation_retry.invitation_id
     OR v_invitation_retry.invitation_token IS NOT NULL THEN
    RAISE EXCEPTION 'agency invitation issue idempotency failed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_staff_invitations invitation
    WHERE invitation.id = '70000000-0000-4000-8000-000000000001'
      AND invitation.status = 'EXPIRED'
  ) THEN
    RAISE EXCEPTION 'expired pending invitation was not retired before replacement';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_staff_invitations invitation
    WHERE invitation.id = v_invitation.invitation_id
      AND invitation.token_hash = encode(digest(v_invitation.invitation_token, 'sha256'), 'hex')
      AND invitation.token_hash <> v_invitation.invitation_token
  ) THEN
    RAISE EXCEPTION 'agency invitation token was not stored hash-only';
  END IF;

  BEGIN
    PERFORM * FROM public.issue_agency_staff_invitation(
      v_agency.agency_id, 'different.staff@example.test', 'PORTFOLIO_MANAGER',
      now() + interval '7 days', '60000000-0000-4000-8000-000000000004'
    );
    RAISE EXCEPTION 'agency invitation idempotency conflict unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%IDEMPOTENCY_CONFLICT%' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', v_outsider_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_outsider_id, 'email', 'agency.outsider@example.test', 'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  BEGIN
    PERFORM * FROM public.accept_agency_staff_invitation(v_invitation.invitation_token);
    RAISE EXCEPTION 'cross-account agency invitation acceptance unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%AGENCY_INVITATION_EMAIL_MISMATCH%' THEN RAISE; END IF;
  END;

  SELECT * INTO v_outsider_agency
  FROM public.create_management_agency(
    'No Tenant Agency', 'No Tenant Agency Kft.', NULL, NULL, NULL,
    '60000000-0000-4000-8000-000000000005'
  );
  IF private.has_active_workspace_membership(v_outsider_id, v_workspace_id) THEN
    RAISE EXCEPTION 'agency membership alone granted tenant access';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_staff_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_staff_id, 'email', 'agency.staff@example.test', 'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  SELECT * INTO v_accept
  FROM public.accept_agency_staff_invitation(v_invitation.invitation_token);
  SELECT * INTO v_accept_retry
  FROM public.accept_agency_staff_invitation(v_invitation.invitation_token);
  IF v_accept.organization_membership_id IS DISTINCT FROM v_accept_retry.organization_membership_id
     OR v_accept.organization_role <> 'PORTFOLIO_MANAGER'
     OR v_accept.projected_workspace_count <> 1 THEN
    RAISE EXCEPTION 'agency invitation acceptance or replay failed';
  END IF;
  v_staff_organization_membership_id := v_accept.organization_membership_id;

  SELECT * INTO v_agency_grant
  FROM public.agency_workspace_grants grant_record
  WHERE grant_record.portfolio_assignment_id = v_assignment.portfolio_assignment_id
    AND grant_record.organization_membership_id = v_staff_organization_membership_id;
  IF v_agency_grant.id IS NULL
     OR v_agency_grant.role_key <> 'DELEGATE_OPERATIONS'
     OR v_agency_grant.workspace_membership_created
     OR NOT v_agency_grant.workspace_membership_activated THEN
    RAISE EXCEPTION 'agency portfolio role mapping or reactivation provenance failed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.delegations delegation
    WHERE delegation.id = v_agency_grant.delegation_id
      AND delegation.status = 'ACTIVE'
      AND delegation.can_redelegate = false
  ) OR NOT EXISTS (
    SELECT 1 FROM public.role_assignments assignment
    WHERE assignment.id = v_agency_grant.role_assignment_id
      AND assignment.role_key = 'DELEGATE_OPERATIONS'
      AND assignment.status = 'ACTIVE'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.memberships legacy
    WHERE legacy.profile_id = v_staff_id
      AND legacy.building_id = v_workspace_id
      AND legacy.role = 'megbizott'
      AND legacy.active
  ) THEN
    RAISE EXCEPTION 'normalized or legacy staff projection is incomplete';
  END IF;

  BEGIN
    PERFORM * FROM public.issue_agency_staff_invitation(
      v_agency.agency_id, 'forbidden-by-manager@example.test', 'OPERATIONS',
      now() + interval '7 days', '60000000-0000-4000-8000-000000000006'
    );
    RAISE EXCEPTION 'portfolio manager escalated to agency admin unexpectedly';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%AGENCY_ADMIN_REQUIRED%' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id, 'email', 'self.manager@example.test', 'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  SELECT * INTO v_admin_invitation
  FROM public.issue_agency_staff_invitation(
    v_agency.agency_id, 'agency.admin@example.test', 'AGENCY_ADMIN',
    now() + interval '7 days', '60000000-0000-4000-8000-000000000007'
  );

  PERFORM set_config('request.jwt.claim.sub', v_agency_admin_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_agency_admin_id, 'email', 'agency.admin@example.test', 'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  SELECT * INTO v_admin_accept
  FROM public.accept_agency_staff_invitation(v_admin_invitation.invitation_token);
  SELECT * INTO v_stale_invitation
  FROM public.issue_agency_staff_invitation(
    v_agency.agency_id, 'stale.target@example.test', 'OPERATIONS',
    now() + interval '7 days', '60000000-0000-4000-8000-000000000008'
  );

  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id, 'email', 'self.manager@example.test', 'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  PERFORM * FROM public.revoke_agency_staff_membership(
    v_agency.agency_id, v_admin_accept.organization_membership_id,
    'Canary revoked invitation issuer',
    '60000000-0000-4000-8000-000000000009'
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_staff_invitations invitation
    WHERE invitation.id = v_stale_invitation.invitation_id
      AND invitation.status = 'REVOKED'
      AND invitation.revoked_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'pending invitation was not revoked with its issuer';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_stale_target_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_stale_target_id, 'email', 'stale.target@example.test', 'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  BEGIN
    PERFORM * FROM public.accept_agency_staff_invitation(v_stale_invitation.invitation_token);
    RAISE EXCEPTION 'revoked inviter invitation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%AGENCY_INVITATION_INACTIVE%'
       AND COALESCE(v_detail, '') NOT LIKE '%INVITATION_GRANTOR_AUTHORITY_EXPIRED%' THEN
      RAISE;
    END IF;
  END;

  SELECT link.person_id INTO v_expired_person_id
  FROM public.person_account_links link
  WHERE link.profile_id = v_expired_admin_id
    AND link.status = 'ACTIVE'
    AND link.valid_to IS NULL;
  INSERT INTO public.workspace_memberships(
    id, workspace_id, profile_id, status, source, created_by_profile_id
  ) VALUES (
    v_expired_workspace_membership_id, v_workspace_id, v_expired_admin_id,
    'ACTIVE', 'ADMIN', v_manager_id
  );
  INSERT INTO public.membership_periods(
    workspace_id, membership_id, started_at, start_reason
  ) VALUES (
    v_workspace_id, v_expired_workspace_membership_id,
    now() - interval '3 days', 'EXPIRED_ADMIN_CANARY'
  );
  INSERT INTO public.management_mandates(
    id, workspace_id, mandate_party_id, mandate_type, status,
    verification_status, valid_from, valid_to, created_by_profile_id
  ) VALUES (
    v_expired_mandate_id, v_workspace_id, v_expired_person_id,
    'COMMON_REPRESENTATIVE', 'ACTIVE', 'VERIFIED',
    now() - interval '3 days', now() - interval '1 day', v_manager_id
  );
  INSERT INTO public.role_assignments(
    id, workspace_id, membership_id, role_key, source_mandate_id,
    status, valid_from, valid_to, granted_by_profile_id, reason
  ) VALUES (
    v_expired_role_assignment_id, v_workspace_id, v_expired_workspace_membership_id,
    'COMMON_REPRESENTATIVE_ADMIN', v_expired_mandate_id, 'ACTIVE',
    now() - interval '3 days', now() - interval '1 day', v_manager_id,
    'EXPIRED_ADMIN_CANARY'
  );

  PERFORM set_config('request.jwt.claim.sub', v_expired_admin_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_expired_admin_id, 'email', 'expired.admin@example.test', 'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  BEGIN
    PERFORM * FROM public.end_agency_portfolio_assignment(
      v_assignment.portfolio_assignment_id, 'Expired admin must not end this',
      '60000000-0000-4000-8000-000000000010'
    );
    RAISE EXCEPTION 'expired direct admin unexpectedly ended the portfolio';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%AGENCY_PORTFOLIO_END_AUTHORITY_REQUIRED%' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id, 'email', 'self.manager@example.test', 'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp', 'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );
  SELECT * INTO v_revoke
  FROM public.revoke_agency_staff_membership(
    v_agency.agency_id, v_staff_organization_membership_id,
    'Canary staff access revoked',
    '60000000-0000-4000-8000-000000000011'
  );
  SELECT * INTO v_revoke_retry
  FROM public.revoke_agency_staff_membership(
    v_agency.agency_id, v_staff_organization_membership_id,
    'Canary staff access revoked',
    '60000000-0000-4000-8000-000000000011'
  );
  IF v_revoke.organization_membership_id IS DISTINCT FROM v_revoke_retry.organization_membership_id THEN
    RAISE EXCEPTION 'agency staff revocation idempotency failed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.agency_workspace_grants grant_record
    WHERE grant_record.id = v_agency_grant.id AND grant_record.status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM public.role_assignments assignment
    WHERE assignment.id = v_agency_grant.role_assignment_id AND assignment.status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM public.delegations delegation
    WHERE delegation.id = v_agency_grant.delegation_id AND delegation.status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_memberships membership
    WHERE membership.id = v_staff_workspace_membership_id AND membership.status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM public.memberships legacy
    WHERE legacy.profile_id = v_staff_id
      AND legacy.building_id = v_workspace_id
      AND legacy.role = 'megbizott'
      AND legacy.active
  ) THEN
    RAISE EXCEPTION 'agency staff revocation left normalized or legacy access active';
  END IF;

  SELECT membership.id INTO v_owner_organization_membership_id
  FROM public.organization_memberships membership
  WHERE membership.organization_id = v_agency.agency_id
    AND membership.profile_id = v_manager_id
    AND membership.organization_role = 'AGENCY_OWNER';
  BEGIN
    PERFORM * FROM public.revoke_agency_staff_membership(
      v_agency.agency_id, v_owner_organization_membership_id,
      'Different target under reused key',
      '60000000-0000-4000-8000-000000000011'
    );
    RAISE EXCEPTION 'agency revocation idempotency scope conflict unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%IDEMPOTENCY_CONFLICT%' THEN RAISE; END IF;
  END;

  SELECT * INTO v_end
  FROM public.end_agency_portfolio_assignment(
    v_assignment.portfolio_assignment_id, 'Canary portfolio mandate ended',
    '60000000-0000-4000-8000-000000000012'
  );
  SELECT * INTO v_end_retry
  FROM public.end_agency_portfolio_assignment(
    v_assignment.portfolio_assignment_id, 'Canary portfolio mandate ended',
    '60000000-0000-4000-8000-000000000012'
  );
  IF v_end.portfolio_assignment_id IS DISTINCT FROM v_end_retry.portfolio_assignment_id THEN
    RAISE EXCEPTION 'portfolio end idempotency failed';
  END IF;
  BEGIN
    PERFORM * FROM public.end_agency_portfolio_assignment(
      'ffffffff-ffff-4fff-8fff-ffffffffffff', 'Different target under reused key',
      '60000000-0000-4000-8000-000000000012'
    );
    RAISE EXCEPTION 'portfolio end idempotency scope conflict unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%IDEMPOTENCY_CONFLICT%' THEN RAISE; END IF;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.agency_portfolio_assignments assignment
    JOIN public.management_mandates mandate
      ON mandate.workspace_id = assignment.workspace_id
     AND mandate.id = assignment.mandate_id
     AND mandate.agency_id = assignment.agency_id
    WHERE assignment.id = v_assignment.portfolio_assignment_id
      AND assignment.status = 'ENDED'
      AND assignment.end_request_fingerprint IS NOT NULL
      AND mandate.status = 'REVOKED'
      AND mandate.verification_status = 'ENDED'
  ) OR EXISTS (
    SELECT 1 FROM public.agency_workspace_grants grant_record
    WHERE grant_record.portfolio_assignment_id = v_assignment.portfolio_assignment_id
      AND grant_record.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'portfolio termination did not close mandate and grants atomically';
  END IF;

  IF has_table_privilege('authenticated', 'public.agency_staff_invitations', 'SELECT')
     OR has_table_privilege('authenticated', 'public.agency_portfolio_assignments', 'SELECT')
     OR has_table_privilege('authenticated', 'public.agency_workspace_grants', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated retained direct agency table privileges';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename IN (
        'agency_staff_invitations', 'agency_portfolio_assignments', 'agency_workspace_grants'
      )
  ) OR EXISTS (
    SELECT 1 FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN (
        'agency_staff_invitations', 'agency_portfolio_assignments', 'agency_workspace_grants'
      )
      AND (NOT relation.relrowsecurity OR NOT relation.relforcerowsecurity)
  ) THEN
    RAISE EXCEPTION 'agency tables are not FORCE-RLS default-deny';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.authorization_audit_events event
    WHERE event.action_key = 'AGENCY_PORTFOLIO_ASSIGNED'
      AND event.object_id = v_assignment.portfolio_assignment_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.authorization_audit_events event
    WHERE event.action_key = 'AGENCY_PORTFOLIO_ENDED'
      AND event.object_id = v_assignment.portfolio_assignment_id
  ) THEN
    RAISE EXCEPTION 'agency portfolio authorization audit trail is incomplete';
  END IF;

  RAISE NOTICE 'agency portfolio runtime canary PASS';
END;
$canary$;

ROLLBACK;
