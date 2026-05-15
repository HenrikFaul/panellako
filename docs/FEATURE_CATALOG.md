# FEATURE_CATALOG.md — PanelLakó Feature Catalogue

**Repository:** panellako  
**Branch:** main  
**Generated:** 2026-05-15  
**Confidence:** High (verified from `dashboard-client.tsx`, `lib/types.ts`, `app/actions/`, `supabase/schema.sql`)

---

## Feature Overview

| # | Feature | Nav Label | Anchor | Status | Confidence |
|---|---------|-----------|--------|--------|------------|
| 1 | Role-based Authentication | — | `/login` | Implemented | High |
| 2 | Fault Ticket Management | Bejelentések | `#tickets` | Implemented | High |
| 3 | Meter Reading Submission | Mérőórák | `#meters` | Implemented | High |
| 4 | News / Announcements | Hírfolyam | (inline) | Implemented | High |
| 5 | Document Library + Read Receipts | Dokumentumok | `#documents` | Implemented | High |
| 6 | Financial Overview | Pénzügyek | `#finances` | Implemented | High |
| 7 | Unit Registry | Albetétek | `#units` | Implemented | High |
| 8 | Assembly & Voting Preparation | Közgyűlések | `#meetings` | Implemented (view only) | High |
| 9 | Vendor / Work Order Workflow | (inline) | (inline) | Implemented (view only) | High |
| 10 | Knowledge Base | Tudásbázis | `#knowledge` | Implemented | High |
| 11 | Audit Log | Audit napló | `#audit` | Implemented (read-only) | High |

---

## Feature Detail

### Feature 1 — Role-based Authentication

**Route:** `/login`  
**Source:** `app/login/page.tsx`, `middleware.ts`, `lib/supabase/`

**Description:** Magic-link (OTP) email authentication via Supabase Auth. Users receive a one-time link by email and are redirected to the app root (`/`). Session management uses `@supabase/ssr` with cookie-based token storage. Middleware refreshes sessions on every request using `getUser()`.

**Roles supported:** All six roles. Role is stored in `profiles.role` and can be simulated via `?role=<role>` URL parameter (MVP convenience feature).

**Key behaviours:**
- Passwordless — no password stored or transmitted
- Login page degrades gracefully when Supabase env vars are absent (demo mode)
- Redirect URL is set to `window.location.origin + '/'`
- Auth state is reflected in the header (`Session aktív` / `Belépés` button)

**Server Actions:** None (auth uses Supabase Auth directly)

---

### Feature 2 — Fault Ticket Management (Hibabejelentés)

**Anchor:** `#tickets`  
**Source:** `components/dashboard-client.tsx` (lines 562–615), `app/actions/tickets.ts`, `supabase/schema.sql` (tickets table)

**Description:** Residents and owners can submit fault reports. Managers can update ticket status. Tickets have a 4-state lifecycle: `uj` → `folyamatban` → `varakozik` → `lezarva`.

**Form fields:**
- Title (required)
- Description (required, placeholder notes future file attachment via Storage)
- Location — freetext (required)
- Priority: `alacsony` / `kozepes` / `magas` / `kritikus`

**Ticket queue features:**
- Filter by status (Összes / Új / Folyamatban / Várakozik / Lezárva)
- Optimistic UI update on submission and status change
- Status change buttons visible only to `isManager` roles (`kozos_kepviselo`, `megbizott`)

**Server Actions:**
- `createTicket(input)` — inserts into `tickets`, links `reporter_id` to authenticated user
- `updateTicketStatus(ticketId, status)` — requires authenticated user; updates `status` and `updated_at`

**DB table:** `tickets` (19 columns including `building_id`, `unit_id`, `reporter_id`, `status`, `priority`, `location`, `submitted_by`, `unit_label`, `due_date`, `updated_at`)

**Priority levels:**

| Value | Label | UI colour |
|-------|-------|-----------|
| `alacsony` | Alacsony | Slate |
| `kozepes` | Közepes | Cyan |
| `magas` | Magas | Amber |
| `kritikus` | Kritikus | Rose |

**Status values:**

| Value | Label | UI colour |
|-------|-------|-----------|
| `uj` | Új | Sky |
| `folyamatban` | Folyamatban | Amber |
| `varakozik` | Várakozik | Violet |
| `lezarva` | Lezárva | Emerald |

---

### Feature 3 — Meter Reading Submission (Mérőóra)

**Anchor:** `#meters`  
**Source:** `components/dashboard-client.tsx` (lines 696–718), `app/actions/meter-readings.ts`, `supabase/schema.sql` (meter_readings table)

**Description:** Residents submit utility meter readings. Three meter types supported: water (`viz`), gas (`gaz`), electricity (`villany`).

**Form fields:**
- Meter type: `viz` / `gaz` / `villany` (select)
- Value (number, step 0.01, required)
- Reading date (date picker, required)
- Unit label (taken from profile `unit` state)

**Server Action:** `submitMeterReading(input)` — inserts into `meter_readings`, links `reported_by` to authenticated user

**DB table:** `meter_readings` (id, building_id, unit_id, reported_by, meter_type, value, reading_date, unit_label, reported_by_name, created_at)

**History display:** Last 8 readings shown below form, ordered by `reading_date DESC`.

---

### Feature 4 — News / Announcements (Hírfolyam)

**Anchor:** Inline section (no dedicated anchor in nav)  
**Source:** `components/dashboard-client.tsx` (lines 769–785), `app/actions/announcements.ts`, `lib/types.ts` (NewsItem, NewsCategory)

**Description:** Building-scoped news feed with category labels. Announcements can be created by admin-like roles; all roles can read. Each news item supports expand/collapse.

**Categories:**

| Value | Label |
|-------|-------|
| `tarsashazi_kozlony` | Társasházi közlöny |
| `keruleti_hir` | Kerületi hír |
| `uzemeltetes` | Üzemeltetés |
| `biztonsag` | Biztonság |
| `egyeb` | Egyéb |

**Targeted communication form** (`#` section, visible to `isAdminLike` roles):
- Title, audience (target group), message body
- Server Action: `createAnnouncement(input)` — requires authenticated user; inserts into `announcements`

**DB table:** `announcements` (id, building_id, created_by, title, content, target_group, category, source_label, created_at)

---

### Feature 5 — Document Library + Read Receipts (Dokumentumtár)

**Anchor:** `#documents`  
**Source:** `components/dashboard-client.tsx` (lines 652–679), `app/actions/documents.ts`, `supabase/schema.sql` (documents, document_acknowledgements tables)

**Description:** Document repository with category filtering. Each document has a read-receipt (acknowledgement) mechanism. Unacknowledged documents show an amber warning icon; acknowledged documents show a green check.

**Document card shows:**
- Title, category, version, upload date, visibility
- Status icon: acknowledged (CheckCircle2, emerald) or unacknowledged (AlertTriangle, amber)
- "Megnyitás" button (opens file URL — currently demo mode)
- "Elolvasva" button (triggers acknowledgement Server Action)

**Category filter:** Derived dynamically from the actual document categories in the database. Default: "összes".

**Server Actions:**
- `acknowledgeDocument(documentId)` — upserts into `document_acknowledgements` (document_id, profile_id, acknowledged_at); idempotent via `onConflict`
- `createDocument(input)` — inserts into `documents`; requires authenticated user

**DB tables:**
- `documents` (id, building_id, title, category, version, file_url, visibility, acknowledged_at, uploaded_at)
- `document_acknowledgements` (id, document_id, profile_id, viewed_at) — unique on (document_id, profile_id)

---

### Feature 6 — Financial Overview (Pénzügyi átláthatóság)

**Anchor:** `#finances`  
**Source:** `components/dashboard-client.tsx` (lines 681–694), `supabase/schema.sql` (finance_entries table)

**Description:** Per-period payment tracking showing expected amount, paid amount, due date, and computed arrears. Progress bar visualises payment rate.

**Summary metrics (computed client-side):**
- `totalDue` — sum of `expected_amount`
- `totalPaid` — sum of `paid_amount`
- `arrears` = `max(totalDue - totalPaid, 0)`

**Progress bar:** `(totalPaid / totalDue) * 100%`, capped at 100%, rendered with Tailwind gradient.

**DB table:** `finance_entries` (id, unit_id, period, expected_amount, paid_amount, due_date, created_at)

**Mutations:** None implemented in current source (read-only view). Future: payment recording Server Action.

---

### Feature 7 — Unit Registry (Albetétek)

**Anchor:** `#units`  
**Source:** `components/dashboard-client.tsx` (lines 618–650), `supabase/schema.sql` (units table)

**Description:** Tabular master data of all units in the building. Supports live text search across unit label, owner name, and unit type.

**Table columns:** Cím (label), Tulajdonos, Típus, m², Tulajdoni hányad, Egyenleg, Vízóra

**Unit types:** `Lakas` / `Tarolo` / `Garazs` / `Uzlethelyiseg` (open string, extensible)

**Search:** Client-side filter on `unit_label + owner_name + unit_type`, case-insensitive, normalized

**Aggregate summary:** Total area (m²) and total ownership share shown above table

**Balance display:** Negative balances shown in rose, non-negative in emerald

**DB table:** `units` (id, building_id, unit_label, floor, owner_name, unit_type, area_m2, ownership_share, balance_amount, has_water_meter, created_at)

---

### Feature 8 — Assembly & Voting Preparation (Közgyűlés)

**Anchor:** `#meetings`  
**Source:** `components/dashboard-client.tsx` (lines 722–741), `supabase/schema.sql` (meetings, agenda_items, resolutions, votes tables)

**Description:** Meeting list with status badge, agenda preview, resolution count. Three action buttons per meeting: Meghívó, Szavazás, Határozatok. Currently these buttons are UI stubs with no connected logic.

**Meeting statuses:**
- `tervezett` — planned (Sky badge)
- `lezart` — closed (Emerald badge)

**DB tables:**
- `meetings` (id, building_id, title, scheduled_at, status, resolution_count, agenda_preview, created_at)
- `agenda_items` (id, meeting_id, order_no, title, description, created_at)
- `resolutions` (id, meeting_id, agenda_item_id, text, outcome, effective_date, created_at)
- `votes` (id, resolution_id, voter_profile_id, unit_id, vote_value [`igen`/`nem`/`tartozkodas`], weight, created_at)

**Note:** Voting and agenda editing are schema-ready but not yet implemented in the UI.

---

### Feature 9 — Vendor / Work Order Workflow

**Anchor:** Inline section (no dedicated nav item)  
**Source:** `components/dashboard-client.tsx` (lines 744–765), `supabase/schema.sql` (vendors, work_orders tables)

**Description:** Vendor card grid showing name, category, and SLA hours. Work order list below showing ticket title, vendor, due date, cost estimate, and status badge.

**Work order statuses:**
- `tervezett` — planned
- `kikuldve` — dispatched
- `folyamatban` — in progress
- `lezarva` — closed

**DB tables:**
- `vendors` (id, building_id, name, category, contact, sla_hours, created_at)
- `work_orders` (id, ticket_id, vendor_id, ticket_title, vendor_name, status, due_date, cost_estimate, created_at)

**Mutations:** None in current UI (read-only view). Work orders are linked to tickets via `ticket_id`.

---

### Feature 10 — Knowledge Base (Tudásbázis)

**Anchor:** `#knowledge`  
**Source:** `components/dashboard-client.tsx` (lines 793–804), `supabase/schema.sql` (knowledge_base_articles table)

**Description:** FAQ / "who to contact" article library. Each article has a topic badge, title, body text, and target audience.

**DB table:** `knowledge_base_articles` (id, building_id, title, topic, body, audience, created_at)

**Default audience:** `'Minden lakó'`

**Mutations:** Read-only in current UI.

---

### Feature 11 — Audit Log (Audit napló)

**Anchor:** `#audit`  
**Source:** `components/dashboard-client.tsx` (lines 835–847), `supabase/schema.sql` (audit_logs table)

**Description:** Chronological log of system and user actions. Each entry shows actor name, action type, entity type, entity label, and timestamp.

**DB table:** `audit_logs` (id, actor_id, actor_name, action_type, entity_type, entity_id, entity_label, created_at)

**Default actor name:** `'Rendszer'` (system)

**Mutations:** Insert-only (audit trail is append-only). RLS policy: `Public insert audit_logs` with `check (true)`.

---

## Dashboard Overview Metrics (Áttekintő)

Displayed as four gradient MetricCard components at the top of the main content:

| Metric | Source | Colour |
|--------|--------|--------|
| Nyitott ügyek | `tickets.filter(t => t.status !== 'lezarva').length` | Brand (teal) |
| Hátralék | `sum(expected) - sum(paid)` from finance_entries | Amber |
| Olvasatlan értesítés | `notifications.filter(n => !n.read_at).length` | Violet |
| Albetétek | `units.length` with total m² and ownership share | Slate |

---

## Task Panel (Teendők)

Three computed task cards visible to all roles:
1. "Új hibabejelentések triage" — count of `uj` status tickets
2. "Lejárt közös költség ellenőrzés" — formatted arrears amount
3. "Közgyűlési dokumentumok olvasottsága" — count of unacknowledged documents

Quick action links: Ticket queue → Dokumentumtár → Közgyűlés

---

## Profile & Address Search

Inline form for name and unit number. Includes AWS-backed address autocomplete via `/api/location/autocomplete` with 350ms debounce. Profile changes are local state only in current implementation (demo save message).
