-- PanelLako v0.10.1 - vote integrity closure
--
-- One active membership is not a legal voting entitlement. Votes are accepted
-- only through a command that derives unit, attendance and weight from trusted
-- rows. Meeting managers may record an attended unit's ballot; ordinary users
-- may cast only for a unit with a verified ownership relationship and their own
-- matching attendance row.

BEGIN;

-- An administrator role alone must never imply a personal vote entitlement.
DELETE FROM public.role_capabilities
WHERE capability_key = 'VOTE_CAST';

-- Keep the low-level capability helper consistent with the effective capability
-- projection. VOTE_CAST is relationship-derived and can never be inherited from
-- the blanket active-membership capability set or an administrative role.
CREATE OR REPLACE FUNCTION private.has_workspace_capability(
  p_profile_id uuid,
  p_workspace_id uuid,
  p_capability_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  WITH requested AS (
    SELECT COALESCE(
      (SELECT ckm.internal_key
       FROM public.capability_key_map ckm
       WHERE ckm.canonical_key = p_capability_key),
      p_capability_key
    ) AS internal_key
  ), active_membership AS (
    SELECT wm.id
    FROM public.workspace_memberships wm
    JOIN public.membership_periods mp
      ON mp.workspace_id = wm.workspace_id
     AND mp.membership_id = wm.id
     AND mp.ended_at IS NULL
    WHERE wm.profile_id = p_profile_id
      AND wm.workspace_id = p_workspace_id
      AND wm.status = 'ACTIVE'
  )
  SELECT EXISTS (SELECT 1 FROM active_membership)
    AND (
      (
        (SELECT internal_key FROM requested) = 'VOTE_CAST'
        AND private.has_verified_owner_relationship(p_profile_id, p_workspace_id, NULL)
      )
      OR (
        (SELECT internal_key FROM requested) <> 'VOTE_CAST'
        AND (
          (SELECT internal_key FROM requested) IN (
            'WORKSPACE_READ', 'COMMUNICATION_READ', 'DOCUMENT_READ',
            'DOCUMENT_OWNER_READ', 'DOCUMENT_UNIT_READ', 'MEETING_READ',
            'TICKET_CREATE', 'TICKET_READ_OWN', 'METER_SUBMIT',
            'METER_READ_OWN', 'ENVIRONMENT_READ', 'FINANCE_UNIT_READ',
            'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED'
          )
          OR EXISTS (
            SELECT 1
            FROM active_membership am
            JOIN public.role_assignments ra
              ON ra.workspace_id = p_workspace_id
             AND ra.membership_id = am.id
             AND ra.status = 'ACTIVE'
             AND ra.valid_from <= now()
             AND (ra.valid_to IS NULL OR ra.valid_to > now())
            JOIN public.role_capabilities rc
              ON rc.role_key = ra.role_key
             AND rc.capability_key = (SELECT internal_key FROM requested)
            LEFT JOIN public.management_mandates mm
              ON mm.workspace_id = ra.workspace_id
             AND mm.id = ra.source_mandate_id
             AND mm.status = 'ACTIVE'
             AND mm.valid_from <= now()
             AND (mm.valid_to IS NULL OR mm.valid_to > now())
            LEFT JOIN public.delegations d
              ON d.workspace_id = ra.workspace_id
             AND d.id = ra.source_delegation_id
             AND d.status = 'ACTIVE'
             AND d.valid_from <= now()
             AND (d.valid_to IS NULL OR d.valid_to > now())
            WHERE (
                ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
                AND mm.id IS NOT NULL
              )
              OR (
                ra.role_key = 'DELEGATE_OPERATIONS'
                AND d.id IS NOT NULL
                AND (SELECT internal_key FROM requested) = ANY(d.capability_keys)
              )
              OR ra.role_key IN ('COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN')
          )
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION private.has_workspace_capability(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_workspace_capability(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.effective_capabilities(
  p_profile_id uuid,
  p_workspace_id uuid
)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  WITH candidate(internal_key) AS (
    SELECT UNNEST(ARRAY[
      'WORKSPACE_READ', 'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED',
      'COMMUNICATION_READ', 'DOCUMENT_READ', 'DOCUMENT_OWNER_READ',
      'DOCUMENT_UNIT_READ', 'MEETING_READ', 'TICKET_CREATE',
      'TICKET_READ_OWN', 'METER_SUBMIT', 'METER_READ_OWN',
      'ENVIRONMENT_READ', 'FINANCE_UNIT_READ'
    ]::text[])
    WHERE private.has_active_workspace_membership(p_profile_id, p_workspace_id)
    UNION
    SELECT 'VOTE_CAST'
    WHERE private.has_active_workspace_membership(p_profile_id, p_workspace_id)
      AND private.has_verified_owner_relationship(p_profile_id, p_workspace_id, NULL)
    UNION
    SELECT rc.capability_key
    FROM public.role_capabilities rc
    WHERE rc.role_key = ANY(private.effective_role_keys(p_profile_id, p_workspace_id))
      AND private.has_workspace_capability(p_profile_id, p_workspace_id, rc.capability_key)
  )
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT ckm.canonical_key ORDER BY ckm.canonical_key),
    ARRAY[]::text[]
  )
  FROM candidate c
  JOIN public.capability_key_map ckm ON ckm.internal_key = c.internal_key;
$$;

REVOKE ALL ON FUNCTION private.effective_capabilities(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.effective_capabilities(uuid, uuid) TO authenticated;

-- The legacy constraint allowed only one vote per profile across all of their
-- units. The legal ballot identity is the resolution+unit tuple.
DO $$
DECLARE
  v_null_units bigint;
  v_duplicates bigint;
BEGIN
  SELECT COUNT(*) INTO v_null_units
  FROM public.votes
  WHERE unit_id IS NULL;

  IF v_null_units > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Vote integrity cut-over blocked by votes without unit',
      DETAIL = jsonb_build_object(
        'error_code', 'VOTE_INTEGRITY_PREFLIGHT_FAILED',
        'check', 'VOTE_UNIT_REQUIRED',
        'row_count', v_null_units
      )::text;
  END IF;

  SELECT COUNT(*) INTO v_duplicates
  FROM (
    SELECT resolution_id, unit_id
    FROM public.votes
    GROUP BY resolution_id, unit_id
    HAVING COUNT(*) > 1
  ) duplicate_votes;

  IF v_duplicates > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Vote integrity cut-over blocked by duplicate unit ballots',
      DETAIL = jsonb_build_object(
        'error_code', 'VOTE_INTEGRITY_PREFLIGHT_FAILED',
        'check', 'ONE_BALLOT_PER_RESOLUTION_UNIT',
        'group_count', v_duplicates
      )::text;
  END IF;
END;
$$;

ALTER TABLE public.votes ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_resolution_voter_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.votes'::regclass
      AND conname = 'votes_resolution_unit_unique'
  ) THEN
    ALTER TABLE public.votes
      ADD CONSTRAINT votes_resolution_unit_unique UNIQUE (resolution_id, unit_id);
  END IF;
END;
$$;

DROP POLICY IF EXISTS votes_self_insert ON public.votes;
DROP POLICY IF EXISTS votes_manager_update ON public.votes;
REVOKE INSERT, UPDATE ON TABLE public.votes FROM authenticated;

-- Attendance is part of the legal ballot identity. Once any resolution of a
-- meeting has a ballot for a unit, that unit's attendance row is immutable.
CREATE OR REPLACE FUNCTION private.guard_attendance_ballot_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.resolutions r
    JOIN public.votes v ON v.resolution_id = r.id
    WHERE r.meeting_id = OLD.meeting_id
      AND v.unit_id = OLD.unit_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Attendance is immutable after a ballot is recorded',
      DETAIL = '{"error_code":"ATTENDANCE_LOCKED_BY_BALLOT"}';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_attendance_ballot_immutability() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_meeting_attendance_ballot_immutability
  ON public.meeting_attendances;
CREATE TRIGGER trg_meeting_attendance_ballot_immutability
BEFORE UPDATE OR DELETE ON public.meeting_attendances
FOR EACH ROW EXECUTE FUNCTION private.guard_attendance_ballot_immutability();

-- Direct attendance mutations are replaced by profile-bound commands below.
DROP POLICY IF EXISTS meeting_attendances_manager_insert ON public.meeting_attendances;
DROP POLICY IF EXISTS meeting_attendances_manager_update ON public.meeting_attendances;
DROP POLICY IF EXISTS meeting_attendances_manager_delete ON public.meeting_attendances;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.meeting_attendances FROM authenticated;

CREATE OR REPLACE FUNCTION public.list_meeting_voter_options(
  p_workspace_id uuid,
  p_meeting_id uuid
)
RETURNS TABLE (
  unit_id uuid,
  profile_id uuid,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT DISTINCT
    ownership.unit_id AS unit_id,
    account_link.profile_id AS profile_id,
    COALESCE(NULLIF(BTRIM(profile.full_name), ''), NULLIF(BTRIM(person.preferred_name), ''), 'Tulajdonos') AS display_name
  FROM public.meetings meeting
  JOIN public.units unit_record
    ON unit_record.workspace_id = meeting.workspace_id
   AND unit_record.status = 'ACTIVE'
  JOIN public.unit_ownerships ownership
    ON ownership.workspace_id = meeting.workspace_id
   AND ownership.unit_id = unit_record.id
   AND ownership.status = 'VERIFIED'
   AND ownership.valid_from <= now()
   AND (ownership.valid_to IS NULL OR ownership.valid_to > now())
  JOIN public.person_account_links account_link
    ON account_link.person_id = ownership.party_id
   AND account_link.status = 'ACTIVE'
   AND account_link.valid_from <= now()
   AND (account_link.valid_to IS NULL OR account_link.valid_to > now())
  JOIN public.workspace_memberships membership
    ON membership.workspace_id = meeting.workspace_id
   AND membership.profile_id = account_link.profile_id
   AND membership.status = 'ACTIVE'
  JOIN public.membership_periods membership_period
    ON membership_period.workspace_id = membership.workspace_id
   AND membership_period.membership_id = membership.id
   AND membership_period.ended_at IS NULL
  JOIN public.profiles profile ON profile.id = account_link.profile_id
  LEFT JOIN public.people person ON person.party_id = account_link.person_id
  WHERE meeting.id = p_meeting_id
    AND meeting.workspace_id = p_workspace_id
    AND private.has_workspace_capability(auth.uid(), p_workspace_id, 'MEETING_READ')
    AND (
      private.has_workspace_capability(auth.uid(), p_workspace_id, 'MEETING_MANAGE')
      OR account_link.profile_id = auth.uid()
    )
  ORDER BY 1, 3, 2;
$$;

REVOKE ALL ON FUNCTION public.list_meeting_voter_options(uuid, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_meeting_voter_options(uuid, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.record_meeting_attendance(
  p_workspace_id uuid,
  p_meeting_id uuid,
  p_unit_id uuid,
  p_voter_profile_id uuid,
  p_proxy_name text DEFAULT NULL
)
RETURNS TABLE (
  attendance_id uuid,
  attendee_profile_id uuid,
  attendance_unit_id uuid,
  attendance_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_meeting_status text;
  v_meeting_status_detail text;
  v_weight numeric;
  v_is_manager boolean;
  v_existing_profile_id uuid;
  v_attendance_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  IF p_workspace_id IS NULL OR p_meeting_id IS NULL OR p_unit_id IS NULL
     OR p_voter_profile_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Profile-bound attendance input is required',
      DETAIL = '{"error_code":"ATTENDANCE_INPUT_INVALID"}';
  END IF;
  IF NOT private.has_active_workspace_membership(v_actor, p_workspace_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Workspace access denied',
      DETAIL = '{"error_code":"WORKSPACE_MEMBERSHIP_REQUIRED"}';
  END IF;

  SELECT meeting.status, meeting.status_detail
  INTO v_meeting_status, v_meeting_status_detail
  FROM public.meetings meeting
  WHERE meeting.id = p_meeting_id
    AND meeting.workspace_id = p_workspace_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Meeting is outside the workspace',
      DETAIL = '{"error_code":"OBJECT_SCOPE_MISMATCH"}';
  END IF;
  IF v_meeting_status = 'lezart' OR v_meeting_status_detail = 'lezarva' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000', MESSAGE = 'Meeting attendance is closed',
      DETAIL = '{"error_code":"ATTENDANCE_WINDOW_CLOSED"}';
  END IF;

  SELECT unit_record.ownership_share
  INTO v_weight
  FROM public.units unit_record
  WHERE unit_record.id = p_unit_id
    AND unit_record.workspace_id = p_workspace_id
    AND unit_record.status = 'ACTIVE';
  IF v_weight IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Unit is outside the workspace',
      DETAIL = '{"error_code":"OBJECT_SCOPE_MISMATCH"}';
  END IF;

  v_is_manager := private.has_workspace_capability(v_actor, p_workspace_id, 'MEETING_MANAGE');
  IF NOT v_is_manager AND p_voter_profile_id IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'A member may record only their own attendance',
      DETAIL = '{"error_code":"ATTENDANCE_ACTOR_MISMATCH"}';
  END IF;
  IF NOT private.has_active_workspace_membership(p_voter_profile_id, p_workspace_id)
     OR NOT private.has_verified_owner_relationship(p_voter_profile_id, p_workspace_id, p_unit_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Verified owner attendance is required',
      DETAIL = '{"error_code":"VERIFIED_VOTE_ENTITLEMENT_REQUIRED"}';
  END IF;

  SELECT attendance.id, attendance.profile_id
  INTO v_attendance_id, v_existing_profile_id
  FROM public.meeting_attendances attendance
  WHERE attendance.meeting_id = p_meeting_id
    AND attendance.unit_id = p_unit_id
  FOR UPDATE;
  IF FOUND AND NOT v_is_manager AND v_existing_profile_id IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Attendance is assigned to another entitled owner',
      DETAIL = '{"error_code":"ATTENDANCE_ALREADY_ASSIGNED"}';
  END IF;

  v_attendance_id := NULL;
  INSERT INTO public.meeting_attendances AS attendance (
    meeting_id, unit_id, ownership_share, profile_id, proxy_name, attended_at
  )
  VALUES (
    p_meeting_id,
    p_unit_id,
    v_weight,
    p_voter_profile_id,
    CASE WHEN v_is_manager THEN NULLIF(BTRIM(p_proxy_name), '') ELSE NULL END,
    now()
  )
  ON CONFLICT ON CONSTRAINT meeting_attendances_meeting_id_unit_id_key DO UPDATE
  SET ownership_share = EXCLUDED.ownership_share,
      profile_id = EXCLUDED.profile_id,
      proxy_name = EXCLUDED.proxy_name,
      attended_at = EXCLUDED.attended_at
  WHERE v_is_manager OR attendance.profile_id = v_actor
  RETURNING attendance.id INTO v_attendance_id;

  IF v_attendance_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Attendance is assigned to another entitled owner',
      DETAIL = '{"error_code":"ATTENDANCE_ALREADY_ASSIGNED"}';
  END IF;

  INSERT INTO public.authorization_audit_events (
    workspace_id, actor_profile_id, action_key, object_type, object_id,
    decision, reason_code, metadata
  ) VALUES (
    p_workspace_id, v_actor, 'meeting.attendance.record', 'meeting_attendance', v_attendance_id,
    'STATE_CHANGE',
    CASE WHEN v_is_manager THEN 'MANAGER_PROFILE_BOUND_ATTENDANCE' ELSE 'VERIFIED_OWNER_SELF_ATTENDANCE' END,
    jsonb_build_object(
      'meeting_id', p_meeting_id,
      'unit_id', p_unit_id,
      'attendee_profile_id', p_voter_profile_id,
      'recorded_on_behalf', v_is_manager
    )
  );

  RETURN QUERY SELECT v_attendance_id, p_voter_profile_id, p_unit_id, 'RECORDED'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.record_meeting_attendance(uuid, uuid, uuid, uuid, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.record_meeting_attendance(uuid, uuid, uuid, uuid, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_meeting_attendance(
  p_workspace_id uuid,
  p_meeting_id uuid,
  p_unit_id uuid
)
RETURNS TABLE (attendance_id uuid, removal_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_meeting_status text;
  v_meeting_status_detail text;
  v_attendance_id uuid;
  v_attendee_profile_id uuid;
  v_is_manager boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  IF NOT private.has_active_workspace_membership(v_actor, p_workspace_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Workspace access denied',
      DETAIL = '{"error_code":"WORKSPACE_MEMBERSHIP_REQUIRED"}';
  END IF;

  SELECT meeting.status, meeting.status_detail
  INTO v_meeting_status, v_meeting_status_detail
  FROM public.meetings meeting
  WHERE meeting.id = p_meeting_id
    AND meeting.workspace_id = p_workspace_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Meeting is outside the workspace',
      DETAIL = '{"error_code":"OBJECT_SCOPE_MISMATCH"}';
  END IF;
  IF v_meeting_status = 'lezart' OR v_meeting_status_detail = 'lezarva' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000', MESSAGE = 'Meeting attendance is closed',
      DETAIL = '{"error_code":"ATTENDANCE_WINDOW_CLOSED"}';
  END IF;

  SELECT attendance.id, attendance.profile_id
  INTO v_attendance_id, v_attendee_profile_id
  FROM public.meeting_attendances attendance
  JOIN public.units unit_record
    ON unit_record.id = attendance.unit_id
   AND unit_record.workspace_id = p_workspace_id
  WHERE attendance.meeting_id = p_meeting_id
    AND attendance.unit_id = p_unit_id
  FOR UPDATE OF attendance;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 'NOT_FOUND'::text;
    RETURN;
  END IF;

  v_is_manager := private.has_workspace_capability(v_actor, p_workspace_id, 'MEETING_MANAGE');
  IF NOT v_is_manager AND v_attendee_profile_id IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'A member may remove only their own attendance',
      DETAIL = '{"error_code":"ATTENDANCE_ACTOR_MISMATCH"}';
  END IF;

  DELETE FROM public.meeting_attendances attendance
  WHERE attendance.id = v_attendance_id;

  INSERT INTO public.authorization_audit_events (
    workspace_id, actor_profile_id, action_key, object_type, object_id,
    decision, reason_code, metadata
  ) VALUES (
    p_workspace_id, v_actor, 'meeting.attendance.remove', 'meeting_attendance', v_attendance_id,
    'STATE_CHANGE',
    CASE WHEN v_is_manager THEN 'MANAGER_REMOVED_ATTENDANCE' ELSE 'OWNER_REMOVED_SELF_ATTENDANCE' END,
    jsonb_build_object('meeting_id', p_meeting_id, 'unit_id', p_unit_id)
  );

  RETURN QUERY SELECT v_attendance_id, 'REMOVED'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_meeting_attendance(uuid, uuid, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.remove_meeting_attendance(uuid, uuid, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.open_meeting_voting(
  p_workspace_id uuid,
  p_meeting_id uuid
)
RETURNS TABLE (opened_meeting_id uuid, voting_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_status text;
  v_status_detail text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  IF NOT private.has_workspace_capability(v_actor, p_workspace_id, 'MEETING_MANAGE') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Meeting management capability is required',
      DETAIL = '{"error_code":"CAPABILITY_REQUIRED"}';
  END IF;

  SELECT meeting.status, meeting.status_detail
  INTO v_status, v_status_detail
  FROM public.meetings meeting
  WHERE meeting.id = p_meeting_id
    AND meeting.workspace_id = p_workspace_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Meeting is outside the workspace',
      DETAIL = '{"error_code":"OBJECT_SCOPE_MISMATCH"}';
  END IF;
  IF v_status = 'lezart' OR v_status_detail = 'lezarva' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000', MESSAGE = 'Voting cannot be opened for a closed meeting',
      DETAIL = '{"error_code":"VOTE_WINDOW_CLOSED"}';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.resolutions resolution
    WHERE resolution.meeting_id = p_meeting_id
      AND resolution.outcome = 'folyamatban'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000', MESSAGE = 'No open resolution is available for voting',
      DETAIL = '{"error_code":"VOTE_RESOLUTION_NOT_OPEN"}';
  END IF;

  IF v_status_detail IS DISTINCT FROM 'szavazas_folyamatban' THEN
    UPDATE public.meetings meeting
    SET status_detail = 'szavazas_folyamatban'
    WHERE meeting.id = p_meeting_id;

    INSERT INTO public.authorization_audit_events (
      workspace_id, actor_profile_id, action_key, object_type, object_id,
      decision, reason_code, metadata
    ) VALUES (
      p_workspace_id, v_actor, 'meeting.voting.open', 'meeting', p_meeting_id,
      'STATE_CHANGE', 'MANAGER_OPENED_VOTING', '{}'::jsonb
    );
  END IF;

  RETURN QUERY SELECT p_meeting_id, 'OPEN'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.open_meeting_voting(uuid, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.open_meeting_voting(uuid, uuid)
  TO authenticated;

DROP FUNCTION IF EXISTS public.cast_vote(uuid, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.cast_vote(
  p_workspace_id uuid,
  p_resolution_id uuid,
  p_unit_id uuid,
  p_vote_value text,
  p_voter_profile_id uuid DEFAULT NULL
)
RETURNS TABLE (
  vote_id uuid,
  resolution_id uuid,
  unit_id uuid,
  vote_value text,
  weight numeric,
  recorded_on_behalf boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_meeting_id uuid;
  v_resolution_outcome text;
  v_meeting_status text;
  v_meeting_status_detail text;
  v_weight numeric;
  v_attendee_profile_id uuid;
  v_is_manager boolean;
  v_vote_id uuid;
  v_voter_profile_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  IF p_workspace_id IS NULL OR p_resolution_id IS NULL OR p_unit_id IS NULL
     OR p_vote_value NOT IN ('igen', 'nem', 'tartozkodas') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Invalid vote command',
      DETAIL = '{"error_code":"VOTE_INPUT_INVALID"}';
  END IF;

  IF NOT private.has_active_workspace_membership(v_actor, p_workspace_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Workspace access denied',
      DETAIL = '{"error_code":"WORKSPACE_MEMBERSHIP_REQUIRED"}';
  END IF;

  SELECT r.meeting_id, r.outcome, m.status, m.status_detail
  INTO v_meeting_id, v_resolution_outcome, v_meeting_status, v_meeting_status_detail
  FROM public.resolutions r
  JOIN public.meetings m ON m.id = r.meeting_id
  WHERE r.id = p_resolution_id
    AND m.workspace_id = p_workspace_id
  FOR UPDATE OF r, m;

  IF v_meeting_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Resolution is outside the workspace',
      DETAIL = '{"error_code":"OBJECT_SCOPE_MISMATCH"}';
  END IF;

  IF v_meeting_status <> 'tervezett'
     OR v_meeting_status_detail IS DISTINCT FROM 'szavazas_folyamatban'
     OR v_resolution_outcome <> 'folyamatban' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Voting is closed',
      DETAIL = '{"error_code":"VOTE_WINDOW_CLOSED"}';
  END IF;

  SELECT u.ownership_share
  INTO v_weight
  FROM public.units u
  WHERE u.id = p_unit_id
    AND u.workspace_id = p_workspace_id
    AND u.status = 'ACTIVE';

  IF v_weight IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Unit is outside the workspace',
      DETAIL = '{"error_code":"OBJECT_SCOPE_MISMATCH"}';
  END IF;

  SELECT ma.profile_id
  INTO v_attendee_profile_id
  FROM public.meeting_attendances ma
  WHERE ma.meeting_id = v_meeting_id
    AND ma.unit_id = p_unit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Unit attendance is required',
      DETAIL = '{"error_code":"VOTE_ATTENDANCE_REQUIRED"}';
  END IF;

  v_is_manager := private.has_workspace_capability(v_actor, p_workspace_id, 'MEETING_MANAGE');

  IF v_attendee_profile_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Profile-bound attendance is required',
      DETAIL = '{"error_code":"VOTE_ATTENDANCE_PROFILE_REQUIRED"}';
  END IF;

  IF NOT private.has_active_workspace_membership(v_attendee_profile_id, p_workspace_id)
     OR NOT private.has_verified_owner_relationship(v_attendee_profile_id, p_workspace_id, p_unit_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'The recorded attendee has no verified voting entitlement',
      DETAIL = '{"error_code":"VERIFIED_VOTE_ENTITLEMENT_REQUIRED"}';
  END IF;

  IF v_is_manager THEN
    IF p_voter_profile_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501', MESSAGE = 'Manager-recorded ballots require an explicit voter profile',
        DETAIL = '{"error_code":"MANAGER_VOTER_PROFILE_REQUIRED"}';
    END IF;
    IF p_voter_profile_id IS DISTINCT FROM v_attendee_profile_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501', MESSAGE = 'The explicit voter does not match attendance',
        DETAIL = '{"error_code":"VOTE_ATTENDANCE_ACTOR_MISMATCH"}';
    END IF;
    v_voter_profile_id := p_voter_profile_id;
  ELSE
    IF p_voter_profile_id IS NOT NULL AND p_voter_profile_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501', MESSAGE = 'A member may cast only their own ballot',
        DETAIL = '{"error_code":"VOTE_ATTENDANCE_ACTOR_MISMATCH"}';
    END IF;
    IF NOT private.has_verified_owner_relationship(v_actor, p_workspace_id, p_unit_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501', MESSAGE = 'Verified ownership is required',
        DETAIL = '{"error_code":"VERIFIED_VOTE_ENTITLEMENT_REQUIRED"}';
    END IF;

    IF v_attendee_profile_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501', MESSAGE = 'Attendance does not belong to the voter',
        DETAIL = '{"error_code":"VOTE_ATTENDANCE_ACTOR_MISMATCH"}';
    END IF;
    v_voter_profile_id := v_actor;
  END IF;

  INSERT INTO public.votes (
    resolution_id, voter_profile_id, unit_id, vote_value, weight
  )
  VALUES (
    p_resolution_id, v_voter_profile_id, p_unit_id, p_vote_value, v_weight
  )
  ON CONFLICT ON CONSTRAINT votes_resolution_unit_unique DO UPDATE
  SET voter_profile_id = EXCLUDED.voter_profile_id,
      vote_value = EXCLUDED.vote_value,
      weight = EXCLUDED.weight
  RETURNING id INTO v_vote_id;

  INSERT INTO public.authorization_audit_events (
    workspace_id, actor_profile_id, action_key, object_type, object_id,
    decision, reason_code, metadata
  )
  VALUES (
    p_workspace_id, v_actor, 'vote.cast', 'vote', v_vote_id,
    'STATE_CHANGE',
    CASE WHEN v_is_manager THEN 'MEETING_MANAGER_RECORDED_BALLOT' ELSE 'VERIFIED_OWNER_BALLOT' END,
    jsonb_build_object(
      'resolution_id', p_resolution_id,
      'unit_id', p_unit_id,
      'vote_value', p_vote_value,
      'derived_weight', v_weight,
      'voter_profile_id', v_voter_profile_id,
      'recorded_on_behalf', v_is_manager
    )
  );

  RETURN QUERY
  SELECT v.id, v.resolution_id, v.unit_id, v.vote_value, v.weight, v_is_manager
  FROM public.votes v
  WHERE v.id = v_vote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cast_vote(uuid, uuid, uuid, text, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.cast_vote(uuid, uuid, uuid, text, uuid)
  TO authenticated;

COMMIT;
