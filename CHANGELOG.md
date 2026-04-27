# Changelog

## 2026-04-27
### Added
- Elkészült a PanelLakó MVP Next.js + Tailwind alapú webalkalmazás fő dashboard felülete.
- Supabase adatkapcsolat (env alapon) mock fallback logikával.
- MVP modulok megjelenítése: hírfolyam, hibabejelentések, dokumentumtár, pénzügyi áttekintés, közgyűlések.
- Supabase `schema.sql` fájl a minimálisan szükséges táblákkal.
- README telepítési, Vercel deploy és Supabase setup útmutató.

## 2026-04-27 (MVP+ bővítés)
### Added
- Belépési oldal (`/login`) Supabase magic link előkészítéssel.
- Szerepkör-kiterjesztés: megbízott role és role-switch demo nézet.
- Új modulok a dashboardon: hibabejelentés űrlap, óraállás-bejelentés űrlap, képviselői célzott értesítés űrlap.
- Értesítési napló és mérőóra adatok megjelenítése.
- Új PanelLakó logó komponens.
- Kibővített Supabase adatmodell: profiles, buildings, units, memberships, notifications, meter_readings és kapcsolódó RLS policy-k.

### Changed
- Dashboard adatlekérés kiterjesztve notifications és meter_readings táblákra.
- README frissítve az új funkciókhoz és backend-séma tartalomhoz.

## 2026-04-27 (Feature refresh + AWS Location fix)
### Added
- Új server-side AWS Location proxy route: `app/api/location/autocomplete/route.ts`.
- OnlineHáz-szerű albetét táblázat kereséssel, terület/tulajdoni hányad/egyenleg/vízóra adatokkal.
- Bővített dashboard: teendők, gyors műveletek, ticket queue, dokumentum olvasottság, pénzügyi progress, mérőóra lista, közgyűlés/szavazás előkészítés, vendor/work order workflow, tudásbázis és audit napló.
- Új mock adatok a vendorokhoz, work orderekhez, tudásbázishoz, audit loghoz és albetétekhez.
- Supabase séma bővítése: document acknowledgements, agenda items, resolutions, votes, vendors, work_orders, knowledge_base_articles, audit_logs és új albetét mezők.

### Changed
- A címkereső többé nem client-side `process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY` változóból olvas, hanem a Next.js API route-on keresztül server-side env-et használ.
- Supabase auth kliens `persistSession`, `autoRefreshToken` és `detectSessionInUrl` beállítást kapott a magic link flow stabilizálására.
- Login oldal modernebb UX-et és explicit redirect cél visszajelzést kapott.
- Dashboard vizuális szerkezete modern sidebar + card layout irányba frissült regresszió nélkül: a korábbi profil, ticket, meter, hírek, dokumentum, pénzügy és közgyűlés funkciók megmaradtak.
