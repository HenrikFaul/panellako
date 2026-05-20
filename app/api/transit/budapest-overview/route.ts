import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

// ─── Types (response shape) ────────────────────────────────────────────────────

export interface BudapestStop {
  stop_id:    string;
  name:       string;
  lat:        number;
  lon:        number;
  route_type: string;
  route_refs: string[];
}

export interface BudapestShape {
  shape_id:   string;
  route_type: string;
  /** First route_short_name we discovered for trips on this shape (e.g. "4", "M3", "907"). */
  route_ref:  string | null;
  /** Polyline as [lat, lon] pairs (decimated server-side to keep total point count manageable). */
  polyline:   Array<[number, number]>;
}

export interface BudapestOverviewResponse {
  stops:               BudapestStop[];
  shapes:              BudapestShape[];
  availableRouteTypes: string[];
  /** Diagnostic metadata so the user can see what the API actually loaded. */
  meta: {
    totalStops:        number;
    totalShapesRaw:    number;
    totalShapesOut:    number;
    totalPointsRaw:    number;
    totalPointsOut:    number;
    decimationStep:    number;
    bbox:              { south: number; west: number; north: number; east: number };
    fetchedAt:         string;
    warnings:          string[];
  };
}

// Budapest bbox — matches the screenshot scope.
const BBOX = { south: 47.35, west: 18.85, north: 47.65, east: 19.35 };

// Soft cap for total client-side points across all shapes after decimation.
const POINT_BUDGET = 80_000;

function createDbClient() {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ?? ''
  ).trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  ).trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch all rows from a select-builder in pages (Supabase caps responses at ~1000). */
async function fetchAllPaged<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildQuery: (from: number, to: number) => any,
  pageSize = 1000,
  hardLimit = 500_000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < hardLimit; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < pageSize) break;
  }
  return out;
}

export async function GET() {
  const warnings: string[] = [];
  const fetchedAt = new Date().toISOString();

  const supabase = createDbClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured (missing NEXT_PUBLIC_SUPABASE_URL / key)' },
      { status: 500 },
    );
  }

  // ─── 1) Stops in Budapest bbox ────────────────────────────────────────────
  let stops: BudapestStop[] = [];
  try {
    const rawStops = await fetchAllPaged<{
      stop_id: string; name: string; lat: number; lon: number;
      route_type: string; route_refs: string[] | null;
    }>(
      (from, to) => supabase
        .from('transit_stops')
        .select('stop_id, name, lat, lon, route_type, route_refs')
        .gte('lat', BBOX.south).lte('lat', BBOX.north)
        .gte('lon', BBOX.west).lte('lon', BBOX.east)
        .range(from, to),
      1000,
    );
    stops = rawStops.map(s => ({
      stop_id:    s.stop_id,
      name:       s.name,
      lat:        s.lat,
      lon:        s.lon,
      route_type: (s.route_type ?? 'BUS').toUpperCase(),
      route_refs: Array.isArray(s.route_refs) ? s.route_refs : [],
    }));
  } catch (err) {
    warnings.push(`transit_stops fetch failed: ${(err as Error).message}`);
  }

  // ─── 2) Available route_type values (debug field) ─────────────────────────
  let availableRouteTypes: string[] = [];
  try {
    const types = new Set<string>();
    for (const s of stops) types.add(s.route_type);
    // Also fold in distinct types from transit_routes (might include FERRY / TROLLEY that have no stops in our snapshot).
    const { data: routeTypes } = await supabase
      .from('transit_routes')
      .select('type')
      .limit(2000);
    if (Array.isArray(routeTypes)) {
      for (const r of routeTypes as Array<{ type: string }>) {
        if (r.type) types.add(String(r.type).toUpperCase());
      }
    }
    availableRouteTypes = Array.from(types).sort();
  } catch (err) {
    warnings.push(`route_type catalog failed: ${(err as Error).message}`);
  }

  // ─── 3) Shapes joined to route_type via gtfs_trips → transit_routes ───────
  //   gtfs_shapes (shape_id, pt_sequence, lat, lon)
  //   gtfs_trips  (trip_id, route_id, shape_id, ...)
  //   transit_routes (route_id, short_name, type)
  //
  //   Strategy: read shape→{route_id} mapping from gtfs_trips, then resolve
  //   route_id→{type, short_name} from transit_routes.
  // ────────────────────────────────────────────────────────────────────────────

  // Build shape_id → { route_id, route_ref, route_type } map
  const shapeMeta = new Map<string, { route_id: string; route_ref: string | null; route_type: string }>();

  try {
    // Pull all (shape_id, route_id) pairs from gtfs_trips. shape_id can be null — skip those.
    const trips = await fetchAllPaged<{ shape_id: string | null; route_id: string }>(
      (from, to) => supabase
        .from('gtfs_trips')
        .select('shape_id, route_id')
        .not('shape_id', 'is', null)
        .range(from, to),
      1000,
    );

    // De-duplicate to one route_id per shape_id (first wins — shapes are usually 1:1 with routes anyway).
    const shapeToRoute = new Map<string, string>();
    for (const t of trips) {
      if (!t.shape_id) continue;
      if (!shapeToRoute.has(t.shape_id)) shapeToRoute.set(t.shape_id, t.route_id);
    }

    // Now resolve unique route_ids to (short_name, type).
    const uniqueRouteIds = Array.from(new Set(shapeToRoute.values()));
    const routeInfo = new Map<string, { short_name: string; type: string }>();

    // Fetch in chunks of 200 IDs to keep the `in()` query reasonable.
    const CHUNK = 200;
    for (let i = 0; i < uniqueRouteIds.length; i += CHUNK) {
      const slice = uniqueRouteIds.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from('transit_routes')
        .select('route_id, short_name, type')
        .in('route_id', slice);
      if (error) {
        warnings.push(`transit_routes lookup chunk failed: ${error.message}`);
        continue;
      }
      for (const r of (data ?? []) as Array<{ route_id: string; short_name: string; type: string }>) {
        routeInfo.set(r.route_id, {
          short_name: r.short_name ?? '',
          type:       String(r.type ?? 'BUS').toUpperCase(),
        });
      }
    }

    // Populate shapeMeta
    for (const [shapeId, routeId] of shapeToRoute.entries()) {
      const info = routeInfo.get(routeId);
      shapeMeta.set(shapeId, {
        route_id:   routeId,
        route_ref:  info?.short_name ?? null,
        route_type: info?.type ?? 'BUS',
      });
    }
  } catch (err) {
    warnings.push(`gtfs_trips/transit_routes join failed: ${(err as Error).message}`);
  }

  // ─── 4) Shape points — fetch then decimate ────────────────────────────────
  let shapesOut: BudapestShape[] = [];
  let totalPointsRaw = 0;
  let totalPointsOut = 0;
  let decimationStep = 1;
  let totalShapesRaw = 0;

  try {
    // Pull all shape points (sorted by shape_id, pt_sequence). For the BKK
    // Budapest feed this is roughly 200-500k rows; we'll decimate before
    // shipping. We page through to bypass Supabase's 1000-row cap.
    const allPoints = await fetchAllPaged<{
      shape_id: string; pt_sequence: number; lat: number; lon: number;
    }>(
      (from, to) => supabase
        .from('gtfs_shapes')
        .select('shape_id, pt_sequence, lat, lon')
        .order('shape_id', { ascending: true })
        .order('pt_sequence', { ascending: true })
        .range(from, to),
      1000,
      1_000_000,
    );

    totalPointsRaw = allPoints.length;

    // Group by shape_id (input is already sorted, but be defensive)
    const grouped = new Map<string, Array<[number, number]>>();
    for (const p of allPoints) {
      let arr = grouped.get(p.shape_id);
      if (!arr) { arr = []; grouped.set(p.shape_id, arr); }
      arr.push([p.lat, p.lon]);
    }

    totalShapesRaw = grouped.size;

    // Decide decimation step so total output points fit in POINT_BUDGET.
    decimationStep = Math.max(1, Math.ceil(totalPointsRaw / POINT_BUDGET));

    for (const [shape_id, polyline] of grouped.entries()) {
      const meta = shapeMeta.get(shape_id);
      // If we can't resolve the route_type, fall back to "BUS" (still rendered).
      const route_type = meta?.route_type ?? 'BUS';
      const route_ref  = meta?.route_ref  ?? null;

      // Decimate — always keep first + last point so the polyline closes.
      let decim: Array<[number, number]>;
      if (decimationStep <= 1 || polyline.length <= 4) {
        decim = polyline;
      } else {
        decim = [];
        for (let i = 0; i < polyline.length; i += decimationStep) decim.push(polyline[i]);
        const last = polyline[polyline.length - 1];
        if (decim[decim.length - 1] !== last) decim.push(last);
      }

      // Skip 0/1-point shapes (can't form a polyline).
      if (decim.length < 2) continue;

      // Filter shapes that don't touch the Budapest bbox at all (saves bytes).
      const inBbox = decim.some(([lat, lon]) =>
        lat >= BBOX.south && lat <= BBOX.north &&
        lon >= BBOX.west  && lon <= BBOX.east,
      );
      if (!inBbox) continue;

      shapesOut.push({ shape_id, route_type, route_ref, polyline: decim });
      totalPointsOut += decim.length;
    }
  } catch (err) {
    warnings.push(`gtfs_shapes fetch failed: ${(err as Error).message}`);
    shapesOut = [];
  }

  const body: BudapestOverviewResponse = {
    stops,
    shapes: shapesOut,
    availableRouteTypes,
    meta: {
      totalStops:     stops.length,
      totalShapesRaw,
      totalShapesOut: shapesOut.length,
      totalPointsRaw,
      totalPointsOut,
      decimationStep,
      bbox: BBOX,
      fetchedAt,
      warnings,
    },
  };

  return NextResponse.json(body, {
    headers: {
      // Shapes / stops change rarely — aggressive edge cache + browser cache.
      'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
