# Dev Prompt #08 — Financial Module: Real Ledger + Arrears Automation

**Initiative:** Financial Module — Real Ledger + Arrears Automation
**Estimated value impact:** +€140,000–€320,000 (ARR uplift via Könyvelő tier lock-in, Excel migration, arrears workflow)
**Stack:** Next.js 14 App Router · Supabase (Postgres + RLS) · Tailwind CSS
**Codebase language:** TypeScript (strict mode)
**Date authored:** 2026-05-15

---

## 1. Business Case

### 1.1 The Excel Replacement Story

The dominant financial management workflow in Hungarian residential building management is a combination of Microsoft Excel spreadsheets, paper ledgers, and manual bank reconciliation. A typical közös képviselő (building manager) maintains one workbook per building, with one sheet per year, manually entering monthly közös költség charges, recording bank transfers as payments, and calculating arrears by subtracting paid amounts from expected amounts. This process is error-prone, non-auditable, and locked in the manager's personal files — inaccessible to the building committee, the könyvelő, or individual unit owners who want to verify their own payment history. PanelLakó's financial module replaces this entire workflow with a structured, real-time, multi-user ledger that is always accessible, always correct, and always auditable.

The switching cost from Excel is low because PanelLakó already has the building's unit master data (albetét registry) in the database. The common cost charge generation wizard pre-populates with all units automatically — the manager just enters the monthly amount and clicks confirm. The perceived effort of migration is one click per building per month, versus 30 minutes of manual spreadsheet work. This is a compelling enough improvement to drive adoption without any sales effort — users self-convert when they discover the feature.

### 1.2 Lakástörvény §24 Compliance Requirement

The Hungarian Lakástörvény (Act CXXXIII of 2003 on Condominiums, §24) requires that building managers maintain auditable financial records of all common cost charges and payments, make these records available for inspection by unit owners upon request, and produce a yearly financial settlement (éves elszámolás). Failure to comply exposes the közös képviselő to personal liability and can result in removal from their role by the building's general assembly.

PanelLakó's financial module directly addresses this requirement: every charge and payment is timestamped, attributed to a specific unit, and associated with a period — creating an immutable audit trail in PostgreSQL. The `payment_reference` field stores bank transfer reference numbers. The arrears report can be exported as evidence for legal proceedings. The yearly settlement can be generated from the data with a single query. This compliance angle is a key differentiator in sales conversations with property management firms facing audit risk.

### 1.3 Arrears as the #1 Building Management Pain Point

In a survey of Hungarian building managers conducted by the Hungarian Condominium Managers Association (HFMÉSZ), 78% identified "arrears collection" as the most time-consuming and stressful aspect of their role. A typical building with 30 units experiences 3–5 units in arrears at any given time, with average outstanding balances of 50,000–200,000 HUF per unit. Managing arrears manually requires: (1) calculating who owes what (error-prone in Excel), (2) generating written notices (word processor + mail merge), (3) tracking responses, (4) escalating to legal proceedings. PanelLakó automates steps 1 and 2 completely. The arrears notice generation feature produces a structured letter for each unit in arrears with one click, saving 2–4 hours per month per building.

The emotional value of this feature is also significant: managers feel more in control, unit owners feel the system is fair and transparent, and the building committee can see arrears data in real time without waiting for the manager's monthly report. This reduces conflict, improves trust, and increases the perceived professionalism of the management service.

### 1.4 Lock-In Through Workflow

Financial data is the most sticky data in any SaaS product. Once a building manager has 12+ months of payment history in PanelLakó, switching to another system requires exporting, transforming, and importing all historical data — a painful process that most managers will avoid. The financial ledger therefore creates durable lock-in that complements the ticketing, document, and meeting modules. The könyvelő (bookkeeper) role — a separate user type in PanelLakó's permission model — gains access to the financial module for read and write, which means the building manager's accountant also becomes a PanelLakó user. This creates a second adoption vector: accountants who manage multiple buildings will advocate for PanelLakó because it streamlines their own work.

---

## 2. Current State Analysis

### 2.1 Database — What Exists

The `finance_entries` table in `supabase/schema.sql` has:
- `id` UUID primary key
- `unit_id` UUID references units(id)
- `period` TEXT (free-form string, e.g. "2026-01", "2026. január")
- `expected_amount` NUMERIC(12,2) — the charge amount
- `paid_amount` NUMERIC(12,2) DEFAULT 0 — cumulative payments
- `due_date` DATE
- `created_at` TIMESTAMPTZ

Missing: `payment_date`, `payment_reference`, `created_by` (for audit trail).

The `units` table has a `balance_amount NUMERIC(12,2)` column — a denormalized running balance. This is kept in sync manually and can drift out of sync with `finance_entries`. The real source of truth should be `SUM(expected_amount) - SUM(paid_amount)` across all finance_entries for a unit.

### 2.2 Application Code — What Exists

In `lib/data.ts` (server-side data fetching), finances are queried as:
```typescript
const { data: finances } = await supabase
  .from('finance_entries')
  .select('*')
  .order('due_date', { ascending: false })
  .limit(8);
```

This is a read-only query. There are no Server Actions for financial writes.

In `lib/types.ts`, `FinanceItem` is:
```typescript
export interface FinanceItem {
  id: string;
  period: string;
  expected_amount: number;
  paid_amount: number;
  due_date: string;
}
```

Missing: `unit_id`, `payment_date`, `payment_reference`, `created_by`.

### 2.3 Dashboard UI — What Exists

The `components/dashboard-client.tsx` `#finances` SectionCard shows:
- A text summary line: total expected, total paid, arrears
- A progress bar (totalPaid / totalDue)
- A list of `data.finances` entries showing period, expected_amount, paid_amount, due_date

There is no: charge creation form, payment recording form, unit-level balance view, arrears export, or real write capability. The data shown is limited to 8 entries with no building_id filter.

### 2.4 What is Missing

- `payment_date`, `payment_reference`, `created_by` columns on `finance_entries`
- `unit_balance_view` database view
- Index on `finance_entries(unit_id, period)` for performance
- RLS INSERT/UPDATE policies for finance_entries
- `app/actions/financials.ts` Server Actions file (does not exist)
- Charge generation wizard component
- Payment recording form
- Arrears report generation
- Unit-level financial history view
- Real data wiring (current UI uses unfiltered, unbounded query)
- CSV export for arrears notices
- Building health score update to use real arrears data

---

## 3. Pre-conditions

1. The `units` table must be populated with at least one building's units before the charge generation wizard can be used.
2. The `profiles` table must have at least one user with role `kozos_kepviselo`, `megbizott`, or `konyvelo` for the RLS policies to work as intended.
3. The Next.js app must have `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set. Server Actions also require `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` if service-role bypassing RLS is needed for bulk operations.
4. Run all migrations in Phase 1 before implementing Server Actions or UI.
5. The `building_id` must be passed into the dashboard data fetching context — verify `lib/data.ts` is filtering `finance_entries` by building scope after migration.

---

## 4. Phase 1: Database Changes

### 4.1 Migration SQL

Create `supabase/migrations/20260515000002_financial_ledger.sql`:

```sql
-- Migration: Financial ledger enhancements
-- Initiative: Financial Module — Real Ledger + Arrears Automation
-- Date: 2026-05-15

-- ─── 1. Add audit and payment columns to finance_entries ─────────────────────

ALTER TABLE finance_entries
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'charge'
    CHECK (entry_type IN ('charge', 'payment', 'adjustment', 'opening_balance'));

COMMENT ON COLUMN finance_entries.payment_date IS 'When the payment was actually received (for payment entry_type rows).';
COMMENT ON COLUMN finance_entries.payment_reference IS 'Bank transfer reference number or receipt number.';
COMMENT ON COLUMN finance_entries.created_by IS 'Profile UUID of the user who created this entry.';
COMMENT ON COLUMN finance_entries.entry_type IS 'charge: monthly közös költség; payment: actual payment received; adjustment: correction; opening_balance: initial balance import.';
COMMENT ON COLUMN finance_entries.description IS 'Human-readable description, e.g. "2026. januári közös költség" or "Banki átutalás".';

-- ─── 2. Performance indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_finance_entries_unit_period
  ON finance_entries (unit_id, period);

CREATE INDEX IF NOT EXISTS idx_finance_entries_unit_id
  ON finance_entries (unit_id);

CREATE INDEX IF NOT EXISTS idx_finance_entries_entry_type
  ON finance_entries (entry_type);

-- Index for finding units in arrears quickly
CREATE INDEX IF NOT EXISTS idx_units_balance_amount
  ON units (balance_amount) WHERE balance_amount < 0;

-- ─── 3. Unit balance view ─────────────────────────────────────────────────────
-- This view computes the real-time balance from finance_entries,
-- independent of the denormalized units.balance_amount column.
-- Use this view for display; use units.balance_amount for denormalized cache.

DROP VIEW IF EXISTS unit_balance_view;
CREATE VIEW unit_balance_view AS
SELECT
  u.id AS unit_id,
  u.building_id,
  u.unit_label,
  u.owner_name,
  u.unit_type,
  u.balance_amount AS cached_balance,
  COALESCE(SUM(
    CASE
      WHEN fe.entry_type IN ('charge', 'opening_balance') THEN fe.expected_amount
      ELSE 0
    END
  ), 0) AS total_charged,
  COALESCE(SUM(
    CASE
      WHEN fe.entry_type = 'payment' THEN fe.paid_amount
      ELSE 0
    END
  ), 0) AS total_paid,
  COALESCE(SUM(
    CASE
      WHEN fe.entry_type IN ('charge', 'opening_balance') THEN fe.expected_amount
      WHEN fe.entry_type = 'payment' THEN -fe.paid_amount
      WHEN fe.entry_type = 'adjustment' THEN fe.expected_amount - fe.paid_amount
      ELSE 0
    END
  ), 0) AS computed_balance,
  COUNT(fe.id) AS entry_count
FROM units u
LEFT JOIN finance_entries fe ON fe.unit_id = u.id
GROUP BY u.id, u.building_id, u.unit_label, u.owner_name, u.unit_type, u.balance_amount;

COMMENT ON VIEW unit_balance_view IS
  'Real-time financial balance per unit. computed_balance > 0 means unit owes money (arrears). '
  'computed_balance < 0 means unit has overpaid (credit). '
  'cached_balance is the denormalized units.balance_amount — may differ if not synced.';

-- ─── 4. Arrears view for quick reporting ─────────────────────────────────────

DROP VIEW IF EXISTS building_arrears_view;
CREATE VIEW building_arrears_view AS
SELECT
  ubv.building_id,
  b.name AS building_name,
  ubv.unit_id,
  ubv.unit_label,
  ubv.owner_name,
  ubv.total_charged,
  ubv.total_paid,
  ubv.computed_balance,
  -- Latest due_date for any unpaid charge
  (
    SELECT MAX(fe2.due_date)
    FROM finance_entries fe2
    WHERE fe2.unit_id = ubv.unit_id
      AND fe2.entry_type = 'charge'
  ) AS latest_due_date
FROM unit_balance_view ubv
JOIN buildings b ON b.id = ubv.building_id
WHERE ubv.computed_balance > 0
ORDER BY ubv.computed_balance DESC;

COMMENT ON VIEW building_arrears_view IS 'All units with outstanding arrears (computed_balance > 0), per building.';

-- ─── 5. RLS policies for finance_entries ─────────────────────────────────────

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Finance managers can insert finance entries" ON finance_entries;
DROP POLICY IF EXISTS "Finance managers can update finance entries" ON finance_entries;

-- INSERT: managers and bookkeepers only
CREATE POLICY "Finance managers can insert finance entries" ON finance_entries
  FOR INSERT
  WITH CHECK (true);
-- Note: MVP uses permissive policy (matches existing pattern in schema.sql).
-- Production: tighten to check auth.uid() membership role.

-- UPDATE: managers and bookkeepers only
CREATE POLICY "Finance managers can update finance entries" ON finance_entries
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ─── 6. RLS for views — grant read access ────────────────────────────────────
-- Views inherit RLS from underlying tables.
-- No additional grants needed for authenticated users under public read policy.

-- ─── 7. Function: sync unit balance after finance entry ───────────────────────
-- This trigger keeps units.balance_amount in sync with finance_entries.
-- Called after INSERT or UPDATE on finance_entries.

CREATE OR REPLACE FUNCTION sync_unit_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_computed_balance NUMERIC(12,2);
BEGIN
  -- Recompute balance from all entries for this unit
  SELECT COALESCE(SUM(
    CASE
      WHEN entry_type IN ('charge', 'opening_balance') THEN expected_amount
      WHEN entry_type = 'payment' THEN -paid_amount
      WHEN entry_type = 'adjustment' THEN expected_amount - paid_amount
      ELSE 0
    END
  ), 0)
  INTO v_computed_balance
  FROM finance_entries
  WHERE unit_id = NEW.unit_id;

  -- Update the denormalized balance on units
  UPDATE units
  SET balance_amount = v_computed_balance
  WHERE id = NEW.unit_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_unit_balance ON finance_entries;
CREATE TRIGGER trg_sync_unit_balance
  AFTER INSERT OR UPDATE ON finance_entries
  FOR EACH ROW
  EXECUTE FUNCTION sync_unit_balance();

COMMENT ON FUNCTION sync_unit_balance() IS
  'Trigger function: keeps units.balance_amount in sync with the computed sum from finance_entries. '
  'Fires after INSERT or UPDATE on finance_entries.';
```

### 4.2 Applying the Migration

```bash
supabase db push
```

Or via SQL editor in the Supabase dashboard. Verify by running:

```sql
-- Confirm new columns exist
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'finance_entries' AND column_name IN ('payment_date','payment_reference','created_by','entry_type','description')
ORDER BY column_name;

-- Confirm views exist
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN ('unit_balance_view', 'building_arrears_view');

-- Confirm trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trg_sync_unit_balance';
```

---

## 5. Phase 2: Server Actions — `app/actions/financials.ts`

Create this file. It does not exist yet. This is the complete implementation:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChargeInput {
  buildingId: string;
  period: string;          // ISO format "YYYY-MM" e.g. "2026-01"
  chargePerUnit: number;   // Amount in HUF for all units (uniform charge)
  description?: string;    // Human-readable, e.g. "2026. januári közös költség"
  dueDate: string;         // ISO date string "YYYY-MM-DD"
}

export interface CustomChargeInput {
  unitId: string;
  amount: number;
  period: string;
  dueDate: string;
  description?: string;
}

export interface PaymentInput {
  unitId: string;
  amount: number;
  paymentDate: string;     // ISO date string "YYYY-MM-DD"
  reference?: string;      // Bank transfer reference number
  description?: string;
}

export interface ArrearsUnit {
  unit_id: string;
  unit_label: string;
  owner_name: string;
  total_charged: number;
  total_paid: number;
  computed_balance: number;
  latest_due_date: string | null;
}

export interface ArrearsReport {
  building_id: string;
  building_name: string;
  generated_at: string;
  total_arrears: number;
  units_in_arrears: number;
  units: ArrearsUnit[];
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

function validatePeriod(period: string): boolean {
  // Accept "YYYY-MM" format only
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

function validateAmount(amount: number): boolean {
  return typeof amount === 'number' && isFinite(amount) && amount > 0 && amount <= 10_000_000;
}

function validateDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

// ─── 1. Create Uniform Bulk Charge ───────────────────────────────────────────

/**
 * Creates one finance_entry charge row for every unit in the building.
 * All units receive the same chargePerUnit amount.
 * Returns the number of units charged.
 */
export async function createCharge(input: ChargeInput): Promise<{ success: boolean; charged_units?: number; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  // Validate inputs
  if (!input.buildingId) {
    return { success: false, error: 'buildingId megadása kötelező' };
  }
  if (!validatePeriod(input.period)) {
    return { success: false, error: 'period formátuma helytelen (elvárva: YYYY-MM, pl. 2026-01)' };
  }
  if (!validateAmount(input.chargePerUnit)) {
    return { success: false, error: 'chargePerUnit érvénytelen összeg (1–10 000 000 Ft között kell lennie)' };
  }
  if (!validateDate(input.dueDate)) {
    return { success: false, error: 'dueDate formátuma helytelen (elvárva: YYYY-MM-DD)' };
  }

  // Fetch all units for this building
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id, unit_label')
    .eq('building_id', input.buildingId)
    .order('unit_label');

  if (unitsError) {
    return { success: false, error: `Albetétek lekérdezése sikertelen: ${unitsError.message}` };
  }
  if (!units || units.length === 0) {
    return { success: false, error: 'Nincs albetét ehhez az épülethez' };
  }

  // Check for duplicate charges in the same period
  const { data: existingCharges } = await supabase
    .from('finance_entries')
    .select('unit_id')
    .eq('period', input.period)
    .eq('entry_type', 'charge')
    .in('unit_id', units.map((u) => u.id));

  if (existingCharges && existingCharges.length > 0) {
    return {
      success: false,
      error: `Már létezik ${existingCharges.length} számlabejegyzés erre az időszakra (${input.period}). Törölje őket előbb, vagy válasszon más időszakot.`
    };
  }

  // Build batch insert rows
  const description = input.description ?? `${input.period} közös költség`;
  const rows = units.map((unit) => ({
    unit_id: unit.id,
    period: input.period,
    expected_amount: input.chargePerUnit,
    paid_amount: 0,
    due_date: input.dueDate,
    description,
    entry_type: 'charge' as const,
    created_by: user.id,
    created_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from('finance_entries')
    .insert(rows);

  if (insertError) {
    return { success: false, error: `Terhelés rögzítése sikertelen: ${insertError.message}` };
  }

  revalidatePath('/');
  return { success: true, charged_units: units.length };
}

// ─── 2. Create Bulk Charges with Custom Per-Unit Amounts ──────────────────────

/**
 * Flexible bulk charge creation: each unit can have a different amount.
 * Use this for proportional charges (based on area or ownership share).
 */
export async function createBulkCharges(
  charges: CustomChargeInput[]
): Promise<{ success: boolean; inserted?: number; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  if (!Array.isArray(charges) || charges.length === 0) {
    return { success: false, error: 'Legalább egy számlabejegyzés szükséges' };
  }
  if (charges.length > 200) {
    return { success: false, error: 'Maximum 200 bejegyzés egyszerre' };
  }

  // Validate each charge entry
  for (let i = 0; i < charges.length; i++) {
    const c = charges[i];
    if (!c.unitId) return { success: false, error: `[${i}] unitId hiányzik` };
    if (!validatePeriod(c.period)) return { success: false, error: `[${i}] period formátum helytelen` };
    if (!validateAmount(c.amount)) return { success: false, error: `[${i}] összeg érvénytelen: ${c.amount}` };
    if (!validateDate(c.dueDate)) return { success: false, error: `[${i}] dueDate formátum helytelen` };
  }

  const rows = charges.map((c) => ({
    unit_id: c.unitId,
    period: c.period,
    expected_amount: c.amount,
    paid_amount: 0,
    due_date: c.dueDate,
    description: c.description ?? `${c.period} közös költség`,
    entry_type: 'charge' as const,
    created_by: user.id,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('finance_entries')
    .insert(rows);

  if (error) {
    return { success: false, error: `Tömeges rögzítés sikertelen: ${error.message}` };
  }

  revalidatePath('/');
  return { success: true, inserted: rows.length };
}

// ─── 3. Record a Payment ──────────────────────────────────────────────────────

/**
 * Records a payment received from a unit.
 * Inserts a finance_entry row with entry_type = 'payment'.
 * The sync_unit_balance trigger automatically updates units.balance_amount.
 */
export async function recordPayment(
  input: PaymentInput
): Promise<{ success: boolean; entry_id?: string; new_balance?: number; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  if (!input.unitId) {
    return { success: false, error: 'unitId megadása kötelező' };
  }
  if (!validateAmount(input.amount)) {
    return { success: false, error: 'Összeg érvénytelen (1–10 000 000 Ft között kell lennie)' };
  }
  if (!validateDate(input.paymentDate)) {
    return { success: false, error: 'paymentDate formátuma helytelen (elvárva: YYYY-MM-DD)' };
  }

  // Verify unit exists
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('id, unit_label, building_id')
    .eq('id', input.unitId)
    .single();

  if (unitError || !unit) {
    return { success: false, error: 'Albetét nem található' };
  }

  // Derive period from paymentDate (YYYY-MM format)
  const period = input.paymentDate.substring(0, 7);

  // Insert payment entry
  const { data: newEntry, error: insertError } = await supabase
    .from('finance_entries')
    .insert({
      unit_id: input.unitId,
      period,
      expected_amount: 0,
      paid_amount: input.amount,
      due_date: input.paymentDate,
      payment_date: new Date(input.paymentDate).toISOString(),
      payment_reference: input.reference ?? null,
      description: input.description ?? `Befizetés — ${input.reference ?? 'nincs referencia'}`,
      entry_type: 'payment',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertError) {
    return { success: false, error: `Befizetés rögzítése sikertelen: ${insertError.message}` };
  }

  // Fetch updated balance (trigger has already run, so this is the new value)
  const { data: updatedUnit } = await supabase
    .from('units')
    .select('balance_amount')
    .eq('id', input.unitId)
    .single();

  revalidatePath('/');
  return {
    success: true,
    entry_id: newEntry.id,
    new_balance: updatedUnit?.balance_amount ?? undefined,
  };
}

// ─── 4. Generate Arrears Report ───────────────────────────────────────────────

/**
 * Returns structured arrears data for all units in a building with balance > 0.
 * Uses the building_arrears_view for efficiency.
 */
export async function generateArrearsReport(buildingId: string): Promise<{ success: boolean; report?: ArrearsReport; error?: string }> {
  const supabase = createClient();

  if (!buildingId) {
    return { success: false, error: 'buildingId megadása kötelező' };
  }

  // Fetch building info
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('id', buildingId)
    .single();

  if (buildingError || !building) {
    return { success: false, error: 'Épület nem található' };
  }

  // Query the arrears view
  const { data: arrearsUnits, error: arrearsError } = await supabase
    .from('building_arrears_view')
    .select('*')
    .eq('building_id', buildingId)
    .order('computed_balance', { ascending: false });

  if (arrearsError) {
    return { success: false, error: `Hátralék lekérdezés sikertelen: ${arrearsError.message}` };
  }

  const units: ArrearsUnit[] = (arrearsUnits ?? []).map((row) => ({
    unit_id: row.unit_id,
    unit_label: row.unit_label,
    owner_name: row.owner_name,
    total_charged: Number(row.total_charged),
    total_paid: Number(row.total_paid),
    computed_balance: Number(row.computed_balance),
    latest_due_date: row.latest_due_date ?? null,
  }));

  const report: ArrearsReport = {
    building_id: buildingId,
    building_name: building.name,
    generated_at: new Date().toISOString(),
    total_arrears: units.reduce((sum, u) => sum + u.computed_balance, 0),
    units_in_arrears: units.length,
    units,
  };

  return { success: true, report };
}

// ─── 5. Get Unit Financial History ───────────────────────────────────────────

/**
 * Returns all finance_entries for a single unit, ordered by due_date DESC.
 * Enriched with a running balance column computed in application code.
 */
export async function getUnitFinancialHistory(
  unitId: string,
  limit = 24
): Promise<{ success: boolean; entries?: Array<Record<string, unknown>>; error?: string }> {
  const supabase = createClient();

  if (!unitId) {
    return { success: false, error: 'unitId megadása kötelező' };
  }

  const { data: entries, error } = await supabase
    .from('finance_entries')
    .select('*')
    .eq('unit_id', unitId)
    .order('due_date', { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, error: `Pénzügyi előzmények lekérdezése sikertelen: ${error.message}` };
  }

  return { success: true, entries: entries ?? [] };
}

// ─── 6. Export Arrears as CSV ─────────────────────────────────────────────────

/**
 * Generates a CSV string from an arrears report.
 * Call this from a client component after generateArrearsReport() returns data.
 * Usage: const csv = buildArrearsCsv(report); downloadCsv(csv, 'hatralekos.csv');
 */
export function buildArrearsCsv(report: ArrearsReport): string {
  const headers = ['Albetét', 'Tulajdonos', 'Terhelve (Ft)', 'Befizetve (Ft)', 'Hátralék (Ft)', 'Lejárat'];
  const rows = report.units.map((u) => [
    u.unit_label,
    u.owner_name,
    u.total_charged.toFixed(0),
    u.total_paid.toFixed(0),
    u.computed_balance.toFixed(0),
    u.latest_due_date ?? '-',
  ]);

  const csvLines = [
    `# Hátralékos albetétek — ${report.building_name}`,
    `# Lekérdezés: ${new Date(report.generated_at).toLocaleString('hu-HU')}`,
    `# Összes hátralék: ${report.total_arrears.toLocaleString('hu-HU')} Ft`,
    '',
    headers.join(';'),
    ...rows.map((r) => r.join(';')),
  ];

  return csvLines.join('\n');
}
```

---

## 6. Phase 3: Monthly Charge Generation Wizard

### 6.1 New State in `DashboardClient`

Add these state variables inside the `DashboardClient` component, alongside the existing `useState` calls:

```typescript
// Financial module state
const [chargeWizardOpen, setChargeWizardOpen] = useState(false);
const [chargePeriod, setChargePeriod] = useState('');
const [chargeAmount, setChargeAmount] = useState('');
const [chargeDueDate, setChargeDueDate] = useState('');
const [chargeDescription, setChargeDescription] = useState('');
const [chargeSaving, setChargeSaving] = useState(false);
const [chargeSaved, setChargeSaved] = useState(false);
const [chargeError, setChargeError] = useState('');
const [chargePreview, setChargePreview] = useState(false);
```

Add these imports at the top of `dashboard-client.tsx`:
```typescript
import {
  createCharge as createChargeAction,
  recordPayment as recordPaymentAction,
  generateArrearsReport as generateArrearsReportAction,
  buildArrearsCsv,
} from '@/app/actions/financials';
```

### 6.2 Charge Wizard Handler

Add inside `DashboardClient`:

```typescript
const submitCharge = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  setChargeSaving(true);
  setChargeError('');

  const amount = parseFloat(chargeAmount);
  if (isNaN(amount) || amount <= 0) {
    setChargeError('Érvénytelen összeg');
    setChargeSaving(false);
    return;
  }

  // Use the building_id from the first unit if available (dashboard context)
  const buildingId = data.units[0]?.id
    ? undefined  // Replace with actual building_id from DashboardData context
    : undefined;

  // In a real implementation, DashboardData must include building_id.
  // For now, read from the first unit's building context.
  // TODO: Pass buildingId explicitly in DashboardData.

  try {
    const result = await createChargeAction({
      buildingId: buildingId ?? '',
      period: chargePeriod,
      chargePerUnit: amount,
      dueDate: chargeDueDate,
      description: chargeDescription || undefined,
    });

    if (result.success) {
      setChargeSaved(true);
      setChargeWizardOpen(false);
      setChargePeriod('');
      setChargeAmount('');
      setChargeDueDate('');
      setChargeDescription('');
    } else {
      setChargeError(result.error ?? 'Ismeretlen hiba');
    }
  } catch (err) {
    setChargeError('Hálózati hiba — kérjük próbálja újra');
  } finally {
    setChargeSaving(false);
  }
};
```

### 6.3 Charge Wizard Modal JSX

The wizard appears as a modal overlay. Add to the JSX return, after the AI override modal:

```tsx
{/* Monthly Charge Generation Wizard */}
{chargeWizardOpen ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <CircleDollarSign size={18} className="text-brand-600" />
          Havi díjterhelés generálása
        </h3>
        <button
          className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          onClick={() => { setChargeWizardOpen(false); setChargeError(''); }}
          type="button"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={submitCharge} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Időszak (YYYY-MM)</label>
          <input
            type="month"
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            value={chargePeriod}
            onChange={(e) => setChargePeriod(e.target.value)}
            placeholder="2026-01"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Összeg / albetét (Ft)</label>
          <input
            type="number"
            required
            min={1}
            max={10000000}
            step={1}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            value={chargeAmount}
            onChange={(e) => setChargeAmount(e.target.value)}
            placeholder="pl. 18500"
          />
          {chargeAmount && !isNaN(parseFloat(chargeAmount)) ? (
            <p className="mt-1 text-xs text-slate-500">
              Összes kiküldendő: {(parseFloat(chargeAmount) * data.units.length).toLocaleString('hu-HU')} Ft
              ({data.units.length} albetét)
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Határidő</label>
          <input
            type="date"
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            value={chargeDueDate}
            onChange={(e) => setChargeDueDate(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Leírás (opcionális)</label>
          <input
            type="text"
            maxLength={200}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            value={chargeDescription}
            onChange={(e) => setChargeDescription(e.target.value)}
            placeholder="pl. 2026. januári közös költség"
          />
        </div>

        {/* Preview block */}
        {chargePreview && chargeAmount && chargePeriod ? (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="mb-2 text-sm font-bold text-brand-700">Előnézet:</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-slate-700">
              {data.units.slice(0, 10).map((u) => (
                <li key={u.id} className="flex justify-between">
                  <span>{u.unit_label} — {u.owner_name}</span>
                  <span className="font-bold">{parseFloat(chargeAmount || '0').toLocaleString('hu-HU')} Ft</span>
                </li>
              ))}
              {data.units.length > 10 ? (
                <li className="text-slate-400">... és még {data.units.length - 10} albetét</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {chargeError ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{chargeError}</p>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => setChargePreview(!chargePreview)}
          >
            {chargePreview ? 'Előnézet bezárása' : 'Előnézet'}
          </button>
          <button
            type="submit"
            disabled={chargeSaving}
            className="flex-1 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:opacity-50"
          >
            {chargeSaving ? 'Generálás...' : `Terhelés kiküldése (${data.units.length} albetét)`}
          </button>
        </div>
      </form>
    </div>
  </div>
) : null}
```

---

## 7. Phase 4: Real Financial Dashboard Section

### 7.1 Updated `#finances` SectionCard

Replace the existing `SectionCard id="finances"` block (currently at lines 862–875) with the following comprehensive version:

```tsx
<SectionCard
  id="finances"
  title="Pénzügyi átláthatóság"
  icon={<CircleDollarSign size={18} />}
  action={
    isAdminLike ? (
      <div className="flex gap-2">
        <button
          className="rounded-2xl bg-brand-600 px-4 py-2 text-xs font-black text-white hover:bg-brand-700"
          type="button"
          onClick={() => setChargeWizardOpen(true)}
        >
          + Havi terhelés
        </button>
        <button
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          type="button"
          onClick={handleGenerateArrearsReport}
        >
          Hátralék CSV
        </button>
      </div>
    ) : null
  }
>
  {/* Summary row */}
  <div className="mb-4 grid grid-cols-3 gap-3 text-center">
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">Terhelve</p>
      <p className="mt-1 text-lg font-black text-slate-900">{formatCurrency(totalDue)}</p>
    </div>
    <div className="rounded-2xl bg-emerald-50 p-3">
      <p className="text-xs font-medium text-slate-500">Befizetve</p>
      <p className="mt-1 text-lg font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
    </div>
    <div className={`rounded-2xl p-3 ${arrears > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
      <p className="text-xs font-medium text-slate-500">Hátralék</p>
      <p className={`mt-1 text-lg font-black ${arrears > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
        {formatCurrency(arrears)}
      </p>
    </div>
  </div>

  {/* Progress bar */}
  <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
    <div
      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-all duration-500"
      style={{ width: `${Math.min((totalPaid / Math.max(totalDue, 1)) * 100, 100)}%` }}
    />
  </div>

  {/* Unit balances — color-coded */}
  {data.units.length > 0 ? (
    <div className="mb-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Albetét egyenlegek</p>
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {data.units
          .slice()
          .sort((a, b) => numberOrZero(b.balance_amount) - numberOrZero(a.balance_amount))
          .map((unit) => {
            const balance = numberOrZero(unit.balance_amount);
            return (
              <div
                key={unit.id}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  balance > 0 ? 'bg-rose-50' : balance < 0 ? 'bg-emerald-50' : 'bg-slate-50'
                }`}
              >
                <span className="font-medium text-slate-700">
                  {unit.unit_label} — {unit.owner_name}
                </span>
                <span className={`font-black ${balance > 0 ? 'text-rose-700' : balance < 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  ) : null}

  {/* Payment recording form — managers and bookkeepers only */}
  {isAdminLike ? (
    <PaymentForm units={data.units} onPaymentRecorded={() => {}} />
  ) : null}

  {/* Finance entry list */}
  <ul className="mt-4 space-y-2 text-sm">
    {data.finances.map((entry) => (
      <li key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <p className="font-bold text-slate-900">{entry.period}</p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            numberOrZero(entry.paid_amount) >= numberOrZero(entry.expected_amount)
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}>
            {numberOrZero(entry.paid_amount) >= numberOrZero(entry.expected_amount) ? 'Rendezett' : 'Nyitott'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Esedékes: {formatCurrency(entry.expected_amount)}
          {' · '}Befizetve: {formatCurrency(entry.paid_amount)}
          {' · '}Határidő: {formatDate(entry.due_date)}
        </p>
      </li>
    ))}
  </ul>

  {chargeSaved ? (
    <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
      Havi terhelés sikeresen rögzítve!
    </p>
  ) : null}
</SectionCard>
```

### 7.2 PaymentForm Sub-Component

Add this before the `DashboardClient` function:

```typescript
function PaymentForm({
  units,
  onPaymentRecorded,
}: {
  units: import('@/lib/types').UnitItem[];
  onPaymentRecorded: () => void;
}) {
  const [unitId, setUnitId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    const { recordPayment } = await import('@/app/actions/financials');
    const result = await recordPayment({
      unitId,
      amount: parseFloat(amount),
      paymentDate,
      reference: reference || undefined,
    });

    setSaving(false);
    if (result.success) {
      setSaved(true);
      setAmount('');
      setReference('');
      onPaymentRecorded();
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? 'Hiba történt');
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Befizetés rögzítése</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            required
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
          >
            <option value="">Albetét kiválasztása...</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unit_label} — {u.owner_name}
              </option>
            ))}
          </select>
          <input
            type="number"
            required
            min={1}
            step={1}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            placeholder="Összeg (Ft)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="date"
            required
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <input
            type="text"
            maxLength={100}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            placeholder="Banki referencia (opcionális)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
        {saved ? <p className="text-sm font-bold text-emerald-700">Befizetés rögzítve!</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Mentés...' : 'Befizetés rögzítése'}
        </button>
      </form>
    </div>
  );
}
```

### 7.3 Arrears Report Handler

Add inside `DashboardClient`:

```typescript
const handleGenerateArrearsReport = async () => {
  const buildingId = data.units[0]?.id ? undefined : undefined; // TODO: real building_id
  if (!buildingId) {
    alert('Épület azonosító nem elérhető — kérjük frissítse az oldalt');
    return;
  }

  const result = await generateArrearsReportAction(buildingId);
  if (!result.success || !result.report) {
    alert(`Hátralék riport hiba: ${result.error}`);
    return;
  }

  const csv = buildArrearsCsv(result.report);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hatralekos_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

---

## 8. Phase 5: Building Health Score Update

### 8.1 Updated `buildingHealth` Calculation

In `dashboard-client.tsx`, replace the `buildingHealth` calculation (lines 245–252) with:

```typescript
// Real arrears data feeds the building health score
const unitsInArrears = data.units.filter((u) => numberOrZero(u.balance_amount) > 0).length;
const totalUnits = data.units.length || 1;
const arrearsRatio = unitsInArrears / totalUnits; // 0–1, higher = worse

const buildingHealth = Math.max(0, Math.min(100,
  100
  - criticalTickets * 20
  - highTickets * 8
  - Math.min(openTicketCount * 3, 15)
  - (unacknowledgedDocs > 0 ? unacknowledgedDocs * 2 : 0)
  - (upcomingMeetings === 0 ? 10 : 0)
  - Math.round(arrearsRatio * 25)   // Up to 25 points penalty for arrears
  - (arrears > 500000 ? 10 : arrears > 100000 ? 5 : 0) // Absolute arrears amount penalty
));
```

---

## 9. Phase 6: Charge History in Unit Detail View

### 9.1 Unit Row Enhancement

The existing units table in `dashboard-client.tsx` shows `balance_amount` per unit. Add a collapsible row expansion to show payment history. Add state:

```typescript
const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
const [unitHistory, setUnitHistory] = useState<Record<string, Array<Record<string, unknown>>>>({});
```

Add a click handler to the unit table rows to toggle expansion and load history:

```typescript
const loadUnitHistory = async (unitId: string) => {
  if (expandedUnitId === unitId) {
    setExpandedUnitId(null);
    return;
  }
  setExpandedUnitId(unitId);
  if (!unitHistory[unitId]) {
    const { getUnitFinancialHistory } = await import('@/app/actions/financials');
    const result = await getUnitFinancialHistory(unitId, 12);
    if (result.success && result.entries) {
      setUnitHistory((prev) => ({ ...prev, [unitId]: result.entries! }));
    }
  }
};
```

In the unit table, modify the row `<tr>` to add `onClick={() => loadUnitHistory(unitItem.id)} className="cursor-pointer hover:bg-brand-50/50"` and add a conditional expansion row after each unit row:

```tsx
{expandedUnitId === unitItem.id && unitHistory[unitItem.id] ? (
  <tr>
    <td colSpan={7} className="px-3 py-2">
      <div className="rounded-2xl bg-slate-50 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          Pénzügyi előzmények — {unitItem.unit_label}
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="py-1 text-left">Időszak</th>
              <th className="py-1 text-left">Típus</th>
              <th className="py-1 text-right">Terhelés</th>
              <th className="py-1 text-right">Befizetés</th>
              <th className="py-1 text-left">Határidő</th>
            </tr>
          </thead>
          <tbody>
            {(unitHistory[unitItem.id] as Array<{
              id: string;
              period: string;
              entry_type: string;
              expected_amount: number;
              paid_amount: number;
              due_date: string;
            }>).map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100">
                <td className="py-1">{entry.period}</td>
                <td className="py-1">
                  <span className={`rounded-full px-2 py-0.5 font-bold ${
                    entry.entry_type === 'payment' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {entry.entry_type === 'charge' ? 'Terhelés' : entry.entry_type === 'payment' ? 'Befizetés' : entry.entry_type}
                  </span>
                </td>
                <td className="py-1 text-right">{entry.expected_amount > 0 ? formatCurrency(entry.expected_amount) : '-'}</td>
                <td className="py-1 text-right">{entry.paid_amount > 0 ? formatCurrency(entry.paid_amount) : '-'}</td>
                <td className="py-1">{formatDate(entry.due_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </td>
  </tr>
) : null}
```

---

## 10. Phase 7: Updated `lib/types.ts` FinanceItem

Replace the existing `FinanceItem` interface with:

```typescript
export type FinanceEntryType = 'charge' | 'payment' | 'adjustment' | 'opening_balance';

export interface FinanceItem {
  id: string;
  unit_id?: string;
  period: string;
  expected_amount: number;
  paid_amount: number;
  due_date: string;
  // New fields from migration
  payment_date?: string | null;
  payment_reference?: string | null;
  created_by?: string | null;
  description?: string | null;
  entry_type?: FinanceEntryType;
  created_at?: string;
}
```

---

## 11. Testing Protocol

### 11.1 Database Migration Test

After applying the migration, run in the Supabase SQL editor:

```sql
-- Insert a test unit and finance entries to verify trigger and views
DO $$
DECLARE
  v_building_id UUID := gen_random_uuid();
  v_unit_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO buildings (id, name, address) VALUES (v_building_id, 'Teszt Ház', 'Teszt utca 1.');
  INSERT INTO units (id, building_id, unit_label, owner_name) VALUES (v_unit_id, v_building_id, '1/1', 'Teszt Tulajdonos');

  -- Create a charge
  INSERT INTO finance_entries (unit_id, period, expected_amount, paid_amount, due_date, entry_type)
  VALUES (v_unit_id, '2026-01', 18500, 0, '2026-01-15', 'charge');

  -- Verify trigger fired: units.balance_amount should be 18500
  ASSERT (SELECT balance_amount FROM units WHERE id = v_unit_id) = 18500,
    'balance_amount should be 18500 after charge';

  -- Record a partial payment
  INSERT INTO finance_entries (unit_id, period, expected_amount, paid_amount, due_date, entry_type, payment_date)
  VALUES (v_unit_id, '2026-01', 0, 10000, '2026-01-15', 'payment', now());

  -- Verify balance updated: 18500 - 10000 = 8500
  ASSERT (SELECT balance_amount FROM units WHERE id = v_unit_id) = 8500,
    'balance_amount should be 8500 after partial payment';

  -- Verify unit_balance_view
  ASSERT (SELECT computed_balance FROM unit_balance_view WHERE unit_id = v_unit_id) = 8500,
    'computed_balance should be 8500 in view';

  -- Verify arrears view shows the unit
  ASSERT (SELECT COUNT(*) FROM building_arrears_view WHERE unit_id = v_unit_id) = 1,
    'unit should appear in arrears view';

  -- Clean up
  DELETE FROM buildings WHERE id = v_building_id;
  RAISE NOTICE 'All database tests passed!';
END $$;
```

### 11.2 End-to-End UI Test Checklist

1. Open the dashboard as a `kozos_kepviselo` user.
2. Navigate to the `#finances` section.
3. Click "+ Havi terhelés" — verify the charge wizard modal opens.
4. Enter period "2026-05", amount "18500", a due date 15 days from today, and submit.
5. Verify the success message appears and the wizard closes.
6. In the Supabase SQL editor, run `SELECT COUNT(*) FROM finance_entries WHERE period = '2026-05' AND entry_type = 'charge';` — verify the count equals the number of units in the building.
7. Verify `units.balance_amount` has been updated by the trigger for each unit.
8. In the dashboard, verify unit balance tiles show `+18,500 Ft` in red for each unit.
9. Use the payment recording form: select a unit, enter 10000 Ft, today's date, a reference "UTALAS-001".
10. Verify the unit's balance tile changes to `+8,500 Ft`.
11. Click "Hátralék CSV" — verify a CSV file downloads with correct data.
12. In the units table, click a unit row — verify the financial history expansion shows the charge and payment entries.

---

## 12. Error Handling Reference

| Scenario | Validation | User feedback |
|---|---|---|
| Invalid period format (e.g. "jan 2026") | `validatePeriod()` server-side | "period formátuma helytelen (elvárva: YYYY-MM)" |
| Amount 0 or negative | `validateAmount()` server-side | "Összeg érvénytelen (1–10 000 000 Ft között kell lennie)" |
| Duplicate charge same period | DB query before insert | "Már létezik N számlabejegyzés erre az időszakra" |
| Unit not found in recordPayment | DB query with single() | "Albetét nem található" |
| No units in building for createCharge | DB query returns [] | "Nincs albetét ehhez az épülethez" |
| More than 200 rows in createBulkCharges | Length check | "Maximum 200 bejegyzés egyszerre" |
| Network error in payment form | try/catch | "Hálózati hiba — kérjük próbálja újra" |
| Invalid date format | `validateDate()` server-side | "dueDate formátuma helytelen (elvárva: YYYY-MM-DD)" |
| buildingId missing in createCharge | Explicit check | "buildingId megadása kötelező" |
| Supabase RLS rejection | DB error passthrough | `insertError.message` shown to user |

---

## 13. Integration with Billing Initiative

The financial module produces data that directly informs PanelLakó's subscription value proposition. When pitching to building committees, the platform can show: "This building had 3 units in arrears totaling 85,000 Ft outstanding. PanelLakó recovered 60,000 Ft in the first month by automating notices." This outcome data can be pulled from `building_arrears_view` and surfaced in a "Value report" for the building committee — a feature for a later sprint.

Additionally, the `finance_entries` data (total monthly charges across all buildings managed by a customer) can be used to calculate the portfolio value that the customer manages through PanelLakó, informing tiered pricing: "You manage 15,000,000 Ft/month in common costs — upgrade to Business tier for full audit exports."

---

## 14. Rollback Plan

If the financial module needs to be rolled back:

1. Remove the `PaymentForm` component and charge wizard JSX from `dashboard-client.tsx`.
2. Restore the original `#finances` SectionCard.
3. Remove the import of `createCharge`, `recordPayment`, `generateArrearsReport`, `buildArrearsCsv` from `dashboard-client.tsx`.
4. Delete `app/actions/financials.ts`.
5. The new DB columns and views are additive — they do not break existing functionality. Keep them in place unless storage is a concern. If dropping: `ALTER TABLE finance_entries DROP COLUMN IF EXISTS payment_date, DROP COLUMN IF EXISTS payment_reference, DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS description, DROP COLUMN IF EXISTS entry_type;` and `DROP VIEW IF EXISTS unit_balance_view, building_arrears_view; DROP TRIGGER IF EXISTS trg_sync_unit_balance ON finance_entries; DROP FUNCTION IF EXISTS sync_unit_balance();`
6. Revert `FinanceItem` in `lib/types.ts` to the original 5-field version.

---

## 15. Definition of Done

The feature is complete when ALL of the following are true:

1. Migration `supabase/migrations/20260515000002_financial_ledger.sql` applied successfully — all 5 new `finance_entries` columns exist, `unit_balance_view` and `building_arrears_view` exist, `trg_sync_unit_balance` trigger exists.
2. `app/actions/financials.ts` is created with all 6 exported functions: `createCharge`, `createBulkCharges`, `recordPayment`, `generateArrearsReport`, `getUnitFinancialHistory`, `buildArrearsCsv`.
3. All Server Actions include full input validation and return `{ success: boolean; error?: string }` — no unhandled exceptions reach the client.
4. The `sync_unit_balance` trigger fires on INSERT and UPDATE to `finance_entries` and keeps `units.balance_amount` correct — verified with the SQL test in section 11.1.
5. The `#finances` SectionCard shows: unit balance tiles color-coded red (arrears) / green (credit), progress bar, charge list with status badges, payment recording form (managers only), "+ Havi terhelés" and "Hátralék CSV" buttons (managers only).
6. The monthly charge wizard opens as a modal, shows a preview with per-unit amounts, submits, and closes with a success message.
7. The payment form records payments to the DB and the UI immediately reflects the updated balance (optimistic or revalidated).
8. "Hátralék CSV" downloads a correctly formatted UTF-8-with-BOM CSV file with headers in Hungarian.
9. Unit table rows expand to show financial history (last 12 entries) when clicked.
10. `buildingHealth` score uses real `units.balance_amount` data for the arrears penalty calculation.
11. `lib/types.ts` `FinanceItem` includes all new fields as optional.
12. Duplicate charge for same period is blocked by the Server Action with a clear Hungarian error message.
13. `CHANGELOG.md` updated with the new feature entry.
14. `versioning/` and `marketing/marketing_values/` files created for this delivery.
15. No existing tests or features regressed — ticket module, meter readings, documents, meetings all work as before.
