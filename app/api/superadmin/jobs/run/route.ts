import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

      // Batch upsert updated stop rows
      const BATCH = 500;
      const rows = Array.from(byStop.entries()).map(([stop_id, v]) => ({
        stop_id,
        route_refs: Array.from(v.refs).sort(),
        route_type: v.bestType,
        synced_at:  new Date().toISOString(),
      }));

      let updated = 0;
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase
          .from('transit_stops')
          .upsert(rows.slice(i, i + BATCH), { onConflict: 'stop_id' });
        if (error) throw new Error(error.message);
        updated += Math.min(BATCH, rows.length - i);
      }

      const result = { updated, stopsWithRoutes: byStop.size, pairsProcessed: pairs?.length ?? 0 };
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

  if (job === 'env_refresh_green') {
    const logId = await logStart(job);
    try {
      const supabase = createServiceClient();
      if (!supabase) throw new Error('No Supabase client');

      // Fetch all buildings that have coordinates
      const { data: buildings, error: bErr } = await supabase
        .from('buildings')
        .select('id, latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (bErr) throw new Error(bErr.message);
      const list = (buildings ?? []) as Array<{ id: string; latitude: number; longitude: number }>;

      // Find buildings whose cache is older than 7 days or missing
      const { data: cached } = await supabase
        .from('building_green_cache')
        .select('building_id, computed_at')
        .gt('computed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const freshIds = new Set((cached ?? []).map((r: { building_id: string }) => r.building_id));
      const toRefresh = list.filter(b => !freshIds.has(b.id));

      const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      let refreshed = 0;
      let errors = 0;

      for (const building of toRefresh) {
        try {
          const url = `${base.replace(/\/$/, '')}/api/environment/green?lat=${building.latitude}&lon=${building.longitude}&buildingId=${building.id}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) refreshed++; else errors++;
        } catch { errors++; }
        // 2 s delay between Overpass calls to be a good citizen
        await new Promise(r => setTimeout(r, 2000));
      }

      const result = { total: list.length, skipped: freshIds.size, refreshed, errors };
      await logEnd(logId, errors === 0 ? 'ok' : 'partial', result);
      return NextResponse.json({ ok: errors === 0, job, result, ranAt: new Date().toISOString() }, { status: errors === 0 ? 200 : 207 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logEnd(logId, 'error', { error: message });
      return NextResponse.json({ ok: false, job, error: message, ranAt: new Date().toISOString() }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
}
