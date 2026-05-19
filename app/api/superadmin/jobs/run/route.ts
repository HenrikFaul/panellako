import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ─── DB logging ───────────────────────────────────────────────────────────────

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
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

  if (job === 'air_quality_refresh') {
    const logId = await logStart(job);
    const result = await runAirQuality().catch(err => ({ main: { ok: false, status: 500, body: { error: String(err) } }, heatmap: { ok: false, status: 500, body: {} } }));
    const ok = result.main.ok && result.heatmap.ok;
    await logEnd(logId, ok ? 'ok' : 'error', result);
    return NextResponse.json({ ok, job, result, ranAt: new Date().toISOString() }, { status: ok ? 200 : 207 });
  }

  return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
}
