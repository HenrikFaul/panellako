-- Migration: 20260516_get_my_buildings_rpc.sql
-- Purpose: Return all buildings the current user has an active membership in,
--          with aggregate stats for the building picker UI.

CREATE OR REPLACE FUNCTION public.get_my_buildings()
RETURNS TABLE (
  building_id   uuid,
  building_name text,
  address       text,
  user_role     text,
  unit_count    bigint,
  open_tickets  bigint,
  member_since  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id                                                           AS building_id,
    b.name                                                         AS building_name,
    b.address,
    m.role                                                         AS user_role,
    COUNT(DISTINCT u.id)                                           AS unit_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'lezarva')     AS open_tickets,
    m.created_at                                                   AS member_since
  FROM memberships m
  JOIN buildings b ON b.id = m.building_id
  LEFT JOIN units u ON u.building_id = b.id
  LEFT JOIN tickets t ON t.building_id = b.id
  WHERE m.profile_id = auth.uid()
    AND m.active = true
  GROUP BY b.id, b.name, b.address, m.role, m.created_at
  ORDER BY b.name ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_buildings() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_my_buildings() TO authenticated;
