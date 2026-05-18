import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ─── AQICN / World Air Quality Index ─────────────────────────────────────────
const AQICN_TOKEN = process.env.AQICN_API_TOKEN ?? 'demo';
const AQICN_BASE  = 'https://api.waqi.info/feed';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ForecastDay { day: string; avg: number; max: number; min: number; }
export interface AirQualityForecast {
  pm25?: ForecastDay[];
  pm10?: ForecastDay[];
  o3?:  ForecastDay[];
}

export interface AirQualityResult {
  aqi:               number;
  aqiCategory:       AQICategory;
  aqiLabel:          string;
  color:             string;
  pm25:              number | null;
  pm10:              number | null;
  no2:               number | null;
  o3:                number | null;
  so2:               number | null;
  co:                number | null;
  dominantPol:       string;
  stationName:       string;
  stationId:         string;
  measuredAt:        string;
  fetchedAt:         string;
  source:            'aqicn' | 'mock';
  forecast?:         AirQualityForecast;
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

// ─── In-memory cache (10 min) ─────────────────────────────────────────────────
interface CacheEntry { data: AirQualityResult; expires: number; }
const _cache = new Map<string, CacheEntry>();

// ─── Parse and shape the AQICN feed JSON ─────────────────────────────────────
function parseFeedJson(json: unknown): AirQualityResult {
  const j = json as {
    status: string;
    data: {
      aqi:         number;
      idx:         number;
      dominentpol: string;
      city:        { name: string; geo: [number, number] };
      time:        { v: number; iso: string };
      iaqi:        Record<string, { v: number } | undefined>;
      forecast?:   { daily?: Record<string, Array<{ day: string; avg: number; max: number; min: number }>> };
    };
  };
  if (j.status !== 'ok') throw new Error(`AQICN status: ${j.status}`);

  const d = j.data;
  const iaqi       = d.iaqi ?? {};
  const stationId  = String(d.idx);
  const measuredAt = new Date(d.time.v * 1000).toISOString();
  const info       = aqiInfo(d.aqi);

  const daily = d.forecast?.daily;
  const forecast: AirQualityForecast | undefined = daily ? {
    pm25: daily.pm25,
    pm10: daily.pm10,
    o3:   daily.o3,
  } : undefined;

  return {
    aqi:          d.aqi,
    aqiCategory:  info.category,
    aqiLabel:     info.label,
    color:        info.color,
    pm25:         iaqi.pm25?.v ?? null,
    pm10:         iaqi.pm10?.v ?? null,
    no2:          iaqi.no2?.v  ?? null,
    o3:           iaqi.o3?.v   ?? null,
    so2:          iaqi.so2?.v  ?? null,
    co:           iaqi.co?.v   ?? null,
    dominantPol:  d.dominentpol ?? '',
    stationName:  d.city.name,
    stationId,
    measuredAt,
    fetchedAt:    new Date().toISOString(),
    source:       'aqicn',
    forecast,
  };
}

// ─── AQICN fetch — finds nearest Budapest station first ──────────────────────
async function fetchAQICN(lat: number, lon: number): Promise<AirQualityResult> {
  // Try Budapest bounding-box lookup first (avoids geo:lat;lon returning wrong city with demo token)
  let feedUrl = `${AQICN_BASE}/geo:${lat};${lon}/?token=${AQICN_TOKEN}`;
  try {
    const boundsRes = await fetch(
      `https://api.waqi.info/map/bounds/?latlng=47.35,18.85,47.65,19.25&token=${AQICN_TOKEN}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (boundsRes.ok) {
      const boundsJson = await boundsRes.json() as {
        status: string;
        data: Array<{ uid: number; aqi: string; station: { geo: [number, number] } }>;
      };
      if (boundsJson.status === 'ok' && boundsJson.data?.length > 0) {
        const nearest = boundsJson.data
          .filter(s => s.aqi !== '-' && s.aqi !== '' && !isNaN(Number(s.aqi)))
          .sort((a, b) =>
            Math.hypot(a.station.geo[0] - lat, a.station.geo[1] - lon) -
            Math.hypot(b.station.geo[0] - lat, b.station.geo[1] - lon)
          )[0];
        if (nearest) feedUrl = `${AQICN_BASE}/@${nearest.uid}/?token=${AQICN_TOKEN}`;
      }
    }
  } catch { /* fall through to geo URL */ }

  const res = await fetch(feedUrl, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error(`AQICN HTTP ${res.status}`);
  return parseFeedJson(await res.json());
}

// ─── DB persistence ───────────────────────────────────────────────────────────
async function persistIfNew(result: AirQualityResult): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('air_quality_readings')
      .upsert(
        {
          station_id:   result.stationId,
          station_name: result.stationName,
          measured_at:  result.measuredAt,
          aqi:          result.aqi,
          dominant_pol: result.dominantPol,
          pm25:         result.pm25,
          pm10:         result.pm10,
          no2:          result.no2,
          o3:           result.o3,
          so2:          result.so2,
          co:           result.co,
        },
        { onConflict: 'station_id,measured_at', ignoreDuplicates: true }
      );
    if (error) console.warn('[air-quality] DB upsert error:', error.message);
  } catch (err) {
    console.warn('[air-quality] DB persist failed (non-fatal):', err);
  }
}

// ─── Mock fallback ─────────────────────────────────────────────────────────────
function getMock(): AirQualityResult {
  const info = aqiInfo(42);
  return {
    aqi: 42, aqiCategory: info.category, aqiLabel: info.label, color: info.color,
    pm25: 8.4, pm10: 18.2, no2: 24.1, o3: 55.8, so2: 3.1, co: 0.4,
    dominantPol: 'pm25',
    stationName: 'Budapest (offline)', stationId: 'mock',
    measuredAt:  new Date().toISOString(),
    fetchedAt:   new Date().toISOString(),
    source:      'mock',
  };
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const sp  = request.nextUrl.searchParams;
  const lat = parseFloat(sp.get('lat') ?? '47.4979');
  const lon = parseFloat(sp.get('lon') ?? '19.0402');
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;

  const cached = _cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const result = await fetchAQICN(lat, lon);
    _cache.set(cacheKey, { data: result, expires: Date.now() + 10 * 60_000 });
    void persistIfNew(result);
    return NextResponse.json(result);
  } catch (err) {
    console.warn('[air-quality] AQICN fetch failed:', err);
    return NextResponse.json({ ...getMock(), _mock: true, _error: String(err) });
  }
}
