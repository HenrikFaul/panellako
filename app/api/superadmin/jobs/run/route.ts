import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient } from '@supabase/supabase-js';
import {
  HU_BBOX,
  renderHungaryNdvi,
  downscalePng,
} from '@/lib/ndvi-mosaic';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ─── Geocoder (Nominatim → internal API fallback) ─────────────────────────────
async function geocodeAddress(address: string, appBase: string): Promise<{ lat: number; lon: number } | null> {
  // Try the internal /api/transit/geocode endpoint first (has in-memory cache)
  try {
    const res = await fetch(`${appBase}/api/transit/geocode?address=${encodeURIComponent(address)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const d = await res.json() as { lat?: number; lon?: number; error?: string };
      if (d.lat && d.lon) return { lat: d.lat, lon: d.lon };
    }
  } catch { /* fall through */ }

  // Direct Nominatim fallback
  try {
    const params = new URLSearchParams({ q: address, format: 'json', countrycodes: 'hu', limit: '1', addressdetails: '0' });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'panellako.hu/1.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch { return null; }
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

async function runTransit(action: 'stops-routes' | 'building-stops' | 'alerts') {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const secret = process.env.TRANSIT_SYNC_SECRET || process.env.CRON_SECRET || '';
  const url = `${base.replace(/\/$/, '')}/api/transit/sync?action=${action}${secret ? `&secret=${encodeURIComponent(secret)}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function runAirQuality() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const [main, heatmap] = await Promise.all([
    fetch(`${base.replace(/\/$/, '')}/api/air-quality?lat=47.4979&lon=19.0402`, { cache: 'no-store' }),
    fetch(`${base.replace(/\/$/, '')}/api/air-quality/heatmap`, { cache: 'no-store' }),
  ]);
  return {
    main:    { ok: main.ok,    status: main.status,    body: await main.json().catch(() => ({})) },
    heatmap: { ok: heatmap.ok, status: heatmap.status, body: await heatmap.json().catch(() => ([])) },
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { job } = await request.json() as { job?: string };

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

      // Pre-fetch which stop_ids actually exist in transit_stops.
      // gtfs_derive_refs must ONLY update existing stops — never insert new ones,
      // because new rows would lack the NOT NULL `name` column.
      const allStopIds = Array.from(byStop.keys());
      const CHUNK = 500;
      const existingStopIds = new Set<string>();
      for (let ci = 0; ci < allStopIds.length; ci += CHUNK) {
        const { data: chunk } = await supabase
          .from('transit_stops')
          .select('stop_id')
          .in('stop_id', allStopIds.slice(ci, ci + CHUNK));
        (chunk ?? []).forEach((r: { stop_id: string }) => existingStopIds.add(r.stop_id));
      }

      // Only build rows for stops that exist (skip orphaned stop_route pairs)
      const rows = Array.from(byStop.entries())
        .filter(([stop_id]) => existingStopIds.has(stop_id))
        .map(([stop_id, v]) => ({
          stop_id,
          route_refs: Array.from(v.refs).sort(),
          route_type: v.bestType,
          synced_at:  new Date().toISOString(),
        }));

      const orphanedCount = byStop.size - rows.length;

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
  ): Promise<{ lat: number; lon: number } | null> {
    if (b.lat != null && b.lon != null) return { lat: b.lat, lon: b.lon };
    const geo = await geocodeAddress(b.address, appBase);
    if (!geo) return null;
    await supabase!.from('buildings').update({ lat: geo.lat, lon: geo.lon, geocoded_at: new Date().toISOString() }).eq('id', b.id);
    return geo;
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
      for (const building of toRefresh) {
        const coords = await resolveCoords(building, supabase);
        if (!coords) { geocodeFailed++; continue; }
        try {
          const url = `${appBase}/api/environment/satellite?lat=${coords.lat}&lon=${coords.lon}&buildingId=${building.id}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) refreshed++; else errors++;
        } catch { errors++; }
        await new Promise(r => setTimeout(r, 3000));
      }

      const result = { total: (buildings ?? []).length, skipped: freshIds.size, refreshed, errors, geocodeFailed };
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
      for (const building of toRefresh) {
        const coords = await resolveCoords(building, supabase);
        if (!coords) { geocodeFailed++; continue; }
        try {
          const url = `${appBase}/api/environment/urban?lat=${coords.lat}&lon=${coords.lon}&buildingId=${building.id}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) refreshed++; else errors++;
        } catch { errors++; }
        await new Promise(r => setTimeout(r, 2000));
      }

      const result = { total: (buildings ?? []).length, skipped: freshIds.size, refreshed, errors, geocodeFailed };
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

      for (const building of toRefresh) {
        const coords = await resolveCoords(building, supabase);
        if (!coords) { geocodeFailed++; continue; }
        try {
          const url = `${appBase}/api/environment/green?lat=${coords.lat}&lon=${coords.lon}&buildingId=${building.id}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) refreshed++; else errors++;
        } catch { errors++; }
        await new Promise(r => setTimeout(r, 2000));
      }

      const result = { total: list.length, skipped: freshIds.size, refreshed, errors, geocodeFailed };
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
      for (const building of toRefresh) {
        const coords = await resolveCoords(building, supabase);
        if (!coords) { geocodeFailed++; continue; }
        try {
          const url = `${appBase}/api/environment/urban-atlas?lat=${coords.lat}&lon=${coords.lon}&buildingId=${building.id}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) refreshed++; else errors++;
        } catch { errors++; }
        await new Promise(r => setTimeout(r, 2000));
      }

      const result = { total: (buildings ?? []).length, skipped: freshIds.size, refreshed, errors, geocodeFailed };
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
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      // ── 1. Discover dataset resource IDs via CKAN ─────────────────────────
      const CKAN_BASE = 'https://opendata.budapest.hu/api/3/action';

      async function ckanSearch(query: string): Promise<Array<{ id: string; name: string; resources: Array<{ id: string; format: string; name: string }> }>> {
        const res = await fetch(`${CKAN_BASE}/package_search?q=${encodeURIComponent(query)}&rows=5`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return [];
        const json = await res.json() as { result?: { results?: unknown[] } };
        return (json.result?.results ?? []) as ReturnType<typeof ckanSearch> extends Promise<infer T> ? T : never;
      }

      async function ckanPage(resourceId: string, offset: number, limit = 10000): Promise<{ records: Record<string, unknown>[]; total: number }> {
        const params = new URLSearchParams({ resource_id: resourceId, limit: String(limit), offset: String(offset) });
        const res = await fetch(`${CKAN_BASE}/datastore_search?${params}`, {
          signal: AbortSignal.timeout(60_000),
        });
        if (!res.ok) throw new Error(`CKAN datastore HTTP ${res.status}`);
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
      await logEnd(logId, ok ? 'ok' : 'error', stats);
      return NextResponse.json({ ok, job, result: stats, ranAt: now }, { status: ok ? 200 : 207 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
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
      { key: 'large',                       label: 'Nagy',                                width: 1024, height: 430  },
      { key: 'very_large',                  label: 'Nagyon nagy',                         width: 2048, height: 860  },
      { key: 'very_very_large',             label: 'Nagyon nagyon nagy',                  width: 4096, height: 1720 },
      { key: 'very_very_very_very_large',   label: 'Nagyon nagyon nagyon nagyon nagy',    width: 8192, height: 3440 },
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
    let master;
    try {
      master = await renderHungaryNdvi({ width: masterRes.width, height: masterRes.height });
    } catch (err) {
      const msg = `GIBS render failed: ${err instanceof Error ? err.message : String(err)}`;
      await supabase.from('ndvi_hungary_renders').update({
        status: 'failure', finished_at: new Date().toISOString(),
        duration_ms: Date.now() - t0, error_message: msg,
      }).eq('run_id', runId);
      await logEnd(logId, 'error', { error: msg });
      return NextResponse.json({ ok: false, job, error: msg, runId }, { status: 502 });
    }

    // ── 2. Upload all 4 resolutions (downscaled from the master) ──────────
    const renderedResolutions: Record<string, { width: number; height: number; storage_path: string; url: string; bytes: number; label: string }> = {};
    let totalBytes = 0;
    const uploadErrors: Array<{ key: string; error: string }> = [];
    for (const r of RESOLUTIONS) {
      try {
        const png = r.key === masterRes.key
          ? master.png
          : await downscalePng(master.png, r.width, r.height);
        const storagePath = `${runId}/${r.key}.png`;
        const { error: upErr } = await supabase.storage.from('ndvi-maps').upload(
          storagePath,
          new Blob([png as BlobPart], { type: 'image/png' }),
          { contentType: 'image/png', upsert: true, cacheControl: '604800' },
        );
        if (upErr) throw new Error(`Storage upload: ${upErr.message}`);
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
    };
    await logEnd(logId, ok ? 'ok' : (Object.keys(renderedResolutions).length > 0 ? 'partial' : 'error'), result);
    return NextResponse.json({ ok, job, result, ranAt: new Date().toISOString() }, { status: ok ? 200 : (Object.keys(renderedResolutions).length === 0 ? 500 : 207) });
  }


  return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
}
