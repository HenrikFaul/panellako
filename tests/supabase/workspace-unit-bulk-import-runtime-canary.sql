\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES (
  '77777777-7777-4777-8777-777777714101',
  'unit-import.manager@example.test',
  now(),
  '{"full_name":"Unit Import Manager"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

DO $canary$
DECLARE
  v_workspace_id constant uuid := '77777777-7777-4777-8777-777777714001';
  v_other_workspace_id constant uuid := '77777777-7777-4777-8777-777777714002';
  v_manager_id constant uuid := '77777777-7777-4777-8777-777777714101';
  v_membership_id constant uuid := '77777777-7777-4777-8777-777777714201';
  v_import_key constant uuid := '77777777-7777-4777-8777-777777714301';
  v_other_unit_id constant uuid := '77777777-7777-4777-8777-777777714401';
  v_rows jsonb := '[
    {"designation":"10","unit_category":"APARTMENT"},
    {"designation":"10/T","unit_category":"STORAGE","parent_designation":"10"}
  ]'::jsonb;
  v_preview_count integer;
  v_apply record;
  v_retry record;
  v_invalid record;
  v_detail text;
BEGIN
  INSERT INTO public.buildings (id, name, address)
  VALUES
    (v_workspace_id, 'Unit Import Test House', 'Budapest, Import utca 1.'),
    (v_other_workspace_id, 'Other Unit Import House', 'Budapest, Import utca 2.');

  INSERT INTO public.physical_buildings (
    id, canonical_name, status, address_verification_status
  ) VALUES
    (v_workspace_id, 'Unit Import Test House', 'ACTIVE', 'VERIFIED'),
    (v_other_workspace_id, 'Other Unit Import House', 'ACTIVE', 'VERIFIED');

  INSERT INTO public.workspaces (
    id, name, legal_form, governance_mode, status
  ) VALUES
    (
      v_workspace_id, 'Unit Import Test House', 'CONDOMINIUM',
      'REPRESENTATIVE_MANAGED', 'ACTIVE'
    ),
    (
      v_other_workspace_id, 'Other Unit Import House', 'CONDOMINIUM',
      'REPRESENTATIVE_MANAGED', 'ACTIVE'
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
  ) VALUES (
    v_other_unit_id, v_other_workspace_id, 'Foreign parent', 'Lakas',
    v_other_workspace_id, v_other_workspace_id, 'Foreign parent',
    private.normalize_unit_designation('Foreign parent'),
    'APARTMENT', v_manager_id, 'ACTIVE'
  );

  INSERT INTO public.workspace_memberships (
    id, workspace_id, profile_id, status, source, created_by_profile_id
  ) VALUES (
    v_membership_id, v_workspace_id, v_manager_id,
    'ACTIVE', 'ADMIN', v_manager_id
  );
  INSERT INTO public.membership_periods (
    workspace_id, membership_id, start_reason, created_by_profile_id
  ) VALUES (
    v_workspace_id, v_membership_id, 'UNIT_IMPORT_RUNTIME_CANARY', v_manager_id
  );

  INSERT INTO public.management_mandates (
    id, workspace_id, mandate_party_id, mandate_type, status,
    verification_status, evidence_reference, created_by_profile_id
  ) VALUES (
    '77777777-7777-4777-8777-777777714501',
    v_workspace_id,
    v_manager_id,
    'COMMON_REPRESENTATIVE',
    'ACTIVE',
    'VERIFIED',
    'runtime-canary:unit-import-mandate',
    v_manager_id
  );

  INSERT INTO public.role_assignments (
    id, workspace_id, membership_id, role_key, source_mandate_id,
    status, granted_by_profile_id, reason
  ) VALUES (
    '77777777-7777-4777-8777-777777714601',
    v_workspace_id,
    v_membership_id,
    'COMMON_REPRESENTATIVE_ADMIN',
    '77777777-7777-4777-8777-777777714501',
    'ACTIVE',
    v_manager_id,
    'UNIT_IMPORT_RUNTIME_CANARY'
  );

  INSERT INTO public.memberships (profile_id, building_id, role, active)
  VALUES (v_manager_id, v_workspace_id, 'kozos_kepviselo', true);

  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id,
      'email', 'unit-import.manager@example.test',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp',
        'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );

  SELECT COUNT(*)
  INTO v_preview_count
  FROM public.preview_workspace_unit_import(v_workspace_id, v_rows) preview
  WHERE preview.status = 'READY';
  IF v_preview_count <> 2 THEN
    RAISE EXCEPTION 'valid unit import preview did not return two ready rows';
  END IF;

  SELECT * INTO v_apply
  FROM public.apply_workspace_unit_import(v_workspace_id, v_rows, v_import_key);
  IF NOT v_apply.applied OR v_apply.imported_count <> 2 THEN
    RAISE EXCEPTION 'valid unit import was not applied atomically';
  END IF;
  IF 2 <> (
    SELECT COUNT(*) FROM public.units unit
    WHERE unit.workspace_id = v_workspace_id
      AND unit.designation IN ('10', '10/T')
      AND unit.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'normalized and legacy unit rows were not both projected';
  END IF;
  IF 1 <> (
    SELECT COUNT(*)
    FROM public.unit_relations relation
    JOIN public.units parent ON parent.id = relation.parent_unit_id
    JOIN public.units child ON child.id = relation.child_unit_id
    WHERE relation.workspace_id = v_workspace_id
      AND relation.relation_type = 'ACCESSORY_OF'
      AND parent.designation = '10'
      AND child.designation = '10/T'
  ) THEN
    RAISE EXCEPTION 'same-batch parent relationship was not created';
  END IF;

  SELECT * INTO v_retry
  FROM public.apply_workspace_unit_import(v_workspace_id, v_rows, v_import_key);
  IF v_retry.import_id IS DISTINCT FROM v_apply.import_id
     OR v_retry.results IS DISTINCT FROM v_apply.results THEN
    RAISE EXCEPTION 'unit import idempotency replay changed the receipt';
  END IF;

  SELECT * INTO v_invalid
  FROM public.apply_workspace_unit_import(
    v_workspace_id,
    '[
      {"designation":"11","unit_category":"APARTMENT"},
      {"designation":" 1 1 ","unit_category":"APARTMENT"}
    ]'::jsonb,
    '77777777-7777-4777-8777-777777714302'
  );
  IF v_invalid.applied OR v_invalid.imported_count <> 0 THEN
    RAISE EXCEPTION 'duplicate batch was unexpectedly applied';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.units unit
    WHERE unit.workspace_id = v_workspace_id
      AND unit.normalized_designation = '11'
  ) THEN
    RAISE EXCEPTION 'invalid batch left a partial unit write';
  END IF;

  IF 'PARENT_NOT_FOUND' <> (
    SELECT preview.error_code
    FROM public.preview_workspace_unit_import(
      v_workspace_id,
      '[{
        "designation":"12/T",
        "unit_category":"STORAGE",
        "parent_designation":"Foreign parent"
      }]'::jsonb
    ) preview
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'cross-tenant parent was not masked as not found';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id,
      'email', 'unit-import.manager@example.test',
      'aal', 'aal1'
    )::text,
    true
  );
  BEGIN
    PERFORM *
    FROM public.apply_workspace_unit_import(
      v_workspace_id,
      '[{"designation":"13","unit_category":"APARTMENT"}]'::jsonb,
      '77777777-7777-4777-8777-777777714303'
    );
    RAISE EXCEPTION 'AAL1 unit import unexpectedly succeeded';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
      IF COALESCE(v_detail, '') NOT LIKE '%MFA_STEP_UP_REQUIRED%' THEN
        RAISE;
      END IF;
  END;
END;
$canary$;

ROLLBACK;
