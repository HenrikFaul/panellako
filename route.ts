import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';

export const dynamic = 'force-dynamic';

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
    fetch(`${base.replace(/\/$/, '')}/api/air-quality?lat=47.5278845&lon=19.0705657`, { cache: 'no-store' }),
    fetch(`${base.replace(/\/$/, '')}/api/air-quality/heatmap`, { cache: 'no-store' }),
  ]);

  return {
    main: { ok: main.ok, status: main.status, body: await main.json().catch(() => ({})) },
    heatmap: { ok: heatmap.ok, status: heatmap.status, body: await heatmap.json().catch(() => ([])) },
  };
}

export async function POST(request: NextRequest) {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { job } = await request.json() as { job?: string };

  if (job === 'bkk_full_sync') {
    // Run sequentially to avoid BKK/OBA burst limits and to ensure building-stops sees fresh stop catalog.
    const stopsRoutes = await runTransit('stops-routes');
    const buildingStops = stopsRoutes.ok ? await runTransit('building-stops') : { ok: false, status: 424, body: { error: 'Skipped: stops-routes failed' } };
    const alerts = await runTransit('alerts');
    const ok = stopsRoutes.ok && buildingStops.ok && alerts.ok;
    return NextResponse.json({ ok, job, result: { stopsRoutes, buildingStops, alerts }, ranAt: new Date().toISOString() }, { status: ok ? 200 : 207 });
  }

  if (job === 'bkk_stops_routes') { const result = await runTransit('stops-routes'); return NextResponse.json({ ok: result.ok, job, result, ranAt: new Date().toISOString() }, { status: result.ok ? 200 : 207 }); }
  if (job === 'bkk_building_stops') { const result = await runTransit('building-stops'); return NextResponse.json({ ok: result.ok, job, result, ranAt: new Date().toISOString() }, { status: result.ok ? 200 : 207 }); }
  if (job === 'bkk_alerts') { const result = await runTransit('alerts'); return NextResponse.json({ ok: result.ok, job, result, ranAt: new Date().toISOString() }, { status: result.ok ? 200 : 207 }); }
  if (job === 'air_quality_refresh') { const result = await runAirQuality(); const ok = result.main.ok && result.heatmap.ok; return NextResponse.json({ ok, job, result, ranAt: new Date().toISOString() }, { status: ok ? 200 : 207 }); }

  return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
}
