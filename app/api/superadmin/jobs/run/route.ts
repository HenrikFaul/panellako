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
    fetch(`${base.replace(/\/$/, '')}/api/air-quality?lat=47.4979&lon=19.0402`, { cache: 'no-store' }),
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
    const [stopsRoutes, buildingStops, alerts] = await Promise.all([
      runTransit('stops-routes'),
      runTransit('building-stops'),
      runTransit('alerts'),
    ]);
    return NextResponse.json({ ok: true, job, result: { stopsRoutes, buildingStops, alerts }, ranAt: new Date().toISOString() });
  }

  if (job === 'bkk_stops_routes') return NextResponse.json({ ok: true, job, result: await runTransit('stops-routes'), ranAt: new Date().toISOString() });
  if (job === 'bkk_building_stops') return NextResponse.json({ ok: true, job, result: await runTransit('building-stops'), ranAt: new Date().toISOString() });
  if (job === 'bkk_alerts') return NextResponse.json({ ok: true, job, result: await runTransit('alerts'), ranAt: new Date().toISOString() });
  if (job === 'air_quality_refresh') return NextResponse.json({ ok: true, job, result: await runAirQuality(), ranAt: new Date().toISOString() });

  return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
}
