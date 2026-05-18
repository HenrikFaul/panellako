import { NextResponse } from 'next/server';

// Open-Meteo Air Quality API — free, no API key, same provider as weather
// Uses CAMS EU global model for Central Europe
const LAT = 47.4979;
const LON = 19.0402;

const AQ_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

interface CacheEntry<T> { data: T; expires: number; }
let _aqCache: CacheEntry<AirQualityResult> | null = null;

export interface AirQualityResult {
  aqi:               number;
  aqiCategory:       AQICategory;
  aqiLabel:          string;
  color:             string;
  pm25:              number | null;
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
  if (aqi <= 50)  return { category: 'good',           label: 'Jó',                       color: '#22c55e' };
  if (aqi <= 100) return { category: 'moderate',       label: 'Mérsékelt',                color: '#eab308' };
  if (aqi <= 150) return { category: 'sensitive',      label: 'Érzékenyek figyeljenek',   color: '#f97316' };
  if (aqi <= 200) return { category: 'unhealthy',      label: 'Egészségtelen',            color: '#ef4444' };
  if (aqi <= 300) return { category: 'very_unhealthy', label: 'Nagyon egészségtelen',     color: '#a855f7' };
  return           { category: 'hazardous',            label: 'Veszélyes',                color: '#7f1d1d' };
}

// EPA PM2.5 breakpoints → AQI
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
    if (c >= cLo && c <= cHi)
      return Math.round(((iHi - iLo) / (cHi - cLo)) * (c - cLo) + iLo);
  }
  return c > 500 ? 500 : 0;
}

async function fetchAirQuality(): Promise<AirQualityResult> {
  const params = new URLSearchParams({
    latitude:  String(LAT),
    longitude: String(LON),
    current:   'pm10,pm2_5,nitrogen_dioxide,ozone,european_aqi',
    timezone:  'Europe/Budapest',
  });

  const res = await fetch(`${AQ_BASE}?${params}`, {
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`Open-Meteo AQ ${res.status}`);
  const data = await res.json();

  const cur = data.current as {
    pm2_5:             number | null;
    pm10:              number | null;
    nitrogen_dioxide:  number | null;
    ozone:             number | null;
    european_aqi:      number | null;
  };

  const pm25 = cur.pm2_5 ?? null;
  const pm10 = cur.pm10 ?? null;
  const no2  = cur.nitrogen_dioxide ?? null;
  const o3   = cur.ozone ?? null;

  // Use European AQI directly when available, otherwise compute from PM2.5
  const europeanAqi = cur.european_aqi ?? null;
  const aqi = europeanAqi !== null ? europeanAqi : (pm25 !== null ? pm25ToAQI(pm25) : 0);
  const info = aqiInfo(aqi);

  return {
    aqi,
    aqiCategory:       info.category,
    aqiLabel:          info.label,
    color:             info.color,
    pm25,
    pm10,
    no2,
    o3,
    stationName:       'Budapest (CAMS modell)',
    stationDistanceKm: 0,
    fetchedAt:         new Date().toISOString(),
  };
}

function getMockResult(): AirQualityResult {
  const info = aqiInfo(42);
  return {
    aqi: 42, aqiCategory: info.category, aqiLabel: info.label, color: info.color,
    pm25: 8.4, pm10: 18.2, no2: 24.1, o3: 55.8,
    stationName: 'Budapest (offline)', stationDistanceKm: 0,
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET() {
  if (_aqCache && _aqCache.expires > Date.now()) {
    return NextResponse.json(_aqCache.data);
  }
  try {
    const result = await fetchAirQuality();
    _aqCache = { data: result, expires: Date.now() + 30 * 60 * 1000 };
    return NextResponse.json(result);
  } catch (err) {
    console.error('[air-quality] Open-Meteo error:', err);
    return NextResponse.json({ ...getMockResult(), _mock: true, _error: String(err) });
  }
}
