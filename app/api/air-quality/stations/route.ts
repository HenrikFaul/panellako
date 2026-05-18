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

// ─── Fallback stations — Budapest OLM + major Hungarian cities ───────────────
// Shown on the map when AQICN returns no data (e.g. demo token).
// Negative UIDs signal these are fallback markers (no live AQI value).
const OLM_FALLBACK: AQIStation[] = [
  // Budapest OLM network
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
  // Major Hungarian cities
  { uid: -101, stationName: 'Debrecen',           lat: 47.5316, lon: 21.6273, aqi: null },
  { uid: -102, stationName: 'Miskolc',            lat: 48.1035, lon: 20.7784, aqi: null },
  { uid: -103, stationName: 'Pécs',               lat: 46.0727, lon: 18.2330, aqi: null },
  { uid: -104, stationName: 'Győr',               lat: 47.6875, lon: 17.6504, aqi: null },
  { uid: -105, stationName: 'Szeged',             lat: 46.2530, lon: 20.1414, aqi: null },
  { uid: -106, stationName: 'Szombathely',        lat: 47.2307, lon: 16.6219, aqi: null },
  { uid: -107, stationName: 'Kecskemét',          lat: 46.9067, lon: 19.6917, aqi: null },
  { uid: -108, stationName: 'Eger',               lat: 47.9025, lon: 20.3772, aqi: null },
  { uid: -109, stationName: 'Nyíregyháza',        lat: 47.9554, lon: 21.7166, aqi: null },
  { uid: -110, stationName: 'Székesfehérvár',     lat: 47.1860, lon: 18.4221, aqi: null },
  { uid: -111, stationName: 'Veszprém',           lat: 47.0930, lon: 17.9096, aqi: null },
  { uid: -112, stationName: 'Ajka',               lat: 47.1009, lon: 17.5548, aqi: null },
  { uid: -113, stationName: 'Hajdúböszörmény',    lat: 47.6713, lon: 21.5074, aqi: null },
  { uid: -114, stationName: 'Kaposvár',           lat: 46.3597, lon: 17.7963, aqi: null },
  { uid: -115, stationName: 'Szolnok',            lat: 47.1760, lon: 20.1800, aqi: null },
  { uid: -116, stationName: 'Tatabánya',          lat: 47.5697, lon: 18.3985, aqi: null },
  { uid: -117, stationName: 'Esztergom',          lat: 47.7947, lon: 18.7414, aqi: null },
  { uid: -118, stationName: 'Dunakeszi',          lat: 47.6334, lon: 19.1340, aqi: null },
  { uid: -119, stationName: 'Mosonmagyaróvár',    lat: 47.8729, lon: 17.2661, aqi: null },
  { uid: -120, stationName: 'Kazincbarcika',      lat: 48.2524, lon: 20.6409, aqi: null },
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
    // Use map/bounds — returns all stations within Hungary
    const url = `https://api.waqi.info/map/bounds/?latlng=45.7,16.1,48.6,22.9&token=${AQICN_TOKEN}`;
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
