import { NextRequest, NextResponse } from 'next/server';

// ─── Overpass API — Budapest cycling infrastructure ───────────────────────────
// Cached for 60 minutes server-side (route data changes rarely).

export interface CyclingFeature {
  id:       number;
  type:     'cycleway' | 'lane' | 'track' | 'shared' | 'other';
  name:     string | null;
  surface:  string | null;
  coords:   [number, number][];   // [lon, lat] GeoJSON order
}

// ─── 60-minute server cache ───────────────────────────────────────────────────
interface CacheEntry { data: CyclingFeature[]; expires: number; }
let _cache: CacheEntry | null = null;

// ─── Overpass Turbo query ─────────────────────────────────────────────────────
// Bounding box: lat 47.35–47.65, lon 18.85–19.25 (core Budapest)
const OVERPASS_QUERY = `
[out:json][timeout:30];
(
  way["highway"="cycleway"](47.35,18.85,47.65,19.25);
  way["cycleway"~"track|lane|shared_lane|opposite_lane|opposite_track"](47.35,18.85,47.65,19.25);
  way["bicycle"="designated"]["highway"~"path|footway|track"](47.35,18.85,47.65,19.25);
);
out geom;
`.trim();

function classifyWay(tags: Record<string, string>): CyclingFeature['type'] {
  if (tags.highway === 'cycleway')            return 'cycleway';
  if (tags.cycleway === 'track')              return 'track';
  if (tags.cycleway === 'lane')               return 'lane';
  if (tags.cycleway?.includes('shared'))      return 'shared';
  if (tags.bicycle === 'designated')          return 'other';
  return 'other';
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  if (_cache && _cache.expires > Date.now()) {
    return NextResponse.json(_cache.data);
  }

  try {
    const body = `data=${encodeURIComponent(OVERPASS_QUERY)}`;
    const res  = await fetch('https://overpass-api.de/api/interpreter', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal:  AbortSignal.timeout(35_000),
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

    const json = await res.json() as {
      elements: Array<{
        id:       number;
        tags?:    Record<string, string>;
        geometry: Array<{ lat: number; lon: number }>;
      }>;
    };

    const features: CyclingFeature[] = (json.elements ?? [])
      .filter(el => el.geometry && el.geometry.length >= 2)
      .map(el => ({
        id:      el.id,
        type:    classifyWay(el.tags ?? {}),
        name:    el.tags?.name ?? null,
        surface: el.tags?.surface ?? null,
        coords:  el.geometry.map(g => [g.lon, g.lat] as [number, number]),
      }));

    _cache = { data: features, expires: Date.now() + 60 * 60_000 };
    return NextResponse.json(features);
  } catch (err) {
    console.warn('[cycling] Overpass fetch failed:', err);
    return NextResponse.json([], { status: 200 });
  }
}
