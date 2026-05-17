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
  const BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/routers/budapest/index/stops';
  const res = await fetch(`${BASE}/${stopId}/stoptimes?numberOfDepartures=8&timeRange=3600`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Futár HTTP ${res.status}`);
  const data = await res.json();

  const stopName: string = data?.data?.entry?.name ?? stopId;
  const now = Math.floor(Date.now() / 1000);

  const list: Array<{
    scheduledArrival?: number;
    realtimeArrival?: number;
    realtime?: boolean;
    route?: {
      shortName?: string;
      longName?: string;
      type?: number;
      mode?: string;
    };
    headsign?: string;
    trip?: { headsign?: string };
  }> = data?.data?.entry?.stopTimes ?? [];

  // GTFS route_type → vehicle label
  const gtfsTypeMap: Record<number, Departure['vehicle']> = {
    0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS', 4: 'FERRY', 5: 'TRAM', 11: 'TROLLEYBUS', 12: 'TRAM',
  };

  const departures: Departure[] = list
    .map(s => {
      const arrivalSec = s.realtimeArrival ?? s.scheduledArrival ?? 0;
      const minutesAway = Math.round((arrivalSec - now) / 60);
      const gtfsType = s.route?.type ?? 3;
      const vehicle: Departure['vehicle'] = gtfsTypeMap[gtfsType] ?? 'BUS';
      return {
        routeRef:    s.route?.shortName ?? '?',
        headsign:    s.trip?.headsign ?? s.headsign ?? '',
        minutesAway,
        realtime:    s.realtime ?? false,
        vehicle,
      };
    })
    .filter(d => d.minutesAway >= -1)   // keep "just left" items
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
