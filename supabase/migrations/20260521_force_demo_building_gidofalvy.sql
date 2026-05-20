-- =============================================================================
-- Migration:  20260521_force_demo_building_gidofalvy.sql
-- Date:       2026-05-21
-- Version:    v0.7.10
--
-- A v0.7.9 (20260520_update_demo_building.sql) defenzív WHERE-clause-szal
-- működött: csak akkor UPDATE-elt ha a régi "Alkotás utca 42." név volt a
-- rekordban.  A felhasználói visszajelzés alapján ez nem garantálja, hogy a
-- production DB minden esetben átíródjon (pl. ha a régi seed mégis 'Alkotás
-- utca 42.'-től eltérő néven futott, vagy ha valami szuper-edge-case
-- megzavarta a guard-ot).
--
-- Ez a migráció FELTÉTEL NÉLKÜL felülírja a demo épület rekordját a
-- Nominatim-verifikált Gidófalvy Lajos utca 9. (XIII. ker., 1134) értékekre.
-- Ha a rekord nem létezik (üres DB), 0 sort érint, nem dob hibát.
--
-- Forrás: https://nominatim.openstreetmap.org/ui/details.html?osmtype=W&osmid=129080989
-- OSM way 129080989, building:apartments, Place ID 67127116
-- =============================================================================

update public.buildings
   set name        = 'Gidófalvy Lajos utca 9.',
       address     = 'Budapest, XIII. kerület, Gidófalvy Lajos utca 9.',
       lat         = 47.5278845,
       lon         = 19.0705657,
       geocoded_at = now()
 where id = 'bbbbbbbb-0001-0001-0001-000000000001';

-- Verifikáció NOTICE-szal (nem dob hibát):
do $$
declare
  v_row record;
begin
  select id, name, address, lat, lon, geocoded_at
    into v_row
    from public.buildings
   where id = 'bbbbbbbb-0001-0001-0001-000000000001';
  if v_row.id is null then
    raise notice 'Demo building UUID nem létezik — futtasd a seed.sql-t.';
  elsif v_row.name <> 'Gidófalvy Lajos utca 9.' or v_row.lat is null or v_row.lon is null then
    raise warning 'FIGYELEM: demo building UPDATE látszólag nem futott le helyesen: name=%, lat=%, lon=%', v_row.name, v_row.lat, v_row.lon;
  else
    raise notice 'Demo building force-update OK: % @ % (lat=%, lon=%)',
      v_row.name, v_row.address, v_row.lat, v_row.lon;
  end if;
end
$$;
