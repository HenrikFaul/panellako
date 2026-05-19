import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface EnvAirDaily {
  date:           string;
  avgPm25:        number;
  maxUv:          number;
  maxGrassPollen: number;
  maxBirchPollen: number;
  maxAlderPollen: number;
}

export interface EnvAirHourly {
  time:    string;
  pm25:    number | null;
  uvIndex: number | null;
}

export type AQICategory =
  | 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';

export interface EnvAirQualityResult {
  current: {
    pm25:         number | null;
    pm10:         number | null;
    no2:          number | null;
    o3:           number | null;
    so2:          number | null;
    co:           number | null;
    dust:         number | null;
    uvIndex:      number | null;
    grassPollen:  number | null;
    birchPollen:  number | null;
    alderPollen:  number | null;
    aqi:          number;
    aqiLabel:     string;
    aqiCategory:  AQICategory;
    aqiColor:     string;
  };
  daily:    EnvAirDaily[];
  hourly24: EnvAirHourly[];
  fetchedAt: string;
  source:    'open-meteo' | 'mock';
}

// ─── AQI helpers ──────────────────────────────────────────────────────────────
interface AQIInfo { category: AQICategory; label: string; color: string; }

function pm25ToAqi(pm25: number): number {
  // US EPA linear interpolation breakpoints
  const bp = [
    [0, 12.0, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 500, 301, 500],
  ];
  for (const [cLo, cHi, iLo, iHi] of bp) {
    if (pm25 >= cLo && pm25 <= cHi) {
      return Math.round(((iHi - iLo) / (cHi - cLo)) * (pm25 - cLo) + iLo);
    }
  }
  return Math.min(500, Math.round(pm25 * 2));
}

function aqiInfo(aqi: number): AQIInfo {
  if (aqi <= 50)  return { category: 'good',           label: 'Jó',                     color: '#22c55e' };
  if (aqi <= 100) return { category: 'moderate',       label: 'Mérsékelt',              color: '#eab308' };
  if (aqi <= 150) return { category: 'sensitive',      label: 'Érzékenyek figyeljenek', color: '#f97316' };
  if (aqi <= 200) return { category: 'unhealthy',      label: 'Egészségtelen',          color: '#ef4444' };
  if (aqi <= 300) return { category: 'very_unhealthy', label: 'Nagyon egészségtelen',   color: '#a855f7' };
  return            { category: 'hazardous',           label: 'Veszélyes',              color: '#7f1d1d' };
}

// ─── In-memory cache (30 min) ─────────────────────────────────────────────────
const _cache = new Map<string, { data: EnvAirQualityResult; expires: number }>();

// ─── Open-Meteo fetch ─────────────────────────────────────────────────────────
async function fetchOpenMeteo(lat: number, lon: number): Promise<EnvAirQualityResult> {
  const params = new URLSearchParams({
    latitude:     lat.toString(),
    longitude:    lon.toString(),
    hourly:       'pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide,dust,uv_index,grass_pollen,birch_pollen,alder_pollen',
    forecast_days:'7',
    timezone:     'Europe/Budapest',
  });

  const res = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
    { signal: AbortSignal.timeout(10000) },
  );
  if (!res.ok) throw new Error(`Open-Meteo AQ HTTP ${res.status}`);
  const json = await res.json() as {
    hourly: {
      time:               string[];
      pm2_5:              (number | null)[];
      pm10:               (number | null)[];
      nitrogen_dioxide:   (number | null)[];
      ozone:              (number | null)[];
      sulphur_dioxide:    (number | null)[];
      carbon_monoxide:    (number | null)[];
      dust:               (number | null)[];
      uv_index:           (number | null)[];
      grass_pollen:       (number | null)[];
      birch_pollen:       (number | null)[];
      alder_pollen:       (number | null)[];
    };
  };

  const h = json.hourly;
  const now = new Date();
  // Find index closest to current hour
  const currentIdx = h.time.findIndex(t => new Date(t) >= now) - 1;
  const ci = Math.max(0, Math.min(currentIdx, h.time.length - 1));

  const pm25Now = h.pm2_5[ci] ?? 0;
  const aqi = pm25ToAqi(pm25Now);
  const info = aqiInfo(aqi);

  // Build daily summaries (group by date)
  const dailyMap = new Map<string, { pm25: number[]; uv: number[]; grass: number[]; birch: number[]; alder: number[] }>();
  for (let i = 0; i < h.time.length; i++) {
    const date = h.time[i].slice(0, 10);
    if (!dailyMap.has(date)) dailyMap.set(date, { pm25: [], uv: [], grass: [], birch: [], alder: [] });
    const d = dailyMap.get(date)!;
    if (h.pm2_5[i] !== null)       d.pm25.push(h.pm2_5[i]!);
    if (h.uv_index[i] !== null)    d.uv.push(h.uv_index[i]!);
    if (h.grass_pollen[i] !== null) d.grass.push(h.grass_pollen[i]!);
    if (h.birch_pollen[i] !== null) d.birch.push(h.birch_pollen[i]!);
    if (h.alder_pollen[i] !== null) d.alder.push(h.alder_pollen[i]!);
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;

  const daily: EnvAirDaily[] = Array.from(dailyMap.entries()).map(([date, d]) => ({
    date,
    avgPm25:        Math.round(avg(d.pm25) * 10) / 10,
    maxUv:          Math.round(max(d.uv) * 10) / 10,
    maxGrassPollen: Math.round(max(d.grass) * 10) / 10,
    maxBirchPollen: Math.round(max(d.birch) * 10) / 10,
    maxAlderPollen: Math.round(max(d.alder) * 10) / 10,
  }));

  // 24h hourly from current index
  const hourly24: EnvAirHourly[] = h.time.slice(ci, ci + 24).map((t, i) => ({
    time:    t,
    pm25:    h.pm2_5[ci + i] ?? null,
    uvIndex: h.uv_index[ci + i] ?? null,
  }));

  return {
    current: {
      pm25:        h.pm2_5[ci],
      pm10:        h.pm10[ci],
      no2:         h.nitrogen_dioxide[ci],
      o3:          h.ozone[ci],
      so2:         h.sulphur_dioxide[ci],
      co:          h.carbon_monoxide[ci] !== null ? (h.carbon_monoxide[ci]! / 1000) : null,  // µg→mg
      dust:        h.dust[ci],
      uvIndex:     h.uv_index[ci],
      grassPollen: h.grass_pollen[ci],
      birchPollen: h.birch_pollen[ci],
      alderPollen: h.alder_pollen[ci],
      aqi,
      aqiLabel:    info.label,
      aqiCategory: info.category,
      aqiColor:    info.color,
    },
    daily,
    hourly24,
    fetchedAt: new Date().toISOString(),
    source:    'open-meteo',
  };
}

function getMock(): EnvAirQualityResult {
  const info = aqiInfo(42);
  return {
    current: {
      pm25: 8.4, pm10: 18.2, no2: 24.1, o3: 55.8, so2: 3.1, co: 0.4,
      dust: 2.1, uvIndex: 4.2, grassPollen: 12.0, birchPollen: 5.0, alderPollen: 2.0,
      aqi: 42, aqiLabel: info.label, aqiCategory: info.category, aqiColor: info.color,
    },
    daily: [],
    hourly24: [],
    fetchedAt: new Date().toISOString(),
    source: 'mock',
  };
}

export async function GET(request: NextRequest) {
  const sp  = request.nextUrl.searchParams;
  const lat = parseFloat(sp.get('lat') ?? '47.4979');
  const lon = parseFloat(sp.get('lon') ?? '19.0402');
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  const cached = _cache.get(key);
  if (cached && cached.expires > Date.now()) return NextResponse.json(cached.data);

  try {
    const result = await fetchOpenMeteo(lat, lon);
    _cache.set(key, { data: result, expires: Date.now() + 30 * 60_000 });
    return NextResponse.json(result);
  } catch (err) {
    console.warn('[environment/air-quality] fetch failed:', err);
    return NextResponse.json({ ...getMock(), _mock: true });
  }
}
