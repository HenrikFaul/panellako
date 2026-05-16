// Building Picker — shows all buildings the authenticated user has access to.
// URL: /app
// On card click: navigate to /w/[buildingId] (always Link push, never replace).

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Layers3,
  LogOut,
  TicketCheck
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
  lako:            'Lakó',
  tulajdonos:      'Tulajdonos',
  kozos_kepviselo: 'Közös képviselő',
  megbizott:       'Megbízott',
  bizottsag:       'Bizottsági tag',
  konyvelo:        'Könyvelő'
};

const roleBadgeColors: Record<string, string> = {
  lako:            'bg-slate-100 text-slate-700',
  tulajdonos:      'bg-blue-100 text-blue-700',
  kozos_kepviselo: 'bg-indigo-100 text-indigo-700',
  megbizott:       'bg-violet-100 text-violet-700',
  bizottsag:       'bg-purple-100 text-purple-700',
  konyvelo:        'bg-teal-100 text-teal-700'
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
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

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Épületeim</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Válassz épületet a kezelőfelület megnyitásához.
          </p>
        </div>

        {buildingsError && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Nem sikerült betölteni az épületlistát: {buildingsError.message}</span>
          </div>
        )}

        {!hasBuildings && !buildingsError && (
          <div className="text-center py-20">
            <Building2 className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">Még nincs épületed</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              A rendszergazda adhat hozzá épületet a fiókodhoz. Kérjük, vedd fel a kapcsolatot
              az épület közös képviselőjével.
            </p>
          </div>
        )}

        {hasBuildings && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(buildings as BuildingPickerRow[]).map((b) => (
              <BuildingCard key={b.building_id} building={b} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BuildingCard({ building }: { building: BuildingPickerRow }) {
  const roleLabel  = roleLabels[building.user_role]  ?? building.user_role;
  const badgeColor = roleBadgeColors[building.user_role] ?? 'bg-slate-100 text-slate-700';
  const hasAlerts  = building.open_tickets > 0;

  return (
    <Link
      href={`/w/${building.building_id}`}
      className="group block bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-400 hover:shadow-md transition-all duration-200 relative overflow-hidden"
    >
      {hasAlerts && (
        <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
      )}

      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
        <Building2 className="w-5 h-5 text-teal-700" />
      </div>

      <h2 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-teal-700 transition-colors">
        {building.building_name}
      </h2>
      <p className="text-slate-500 text-xs mt-0.5 mb-4 line-clamp-2">{building.address}</p>

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

      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeColor}`}>
          {roleLabel}
        </span>
        {/* TODO(billing): show WorkspaceTierBadge here once tenant_subscriptions table exists */}
        {/* Per ui_ux_rules.md § "Core principle: Workspace tier persistence" */}
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
