import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient } from '@supabase/supabase-js';
import { ENVIRONMENT_JOB_SECRET_HEADER } from '@/lib/authorization/environment-scope';
import {
  HU_BBOX,
  renderHungaryNdviTiled,
  downscalePng,
} from '@/lib/ndvi-mosaic';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ─── Geocoder (Nominatim → internal API fallback) ─────────────────────────────

export type GeocodeAttempt = { source: string; ok: boolean; reason?: string; status?: number };
export type GeocodeResult =
  | { ok: true;  lat: number; lon: number; source: 'internal' | 'nominatim'; attempts: GeocodeAttempt[] }
  | { ok: false; reason: string; attempts: GeocodeAttempt[] };

async function geocodeAddress(address: string, appBase: string): Promise<GeocodeResult> {
  const attempts: GeocodeAttempt[] = [];
  const cleanAddress = (address ?? '').trim();
  if (!cleanAddress || cleanAddress.length < 5) {
    return { ok: false, reason: `Empty or too short address: "${cleanAddress}"`, attempts };
  }

  // 1. Internal /api/transit/geocode endpoint (has in-memory cache)
  try {
    const url = `${appBase}/api/transit/geocode?address=${encodeURIComponent(cleanAddress)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const d = await res.json() as { lat?: number; lon?: number; source?: string };
      if (typeof d.lat === 'number' && typeof d.lon === 'number') {
        attempts.push({ source: 'internal', ok: true, status: res.status });
        return { ok: true, lat: d.lat, lon: d.lon, source: 'internal', attempts };
      }
      attempts.push({ source: 'internal', ok: false, status: res.status, reason: 'response missing lat/lon' });
    } else {
      const body = await res.text().catch(() => '');
      attempts.push({ source: 'internal', ok: false, status: res.status, reason: body.slice(0, 200) || res.statusText });
    }
  } catch (err) {
    attempts.push({ source: 'internal', ok: false, reason: err instanceof Error ? err.message : String(err) });
  }

  // 2. Direct Nominatim fallback
  try {
    const params = new URLSearchParams({ q: cleanAddress, format: 'json', countrycodes: 'hu', limit: '1', addressdetails: '0' });
    const url = `https://nominatim.openstreetmap.org/search?${params}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'panellako.hu/1.0 (info@panellako.hu)', 'Accept': 'application/json', 'Referer': 'https://panellako.hu' },
      signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      attempts.push({ source: 'nominatim', ok: false, status: res.status, reason: body.slice(0, 200) || res.statusText });
      return { ok: false, reason: `Nominatim HTTP ${res.status}`, attempts };
    }
    const data = await res.json() as Array<{ lat?: string; lon?: string }>;
    if (!Array.isArray(data) || data.length === 0) {
      attempts.push({ source: 'nominatim', ok: false, status: res.status, reason: 'no results for address' });
      return { ok: false, reason: `Nominatim found no match for "${cleanAddress}"`, attempts };
    }
    const lat = parseFloat(data[0].lat ?? '');
    const lon = parseFloat(data[0].lon ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      attempts.push({ source: 'nominatim', ok: false, status: res.status, reason: 'invalid lat/lon in response' });
      return { ok: false, reason: 'Nominatim returned non-numeric coordinates', attempts };
    }
    attempts.push({ source: 'nominatim', ok: true, status: res.status });
    return { ok: true, lat, lon, source: 'nominatim', attempts };
  } catch (err) {
    attempts.push({ source: 'nominatim', ok: false, reason: err instanceof Error ? err.message : String(err) });
    return { ok: false, reason: `Nominatim fetch failed: ${err instanceof Error ? err.message : String(err)}`, attempts };
  }
}

// ─── DB logging ───────────────────────────────────────────────────────────────

function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  const key = serviceKey.startsWith('eyJ') ? serviceKey : (anonKey || serviceKey);
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function environmentRefreshHeaders(): HeadersInit {
  const secret = (
    process.env.ENVIRONMENT_REFRESH_SECRET
    ?? process.env.CRON_SECRET
    ?? ''
  ).trim();
  return secret ? { [ENVIRONMENT_JOB_SECRET_HEADER]: secret } : {};
}

async function logStart(jobId: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from('platform_job_logs')
      .insert({ job_id: jobId, status: 'running', triggered_by: 'manual' })
      .select('id')
      .single();
    return data?.id ?? null;
  } catch { return null; }
}

async function logEnd(
  logId: string | null,
  status: 'ok' | 'error' | 'partial',
  result: unknown,
): Promise<void> {
  if (!logId) return;
  try {
    const supabase = createServiceClient();
    if (!supabase) return;
    await supabase
      .from('platform_job_logs')
      .update({ status, result, finished_at: new Date().toISOString() })
      .eq('id', logId);
  } catch { /* logging is best-effort */ }
}

// ─── Job runners ──────────────────────────────────────────────────────────────

async function runTransit(action: 'stops-routes' | 'building-stops' | 'alerts', cell?: number) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const secret = process.env.TRANSIT_SYNC_SECRET || process.env.CRON_SECRET || '';
  const cellParam = cell !== undefined ? `&cell=${cell}` : '';
  const url = `${base.replace(/\/$/, '')}/api/transit/sync?action=${action}${cellParam}${secret ? `&secret=${encodeURIComponent(secret)}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function runAirQuality() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const [main, heatmap] = await Promise.all([
    fetch(`${base.replace(/\/$/, '')}/api/air-quality?lat=47.5278845&lon=19.0705657`, { cache: 'no-store' }),
    fetch(`${base.replace(/\/$/, '')}/api/air-quality/heatmap`, { cache: 'no-store' }),
  ]);
  return {
    main:    { ok: main.ok,    status: main.status,    body: await main.json().catch(() => ({})) },
    heatmap: { ok: heatmap.ok, status: heatmap.status, body: await heatmap.json().catch(() => ([])) },
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

// ─── OSM: fix unique index (called before any import) ────────────────────────

async function ensureOsmUniqueIndex(): Promise<{ ok: boolean; method: string; error?: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, method: 'none', error: 'No Supabase client' };

  const sql = `
    DROP INDEX IF EXISTS public.osm_addresses_external_id_unique;
    DROP INDEX IF EXISTS public.osm_addresses_external_id_idx;
    CREATE UNIQUE INDEX IF NOT EXISTS osm_addresses_external_id_unique ON public.osm_addresses (external_id);
  `.trim();

  // Try exec_sql RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcErr } = await (supabase as any).rpc('exec_sql', { sql });
  if (!rpcErr) return { ok: true, method: 'rpc_exec_sql' };

  // Try pg/query REST endpoint
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (url && key) {
    const stmts = [
      'DROP INDEX IF EXISTS public.osm_addresses_external_id_unique',
      'DROP INDEX IF EXISTS public.osm_addresses_external_id_idx',
      'CREATE UNIQUE INDEX IF NOT EXISTS osm_addresses_external_id_unique ON public.osm_addresses (external_id)',
    ];
    for (const query of stmts) {
      const res = await fetch(`${url}/pg/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'apikey': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      }).catch(() => null);
      if (!res?.ok) {
        const body = await res?.text().catch(() => '');
        return { ok: false, method: 'pg_query', error: `${query.slice(0, 40)}: ${res?.status} ${body?.slice(0, 100)}` };
      }
    }
    return { ok: true, method: 'pg_query' };
  }

  return { ok: false, method: 'none', error: rpcErr?.message ?? 'exec_sql failed and pg/query not available' };
}

// ─── OSM Overpass helpers (used by Phase 1 + Phase 2 import) ─────────────────

const OVERPASS_MIRRORS_OSM = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

async function overpassQuery(query: string, timeoutMs = 180_000): Promise<{ elements: unknown[] } | null> {
  for (const mirror of OVERPASS_MIRRORS_OSM) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'panellako/1.0 (info@panellako.hu)' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) continue;
      return await res.json();
    } catch { continue; }
  }
  return null;
}

// County bboxes — shared by per-county and all-countries jobs
const COUNTY_BBOXES_SHARED: Record<string, [number, number, number, number]> = {
  'Budapest':                    [47.35, 18.87, 47.62, 19.34],
  'Pest':                        [47.00, 18.60, 48.35, 20.25],
  'Baranya':                     [45.73, 17.55, 46.25, 18.61],
  'Bács-Kiskun':                 [46.03, 18.76, 47.28, 20.21],
  'Békés':                       [46.39, 20.60, 47.12, 21.60],
  'Borsod-Abaúj-Zemplén':       [47.60, 20.10, 48.57, 22.00],
  'Csongrád':                    [46.07, 19.68, 46.77, 20.73],
  'Fejér':                       [46.73, 18.03, 47.55, 18.78],
  'Győr-Moson-Sopron':           [47.44, 16.42, 47.94, 17.83],
  'Hajdú-Bihar':                 [47.00, 21.00, 48.00, 22.25],
  'Heves':                       [47.60, 19.65, 48.13, 20.63],
  'Jász-Nagykun-Szolnok':       [46.75, 19.80, 47.76, 21.10],
  'Komárom-Esztergom':           [47.49, 17.90, 47.85, 18.73],
  'Nógrád':                      [47.79, 19.05, 48.27, 20.18],
  'Somogy':                      [45.93, 16.77, 47.00, 18.18],
  'Szabolcs-Szatmár-Bereg':     [47.60, 21.60, 48.57, 22.90],
  'Tolna':                       [46.25, 17.80, 46.95, 18.85],
  'Vas':                         [46.70, 16.10, 47.53, 17.00],
  'Veszprém':                    [46.75, 17.20, 47.53, 18.38],
  'Zala':                        [46.25, 16.33, 46.92, 17.20],
};

type CountyImportResult = {
  county: string;
  ok: boolean;
  imported: number;
  total: number;
  skipped: number;
  error?: string;
};

async function importCounty(
  county: string,
  bbox: [number, number, number, number],
  supabase: ReturnType<typeof createServiceClient>,
): Promise<CountyImportResult> {
  const [minLat, minLon, maxLat, maxLon] = bbox;
  const bboxStr = `${minLat},${minLon},${maxLat},${maxLon}`;
  // No row limit — fetch everything Overpass has for this bbox.
  // maxsize=2GB to handle large counties like Budapest or Pest.
  const query = `[out:json][timeout:120][maxsize:2147483648];
node["addr:housenumber"]["addr:street"](${bboxStr});
out;`;

  const data = await overpassQuery(query, 200_000);
  if (!data) return { county, ok: false, imported: 0, total: 0, skipped: 0, error: 'Minden Overpass mirror elérhetetlen' };

  type OsmEl = { type: string; id: number; lat?: number; lon?: number; tags?: Record<string, string> };
  const elements = (data.elements ?? []) as OsmEl[];

  const rows = elements
    .map(e => {
      if (!e.lat || !e.lon) return null;
      const t = e.tags ?? {};
      const street = t['addr:street'] ?? null;
      const city = t['addr:city'] ?? t['addr:town'] ?? t['addr:village'] ?? t['addr:municipality'] ?? null;
      const displayParts = [t['addr:postcode'], city, street, t['addr:housenumber']].filter(Boolean);
      return {
        external_id:  `osm:${e.type}:${e.id}`,
        country:      'Magyarország',
        country_code: 'HU',
        display_name: displayParts.join(' ') || null,
        street, street_name: street,
        house_number: t['addr:housenumber'] ?? null,
        housenumber:  t['addr:housenumber'] ?? null,
        city, district: t['addr:district'] ?? null,
        postcode:     t['addr:postcode'] ?? null,
        place:        null,
        lat: e.lat, lon: e.lon,
        geometry_type: e.type,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  let imported = 0;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase!
      .from('osm_addresses')
      .upsert(rows.slice(i, i + CHUNK), { onConflict: 'external_id', ignoreDuplicates: true });
    if (error) return { county, ok: false, imported, total: elements.length, skipped: elements.length - rows.length, error: error.message };
    imported += Math.min(CHUNK, rows.length - i);
  }

  return { county, ok: true, imported, total: elements.length, skipped: elements.length - rows.length };
}

export async function POST(request: NextRequest) {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { job?: string; county?: string };
  const { job } = body;

  if (job === 'bkk_full_sync') {
    const logId = await logStart(job);
    let status: 'ok' | 'error' | 'partial' = 'ok';
    try {
      const stopsRoutes   = await runTransit('stops-routes');
      const buildingStops = stopsRoutes.ok
        ? await runTransit('building-stops')
        : { ok: false, status: 424, body: { error: 'Skipped: stops-routes failed' } };
      const alerts = await runTransit('alerts');
      const ok = stopsRoutes.ok && buildingStops.ok && alerts.ok;
      status = ok ? 'ok' : (stopsRoutes.ok || alerts.ok ? 'partial' : 'error');
      const result = { stopsRoutes, buildingStops, alerts };
      await logEnd(logId, status, result);
      return NextResponse.json({ ok, job, result, ranAt: new Date().toISOString() }, { status: ok ? 200 : 207 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  if (job === 'bkk_stops_routes') {
    const logId = await logStart(job);
    const result = await runTransit('stops-routes').catch(err => ({ ok: false, status: 500, body: { error: String(err) } }));
    await logEnd(logId, result.ok ? 'ok' : 'error', result);
    return NextResponse.json({ ok: result.ok, job, result, ranAt: new Date().toISOString() }, { status: result.ok ? 200 : 207 });
  }

  if (job === 'bkk_stops_cell_0' || job === 'bkk_stops_cell_1' || job === 'bkk_stops_cell_2') {
    const cell = job === 'bkk_stops_cell_0' ? 0 : job === 'bkk_stops_cell_1' ? 1 : 2;
    const logId = await logStart(job);
    const result = await runTransit('stops-routes', cell).catch(err => ({ ok: false, status: 500, body: { error: String(err) } }));
    await logEnd(logId, result.ok ? 'ok' : 'error', result);
    return NextResponse.json({ ok: result.ok, job, result, ranAt: new Date().toISOString() }, { status: result.ok ? 200 : 207 });
  }

  if (job === 'bkk_building_stops') {
    const logId = await logStart(job);
    const result = await runTransit('building-stops').catch(err => ({ ok: false, status: 500, body: { error: String(err) } }));
    await logEnd(logId, result.ok ? 'ok' : 'error', result);
    return NextResponse.json({ ok: result.ok, job, result, ranAt: new Date().toISOString() }, { status: result.ok ? 200 : 207 });
  }

  if (job === 'bkk_alerts') {
    const logId = await logStart(job);
    const result = await runTransit('alerts').catch(err => ({ ok: false, status: 500, body: { error: String(err) } }));
    await logEnd(logId, result.ok ? 'ok' : 'error', result);
    return NextResponse.json({ ok: result.ok, job, result, ranAt: new Date().toISOString() }, { status: result.ok ? 200 : 207 });
  }

  if (job === 'gtfs_derive_refs') {
    const logId = await logStart(job);
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      // Check if transit_stop_routes has data
      const { count } = await supabase
        .from('transit_stop_routes')
        .select('*', { count: 'exact', head: true });

      if (!count || count === 0) {
        const result = { updated: 0, note: 'transit_stop_routes tábla üres — futtasd előbb a GTFS 2-lépéses importot (trips.txt + stop_times.txt)' };
        await logEnd(logId, 'error', result);
        return NextResponse.json({ ok: false, job, result, ranAt: new Date().toISOString() }, { status: 409 });
      }

      // Fetch all stop_routes joined to routes to compute per-stop route_refs + best route_type
      const TYPE_PRIORITY: Record<string, number> = {
        SUBWAY: 0, RAIL: 1, TRAM: 2, TROLLEYBUS: 3, BUS: 4, FERRY: 5, CABLE_CAR: 6,
      };

      const { data: pairs, error: pairsErr } = await supabase
        .from('transit_stop_routes')
        .select('stop_id, transit_routes!inner(short_name, type)');

      if (pairsErr) throw new Error(pairsErr.message);

      type Pair = { stop_id: string; transit_routes: { short_name: string; type: string } };
      const byStop = new Map<string, { refs: Set<string>; bestType: string }>();

      for (const p of (pairs ?? []) as unknown as Pair[]) {
        const stopId = p.stop_id;
        const name   = p.transit_routes.short_name;
        const type   = p.transit_routes.type ?? 'BUS';
        if (!byStop.has(stopId)) byStop.set(stopId, { refs: new Set(), bestType: 'BUS' });
        const entry = byStop.get(stopId)!;
        entry.refs.add(name);
        if ((TYPE_PRIORITY[type] ?? 99) < (TYPE_PRIORITY[entry.bestType] ?? 99)) {
          entry.bestType = type;
        }
      }

      // Pre-fetch stop names for all candidate stop_ids.
      // We MUST include `name` in every upserted row so that if PostgreSQL
      // takes the INSERT path (conflict not matched) it satisfies the NOT NULL
      // constraint. Fetching the existing name is the safest way to do this —
      // any stop_id missing from this map is truly orphaned and gets skipped.
      const allStopIds = Array.from(byStop.keys());
      const CHUNK = 500;
      const existingStopNames = new Map<string, string>(); // stop_id → name
      for (let ci = 0; ci < allStopIds.length; ci += CHUNK) {
        const { data: chunk } = await supabase
          .from('transit_stops')
          .select('stop_id, name')
          .in('stop_id', allStopIds.slice(ci, ci + CHUNK));
        (chunk ?? []).forEach((r: { stop_id: string; name: string }) => {
          if (r.name) existingStopNames.set(r.stop_id, r.name);
        });
      }

      // Only build rows for stops that exist and have a non-null name
      const rows = Array.from(byStop.entries())
        .filter(([stop_id]) => existingStopNames.has(stop_id))
        .map(([stop_id, v]) => ({
          stop_id,
          name:       existingStopNames.get(stop_id)!,
          route_refs: Array.from(v.refs).sort(),
          route_type: v.bestType,
          synced_at:  new Date().toISOString(),
        }));

      const orphanedCount = allStopIds.length - rows.length;

      let updated = 0;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase
          .from('transit_stops')
          .upsert(rows.slice(i, i + CHUNK), { onConflict: 'stop_id' });
        if (error) throw new Error(error.message);
        updated += Math.min(CHUNK, rows.length - i);
      }

      const result = { updated, stopsWithRoutes: byStop.size, orphanedSkipped: orphanedCount, pairsProcessed: pairs?.length ?? 0 };
      await logEnd(logId, 'ok', result);
      return NextResponse.json({ ok: true, job, result, ranAt: new Date().toISOString() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  if (job === 'air_quality_refresh') {
    const logId = await logStart(job);
    const result = await runAirQuality().catch(err => ({ main: { ok: false, status: 500, body: { error: String(err) } }, heatmap: { ok: false, status: 500, body: {} } }));
    const ok = result.main.ok && result.heatmap.ok;
    await logEnd(logId, ok ? 'ok' : 'error', result);
    return NextResponse.json({ ok, job, result, ranAt: new Date().toISOString() }, { status: ok ? 200 : 207 });
  }

  // ─── Shared building+coords resolver (used by satellite/urban/green refresh) ──
  type BuildingRow = { id: string; name: string; address: string; lat: number | null; lon: number | null };
  const appBase = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  async function resolveCoords(
    b: BuildingRow,
    supabase: ReturnType<typeof createServiceClient>,
  ): Promise<{ ok: true; lat: number; lon: number; source: 'db' | 'internal' | 'nominatim' | 'hardcoded-demo' } | { ok: false; reason: string; attempts: GeocodeAttempt[] }> {
    if (b.lat != null && b.lon != null) return { ok: true, lat: b.lat, lon: b.lon, source: 'db' };
    // Runtime safety net for the demo building: even if the migration hasn't
    // applied yet and the row still has the un-geocodable old address, force
    // the Nominatim-verified Gidófalvy Lajos u. 9 coords so no environment
    // job ever stalls on the demo account.  Also persists back to the DB so
    // subsequent runs don't need this fallback.
    if (b.id === 'bbbbbbbb-0001-0001-0001-000000000001') {
      const lat = 47.5278845, lon = 19.0705657;
      await supabase!.from('buildings').update({
        name:        'Gidófalvy Lajos utca 9.',
        address:     'Budapest, XIII. kerület, Gidófalvy Lajos utca 9.',
        lat, lon,
        geocoded_at: new Date().toISOString(),
      }).eq('id', b.id);
      return { ok: true, lat, lon, source: 'hardcoded-demo' };
    }
    const geo = await geocodeAddress(b.address, appBase);
    if (!geo.ok) return { ok: false, reason: geo.reason, attempts: geo.attempts };
    await supabase!.from('buildings').update({ lat: geo.lat, lon: geo.lon, geocoded_at: new Date().toISOString() }).eq('id', b.id);
    return { ok: true, lat: geo.lat, lon: geo.lon, source: geo.source };
  }

  if (job === 'satellite_refresh') {
    const logId = await logStart(job);
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      const { data: buildings, error: bErr } = await supabase
        .from('buildings')
        .select('id, name, address, lat, lon');
      if (bErr) throw new Error(bErr.message);

      const { data: cached } = await supabase
        .from('building_satellite_cache')
        .select('building_id, computed_at')
        .gt('computed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const freshIds = new Set((cached ?? []).map((r: { building_id: string }) => r.building_id));
      const toRefresh = ((buildings ?? []) as BuildingRow[]).filter(b => !freshIds.has(b.id));

      let refreshed = 0, errors = 0, geocodeFailed = 0;
      const failures: Array<{ buildingId: string; name: string; address: string; reason: string; attempts: GeocodeAttempt[] }> = [];
      for (const building of toRefresh) {
        const coords = await resolveCoords(building, supabase);
        if (!coords.ok) {
          geocodeFailed++;
          failures.push({ buildingId: building.id, name: building.name, address: building.address ?? '', reason: coords.reason, attempts: coords.attempts });
          continue;
        }
        try {
          const url = `${appBase}/api/environment/satellite?lat=${coords.lat}&lon=${coords.lon}&buildingId=${building.id}`;
          const res = await fetch(url, { cache: 'no-store', headers: environmentRefreshHeaders() });
          if (res.ok) refreshed++; else errors++;
        } catch { errors++; }
        await new Promise(r => setTimeout(r, 3000));
      }

      const result = { total: (buildings ?? []).length, skipped: freshIds.size, refreshed, errors, geocodeFailed, failures };
      await logEnd(logId, errors === 0 ? 'ok' : 'partial', result);
      return NextResponse.json({ ok: errors === 0, job, result, ranAt: new Date().toISOString() }, { status: errors === 0 ? 200 : 207 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  if (job === 'urban_refresh') {
    const logId = await logStart(job);
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      const { data: buildings, error: bErr } = await supabase
        .from('buildings')
        .select('id, name, address, lat, lon');
      if (bErr) throw new Error(bErr.message);

      const { data: cached } = await supabase
        .from('building_compact_city_cache')
        .select('building_id, computed_at')
        .gt('computed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const freshIds = new Set((cached ?? []).map((r: { building_id: string }) => r.building_id));
      const toRefresh = ((buildings ?? []) as BuildingRow[]).filter(b => !freshIds.has(b.id));

      let refreshed = 0, errors = 0, geocodeFailed = 0;
      const failures: Array<{ buildingId: string; name: string; address: string; reason: string; attempts: GeocodeAttempt[] }> = [];
      for (const building of toRefresh) {
        const coords = await resolveCoords(building, supabase);
        if (!coords.ok) {
          geocodeFailed++;
          failures.push({ buildingId: building.id, name: building.name, address: building.address ?? '', reason: coords.reason, attempts: coords.attempts });
          continue;
        }
        try {
          const url = `${appBase}/api/environment/urban?lat=${coords.lat}&lon=${coords.lon}&buildingId=${building.id}`;
          const res = await fetch(url, { cache: 'no-store', headers: environmentRefreshHeaders() });
          if (res.ok) refreshed++; else errors++;
        } catch { errors++; }
        await new Promise(r => setTimeout(r, 2000));
      }

      const result = { total: (buildings ?? []).length, skipped: freshIds.size, refreshed, errors, geocodeFailed, failures };
      await logEnd(logId, errors === 0 ? 'ok' : 'partial', result);
      return NextResponse.json({ ok: errors === 0, job, result, ranAt: new Date().toISOString() }, { status: errors === 0 ? 200 : 207 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  if (job === 'env_refresh_green') {
    const logId = await logStart(job);
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      const { data: buildings, error: bErr } = await supabase
        .from('buildings')
        .select('id, name, address, lat, lon');
      if (bErr) throw new Error(bErr.message);
      const list = (buildings ?? []) as BuildingRow[];

      const { data: cached } = await supabase
        .from('building_green_cache')
        .select('building_id, computed_at')
        .gt('computed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const freshIds = new Set((cached ?? []).map((r: { building_id: string }) => r.building_id));
      const toRefresh = list.filter(b => !freshIds.has(b.id));

      let refreshed = 0, errors = 0, geocodeFailed = 0;
      const failures: Array<{ buildingId: string; name: string; address: string; reason: string; attempts: GeocodeAttempt[] }> = [];

      for (const building of toRefresh) {
        const coords = await resolveCoords(building, supabase);
        if (!coords.ok) {
          geocodeFailed++;
          failures.push({ buildingId: building.id, name: building.name, address: building.address ?? '', reason: coords.reason, attempts: coords.attempts });
          continue;
        }
        try {
          const url = `${appBase}/api/environment/green?lat=${coords.lat}&lon=${coords.lon}&buildingId=${building.id}`;
          const res = await fetch(url, { cache: 'no-store', headers: environmentRefreshHeaders() });
          if (res.ok) refreshed++; else errors++;
        } catch { errors++; }
        await new Promise(r => setTimeout(r, 2000));
      }

      const result = { total: list.length, skipped: freshIds.size, refreshed, errors, geocodeFailed, failures };
      await logEnd(logId, errors === 0 ? 'ok' : 'partial', result);
      return NextResponse.json({ ok: errors === 0, job, result, ranAt: new Date().toISOString() }, { status: errors === 0 ? 200 : 207 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  // ─── Urban Atlas refresh (Copernicus EU land-use, 180-day TTL) ──────────────
  if (job === 'urban_atlas_refresh') {
    const logId = await logStart(job);
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      const { data: buildings, error: bErr } = await supabase
        .from('buildings')
        .select('id, name, address, lat, lon');
      if (bErr) throw new Error(bErr.message);

      const { data: cached } = await supabase
        .from('building_urban_atlas_cache')
        .select('building_id, computed_at')
        .gt('computed_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

      const freshIds = new Set((cached ?? []).map((r: { building_id: string }) => r.building_id));
      const toRefresh = ((buildings ?? []) as BuildingRow[]).filter(b => !freshIds.has(b.id));

      let refreshed = 0, errors = 0, geocodeFailed = 0;
      const failures: Array<{ buildingId: string; name: string; address: string; reason: string; attempts: GeocodeAttempt[] }> = [];
      for (const building of toRefresh) {
        const coords = await resolveCoords(building, supabase);
        if (!coords.ok) {
          geocodeFailed++;
          failures.push({ buildingId: building.id, name: building.name, address: building.address ?? '', reason: coords.reason, attempts: coords.attempts });
          continue;
        }
        try {
          const url = `${appBase}/api/environment/urban-atlas?lat=${coords.lat}&lon=${coords.lon}&buildingId=${building.id}`;
          const res = await fetch(url, { cache: 'no-store', headers: environmentRefreshHeaders() });
          if (res.ok) refreshed++; else errors++;
        } catch { errors++; }
        await new Promise(r => setTimeout(r, 2000));
      }

      const result = { total: (buildings ?? []).length, skipped: freshIds.size, refreshed, errors, geocodeFailed, failures };
      await logEnd(logId, errors === 0 ? 'ok' : 'partial', result);
      return NextResponse.json({ ok: errors === 0, job, result, ranAt: new Date().toISOString() }, { status: errors === 0 ? 200 : 207 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  // ─── Budapest Open Data import (fa-leltár + parknyilvántartás) ───────────────
  if (job === 'budapest_import') {
    const logId = await logStart(job);
    const fetchErrors: Array<{ url: string; error: string }> = [];
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      // ── 1. CKAN base candidates ──────────────────────────────────────────
      // The Budapest open-data portal has moved domain a few times; try the
      // canonical CKAN base, then the legacy / alternate prefixes.
      const CKAN_BASES = [
        'https://opendata.budapest.hu/api/3/action',
        'https://nyiltadat.budapest.hu/api/3/action',
        'https://opendata.budapest.hu/api/action',
      ];
      const COMMON_HEADERS = {
        'User-Agent': 'panellako.hu/1.0 (info@panellako.hu)',
        'Accept':     'application/json',
        'Referer':    'https://panellako.hu',
      } as const;

      // Probe each base until one responds with HTTP 200 to a /status_show
      // or /package_search call.  This lets us return a clear "all bases
      // unreachable" diagnostic rather than the generic 'fetch failed'.
      async function probeBase(base: string): Promise<{ ok: true; base: string } | { ok: false; error: string }> {
        try {
          const res = await fetch(`${base}/package_search?rows=1`, {
            headers: COMMON_HEADERS,
            signal:  AbortSignal.timeout(8_000),
          });
          if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
          return { ok: true, base };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? `${err.name}: ${err.message}${err.cause ? ` (cause: ${String(err.cause).slice(0, 100)})` : ''}` : String(err) };
        }
      }

      let CKAN_BASE: string | null = null;
      for (const base of CKAN_BASES) {
        const probe = await probeBase(base);
        if (probe.ok) { CKAN_BASE = probe.base; break; }
        fetchErrors.push({ url: base, error: probe.error });
      }

      // ─── OSM Overpass fallback ─────────────────────────────────────────────
      // 2024 óta egyik Budapest CKAN-portál (opendata.budapest.hu,
      // nyiltadat.budapest.hu) sincs üzemben — minden DNS-szinten halott
      // (ENOTFOUND).  Ezt a job-ot tovább kell tudnunk futtatni, ezért OSM
      // Overpass-szal töltjük be a budapest_trees + budapest_parks táblákat
      // helyettesítve.  Az OSM `natural=tree` és `leisure=park` adatait a
      // budapesti közösség folyamatosan karbantartja, ez a tényleges
      // de facto authoritative source CKAN nélkül.
      if (!CKAN_BASE) {
        const ovrStats: Record<string, unknown> = { ckanUnreachable: true, fetchErrors, fallback: 'osm-overpass' };
        const OVERPASS_MIRRORS = [
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass-api.de/api/interpreter',
          'https://overpass.openstreetmap.fr/api/interpreter',
        ];
        // Budapest bbox (lat-min, lon-min, lat-max, lon-max)
        const BP_BBOX = '47.35,18.85,47.65,19.35';

        async function overpass(query: string): Promise<{ elements: Array<{ type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> } | null> {
          for (const mirror of OVERPASS_MIRRORS) {
            try {
              const res = await fetch(mirror, {
                method:  'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'panellako/1.0 (info@panellako.hu)' },
                body:    `data=${encodeURIComponent(query)}`,
                signal:  AbortSignal.timeout(60_000),
              });
              if (!res.ok) { fetchErrors.push({ url: mirror, error: `HTTP ${res.status}` }); continue; }
              return await res.json();
            } catch (err) {
              fetchErrors.push({ url: mirror, error: err instanceof Error ? err.message : String(err) });
            }
          }
          return null;
        }

        // ── Trees ─────────────────────────────────────────────────────────
        const treesQ = `[out:json][timeout:25];(node["natural"="tree"](${BP_BBOX}););out body 50000;`;
        const treesJson = await overpass(treesQ);
        if (treesJson) {
          await supabase.from('budapest_trees').delete().neq('id', 0);
          const rows = (treesJson.elements ?? [])
            .filter(e => e.type === 'node' && typeof e.lat === 'number' && typeof e.lon === 'number')
            .map(e => ({
              ext_id:      `osm:${e.id}`,
              lat:         e.lat!,
              lon:         e.lon!,
              species_lat: e.tags?.['species'] ?? e.tags?.['species:wikidata'] ?? '',
              species_hu:  e.tags?.['species:hu'] ?? e.tags?.['name'] ?? '',
              condition:   e.tags?.['condition'] ?? '',
              district:    e.tags?.['addr:district'] ?? e.tags?.['admin_level'] ?? '',
              height_m:    e.tags?.['height']     ? parseFloat(e.tags['height'])     || null : null,
              crown_r_m:   e.tags?.['diameter_crown'] ? parseFloat(e.tags['diameter_crown']) / 2 || null : null,
              imported_at: new Date().toISOString(),
            }));
          if (rows.length > 0) {
            // Insert in chunks of 1000 to avoid Supabase REST payload limits
            for (let i = 0; i < rows.length; i += 1000) {
              await supabase.from('budapest_trees').insert(rows.slice(i, i + 1000));
            }
          }
          ovrStats.treesImported = rows.length;
        } else {
          ovrStats.treesError = 'All Overpass mirrors failed for trees query';
        }

        // ── Parks ─────────────────────────────────────────────────────────
        const parksQ = `[out:json][timeout:25];(way["leisure"="park"](${BP_BBOX});relation["leisure"="park"](${BP_BBOX}););out center 5000;`;
        const parksJson = await overpass(parksQ);
        if (parksJson) {
          await supabase.from('budapest_parks').delete().neq('id', 0);
          const rows = (parksJson.elements ?? [])
            .filter(e => (e.type === 'way' || e.type === 'relation') && e.center)
            .map(e => ({
              ext_id:      `osm:${e.id}`,
              name:        e.tags?.['name'] ?? e.tags?.['leisure'] ?? 'Park',
              district:    e.tags?.['addr:district'] ?? '',
              area_m2:     null,
              lat:         e.center!.lat,
              lon:         e.center!.lon,
              imported_at: new Date().toISOString(),
            }));
          if (rows.length > 0) {
            for (let i = 0; i < rows.length; i += 1000) {
              await supabase.from('budapest_parks').insert(rows.slice(i, i + 1000));
            }
          }
          ovrStats.parksImported = rows.length;
        } else {
          ovrStats.parksError = 'All Overpass mirrors failed for parks query';
        }

        await supabase.from('budapest_data_meta').upsert([
          { key: 'trees_imported_at', value: new Date().toISOString() },
          { key: 'tree_resource_id',  value: 'osm-overpass:natural=tree'  },
          { key: 'park_resource_id',  value: 'osm-overpass:leisure=park' },
        ], { onConflict: 'key' });

        ovrStats.fetchErrors = fetchErrors;
        const ok = !!(ovrStats.treesImported || ovrStats.parksImported);
        await logEnd(logId, ok ? 'ok' : 'error', ovrStats);
        return NextResponse.json({ ok, job, result: ovrStats, ranAt: new Date().toISOString() }, { status: ok ? 200 : 502 });
      }

      async function ckanSearch(query: string): Promise<Array<{ id: string; name: string; resources: Array<{ id: string; format: string; name: string }> }>> {
        try {
          const res = await fetch(`${CKAN_BASE}/package_search?q=${encodeURIComponent(query)}&rows=5`, {
            headers: COMMON_HEADERS,
            signal:  AbortSignal.timeout(15_000),
          });
          if (!res.ok) {
            fetchErrors.push({ url: `${CKAN_BASE}/package_search?q=${query}`, error: `HTTP ${res.status}` });
            return [];
          }
          const json = await res.json() as { result?: { results?: unknown[] } };
          return (json.result?.results ?? []) as Array<{ id: string; name: string; resources: Array<{ id: string; format: string; name: string }> }>;
        } catch (err) {
          fetchErrors.push({ url: `${CKAN_BASE}/package_search?q=${query}`, error: err instanceof Error ? err.message : String(err) });
          return [];
        }
      }

      async function ckanPage(resourceId: string, offset: number, limit = 10000): Promise<{ records: Record<string, unknown>[]; total: number }> {
        const params = new URLSearchParams({ resource_id: resourceId, limit: String(limit), offset: String(offset) });
        const url = `${CKAN_BASE}/datastore_search?${params}`;
        const res = await fetch(url, {
          headers: COMMON_HEADERS,
          signal:  AbortSignal.timeout(60_000),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`CKAN datastore HTTP ${res.status} @ ${url} — ${body.slice(0, 200)}`);
        }
        const json = await res.json() as {
          result?: { records?: Record<string, unknown>[]; total?: number };
          error?: { message?: string };
        };
        if (json.error) throw new Error(`CKAN error: ${json.error.message}`);
        return { records: json.result?.records ?? [], total: json.result?.total ?? 0 };
      }

      // Try to find tree and park datasets by searching CKAN
      const [treePackages, parkPackages] = await Promise.all([
        ckanSearch('fakataszter'),
        ckanSearch('park'),
      ]);

      // ── Helper: detect lat/lon column names ──────────────────────────────
      function detectLatLonCols(sample: Record<string, unknown>): { latCol: string; lonCol: string } | null {
        const keys = Object.keys(sample).map(k => k.toLowerCase());
        const latCandidates = ['y_wgs84', 'ywgs84', 'lat', 'latitude', 'wgs_lat', 'y_coord', 'szelesseg'];
        const lonCandidates = ['x_wgs84', 'xwgs84', 'lon', 'longitude', 'wgs_lon', 'x_coord', 'hosszusag'];
        const latKey = latCandidates.find(c => keys.includes(c));
        const lonKey = lonCandidates.find(c => keys.includes(c));
        if (!latKey || !lonKey) return null;
        const realLatKey = Object.keys(sample).find(k => k.toLowerCase() === latKey)!;
        const realLonKey = Object.keys(sample).find(k => k.toLowerCase() === lonKey)!;
        return { latCol: realLatKey, lonCol: realLonKey };
      }

      let treeResourceId: string | null = null;
      let parkResourceId: string | null = null;

      for (const pkg of treePackages) {
        const csvRes = pkg.resources?.find(r => r.format?.toUpperCase() === 'CSV' || r.format?.toUpperCase() === 'JSON');
        if (csvRes) { treeResourceId = csvRes.id; break; }
        if (pkg.resources?.[0]) { treeResourceId = pkg.resources[0].id; break; }
      }
      for (const pkg of parkPackages) {
        const csvRes = pkg.resources?.find(r =>
          r.format?.toUpperCase() === 'CSV' || r.format?.toUpperCase() === 'JSON' || r.format?.toUpperCase() === 'GEOJSON');
        if (csvRes) { parkResourceId = csvRes.id; break; }
        if (pkg.resources?.[0]) { parkResourceId = pkg.resources[0].id; break; }
      }

      const stats: Record<string, unknown> = { treeResourceId, parkResourceId };

      // ── 2. Import trees ───────────────────────────────────────────────────
      if (treeResourceId) {
        let offset = 0; let total = 0; let imported = 0;
        const LIMIT = 5000;
        // Clear existing data before re-import
        await supabase.from('budapest_trees').delete().neq('id', 0);

        do {
          const page = await ckanPage(treeResourceId, offset, LIMIT);
          total = page.total;
          if (page.records.length === 0) break;

          const cols = page.records[0] ? detectLatLonCols(page.records[0]) : null;
          if (!cols && offset === 0) {
            stats.treeError = `Cannot detect lat/lon columns. Keys: ${Object.keys(page.records[0] ?? {}).join(', ')}`;
            break;
          }

          const rows = page.records
            .filter(r => cols && r[cols.latCol] != null && r[cols.lonCol] != null)
            .map(r => {
              const lat = parseFloat(String(r[cols!.latCol]));
              const lon = parseFloat(String(r[cols!.lonCol]));
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
              return {
                ext_id:      String(r._id ?? r.id ?? ''),
                lat,
                lon,
                species_lat: String(r.faj_nev_latin ?? r.faj_latin ?? r.latin_nev ?? ''),
                species_hu:  String(r.faj_nev_magyar ?? r.faj_nev ?? r.nev ?? ''),
                condition:   String(r.allapot ?? r.allapot_kozos ?? ''),
                district:    String(r.kerulet ?? r.district ?? ''),
                height_m:    r.magassag != null ? parseFloat(String(r.magassag)) || null : null,
                crown_r_m:   r.koronatmero != null ? parseFloat(String(r.koronatmero)) / 2 || null : null,
                imported_at: new Date().toISOString(),
              };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);

          if (rows.length > 0) {
            await supabase.from('budapest_trees').insert(rows);
            imported += rows.length;
          }

          offset += LIMIT;
        } while (offset < total);

        stats.treesImported = imported;
        stats.treesTotal = total;
      }

      // ── 3. Import parks ───────────────────────────────────────────────────
      if (parkResourceId) {
        let offset = 0; let total = 0; let imported = 0;
        const LIMIT = 2000;
        await supabase.from('budapest_parks').delete().neq('id', 0);

        do {
          const page = await ckanPage(parkResourceId, offset, LIMIT);
          total = page.total;
          if (page.records.length === 0) break;

          const rows = page.records
            .map(r => {
              const cols = detectLatLonCols(r);
              if (!cols) return null;
              const lat = parseFloat(String(r[cols.latCol]));
              const lon = parseFloat(String(r[cols.lonCol]));
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
              return {
                ext_id:      String(r._id ?? r.id ?? ''),
                name:        String(r.nev ?? r.park_nev ?? r.name ?? r.megnevezes ?? 'Park'),
                district:    String(r.kerulet ?? ''),
                area_m2:     r.terulet != null ? parseFloat(String(r.terulet)) || null
                  : r.area_m2 != null ? parseFloat(String(r.area_m2)) || null : null,
                lat,
                lon,
                imported_at: new Date().toISOString(),
              };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);

          if (rows.length > 0) {
            await supabase.from('budapest_parks').insert(rows);
            imported += rows.length;
          }
          offset += LIMIT;
        } while (offset < total);

        stats.parksImported = imported;
        stats.parksTotal = total;
      }

      // ── 4. Update metadata ────────────────────────────────────────────────
      const now = new Date().toISOString();
      await supabase.from('budapest_data_meta').upsert([
        { key: 'trees_imported_at', value: now },
        { key: 'tree_resource_id',  value: treeResourceId ?? '' },
        { key: 'park_resource_id',  value: parkResourceId ?? '' },
      ], { onConflict: 'key' });

      const ok = !!(treeResourceId || parkResourceId);
      if (fetchErrors.length > 0) (stats as Record<string, unknown>).fetchErrors = fetchErrors;
      await logEnd(logId, ok ? 'ok' : 'error', stats);
      return NextResponse.json({ ok, job, result: stats, ranAt: now }, { status: ok ? 200 : 207 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message, fetchErrors });
      return NextResponse.json({ ok: false, job, error: message, fetchErrors, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  // ─── NDVI Hungary render (NASA GIBS WMS, 100% free, no API key) ───────────
  // Single GIBS GetMap call per resolution renders the entire Hungary bbox
  // as a ready-to-display NDVI PNG.  Source: MODIS Terra 8-day composite
  // (250 m native, ~daily updates).  Aqua fallback if Terra is missing data.
  if (job === 'ndvi_hungary_render') {
    const logId = await logStart(job);
    const t0 = Date.now();
    const supabase = createServiceClient();
    if (!supabase) {
      const msg = 'No Supabase client (env vars missing)';
      await logEnd(logId, 'error', { error: msg });
      return NextResponse.json({ ok: false, job, error: msg }, { status: 500 });
    }

    const RESOLUTIONS: Array<{ key: string; label: string; width: number; height: number }> = [
      { key: 'large',                       label: 'Nagy',                                width: 1024,  height: 430  },
      { key: 'very_large',                  label: 'Nagyon nagy',                         width: 2048,  height: 860  },
      { key: 'very_very_large',             label: 'Nagyon nagyon nagy',                  width: 4096,  height: 1720 },
      { key: 'very_very_very_very_large',   label: 'Nagyon nagyon nagyon nagyon nagy',    width: 8192,  height: 3440 },
      { key: 'brutal',                      label: 'Brutális',                            width: 16384, height: 6880 },
    ];
    // Render the master at the largest size, downscale to the smaller ones.
    const masterRes = RESOLUTIONS[RESOLUTIONS.length - 1];

    const { data: runRow, error: runErr } = await supabase
      .from('ndvi_hungary_renders')
      .insert({
        status:           'running',
        source_provider:  'nasa-gibs-wms',
        source_satellite: 'MODIS Terra/Aqua 8-Day NDVI',
        cloud_cover_pct:  null,
        bbox:             HU_BBOX,
        triggered_by:     'superadmin',
      })
      .select('id, run_id')
      .single();
    if (runErr || !runRow) {
      const msg = `Could not create run row: ${runErr?.message ?? 'unknown'}`;
      await logEnd(logId, 'error', { error: msg });
      return NextResponse.json({ ok: false, job, error: msg }, { status: 500 });
    }
    const runId = runRow.run_id as string;
    const publicBase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');

    // ── 1. Render the master NDVI PNG from GIBS ─────────────────────────────
    //    The master is the largest tier (Brutális, 16384×6880).  That is well
    //    above GIBS' practical single-call limit (~8192 px), so we build it
    //    from a tile mosaic.  Smaller tiers are downscaled from this master.
    let master;
    try {
      master = await renderHungaryNdviTiled({ width: masterRes.width, height: masterRes.height, tileMax: 4096 });
    } catch (err) {
      const msg = `GIBS render failed: ${err instanceof Error ? err.message : String(err)}`;
      await supabase.from('ndvi_hungary_renders').update({
        status: 'failure', finished_at: new Date().toISOString(),
        duration_ms: Date.now() - t0, error_message: msg,
      }).eq('run_id', runId);
      await logEnd(logId, 'error', { error: msg });
      return NextResponse.json({ ok: false, job, error: msg, runId }, { status: 502 });
    }

    // ── 2. Upload all 5 resolutions (downscaled from the master) ──────────
    //    Each tier is verified post-render with sharp().metadata() so we catch
    //    any silent size-mismatch before publishing the URL (e.g. if sharp
    //    aborted the upscale and fell back to a smaller dimension).
    //    The Brutális (16384×6880) tier is retried up to 3× on upload failure
    //    because the PNG is large (~100 MB) and Supabase Storage occasionally
    //    times out the first attempt.
    const sharpMod = (await import('sharp')).default;
    const renderedResolutions: Record<string, { width: number; height: number; storage_path: string; url: string; bytes: number; label: string }> = {};
    let totalBytes = 0;
    const uploadErrors: Array<{ key: string; error: string }> = [];
    const dimensionMismatches: Array<{ key: string; expected: string; actual: string }> = [];
    for (const r of RESOLUTIONS) {
      const isMaster = r.key === masterRes.key;
      try {
        const png = isMaster
          ? master.png
          : await downscalePng(master.png, r.width, r.height);

        // VERIFY dimensions before upload — catches silent sharp-failure where
        // the output PNG is smaller than requested (e.g. memory pressure).
        const meta = await sharpMod(png).metadata();
        const actualW = meta.width ?? 0;
        const actualH = meta.height ?? 0;
        if (actualW !== r.width || actualH !== r.height) {
          dimensionMismatches.push({
            key:      r.key,
            expected: `${r.width}×${r.height}`,
            actual:   `${actualW}×${actualH}`,
          });
          throw new Error(`Generated PNG is ${actualW}×${actualH}, expected ${r.width}×${r.height} (${r.label})`);
        }

        const storagePath = `${runId}/${r.key}.png`;

        // Upload with retry for large tiers (brutal especially)
        const maxAttempts = isMaster ? 3 : 1;
        let upErr: { message: string } | null = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const { error } = await supabase.storage.from('ndvi-maps').upload(
            storagePath,
            new Blob([png as BlobPart], { type: 'image/png' }),
            { contentType: 'image/png', upsert: true, cacheControl: '604800' },
          );
          if (!error) { upErr = null; break; }
          upErr = error;
          if (attempt < maxAttempts) await new Promise(res => setTimeout(res, 1500 * attempt));
        }
        if (upErr) throw new Error(`Storage upload (after ${maxAttempts} attempts): ${upErr.message}`);

        const url = `${publicBase}/storage/v1/object/public/ndvi-maps/${storagePath}`;
        renderedResolutions[r.key] = {
          width:        r.width,
          height:       r.height,
          storage_path: storagePath,
          url,
          bytes:        png.length,
          label:        r.label,
        };
        totalBytes += png.length;
      } catch (err) {
        uploadErrors.push({ key: r.key, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const ok = uploadErrors.length === 0 && Object.keys(renderedResolutions).length === RESOLUTIONS.length;
    const finalStatus = ok
      ? 'success'
      : (Object.keys(renderedResolutions).length > 0 ? 'partial' : 'failure');
    const duration_ms = Date.now() - t0;
    // GIBS reports the composite by its START date.  The acquisition window
    // ends 7 days later.  Display "windowEnd" as the user-facing date.
    const acquisitionLatest = new Date(`${master.windowEnd}T00:00:00Z`).toISOString();
    const acquisitionFrom   = new Date(`${master.time}T00:00:00Z`).toISOString();

    await supabase
      .from('ndvi_hungary_renders')
      .update({
        status:             finalStatus,
        finished_at:        new Date().toISOString(),
        duration_ms,
        resolutions:        renderedResolutions,
        total_bytes:        totalBytes,
        acquisition_from:   acquisitionFrom,
        acquisition_to:     acquisitionLatest,
        acquisition_latest: acquisitionLatest,
        source_scene_ids:   [`${master.layer}:${master.time}`],
        error_message:      uploadErrors.length > 0 ? JSON.stringify(uploadErrors).slice(0, 4000) : null,
      })
      .eq('run_id', runId);

    const result = {
      runId,
      status:     finalStatus,
      duration_ms,
      source: {
        provider:  'NASA GIBS WMS',
        layer:     master.layer,
        timeStart: master.time,
        timeEnd:   master.windowEnd,
      },
      resolutions: Object.fromEntries(
        Object.entries(renderedResolutions).map(([k, v]) => [k, { width: v.width, height: v.height, url: v.url, bytes: v.bytes }]),
      ),
      acquisitionLatest,
      totalBytes,
      errors:    uploadErrors,
      dimensionMismatches,
    };
    await logEnd(logId, ok ? 'ok' : (Object.keys(renderedResolutions).length > 0 ? 'partial' : 'error'), result);
    return NextResponse.json({ ok, job, result, ranAt: new Date().toISOString() }, { status: ok ? 200 : (Object.keys(renderedResolutions).length === 0 ? 500 : 207) });
  }


  // ─── Cycling: BKK MOL Bubi GBFS station_status (percenkénti pull) ──────────
  // ─── Cycling: BKK MOL Bubi GBFS station_status (percenkénti pull) ─────────
  // Több candidate hostot próbál (a gbfs.bubi.bkk.hu időnként nem érhető el),
  // előbb az auto-discovery gbfs.json-en keresztül szerzi meg a tényleges
  // station_status URL-t, majd onnan szedi az adatokat.
  if (job === 'cycling_bkk_gbfs_status') {
    const logId = await logStart(job);
    const attempts: Array<{ url: string; ok: boolean; status?: number; error?: string; bytes?: number }> = [];
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      // Step 1: GBFS auto-discovery — try multiple candidate gbfs.json endpoints
      const GBFS_DISCOVERY_CANDIDATES = [
        'https://opendata.bkk.hu/gbfs/gbfs.json',
        'https://gbfs.bubi.bkk.hu/gbfs/gbfs.json',
        'https://gbfs.bubi.bkk.hu/gbfs/v3/gbfs.json',
        'https://api.molbubi.hu/gbfs/gbfs.json',
        'https://molbubi.bkk.hu/gbfs/gbfs.json',
      ];
      const HEADERS = { 'User-Agent': 'panellako.hu/1.0 (info@panellako.hu)', 'Accept': 'application/json' } as const;

      async function probeJson(url: string): Promise<unknown | null> {
        try {
          const res = await fetch(url, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(8_000) });
          if (!res.ok) {
            attempts.push({ url, ok: false, status: res.status, error: `HTTP ${res.status}` });
            return null;
          }
          const ct = res.headers.get('content-type') ?? '';
          if (!ct.includes('json')) {
            attempts.push({ url, ok: false, status: res.status, error: `non-json: ${ct}` });
            return null;
          }
          const json = await res.json();
          attempts.push({ url, ok: true, status: res.status });
          return json;
        } catch (err) {
          attempts.push({ url, ok: false, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) });
          return null;
        }
      }

      // Resolve station_status feed URL — either via gbfs.json discovery, OR
      // by trying the canonical direct URLs.
      let statusFeedUrl: string | null = null;
      for (const discoveryUrl of GBFS_DISCOVERY_CANDIDATES) {
        const disco = await probeJson(discoveryUrl);
        if (!disco) continue;
        // GBFS v1/v2 shape: {data:{en:{feeds:[{name,url}]}}}; v3 shape: {data:{feeds:[{name,url}]}}
        type Feed = { name: string; url: string };
        const d = disco as { data?: Record<string, unknown> };
        const langKeys = Object.keys(d.data ?? {});
        let feeds: Feed[] | undefined;
        for (const k of langKeys) {
          const blk = (d.data as Record<string, unknown>)[k] as { feeds?: Feed[] } | undefined;
          if (blk?.feeds) { feeds = blk.feeds; break; }
        }
        if (!feeds) feeds = (d.data as { feeds?: Feed[] })?.feeds;
        const status = feeds?.find(f => f.name === 'station_status')?.url;
        if (status) { statusFeedUrl = status; break; }
      }

      // Fallback: try direct URLs without discovery
      if (!statusFeedUrl) {
        const DIRECT_STATUS_URLS = [
          'https://opendata.bkk.hu/gbfs/v3/station_status.json',
          'https://opendata.bkk.hu/gbfs/station_status.json',
          'https://gbfs.bubi.bkk.hu/gbfs/v3/station_status.json',
          'https://gbfs.bubi.bkk.hu/gbfs/en/station_status.json',
          'https://api.molbubi.hu/gbfs/v3/station_status.json',
        ];
        for (const url of DIRECT_STATUS_URLS) {
          try {
            const res = await fetch(url, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(8_000) });
            if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) {
              statusFeedUrl = url;
              attempts.push({ url, ok: true, status: res.status, bytes: 0 });
              break;
            }
            attempts.push({ url, ok: false, status: res.status });
          } catch (err) {
            attempts.push({ url, ok: false, error: err instanceof Error ? err.message : String(err) });
          }
        }
      }

      if (!statusFeedUrl) {
        const message = 'No reachable BKK Bubi GBFS station_status feed';
        await logEnd(logId, 'error', { error: message, attempts });
        return NextResponse.json({ ok: false, job, error: message, attempts, ranAt: new Date().toISOString() }, { status: 502 });
      }

      // Step 2: Fetch the resolved status feed
      const res = await fetch(statusFeedUrl, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`GBFS station_status HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const json = await res.json() as {
        last_updated?: number;
        data?: { stations?: Array<{
          station_id: string;
          num_bikes_available?: number;
          num_docks_available?: number;
          is_renting?: boolean;
          is_returning?: boolean;
          last_reported?: number;
        }> };
      };
      const lastUpdated = json.last_updated ?? Math.floor(Date.now() / 1000);
      const ts = new Date(lastUpdated * 1000).toISOString();
      const stations = json.data?.stations ?? [];
      const rows = stations.map(s => ({
        station_id:           s.station_id,
        ts,
        num_bikes_available:  s.num_bikes_available ?? null,
        num_docks_available:  s.num_docks_available ?? null,
        is_renting:           s.is_renting ?? null,
        is_returning:         s.is_returning ?? null,
        last_reported:        s.last_reported ? new Date(s.last_reported * 1000).toISOString() : null,
      }));

      if (rows.length > 0) {
        const { error } = await supabase.schema('gbfs').from('station_status').insert(rows);
        if (error) throw new Error(`gbfs.station_status insert: ${error.message}`);
      }

      const result = { stationsImported: rows.length, ts, resolvedFeedUrl: statusFeedUrl, attempts };
      await logEnd(logId, 'ok', result);
      return NextResponse.json({ ok: true, job, result, ranAt: new Date().toISOString() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message, attempts });
      return NextResponse.json({ ok: false, job, error: message, attempts, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  // ─── Cycling: BKK MOL Bubi GBFS station_information (napi pull) ────────────
  // Ugyanaz a discovery-fallback minta mint a station_status-ban.
  if (job === 'cycling_bkk_gbfs_info') {
    const logId = await logStart(job);
    const attempts: Array<{ url: string; ok: boolean; status?: number; error?: string }> = [];
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      const HEADERS = { 'User-Agent': 'panellako.hu/1.0 (info@panellako.hu)', 'Accept': 'application/json' } as const;

      // 1) Discovery-first
      const GBFS_DISCOVERY_CANDIDATES = [
        'https://opendata.bkk.hu/gbfs/gbfs.json',
        'https://gbfs.bubi.bkk.hu/gbfs/gbfs.json',
        'https://gbfs.bubi.bkk.hu/gbfs/v3/gbfs.json',
        'https://api.molbubi.hu/gbfs/gbfs.json',
        'https://molbubi.bkk.hu/gbfs/gbfs.json',
      ];
      let infoFeedUrl: string | null = null;
      for (const discoveryUrl of GBFS_DISCOVERY_CANDIDATES) {
        try {
          const dres = await fetch(discoveryUrl, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(8_000) });
          if (!dres.ok) { attempts.push({ url: discoveryUrl, ok: false, status: dres.status }); continue; }
          const ct = dres.headers.get('content-type') ?? '';
          if (!ct.includes('json')) { attempts.push({ url: discoveryUrl, ok: false, error: `non-json: ${ct}` }); continue; }
          const disco = await dres.json() as { data?: Record<string, unknown> };
          attempts.push({ url: discoveryUrl, ok: true, status: dres.status });
          type Feed = { name: string; url: string };
          let feeds: Feed[] | undefined;
          for (const k of Object.keys(disco.data ?? {})) {
            const blk = (disco.data as Record<string, unknown>)[k] as { feeds?: Feed[] } | undefined;
            if (blk?.feeds) { feeds = blk.feeds; break; }
          }
          if (!feeds) feeds = (disco.data as { feeds?: Feed[] })?.feeds;
          const info = feeds?.find(f => f.name === 'station_information')?.url;
          if (info) { infoFeedUrl = info; break; }
        } catch (err) {
          attempts.push({ url: discoveryUrl, ok: false, error: err instanceof Error ? err.message : String(err) });
        }
      }

      // 2) Direct fallback
      if (!infoFeedUrl) {
        const DIRECT = [
          'https://opendata.bkk.hu/gbfs/v3/station_information.json',
          'https://opendata.bkk.hu/gbfs/station_information.json',
          'https://gbfs.bubi.bkk.hu/gbfs/v3/station_information.json',
          'https://gbfs.bubi.bkk.hu/gbfs/en/station_information.json',
          'https://api.molbubi.hu/gbfs/v3/station_information.json',
        ];
        for (const u of DIRECT) {
          try {
            const r = await fetch(u, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(8_000) });
            if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) {
              infoFeedUrl = u;
              attempts.push({ url: u, ok: true, status: r.status });
              break;
            }
            attempts.push({ url: u, ok: false, status: r.status });
          } catch (err) {
            attempts.push({ url: u, ok: false, error: err instanceof Error ? err.message : String(err) });
          }
        }
      }

      if (!infoFeedUrl) {
        const message = 'No reachable BKK Bubi GBFS station_information feed';
        await logEnd(logId, 'error', { error: message, attempts });
        return NextResponse.json({ ok: false, job, error: message, attempts, ranAt: new Date().toISOString() }, { status: 502 });
      }

      const res = await fetch(infoFeedUrl, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`GBFS station_information HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const json = await res.json() as {
        data?: { stations?: Array<Record<string, unknown> & {
          station_id: string;
          name?: string;
          lat?: number;
          lon?: number;
          capacity?: number;
          region_id?: string;
        }> };
      };
      const stations = json.data?.stations ?? [];
      const rows = stations.map(s => ({
        station_id: s.station_id,
        name:       s.name ?? null,
        lat:        s.lat ?? null,
        lon:        s.lon ?? null,
        capacity:   s.capacity ?? null,
        region_id:  null as string | null,
        attributes: s,
      }));

      if (rows.length > 0) {
        const { error } = await supabase
          .schema('gbfs')
          .from('station_information')
          .upsert(rows, { onConflict: 'station_id' });
        if (error) throw new Error(`gbfs.station_information upsert: ${error.message}`);
      }

      const result = { stationsUpserted: rows.length, resolvedFeedUrl: infoFeedUrl, attempts };
      await logEnd(logId, 'ok', result);
      return NextResponse.json({ ok: true, job, result, ranAt: new Date().toISOString() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message, attempts });
      return NextResponse.json({ ok: false, job, error: message, attempts, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  // ─── Cycling: Waymarked Trails Magyarország (napi REST API pull) ───────────
  if (job === 'cycling_waymarked_trails') {
    const logId = await logStart(job);
    const errors: Array<{ relationId?: number; stage: string; error: string }> = [];
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      const COMMON_HEADERS = {
        'User-Agent': 'panellako.hu/1.0 (info@panellako.hu)',
        'Accept':     'application/json',
        'Referer':    'https://panellako.hu',
      } as const;

      // 1. List relations in Hungary bbox — try multiple endpoint variants.
      // Waymarked Trails has had several API URL shapes over the years; the
      // 200-OK-but-empty response we saw in production tells us the URL we
      // hit returned a non-result-bearing JSON shape, so we try alternatives.
      type Rel = { id: number; name?: string; ref?: string; length?: number; level?: number; network?: string };
      let relations: Rel[] = [];
      let lastRawSample = '';
      const listAttempts: Array<{ url: string; ok: boolean; status?: number; resultCount: number; sample?: string }> = [];

      const LIST_URLS = [
        // bbox=minLon,minLat,maxLon,maxLat (most-common waymarkedtrails order)
        'https://cycling.waymarkedtrails.org/api/v1/list/by_area?bbox=16.0,45.7,22.9,48.6&limit=200',
        // Some forks expose `/list/segments` for bbox queries
        'https://cycling.waymarkedtrails.org/api/v1/list/segments?bbox=16.0,45.7,22.9,48.6&limit=200',
        // Alternate axis ordering
        'https://cycling.waymarkedtrails.org/api/v1/list/by_area?bbox=45.7,16.0,48.6,22.9&limit=200',
        // Older path style
        'https://cycling.waymarkedtrails.org/api/list?bbox=16.0,45.7,22.9,48.6&limit=200',
      ];
      for (const u of LIST_URLS) {
        try {
          const res = await fetch(u, { headers: COMMON_HEADERS, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
          if (!res.ok) {
            listAttempts.push({ url: u, ok: false, status: res.status, resultCount: 0 });
            continue;
          }
          const raw = await res.text();
          lastRawSample = raw.slice(0, 500);
          let parsed: unknown;
          try { parsed = JSON.parse(raw); }
          catch {
            listAttempts.push({ url: u, ok: false, status: res.status, resultCount: 0, sample: lastRawSample });
            continue;
          }
          let r: Rel[] = [];
          if (Array.isArray(parsed)) {
            r = parsed as Rel[];
          } else if (parsed && typeof parsed === 'object') {
            const obj = parsed as { results?: Rel[]; features?: Array<{ properties?: Rel; id?: number }>; rows?: Rel[]; segments?: Rel[] };
            if (Array.isArray(obj.results))       r = obj.results;
            else if (Array.isArray(obj.rows))     r = obj.rows;
            else if (Array.isArray(obj.segments)) r = obj.segments;
            else if (Array.isArray(obj.features)) {
              r = obj.features
                .map(f => (f.properties && f.properties.id) ? f.properties : (f.id ? { id: f.id } as Rel : null))
                .filter((x): x is Rel => !!x);
            }
          }
          listAttempts.push({ url: u, ok: true, status: res.status, resultCount: r.length, sample: r.length === 0 ? lastRawSample : undefined });
          if (r.length > 0) { relations = r; break; }
        } catch (err) {
          listAttempts.push({ url: u, ok: false, resultCount: 0, sample: err instanceof Error ? `${err.name}: ${err.message}` : String(err) });
        }
      }
      if (relations.length === 0) {
        // All endpoint variants returned empty — surface a useful diagnostic
        // (includes raw response sample) so the user can see what the API
        // actually returned.
        const message = 'Waymarked Trails: all list endpoints returned 0 results — API shape likely changed. Inspect `attempts[*].sample` to see what the server returned.';
        await logEnd(logId, 'error', { error: message, attempts: listAttempts });
        return NextResponse.json({ ok: false, job, error: message, attempts: listAttempts, ranAt: new Date().toISOString() }, { status: 502 });
      }

      const fetchedAt = new Date().toISOString();
      const dataVersion = fetchedAt.slice(0, 10);
      let relationsImported = 0;

      // 2. For each relation, GET geometry and upsert via cycling.upsert_route RPC
      for (const rel of relations) {
        // Polite rate-limit: 1 req/sec
        await new Promise(r => setTimeout(r, 1000));
        try {
          const geomUrl = `https://cycling.waymarkedtrails.org/api/v1/details/relation/${rel.id}/geometry/0`;
          const geomRes = await fetch(geomUrl, { headers: COMMON_HEADERS, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
          if (!geomRes.ok) {
            errors.push({ relationId: rel.id, stage: 'geometry-fetch', error: `HTTP ${geomRes.status}` });
            continue;
          }
          const geojson = await geomRes.json() as unknown;
          // Build a GeometryCollection / MultiLineString from the FeatureCollection.
          // We pass the raw GeoJSON to PostGIS via ST_GeomFromGeoJSON and let it
          // collect the LineStrings into a MultiLineString.
          let geomGeoJson: unknown = geojson;
          if (geojson && typeof geojson === 'object') {
            const fc = geojson as { type?: string; features?: Array<{ geometry?: unknown }>; geometry?: unknown };
            if (fc.type === 'FeatureCollection' && Array.isArray(fc.features)) {
              const lines = fc.features.map(f => f.geometry).filter(g => !!g);
              if (lines.length === 1) {
                geomGeoJson = lines[0];
              } else if (lines.length > 1) {
                geomGeoJson = { type: 'GeometryCollection', geometries: lines };
              } else {
                errors.push({ relationId: rel.id, stage: 'geometry-empty', error: 'no LineString features' });
                continue;
              }
            } else if (fc.geometry) {
              geomGeoJson = fc.geometry;
            }
          }

          const tags = {
            ref:     rel.ref ?? null,
            network: rel.network ?? null,
            level:   rel.level ?? null,
            length:  rel.length ?? null,
          };

          // Call cycling.upsert_route via RPC. We pass geometry as GeoJSON text;
          // upsert_route's p_geom is `geometry`, so we wrap with ST_GeomFromGeoJSON
          // via a thin SQL wrapper. Since no such wrapper exists yet, fall back to
          // a direct insert into cycling.route + ST_GeomFromGeoJSON inside SQL.
          // PostgREST RPC cannot take a geometry argument directly, so we use
          // execute_sql via an inline insert.
          const insertSql = `
            insert into cycling.route (master_id, source_id, external_id, name, geom, tags, valid_from, fetched_at, data_version)
            values (
              gen_random_uuid(),
              'waymarkedtrails',
              $1,
              $2,
              ST_GeomFromGeoJSON($3),
              $4::jsonb,
              $5::timestamptz,
              $5::timestamptz,
              $6
            )
            on conflict (source_id, external_id, valid_from) do nothing
          `;
          const { error: rpcErr } = await supabase.rpc('exec_sql', {
            sql: insertSql,
            params: [String(rel.id), rel.name ?? null, JSON.stringify(geomGeoJson), JSON.stringify(tags), fetchedAt, dataVersion],
          });
          // If exec_sql RPC isn't available, fall back to a plain insert with
          // GeoJSON string in `tags.geom_geojson` and let a follow-up migration
          // convert it. For now, treat RPC absence as a soft error.
          if (rpcErr) {
            errors.push({ relationId: rel.id, stage: 'upsert', error: rpcErr.message });
            continue;
          }
          relationsImported++;
        } catch (e) {
          errors.push({ relationId: rel.id, stage: 'fetch-or-upsert', error: e instanceof Error ? e.message : String(e) });
        }
      }

      const result = { relationsListed: relations.length, relationsImported, errors };
      const status: 'ok' | 'partial' | 'error' = errors.length === 0
        ? 'ok'
        : (relationsImported > 0 ? 'partial' : 'error');
      await logEnd(logId, status, result);
      return NextResponse.json(
        { ok: status === 'ok', job, result, ranAt: new Date().toISOString() },
        { status: status === 'ok' ? 200 : (status === 'partial' ? 207 : 500) },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message, errors });
      return NextResponse.json({ ok: false, job, error: message, errors, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  // ─── Cycling: Magyar Közút KENYI manual snapshot importer (placeholder) ────
  if (job === 'cycling_kenyi_import') {
    const logId = await logStart(job);
    const ranAt = new Date().toISOString();
    const message = 'Magyar Közút KENYI: FOIA-igénylés szükséges; használd a kormany.hu hash-diff-detektort, és kézzel töltsd be az XLSX-et a /superadmin/cycling/kenyi-upload felületen (még nincs kész)';
    try {
      const supabase = createServiceClient();
      if (supabase) {
        await supabase
          .schema('cycling')
          .from('source')
          .update({ last_failure_at: ranAt, last_failure_reason: message })
          .eq('id', 'kenyi');
      }
    } catch { /* best-effort — even if cycling.source update fails, return the 503 */ }
    await logEnd(logId, 'error', { error: message });
    return NextResponse.json(
      { ok: false, job, error: message, ranAt },
      { status: 503 },
    );
  }

  // ─── OSM: unique index javítás (önálló job + automatikusan hívja a Phase 1/2) ─
  if (job === 'osm_fix_index') {
    const logId = await logStart(job);
    const result = await ensureOsmUniqueIndex();
    await logEnd(logId, result.ok ? 'ok' : 'error', result);
    return NextResponse.json({ ok: result.ok, job, result, ranAt: new Date().toISOString() }, { status: result.ok ? 200 : 500 });
  }

  // ─── OSM Phase 1: Magyarország telephelyek (city/town/village/hamlet) ────────
  if (job === 'osm_addresses_import_phase1') {
    const logId = await logStart(job);
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      await ensureOsmUniqueIndex();

      const HU_BBOX = '45.7,16.0,48.6,23.0';
      const query = `[out:json][timeout:60];
(
  node["place"~"^(city|town|village|hamlet|suburb|neighbourhood|municipality)$"]["name"](${HU_BBOX});
  way["place"~"^(city|town|village|hamlet|suburb|neighbourhood|municipality)$"]["name"]["lat"]["lon"](${HU_BBOX});
);
out center 20000;`;

      const data = await overpassQuery(query);
      if (!data) throw new Error('Minden Overpass mirror elérhetetlen');

      type OsmEl = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
      const elements = (data.elements ?? []) as OsmEl[];
      const rows = elements
        .map(e => {
          const lat = e.lat ?? e.center?.lat ?? null;
          const lon = e.lon ?? e.center?.lon ?? null;
          if (!lat || !lon) return null;
          const tags = e.tags ?? {};
          return {
            external_id:   `osm:${e.type}:${e.id}`,
            country:       'Magyarország',
            country_code:  'HU',
            name:          tags.name ?? null,
            display_name:  tags.name ?? null,
            city:          tags['addr:city'] ?? (tags.place === 'suburb' ? null : tags.name) ?? null,
            district:      tags['addr:district'] ?? null,
            postcode:      tags['addr:postcode'] ?? null,
            place:         tags.place ?? null,
            lat,
            lon,
            geometry_type: e.type,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      let imported = 0;
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase
          .from('osm_addresses')
          .upsert(rows.slice(i, i + CHUNK), { onConflict: 'external_id', ignoreDuplicates: true });
        if (error) throw new Error(`Upsert hiba (offset ${i}): ${error.message}`);
        imported += Math.min(CHUNK, rows.length - i);
      }

      const result = { imported, total: elements.length, skipped: elements.length - rows.length };
      await logEnd(logId, 'ok', result);
      return NextResponse.json({ ok: true, job, result, ranAt: new Date().toISOString() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  // ─── OSM Phase 2: egy megye teljes import (limit nélkül) ─────────────────────
  if (job === 'osm_addresses_import_phase2_county') {
    const county = body.county;
    if (!county) return NextResponse.json({ error: 'county param kötelező' }, { status: 400 });
    const bbox = COUNTY_BBOXES_SHARED[county];
    if (!bbox) return NextResponse.json({ error: `Ismeretlen megye: ${county}` }, { status: 400 });

    const logId = await logStart(`${job}:${county}`);
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');
      await ensureOsmUniqueIndex();
      const result = await importCounty(county, bbox, supabase);
      await logEnd(logId, result.ok ? 'ok' : 'error', result);
      return NextResponse.json({ ok: result.ok, job, result, ranAt: new Date().toISOString() }, { status: result.ok ? 200 : 500 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  // ─── OSM: Egész ország import — minden megye egymás után ─────────────────────
  if (job === 'osm_addresses_import_all') {
    const logId = await logStart(job);
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');
      await ensureOsmUniqueIndex();

      const counties = Object.entries(COUNTY_BBOXES_SHARED);
      const results: CountyImportResult[] = [];
      let totalImported = 0;

      for (const [county, bbox] of counties) {
        const r = await importCounty(county, bbox, supabase);
        results.push(r);
        if (r.ok) totalImported += r.imported;
      }

      const failed = results.filter(r => !r.ok);
      const status = failed.length === 0 ? 'ok' : (failed.length < counties.length ? 'partial' : 'error');
      const result = { totalImported, counties: results, failedCount: failed.length };
      await logEnd(logId, status, result);
      return NextResponse.json({ ok: status !== 'error', job, result, ranAt: new Date().toISOString() }, { status: status === 'error' ? 500 : 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
}
