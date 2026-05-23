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
  timeStr:  string;   // "HH:MM" scheduled departure or ""
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
  stopTimes?:    TripStopTime[];
}

const BKK_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const BKK_KEY  = process.env.BKKFUTAR_API_KEY ?? 'apaiary-test';

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

// ─── Cache (5 min — shapes don't change often) ────────────────────────────────
const _cache = new Map<string, { data: TripShape; expires: number }>();

// ─── DB-based shape lookup (uses gtfs_trips + gtfs_shapes) ───────────────────

async function fetchShapeFromDb(tripId: string): Promise<TripShape | null> {
  const supabase = createDbClient();
  if (!supabase) return null;

  const { data: trip } = await supabase
    .from('gtfs_trips')
    .select('shape_id, route_id, trip_headsign, wheelchair_accessible')
    .eq('trip_id', tripId)
    .maybeSingle();

  if (!trip?.shape_id) return null;

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

  const routeType = route?.type ?? 'BUS';
  const color = route?.color ?? ROUTE_COLORS[routeType] ?? '#38bdf8';

  // Try to fetch stop times from gtfs_stop_times + gtfs_stops
  let stopTimes: TripStopTime[] | undefined;
  const nowHHMM = new Date().toLocaleTimeString('hu-HU', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Europe/Budapest',
  }); // "HH:MM:SS"
  try {
    const { data: stRows } = await supabase
      .from('gtfs_stop_times')
      .select('stop_id, departure_time, stop_sequence, gtfs_stops(stop_name, stop_lat, stop_lon)')
      .eq('trip_id', tripId)
      .order('stop_sequence');

    if (stRows && stRows.length > 0) {
      stopTimes = (stRows as unknown as Array<{
        stop_id: string;
        departure_time: string;
        stop_sequence: number;
        gtfs_stops: { stop_name: string; stop_lat: number; stop_lon: number } | null;
      }>).map(row => {
        const depStr = row.departure_time ?? ''; // "HH:MM:SS"
        const timeStr = depStr.length >= 5 ? depStr.slice(0, 5) : depStr;
        const isPast = depStr.length > 0 ? depStr <= nowHHMM : false;
        const s = row.gtfs_stops;
        return {
          stopId:   row.stop_id,
          stopName: s?.stop_name ?? row.stop_id,
          lat:      s?.stop_lat ?? 0,
          lon:      s?.stop_lon ?? 0,
          timeStr,
          isPast,
        };
      });
    }
  } catch { /* gtfs_stop_times may not exist — stopTimes stays undefined */ }

  // Only use DB result when we have stop times; otherwise BKK API has richer, current data
  if (!stopTimes || stopTimes.length === 0) return null;

  return {
    points:     pts.map(p => ({ lat: p.lat as number, lon: p.lon as number })),
    routeRef:   route?.short_name ?? '?',
    color,
    source:     'db',
    headsign:   trip.trip_headsign ?? undefined,
    accessible: trip.wheelchair_accessible === 1,
    stopTimes,
  };
}

async function fetchShape(tripId: string): Promise<TripShape> {
  const base = { key: BKK_KEY, version: '3', appVersion: 'apiary-1.0' };

  // 1. Trip details → get shapeId + route color + vehicle info + schedule
  const detailsParams = new URLSearchParams({ ...base, tripId, includeSchedule: 'true', includeReferences: 'trips,routes,stops,vehicles' });
  const detailsRes = await fetch(`${BKK_BASE}/trip-details.json?${detailsParams}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal:  AbortSignal.timeout(7000),
  });
  if (!detailsRes.ok) throw new Error(`trip-details HTTP ${detailsRes.status}`);
  const detailsJson = await detailsRes.json();
  if (detailsJson.status !== 'OK') throw new Error(`trip-details status ${detailsJson.status}`);

  const trip = detailsJson?.data?.entry?.trip;
  const shapeId = trip?.shapeId ?? '';
  const routeId = trip?.routeId ?? '';
  const refs = detailsJson?.data?.references ?? {};
  const route = refs?.routes?.[routeId] ?? {};
  const routeRef = route?.shortName ?? (routeId.replace(/^BKK_/, '') || '?');
  const vehicleType: string = GTFS_TYPE[route?.type ?? 3] ?? 'BUS';
  const color = ROUTE_COLORS[vehicleType] ?? '#38bdf8';
  const headsign: string = trip?.tripHeadsign ?? '';
  const accessible: boolean = (trip?.wheelchairAccessible ?? 0) === 1;

  // Extract vehicle info from references (BKK may return assigned vehicle for active trips)
  type VehicleRef = { id?: string; label?: string; model?: string; description?: string; vehicleType?: { vehicleDescription?: string } };
  const vehicleRefs: Record<string, VehicleRef> = refs?.vehicles ?? {};
  const vehicleList = Object.values(vehicleRefs);
  const firstVehicle = vehicleList[0] as VehicleRef | undefined;
  const vehicleId   = firstVehicle?.label ?? firstVehicle?.id?.replace(/^BKK_/, '') ?? undefined;
  const vehicleModel = firstVehicle?.vehicleType?.vehicleDescription ?? firstVehicle?.description ?? firstVehicle?.model ?? undefined;

  // Parse stop times from schedule
  const serverNowSec = Math.floor(Date.now() / 1000);
  const rawStopTimes: Array<{ stopId?: string; departureTime?: number; predictedDepartureTime?: number }> =
    detailsJson?.data?.entry?.stopTimes ?? [];
  const stopRefs: Record<string, { name?: string; lat?: number; lon?: number }> = refs?.stops ?? {};

  const stopTimes: TripStopTime[] = rawStopTimes.map(st => {
    const sid = st.stopId ?? '';
    const stopRef = stopRefs[sid] ?? {};
    const depSec = st.departureTime ?? st.predictedDepartureTime ?? 0;
    let timeStr = '';
    if (depSec) {
      const d = new Date(depSec * 1000);
      timeStr = d.toLocaleTimeString('hu-HU', {
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Budapest',
      });
    }
    return {
      stopId:   sid,
      stopName: stopRef.name ?? sid,
      lat:      stopRef.lat ?? 0,
      lon:      stopRef.lon ?? 0,
      timeStr,
      isPast:   depSec > 0 && depSec < serverNowSec,
    };
  }).filter(st => st.stopId !== '');

  if (!shapeId) throw new Error('No shapeId in trip-details');

  // 2. Shape for shapeId
  const shapeParams = new URLSearchParams({ ...base, shapeId });
  const shapeRes = await fetch(`${BKK_BASE}/shape.json?${shapeParams}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal:  AbortSignal.timeout(7000),
  });
  if (!shapeRes.ok) throw new Error(`shape HTTP ${shapeRes.status}`);
  const shapeJson = await shapeRes.json();
  if (shapeJson.status !== 'OK') throw new Error(`shape status ${shapeJson.status}`);

  // BKK OBA shape.json returns `points` as a Google-encoded polyline string
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

export async function GET(request: NextRequest) {
  const tripId = request.nextUrl.searchParams.get('tripId') ?? '';
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const cached = _cache.get(tripId);
  if (cached && cached.expires > Date.now()) return NextResponse.json(cached.data);

  // Try local DB first (zero BKK API cost, no rate limit)
  try {
    const dbShape = await fetchShapeFromDb(tripId);
    if (dbShape) {
      _cache.set(tripId, { data: dbShape, expires: Date.now() + 5 * 60_000 });
      return NextResponse.json(dbShape);
    }
  } catch { /* fall through to BKK API */ }

  // Fall back to BKK Futár OBA
  try {
    const shape = await fetchShape(tripId);
    _cache.set(tripId, { data: shape, expires: Date.now() + 5 * 60_000 });
    return NextResponse.json(shape);
  } catch (err) {
    console.warn('[transit/shape] failed:', err);
    return NextResponse.json({ points: [], routeRef: '?', color: '#38bdf8', source: 'none', headsign: '', accessible: false } satisfies TripShape);
  }
}
