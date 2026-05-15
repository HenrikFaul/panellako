# USER_MANUAL.md — PanelLakó User Manual

**Repository:** panellako  
**Branch:** main  
**Generated:** 2026-05-15  
**Confidence:** Medium-High (UI flows verified from source; business context inferred)

---

## Introduction

PanelLakó (Panel Building Resident) is a digital operations hub for Hungarian residential condominiums (társasházak). This manual provides step-by-step guidance for each of the six user personas. All tasks are performed within the single-page dashboard at `/`.

**Base URL (demo):** Your Vercel deployment URL  
**Login page:** `<base-url>/login`

---

## Getting Started — All Roles

### Step 1: Log In

1. Navigate to `<base-url>/login`
2. Enter your registered email address in the "E-mail" field
3. Click "Belépési link küldése"
4. Check your email inbox for a magic link
5. Click the link in the email — you will be redirected to the dashboard
6. The header button will change from "Belépés" to "Session aktív"

**If Supabase is not configured:** The system operates in demo/mock mode. You will see sample data and the login form will show a message confirming demo mode.

### Step 2: Identify Your Role

Your active role appears in the sidebar footer under "Aktív szerepkör". The Hungarian label is shown (e.g., "Lakó", "Közös képviselő").

**Demo role switching:** For testing, append `?role=<role>` to the URL:
- `/?role=lako` — Resident
- `/?role=tulajdonos` — Owner
- `/?role=kozos_kepviselo` — Building Manager
- `/?role=megbizott` — Delegate
- `/?role=bizottsag` — Committee Member
- `/?role=konyvelo` — Accountant

### Step 3: Navigate

Use the left sidebar on desktop (visible at lg breakpoint and wider). Click any item to jump to the corresponding section:
- Áttekintő (Overview), Teendők (Tasks), Bejelentések (Tickets), Albetétek (Units), Dokumentumok, Pénzügyek, Mérőórák, Közgyűlések, Tudásbázis, Audit napló

---

## Persona Guides

---

### Persona A: Lakó (Resident)

**Typical tasks:** Submit fault reports, read meter readings, acknowledge documents, view news.

#### A1 — Submit a Fault Report (Hibabejelentés)

1. Click "Bejelentések" in the sidebar or scroll to the tickets section
2. Fill in the form:
   - **Rövid cím** — brief title (e.g., "Lift meghibásodás")
   - **Leírás** — description of the problem; note that photo upload will be added via Storage integration in a future version
   - **Helyszín** — location (e.g., "A/12" for apartment A/12, or "lépcsőház" for stairwell)
   - **Prioritás** — select közepes (medium) for normal issues, magas (high) or kritikus (critical) for urgent ones
3. Click "Bejelentés rögzítése"
4. Your ticket appears immediately in the queue above with status "uj" (new)

**Tip:** You do not need to be logged in to submit a ticket in demo mode. For full persistence to the database, ensure you are logged in.

#### A2 — Check Ticket Status

1. Scroll to the ticket queue (right column of the tickets section)
2. Use the status filter dropdown to view: Összes / Új / Folyamatban / Várakozik / Lezárva
3. Each ticket card shows: title, description, location, submitter, last update time, status badge, priority badge
4. Closed tickets (Lezárva) show an emerald badge

#### A3 — Submit a Meter Reading (Mérőóra diktálás)

1. Click "Mérőórák" in the sidebar
2. Select meter type: víz (water), gáz (gas), villany (electricity)
3. Enter the current reading value (decimal allowed)
4. Enter the reading date using the date picker
5. Click "Óraállás elküldése"
6. Your reading appears in the history list below the form

**Note:** The unit label is taken from the profile form. Fill in your apartment unit (e.g., "A/12") in the Profile section before submitting readings.

#### A4 — Acknowledge a Document (Dokumentum olvasás)

1. Click "Dokumentumok" in the sidebar
2. Use the category filter to find relevant documents
3. Documents with a yellow warning triangle have not been acknowledged yet
4. Click "Megnyitás" to view the document
5. Click "Elolvasva" to mark the document as read
6. The yellow warning triangle changes to a green check mark

**Note:** Acknowledgement requires being logged in. In demo mode, the action completes but may not persist without Supabase.

#### A5 — Read News (Hírfolyam)

1. Scroll down to the "Hírfolyam" section
2. News items show title, preview text, category, source, and timestamp
3. Click "Teljes hír megnyitása" to expand the full article text
4. Click "Összecsukás" to collapse

#### A6 — View Financial Status

1. Click "Pénzügyek" in the sidebar
2. The summary row shows: total expected, total paid, and arrears (hátralék)
3. The progress bar shows payment rate visually
4. Individual entries below list each period, due date, expected and paid amounts

#### A7 — Update Your Profile

1. Scroll to the "Profil adatok és címkereső" section
2. Enter your full name and apartment unit number (e.g., "A/12")
3. Use the address search to find your building's address (type at least 3 characters for suggestions)
4. Select an address suggestion to confirm your address
5. Click "Profil mentése" (demo mode only — no server persistence yet)

---

### Persona B: Tulajdonos (Owner)

Owners have the same access as residents in the current MVP. All tasks from Persona A apply.

**Additional interest areas:**
- **Albetétek** — view the unit registry to see ownership shares and balances for all units in the building
- **Pénzügyek** — review financial standing including arrears

#### B1 — View Unit Registry

1. Click "Albetétek" in the sidebar
2. The table shows all units: label, owner name, type, area (m²), ownership share, balance, water meter presence
3. Use the search box (top-right of section) to search by unit label, owner name, or type
4. Balances shown in rose/red are negative (arrears); emerald/green are positive or zero

---

### Persona C: Közös Képviselő (Building Manager)

Building managers have full management access. All tasks from Personas A and B apply, plus the following.

#### C1 — Update Ticket Status

1. Open the ticket queue in the "Bejelentések" section
2. Each ticket card shows three action buttons at the bottom: "Folyamatban", "Várakozik", "Lezárás"
3. Click "Folyamatban" to indicate work has started
4. Click "Várakozik" if the ticket is waiting for a part or contractor
5. Click "Lezárás" to close the ticket when resolved
6. The status badge updates immediately (optimistic UI)

**Note:** Status changes require being logged in. The `updateTicketStatus` action verifies your session.

#### C2 — Send a Targeted Communication (Célzott kommunikáció)

1. Scroll to the "Célzott kommunikáció / hírküldés" section (visible only to admin-like roles)
2. Fill in:
   - **Értesítés címe** — notification title
   - **Célcsoport** — target group (e.g., "B lépcsőház", "Mindenki", specific unit label)
   - **Üzenet** — full message body
3. Click "Kiküldés előkészítése"
4. The announcement is saved and appears in the Hírfolyam for all building members

**Tip:** Use the `target_group` field to scope communications — e.g., target only residents of a specific stairwell.

#### C3 — Create a Document

The `createDocument` Server Action is available but not yet wired to a UI form. Document management currently requires direct database insertion or future admin panel (inferred: pending feature).

#### C4 — Monitor the Audit Log

1. Click "Audit napló" in the sidebar
2. The log shows chronological entries: actor name, action type, entity type, entity label, timestamp
3. Use this to trace who submitted tickets, changed statuses, or acknowledged documents

#### C5 — Review Meetings and Resolutions

1. Click "Közgyűlések" in the sidebar
2. Each meeting card shows: title, scheduled time, resolution count, agenda preview, status
3. Three buttons are available per meeting (current stubs):
   - **Meghívó** — view/send meeting invitation
   - **Szavazás** — voting interface
   - **Határozatok** — resolutions list
4. Full voting and resolution management UI is planned for a future sprint

#### C6 — Review Vendors and Work Orders

1. Scroll to the "Vendor / work order workflow" section
2. Vendor cards show: name, category, SLA hours
3. Work order list below shows: linked ticket, vendor, due date, cost estimate, status
4. Work order statuses: tervezett → kikuldve → folyamatban → lezarva

---

### Persona D: Megbízott (Authorized Delegate)

Delegates have identical permissions to building managers (`isManager = true`, `isAdminLike = true`). All tasks from Persona C apply.

---

### Persona E: Bizottsági Tag (Committee Member)

Committee members have `isAdminLike = true` but `isManager = false`.

**Access includes:**
- All read-only views (same as lako)
- View targeted communication form (can create announcements)
- View vendors and work orders
- View audit log

**Access excludes:**
- Ticket status change buttons (requires `isManager`)

All tasks from Persona A apply. For management-level views, see Persona C (read-only equivalents).

---

### Persona F: Könyvelő (Accountant)

Accountants have `isAdminLike = true` but `isManager = false`. Same access profile as bizottsag.

**Primary focus areas:**
- **Pénzügyek** — financial overview with arrears tracking
- **Albetétek** — unit registry with balances
- **Audit napló** — activity trail for financial operations

**Workflow:**
1. Click "Pénzügyek" to review the current payment status
2. Note the arrears figure in the summary; this is computed as `sum(expected_amount) - sum(paid_amount)`
3. Click "Albetétek" to identify which units have negative balances (shown in rose/red)
4. Use the audit log to trace payment-related actions

---

## Common Error Messages

| Message | Meaning | Action |
|---------|---------|--------|
| "Supabase konfiguráció hiányzik, a belépés demo módban van." | Supabase env vars not set | Contact administrator; app runs in demo mode |
| "Nem vagy bejelentkezve" | User is not authenticated | Log in via `/login` before performing this action |
| "Hiba: \<message\>" | Supabase auth error on login | Check email address, try again |
| "Címkeresés most nem elérhető." | GeoData Supabase not configured | Address search unavailable; type address manually |
| "A ticket mentése demo módban sikeres, megjelent a listában." | Ticket saved locally only | No DB write in demo mode; login and configure Supabase for persistence |
| "Óraállás rögzítve." | Meter reading submitted | Success confirmation |

---

## Tips for All Users

- **Browser navigation:** All sections are single-page anchors. Use the sidebar links or your browser's scroll. The browser Back button returns to the previous page as expected.
- **Data currency:** Dashboard data is fetched once on page load. After submitting forms, the page automatically revalidates via Next.js `revalidatePath('/')`.
- **Optimistic UI:** Ticket submissions appear instantly in the queue, even before the database write completes. If you see a ticket but then it disappears on refresh, check your Supabase connection.
- **Mobile:** On mobile devices, the sidebar is hidden. Scroll to navigate between sections. A mobile navigation solution is planned for a future sprint.
