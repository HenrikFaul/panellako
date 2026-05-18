import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadStopsFromCache, saveStopsToCache } from '@/lib/transit-cache';

// ─── Types ────────────────────────────────────────────────────────────────────
export type RouteType = 'SUBWAY' | 'TRAM' | 'TROLLEYBUS' | 'BUS' | 'RAIL' | 'FERRY' | 'CABLE_CAR';

export interface NearbyStop {
  id:          string;
  name:        string;
  lat:         number;
  lon:         number;
  distanceM:   number;
  routeRefs:   string[];
  routeType:   RouteType;
}

export interface BubiStation {
  id:          string;
  name:        string;
  lat:         number;
  lon:         number;
  distanceM:   number;
  bikesAvail:  number;
  docksAvail:  number;
  totalDocks:  number;
}

export interface CoverageScore {
  total:        number;
  stopScore:    number;
  qualityScore: number;
  accessScore:  number;
  label:        string;
}

export interface TransitNearbyResult {
  stops:     NearbyStop[];
  bubi:      BubiStation[];
  coverage:  CoverageScore;
  source:    'futar' | 'overpass' | 'mock' | 'db';
  fetchedAt: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────
interface CacheEntry<T> { data: T; lat: number; lon: number; expires: number; }
let _cache: CacheEntry<TransitNearbyResult> | null = null;

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// API config — public test key from BKK Apiary docs, override via BKKFUTAR_API_KEY env var
const BKK_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const BKK_KEY  = process.env.BKKFUTAR_API_KEY ?? 'apaiary-test';

// GTFS route type → RouteType
const GTFS_TYPE_MAP: Record<number, RouteType> = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
  4: 'FERRY', 5: 'CABLE_CAR', 7: 'CABLE_CAR', 11: 'TROLLEYBUS', 12: 'TRAM',
};

// ─── Coverage score (GTFS-based) ─────────────────────────────────────────────
function computeCoverage(stops: NearbyStop[]): CoverageScore {
  const close = stops.filter(s => s.distanceM <= 400);
  const typeWeight: Record<RouteType, number> = {
    SUBWAY: 4, RAIL: 3, TRAM: 2.5, TROLLEYBUS: 2, BUS: 1, FERRY: 2, CABLE_CAR: 1,
  };
  const stopScore    = Math.min(close.length / 5 * 40, 40);
  const qualityRaw   = close.reduce((acc, s) => acc + typeWeight[s.routeType], 0);
  const qualityScore = Math.min(qualityRaw / 10 * 40, 40);
  const uniqueRoutes = new Set(close.flatMap(s => s.routeRefs)).size;
  const accessScore  = Math.min(uniqueRoutes / 10 * 20, 20);
  const total        = Math.round(stopScore + qualityScore + accessScore);

  let label = 'Gyenge';
  if      (total >= 80) label = 'Kiváló';
  else if (total >= 60) label = 'Jó';
  else if (total >= 40) label = 'Közepes';
  else if (total >= 20) label = 'Gyenge';

  return {
    total,
    stopScore:    Math.round(stopScore),
    qualityScore: Math.round(qualityScore),
    accessScore:  Math.round(accessScore),
    label,
  };
}

// ─── BKK Futár OBA stops-for-location ────────────────────────────────────────
// Uses the OneBusAway-style endpoint documented at opendata.bkk.hu
// Stop IDs in this response already have the BKK_ prefix (e.g. "BKK_F02297")
// which is required by the departures endpoint.
async function fetchFutarStops(lat: number, lon: number): Promise<NearbyStop[]> {
  // latSpan/lonSpan define a bounding box around the location (in degrees)
  // ~0.006 lat ≈ 667m, ~0.008 lon ≈ 560m at Budapest latitude
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

  // References contain route definitions keyed by route ID
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

      // Routes may come as inline array OR as routeIds refs to json.data.references.routes
      let routeRefs2: string[] = [];
      if (Array.isArray(s.routes) && s.routes.length > 0) {
        routeRefs2 = s.routes.map(r => r.shortName ?? '').filter(Boolean);
      } else if (Array.isArray(s.routeIds) && s.routeIds.length > 0) {
        routeRefs2 = s.routeIds
          .map(id => routeRefs[id]?.shortName ?? '')
          .filter(Boolean);
      }

      // Determine route type from the first route served at this stop
      let routeType: RouteType = 'BUS';
      const firstRouteId = (s.routeIds ?? [])[0] ?? (s.routes ?? [])[0]?.id ?? '';
      const firstRoute   = routeRefs[firstRouteId] ?? (s.routes ?? [])[0];
      if (firstRoute?.type !== undefined) {
        routeType = GTFS_TYPE_MAP[firstRoute.type] ?? 'BUS';
      }

      return {
        id:         s.id,
        name:       s.name ?? 'Megálló',
        lat:        sLat,
        lon:        sLon,
        distanceM,
        routeRefs:  routeRefs2,
        routeType,
      };
    })
    .filter(s => s.distanceM <= 700)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 12);
}

// ─── Overpass API fallback ────────────────────────────────────────────────────
async function fetchOverpassStops(lat: number, lon: number): Promise<NearbyStop[]> {
  const query = `[out:json][timeout:12];
(
  node["highway"="bus_stop"](around:700,${lat},${lon});
  node["railway"="tram_stop"](around:700,${lat},${lon});
  node["station"="subway"](around:900,${lat},${lon});
  node["railway"="halt"](around:700,${lat},${lon});
  node["public_transport"="stop_position"]["network"="BKK"](around:700,${lat},${lon});
);out body;`;

  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const mirror of mirrors) {
    try {
      const res = await fetch(mirror, {
        method:  'POST',
        body:    `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal:  AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const elements: Array<{
        id: number; lat: number; lon: number;
        tags: {
          name?: string; highway?: string; railway?: string;
          station?: string; route_ref?: string; 'route_ref:BKK'?: string;
        };
      }> = data.elements ?? [];

      const seen = new Set<string>();
      const stops: NearbyStop[] = [];

      for (const el of elements) {
        const name = el.tags.name ?? 'Megálló';
        if (seen.has(name)) continue;
        seen.add(name);

        const distanceM  = Math.round(haversineM(lat, lon, el.lat, el.lon));
        const routeRefRaw = el.tags['route_ref:BKK'] ?? el.tags.route_ref ?? '';
        const routeRefs  = routeRefRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean);

        let routeType: RouteType = 'BUS';
        if (el.tags.station === 'subway' || el.tags.railway === 'station') routeType = 'SUBWAY';
        else if (el.tags.railway === 'tram_stop') routeType = 'TRAM';
        else if (el.tags.railway === 'halt')      routeType = 'RAIL';

        stops.push({
          id: String(el.id), name, lat: el.lat, lon: el.lon,
          distanceM, routeRefs, routeType,
        });
      }

      return stops.sort((a, b) => a.distanceM - b.distanceM).slice(0, 12);
    } catch { /* try next mirror */ }
  }
  throw new Error('All Overpass mirrors failed');
}

// ─── MOL Bubi GBFS ───────────────────────────────────────────────────────────
async function fetchBubi(lat: number, lon: number): Promise<BubiStation[]> {
  const endpoints = [
    'https://www.bkk.hu/gtfs/bubi_gbfs/station_information.json',
    'https://www.bkk.hu/apps/bubi/stations.json',
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        signal:  AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'panellako.hu/1.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();

      const stations: Array<{
        station_id: string; name: string; lat: number; lon: number; capacity?: number;
        num_bikes_available?: number; num_docks_available?: number;
      }> = data?.data?.stations ?? data?.stations ?? [];

      return stations
        .map(s => ({
          id:         s.station_id,
          name:       s.name,
          lat:        s.lat,
          lon:        s.lon,
          distanceM:  Math.round(haversineM(lat, lon, s.lat, s.lon)),
          bikesAvail: s.num_bikes_available ?? 0,
          docksAvail: s.num_docks_available ?? 0,
          totalDocks: s.capacity ?? 0,
        }))
        .filter(s => s.distanceM <= 800)
        .sort((a, b) => a.distanceM - b.distanceM)
        .slice(0, 4);
    } catch { /* try next endpoint */ }
  }
  return [];
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
function getMockResult(lat: number, lon: number): TransitNearbyResult {
  const stops: NearbyStop[] = [
    { id: 'BKK_F02297', name: 'Kerepesi út / Kőér utca', lat: lat + 0.001, lon: lon + 0.002, distanceM: 180, routeRefs: ['68', '37', '68E'], routeType: 'BUS' },
    { id: 'BKK_F02131', name: 'Hungária körút',          lat: lat - 0.002, lon: lon + 0.001, distanceM: 270, routeRefs: ['72', '26', '62'],  routeType: 'BUS' },
    { id: 'BKK_F04104', name: 'Puskás Aréna',            lat: lat + 0.003, lon: lon - 0.001, distanceM: 350, routeRefs: ['1'],              routeType: 'TRAM' },
  ];
  const bubi: BubiStation[] = [
    { id: 'b1', name: 'Hungária krt. 40.', lat: lat - 0.002, lon: lon + 0.001, distanceM: 290, bikesAvail: 1, docksAvail: 3, totalDocks: 8 },
  ];
  return { stops, bubi, coverage: computeCoverage(stops), source: 'mock', fetchedAt: new Date().toISOString() };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '47.4979');
  const lon = parseFloat(searchParams.get('lon') ?? '19.0402');

  // 5-min TTL cache, per location
  if (_cache && _cache.expires > Date.now() &&
      Math.abs(_cache.lat - lat) < 0.001 && Math.abs(_cache.lon - lon) < 0.001) {
    return NextResponse.json(_cache.data);
  }

  let stops: NearbyStop[] = [];
  let bubi:  BubiStation[] = [];
  let source: TransitNearbyResult['source'] = 'mock';

  // 1. Try BKK Futár OBA stops-for-location
  try {
    stops  = await fetchFutarStops(lat, lon);
    source = 'futar';
  } catch (err) {
    console.warn('[transit/nearby] Futár stops failed:', err);

    // 2. Overpass fallback
    try {
      stops  = await fetchOverpassStops(lat, lon);
      source = 'overpass';
    } catch (err2) {
      console.warn('[transit/nearby] Overpass failed:', err2);
      const mock = getMockResult(lat, lon);
      return NextResponse.json({ ...mock, _mock: true });
    }
  }

  bubi = await fetchBubi(lat, lon).catch(() => []);

  const result: TransitNearbyResult = {
    stops, bubi, coverage: computeCoverage(stops), source,
    fetchedAt: new Date().toISOString(),
  };

  _cache = { data: result, lat, lon, expires: Date.now() + 5 * 60 * 1000 };
  return NextResponse.json(result);
}
