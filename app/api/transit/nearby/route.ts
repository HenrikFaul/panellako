import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────
export type RouteType = 'SUBWAY' | 'TRAM' | 'TROLLEYBUS' | 'BUS' | 'RAIL' | 'FERRY' | 'CABLE_CAR';

export interface NearbyStop {
  id:          string;
  name:        string;
  lat:         number;
  lon:         number;
  distanceM:   number;
  routeRefs:   string[];   // line numbers served here: ['72', '26', '196']
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
  total:        number;   // 0-100
  stopScore:    number;   // stop count within 400m
  qualityScore: number;   // route type quality (metro > tram > bus)
  accessScore:  number;   // unique routes within 400m
  label:        string;
}

export interface TransitNearbyResult {
  stops:     NearbyStop[];
  bubi:      BubiStation[];
  coverage:  CoverageScore;
  source:    'futar' | 'overpass' | 'mock';
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

// ─── Coverage score computation (GTFS-alapú értékelési logika) ───────────────
function computeCoverage(stops: NearbyStop[]): CoverageScore {
  const close = stops.filter(s => s.distanceM <= 400);

  // Quality weights by route type
  const typeWeight: Record<RouteType, number> = {
    SUBWAY: 4, RAIL: 3, TRAM: 2.5, TROLLEYBUS: 2, BUS: 1, FERRY: 2, CABLE_CAR: 1,
  };

  // Stop count score: 0-5 stops → 0-40pts
  const stopScore = Math.min(close.length / 5 * 40, 40);

  // Quality score: weighted sum of route types, capped at 40pts
  const qualityRaw = close.reduce((acc, s) => acc + typeWeight[s.routeType], 0);
  const qualityScore = Math.min(qualityRaw / 10 * 40, 40);

  // Unique route count score: 0-10 unique routes → 0-20pts
  const uniqueRoutes = new Set(close.flatMap(s => s.routeRefs)).size;
  const accessScore = Math.min(uniqueRoutes / 10 * 20, 20);

  const total = Math.round(stopScore + qualityScore + accessScore);

  let label = 'Gyenge';
  if (total >= 80) label = 'Kiváló';
  else if (total >= 60) label = 'Jó';
  else if (total >= 40) label = 'Közepes';
  else if (total >= 20) label = 'Gyenge';

  return {
    total, stopScore: Math.round(stopScore),
    qualityScore: Math.round(qualityScore),
    accessScore: Math.round(accessScore), label,
  };
}

// ─── BKK Futár OTP API (serves from GTFS database) ───────────────────────────
async function fetchFutarStops(lat: number, lon: number): Promise<NearbyStop[]> {
  const BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/routers/budapest/index/stops';
  const res = await fetch(`${BASE}?lat=${lat}&lon=${lon}&radius=700`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`Futár HTTP ${res.status}`);
  const data = await res.json();

  // BKK wraps results in data.data.list; some versions use data.data.entry.stops
  const list: Array<{
    id: string; code?: string; name: string; lat: number; lon: number;
    type?: string; vehicleType?: string;
    routes?: Array<{ shortName?: string; type?: number }>;
  }> = data?.data?.list ?? data?.data?.entry?.stops ?? data?.list ?? [];

  if (list.length === 0) throw new Error('Futár returned empty stop list');

  const typeMap: Record<string, RouteType> = {
    SUBWAY: 'SUBWAY', TRAM: 'TRAM', BUS: 'BUS', TROLLEYBUS: 'TROLLEYBUS',
    RAIL: 'RAIL', FERRY: 'FERRY',
  };

  return list.map(s => {
    const distanceM = Math.round(haversineM(lat, lon, s.lat, s.lon));
    const routeType: RouteType = typeMap[s.type ?? s.vehicleType ?? ''] ?? 'BUS';
    // Use inline routes array if the API returned it; otherwise populate via separate call
    const routeRefs = (s.routes ?? []).map((r: { shortName?: string }) => r.shortName ?? '').filter(Boolean);
    return { id: s.id, name: s.name, lat: s.lat, lon: s.lon, distanceM, routeRefs, routeType };
  }).filter(s => s.distanceM <= 700).sort((a, b) => a.distanceM - b.distanceM);
}

// Fetch routes for each stop via Futár
async function fetchFutarRoutes(stopId: string): Promise<string[]> {
  const BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/routers/budapest/index/stops';
  const res = await fetch(`${BASE}/${stopId}/routes`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const routes: Array<{ shortName?: string; longName?: string }> = data?.data?.list ?? [];
  return routes.map(r => r.shortName ?? '').filter(Boolean);
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

  // Try multiple Overpass mirrors
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const mirror of mirrors) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const data = await res.json();

      const elements: Array<{
        id: number; lat: number; lon: number;
        tags: { name?: string; highway?: string; railway?: string; station?: string; route_ref?: string; 'route_ref:BKK'?: string };
      }> = data.elements ?? [];

      const seen = new Set<string>();
      const stops: NearbyStop[] = [];

      for (const el of elements) {
        const name = el.tags.name ?? 'Megálló';
        if (seen.has(name)) continue;
        seen.add(name);

        const distanceM = Math.round(haversineM(lat, lon, el.lat, el.lon));

        const routeRefRaw = el.tags['route_ref:BKK'] ?? el.tags.route_ref ?? '';
        const routeRefs = routeRefRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean);

        let routeType: RouteType = 'BUS';
        if (el.tags.station === 'subway' || el.tags.railway === 'station') routeType = 'SUBWAY';
        else if (el.tags.railway === 'tram_stop') routeType = 'TRAM';
        else if (el.tags.railway === 'halt') routeType = 'RAIL';

        stops.push({ id: String(el.id), name, lat: el.lat, lon: el.lon, distanceM, routeRefs, routeType });
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
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'panellako.hu/1.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();

      // GBFS station_information format
      const stations: Array<{
        station_id: string; name: string; lat: number; lon: number; capacity?: number;
        num_bikes_available?: number; num_docks_available?: number;
      }> = data?.data?.stations ?? data?.stations ?? [];

      return stations
        .map(s => ({
          id: s.station_id,
          name: s.name,
          lat: s.lat,
          lon: s.lon,
          distanceM: Math.round(haversineM(lat, lon, s.lat, s.lon)),
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

// ─── Mock data (realistic Budapest fallback) ─────────────────────────────────
function getMockResult(lat: number, lon: number): TransitNearbyResult {
  const stops: NearbyStop[] = [
    { id: 'm1', name: 'Kerepesi út / Kőér utca', lat: lat + 0.001, lon: lon + 0.002, distanceM: 180, routeRefs: ['68', '37', '68E'], routeType: 'BUS' },
    { id: 'm2', name: 'Hungária körút', lat: lat - 0.002, lon: lon + 0.001, distanceM: 270, routeRefs: ['72', '26', '62'], routeType: 'BUS' },
    { id: 'm3', name: 'Puskás Aréna', lat: lat + 0.003, lon: lon - 0.001, distanceM: 350, routeRefs: ['1'], routeType: 'TRAM' },
    { id: 'm4', name: 'Kőbánya-Kispest M', lat: lat - 0.004, lon: lon + 0.003, distanceM: 480, routeRefs: ['M3'], routeType: 'SUBWAY' },
    { id: 'm5', name: 'Orczy tér', lat: lat + 0.004, lon: lon - 0.002, distanceM: 520, routeRefs: ['7', '7E', '107'], routeType: 'BUS' },
    { id: 'm6', name: 'Rákóczi út / Orczy út', lat: lat - 0.005, lon: lon - 0.001, distanceM: 620, routeRefs: ['N7', '182'], routeType: 'BUS' },
  ];
  const bubi: BubiStation[] = [
    { id: 'b1', name: 'Kőbánya-Kispest M', lat: lat - 0.004, lon: lon + 0.003, distanceM: 480, bikesAvail: 4, docksAvail: 6, totalDocks: 10 },
    { id: 'b2', name: 'Hungária krt. 40.', lat: lat - 0.002, lon: lon + 0.001, distanceM: 290, bikesAvail: 1, docksAvail: 3, totalDocks: 8 },
  ];
  return { stops, bubi, coverage: computeCoverage(stops), source: 'mock', fetchedAt: new Date().toISOString() };
}

// ─── Main route handler ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '47.4979');
  const lon = parseFloat(searchParams.get('lon') ?? '19.0402');

  // Check cache (5-min TTL, per-location)
  if (_cache && _cache.expires > Date.now() && Math.abs(_cache.lat - lat) < 0.001 && Math.abs(_cache.lon - lon) < 0.001) {
    return NextResponse.json(_cache.data);
  }

  let stops: NearbyStop[] = [];
  let bubi: BubiStation[] = [];
  let source: TransitNearbyResult['source'] = 'mock';

  // 1. Try BKK Futár (GTFS-backed OTP API)
  try {
    stops = await fetchFutarStops(lat, lon);
    // Enrich with route info (parallel, best-effort)
    const routePromises = stops.slice(0, 8).map(s =>
      fetchFutarRoutes(s.id).then(refs => { s.routeRefs = refs; }).catch(() => {})
    );
    await Promise.allSettled(routePromises);
    source = 'futar';
  } catch (err) {
    console.warn('[transit/nearby] Futár failed:', err);

    // 2. Try Overpass API
    try {
      stops = await fetchOverpassStops(lat, lon);
      source = 'overpass';
    } catch (err2) {
      console.warn('[transit/nearby] Overpass failed:', err2);
      // 3. Mock fallback
      const mock = getMockResult(lat, lon);
      return NextResponse.json({ ...mock, _mock: true });
    }
  }

  // Bubi (independent, best-effort)
  bubi = await fetchBubi(lat, lon).catch(() => []);

  const result: TransitNearbyResult = {
    stops, bubi, coverage: computeCoverage(stops), source,
    fetchedAt: new Date().toISOString(),
  };

  _cache = { data: result, lat, lon, expires: Date.now() + 5 * 60 * 1000 };
  return NextResponse.json(result);
}
