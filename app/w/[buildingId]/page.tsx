// Building-scoped dashboard.
// URL: /w/[buildingId]
// Access control: user must have an active membership in this building.

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';
import type { Role } from '@/lib/types';

// ─── Server-side geocoding (Nominatim) ────────────────────────────────────────
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const params = new URLSearchParams({
      q: address, format: 'json', countrycodes: 'hu', limit: '1', addressdetails: '0',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'panellako.hu/1.0 (contact via panellako.hu)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 }, // cache in Next.js fetch cache for 24h
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const allowedRoles: Role[] = [
  'lako',
  'tulajdonos',
  'kozos_kepviselo',
  'megbizott',
  'bizottsag',
  'konyvelo'
];

export default async function BuildingDashboardPage({ params }: PageProps) {
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) {
    notFound();
  }

  const supabase = createClient();

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=/w/${buildingId}`);
  }

  const { data: memberships, error: memberError } = await supabase
    .from('memberships')
    .select('role, unit_id')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);

  if (memberError) {
    console.error('[building-dashboard] membership check failed:', memberError.message);
  }

  if (!memberships || memberships.length === 0) {
    redirect('/app');
  }

  const membership = memberships[0] as { role: string; unit_id: string | null };
  const role = allowedRoles.includes(membership.role as Role)
    ? (membership.role as Role)
    : 'lako';
  const unitId = membership.unit_id ?? null;

  const { data: building } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single();

  if (!building) {
    redirect('/app');
  }

  // Geocode the building address if coordinates are not yet stored
  let buildingLat: number | null = (building as { lat?: number | null }).lat ?? null;
  let buildingLon: number | null = (building as { lon?: number | null }).lon ?? null;

  if ((buildingLat === null || buildingLon === null) && building.address) {
    const geo = await geocodeAddress(building.address);
    if (geo) {
      buildingLat = geo.lat;
      buildingLon = geo.lon;
      // Persist coordinates so future loads skip geocoding
      await supabase
        .from('buildings')
        .update({ lat: geo.lat, lon: geo.lon, geocoded_at: new Date().toISOString() })
        .eq('id', buildingId);
    }
  }

  const data = await getDashboardData(role, buildingId);

  // Fetch subscription state for billing banners (manager roles only)
  let subscriptionStatus: string | null = null;
  let trialEnd: string | null = null;
  if (role === 'kozos_kepviselo' || role === 'megbizott') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, trial_end')
      .eq('building_id', buildingId)
      .maybeSingle();
    if (sub) {
      subscriptionStatus = sub.status ?? null;
      trialEnd = sub.trial_end ?? null;
    }
  }

  const enrichedData = {
    ...data,
    buildingId,
    buildingName: building.name,
    buildingAddress: building.address,
    buildingLat:    buildingLat ?? undefined,
    buildingLon:    buildingLon ?? undefined,
    unitId:         unitId ?? undefined,
    subscriptionStatus: subscriptionStatus ?? undefined,
    trialEnd:           trialEnd ?? undefined,
  };

  return <DashboardClient data={enrichedData} />;
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data: building } = await supabase
    .from('buildings')
    .select('name, address')
    .eq('id', params.buildingId)
    .maybeSingle();

  return {
    title: building ? `${building.name} — PanelLakó` : 'Épület — PanelLakó',
    description: building?.address ?? 'Társasházi kezelőfelület'
  };
}
