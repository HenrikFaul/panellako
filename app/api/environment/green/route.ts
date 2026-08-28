import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  environmentScopeErrorResponse,
  resolveEnvironmentBuildingScope,
} from '@/lib/authorization/environment-scope';
export const dynamic = 'force-dynamic';
// Match Vercel Pro maxDuration to give Overpass enough time without
// hitting the default 10s limit (no-op on Hobby plans).
export const maxDuration = 30;

export interface GreenData {
  greenScore:      number;
  parkAreaM2:      number;
  treeCount:       number;
  nearestParkName: string;
  nearestParkM:    number;
  playgroundCount: number;
  sportsCount:     number;
  noiseScore:      number;
  mainRoadDistM:   number | null;
  railDistM:       number | null;
  computedAt:      string;
  source:          'cache' | 'overpass' | 'stale-cache' | 'unavailable';
}

interface OElement {
  type:     'node' | 'way' | 'relation';
  id:       number;
  lat?:     number;
  lon?:     number;
  tags?:    Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  nodes?:   number[];
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function polygonAreaM2(pts: { lat: number; lon: number }[]): number {
  // Shoelace on projected coords (crude but sufficient for small areas)
  if (pts.length < 3) return 0;
  let area = 0;
  const toM = (lat: number, lon: number) => ({
    x: lon * Math.cos(lat * Math.PI / 180) * 111320,
    y: lat * 111320,
  });
  for (let i = 0; i < pts.length; i++) {
    const a = toM(pts[i].lat, pts[i].lon);
    const b = toM(pts[(i + 1) % pts.length].lat, pts[(i + 1) % pts.length].lon);
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area / 2);
}

function centroid(pts: { lat: number; lon: number }[]): { lat: number; lon: number } {
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
  return { lat, lon };
}

function minDistToPolyline(el: OElement, lat: number, lon: number): number {
  const pts = el.geometry ?? [];
  if (pts.length === 0) {
    if (el.lat !== undefined && el.lon !== undefined) return haversineM(lat, lon, el.lat, el.lon);
    return 99999;
  }
  return Math.min(...pts.map(p => haversineM(lat, lon, p.lat, p.lon)));
}

function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Overpass mirrors — kumi.systems FIRST (proven reliable from Vercel; the
// /api/cycling route uses the same ordering successfully).
const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

async function overpassFetch(body: string): Promise<OElement[]> {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent':   'panellako/1.0 (info@panellako.hu)',
  };
  let lastErr: unknown = null;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method:  'POST',
        headers,
        body,
        signal:  AbortSignal.timeout(9_000),  // under Vercel 10s budget
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} @ ${url}`);
        console.warn(`[environment/green] ${url} returned HTTP ${res.status}`);
        continue;
      }
      const json = await res.json() as { elements: OElement[] };
      return json.elements ?? [];
    } catch (err) {
      lastErr = err;
      console.warn(`[environment/green] ${url} failed:`, err);
    }
  }
  throw lastErr ?? new Error('All Overpass mirrors failed');
}

async function fetchFromOverpass(lat: number, lon: number): Promise<GreenData> {
  // timeout:8 fits within the Vercel 10s function budget. qt = quick-tidy
  // sort, much faster output.
  const query = `[out:json][timeout:8];
(
  way[leisure=park](around:500,${lat},${lon});
  relation[leisure=park](around:500,${lat},${lon});
  way[landuse=grass](around:500,${lat},${lon});
  way[natural=wood](around:500,${lat},${lon});
  way[landuse=forest](around:500,${lat},${lon});
  way[leisure=garden](around:500,${lat},${lon});
  way[leisure=recreation_ground](around:500,${lat},${lon});
  node[natural=tree](around:200,${lat},${lon});
  way[leisure=playground](around:300,${lat},${lon});
  node[leisure=playground](around:300,${lat},${lon});
  way[leisure=sports_centre](around:500,${lat},${lon});
  node[leisure=pitch](around:300,${lat},${lon});
  way[highway~"^(motorway|trunk|primary)$"](around:200,${lat},${lon});
  way[highway=secondary](around:150,${lat},${lon});
  way[railway=rail](around:300,${lat},${lon});
  way[railway=tram](around:150,${lat},${lon});
);
out geom qt;`;

  const els = await overpassFetch(`data=${encodeURIComponent(query)}`);

  // Green scoring
  const GREEN_LEISURE  = new Set(['park', 'garden', 'recreation_ground']);
  const GREEN_LANDUSE  = new Set(['grass', 'forest']);
  const GREEN_NATURAL  = new Set(['wood']);

  let parkAreaM2 = 0;
  let nearestParkName = '';
  let nearestParkM = 99999;

  for (const el of els) {
    const t = el.tags ?? {};
    const isGreen =
      (t.leisure && GREEN_LEISURE.has(t.leisure)) ||
      (t.landuse && GREEN_LANDUSE.has(t.landuse)) ||
      (t.natural && GREEN_NATURAL.has(t.natural));
    if (!isGreen) continue;
    if (el.geometry && el.geometry.length > 2) {
      parkAreaM2 += polygonAreaM2(el.geometry);
      const c = centroid(el.geometry);
      const d = haversineM(lat, lon, c.lat, c.lon);
      if (d < nearestParkM && t.leisure === 'park') {
        nearestParkM    = d;
        nearestParkName = t.name ?? t.leisure ?? 'Park';
      }
    }
  }

  const treeCount      = els.filter(e => e.type === 'node' && e.tags?.natural === 'tree').length;
  const playgroundCount= els.filter(e => e.tags?.leisure === 'playground').length;
  const sportsCount    = els.filter(e => e.tags?.leisure === 'sports_centre' || e.tags?.leisure === 'pitch').length;

  // Green score 0-100
  const areaScore     = Math.min(parkAreaM2 / 50000, 1) * 40;
  const treeScore     = Math.min(treeCount / 50, 1) * 30;
  const proxScore     = nearestParkM < 99999 ? Math.max(0, 1 - nearestParkM / 500) * 30 : 0;
  const greenScore    = Math.round(areaScore + treeScore + proxScore);

  // Noise score
  let noisePenalty = 0;
  let mainRoadDistM: number | null = null;
  let railDistM: number | null     = null;

  for (const el of els) {
    const hw  = el.tags?.highway;
    const rw  = el.tags?.railway;
    const dist = minDistToPolyline(el, lat, lon);

    if ((hw === 'motorway' || hw === 'trunk') && dist < 200) {
      noisePenalty += (1 - dist / 200) * 0.35;
      if (mainRoadDistM === null || dist < mainRoadDistM) mainRoadDistM = dist;
    }
    if (hw === 'primary' && dist < 150) {
      noisePenalty += (1 - dist / 150) * 0.25;
      if (mainRoadDistM === null || dist < mainRoadDistM) mainRoadDistM = dist;
    }
    if (hw === 'secondary' && dist < 100) {
      noisePenalty += (1 - dist / 100) * 0.15;
    }
    if (rw === 'rail' && dist < 300) {
      noisePenalty += (1 - dist / 300) * 0.30;
      if (railDistM === null || dist < railDistM) railDistM = dist;
    }
    if (rw === 'tram' && dist < 100) {
      noisePenalty += (1 - dist / 100) * 0.15;
    }
  }
  const noiseScore = Math.max(0, Math.min(1, 1 - noisePenalty));

  return {
    greenScore,
    parkAreaM2:      Math.round(parkAreaM2),
    treeCount,
    nearestParkName: nearestParkName || 'Nincs a közelben',
    nearestParkM:    nearestParkM < 99999 ? Math.round(nearestParkM) : 999,
    playgroundCount,
    sportsCount,
    noiseScore:      Math.round(noiseScore * 1000) / 1000,
    mainRoadDistM:   mainRoadDistM !== null ? Math.round(mainRoadDistM) : null,
    railDistM:       railDistM !== null ? Math.round(railDistM) : null,
    computedAt:      new Date().toISOString(),
    source:          'overpass',
  };
}

export async function GET(request: NextRequest) {
  const sp         = request.nextUrl.searchParams;
  const workspaceId = sp.get('buildingId');
  const lat        = parseFloat(sp.get('lat') ?? '47.5278845');
  const lon        = parseFloat(sp.get('lon') ?? '19.0705657');

  let physicalBuildingId: string | null;
  try {
    ({ physicalBuildingId } = await resolveEnvironmentBuildingScope(request, workspaceId));
  } catch (error) {
    return environmentScopeErrorResponse(error);
  }

  const supabase = createServiceClient();

  if (supabase && physicalBuildingId) {
    const { data: cached } = await supabase
      .from('building_green_cache')
      .select('*')
      .eq('building_id', physicalBuildingId)
      .gt('computed_at', new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString())
      .maybeSingle();

    if (cached) {
      const green: GreenData = {
        greenScore:      Number(cached.green_score),
        parkAreaM2:      Number(cached.park_area_500m_m2 ?? 0),
        treeCount:       cached.tree_count_200m ?? 0,
        nearestParkName: cached.nearest_park_name ?? 'Nincs a közelben',
        nearestParkM:    Number(cached.nearest_park_m ?? 999),
        playgroundCount: cached.playground_count ?? 0,
        sportsCount:     cached.sports_count ?? 0,
        noiseScore:      Number(cached.noise_score ?? 0.5),
        mainRoadDistM:   cached.main_road_dist_m !== null ? Number(cached.main_road_dist_m) : null,
        railDistM:       cached.rail_dist_m !== null ? Number(cached.rail_dist_m) : null,
        computedAt:      cached.computed_at,
        source:          'cache',
      };
      return NextResponse.json(green);
    }
  }

  try {
    const green = await fetchFromOverpass(lat, lon);

    if (supabase && physicalBuildingId) {
      await supabase.from('building_green_cache').upsert({
        building_id:       physicalBuildingId,
        green_score:       green.greenScore,
        park_area_500m_m2: green.parkAreaM2,
        tree_count_200m:   green.treeCount,
        nearest_park_name: green.nearestParkName,
        nearest_park_m:    green.nearestParkM,
        playground_count:  green.playgroundCount,
        sports_count:      green.sportsCount,
        noise_score:       green.noiseScore,
        main_road_dist_m:  green.mainRoadDistM,
        rail_dist_m:       green.railDistM,
        computed_at:       green.computedAt,
      }, { onConflict: 'building_id' });
    }

    return NextResponse.json(green);
  } catch (err) {
    console.warn('[environment/green] all Overpass mirrors failed:', err);

    // 1. Try stale cache (no TTL) before giving up
    if (supabase && physicalBuildingId) {
      const { data: cached } = await supabase
        .from('building_green_cache')
        .select('*')
        .eq('building_id', physicalBuildingId)
        .maybeSingle();
      if (cached) {
        const green: GreenData = {
          greenScore:      Number(cached.green_score),
          parkAreaM2:      Number(cached.park_area_500m_m2 ?? 0),
          treeCount:       cached.tree_count_200m ?? 0,
          nearestParkName: cached.nearest_park_name ?? 'Nincs adat',
          nearestParkM:    Number(cached.nearest_park_m ?? 999),
          playgroundCount: cached.playground_count ?? 0,
          sportsCount:     cached.sports_count ?? 0,
          noiseScore:      Number(cached.noise_score ?? 0.5),
          mainRoadDistM:   cached.main_road_dist_m !== null ? Number(cached.main_road_dist_m) : null,
          railDistM:       cached.rail_dist_m !== null ? Number(cached.rail_dist_m) : null,
          computedAt:      cached.computed_at,
          source:          'stale-cache',
        };
        return NextResponse.json(green);
      }
    }

    // 2. No cache either — fall through to the existing null response so the
    //    frontend shows the "Overpass nem elérhető" retry block.
    return NextResponse.json(null);
  }
}
