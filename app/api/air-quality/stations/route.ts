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

// ─── Budapest OLM fallback stations ──────────────────────────────────────────
// Shown on the map even when AQICN returns no Budapest data (e.g. demo token).
// Negative UIDs signal these are fallback markers (no AQI value).
const OLM_FALLBACK: AQIStation[] = [
  { uid: -1,  stationName: 'Budapest, Gilice tér',         lat: 47.4272, lon: 18.9905, aqi: null },
  { uid: -2,  stationName: 'Budapest, Széna tér',          lat: 47.5111, lon: 18.9982, aqi: null },
  { uid: -3,  stationName: 'Budapest, Teleki tér',         lat: 47.4934, lon: 19.0726, aqi: null },
  { uid: -4,  stationName: 'Budapest, Pesthidegkút',       lat: 47.5533, lon: 18.9561, aqi: null },
  { uid: -5,  stationName: 'Budapest, Káposztásmegyer',    lat: 47.5989, lon: 19.0649, aqi: null },
  { uid: -6,  stationName: 'Budapest, Kőrakás park',       lat: 47.5170, lon: 19.0170, aqi: null },
  { uid: -7,  stationName: 'Budapest, Kosztolányi D. tér', lat: 47.4672, lon: 18.9963, aqi: null },
  { uid: -8,  stationName: 'Budapest, Honvéd telep',       lat: 47.4500, lon: 19.0712, aqi: null },
  { uid: -9,  stationName: 'Budapest, Erzsébet tér',       lat: 47.4987, lon: 19.0527, aqi: null },
  { uid: -10, stationName: 'Budapest, Gergely utca',       lat: 47.4753, lon: 19.0671, aqi: null },
  { uid: -11, stationName: 'Budapest, Budatétény',         lat: 47.4083, lon: 18.9667, aqi: null },
  { uid: -12, stationName: 'Budapest, Csepel',             lat: 47.4235, lon: 19.0657, aqi: null },
];

// ─── Hungary bounding box ─────────────────────────────────────────────────────
function isInHungary(lat: number, lon: number): boolean {
  return lat >= 45.7 && lat <= 48.6 && lon >= 16.1 && lon <= 22.9;
}

// ─── 5-minute server cache ────────────────────────────────────────────────────
interface CacheEntry { data: AQIStation[]; expires: number; }
let _cache: CacheEntry | null = null;

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET() {
  if (_cache && _cache.expires > Date.now()) {
    return NextResponse.json(_cache.data);
  }

  let aqicnStations: AQIStation[] = [];

  try {
    // Use map/bounds — returns stations within Budapest geographic bbox
    const url = `https://api.waqi.info/map/bounds/?latlng=47.35,18.85,47.65,19.25&token=${AQICN_TOKEN}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json() as {
        status: string;
        data: Array<{
          uid:     number;
          aqi:     string | number;
          station: { name: string; geo: [number, number] };
        }>;
      };
      if (json.status === 'ok' && Array.isArray(json.data)) {
        aqicnStations = json.data
          .filter(item => {
            const [lat, lon] = item.station.geo ?? [0, 0];
            return isInHungary(lat, lon);
          })
          .map(item => {
            const [lat, lon] = item.station.geo;
            const raw = item.aqi;
            const aqi = raw === '-' || raw === '' ? null : Number(raw);
            return {
              uid:         item.uid,
              aqi:         isNaN(aqi as number) ? null : (aqi as number),
              stationName: item.station.name,
              lat, lon,
            };
          });
      }
    }
  } catch (err) {
    console.warn('[air-quality/stations] AQICN fetch failed:', err);
  }

  // Merge: keep AQICN stations that are in Hungary, fill in OLM fallbacks for any
  // that weren't returned (identified by proximity — skip OLM if AQICN has a station within ~2km)
  const merged: AQIStation[] = [...aqicnStations];
  for (const olm of OLM_FALLBACK) {
    const nearby = aqicnStations.some(s => Math.hypot(s.lat - olm.lat, s.lon - olm.lon) < 0.02);
    if (!nearby) merged.push(olm);
  }

  _cache = { data: merged, expires: Date.now() + 5 * 60_000 };
  return NextResponse.json(merged);
}
