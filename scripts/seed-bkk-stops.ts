/**
 * Bulk-seeds all BKK Futár stops into the public.bkk_stops table.
 *
 * Run once for the initial load:
 *   npx tsx scripts/seed-bkk-stops.ts
 *
 * Reads credentials from .env (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 * Uses a 15-cell grid (5 lat rows × 3 lon cols) covering the Budapest BKK service area.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ── Env ──────────────────────────────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) throw new Error('.env not found');
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
      .map(l => {
        const eq = l.indexOf('=');
        return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()];
      })
  );
}

const env = loadEnv();
const SUPABASE_URL  = env['NEXT_PUBLIC_SUPABASE_URL']  ?? env['SUPABASE_URL'] ?? '';
const SERVICE_KEY   = env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const BKK_API_KEY   = env['BKKFUTAR_API_KEY']          ?? 'apaiary-test';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Types ────────────────────────────────────────────────────────────────────

type RouteType = 'SUBWAY' | 'TRAM' | 'TROLLEYBUS' | 'BUS' | 'RAIL' | 'FERRY' | 'CABLE_CAR';

const GTFS_TYPE_MAP: Record<number, RouteType> = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
  4: 'FERRY', 5: 'CABLE_CAR', 7: 'CABLE_CAR', 11: 'TROLLEYBUS', 12: 'TRAM',
};

interface BkkStop {
  stop_id:    string;
  name:       string;
  lat:        number;
  lon:        number;
  route_refs: string[];
  route_type: RouteType;
}

// ── Grid definition (5 rows × 3 cols = 15 cells) ─────────────────────────────
// Coverage: lat 47.10–47.87, lon 18.83–19.55 (full BKK network + suburbs)
const LAT_CENTERS = [47.22, 47.37, 47.52, 47.65, 47.78];
const LON_CENTERS = [19.01, 19.19, 19.37];
const LAT_SPAN    = 0.30;   // full bounding-box height in degrees (±0.15°)
const LON_SPAN    = 0.40;   // full bounding-box width in degrees  (±0.20°)
const DELAY_MS    = 450;    // between BKK API calls to avoid rate-limiting
const CHUNK_SIZE  = 500;    // upsert batch size

// ── BKK API call ──────────────────────────────────────────────────────────────

const BKK_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';

async function fetchCell(lat: number, lon: number): Promise<BkkStop[]> {
  const params = new URLSearchParams({
    key:        BKK_API_KEY,
    version:    '3',
    appVersion: 'apiary-1.0',
    lat:        String(lat),
    lon:        String(lon),
    latSpan:    String(LAT_SPAN),
    lonSpan:    String(LON_SPAN),
  });

  const res = await fetch(`${BKK_BASE}/stops-for-location.json?${params}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/seed-1.0' },
    signal:  AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for cell ${lat},${lon}`);

  const json = await res.json();
  if (json.status !== 'OK') throw new Error(`BKK status "${json.status}" for cell ${lat},${lon}`);

  const routeRefs: Record<string, { shortName?: string; type?: number }> =
    json?.data?.references?.routes ?? {};

  const list: Array<{
    id:        string;
    name?:     string;
    lat?:      number;
    lon?:      number;
    routeIds?: string[];
    routes?:   Array<{ id?: string; shortName?: string; type?: number }>;
  }> = json?.data?.list ?? [];

  return list.map(s => {
    let refs: string[] = [];
    if (Array.isArray(s.routes) && s.routes.length > 0) {
      refs = s.routes.map(r => r.shortName ?? '').filter(Boolean);
    } else if (Array.isArray(s.routeIds) && s.routeIds.length > 0) {
      refs = s.routeIds.map(id => routeRefs[id]?.shortName ?? '').filter(Boolean);
    }

    let routeType: RouteType = 'BUS';
    const firstId    = (s.routeIds ?? [])[0] ?? (s.routes ?? [])[0]?.id ?? '';
    const firstRoute = routeRefs[firstId] ?? (s.routes ?? [])[0];
    if (firstRoute?.type !== undefined) {
      routeType = GTFS_TYPE_MAP[firstRoute.type] ?? 'BUS';
    }

    return {
      stop_id:    s.id,
      name:       s.name ?? 'Megálló',
      lat:        s.lat  ?? lat,
      lon:        s.lon  ?? lon,
      route_refs: refs,
      route_type: routeType,
    };
  });
}

// ── DDL: ensure the table exists ──────────────────────────────────────────────

async function ensureTable(): Promise<void> {
  const { error } = await supabase.rpc('execute_ddl' as never, {
    sql: `
      CREATE TABLE IF NOT EXISTS public.bkk_stops (
        stop_id     text             PRIMARY KEY,
        name        text             NOT NULL,
        lat         double precision NOT NULL,
        lon         double precision NOT NULL,
        route_refs  text[]           NOT NULL DEFAULT '{}',
        route_type  text             NOT NULL DEFAULT 'BUS',
        updated_at  timestamptz      NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_bkk_stops_lat_lon ON public.bkk_stops (lat, lon);
    `,
  } as never);

  if (error) {
    // RPC might not exist — that's fine if we've already run the migration.
    // Verify the table exists another way.
    const { error: checkError } = await supabase
      .from('bkk_stops')
      .select('stop_id')
      .limit(1);

    if (checkError?.code === '42P01') {
      console.error(
        '\nTable public.bkk_stops does not exist and execute_ddl RPC is unavailable.\n' +
        'Apply the migration first:\n' +
        '  supabase db push  OR  copy supabase/migrations/20260518002_bkk_stops_global.sql\n' +
        '  into the Supabase SQL editor and run it.\n'
      );
      process.exit(1);
    }
    // Table already exists or another error — proceed optimistically.
  }
}

// ── Upsert chunk ──────────────────────────────────────────────────────────────

async function upsertChunk(rows: BkkStop[]): Promise<void> {
  const { error } = await supabase
    .from('bkk_stops')
    .upsert(
      rows.map(r => ({ ...r, updated_at: new Date().toISOString() })),
      { onConflict: 'stop_id' }
    );
  if (error) throw new Error(`Upsert failed: ${error.message}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('=== BKK stops bulk seed ===');
  console.log(`Grid: ${LAT_CENTERS.length} lat rows × ${LON_CENTERS.length} lon cols = ${LAT_CENTERS.length * LON_CENTERS.length} cells`);
  console.log(`Cell size: ±${LAT_SPAN / 2}° lat × ±${LON_SPAN / 2}° lon\n`);

  await ensureTable();

  const all = new Map<string, BkkStop>();
  let cellIdx = 0;
  const totalCells = LAT_CENTERS.length * LON_CENTERS.length;

  for (const lat of LAT_CENTERS) {
    for (const lon of LON_CENTERS) {
      cellIdx++;
      process.stdout.write(`[${cellIdx}/${totalCells}] fetching cell (${lat.toFixed(3)}, ${lon.toFixed(3)})... `);

      try {
        const stops = await fetchCell(lat, lon);
        let newCount = 0;
        for (const s of stops) {
          if (!all.has(s.stop_id)) newCount++;
          all.set(s.stop_id, s);
        }
        console.log(`${stops.length} stops (${newCount} new, total unique: ${all.size})`);
      } catch (err) {
        console.error(`FAILED: ${(err as Error).message}`);
      }

      if (cellIdx < totalCells) await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\nTotal unique stops collected: ${all.size}`);
  if (all.size === 0) {
    console.error('No stops fetched — aborting.');
    process.exit(1);
  }

  // Upsert in chunks
  const rows = [...all.values()];
  const chunks = Math.ceil(rows.length / CHUNK_SIZE);
  console.log(`Upserting ${rows.length} rows in ${chunks} chunk(s) of ${CHUNK_SIZE}...`);

  for (let i = 0; i < chunks; i++) {
    const chunk = rows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    process.stdout.write(`  chunk ${i + 1}/${chunks} (${chunk.length} rows)... `);
    await upsertChunk(chunk);
    console.log('OK');
  }

  console.log('\nSeed complete.');
}

main().catch(err => {
  console.error('\nFatal:', err);
  process.exit(1);
});
