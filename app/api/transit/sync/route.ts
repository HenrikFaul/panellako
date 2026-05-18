import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveStopsToCache } from '@/lib/transit-cache';
import type { NearbyStop, RouteType } from '@/app/api/transit/nearby/route';

const SYNC_SECRET = process.env.TRANSIT_SYNC_SECRET ?? 'transit-sync-dev';

const BKK_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const BKK_KEY  = process.env.BKKFUTAR_API_KEY ?? 'apaiary-test';

const GTFS_TYPE_MAP: Record<number, RouteType> = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
  4: 'FERRY', 5: 'CABLE_CAR', 7: 'CABLE_CAR', 11: 'TROLLEYBUS', 12: 'TRAM',
};

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchFutarStopsForSync(lat: number, lon: number): Promise<NearbyStop[]> {
  const params = new URLSearchParams({
    key:        BKK_KEY,
    version:    '3',
    appVersion: 'apiary-1.0',
    lat:        String(lat),
    lon:        String(lon),
    latSpan:    '0.007',
    lonSpan:    '0.009',
  });

  const res = await fetch(`${BKK_BASE}/stops-for-location.json?${params}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal:  AbortSignal.timeout(9000),
  });

  if (!res.ok) throw new Error(`Futár stops HTTP ${res.status}`);

  const json = await res.json();
  if (json.status !== 'OK') throw new Error(`Futár stops status: ${json.status}`);

  const routeRefs: Record<string, { shortName?: string; type?: number }> =
    json?.data?.references?.routes ?? {};

  const list: Array<{
    id:       string;
    name?:    string;
    lat?:     number;
    lon?:     number;
    routeIds?: string[];
    routes?:   Array<{ id?: string; shortName?: string; type?: number }>;
  }> = json?.data?.list ?? [];

  if (list.length === 0) throw new Error('Futár stops-for-location returned empty list');

  return list
    .map(s => {
      const sLat = s.lat ?? lat;
      const sLon = s.lon ?? lon;
      const distanceM = Math.round(haversineM(lat, lon, sLat, sLon));

      let routeRefs2: string[] = [];
      if (Array.isArray(s.routes) && s.routes.length > 0) {
        routeRefs2 = s.routes.map(r => r.shortName ?? '').filter(Boolean);
      } else if (Array.isArray(s.routeIds) && s.routeIds.length > 0) {
        routeRefs2 = s.routeIds
          .map(id => routeRefs[id]?.shortName ?? '')
          .filter(Boolean);
      }

      let routeType: RouteType = 'BUS';
      const firstRouteId = (s.routeIds ?? [])[0] ?? (s.routes ?? [])[0]?.id ?? '';
      const firstRoute   = routeRefs[firstRouteId] ?? (s.routes ?? [])[0];
      if (firstRoute?.type !== undefined) {
        routeType = GTFS_TYPE_MAP[firstRoute.type] ?? 'BUS';
      }

      return {
        id:        s.id,
        name:      s.name ?? 'Megálló',
        lat:       sLat,
        lon:       sLon,
        distanceM,
        routeRefs: routeRefs2,
        routeType,
      };
    })
    .filter(s => s.distanceM <= 700)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 12);
}

// ─── POST /api/transit/sync ───────────────────────────────────────────────────
// Authorization: Bearer <TRANSIT_SYNC_SECRET>
// Optional query param: ?buildingId=<uuid>  → sync a single building
// Without buildingId → sync all buildings that have coordinates
export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token !== SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const singleBuildingId = searchParams.get('buildingId');

  const supabase = createClient();

  // Fetch buildings
  let query = supabase
    .from('buildings')
    .select('id, lat, lon')
    .not('lat', 'is', null)
    .not('lon', 'is', null);

  if (singleBuildingId) {
    query = query.eq('id', singleBuildingId);
  }

  const { data: buildings, error: buildingsError } = await query;

  if (buildingsError) {
    return NextResponse.json({ error: buildingsError.message }, { status: 500 });
  }

  if (!buildings || buildings.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0, errors: [] });
  }

  type Building = { id: string; lat: number; lon: number };
  const results = {
    synced:  0,
    skipped: 0,
    errors:  [] as Array<{ buildingId: string; error: string }>,
  };

  for (const building of buildings as Building[]) {
    try {
      const stops = await fetchFutarStopsForSync(building.lat, building.lon);
      await saveStopsToCache(supabase, building.id, stops);
      results.synced++;
    } catch (err) {
      results.errors.push({
        buildingId: building.id,
        error:      err instanceof Error ? err.message : String(err),
      });
      results.skipped++;
    }
  }

  return NextResponse.json({
    ...results,
    syncedAt: new Date().toISOString(),
  });
}
