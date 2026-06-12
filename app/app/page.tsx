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
  lako:            { bg: 'bg-white/[0.06]',    text: 'text-slate-300',  ring: 'ring-white/10' },
  tulajdonos:      { bg: 'bg-sky-500/10',      text: 'text-sky-300',    ring: 'ring-sky-500/25' },
  kozos_kepviselo: { bg: 'bg-brand-500/10',    text: 'text-brand-300',  ring: 'ring-brand-500/25' },
  megbizott:       { bg: 'bg-violet-500/10',   text: 'text-violet-300', ring: 'ring-violet-500/25' },
  bizottsag:       { bg: 'bg-violet-500/10',   text: 'text-violet-300', ring: 'ring-violet-500/25' },
  konyvelo:        { bg: 'bg-emerald-500/10',  text: 'text-emerald-300', ring: 'ring-emerald-500/25' },
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
    <div className="app-surface min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.05)_0%,transparent_50%)]">

      {/* ── Header ── */}
      <header className="glass sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500 text-ink-base">
              <Building2 className="h-4.5 w-4.5" size={18} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-slate-100">PanelLakó</span>
          </div>

          <div className="flex items-center gap-3">
            {displayName && (
              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500/15 text-[10px] font-semibold text-brand-300 ring-1 ring-brand-500/25">
                  {initials || '?'}
                </div>
                <span className="max-w-[180px] truncate text-sm font-medium text-slate-400">{displayName}</span>
              </div>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">Épületeim</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Válassz épületet a kezelőfelület megnyitásához.
          </p>
        </div>

        {/* Error banner */}
        {buildingsError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3.5 text-sm text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Nem sikerült betölteni az épületlistát: {buildingsError.message}</span>
          </div>
        )}

        {/* Empty state */}
        {!hasBuildings && !buildingsError && (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.05] text-slate-600 ring-1 ring-white/10">
              <Building2 className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-slate-200">Még nincs épületed</h2>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">
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
              <div className="flex flex-col gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Összes épület</span>
                <span className="text-2xl font-semibold text-slate-100 tabular-nums">{totalBuildings}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Összes lakás</span>
                <span className="text-2xl font-semibold text-slate-100 tabular-nums">{totalUnits}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nyitott hibajegyek</span>
                <span className={`text-2xl font-semibold tabular-nums ${totalOpenTickets > 0 ? 'text-rose-400' : 'text-slate-100'}`}>{totalOpenTickets}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90">Figyelmet igénylő</span>
                <span className={`text-2xl font-semibold tabular-nums ${needsAttention > 0 ? 'text-amber-300' : 'text-slate-100'}`}>{needsAttention}</span>
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
      className={`card-lift group relative flex animate-fade-in-up flex-col overflow-hidden rounded-2xl border bg-white/[0.04] p-5 ${
        hasAlerts
          ? 'border-amber-500/25 hover:border-amber-500/40'
          : 'border-white/[0.08] hover:border-brand-500/30'
      }`}
    >
      {/* Alert dot */}
      {hasAlerts && (
        <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-ink-base" />
        </span>
      )}

      {/* Building icon */}
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 transition-colors group-hover:bg-brand-500/15">
        <Building2 className="h-5 w-5" />
      </div>

      {/* Name + address */}
      <h2 className="mb-0.5 text-base font-semibold leading-snug text-slate-100 transition-colors group-hover:text-brand-300">
        {building.building_name}
      </h2>
      {building.address && (
        <p className="mb-4 flex items-start gap-1 text-xs leading-relaxed text-slate-500">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{building.address}</span>
        </p>
      )}

      {/* Stats row */}
      <div className="mt-auto flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Layers3 className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-medium">{building.unit_count}</span> albetét
        </span>
        <span className={`flex items-center gap-1.5 ${hasAlerts ? 'font-semibold text-rose-300' : ''}`}>
          <TicketCheck className={`h-3.5 w-3.5 ${hasAlerts ? 'text-rose-400' : 'text-slate-500'}`} />
          <span className="font-medium">{building.open_tickets}</span> nyitott ügy
        </span>
      </div>

      {/* Role + arrow */}
      <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${badge.bg} ${badge.text} ${badge.ring}`}>
          {roleLabel}
        </span>
        <ArrowRight className="h-4 w-4 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-brand-400" />
      </div>
    </Link>
  );
}
