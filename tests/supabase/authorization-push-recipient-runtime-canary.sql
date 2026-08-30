\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  (
    '77777777-7777-4777-8777-77777777a101',
    'authorization.manager@example.test',
    now(),
    '{"full_name":"Authorization Manager"}'::jsonb
  ),
  (
    '77777777-7777-4777-8777-77777777a102',
    'authorization.delegate@example.test',
    now(),
    '{"full_name":"Authorization Delegate"}'::jsonb
  ),
  (
    '77777777-7777-4777-8777-77777777a103',
    'authorization.resident@example.test',
    now(),
    '{"full_name":"Authorization Resident"}'::jsonb
  ),
  (
    '77777777-7777-4777-8777-77777777a104',
    'authorization.accountant@example.test',
    now(),
    '{"full_name":"Authorization Accountant"}'::jsonb
  ),
  (
    '77777777-7777-4777-8777-77777777a105',
    'authorization.billing@example.test',
    now(),
    '{"full_name":"Authorization Billing Admin"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

SELECT private.bootstrap_profile(fixture.id, fixture.email, fixture.display_name)
FROM (
  VALUES
    (
      '77777777-7777-4777-8777-77777777a101'::uuid,
      'authorization.manager@example.test',
      'Authorization Manager'
    ),
    (
      '77777777-7777-4777-8777-77777777a102'::uuid,
      'authorization.delegate@example.test',
      'Authorization Delegate'
    ),
    (
      '77777777-7777-4777-8777-77777777a103'::uuid,
      'authorization.resident@example.test',
      'Authorization Resident'
    ),
    (
      '77777777-7777-4777-8777-77777777a104'::uuid,
      'authorization.accountant@example.test',
      'Authorization Accountant'
    ),
    (
      '77777777-7777-4777-8777-77777777a105'::uuid,
      'authorization.billing@example.test',
      'Authorization Billing Admin'
    )
) AS fixture(id, email, display_name);

INSERT INTO public.buildings (id, name, address)
VALUES
  (
    '77777777-7777-4777-8777-77777777a001',
    'Authorization Runtime Canary',
    'Budapest, Authorization utca 1.'
  ),
  (
    '77777777-7777-4777-8777-77777777a002',
    'Authorization Foreign Canary',
    'Budapest, Authorization utca 2.'
  );

INSERT INTO public.physical_buildings (
  id, canonical_name, status, address_verification_status
)
VALUES
  (
    '77777777-7777-4777-8777-77777777a001',
    'Authorization Runtime Canary', 'ACTIVE', 'VERIFIED'
  ),
  (
    '77777777-7777-4777-8777-77777777a002',
    'Authorization Foreign Canary', 'ACTIVE', 'VERIFIED'
  );

INSERT INTO public.workspaces (
  id, name, legal_form, governance_mode, status, created_by_profile_id
)
VALUES
  (
    '77777777-7777-4777-8777-77777777a001',
    'Authorization Runtime Canary',
    'CONDOMINIUM',
    'REPRESENTATIVE_MANAGED',
    'ACTIVE',
    '77777777-7777-4777-8777-77777777a101'
  ),
  (
    '77777777-7777-4777-8777-77777777a002',
    'Authorization Foreign Canary',
    'CONDOMINIUM',
    'REPRESENTATIVE_MANAGED',
    'ACTIVE',
    '77777777-7777-4777-8777-77777777a104'
  );

INSERT INTO public.workspace_buildings (
  workspace_id, physical_building_id, is_primary, valid_from
)
VALUES
  (
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777a001', true, now()
  ),
  (
    '77777777-7777-4777-8777-77777777a002',
    '77777777-7777-4777-8777-77777777a002', true, now()
  );

INSERT INTO public.units (
  id, building_id, unit_label, unit_type, workspace_id,
  physical_building_id, designation, normalized_designation,
  unit_category, created_by_profile_id, status
)
VALUES
  (
    '77777777-7777-4777-8777-77777777a011',
    '77777777-7777-4777-8777-77777777a001', '1', 'Lakas',
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777a001', '1', '1',
    'APARTMENT', '77777777-7777-4777-8777-77777777a101', 'ACTIVE'
  ),
  (
    '77777777-7777-4777-8777-77777777a012',
    '77777777-7777-4777-8777-77777777a002', '1', 'Lakas',
    '77777777-7777-4777-8777-77777777a002',
    '77777777-7777-4777-8777-77777777a002', '1', '1',
    'APARTMENT', '77777777-7777-4777-8777-77777777a104', 'ACTIVE'
  );

INSERT INTO public.workspace_memberships (
  id, workspace_id, profile_id, status, source, created_by_profile_id
)
VALUES
  (
    '77777777-7777-4777-8777-77777777b101',
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777a101',
    'ACTIVE', 'BOOTSTRAP', '77777777-7777-4777-8777-77777777a101'
  ),
  (
    '77777777-7777-4777-8777-77777777b102',
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777a102',
    'ACTIVE', 'ADMIN', '77777777-7777-4777-8777-77777777a101'
  ),
  (
    '77777777-7777-4777-8777-77777777b103',
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777a103',
    'ACTIVE', 'ADMIN', '77777777-7777-4777-8777-77777777a101'
  ),
  (
    '77777777-7777-4777-8777-77777777b104',
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777a104',
    'ACTIVE', 'ADMIN', '77777777-7777-4777-8777-77777777a101'
  ),
  (
    '77777777-7777-4777-8777-77777777b105',
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777a105',
    'ACTIVE', 'ADMIN', '77777777-7777-4777-8777-77777777a101'
  );

INSERT INTO public.membership_periods (
  workspace_id, membership_id, started_at, start_reason, created_by_profile_id
)
VALUES
  (
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777b101',
    now() - interval '1 day', 'RUNTIME_CANARY',
    '77777777-7777-4777-8777-77777777a101'
  ),
  (
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777b102',
    now() - interval '1 day', 'RUNTIME_CANARY',
    '77777777-7777-4777-8777-77777777a101'
  ),
  (
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777b103',
    now() - interval '1 day', 'RUNTIME_CANARY',
    '77777777-7777-4777-8777-77777777a101'
  ),
  (
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777b104',
    now() - interval '1 day', 'RUNTIME_CANARY',
    '77777777-7777-4777-8777-77777777a101'
  ),
  (
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777b105',
    now() - interval '1 day', 'RUNTIME_CANARY',
    '77777777-7777-4777-8777-77777777a101'
  );

INSERT INTO public.management_mandates (
  id, workspace_id, mandate_party_id, mandate_type, status,
  verification_status, evidence_reference, appointment_reference,
  valid_from, valid_to, created_by_profile_id
)
VALUES (
  '77777777-7777-4777-8777-77777777c101',
  '77777777-7777-4777-8777-77777777a001',
  '77777777-7777-4777-8777-77777777a101',
  'COMMON_REPRESENTATIVE', 'ACTIVE', 'VERIFIED',
  'runtime-canary:verified-mandate', 'runtime-canary:appointment',
  now() - interval '1 day', now() + interval '30 days',
  '77777777-7777-4777-8777-77777777a101'
);

INSERT INTO public.role_assignments (
  id, workspace_id, membership_id, role_key, source_mandate_id,
  status, valid_from, valid_to, granted_by_profile_id, reason
)
VALUES (
  '77777777-7777-4777-8777-77777777d101',
  '77777777-7777-4777-8777-77777777a001',
  '77777777-7777-4777-8777-77777777b101',
  'COMMON_REPRESENTATIVE_ADMIN',
  '77777777-7777-4777-8777-77777777c101',
  'ACTIVE', now() - interval '1 day', now() + interval '30 days',
  '77777777-7777-4777-8777-77777777a101',
  'RUNTIME_CANARY_VERIFIED_DIRECT_AUTHORITY'
);

INSERT INTO public.delegations (
  id, workspace_id, source_mandate_id, granted_by_membership_id,
  beneficiary_membership_id, capability_keys, status, valid_from, valid_to,
  can_redelegate, reason
)
VALUES (
  '77777777-7777-4777-8777-77777777e101',
  '77777777-7777-4777-8777-77777777a001',
  '77777777-7777-4777-8777-77777777c101',
  '77777777-7777-4777-8777-77777777b101',
  '77777777-7777-4777-8777-77777777b102',
  ARRAY['COMMUNICATION_MANAGE']::text[],
  'ACTIVE', now() - interval '1 day', now() + interval '30 days', false,
  'RUNTIME_CANARY_VERIFIED_DELEGATION'
);

INSERT INTO public.role_assignments (
  id, workspace_id, membership_id, role_key, source_delegation_id,
  status, valid_from, valid_to, granted_by_profile_id, reason
)
VALUES (
  '77777777-7777-4777-8777-77777777d102',
  '77777777-7777-4777-8777-77777777a001',
  '77777777-7777-4777-8777-77777777b102',
  'DELEGATE_OPERATIONS',
  '77777777-7777-4777-8777-77777777e101',
  'ACTIVE', now() - interval '1 day', now() + interval '30 days',
  '77777777-7777-4777-8777-77777777a101',
  'RUNTIME_CANARY_VERIFIED_DERIVATIVE_AUTHORITY'
);

INSERT INTO public.role_assignments (
  id, workspace_id, membership_id, role_key,
  status, valid_from, valid_to, granted_by_profile_id, reason
)
VALUES
  (
    '77777777-7777-4777-8777-77777777d104',
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777b104',
    'ACCOUNTANT', 'ACTIVE', now() - interval '1 day', now() + interval '30 days',
    '77777777-7777-4777-8777-77777777a101',
    'RUNTIME_CANARY_NON_MANAGER_STAFF'
  ),
  (
    '77777777-7777-4777-8777-77777777d105',
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777b105',
    'BILLING_ADMIN', 'ACTIVE', now() - interval '1 day', now() + interval '30 days',
    '77777777-7777-4777-8777-77777777a101',
    'RUNTIME_CANARY_NON_MANAGER_STAFF'
  );

-- The direct manager is also a verified owner in this tenant. The resident has
-- a verified occupancy. The accountant has an equally valid relationship, but
-- only in another tenant, and therefore must not enter this workspace's
-- resident audience.
INSERT INTO public.unit_ownerships (
  id, workspace_id, unit_id, party_id, ownership_type,
  share_numerator, share_denominator, valid_from, status,
  verification_method, verified_at, verified_by_profile_id,
  evidence_reference, source
)
VALUES (
  '77777777-7777-4777-8777-77777777f101',
  '77777777-7777-4777-8777-77777777a001',
  '77777777-7777-4777-8777-77777777a011',
  '77777777-7777-4777-8777-77777777a101',
  'SOLE_OWNER', 1, 1, now() - interval '1 day', 'VERIFIED',
  'ADMIN_REVIEW', now(), '77777777-7777-4777-8777-77777777a101',
  'runtime-canary:manager-owner', 'ADMIN'
);

INSERT INTO public.unit_occupancies (
  id, workspace_id, unit_id, person_id, occupancy_type,
  valid_from, status, verification_method, verified_at,
  verified_by_profile_id, evidence_reference, source
)
VALUES
  (
    '77777777-7777-4777-8777-77777777f103',
    '77777777-7777-4777-8777-77777777a001',
    '77777777-7777-4777-8777-77777777a011',
    '77777777-7777-4777-8777-77777777a103',
    'AUTHORIZED_OCCUPANT', now() - interval '1 day', 'VERIFIED',
    'ADMIN_REVIEW', now(), '77777777-7777-4777-8777-77777777a101',
    'runtime-canary:resident', 'ADMIN'
  ),
  (
    '77777777-7777-4777-8777-77777777f104',
    '77777777-7777-4777-8777-77777777a002',
    '77777777-7777-4777-8777-77777777a012',
    '77777777-7777-4777-8777-77777777a104',
    'AUTHORIZED_OCCUPANT', now() - interval '1 day', 'VERIFIED',
    'ADMIN_REVIEW', now(), '77777777-7777-4777-8777-77777777a104',
    'runtime-canary:foreign-resident', 'ADMIN'
  );

DO $canary$
DECLARE
  v_workspace_id constant uuid := '77777777-7777-4777-8777-77777777a001';
  v_manager_id constant uuid := '77777777-7777-4777-8777-77777777a101';
  v_delegate_id constant uuid := '77777777-7777-4777-8777-77777777a102';
BEGIN
  IF NOT private.has_workspace_capability(v_manager_id, v_workspace_id, 'announcement.publish') THEN
    RAISE EXCEPTION 'verified direct mandate did not grant its role capability';
  END IF;

  IF NOT private.has_workspace_capability(v_delegate_id, v_workspace_id, 'announcement.publish') THEN
    RAISE EXCEPTION 'verified source mandate did not grant delegated capability';
  END IF;

  UPDATE public.management_mandates
  SET verification_status = 'CLAIMED'
  WHERE id = '77777777-7777-4777-8777-77777777c101';

  IF private.has_workspace_capability(v_manager_id, v_workspace_id, 'announcement.publish') THEN
    RAISE EXCEPTION 'unverified direct mandate retained a role capability';
  END IF;

  IF private.has_workspace_capability(v_delegate_id, v_workspace_id, 'announcement.publish') THEN
    RAISE EXCEPTION 'delegation retained power after its source mandate lost verification';
  END IF;

  UPDATE public.management_mandates
  SET verification_status = 'VERIFIED'
  WHERE id = '77777777-7777-4777-8777-77777777c101';

  UPDATE public.workspaces
  SET status = 'SUSPENDED'
  WHERE id = v_workspace_id;

  IF private.has_workspace_capability(v_manager_id, v_workspace_id, 'workspace.read') THEN
    RAISE EXCEPTION 'suspended workspace retained a baseline capability';
  END IF;

  IF CARDINALITY(private.effective_capabilities(v_manager_id, v_workspace_id)) <> 0 THEN
    RAISE EXCEPTION 'suspended workspace retained projected capabilities';
  END IF;

  UPDATE public.workspaces
  SET status = 'ARCHIVED'
  WHERE id = v_workspace_id;

  IF private.has_workspace_capability(v_manager_id, v_workspace_id, 'workspace.read') THEN
    RAISE EXCEPTION 'archived workspace retained a baseline capability';
  END IF;

  IF CARDINALITY(private.effective_capabilities(v_manager_id, v_workspace_id)) <> 0 THEN
    RAISE EXCEPTION 'archived workspace retained projected capabilities';
  END IF;

  UPDATE public.workspaces
  SET status = 'ACTIVE'
  WHERE id = v_workspace_id;
END;
$canary$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true);
DO $unauthorized$
BEGIN
  PERFORM *
  FROM public.resolve_workspace_push_recipients(
    '77777777-7777-4777-8777-77777777a001',
    'all'
  );
  RAISE EXCEPTION 'authenticated role unexpectedly resolved push recipients';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END;
$unauthorized$;
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
DO $resolver$
DECLARE
  v_all_ids uuid[];
  v_manager_ids uuid[];
  v_resident_ids uuid[];
BEGIN
  SELECT COALESCE(ARRAY_AGG(profile_id ORDER BY profile_id), ARRAY[]::uuid[])
  INTO v_all_ids
  FROM public.resolve_workspace_push_recipients(
    '77777777-7777-4777-8777-77777777a001', 'all'
  );
  SELECT COALESCE(ARRAY_AGG(profile_id ORDER BY profile_id), ARRAY[]::uuid[])
  INTO v_manager_ids
  FROM public.resolve_workspace_push_recipients(
    '77777777-7777-4777-8777-77777777a001', 'manager'
  );
  SELECT COALESCE(ARRAY_AGG(profile_id ORDER BY profile_id), ARRAY[]::uuid[])
  INTO v_resident_ids
  FROM public.resolve_workspace_push_recipients(
    '77777777-7777-4777-8777-77777777a001', 'lako'
  );

  IF v_all_ids IS DISTINCT FROM ARRAY[
    '77777777-7777-4777-8777-77777777a101'::uuid,
    '77777777-7777-4777-8777-77777777a102'::uuid,
    '77777777-7777-4777-8777-77777777a103'::uuid,
    '77777777-7777-4777-8777-77777777a104'::uuid,
    '77777777-7777-4777-8777-77777777a105'::uuid
  ]::uuid[] THEN
    RAISE EXCEPTION 'all audience lost an active workspace member: %', v_all_ids;
  END IF;

  IF v_manager_ids IS DISTINCT FROM ARRAY[
    '77777777-7777-4777-8777-77777777a101'::uuid,
    '77777777-7777-4777-8777-77777777a102'::uuid
  ]::uuid[] THEN
    RAISE EXCEPTION 'manager audience was not derived from effective admin/delegate roles: %', v_manager_ids;
  END IF;

  IF v_resident_ids IS DISTINCT FROM ARRAY[
    '77777777-7777-4777-8777-77777777a101'::uuid,
    '77777777-7777-4777-8777-77777777a103'::uuid
  ]::uuid[] THEN
    RAISE EXCEPTION
      'recipient classification failed: verified owner/occupant audience %',
      v_resident_ids;
  END IF;
END;
$resolver$;
RESET ROLE;

ROLLBACK;

SELECT 'authorization push recipient runtime canary PASS' AS result;
