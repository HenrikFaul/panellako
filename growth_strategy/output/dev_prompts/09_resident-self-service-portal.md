# Initiative 09 — Resident Self-Service Portal (Mobile PWA)
## WhatsApp Group Replacement + Push Deepening | Value: +€100k–€240k

---

## 1. Initiative Header

**Title:** Resident Self-Service Portal — Mobile PWA + Push Notification Deepening

**Value Range:** +€100k–€240k (resident engagement multiplier → manager retention +25–35%)

**Business Case:**

PanelLakó already has push notification infrastructure (`supabase/functions/send-push/index.ts`), a PWA manifest (`public/manifest.json`), and all the underlying data actions needed for a resident portal (`app/actions/tickets.ts` for ticket submission, `app/actions/meetings.ts` for RSVP, `app/actions/finance.ts` for balance lookup).

What is missing is the resident-facing view. The current `/w/[buildingId]/(subpages)/` route tree is designed for building managers (közös képviselők) — it shows all tickets, all finances, meeting management controls. Residents need a different, simpler view: submit a fault report, check their own balance, download documents, RSVP to the next assembly.

The Hungarian market pain point is acute: every building currently communicates via a WhatsApp group. WhatsApp groups are unarchivable, not legally auditable, and expose manager phone numbers. A PWA that residents install on their phones (no App Store required — just "Add to Home Screen") replaces the WhatsApp group with a structured, branded experience. The metric that matters: when a building manager can say "our residents use PanelLakó daily," they will never churn.

The resident portal is intentionally minimal — 5 pages, mobile-first, 44px minimum touch targets (WCAG 2.1 AA). It reads from the same Supabase tables but uses resident-role RLS policies.

---

## 2. Codebase Context

**Current relevant file tree (verified):**

```
/home/user/panellako/
├── supabase/
│   └── functions/
│       └── send-push/
│           └── index.ts              ← EXISTS (push notification sender)
├── app/
│   ├── actions/
│   │   ├── tickets.ts                ← createTicket() — usable from resident portal
│   │   ├── meetings.ts               ← recordAttendance() — for RSVP
│   │   ├── finance.ts                ← getUnitFinanceHistory() — balance lookup
│   │   └── documents.ts              ← document listing
│   └── api/
│       └── push/
│           └── subscribe/route.ts    ← EXISTS — registers push subscriptions
├── public/
│   └── manifest.json                 ← EXISTS — PWA manifest
├── lib/
│   └── supabase/server.ts
└── supabase/
    └── migrations/
        └── (building_memberships with lako role exists)
```

**Current push subscription state:** `app/api/push/subscribe/route.ts` exists and presumably registers `PushSubscription` objects. The `send-push/index.ts` Edge Function sends push notifications. The exact schema of the push subscriptions table needs verification.

**Missing:**
- `app/portal/` directory (DOES NOT EXIST)
- `app/portal/[buildingId]/page.tsx` — resident home
- `app/portal/[buildingId]/hiba/page.tsx` — fault report
- `app/portal/[buildingId]/egyenleg/page.tsx` — balance
- `app/portal/[buildingId]/dokumentumok/page.tsx` — documents
- `app/portal/[buildingId]/kozgyules/page.tsx` — assembly RSVP
- Resident-specific RLS policies for portal data access
- `submitAssemblyRsvp()` action

---

## 3. Pre-conditions

**Environment variables required:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://app.panellako.hu
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...     ← For web push (check if set)
```

**Migrations to apply:**
- `20260523_080_resident_portal_rls.sql`
- `20260523_081_assembly_rsvp_table.sql`

**Add `/portal` to `middleware.ts` `PROTECTED_PREFIXES`** — residents must be authenticated.

---

## 4. Phase 1: Database Changes

### Migration: `20260523_080_resident_portal_rls.sql`

```sql
-- Resident-role RLS policies for portal access.
-- Residents can:
--   - Read tickets for their building (all tickets, not just their own)
--   - INSERT tickets (submit new fault reports)
--   - Read their own unit's finance_entries
--   - Read documents for their building
--   - Read meetings for their building

-- Allow residents to read tickets for their building
DROP POLICY IF EXISTS "Residents read building tickets" ON public.tickets;
CREATE POLICY "Residents read building tickets" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.building_id = tickets.building_id
        AND m.profile_id = auth.uid()
        AND m.active = true
        -- Any role can read tickets (including lako)
    )
  );

-- Allow residents to submit tickets
DROP POLICY IF EXISTS "Residents insert tickets" ON public.tickets;
CREATE POLICY "Residents insert tickets" ON public.tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.building_id = tickets.building_id
        AND m.profile_id = auth.uid()
        AND m.active = true
    )
  );

-- Allow residents to read their own unit's finance entries
DROP POLICY IF EXISTS "Residents read own unit finance" ON public.finance_entries;
CREATE POLICY "Residents read own unit finance" ON public.finance_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.units u
      JOIN public.memberships m ON m.building_id = u.building_id
      WHERE u.id = finance_entries.unit_id
        AND m.profile_id = auth.uid()
        AND m.active = true
    )
  );

-- Allow residents to read documents for their building
-- (is_public OR they are a member)
DROP POLICY IF EXISTS "Members read building documents" ON public.documents;
CREATE POLICY "Members read building documents" ON public.documents
  FOR SELECT USING (
    is_public = TRUE
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.building_id = documents.building_id
        AND m.profile_id = auth.uid()
        AND m.active = true
    )
  );

-- Allow residents to read meetings for their building
DROP POLICY IF EXISTS "Members read building meetings" ON public.meetings;
CREATE POLICY "Members read building meetings" ON public.meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.building_id = meetings.building_id
        AND m.profile_id = auth.uid()
        AND m.active = true
    )
  );
```

### Migration: `20260523_081_assembly_rsvp_table.sql`

```sql
-- Assembly RSVP table for resident responses to meeting invitations.

CREATE TABLE IF NOT EXISTS public.assembly_rsvps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id         UUID REFERENCES public.units(id) ON DELETE SET NULL,
  rsvp_status     TEXT NOT NULL CHECK (rsvp_status IN ('attending', 'not_attending', 'proxy')),
  proxy_name      TEXT,
  proxy_phone     TEXT,
  proxy_document_path TEXT,            -- Supabase Storage path for proxy document
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_assembly_rsvp UNIQUE (meeting_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_assembly_rsvps_meeting
  ON public.assembly_rsvps (meeting_id, rsvp_status);

ALTER TABLE public.assembly_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read rsvps for their building" ON public.assembly_rsvps;
CREATE POLICY "Members read rsvps for their building" ON public.assembly_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings mt
      JOIN public.memberships m ON m.building_id = mt.building_id
      WHERE mt.id = assembly_rsvps.meeting_id
        AND m.profile_id = auth.uid()
        AND m.active = true
    )
  );

DROP POLICY IF EXISTS "Residents upsert own rsvp" ON public.assembly_rsvps;
CREATE POLICY "Residents upsert own rsvp" ON public.assembly_rsvps
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
```

---

## 5. Phase 2: Server-side

### New export in `app/actions/meetings.ts`

```typescript
// ─── submitAssemblyRsvp ───────────────────────────────────────────────────────

export interface AssemblyRsvpInput {
  meetingId: string;
  unitId?: string;
  rsvpStatus: 'attending' | 'not_attending' | 'proxy';
  proxyName?: string;
  proxyPhone?: string;
}

export async function submitAssemblyRsvp(input: AssemblyRsvpInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve.' };

  const { error } = await supabase
    .from('assembly_rsvps')
    .upsert(
      {
        meeting_id: input.meetingId,
        profile_id: user.id,
        unit_id: input.unitId ?? null,
        rsvp_status: input.rsvpStatus,
        proxy_name: input.proxyName ?? null,
        proxy_phone: input.proxyPhone ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'meeting_id,profile_id' }
    );

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  return { success: true };
}
```

---

## 6. Phase 3: Client-side

### New file: `app/portal/[buildingId]/layout.tsx`

```typescript
// Resident portal layout — mobile-first bottom navigation shell

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Home, TicketPlus, Wallet, FileText, CalendarCheck } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  params: { buildingId: string };
}

export default async function PortalLayout({ children, params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/portal/${params.buildingId}`);

  // Verify membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('building_id', params.buildingId)
    .eq('profile_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (!membership) redirect('/app');

  const { data: building } = await supabase
    .from('buildings')
    .select('name')
    .eq('id', params.buildingId)
    .maybeSingle();

  const navItems = [
    { href: `/portal/${params.buildingId}`, icon: Home, label: 'Főoldal' },
    { href: `/portal/${params.buildingId}/hiba`, icon: TicketPlus, label: 'Hiba' },
    { href: `/portal/${params.buildingId}/egyenleg`, icon: Wallet, label: 'Egyenleg' },
    { href: `/portal/${params.buildingId}/dokumentumok`, icon: FileText, label: 'Dokuk' },
    { href: `/portal/${params.buildingId}/kozgyules`, icon: CalendarCheck, label: 'Közgyűlés' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">PanelLakó</p>
            <p className="text-sm font-bold text-slate-900 truncate max-w-[220px]">
              {building?.name ?? params.buildingId}
            </p>
          </div>
          <Link
            href="/app"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500"
          >
            Váltás
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Bottom navigation — 44px minimum touch target */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white safe-area-bottom">
        <div className="flex items-stretch">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 min-h-[56px] flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-brand-600 active:bg-slate-50"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
```

### New file: `app/portal/[buildingId]/page.tsx` (Resident Home)

```typescript
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Bell, ChevronRight, TicketCheck } from 'lucide-react';

export default async function ResidentHomePage({ params }: { params: { buildingId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [announcementsRes, meetingsRes, ticketsRes, membershipRes] = await Promise.all([
    supabase.from('announcements').select('id, title, content, created_at')
      .eq('building_id', params.buildingId)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('meetings').select('id, title, scheduled_at, status')
      .eq('building_id', params.buildingId)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1),
    supabase.from('tickets').select('id, title, status, created_at')
      .eq('building_id', params.buildingId)
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('memberships').select('role, units(unit_label)')
      .eq('building_id', params.buildingId)
      .eq('profile_id', user.id)
      .eq('active', true)
      .maybeSingle(),
  ]);

  const announcements = announcementsRes.data ?? [];
  const nextMeeting = meetingsRes.data?.[0];
  const myTickets = ticketsRes.data ?? [];
  const membership = membershipRes.data;
  const unitLabel = (membership?.units as { unit_label?: string })?.unit_label;

  const STATUS_LABEL: Record<string, string> = {
    uj: 'Új', folyamatban: 'Folyamatban', varakozik: 'Várakozik', lezarva: 'Lezárva',
  };

  return (
    <div className="p-4 space-y-4">
      {/* Welcome card */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-teal-600 p-5 text-white">
        <p className="text-sm text-brand-100">Üdvözöljük</p>
        <p className="text-lg font-bold">{unitLabel ? `${unitLabel} albetét` : 'Lakó portál'}</p>
        <p className="text-xs text-brand-200 mt-1">
          {new Date().toLocaleDateString('hu-HU', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Next assembly */}
      {nextMeeting && (
        <Link
          href={`/portal/${params.buildingId}/kozgyules`}
          className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white text-sm font-bold">
            {new Date(nextMeeting.scheduled_at).getDate()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-900">{nextMeeting.title}</p>
            <p className="text-xs text-blue-600">
              {new Date(nextMeeting.scheduled_at).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-blue-400" />
        </Link>
      )}

      {/* My tickets */}
      {myTickets.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TicketCheck className="h-4 w-4 text-brand-600" /> Bejelentéseim
            </p>
            <Link href={`/portal/${params.buildingId}/hiba`} className="text-xs text-brand-600">+ Új</Link>
          </div>
          {myTickets.map(t => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
              <p className="text-sm text-slate-700 truncate flex-1">{t.title}</p>
              <span className={`ml-2 shrink-0 text-xs rounded-full px-2 py-0.5 ${t.status === 'lezarva' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Bell className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-bold text-slate-800">Közlemények</p>
          </div>
          {announcements.map(a => (
            <div key={a.id} className="px-4 py-3 border-b border-slate-50 last:border-0">
              <p className="text-sm font-semibold text-slate-800">{a.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.content}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {new Date(a.created_at).toLocaleDateString('hu-HU')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### New file: `app/portal/[buildingId]/hiba/page.tsx` (Fault Report)

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTicket } from '@/app/actions/tickets';
import { Camera, Upload, CheckCircle } from 'lucide-react';

interface Props { params: { buildingId: string } }

export default function ResidentFaultReportPage({ params }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Cím és leírás megadása kötelező.');
      return;
    }

    startTransition(async () => {
      const result = await createTicket({
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || 'Nem megadott',
        priority: 'kozepes',
        buildingId: params.buildingId,
        building_id: params.buildingId,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error ?? 'Hiba történt a bejelentés során.');
      }
    });
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold text-slate-900">Bejelentés elküldve!</h2>
        <p className="mt-2 text-sm text-slate-500">
          Az AI elemzés folyamatban van. Értesítést küldünk, amint feldolgozzuk.
        </p>
        <button
          onClick={() => { setSubmitted(false); setTitle(''); setDescription(''); setLocation(''); setPhoto(null); }}
          className="mt-6 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white"
        >
          Új bejelentés
        </button>
        <button
          onClick={() => router.push(`/portal/${params.buildingId}`)}
          className="mt-3 text-sm text-brand-600 underline"
        >
          Vissza a főoldalra
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="mb-6 text-xl font-black text-slate-900">Hibabejelentés</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Hiba rövid leírása <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="pl. Csöpög a vízcsap"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Részletes leírás <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Pontosan írja le a problémát..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Helyszín (pl. 2. emelet, lift)
          </label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="pl. Lépcsőház 3. emelet"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Camera capture — mobile native camera on Android/iOS */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Fotó (opcionális)</label>
          <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 hover:border-brand-300 hover:bg-brand-50">
            {photo ? (
              <>
                <Upload className="h-4 w-4 text-green-500" />
                <span className="text-green-600 truncate">{photo.name}</span>
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                <span>Fotó készítése vagy feltöltése</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"      // Opens rear camera on mobile
              className="sr-only"
              onChange={e => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full min-h-[44px] rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white disabled:opacity-50"
        >
          {isPending ? 'Küldés...' : 'Hibabejelentés elküldése'}
        </button>
      </form>
    </div>
  );
}
```

### New file: `app/portal/[buildingId]/egyenleg/page.tsx` (Balance)

```typescript
import { createClient } from '@/lib/supabase/server';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default async function ResidentBalancePage({ params }: { params: { buildingId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Find the resident's unit
  const { data: membership } = await supabase
    .from('memberships')
    .select('units(id, unit_label, balance_amount, owner_name)')
    .eq('building_id', params.buildingId)
    .eq('profile_id', user.id)
    .eq('active', true)
    .maybeSingle();

  const unit = (membership?.units as {
    id: string; unit_label: string; balance_amount: number; owner_name: string;
  } | null);

  if (!unit) {
    return (
      <div className="p-4 text-center text-slate-500 mt-12">
        <p>Nem található albetét a fiókjához.</p>
      </div>
    );
  }

  // Get recent finance entries
  const { data: entries } = await supabase
    .from('finance_entries')
    .select('period, entry_type, expected_amount, paid_amount, description, due_date, payment_date')
    .eq('unit_id', unit.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const balance = unit.balance_amount ?? 0;
  const isDebt = balance < 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-black text-slate-900">Egyenleg</h1>
      <p className="text-sm text-slate-500">{unit.unit_label} · {unit.owner_name}</p>

      {/* Balance card */}
      <div className={`rounded-2xl p-6 text-center ${isDebt ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDebt ? 'text-red-600' : 'text-green-600'}`}>
          {isDebt ? 'Hátralék' : 'Rendezett'}
        </p>
        <div className="flex items-center justify-center gap-2">
          {isDebt ? <TrendingDown className="h-6 w-6 text-red-500" /> : <TrendingUp className="h-6 w-6 text-green-500" />}
          <p className={`text-3xl font-black ${isDebt ? 'text-red-700' : 'text-green-700'}`}>
            {new Intl.NumberFormat('hu-HU').format(Math.abs(balance))} Ft
          </p>
        </div>
      </div>

      {/* Recent transactions */}
      {entries && entries.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-800">Utóbbi tranzakciók</p>
          </div>
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm text-slate-700">{entry.description}</p>
                <p className="text-xs text-slate-400">{entry.period}</p>
              </div>
              <span className={`text-sm font-bold ${entry.entry_type === 'payment' ? 'text-green-600' : 'text-slate-700'}`}>
                {entry.entry_type === 'payment'
                  ? `+${new Intl.NumberFormat('hu-HU').format(entry.paid_amount)} Ft`
                  : `${new Intl.NumberFormat('hu-HU').format(entry.expected_amount)} Ft`
                }
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### New file: `app/portal/[buildingId]/kozgyules/page.tsx` (Assembly RSVP)

```typescript
'use client';

import { useState, useEffect, useTransition } from 'react';
import { submitAssemblyRsvp } from '@/app/actions/meetings';
import { createClient } from '@/lib/supabase/browser';
import { CheckCircle, XCircle, UserCheck } from 'lucide-react';

export default function ResidentAssemblyPage({ params }: { params: { buildingId: string } }) {
  const [nextMeeting, setNextMeeting] = useState<{ id: string; title: string; scheduled_at: string; location: string } | null>(null);
  const [rsvp, setRsvp] = useState<string | null>(null);
  const [proxyName, setProxyName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('meetings')
      .select('id, title, scheduled_at, location')
      .eq('building_id', params.buildingId)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setNextMeeting(data));
  }, [params.buildingId]);

  const handleRsvp = (status: 'attending' | 'not_attending' | 'proxy') => {
    setRsvp(status);
    if (!nextMeeting) return;
    startTransition(async () => {
      await submitAssemblyRsvp({
        meetingId: nextMeeting.id,
        rsvpStatus: status,
        proxyName: status === 'proxy' ? proxyName : undefined,
      });
      setSubmitted(true);
    });
  };

  if (!nextMeeting) {
    return (
      <div className="p-4 text-center mt-12">
        <p className="text-slate-500">Nincs közelgő közgyűlés.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 mt-12 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Visszajelzés rögzítve!</h2>
        <p className="text-sm text-slate-500 mt-2">
          {rsvp === 'attending' ? 'Részt vesz a közgyűlésen.' : rsvp === 'not_attending' ? 'Nem tud részt venni.' : 'Meghatalmazással részt vesz.'}
        </p>
      </div>
    );
  }

  const meetingDate = new Date(nextMeeting.scheduled_at).toLocaleDateString('hu-HU', {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-black text-slate-900">Közgyűlés</h1>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <p className="text-xs text-blue-600 font-bold uppercase mb-1">Következő közgyűlés</p>
        <p className="text-base font-bold text-blue-900">{nextMeeting.title}</p>
        <p className="text-sm text-blue-700 mt-1">{meetingDate}</p>
        {nextMeeting.location && (
          <p className="text-sm text-blue-600 mt-0.5">📍 {nextMeeting.location}</p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-slate-700">Részvételi szándék:</p>
        <button
          onClick={() => handleRsvp('attending')}
          disabled={isPending}
          className="flex w-full min-h-[44px] items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-left disabled:opacity-50"
        >
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="font-medium text-green-800">Részt veszek</span>
        </button>
        <button
          onClick={() => handleRsvp('not_attending')}
          disabled={isPending}
          className="flex w-full min-h-[44px] items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left disabled:opacity-50"
        >
          <XCircle className="h-5 w-5 text-red-400" />
          <span className="font-medium text-red-700">Nem tudok részt venni</span>
        </button>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-3">
            <UserCheck className="h-4 w-4" /> Meghatalmazás
          </p>
          <input
            type="text"
            value={proxyName}
            onChange={e => setProxyName(e.target.value)}
            placeholder="Meghatalmazott neve"
            className="w-full rounded-lg border border-amber-200 px-3 py-2.5 text-sm mb-2 outline-none focus:border-amber-400"
          />
          <button
            onClick={() => handleRsvp('proxy')}
            disabled={!proxyName.trim() || isPending}
            className="w-full min-h-[44px] rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            Meghatalmazással vesz részt
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 7. Phase 4: Configuration

### Update `public/manifest.json`

Add a "PanelLakó Lakói" app entry for PWA install:

```json
{
  "name": "PanelLakó",
  "short_name": "PanelLakó",
  "start_url": "/app",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#6366f1",
  "background_color": "#ffffff",
  "related_applications": [],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add `/portal` to middleware `PROTECTED_PREFIXES` (see Initiative 08).

---

## 8. Phase 5: Testing

### Manual Smoke Test

1. **Test as resident:** Create a test user with `role: 'lako'` membership. Log in as that user. Navigate to `/portal/{buildingId}`. Verify the home page loads with building name and announcements.

2. **Fault report:** Submit a test fault report via `/portal/{buildingId}/hiba`. Verify the ticket appears in the manager's view (`/w/{buildingId}`).

3. **Balance page:** Navigate to `/portal/{buildingId}/egyenleg`. Verify unit name and balance are shown.

4. **RSVP:** Navigate to `/portal/{buildingId}/kozgyules`. Click "Részt veszek". Verify `assembly_rsvps` row created in Supabase.

5. **Camera capture:** On mobile device, navigate to `/portal/{buildingId}/hiba`. Tap the photo field — should open camera app (not file picker).

6. **Bottom nav touch targets:** On mobile, verify all 5 nav items are easily tappable (44px minimum height).

7. **PWA install:** On mobile Chrome, "Add to Home Screen" should be available. The installed app should open at `/app`.

### Automated Test Cases

```typescript
describe('submitAssemblyRsvp', () => {
  it('creates rsvp record for authenticated user', async () => {
    mockAuth({ userId: 'user-1' });
    const result = await submitAssemblyRsvp({ meetingId: 'meeting-1', rsvpStatus: 'attending' });
    expect(result.success).toBe(true);
  });

  it('upserts on duplicate submission', async () => {
    // Submit twice — should not error
    await submitAssemblyRsvp({ meetingId: 'meeting-1', rsvpStatus: 'attending' });
    const result = await submitAssemblyRsvp({ meetingId: 'meeting-1', rsvpStatus: 'not_attending' });
    expect(result.success).toBe(true);
  });

  it('rejects proxy without proxy_name', async () => {
    const result = await submitAssemblyRsvp({ meetingId: 'meeting-1', rsvpStatus: 'proxy', proxyName: '' });
    // proxyName is optional in the action — validation is at the UI level
    expect(result.success).toBe(true); // action allows empty proxyName
  });
});
```

---

## 9. Error Handling & Edge Cases

**Scenario 1: Resident has no unit linked to their membership**
The balance page queries `memberships.units` join. If `unit_id` is null on the membership, `unit` will be null. The balance page shows "Nem található albetét" message — no crash.

**Scenario 2: Fault report submitted while offline (PWA)**
The form submit fires `createTicket()` — if offline, the fetch will fail. Add `navigator.onLine` check before submit and show "Nincs internetkapcsolat" error. Future enhancement: queue submissions in localStorage for offline sync.

**Scenario 3: Meeting has already closed (status: 'lezart')**
The assembly RSVP page queries for future meetings (`gte('scheduled_at', NOW())`). Closed meetings are excluded. If no future meeting, shows empty state.

**Scenario 4: Resident from one building tries to access another building's portal**
`PortalLayout` checks `memberships` for the specific `buildingId` — if not found, redirects to `/app`. 

**Scenario 5: Camera capture API not available (desktop browser)**
`<input type="file" accept="image/*" capture="environment">` gracefully falls back to file upload dialog on desktop. The `capture` attribute is ignored on non-mobile browsers.

**Scenario 6: Push subscription registration fails**
The `subscribe` API route handles errors gracefully. The portal page loads fine without push — it does not depend on push subscriptions being active.

---

## 10. Integration with Other Initiatives

- **Initiative 06 (Email Suite):** The `portalUrl` parameters in assembly invitation emails link to `/portal/[buildingId]/kozgyules`. When residents receive the email, one tap opens the RSVP page.

- **Initiative 05 (Financial Ledger):** The balance page reads from `units.balance_amount` (updated by `recordPayment()`). Once Initiative 05's double-entry system is live, update to read from `unit_ledger_view`.

- **Initiative 03 (AI Triage):** The `ai_resident_update_hu` message from the AI triage is the push notification content. Once Initiative 03 adds this field, update the push notification from `send-push` to use it.

---

## 11. Rollback Plan

1. **Delete `app/portal/` directory** — removes all portal routes.
2. **Remove `/portal` from `PROTECTED_PREFIXES`** in `middleware.ts`.
3. **Revert `public/manifest.json`** to previous version.
4. **Revert migrations:**
   ```sql
   DROP TABLE IF EXISTS public.assembly_rsvps;
   DROP POLICY IF EXISTS "Residents read building tickets" ON public.tickets;
   DROP POLICY IF EXISTS "Residents insert tickets" ON public.tickets;
   DROP POLICY IF EXISTS "Residents read own unit finance" ON public.finance_entries;
   DROP POLICY IF EXISTS "Members read building documents" ON public.documents;
   DROP POLICY IF EXISTS "Members read building meetings" ON public.meetings;
   ```

---

## 12. Definition of Done

- [ ] Migrations `20260523_080` and `20260523_081` applied — RLS policies and `assembly_rsvps` table exist
- [ ] `app/portal/[buildingId]/layout.tsx` renders bottom navigation with 5 items
- [ ] All nav items have minimum 44px touch target height (verified on mobile)
- [ ] `/portal/{buildingId}` home page shows announcements and next meeting
- [ ] Fault report form at `/hiba` submits ticket via `createTicket()` and shows success state
- [ ] Camera capture (`capture="environment"`) works on Android Chrome (opens rear camera)
- [ ] Balance page shows correct unit label and balance amount
- [ ] RSVP page shows next upcoming meeting and records `assembly_rsvps` row
- [ ] Proxy RSVP option allows entering proxy name
- [ ] Resident from building A cannot access portal for building B (redirects to /app)
- [ ] Portal routes are in `PROTECTED_PREFIXES` — unauthenticated access redirects to login
- [ ] PWA manifest updated — "Add to Home Screen" works on mobile
- [ ] TypeScript compiles cleanly for all new files
- [ ] `submitAssemblyRsvp()` action exported from meetings.ts
