import { NextResponse } from 'next/server';

const AQICN_TOKEN = process.env.AQICN_API_TOKEN ?? 'demo';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AQIStation {
  uid:         number;
  aqi:         number | null;
  stationName: string;
  lat:         number;
  lon:         number;
}

// ─── Hungary bounding box ─────────────────────────────────────────────────────
const HU_LAT_MIN = 45.7;
const HU_LAT_MAX = 48.6;
const HU_LON_MIN = 16.1;
const HU_LON_MAX = 22.9;

function isInHungary(lat: number, lon: number): boolean {
  return lat >= HU_LAT_MIN && lat <= HU_LAT_MAX && lon >= HU_LON_MIN && lon <= HU_LON_MAX;
}

// ─── 5-minute server cache ────────────────────────────────────────────────────
interface CacheEntry { data: AQIStation[]; expires: number; }
let _cache: CacheEntry | null = null;

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET() {
  if (_cache && _cache.expires > Date.now()) {
    return NextResponse.json(_cache.data);
  }

  try {
    const url = `https://api.waqi.info/search/?token=${AQICN_TOKEN}&keyword=Budapest`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`AQICN search HTTP ${res.status}`);

    const json = await res.json() as {
      status: string;
      data: Array<{
        uid:     number;
        aqi:     string | number;
        station: {
          name: string;
          geo:  [number, number];
        };
      }>;
    };

    if (json.status !== 'ok') throw new Error(`AQICN search status: ${json.status}`);

    const stations: AQIStation[] = (json.data ?? [])
      .filter(item => {
        const [lat, lon] = item.station.geo ?? [0, 0];
        return isInHungary(lat, lon);
      })
      .map(item => {
        const [lat, lon] = item.station.geo;
        const rawAqi = item.aqi;
        const aqi = rawAqi === '-' || rawAqi === '' ? null : Number(rawAqi);
        return {
          uid:         item.uid,
          aqi:         isNaN(aqi as number) ? null : (aqi as number),
          stationName: item.station.name,
          lat,
          lon,
        };
      });

    _cache = { data: stations, expires: Date.now() + 5 * 60_000 };
    return NextResponse.json(stations);
  } catch (err) {
    console.warn('[air-quality/stations] fetch failed:', err);
    return NextResponse.json([], { status: 200 });
  }
}
