import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Departure {
  routeRef:    string;   // '72', 'M3', '1'
  headsign:    string;   // 'Keleti pályaudvar'
  minutesAway: number;   // 0 = boarding, negative = gone
  realtime:    boolean;
  vehicle:     'SUBWAY' | 'TRAM' | 'TROLLEYBUS' | 'BUS' | 'RAIL' | 'FERRY';
}

export interface DepartureBoard {
  stopId:    string;
  stopName:  string;
  departures: Departure[];
  fetchedAt: string;
  source:    'futar' | 'mock';
}

// ─── Cache ────────────────────────────────────────────────────────────────────
interface CacheEntry { data: DepartureBoard; expires: number; }
const _cache = new Map<string, CacheEntry>();

// ─── BKK Futár live arrivals ──────────────────────────────────────────────────
async function fetchFutarDepartures(stopId: string): Promise<DepartureBoard> {
  // Use the BKK-specific arrivals-and-departures endpoint (richer than OTP /stoptimes).
  // Arrival times are seconds-since-midnight relative to serviceDay (a unix day boundary),
  // NOT absolute unix timestamps — must add serviceDay to get the real epoch second.
  const BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/routers/budapest';
  const params = new URLSearchParams({
    stopId,
    numberOfDepartures: '8',
    minutesAfter:       '60',
    onlyDepartures:     'true',
  });
  const res = await fetch(`${BASE}/arrivals-and-departures-for-stop?${params}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`Futár HTTP ${res.status}`);
  const data = await res.json();

  // References contain route/stop metadata keyed by their IDs
  const routeRefs: Record<string, { shortName?: string; type?: number }> =
    data?.data?.references?.routes ?? {};
  const stopRefs: Record<string, { name?: string }> =
    data?.data?.references?.stops ?? {};

  const stopName: string =
    stopRefs[stopId]?.name ?? data?.data?.entry?.stopName ?? stopId;

  const now = Math.floor(Date.now() / 1000);

  const stopTimes: Array<{
    serviceDay?:        number;   // unix timestamp of the local day start
    scheduledArrival?:  number;   // seconds since midnight
    scheduledDeparture?: number;
    realtimeArrival?:   number;
    realtimeDeparture?: number;
    realtime?:          boolean;
    routeId?:           string;
    headsign?:          string;
  }> = data?.data?.entry?.stopTimes ?? [];

  const gtfsTypeMap: Record<number, Departure['vehicle']> = {
    0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
    4: 'FERRY', 5: 'TRAM', 11: 'TROLLEYBUS', 12: 'TRAM',
  };

  const departures: Departure[] = stopTimes
    .map(s => {
      const serviceDay = s.serviceDay ?? 0;
      // Arrival is relative to serviceDay (seconds since midnight) → add to get unix epoch
      const relArrival = s.realtimeArrival ?? s.scheduledArrival
                      ?? s.realtimeDeparture ?? s.scheduledDeparture ?? 0;
      const absArrival = serviceDay + relArrival;
      const minutesAway = Math.round((absArrival - now) / 60);

      const route = routeRefs[s.routeId ?? ''];
      const vehicle: Departure['vehicle'] =
        gtfsTypeMap[route?.type ?? 3] ?? 'BUS';

      return {
        routeRef:    route?.shortName ?? '?',
        headsign:    s.headsign ?? '',
        minutesAway,
        realtime:    s.realtime ?? false,
        vehicle,
      };
    })
    .filter(d => d.minutesAway >= -1)
    .sort((a, b) => a.minutesAway - b.minutesAway)
    .slice(0, 6);

  return { stopId, stopName, departures, fetchedAt: new Date().toISOString(), source: 'futar' };
}

// ─── Mock departure board ─────────────────────────────────────────────────────
function getMockDepartures(stopId: string): DepartureBoard {
  const patterns: Record<string, DepartureBoard> = {
    default: {
      stopId,
      stopName: 'Kerepesi út / Kőér utca',
      departures: [
        { routeRef: '68',  headsign: 'Keleti pu.',         minutesAway: 2,  realtime: true,  vehicle: 'BUS' },
        { routeRef: '37',  headsign: 'Puskás Aréna M',     minutesAway: 5,  realtime: true,  vehicle: 'BUS' },
        { routeRef: '68E', headsign: 'Kelenföld vas.',      minutesAway: 8,  realtime: false, vehicle: 'BUS' },
        { routeRef: '72',  headsign: 'Kőbánya-Kispest M',  minutesAway: 12, realtime: true,  vehicle: 'BUS' },
        { routeRef: '37',  headsign: 'Puskás Aréna M',     minutesAway: 17, realtime: false, vehicle: 'BUS' },
        { routeRef: '68',  headsign: 'Keleti pu.',         minutesAway: 22, realtime: false, vehicle: 'BUS' },
      ],
      fetchedAt: new Date().toISOString(),
      source: 'mock',
    },
  };
  return patterns.default;
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stopId = searchParams.get('stopId') ?? '';

  if (!stopId) {
    return NextResponse.json({ error: 'stopId required' }, { status: 400 });
  }

  // 60-second cache per stop
  const cached = _cache.get(stopId);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const board = await fetchFutarDepartures(stopId);
    _cache.set(stopId, { data: board, expires: Date.now() + 60_000 });
    return NextResponse.json(board);
  } catch (err) {
    console.warn('[transit/departures] Futár failed:', err);
    const mock = getMockDepartures(stopId);
    return NextResponse.json({ ...mock, _mock: true });
  }
}
