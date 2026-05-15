# Dev Prompt #05 — Multi-Building Dashboard + Building Picker (Scale Architecture Gate)

**Initiative:** Multi-Building Dashboard + Building Picker
**Estimated value unlock:** +€200k–€480k ARR
**Target release:** v4.0.0
**Effort estimate:** 3–4 engineering days
**Risk level:** Medium-High (routing refactor, data scoping change, affects all Server Actions)
**Prerequisite for:** Billing per building, ügynökség (property management agency) tier, multi-tenant onboarding

---

## 1. Business Case

### 1.1 The ügynökség (property management company) market opportunity

Hungary has approximately 2,400 registered property management companies (ingatlankezelő / közös képviseleti irodák) operating under the 2003/CXXXIII társasházi törvény framework. A single ügynökség typically manages between 8 and 25 residential buildings, with larger firms in Budapest managing 30–60+ buildings. The critical insight is this: every one of those buildings is a PanelLakó billing unit. Under the current single-building architecture, an ügynökség that manages 20 buildings would need to maintain 20 separate browser sessions, 20 separate logins, or 20 separate subdomains — none of which exist yet. The result is that the product is structurally locked out of the ügynökség segment, which represents the highest-value, lowest-churn customer profile in the Hungarian PropTech market.

The revenue multiplier is straightforward. A single ügynökség customer paying €29/month per building across a 15-building portfolio generates €435/month or €5,220/year — versus a single közös képviselő (building representative) paying €29/month for one building. Closing 50 ügynökség accounts at a modest 10-building average would generate €174,000/year in ARR from that segment alone. The addressable pool of 2,400 companies represents, at even 5% penetration with 10 buildings average, a €37.4M TAM contribution. The scale architecture gate is therefore not a cosmetic feature; it is the prerequisite for the product's most defensible revenue segment.

### 1.2 Why the current architecture blocks this segment

The current codebase has a fundamental single-building assumption baked into its data layer. `lib/data.ts::getDashboardData()` runs twelve parallel Supabase queries with zero `building_id` filtering. A user with memberships in three buildings would see data from all three buildings combined — or worse, only the data that returns first in a non-deterministic race condition. The `app/page.tsx` root page takes a `?role=xxx` search parameter and renders a dashboard without any concept of "which building am I looking at right now." There is no `/app` picker route, no `/w/[buildingId]` workspace route, and no middleware protection that gates these routes behind authentication. The `memberships` table already exists in the schema and already links `profile_id → building_id → role`, meaning the database is ready for multi-tenancy; only the application layer is missing.

### 1.3 The competitive moat created by solving this

Building pickers with fast workspace switching are table-stakes in modern SaaS (Slack, Linear, Notion, GitHub Org switcher). In the Hungarian PropTech context, this feature is entirely absent from competing products like Társasház Manager and ImmoPROFI because those products were built as desktop-first, single-account tools. A PanelLakó ügynökség user who opens their browser and sees all 20 buildings, with at-a-glance open ticket counts and financial status per building, has a product experience that justifies both a higher price point and a platform-lock effect. Switching away means losing the multi-building overview — creating genuine retention leverage.

### 1.4 Governance alignment

Per `.governance/ui_ux_rules.md` § "Core principle: Workspace identifier in URL" (introduced in v3.16.0): every workspace-scoped route MUST use the path shape `/w/<workspaceId>/<rest>`. The picker is at `/app`. Workspace UUIDs are an explicit exception to the no-PII-in-URL rule because deep-link sharing is a product feature. Picking a workspace MUST be a real `navigate('/w/<id>')` push — never a `replace` — so the browser Back button returns to the picker. This entire initiative is a direct implementation of that governance rule at the routing and data layer.

---

## 2. Current State Analysis

### 2.1 `app/page.tsx` — single-building, no buildingId concept

```typescript
// CURRENT — app/page.tsx
import Dashboard from '@/components/dashboard';
import { Role } from '@/lib/types';

const allowedRoles: Role[] = ['lako', 'tulajdonos', 'kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo'];

export default function HomePage({ searchParams }: { searchParams?: { role?: string } }) {
  const roleParam = searchParams?.role;
  const role = allowedRoles.includes(roleParam as Role) ? (roleParam as Role) : 'lako';
  return <Dashboard role={role} />;
}
```

Problems:
- No buildingId anywhere in this component.
- No authentication check — unauthenticated users reach the dashboard.
- The `?role=xxx` searchParam is a development convenience that bypasses real role resolution from the memberships table.
- `<Dashboard>` calls `getDashboardData(role)` which fetches all data regardless of which building.

### 2.2 `lib/data.ts` — no building_id filtering

Every one of the twelve parallel queries in `getDashboardData()` is missing `.eq('building_id', buildingId)`. For example:

```typescript
supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(12),
supabase.from('units').select('*').limit(12),
supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
```

In a multi-building database this returns a random cross-building mix. This must be fixed by adding `buildingId` as a required parameter and applying `.eq('building_id', buildingId)` to every query that has a `building_id` column (announcements, notifications, tickets, meter_readings, documents, meetings, vendors, knowledge_base_articles). Tables that do not have a direct `building_id` column must be joined or filtered via their parent (e.g., `finance_entries` via `unit_id → units.building_id`).

### 2.3 `middleware.ts` — no route protection

The current middleware only refreshes the Supabase session via `supabase.auth.getUser()`. It does not:
- Redirect unauthenticated users away from `/w/*` routes.
- Redirect unauthenticated users away from `/app`.
- Validate that the `buildingId` in `/w/[buildingId]` belongs to the authenticated user.

### 2.4 `memberships` table — already supports multi-tenancy

The schema already contains:

```sql
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  role text not null check (role in ('lako','tulajdonos','kozos_kepviselo','megbizott','bizottsag','konyvelo')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (profile_id, building_id, role)
);
```

The query pattern to get "all buildings for the current user" is:

```sql
SELECT
  b.id,
  b.name,
  b.address,
  m.role,
  COUNT(DISTINCT u.id) AS unit_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'lezarva') AS open_ticket_count
FROM memberships m
JOIN buildings b ON b.id = m.building_id
LEFT JOIN units u ON u.building_id = b.id
LEFT JOIN tickets t ON t.building_id = b.id AND t.status != 'lezarva'
WHERE m.profile_id = auth.uid()
  AND m.active = true
GROUP BY b.id, b.name, b.address, m.role
ORDER BY b.name;
```

In the Supabase JS client this requires a Postgres function (RPC) or a multi-step query because the JS SDK cannot express multi-table aggregates natively. Use the RPC approach described in Phase 2.

### 2.5 Server Actions — building_id is optional today

`createTicket`, `submitMeterReading`, `createAnnouncement`, and `createDocument` all accept `building_id` as an optional field. In the multi-building world it must be required and validated. The current Server Actions do zero membership validation — any authenticated user can insert data for any building_id.

---

## 3. Pre-conditions

Before starting implementation, verify all of the following:

1. Supabase project is accessible and `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local`.
2. `supabase/schema.sql` has been applied to the remote project (buildings, units, memberships, all other tables exist).
3. At least two test buildings exist in the `buildings` table with known UUIDs.
4. At least one test user (profile) exists with memberships in both test buildings.
5. The `@supabase/ssr` package is installed (`npm ls @supabase/ssr` should show a version).
6. `next/navigation` is available (`useRouter`, `useParams`, `redirect` from `next/navigation`).
7. Tailwind CSS is configured and working.
8. The existing `app/login/page.tsx` magic-link login flow is functional.
9. Run `git fetch origin main && git rebase origin/main` to ensure the branch is up to date before any code changes.
10. Run `npm run build` on the current main to confirm zero TypeScript errors before starting.

---

## 4. Phase 1 — Database Preparation (no schema changes needed, but create the RPC)

The `memberships`, `buildings`, `units`, and `tickets` tables already exist. However, the building picker requires aggregate data (unit count, open ticket count) that cannot be expressed cleanly as a Supabase JS chained query. Create a Postgres function to support this.

### 4.1 Create the `get_my_buildings` RPC

Add this migration to `supabase/migrations/` as `20260515_get_my_buildings_rpc.sql`:

```sql
-- Migration: 20260515_get_my_buildings_rpc.sql
-- Purpose: Return all buildings the current user has an active membership in,
--          with aggregate stats for the building picker UI.

CREATE OR REPLACE FUNCTION public.get_my_buildings()
RETURNS TABLE (
  building_id   uuid,
  building_name text,
  address       text,
  user_role     text,
  unit_count    bigint,
  open_tickets  bigint,
  member_since  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id                                                           AS building_id,
    b.name                                                         AS building_name,
    b.address,
    m.role                                                         AS user_role,
    COUNT(DISTINCT u.id)                                           AS unit_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'lezarva')     AS open_tickets,
    m.created_at                                                   AS member_since
  FROM memberships m
  JOIN buildings b ON b.id = m.building_id
  LEFT JOIN units u ON u.building_id = b.id
  LEFT JOIN tickets t ON t.building_id = b.id
  WHERE m.profile_id = auth.uid()
    AND m.active = true
  GROUP BY b.id, b.name, b.address, m.role, m.created_at
  ORDER BY b.name ASC;
$$;

-- Grant execute to authenticated role only
REVOKE EXECUTE ON FUNCTION public.get_my_buildings() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_my_buildings() TO authenticated;
```

Apply via: `supabase db push` (local dev) or paste into the Supabase SQL editor.

### 4.2 Create the `validate_building_membership` RPC

This is used by Server Components and Server Actions to verify that the authenticated user is a member of a given building before serving data or accepting mutations.

```sql
-- Migration: 20260515_validate_building_membership_rpc.sql

CREATE OR REPLACE FUNCTION public.validate_building_membership(
  _building_id uuid
)
RETURNS TABLE (
  is_member boolean,
  user_role  text,
  unit_id    uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    true              AS is_member,
    m.role            AS user_role,
    m.unit_id
  FROM memberships m
  WHERE m.profile_id   = auth.uid()
    AND m.building_id  = _building_id
    AND m.active       = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_building_membership(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.validate_building_membership(uuid) TO authenticated;
```

### 4.3 Update RLS policies for building-scoped reads

The current RLS policies use `FOR SELECT USING (true)` — a wide-open demo policy. This initiative ships with those policies still in place (for MVP velocity), but adds the infrastructure for tightening. Do NOT change the RLS policies in this PR. Add a comment to `supabase/schema.sql` noting that production hardening of RLS to `memberships`-scoped policies is tracked as a separate security task.

---

## 5. Phase 2 — Building Picker Page (`app/app/page.tsx`)

Create the file `app/app/page.tsx`. This is a Next.js App Router **Server Component** (no `'use client'` directive). It requires authentication. It queries the `get_my_buildings` RPC and renders a card grid.

```typescript
// app/app/page.tsx
// Building Picker — shows all buildings the authenticated user has access to.
// URL: /app
// On card click: navigate to /w/[buildingId] (always push, never replace).

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  Building2,
  TicketCheck,
  Layers3,
  ArrowRight,
  LogOut,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface BuildingPickerRow {
  building_id: string;
  building_name: string;
  address: string;
  user_role: string;
  unit_count: number;
  open_tickets: number;
  member_since: string;
}

const roleLabels: Record<string, string> = {
  lako:              'Lakó',
  tulajdonos:        'Tulajdonos',
  kozos_kepviselo:   'Közös képviselő',
  megbizott:         'Megbízott',
  bizottsag:         'Bizottsági tag',
  konyvelo:          'Könyvelő'
};

const roleBadgeColors: Record<string, string> = {
  lako:              'bg-slate-100 text-slate-700',
  tulajdonos:        'bg-blue-100 text-blue-700',
  kozos_kepviselo:   'bg-indigo-100 text-indigo-700',
  megbizott:         'bg-violet-100 text-violet-700',
  bizottsag:         'bg-purple-100 text-purple-700',
  konyvelo:          'bg-teal-100 text-teal-700'
};

export default async function BuildingPickerPage() {
  const supabase = createClient();

  // 1. Verify authentication — redirect to /login if not authenticated
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch user profile for display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  // 3. Fetch all buildings the user has access to via RPC
  const { data: buildings, error: buildingsError } = await supabase
    .rpc('get_my_buildings')
    .returns<BuildingPickerRow[]>();

  const hasBuildings = Array.isArray(buildings) && buildings.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navigation bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 text-lg">PanelLakó</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 hidden sm:block">
            {profile?.full_name ?? profile?.email ?? user.email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Kilépés</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Épületeim
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            Válassz épületet a kezelőfelület megnyitásához.
          </p>
        </div>

        {buildingsError && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Nem sikerült betölteni az épületlistát: {buildingsError.message}
            </span>
          </div>
        )}

        {!hasBuildings && !buildingsError && (
          <div className="text-center py-20">
            <Building2 className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">
              Még nincs épületed
            </h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              A rendszergazda adhat hozzá épületet a fiókodhoz. Kérjük, vedd fel a kapcsolatot
              az épület közös képviselőjével.
            </p>
          </div>
        )}

        {hasBuildings && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {buildings!.map((b) => (
              <BuildingCard key={b.building_id} building={b} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Building Card ──────────────────────────────────────────────────────────

function BuildingCard({ building }: { building: BuildingPickerRow }) {
  const roleLabel  = roleLabels[building.user_role]  ?? building.user_role;
  const badgeColor = roleBadgeColors[building.user_role] ?? 'bg-slate-100 text-slate-700';
  const hasAlerts  = building.open_tickets > 0;

  return (
    // Use an anchor (<Link>) so the browser renders it as a real navigation push.
    // DO NOT use router.push() here because this is a Server Component.
    // The href generates a history push entry automatically — Back button works correctly.
    <Link
      href={`/w/${building.building_id}`}
      className="group block bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition-all duration-200 relative overflow-hidden"
    >
      {/* Alert indicator dot */}
      {hasAlerts && (
        <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
      )}

      {/* Building icon */}
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
        <Building2 className="w-5 h-5 text-blue-700" />
      </div>

      {/* Building name + address */}
      <h2 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-blue-700 transition-colors">
        {building.building_name}
      </h2>
      <p className="text-slate-500 text-xs mt-0.5 mb-4 line-clamp-2">
        {building.address}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
        <span className="flex items-center gap-1.5">
          <Layers3 className="w-4 h-4 text-slate-400" />
          {building.unit_count} albetét
        </span>
        <span className={`flex items-center gap-1.5 ${hasAlerts ? 'text-red-600 font-medium' : ''}`}>
          <TicketCheck className={`w-4 h-4 ${hasAlerts ? 'text-red-500' : 'text-slate-400'}`} />
          {building.open_tickets} nyitott
        </span>
      </div>

      {/* Role badge + arrow */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeColor}`}>
          {roleLabel}
        </span>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
```

**Key design decisions:**
- The component is a Server Component — no `'use client'` directive. This means no JavaScript is needed for initial render.
- Navigation uses `<Link href={...}>` which always generates a browser history push entry. This satisfies the CLAUDE.md Back button governance rule without any extra code.
- The picker URL is `/app` (not `/`, not `/buildings`). The root `/` may later redirect to `/app` for authenticated users.
- The sign-out uses a POST form action to `/auth/signout` — create that route handler in Phase 6.

---

## 6. Phase 3 — Building-Scoped Dashboard (`app/w/[buildingId]/page.tsx`)

Create the directory `app/w/[buildingId]/` and the file `app/w/[buildingId]/page.tsx`.

```typescript
// app/w/[buildingId]/page.tsx
// Building-scoped dashboard.
// URL: /w/[buildingId]
// Access control: user must have an active membership in this building.

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';
import type { Role } from '@/lib/types';

interface PageProps {
  params: { buildingId: string };
}

interface MembershipValidation {
  is_member: boolean;
  user_role: string;
  unit_id: string | null;
}

// UUID v4 regex for early validation before hitting the database
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedRoles: Role[] = [
  'lako',
  'tulajdonos',
  'kozos_kepviselo',
  'megbizott',
  'bizottsag',
  'konyvelo'
];

export default async function BuildingDashboardPage({ params }: PageProps) {
  const { buildingId } = params;

  // 1. Validate buildingId format before any DB round-trip
  if (!UUID_REGEX.test(buildingId)) {
    notFound();
  }

  const supabase = createClient();

  // 2. Verify authentication
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Redirect to login, preserve the intended destination so the login
    // page can redirect back after authentication.
    redirect(`/login?next=/w/${buildingId}`);
  }

  // 3. Validate building membership — user must have an active membership
  const { data: memberships } = await supabase
    .rpc('validate_building_membership', { _building_id: buildingId })
    .returns<MembershipValidation[]>();

  if (!memberships || memberships.length === 0) {
    // User is authenticated but not a member of this building.
    // Redirect to picker rather than showing a 403 error page.
    // This prevents user confusion when a buildingId is mistyped or a
    // shared link is used by someone who is not a member.
    redirect('/app');
  }

  const membership = memberships[0];
  const role = allowedRoles.includes(membership.user_role as Role)
    ? (membership.user_role as Role)
    : 'lako';

  // 4. Fetch building name for the header
  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', buildingId)
    .single();

  if (!building) {
    // Building was deleted between membership check and this query
    redirect('/app');
  }

  // 5. Fetch all dashboard data scoped to this building
  const data = await getDashboardData(role, buildingId);

  // 6. Inject building context into data for the client component
  const enrichedData = {
    ...data,
    buildingId,
    buildingName: building.name,
    buildingAddress: building.address
  };

  return <DashboardClient data={enrichedData} />;
}

// Generate static params is intentionally omitted — buildings are dynamic
// and UUID-keyed; static generation would be inappropriate here.

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data: building } = await supabase
    .from('buildings')
    .select('name, address')
    .eq('id', params.buildingId)
    .maybeSingle();

  return {
    title: building
      ? `${building.name} — PanelLakó`
      : 'Épület — PanelLakó',
    description: building?.address ?? 'Társasházi kezelőfelület'
  };
}
```

**Error handling matrix for this route:**

| Condition | Response |
|-----------|----------|
| buildingId is not a valid UUID | `notFound()` → 404 page |
| User is not authenticated | `redirect('/login?next=/w/[id]')` |
| User authenticated but not a member | `redirect('/app')` — show picker |
| Building deleted (race condition) | `redirect('/app')` |
| Supabase connection error | Next.js error boundary catches it |

---

## 7. Phase 4 — Update `lib/data.ts`

Replace the entire `getDashboardData` function with a version that accepts and uses `buildingId`. The function signature changes from `getDashboardData(role: Role)` to `getDashboardData(role: Role, buildingId?: string)`. When `buildingId` is present, every query that supports `building_id` filtering MUST apply it.

```typescript
// lib/data.ts — complete replacement

import {
  mockAuditLogs,
  mockCurrentUser,
  mockDocuments,
  mockFinances,
  mockKbArticles,
  mockMeetings,
  mockMeterReadings,
  mockNews,
  mockNotifications,
  mockTickets,
  mockUnits,
  mockVendors,
  mockWorkOrders
} from './mock-data';
import { createClient } from './supabase/server';
import { hasSupabaseConfig } from './supabase';
import { Role } from './types';

export async function getDashboardData(role: Role = 'lako', buildingId?: string) {
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

  if (!hasSupabaseConfig) {
    return fallback;
  }

  const supabase = createClient();

  // Helper: apply building_id filter when buildingId is provided
  const byBuilding = <T extends { eq: (col: string, val: string) => T }>(
    query: T
  ): T => (buildingId ? query.eq('building_id', buildingId) : query);

  const [
    news,
    notifications,
    tickets,
    meterReadings,
    documents,
    meetings,
    units,
    vendors,
    kbArticles,
    auditLogs
  ] = await Promise.all([
    // announcements — has building_id
    byBuilding(
      supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
    ),
    // notifications — has building_id
    byBuilding(
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(8)
    ),
    // tickets — has building_id
    byBuilding(
      supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(12)
    ),
    // meter_readings — has building_id
    byBuilding(
      supabase.from('meter_readings').select('*').order('reading_date', { ascending: false }).limit(8)
    ),
    // documents — has building_id
    byBuilding(
      supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(10)
    ),
    // meetings — has building_id
    byBuilding(
      supabase.from('meetings').select('*').order('scheduled_at', { ascending: false }).limit(6)
    ),
    // units — has building_id
    byBuilding(
      supabase.from('units').select('*').limit(12)
    ),
    // vendors — has building_id
    byBuilding(
      supabase.from('vendors').select('*').limit(8)
    ),
    // knowledge_base_articles — has building_id
    byBuilding(
      supabase.from('knowledge_base_articles').select('*').limit(8)
    ),
    // audit_logs — does NOT have building_id; show all for now
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10)
  ]);

  // finance_entries: does not have building_id directly — join via units
  // When buildingId is provided, fetch unit IDs for this building first, then filter
  let financesData = null;
  if (buildingId) {
    const { data: unitIds } = await supabase
      .from('units')
      .select('id')
      .eq('building_id', buildingId);

    if (unitIds && unitIds.length > 0) {
      const ids = unitIds.map((u: { id: string }) => u.id);
      const { data } = await supabase
        .from('finance_entries')
        .select('*')
        .in('unit_id', ids)
        .order('due_date', { ascending: false })
        .limit(8);
      financesData = data;
    }
  } else {
    const { data } = await supabase
      .from('finance_entries')
      .select('*')
      .order('due_date', { ascending: false })
      .limit(8);
    financesData = data;
  }

  // work_orders: no building_id; load all (already linked via ticket_id)
  const { data: workOrdersData } = await supabase
    .from('work_orders')
    .select('*')
    .order('due_date', { ascending: true })
    .limit(8);

  return {
    source: 'supabase',
    currentUser: { ...mockCurrentUser, role },
    news:          news.data?.length          ? news.data          : mockNews,
    notifications: notifications.data?.length ? notifications.data : mockNotifications,
    tickets:       tickets.data?.length       ? tickets.data       : mockTickets,
    meterReadings: meterReadings.data?.length ? meterReadings.data : mockMeterReadings,
    documents:     documents.data?.length     ? documents.data     : mockDocuments,
    finances:      financesData?.length       ? financesData        : mockFinances,
    meetings:      meetings.data?.length      ? meetings.data      : mockMeetings,
    units:         units.data?.length         ? units.data         : mockUnits,
    vendors:       vendors.data?.length       ? vendors.data       : mockVendors,
    workOrders:    workOrdersData?.length     ? workOrdersData      : mockWorkOrders,
    kbArticles:    kbArticles.data?.length    ? kbArticles.data    : mockKbArticles,
    auditLogs:     auditLogs.data?.length     ? auditLogs.data     : mockAuditLogs
  };
}
```

**Note on the `byBuilding` helper:** The TypeScript generic `T extends { eq: (col: string, val: string) => T }` captures the Supabase query builder's fluent interface. This is a simplification; in practice the return type of `.eq()` is the same query builder instance, so the helper works correctly. If the TypeScript compiler complains about the generic, use `// @ts-ignore` sparingly with a comment explaining the pattern, or cast to `any` locally and re-type the return.

---

## 8. Phase 5 — Update Server Actions to Require and Validate buildingId

All four mutation Server Actions must be updated to:
1. Accept `buildingId` as a **required** string (not optional).
2. Verify the authenticated user has an active membership in that `buildingId` before inserting.
3. Use `revalidatePath('/w/' + buildingId)` instead of `revalidatePath('/')`.

### 8.1 `app/actions/tickets.ts` — updated

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type TicketPriority = 'alacsony' | 'kozepes' | 'magas' | 'kritikus';
export type TicketStatus   = 'uj' | 'folyamatban' | 'varakozik' | 'lezarva';

export interface CreateTicketInput {
  title:        string;
  description:  string;
  location:     string;
  priority:     TicketPriority;
  buildingId:   string;          // NOW REQUIRED
  submitted_by?: string;
  unit_label?:   string;
}

async function assertBuildingMembership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  buildingId: string
): Promise<{ success: true; role: string } | { success: false; error: string }> {
  const { data } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', userId)
    .eq('building_id', buildingId)
    .eq('active', true)
    .single();

  if (!data) {
    return { success: false, error: 'Nincs jogosultságod ehhez az épülethez.' };
  }
  return { success: true, role: data.role };
}

export async function createTicket(input: CreateTicketInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  const memberCheck = await assertBuildingMembership(supabase, user.id, input.buildingId);
  if (!memberCheck.success) {
    return { success: false, error: memberCheck.error };
  }

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title:        input.title,
      description:  input.description,
      location:     input.location,
      priority:     input.priority,
      submitted_by: input.submitted_by ?? user.email ?? 'Névtelen',
      unit_label:   input.unit_label,
      building_id:  input.buildingId,
      reporter_id:  user.id,
      status:       'uj'
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/w/${input.buildingId}`);
  return { success: true, data };
}

export async function updateTicketStatus(
  ticketId:   string,
  status:     TicketStatus,
  buildingId: string
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  const memberCheck = await assertBuildingMembership(supabase, user.id, buildingId);
  if (!memberCheck.success) {
    return { success: false, error: memberCheck.error };
  }

  const { error } = await supabase
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .eq('building_id', buildingId); // scope update to correct building

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/w/${buildingId}`);
  return { success: true };
}
```

### 8.2 `app/actions/meter-readings.ts` — updated

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type MeterType = 'viz' | 'gaz' | 'villany';

export interface SubmitMeterReadingInput {
  meter_type:   MeterType;
  value:        number;
  reading_date: string;
  buildingId:   string;    // NOW REQUIRED
  unit_id?:     string;
  unit_label?:  string;
}

async function assertBuildingMembership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  buildingId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { data } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', userId)
    .eq('building_id', buildingId)
    .eq('active', true)
    .single();
  return data ? { success: true } : { success: false, error: 'Nincs jogosultságod ehhez az épülethez.' };
}

export async function submitMeterReading(input: SubmitMeterReadingInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  const memberCheck = await assertBuildingMembership(supabase, user.id, input.buildingId);
  if (!memberCheck.success) {
    return memberCheck;
  }

  const { data, error } = await supabase
    .from('meter_readings')
    .insert({
      meter_type:      input.meter_type,
      value:           input.value,
      reading_date:    input.reading_date,
      unit_id:         input.unit_id    ?? null,
      unit_label:      input.unit_label ?? null,
      building_id:     input.buildingId,
      reported_by:     user.id
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/w/${input.buildingId}`);
  return { success: true, data };
}
```

### 8.3 `app/actions/announcements.ts` — updated

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface CreateAnnouncementInput {
  title:        string;
  content:      string;
  target_group: string;
  buildingId:   string;    // NOW REQUIRED
  category?:    string;
}

async function assertManagerRole(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  buildingId: string
): Promise<{ success: true; role: string } | { success: false; error: string }> {
  const { data } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', userId)
    .eq('building_id', buildingId)
    .eq('active', true)
    .single();

  if (!data) {
    return { success: false, error: 'Nincs jogosultságod ehhez az épülethez.' };
  }

  const managerRoles = ['kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo'];
  if (!managerRoles.includes(data.role)) {
    return { success: false, error: 'Csak kezelői jogkörrel lehet hirdetményt közzétenni.' };
  }

  return { success: true, role: data.role };
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  const authCheck = await assertManagerRole(supabase, user.id, input.buildingId);
  if (!authCheck.success) {
    return authCheck;
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title:        input.title,
      content:      input.content,
      target_group: input.target_group,
      category:     input.category ?? 'egyeb',
      building_id:  input.buildingId,
      created_by:   user.id
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/w/${input.buildingId}`);
  return { success: true, data };
}
```

### 8.4 `app/actions/documents.ts` — updated

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function acknowledgeDocument(documentId: string, buildingId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  const { error } = await supabase
    .from('document_acknowledgements')
    .upsert(
      {
        document_id: documentId,
        profile_id:  user.id,
        viewed_at:   new Date().toISOString()
      },
      { onConflict: 'document_id,profile_id' }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/w/${buildingId}`);
  return { success: true };
}

export interface CreateDocumentInput {
  title:      string;
  category:   string;
  file_url:   string;
  buildingId: string;   // NOW REQUIRED
  version?:   string;
  visibility?: string;
}

export async function createDocument(input: CreateDocumentInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  // Verify membership before allowing document creation
  const { data: membership } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', user.id)
    .eq('building_id', input.buildingId)
    .eq('active', true)
    .single();

  if (!membership) {
    return { success: false, error: 'Nincs jogosultságod ehhez az épülethez.' };
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      title:       input.title,
      category:    input.category,
      file_url:    input.file_url,
      version:     input.version    ?? '1.0',
      visibility:  input.visibility ?? 'Mindenki',
      building_id: input.buildingId
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/w/${input.buildingId}`);
  return { success: true, data };
}
```

---

## 9. Phase 6 — Sidebar Updates in `components/dashboard-client.tsx`

The `DashboardClient` component receives `data` from the server. The data shape must be extended to include `buildingId`, `buildingName`, and `buildingAddress`. The sidebar must:

1. Show the current building name in the header area (below the logo).
2. Add a "Váltás" (Switch) button that links to `/app`.

### 9.1 Update `DashboardData` type in `dashboard-client.tsx`

Find the `type DashboardData` definition and add three optional fields:

```typescript
type DashboardData = {
  source: string;
  buildingId?:      string;
  buildingName?:    string;
  buildingAddress?: string;
  currentUser: { full_name: string; role: Role };
  // ... rest of fields unchanged
};
```

### 9.2 Update the sidebar JSX

Find the sidebar section that renders the logo and user identity block. Add building context display and a "Switch building" button. The relevant section in the sidebar looks approximately like:

```tsx
{/* REPLACE the logo/header area in the sidebar with this: */}
<div className="px-5 pt-5 pb-4 border-b border-slate-200">
  <div className="flex items-center gap-2 mb-3">
    <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center flex-shrink-0">
      <Building2 className="w-4 h-4 text-white" />
    </div>
    <span className="font-bold text-slate-900 text-base">PanelLakó</span>
  </div>

  {data.buildingName && (
    <div className="mb-3">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">
        Aktuális épület
      </p>
      <p className="text-sm font-semibold text-slate-800 leading-snug truncate">
        {data.buildingName}
      </p>
      {data.buildingAddress && (
        <p className="text-xs text-slate-500 truncate">{data.buildingAddress}</p>
      )}
    </div>
  )}

  {/* Switch building button — always a real Link (push navigation) */}
  <Link
    href="/app"
    className="w-full flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900 font-medium"
  >
    <Layers3 className="w-3.5 h-3.5" />
    Épület váltása
  </Link>
</div>
```

Import `Layers3` from `lucide-react` if not already imported (it is already in the icon list at the top of `dashboard-client.tsx`).

---

## 10. Phase 7 — Middleware Protection

Replace `middleware.ts` entirely with the version below. This adds:
- Authentication-required guard for `/w/*` routes.
- Authentication-required guard for `/app`.
- Redirect to `/login` with a `?next=` parameter for post-login return.

```typescript
// middleware.ts — full replacement

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/w/', '/app'];

// Routes that should redirect authenticated users away (to /app)
const AUTH_ROUTES = ['/login'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // IMPORTANT: Always call getUser() to refresh the session.
  // Never use getSession() in middleware.
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // If user is authenticated and hits a login page, redirect to picker
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/app';
    return NextResponse.redirect(redirectUrl);
  }

  // If user is not authenticated and hits a protected route, redirect to login
  if (
    !user &&
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    // Preserve the intended destination
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
```

---

## 11. Phase 8 — Back Button Compliance

The Back button governance rule (`.governance/ui_ux_rules.md`) requires that:
1. Picking a building from `/app` and navigating to `/w/[buildingId]` is a history PUSH — Back should return to `/app`.
2. Internal tab navigation within `/w/[buildingId]` should also push history entries so each tab is individually back-navigable.

### 11.1 Building picker navigation

The `BuildingCard` in `app/app/page.tsx` already uses `<Link href={...}>` which is a push by default. No router.replace is used. This is correct.

### 11.2 Tab navigation within DashboardClient

In `components/dashboard-client.tsx`, find where `activeSection` state is managed. If it currently uses `useState` only (no URL parameter), add `useSearchParams` and `useRouter` to put the active tab in the URL as `?tab=xxx`:

```typescript
// At the top of DashboardClient, inside the component:
import { useRouter, useSearchParams } from 'next/navigation';

// INSIDE the component function:
const router      = useRouter();
const searchParams = useSearchParams();

// Derive active tab from URL search param, defaulting to 'overview'
const activeTab = searchParams.get('tab') ?? 'overview';

// Tab change handler — use router.push (NOT replace) for back-button compliance
const setActiveTab = (tab: string) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set('tab', tab);
  // router.push is history-push; back button returns to previous tab
  router.push(`?${params.toString()}`);
};
```

This means the URL for a building's tickets tab would be `/w/[buildingId]?tab=tickets` — clean, shareable, and Back-navigable. The buildingId stays in the path (not a search param), satisfying the governance rule.

---

## 12. Phase 9 — Building Switcher in Mobile Header

On mobile, the sidebar is hidden. Add a building context indicator and switcher to the top navigation bar that is rendered on mobile. In `dashboard-client.tsx`, locate the mobile header bar (the area with the hamburger menu button) and add:

```tsx
{/* Mobile header — add between logo and hamburger button */}
{data.buildingName && (
  <Link
    href="/app"
    className="flex items-center gap-1.5 mx-auto text-sm font-medium text-slate-700 hover:text-blue-700 sm:hidden"
  >
    <span className="truncate max-w-[180px]">{data.buildingName}</span>
    <ChevronRight className="w-3 h-3 flex-shrink-0 text-slate-400" />
  </Link>
)}
```

This gives mobile users a tappable breadcrumb that takes them back to the picker via a history push.

---

## 13. Phase 10 — Sign-Out Route Handler

The building picker page uses `<form action="/auth/signout" method="post">`. Create the route handler:

```typescript
// app/auth/signout/route.ts
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function POST(_request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

---

## 14. Testing Protocol

### 14.1 Setup

1. In Supabase Dashboard SQL editor, insert two test buildings:
   ```sql
   INSERT INTO buildings (id, name, address) VALUES
     ('11111111-1111-4111-8111-111111111111', 'Teszt Társasház Alpha', 'Budapest, Fő utca 1.'),
     ('22222222-2222-4222-8222-222222222222', 'Teszt Társasház Beta',  'Budapest, Hátsó köz 2.');
   ```

2. After logging in as a test user, note the user's UUID from Supabase Auth. Insert memberships:
   ```sql
   -- Replace <YOUR_PROFILE_UUID> with the actual UUID
   INSERT INTO memberships (profile_id, building_id, role) VALUES
     ('<YOUR_PROFILE_UUID>', '11111111-1111-4111-8111-111111111111', 'kozos_kepviselo'),
     ('<YOUR_PROFILE_UUID>', '22222222-2222-4222-8222-222222222222', 'lako');
   ```

3. Insert a test ticket in building Alpha:
   ```sql
   INSERT INTO tickets (building_id, title, description, location, priority, status)
   VALUES ('11111111-1111-4111-8111-111111111111', 'Tesztjegy Alpha', 'Leírás', 'Lift', 'kozepes', 'uj');
   ```

### 14.2 Test cases

| Test | Steps | Expected outcome |
|------|-------|-----------------|
| T01: Picker renders | Log in → visit `/app` | Two building cards visible |
| T02: Data scoping | Click Alpha building | Tickets panel shows Alpha's ticket only, not Beta's |
| T03: Back button | Click Alpha → press Back | Returns to `/app` picker |
| T04: Tab back button | On Alpha dashboard, click Tickets tab, then Overview tab → press Back | Returns to Tickets tab |
| T05: Unauthorized access | Log out → paste `/w/11111111-...` in browser | Redirect to `/login?next=/w/...` |
| T06: Wrong building | Log in as user2 (no membership in Alpha) → visit Alpha URL | Redirect to `/app` |
| T07: Invalid UUID | Visit `/w/not-a-uuid` | 404 page |
| T08: Create ticket | On Alpha dashboard, create a ticket | Ticket appears in Alpha only |
| T09: Mobile switcher | On mobile viewport, visit Alpha dashboard | Building name shows in header, tapping it goes to `/app` |
| T10: Login redirect | Log in with `?next=/w/Alpha-UUID` in URL | After login, redirect to Alpha dashboard |

---

## 15. Error Handling

### 15.1 Invalid buildingId format

`UUID_REGEX.test(buildingId)` at the top of the page component catches non-UUID path segments. Returns `notFound()` which renders the Next.js 404 page. No database round-trip.

### 15.2 Unauthorized access

`validate_building_membership` returns no rows → redirect to `/app`. This is intentionally soft — do not show a "403 Forbidden" error page because the user may have simply typed a wrong URL. Redirecting to the picker is friendlier and reveals no information about whether the building exists.

### 15.3 Building deleted while user is navigated away

If a building is deleted while the user's session has it in history, the `buildings` query after membership validation will return null → `redirect('/app')`. The user is returned safely to the picker which will no longer show the deleted building.

### 15.4 RPC function not found

If `get_my_buildings` RPC has not been deployed, the building picker will receive an error. The error state renders a visible alert with the Supabase error message. Do not silently fail — the error must be visible so the operator knows to run the migration.

### 15.5 Supabase connection timeout

Next.js App Router server components time out after 60 seconds by default. Large buildings with thousands of records should not be an issue given the `.limit()` caps, but add a note that connection pooling (PgBouncer) should be enabled in Supabase for production to handle concurrent requests from ügynökség users managing many buildings simultaneously.

---

## 16. Integration with Billing

When the billing initiative (separate PR) is implemented, each building will have a `tenant_subscriptions` row linked to `building_id`. The building picker card must eventually show subscription tier via `WorkspaceTierBadge` per `.governance/ui_ux_rules.md` § "Core principle: Workspace tier persistence". In this PR, add a TODO comment in `BuildingCard`:

```tsx
{/* TODO(billing): show WorkspaceTierBadge here once tenant_subscriptions table exists */}
{/* Per ui_ux_rules.md § "Core principle: Workspace tier persistence" */}
```

Do not implement billing in this PR. The card layout already has space for a badge between the role pill and the arrow chevron.

---

## 17. Rollback Plan

If this PR needs to be reverted:

1. `git revert <commit-hash>` — this restores all changed files.
2. The two new SQL functions (`get_my_buildings`, `validate_building_membership`) in Supabase are additive and non-destructive. They can remain deployed without causing any issues even if the application layer is reverted.
3. The `buildings`, `units`, `memberships` table changes are all additive (new routes, new RPC, no table drops or column removals). Zero risk of data loss on rollback.
4. The middleware change is the highest-risk item: if the authentication redirect loop is broken, all users will be unable to access the app. Test the middleware change in a staging environment first.

---

## 18. Definition of Done

A PR implementing this initiative is complete when ALL of the following are true:

- [ ] `app/app/page.tsx` exists and renders the building picker for authenticated users
- [ ] `app/app/page.tsx` redirects unauthenticated visitors to `/login`
- [ ] `app/w/[buildingId]/page.tsx` exists and passes `buildingId` to `getDashboardData`
- [ ] `app/w/[buildingId]/page.tsx` returns 404 for non-UUID path segments
- [ ] `app/w/[buildingId]/page.tsx` redirects non-members to `/app`
- [ ] `lib/data.ts::getDashboardData` accepts `buildingId` and applies `.eq('building_id', buildingId)` to all 9 queries that support it
- [ ] `app/actions/tickets.ts` requires `buildingId` and validates membership before insert
- [ ] `app/actions/meter-readings.ts` requires `buildingId` and validates membership before insert
- [ ] `app/actions/announcements.ts` requires `buildingId`, validates membership, and checks manager role before insert
- [ ] `app/actions/documents.ts` requires `buildingId` and validates membership before insert
- [ ] `middleware.ts` protects `/w/*` and `/app` routes, redirecting unauthenticated users to `/login?next=...`
- [ ] Sidebar shows current building name and "Épület váltása" link to `/app`
- [ ] Mobile header shows current building name as a tappable link to `/app`
- [ ] Browser Back button from `/w/[id]` returns to `/app`
- [ ] Browser Back button from a tab within `/w/[id]` returns to the previous tab
- [ ] `app/auth/signout/route.ts` exists and handles POST sign-out
- [ ] `supabase/migrations/20260515_get_my_buildings_rpc.sql` exists
- [ ] `supabase/migrations/20260515_validate_building_membership_rpc.sql` exists
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] All 10 manual test cases (T01–T10) pass
- [ ] `CHANGELOG.md` entry added under the next available version number
- [ ] `versioning/DDMMYYNNN_v4.0.0_multi-building-dashboard.md` created
- [ ] `marketing/marketing_values/YYYYMMDD_v4.0.0_multi-building-dashboard_marketing_value.md` created

---

## 19. Files Changed Summary

| File | Change type |
|------|-------------|
| `app/app/page.tsx` | CREATE — building picker server component |
| `app/w/[buildingId]/page.tsx` | CREATE — building-scoped dashboard server component |
| `app/auth/signout/route.ts` | CREATE — sign-out POST handler |
| `lib/data.ts` | MODIFY — add buildingId parameter, apply to all queries |
| `middleware.ts` | MODIFY — add authentication guards for /w/* and /app |
| `app/actions/tickets.ts` | MODIFY — require buildingId, add membership validation |
| `app/actions/meter-readings.ts` | MODIFY — require buildingId, add membership validation |
| `app/actions/announcements.ts` | MODIFY — require buildingId, add role check |
| `app/actions/documents.ts` | MODIFY — require buildingId, add membership validation |
| `components/dashboard-client.tsx` | MODIFY — add building header, switcher link, tab URL state |
| `supabase/migrations/20260515_get_my_buildings_rpc.sql` | CREATE — RPC for picker |
| `supabase/migrations/20260515_validate_building_membership_rpc.sql` | CREATE — membership validation RPC |

Total: 5 new files, 7 modified files.
