/**
 * POST /api/transit/seed-all-stops
 * Protected endpoint to seed / refresh the global bkk_stops table.
 * Requires header: Authorization: Bearer <SEED_TRIGGER_SECRET>
 *
 * Use this after deployment to trigger a city-wide stop crawl without
 * needing shell access to run scripts/seed-bkk-stops.ts directly.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

type RouteType = 'SUBWAY' | 'TRAM' | 'TROLLEYBUS' | 'BUS' | 'RAIL' | 'FERRY' | 'CABLE_CAR';

interface BkkStopRow {
  stop_id:    string;
  name:       string;
  lat:        number;
  lon:        number;
  route_refs: string[];
  route_type: RouteType;
  updated_at: string;
}

const GTFS_TYPE_MAP: Record<number, RouteType> = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
  4: 'FERRY', 5: 'CABLE_CAR', 7: 'CABLE_CAR', 11: 'TROLLEYBUS', 12: 'TRAM',
};

const BKK_BASE   = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const LAT_SPAN   = 0.30;
const LON_SPAN   = 0.40;
const DELAY_MS   = 450;
const CHUNK_SIZE = 500;

const LAT_CENTERS = [47.22, 47.37, 47.52, 47.65, 47.78];
const LON_CENTERS = [19.01, 19.19, 19.37];

async function fetchCell(lat: number, lon: number, bkkKey: string): Promise<BkkStopRow[]> {
  const params = new URLSearchParams({
    key: bkkKey, version: '3', appVersion: 'apiary-1.0',
    lat: String(lat), lon: String(lon),
    latSpan: String(LAT_SPAN), lonSpan: String(LON_SPAN),
  });
  const res = await fetch(`${BKK_BASE}/stops-for-location.json?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'panellako.hu/seed-1.0' },
    signal:  AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  if (json.status !== 'OK') {
    throw new Error(`BKK status "${json.status}" — body: ${JSON.stringify(json).slice(0, 300)}`);
  }

  const routes: Record<string, { shortName?: string; type?: number }> =
    json?.data?.references?.routes ?? {};
  const list: Array<{
    id: string; name?: string; lat?: number; lon?: number;
    routeIds?: string[]; routes?: Array<{ id?: string; shortName?: string; type?: number }>;
  }> = json?.data?.list ?? [];

  return list.map(s => {
    let refs: string[] = [];
    if (Array.isArray(s.routes) && s.routes.length > 0)
      refs = s.routes.map(r => r.shortName ?? '').filter(Boolean);
    else if (Array.isArray(s.routeIds) && s.routeIds.length > 0)
      refs = s.routeIds.map(id => routes[id]?.shortName ?? '').filter(Boolean);

    let routeType: RouteType = 'BUS';
    const firstId = (s.routeIds ?? [])[0] ?? (s.routes ?? [])[0]?.id ?? '';
    const fr = routes[firstId] ?? (s.routes ?? [])[0];
    if (fr?.type !== undefined) routeType = GTFS_TYPE_MAP[fr.type] ?? 'BUS';

    return {
      stop_id: s.id, name: s.name ?? 'Megálló',
      lat: s.lat ?? lat, lon: s.lon ?? lon,
      route_refs: refs, route_type: routeType,
      updated_at: new Date().toISOString(),
    };
  });
}

export async function POST(req: NextRequest) {
  // ── Env validation ────────────────────────────────────────────────────────
  const bkkKey      = process.env.BKKFUTAR_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret      = process.env.SEED_TRIGGER_SECRET;

  if (!bkkKey)      return NextResponse.json({ error: 'Missing BKKFUTAR_API_KEY' },           { status: 500 });
  if (!supabaseUrl) return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL' },   { status: 500 });
  if (!serviceKey)  return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },  { status: 500 });
  if (!secret)      return NextResponse.json({ error: 'Missing SEED_TRIGGER_SECRET' },        { status: 500 });

  // ── Auth check ────────────────────────────────────────────────────────────
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const all = new Map<string, BkkStopRow>();
  const errors: string[] = [];
  const cells = LAT_CENTERS.flatMap(lat => LON_CENTERS.map(lon => ({ lat, lon })));

  for (let i = 0; i < cells.length; i++) {
    const { lat, lon } = cells[i];
    try {
      const stops = await fetchCell(lat, lon, bkkKey);
      for (const s of stops) all.set(s.stop_id, s);
    } catch (err) {
      errors.push(`cell(${lat},${lon}): ${(err as Error).message}`);
    }
    if (i < cells.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  const rows = [...all.values()];
  const chunks = Math.ceil(rows.length / CHUNK_SIZE);
  let upserted = 0;

  for (let i = 0; i < chunks; i++) {
    const chunk = rows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const { error } = await supabase.from('bkk_stops').upsert(chunk, { onConflict: 'stop_id' });
    if (error) errors.push(`upsert chunk ${i + 1}: ${error.message}`);
    else upserted += chunk.length;
  }

  return NextResponse.json({
    uniqueStops: all.size,
    upserted,
    cells: cells.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
