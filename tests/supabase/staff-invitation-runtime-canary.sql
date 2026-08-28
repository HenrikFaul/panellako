\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  ('44444444-4444-4444-8444-444444444441', 'staff.one@example.test', now(), '{"full_name":"Staff One"}'::jsonb),
  ('44444444-4444-4444-8444-444444444442', 'owner.claim@example.test', now(), '{"full_name":"Owner Claim"}'::jsonb),
  ('44444444-4444-4444-8444-444444444443', 'resident.pending@example.test', now(), '{"full_name":"Pending Resident"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

DO $canary$
DECLARE
  v_workspace_id constant uuid := 'e84e0281-b012-4aa0-8bac-14b91fe8cf0d';
  v_other_workspace_id constant uuid := 'bbbbbbbb-0001-0001-0001-000000000001';
  v_unit_id constant uuid := '1be80245-e935-42e5-8aba-3aefa3f49c29';
  v_manager_id constant uuid := '33333333-3333-3333-3333-333333333333';
  v_staff_id constant uuid := '44444444-4444-4444-8444-444444444441';
  v_owner_id constant uuid := '44444444-4444-4444-8444-444444444442';
  v_pending_id constant uuid := '44444444-4444-4444-8444-444444444443';
  v_staff record;
  v_staff_accept record;
  v_staff_retry record;
  v_owner record;
  v_owner_accept record;
  v_pending record;
  v_detail text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id,
      'email', 'self.manager@example.test',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp',
        'timestamp', EXTRACT(epoch FROM now())
      ))
    )::text,
    true
  );

  BEGIN
    PERFORM * FROM public.issue_workspace_staff_invitation(
      v_workspace_id,
      'forbidden-admin@example.test',
      'COMMON_REPRESENTATIVE_ADMIN',
      NULL,
      now() + interval '7 days',
      NULL,
      '44444444-4444-4444-8444-444444444401'
    );
    RAISE EXCEPTION 'admin role invitation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%ADMIN_ROLE_STAFF_INVITATION_FORBIDDEN%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM * FROM public.issue_workspace_staff_invitation(
      v_workspace_id,
      'amplification@example.test',
      'DELEGATE_OPERATIONS',
      ARRAY['role.grant_admin'],
      now() + interval '7 days',
      NULL,
      '44444444-4444-4444-8444-444444444402'
    );
    RAISE EXCEPTION 'privilege amplification unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%STAFF_ROLE_CAPABILITY_AMPLIFICATION_FORBIDDEN%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM * FROM public.issue_workspace_staff_invitation(
      v_other_workspace_id,
      'cross-workspace@example.test',
      'ACCOUNTANT',
      NULL,
      now() + interval '7 days',
      NULL,
      '44444444-4444-4444-8444-444444444403'
    );
    RAISE EXCEPTION 'cross-workspace invitation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%WORKSPACE_CAPABILITY_DENIED%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM * FROM public.issue_membership_invitation(
      v_workspace_id,
      'self.manager@example.test',
      v_unit_id,
      'OWNER',
      now() + interval '7 days',
      '44444444-4444-4444-8444-444444444404'
    );
    RAISE EXCEPTION 'owner self-invitation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%OWNER_SELF_INVITATION_FORBIDDEN%' THEN
      RAISE;
    END IF;
  END;

  SELECT * INTO v_staff
  FROM public.issue_workspace_staff_invitation(
    v_workspace_id,
    'staff.one@example.test',
    'DELEGATE_OPERATIONS',
    ARRAY['ticket.manage_all'],
    now() + interval '7 days',
    now() + interval '30 days',
    '44444444-4444-4444-8444-444444444405'
  );

  IF v_staff.invitation_token IS NULL THEN
    RAISE EXCEPTION 'staff token was not returned on first issue';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_staff_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_staff_id, 'email', 'staff.one@example.test', 'aal', 'aal1')::text,
    true
  );

  SELECT * INTO v_staff_accept
  FROM public.accept_workspace_staff_invitation(
    v_staff.invitation_token,
    '44444444-4444-4444-8444-444444444406'
  );
  SELECT * INTO v_staff_retry
  FROM public.accept_workspace_staff_invitation(
    v_staff.invitation_token,
    '44444444-4444-4444-8444-444444444406'
  );

  IF v_staff_accept.membership_id IS DISTINCT FROM v_staff_retry.membership_id
     OR v_staff_accept.role_assignment_id IS DISTINCT FROM v_staff_retry.role_assignment_id THEN
    RAISE EXCEPTION 'staff accept idempotency failed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.id = v_staff_accept.membership_id
      AND wm.primary_context_unit_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'staff membership fabricated a unit context';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.unit_ownerships uo
    JOIN public.person_account_links pal ON pal.person_id = uo.party_id
    WHERE pal.profile_id = v_staff_id AND uo.workspace_id = v_workspace_id
  ) OR EXISTS (
    SELECT 1 FROM public.unit_occupancies uoc
    JOIN public.person_account_links pal ON pal.person_id = uoc.person_id
    WHERE pal.profile_id = v_staff_id AND uoc.workspace_id = v_workspace_id
  ) THEN
    RAISE EXCEPTION 'staff acceptance fabricated a unit relationship';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships legacy
    WHERE legacy.profile_id = v_staff_id
      AND legacy.building_id = v_workspace_id
      AND legacy.role = 'megbizott'
      AND legacy.active
  ) THEN
    RAISE EXCEPTION 'legacy megbizott projection is missing';
  END IF;

  BEGIN
    PERFORM * FROM public.accept_workspace_staff_invitation(
      v_staff.invitation_token,
      '44444444-4444-4444-8444-444444444407'
    );
    RAISE EXCEPTION 'staff token replay unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%STAFF_INVITATION_NOT_ACCEPTABLE%' THEN
      RAISE;
    END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_manager_id,
      'email', 'self.manager@example.test',
      'aal', 'aal2',
      'amr', jsonb_build_array(jsonb_build_object(
        'method', 'totp',
        'timestamp', EXTRACT(epoch FROM now())
      ))
    )::text,
    true
  );

  SELECT * INTO v_owner
  FROM public.issue_membership_invitation(
    v_workspace_id,
    'owner.claim@example.test',
    v_unit_id,
    'OWNER',
    now() + interval '7 days',
    '44444444-4444-4444-8444-444444444408'
  );

  SELECT * INTO v_pending
  FROM public.issue_membership_invitation(
    v_workspace_id,
    'resident.pending@example.test',
    v_unit_id,
    'TENANT',
    now() + interval '7 days',
    '44444444-4444-4444-8444-444444444409'
  );

  PERFORM set_config('request.jwt.claim.sub', v_staff_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_staff_id, 'email', 'staff.one@example.test', 'aal', 'aal1')::text,
    true
  );
  BEGIN
    PERFORM * FROM public.accept_membership_invitation(
      v_pending.invitation_token,
      '44444444-4444-4444-8444-444444444410'
    );
    RAISE EXCEPTION 'resident email mismatch unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%INVITATION_NOT_ACCEPTABLE%' THEN
      RAISE;
    END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', v_owner_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_owner_id, 'email', 'owner.claim@example.test', 'aal', 'aal1')::text,
    true
  );
  SELECT * INTO v_owner_accept
  FROM public.accept_membership_invitation(
    v_owner.invitation_token,
    '44444444-4444-4444-8444-444444444411'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.unit_ownerships uo
    JOIN public.person_account_links pal ON pal.person_id = uo.party_id
    WHERE pal.profile_id = v_owner_id
      AND uo.workspace_id = v_workspace_id
      AND uo.unit_id = v_unit_id
      AND uo.status = 'CLAIMED'
  ) THEN
    RAISE EXCEPTION 'owner invitation did not create the expected CLAIMED relation';
  END IF;
  IF private.can_read_verified_unit_finance(v_workspace_id, v_unit_id) THEN
    RAISE EXCEPTION 'CLAIMED owner unexpectedly gained verified finance access';
  END IF;
  IF 'OWNER' = ANY(private.relationship_labels(v_owner_id, v_workspace_id)) THEN
    RAISE EXCEPTION 'CLAIMED owner unexpectedly gained owner role projection';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.memberships legacy
    WHERE legacy.profile_id = v_owner_id
      AND legacy.building_id = v_workspace_id
      AND legacy.role = 'tulajdonos'
      AND legacy.active
  ) THEN
    RAISE EXCEPTION 'CLAIMED owner unexpectedly gained legacy tulajdonos projection';
  END IF;

  UPDATE public.management_mandates
  SET status = 'SUSPENDED', updated_at = now()
  WHERE id = 'efaa765a-8f98-48e4-a638-47123edfccc7';

  PERFORM set_config('request.jwt.claim.sub', v_pending_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_pending_id, 'email', 'resident.pending@example.test', 'aal', 'aal1')::text,
    true
  );
  BEGIN
    PERFORM * FROM public.accept_membership_invitation(
      v_pending.invitation_token,
      '44444444-4444-4444-8444-444444444412'
    );
    RAISE EXCEPTION 'revoked-authority resident invitation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%INVITATION_GRANTOR_AUTHORITY_EXPIRED%' THEN
      RAISE;
    END IF;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.authorization_audit_events event
    WHERE event.workspace_id = v_workspace_id
      AND event.action_key = 'WORKSPACE_STAFF_INVITATION_ACCEPTED'
      AND event.object_id = v_staff_accept.role_assignment_id
  ) THEN
    RAISE EXCEPTION 'staff acceptance audit event is missing';
  END IF;

  RAISE NOTICE 'staff invitation runtime canary PASS';
END;
$canary$;

ROLLBACK;
