import { NextResponse } from 'next/server';

// OpenAQ v2 — free, no key required for basic usage
// Budapest coordinates — centre of the city
const LAT = 47.4979;
const LON = 19.0402;
const RADIUS_M = 20000; // 20 km search radius

interface CacheEntry<T> { data: T; expires: number; }
let _aqCache: CacheEntry<AirQualityResult> | null = null;

export interface AirQualityResult {
  aqi:               number;           // 0–500 EPA AQI
  aqiCategory:       AQICategory;
  aqiLabel:          string;           // Hungarian
  color:             string;           // hex
  pm25:              number | null;    // µg/m³
  pm10:              number | null;
  no2:               number | null;
  o3:                number | null;
  stationName:       string;
  stationDistanceKm: number;
  fetchedAt:         string;
}

export type AQICategory =
  | 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';

interface AQIInfo { category: AQICategory; label: string; color: string; }

function aqiInfo(aqi: number): AQIInfo {
  if (aqi <= 50)  return { category: 'good',          label: 'Jó',                        color: '#22c55e' };
  if (aqi <= 100) return { category: 'moderate',      label: 'Mérsékelt',                 color: '#eab308' };
  if (aqi <= 150) return { category: 'sensitive',     label: 'Érzékenyek figyeljenek',    color: '#f97316' };
  if (aqi <= 200) return { category: 'unhealthy',     label: 'Egészségtelen',             color: '#ef4444' };
  if (aqi <= 300) return { category: 'very_unhealthy',label: 'Nagyon egészségtelen',      color: '#a855f7' };
  return           { category: 'hazardous',           label: 'Veszélyes',                 color: '#7f1d1d' };
}

// EPA breakpoints for PM2.5 (µg/m³) → AQI
function pm25ToAQI(c: number): number {
  const bp = [
    [0,     12,    0,   50],
    [12.1,  35.4,  51,  100],
    [35.5,  55.4,  101, 150],
    [55.5,  150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 500.4, 301, 500],
  ];
  for (const [cLo, cHi, iLo, iHi] of bp) {
    if (c >= cLo && c <= cHi) {
      return Math.round(((iHi - iLo) / (cHi - cLo)) * (c - cLo) + iLo);
    }
  }
  return c > 500 ? 500 : 0;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toResult(
  aqi: number,
  info: AQIInfo,
  pm25: number | null, pm10: number | null, no2: number | null, o3: number | null,
  stationName: string, stationDistanceKm: number
): AirQualityResult {
  return {
    aqi,
    aqiCategory: info.category,
    aqiLabel:    info.label,
    color:       info.color,
    pm25, pm10, no2, o3,
    stationName, stationDistanceKm,
    fetchedAt: new Date().toISOString(),
  };
}

function getMockResult(): AirQualityResult {
  return toResult(42, aqiInfo(42), 8.4, 18.2, 24.1, 55.8, 'Bp. – Korakőbányai út', 3.1);
}

export async function GET() {
  if (_aqCache && _aqCache.expires > Date.now()) {
    return NextResponse.json(_aqCache.data);
  }

  try {
    const url = `https://api.openaq.org/v2/latest?coordinates=${LAT},${LON}&radius=${RADIUS_M}&limit=10&order_by=distance`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 1800 },
    });

    if (!res.ok) throw new Error(`OpenAQ ${res.status}`);
    const data = await res.json();

    const results: Array<{ location: string; coordinates: { latitude: number; longitude: number }; measurements: Array<{ parameter: string; value: number }> }> = data.results ?? [];

    let pm25: number | null = null;
    let pm10: number | null = null;
    let no2:  number | null = null;
    let o3:   number | null = null;
    let stationName = 'Budapest';
    let stationDistanceKm = 0;

    // Find nearest station with PM2.5 data
    for (const loc of results) {
      const hasPm25 = loc.measurements.find(m => m.parameter === 'pm25' && m.value >= 0);
      if (!hasPm25) continue;

      pm25 = hasPm25.value;
      pm10 = loc.measurements.find(m => m.parameter === 'pm10')?.value ?? null;
      no2  = loc.measurements.find(m => m.parameter === 'no2')?.value ?? null;
      o3   = loc.measurements.find(m => m.parameter === 'o3')?.value ?? null;
      stationName = loc.location ?? 'Budapest';
      stationDistanceKm = haversineKm(LAT, LON, loc.coordinates?.latitude ?? LAT, loc.coordinates?.longitude ?? LON);
      break;
    }

    if (pm25 === null) {
      // No PM2.5 found — try any station with pm10 or no2
      for (const loc of results) {
        const hasPm10 = loc.measurements.find(m => m.parameter === 'pm10' && m.value >= 0);
        if (!hasPm10) continue;
        pm10 = hasPm10.value;
        no2  = loc.measurements.find(m => m.parameter === 'no2')?.value ?? null;
        pm25 = pm10 ? pm10 * 0.6 : null; // rough PM2.5 estimate from PM10
        stationName = loc.location ?? 'Budapest';
        stationDistanceKm = haversineKm(LAT, LON, loc.coordinates?.latitude ?? LAT, loc.coordinates?.longitude ?? LON);
        break;
      }
    }

    if (pm25 === null) throw new Error('No usable measurements found');

    const aqi  = pm25ToAQI(pm25);
    const info = aqiInfo(aqi);
    const cleanName = stationName.replace(/^Budapest\s*[–-]\s*/i, '').slice(0, 28);

    const result = toResult(aqi, info, pm25, pm10, no2, o3, cleanName, parseFloat(stationDistanceKm.toFixed(1)));

    _aqCache = { data: result, expires: Date.now() + 30 * 60 * 1000 };
    return NextResponse.json(result);
  } catch (err) {
    console.error('[air-quality] error:', err);
    const mock = getMockResult();
    return NextResponse.json({ ...mock, _mock: true, _error: String(err) });
  }
}
