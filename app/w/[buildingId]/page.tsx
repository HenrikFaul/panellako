// Building-scoped dashboard.
// URL: /w/[buildingId]
// Access control: user must have an active membership in this building.

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';
import { legacyRoleFromWorkspaceContext } from '@/lib/authorization/capabilities';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

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

export default async function BuildingDashboardPage({ params }: PageProps) {
  const { buildingId: workspaceId } = params;

  if (!isWorkspaceId(workspaceId)) {
    notFound();
  }

  const supabase = createClient();

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=/w/${workspaceId}`);
  }

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');

  const role = legacyRoleFromWorkspaceContext(context.roleKeys, context.relationshipLabels);
  const unitId = context.primaryUnitId;
  const physicalBuildingId = context.primaryBuildingId;

  const { data: building } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', physicalBuildingId)
    .maybeSingle();

  const buildingRecord = building ?? {
    id: physicalBuildingId,
    name: context.buildingName,
    address: context.address,
  };

  // Geocode the building address if coordinates are not yet stored
  let buildingLat: number | null = (buildingRecord as { lat?: number | null }).lat ?? null;
  let buildingLon: number | null = (buildingRecord as { lon?: number | null }).lon ?? null;

  if ((buildingLat === null || buildingLon === null) && buildingRecord.address) {
    const geo = await geocodeAddress(buildingRecord.address);
    if (geo) {
      buildingLat = geo.lat;
      buildingLon = geo.lon;
      // Persist coordinates so future loads skip geocoding
      await supabase
        .from('buildings')
        .update({ lat: geo.lat, lon: geo.lon, geocoded_at: new Date().toISOString() })
        .eq('id', physicalBuildingId);
    }
  }

  const data = await getDashboardData(role, physicalBuildingId, {
    workspaceId,
    relatedUnitIds: context.relatedUnitIds,
  });

  // Fetch subscription state for billing banners (manager roles only)
  let subscriptionStatus: string | null = null;
  let trialEnd: string | null = null;
  if (role === 'kozos_kepviselo' || role === 'megbizott') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, trial_end')
      .eq('building_id', physicalBuildingId)
      .maybeSingle();
    if (sub) {
      subscriptionStatus = sub.status ?? null;
      trialEnd = sub.trial_end ?? null;
    }
  }

  const enrichedData = {
    ...data,
    buildingId: workspaceId,
    physicalBuildingId,
    workspaceCapabilities: context.capabilities,
    buildingName: buildingRecord.name,
    buildingAddress: buildingRecord.address,
    buildingLat:    buildingLat ?? undefined,
    buildingLon:    buildingLon ?? undefined,
    unitId:         unitId ?? undefined,
    subscriptionStatus: subscriptionStatus ?? undefined,
    trialEnd:           trialEnd ?? undefined,
  };

  return <DashboardClient data={enrichedData} />;
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);

  return {
    title: context ? `${context.workspaceName} — PanelLakó` : 'Lakóközösség — PanelLakó',
    description: context?.address ?? 'Társasházi kezelőfelület'
  };
}
