// Klímakockázat page — Urban Heat Island Monitor
// URL: /w/[buildingId]/klimakockazat
// Feature 04: Hőszigat és Klímakockázat Modul

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HeatIslandDashboardClient from '@/components/heat-island-dashboard-client';

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      countrycodes: 'hu',
      limit: '1',
      addressdetails: '0',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'panellako.hu/1.0 (contact via panellako.hu)',
        'Accept':     'application/json',
      },
      signal:  AbortSignal.timeout(5000),
      next:    { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default async function KlimakockazatPage({ params }: PageProps) {
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${buildingId}/klimakockazat`);

  // Verify membership
  const { data: memberships } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);

  if (!memberships || memberships.length === 0) redirect('/app');

  // Fetch building lat/lon
  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address, lat, lon')
    .eq('id', buildingId)
    .single();

  if (!building) redirect('/app');

  let lat: number = (building as { lat?: number | null }).lat ?? 47.4979;
  let lon: number = (building as { lon?: number | null }).lon ?? 19.0402;

  if ((!lat || !lon) && building.address) {
    const geo = await geocodeAddress(building.address);
    if (geo) { lat = geo.lat; lon = geo.lon; }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Page header */}
      <div className="px-4 pt-8 pb-6 max-w-2xl mx-auto">
        <div className="mb-1 flex items-center gap-2 text-slate-500 text-xs">
          <span>Épület</span>
          <span>·</span>
          <span className="truncate">{building.name ?? building.address}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Klímakockázat</h1>
        <p className="text-slate-400 text-sm mt-1">
          Hőszigat hatás és klímaadaptációs lehetőségek
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-slate-600" aria-hidden>
            <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
          </svg>
          <span>{building.address}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 pb-12 max-w-2xl mx-auto">
        <HeatIslandDashboardClient
          lat={lat}
          lon={lon}
          buildingId={buildingId}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data: building } = await supabase
    .from('buildings')
    .select('name, address')
    .eq('id', params.buildingId)
    .maybeSingle();

  return {
    title: building
      ? `Klímakockázat · ${building.name} — PanelLakó`
      : 'Klímakockázat — PanelLakó',
    description:
      'Hőszigat hatás becslése, KlímaScore és klímaadaptációs cselekvési terv a lakóépületre.',
  };
}
