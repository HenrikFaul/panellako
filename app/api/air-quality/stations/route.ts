import { NextResponse } from 'next/server';

const AQICN_TOKEN = process.env.AQICN_API_TOKEN ?? 'demo';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StationValidation {
  schemaOk:        boolean;  // Check 1: numeric, finite, valid range
  inBbox:          boolean;  // Check 2: within Hungary bounding box
  notSwapped:      boolean;  // Check 3: lat/lon not reversed
  nearCity:        boolean;  // Check 4: within 120km of known Hungarian settlement
  nameMatch:       boolean;  // Check 5: station name consistent with coordinates (60km tolerance)
  precision:       boolean;  // Check 6: not suspiciously round/placeholder coordinates
  score:           number;   // 0–6 checks passed
  confidence:      'high' | 'medium' | 'low'; // high=5-6, medium=3-4, low=0-2
  issues:          string[]; // human-readable failure descriptions
  nearestCityName: string;
  nearestCityKm:   number;
}

export interface AQIStation {
  uid:         number;
  aqi:         number | null;
  stationName: string;
  lat:         number;
  lon:         number;
  validation:  StationValidation;
}

// ─── Reference city dataset ───────────────────────────────────────────────────
const REFERENCE_CITIES: { name: string; lat: number; lon: number }[] = [
  // Major Hungarian cities
  { name: 'Budapest',           lat: 47.4979, lon: 19.0402 },
  { name: 'Debrecen',           lat: 47.5316, lon: 21.6273 },
  { name: 'Miskolc',            lat: 48.1035, lon: 20.7784 },
  { name: 'Pécs',               lat: 46.0727, lon: 18.2330 },
  { name: 'Győr',               lat: 47.6875, lon: 17.6504 },
  { name: 'Szeged',             lat: 46.2530, lon: 20.1414 },
  { name: 'Szombathely',        lat: 47.2307, lon: 16.6219 },
  { name: 'Kecskemét',          lat: 46.9067, lon: 19.6917 },
  { name: 'Eger',               lat: 47.9025, lon: 20.3772 },
  { name: 'Nyíregyháza',        lat: 47.9554, lon: 21.7166 },
  { name: 'Székesfehérvár',     lat: 47.1860, lon: 18.4221 },
  { name: 'Veszprém',           lat: 47.0930, lon: 17.9096 },
  { name: 'Tatabánya',          lat: 47.5697, lon: 18.3985 },
  { name: 'Kaposvár',           lat: 46.3597, lon: 17.7963 },
  { name: 'Szolnok',            lat: 47.1760, lon: 20.1800 },
  { name: 'Esztergom',          lat: 47.7947, lon: 18.7414 },
  { name: 'Dunakeszi',          lat: 47.6334, lon: 19.1340 },
  { name: 'Mosonmagyaróvár',    lat: 47.8729, lon: 17.2661 },
  { name: 'Kazincbarcika',      lat: 48.2524, lon: 20.6409 },
  { name: 'Ajka',               lat: 47.1009, lon: 17.5548 },
  { name: 'Hajdúböszörmény',    lat: 47.6713, lon: 21.5074 },
  // Budapest district centers (for Budapest station validation)
  { name: 'Soroksár',           lat: 47.4271, lon: 19.0912 },
  { name: 'Óbuda',              lat: 47.5380, lon: 19.0510 },
  { name: 'Csepel',             lat: 47.4235, lon: 19.0657 },
  { name: 'Budatétény',         lat: 47.4083, lon: 18.9667 },
  { name: 'Pesthidegkút',       lat: 47.5533, lon: 18.9561 },
];

// ─── Haversine distance ───────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Geospatial validation ────────────────────────────────────────────────────
function validateStation(lat: number, lon: number, stationName: string): StationValidation {
  const issues: string[] = [];

  // Check 1 — Schema: numeric, finite, non-zero, within physical range
  const schemaOk =
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat !== 0 &&
    lon !== 0 &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180;
  if (!schemaOk) issues.push('Érvénytelen koordináta-séma (nem véges, nulla vagy határokon kívüli érték)');

  // Check 2 — Hungary bounding box
  const inBbox = lat >= 45.7 && lat <= 48.6 && lon >= 16.1 && lon <= 22.9;
  if (!inBbox) issues.push('A koordináták kívül esnek Magyarország határain');

  // Check 3 — Not swapped: for Hungary lat ≈ 46–49°N, lon ≈ 16–23°E
  // Swapped coordinates would place lat in the 16–23 range and lon in 46–49
  const notSwapped = lat > 40 && lon < 35;
  if (!notSwapped) issues.push('Felcserélt szélességi/hosszúsági fok (lat és lon valószínűleg felcserélve)');

  // Check 4 — Near city: must be within 120km of a reference settlement
  let nearestCityName = '';
  let nearestCityKm = Infinity;
  for (const city of REFERENCE_CITIES) {
    const km = haversineKm(lat, lon, city.lat, city.lon);
    if (km < nearestCityKm) {
      nearestCityKm = km;
      nearestCityName = city.name;
    }
  }
  const nearCity = nearestCityKm < 120;
  if (!nearCity) issues.push(`Legközelebbi ismert helyszín (${nearestCityName}) ${nearestCityKm.toFixed(1)} km-re van (határérték: 120 km)`);

  // Check 5 — Name match: if station name contains a reference city name,
  // verify the coordinates are within 60km of that city.
  // If no city name found in the station name → pass by default.
  let nameMatch = true;
  const nameLower = stationName.toLowerCase();
  for (const city of REFERENCE_CITIES) {
    if (nameLower.includes(city.name.toLowerCase())) {
      const distToNamedCity = haversineKm(lat, lon, city.lat, city.lon);
      if (distToNamedCity >= 60) {
        nameMatch = false;
        issues.push(`Az állomásnév „${city.name}"-t tartalmaz, de a koordináták ${distToNamedCity.toFixed(1)} km-re vannak (határérték: 60 km)`);
      }
      break; // first matching city is authoritative
    }
  }

  // Check 6 — Precision: reject suspiciously round coordinates
  // If BOTH lat AND lon are exact multiples of 0.5°, flag as low-precision placeholder
  const precision = !(lat % 0.5 === 0 && lon % 0.5 === 0);
  if (!precision) issues.push('Gyanúsan kerek koordináták (mindkét érték 0,5 fok többszöröse — valószínűleg helyőrző adat)');

  // Score & confidence
  const checks = [schemaOk, inBbox, notSwapped, nearCity, nameMatch, precision];
  const score = checks.filter(Boolean).length;
  const confidence: 'high' | 'medium' | 'low' =
    score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low';

  return {
    schemaOk,
    inBbox,
    notSwapped,
    nearCity,
    nameMatch,
    precision,
    score,
    confidence,
    issues,
    nearestCityName,
    nearestCityKm: parseFloat(nearestCityKm.toFixed(2)),
  };
}

// ─── Fallback stations — Budapest OLM + major Hungarian cities ───────────────
// Shown on the map when AQICN returns no data (e.g. demo token).
// Negative UIDs signal these are fallback markers (no live AQI value).
// validation is populated at runtime via validateStation(); placeholders here satisfy TS.
const _OLM_RAW: Omit<AQIStation, 'validation'>[] = [
  // Budapest OLM network — coordinates verified against official OLM network maps
  { uid: -1,  stationName: 'Budapest, Gilice tér',         lat: 47.4271, lon: 19.0912, aqi: null }, // dist XXIII, Soroksár (east bank)
  { uid: -2,  stationName: 'Budapest, Széna tér',          lat: 47.5083, lon: 19.0228, aqi: null }, // dist II, Széll Kálmán tér (Buda)
  { uid: -3,  stationName: 'Budapest, Teleki tér',         lat: 47.4940, lon: 19.0730, aqi: null }, // dist VIII, Józsefváros
  { uid: -4,  stationName: 'Budapest, Pesthidegkút',       lat: 47.5533, lon: 18.9561, aqi: null }, // dist II, Buda hills
  { uid: -5,  stationName: 'Budapest, Káposztásmegyer',    lat: 47.5989, lon: 19.0671, aqi: null }, // dist XV, north Pest
  { uid: -6,  stationName: 'Budapest, Kőrakás park',       lat: 47.5380, lon: 19.0510, aqi: null }, // dist III, Óbuda
  { uid: -7,  stationName: 'Budapest, Kosztolányi D. tér', lat: 47.4672, lon: 18.9958, aqi: null }, // dist XI, south Buda
  { uid: -8,  stationName: 'Budapest, Honvéd telep',       lat: 47.4290, lon: 19.0990, aqi: null }, // dist XXI, Csepel
  { uid: -9,  stationName: 'Budapest, Erzsébet tér',       lat: 47.4979, lon: 19.0522, aqi: null }, // dist V, inner Pest
  { uid: -10, stationName: 'Budapest, Gergely utca',       lat: 47.4753, lon: 19.0771, aqi: null }, // dist IX, Ferencváros
  { uid: -11, stationName: 'Budapest, Budatétény',         lat: 47.4083, lon: 18.9667, aqi: null }, // dist XXII, south-west Buda
  { uid: -12, stationName: 'Budapest, Csepel',             lat: 47.4235, lon: 19.0657, aqi: null }, // dist XXI, Csepel island
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

const OLM_FALLBACK: AQIStation[] = _OLM_RAW.map(s => ({
  ...s,
  validation: validateStation(s.lat, s.lon, s.stationName),
}));

// ─── Hungary bounding box helper (used for AQICN pre-filter) ─────────────────
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
              lat,
              lon,
              validation:  validateStation(lat, lon, item.station.name),
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
