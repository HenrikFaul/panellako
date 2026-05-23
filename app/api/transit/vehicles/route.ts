import { NextRequest, NextResponse } from 'next/server';
import { parseVehiclePositions, type ParsedVehicle } from '@/lib/gtfs-rt-parser';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────
export type VehicleType = 'SUBWAY' | 'TRAM' | 'TROLLEYBUS' | 'BUS' | 'RAIL' | 'FERRY';

export interface VehiclePosition {
  vehicleId: string;
  tripId:    string;
  routeRef:  string;
  lat:       number;
  lon:       number;
  bearing?:  number;
  vehicle:   VehicleType;
  headsign?: string;
  realtime:  boolean;
}

export interface VehiclesResult {
  vehicles:  VehiclePosition[];
  fetchedAt: string;
  source:    'gtfs-rt' | 'futar' | 'mock';
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GTFS_RT_BASE = 'https://go.bkk.hu/api/query/v1/ws/gtfs-rt/full';
const OBA_BASE     = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const APP_ORIGIN   = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://panellako.hu').replace(/\/$/, '');
const BKK_KEY      = process.env.BKKFUTAR_API_KEY ?? '';

const BKK_HEADERS = {
  'Accept':     '*/*',
  'User-Agent': 'panellako.hu/1.0',
  'Referer':    `${APP_ORIGIN}/`,
  'Origin':     APP_ORIGIN,
};

const GTFS_TYPE_MAP: Record<number, VehicleType> = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
  4: 'FERRY', 5: 'TRAM', 11: 'TROLLEYBUS', 12: 'TRAM',
};

// ─── Global GTFS-RT cache (full feed, 15 s TTL) ───────────────────────────────
interface GtfsCache { data: VehiclePosition[]; expires: number; }
let _gtfsCache: GtfsCache | null = null;

// ─── Supabase client (for DB-backed route map fallback) ──────────────────────
function createDbClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  ).trim();
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

// ─── Route info cache (route_id → {name, type}, 6 h TTL) ────────────────────
// GTFS-RT VehiclePositions only carries internal route_ids (e.g. BKK_3030).
// We resolve them to public short names ("75", "M4") and GTFS route types
// via BKK's OBA API. We try the agency-wide endpoint first (all routes, no
// bbox required), then fall back to the location-scoped endpoint.
interface RouteInfo { name: string; type: VehicleType; }
const ROUTE_MAP_TTL = 6 * 60 * 60 * 1000;
let _routeInfoMap:        Map<string, RouteInfo> | null = null;
let _routeInfoMapExpires: number = 0;

async function ensureRouteInfoMap(): Promise<Map<string, RouteInfo>> {
  if (_routeInfoMap && _routeInfoMapExpires > Date.now()) return _routeInfoMap;

  const key      = BKK_KEY || 'apaiary-test';
  const baseQs   = `key=${key}&version=3&appVersion=apiary-1.0`;
  const endpoints = [
    `${OBA_BASE}/routes-for-agency.json?agencyId=BKK&${baseQs}`,
    `${OBA_BASE}/routes-for-location.json?${baseQs}&lat=47.498&lon=19.040&latSpan=0.28&lonSpan=0.44&includeReferences=false`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { ...BKK_HEADERS, Accept: 'application/json' },
        signal:  AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.status !== 'OK' && json.code !== 200) continue;

      const map = new Map<string, RouteInfo>();
      type RouteEntry = { id?: string; shortName?: string; type?: number };
      for (const r of (json?.data?.list ?? []) as RouteEntry[]) {
        if (r.id && r.shortName) {
          const info: RouteInfo = { name: r.shortName, type: GTFS_TYPE_MAP[r.type ?? 3] ?? 'BUS' };
          const idNoBkk = r.id.replace(/^BKK_/, '');
          // Also normalise (strip leading zeros) so GTFS-RT lookups match:
          // "BKK_0047" stores "47" → GTFS-RT normaliseRouteRef("BKK_0047") = "47" → lookup hits
          const idNorm  = idNoBkk.replace(/^0+(\d)/, '$1').trim() || idNoBkk;
          map.set(r.id, info);       // "BKK_4750"
          map.set(idNoBkk, info);    // "4750"
          if (idNorm !== idNoBkk) map.set(idNorm, info);  // "47" (when padded, e.g. "BKK_0047")
        }
      }

      if (map.size > 0) {
        _routeInfoMap        = map;
        _routeInfoMapExpires = Date.now() + ROUTE_MAP_TTL;
        console.log(`[transit/vehicles] route map: ${map.size} routes via ${url.split('?')[0].split('/').pop()}`);
        return _routeInfoMap;
      }
    } catch (err) {
      console.warn('[transit/vehicles] route map fetch failed:', err);
    }
  }

  // OBA API unavailable — fall back to transit_routes table in Supabase
  const supabase = createDbClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('transit_routes')
        .select('route_id, short_name, type');
      if (data && data.length > 0) {
        const dbTypeMap: Record<string, VehicleType> = {
          SUBWAY: 'SUBWAY', TRAM: 'TRAM', TROLLEYBUS: 'TROLLEYBUS',
          BUS: 'BUS', RAIL: 'RAIL', FERRY: 'FERRY', CABLE_CAR: 'RAIL',
        };
        const map = new Map<string, RouteInfo>();
        for (const r of data as Array<{ route_id: string; short_name: string; type: string }>) {
          if (r.route_id && r.short_name) {
            const info: RouteInfo = { name: r.short_name, type: dbTypeMap[r.type] ?? 'BUS' };
            const idNoBkk = r.route_id.replace(/^BKK_/, '');
            const idNorm  = idNoBkk.replace(/^0+(\d)/, '$1').trim() || idNoBkk;
            map.set(r.route_id, info);
            map.set(idNoBkk,    info);
            if (idNorm !== idNoBkk) map.set(idNorm, info);
          }
        }
        if (map.size > 0) {
          _routeInfoMap        = map;
          _routeInfoMapExpires = Date.now() + ROUTE_MAP_TTL;
          console.log(`[transit/vehicles] route map: ${map.size} routes via transit_routes DB`);
          return _routeInfoMap;
        }
      }
    } catch (err) {
      console.warn('[transit/vehicles] DB route map fallback failed:', err);
    }
  }

  return _routeInfoMap ?? new Map();
}

function toVehicleType(v: ParsedVehicle): VehicleType {
  const map: Record<string, VehicleType> = {
    SUBWAY: 'SUBWAY', TRAM: 'TRAM', TROLLEYBUS: 'TROLLEYBUS',
    BUS: 'BUS', RAIL: 'RAIL', FERRY: 'FERRY',
  };
  return map[v.vehicle] ?? 'BUS';
}

// ─── GTFS-RT primary source ───────────────────────────────────────────────────
async function fetchGtfsRtAll(): Promise<VehiclePosition[]> {
  const url = `${GTFS_RT_BASE}/VehiclePositions.txt?key=${BKK_KEY}`;

  // Fetch positions + route info map in parallel
  const [res, routeInfoMap] = await Promise.all([
    fetch(url, { headers: BKK_HEADERS, signal: AbortSignal.timeout(10_000) }),
    ensureRouteInfoMap(),
  ]);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GTFS-RT VehiclePositions HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const text = await res.text();

  return parseVehiclePositions(text).map(v => {
    // Resolve internal route_id (e.g. "3030") to public short name + GTFS type
    const info     = routeInfoMap.get(v.routeRef) ?? routeInfoMap.get(`BKK_${v.routeRef}`);
    const routeRef = info?.name ?? v.routeRef;
    // Prefer the authoritative GTFS type from the route map; fall back to heuristic
    const vehicle  = info?.type ?? toVehicleType(v);
    return {
      vehicleId: v.vehicleId,
      tripId:    v.tripId,
      routeRef,
      lat:       v.lat,
      lon:       v.lon,
      bearing:   v.bearing,
      vehicle,
      headsign:  v.headsign,
      realtime:  v.realtime,
    };
  });
}

// ─── OBA JSON fallback (location-scoped) ─────────────────────────────────────
async function fetchObaVehicles(lat: number, lon: number): Promise<VehiclePosition[]> {
  const params = new URLSearchParams({
    key:               BKK_KEY || 'apaiary-test',
    version:           '3',
    appVersion:        'apiary-1.0',
    lat:               String(lat),
    lon:               String(lon),
    latSpan:           '0.012',
    lonSpan:           '0.016',
    includeReferences: 'trips,routes',
  });

  const res = await fetch(`${OBA_BASE}/vehicles-for-location.json?${params}`, {
    headers: { ...BKK_HEADERS, 'Accept': 'application/json' },
    signal:  AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OBA vehicles HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json.status !== 'OK') throw new Error(`OBA vehicles status: ${json.status}`);

  const refs     = json?.data?.references ?? {};
  const routeMap: Record<string, { shortName?: string; type?: number }> = refs.routes ?? {};
  const tripMap:  Record<string, { routeId?: string; tripHeadsign?: string }> = refs.trips ?? {};
  type VItem = { vehicleId?: string; tripId?: string; location?: { lat?: number; lon?: number }; bearing?: number };
  const list: VItem[] = json?.data?.list ?? [];

  return list
    .filter(v => v.location?.lat && v.location?.lon)
    .map(v => {
      const tripId  = v.tripId ?? '';
      const routeId = tripMap[tripId]?.routeId ?? '';
      const route   = routeMap[routeId];
      return {
        vehicleId: v.vehicleId ?? '',
        tripId,
        routeRef:  route?.shortName ?? (routeId.replace(/^BKK_/, '') || '?'),
        lat:       v.location!.lat!,
        lon:       v.location!.lon!,
        bearing:   v.bearing,
        vehicle:   GTFS_TYPE_MAP[route?.type ?? 3] ?? 'BUS',
        headsign:  tripMap[tripId]?.tripHeadsign,
        realtime:  true,
      };
    });
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const latRaw   = parseFloat(searchParams.get('lat')      ?? '47.5278845');
  const lonRaw   = parseFloat(searchParams.get('lon')      ?? '19.0705657');
  const lat      = isNaN(latRaw)   ? 47.5278845 : latRaw;
  const lon      = isNaN(lonRaw)   ? 19.0705657 : lonRaw;
  const radiusKm = parseFloat(searchParams.get('radiusKm') ?? '1.5');

  // Refresh global GTFS-RT cache when stale
  if (!_gtfsCache || _gtfsCache.expires <= Date.now()) {
    try {
      const all = await fetchGtfsRtAll();
      _gtfsCache = { data: all, expires: Date.now() + 15_000 };
    } catch (err) {
      console.warn('[transit/vehicles] GTFS-RT failed, trying OBA fallback:', err);
    }
  }

  if (_gtfsCache) {
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    const nearby = _gtfsCache.data.filter(
      v => Math.abs(v.lat - lat) <= latDelta && Math.abs(v.lon - lon) <= lonDelta
    );
    return NextResponse.json({
      vehicles: nearby, fetchedAt: new Date().toISOString(), source: 'gtfs-rt',
    } satisfies VehiclesResult);
  }

  // Fallback: OBA JSON (location-scoped request)
  try {
    const vehicles = await fetchObaVehicles(lat, lon);
    return NextResponse.json({
      vehicles, fetchedAt: new Date().toISOString(), source: 'futar',
    } satisfies VehiclesResult);
  } catch (err) {
    console.warn('[transit/vehicles] OBA fallback also failed:', err);
    return NextResponse.json({
      vehicles: [], fetchedAt: new Date().toISOString(), source: 'mock',
    } satisfies VehiclesResult);
  }
}
