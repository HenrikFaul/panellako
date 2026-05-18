import { NextRequest, NextResponse } from 'next/server';
import { parseVehiclePositions, type ParsedVehicle } from '@/lib/gtfs-rt-parser';
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
  const res = await fetch(url, {
    headers: BKK_HEADERS,
    signal:  AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GTFS-RT VehiclePositions HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  return parseVehiclePositions(text).map(v => ({
    vehicleId: v.vehicleId,
    tripId:    v.tripId,
    routeRef:  v.routeRef,
    lat:       v.lat,
    lon:       v.lon,
    bearing:   v.bearing,
    vehicle:   toVehicleType(v),
    headsign:  v.headsign,
    realtime:  v.realtime,
  }));
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
  const lat      = parseFloat(searchParams.get('lat')      ?? '47.4979');
  const lon      = parseFloat(searchParams.get('lon')      ?? '19.0402');
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
