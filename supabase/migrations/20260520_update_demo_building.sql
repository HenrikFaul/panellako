-- =============================================================================
-- Migration:  20260520_update_demo_building.sql
-- Date:       2026-05-20
-- Version:    v0.7.9
--
-- A v0.7.8 frissítette a seed.sql-t a Nominatim-verifikált
-- "Gidófalvy Lajos utca 9." címre, de a production adatbázisban már LÉTEZIK
-- a régi "Alkotás utca 42." sor (a seed.sql `ON CONFLICT DO NOTHING`
-- viselkedéssel ment volna előzőleg).  Ez a migráció EXPLICITEN updateli a
-- demo épület rekordját, így a satellite_refresh / urban_refresh /
-- urban_atlas_refresh / env_refresh_green jobok soha többé nem hívnak
-- Nominatim-et erre az épületre.
--
-- Forrás:    https://nominatim.openstreetmap.org/ui/details.html?osmtype=W&osmid=129080989
-- OSM way:   129080989  (building:apartments)
-- Cím:       Budapest, XIII. kerület, Gidófalvy Lajos utca 9., 1134
-- lat,lon:   47.5278845, 19.0705657
-- =============================================================================

update public.buildings
   set name        = 'Gidófalvy Lajos utca 9.',
       address     = 'Budapest, XIII. kerület, Gidófalvy Lajos utca 9.',
       lat         = 47.5278845,
       lon         = 19.0705657,
       geocoded_at = now()
 where id = 'bbbbbbbb-0001-0001-0001-000000000001'
   -- csak akkor írjuk át, ha a régi Alkotás utcai adat van benne;
   -- ha valaki kézzel másra állította, ne ronts.
   and (name = 'Alkotás utca 42.' or lat is null or lon is null);

-- Ellenőrzés (csak NOTICE-szal, hibát nem dob):
do $$
declare
  v_row record;
begin
  select id, name, address, lat, lon, geocoded_at
    into v_row
    from public.buildings
   where id = 'bbbbbbbb-0001-0001-0001-000000000001';
  if v_row.id is null then
    raise notice 'Demo building (bbbbbbbb-0001-0001-0001-000000000001) not present — seed.sql must run first.';
  else
    raise notice 'Demo building present: % @ % (lat=%, lon=%, geocoded_at=%)',
      v_row.name, v_row.address, v_row.lat, v_row.lon, v_row.geocoded_at;
  end if;
end
$$;
