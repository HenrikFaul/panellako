import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  environmentScopeErrorResponse,
  resolveEnvironmentBuildingScope,
} from '@/lib/authorization/environment-scope';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UrbanAtlasData {
  greenUrbanPct:    number;   // code 14100 – zöld városi területek
  sportsLeisurePct: number;   // code 14200 – sport/szabadidős területek
  forestPct:        number;   // code 23xxx – erdők
  agriculturalPct:  number;   // code 2xxxx (non-forest) – mezőgazdaság/nyílt terület
  artificialPct:    number;   // code 1xxxx – mesterséges (beépített)
  totalGreenPct:    number;   // greenUrban + sports + forest összesen
  featureCount:     number;
  computedAt:       string;
  source:           'cache' | 'urban_atlas' | 'unavailable';
}

// ─── Land-use code classification ─────────────────────────────────────────────

function classifyCode(code: string): 'green_urban' | 'sports' | 'forest' | 'agriculture' | 'artificial' | 'other' {
  if (!code) return 'other';
  if (code.startsWith('141'))              return 'green_urban';
  if (code.startsWith('142'))              return 'sports';
  if (code.startsWith('23'))               return 'forest';
  if (code.startsWith('24') || code.startsWith('25') || code.startsWith('32') || code.startsWith('33')) return 'agriculture';
  if (code.startsWith('1'))               return 'artificial';
  if (code.startsWith('2'))               return 'agriculture';
  return 'other';
}

// ─── Supabase helper ──────────────────────────────────────────────────────────

function makeSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim();
  const key  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── EEA Urban Atlas ArcGIS REST query ───────────────────────────────────────

interface UAFeature {
  attributes: {
    code2018: string;
    area_ha:  number;
    Item:     string;
  };
}

async function fetchUrbanAtlas(lat: number, lon: number): Promise<UrbanAtlasData> {
  // ~500m radius bbox
  const BBOX_LAT = 0.0045;
  const bboxLon  = BBOX_LAT / Math.cos(lat * Math.PI / 180);
  const geomStr  = `${lon - bboxLon},${lat - BBOX_LAT},${lon + bboxLon},${lat + BBOX_LAT}`;

  const params = new URLSearchParams({
    geometry:     geomStr,
    geometryType: 'esriGeometryEnvelope',
    inSR:         '4326',
    spatialRel:   'esriSpatialRelIntersects',
    outFields:    'code2018,area_ha,Item',
    returnGeometry: 'false',
    resultRecordCount: '200',
    f:            'json',
  });

  const res = await fetch(
    `https://image.discomap.eea.europa.eu/arcgis/rest/services/UrbanAtlas/UA2018/MapServer/0/query?${params}`,
    { signal: AbortSignal.timeout(20_000) },
  );
  if (!res.ok) throw new Error(`Urban Atlas HTTP ${res.status}`);

  const json = await res.json() as { features?: UAFeature[]; error?: { message: string } };
  if (json.error) throw new Error(`Urban Atlas: ${json.error.message}`);

  const features = json.features ?? [];
  const totalHa = features.reduce((s, f) => s + (f.attributes.area_ha ?? 0), 0);

  const buckets: Record<string, number> = {
    green_urban: 0, sports: 0, forest: 0, agriculture: 0, artificial: 0,
  };

  for (const f of features) {
    const cls = classifyCode(f.attributes.code2018 ?? '');
    if (cls !== 'other') buckets[cls] += f.attributes.area_ha ?? 0;
  }

  const pct = (ha: number) =>
    totalHa > 0 ? Math.round((ha / totalHa) * 1000) / 10 : 0;

  return {
    greenUrbanPct:    pct(buckets.green_urban),
    sportsLeisurePct: pct(buckets.sports),
    forestPct:        pct(buckets.forest),
    agriculturalPct:  pct(buckets.agriculture),
    artificialPct:    pct(buckets.artificial),
    totalGreenPct:    pct(buckets.green_urban + buckets.sports + buckets.forest),
    featureCount:     features.length,
    computedAt:       new Date().toISOString(),
    source:           'urban_atlas',
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sp         = request.nextUrl.searchParams;
  const lat        = parseFloat(sp.get('lat') ?? '47.5278845');
  const lon        = parseFloat(sp.get('lon') ?? '19.0705657');
  const workspaceId = sp.get('buildingId');

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: 'Invalid coords' }, { status: 400 });
  }

  let physicalBuildingId: string | null;
  try {
    ({ physicalBuildingId } = await resolveEnvironmentBuildingScope(request, workspaceId));
  } catch (error) {
    return environmentScopeErrorResponse(error);
  }

  const supabase = physicalBuildingId ? makeSupabase() : null;

  // ── 1. Cache check (6-month TTL – Urban Atlas updates every 3 years) ────────
  if (supabase && physicalBuildingId) {
    const { data: cached } = await supabase
      .from('building_urban_atlas_cache')
      .select('*')
      .eq('building_id', physicalBuildingId)
      .gt('computed_at', new Date(Date.now() - 180 * 24 * 3600_000).toISOString())
      .maybeSingle();

    if (cached) {
      return NextResponse.json({
        greenUrbanPct:    Number(cached.green_urban_pct ?? 0),
        sportsLeisurePct: Number(cached.sports_leisure_pct ?? 0),
        forestPct:        Number(cached.forest_pct ?? 0),
        agriculturalPct:  Number(cached.agricultural_pct ?? 0),
        artificialPct:    Number(cached.artificial_pct ?? 0),
        totalGreenPct:    Number(cached.total_green_pct ?? 0),
        featureCount:     cached.feature_count ?? 0,
        computedAt:       cached.computed_at,
        source:           'cache',
      } satisfies UrbanAtlasData);
    }
  }

  // ── 2. Live query ─────────────────────────────────────────────────────────
  try {
    const data = await fetchUrbanAtlas(lat, lon);

    if (supabase && physicalBuildingId && data.featureCount > 0) {
      await supabase.from('building_urban_atlas_cache').upsert({
        building_id:         physicalBuildingId,
        green_urban_pct:     data.greenUrbanPct,
        sports_leisure_pct:  data.sportsLeisurePct,
        forest_pct:          data.forestPct,
        agricultural_pct:    data.agriculturalPct,
        artificial_pct:      data.artificialPct,
        total_green_pct:     data.totalGreenPct,
        feature_count:       data.featureCount,
        computed_at:         data.computedAt,
      }, { onConflict: 'building_id' });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.warn('[environment/urban-atlas] EEA query failed:', err);
    return NextResponse.json({
      greenUrbanPct: 0, sportsLeisurePct: 0, forestPct: 0,
      agriculturalPct: 0, artificialPct: 0, totalGreenPct: 0,
      featureCount: 0, computedAt: new Date().toISOString(), source: 'unavailable',
    } satisfies UrbanAtlasData);
  }
}
