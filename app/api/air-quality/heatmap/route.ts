import { NextResponse } from 'next/server';

const AQICN_TOKEN = process.env.AQICN_API_TOKEN ?? 'demo';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HeatmapStation {
  uid:         number;
  stationName: string;
  lat:         number;
  lon:         number;
  pm25:        number | null;
  pm10:        number | null;
  no2:         number | null;
  o3:          number | null;
  so2:         number | null;
  co:          number | null;
  no:          number | null;
  nox:         number | null;
}

// ─── 15-minute server cache ───────────────────────────────────────────────────
interface CacheEntry { data: HeatmapStation[]; expires: number; }
let _cache: CacheEntry | null = null;

// ─── Fetch one station's full detail by UID ───────────────────────────────────
async function fetchDetail(uid: number): Promise<HeatmapStation | null> {
  try {
    const url  = `https://api.waqi.info/feed/@${uid}/?token=${AQICN_TOKEN}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json() as { status: string; data: {
      idx:  number;
      city: { name: string; geo: [number, number] };
      iaqi: Record<string, { v: number } | undefined>;
    }};
    if (json.status !== 'ok') return null;
    const d    = json.data;
    const iaqi = d.iaqi ?? {};
    const [lat, lon] = d.city?.geo ?? [0, 0];
    return {
      uid:         d.idx,
      stationName: d.city?.name ?? '',
      lat, lon,
      pm25: iaqi.pm25?.v ?? null,
      pm10: iaqi.pm10?.v ?? null,
      no2:  iaqi.no2?.v  ?? null,
      o3:   iaqi.o3?.v   ?? null,
      so2:  iaqi.so2?.v  ?? null,
      co:   iaqi.co?.v   ?? null,
      no:   iaqi.no?.v   ?? null,
      nox:  iaqi.nox?.v  ?? null,
    };
  } catch {
    return null;
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET() {
  if (_cache && _cache.expires > Date.now()) {
    return NextResponse.json(_cache.data);
  }

  try {
    // Use map/bounds for Hungary-wide bounding box
    const boundsUrl  = `https://api.waqi.info/map/bounds/?latlng=45.7,16.1,48.6,22.9&token=${AQICN_TOKEN}`;
    const boundsRes  = await fetch(boundsUrl, { signal: AbortSignal.timeout(8000) });
    if (!boundsRes.ok) throw new Error(`Bounds HTTP ${boundsRes.status}`);
    const boundsJson = await boundsRes.json() as {
      status: string;
      data: Array<{ uid: number; aqi: string | number; station: { geo: [number, number] } }>;
    };
    if (boundsJson.status !== 'ok') throw new Error(`Bounds status: ${boundsJson.status}`);

    // Take up to 30 station UIDs from within Hungary, prefer those with valid AQI
    const uids = (boundsJson.data ?? [])
      .filter(s => {
        const [lat, lon] = s.station.geo ?? [0, 0];
        return lat >= 45.7 && lat <= 48.6 && lon >= 16.1 && lon <= 22.9;
      })
      .sort((a, b) => {
        const aValid = a.aqi !== '-' && a.aqi !== '' && !isNaN(Number(a.aqi));
        const bValid = b.aqi !== '-' && b.aqi !== '' && !isNaN(Number(b.aqi));
        return (bValid ? 1 : 0) - (aValid ? 1 : 0);
      })
      .slice(0, 30)
      .map(s => s.uid);

    if (uids.length === 0) throw new Error('No stations in Budapest bounds');

    // Fetch detailed pollutant data in parallel
    const details = await Promise.all(uids.map(fetchDetail));
    const result  = details.filter((d): d is HeatmapStation => d !== null);

    _cache = { data: result, expires: Date.now() + 15 * 60_000 };
    return NextResponse.json(result);
  } catch (err) {
    console.warn('[air-quality/heatmap] failed:', err);
    return NextResponse.json([], { status: 200 });
  }
}
