import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SatelliteData {
  ndvi:        number | null;
  ndviLabel:   string;
  ndviColor:   string;
  ndviPct:     number;       // 0-100 for gauge display
  sceneDate:   string | null;
  cloudCover:  number | null;
  satellite:   string;
  sceneId:     string | null;
  source:      'sentinel2' | 'cache' | 'unavailable';
  computedAt:  string;
  // Area statistics (500m bbox)
  areaNdvi:    number | null;   // NDVI from mean(B08)/mean(B04) over 500m bbox
  vegPct:      number | null;   // estimated % of pixels with NDVI > 0 (vegetated)
}

// ─── NDVI classification ──────────────────────────────────────────────────────

function ndviInfo(ndvi: number): { label: string; color: string; pct: number } {
  // Map NDVI (-1..1) → 0..100 for gauge. We treat -0.2..0.8 as the useful range.
  const pct = Math.round(Math.max(0, Math.min(100, ((ndvi + 0.2) / 1.0) * 100)));
  if (ndvi < 0)    return { label: 'Víz / Beépített', color: '#60a5fa', pct };
  if (ndvi < 0.10) return { label: 'Kopár felszín',   color: '#d97706', pct };
  if (ndvi < 0.20) return { label: 'Ritka növényzet', color: '#ca8a04', pct };
  if (ndvi < 0.35) return { label: 'Mérsékelt zöld',  color: '#84cc16', pct };
  if (ndvi < 0.50) return { label: 'Jó növényzet',    color: '#22c55e', pct };
  return               { label: 'Sűrű növényzet',     color: '#16a34a', pct };
}

// ─── Supabase helper ──────────────────────────────────────────────────────────

function makeSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim();
  const key  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Element84 STAC search ───────────────────────────────────────────────────

interface StacFeature {
  id: string;
  properties: { datetime: string; 'eo:cloud_cover'?: number };
  assets: Record<string, { href: string; type?: string }>;
}

async function searchSentinel2(lat: number, lon: number): Promise<StacFeature | null> {
  const now     = new Date();
  const yearAgo = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
  const body = JSON.stringify({
    collections: ['sentinel-2-l2a'],
    intersects:  { type: 'Point', coordinates: [lon, lat] },
    datetime:    `${yearAgo.toISOString().slice(0, 10)}/${now.toISOString().slice(0, 10)}`,
    query:       { 'eo:cloud_cover': { lt: 25 } },
    sortby:      [{ field: 'datetime', direction: 'desc' }],
    limit:       5,
  });

  const res = await fetch('https://earth-search.aws.element84.com/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;

  const data = await res.json() as { features?: StacFeature[] };
  return data.features?.[0] ?? null;
}

// ─── Titiler COG point query ──────────────────────────────────────────────────

async function cogPoint(lon: number, lat: number, href: string): Promise<number | null> {
  const url = `https://titiler.xyz/cog/point/${lon},${lat}?url=${encodeURIComponent(href)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const data = await res.json() as { values?: number[] };
  return data.values?.[0] ?? null;
}

// ─── Titiler COG statistics over a bbox ──────────────────────────────────────

interface CogBandStats {
  mean:          number;
  std:           number;
  percentile_2:  number;
  percentile_98: number;
  histogram:     [number[], number[]] | null;
}

async function cogStats(href: string, bbox: string): Promise<CogBandStats | null> {
  const url = `https://titiler.xyz/cog/statistics?url=${encodeURIComponent(href)}&bbox=${bbox}&max_size=64&nodata=0&histogram_bins=20`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) return null;
    const data = await res.json() as {
      b1?: {
        mean: number; std: number;
        percentile_2: number; percentile_98: number;
        histogram?: [number[], number[]];
      };
    };
    if (!data.b1) return null;
    return {
      mean:          data.b1.mean,
      std:           data.b1.std,
      percentile_2:  data.b1.percentile_2,
      percentile_98: data.b1.percentile_98,
      histogram:     data.b1.histogram ?? null,
    };
  } catch { return null; }
}

// Convert Sentinel-2 area stats → vegetation coverage %
function estimateVegPct(nirStats: CogBandStats, redStats: CogBandStats): number {
  // Use NIR histogram: Sentinel-2 L2A surface reflectance × 10000
  // Dense vegetation: NIR typically 4000–9000; urban/bare soil: 1000–3500
  const VEG_NIR_THRESHOLD = 3500;

  if (nirStats.histogram) {
    const [counts, edges] = nirStats.histogram;
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let vegCount = 0;
    for (let i = 0; i < counts.length; i++) {
      const mid = (edges[i] + (edges[i + 1] ?? edges[i])) / 2;
      if (mid > VEG_NIR_THRESHOLD) vegCount += counts[i];
    }
    return Math.round((vegCount / total) * 100);
  }

  // Fallback: estimate from area NDVI
  const r = redStats.mean;
  const n = nirStats.mean;
  if (r <= 0 || n <= 0 || r + n <= 0) return 0;
  const areaNdvi = (n - r) / (n + r);
  if (areaNdvi < 0)    return Math.max(0, Math.round((areaNdvi + 0.2) * 100));
  if (areaNdvi < 0.15) return Math.round(areaNdvi * 200);
  if (areaNdvi < 0.35) return Math.round(20 + (areaNdvi - 0.15) * 250);
  return Math.min(95, Math.round(70 + (areaNdvi - 0.35) * 50));
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat        = parseFloat(searchParams.get('lat') ?? '47.5278845');
  const lon        = parseFloat(searchParams.get('lon') ?? '19.0705657');
  const buildingId = searchParams.get('buildingId') ?? null;

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: 'Invalid coords' }, { status: 400 });
  }

  const supabase = buildingId ? makeSupabase() : null;

  // ── 1. Check DB cache ──────────────────────────────────────────────────────
  if (supabase && buildingId) {
    const { data } = await supabase
      .from('building_satellite_cache')
      .select('*')
      .eq('building_id', buildingId)
      .gt('computed_at', new Date(Date.now() - 7 * 24 * 3600_000).toISOString())
      .maybeSingle();

    if (data) {
      const info = data.ndvi !== null ? ndviInfo(data.ndvi as number) : { label: 'Ismeretlen', color: '#94a3b8', pct: 0 };
      return NextResponse.json({
        ndvi:       data.ndvi,
        ndviLabel:  data.ndvi_label ?? info.label,
        ndviColor:  data.ndvi_color ?? info.color,
        ndviPct:    info.pct,
        sceneDate:  data.scene_date,
        cloudCover: data.cloud_cover,
        satellite:  data.satellite ?? 'Sentinel-2',
        sceneId:    data.scene_id,
        source:     'cache',
        computedAt: data.computed_at,
        areaNdvi:   data.ndvi_area_mean ?? null,
        vegPct:     data.ndvi_veg_pct   ?? null,
      } satisfies SatelliteData);
    }
  }

  // ── 2. Live Sentinel-2 lookup ─────────────────────────────────────────────
  try {
    const scene = await searchSentinel2(lat, lon);
    if (!scene) throw new Error('No scene found');

    // Asset key names vary; try common variants
    const redHref = scene.assets['red']?.href ?? scene.assets['B04']?.href ?? scene.assets['band04']?.href ?? null;
    const nirHref = scene.assets['nir']?.href ?? scene.assets['B08']?.href ?? scene.assets['band08']?.href ?? null;

    if (!redHref || !nirHref) throw new Error('Band assets not found');

    // 500m bbox for area statistics
    const BBOX_LAT = 0.0045;
    const bboxLon  = BBOX_LAT / Math.cos(lat * Math.PI / 180);
    const bbox     = `${lon - bboxLon},${lat - BBOX_LAT},${lon + bboxLon},${lat + BBOX_LAT}`;

    const [redVal, nirVal, redStats, nirStats] = await Promise.all([
      cogPoint(lon, lat, redHref),
      cogPoint(lon, lat, nirHref),
      cogStats(redHref, bbox),
      cogStats(nirHref, bbox),
    ]);

    if (redVal === null || nirVal === null) throw new Error('COG point extraction failed');

    // Sentinel-2 L2A values are surface reflectance × 10000; NDVI ratio cancels scale
    const ndvi    = (nirVal - redVal) / (nirVal + redVal);
    const rounded = Math.round(ndvi * 1000) / 1000;

    if (!Number.isFinite(rounded)) throw new Error('NDVI calculation invalid');

    const info      = ndviInfo(rounded);
    const sceneDate = scene.properties.datetime.slice(0, 10);
    const cc        = scene.properties['eo:cloud_cover'] ?? null;

    // Area NDVI from bbox mean values
    let areaNdvi: number | null = null;
    let vegPct:   number | null = null;
    let b08Mean:  number | null = null;
    let b04Mean:  number | null = null;

    if (nirStats && redStats && nirStats.mean > 0 && redStats.mean > 0) {
      const nr = nirStats.mean, rr = redStats.mean;
      areaNdvi = Math.round(((nr - rr) / (nr + rr)) * 1000) / 1000;
      vegPct   = estimateVegPct(nirStats, redStats);
      b08Mean  = Math.round(nirStats.mean);
      b04Mean  = Math.round(redStats.mean);
    }

    // ── 3. Upsert to cache ────────────────────────────────────────────────────
    if (supabase && buildingId) {
      await supabase.from('building_satellite_cache').upsert({
        building_id:   buildingId,
        ndvi:          rounded,
        ndvi_label:    info.label,
        ndvi_color:    info.color,
        scene_date:    sceneDate,
        cloud_cover:   cc,
        satellite:     'Sentinel-2',
        scene_id:      scene.id,
        b_red_value:   redVal,
        b_nir_value:   nirVal,
        ndvi_area_mean: areaNdvi,
        ndvi_veg_pct:   vegPct,
        b08_area_mean:  b08Mean,
        b04_area_mean:  b04Mean,
        source:        'sentinel2',
        computed_at:   new Date().toISOString(),
      }, { onConflict: 'building_id' });
    }

    return NextResponse.json({
      ndvi:       rounded,
      ndviLabel:  info.label,
      ndviColor:  info.color,
      ndviPct:    info.pct,
      sceneDate,
      cloudCover: cc,
      satellite:  'Sentinel-2 L2A',
      sceneId:    scene.id,
      source:     'sentinel2',
      computedAt: new Date().toISOString(),
      areaNdvi,
      vegPct,
    } satisfies SatelliteData);

  } catch {
    return NextResponse.json({
      ndvi:       null,
      ndviLabel:  'Nem elérhető',
      ndviColor:  '#475569',
      ndviPct:    0,
      sceneDate:  null,
      cloudCover: null,
      satellite:  'Sentinel-2',
      sceneId:    null,
      source:     'unavailable',
      computedAt: new Date().toISOString(),
      areaNdvi:   null,
      vegPct:     null,
    } satisfies SatelliteData);
  }
}
