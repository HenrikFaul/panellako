\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  ('77777777-7777-4777-8777-777777770101', 'registry.manager@example.test', now(), '{"full_name":"Registry Manager"}'::jsonb),
  ('77777777-7777-4777-8777-777777770102', 'registry.delegate@example.test', now(), '{"full_name":"Registry Delegate"}'::jsonb),
  ('77777777-7777-4777-8777-777777770103', 'registry.member@example.test', now(), '{"full_name":"Registry Member"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

DO $canary$
DECLARE
  v_workspace_id constant uuid := '77777777-7777-4777-8777-777777770001';
  v_unit_one constant uuid := '77777777-7777-4777-8777-777777770011';
  v_unit_two constant uuid := '77777777-7777-4777-8777-777777770012';
  v_manager_id constant uuid := '77777777-7777-4777-8777-777777770101';
  v_delegate_id constant uuid := '77777777-7777-4777-8777-777777770102';
  v_member_id constant uuid := '77777777-7777-4777-8777-777777770103';
  v_manager_membership_id constant uuid := '77777777-7777-4777-8777-777777770201';
  v_member_membership_id constant uuid := '77777777-7777-4777-8777-777777770203';
  v_outside_person_id constant uuid := '77777777-7777-4777-8777-777777770104';
  v_claimed_person_id constant uuid := '77777777-7777-4777-8777-777777770105';
  v_claimed_occupancy_id constant uuid := '77777777-7777-4777-8777-777777770301';
  v_staff record;
  v_staff_accept record;
  v_first record;
  v_first_retry record;
  v_second record;
  v_review record;
  v_membership_change record;
  v_membership_retry record;
  v_verified_share numeric;
  v_detail text;
BEGIN
  INSERT INTO public.buildings (id, name, address)
  VALUES (v_workspace_id, 'Registry Test House', 'Budapest, Registry utca 1.');

  INSERT INTO public.physical_buildings (
    id, canonical_name, status, address_verification_status
  ) VALUES (
    v_workspace_id, 'Registry Test House', 'ACTIVE', 'VERIFIED'
  );

  INSERT INTO public.workspaces (
    id, name, legal_form, governance_mode, status
  ) VALUES (
    v_workspace_id, 'Registry Test House', 'CONDOMINIUM',
    'REPRESENTATIVE_MANAGED', 'ACTIVE'
  );

  INSERT INTO public.workspace_buildings (
    workspace_id, physical_building_id, is_primary, valid_from
  ) VALUES (
    v_workspace_id, v_workspace_id, true, now()
  );

  INSERT INTO public.units (
    id, building_id, unit_label, unit_type, workspace_id,
    physical_building_id, designation, normalized_designation,
    unit_category, created_by_profile_id, status
  ) VALUES
    (
      v_unit_one, v_workspace_id, '1', 'Lakas', v_workspace_id,
      v_workspace_id, '1', '1', 'APARTMENT', v_manager_id, 'ACTIVE'
    ),
    (
      v_unit_two, v_workspace_id, '2', 'Lakas', v_workspace_id,
      v_workspace_id, '2', '2', 'APARTMENT', v_manager_id, 'ACTIVE'
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
    v_workspace_id, v_manager_membership_id, 'RUNTIME_CANARY', v_manager_id
  );

  INSERT INTO public.management_mandates (
    id, workspace_id, mandate_party_id, mandate_type, status,
    verification_status, evidence_reference, created_by_profile_id
  ) VALUES (
    '77777777-7777-4777-8777-777777770401',
    v_workspace_id,
    v_manager_id,
    'COMMON_REPRESENTATIVE',
    'ACTIVE',
    'VERIFIED',
    'runtime-canary:verified-mandate',
    v_manager_id
  );

  INSERT INTO public.role_assignments (
    id, workspace_id, membership_id, role_key, source_mandate_id,
    status, granted_by_profile_id, reason
  ) VALUES (
    '77777777-7777-4777-8777-777777770501',
    v_workspace_id,
    v_manager_membership_id,
    'COMMON_REPRESENTATIVE_ADMIN',
    '77777777-7777-4777-8777-777777770401',
    'ACTIVE',
    v_manager_id,
    'RUNTIME_CANARY'
  );

  INSERT INTO public.memberships (
    profile_id, building_id, role, active
  ) VALUES (
    v_manager_id, v_workspace_id, 'kozos_kepviselo', true
  );

  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id,
      'email', 'registry.manager@example.test',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp',
        'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );

  SELECT * INTO v_staff
  FROM public.issue_workspace_staff_invitation(
    v_workspace_id,
    'registry.delegate@example.test',
    'DELEGATE_OPERATIONS',
    ARRAY['unit_relation.verify', 'membership.suspend'],
    now() + interval '7 days',
    now() + interval '30 days',
    '77777777-7777-4777-8777-777777771001'
  );

  PERFORM set_config('request.jwt.claim.sub', v_delegate_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_delegate_id,
      'email', 'registry.delegate@example.test',
      'aal', 'aal1'
    )::text,
    true
  );
  SELECT * INTO v_staff_accept
  FROM public.accept_workspace_staff_invitation(
    v_staff.invitation_token,
    '77777777-7777-4777-8777-777777771002'
  );

  IF NOT private.has_workspace_capability(
    v_delegate_id, v_workspace_id, 'UNIT_RELATION_VERIFY'
  ) OR NOT private.has_workspace_capability(
    v_delegate_id, v_workspace_id, 'MEMBERSHIP_SUSPEND'
  ) THEN
    RAISE EXCEPTION 'explicit registry capabilities were not delegated';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id,
      'email', 'registry.manager@example.test',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp',
        'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );

  BEGIN
    PERFORM * FROM public.create_workspace_person_relationship(
      v_workspace_id,
      NULL,
      'Invalid Evidence Resident',
      v_unit_one,
      'TENANT',
      NULL,
      NULL,
      'free form evidence is forbidden',
      '77777777-7777-4777-8777-777777771015'
    );
    RAISE EXCEPTION 'free-form relationship evidence unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%RELATIONSHIP_EVIDENCE_REQUIRED%' THEN
      RAISE;
    END IF;
  END;

  SELECT * INTO v_first
  FROM public.create_workspace_person_relationship(
    v_workspace_id,
    NULL,
    'Offline Lakó',
    v_unit_one,
    'TENANT',
    NULL,
    NULL,
    'runtime-canary:lease-reference-1',
    '77777777-7777-4777-8777-777777771003'
  );
  SELECT * INTO v_first_retry
  FROM public.create_workspace_person_relationship(
    v_workspace_id,
    NULL,
    'Offline Lakó',
    v_unit_one,
    'TENANT',
    NULL,
    NULL,
    'runtime-canary:lease-reference-1',
    '77777777-7777-4777-8777-777777771003'
  );

  IF v_first.person_id IS DISTINCT FROM v_first_retry.person_id
     OR v_first.occupancy_id IS DISTINCT FROM v_first_retry.occupancy_id THEN
    RAISE EXCEPTION 'person relationship idempotency failed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.person_account_links link
    WHERE link.person_id = v_first.person_id
  ) THEN
    RAISE EXCEPTION 'offline person unexpectedly received an auth account link';
  END IF;

  SELECT * INTO v_second
  FROM public.create_workspace_person_relationship(
    v_workspace_id,
    v_first.person_id,
    NULL,
    v_unit_two,
    'AUTHORIZED_OCCUPANT',
    NULL,
    NULL,
    'runtime-canary:occupancy-reference-2',
    '77777777-7777-4777-8777-777777771004'
  );
  IF v_second.person_id IS DISTINCT FROM v_first.person_id THEN
    RAISE EXCEPTION 'one person could not be linked to multiple units';
  END IF;

  PERFORM *
  FROM public.create_workspace_person_relationship(
    v_workspace_id,
    NULL,
    'Half Owner One',
    v_unit_two,
    'OWNER',
    1,
    2,
    'runtime-canary:owner-half-one',
    '77777777-7777-4777-8777-777777771020'
  );
  PERFORM *
  FROM public.create_workspace_person_relationship(
    v_workspace_id,
    NULL,
    'Half Owner Two',
    v_unit_two,
    'OWNER',
    1,
    2,
    'runtime-canary:owner-half-two',
    '77777777-7777-4777-8777-777777771021'
  );

  SELECT SUM(
    ownership.share_numerator::numeric / ownership.share_denominator::numeric
  )
  INTO v_verified_share
  FROM public.unit_ownerships ownership
  WHERE ownership.workspace_id = v_workspace_id
    AND ownership.unit_id = v_unit_two
    AND ownership.status = 'VERIFIED'
    AND ownership.valid_to IS NULL;

  IF v_verified_share <> 1 OR EXISTS (
    SELECT 1
    FROM public.unit_ownerships ownership
    WHERE ownership.workspace_id = v_workspace_id
      AND ownership.unit_id = v_unit_two
      AND ownership.status = 'VERIFIED'
      AND ownership.ownership_type <> 'CO_OWNER'
  ) THEN
    RAISE EXCEPTION 'verified co-owner shares were not stored consistently';
  END IF;

  BEGIN
    PERFORM *
    FROM public.create_workspace_person_relationship(
      v_workspace_id,
      NULL,
      'Overallocated Owner',
      v_unit_two,
      'OWNER',
      1,
      2,
      'runtime-canary:owner-overallocation',
      '77777777-7777-4777-8777-777777771022'
    );
    RAISE EXCEPTION 'verified ownership over-allocation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%OWNERSHIP_SHARE_EXCEEDED%' THEN
      RAISE;
    END IF;
  END;

  IF 2 <> (
    SELECT COUNT(*)
    FROM public.list_workspace_unit_relationships(v_workspace_id) relationship
    WHERE relationship.person_id = v_first.person_id
      AND relationship.relationship_status = 'VERIFIED'
  ) THEN
    RAISE EXCEPTION 'workspace relationship directory is incomplete';
  END IF;

  INSERT INTO public.parties (id, party_type, display_name, status)
  VALUES (v_outside_person_id, 'PERSON', 'Outside Person', 'ACTIVE');
  INSERT INTO public.people (party_id, preferred_name)
  VALUES (v_outside_person_id, 'Outside Person');

  BEGIN
    PERFORM * FROM public.create_workspace_person_relationship(
      v_workspace_id,
      v_outside_person_id,
      NULL,
      v_unit_one,
      'TENANT',
      NULL,
      NULL,
      'runtime-canary:outside-person-reference',
      '77777777-7777-4777-8777-777777771005'
    );
    RAISE EXCEPTION 'cross-scope person reuse unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%PERSON_SCOPE_MISMATCH%' THEN
      RAISE;
    END IF;
  END;

  INSERT INTO public.parties (id, party_type, display_name, status)
  VALUES (v_claimed_person_id, 'PERSON', 'Claimed Resident', 'ACTIVE');
  INSERT INTO public.people (party_id, preferred_name)
  VALUES (v_claimed_person_id, 'Claimed Resident');
  INSERT INTO public.unit_occupancies (
    id, workspace_id, unit_id, person_id, occupancy_type, status, source
  ) VALUES (
    v_claimed_occupancy_id, v_workspace_id, v_unit_one,
    v_claimed_person_id, 'HOUSEHOLD_MEMBER', 'CLAIMED', 'ADMIN'
  );

  SELECT * INTO v_review
  FROM public.review_workspace_unit_relationship(
    v_workspace_id,
    'OCCUPANCY',
    v_claimed_occupancy_id,
    'VERIFY',
    NULL,
    'runtime-canary:verified-claim-evidence',
    '77777777-7777-4777-8777-777777771006'
  );
  IF v_review.relationship_status <> 'VERIFIED' THEN
    RAISE EXCEPTION 'claimed relationship was not verified';
  END IF;

  PERFORM * FROM public.review_workspace_unit_relationship(
    v_workspace_id,
    'OCCUPANCY',
    v_claimed_occupancy_id,
    'DISPUTE',
    'A bizonyítékot újra kell ellenőrizni.',
    'runtime-canary:dispute-evidence',
    '77777777-7777-4777-8777-777777771007'
  );
  PERFORM * FROM public.review_workspace_unit_relationship(
    v_workspace_id,
    'OCCUPANCY',
    v_claimed_occupancy_id,
    'END',
    'A lakhatási jogviszony megszűnt.',
    NULL,
    '77777777-7777-4777-8777-777777771008'
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.unit_occupancies occupancy
    WHERE occupancy.id = v_claimed_occupancy_id
      AND occupancy.status = 'ENDED'
      AND occupancy.valid_to IS NOT NULL
      AND occupancy.ended_reason = 'A lakhatási jogviszony megszűnt.'
  ) OR 3 <> (
    SELECT COUNT(*) FROM public.unit_relationship_status_events event
    WHERE event.occupancy_id = v_claimed_occupancy_id
  ) THEN
    RAISE EXCEPTION 'relationship transition history is incomplete';
  END IF;

  BEGIN
    UPDATE public.unit_relationship_status_events
    SET reason = 'History rewrite'
    WHERE occupancy_id = v_claimed_occupancy_id;
    RAISE EXCEPTION 'immutable relationship history was updated';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%WORKSPACE_REGISTRY_HISTORY_IMMUTABLE%' THEN
      RAISE;
    END IF;
  END;

  INSERT INTO public.workspace_memberships (
    id, workspace_id, profile_id, status, source, created_by_profile_id,
    primary_context_unit_id
  ) VALUES (
    v_member_membership_id, v_workspace_id, v_member_id,
    'ACTIVE', 'ADMIN', v_manager_id, v_unit_one
  );
  INSERT INTO public.membership_periods (
    workspace_id, membership_id, start_reason, created_by_profile_id
  ) VALUES (
    v_workspace_id, v_member_membership_id, 'RUNTIME_CANARY', v_manager_id
  );

  SELECT * INTO v_membership_change
  FROM public.change_workspace_membership_status(
    v_workspace_id,
    v_member_membership_id,
    'SUSPENDED',
    'Ideiglenes adminisztratív felfüggesztés.',
    '77777777-7777-4777-8777-777777771009'
  );
  SELECT * INTO v_membership_retry
  FROM public.change_workspace_membership_status(
    v_workspace_id,
    v_member_membership_id,
    'SUSPENDED',
    'Ideiglenes adminisztratív felfüggesztés.',
    '77777777-7777-4777-8777-777777771009'
  );
  IF v_membership_change.membership_status <> 'SUSPENDED'
     OR v_membership_change.changed_at IS DISTINCT FROM v_membership_retry.changed_at
     OR EXISTS (
       SELECT 1 FROM public.membership_periods period
       WHERE period.membership_id = v_member_membership_id
         AND period.ended_at IS NULL
     ) THEN
    RAISE EXCEPTION 'membership suspension or retry is inconsistent';
  END IF;

  PERFORM * FROM public.change_workspace_membership_status(
    v_workspace_id,
    v_member_membership_id,
    'ACTIVE',
    'Az adminisztratív felfüggesztés megszűnt.',
    '77777777-7777-4777-8777-777777771010'
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.membership_periods period
    WHERE period.membership_id = v_member_membership_id
      AND period.ended_at IS NULL
      AND period.start_reason = 'ADMIN_REACTIVATION'
  ) THEN
    RAISE EXCEPTION 'membership reactivation did not open a new period';
  END IF;

  PERFORM * FROM public.change_workspace_membership_status(
    v_workspace_id,
    v_member_membership_id,
    'ENDED',
    'A digitális hozzáférés véglegesen lezárult.',
    '77777777-7777-4777-8777-777777771011'
  );
  IF EXISTS (
    SELECT 1 FROM public.membership_periods period
    WHERE period.membership_id = v_member_membership_id
      AND period.ended_at IS NULL
  ) OR 3 <> (
    SELECT COUNT(*) FROM public.workspace_membership_status_events event
    WHERE event.membership_id = v_member_membership_id
  ) THEN
    RAISE EXCEPTION 'membership lifecycle history is incomplete';
  END IF;

  BEGIN
    PERFORM * FROM public.change_workspace_membership_status(
      v_workspace_id,
      v_member_membership_id,
      'ACTIVE',
      'A végleges lezárást nem lehet visszafordítani.',
      '77777777-7777-4777-8777-777777771012'
    );
    RAISE EXCEPTION 'ended membership unexpectedly reactivated';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%MEMBERSHIP_STATUS_TRANSITION_INVALID%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM * FROM public.change_workspace_membership_status(
      v_workspace_id,
      v_manager_membership_id,
      'SUSPENDED',
      'Saját hozzáférés tiltási kísérlete.',
      '77777777-7777-4777-8777-777777771013'
    );
    RAISE EXCEPTION 'self membership suspension unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%SELF_MEMBERSHIP_STATUS_CHANGE_FORBIDDEN%' THEN
      RAISE;
    END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', v_delegate_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_delegate_id,
      'email', 'registry.delegate@example.test',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp',
        'timestamp', EXTRACT(epoch FROM clock_timestamp())
      ))
    )::text,
    true
  );

  BEGIN
    PERFORM * FROM public.change_workspace_membership_status(
      v_workspace_id,
      v_manager_membership_id,
      'SUSPENDED',
      'Az utolsó admin hozzáférésének tiltási kísérlete.',
      '77777777-7777-4777-8777-777777771014'
    );
    RAISE EXCEPTION 'last administrator suspension unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%LAST_ADMIN_PROTECTION%' THEN
      RAISE;
    END IF;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.authorization_audit_events event
    WHERE event.workspace_id = v_workspace_id
      AND event.action_key = 'WORKSPACE_PERSON_RELATIONSHIP_CREATED'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.authorization_audit_events event
    WHERE event.workspace_id = v_workspace_id
      AND event.action_key = 'WORKSPACE_UNIT_RELATIONSHIP_REVIEWED'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.authorization_audit_events event
    WHERE event.workspace_id = v_workspace_id
      AND event.action_key = 'WORKSPACE_MEMBERSHIP_STATUS_CHANGED'
  ) THEN
    RAISE EXCEPTION 'registry authorization audit evidence is incomplete';
  END IF;

  RAISE NOTICE 'workspace relationship registry runtime canary PASS';
END;
$canary$;

ROLLBACK;
