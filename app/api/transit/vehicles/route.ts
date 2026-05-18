import { NextRequest, NextResponse } from 'next/server';

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
  source:    'futar' | 'mock';
}

// ─── Cache (15 s TTL for live vehicles) ──────────────────────────────────────
interface CacheEntry { data: VehiclesResult; lat: number; lon: number; expires: number; }
let _cache: CacheEntry | null = null;

const BKK_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const BKK_KEY  = process.env.BKKFUTAR_API_KEY ?? 'apaiary-test';

const GTFS_TYPE_MAP: Record<number, VehicleType> = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
  4: 'FERRY', 5: 'TRAM', 11: 'TROLLEYBUS', 12: 'TRAM',
};

// ─── BKK Futár vehicles-for-location ─────────────────────────────────────────
async function fetchVehicles(lat: number, lon: number): Promise<VehiclePosition[]> {
  const params = new URLSearchParams({
    key:               BKK_KEY,
    version:           '3',
    appVersion:        'apiary-1.0',
    lat:               String(lat),
    lon:               String(lon),
    latSpan:           '0.012',
    lonSpan:           '0.016',
    includeReferences: 'trips,routes',
  });

  const res = await fetch(`${BKK_BASE}/vehicles-for-location.json?${params}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal:  AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Futár vehicles HTTP ${res.status}`);

  const json = await res.json();
  if (json.status !== 'OK') throw new Error(`Futár vehicles status: ${json.status}`);

  const refs     = json?.data?.references ?? {};
  const routeRefs: Record<string, { shortName?: string; type?: number }> = refs.routes ?? {};
  const tripRefs:  Record<string, { routeId?: string; tripHeadsign?: string }> = refs.trips ?? {};

  type VehicleItem = {
    vehicleId?:  string;
    tripId?:     string;
    location?:   { lat?: number; lon?: number };
    bearing?:    number;
    status?:     string;
  };

  const list: VehicleItem[] = json?.data?.list ?? [];

  return list
    .filter(v => v.location?.lat && v.location?.lon)
    .map(v => {
      const tripId  = v.tripId ?? '';
      const routeId = tripRefs[tripId]?.routeId ?? '';
      const route   = routeRefs[routeId];
      return {
        vehicleId: v.vehicleId ?? '',
        tripId,
        routeRef:  route?.shortName ?? (routeId.replace(/^BKK_/, '') || '?'),
        lat:       v.location!.lat!,
        lon:       v.location!.lon!,
        bearing:   v.bearing,
        vehicle:   GTFS_TYPE_MAP[route?.type ?? 3] ?? 'BUS',
        headsign:  tripRefs[tripId]?.tripHeadsign,
        realtime:  true,
      };
    });
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '47.4979');
  const lon = parseFloat(searchParams.get('lon') ?? '19.0402');

  // 15 s cache, same location
  if (_cache && _cache.expires > Date.now() &&
      Math.abs(_cache.lat - lat) < 0.001 && Math.abs(_cache.lon - lon) < 0.001) {
    return NextResponse.json(_cache.data);
  }

  try {
    const vehicles = await fetchVehicles(lat, lon);
    const result: VehiclesResult = {
      vehicles, fetchedAt: new Date().toISOString(), source: 'futar',
    };
    _cache = { data: result, lat, lon, expires: Date.now() + 15_000 };
    return NextResponse.json(result);
  } catch (err) {
    console.warn('[transit/vehicles] Futár failed:', err);
    return NextResponse.json({
      vehicles: [], fetchedAt: new Date().toISOString(), source: 'mock',
    } satisfies VehiclesResult);
  }
}
