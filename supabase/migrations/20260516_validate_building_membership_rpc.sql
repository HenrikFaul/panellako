-- Migration: 20260516_validate_building_membership_rpc.sql
-- Purpose: Verify the current user has an active membership in a given building.
--          Used by Server Components and Server Actions for access control.

CREATE OR REPLACE FUNCTION public.validate_building_membership(
  _building_id uuid
)
RETURNS TABLE (
  is_member boolean,
  user_role  text,
  unit_id    uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    true              AS is_member,
    m.role            AS user_role,
    m.unit_id
  FROM memberships m
  WHERE m.profile_id   = auth.uid()
    AND m.building_id  = _building_id
    AND m.active       = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_building_membership(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.validate_building_membership(uuid) TO authenticated;
