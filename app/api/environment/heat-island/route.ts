import { NextRequest, NextResponse } from 'next/server';
import { calculateUHI, type UHIResult, type UHIInputs, type CoolSpot } from '@/lib/uhi-calculator';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─── Module-level 24h cache ────────────────────────────────────────────────────
interface CacheEntry { data: UHIResult; expires: number; }
const cache = new Map<string, CacheEntry>();

// ─── Overpass mirrors (same ordering as other env routes) ─────────────────────
const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

interface OElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  nodes?: number[];
  // count endpoint returns total
  total?: number;
}

interface OverpassResponse {
  elements: OElement[];
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function polygonAreaM2(pts: { lat: number; lon: number }[]): number {
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

async function overpassFetch(body: string): Promise<OElement[]> {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'panellako/1.0 (info@panellako.hu)',
  };
  let lastErr: unknown = null;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(9_000),
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} @ ${url}`);
        console.warn(`[environment/heat-island] ${url} returned HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as OverpassResponse;
      return json.elements ?? [];
    } catch (err) {
      lastErr = err;
      console.warn(`[environment/heat-island] ${url} failed:`, err);
    }
  }
  throw lastErr ?? new Error('All Overpass mirrors failed');
}

// ─── Budapest fallback cool spots ─────────────────────────────────────────────
const BUDAPEST_FALLBACK_COOL_SPOTS: CoolSpot[] = [
  { name: 'Városliget', type: 'park', openHours: '0-24', distanceM: null },
  { name: 'Margit-sziget', type: 'park', openHours: '0-24', distanceM: null },
  { name: 'Fővárosi Szabó Ervin Könyvtár', type: 'konyvtar', openHours: '10-20', distanceM: null },
  { name: 'Westend City Center', type: 'bevasarlokozpont', openHours: '10-22', distanceM: null },
  { name: 'Károlyi-kert', type: 'park', openHours: '0-24', distanceM: null },
];

// ─── OSM data fetcher + UHI calculator ────────────────────────────────────────
async function computeFromOverpass(lat: number, lon: number): Promise<UHIResult> {
  // Query for buildings, greenspace, water, and parks in 500m radius
  const query = `[out:json][timeout:9];
(
  way["building"](around:500,${lat},${lon});
  way["landuse"~"^(forest|park|grass|recreation_ground|meadow|village_green)$"](around:500,${lat},${lon});
  way["natural"~"^(water|wetland|wood)$"](around:500,${lat},${lon});
  way["leisure"~"^(park|garden|recreation_ground)$"](around:500,${lat},${lon});
  relation["leisure"="park"](around:500,${lat},${lon});
  node["natural"="water"](around:500,${lat},${lon});
  node["leisure"="park"](around:1000,${lat},${lon});
  node["amenity"="library"](around:1000,${lat},${lon});
  node["shop"="mall"](around:1500,${lat},${lon});
  node["amenity"="fountain"](around:800,${lat},${lon});
  node["amenity"="parking"](around:500,${lat},${lon});
)->.all;
out geom qt;`;

  const els = await overpassFetch(`data=${encodeURIComponent(query)}`);

  // Approximate 500m circle area for density calculations
  const circleAreaM2 = Math.PI * 500 * 500; // ~785,398 m²

  let buildingAreaM2 = 0;
  let greenAreaM2    = 0;
  let hasWater       = false;
  let nearestParkM   = 99999;
  const coolSpots: CoolSpot[] = [];

  for (const el of els) {
    const t = el.tags ?? {};

    // Buildings
    if (t.building) {
      if (el.geometry && el.geometry.length > 2) {
        buildingAreaM2 += polygonAreaM2(el.geometry);
      }
    }

    // Green spaces
    const isGreen =
      (t.landuse && /^(forest|park|grass|recreation_ground|meadow|village_green)$/.test(t.landuse)) ||
      (t.natural && /^(wood)$/.test(t.natural)) ||
      (t.leisure && /^(park|garden|recreation_ground)$/.test(t.leisure));

    if (isGreen && el.geometry && el.geometry.length > 2) {
      greenAreaM2 += polygonAreaM2(el.geometry);
    }

    // Water bodies
    const isWater =
      (t.natural === 'water' || t.natural === 'wetland') ||
      (t.landuse === 'reservoir') ||
      (t.waterway === 'river' || t.waterway === 'stream');

    if (isWater) {
      let dist = 99999;
      if (el.geometry && el.geometry.length > 0) {
        dist = Math.min(...el.geometry.map(p => haversineM(lat, lon, p.lat, p.lon)));
      } else if (el.lat !== undefined && el.lon !== undefined) {
        dist = haversineM(lat, lon, el.lat, el.lon);
      }
      if (dist <= 500) hasWater = true;
    }

    // Parks (nearest)
    const isPark =
      t.leisure === 'park' || t.leisure === 'garden' ||
      t.landuse === 'park' || t.leisure === 'recreation_ground';

    if (isPark) {
      let dist = 99999;
      if (el.geometry && el.geometry.length > 0) {
        const c = centroid(el.geometry);
        dist = haversineM(lat, lon, c.lat, c.lon);
      } else if (el.lat !== undefined && el.lon !== undefined) {
        dist = haversineM(lat, lon, el.lat, el.lon);
      }
      nearestParkM = Math.min(nearestParkM, dist);
      if (dist <= 2000 && coolSpots.length < 5) {
        coolSpots.push({
          name: t.name ?? 'Park',
          type: 'park',
          openHours: '0-24',
          distanceM: Math.round(dist),
        });
      }
    }

    // Libraries
    if (t.amenity === 'library' && el.lat !== undefined && el.lon !== undefined) {
      const dist = haversineM(lat, lon, el.lat, el.lon);
      if (coolSpots.length < 8) {
        coolSpots.push({
          name: t.name ?? 'Könyvtár',
          type: 'konyvtar',
          openHours: '10-20',
          distanceM: Math.round(dist),
        });
      }
    }

    // Shopping malls
    if (t.shop === 'mall' && el.lat !== undefined && el.lon !== undefined) {
      const dist = haversineM(lat, lon, el.lat, el.lon);
      if (coolSpots.length < 8) {
        coolSpots.push({
          name: t.name ?? 'Bevásárlóközpont',
          type: 'bevasarlokozpont',
          openHours: '10-22',
          distanceM: Math.round(dist),
        });
      }
    }

    // Fountains
    if (t.amenity === 'fountain' && el.lat !== undefined && el.lon !== undefined) {
      const dist = haversineM(lat, lon, el.lat, el.lon);
      if (coolSpots.length < 8) {
        coolSpots.push({
          name: t.name ?? 'Szökőkút',
          type: 'szokokut',
          openHours: '0-24',
          distanceM: Math.round(dist),
        });
      }
    }

    // Parking (underground proxy)
    if (t.amenity === 'parking' && t.parking === 'underground' && el.lat !== undefined && el.lon !== undefined) {
      const dist = haversineM(lat, lon, el.lat, el.lon);
      if (coolSpots.length < 8) {
        coolSpots.push({
          name: t.name ?? 'Mélygarázs',
          type: 'melygarazs',
          openHours: '0-24',
          distanceM: Math.round(dist),
        });
      }
    }
  }

  // Cap densities at 100%
  const buildingDensityPercent = Math.min(100, Math.round((buildingAreaM2 / circleAreaM2) * 100));
  const greenCoveragePercent   = Math.min(100, Math.round((greenAreaM2    / circleAreaM2) * 100));
  const hasPark300m            = nearestParkM <= 300;

  const inputs: UHIInputs = {
    buildingDensityPercent,
    greenCoveragePercent,
    hasWaterBody500m: hasWater,
    hasPark300m,
    nearestParkDistanceM: nearestParkM < 99999 ? Math.round(nearestParkM) : 999,
  };

  // Sort cool spots by distance
  const sortedSpots = coolSpots
    .sort((a, b) => (a.distanceM ?? 9999) - (b.distanceM ?? 9999))
    .slice(0, 5);

  const finalSpots = sortedSpots.length >= 2 ? sortedSpots : BUDAPEST_FALLBACK_COOL_SPOTS;

  return calculateUHI(inputs, finalSpots);
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const sp  = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get('lat') ?? '47.4979');
  const lon = parseFloat(sp.get('lon') ?? '19.0402');

  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;

  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const result = await computeFromOverpass(lat, lon);
    cache.set(cacheKey, { data: result, expires: Date.now() + 24 * 60 * 60 * 1000 });
    return NextResponse.json(result);
  } catch (err) {
    console.warn('[environment/heat-island] Overpass failed, using fallback:', err);

    // Fallback: moderate Budapest urban defaults
    const fallbackInputs: UHIInputs = {
      buildingDensityPercent: 45,
      greenCoveragePercent: 15,
      hasWaterBody500m: false,
      hasPark300m: false,
      nearestParkDistanceM: 500,
    };
    const fallback = calculateUHI(fallbackInputs, BUDAPEST_FALLBACK_COOL_SPOTS);
    return NextResponse.json(fallback);
  }
}
