-- PanelLako v0.10.4 - authorization and push-recipient closure
--
-- The vote-integrity migration replaced private.has_workspace_capability but
-- accidentally dropped the verified-mandate checks introduced by the
-- community-activation cut-over. Restore that authority chain, make workspace
-- status an explicit capability boundary, and keep push recipient expansion in
-- one service-role-only tenant-scoped database function.

BEGIN;

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
    FROM public.workspaces workspace
    JOIN public.workspace_memberships wm
      ON wm.workspace_id = workspace.id
     AND wm.profile_id = p_profile_id
     AND wm.status = 'ACTIVE'
    JOIN public.membership_periods mp
      ON mp.workspace_id = wm.workspace_id
     AND mp.membership_id = wm.id
     AND mp.ended_at IS NULL
    WHERE workspace.id = p_workspace_id
      AND workspace.status = 'ACTIVE'
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
             AND mm.verification_status = 'VERIFIED'
             AND mm.valid_from <= now()
             AND (mm.valid_to IS NULL OR mm.valid_to > now())
            LEFT JOIN public.delegations d
              ON d.workspace_id = ra.workspace_id
             AND d.id = ra.source_delegation_id
             AND d.status = 'ACTIVE'
             AND d.valid_from <= now()
             AND (d.valid_to IS NULL OR d.valid_to > now())
            LEFT JOIN public.management_mandates dm
              ON dm.workspace_id = d.workspace_id
             AND dm.id = d.source_mandate_id
             AND dm.status = 'ACTIVE'
             AND dm.verification_status = 'VERIFIED'
             AND dm.valid_from <= now()
             AND (dm.valid_to IS NULL OR dm.valid_to > now())
            WHERE (
                ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
                AND mm.id IS NOT NULL
              )
              OR (
                ra.role_key = 'DELEGATE_OPERATIONS'
                AND d.id IS NOT NULL
                AND dm.id IS NOT NULL
                AND (SELECT internal_key FROM requested) = ANY(d.capability_keys)
              )
              OR ra.role_key IN ('COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN')
          )
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION private.has_workspace_capability(uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_workspace_capability(uuid, uuid, text)
  TO authenticated, service_role;

-- Keep the context projection aligned with the low-level authorization helper:
-- a suspended, archived, merged, or not-yet-verified workspace is still
-- listable for lifecycle UX, but it grants no effective capabilities.
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
  WITH active_workspace AS (
    SELECT workspace.id
    FROM public.workspaces workspace
    WHERE workspace.id = p_workspace_id
      AND workspace.status = 'ACTIVE'
  ), candidate(internal_key) AS (
    SELECT UNNEST(ARRAY[
      'WORKSPACE_READ', 'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED',
      'COMMUNICATION_READ', 'DOCUMENT_READ', 'DOCUMENT_OWNER_READ',
      'DOCUMENT_UNIT_READ', 'MEETING_READ', 'TICKET_CREATE',
      'TICKET_READ_OWN', 'METER_SUBMIT', 'METER_READ_OWN',
      'ENVIRONMENT_READ', 'FINANCE_UNIT_READ'
    ]::text[])
    WHERE EXISTS (SELECT 1 FROM active_workspace)
      AND private.has_active_workspace_membership(p_profile_id, p_workspace_id)
    UNION
    SELECT 'VOTE_CAST'
    WHERE EXISTS (SELECT 1 FROM active_workspace)
      AND private.has_active_workspace_membership(p_profile_id, p_workspace_id)
      AND private.has_verified_owner_relationship(p_profile_id, p_workspace_id, NULL)
    UNION
    SELECT rc.capability_key
    FROM public.role_capabilities rc
    WHERE EXISTS (SELECT 1 FROM active_workspace)
      AND rc.role_key = ANY(private.effective_role_keys(p_profile_id, p_workspace_id))
      AND private.has_workspace_capability(p_profile_id, p_workspace_id, rc.capability_key)
  )
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT ckm.canonical_key ORDER BY ckm.canonical_key),
    ARRAY[]::text[]
  )
  FROM candidate c
  JOIN public.capability_key_map ckm ON ckm.internal_key = c.internal_key;
$$;

REVOKE ALL ON FUNCTION private.effective_capabilities(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.effective_capabilities(uuid, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resolve_workspace_push_recipients(
  p_workspace_id uuid,
  p_target_role text DEFAULT 'all'
)
RETURNS TABLE (profile_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private, auth
AS $$
DECLARE
  v_target_role text := LOWER(BTRIM(COALESCE(p_target_role, 'all')));
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Service role is required',
      DETAIL = '{"error_code":"SERVICE_ROLE_REQUIRED"}';
  END IF;

  IF v_target_role NOT IN ('all', 'lako', 'manager') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Unsupported push target role',
      DETAIL = '{"error_code":"PUSH_TARGET_ROLE_INVALID"}';
  END IF;

  RETURN QUERY
  WITH active_members AS (
    SELECT DISTINCT membership.profile_id
    FROM public.workspaces workspace
    JOIN public.workspace_memberships membership
      ON membership.workspace_id = workspace.id
     AND membership.status = 'ACTIVE'
    JOIN public.membership_periods period
      ON period.workspace_id = membership.workspace_id
     AND period.membership_id = membership.id
     AND period.ended_at IS NULL
    WHERE workspace.id = p_workspace_id
      AND workspace.status = 'ACTIVE'
  ), classified AS (
    SELECT
      member.profile_id,
      EXISTS (
        SELECT 1
        FROM UNNEST(private.effective_role_keys(member.profile_id, p_workspace_id)) AS role_key(value)
        WHERE role_key.value IN (
          'COMMON_REPRESENTATIVE_ADMIN',
          'BOARD_ADMIN',
          'SELF_MANAGED_ADMIN',
          'DELEGATE_OPERATIONS'
        )
      ) AS is_manager,
      EXISTS (
        SELECT 1
        FROM public.person_account_links account_link
        WHERE account_link.profile_id = member.profile_id
          AND account_link.status = 'ACTIVE'
          AND account_link.valid_from <= now()
          AND (account_link.valid_to IS NULL OR account_link.valid_to > now())
          AND (
            EXISTS (
              SELECT 1
              FROM public.unit_ownerships ownership
              JOIN public.units unit
                ON unit.workspace_id = ownership.workspace_id
               AND unit.id = ownership.unit_id
               AND unit.status = 'ACTIVE'
              WHERE ownership.workspace_id = p_workspace_id
                AND ownership.party_id = account_link.person_id
                AND ownership.status = 'VERIFIED'
                AND ownership.valid_from <= now()
                AND (ownership.valid_to IS NULL OR ownership.valid_to > now())
            )
            OR EXISTS (
              SELECT 1
              FROM public.unit_occupancies occupancy
              JOIN public.units unit
                ON unit.workspace_id = occupancy.workspace_id
               AND unit.id = occupancy.unit_id
               AND unit.status = 'ACTIVE'
              WHERE occupancy.workspace_id = p_workspace_id
                AND occupancy.person_id = account_link.person_id
                AND occupancy.status = 'VERIFIED'
                AND occupancy.valid_from <= now()
                AND (occupancy.valid_to IS NULL OR occupancy.valid_to > now())
            )
          )
      ) AS is_resident
    FROM active_members member
  )
  SELECT classified.profile_id
  FROM classified
  WHERE v_target_role = 'all'
     OR (v_target_role = 'manager' AND classified.is_manager)
     OR (v_target_role = 'lako' AND classified.is_resident)
  ORDER BY classified.profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_workspace_push_recipients(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_workspace_push_recipients(uuid, text)
  TO service_role;

COMMIT;
