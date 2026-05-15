# BUSINESS_SYSTEM_REFERENCE.md — PanelLakó Business System Reference

**Repository:** panellako  
**Branch:** main  
**Generated:** 2026-05-15  
**Confidence:** Medium (business rules inferred from schema and UI; legal context from Hungarian PropTech domain knowledge — not verified against specific Ptk. articles in source code)

---

## 1. Product Definition

**PanelLakó** is a multi-tenant SaaS platform for Hungarian residential condominiums (társasházak). The product digitizes the operational, financial, and communication workflows mandated by Hungarian condominium law, specifically the provisions of the Polgári Törvénykönyv (Ptk.) that govern condominium governance structures.

**Primary use case:** A single building uses the platform. One common representative (közös képviselő) manages the building; residents submit requests, read documents, and report utility readings via the app.

---

## 2. Tenant Architecture

| Entity | Role in system | DB representation |
|--------|---------------|-------------------|
| Building (társasház) | Root tenant unit | `buildings` table |
| Unit (albetét) | Sub-tenant / property record | `units` table |
| Person | User with a role | `profiles` + `memberships` tables |
| Membership | Person-to-building-to-role binding | `memberships` table |

**Multi-tenancy model:** Building-scoped. All core tables include `building_id` as a foreign key. Current RLS does not yet enforce this scope (MVP demo policies). Production deployment requires per-building RLS enforcement via `memberships`.

---

## 3. User Role Hierarchy and Legal Basis

| Role | Hungarian | Legal basis (inferred) | Authority |
|------|-----------|----------------------|-----------|
| `kozos_kepviselo` | Közös képviselő | Ptk. 5:85–5:99 — mandatory legal representative | Highest operational authority |
| `megbizott` | Megbízott | Ptk. mandate (megbízási szerződés) | Delegated manager authority |
| `bizottsag` | Bizottsági tag | Ptk. ellenőrző bizottság (supervisory committee) | Oversight and review |
| `konyvelo` | Könyvelő | Commercial service contract | Financial record access |
| `tulajdonos` | Tulajdonos | Ptk. property rights (5:73–5:84) | Owner rights in building |
| `lako` | Lakó | Tenancy agreement or ownership | Resident operational access |

**Note:** The közös képviselő is the legally mandated manager of a residential condominium under Hungarian law. This role has signing authority for contracts, legal obligations for maintenance, and is responsible for calling general assemblies (közgyűlés).

---

## 4. Business Rules

### 4.1 Ticket / Fault Report Rules

| Rule | Description | Source |
|------|-------------|--------|
| BR-T1 | Any authenticated or unauthenticated user may submit a ticket | RLS: `Public insert tickets` `with check (true)` |
| BR-T2 | Tickets start in `uj` status | Server Action: `status: 'uj'` hardcoded on insert |
| BR-T3 | Only `kozos_kepviselo` and `megbizott` may change ticket status | UI: `isManager` guard on status buttons |
| BR-T4 | Status transitions are unrestricted between states | No transition guard in current code |
| BR-T5 | `due_date` is optional | Schema: `due_date date` nullable |
| BR-T6 | Tickets are linked to a reporter via `reporter_id` (optional) | Schema: `reporter_id` nullable foreign key to profiles |

**Priority definitions (inferred SLA intent):**

| Priority | Hungarian label | Recommended response (inferred) |
|----------|----------------|--------------------------------|
| `alacsony` | Alacsony | 5–10 business days |
| `kozepes` | Közepes | 2–5 business days |
| `magas` | Magas | 24–48 hours |
| `kritikus` | Kritikus | Immediate / same-day response |

**Note:** No SLA enforcement is implemented in the current codebase. The `vendors.sla_hours` field exists for vendor-level SLAs.

---

### 4.2 Meter Reading Rules

| Rule | Description | Source |
|------|-------------|--------|
| BR-M1 | Meter readings are associated with a unit via `unit_label` | Schema/action |
| BR-M2 | Three meter types are supported: víz, gáz, villany | Enum check in schema |
| BR-M3 | `reading_date` is required | Required form field |
| BR-M4 | Decimal values allowed (step 0.01) | Form: `type="number" step="0.01"` |
| BR-M5 | `reported_by` links to authenticated user (nullable) | Server Action |

**Regulatory context (inferred):** Hungarian utility regulations (e.g., 2013. évi CLXXXVIII. törvény on district heating, local water utility bylaws) require periodic meter readings. Digital submission replaces paper-based reporting.

---

### 4.3 Document / Read Receipt Rules

| Rule | Description | Source |
|------|-------------|--------|
| BR-D1 | Documents have a visibility field: default `'Mindenki'` | Schema default |
| BR-D2 | Acknowledgement is per-user per-document | `document_acknowledgements` unique on (document_id, profile_id) |
| BR-D3 | Acknowledgement is idempotent — re-acknowledging is a no-op | `upsert` with `onConflict` |
| BR-D4 | Acknowledgement requires authenticated user | Server Action: getUser() check |
| BR-D5 | Unacknowledged docs show in the task panel count | Computed from `!document.acknowledged_at` |

**Legal context (inferred):** Hungarian condominium law requires residents to be notified of and acknowledge certain documents (meeting invitations, house rules, financial reports). The read-receipt system provides a digital audit trail.

---

### 4.4 Financial Rules

| Rule | Description | Source |
|------|-------------|--------|
| BR-F1 | Arrears = max(expected - paid, 0) | Client-side computation |
| BR-F2 | Finance entries are per-unit, per-period | Schema: `unit_id`, `period` columns |
| BR-F3 | `due_date` is required | Schema: `due_date date not null` |
| BR-F4 | No payment recording UI implemented | Read-only view in current source |

**Common cost (közös költség) context (inferred):** Hungarian condominiums collect monthly common costs (közös költség) from all owners. The `finance_entries` table tracks the expected vs. paid amounts per period (typically month). Arrears (hátralék) are debts owed to the building fund.

---

### 4.5 Assembly / Voting Rules

| Rule | Description | Source |
|------|-------------|--------|
| BR-A1 | Vote values: `igen` (yes), `nem` (no), `tartozkodas` (abstain) | Schema enum check |
| BR-A2 | Vote weight exists (ownership-share-weighted voting) | Schema: `votes.weight numeric(10,2)` |
| BR-A3 | Meetings have statuses: `tervezett` (planned), `lezart` (closed) | Schema enum check |
| BR-A4 | Resolution outcome field exists: default `'tervezett'` | Schema |
| BR-A5 | Voting UI is not yet implemented (schema-only) | UI: buttons are stubs |

**Legal context (inferred):** Under Ptk. 5:85§, a condominium general assembly (közgyűlés) must be called at least once per year. Resolutions require a qualified majority (typically 51% of ownership shares). The schema supports weighted voting by ownership share.

---

### 4.6 Vendor / Work Order Rules

| Rule | Description | Source |
|------|-------------|--------|
| BR-V1 | Vendors have a building scope | Schema: `vendors.building_id` |
| BR-V2 | SLA hours are a vendor attribute | Schema: `vendors.sla_hours integer` |
| BR-V3 | Work orders link to a ticket | Schema: `work_orders.ticket_id` (nullable) |
| BR-V4 | Work order statuses: tervezett → kikuldve → folyamatban → lezarva | Schema enum check |
| BR-V5 | Cost estimate is stored per work order | Schema: `cost_estimate numeric(12,2)` |
| BR-V6 | Work order management UI is read-only | No mutation forms in current source |

---

### 4.7 Audit Log Rules

| Rule | Description | Source |
|------|-------------|--------|
| BR-AU1 | Audit log is append-only (no UPDATE/DELETE policies defined) | Schema: only insert policy |
| BR-AU2 | Actor name defaults to 'Rendszer' | Schema: `actor_name default 'Rendszer'` |
| BR-AU3 | `entity_id` is a UUID linking to the affected record | Schema |
| BR-AU4 | All system actions should write audit entries | Inferred — no automated trigger in schema yet |

**Note:** Currently no database triggers populate `audit_logs` automatically. Entries must be written explicitly by Server Actions or application code. This is a pending production hardening task.

---

## 5. Data Retention (Inferred)

No explicit data retention policy is defined in the current source code. The following are inferred from domain practice:

| Data type | Recommended retention | Regulatory basis (inferred) |
|-----------|----------------------|----------------------------|
| Audit logs | Minimum 5 years | General GDPR + Hungarian accounting law |
| Financial records | Minimum 8 years | 2000. évi C. törvény (Számviteli tv.) |
| Meter readings | Minimum 5 years | Utility regulation |
| Meeting minutes / resolutions | Indefinite | Ptk. condominium requirements |
| Tickets | 2–5 years | Internal policy |

---

## 6. Notification and Communication Rules

| Rule | Description | Source |
|------|-------------|--------|
| BR-N1 | Notification channels: `app` or `email` | Schema enum check |
| BR-N2 | Email delivery uses Resend | `package.json`: `resend ^6.12.3` |
| BR-N3 | Email integration is not yet wired | No `lib/email.ts` found in source |
| BR-N4 | Announcements have a `target_group` field | Schema and Server Action |
| BR-N5 | `read_at` timestamp marks notification as read | Schema: `read_at timestamptz` |

---

## 7. GeoData / Address Search

**Purpose:** Supports address validation and building registration. Used in the profile form to assist residents in confirming their building's address.

**Data source:** OSM (OpenStreetMap) addresses in a separate Supabase project (Hungarian geographic data).

**Legal context:** Property address verification supports accurate unit registration, which underpins ownership share calculation and voting weight.

---

## 8. GDPR and Privacy Considerations (Inferred)

| Data category | Storage location | Access scope |
|---------------|-----------------|--------------|
| Email addresses | `profiles.email` | Open read (MVP — must be restricted) |
| Full names | `profiles.full_name` | Open read (MVP — must be restricted) |
| Financial balances | `units.balance_amount` | Open read (MVP — must be restricted) |
| Meter readings | `meter_readings` | Open read (MVP) |
| Vote records | `votes` | Open read (MVP) |

**GDPR note:** Current open-read RLS policies mean all authenticated users can read all data including PII. This is explicitly flagged in the schema as "demo policies" for MVP. Production deployment requires user-scoped and building-scoped data access.

---

## 9. Multi-building Roadmap (Inferred)

The schema is designed for multi-building operation:
- All tables include `building_id`
- `memberships` table allows a user to belong to multiple buildings with different roles
- Building picker / workspace selector is referenced in the header ("Ház kiválasztása") but not yet implemented as a route

Current MVP state: Single-building demo mode. `building_id` is not passed from Server Actions (passed as `undefined`).
