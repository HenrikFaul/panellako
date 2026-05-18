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
  stopId:     string;
  stopName:   string;
  departures: Departure[];
  fetchedAt:  string;
  source:     'futar' | 'mock';
}

// ─── Cache ────────────────────────────────────────────────────────────────────
interface CacheEntry { data: DepartureBoard; expires: number; }
const _cache = new Map<string, CacheEntry>();

// BKK Futár OBA-style endpoint (OneBusAway API, documented at opendata.bkk.hu)
// Key 'apaiary-test' is the official public test key from BKK Apiary docs.
// Override with BKKFUTAR_API_KEY env var for production registered key.
const BKK_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const BKK_KEY  = process.env.BKKFUTAR_API_KEY ?? 'apaiary-test';

// GTFS route type → vehicle label
const GTFS_TYPE_MAP: Record<number, Departure['vehicle']> = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
  4: 'FERRY', 5: 'TRAM', 11: 'TROLLEYBUS', 12: 'TRAM',
};

// ─── BKK Futár OBA arrivals-and-departures-for-stop ──────────────────────────
async function fetchFutarDepartures(stopId: string): Promise<DepartureBoard> {
  const params = new URLSearchParams({
    key:               BKK_KEY,
    version:           '3',
    appVersion:        'apiary-1.0',
    stopId,
    onlyDepartures:    'true',
    minutesBefore:     '0',
    minutesAfter:      '60',
    includeReferences: 'trips,routes,stops',
  });

  const url = `${BKK_BASE}/arrivals-and-departures-for-stop.json?${params}`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal:  AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Futár HTTP ${res.status}`);

  const json = await res.json();

  // OBA response envelope: { status, currentTime, data: { entry, references } }
  if (json.status !== 'OK') throw new Error(`Futár status: ${json.status}`);

  const entry = json?.data?.entry;
  const refs  = json?.data?.references ?? {};

  // References: routes and trips keyed by their IDs
  const routeRefs: Record<string, { shortName?: string; type?: number }> =
    refs.routes ?? {};
  const tripRefs: Record<string, { routeId?: string; tripHeadsign?: string }> =
    refs.trips ?? {};
  const stopRefs: Record<string, { name?: string }> =
    refs.stops ?? {};

  const stopName: string = stopRefs[stopId]?.name ?? stopId;

  // currentTime from server is in milliseconds
  const serverNowMs = (json.currentTime as number) ?? Date.now();
  const serverNowSec = serverNowMs / 1000;

  const stopTimes: Array<{
    tripId?:                 string;
    stopHeadsign?:           string;
    departureTime?:          number;   // Unix seconds (scheduled)
    predictedDepartureTime?: number;   // Unix seconds (real-time, if available)
    arrivalTime?:            number;
    predictedArrivalTime?:   number;
  }> = entry?.stopTimes ?? [];

  const departures: Departure[] = stopTimes
    .map(st => {
      // Prefer predicted (real-time) over scheduled
      const depSec =
        st.predictedDepartureTime ??
        st.departureTime          ??
        st.predictedArrivalTime   ??
        st.arrivalTime            ??
        0;

      const minutesAway = Math.round((depSec - serverNowSec) / 60);
      const isRealtime  = st.predictedDepartureTime !== undefined ||
                          st.predictedArrivalTime   !== undefined;

      // Route: look up via trip → routeId → route shortName
      const tripId  = st.tripId ?? '';
      const routeId = tripRefs[tripId]?.routeId ?? '';
      const route   = routeRefs[routeId];

      const vehicle: Departure['vehicle'] =
        GTFS_TYPE_MAP[route?.type ?? 3] ?? 'BUS';

      // Headsign: prefer stop-level override, fall back to trip headsign
      const headsign =
        st.stopHeadsign ??
        tripRefs[tripId]?.tripHeadsign ??
        '';

      return {
        routeRef: route?.shortName ?? (routeId.replace(/^BKK_/, '') || '?'),
        headsign,
        minutesAway,
        realtime: isRealtime,
        vehicle,
      };
    })
    .filter(d => d.minutesAway >= -1)
    .sort((a, b) => a.minutesAway - b.minutesAway)
    .slice(0, 8);

  return {
    stopId, stopName, departures,
    fetchedAt: new Date().toISOString(),
    source:    'futar',
  };
}

// ─── Mock departure board ─────────────────────────────────────────────────────
function getMockDepartures(stopId: string): DepartureBoard {
  return {
    stopId,
    stopName: 'Kerepesi út / Kőér utca',
    departures: [
      { routeRef: '68',  headsign: 'Keleti pu.',        minutesAway: 2,  realtime: true,  vehicle: 'BUS' },
      { routeRef: '37',  headsign: 'Puskás Aréna M',    minutesAway: 5,  realtime: true,  vehicle: 'BUS' },
      { routeRef: '68E', headsign: 'Kelenföld vas.',     minutesAway: 8,  realtime: false, vehicle: 'BUS' },
      { routeRef: '72',  headsign: 'Kőbánya-Kispest M', minutesAway: 12, realtime: true,  vehicle: 'BUS' },
    ],
    fetchedAt: new Date().toISOString(),
    source:    'mock',
  };
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stopId = searchParams.get('stopId') ?? '';

  if (!stopId) {
    return NextResponse.json({ error: 'stopId required' }, { status: 400 });
  }

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
    return NextResponse.json({ ...mock, _mock: true, _error: String(err) });
  }
}
