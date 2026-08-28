// Zöld Épület Pontszám page — Feature 02
// URL: /w/[buildingId]/green-score

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GreenScoreDashboardClient from '@/components/green-score-dashboard-client';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

interface PageProps {
  params: { buildingId: string };
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const p = new URLSearchParams({
      q:             address,
      format:        'json',
      countrycodes:  'hu',
      limit:         '1',
      addressdetails: '0',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${p}`, {
      headers: {
        'User-Agent': 'panellako.hu/1.0 (contact via panellako.hu)',
        Accept:       'application/json',
      },
      signal: AbortSignal.timeout(5000),
      next:   { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default async function GreenScorePage({ params }: PageProps) {
  const { buildingId: workspaceId } = params;

  if (!isWorkspaceId(workspaceId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${workspaceId}/green-score`);

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');

  // Fetch building data
  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address, lat, lon')
    .eq('id', context.primaryBuildingId)
    .single();

  if (!building) redirect('/app');

  let lat: number = (building as { lat?: number | null }).lat ?? 0;
  let lon: number = (building as { lon?: number | null }).lon ?? 0;

  if ((!lat || !lon) && building.address) {
    const geo = await geocodeAddress(building.address);
    if (geo) { lat = geo.lat; lon = geo.lon; }
  }

  if (!lat || !lon) {
    lat = 47.4979;
    lon = 19.0402;
  }

  const buildingName: string = (building as { name?: string | null }).name ?? building.address;

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="px-4 pt-8 pb-6 max-w-2xl mx-auto">
        <div className="mb-1 flex items-center gap-2 text-slate-500 text-xs">
          <span>Épület</span>
          <span>·</span>
          <span className="truncate">{buildingName}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Zöld Épület Pontszám</h1>
        <p className="text-slate-400 text-sm mt-1">
          Környezeti teljesítmény 6 kategóriában
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-slate-600" aria-hidden>
            <path
              fillRule="evenodd"
              d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
              clipRule="evenodd"
            />
          </svg>
          <span>{building.address}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 pb-12 max-w-2xl mx-auto">
        <GreenScoreDashboardClient
          buildingId={workspaceId}
          buildingName={buildingName}
          lat={lat}
          lon={lon}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);

  return {
    title: context
      ? `Zöld Épület Pontszám · ${context.workspaceName} — PanelLakó`
      : 'Zöld Épület Pontszám — PanelLakó',
    description:
      'Környezeti teljesítmény értékelés: levegőminőség, zöldfelület, közlekedés, kerékpározás, zaj és hősziget 6 kategóriában.',
  };
}
