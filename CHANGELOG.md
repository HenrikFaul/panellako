# Changelog

## 2026-05-15 — v0.3.0 Növekedési sprint #1 — Teljes Supabase írási réteg (Initiative #1)

### Added
- **`app/actions/votes.ts`**: `submitVote(resolutionId, voteValue)` Server Action — `votes` táblába ír, upsert a dupla szavazás ellen.
- **`app/actions/work-orders.ts`**: `createWorkOrder(...)` + `updateWorkOrderStatus(workOrderId, status)` Server Actions.
- **`app/actions/finance.ts`**: `createFinanceEntry(...)` + `recordPayment(financeEntryId, paidAmount)` Server Actions.

### Fixed
- **`supabase/schema.sql`**: Hiányzó RLS INSERT policy-k hozzáadva: `documents`, `document_acknowledgements`, `finance_entries`, `votes`, `work_orders`. Korábban ezek a táblák silent RLS-blokkolással nem fogadtak írást.
- **`supabase/schema.sql`**: Hiányzó RLS UPDATE policy-k hozzáadva: `tickets`, `notifications`, `document_acknowledgements`, `work_orders`, `resolutions`. Az `updateTicketStatus` és `markNotificationRead` akciók így ténylegesen írnak.
- **`lib/data.ts`**: `getDashboardData` per-user document acknowledgement join implementálva — a `document_acknowledgements` tábla `viewed_at` értéke mostantól bekerül az `acknowledged_at` mezőbe minden dokumentumnál a bejelentkezett felhasználóra szűrve. Korábban az "Elolvasva" gomb sosem tűnt el kattintás után.
- **`lib/data.ts`**: Profil lekérdezés hozzáadva — `currentUser` mostantól valós adatbázis profilt tölt be.
- **`components/dashboard-client.tsx`**: Work order státusz frissítése dropdown-ból (manager szerepkörre). `updateWorkOrderStatus` bekötve.
- **`components/dashboard-client.tsx`**: `updateWorkOrderStatus`, `submitVote` Server Action importok hozzáadva.

## 2026-05-15 — v0.2.1 Server Action sémaillesztési javítások + optimista rollback

### Fixed
- **`app/actions/documents.ts`**: `document_acknowledgements` upsert `acknowledged_at` → `viewed_at` (séma oszlopnév helyreállítva; a korábbi verzió silently misfired).
- **`app/actions/meter-readings.ts`**: `submitted_at` mező eltávolítva — ez az oszlop nem létezik a `meter_readings` sémában (`created_at` default now() kezeli).
- **`app/actions/documents.ts`**: `uploaded_by` mező eltávolítva a `createDocument` insertből — nem létező sémaoszlop.
- **`components/dashboard-client.tsx`**: Optimista rollback implementálva:
  - Ticket létrehozásnál: ha a Server Action sikertelensége esetén az optimista ticket visszavonásra kerül (`filter` a temp id alapján), a form reset csak sikeresnél fut le.
  - Ticket státusz frissítésnél: ha a `updateTicketStatusAction` sikertelenül tér vissza, a korábbi `tickets` állapot visszaáll.

---

## 2026-05-15 — v0.2.0 SSR Auth + Server Actions + Analízis sprint

### Added
- **SSR Auth hardening** (`middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/browser.ts`): cookie-alapú munkamenet, `getUser()` az összes auth kritikus ponton — `getSession()` eltávolítva az egész kódbázisból.
- **@supabase/ssr** csomag: Next.js App Router kompatibilis SSR Supabase kliens.
- **Server Actions réteg** (`app/actions/`): `tickets.ts`, `meter-readings.ts`, `announcements.ts`, `notifications.ts`, `documents.ts` — az összes mutáció valós Supabase írást hajt végre `revalidatePath('/')` frissítéssel.
- **Optimista UI frissítések** ticket létrehozásnál és státusz változtatásnál — gyors UX, szerver szinkron a háttérben.
- **Dokumentum visszaigazolás gomb** (`acknowledgeDocument` Server Action bekötve) — `document_acknowledgements` táblába ír.
- **Resend** e-mail csomag telepítve (kész az e-mail értesítési sprint folytatásához).
- **Valuation + Growth Strategy PDF-ek** (`growth_strategy/output/`, `valuation/output/`): 4 PDF, EN+HU, teljes PanelLakó-specifikus tartalommal.
- **Growth Strategy elemzés**: 10 rangsorolt kezdeményezés, valódi ROI tartományokkal és implementációs promptokkal.
- **docs/** rendszer generálva a doc creation toolkit alapján.

### Changed
- `lib/data.ts`: szerver-oldali `createClient()` hívás (`@supabase/ssr`) a kliens-oldali `supabase` singleton helyett.
- `components/dashboard-client.tsx`: auth ellenőrzés `getUser()`-re váltva, mutációk Server Action hívásokra bekötve, kijelentkezés gomb `createClient()` alapú.
- Mérőóra és értesítés form: `name` attribútumok hozzáadva, Server Action bekötve.

### Infrastructure
- Baseline valuation: **€180k–€420k** (pre-revenue MVP+)
- Target valuation post-10 initiatives: **€2.1M–€5.8M**

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
