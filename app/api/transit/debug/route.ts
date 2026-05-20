import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// Temporary debug endpoint — removes itself from production by checking env.
// Tests BKK Futár API connectivity and response shapes.
// Usage: GET /api/transit/debug?lat=47.5278845&lon=19.0705657
// Remove this file once real-data is confirmed working in production.

const BKK_BASE    = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const BKK_KEY     = process.env.BKKFUTAR_API_KEY ?? 'apaiary-test';
const APP_ORIGIN  = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://panellako.hu').replace(/\/$/, '');
const BKK_HEADERS = { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0', 'Referer': `${APP_ORIGIN}/`, 'Origin': APP_ORIGIN };

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat    = searchParams.get('lat') ?? '47.5278845';
  const lon    = searchParams.get('lon') ?? '19.0705657';
  const stopId = searchParams.get('stopId') ?? 'BKK_F02297';

  const results: Record<string, unknown> = {};

  // 1. Test stops-for-location
  try {
    const p = new URLSearchParams({ key: BKK_KEY, version: '3', appVersion: 'apiary-1.0', lat, lon, latSpan: '0.007', lonSpan: '0.009' });
    const r = await fetch(`${BKK_BASE}/stops-for-location.json?${p}`, {
      headers: BKK_HEADERS, signal: AbortSignal.timeout(9000),
    });
    const rawBody = await r.text();
    let j: Record<string, unknown> = {};
    try { j = JSON.parse(rawBody); } catch { /* not json */ }
    results.stops = {
      status:    r.status,
      apiStatus: j?.status,
      count:     ((j?.data as {list?: unknown[]})?.list ?? []).length,
      rawBodyPreview: r.ok ? undefined : rawBody.slice(0, 400),
      sample:    ((j?.data as {list?: unknown[]})?.list ?? []).slice(0, 3).map((s) => {
        const stop = s as { id: string; name: string; lat: number; lon: number; routeIds?: string[] };
        return { id: stop.id, name: stop.name, lat: stop.lat, lon: stop.lon, routeIds: stop.routeIds?.slice(0, 3) };
      }),
    };
  } catch (e) { results.stops = { error: String(e) }; }

  // 2. Test arrivals-and-departures-for-stop
  try {
    const p = new URLSearchParams({ key: BKK_KEY, version: '3', appVersion: 'apiary-1.0', stopId, onlyDepartures: 'true', minutesBefore: '0', minutesAfter: '60', includeReferences: 'trips,routes,stops' });
    const r = await fetch(`${BKK_BASE}/arrivals-and-departures-for-stop.json?${p}`, {
      headers: BKK_HEADERS, signal: AbortSignal.timeout(8000),
    });
    const rawBody2 = await r.text();
    let j: Record<string, unknown> = {};
    try { j = JSON.parse(rawBody2); } catch { /* not json */ }
    const entry = (j?.data as {entry?: {stopTimes?: unknown[]}})?.entry;
    const stopTimes = entry?.stopTimes ?? [];
    const nowSec = ((j?.currentTime as number) ?? Date.now()) / 1000;
    results.departures = {
      status:        r.status,
      rawBodyPreview: r.ok ? undefined : rawBody2.slice(0, 400),
      apiStatus:     j?.status,
      stopName:      (j?.data as {references?: {stops?: Record<string, {name?: string}>}})?.references?.stops?.[stopId]?.name,
      currentTimeSec: Math.floor(nowSec),
      stopTimesCount: stopTimes.length,
      sampleStopTimes: (stopTimes as Array<{ tripId?: string; departureTime?: number; predictedDepartureTime?: number; stopHeadsign?: string }>).slice(0, 3).map(s => ({
        tripId:   s.tripId,
        depTime:  s.departureTime,
        predTime: s.predictedDepartureTime,
        headsign: s.stopHeadsign,
        minAway:  s.departureTime ? Math.round((s.departureTime - nowSec) / 60) : null,
      })),
      routesSample: Object.entries(((j?.data as Record<string, unknown>)?.references as Record<string, Record<string, unknown>> | undefined)?.routes ?? {}).slice(0, 3)
        .map(([id, r]) => ({ id, shortName: (r as { shortName?: string }).shortName, type: (r as { type?: number }).type })),
    };
  } catch (e) { results.departures = { error: String(e) }; }

  // 3. Test OTP alerts
  try {
    const r = await fetch('https://futar.bkk.hu/api/query/v1/ws/otp/routers/budapest/index/alerts', {
      headers: BKK_HEADERS, signal: AbortSignal.timeout(7000),
    });
    const j = await r.json();
    results.alerts = {
      status: r.status,
      count:  (j?.data?.list ?? []).length,
    };
  } catch (e) { results.alerts = { error: String(e) }; }

  // 4. Test GTFS-RT go.bkk.hu feeds
  const GTFS_BASE = 'https://go.bkk.hu/api/query/v1/ws/gtfs-rt/full';
  const gtfsHeaders = { ...BKK_HEADERS, 'Accept': '*/*' };

  for (const feed of ['VehiclePositions', 'TripUpdates', 'Alerts'] as const) {
    const key = `gtfsRt${feed}` as const;
    try {
      const r = await fetch(`${GTFS_BASE}/${feed}.txt?key=${BKK_KEY}`, {
        headers: gtfsHeaders, signal: AbortSignal.timeout(10000),
      });
      const body = await r.text();
      const entityCount = (body.match(/^entity \{/gm) ?? []).length;
      results[key] = {
        status:      r.status,
        entityCount,
        bodyBytes:   body.length,
        preview:     r.ok ? body.slice(0, 300) : body.slice(0, 400),
      };
    } catch (e) { results[key] = { error: String(e) }; }
  }

  return NextResponse.json({
    env:      { hasCustomKey: !!process.env.BKKFUTAR_API_KEY, keyPrefix: BKK_KEY.slice(0, 8), origin: APP_ORIGIN },
    headers:  BKK_HEADERS,
    params:   { lat, lon, stopId },
    results,
    testedAt: new Date().toISOString(),
  });
}
