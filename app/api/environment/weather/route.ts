import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export interface EnvWeatherDaily {
  date:       string;
  tempMax:    number;
  tempMin:    number;
  windMax:    number;
  precipSum:  number;
  uvMax:      number;
  sunrise:    string;
  sunset:     string;
  dayLengthH: number;
}

export interface EnvWeatherResult {
  current: {
    temperature:        number;
    humidity:           number;
    windSpeed:          number;
    windDirection:      number;
    windDirectionLabel: string;
    precipProb:         number;
    uvIndex:            number;
    uvLabel:            string;
    uvColor:            string;
    windLabel:          string;
    windAqiImpact:      string;
  };
  daily:     EnvWeatherDaily[];
  fetchedAt: string;
}

const _cache = new Map<string, { data: EnvWeatherResult; expires: number }>();

function windDirLabel(deg: number): string {
  const dirs = ['É', 'ÉK', 'K', 'DK', 'D', 'DNy', 'Ny', 'ÉNy'];
  return dirs[Math.round(deg / 45) % 8];
}

function windLabel(spd: number): string {
  if (spd < 2)  return 'Szélcsend';
  if (spd < 12) return 'Gyenge szél';
  if (spd < 20) return 'Enyhe szél';
  if (spd < 29) return 'Mérsékelt szél';
  if (spd < 39) return 'Élénk szél';
  return 'Erős szél';
}

function uvInfo(uv: number): { label: string; color: string } {
  if (uv < 3)  return { label: 'Alacsony',      color: '#22c55e' };
  if (uv < 6)  return { label: 'Mérsékelt',     color: '#eab308' };
  if (uv < 8)  return { label: 'Magas',         color: '#f97316' };
  if (uv < 11) return { label: 'Nagyon magas',  color: '#ef4444' };
  return            { label: 'Extrém',          color: '#a855f7' };
}

async function fetchWeather(lat: number, lon: number): Promise<EnvWeatherResult> {
  const params = new URLSearchParams({
    latitude:   lat.toString(),
    longitude:  lon.toString(),
    hourly:     'temperature_2m,wind_speed_10m,wind_direction_10m,precipitation_probability,relative_humidity_2m,uv_index',
    daily:      'uv_index_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum,sunrise,sunset',
    timezone:   'Europe/Budapest',
    forecast_days: '7',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Open-Meteo weather HTTP ${res.status}`);
  const json = await res.json() as {
    hourly: {
      time:                     string[];
      temperature_2m:           number[];
      wind_speed_10m:           number[];
      wind_direction_10m:       number[];
      precipitation_probability:number[];
      relative_humidity_2m:     number[];
      uv_index:                 number[];
    };
    daily: {
      time:               string[];
      uv_index_max:       number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      wind_speed_10m_max: number[];
      precipitation_sum:  number[];
      sunrise:            string[];
      sunset:             string[];
    };
  };

  const now = new Date();
  const hIdx = Math.max(0, json.hourly.time.findIndex(t => new Date(t) >= now) - 1);
  const h = json.hourly;
  const d = json.daily;

  const spd    = h.wind_speed_10m[hIdx] ?? 0;
  const uv     = h.uv_index[hIdx] ?? 0;
  const uvInf  = uvInfo(uv);

  const daily: EnvWeatherDaily[] = d.time.map((date, i) => {
    const rise   = new Date(d.sunrise[i]);
    const set    = new Date(d.sunset[i]);
    const dayH   = Math.round((set.getTime() - rise.getTime()) / 3_600_000 * 10) / 10;
    return {
      date,
      tempMax:   Math.round(d.temperature_2m_max[i]),
      tempMin:   Math.round(d.temperature_2m_min[i]),
      windMax:   Math.round(d.wind_speed_10m_max[i]),
      precipSum: Math.round(d.precipitation_sum[i] * 10) / 10,
      uvMax:     Math.round(d.uv_index_max[i] * 10) / 10,
      sunrise:   d.sunrise[i],
      sunset:    d.sunset[i],
      dayLengthH: dayH,
    };
  });

  return {
    current: {
      temperature:        Math.round(h.temperature_2m[hIdx]),
      humidity:           Math.round(h.relative_humidity_2m[hIdx]),
      windSpeed:          Math.round(spd),
      windDirection:      Math.round(h.wind_direction_10m[hIdx]),
      windDirectionLabel: windDirLabel(h.wind_direction_10m[hIdx]),
      precipProb:         Math.round(h.precipitation_probability[hIdx]),
      uvIndex:            Math.round(uv * 10) / 10,
      uvLabel:            uvInf.label,
      uvColor:            uvInf.color,
      windLabel:          windLabel(spd),
      windAqiImpact:      spd < 5 ? 'Szélcsend — szennyezők felhalmozódhatnak' : spd < 15 ? 'Enyhe szél — átlagos szétoszlás' : 'Erős szél — szennyezőket elviszi',
    },
    daily,
    fetchedAt: new Date().toISOString(),
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
    const result = await fetchWeather(lat, lon);
    _cache.set(key, { data: result, expires: Date.now() + 60 * 60_000 });
    return NextResponse.json(result);
  } catch (err) {
    console.warn('[environment/weather] fetch failed:', err);
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
