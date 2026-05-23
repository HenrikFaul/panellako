# Initiative 05 — Financial Ledger (Double-Entry Common Cost Accounting)
## Közös Költség Könyvelés + Hátralék Aging | Value: +€220k–€480k

---

## 1. Initiative Header

**Title:** Full Financial Ledger — Double-Entry Common Cost Accounting

**Value Range:** +€220k–€480k (mission-critical workflow = low churn + €3–5k accountant persona value)

**Business Case:**

PanelLakó has a comprehensive financial module: `app/actions/finance.ts` implements `createCharge()`, `recordPayment()`, `getArrearsReport()`, and `getUnitFinanceHistory()`. The `finance_entries` table tracks charges and payments per unit. The `building_arrears_view` view computes per-unit balances. The `units` table has a `balance_amount` column updated on payment.

What is missing is the **accountant-grade reporting layer**: (1) a `generateKozosKoltsegKimutatas()` function that produces a legally-required annual statement PDF in Lakástörvény format, (2) a hátralék aging report (30/60/90/90+ days buckets), (3) a könyvelői CSV export compatible with standard HU accounting software (e.g., Társ-Ház, Sage 50), and (4) period closing that locks historical entries and prevents retroactive modification.

Hungarian társasházi accounting is governed by the Lakástörvény (2003. évi CXXXIII.) §24, which requires every building to maintain proper financial records and provide each unit owner with an annual statement showing all charges and payments. Currently, building managers generate these statements manually in Excel — a 3–5 hour job per building during annual reconciliation.

The accountant persona (`app/funkciok/konyveloknek/page.tsx` exists) is a distinct buyer: accounting firms managing 10–50 buildings pay more for a tool that replaces their Excel workflow entirely. This initiative makes PanelLakó sticky for that persona and directly defends against churn.

---

## 2. Codebase Context

**Current relevant file tree (verified):**

```
/home/user/panellako/
├── app/
│   ├── actions/
│   │   └── finance.ts                ← FULL IMPLEMENTATION EXISTS:
│   │                                    createCharge() — bulk charge all units
│   │                                    recordPayment() — per unit payment
│   │                                    getArrearsReport() — reads building_arrears_view
│   │                                    getUnitFinanceHistory() — per unit entries
│   └── w/
│       └── [buildingId]/
│           └── (subpages)/           ← Financial views live here (exact filenames TBD)
├── lib/
│   ├── supabase/server.ts
│   └── (no finance-specific libs)
├── supabase/
│   └── migrations/
│       └── (finance_entries table implied by finance.ts usage of it)
└── components/
    └── (no finance chart components yet)
```

**Current `finance.ts` state:**
- `createCharge()`: validates period (YYYY-MM), checks for duplicates, bulk-inserts charge rows for all units. Table: `finance_entries`.
- `recordPayment()`: inserts a payment row into `finance_entries`, updates `units.balance_amount` (via a separate query).
- `getArrearsReport()`: reads `building_arrears_view` — returns `ArrearsUnit[]` with `total_charged`, `total_paid`, `computed_balance`.
- `getUnitFinanceHistory()`: returns last 50 `finance_entries` rows for a unit.

**What is missing from `finance.ts`:**
- `generateKozosKoltsegKimutatas(buildingId, year)` — annual PDF statement per unit
- `getArrearsAgingReport(buildingId)` — 30/60/90/90+ day buckets
- `exportLedgerCsv(buildingId, year, month?)` — CSV export
- `closePeriod(buildingId, period)` — lock historical entries
- `getMonthlyLedgerSummary(buildingId, year)` — month-by-month chart data

**Missing database objects:**
- `period_closings` table (to lock historical periods)
- `finance_entries.is_locked` column (set when period is closed)
- `hátralék_aging_view` — groups arrears by age bucket

---

## 3. Pre-conditions

**Environment variables required:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**npm packages (already installed):**
```
@react-pdf/renderer: ^4.5.1           ← For annual statement PDF
```

**Migrations to apply:**
- `20260523_040_finance_period_closings.sql`
- `20260523_041_finance_aging_view.sql`

---

## 4. Phase 1: Database Changes

### Migration: `20260523_040_finance_period_closings.sql`

```sql
-- Period closing infrastructure for finance_entries.
-- A closed period prevents retroactive modification of charge/payment records.

ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.finance_entries.is_locked IS
  'Set to TRUE when the period is closed. Prevents modification of historical entries.';

-- Trigger: prevent UPDATE/DELETE of locked entries
CREATE OR REPLACE FUNCTION public.prevent_locked_entry_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_locked = TRUE AND TG_OP != 'SELECT' THEN
    IF NOT (TG_OP = 'UPDATE' AND NEW.is_locked = FALSE) THEN
      RAISE EXCEPTION 'Zárolt időszak bejegyzései nem módosíthatók. (Locked period entry mutation rejected)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_mutation ON public.finance_entries;
CREATE TRIGGER trg_prevent_locked_mutation
  BEFORE UPDATE OR DELETE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_entry_mutation();

-- Period closings table
CREATE TABLE IF NOT EXISTS public.period_closings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id   UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  period        TEXT NOT NULL,              -- YYYY-MM format
  closed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_count   INTEGER NOT NULL DEFAULT 0,
  total_charged NUMERIC NOT NULL DEFAULT 0,
  total_paid    NUMERIC NOT NULL DEFAULT 0,
  notes         TEXT,
  CONSTRAINT uq_period_closing UNIQUE (building_id, period)
);

ALTER TABLE public.period_closings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manager read period closings" ON public.period_closings;
CREATE POLICY "Manager read period closings" ON public.period_closings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.building_id = period_closings.building_id
        AND m.profile_id = auth.uid()
        AND m.active = true
        AND m.role IN ('kozos_kepviselo', 'megbizott', 'konyvelo')
    )
  );

-- Hátralék aging view
CREATE OR REPLACE VIEW public.hatralek_aging_view AS
SELECT
  u.building_id,
  u.id                                                         AS unit_id,
  u.unit_label,
  u.owner_name,
  -- Running balance (negative = debt)
  COALESCE(
    (SELECT SUM(CASE WHEN fe.entry_type = 'charge' THEN fe.expected_amount
                     WHEN fe.entry_type = 'payment' THEN -fe.paid_amount
                     ELSE 0 END)
     FROM public.finance_entries fe
     WHERE fe.unit_id = u.id),
    0
  ) AS balance_huf,
  -- Oldest unpaid charge date
  (SELECT MIN(fe.due_date)
   FROM public.finance_entries fe
   WHERE fe.unit_id = u.id
     AND fe.entry_type = 'charge'
     AND fe.expected_amount > fe.paid_amount) AS oldest_unpaid_date,
  -- Days overdue (from oldest unpaid charge)
  CASE
    WHEN (SELECT MIN(fe.due_date) FROM public.finance_entries fe
          WHERE fe.unit_id = u.id AND fe.entry_type = 'charge'
            AND fe.expected_amount > fe.paid_amount) IS NOT NULL
    THEN EXTRACT(DAY FROM (NOW() - (
      SELECT MIN(fe.due_date) FROM public.finance_entries fe
      WHERE fe.unit_id = u.id AND fe.entry_type = 'charge'
        AND fe.expected_amount > fe.paid_amount
    )))::INTEGER
    ELSE NULL
  END AS days_overdue,
  -- Aging buckets
  CASE
    WHEN (SELECT SUM(fe.expected_amount - fe.paid_amount)
          FROM public.finance_entries fe
          WHERE fe.unit_id = u.id AND fe.entry_type = 'charge'
            AND fe.due_date > NOW() - INTERVAL '30 days') > 0
    THEN 'current'
    WHEN (SELECT MIN(fe.due_date) FROM public.finance_entries fe
          WHERE fe.unit_id = u.id AND fe.entry_type = 'charge'
            AND fe.expected_amount > fe.paid_amount) > NOW() - INTERVAL '30 days'
    THEN '0_30_days'
    WHEN (SELECT MIN(fe.due_date) FROM public.finance_entries fe
          WHERE fe.unit_id = u.id AND fe.entry_type = 'charge'
            AND fe.expected_amount > fe.paid_amount) > NOW() - INTERVAL '60 days'
    THEN '31_60_days'
    WHEN (SELECT MIN(fe.due_date) FROM public.finance_entries fe
          WHERE fe.unit_id = u.id AND fe.entry_type = 'charge'
            AND fe.expected_amount > fe.paid_amount) > NOW() - INTERVAL '90 days'
    THEN '61_90_days'
    ELSE '90_plus_days'
  END AS aging_bucket
FROM public.units u
WHERE EXISTS (
  SELECT 1 FROM public.finance_entries fe
  WHERE fe.unit_id = u.id
    AND fe.entry_type = 'charge'
    AND fe.expected_amount > fe.paid_amount
);
```

---

## 5. Phase 2: Server-side

### Extended: `app/actions/finance.ts` — New exports

Add these functions to the existing `finance.ts` file:

```typescript
// ─── 5. Get arrears aging report ──────────────────────────────────────────────

export interface AgingBucket {
  bucket: 'current' | '0_30_days' | '31_60_days' | '61_90_days' | '90_plus_days';
  label: string;
  count: number;
  total_huf: number;
}

export interface ArrearsAgingReport {
  building_id: string;
  building_name: string;
  generated_at: string;
  units: Array<{
    unit_id: string;
    unit_label: string;
    owner_name: string;
    balance_huf: number;
    days_overdue: number | null;
    aging_bucket: string;
    oldest_unpaid_date: string | null;
  }>;
  buckets: AgingBucket[];
  total_arrears_huf: number;
}

export async function getArrearsAgingReport(buildingId: string): Promise<{
  success: boolean;
  report?: ArrearsAgingReport;
  error?: string;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const [buildingRes, agingRes] = await Promise.all([
    supabase.from('buildings').select('id, name').eq('id', buildingId).single(),
    supabase.from('hatralek_aging_view').select('*').eq('building_id', buildingId),
  ]);

  if (buildingRes.error || !buildingRes.data) {
    return { success: false, error: 'Épület nem található' };
  }
  if (agingRes.error) {
    return { success: false, error: `Hátralék lekérdezése sikertelen: ${agingRes.error.message}` };
  }

  const units = (agingRes.data ?? []).filter(u => Math.abs(u.balance_huf) > 0);

  const BUCKET_LABELS: Record<string, string> = {
    current: 'Aktuális',
    '0_30_days': '0–30 nap',
    '31_60_days': '31–60 nap',
    '61_90_days': '61–90 nap',
    '90_plus_days': '90+ nap',
  };

  const bucketMap: Record<string, AgingBucket> = {};
  for (const unit of units) {
    const b = unit.aging_bucket ?? 'current';
    if (!bucketMap[b]) {
      bucketMap[b] = { bucket: b as AgingBucket['bucket'], label: BUCKET_LABELS[b] ?? b, count: 0, total_huf: 0 };
    }
    bucketMap[b].count++;
    bucketMap[b].total_huf += Math.abs(unit.balance_huf ?? 0);
  }

  return {
    success: true,
    report: {
      building_id: buildingId,
      building_name: buildingRes.data.name,
      generated_at: new Date().toISOString(),
      units: units.map(u => ({
        unit_id: u.unit_id,
        unit_label: u.unit_label,
        owner_name: u.owner_name,
        balance_huf: u.balance_huf,
        days_overdue: u.days_overdue,
        aging_bucket: u.aging_bucket,
        oldest_unpaid_date: u.oldest_unpaid_date,
      })),
      buckets: Object.values(bucketMap).sort((a, b) => {
        const order = ['current', '0_30_days', '31_60_days', '61_90_days', '90_plus_days'];
        return order.indexOf(a.bucket) - order.indexOf(b.bucket);
      }),
      total_arrears_huf: units.reduce((acc, u) => acc + Math.abs(u.balance_huf ?? 0), 0),
    },
  };
}

// ─── 6. Close a billing period ────────────────────────────────────────────────

export async function closePeriod(buildingId: string, period: string, notes?: string): Promise<{
  success: boolean;
  locked_count?: number;
  error?: string;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };
  if (!validatePeriod(period)) return { success: false, error: 'Érvénytelen időszak formátum' };

  // Check if already closed
  const { data: existing } = await supabase
    .from('period_closings')
    .select('id')
    .eq('building_id', buildingId)
    .eq('period', period)
    .maybeSingle();

  if (existing) return { success: false, error: `Az időszak (${period}) már zárva van.` };

  // Get entries to lock
  const { data: entries, error: fetchErr } = await supabase
    .from('finance_entries')
    .select('id, entry_type, expected_amount, paid_amount')
    .eq('period', period)
    .in('unit_id',
      (await supabase.from('units').select('id').eq('building_id', buildingId)).data?.map(u => u.id) ?? []
    );

  if (fetchErr) return { success: false, error: fetchErr.message };

  const entryIds = (entries ?? []).map(e => e.id);
  if (entryIds.length === 0) return { success: false, error: 'Nincs bejegyzés ebben az időszakban.' };

  const totalCharged = (entries ?? [])
    .filter(e => e.entry_type === 'charge')
    .reduce((s, e) => s + e.expected_amount, 0);
  const totalPaid = (entries ?? [])
    .filter(e => e.entry_type === 'payment')
    .reduce((s, e) => s + e.paid_amount, 0);

  // Lock entries
  const { error: lockErr } = await supabase
    .from('finance_entries')
    .update({ is_locked: true, locked_at: new Date().toISOString(), locked_by: user.id })
    .in('id', entryIds);

  if (lockErr) return { success: false, error: `Zárolás sikertelen: ${lockErr.message}` };

  // Create period_closings record
  await supabase.from('period_closings').insert({
    building_id: buildingId,
    period,
    closed_by: user.id,
    entry_count: entryIds.length,
    total_charged: totalCharged,
    total_paid: totalPaid,
    notes: notes ?? null,
  });

  revalidatePath('/');
  return { success: true, locked_count: entryIds.length };
}

// ─── 7. Export ledger as CSV ──────────────────────────────────────────────────

export async function exportLedgerCsv(buildingId: string, year: number): Promise<{
  success: boolean;
  csv?: string;
  error?: string;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const startPeriod = `${year}-01`;
  const endPeriod = `${year}-12`;

  const { data: entries, error } = await supabase
    .from('finance_entries')
    .select('*, units(unit_label, owner_name)')
    .eq('units.building_id', buildingId)
    .gte('period', startPeriod)
    .lte('period', endPeriod)
    .order('period', { ascending: true });

  if (error) return { success: false, error: error.message };

  const rows = (entries ?? []).map(e => {
    const unit = e.units as { unit_label: string; owner_name: string } | null;
    return [
      e.period,
      unit?.unit_label ?? '',
      unit?.owner_name ?? '',
      e.entry_type === 'charge' ? 'Terhelés' : 'Befizetés',
      e.expected_amount ?? 0,
      e.paid_amount ?? 0,
      e.description ?? '',
      e.due_date ?? '',
      e.payment_date ?? '',
      e.is_locked ? 'Zárolt' : 'Nyitott',
    ].join(';');
  });

  const header = 'Időszak;Albetét;Tulajdonos;Típus;Terhelés (Ft);Befizetés (Ft);Megjegyzés;Esedékesség;Befizetés dátuma;Állapot';
  const csv = [header, ...rows].join('\n');

  return { success: true, csv };
}

// ─── 8. Get monthly ledger summary for chart ──────────────────────────────────

export interface MonthlyLedgerRow {
  period: string;
  total_charged: number;
  total_paid: number;
  net_balance: number;
}

export async function getMonthlyLedgerSummary(buildingId: string, year: number): Promise<{
  success: boolean;
  rows?: MonthlyLedgerRow[];
  error?: string;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const { data, error } = await supabase
    .rpc('get_monthly_ledger_summary', { p_building_id: buildingId, p_year: year });

  if (error) return { success: false, error: error.message };
  return { success: true, rows: data ?? [] };
}
```

### New API route: `app/api/finance/export-csv/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exportLedgerCsv } from '@/app/actions/finance';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const buildingId = searchParams.get('buildingId');
  const year = parseInt(searchParams.get('year') ?? '0');

  if (!buildingId || !year) {
    return NextResponse.json({ error: 'buildingId and year required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { success, csv, error } = await exportLedgerCsv(buildingId, year);
  if (!success || !csv) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const filename = `panellako-fokoenyv-${buildingId.slice(0, 8)}-${year}.csv`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

---

## 6. Phase 3: Client-side

### New component: `components/finance-aging-chart.tsx`

```typescript
'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import type { AgingBucket } from '@/app/actions/finance';

interface Props { buckets: AgingBucket[] }

const BUCKET_COLORS: Record<string, string> = {
  current: '#86efac',
  '0_30_days': '#fde68a',
  '31_60_days': '#fbbf24',
  '61_90_days': '#f87171',
  '90_plus_days': '#dc2626',
};

function formatHuf(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  return `${Math.round(n / 1_000)} e`;
}

export default function FinanceAgingChart({ buckets }: Props) {
  const data = buckets.map(b => ({
    name: b.label,
    'Összeg (eFt)': Math.round(b.total_huf / 1_000),
    count: b.count,
    bucket: b.bucket,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(value: number, name: string) => [`${value} eFt`, 'Hátralék összege']}
          labelFormatter={(label) => {
            const d = data.find(d => d.name === label);
            return `${label} (${d?.count ?? 0} albetét)`;
          }}
          contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
        />
        <Bar dataKey="Összeg (eFt)" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="count"
            position="top"
            formatter={(v: number) => `${v} albetét`}
            style={{ fontSize: 9, fill: '#64748b' }}
          />
          {data.map((entry, i) => (
            <Cell key={i} fill={BUCKET_COLORS[entry.bucket] ?? '#e2e8f0'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### CSV Export download button (add to financial dashboard page)

```typescript
// Add to the financial dashboard client component:
function CsvExportButton({ buildingId, year }: { buildingId: string; year: number }) {
  const handleExport = () => {
    const url = `/api/finance/export-csv?buildingId=${buildingId}&year=${year}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `panellako-fokoenyv-${year}.csv`;
    a.click();
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      <span>⬇</span> CSV export ({year})
    </button>
  );
}
```

---

## 7. Phase 4: Configuration

**New Supabase RPC for monthly summary:**

Add to migration `20260523_040`:
```sql
CREATE OR REPLACE FUNCTION public.get_monthly_ledger_summary(
  p_building_id UUID,
  p_year INTEGER
)
RETURNS TABLE (
  period        TEXT,
  total_charged NUMERIC,
  total_paid    NUMERIC,
  net_balance   NUMERIC
)
LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT
    fe.period,
    SUM(CASE WHEN fe.entry_type = 'charge' THEN fe.expected_amount ELSE 0 END) AS total_charged,
    SUM(CASE WHEN fe.entry_type = 'payment' THEN fe.paid_amount ELSE 0 END) AS total_paid,
    SUM(CASE WHEN fe.entry_type = 'charge' THEN fe.expected_amount ELSE -fe.paid_amount END) AS net_balance
  FROM public.finance_entries fe
  JOIN public.units u ON u.id = fe.unit_id
  WHERE u.building_id = p_building_id
    AND fe.period LIKE (p_year::TEXT || '-%')
  GROUP BY fe.period
  ORDER BY fe.period;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_ledger_summary(UUID, INTEGER) TO authenticated;
```

---

## 8. Phase 5: Testing

### Manual Smoke Test

1. **Aging report:** Create test finance entries with `due_date` = 45 days ago, `expected_amount = 10000`, `paid_amount = 0`. Call `getArrearsAgingReport(buildingId)`. Verify the unit appears in the `31_60_days` bucket.

2. **Period closing:** Call `closePeriod(buildingId, '2026-05')`. Verify `period_closings` row created. Attempt to update a locked entry — expect `RAISE EXCEPTION`.

3. **CSV export:** Navigate to `/api/finance/export-csv?buildingId={id}&year=2026`. Browser should download a `.csv` file with semicolon-delimited rows.

4. **Monthly summary:** Call `getMonthlyLedgerSummary(buildingId, 2026)`. Verify months with charges return non-zero `total_charged`.

5. **Duplicate period close:** Try to close `2026-05` again after it's closed — expect `{ success: false, error: 'Az időszak... már zárva van.' }`.

### Automated Test Cases

```typescript
describe('getArrearsAgingReport', () => {
  it('groups units by correct aging bucket', () => {
    const units = [
      { days_overdue: 15, balance_huf: -5000, aging_bucket: '0_30_days' },
      { days_overdue: 95, balance_huf: -12000, aging_bucket: '90_plus_days' },
    ];
    const buckets = buildBuckets(units);
    expect(buckets['0_30_days'].count).toBe(1);
    expect(buckets['90_plus_days'].total_huf).toBe(12000);
  });

  it('total_arrears_huf is correct sum', () => {
    expect(report.total_arrears_huf).toBe(17000);
  });

  it('returns empty report for building with no arrears', () => {
    expect(emptyReport.units.length).toBe(0);
  });

  it('handles NULL days_overdue gracefully', () => {
    expect(() => buildBuckets([{ days_overdue: null, balance_huf: -100, aging_bucket: null }])).not.toThrow();
  });
});
```

---

## 9. Error Handling & Edge Cases

**Scenario 1: Period close attempted on partially-paid period**
`closePeriod()` does not require all entries to be fully paid. It locks whatever entries exist for that period and records `total_charged` vs `total_paid`. Outstanding balances remain in the aging report.

**Scenario 2: Locked entry mutation (retroactive correction needed)**
The trigger `prevent_locked_entry_mutation` throws a database-level exception. To correct a locked entry, a manager must first unlock the period by deleting the `period_closings` row (superadmin action only). Add a `superadmin_unlock_period(buildingId, period)` function gated behind the superadmin role.

**Scenario 3: CSV export for building with 500+ entries**
The `exportLedgerCsv()` function fetches all entries for the year and serializes them in memory. For 500 entries at ~200 bytes each, the CSV is ~100KB — well within Vercel response limits. For >5,000 entries, add streaming via `ReadableStream`.

**Scenario 4: `hatralek_aging_view` returns stale data**
The view is a regular SQL VIEW (not materialized) — it always returns live data. No refresh needed.

**Scenario 5: `units.building_id` mismatch in CSV export join**
The CSV export uses `.eq('units.building_id', buildingId)` which is a Supabase filter on a join — this filters only `units` rows, not the parent `finance_entries`. This may include entries for units that were transferred. Verify the join filter works correctly with PostgREST syntax in testing.

**Scenario 6: `get_monthly_ledger_summary` returns no rows**
The function uses `LIKE (p_year::TEXT || '-%')` which is correct for the `YYYY-MM` period format. If no entries exist for the year, an empty array is returned — the chart renders an empty state.

---

## 10. Integration with Other Initiatives

- **Initiative 01 (Portfolio Dashboard):** The `total_arrears_huf` in the portfolio view already reads from `finance_entries` via `building_arrears_view`. When the aging report is added, extend the portfolio summary to include `units_90_plus_days_overdue` count for a critical escalation signal.

- **Initiative 04 (Assembly Protocol):** The `documents` table used by the protocol generator is the same table where `generateKozosKoltsegKimutatas()` should insert the annual statement PDFs. Both use `category = 'kozgyulesi_jkv'` and `category = 'koltsegvetés'` respectively.

- **Initiative 06 (Email Suite):** Add `sendTypedEmail('arrears_notice', [owner.email], { balance_huf, days_overdue })` in the aging report action when a unit crosses 60+ days overdue — automated felszólítólevél generation.

---

## 11. Rollback Plan

1. **Remove new `finance.ts` exports:** Delete `getArrearsAgingReport()`, `closePeriod()`, `exportLedgerCsv()`, `getMonthlyLedgerSummary()`. The original 4 functions are unchanged.

2. **Delete new files:** Remove `app/api/finance/export-csv/route.ts` and `components/finance-aging-chart.tsx`.

3. **Revert migration:**
   ```sql
   DROP TRIGGER IF EXISTS trg_prevent_locked_mutation ON public.finance_entries;
   DROP FUNCTION IF EXISTS public.prevent_locked_entry_mutation();
   DROP TABLE IF EXISTS public.period_closings;
   DROP VIEW IF EXISTS public.hatralek_aging_view;
   DROP FUNCTION IF EXISTS public.get_monthly_ledger_summary(UUID, INTEGER);
   ALTER TABLE public.finance_entries
     DROP COLUMN IF EXISTS is_locked,
     DROP COLUMN IF EXISTS locked_at,
     DROP COLUMN IF EXISTS locked_by;
   ```

---

## 12. Definition of Done

- [ ] Migration `20260523_040_finance_period_closings.sql` applied — `is_locked` column, `period_closings` table, and `hatralek_aging_view` exist
- [ ] `get_monthly_ledger_summary()` RPC callable from SQL editor
- [ ] `getArrearsAgingReport()` returns correct 5-bucket aging structure
- [ ] `closePeriod()` locks entries and creates `period_closings` row
- [ ] Mutation of locked entry raises DB exception (verified in psql)
- [ ] `exportLedgerCsv()` returns valid CSV with correct columns and semicolon delimiter
- [ ] `/api/finance/export-csv` route triggers file download with correct filename
- [ ] `components/finance-aging-chart.tsx` renders 5-bar Recharts chart with color-coded buckets
- [ ] CSV export correctly encodes Hungarian characters (UTF-8 BOM for Excel compatibility)
- [ ] Duplicate period close returns descriptive error message
- [ ] TypeScript compiles cleanly for all new files
- [ ] `getMonthlyLedgerSummary()` returns correct `total_charged` and `total_paid` per month
- [ ] Manual smoke test: aging report correctly places a 45-day-overdue unit in `31_60_days` bucket
