// Building Picker — shows all buildings the authenticated user has access to.
// URL: /app
// On card click: navigate to /w/[buildingId] (always Link push, never replace).

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Layers3,
  LogOut,
  MapPin,
  TicketCheck
} from 'lucide-react';

interface BuildingPickerRow {
  building_id:   string;
  building_name: string;
  address:       string;
  user_role:     string;
  unit_count:    number;
  open_tickets:  number;
  member_since:  string;
}

const roleLabels: Record<string, string> = {
  lako:            'Lakó',
  tulajdonos:      'Tulajdonos',
  kozos_kepviselo: 'Közös képviselő',
  megbizott:       'Megbízott',
  bizottsag:       'Bizottsági tag',
  konyvelo:        'Könyvelő'
};

const roleBadgeStyle: Record<string, { bg: string; text: string; ring: string }> = {
  lako:            { bg: 'bg-slate-100',   text: 'text-slate-600',  ring: 'ring-slate-200/60' },
  tulajdonos:      { bg: 'bg-blue-50',     text: 'text-blue-700',   ring: 'ring-blue-200/60'  },
  kozos_kepviselo: { bg: 'bg-indigo-50',   text: 'text-indigo-700', ring: 'ring-indigo-200/60'},
  megbizott:       { bg: 'bg-violet-50',   text: 'text-violet-700', ring: 'ring-violet-200/60'},
  bizottsag:       { bg: 'bg-purple-50',   text: 'text-purple-700', ring: 'ring-purple-200/60'},
  konyvelo:        { bg: 'bg-teal-50',     text: 'text-teal-700',   ring: 'ring-teal-200/60'  },
};

export default async function BuildingPickerPage() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  const { data: buildings, error: buildingsError } = await supabase
    .rpc('get_my_buildings');

  const hasBuildings = Array.isArray(buildings) && buildings.length > 0;
  const displayName = profile?.full_name ?? profile?.email ?? user.email ?? '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0].toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,theme(colors.brand.50)_0%,theme(colors.slate.50)_45%,theme(colors.indigo.50/40%)_100%)]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-900/[0.06] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-md shadow-brand-200">
              <Building2 className="h-4.5 w-4.5" size={18} />
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">PanelLakó</span>
          </div>

          <div className="flex items-center gap-3">
            {displayName && (
              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-black text-brand-700">
                  {initials || '?'}
                </div>
                <span className="max-w-[180px] truncate text-sm font-medium text-slate-600">{displayName}</span>
              </div>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kilépés</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Épületeim</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Válassz épületet a kezelőfelület megnyitásához.
          </p>
        </div>

        {/* Error banner */}
        {buildingsError && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3.5 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Nem sikerült betölteni az épületlistát: {buildingsError.message}</span>
          </div>
        )}

        {/* Empty state */}
        {!hasBuildings && !buildingsError && (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-slate-300 shadow-inner">
              <Building2 className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-slate-700">Még nincs épületed</h2>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              A rendszergazda adhat hozzá épületet a fiókodhoz. Vedd fel a kapcsolatot
              az épület közös képviselőjével.
            </p>
          </div>
        )}

        {/* ── Portfolio stats summary bar ── */}
        {hasBuildings && (() => {
          const bList = buildings as BuildingPickerRow[];
          const totalBuildings  = bList.length;
          const totalUnits      = bList.reduce((sum, b) => sum + (b.unit_count ?? 0), 0);
          const totalOpenTickets = bList.reduce((sum, b) => sum + (b.open_tickets ?? 0), 0);
          const needsAttention  = bList.filter((b) => b.open_tickets > 0).length;
          return (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-0.5 rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Összes épület</span>
                <span className="text-2xl font-black text-slate-900">{totalBuildings}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Összes lakás</span>
                <span className="text-2xl font-black text-slate-900">{totalUnits}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nyitott hibajegyek</span>
                <span className={`text-2xl font-black ${totalOpenTickets > 0 ? 'text-red-600' : 'text-slate-900'}`}>{totalOpenTickets}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3.5 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Figyelmet igénylő</span>
                <span className={`text-2xl font-black ${needsAttention > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{needsAttention}</span>
              </div>
            </div>
          );
        })()}

        {/* Building grid */}
        {hasBuildings && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(buildings as BuildingPickerRow[]).map((b, i) => (
              <BuildingCard key={b.building_id} building={b} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BuildingCard({ building, index }: { building: BuildingPickerRow; index: number }) {
  const roleLabel = roleLabels[building.user_role]  ?? building.user_role;
  const badge     = roleBadgeStyle[building.user_role] ?? roleBadgeStyle.lako;
  const hasAlerts = building.open_tickets > 0;
  const delay     = `${index * 40}ms`;

  return (
    <Link
      href={`/w/${building.building_id}`}
      style={{ animationDelay: delay }}
      className={`card-lift group relative flex animate-fade-in-up flex-col overflow-hidden rounded-[1.5rem] border bg-white p-5 shadow-card hover:shadow-card-md ${
        hasAlerts
          ? 'border-amber-300/70 hover:border-amber-400/80'
          : 'border-slate-200/80 hover:border-brand-300/70'
      }`}
    >
      {/* Alert dot */}
      {hasAlerts && (
        <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        </span>
      )}

      {/* Building icon */}
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-teal-50 text-brand-700 ring-1 ring-brand-100/80 transition-all group-hover:from-brand-100 group-hover:to-teal-100">
        <Building2 className="h-5 w-5" />
      </div>

      {/* Name + address */}
      <h2 className="mb-0.5 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-brand-700">
        {building.building_name}
      </h2>
      {building.address && (
        <p className="mb-4 flex items-start gap-1 text-xs leading-relaxed text-slate-400">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{building.address}</span>
        </p>
      )}

      {/* Stats row */}
      <div className="mt-auto flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Layers3 className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium">{building.unit_count}</span> albetét
        </span>
        <span className={`flex items-center gap-1.5 ${hasAlerts ? 'font-semibold text-red-600' : ''}`}>
          <TicketCheck className={`h-3.5 w-3.5 ${hasAlerts ? 'text-red-400' : 'text-slate-400'}`} />
          <span className="font-medium">{building.open_tickets}</span> nyitott ügy
        </span>
      </div>

      {/* Role + arrow */}
      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3.5">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${badge.bg} ${badge.text} ${badge.ring}`}>
          {roleLabel}
        </span>
        <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500" />
      </div>
    </Link>
  );
}
