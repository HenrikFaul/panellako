// Environment page — Air quality + Cycling routes
// URL: /w/[buildingId]/kornyezet

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EnvironmentPageClient from '@/components/environment-page-client';

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${buildingId}/kornyezet`);

  // Verify membership
  const { data: memberships } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);

  if (!memberships || memberships.length === 0) redirect('/app');

  // Fetch building info
  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address, lat, lon')
    .eq('id', buildingId)
    .single();

  if (!building) redirect('/app');

  let lat: number = (building as { lat?: number | null }).lat ?? 47.5278845;
  let lon: number = (building as { lon?: number | null }).lon ?? 19.0705657;

  if (!lat || !lon) {
    const geo = await geocodeAddress(building.address);
    if (geo) { lat = geo.lat; lon = geo.lon; }
  }

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
      buildingId={buildingId}
      buildingName={building.name}
      buildingAddress={displayAddress}
      buildingLat={lat}
      buildingLon={lon}
      usedReferenceAddress={usedReferenceAddress}
    />
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
    title: building ? `Környezet · ${building.name} — PanelLakó` : 'Környezet — PanelLakó',
    description: 'Levegőminőség, kerékpáros infrastruktúra és lokális környezeti adatok',
  };
}
