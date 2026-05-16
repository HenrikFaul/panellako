# Changelog

## 2026-05-16 — v0.3.6 Mobile PWA + Push értesítések (Initiative #6)

### Added
- **`next.config.mjs`**: `next-pwa` konfiguráció — service worker regisztrálva, offline fallback `/offline` oldalra, production-only (dev módban kikapcsolva).
- **`public/manifest.json`**: PWA Web App Manifest — installable app, `standalone` display, teal theme color, HU lang.
- **`app/layout.tsx`**: `<link rel="manifest">`, `theme-color`, apple-web-app-capable, `Viewport` export.
- **`app/offline/page.tsx`**: Offline fallback oldal.
- **`supabase/schema.sql`**: `push_subscriptions` tábla (endpoint, p256dh, auth, profile_id) RLS-sel.
- **`app/api/push/subscribe/route.ts`**: POST (upsert subscription) + DELETE (unsubscribe) API végpont.
- **`supabase/functions/send-push/index.ts`**: Supabase Edge Function — Web Push küldés VAPID JWT-vel, building-szintű broadcast, lejárt subscription automatikus törlése.
- **`components/dashboard-client.tsx`**: Push értesítés bekapcsolás/kikapcsolás UI a profil szekcióban (PushManager API detection, Notification.requestPermission, subscribe/unsubscribe flow).

### Deployment note
VAPID kulcsok generálása: `npx web-push generate-vapid-keys`. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` és `VAPID_PRIVATE_KEY` beállítása `.env.local`-ban és Vercel-en. Supabase Edge Function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:support@panellako.hu`.

## 2026-05-15 — v0.3.5 Közgyűlési protokoll generator (Initiative #9)

### Added
- **`app/actions/meetings.ts`**: Teljes közgyűlési Server Action réteg — `createMeeting` (napirendi pontokkal együtt, audit log bejegyzéssel), `sendAssemblyInvitation` (Ptk. 5:84 8 napos előírás ellenőrzéssel), `recordAttendance` (tulajdoni hányad alapú jelenléti nyilvántartás, upsert), `recordVote` (szavazat rögzítés súlyozással), `closeMeeting` (kvórum automatikus kiszámítása attendance adatokból).
- **`supabase/schema.sql`**: `meetings` tábla bővítve — `status_detail`, `quorum_threshold`, `actual_quorum`, `protocol_url`, `invitation_sent_at`, `location`, `chairperson_name`, `secretary_name`. Új `meeting_attendances` tábla (RLS-sel). `documents.document_type` oszlop. Meeting és agenda_item INSERT/UPDATE policy-k.
- **`lib/types.ts`**: `MeetingItem` interface bővítve kvórum, meghívó, protokoll mezőkkel.
- **`components/dashboard-client.tsx`**: Közgyűlés létrehozási form (manager), meghívó küldés gomb (Ptk. 5:84 ellenőrzéssel), kvórum megjelenítés, közgyűlés lezárás gomb.
- **`@react-pdf/renderer`** csomag telepítve (PDF protokoll generáláshoz).

## 2026-05-15 — v0.3.4 Pénzügyi főkönyv + hátralék automatizáció (Initiative #8)

### Added
- **`app/actions/finance.ts`**: Teljes pénzügyi Server Action réteg — `createCharge` (tömeges egyenletes terhelés az épület összes albetétjének), `recordPayment` (befizetés rögzítés payment típusú bejegyzésként), `getArrearsReport` (hátralék riport per épület), `getUnitFinanceHistory` (albetét-szintű pénzügyi előzmény). Duplikáció-ellenőrzés, összeg/dátum/periódus validáció.
- **`supabase/schema.sql`**: `finance_entries` tábla bővítve: `payment_date`, `payment_reference`, `created_by`, `description`, `entry_type` (charge/payment/adjustment/opening_balance). `unit_balance_view`, `building_arrears_view` nézetek. `sync_unit_balance` trigger (automatikusan frissíti `units.balance_amount`). 4 teljesítmény index.
- **`lib/types.ts`**: `FinanceItem` interface bővítve; új `FinanceEntryType` union type.
- **`components/dashboard-client.tsx`**: Terhelés rögzítési form (manager/könyvelő), befizetés rögzítési modal, fizetési bejegyzések zöld kiemelése, hátralék kiemelése rose színnel.

## 2026-05-15 — v0.3.3 E-mail értesítési rendszer via Resend (Initiative #10)

### Added
- **`lib/email.ts`**: Központi e-mail küldő modul Resend SDK-val. `sendEmail` (single), `sendBulkEmail` (batch, rate-limit-aware chunking), `renderEmailTemplate`, `generateUnsubscribeUrl`. Graceful fallback (console log) ha `RESEND_API_KEY` nincs beállítva.
- **`lib/email-templates/announcement.tsx`**: React Email komponens hirdetményekhez — PanelLakó branded HTML email, kategória badge, CTA gomb, leiratkozás link.
- **`lib/email-templates/ticket-update.tsx`**: React Email komponens ticket státuszfrissítési értesítőhöz — régi→új státusz megjelenítés.
- **`app/api/email/unsubscribe/route.ts`**: GET endpoint egykulcsos leiratkozáshoz — `unsubscribe_token` UUID alapján frissíti a `profiles.notifications_email = false` értékét.
- **`app/actions/announcements.ts`**: `createAnnouncement` mostantól fire-and-forget módon e-mailt küld az épület összes opt-in lakójának hirdetmény létrehozásakor.
- **`supabase/schema.sql`**: `profiles` tábla bővítve: `notifications_email`, `notifications_statutory_email`, `unsubscribe_token` oszlopok.
- **`lib/types.ts`**: `UserProfile` interface bővítve e-mail preference mezőkkel.
- `@react-email/components`, `@react-email/render` csomagok telepítve.

### Pre-condition
`RESEND_API_KEY=re_xxx` beállítása `.env.local`-ban és Vercel-en. A `panellako.hu` domain verifikálása a Resend dashboardon.

## 2026-05-15 — v0.3.2 AI hibabejelentés triázs — claude-haiku-4-5 (Initiative #7)

### Added
- **`supabase/functions/triage-ticket/index.ts`**: Supabase Edge Function — hungarian-language fault ticket triage. Anthropic `claude-haiku-4-5-20251001` modelel kategorizál (8 típus), 1–10 sürgősségi pontot, vendor javaslatot és egymonatos összefoglalót ad vissza JSON-ban. 15 mp timeout, JSON parser fallback, graceful fail ha `ANTHROPIC_API_KEY` nincs beállítva.
- **`app/actions/tickets.ts`**: `createTicket` mostantól fire-and-forget módon meghívja a triage Edge Functiont. Új `updateTicketAiOverride` Server Action manager AI-felülbíráláshoz.
- **`lib/types.ts`**: `Ticket` interface bővítve AI mezőkkel: `ai_category`, `ai_urgency`, `ai_vendor_suggestion`, `ai_summary_hu`, `ai_triage_at`, `ai_override`. Új `AiCategory` union type.
- **`supabase/schema.sql`**: 6 AI oszlop a `tickets` táblán, 2 index (pending triage, urgency sorrendhez).
- **`components/dashboard-client.tsx`**: `AiUrgencyBadge`, `AiCategoryChip`, `AiTriagePendingSkeleton` komponensek. Ticket kártyák mostantól AI sürgősséget, kategóriát, vendor javaslatot, AI összefoglalót mutatnak. Kritikus ticket (urgency ≥ 8) rose kerettel emelkedik ki. Manager "AI módosítás" modal — kategória + sürgősség felülbírálása.
- **`tsconfig.json`**: `supabase/functions/` kizárva a Next.js TypeScript ellenőrzésből (Deno runtime).

### Deployment note
Az Edge Function csak a Supabase dashboardon beállított `ANTHROPIC_API_KEY` secret esetén triázsol — hiánya esetén a ticket `ai_triage_at = null` állapotban marad (pending skeleton jelenik meg). Deploy: `supabase functions deploy triage-ticket --no-verify-jwt`.

## 2026-05-15 — v0.3.1 Dokumentum feltöltés Supabase Storage (Initiative #3)

### Added
- **`app/actions/documents.ts`**: `uploadDocument(formData)` Server Action — MIME validáció (PDF/JPG/PNG/DOC/XLS), 10 MB méretlimit, Supabase Storage feltöltés `documents` bucketbe, storage path tárolás `file_url`-ben, rollback DB hiba esetén.
- **`app/actions/documents.ts`**: `getDocumentSignedUrl(filePath)` Server Action — 1 órás lejáratú signed URL generálás; legacy http(s) URL-ek változatlanul kerülnek vissza.
- **`components/dashboard-client.tsx`**: Dokumentum feltöltési form (manager-only) — cím, kategória, verzió, láthatóság, fájl input; feltöltés állapot visszajelzés (feltöltés folyamatban / feltöltve / hiba).
- **`components/dashboard-client.tsx`**: "Megnyitás" gomb — signed URL alapú dokumentummegnyitás új lapon.

### Fixed
- **`supabase/schema.sql`**: `votes` tábla egyedi constraint hozzáadva (`resolution_id, voter_profile_id`) — az `submitVote` upsert `onConflict` clauseja enélkül futásidőben hibával tér vissza.

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
