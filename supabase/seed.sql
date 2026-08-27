-- =============================================================
-- PanelLakó Demo Seed  (idempotent — re-run safe)
-- All UUIDs are fixed. Every INSERT uses ON CONFLICT DO NOTHING.
-- Run in Supabase SQL Editor or via MCP apply_migration.
-- =============================================================

DO $$
DECLARE
  -- ── AUTH USERS ────────────────────────────────────────────
  v_uid_kepviselo  uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  v_uid_lako       uuid := 'aaaaaaaa-0002-0002-0002-000000000002';
  v_uid_konyvelo   uuid := 'aaaaaaaa-0003-0003-0003-000000000003';

  -- ── BUILDING ──────────────────────────────────────────────
  v_building_id    uuid := 'bbbbbbbb-0001-0001-0001-000000000001';

  -- ── UNITS  A/1–A/8  B/1–B/8 ──────────────────────────────
  v_unit_a1  uuid := 'cccccccc-0a01-0a01-0a01-000000000001';
  v_unit_a2  uuid := 'cccccccc-0a02-0a02-0a02-000000000002';
  v_unit_a3  uuid := 'cccccccc-0a03-0a03-0a03-000000000003';
  v_unit_a4  uuid := 'cccccccc-0a04-0a04-0a04-000000000004';
  v_unit_a5  uuid := 'cccccccc-0a05-0a05-0a05-000000000005';
  v_unit_a6  uuid := 'cccccccc-0a06-0a06-0a06-000000000006';
  v_unit_a7  uuid := 'cccccccc-0a07-0a07-0a07-000000000007';
  v_unit_a8  uuid := 'cccccccc-0a08-0a08-0a08-000000000008';
  v_unit_b1  uuid := 'cccccccc-0b01-0b01-0b01-000000000009';
  v_unit_b2  uuid := 'cccccccc-0b02-0b02-0b02-000000000010';
  v_unit_b3  uuid := 'cccccccc-0b03-0b03-0b03-000000000011';
  v_unit_b4  uuid := 'cccccccc-0b04-0b04-0b04-000000000012';
  v_unit_b5  uuid := 'cccccccc-0b05-0b05-0b05-000000000013';
  v_unit_b6  uuid := 'cccccccc-0b06-0b06-0b06-000000000014';
  v_unit_b7  uuid := 'cccccccc-0b07-0b07-0b07-000000000015';
  v_unit_b8  uuid := 'cccccccc-0b08-0b08-0b08-000000000016';

  -- ── MEMBERSHIPS ───────────────────────────────────────────
  v_mem_kep  uuid := 'dddddddd-0001-0001-0001-000000000001';
  v_mem_lak  uuid := 'dddddddd-0002-0002-0002-000000000002';
  v_mem_kny  uuid := 'dddddddd-0003-0003-0003-000000000003';

  -- ── ANNOUNCEMENTS ─────────────────────────────────────────
  v_ann1  uuid := 'eeeeeeee-0001-0001-0001-000000000001';
  v_ann2  uuid := 'eeeeeeee-0002-0002-0002-000000000002';
  v_ann3  uuid := 'eeeeeeee-0003-0003-0003-000000000003';
  v_ann4  uuid := 'eeeeeeee-0004-0004-0004-000000000004';
  v_ann5  uuid := 'eeeeeeee-0005-0005-0005-000000000005';

  -- ── NOTIFICATIONS ─────────────────────────────────────────
  v_notif1  uuid := 'ffffffff-0001-0001-0001-000000000001';
  v_notif2  uuid := 'ffffffff-0002-0002-0002-000000000002';
  v_notif3  uuid := 'ffffffff-0003-0003-0003-000000000003';
  v_notif4  uuid := 'ffffffff-0004-0004-0004-000000000004';
  v_notif5  uuid := 'ffffffff-0005-0005-0005-000000000005';
  v_notif6  uuid := 'ffffffff-0006-0006-0006-000000000006';

  -- ── TICKETS ───────────────────────────────────────────────
  v_ticket1  uuid := '11111111-0001-0001-0001-000000000001';
  v_ticket2  uuid := '11111111-0002-0002-0002-000000000002';
  v_ticket3  uuid := '11111111-0003-0003-0003-000000000003';
  v_ticket4  uuid := '11111111-0004-0004-0004-000000000004';
  v_ticket5  uuid := '11111111-0005-0005-0005-000000000005';
  v_ticket6  uuid := '11111111-0006-0006-0006-000000000006';
  v_ticket7  uuid := '11111111-0007-0007-0007-000000000007';
  v_ticket8  uuid := '11111111-0008-0008-0008-000000000008';

  -- ── METER READINGS ────────────────────────────────────────
  v_mr1  uuid := '22222222-0001-0001-0001-000000000001';
  v_mr2  uuid := '22222222-0002-0002-0002-000000000002';
  v_mr3  uuid := '22222222-0003-0003-0003-000000000003';
  v_mr4  uuid := '22222222-0004-0004-0004-000000000004';
  v_mr5  uuid := '22222222-0005-0005-0005-000000000005';
  v_mr6  uuid := '22222222-0006-0006-0006-000000000006';

  -- ── DOCUMENTS ─────────────────────────────────────────────
  v_doc1  uuid := '33333333-0001-0001-0001-000000000001';
  v_doc2  uuid := '33333333-0002-0002-0002-000000000002';
  v_doc3  uuid := '33333333-0003-0003-0003-000000000003';
  v_doc4  uuid := '33333333-0004-0004-0004-000000000004';

  -- ── DOCUMENT ACKNOWLEDGEMENTS ─────────────────────────────
  v_ack1  uuid := '44444444-0001-0001-0001-000000000001';
  v_ack2  uuid := '44444444-0002-0002-0002-000000000002';

  -- ── FINANCE ENTRIES ───────────────────────────────────────
  v_fe1  uuid := '55555555-0001-0001-0001-000000000001';
  v_fe2  uuid := '55555555-0002-0002-0002-000000000002';
  v_fe3  uuid := '55555555-0003-0003-0003-000000000003';
  v_fe4  uuid := '55555555-0004-0004-0004-000000000004';
  v_fe5  uuid := '55555555-0005-0005-0005-000000000005';
  v_fe6  uuid := '55555555-0006-0006-0006-000000000006';
  v_fe7  uuid := '55555555-0007-0007-0007-000000000007';
  v_fe8  uuid := '55555555-0008-0008-0008-000000000008';

  -- ── MEETINGS ──────────────────────────────────────────────
  v_meeting_past      uuid := '66666666-0001-0001-0001-000000000001';
  v_meeting_upcoming  uuid := '66666666-0002-0002-0002-000000000002';

  -- ── AGENDA ITEMS ──────────────────────────────────────────
  v_agenda1  uuid := '77777777-0001-0001-0001-000000000001';
  v_agenda2  uuid := '77777777-0002-0002-0002-000000000002';
  v_agenda3  uuid := '77777777-0003-0003-0003-000000000003';

  -- ── RESOLUTIONS ───────────────────────────────────────────
  v_res1  uuid := '88888888-0001-0001-0001-000000000001';
  v_res2  uuid := '88888888-0002-0002-0002-000000000002';
  v_res3  uuid := '88888888-0003-0003-0003-000000000003';

  -- ── VOTES ─────────────────────────────────────────────────
  v_vote1  uuid := '99999999-0001-0001-0001-000000000001';
  v_vote2  uuid := '99999999-0002-0002-0002-000000000002';
  v_vote3  uuid := '99999999-0003-0003-0003-000000000003';

  -- ── MEETING ATTENDANCES ───────────────────────────────────
  v_att1  uuid := 'aaaaaaab-0001-0001-0001-000000000001';
  v_att2  uuid := 'aaaaaaab-0002-0002-0002-000000000002';
  v_att3  uuid := 'aaaaaaab-0003-0003-0003-000000000003';

  -- ── VENDORS ───────────────────────────────────────────────
  v_vendor1  uuid := 'bbbbbbbc-0001-0001-0001-000000000001';
  v_vendor2  uuid := 'bbbbbbbc-0002-0002-0002-000000000002';
  v_vendor3  uuid := 'bbbbbbbc-0003-0003-0003-000000000003';
  v_vendor4  uuid := 'bbbbbbbc-0004-0004-0004-000000000004';

  -- ── WORK ORDERS ───────────────────────────────────────────
  v_wo1  uuid := 'cccccccd-0001-0001-0001-000000000001';
  v_wo2  uuid := 'cccccccd-0002-0002-0002-000000000002';
  v_wo3  uuid := 'cccccccd-0003-0003-0003-000000000003';

  -- ── KNOWLEDGE BASE ARTICLES ───────────────────────────────
  v_kb1  uuid := 'a1a1a1a1-0001-0001-0001-000000000001';
  v_kb2  uuid := 'a1a1a1a1-0002-0002-0002-000000000002';
  v_kb3  uuid := 'a1a1a1a1-0003-0003-0003-000000000003';
  v_kb4  uuid := 'a1a1a1a1-0004-0004-0004-000000000004';
  v_kb5  uuid := 'a1a1a1a1-0005-0005-0005-000000000005';

  -- ── AUDIT LOGS ────────────────────────────────────────────
  v_al1   uuid := 'b2b2b2b2-0001-0001-0001-000000000001';
  v_al2   uuid := 'b2b2b2b2-0002-0002-0002-000000000002';
  v_al3   uuid := 'b2b2b2b2-0003-0003-0003-000000000003';
  v_al4   uuid := 'b2b2b2b2-0004-0004-0004-000000000004';
  v_al5   uuid := 'b2b2b2b2-0005-0005-0005-000000000005';
  v_al6   uuid := 'b2b2b2b2-0006-0006-0006-000000000006';
  v_al7   uuid := 'b2b2b2b2-0007-0007-0007-000000000007';
  v_al8   uuid := 'b2b2b2b2-0008-0008-0008-000000000008';
  v_al9   uuid := 'b2b2b2b2-0009-0009-0009-000000000009';
  v_al10  uuid := 'b2b2b2b2-0010-0010-0010-000000000010';

  -- ── SUBSCRIPTION ──────────────────────────────────────────
  v_sub1  uuid := 'c3c3c3c3-0001-0001-0001-000000000001';

BEGIN

-- =============================================================
-- 1. AUTH USERS
--    Direct insert into auth.users (pgcrypto is already loaded)
-- =============================================================

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
(
  v_uid_kepviselo, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'demo.kepviselo@panellako.hu',
  crypt('PanelLako2026!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Kovács Béla"}',
  now(), now(), '', '', '', ''
),
(
  v_uid_lako, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'demo.lako@panellako.hu',
  crypt('PanelLako2026!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Szabó Mária"}',
  now(), now(), '', '', '', ''
),
(
  v_uid_konyvelo, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'demo.konyvelo@panellako.hu',
  crypt('PanelLako2026!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Nagy Péter"}',
  now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 2. PROFILES
-- =============================================================

INSERT INTO profiles (id, full_name, email, role, free_trial_never_expires) VALUES
(v_uid_kepviselo, 'Kovács Béla', 'demo.kepviselo@panellako.hu', 'kozos_kepviselo', true),
(v_uid_lako,      'Szabó Mária', 'demo.lako@panellako.hu',      'lako',             true),
(v_uid_konyvelo,  'Nagy Péter',  'demo.konyvelo@panellako.hu',  'konyvelo',         true)
ON CONFLICT (id) DO UPDATE
SET free_trial_never_expires = EXCLUDED.free_trial_never_expires;

-- =============================================================
-- 3. BUILDING
-- =============================================================
-- Demo building: Budapest, XIII. kerület, Gidófalvy Lajos utca 9 (1134).
-- Verified Nominatim entry: https://nominatim.openstreetmap.org/ui/details.html?osmtype=W&osmid=129080989
-- Lat/lon populated explicitly so the environment & transit jobs never need
-- to geocode the address — geocoding is the most fragile dependency in the
-- pipeline, and an explicit value here makes the demo fully reproducible.
INSERT INTO buildings (id, name, address, lat, lon, geocoded_at) VALUES
(
  v_building_id,
  'Gidófalvy Lajos utca 9.',
  'Budapest, XIII. kerület, Gidófalvy Lajos utca 9.',
  47.5278845,
  19.0705657,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  address     = EXCLUDED.address,
  lat         = EXCLUDED.lat,
  lon         = EXCLUDED.lon,
  geocoded_at = EXCLUDED.geocoded_at;

-- =============================================================
-- 4. UNITS  (A/1–A/8, B/1–B/8)
--    ownership_share represents thousandths of the building
--    balance_amount < 0 = arrears (owed by resident)
-- =============================================================

INSERT INTO units (id, building_id, unit_label, floor, owner_name, unit_type, area_m2, ownership_share, balance_amount, has_water_meter) VALUES
-- Lépcsőház A
(v_unit_a1, v_building_id, 'A/1', 'Fszt.',  'Horváth László',      'Lakas', 52.00, 52.50, 0.00,      true),
(v_unit_a2, v_building_id, 'A/2', 'Fszt.',  'Tóth Anna',           'Lakas', 48.50, 48.25, -24500.00, true),
(v_unit_a3, v_building_id, 'A/3', '1. em.', 'Varga Zoltán',        'Lakas', 67.00, 67.75, 0.00,      true),
(v_unit_a4, v_building_id, 'A/4', '1. em.', 'Kiss Erzsébet',       'Lakas', 71.20, 71.00, -18750.00, true),
(v_unit_a5, v_building_id, 'A/5', '2. em.', 'Szabó Mária',         'Lakas', 67.00, 67.75, 0.00,      true),
(v_unit_a6, v_building_id, 'A/6', '2. em.', 'Fekete György',       'Lakas', 45.00, 44.50, 0.00,      false),
(v_unit_a7, v_building_id, 'A/7', '3. em.', 'Molnár Katalin',      'Lakas', 78.40, 79.00, -9200.00,  true),
(v_unit_a8, v_building_id, 'A/8', '3. em.', 'Papp Tibor',          'Lakas', 85.00, 85.50, 0.00,      true),
-- Lépcsőház B
(v_unit_b1, v_building_id, 'B/1', 'Fszt.',  'Balogh Istvánné',     'Lakas', 52.00, 52.50, 0.00,      true),
(v_unit_b2, v_building_id, 'B/2', 'Fszt.',  'Simon Gábor',         'Lakas', 48.50, 48.25, 0.00,      true),
(v_unit_b3, v_building_id, 'B/3', '1. em.', 'Lukács Ágnes',        'Lakas', 67.00, 67.75, 0.00,      true),
(v_unit_b4, v_building_id, 'B/4', '1. em.', 'Farkas Sándor',       'Lakas', 71.20, 71.00, 0.00,      true),
(v_unit_b5, v_building_id, 'B/5', '2. em.', 'Takács Judit',        'Lakas', 67.00, 67.75, 0.00,      false),
(v_unit_b6, v_building_id, 'B/6', '2. em.', 'Juhász Péterné',      'Lakas', 45.00, 44.50, 0.00,      true),
(v_unit_b7, v_building_id, 'B/7', '3. em.', 'Kocsis Tamás',        'Lakas', 78.40, 79.00, 0.00,      true),
(v_unit_b8, v_building_id, 'B/8', '3. em.', 'Németh Róbert',       'Lakas', 85.00, 85.50, 0.00,      true)
ON CONFLICT (building_id, unit_label) DO NOTHING;

-- =============================================================
-- 5. MEMBERSHIPS
-- =============================================================

INSERT INTO memberships (id, profile_id, building_id, unit_id, role, active) VALUES
(v_mem_kep, v_uid_kepviselo, v_building_id, NULL,      'kozos_kepviselo', true),
(v_mem_lak, v_uid_lako,      v_building_id, v_unit_a5, 'lako',            true),
(v_mem_kny, v_uid_konyvelo,  v_building_id, NULL,      'konyvelo',        true)
ON CONFLICT (profile_id, building_id, role) DO NOTHING;

-- =============================================================
-- 6. ANNOUNCEMENTS
-- =============================================================

INSERT INTO announcements (id, building_id, created_by, title, content, target_group, category, source_label, created_at) VALUES
(
  v_ann1, v_building_id, v_uid_kepviselo,
  'Közgyűlési meghívó – 2026. június 10.',
  'Tisztelt Tulajdonostársak! Ezúton értesítem Önöket, hogy a társasház éves rendes közgyűlését 2026. június 10-én (kedd) 18:00 órakor tartjuk az épület közösségi termében. Napirendi pontok: éves elszámolás, felújítási alap, SZMSZ módosítás.',
  'Mindenki', 'tarsashazi_kozlony', 'Közös képviselő',
  now() - interval '5 days'
),
(
  v_ann2, v_building_id, v_uid_kepviselo,
  'Liftfelújítás – május 20–23.',
  'Tájékoztatjuk a lakókat, hogy az A lépcsőházi lift felújítása 2026. május 20. és 23. között zajlik. Ez idő alatt a lift nem üzemel. Kérjük a mozgáskorlátozottakat, hogy jelezzék igényüket, segítséget szervezünk.',
  'Mindenki', 'uzemeltetes', 'Közös képviselő',
  now() - interval '3 days'
),
(
  v_ann3, v_building_id, v_uid_kepviselo,
  'Tűzvédelmi ellenőrzés – május 28.',
  'A kötelező tűzvédelmi felülvizsgálat május 28-án (csütörtök) 9–16 óra között zajlik. Kérjük, biztosítsák a hozzáférést az elektromos elosztókhoz és a tűzoltó készülékekhez.',
  'Mindenki', 'biztonsag', 'Tűzvédelmi hatóság',
  now() - interval '1 day'
),
(
  v_ann4, v_building_id, v_uid_kepviselo,
  'Közös területek takarítási rendje',
  'Emlékeztetjük a lakókat a lépcsőházi takarítás ütemtervéről: az A lépcsőház minden hétfőn, a B lépcsőház minden szerdán kerül takarításra 8–12 óra között. Kérjük, ez idő alatt minimalizálják a forgalmat.',
  'Mindenki', 'uzemeltetes', 'Takarítócég',
  now() - interval '7 days'
),
(
  v_ann5, v_building_id, v_uid_kepviselo,
  'Éves elszámolás 2025 – közzétéve',
  'A 2025. évi közös költség elszámolás elkészült és feltöltve a Dokumentumok szekcióba. Kérjük minden tulajdonostársat, hogy tekintse meg és jelezze észrevételeit 30 napon belül.',
  'Mindenki', 'tarsashazi_kozlony', 'Könyvelő',
  now() - interval '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 7. NOTIFICATIONS
-- =============================================================

INSERT INTO notifications (id, building_id, created_by, title, message, audience, channel, read_at, created_at) VALUES
(
  v_notif1, v_building_id, v_uid_kepviselo,
  'Új bejelentés: Liftfelújítás',
  'Új közlemény érkezett az épület hirdetőtáblájára: Liftfelújítás – május 20–23.',
  'Mindenki', 'app', now() - interval '2 days',
  now() - interval '3 days'
),
(
  v_notif2, v_building_id, v_uid_kepviselo,
  'Hibabejelentés rögzítve',
  'Az Ön által beküldött hibabejelentés (Vízszivárgás a B/3 alatt) sikeresen rögzítésre került. Azonosító: #000003.',
  'Mindenki', 'app', NULL,
  now() - interval '2 days'
),
(
  v_notif3, v_building_id, v_uid_kepviselo,
  'Közgyűlési meghívó elküldve',
  'A júniusi közgyűlés meghívóit rendszerünk sikeresen elküldte az összes tulajdonostárs részére.',
  'Mindenki', 'email', now() - interval '4 days',
  now() - interval '5 days'
),
(
  v_notif4, v_building_id, v_uid_kepviselo,
  'Hátralék emlékeztető – Tóth Anna (A/2)',
  'Az A/2 albetéthez 24 500 Ft hátralék tartozik. Kérjük rendezni a fizetési kötelezettséget.',
  'kozos_kepviselo', 'app', NULL,
  now() - interval '1 day'
),
(
  v_notif5, v_building_id, v_uid_kepviselo,
  'Mérőóra leolvasás rögzítve',
  'A 2026. május mérőóra leolvasások sikeresen feltöltésre kerültek.',
  'Mindenki', 'app', now() - interval '12 hours',
  now() - interval '1 day'
),
(
  v_notif6, v_building_id, v_uid_kepviselo,
  'Új dokumentum: Tűzvédelmi szabályzat',
  'Új dokumentum érhető el a Dokumentumok szekcióban: Tűzvédelmi szabályzat v2.0. Kérjük, olvassa el és erősítse meg átvételét.',
  'Mindenki', 'app', NULL,
  now() - interval '6 hours'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 8. TICKETS
-- =============================================================

INSERT INTO tickets (
  id, building_id, unit_id, reporter_id,
  title, description, status, priority,
  location, submitted_by, unit_label, due_date,
  ai_category, ai_urgency, ai_summary_hu, ai_triage_at,
  created_at, updated_at
) VALUES
(
  v_ticket1, v_building_id, v_unit_a2, v_uid_lako,
  'Csepegő csap a konyhában',
  'A konyhai mosogató csapja folyamatosan csepeg. Naponta kb. 10-15 liter vizet veszítünk. Több mint 2 hete fennáll a probléma.',
  'uj', 'kozepes',
  'A/2 – konyha', 'Tóth Anna', 'A/2', current_date + 7,
  'vízszerelés', 5, 'Csepegő konyhai csap, A/2 albetét – vízveszteség ~10-15 l/nap, 2 hete fennáll.', now() - interval '1 hour',
  now() - interval '2 days', now() - interval '2 days'
),
(
  v_ticket2, v_building_id, v_unit_b3, v_uid_lako,
  'Vízszivárgás a B/3 alatti mennyezeten',
  'A B/2-es lakásban a mennyezet sarkában ázásfolt jelent meg. Valószínűleg a B/3 fürdőszobájából szivárog a víz.',
  'folyamatban', 'magas',
  'B/2 – mennyezet / B/3 – fürdőszoba', 'Lukács Ágnes', 'B/3', current_date + 3,
  'vízszerelés', 8, 'Aktív vízszivárgás B/3 és B/2 között, mennyezeti ázásfolt – azonnali beavatkozás szükséges.', now() - interval '3 hours',
  now() - interval '4 days', now() - interval '1 day'
),
(
  v_ticket3, v_building_id, v_unit_a6, v_uid_kepviselo,
  'Égő nem működik a lépcsőházban (A – 2. em.)',
  'Az A lépcsőház 2. emeleti folyosóján az egyik mennyezeti lámpa nem világít. Biztonsági kockázat este.',
  'varakozik', 'alacsony',
  'A lépcsőház – 2. emelet', 'Fekete György', 'A/6', current_date + 14,
  'villanyszerelés', 3, 'Hibás mennyezeti lámpa A lépcsőház 2. emeletén – biztonsági probléma éjszaka.', now() - interval '30 minutes',
  now() - interval '6 days', now() - interval '2 days'
),
(
  v_ticket4, v_building_id, v_unit_a4, v_uid_kepviselo,
  'Lift nem indul – A lépcsőház',
  'Az A lépcsőházi lift ajtaja nem záródik be megfelelően, így a lift nem indul el. Érintett: idős és mozgáskorlátozott lakók.',
  'folyamatban', 'kritikus',
  'A lépcsőház – lift', 'Közös képviselő', 'A/4', current_date + 1,
  'liftszerelés', 9, 'Lifthiba A lépcsőházban – ajtózár meghibásodás, sürgős javítás szükséges, mozgáskorlátozottak érintve.', now() - interval '4 hours',
  now() - interval '1 day', now() - interval '4 hours'
),
(
  v_ticket5, v_building_id, v_unit_b1, v_uid_lako,
  'Kapucsengő nem működik (B bejárat)',
  'A B bejárat kaputelefonja meghibásodott. A B lépcsőházi lakók nem tudnak vendéget beengedni.',
  'uj', 'kozepes',
  'B bejárat – kaputelefon', 'Balogh Istvánné', 'B/1', current_date + 10,
  NULL, NULL, NULL, NULL,
  now() - interval '3 days', now() - interval '3 days'
),
(
  v_ticket6, v_building_id, v_unit_a7, v_uid_lako,
  'Penészfolt a fürdőszoba falán',
  'A/7 albetét fürdőszobájában a zuhanyzó mellett penészfolt jelent meg. Nedvesedés tünete tapasztalható.',
  'varakozik', 'kozepes',
  'A/7 – fürdőszoba', 'Molnár Katalin', 'A/7', current_date + 21,
  'nedvesedés', 4, 'Penészfolt A/7 fürdőszobában – valószínű nedvesedési probléma, kivizsgálás szükséges.', now() - interval '2 hours',
  now() - interval '5 days', now() - interval '3 days'
),
(
  v_ticket7, v_building_id, v_unit_b8, v_uid_kepviselo,
  'Szeméttároló ajtaja zárhatatlan',
  'A B lépcsőházi szeméttároló helyiség ajtajának zárja eltört. A helyiség folyamatosan nyitva marad, ami kártevő- és szagprobléma forrása.',
  'lezarva', 'alacsony',
  'B lépcsőház – szeméttároló', 'Közös képviselő', 'B/8', current_date - 3,
  'karbantartás', 2, 'Elromlott zár a szeméttárolón – megoldva, új zár beszerelve.', now() - interval '10 days',
  now() - interval '12 days', now() - interval '2 days'
),
(
  v_ticket8, v_building_id, v_unit_a1, v_uid_kepviselo,
  'Parkolóterület jelölés felújítása szükséges',
  'Az A lépcsőházi parkolóhelyeket jelölő sárga festés teljesen elkopott. Parkolási konfliktusok merülnek fel a lakók között.',
  'uj', 'alacsony',
  'Parkoló – A szárny', 'Közös képviselő', 'A/1', current_date + 30,
  NULL, NULL, NULL, NULL,
  now() - interval '8 days', now() - interval '8 days'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 9. METER READINGS
-- =============================================================

INSERT INTO meter_readings (id, building_id, unit_id, reported_by, meter_type, value, reading_date, unit_label, reported_by_name, created_at) VALUES
(v_mr1, v_building_id, v_unit_a5, v_uid_lako,      'viz',    1248.50, '2026-05-01', 'A/5', 'Szabó Mária',   now() - interval '15 days'),
(v_mr2, v_building_id, v_unit_a5, v_uid_lako,      'villany', 4392.20, '2026-05-01', 'A/5', 'Szabó Mária',   now() - interval '15 days'),
(v_mr3, v_building_id, v_unit_b3, v_uid_kepviselo, 'viz',    2015.00, '2026-05-01', 'B/3', 'Közös képviselő', now() - interval '15 days'),
(v_mr4, v_building_id, v_unit_b3, v_uid_kepviselo, 'gaz',     889.75, '2026-05-01', 'B/3', 'Közös képviselő', now() - interval '15 days'),
(v_mr5, v_building_id, v_unit_a2, v_uid_kepviselo, 'viz',    1103.30, '2026-05-01', 'A/2', 'Közös képviselő', now() - interval '15 days'),
(v_mr6, v_building_id, v_unit_a8, v_uid_kepviselo, 'villany', 6201.80, '2026-05-01', 'A/8', 'Közös képviselő', now() - interval '15 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 10. DOCUMENTS
-- =============================================================

INSERT INTO documents (id, building_id, title, category, version, file_url, visibility, document_type, uploaded_at) VALUES
(
  v_doc1, v_building_id,
  'Szervezeti és Működési Szabályzat (SZMSZ)',
  'Szabályzat', 'v3.1',
  'demo/szmsz_v3.1.pdf',
  'Mindenki', 'upload',
  now() - interval '30 days'
),
(
  v_doc2, v_building_id,
  'Éves elszámolás 2025',
  'Pénzügyi', 'v1.0',
  'demo/elszamolas_2025.pdf',
  'Mindenki', 'upload',
  now() - interval '10 days'
),
(
  v_doc3, v_building_id,
  'Közgyűlési meghívó – 2026. június 10.',
  'Közgyűlés', 'v1.0',
  'demo/kozgyules_meghivo_20260610.pdf',
  'Mindenki', 'upload',
  now() - interval '5 days'
),
(
  v_doc4, v_building_id,
  'Tűzvédelmi szabályzat',
  'Szabályzat', 'v2.0',
  'demo/tuzvedelmi_szabalyzat_v2.pdf',
  'Mindenki', 'upload',
  now() - interval '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 11. DOCUMENT ACKNOWLEDGEMENTS
-- =============================================================

INSERT INTO document_acknowledgements (id, document_id, profile_id, viewed_at) VALUES
(v_ack1, v_doc1, v_uid_lako, now() - interval '28 days'),
(v_ack2, v_doc2, v_uid_lako, now() - interval '8 days')
ON CONFLICT (document_id, profile_id) DO NOTHING;

-- =============================================================
-- 12. FINANCE ENTRIES
--     entry_type: charge / payment / opening_balance / adjustment
--     3 units will have arrears: A/2, A/4, A/7
-- =============================================================

-- Opening balance for A/2 (historical arrear)
INSERT INTO finance_entries (id, unit_id, period, expected_amount, paid_amount, due_date, entry_type, description, created_at) VALUES
(
  v_fe1, v_unit_a2,
  '2025-12', 12000.00, 0.00, '2026-01-15',
  'opening_balance', 'Áthozott hátralék 2025 decemberből',
  now() - interval '60 days'
)
ON CONFLICT (id) DO NOTHING;

-- Regular charges 2026-01 for A/2, A/4, A/7
INSERT INTO finance_entries (id, unit_id, period, expected_amount, paid_amount, due_date, entry_type, description, created_at) VALUES
(
  v_fe2, v_unit_a2,
  '2026-01', 28500.00, 16000.00, '2026-02-15',
  'charge', '2026. januári közös költség – A/2',
  now() - interval '45 days'
),
(
  v_fe3, v_unit_a4,
  '2026-02', 32400.00, 13650.00, '2026-03-15',
  'charge', '2026. februári közös költség – A/4',
  now() - interval '30 days'
),
(
  v_fe4, v_unit_a7,
  '2026-03', 35600.00, 26400.00, '2026-04-15',
  'charge', '2026. márciusi közös költség – A/7',
  now() - interval '15 days'
)
ON CONFLICT (id) DO NOTHING;

-- Payments for non-arrear units (A/1, B/1, B/4)
INSERT INTO finance_entries (id, unit_id, period, expected_amount, paid_amount, due_date, entry_type, description, created_at) VALUES
(
  v_fe5, v_unit_a1,
  '2026-04', 23500.00, 23500.00, '2026-05-15',
  'payment', '2026. áprilisi befizetés – A/1',
  now() - interval '5 days'
),
(
  v_fe6, v_unit_b1,
  '2026-04', 23500.00, 23500.00, '2026-05-15',
  'payment', '2026. áprilisi befizetés – B/1',
  now() - interval '5 days'
),
(
  v_fe7, v_unit_b4,
  '2026-04', 32400.00, 32400.00, '2026-05-15',
  'payment', '2026. áprilisi befizetés – B/4',
  now() - interval '5 days'
),
(
  v_fe8, v_unit_a5,
  '2026-04', 30200.00, 30200.00, '2026-05-15',
  'payment', '2026. áprilisi befizetés – A/5 (Szabó Mária)',
  now() - interval '4 days'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 13. MEETINGS
-- =============================================================

INSERT INTO meetings (
  id, building_id, title, scheduled_at, status,
  resolution_count, agenda_preview,
  location, chairperson_name, secretary_name,
  actual_quorum, quorum_threshold,
  created_at
) VALUES
(
  v_meeting_past, v_building_id,
  '2026. évi első rendes közgyűlés',
  '2026-03-15 18:00:00+01',
  'lezart',
  3,
  'Éves elszámolás 2025 | Felújítási alap képzése | SZMSZ módosítás',
  'Budapest, XIII. ker., Gidófalvy Lajos utca 9. – Közösségi terem',
  'Kovács Béla', 'Nagy Péter',
  0.72, 0.50,
  now() - interval '62 days'
),
(
  v_meeting_upcoming, v_building_id,
  'Rendkívüli közgyűlés – liftfelújítás',
  (now() + interval '25 days')::timestamptz,
  'tervezett',
  0,
  'Liftfelújítás ajánlatok megtárgyalása | Pályázat beadása | Szavazás',
  'Budapest, XIII. ker., Gidófalvy Lajos utca 9. – Közösségi terem',
  'Kovács Béla', 'Nagy Péter',
  NULL, 0.50,
  now() - interval '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 14. AGENDA ITEMS (past meeting)
-- =============================================================

INSERT INTO agenda_items (id, meeting_id, order_no, title, description, created_at) VALUES
(
  v_agenda1, v_meeting_past, 1,
  'Éves elszámolás 2025 jóváhagyása',
  'A könyvelő bemutatja a 2025. évi bevételeket és kiadásokat. Szavazás az elfogadásról.',
  now() - interval '62 days'
),
(
  v_agenda2, v_meeting_past, 2,
  'Felújítási alap képzése',
  'Döntés hozatal arról, hogy az éves közös költség 10%-át felújítási alapba kell-e helyezni.',
  now() - interval '62 days'
),
(
  v_agenda3, v_meeting_past, 3,
  'SZMSZ 5.§ módosítása – parkolási rend',
  'Javaslat a parkolóhelyek kijelölésére vonatkozó szabály pontosítására.',
  now() - interval '62 days'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 15. RESOLUTIONS (past meeting)
-- =============================================================

INSERT INTO resolutions (id, meeting_id, agenda_item_id, text, outcome, effective_date, created_at) VALUES
(
  v_res1, v_meeting_past, v_agenda1,
  'A közgyűlés a 2025. évi elszámolást 12 igen, 2 nem, 0 tartózkodás arányában elfogadja.',
  'elfogadva', '2026-03-15',
  now() - interval '61 days'
),
(
  v_res2, v_meeting_past, v_agenda2,
  'A közgyűlés határozza: az éves közös költség 10%-a felújítási alapba kerül, hatályos 2026. január 1-jétől.',
  'elfogadva', '2026-04-01',
  now() - interval '61 days'
),
(
  v_res3, v_meeting_past, v_agenda3,
  'Az SZMSZ 5.§ módosítása nem nyert el elegendő szavazatot. Napirend visszakerül a következő közgyűlésre.',
  'elutasitva', NULL,
  now() - interval '61 days'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 16. VOTES
-- =============================================================

INSERT INTO votes (id, resolution_id, voter_profile_id, unit_id, vote_value, weight, created_at) VALUES
(v_vote1, v_res1, v_uid_kepviselo, v_unit_a5, 'igen',         67.75, now() - interval '61 days'),
(v_vote2, v_res2, v_uid_lako,      v_unit_a5, 'igen',         67.75, now() - interval '61 days'),
(v_vote3, v_res3, v_uid_konyvelo,  v_unit_a1, 'tartozkodas',  52.50, now() - interval '61 days')
ON CONFLICT (resolution_id, voter_profile_id) DO NOTHING;

-- =============================================================
-- 17. MEETING ATTENDANCES (past meeting)
-- =============================================================

INSERT INTO meeting_attendances (id, meeting_id, profile_id, unit_id, ownership_share, attended_at) VALUES
(v_att1, v_meeting_past, v_uid_kepviselo, v_unit_a3, 67.7500, now() - interval '61 days'),
(v_att2, v_meeting_past, v_uid_lako,      v_unit_a5, 67.7500, now() - interval '61 days'),
(v_att3, v_meeting_past, v_uid_konyvelo,  v_unit_b2, 48.2500, now() - interval '61 days')
ON CONFLICT (meeting_id, unit_id) DO NOTHING;

-- =============================================================
-- 18. VENDORS
-- =============================================================

INSERT INTO vendors (id, building_id, name, category, contact, sla_hours, created_at) VALUES
(
  v_vendor1, v_building_id,
  'AquaTech Kft.',
  'Vízszerelés', '+36 1 234 5678', 24,
  now() - interval '90 days'
),
(
  v_vendor2, v_building_id,
  'ElektroMester Zrt.',
  'Villanyszerelés', '+36 20 987 6543', 48,
  now() - interval '90 days'
),
(
  v_vendor3, v_building_id,
  'CleanPro Takarítócég',
  'Takarítás', '+36 70 111 2222', 8,
  now() - interval '90 days'
),
(
  v_vendor4, v_building_id,
  'LiftTech Szerviz Kft.',
  'Liftszerelés', '+36 1 999 8877', 4,
  now() - interval '90 days'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 19. WORK ORDERS
-- =============================================================

INSERT INTO work_orders (id, ticket_id, vendor_id, ticket_title, vendor_name, status, due_date, cost_estimate, created_at) VALUES
(
  v_wo1, v_ticket2, v_vendor1,
  'Vízszivárgás a B/3 alatti mennyezeten',
  'AquaTech Kft.',
  'folyamatban', current_date + 2, 85000.00,
  now() - interval '3 days'
),
(
  v_wo2, v_ticket4, v_vendor4,
  'Lift nem indul – A lépcsőház',
  'LiftTech Szerviz Kft.',
  'kikuldve', current_date + 1, 45000.00,
  now() - interval '20 hours'
),
(
  v_wo3, v_ticket7, v_vendor3,
  'Szeméttároló ajtaja zárhatatlan',
  'CleanPro Takarítócég',
  'lezarva', current_date - 3, 12000.00,
  now() - interval '11 days'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 20. KNOWLEDGE BASE ARTICLES
-- =============================================================

INSERT INTO knowledge_base_articles (id, building_id, title, topic, body, audience, created_at) VALUES
(
  v_kb1, v_building_id,
  'SZMSZ összefoglaló – legfontosabb szabályok',
  'Házirendek',
  'A Gidófalvy Lajos utca 9. társasház szervezeti és működési szabályzata (SZMSZ) a következő főbb szabályokat tartalmazza: (1) Közös területek rendeltetésszerű használata kötelező. (2) Zajkeltés csak 8–22 óra között engedélyezett. (3) Lépcsőházon keresztül tárgyakat szállítani csak előre egyeztetve lehet. (4) Parkolóhelyek kiosztása sorshúzással történik. (5) Állatot csak az SZMSZ feltételei szerint lehet tartani. A teljes SZMSZ a Dokumentumok között érhető el.',
  'Minden lakó',
  now() - interval '20 days'
),
(
  v_kb2, v_building_id,
  'Közüzemi díjak és mérőóra leolvasás menete',
  'Pénzügyek',
  'A mérőóra leolvasás minden hónap 1-5. napja között esedékes. Az adatokat a PanelLakó applikáción keresztül kell beküldeni. Hiányzó leolvasás esetén becsült fogyasztással számolunk. A közüzemi díjak tartalmazzák: víz- és csatornadíj (FCSM), gázdíj (MVM), villanydíj (E.ON). Díjfelszólítás 10 napos késedelem után automatikusan keletkezik.',
  'Minden lakó',
  now() - interval '18 days'
),
(
  v_kb3, v_building_id,
  'Tűzriadó terv és menekülési útvonalak',
  'Biztonság',
  'Tűz esetén haladéktalanul hívja a 112-t, majd értesítse a közös képviselőt. Az épület menekülési útvonalai: A lépcsőház – A bejárat; B lépcsőház – B bejárat. Tilos a lépcsőházon éghető anyagot tárolni. Tűzoltó készülékek helye: minden emeleten a lépcsőházban, az elektromos szekrény mellett. Az éves tűzvédelmi ellenőrzés kötelező és a költségek a közös alapot terhelik.',
  'Minden lakó',
  now() - interval '15 days'
),
(
  v_kb4, v_building_id,
  'Parkolási szabályok és helykiosztás',
  'Házirendek',
  'A Gidófalvy Lajos utca 9. hátsó udvarában összesen 16 gépkocsi számára biztosított parkolóhely. A helyek kiosztása a tulajdonosi arány alapján, sorshúzással történt. Vendégparkolás a megjelölt 2 helyen lehetséges, maximum 48 óráig. Motorbicikli és kerékpár a tárolóhelyiségben helyezhető el. Parkolóhelyet albérelni vagy másra átruházni tilos, kivéve ha az SZMSZ erre külön engedélyt ad.',
  'Minden lakó',
  now() - interval '12 days'
),
(
  v_kb5, v_building_id,
  'Hulladékkezelés és szelektív gyűjtés rendje',
  'Üzemeltetés',
  'Az épület udvari szeméttárolójában az alábbi konténerek állnak rendelkezésre: vegyes hulladék (szürke), papír (kék), műanyag/fém (sárga), üveg (zöld). A lomtalanítás évente kétszer esedékes, előre egyeztetett időpontban. Tilos a szeméttárolóban elektronikai hulladékot elhelyezni – ezt a városüzemeltetési telepen kell leadni. A konténerek ürítése minden hétfőn reggel 7 órakor történik.',
  'Minden lakó',
  now() - interval '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 21. AUDIT LOGS
-- =============================================================

INSERT INTO audit_logs (id, actor_id, actor_name, action_type, entity_type, entity_id, entity_label, created_at) VALUES
(v_al1,  v_uid_kepviselo, 'Kovács Béla',  'create',   'building',     v_building_id,   'Gidófalvy Lajos utca 9.',                   now() - interval '90 days'),
(v_al2,  v_uid_kepviselo, 'Kovács Béla',  'create',   'announcement', v_ann5,           'Éves elszámolás 2025 – közzétéve',   now() - interval '10 days'),
(v_al3,  v_uid_lako,      'Szabó Mária',  'create',   'ticket',       v_ticket1,        'Csepegő csap a konyhában',           now() - interval '2 days'),
(v_al4,  v_uid_kepviselo, 'Kovács Béla',  'update',   'ticket',       v_ticket2,        'Vízszivárgás a B/3 alatti mennyezeten', now() - interval '1 day'),
(v_al5,  v_uid_konyvelo,  'Nagy Péter',   'create',   'document',     v_doc2,           'Éves elszámolás 2025',               now() - interval '10 days'),
(v_al6,  v_uid_lako,      'Szabó Mária',  'create',   'meter_reading',v_mr1,            'Vízóra – A/5 – 2026-05-01',          now() - interval '15 days'),
(v_al7,  v_uid_kepviselo, 'Kovács Béla',  'create',   'meeting',      v_meeting_past,   '2026. évi első rendes közgyűlés',    now() - interval '62 days'),
(v_al8,  v_uid_kepviselo, 'Kovács Béla',  'update',   'meeting',      v_meeting_past,   'Közgyűlés lezárva',                  now() - interval '60 days'),
(v_al9,  v_uid_kepviselo, 'Kovács Béla',  'create',   'work_order',   v_wo1,            'Munkarendelés: AquaTech – B/3 szivárgás', now() - interval '3 days'),
(v_al10, NULL,            'Rendszer',     'create',   'notification', v_notif4,         'Hátralék emlékeztető – Tóth Anna',   now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 22. SUBSCRIPTION
--     Bypass the RLS "No direct client insert" policy by using
--     a security-definer helper or inserting directly as service_role.
--     seed.sql runs as service_role in Supabase SQL Editor.
-- =============================================================

INSERT INTO subscriptions (
  id, building_id,
  stripe_customer_id, stripe_subscription_id,
  plan, status,
  unit_count,
  trial_end,
  current_period_start, current_period_end,
  cancel_at_period_end,
  created_at, updated_at
) VALUES (
  v_sub1, v_building_id,
  'cus_demo_alkotas42', 'sub_demo_alkotas42',
  'alap', 'trialing',
  16,
  now() + interval '14 days',
  now(), now() + interval '30 days',
  false,
  now(), now()
)
ON CONFLICT (building_id) DO NOTHING;

-- =============================================================
-- Done
-- =============================================================

RAISE NOTICE 'PanelLakó seed completed successfully.';
RAISE NOTICE '  Users:            3 (kepviselo, lako, konyvelo)';
RAISE NOTICE '  Building:         1 (Gidófalvy Lajos utca 9.)';
RAISE NOTICE '  Units:            16 (A/1–A/8, B/1–B/8)';
RAISE NOTICE '  Memberships:      3';
RAISE NOTICE '  Announcements:    5';
RAISE NOTICE '  Notifications:    6';
RAISE NOTICE '  Tickets:          8';
RAISE NOTICE '  Meter readings:   6';
RAISE NOTICE '  Documents:        4';
RAISE NOTICE '  Finance entries:  8';
RAISE NOTICE '  Meetings:         2 (1 past, 1 upcoming)';
RAISE NOTICE '  Vendors:          4';
RAISE NOTICE '  Work orders:      3';
RAISE NOTICE '  KB articles:      5';
RAISE NOTICE '  Audit logs:       10';
RAISE NOTICE '  Subscription:     1 (trialing, alap plan)';

END $$;
