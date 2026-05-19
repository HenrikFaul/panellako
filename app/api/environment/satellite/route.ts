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

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat        = parseFloat(searchParams.get('lat') ?? '47.4979');
  const lon        = parseFloat(searchParams.get('lon') ?? '19.0402');
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

    const [redVal, nirVal] = await Promise.all([
      cogPoint(lon, lat, redHref),
      cogPoint(lon, lat, nirHref),
    ]);

    if (redVal === null || nirVal === null) throw new Error('COG point extraction failed');

    // Sentinel-2 L2A values are surface reflectance × 10000; NDVI ratio cancels scale
    const ndvi    = (nirVal - redVal) / (nirVal + redVal);
    const rounded = Math.round(ndvi * 1000) / 1000;

    if (!Number.isFinite(rounded)) throw new Error('NDVI calculation invalid');

    const info      = ndviInfo(rounded);
    const sceneDate = scene.properties.datetime.slice(0, 10);
    const cc        = scene.properties['eo:cloud_cover'] ?? null;

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
    } satisfies SatelliteData);
  }
}
