// Transit sub-page — Live map + BKK coverage + Cycling routes
// URL: /w/[buildingId]/kozlekedes

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TransitPageClient from '@/components/transit-page-client';

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${buildingId}/kozlekedes`);

  const { data: memberships } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);

  if (!memberships || memberships.length === 0) redirect('/app');

  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address, lat, lon')
    .eq('id', buildingId)
    .single();

  if (!building) redirect('/app');

  let lat: number = (building as { lat?: number | null }).lat ?? 47.5278845;
  let lon: number = (building as { lon?: number | null }).lon ?? 19.0705657;

  if ((!lat || !lon) && building.address) {
    const geo = await geocodeAddress(building.address);
    if (geo) {
      lat = geo.lat;
      lon = geo.lon;
      await supabase
        .from('buildings')
        .update({ lat: geo.lat, lon: geo.lon, geocoded_at: new Date().toISOString() })
        .eq('id', buildingId);
    }
  }

  const buildingName = (building as { name?: string | null }).name ?? building.address;

  return (
    <TransitPageClient
      buildingId={buildingId}
      buildingName={buildingName}
      buildingAddress={building.address}
      buildingLat={lat}
      buildingLon={lon}
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
  const name = building ? ((building as { name?: string | null }).name ?? building.address) : '';
  return {
    title: building ? `Közlekedés · ${name} — PanelLakó` : 'Közlekedés — PanelLakó',
    description: 'Élő járattérkép, BKK menetrend, tömegközlekedési lefedettség, kerékpáros útvonalak',
  };
}
