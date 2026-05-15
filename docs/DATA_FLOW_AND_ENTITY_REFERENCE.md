# Data Flow & Entity Reference — PanelLakó

**Generated:** 2026-05-15  
**Repository:** HenrikFaul/panellako  
**Source:** `supabase/schema.sql` (310 LOC), `lib/types.ts`, `lib/data.ts`  
**Confidence:** High

---

## Entity Relationship Overview

```mermaid
erDiagram
    profiles {
        uuid id PK
        text full_name
        text email
        text role
    }
    buildings {
        uuid id PK
        text name
        text address
    }
    units {
        uuid id PK
        uuid building_id FK
        text unit_label
        text owner_name
        numeric area_m2
        numeric ownership_share
        numeric balance_amount
        boolean has_water_meter
    }
    memberships {
        uuid id PK
        uuid profile_id FK
        uuid building_id FK
        uuid unit_id FK
        text role
        boolean active
    }
    tickets {
        uuid id PK
        uuid building_id FK
        uuid unit_id FK
        uuid reporter_id FK
        text title
        text status
        text priority
        date due_date
    }
    meter_readings {
        uuid id PK
        uuid unit_id FK
        text meter_type
        numeric value
        date reading_date
    }
    documents {
        uuid id PK
        uuid building_id FK
        text title
        text file_url
        text category
    }
    document_acknowledgements {
        uuid id PK
        uuid document_id FK
        uuid profile_id FK
        timestamptz acknowledged_at
    }
    meetings {
        uuid id PK
        uuid building_id FK
        timestamptz scheduled_at
        text status
    }
    votes {
        uuid id PK
        uuid meeting_id FK
        uuid profile_id FK
        text vote
    }
    vendors {
        uuid id PK
        text name
        text service_type
        text contact
    }
    work_orders {
        uuid id PK
        uuid building_id FK
        uuid vendor_id FK
        text status
        text description
    }
    audit_logs {
        uuid id PK
        uuid building_id FK
        uuid actor_id FK
        text event_type
        jsonb payload
    }

    profiles ||--o{ memberships : "has"
    buildings ||--o{ memberships : "belongs to"
    buildings ||--o{ units : "contains"
    units ||--o{ memberships : "assigned to"
    buildings ||--o{ tickets : "reports"
    units ||--o{ tickets : "from"
    buildings ||--o{ meter_readings : "from"
    units ||--o{ meter_readings : "from"
    buildings ||--o{ documents : "owns"
    documents ||--o{ document_acknowledgements : "acknowledged by"
    profiles ||--o{ document_acknowledgements : "acknowledges"
    buildings ||--o{ meetings : "holds"
    meetings ||--o{ votes : "collects"
    profiles ||--o{ votes : "casts"
    buildings ||--o{ work_orders : "generates"
    vendors ||--o{ work_orders : "assigned to"
    buildings ||--o{ audit_logs : "logged for"
    profiles ||--o{ audit_logs : "actor"
```

---

## All 19 Tables

| Table | Primary Key | Key Foreign Keys | Purpose | RLS |
|---|---|---|---|---|
| `profiles` | uuid | auth.users(id) | User identity + role | ✓ |
| `buildings` | uuid | — | Building master data | ✓ |
| `units` | uuid | building_id | Apartment registry | ✓ |
| `memberships` | uuid | profile_id, building_id, unit_id | User-building-role link | ✓ |
| `announcements` | uuid | building_id, created_by | News / posts | ✓ |
| `notifications` | uuid | building_id, created_by | Push / email alerts | ✓ |
| `tickets` | uuid | building_id, unit_id, reporter_id | Fault reports | ✓ |
| `meter_readings` | uuid | unit_id, building_id | Utility submissions | ✓ |
| `documents` | uuid | building_id, uploaded_by | Document library | ✓ |
| `document_acknowledgements` | uuid | document_id, profile_id | Read-receipts (upsert) | ✓ |
| `financials` | uuid | building_id, unit_id | Balance ledger | ✓ |
| `meetings` | uuid | building_id | Assembly events | ✓ |
| `agenda_items` | uuid | meeting_id | Meeting agenda | ✓ |
| `resolutions` | uuid | meeting_id | Passed resolutions | ✓ |
| `votes` | uuid | meeting_id, profile_id | Per-user votes | ✓ |
| `vendors` | uuid | — | Vendor master data | ✓ |
| `work_orders` | uuid | building_id, vendor_id | Maintenance orders | ✓ |
| `knowledge_base_articles` | uuid | building_id | Help articles | ✓ |
| `audit_logs` | uuid | building_id, actor_id | Event log | ✓ |

---

## Data Fetching — getDashboardData()

All data is fetched server-side in `lib/data.ts` using `createClient()` from `@supabase/ssr`.

| Data | Table | Limit | Order |
|---|---|---|---|
| news | announcements | 5 | created_at DESC |
| notifications | notifications | 8 | created_at DESC |
| tickets | tickets | 12 | created_at DESC |
| meterReadings | meter_readings | 8 | reading_date DESC |
| documents | documents | 10 | uploaded_at DESC |
| finances | finance_entries | 8 | due_date DESC |
| meetings | meetings | 6 | scheduled_at DESC |
| units | units | 12 | — |
| vendors | vendors | 8 | — |
| workOrders | work_orders | 8 | due_date ASC |
| kbArticles | knowledge_base_articles | 8 | — |
| auditLogs | audit_logs | 10 | created_at DESC |

**Note:** Data is currently fetched without `building_id` filter — all records for the authenticated user's buildings. Multi-building scoping is a pending task.
