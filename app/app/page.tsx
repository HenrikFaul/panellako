// Building Picker — shows all buildings the authenticated user has access to.
// URL: /app
// On card click: navigate to /w/[buildingId] (always Link push, never replace).

import type { Metadata } from 'next';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import Link from 'next/link';
import { AgencyPortfolioEntryLink } from '@/components/agency-portfolio-client';
import { createClient } from '@/lib/supabase/server';
import { listMyWorkspaces } from '@/lib/authorization/workspace-context';
import {
  legacyRoleFromWorkspaceContext,
  type WorkspaceSummary,
} from '@/lib/authorization/capabilities';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CirclePlus,
  Layers3,
  LogOut,
  MapPin,
  TicketCheck
} from 'lucide-react';

const roleLabels: Record<string, string> = {
  lako:            'Lakó',
  tulajdonos:      'Tulajdonos',
  kozos_kepviselo: 'Közös képviselő',
  megbizott:       'Megbízott',
  bizottsag:       'Bizottsági tag',
  konyvelo:        'Könyvelő'
};

const roleBadgeStyle: Record<string, { bg: string; text: string; ring: string }> = {
  lako:            { bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-200' },
  tulajdonos:      { bg: 'bg-sky-50',      text: 'text-sky-800',     ring: 'ring-sky-200' },
  kozos_kepviselo: { bg: 'bg-brand-50',    text: 'text-brand-800',   ring: 'ring-brand-200' },
  megbizott:       { bg: 'bg-violet-50',   text: 'text-violet-800',  ring: 'ring-violet-200' },
  bizottsag:       { bg: 'bg-violet-50',   text: 'text-violet-800',  ring: 'ring-violet-200' },
  konyvelo:        { bg: 'bg-emerald-50',  text: 'text-emerald-800', ring: 'ring-emerald-200' },
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

  const { workspaces, error: buildingsError } = await listMyWorkspaces();

  const hasBuildings = workspaces.length > 0;
  const displayName = profile?.full_name ?? profile?.email ?? user.email ?? '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0].toUpperCase())
    .join('');

  return (
    <div className="app-surface min-h-screen" style={{ backgroundImage: 'none' }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-canvas-line bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-sm">
              <Building2 className="h-4.5 w-4.5" size={18} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-canvas-ink">PanelLakó</span>
          </div>

          <div className="flex items-center gap-3">
            {displayName && (
              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-800 ring-1 ring-brand-200">
                  {initials || '?'}
                </div>
                <span className="max-w-[180px] truncate text-sm font-medium text-canvas-muted">{displayName}</span>
              </div>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex min-h-11 items-center gap-1.5 rounded-xl border border-canvas-line bg-white px-3 py-2 text-sm font-medium text-canvas-muted shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-canvas-ink sm:text-3xl">Lakóközösségeim</h1>
            <p className="mt-1.5 text-sm text-canvas-muted">
              Válassz közösséget, vagy kezdeményezz új csatlakozást.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AgencyPortfolioEntryLink />
            <Link href={'/onboarding' as Route} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm">
              <CirclePlus size={16} />
              Csatlakozás vagy új ház
            </Link>
          </div>
        </div>

        {/* Error banner */}
        {buildingsError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Nem sikerült betölteni a lakóközösségeket: {buildingsError}</span>
          </div>
        )}

        {/* Empty state */}
        {!hasBuildings && !buildingsError && (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-canvas-sage text-brand-800 ring-1 ring-canvas-line">
              <Building2 className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-canvas-ink">Még nincs aktív lakóközösségi hozzáférésed</h2>
            <p className="max-w-md text-sm leading-relaxed text-canvas-muted">
              Csatlakozási kérelmet adhatsz be egy már regisztrált házhoz, vagy elindíthatod
              egy új, képviselővel működő vagy önkezelt közösség ellenőrzését.
            </p>
            <Link href={'/onboarding' as Route} className="btn-primary mt-6 inline-flex min-h-11 items-center gap-2 px-5 text-sm">
              <CirclePlus size={16} />
              Onboarding megnyitása
            </Link>
          </div>
        )}

        {/* ── Portfolio stats summary bar ── */}
        {hasBuildings && (() => {
          const bList = workspaces;
          const totalBuildings  = bList.length;
          const totalUnits      = bList.reduce((sum, b) => sum + (b.unitCount ?? 0), 0);
          const totalOpenTickets = bList.reduce((sum, b) => sum + (b.openTickets ?? 0), 0);
          const needsAttention  = bList.filter((b) => b.openTickets > 0).length;
          return (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-0.5 rounded-xl border border-canvas-line bg-white px-4 py-3.5 shadow-card">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-canvas-muted">Összes épület</span>
                <span className="text-2xl font-semibold text-canvas-ink tabular-nums">{totalBuildings}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl border border-canvas-line bg-white px-4 py-3.5 shadow-card">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-canvas-muted">Összes lakás</span>
                <span className="text-2xl font-semibold text-canvas-ink tabular-nums">{totalUnits}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl border border-canvas-line bg-white px-4 py-3.5 shadow-card">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-canvas-muted">Nyitott hibajegyek</span>
                <span className={`text-2xl font-semibold tabular-nums ${totalOpenTickets > 0 ? 'text-rose-700' : 'text-canvas-ink'}`}>{totalOpenTickets}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl border border-amber-200 bg-canvas-warm px-4 py-3.5 shadow-card">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Figyelmet igénylő</span>
                <span className={`text-2xl font-semibold tabular-nums ${needsAttention > 0 ? 'text-amber-800' : 'text-canvas-ink'}`}>{needsAttention}</span>
              </div>
            </div>
          );
        })()}

        {/* Building grid */}
        {hasBuildings && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace, i) => (
              <BuildingCard key={workspace.workspaceId} workspace={workspace} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BuildingCard({ workspace, index }: { workspace: WorkspaceSummary; index: number }) {
  const legacyRole = legacyRoleFromWorkspaceContext(workspace.roleKeys, workspace.relationshipLabels);
  const roleLabel = roleLabels[legacyRole] ?? legacyRole;
  const badge = roleBadgeStyle[legacyRole] ?? roleBadgeStyle.lako;
  const hasAlerts = workspace.openTickets > 0;
  const delay     = `${index * 40}ms`;

  return (
    <Link
      href={`/w/${workspace.workspaceId}`}
      style={{ animationDelay: delay, animationName: 'none' }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-card transition-[border-color,box-shadow] ${
        hasAlerts
          ? 'border-amber-200 hover:border-amber-300 hover:shadow-card-md'
          : 'border-canvas-line hover:border-brand-200 hover:shadow-card-md'
      }`}
    >
      {/* Alert dot */}
      {hasAlerts && (
        <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-rose-100" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
        </span>
      )}

      {/* Building icon */}
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-canvas-sage text-brand-800 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-100">
        <Building2 className="h-5 w-5" />
      </div>

      {/* Name + address */}
      <h2 className="mb-0.5 text-base font-semibold leading-snug text-canvas-ink transition-colors group-hover:text-brand-800">
        {workspace.workspaceName}
      </h2>
      {workspace.address && (
        <p className="mb-4 flex items-start gap-1 text-xs leading-relaxed text-canvas-muted">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{workspace.address}</span>
        </p>
      )}

      {/* Stats row */}
      <div className="mt-auto flex items-center gap-4 text-xs text-canvas-muted">
        <span className="flex items-center gap-1.5">
          <Layers3 className="h-3.5 w-3.5 text-canvas-muted" />
          <span className="font-medium">{workspace.unitCount}</span> albetét
        </span>
        <span className={`flex items-center gap-1.5 ${hasAlerts ? 'font-semibold text-rose-700' : ''}`}>
          <TicketCheck className={`h-3.5 w-3.5 ${hasAlerts ? 'text-rose-700' : 'text-canvas-muted'}`} />
          <span className="font-medium">{workspace.openTickets}</span> nyitott ügy
        </span>
      </div>

      {/* Role + arrow */}
      <div className="mt-3.5 flex items-center justify-between border-t border-canvas-line pt-3.5">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${badge.bg} ${badge.text} ${badge.ring}`}>
          {roleLabel}
        </span>
        <ArrowRight className="h-4 w-4 text-canvas-muted transition-colors group-hover:text-brand-800" />
      </div>
    </Link>
  );
}
