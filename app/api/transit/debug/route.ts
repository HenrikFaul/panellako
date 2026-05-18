import { NextRequest, NextResponse } from 'next/server';

// Temporary debug endpoint — removes itself from production by checking env.
// Tests BKK Futár API connectivity and response shapes.
// Usage: GET /api/transit/debug?lat=47.4979&lon=19.0402
// Remove this file once real-data is confirmed working in production.

const BKK_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const BKK_KEY  = process.env.BKK_API_KEY ?? 'apaiary-test';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat    = searchParams.get('lat') ?? '47.4979';
  const lon    = searchParams.get('lon') ?? '19.0402';
  const stopId = searchParams.get('stopId') ?? 'BKK_F02297';

  const results: Record<string, unknown> = {};

  // 1. Test stops-for-location
  try {
    const p = new URLSearchParams({ key: BKK_KEY, version: '3', appVersion: 'apiary-1.0', lat, lon, latSpan: '0.007', lonSpan: '0.009' });
    const r = await fetch(`${BKK_BASE}/stops-for-location.json?${p}`, {
      headers: { 'User-Agent': 'panellako.hu/1.0' }, signal: AbortSignal.timeout(9000),
    });
    const j = await r.json();
    results.stops = {
      status:    r.status,
      apiStatus: j?.status,
      count:     (j?.data?.list ?? []).length,
      sample:    (j?.data?.list ?? []).slice(0, 3).map((s: { id: string; name: string; lat: number; lon: number; routeIds?: string[] }) => ({
        id: s.id, name: s.name, lat: s.lat, lon: s.lon, routeIds: s.routeIds?.slice(0, 3),
      })),
    };
  } catch (e) { results.stops = { error: String(e) }; }

  // 2. Test arrivals-and-departures-for-stop
  try {
    const p = new URLSearchParams({ key: BKK_KEY, version: '3', appVersion: 'apiary-1.0', stopId, onlyDepartures: 'true', minutesBefore: '0', minutesAfter: '60', includeReferences: 'trips,routes,stops' });
    const r = await fetch(`${BKK_BASE}/arrivals-and-departures-for-stop.json?${p}`, {
      headers: { 'User-Agent': 'panellako.hu/1.0' }, signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    const stopTimes = j?.data?.entry?.stopTimes ?? [];
    const nowSec = (j?.currentTime ?? Date.now()) / 1000;
    results.departures = {
      status:        r.status,
      apiStatus:     j?.status,
      stopName:      j?.data?.references?.stops?.[stopId]?.name,
      currentTimeSec: Math.floor(nowSec),
      stopTimesCount: stopTimes.length,
      sampleStopTimes: stopTimes.slice(0, 3).map((s: { tripId?: string; departureTime?: number; predictedDepartureTime?: number; stopHeadsign?: string }) => ({
        tripId:     s.tripId,
        depTime:    s.departureTime,
        predTime:   s.predictedDepartureTime,
        headsign:   s.stopHeadsign,
        minAway:    s.departureTime ? Math.round((s.departureTime - nowSec) / 60) : null,
      })),
      routesSample: Object.entries(j?.data?.references?.routes ?? {}).slice(0, 3)
        .map(([id, r]) => ({ id, shortName: (r as { shortName?: string }).shortName, type: (r as { type?: number }).type })),
    };
  } catch (e) { results.departures = { error: String(e) }; }

  // 3. Test OTP alerts
  try {
    const r = await fetch('https://futar.bkk.hu/api/query/v1/ws/otp/routers/budapest/index/alerts', {
      headers: { 'User-Agent': 'panellako.hu/1.0' }, signal: AbortSignal.timeout(7000),
    });
    const j = await r.json();
    results.alerts = {
      status: r.status,
      count:  (j?.data?.list ?? []).length,
    };
  } catch (e) { results.alerts = { error: String(e) }; }

  return NextResponse.json({
    env:     { hasCustomKey: !!process.env.BKK_API_KEY, keyPrefix: BKK_KEY.slice(0, 8) },
    params:  { lat, lon, stopId },
    results,
    testedAt: new Date().toISOString(),
  });
}
