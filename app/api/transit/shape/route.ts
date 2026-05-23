import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ShapePoint { lat: number; lon: number; }

export interface TripStopTime {
  stopId:   string;
  stopName: string;
  lat:      number;
  lon:      number;
  timeStr:  string;   // "HH:MM" scheduled departure or "" when unknown
  isPast:   boolean;
}

export interface TripShape {
  points:        ShapePoint[];
  routeRef:      string;
  color:         string;
  source:        'db' | 'futar' | 'none';
  headsign?:     string;
  vehicleId?:    string;
  vehicleModel?: string;
  accessible?:   boolean;
  directionId?:  number;   // 0 = primary direction, 1 = return
  stopTimes?:    TripStopTime[];
}

// Use || not ?? so that an empty-string env var still falls back to the test key
const BKK_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const BKK_KEY  = process.env.BKKFUTAR_API_KEY || 'apaiary-test';

function createDbClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key  = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const ROUTE_COLORS: Record<string, string> = {
  TRAM: '#fbbf24', SUBWAY: '#ef4444', RAIL: '#a78bfa',
  TROLLEYBUS: '#f87171', BUS: '#38bdf8', FERRY: '#2dd4bf',
};

const GTFS_TYPE: Record<number, string> = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS', 11: 'TROLLEYBUS', 12: 'TRAM',
};

// ─── Google encoded-polyline decoder (BKK OBA shape.json returns this format) ─
function decodePolyline(encoded: string): ShapePoint[] {
  const points: ShapePoint[] = [];
  let index = 0, lat = 0, lon = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lon += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ lat: lat / 1e5, lon: lon / 1e5 });
  }
  return points;
}

// ─── Haversine distance (metres) ─────────────────────────────────────────────
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Project stops onto shape polyline ───────────────────────────────────────
// Solves the "transit_stop_routes fallback" direction-mixing problem:
//   - transit_stop_routes has ALL stops for a route (both directions merged, no ordering)
//   - We project each stop onto the direction-specific shape polyline to get its
//     along-track index (= sequencing key) and perpendicular distance (= which
//     platform is actually on this direction's side of the road)
//   - Stops with the same name within 500 m (= opposing platforms) are deduplicated
//     by keeping the one with the smallest perpendicular distance to the shape
//   - Stops > 2 km from the shape are dropped (not served by this trip variant)
function projectStopsOntoShape(stops: TripStopTime[], shape: ShapePoint[]): TripStopTime[] {
  if (shape.length === 0 || stops.length === 0) return stops;

  type Projected = { st: TripStopTime; projIdx: number; perpDist: number };

  // Step 1 — Project every stop onto its nearest shape point
  const projected: Projected[] = stops
    .filter(st => st.lat !== 0 && st.lon !== 0)   // skip stops with missing coords
    .map(st => {
      let bestIdx = 0, bestDist = Infinity;
      for (let i = 0; i < shape.length; i++) {
        const d = haversineM(st.lat, st.lon, shape[i].lat, shape[i].lon);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      return { st, projIdx: bestIdx, perpDist: bestDist };
    })
    .filter(p => p.perpDist < 2000);  // drop stops > 2 km from shape (wrong variant)

  // Step 2 — Deduplicate opposing-direction platforms
  // Two stops are "same-location duplicates" when their names match AND they are < 500 m apart.
  // Keep the one closest to the shape (= correct-direction platform).
  const keep: boolean[] = new Array(projected.length).fill(true);
  for (let i = 0; i < projected.length; i++) {
    if (!keep[i]) continue;
    const a = projected[i];
    const aKey = a.st.stopName.toLowerCase().trim().replace(/\s+/g, ' ');
    for (let j = i + 1; j < projected.length; j++) {
      if (!keep[j]) continue;
      const b = projected[j];
      const bKey = b.st.stopName.toLowerCase().trim().replace(/\s+/g, ' ');
      if (aKey !== bKey) continue;
      if (haversineM(a.st.lat, a.st.lon, b.st.lat, b.st.lon) >= 500) continue;
      // Same-location duplicate: drop the one with larger perpendicular distance
      if (a.perpDist <= b.perpDist) {
        keep[j] = false;
      } else {
        keep[i] = false;
        break;
      }
    }
  }

  // Step 3 — Sort survivors by along-track position
  return projected
    .filter((_, idx) => keep[idx])
    .sort((a, b) => a.projIdx - b.projIdx)
    .map(p => p.st);
}

// ─── Trip ID normalisation ────────────────────────────────────────────────────
// GTFS-RT returns  "BKK_EF_B05579_20260523_0"
// BKK OBA returns  "BKK_B05579_20260523_0"
// GTFS trips.txt   "B05579_20260523_0"   (no prefix)
// We try all variants so the DB lookup finds the right row.
function tripIdVariants(tripId: string): string[] {
  const ids = new Set<string>([tripId]);
  if (tripId.startsWith('BKK_EF_')) {
    const bare = tripId.slice('BKK_EF_'.length);
    ids.add(bare);
    ids.add(`BKK_${bare}`);
  } else if (tripId.startsWith('BKK_')) {
    const bare = tripId.slice('BKK_'.length);
    ids.add(bare);
    ids.add(`BKK_EF_${bare}`);
  } else {
    ids.add(`BKK_${tripId}`);
    ids.add(`BKK_EF_${tripId}`);
  }
  return [...ids];
}

// ─── Cache (5 min) ────────────────────────────────────────────────────────────
const _cache = new Map<string, { data: TripShape; expires: number }>();

// ─── DB-based shape lookup ────────────────────────────────────────────────────
// Uses gtfs_trips → gtfs_shapes (668 K points) + transit_routes.
// For stop list: tries gtfs_stop_times first; falls back to transit_stop_routes
// (which gives stops served by the route without scheduled times).
// Returns null only when the trip is not found in gtfs_trips at all.
async function fetchShapeFromDb(tripId: string): Promise<TripShape | null> {
  const supabase = createDbClient();
  if (!supabase) return null;

  // Try every ID variant until one matches gtfs_trips.
  // Also fetch direction_id — it is the authoritative signal for which direction
  // this trip travels and is used downstream for stop-list deduplication.
  const variants = tripIdVariants(tripId);
  type TripRow = {
    shape_id: string; route_id: string;
    trip_headsign: string | null;
    wheelchair_accessible: number | null;
    direction_id: number | null;
  };
  let trip: TripRow | null = null;
  for (const tid of variants) {
    const { data } = await supabase
      .from('gtfs_trips')
      .select('shape_id, route_id, trip_headsign, wheelchair_accessible, direction_id')
      .eq('trip_id', tid)
      .maybeSingle();
    if (data?.shape_id) { trip = data as unknown as TripRow; break; }
  }
  if (!trip?.shape_id) return null;

  // Fetch shape points + route metadata in parallel
  const [{ data: pts }, { data: route }] = await Promise.all([
    supabase
      .from('gtfs_shapes')
      .select('lat, lon')
      .eq('shape_id', trip.shape_id)
      .order('pt_sequence'),
    supabase
      .from('transit_routes')
      .select('short_name, type, color')
      .eq('route_id', trip.route_id)
      .maybeSingle(),
  ]);

  if (!pts || pts.length === 0) return null;

  const shapePoints: ShapePoint[] = pts.map(p => ({ lat: p.lat as number, lon: p.lon as number }));
  const routeType = route?.type ?? 'BUS';
  const color     = route?.color ?? ROUTE_COLORS[routeType] ?? '#38bdf8';
  const routeRef  = route?.short_name || trip.route_id.replace(/^BKK_/, '') || '';

  // ── Stop list: try gtfs_stop_times first (authoritative per-trip ordering) ──
  // gtfs_stop_times is per-trip so it is inherently direction-correct — no
  // deduplication needed when it is populated.
  let stopTimes: TripStopTime[] | undefined;

  const nowHHMM = new Date().toLocaleTimeString('hu-HU', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Europe/Budapest',
  });

  // Try every ID variant — the table may store a different prefix than gtfs_trips
  for (const tid of variants) {
    try {
      const { data: stRows } = await supabase
        .from('gtfs_stop_times')
        .select('stop_id, departure_time, stop_sequence, gtfs_stops(stop_name, stop_lat, stop_lon)')
        .eq('trip_id', tid)
        .order('stop_sequence')
        .limit(120);

      if (stRows && stRows.length > 0) {
        type StRow = {
          stop_id: string; departure_time: string; stop_sequence: number;
          gtfs_stops: { stop_name: string; stop_lat: number; stop_lon: number } | null;
        };
        stopTimes = (stRows as unknown as StRow[]).map(row => {
          const depStr  = row.departure_time ?? '';
          const timeStr = depStr.length >= 5 ? depStr.slice(0, 5) : depStr;
          const s       = row.gtfs_stops;
          return {
            stopId:   row.stop_id,
            stopName: s?.stop_name ?? row.stop_id,
            lat:      s?.stop_lat  ?? 0,
            lon:      s?.stop_lon  ?? 0,
            timeStr,
            isPast:   depStr.length > 0 && depStr <= nowHHMM,
          };
        });
        break;   // found — stop trying variants
      }
    } catch { /* gtfs_stop_times not populated — continue */ }
  }

  // ── Fallback: transit_stop_routes (has ALL stops for the route, both dirs) ──
  // Problem: this returns opposing-direction platform stops too, causing
  // duplicate stop names and wrong ordering in the panel.
  // Fix: project onto the direction-specific shape polyline →
  //   • auto-sorts stops by along-track position (= correct direction order)
  //   • drops stops > 2 km from shape (wrong variant / terminus-only stops)
  //   • deduplicates same-name stops within 500 m (opposing platforms)
  if (!stopTimes || stopTimes.length === 0) {
    try {
      // Fetch more rows (200) because both directions are merged here; after
      // projection + deduplication we expect ~half to survive.
      const { data: srRows } = await supabase
        .from('transit_stop_routes')
        .select('stop_id, transit_stops(stop_id, name, lat, lon)')
        .eq('route_id', trip.route_id)
        .limit(200);

      if (srRows && srRows.length > 0) {
        type SRRow = { stop_id: string; transit_stops: { stop_id: string; name: string; lat: number; lon: number } | null };
        const rawStops = (srRows as unknown as SRRow[])
          .map(r => {
            const s = Array.isArray(r.transit_stops) ? r.transit_stops[0] : r.transit_stops;
            if (!s?.name || !s.lat || !s.lon) return null;
            return { stopId: s.stop_id, stopName: s.name, lat: s.lat, lon: s.lon, timeStr: '', isPast: false };
          })
          .filter((x): x is TripStopTime => x !== null);

        // Geometric projection: sort by along-track position + remove duplicates
        stopTimes = projectStopsOntoShape(rawStops, shapePoints);
      }
    } catch { /* transit_stop_routes query failed */ }
  }

  return {
    points:      shapePoints,
    routeRef,
    color,
    source:      'db',
    headsign:    trip.trip_headsign ?? undefined,
    accessible:  trip.wheelchair_accessible === 1,
    directionId: trip.direction_id ?? undefined,
    stopTimes:   stopTimes?.length ? stopTimes : undefined,
  };
}

// ─── BKK Futár OBA fallback (when trip not in gtfs_trips) ────────────────────
async function fetchShape(tripId: string): Promise<TripShape> {
  const base = { key: BKK_KEY, version: '3', appVersion: 'apiary-1.0' };

  const detailsParams = new URLSearchParams({ ...base, tripId, includeSchedule: 'true', includeReferences: 'trips,routes,stops,vehicles' });
  const detailsRes = await fetch(`${BKK_BASE}/trip-details.json?${detailsParams}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal:  AbortSignal.timeout(8000),
  });
  if (!detailsRes.ok) throw new Error(`trip-details HTTP ${detailsRes.status}`);
  const detailsJson = await detailsRes.json();
  if (detailsJson.status !== 'OK') throw new Error(`trip-details status ${detailsJson.status}`);

  const trip    = detailsJson?.data?.entry?.trip;
  const shapeId = trip?.shapeId ?? '';
  const routeId = trip?.routeId ?? '';
  const refs    = detailsJson?.data?.references ?? {};
  const route   = refs?.routes?.[routeId] ?? {};
  const routeRef      = route?.shortName || routeId.replace(/^BKK_/, '') || '?';
  const vehicleType   = GTFS_TYPE[route?.type ?? 3] ?? 'BUS';
  const color         = ROUTE_COLORS[vehicleType] ?? '#38bdf8';
  const headsign      = trip?.tripHeadsign ?? '';
  const accessible    = (trip?.wheelchairAccessible ?? 0) === 1;

  type VehicleRef = { id?: string; label?: string; model?: string; description?: string; vehicleType?: { vehicleDescription?: string } };
  const vehicleList  = Object.values(refs?.vehicles ?? {}) as VehicleRef[];
  const firstVehicle = vehicleList[0];
  const vehicleId    = firstVehicle?.label ?? firstVehicle?.id?.replace(/^BKK_/, '');
  const vehicleModel = firstVehicle?.vehicleType?.vehicleDescription ?? firstVehicle?.description ?? firstVehicle?.model;

  const serverNowSec = Math.floor(Date.now() / 1000);
  type ST = { stopId?: string; departureTime?: number; predictedDepartureTime?: number };
  const rawStopTimes: ST[] = detailsJson?.data?.entry?.stopTimes ?? [];
  const stopRefs: Record<string, { name?: string; lat?: number; lon?: number }> = refs?.stops ?? {};

  const stopTimes: TripStopTime[] = rawStopTimes
    .filter(st => !!st.stopId)
    .map(st => {
      const sid    = st.stopId!;
      const sr     = stopRefs[sid] ?? {};
      const depSec = st.departureTime ?? st.predictedDepartureTime ?? 0;
      let timeStr = '';
      if (depSec) {
        timeStr = new Date(depSec * 1000).toLocaleTimeString('hu-HU', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest',
        });
      }
      return { stopId: sid, stopName: sr.name ?? sid, lat: sr.lat ?? 0, lon: sr.lon ?? 0, timeStr, isPast: depSec > 0 && depSec < serverNowSec };
    });

  if (!shapeId) throw new Error('No shapeId in trip-details');

  const shapeParams = new URLSearchParams({ ...base, shapeId });
  const shapeRes = await fetch(`${BKK_BASE}/shape.json?${shapeParams}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal:  AbortSignal.timeout(8000),
  });
  if (!shapeRes.ok) throw new Error(`shape HTTP ${shapeRes.status}`);
  const shapeJson = await shapeRes.json();
  if (shapeJson.status !== 'OK') throw new Error(`shape status ${shapeJson.status}`);

  const rawPoints = shapeJson?.data?.entry?.points;
  let points: ShapePoint[] = [];
  if (typeof rawPoints === 'string' && rawPoints.length > 0) {
    points = decodePolyline(rawPoints);
  } else if (Array.isArray(rawPoints)) {
    points = (rawPoints as Array<{ lat?: number; lon?: number }>)
      .filter(p => p.lat !== undefined && p.lon !== undefined)
      .map(p => ({ lat: p.lat!, lon: p.lon! }));
  }
  if (points.length === 0) throw new Error('Empty shape points');

  return { points, routeRef, color, source: 'futar', headsign, accessible, vehicleId, vehicleModel, stopTimes };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const tripId = request.nextUrl.searchParams.get('tripId') ?? '';
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const cached = _cache.get(tripId);
  if (cached && cached.expires > Date.now()) return NextResponse.json(cached.data);

  // Primary: local DB (no BKK API rate-limit, fast, works offline)
  try {
    const dbShape = await fetchShapeFromDb(tripId);
    if (dbShape) {
      _cache.set(tripId, { data: dbShape, expires: Date.now() + 5 * 60_000 });
      return NextResponse.json(dbShape);
    }
  } catch (err) {
    console.warn('[transit/shape] DB path failed:', err);
  }

  // Fallback: BKK Futár OBA (for trips not yet in our GTFS snapshot)
  try {
    const shape = await fetchShape(tripId);
    _cache.set(tripId, { data: shape, expires: Date.now() + 5 * 60_000 });
    return NextResponse.json(shape);
  } catch (err) {
    console.warn('[transit/shape] BKK OBA failed:', err);
    return NextResponse.json({
      points: [], routeRef: '', color: '#38bdf8', source: 'none', headsign: '', accessible: false,
    } satisfies TripShape);
  }
}
