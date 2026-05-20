import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BudapestTreesData {
  treeCount200m:   number;
  treeCount500m:   number;
  parkCount500m:   number;
  parkAreaM2:      number;
  nearestParkName: string | null;
  nearestParkM:    number | null;
  importedAt:      string | null;
  totalTreesDb:    number;
  totalParksDb:    number;
  source:          'cache' | 'db_query' | 'no_data';
  computedAt:      string;
}

// ─── Supabase helper ──────────────────────────────────────────────────────────

function makeSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim();
  const key  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Haversine distance in metres ─────────────────────────────────────────────

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sp         = request.nextUrl.searchParams;
  const lat        = parseFloat(sp.get('lat') ?? '47.4979');
  const lon        = parseFloat(sp.get('lon') ?? '19.0402');
  const buildingId = sp.get('buildingId') ?? null;

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: 'Invalid coords' }, { status: 400 });
  }

  const supabase = makeSupabase();
  if (!supabase) return NextResponse.json({ error: 'No DB' }, { status: 500 });

  // ── Check if data has been imported ──────────────────────────────────────
  const { data: meta } = await supabase
    .from('budapest_data_meta')
    .select('value')
    .eq('key', 'trees_imported_at')
    .maybeSingle();

  if (!meta?.value) {
    return NextResponse.json({
      treeCount200m: 0, treeCount500m: 0, parkCount500m: 0, parkAreaM2: 0,
      nearestParkName: null, nearestParkM: null, importedAt: null,
      totalTreesDb: 0, totalParksDb: 0,
      source: 'no_data', computedAt: new Date().toISOString(),
    } satisfies BudapestTreesData);
  }

  // ── Bounding box query (wide enough for 500m + margin) ───────────────────
  const BBOX_LAT = 0.006;  // ~670m margin
  const bboxLon  = BBOX_LAT / Math.cos(lat * Math.PI / 180);

  const [treesResult, parksResult, treeCountResult, parkCountResult] = await Promise.all([
    supabase
      .from('budapest_trees')
      .select('lat,lon')
      .gte('lat', lat - BBOX_LAT).lte('lat', lat + BBOX_LAT)
      .gte('lon', lon - bboxLon).lte('lon', lon + bboxLon),
    supabase
      .from('budapest_parks')
      .select('name,lat,lon,area_m2')
      .gte('lat', lat - BBOX_LAT).lte('lat', lat + BBOX_LAT)
      .gte('lon', lon - bboxLon).lte('lon', lon + bboxLon),
    supabase.from('budapest_trees').select('*', { count: 'exact', head: true }),
    supabase.from('budapest_parks').select('*', { count: 'exact', head: true }),
  ]);

  const trees = (treesResult.data ?? []) as { lat: number; lon: number }[];
  const parks = (parksResult.data ?? []) as { name: string; lat: number; lon: number; area_m2: number }[];

  // Haversine filter to exact distances
  const trees200 = trees.filter(t => haversineM(lat, lon, t.lat, t.lon) <= 200);
  const trees500 = trees.filter(t => haversineM(lat, lon, t.lat, t.lon) <= 500);

  const parksWithDist = parks
    .map(p => ({ ...p, distM: haversineM(lat, lon, p.lat, p.lon) }))
    .filter(p => p.distM <= 500)
    .sort((a, b) => a.distM - b.distM);

  const nearestPark = parksWithDist[0] ?? null;
  const parkAreaTotal = parksWithDist.reduce((s, p) => s + (p.area_m2 ?? 0), 0);

  void buildingId; // available for future per-building caching

  return NextResponse.json({
    treeCount200m:   trees200.length,
    treeCount500m:   trees500.length,
    parkCount500m:   parksWithDist.length,
    parkAreaM2:      Math.round(parkAreaTotal),
    nearestParkName: nearestPark?.name ?? null,
    nearestParkM:    nearestPark ? Math.round(nearestPark.distM) : null,
    importedAt:      meta.value,
    totalTreesDb:    treeCountResult.count ?? 0,
    totalParksDb:    parkCountResult.count ?? 0,
    source:          'db_query',
    computedAt:      new Date().toISOString(),
  } satisfies BudapestTreesData);
}
