// Zajriporter page
// URL: /w/[buildingId]/zaj

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NoiseDashboardClient from '@/components/noise-dashboard-client';

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server-side geocoding — same helper as the main dashboard and kornyezet pages
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const searchParams = new URLSearchParams({
      q: address, format: 'json', countrycodes: 'hu', limit: '1', addressdetails: '0',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams}`, {
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

export default async function ZajPage({ params }: PageProps) {
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${buildingId}/zaj`);

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

  if (!lat || !lon) {
    const geo = await geocodeAddress(building.address);
    if (geo) { lat = geo.lat; lon = geo.lon; }
  }

  return (
    <NoiseDashboardClient
      buildingId={buildingId}
      buildingName={(building as { name?: string | null }).name ?? building.address}
      buildingLat={lat}
      buildingLon={lon}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data: building } = await supabase
    .from('buildings')
    .select('name')
    .eq('id', params.buildingId)
    .maybeSingle();

  return {
    title: building ? `Zajriporter · ${(building as { name?: string | null }).name ?? ''} — PanelLakó` : 'Zajriporter — PanelLakó',
    description: 'Rögzítse és kövesse az épülete körüli zajszennyezést',
  };
}
