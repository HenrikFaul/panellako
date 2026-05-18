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

// ─── Budapest bounding box ────────────────────────────────────────────────────
const BP = { latMin: 47.35, lonMin: 18.85, latMax: 47.65, lonMax: 19.25 };
function inBudapest(lat: number, lon: number) {
  return lat >= BP.latMin && lat <= BP.latMax && lon >= BP.lonMin && lon <= BP.lonMax;
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
    // 1. Search for Budapest stations
    const searchUrl  = `https://api.waqi.info/search/?token=${AQICN_TOKEN}&keyword=Budapest`;
    const searchRes  = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
    if (!searchRes.ok) throw new Error(`Search HTTP ${searchRes.status}`);
    const searchJson = await searchRes.json() as {
      status: string;
      data: Array<{ uid: number; station: { geo: [number, number] } }>;
    };
    if (searchJson.status !== 'ok') throw new Error(`Search status: ${searchJson.status}`);

    // 2. Filter to Budapest bounding box, max 12 stations
    const uids = (searchJson.data ?? [])
      .filter(s => { const [la, lo] = s.station.geo ?? [0, 0]; return inBudapest(la, lo); })
      .slice(0, 12)
      .map(s => s.uid);

    // 3. Fetch detailed pollutant data in parallel
    const details = await Promise.all(uids.map(fetchDetail));
    const result  = details.filter((d): d is HeatmapStation => d !== null);

    _cache = { data: result, expires: Date.now() + 15 * 60_000 };
    return NextResponse.json(result);
  } catch (err) {
    console.warn('[air-quality/heatmap] failed:', err);
    return NextResponse.json([], { status: 200 });
  }
}
