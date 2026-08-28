// Transit sub-page — Live map + BKK coverage + Cycling routes
// URL: /w/[buildingId]/kozlekedes

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TransitPageClient from '@/components/transit-page-client';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

interface PageProps {
  params: { buildingId: string };
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const params = new URLSearchParams({
      q: address, format: 'json', countrycodes: 'hu', limit: '1', addressdetails: '0',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'panellako.hu/1.0 (contact via panellako.hu)', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default async function KozlekedesPage({ params }: PageProps) {
  const { buildingId: workspaceId } = params;

  if (!isWorkspaceId(workspaceId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${workspaceId}/kozlekedes`);

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');
  const physicalBuildingId = context.primaryBuildingId;

  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address, lat, lon')
    .eq('id', physicalBuildingId)
    .single();

  if (!building) redirect('/app');

  // Bug fix (v0.9.33): the Budapest-center default used to be applied BEFORE the
  // missing-coordinate check, so the geocode branch was unreachable and buildings
  // without stored coordinates silently used the city center.
  const rawLat = (building as { lat?: number | null }).lat ?? null;
  const rawLon = (building as { lon?: number | null }).lon ?? null;
  let lat: number | null = rawLat;
  let lon: number | null = rawLon;

  if ((lat === null || lon === null) && building.address) {
    const geo = await geocodeAddress(building.address);
    if (geo) {
      lat = geo.lat;
      lon = geo.lon;
      // .is('lat', null) guard: concurrent page loads won't overwrite each other
      await supabase
        .from('buildings')
        .update({ lat: geo.lat, lon: geo.lon, geocoded_at: new Date().toISOString() })
        .eq('id', physicalBuildingId)
        .is('lat', null);
    }
  }

  // Final fallback: Budapest center, only if geocoding also failed
  lat = lat ?? 47.5278845;
  lon = lon ?? 19.0705657;

  const buildingName = (building as { name?: string | null }).name ?? building.address;

  return (
    <TransitPageClient
      buildingId={workspaceId}
      buildingName={buildingName}
      buildingAddress={building.address}
      buildingLat={lat}
      buildingLon={lon}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);
  return {
    title: context ? `Közlekedés · ${context.workspaceName} — PanelLakó` : 'Közlekedés — PanelLakó',
    description: 'Élő járattérkép, BKK menetrend, tömegközlekedési lefedettség, kerékpáros útvonalak',
  };
}
