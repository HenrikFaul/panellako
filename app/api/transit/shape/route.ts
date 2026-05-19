import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ShapePoint { lat: number; lon: number; }

export interface TripShape {
  points:        ShapePoint[];
  routeRef:      string;
  color:         string;
  source:        'db' | 'futar' | 'none';
  headsign?:     string;
  vehicleId?:    string;
  vehicleModel?: string;
  accessible?:   boolean;
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

  return {
    points:     pts.map(p => ({ lat: p.lat as number, lon: p.lon as number })),
    routeRef:   route?.short_name ?? '?',
    color,
    source:     'db',
    headsign:   trip.trip_headsign ?? undefined,
    accessible: trip.wheelchair_accessible === 1,
  };
}

async function fetchShape(tripId: string): Promise<TripShape> {
  const base = { key: BKK_KEY, version: '3', appVersion: 'apiary-1.0' };

  // 1. Trip details → get shapeId + route color + vehicle info
  const detailsParams = new URLSearchParams({ ...base, tripId, includeSchedule: 'false', includeReferences: 'trips,routes,stops,vehicles' });
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

  const rawPoints: Array<{ lat?: number; lon?: number }> =
    shapeJson?.data?.entry?.points ?? [];

  const points: ShapePoint[] = rawPoints
    .filter(p => p.lat !== undefined && p.lon !== undefined)
    .map(p => ({ lat: p.lat!, lon: p.lon! }));

  if (points.length === 0) throw new Error('Empty shape points');

  return { points, routeRef, color, source: 'futar', headsign, accessible, vehicleId, vehicleModel };
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
