// Environment page — Air quality + Cycling routes
// URL: /w/[buildingId]/kornyezet

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EnvironmentPageClient from '@/components/environment-page-client';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

interface PageProps {
  params: { buildingId: string };
}

// Server-side geocoding — same helper as the main dashboard page
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

export default async function KornyezetPage({ params }: PageProps) {
  const { buildingId: workspaceId } = params;

  if (!isWorkspaceId(workspaceId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${workspaceId}/kornyezet`);

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');

  // Fetch building info
  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address, lat, lon')
    .eq('id', context.primaryBuildingId)
    .single();

  if (!building) redirect('/app');

  // Bug fix (v0.9.33): apply the Budapest-center default only AFTER the
  // geocode attempt — previously the default made the geocode branch unreachable.
  let lat: number | null = (building as { lat?: number | null }).lat ?? null;
  let lon: number | null = (building as { lon?: number | null }).lon ?? null;

  if ((lat === null || lon === null) && building.address) {
    const geo = await geocodeAddress(building.address);
    if (geo) { lat = geo.lat; lon = geo.lon; }
  }
  lat = lat ?? 47.5278845;
  lon = lon ?? 19.0705657;

  // v0.7.14 — Ha a usernek van mentett referencia-címe (`user_reference_addresses`),
  // akkor a környezeti adatokat az alapján számoljuk, nem a buildingét.
  // RLS biztosítja, hogy csak saját rekordot lát.
  let displayAddress = building.address;
  let usedReferenceAddress = false;
  const { data: refAddr } = await supabase
    .from('user_reference_addresses')
    .select('display_name, lat, lon')
    .eq('user_id', user.id)
    .maybeSingle();

  if (refAddr && typeof refAddr.lat === 'number' && typeof refAddr.lon === 'number') {
    lat = refAddr.lat;
    lon = refAddr.lon;
    displayAddress = refAddr.display_name ?? building.address;
    usedReferenceAddress = true;
  }

  return (
    <EnvironmentPageClient
      buildingId={workspaceId}
      buildingName={(building as { name?: string | null }).name ?? building.address}
      buildingAddress={displayAddress}
      buildingLat={lat}
      buildingLon={lon}
      usedReferenceAddress={usedReferenceAddress}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);

  return {
    title: context ? `Környezet · ${context.workspaceName} — PanelLakó` : 'Környezet — PanelLakó',
    description: 'Levegőminőség, kerékpáros infrastruktúra és lokális környezeti adatok',
  };
}
