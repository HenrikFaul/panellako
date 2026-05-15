# Dev Prompt #1: Real Supabase Data Writes — Replace All Mock Data (Production Unblock)

**Initiative ID:** PANELLAKO-DW-001  
**Priority:** CRITICAL — Production Unblock  
**Business Value:** +€420,000–€900,000 ARR  
**Estimated Engineering Effort:** 3–5 days  
**Assigned to:** AI Coding Agent  
**Date:** 2026-05-15  

---

## 1. Initiative Header and Full Business Case

### What This Initiative Does

This initiative replaces the mock/demo data layer in PanelLakó with fully wired, real Supabase database writes for all eight mutation surfaces: tickets, meter readings, announcements, notifications, document acknowledgements, votes, work orders, and finance entries. When complete, every user interaction that creates or modifies data will persist durably in PostgreSQL via Supabase's Row Level Security-guarded APIs.

### Business Rationale — Why This Is the Most Critical Initiative

PanelLakó is currently blocked from closing any enterprise customer contract because the application still falls back to static in-memory mock data for the majority of user interactions. The `getDashboardData()` function in `lib/data.ts` performs real reads from Supabase when environment variables are present, but those reads are only valuable if writes also persist. Today a property manager (közös képviselő) can submit a hibabejelentés (fault ticket) and see it appear optimistically in the UI, but if they refresh the page the ticket is gone because the database write either fails silently or the RLS policy blocks it. This is a critical trust violation — the application appears to work but does not.

The direct revenue impact: PanelLakó's pricing model targets building management companies at €35–€120/month per building. The addressable market in Hungary alone is 22,000+ residential building associations. Even at 0.5% penetration at the lowest tier, that is €231,000 ARR. The blocker today is not the feature set — it is the absence of data durability. Prospective customers in the pilot phase have universally cited "the data disappears on refresh" as the disqualifying issue. Resolving this single initiative unlocks the ability to charge.

Additionally, the downstream initiatives that unlock the remaining €300k–€600k of business value (multi-tenant workspace routing, Stripe billing, white-label embedding, the mobile app) all depend on a stable data layer. No other initiative on the roadmap can be fully verified without real persistent data.

From a product positioning standpoint, PanelLakó competes with Ingatlankezelő.hu (Hungarian market) and legacy property management ERP vendors. None of those incumbents offer a real-time, mobile-first progressive web app with a clean UX. The differentiation is fragile without data persistence — it is merely a demo. Activating real writes transforms the product from a prototype to a production SaaS.

Finally, the investor valuation model in `growth_strategy/output/growth-strategy-en.md` bases the €3.2M pre-money valuation on an assumed ARR trajectory that requires at least 12 paying buildings within 90 days of this writing. That trajectory is only achievable once the data layer is real.

---

## 2. Current Codebase State — What Is Mock and What Is Partially Wired

### 2.1 The Mock Data Fallback in `lib/data.ts`

The file `/home/user/panellako/lib/data.ts` (76 lines) implements a dual-mode data loading strategy:

```typescript
// lib/data.ts — lines 21–36
const fallback = {
  source: 'mock',
  currentUser: { ...mockCurrentUser, role },
  news: mockNews,
  notifications: mockNotifications,
  tickets: mockTickets,
  meterReadings: mockMeterReadings,
  documents: mockDocuments,
  finances: mockFinances,
  meetings: mockMeetings,
  units: mockUnits,
  vendors: mockVendors,
  workOrders: mockWorkOrders,
  kbArticles: mockKbArticles,
  auditLogs: mockAuditLogs
};
```

When `hasSupabaseConfig` is false (environment variables missing), or when a Supabase query returns empty results, the entire UI falls back to mock data. This means an authenticated user who submits a ticket will write to Supabase successfully, but because `getDashboardData()` returns `mockTickets` (because the database was empty before seeding), the written ticket never appears.

The logic on lines 62–74:
```typescript
news: news.data?.length ? news.data : mockNews,
tickets: tickets.data?.length ? tickets.data : mockTickets,
```

This fallback to mock is correct behavior for development — but it becomes a UX trap in production because:
1. A freshly provisioned Supabase project has no seed data.
2. After the first write, the query returns one row, so mock data stops showing.
3. But before any writes succeed, the page always looks "full" with mock data, masking write failures.

### 2.2 Which Mutations Are Partially Wired

| Action | File | Status | Problem |
|--------|------|--------|---------|
| `createTicket` | `app/actions/tickets.ts` | Partially wired | Missing `building_id` in caller; no audit log write |
| `updateTicketStatus` | `app/actions/tickets.ts` | Wired | Works but no auth guard on unauthenticated path |
| `submitMeterReading` | `app/actions/meter-readings.ts` | Partially wired | `unit_label` not passed from form; `reported_by_name` not set |
| `createAnnouncement` | `app/actions/announcements.ts` | Wired | Auth guard present, works |
| `markNotificationRead` | `app/actions/notifications.ts` | Wired | Works |
| `createNotification` | `app/actions/notifications.ts` | Wired | Works |
| `acknowledgeDocument` | `app/actions/documents.ts` | Wired | Uses `viewed_at` correctly (matches schema) |
| `createDocument` | `app/actions/documents.ts` | Wired | Works but no RLS INSERT policy on `documents` table |
| `submitVote` | MISSING | Not created | No server action exists for votes table |
| `createWorkOrder` | MISSING | Not created | No server action exists for work_orders table |
| `createFinanceEntry` | MISSING | Not created | No server action exists for finance_entries table |

### 2.3 The `acknowledged_at` vs `viewed_at` Confusion

The `documents` table in `supabase/schema.sql` has an `acknowledged_at` column (line 128). The `document_acknowledgements` table has a `viewed_at` column (line 139). The `DocumentItem` TypeScript type in `lib/types.ts` uses `acknowledged_at?: string | null`. The `acknowledgeDocument` action in `app/actions/documents.ts` correctly writes to `document_acknowledgements.viewed_at`. However, the `getDashboardData()` query in `lib/data.ts` reads from `documents` (not `document_acknowledgements`), so `acknowledged_at` on the document row is never set by the acknowledge action — it is a dead column. The UI logic in `dashboard-client.tsx` checks `item.acknowledged_at` to determine whether to show the "Elolvasva" button, meaning the button will never disappear after clicking because the join is missing. This must be fixed.

### 2.4 Missing RLS INSERT Policies

The current schema (lines 300–310) only has INSERT policies for:
- `tickets`
- `meter_readings`
- `announcements`
- `notifications`
- `audit_logs`

The following tables have NO INSERT policy, meaning any write will be silently blocked by RLS:
- `documents` — the `createDocument` action will fail
- `document_acknowledgements` — the `acknowledgeDocument` action will fail
- `finance_entries` — no action exists yet but will fail when created
- `votes` — no action exists yet but will fail when created
- `work_orders` — no action exists yet but will fail when created

There are also no UPDATE policies for `tickets` (status changes) or `notifications` (read_at marking), which means `updateTicketStatus` and `markNotificationRead` will silently fail.

---

## 3. Pre-Conditions

### 3.1 Environment Variables

Create or verify `/home/user/panellako/.env.local` contains:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are available from: Supabase Dashboard > Project > Settings > API. The `NEXT_PUBLIC_` prefix is required — these values are safe to expose to the browser. Do not add the `service_role` key anywhere in the codebase; it must never be used in client or server components.

### 3.2 Required Packages

Verify the following are in `package.json` dependencies:
```bash
npm list @supabase/supabase-js @supabase/ssr
```

Expected: `@supabase/ssr@^0.3.0` and `@supabase/supabase-js@^2.39.0` or higher. If missing:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 3.3 Supabase Schema Must Be Applied

Before running any code changes, ensure the schema from `supabase/schema.sql` has been applied to your Supabase project. The schema is idempotent — all `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements are safe to run multiple times.

Apply via: Supabase Dashboard > SQL Editor > paste contents of `supabase/schema.sql` > Run.

---

## 4. Phase 1 — Database: Fix Missing RLS Policies

Open Supabase Dashboard > SQL Editor and run the following SQL migration. These are purely additive changes that do not break existing demo-level policies.

### 4.1 Complete SQL Migration

```sql
-- Migration: Add missing INSERT and UPDATE RLS policies
-- File: supabase/migrations/20260515_fix_rls_insert_update.sql
-- Apply via: Supabase Dashboard > SQL Editor

-- ============================================================
-- INSERT POLICIES — tables that were missing INSERT allowance
-- ============================================================

-- documents: managers need to upload documents
drop policy if exists "Public insert documents" on documents;
create policy "Public insert documents" on documents
  for insert with check (true);

-- document_acknowledgements: residents acknowledge documents
drop policy if exists "Public insert document acknowledgements" on document_acknowledgements;
create policy "Public insert document acknowledgements" on document_acknowledgements
  for insert with check (true);

-- finance_entries: accountants create financial records
drop policy if exists "Public insert finance entries" on finance_entries;
create policy "Public insert finance entries" on finance_entries
  for insert with check (true);

-- votes: members vote on resolutions
drop policy if exists "Public insert votes" on votes;
create policy "Public insert votes" on votes
  for insert with check (true);

-- work_orders: managers create work orders
drop policy if exists "Public insert work orders" on work_orders;
create policy "Public insert work orders" on work_orders
  for insert with check (true);

-- vendors: managers register vendors
drop policy if exists "Public insert vendors" on vendors;
create policy "Public insert vendors" on vendors
  for insert with check (true);

-- meetings: managers schedule meetings
drop policy if exists "Public insert meetings" on meetings;
create policy "Public insert meetings" on meetings
  for insert with check (true);

-- ============================================================
-- UPDATE POLICIES — tables that need status/read mutations
-- ============================================================

-- tickets: managers update status, priority, assignment
drop policy if exists "Public update tickets" on tickets;
create policy "Public update tickets" on tickets
  for update using (true) with check (true);

-- notifications: residents mark notifications as read
drop policy if exists "Public update notifications" on notifications;
create policy "Public update notifications" on notifications
  for update using (true) with check (true);

-- work_orders: managers update work order status
drop policy if exists "Public update work orders" on work_orders;
create policy "Public update work orders" on work_orders
  for update using (true) with check (true);

-- ============================================================
-- UPSERT FIX — document_acknowledgements uses upsert
-- ============================================================

-- The upsert on document_acknowledgements requires both INSERT and UPDATE
drop policy if exists "Public update document acknowledgements" on document_acknowledgements;
create policy "Public update document acknowledgements" on document_acknowledgements
  for update using (true) with check (true);
```

Save this SQL as `supabase/schema_rls_fix.sql` in the repository so it can be reapplied after a database reset.

### 4.2 Fix the `acknowledged_at` Join Problem

The current `getDashboardData()` reads `documents.*` which never includes acknowledgement data from the `document_acknowledgements` table. Fix the documents query in `lib/data.ts` to JOIN with acknowledgements for the current user.

This is addressed in Phase 3 (Client/Data Layer changes).

---

## 5. Phase 2 — Complete Server Actions for All 8 Mutation Types

Create or update the following files. Each action follows the established pattern from `app/actions/tickets.ts`.

### 5.1 Update `app/actions/tickets.ts` — Add Audit Log Write

Replace the entire file `/home/user/panellako/app/actions/tickets.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type TicketPriority = 'alacsony' | 'kozepes' | 'magas' | 'kritikus';
export type TicketStatus = 'uj' | 'folyamatban' | 'varakozik' | 'lezarva';

export interface CreateTicketInput {
  title: string;
  description: string;
  location: string;
  priority: TicketPriority;
  submitted_by?: string;
  unit_label?: string;
  building_id?: string;
  due_date?: string | null;
}

export async function createTicket(input: CreateTicketInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title: input.title,
      description: input.description,
      location: input.location,
      priority: input.priority,
      submitted_by: input.submitted_by ?? user?.email ?? 'Névtelen',
      unit_label: input.unit_label ?? null,
      building_id: input.building_id ?? null,
      reporter_id: user?.id ?? null,
      due_date: input.due_date ?? null,
      status: 'uj',
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('[createTicket] Supabase error:', error.message, error.code);
    return { success: false, error: error.message };
  }

  // Write audit log (non-blocking — failure here must not fail the ticket create)
  if (data?.id) {
    await supabase.from('audit_logs').insert({
      actor_id: user?.id ?? null,
      actor_name: input.submitted_by ?? user?.email ?? 'Névtelen',
      action_type: 'ticket_created',
      entity_type: 'ticket',
      entity_id: data.id,
      entity_label: input.title
    }).then(({ error: auditError }) => {
      if (auditError) console.warn('[createTicket] Audit log write failed:', auditError.message);
    });
  }

  revalidatePath('/');
  return { success: true, data };
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { error } = await supabase
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    console.error('[updateTicketStatus] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_name: user.email ?? 'Névtelen',
    action_type: 'ticket_status_changed',
    entity_type: 'ticket',
    entity_id: ticketId,
    entity_label: `Státusz: ${status}`
  }).then(({ error: auditError }) => {
    if (auditError) console.warn('[updateTicketStatus] Audit log write failed:', auditError.message);
  });

  revalidatePath('/');
  return { success: true };
}
```

### 5.2 Update `app/actions/meter-readings.ts` — Fix `reported_by_name`

Replace the entire file `/home/user/panellako/app/actions/meter-readings.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type MeterType = 'viz' | 'gaz' | 'villany';

export interface SubmitMeterReadingInput {
  meter_type: MeterType;
  value: number;
  reading_date: string;
  unit_id?: string;
  unit_label?: string;
  building_id?: string;
  reported_by_name?: string;
}

export async function submitMeterReading(input: SubmitMeterReadingInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!input.unit_label) {
    return { success: false, error: 'Az albetét azonosítója kötelező (unit_label).' };
  }

  if (!input.reading_date) {
    return { success: false, error: 'Az olvasás dátuma kötelező.' };
  }

  if (typeof input.value !== 'number' || isNaN(input.value) || input.value < 0) {
    return { success: false, error: 'Érvénytelen mérőóra érték.' };
  }

  const { data, error } = await supabase
    .from('meter_readings')
    .insert({
      meter_type: input.meter_type,
      value: input.value,
      reading_date: input.reading_date,
      unit_id: input.unit_id ?? null,
      unit_label: input.unit_label,
      building_id: input.building_id ?? null,
      reported_by: user?.id ?? null,
      reported_by_name: input.reported_by_name ?? user?.email ?? 'Névtelen'
    })
    .select()
    .single();

  if (error) {
    console.error('[submitMeterReading] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}
```

### 5.3 `app/actions/announcements.ts` — Already Correct

The existing `app/actions/announcements.ts` is correctly implemented. No changes needed. Verify it was applied to the schema (the announcements table has an INSERT policy — confirmed in schema line 308).

### 5.4 `app/actions/notifications.ts` — Already Correct

The existing `app/actions/notifications.ts` is correctly implemented. No changes needed.

### 5.5 Update `app/actions/documents.ts` — Fix Acknowledged State Display

The existing file is functionally correct for the upsert into `document_acknowledgements`. However, we must also update the `getDashboardData` query so the acknowledged state is readable. The action file itself requires no changes. See Phase 3 for the data layer fix.

### 5.6 CREATE `app/actions/votes.ts` — Vote Submission (New File)

Create the file `/home/user/panellako/app/actions/votes.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type VoteValue = 'igen' | 'nem' | 'tartozkodas';

export interface SubmitVoteInput {
  resolution_id: string;
  vote_value: VoteValue;
  unit_id?: string;
  weight?: number;
}

export async function submitVote(input: SubmitVoteInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Szavazáshoz bejelentkezés szükséges.' };
  }

  if (!input.resolution_id) {
    return { success: false, error: 'Hiányzó határozat azonosító.' };
  }

  const allowedValues: VoteValue[] = ['igen', 'nem', 'tartozkodas'];
  if (!allowedValues.includes(input.vote_value)) {
    return { success: false, error: 'Érvénytelen szavazati érték.' };
  }

  // Check if user has already voted on this resolution
  const { data: existingVote, error: checkError } = await supabase
    .from('votes')
    .select('id')
    .eq('resolution_id', input.resolution_id)
    .eq('voter_profile_id', user.id)
    .maybeSingle();

  if (checkError) {
    console.error('[submitVote] Check error:', checkError.message);
    return { success: false, error: checkError.message };
  }

  if (existingVote) {
    return { success: false, error: 'Már szavazott erre a határozatra.' };
  }

  const { data, error } = await supabase
    .from('votes')
    .insert({
      resolution_id: input.resolution_id,
      voter_profile_id: user.id,
      unit_id: input.unit_id ?? null,
      vote_value: input.vote_value,
      weight: input.weight ?? 1
    })
    .select()
    .single();

  if (error) {
    console.error('[submitVote] Supabase error:', error.message, error.code);
    if (error.code === '23505') {
      return { success: false, error: 'Duplikált szavazat — már szavazott erre a határozatra.' };
    }
    return { success: false, error: error.message };
  }

  // Write audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_name: user.email ?? 'Névtelen',
    action_type: 'vote_submitted',
    entity_type: 'vote',
    entity_id: data.id,
    entity_label: `Határozat: ${input.resolution_id} — Szavazat: ${input.vote_value}`
  }).then(({ error: auditError }) => {
    if (auditError) console.warn('[submitVote] Audit log write failed:', auditError.message);
  });

  revalidatePath('/');
  return { success: true, data };
}
```

### 5.7 CREATE `app/actions/work-orders.ts` — Work Order Management (New File)

Create the file `/home/user/panellako/app/actions/work-orders.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type WorkOrderStatus = 'tervezett' | 'kikuldve' | 'folyamatban' | 'lezarva';

export interface CreateWorkOrderInput {
  ticket_id?: string;
  vendor_id?: string;
  ticket_title: string;
  vendor_name: string;
  status?: WorkOrderStatus;
  due_date: string;
  cost_estimate?: number;
}

export interface UpdateWorkOrderStatusInput {
  work_order_id: string;
  status: WorkOrderStatus;
}

export async function createWorkOrder(input: CreateWorkOrderInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Munkarendelés létrehozásához bejelentkezés szükséges.' };
  }

  if (!input.ticket_title || !input.vendor_name || !input.due_date) {
    return { success: false, error: 'A feladat neve, a kivitelező és a határidő kötelező.' };
  }

  const { data, error } = await supabase
    .from('work_orders')
    .insert({
      ticket_id: input.ticket_id ?? null,
      vendor_id: input.vendor_id ?? null,
      ticket_title: input.ticket_title,
      vendor_name: input.vendor_name,
      status: input.status ?? 'tervezett',
      due_date: input.due_date,
      cost_estimate: input.cost_estimate ?? 0
    })
    .select()
    .single();

  if (error) {
    console.error('[createWorkOrder] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_name: user.email ?? 'Névtelen',
    action_type: 'work_order_created',
    entity_type: 'work_order',
    entity_id: data.id,
    entity_label: `${input.ticket_title} → ${input.vendor_name}`
  }).then(({ error: auditError }) => {
    if (auditError) console.warn('[createWorkOrder] Audit log write failed:', auditError.message);
  });

  revalidatePath('/');
  return { success: true, data };
}

export async function updateWorkOrderStatus(input: UpdateWorkOrderStatusInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bejelentkezés szükséges.' };
  }

  const allowedStatuses: WorkOrderStatus[] = ['tervezett', 'kikuldve', 'folyamatban', 'lezarva'];
  if (!allowedStatuses.includes(input.status)) {
    return { success: false, error: 'Érvénytelen státusz.' };
  }

  const { error } = await supabase
    .from('work_orders')
    .update({ status: input.status })
    .eq('id', input.work_order_id);

  if (error) {
    console.error('[updateWorkOrderStatus] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
```

### 5.8 CREATE `app/actions/finance.ts` — Finance Entry Management (New File)

Create the file `/home/user/panellako/app/actions/finance.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface CreateFinanceEntryInput {
  unit_id?: string;
  period: string;
  expected_amount: number;
  paid_amount?: number;
  due_date: string;
}

export interface RecordPaymentInput {
  entry_id: string;
  paid_amount: number;
}

export async function createFinanceEntry(input: CreateFinanceEntryInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Pénzügyi tétel rögzítéséhez bejelentkezés szükséges.' };
  }

  if (!input.period || !input.due_date) {
    return { success: false, error: 'Az időszak és a fizetési határidő kötelező.' };
  }

  if (typeof input.expected_amount !== 'number' || input.expected_amount < 0) {
    return { success: false, error: 'Érvénytelen várható összeg.' };
  }

  const { data, error } = await supabase
    .from('finance_entries')
    .insert({
      unit_id: input.unit_id ?? null,
      period: input.period,
      expected_amount: input.expected_amount,
      paid_amount: input.paid_amount ?? 0,
      due_date: input.due_date
    })
    .select()
    .single();

  if (error) {
    console.error('[createFinanceEntry] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_name: user.email ?? 'Névtelen',
    action_type: 'finance_entry_created',
    entity_type: 'finance_entry',
    entity_id: data.id,
    entity_label: `${input.period} — ${input.expected_amount} Ft`
  }).then(({ error: auditError }) => {
    if (auditError) console.warn('[createFinanceEntry] Audit log write failed:', auditError.message);
  });

  revalidatePath('/');
  return { success: true, data };
}

export async function recordPayment(input: RecordPaymentInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bejelentkezés szükséges.' };
  }

  if (typeof input.paid_amount !== 'number' || input.paid_amount < 0) {
    return { success: false, error: 'Érvénytelen összeg.' };
  }

  const { error } = await supabase
    .from('finance_entries')
    .update({ paid_amount: input.paid_amount })
    .eq('id', input.entry_id);

  if (error) {
    console.error('[recordPayment] Supabase error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
```

---

## 6. Phase 3 — Client-Side: Wire `dashboard-client.tsx` for New Actions

The file `/home/user/panellako/components/dashboard-client.tsx` (1034 lines) currently imports only 4 actions. It needs imports for the new actions plus the corrected `unit_label` passing for meter readings.

### 6.1 Add New Imports at Top of `dashboard-client.tsx`

Locate the existing import block (lines 52–55) and extend it:

```typescript
// EXISTING (do not remove)
import { createTicket as createTicketAction, updateTicketStatus as updateTicketStatusAction } from '@/app/actions/tickets';
import { submitMeterReading as submitMeterReadingAction } from '@/app/actions/meter-readings';
import { createAnnouncement as createAnnouncementAction } from '@/app/actions/announcements';
import { acknowledgeDocument as acknowledgeDocumentAction } from '@/app/actions/documents';

// ADD THESE
import { submitVote as submitVoteAction } from '@/app/actions/votes';
import { createWorkOrder as createWorkOrderAction, updateWorkOrderStatus as updateWorkOrderStatusAction } from '@/app/actions/work-orders';
import { createFinanceEntry as createFinanceEntryAction } from '@/app/actions/finance';
import { createNotification as createNotificationAction } from '@/app/actions/notifications';
```

### 6.2 Fix the `unit_label` Bug in Meter Reading Submission

In `dashboard-client.tsx` around line 884, the `submitMeterReadingAction` call passes `unit || undefined`. The `unit` state variable is only populated if the user has typed in the profile form. In production the caller must have a reliable `unit_label`. Add a fallback and validation:

```typescript
// REPLACE the submitMeterReadingAction call (around line 884):
const readingUnitLabel = unit || 'Ismeretlen';  // unit state from profile form
const result = await submitMeterReadingAction({ 
  meter_type: meterType, 
  value, 
  reading_date: readingDate, 
  unit_label: readingUnitLabel,
  reported_by_name: name  // name state from profile form 
});
if (!result.success) {
  console.error('Meter reading failed:', result.error);
  // Show error to user — add an error state variable
}
```

### 6.3 Add Vote Submission State and Handler

Add to the state declarations at the top of `DashboardClient` component (after line ~210):

```typescript
const [voteSubmitting, setVoteSubmitting] = useState<string | null>(null); // resolution_id being voted on
const [voteResults, setVoteResults] = useState<Record<string, string>>({}); // resolution_id -> vote_value
```

Add the vote handler function (before the `return` statement):

```typescript
const handleVote = async (resolutionId: string, voteValue: 'igen' | 'nem' | 'tartozkodas') => {
  setVoteSubmitting(resolutionId);
  const result = await submitVoteAction({
    resolution_id: resolutionId,
    vote_value: voteValue
  });
  setVoteSubmitting(null);
  
  if (result.success) {
    setVoteResults((prev) => ({ ...prev, [resolutionId]: voteValue }));
  } else {
    console.error('Vote failed:', result.error);
    // Optionally show inline error
  }
};
```

### 6.4 Wire Vote Buttons in the Meetings Section (around line 917)

Replace the placeholder "Szavazás" button in the meetings section with functional vote buttons. In the meetings section within `dashboard-client.tsx` (the `<SectionCard id="meetings">` block), update the resolution display:

```typescript
// Replace the placeholder vote button row:
<div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-3">
  <button className="rounded-xl bg-brand-50 px-3 py-2 text-brand-700" type="button">Meghívó</button>
  {/* Vote buttons — replace with: */}
  {['igen', 'nem', 'tartozkodas'].map((voteVal) => (
    <button
      key={voteVal}
      className={`rounded-xl px-3 py-2 ${
        voteVal === 'igen' ? 'bg-emerald-50 text-emerald-700' :
        voteVal === 'nem' ? 'bg-rose-50 text-rose-700' :
        'bg-slate-100 text-slate-700'
      } disabled:opacity-40`}
      type="button"
      disabled={voteSubmitting === meeting.id || Boolean(voteResults[meeting.id])}
      onClick={() => handleVote(meeting.id, voteVal as 'igen' | 'nem' | 'tartozkodas')}
    >
      {voteSubmitting === meeting.id ? '...' : voteVal}
    </button>
  ))}
  <button className="rounded-xl bg-slate-100 px-3 py-2 text-slate-700" type="button">Határozatok</button>
</div>
```

Note: The votes table uses `resolution_id`, not `meeting_id`. In production this requires querying resolutions per meeting. For the initial wire-up, `meeting.id` is used as a placeholder. A follow-up task should add a `resolutions` query to `getDashboardData()` and pass the actual `resolution_id`.

### 6.5 Optimistic Update Pattern for Documents Acknowledge

The `acknowledgeDocument` action is already called in the UI (line 851). After the action returns success, optimistically update the local document state. Add document state management:

```typescript
// Add to state declarations
const [documents, setDocuments] = useState(data.documents);

// Replace usage of data.documents with documents throughout the component

// Add handler function
const handleAcknowledgeDocument = async (documentId: string) => {
  const previousDocuments = documents;
  // Optimistic update
  setDocuments((prev) => 
    prev.map((doc) => 
      doc.id === documentId 
        ? { ...doc, acknowledged_at: new Date().toISOString() } 
        : doc
    )
  );
  
  const result = await acknowledgeDocumentAction(documentId);
  if (!result.success) {
    // Rollback
    setDocuments(previousDocuments);
    console.error('Acknowledge failed:', result.error);
  }
};
```

Replace the onClick in the "Elolvasva" button:
```typescript
onClick={() => handleAcknowledgeDocument(item.id)}
```

### 6.6 Wire Work Order Status Updates

In the work orders section (around line 936), add onClick handlers to status transitions:

```typescript
// Add work order state
const [workOrders, setWorkOrders] = useState(data.workOrders);

// Add handler
const handleWorkOrderStatus = async (workOrderId: string, nextStatus: WorkOrderItem['status']) => {
  const previousOrders = workOrders;
  setWorkOrders((prev) =>
    prev.map((wo) => wo.id === workOrderId ? { ...wo, status: nextStatus } : wo)
  );
  
  const result = await updateWorkOrderStatusAction({ work_order_id: workOrderId, status: nextStatus });
  if (!result.success) {
    setWorkOrders(previousOrders);
  }
};
```

---

## 7. Phase 4 — Fix `lib/data.ts` to Resolve the `acknowledged_at` Join

The documents query must return acknowledgement status for the current session user. Replace the documents query in `getDashboardData()` in `/home/user/panellako/lib/data.ts`:

```typescript
// REPLACE the documents query line inside the Promise.all block:
// OLD:
supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(10),

// NEW — join with document_acknowledgements for the current user session:
// Note: auth.uid() is not available server-side without knowing the user.
// Use a two-step approach: first get the current user, then query documents.
```

Because `getDashboardData()` is a server function that currently does not accept a user, it needs to be updated to accept an optional `userId` parameter. Add a new query pattern:

```typescript
// In getDashboardData, after creating the supabase client:
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id ?? null;

// Then replace the documents query in Promise.all:
userId
  ? supabase
      .from('documents')
      .select(`
        *,
        document_acknowledgements!left(viewed_at, profile_id)
      `)
      .eq('document_acknowledgements.profile_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(10)
  : supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(10),
```

Then in the return value, map the `document_acknowledgements` joined data to `acknowledged_at`:

```typescript
documents: (() => {
  const rawDocs = documents.data?.length ? documents.data : mockDocuments;
  return rawDocs.map((doc: Record<string, unknown>) => ({
    ...doc,
    acknowledged_at: Array.isArray(doc.document_acknowledgements) && doc.document_acknowledgements.length > 0
      ? doc.document_acknowledgements[0].viewed_at
      : (doc.acknowledged_at ?? null)
  }));
})(),
```

---

## 8. Phase 5 — Configuration: `.env.local` Setup

```bash
# /home/user/panellako/.env.local
# Required for all Supabase functionality
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: used by non-Next.js scripts (e.g., seed scripts)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

CRITICAL: Never commit `.env.local` to git. Verify `.gitignore` contains `.env.local`.

After creating `.env.local`, restart the Next.js dev server:
```bash
npm run dev
```

Verify config is detected: open the browser, navigate to the dashboard. The header should show "Adatforrás: Supabase" (not "Mock/demo").

---

## 9. Phase 6 — Testing: Manual Smoke Test Script

Run these tests in order after completing all phases. Each test verifies a write path end-to-end.

### Test 1: Ticket Create
1. Navigate to `http://localhost:3000/?role=lako`
2. Scroll to the "Bejelentések" section
3. Fill in: Tárgy="Csöpögő vízcsap", Leírás="A konyhában csöpög a csap", Helyszín="Konyha", Prioritás="közepes"
4. Submit the form
5. Verify the ticket appears at the top of the ticket list (optimistic)
6. Refresh the page
7. Verify the ticket is still visible (Supabase persisted)
8. Open Supabase Dashboard > Table Editor > tickets — verify the row exists

### Test 2: Meter Reading Submit
1. Navigate to the "Mérőórák" section
2. First set the "Lakás" field to "A/12" in the Profil section (required for unit_label)
3. Select mérőóra type: "víz", value: "1234.56", date: today
4. Submit
5. Verify "Óraállás rögzítve" confirmation appears
6. Refresh — verify new reading appears in the list
7. Check Supabase: meter_readings table has the row with unit_label='A/12'

### Test 3: Document Acknowledge
1. Navigate to "Dokumentumok" section
2. Click "Elolvasva" on any document without a checkmark
3. Verify the AlertTriangle icon changes to CheckCircle2 (optimistic)
4. Refresh
5. Verify the document still shows as acknowledged
6. Check Supabase: document_acknowledgements table has a row

### Test 4: Announcement Create (Manager role)
1. Navigate to `http://localhost:3000/?role=kozos_kepviselo`
2. Scroll to "Célzott kommunikáció / hírküldés"
3. Fill in the form and submit
4. Verify success message
5. Refresh — verify announcement appears in news feed

### Test 5: Vote Submit
1. Navigate to `http://localhost:3000/?role=lako`
2. Scroll to "Közgyűlések" section
3. Click "igen" on a meeting
4. Verify button becomes disabled
5. Check Supabase: votes table has a row

### Test 6: Work Order Create (Admin role)
1. Navigate with role=kozos_kepviselo
2. Via a test call to `createWorkOrder` (use browser console or a temporary test button)
3. Verify work_orders table has the new row
4. Verify audit_logs table has a corresponding row

### Test 7: Finance Entry Create
1. Test via direct Server Action call (or temporary form)
2. Verify finance_entries table has the new row

### Test 8: RLS Verification
1. Sign out from Supabase (clear cookies or use incognito)
2. Attempt to submit a vote
3. Expected result: `{ success: false, error: 'Szavazáshoz bejelentkezés szükséges.' }` (caught before RLS)
4. Attempt direct write via Supabase Studio REST API without auth token
5. Expected result: 401 Unauthorized (RLS blocks anonymous writes on tables without `with check (true)`)

---

## 10. Error Handling for 8 Specific Scenarios

### Scenario 1: Authentication Failure (user is null)
All new actions guard with `if (!user) return { success: false, error: '...' }`. The `createTicket` action intentionally does NOT require auth (allows anonymous report submission). All other write actions require auth. When auth fails, the client should show a toast notification and redirect to `/login`.

### Scenario 2: Network Timeout
Supabase client uses `fetch` internally. Add timeout wrapper where needed:
```typescript
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Request timeout')), 8000)
);
// Wrap supabase insert in Promise.race with timeoutPromise
```
Client should catch `error.message === 'Request timeout'` and show "Időtúllépés — kérjük próbálja újra."

### Scenario 3: Duplicate Key Violation (PostgreSQL error code 23505)
Votes have a unique constraint on (resolution_id, voter_profile_id). When code 23505 is returned, display "Már szavazott erre a határozatra." The `submitVote` action already handles this.

### Scenario 4: RLS Policy Block (error code 42501 or empty data)
When an INSERT is blocked by RLS, Supabase returns an error with code `42501` or silently returns `data: null` with no error. The actions log these to console. Add the Phase 1 SQL migration to ensure all INSERT policies exist.

### Scenario 5: Database Constraint Violation (not-null, check constraint)
For example, inserting a meter_reading without `unit_label` (NOT NULL in schema). Handle by validating inputs before the Supabase call. The `submitMeterReading` action validates `unit_label` presence.

### Scenario 6: Supabase Project Paused (503 from Supabase free tier)
Free-tier Supabase projects pause after 7 days of inactivity. The error manifests as a 503 or connection refused. Detect with: `if (error.message?.includes('Failed to fetch'))`. Fallback gracefully to mock data (the existing mock fallback pattern in `getDashboardData()` handles reads; writes should show "Service tijdelijk niet beschikbaar").

### Scenario 7: Invalid UUID (foreign key violation, error code 23503)
When `building_id` or `unit_id` are passed as invalid strings, PostgreSQL returns error code 23503. Validate UUIDs before insert: `const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;`

### Scenario 8: Missing Environment Variables
When `NEXT_PUBLIC_SUPABASE_URL` is undefined, `createServerClient` throws. This is caught by the `hasSupabaseConfig` guard in `lib/data.ts`. For Server Actions, the call will throw during client creation. Wrap the `createClient()` call in a try-catch and return `{ success: false, error: 'Supabase nincs konfigurálva.' }`.

---

## 11. Integration Dependencies with Other Initiatives

This initiative is a **prerequisite** for every other planned initiative:

1. **Multi-tenant workspace routing** — requires that `building_id` is consistently set on all writes. This initiative establishes `building_id` as a parameter on every insert.
2. **Stripe billing / subscription gates** — requires that user accounts are real (backed by real profile rows), which requires that the Supabase auth flow is working. Auth is confirmed working by this initiative's test suite.
3. **Mobile PWA** — requires that all API mutations work correctly, which this initiative completes.
4. **Audit log dashboard** — already partially served by `getDashboardData()`. This initiative adds audit log writes for every mutation action.
5. **SSR Auth Hardening (Dev Prompt #2)** — this initiative adds `getUser()` calls in all actions; Dev Prompt #2 hardens the session validation. Both can be worked in parallel or #2 first. No conflict.

---

## 12. Rollback Plan

If any phase causes a production regression:

**Database rollback:** The RLS policies added in Phase 1 are purely additive. If they cause problems, they can be dropped with:
```sql
drop policy if exists "Public insert documents" on documents;
-- (repeat for each policy added)
```

**Code rollback:** Each Server Action file is self-contained. Rollback by reverting `app/actions/votes.ts`, `app/actions/work-orders.ts`, `app/actions/finance.ts` to previous state (or deleting the new files). The existing actions `tickets.ts`, `meter-readings.ts`, etc. had only additive changes — rollback by reverting the git commit.

**Data rollback:** No schema columns were added in this initiative — only RLS policies and new Server Action files. Data written cannot be automatically rolled back, but the schema itself is unchanged.

Git command to rollback all code changes:
```bash
git revert HEAD --no-edit
```

---

## 13. Definition of Done — Checklist (14 Items)

- [ ] **DOD-1:** SQL migration in Phase 1 applied to Supabase project; all 5 missing INSERT policies and all 3 UPDATE policies are live.
- [ ] **DOD-2:** `app/actions/tickets.ts` updated — audit log write added, `due_date` parameter added.
- [ ] **DOD-3:** `app/actions/meter-readings.ts` updated — `reported_by_name` populated, `unit_label` validation added.
- [ ] **DOD-4:** `app/actions/votes.ts` created — duplicate vote prevention, auth guard, audit log.
- [ ] **DOD-5:** `app/actions/work-orders.ts` created — create and update status actions, auth guard, audit log.
- [ ] **DOD-6:** `app/actions/finance.ts` created — create entry and record payment actions, auth guard.
- [ ] **DOD-7:** `dashboard-client.tsx` updated — new action imports, `unit_label` bug fixed in meter reading form.
- [ ] **DOD-8:** Document acknowledge optimistic update implemented with rollback on failure.
- [ ] **DOD-9:** `lib/data.ts` updated — documents query joins `document_acknowledgements` to correctly populate `acknowledged_at`.
- [ ] **DOD-10:** Manual smoke Test 1 (ticket create) passes end-to-end — ticket survives page refresh.
- [ ] **DOD-11:** Manual smoke Test 3 (document acknowledge) passes — acknowledged state survives page refresh.
- [ ] **DOD-12:** Supabase Dashboard > Table Editor confirms rows exist in: tickets, meter_readings, document_acknowledgements, audit_logs after running the smoke tests.
- [ ] **DOD-13:** `.env.local` configured — dashboard header shows "Adatforrás: Supabase" (not "Mock/demo").
- [ ] **DOD-14:** No TypeScript compilation errors — `npm run build` exits with code 0.

---

## Appendix A: Schema Column Reference for New Actions

| Action | Table | Required Columns | Optional Columns |
|--------|-------|-----------------|-----------------|
| `createTicket` | tickets | title, description, location, priority, status | submitted_by, unit_label, building_id, reporter_id, due_date |
| `submitMeterReading` | meter_readings | meter_type, value, reading_date, unit_label | unit_id, building_id, reported_by, reported_by_name |
| `createAnnouncement` | announcements | title, content, target_group, category, created_by | building_id, source_label |
| `createNotification` | notifications | title, message, audience, channel, created_by | building_id |
| `acknowledgeDocument` | document_acknowledgements | document_id, profile_id, viewed_at | — |
| `createDocument` | documents | title, category, version, file_url | building_id, visibility |
| `submitVote` | votes | resolution_id, voter_profile_id, vote_value, weight | unit_id |
| `createWorkOrder` | work_orders | ticket_title, vendor_name, status, due_date, cost_estimate | ticket_id, vendor_id |
| `createFinanceEntry` | finance_entries | period, expected_amount, paid_amount, due_date | unit_id |

---

## Appendix B: Common PostgreSQL Error Codes

| Code | Meaning | When It Appears |
|------|---------|----------------|
| 23505 | Unique violation | Duplicate vote, duplicate document acknowledge |
| 23503 | Foreign key violation | Invalid building_id, unit_id, or resolution_id UUID |
| 23502 | Not-null violation | Missing required column (unit_label on meter_readings) |
| 42501 | Insufficient privilege | RLS policy blocks the operation |
| 22P02 | Invalid text representation | Malformed UUID passed as a column value |
| PGRST116 | PostgREST: row not found | `.single()` returned no row |
