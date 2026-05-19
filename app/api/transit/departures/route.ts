import { NextRequest, NextResponse } from 'next/server';
import { parseTripUpdates, guessVehicleType, type GtfsVehicleType } from '@/lib/gtfs-rt-parser';
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────
export type VehicleLabel = 'SUBWAY' | 'TRAM' | 'TROLLEYBUS' | 'BUS' | 'RAIL' | 'FERRY';

export interface Departure {
  routeRef:    string;
  headsign:    string;
  minutesAway: number;
  realtime:    boolean;
  vehicle:     VehicleLabel;
  tripId:      string;
  accessible:  boolean;
  hasAlert:    boolean;
}

export interface DepartureBoard {
  stopId:     string;
  stopName:   string;
  departures: Departure[];
  fetchedAt:  string;
  source:     'gtfs-rt' | 'futar' | 'mock';
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GTFS_RT_BASE = 'https://go.bkk.hu/api/query/v1/ws/gtfs-rt/full';
const OBA_BASE     = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const APP_ORIGIN   = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://panellako.hu').replace(/\/$/, '');
const BKK_KEY      = process.env.BKKFUTAR_API_KEY ?? '';

const BKK_HEADERS = {
  'Accept':     '*/*',
  'User-Agent': 'panellako.hu/1.0',
  'Referer':    `${APP_ORIGIN}/`,
  'Origin':     APP_ORIGIN,
};

const GTFS_TYPE_MAP: Record<number, VehicleLabel> = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
  4: 'FERRY', 5: 'TRAM', 11: 'TROLLEYBUS', 12: 'TRAM',
};

function toVehicleLabel(g: GtfsVehicleType): VehicleLabel {
  const m: Record<string, VehicleLabel> = {
    SUBWAY: 'SUBWAY', TRAM: 'TRAM', TROLLEYBUS: 'TROLLEYBUS',
    BUS: 'BUS', RAIL: 'RAIL', FERRY: 'FERRY',
  };
  return m[g] ?? 'BUS';
}

// ─── GTFS-RT TripUpdates global cache (15 s) ─────────────────────────────────
// Indexed by stop_id for O(1) lookup after initial parse.
interface StopDep { tripId: string; routeRef: string; depTime: number; }
interface TuCache { index: Map<string, StopDep[]>; expires: number; }
let _tuCache: TuCache | null = null;

async function refreshTuCache(): Promise<TuCache> {
  const url = `${GTFS_RT_BASE}/TripUpdates.txt?key=${BKK_KEY}`;
  const res = await fetch(url, { headers: BKK_HEADERS, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GTFS-RT TripUpdates HTTP ${res.status}: ${body.slice(0, 150)}`);
  }
  const text = await res.text();
  const updates = parseTripUpdates(text);

  const index = new Map<string, StopDep[]>();
  for (const upd of updates) {
    for (const sd of upd.stopDelays) {
      if (!sd.stopId || sd.departureTime === null) continue;
      // Index under both the exact stop_id and the BKK_-toggled variant
      const altId = sd.stopId.startsWith('BKK_')
        ? sd.stopId.slice(4)
        : `BKK_${sd.stopId}`;
      const entry: StopDep = { tripId: upd.tripId, routeRef: upd.routeRef, depTime: sd.departureTime };
      for (const k of [sd.stopId, altId]) {
        if (!index.has(k)) index.set(k, []);
        index.get(k)!.push(entry);
      }
    }
  }
  return { index, expires: Date.now() + 15_000 };
}

// ─── Per-stop cache ───────────────────────────────────────────────────────────
interface BoardCache { data: DepartureBoard; expires: number; }
const _boardCache = new Map<string, BoardCache>();

// ─── OBA JSON fallback ────────────────────────────────────────────────────────
async function fetchObaBoard(stopId: string): Promise<DepartureBoard> {
  // Note: 'alerts' removed from includeReferences — not a valid OBA reference type
  const params = new URLSearchParams({
    key:               BKK_KEY || 'apaiary-test',
    version:           '3',
    appVersion:        'apiary-1.0',
    stopId,
    onlyDepartures:    'true',
    minutesBefore:     '0',
    minutesAfter:      '60',
    includeReferences: 'trips,routes,stops',
  });

  const res = await fetch(`${OBA_BASE}/arrivals-and-departures-for-stop.json?${params}`, {
    headers: { ...BKK_HEADERS, 'Accept': 'application/json' },
    signal:  AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OBA HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json.status !== 'OK') {
    throw new Error(`OBA status=${json.status}: ${JSON.stringify(json).slice(0, 200)}`);
  }

  const entry = json?.data?.entry;
  const refs  = json?.data?.references ?? {};
  const routeMap: Record<string, { shortName?: string; type?: number }> = refs.routes ?? {};
  const tripMap:  Record<string, { routeId?: string; tripHeadsign?: string; wheelchairAccessible?: number }> = refs.trips ?? {};
  const stopMap:  Record<string, { name?: string }> = refs.stops ?? {};
  const stopName  = stopMap[stopId]?.name ?? stopId;

  // BKK currentTime is in milliseconds
  const serverNowSec = ((json.currentTime as number) ?? Date.now()) / 1000;

  type ST = {
    tripId?: string; stopHeadsign?: string;
    departureTime?: number; predictedDepartureTime?: number;
    arrivalTime?: number; predictedArrivalTime?: number;
  };
  const stopTimes: ST[] = entry?.stopTimes ?? [];

  const departures: Departure[] = stopTimes
    .map(st => {
      const depSec = st.predictedDepartureTime ?? st.departureTime
                  ?? st.predictedArrivalTime   ?? st.arrivalTime ?? 0;
      const tripId  = st.tripId ?? '';
      const routeId = tripMap[tripId]?.routeId ?? '';
      const route   = routeMap[routeId];
      return {
        routeRef:    route?.shortName ?? (routeId.replace(/^BKK_/, '') || '?'),
        headsign:    st.stopHeadsign ?? tripMap[tripId]?.tripHeadsign ?? '',
        minutesAway: Math.round((depSec - serverNowSec) / 60),
        realtime:    st.predictedDepartureTime !== undefined || st.predictedArrivalTime !== undefined,
        vehicle:     GTFS_TYPE_MAP[route?.type ?? 3] ?? 'BUS',
        tripId,
        accessible:  (tripMap[tripId]?.wheelchairAccessible ?? 0) === 1,
        hasAlert:    false,
      };
    })
    .filter(d => d.minutesAway >= -1)
    .sort((a, b) => a.minutesAway - b.minutesAway)
    .slice(0, 8);

  return { stopId, stopName, departures, fetchedAt: new Date().toISOString(), source: 'futar' };
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
function getMockDepartures(stopId: string): DepartureBoard {
  return {
    stopId,
    stopName: 'Kerepesi út / Kőér utca',
    departures: [
      { routeRef: '68',  headsign: 'Keleti pu.',        minutesAway: 2,  realtime: true,  vehicle: 'BUS', tripId: '', accessible: true,  hasAlert: false },
      { routeRef: '37',  headsign: 'Puskás Aréna M',    minutesAway: 5,  realtime: true,  vehicle: 'BUS', tripId: '', accessible: false, hasAlert: false },
      { routeRef: '68E', headsign: 'Kelenföld vas.',     minutesAway: 8,  realtime: false, vehicle: 'BUS', tripId: '', accessible: true,  hasAlert: false },
      { routeRef: '72',  headsign: 'Kőbánya-Kispest M', minutesAway: 12, realtime: true,  vehicle: 'BUS', tripId: '', accessible: false, hasAlert: false },
    ],
    fetchedAt: new Date().toISOString(),
    source:    'mock',
  };
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawStopId = searchParams.get('stopId') ?? '';

  if (!rawStopId) return NextResponse.json({ error: 'stopId required' }, { status: 400 });

  // Normalize: GTFS stops.txt uses bare IDs like "F00048"; Futár API requires "BKK_F00048".
  // If the ID starts with a letter+digit (BKK pattern) but lacks the prefix, add it.
  const stopId = !rawStopId.startsWith('BKK_') && /^[A-Z]\d/.test(rawStopId)
    ? `BKK_${rawStopId}`
    : rawStopId;

  // Non-BKK IDs (e.g. raw Overpass node numbers like "1234567890") can't be queried
  if (!stopId.startsWith('BKK_')) {
    return NextResponse.json({
      ...getMockDepartures(stopId), _mock: true,
      _error: `Megálló ID nem BKK formátum: "${rawStopId}" — a közeli megállók adatai nem töltöttek be rendesen.`,
    });
  }

  // Per-stop cache hit
  const bc = _boardCache.get(stopId);
  if (bc && bc.expires > Date.now()) return NextResponse.json(bc.data);

  // ── Primary: GTFS-RT TripUpdates (go.bkk.hu) ─────────────────────────────
  if (!_tuCache || _tuCache.expires <= Date.now()) {
    try { _tuCache = await refreshTuCache(); }
    catch (err) { console.warn('[transit/departures] GTFS-RT TripUpdates failed:', err); }
  }

  if (_tuCache) {
    const deps = _tuCache.index.get(stopId) ?? [];
    const nowSec = Date.now() / 1000;
    const departures: Departure[] = deps
      .filter(d => d.depTime > nowSec - 60)
      .map(d => ({
        routeRef:    d.routeRef || '?',
        headsign:    '',
        minutesAway: Math.round((d.depTime - nowSec) / 60),
        realtime:    true,
        vehicle:     toVehicleLabel(guessVehicleType(d.routeRef)),
        tripId:      d.tripId,
        accessible:  false,
        hasAlert:    false,
      }))
      .filter(d => d.minutesAway >= -1)
      .sort((a, b) => a.minutesAway - b.minutesAway)
      .slice(0, 8);

    if (departures.length > 0) {
      const board: DepartureBoard = {
        stopId, stopName: '', departures,
        fetchedAt: new Date().toISOString(), source: 'gtfs-rt',
      };
      _boardCache.set(stopId, { data: board, expires: Date.now() + 15_000 });
      return NextResponse.json(board);
    }
    // Fall through if GTFS-RT has no trips for this stop yet
  }

  // ── Fallback: BKK OBA (futar.bkk.hu) ─────────────────────────────────────
  try {
    const board = await fetchObaBoard(stopId);
    _boardCache.set(stopId, { data: board, expires: Date.now() + 60_000 });
    return NextResponse.json(board);
  } catch (err) {
    console.warn('[transit/departures] OBA failed:', err);
    return NextResponse.json({
      ...getMockDepartures(stopId), _mock: true, _error: String(err),
    });
  }
}
