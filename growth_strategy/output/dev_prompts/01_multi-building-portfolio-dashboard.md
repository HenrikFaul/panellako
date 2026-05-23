# Initiative 01 — Multi-Building Portfolio Dashboard
## Property Manager Scale Architecture | Value: +€450k–€900k

---

## 1. Initiative Header

**Title:** Multi-Building Portfolio Dashboard — Property Manager Scale Architecture

**Value Range:** +€450k–€900k (at 15–25× ARR multiple)

**Business Case:**

PanelLakó's highest-leverage growth move is fully unlocking the professional property manager (közös képviselő / ügynökség) segment. Workspace routing already follows `/w/[buildingId]` and the building picker at `/app` shows individual buildings via the `get_my_buildings()` RPC — but there is no aggregate, cross-building intelligence layer. A property manager with 12 buildings must navigate to each `/w/[buildingId]` individually to check arrears, ticket queues, or upcoming assemblies. This is the primary reason professional managers hesitate to migrate from their existing (Excel + WhatsApp) workflows.

Hungary has approximately 2,400 licensed property management companies (ingatlankezelő ügynökségek), each managing an average of 8–25 buildings. A single ügynökség signing up under an Enterprise tier represents €5,760–€36,000 ARR at Pro pricing (€3/unit/month × 40 units average × 12 months × 8–25 buildings). No competitor — OnlineHáz, Domus24, or Társasházkezelő 2000 — offers genuine cross-building portfolio analytics.

The existing `app/app/page.tsx` already fetches buildings via `supabase.rpc('get_my_buildings')` and renders a `BuildingCard` grid. The missing piece is a portfolio-level aggregate view: total open tickets across all buildings, aggregate arrears, upcoming assembly countdown, and a visual cross-building comparison. This initiative adds that layer without altering the existing building picker UX.

Implementing this unlocks the Enterprise pricing tier and is the #1 upsell trigger for managers who have already onboarded 3+ buildings. It also differentiates PanelLakó from every Hungarian competitor in one sprint.

---

## 2. Codebase Context

**Current relevant file tree (verified with `find`):**

```
/home/user/panellako/
├── app/
│   ├── app/
│   │   └── page.tsx                          ← Building picker (EXISTS — shows BuildingCard grid)
│   ├── w/
│   │   └── [buildingId]/
│   │       ├── page.tsx                      ← Building dashboard entry
│   │       └── (subpages)/
│   │           ├── layout.tsx
│   │           ├── kornyezet/page.tsx
│   │           ├── kozlekedes/page.tsx
│   │           └── ... (8 other subpages)
│   └── actions/
│       ├── finance.ts                        ← getArrearsReport() — per-building
│       ├── tickets.ts                        ← createTicket(), updateTicketStatus()
│       └── meetings.ts                       ← createMeeting(), closeMeeting()
├── components/
│   ├── workspace-shell.tsx                   ← EXISTS
│   └── workspace-sidebar.tsx                 ← EXISTS — navigation scaffolding
├── lib/
│   └── supabase/
│       └── server.ts                         ← createClient() with @supabase/ssr
└── supabase/
    └── migrations/
        └── 20260516_billing.sql              ← subscriptions table
```

**What is currently missing:**
- `app/app/portfolio/page.tsx` — portfolio aggregate page (DOES NOT EXIST)
- `app/actions/portfolio.ts` — `getPortfolioSummary()` Server Action (DOES NOT EXIST)
- `components/portfolio-stats-bar.tsx` — Recharts cross-building chart (DOES NOT EXIST)
- `portfolio_role` column on `memberships` table (DOES NOT EXIST)
- 'Portfolio Overview' / 'Back to all buildings' breadcrumb in `workspace-sidebar.tsx`

**Current state of `app/app/page.tsx`:** Fully functional building picker that calls `supabase.rpc('get_my_buildings')` and renders a three-column `BuildingCard` grid with unit count, open tickets, and role badge. It navigates to `/w/[buildingId]` on click.

**Current `get_my_buildings()` RPC output shape:**
```typescript
interface BuildingPickerRow {
  building_id:   string;
  building_name: string;
  address:       string;
  user_role:     string;
  unit_count:    number;
  open_tickets:  number;
  member_since:  string;
}
```

The RPC does not currently return arrears totals, next assembly date, or subscription status — these need to be added either to the RPC or fetched in a separate `getPortfolioSummary()` Server Action.

---

## 3. Pre-conditions

**Environment variables required (already present in most cases):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**npm packages to install:**
```bash
# Recharts is very likely already installed — check first:
grep recharts /home/user/panellako/package.json
# If not installed:
npm install recharts
```

**Database migrations to apply:**
1. `20260523_001_portfolio_role.sql` — add `portfolio_role` column to `memberships`
2. `20260523_002_get_portfolio_summary_rpc.sql` — create `get_portfolio_summary()` RPC

**External services:** None (this initiative uses only existing Supabase tables).

---

## 4. Phase 1: Database Changes

### Migration A: `20260523_001_portfolio_role.sql`

```sql
-- Add portfolio_role to memberships to distinguish agency managers from individual owners.
-- Apply via Supabase SQL editor or supabase db push.

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS portfolio_role TEXT
    DEFAULT 'individual'
    CHECK (portfolio_role IN ('individual', 'agency_manager', 'agency_staff'));

COMMENT ON COLUMN public.memberships.portfolio_role IS
  'Distinguishes individual building managers from agency staff managing multiple buildings. '
  'agency_manager = head of an ügynökség; agency_staff = employee of that ügynökség. '
  'Used to drive Enterprise tier upsell prompts and portfolio dashboard access.';

-- Index for fast portfolio queries
CREATE INDEX IF NOT EXISTS idx_memberships_portfolio_role
  ON public.memberships (profile_id, portfolio_role)
  WHERE active = true;
```

### Migration B: `20260523_002_get_portfolio_summary_rpc.sql`

```sql
-- RPC: get_portfolio_summary()
-- Returns one row per building the calling user manages, enriched with:
--   - open ticket count
--   - total arrears (HUF)
--   - next assembly date
--   - subscription status
-- Security: SECURITY DEFINER + auth.uid() filter — respects RLS intent.

CREATE OR REPLACE FUNCTION public.get_portfolio_summary()
RETURNS TABLE (
  building_id           UUID,
  building_name         TEXT,
  address               TEXT,
  user_role             TEXT,
  portfolio_role        TEXT,
  unit_count            BIGINT,
  open_tickets          BIGINT,
  total_arrears_huf     NUMERIC,
  next_assembly_at      TIMESTAMPTZ,
  subscription_status   TEXT,
  subscription_plan     TEXT,
  trial_end             TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id                                    AS building_id,
    b.name                                  AS building_name,
    b.address                               AS address,
    m.role                                  AS user_role,
    m.portfolio_role                        AS portfolio_role,

    -- Unit count
    (SELECT COUNT(*) FROM public.units u WHERE u.building_id = b.id) AS unit_count,

    -- Open tickets (status NOT in closed states)
    (SELECT COUNT(*) FROM public.tickets t
     WHERE t.building_id = b.id
       AND t.status NOT IN ('lezarva', 'visszavonva')) AS open_tickets,

    -- Total arrears: sum of (expected_amount - paid_amount) for entries where balance < 0
    COALESCE(
      (SELECT SUM(fe.expected_amount - fe.paid_amount)
       FROM public.finance_entries fe
       JOIN public.units u ON u.id = fe.unit_id
       WHERE u.building_id = b.id
         AND fe.entry_type = 'charge'
         AND fe.expected_amount > fe.paid_amount),
      0
    ) AS total_arrears_huf,

    -- Next assembly
    (SELECT MIN(mt.scheduled_at)
     FROM public.meetings mt
     WHERE mt.building_id = b.id
       AND mt.scheduled_at > NOW()
       AND mt.status IN ('tervezett', 'aktiv')) AS next_assembly_at,

    -- Subscription
    COALESCE(s.status, 'no_subscription')   AS subscription_status,
    COALESCE(s.plan, 'none')                AS subscription_plan,
    s.trial_end                              AS trial_end

  FROM public.memberships m
  JOIN public.buildings b ON b.id = m.building_id
  LEFT JOIN public.subscriptions s ON s.building_id = b.id
  WHERE m.profile_id = auth.uid()
    AND m.active = true
    AND m.role IN ('kozos_kepviselo', 'megbizott', 'konyvelo')
  ORDER BY b.name;
$$;

-- Grant to authenticated users only (SECURITY DEFINER does auth internally)
REVOKE ALL ON FUNCTION public.get_portfolio_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_portfolio_summary() TO authenticated;

COMMENT ON FUNCTION public.get_portfolio_summary() IS
  'Portfolio summary RPC for PanelLakó dashboard. Returns one row per managed building '
  'with aggregate KPIs: open tickets, arrears, next assembly, subscription status. '
  'Callable only by authenticated users; filters to caller''s buildings via auth.uid().';
```

---

## 5. Phase 2: Server-side

### `app/actions/portfolio.ts` — New Server Action

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortfolioBuilding {
  building_id:          string;
  building_name:        string;
  address:              string;
  user_role:            string;
  portfolio_role:       string;
  unit_count:           number;
  open_tickets:         number;
  total_arrears_huf:    number;
  next_assembly_at:     string | null;
  subscription_status:  string;
  subscription_plan:    string;
  trial_end:            string | null;
}

export interface PortfolioSummary {
  buildings:              PortfolioBuilding[];
  total_buildings:        number;
  total_units:            number;
  total_open_tickets:     number;
  total_arrears_huf:      number;
  buildings_in_arrears:   number;
  assemblies_next_30_days: number;
  trials_expiring_soon:   number;
}

// ─── getPortfolioSummary ──────────────────────────────────────────────────────

export async function getPortfolioSummary(): Promise<{
  success: boolean;
  data?: PortfolioSummary;
  error?: string;
}> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  const { data, error } = await supabase.rpc('get_portfolio_summary');

  if (error) {
    console.error('[getPortfolioSummary] RPC error:', error);
    return { success: false, error: `Portfólió lekérdezése sikertelen: ${error.message}` };
  }

  const buildings = (data ?? []) as PortfolioBuilding[];

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const summary: PortfolioSummary = {
    buildings,
    total_buildings:        buildings.length,
    total_units:            buildings.reduce((acc, b) => acc + b.unit_count, 0),
    total_open_tickets:     buildings.reduce((acc, b) => acc + b.open_tickets, 0),
    total_arrears_huf:      buildings.reduce((acc, b) => acc + (b.total_arrears_huf ?? 0), 0),
    buildings_in_arrears:   buildings.filter((b) => b.total_arrears_huf > 0).length,
    assemblies_next_30_days: buildings.filter((b) => {
      if (!b.next_assembly_at) return false;
      const d = new Date(b.next_assembly_at);
      return d >= now && d <= thirtyDaysFromNow;
    }).length,
    trials_expiring_soon: buildings.filter((b) => {
      if (b.subscription_status !== 'trialing' || !b.trial_end) return false;
      return new Date(b.trial_end) <= sevenDaysFromNow;
    }).length,
  };

  return { success: true, data: summary };
}

// ─── setPortfolioRole ─────────────────────────────────────────────────────────

export async function setPortfolioRole(
  buildingId: string,
  role: 'individual' | 'agency_manager' | 'agency_staff'
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve.' };

  const { error } = await supabase
    .from('memberships')
    .update({ portfolio_role: role })
    .eq('building_id', buildingId)
    .eq('profile_id', user.id)
    .eq('active', true);

  if (error) return { success: false, error: error.message };

  revalidatePath('/app');
  return { success: true };
}
```

---

## 6. Phase 3: Client-side

### New file: `app/app/portfolio/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPortfolioSummary } from '@/app/actions/portfolio';
import PortfolioStatsBar from '@/components/portfolio-stats-bar';
import {
  AlertTriangle, Building2, CalendarDays, ChevronRight,
  CircleDollarSign, TicketCheck, TrendingUp
} from 'lucide-react';

export const metadata = { title: 'Portfólió áttekintés — PanelLakó', robots: { index: false } };

// Format HUF amounts
function formatHuf(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M Ft`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} eFt`;
  return `${amount} Ft`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

export default async function PortfolioDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { success, data: summary, error } = await getPortfolioSummary();

  if (!success || !summary) {
    return (
      <div className="p-8 text-center text-red-600">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
        <p>Portfólió betöltése sikertelen: {error}</p>
        <Link href="/app" className="mt-4 inline-block text-brand-600 underline">
          Vissza az épületlistához
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <nav className="mb-1 flex items-center gap-2 text-xs text-slate-400">
              <Link href="/app" className="hover:text-brand-600">Épületek</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-700">Portfólió áttekintés</span>
            </nav>
            <h1 className="text-xl font-bold text-slate-900">Portfólió áttekintés</h1>
            <p className="text-sm text-slate-500">
              {summary.total_buildings} épület · {summary.total_units} albetét
            </p>
          </div>
          <Link
            href="/app"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            ← Épületlista
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* KPI Strip */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            icon={<TicketCheck className="h-5 w-5 text-orange-500" />}
            label="Nyitott ügyek"
            value={summary.total_open_tickets.toString()}
            sub="összes épületben"
            urgent={summary.total_open_tickets > 10}
          />
          <KpiCard
            icon={<CircleDollarSign className="h-5 w-5 text-red-500" />}
            label="Összes hátralék"
            value={formatHuf(summary.total_arrears_huf)}
            sub={`${summary.buildings_in_arrears} épületben`}
            urgent={summary.total_arrears_huf > 100_000}
          />
          <KpiCard
            icon={<CalendarDays className="h-5 w-5 text-blue-500" />}
            label="Közgyűlés 30 napon belül"
            value={summary.assemblies_next_30_days.toString()}
            sub="közelgő közgyűlés"
            urgent={false}
          />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
            label="Lejáró próba"
            value={summary.trials_expiring_soon.toString()}
            sub="7 napon belül"
            urgent={summary.trials_expiring_soon > 0}
          />
        </div>

        {/* Cross-building chart */}
        {summary.buildings.length > 1 && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-base font-bold text-slate-800">Épületek összehasonlítása</h2>
            <PortfolioStatsBar buildings={summary.buildings} />
          </div>
        )}

        {/* Building rows */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-bold text-slate-800">Épületek részletei</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {summary.buildings.map((b) => (
              <Link
                key={b.building_id}
                href={`/w/${b.building_id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{b.building_name}</p>
                  <p className="text-xs text-slate-400 truncate">{b.address}</p>
                </div>
                <div className="flex gap-6 text-sm text-slate-600">
                  <span className={b.open_tickets > 0 ? 'font-bold text-orange-600' : ''}>
                    {b.open_tickets} ügy
                  </span>
                  <span className={b.total_arrears_huf > 0 ? 'font-bold text-red-600' : ''}>
                    {formatHuf(b.total_arrears_huf)} hátralék
                  </span>
                  <span className="text-slate-400">
                    {b.next_assembly_at ? formatDate(b.next_assembly_at) : '—'}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, urgent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  urgent: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${urgent ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className={`text-2xl font-black ${urgent ? 'text-red-700' : 'text-slate-900'}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}
```

### New file: `components/portfolio-stats-bar.tsx`

```typescript
'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import type { PortfolioBuilding } from '@/app/actions/portfolio';

interface Props {
  buildings: PortfolioBuilding[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export default function PortfolioStatsBar({ buildings }: Props) {
  const ticketData = buildings.map((b, i) => ({
    name: b.building_name.length > 14 ? b.building_name.slice(0, 14) + '…' : b.building_name,
    'Nyitott ügyek': b.open_tickets,
    fill: COLORS[i % COLORS.length],
  }));

  const arrearsData = buildings.map((b, i) => ({
    name: b.building_name.length > 14 ? b.building_name.slice(0, 14) + '…' : b.building_name,
    'Hátralék (eFt)': Math.round((b.total_arrears_huf ?? 0) / 1000),
    fill: (b.total_arrears_huf ?? 0) > 0 ? '#ef4444' : '#86efac',
  }));

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Nyitott ügyek épületenként
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ticketData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              formatter={(value: number) => [`${value} ügy`, 'Nyitott ügyek']}
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="Nyitott ügyek" radius={[4, 4, 0, 0]}>
              {ticketData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Hátralék épületenként (eFt)
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={arrearsData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              formatter={(value: number) => [`${value} eFt`, 'Hátralék']}
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="Hátralék (eFt)" radius={[4, 4, 0, 0]}>
              {arrearsData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### Edit: `app/app/page.tsx` — Add portfolio link to header

In the existing `BuildingPickerPage` component, add a "Portfólió áttekintés" link to the header bar next to the sign-out button. The specific diff is to insert this Link component before the `<form action="/auth/signout"...>` element:

```typescript
// Add to the header "flex items-center gap-3" div, before the signout form:
<Link
  href="/app/portfolio"
  className="hidden items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition-all hover:bg-brand-100 sm:flex"
>
  <Layers3 className="h-3.5 w-3.5" />
  Portfólió
</Link>
```

---

## 7. Phase 4: Configuration

**No new environment variables required.** All existing variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are sufficient.

**No `next.config.mjs` changes required.**

**Recharts dependency check:**
```bash
# In /home/user/panellako:
grep '"recharts"' package.json
# If not found:
npm install recharts
```

**Middleware:** The existing `middleware.ts` already protects `/app` routes:
```typescript
const PROTECTED_PREFIXES = ['/w/', '/app'];
```
The new `/app/portfolio` route is automatically protected.

---

## 8. Phase 5: Testing

### Manual Smoke Test

1. **Setup:** Log in as a user who is `kozos_kepviselo` on at least 2 buildings. Verify with `SELECT * FROM memberships WHERE profile_id = auth.uid()`.

2. **Test picker has Portfolio link:** Navigate to `/app`. Confirm a "Portfólió" button appears in the header.

3. **Test portfolio page loads:** Click "Portfólió" → `/app/portfolio`. Page should load with 4 KPI cards (Nyitott ügyek, Összes hátralék, Közgyűlés 30 napon belül, Lejáró próba).

4. **Test empty state:** If user has only 1 building, the chart section should be hidden (buildings.length > 1 guard).

5. **Test building row navigation:** Click a building row in the table → should navigate to `/w/[buildingId]` (not a redirect, a real push).

6. **Test KPI urgency colors:** Create a test ticket for a building, reload portfolio → the open_tickets count should increase and turn orange when > 0.

7. **Test arrears calculation:** Insert a test `finance_entries` row with `expected_amount = 10000, paid_amount = 5000` → hátralék should show 5,000 Ft.

8. **Test unauthenticated access:** Log out, navigate to `/app/portfolio` → should redirect to `/login?next=/app/portfolio`.

### Automated Test Cases

```typescript
// __tests__/portfolio.test.ts

describe('getPortfolioSummary', () => {
  it('returns summary with correct total_open_tickets', async () => {
    // Mock RPC response with 2 buildings, 3 + 7 open tickets
    const mockBuildings = [
      { building_id: 'b1', open_tickets: 3, total_arrears_huf: 0, next_assembly_at: null, ... },
      { building_id: 'b2', open_tickets: 7, total_arrears_huf: 50000, next_assembly_at: '2026-06-15T10:00:00Z', ... },
    ];
    // summary.total_open_tickets should be 10
    expect(summarize(mockBuildings).total_open_tickets).toBe(10);
  });

  it('returns buildings_in_arrears correctly', () => {
    // Only b2 has arrears > 0
    expect(summarize(mockBuildings).buildings_in_arrears).toBe(1);
  });

  it('counts assemblies_next_30_days within window', () => {
    // b2 has assembly in 22 days → should be counted
    expect(summarize(mockBuildings).assemblies_next_30_days).toBe(1);
  });

  it('identifies trials_expiring_soon within 7 days', () => {
    const buildings = [{ subscription_status: 'trialing', trial_end: 'TOMORROW_ISO', ... }];
    expect(summarize(buildings).trials_expiring_soon).toBe(1);
  });

  it('handles empty buildings array without throwing', () => {
    expect(() => summarize([])).not.toThrow();
    expect(summarize([]).total_buildings).toBe(0);
  });
});
```

---

## 9. Error Handling & Edge Cases

**Scenario 1: RPC returns error (DB down or function missing)**
The `getPortfolioSummary()` action catches the Supabase error and returns `{ success: false, error: message }`. The `PortfolioDashboardPage` renders a red `AlertTriangle` panel with the error message and a "Vissza az épületlistához" link. No crash.

**Scenario 2: User has zero managed buildings (new user / resident-only)**
The RPC returns an empty array (WHERE clause filters to manager roles). `summary.total_buildings === 0`. The portfolio page renders all KPI cards as "0" with no chart and no building rows table. A "Nincs kezelői jogosultsága épülethez" empty state text should be added.

**Scenario 3: User is authenticated but has stale JWT / expired session**
`supabase.auth.getUser()` hits the Supabase auth server (not cache). If the token is expired, it returns `{ user: null }`. The `if (!user) redirect('/login')` guard fires correctly.

**Scenario 4: `next_assembly_at` is NULL for all buildings**
The `assemblies_next_30_days` counter correctly returns 0 via the `if (!b.next_assembly_at) return false` guard.

**Scenario 5: `total_arrears_huf` has NULL from RPC (no finance_entries)**
The `COALESCE(... , 0)` in the RPC SQL ensures NULL is never returned. The TypeScript `??  0` in the summary calculation adds a second safety layer.

**Scenario 6: Recharts hydration mismatch on SSR**
`PortfolioStatsBar` is a `'use client'` component. The parent `portfolio/page.tsx` is a Server Component that imports it — Next.js correctly handles this boundary. No SSR/client mismatch occurs.

**Scenario 7: Large portfolio (50+ buildings)**
The building rows table will scroll vertically. No pagination is implemented in Phase 1 — add `LIMIT 100` to the RPC if needed. The Recharts chart will compress bar labels — the `name.slice(0,14)` truncation prevents label overflow.

**Scenario 8: Portfolio role migration fails midway**
`ADD COLUMN IF NOT EXISTS` is idempotent — the migration can be re-run safely without data loss.

---

## 10. Integration with Other Initiatives

- **Initiative 02 (Stripe Lifecycle):** The `subscription_status` and `trial_end` columns exposed by `get_portfolio_summary()` directly feed the "Lejáró próba" KPI card. When Initiative 02 is implemented, the `trials_expiring_soon` count becomes actionable — clicking it can navigate to `/billing?building={id}`.

- **Initiative 05 (Financial Ledger):** The `total_arrears_huf` in `get_portfolio_summary()` currently reads from `finance_entries`. When Initiative 05 introduces the `financial_transactions` double-entry table, update the RPC SQL to read from the new `unit_ledger_view` instead.

- **Initiative 08 (SSR Auth Hardening):** This initiative already uses `supabase.auth.getUser()` (not `getSession()`) in both the Server Action and the page component — it is fully compliant with Initiative 08 requirements.

- **Initiative 10 (PostHog Analytics):** Add `trackEvent('portfolio_dashboard_viewed', { building_count: summary.total_buildings })` to the `PortfolioDashboardPage` to track Enterprise-intent users.

---

## 11. Rollback Plan

1. **Revert application code:** Delete `app/app/portfolio/page.tsx`, `app/actions/portfolio.ts`, `components/portfolio-stats-bar.tsx`. Remove the Portfolio link added to `app/app/page.tsx`.

2. **Revert DB migrations:**
   ```sql
   -- Revert 20260523_002
   DROP FUNCTION IF EXISTS public.get_portfolio_summary();
   
   -- Revert 20260523_001 (safe only if portfolio_role column has no critical data)
   ALTER TABLE public.memberships DROP COLUMN IF EXISTS portfolio_role;
   DROP INDEX IF EXISTS idx_memberships_portfolio_role;
   ```

3. **Verify:** Navigate to `/app` → building picker still works. Navigate to `/app/portfolio` → 404 (expected after rollback). No regressions to building-scoped pages.

---

## 12. Definition of Done

- [ ] Migration `20260523_001_portfolio_role.sql` applied — `portfolio_role` column exists in `memberships`
- [ ] Migration `20260523_002_get_portfolio_summary_rpc.sql` applied — `get_portfolio_summary()` function callable from Supabase SQL editor
- [ ] `app/actions/portfolio.ts` created — `getPortfolioSummary()` returns correct aggregate counts
- [ ] `app/app/portfolio/page.tsx` created — renders at `/app/portfolio` without errors
- [ ] 4 KPI cards render correct values against test data
- [ ] `components/portfolio-stats-bar.tsx` renders Recharts BarChart when buildings.length > 1
- [ ] "Portfólió" link added to `app/app/page.tsx` header
- [ ] Unauthenticated access to `/app/portfolio` redirects to `/login`
- [ ] User with zero managed buildings sees empty state (no crash)
- [ ] Building row click navigates to `/w/[buildingId]` via real push (back button returns to portfolio)
- [ ] Total arrears correctly sums to 0 when no overdue finance entries exist
- [ ] `trials_expiring_soon` count is accurate within 7-day window
- [ ] TypeScript compiles cleanly: `npx tsc --noEmit` shows zero errors for new files
- [ ] Mobile viewport (375px): KPI cards stack to 2×2 grid, building rows scroll correctly
