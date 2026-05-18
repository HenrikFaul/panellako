import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// ─── Overpass API — Budapest cycling infrastructure ───────────────────────────

export interface CyclingFeature {
  id:       number;
  type:     'cycleway' | 'lane' | 'track' | 'shared' | 'other';
  name:     string | null;
  surface:  string | null;
  coords:   [number, number][];   // [lon, lat] GeoJSON order
}

// ─── 60-minute server cache (only populated on success) ───────────────────────
interface CacheEntry { data: CyclingFeature[]; expires: number; }
let _cache: CacheEntry | null = null;

// ─── Overpass query — simplified for speed, fits Vercel 10s function limit ────
// qt = quick-and-tidy sort (faster output), timeout:8 tells Overpass to stop at 8s
const OVERPASS_QUERY = `
[out:json][timeout:8];
(
  way["highway"="cycleway"](47.40,18.93,47.60,19.17);
  way["cycleway"="track"](47.40,18.93,47.60,19.17);
  way["cycleway"="lane"](47.40,18.93,47.60,19.17);
  way["cycleway"="shared_lane"](47.40,18.93,47.60,19.17);
  way["bicycle"="designated"]["highway"~"path|footway"](47.40,18.93,47.60,19.17);
);
out geom qt;
`.trim();

// Multiple mirrors — try in order until one responds
const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

function classifyWay(tags: Record<string, string>): CyclingFeature['type'] {
  if (tags.highway === 'cycleway')       return 'cycleway';
  if (tags.cycleway === 'track')         return 'track';
  if (tags.cycleway === 'lane')          return 'lane';
  if (tags.cycleway?.includes('shared')) return 'shared';
  if (tags.bicycle === 'designated')     return 'other';
  return 'other';
}

function parseElements(json: unknown): CyclingFeature[] {
  const j = json as { elements?: Array<{ id: number; tags?: Record<string, string>; geometry?: Array<{ lat: number; lon: number }> }> };
  return (j.elements ?? [])
    .filter(el => el.geometry && el.geometry.length >= 2)
    .map(el => ({
      id:      el.id,
      type:    classifyWay(el.tags ?? {}),
      name:    el.tags?.name ?? null,
      surface: el.tags?.surface ?? null,
      coords:  (el.geometry ?? []).map(g => [g.lon, g.lat] as [number, number]),
    }));
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(): Promise<NextResponse> {
  if (_cache && _cache.expires > Date.now()) {
    return NextResponse.json(_cache.data);
  }

  const body = `data=${encodeURIComponent(OVERPASS_QUERY)}`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'panellako/1.0' },
        body,
        signal:  AbortSignal.timeout(9_000),
      });
      if (!res.ok) { console.warn(`[cycling] ${endpoint} HTTP ${res.status}`); continue; }

      const json = await res.json();
      const features = parseElements(json);

      if (features.length > 0) {
        _cache = { data: features, expires: Date.now() + 60 * 60_000 };
        return NextResponse.json(features);
      }
      console.warn(`[cycling] ${endpoint} returned 0 features`);
    } catch (err) {
      console.warn(`[cycling] ${endpoint} failed:`, err);
    }
  }

  // All endpoints failed — return empty without caching, with no-store so browser retries
  return NextResponse.json([], {
    status:  200,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
