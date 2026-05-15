# Role & Permission Matrix — PanelLakó

**Generated:** 2026-05-15  
**Repository:** HenrikFaul/panellako  
**Evidence basis:** `lib/types.ts`, `supabase/schema.sql`, `components/dashboard-client.tsx`  
**Confidence:** High (inferred from `isManager`, `isAdminLike` guards in source)

---

## Role Definitions

| Role key | Hungarian label | Primary user |
|---|---|---|
| `lako` | Lakó | Resident / tenant living in the building |
| `tulajdonos` | Tulajdonos | Apartment owner (may not reside) |
| `kozos_kepviselo` | Közös képviselő | Building manager — legal representative |
| `megbizott` | Megbízott | Authorized delegate (acts for the manager) |
| `bizottsag` | Bizottsági tag | Committee member (oversight role) |
| `konyvelo` | Könyvelő | Accountant (financial access) |

**Role groups in code:**
- `isManager` = `kozos_kepviselo | megbizott`
- `isAdminLike` = `kozos_kepviselo | megbizott | bizottsag | konyvelo`

---

## Feature Permission Matrix

| Feature | lako | tulajdonos | kozos_kepviselo | megbizott | bizottsag | konyvelo |
|---|---|---|---|---|---|---|
| **View dashboard** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Submit ticket** (hibabejelentés) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Update ticket status** | — | — | ✓ | ✓ | — | — |
| **Submit meter reading** | ✓ | ✓ | ✓ | ✓ | — | — |
| **View news/announcements** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Create announcement** | — | — | ✓ | ✓ | — | — |
| **View documents** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Acknowledge document** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Upload document** | — | — | ✓ | ✓ | — | — |
| **View finances** | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| **View units (albetétek)** | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| **View assembly/voting** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Create meeting agenda** | — | — | ✓ | ✓ | — | — |
| **View vendors** | — | — | ✓ | ✓ | ✓ | ✓ |
| **Create work order** | — | — | ✓ | ✓ | — | — |
| **View knowledge base** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **View audit log** | — | — | ✓ | ✓ | ✓ | ✓ |
| **Send targeted notification** | — | — | ✓ | ✓ | — | — |

*Limited: lako sees own unit/finances data only (RLS scope — partially enforced)

---

## RLS Policy Status

From `supabase/schema.sql`: RLS is enabled on tables with demo policies. Production-hardened policies (scoping by auth.uid() and building membership) are defined as demo-level policies — full per-user scoping is a **pending production hardening task**.

| Table | RLS Enabled | Policy Status |
|---|---|---|
| profiles | ✓ | Demo — authenticated read |
| buildings | ✓ | Demo — authenticated read |
| units | ✓ | Demo — authenticated read |
| memberships | ✓ | Demo — authenticated read |
| tickets | ✓ | Demo — authenticated CRUD |
| announcements | ✓ | Demo — authenticated CRUD |
| notifications | ✓ | Demo — authenticated CRUD |
| documents | ✓ | Demo — authenticated CRUD |
| document_acknowledgements | ✓ | Demo — authenticated upsert |
| meetings | ✓ | Demo — authenticated read |
| vendors | ✓ | Demo — authenticated read |
| work_orders | ✓ | Demo — authenticated read |
| audit_logs | ✓ | Demo — authenticated read |

> ⚠ **Production action required:** RLS policies must be tightened to scope data by `building_id` via `memberships` join before pilot launch with real data.
