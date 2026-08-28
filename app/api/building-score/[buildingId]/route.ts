// Green Building Score API — Feature 02: Zöld Épület Pontszám
// GET /api/building-score/[buildingId]
// Computes a 0-100 environmental score from 6 sub-scores using OpenAQ + Overpass APIs.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspaceCapability, WorkspaceAuthorizationError } from '@/lib/authorization/guards';

export const dynamic = 'force-dynamic';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OPENAQ_URL   = 'https://api.openaq.io/v3';
const TIMEOUT_MS   = 15_000;

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface GreenBuildingScore {
  total:       number;
  air:         number;
  green:       number;
  transit:     number;
  cycling:     number;
  noise:       number;
  uhi:         number;
  badge:       string;
  airEstimated: boolean;
  lat:         number;
  lon:         number;
  computedAt:  string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Air quality (max 25)
// ──────────────────────────────────────────────────────────────────────────────

async function computeAirScore(lat: number, lon: number): Promise<{ score: number; estimated: boolean }> {
  try {
    const url = `${OPENAQ_URL}/locations?coordinates=${lat},${lon}&radius=10000&limit=5&order_by=distance`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { score: 12, estimated: false };

    const data = await res.json();
    const locations = data?.results ?? [];
    if (!locations.length) return { score: 12, estimated: false };

    // Pick nearest location with measurements
    const nearest = locations[0];
    const distanceM: number = nearest?.distance ?? 99999;
    const sensors: Array<{ parameter: { name: string }; value: number }> = nearest?.sensors ?? [];

    const getValue = (name: string): number | null => {
      const s = sensors.find((x) => x?.parameter?.name === name);
      return s ? s.value : null;
    };

    const pm25 = getValue('pm25') ?? 0;
    const pm10 = getValue('pm10') ?? 0;
    const no2  = getValue('no2')  ?? 0;
    const o3   = getValue('o3')   ?? 0;

    const composite =
      (pm25 / 25) * 0.40 +
      (pm10 / 50) * 0.25 +
      (no2 / 200) * 0.20 +
      (o3 / 120)  * 0.15;

    let score = Math.max(0, 25 * (1 - composite / 1.5));
    const estimated = distanceM > 5000;
    if (estimated) score *= 0.9;

    return { score: Math.round(score * 10) / 10, estimated };
  } catch {
    return { score: 12, estimated: false };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Green area (max 20)
// ──────────────────────────────────────────────────────────────────────────────

async function computeGreenScore(lat: number, lon: number): Promise<number> {
  try {
    const query = `[out:json][timeout:20];(way["leisure"="park"](around:500,${lat},${lon});way["landuse"="forest"](around:500,${lat},${lon});way["leisure"="garden"](around:500,${lat},${lon});node["leisure"="playground"](around:500,${lat},${lon}););out body;>;out skel qt;`;
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return 8;

    const data = await res.json();
    const elements: Array<{ type: string; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string> }> = data?.elements ?? [];

    // Find nearest park node distance
    let nearestM = 500;
    let totalM2 = 0;

    for (const el of elements) {
      if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
        const d = haversineM(lat, lon, el.lat, el.lon);
        if (d < nearestM) nearestM = d;
      }
      // Estimate area from way (rough bounding box)
      if (el.type === 'way' && el.nodes) {
        // Use node count as rough area proxy (each way node ~ 50m²)
        totalM2 += el.nodes.length * 50;
      }
    }

    const nearest_park_score = Math.max(0, 10 * (1 - nearestM / 500));
    const area_score = Math.min(10, 10 * (totalM2 / 50000));

    return Math.round((nearest_park_score + area_score) * 10) / 10;
  } catch {
    return 8;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Transit (max 20)
// ──────────────────────────────────────────────────────────────────────────────

async function computeTransitScore(lat: number, lon: number): Promise<number> {
  try {
    const query = `[out:json][timeout:20];(node["public_transport"="stop_position"](around:400,${lat},${lon});node["highway"="bus_stop"](around:400,${lat},${lon});node["railway"="tram_stop"](around:400,${lat},${lon});node["station"="subway"](around:400,${lat},${lon}););out body;`;
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return 10;

    const data = await res.json();
    const elements: Array<{ tags?: Record<string, string> }> = data?.elements ?? [];

    const count = elements.length;
    const stops_score = Math.min(8, count * 1.5);

    let hasMetro = false;
    let hasTram  = false;
    let hasBus   = false;
    let hasTrolleybus = false;
    const lines = new Set<string>();

    for (const el of elements) {
      const tags = el.tags ?? {};
      const network = (tags.network ?? '').toLowerCase();
      const operator = (tags.operator ?? '').toLowerCase();
      const ref = tags.ref ?? tags['ref:bkk'] ?? '';

      if (tags.station === 'subway' || tags.subway === 'yes' || network.includes('metro')) hasMetro = true;
      if (tags['railway'] === 'tram_stop' || tags['tram'] === 'yes') hasTram = true;
      if (tags['highway'] === 'bus_stop' || tags['bus'] === 'yes') hasBus = true;
      if (operator.includes('troll') || tags['trolleybus'] === 'yes') hasTrolleybus = true;

      if (ref) lines.add(ref);
    }

    let type_bonus = 0;
    if (hasMetro)     type_bonus += 4;
    if (hasTram)      type_bonus += 3;
    if (hasBus)       type_bonus += 2;
    if (hasTrolleybus) type_bonus += 2;
    type_bonus = Math.min(8, type_bonus);

    const density_bonus = lines.size >= 3 ? 4 : 0;

    return Math.min(20, Math.round((stops_score + type_bonus + density_bonus) * 10) / 10);
  } catch {
    return 10;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Cycling (max 15)
// ──────────────────────────────────────────────────────────────────────────────

async function computeCyclingScore(lat: number, lon: number): Promise<number> {
  try {
    const query = `[out:json][timeout:20];(way["highway"="cycleway"](around:300,${lat},${lon});way["cycleway"="lane"](around:300,${lat},${lon});node["amenity"="bicycle_rental"](around:500,${lat},${lon}););out body;>;out skel qt;`;
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return 6;

    const data = await res.json();
    const elements: Array<{ type: string; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string> }> = data?.elements ?? [];

    let totalLaneM = 0;
    let rentalStations = 0;
    let nearestRentalM = 9999;

    for (const el of elements) {
      if (el.tags?.amenity === 'bicycle_rental') {
        rentalStations++;
        if (el.lat !== undefined && el.lon !== undefined) {
          const d = haversineM(lat, lon, el.lat, el.lon);
          if (d < nearestRentalM) nearestRentalM = d;
        }
      } else if (el.type === 'way' && el.nodes) {
        // Rough lane length: node count * ~25m per segment
        totalLaneM += el.nodes.length * 25;
      }
    }

    const lane_score   = Math.min(8, totalLaneM / 200);
    const rental_score = Math.min(4, rentalStations * 2);
    const bubi_score   = nearestRentalM <= 300 ? 3 : 0;

    return Math.min(15, Math.round((lane_score + rental_score + bubi_score) * 10) / 10);
  } catch {
    return 6;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Noise (max 10)
// ──────────────────────────────────────────────────────────────────────────────

async function computeNoiseScore(lat: number, lon: number): Promise<number> {
  try {
    const query = `[out:json][timeout:20];(way["highway"~"motorway|trunk|primary|secondary"](around:150,${lat},${lon}););out body;`;
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return 5;

    const data = await res.json();
    const major_roads = (data?.elements ?? []).length;

    return Math.max(0, 10 - major_roads * 3);
  } catch {
    return 5;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Urban Heat Island (max 10)
// ──────────────────────────────────────────────────────────────────────────────

async function computeUhiScore(lat: number, lon: number): Promise<number> {
  try {
    const query = `[out:json][timeout:20];(way["building"](around:200,${lat},${lon}););out body;>;out skel qt;`;
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return 5;

    const data = await res.json();
    const buildings = (data?.elements ?? []).filter((e: { type: string }) => e.type === 'way').length;

    return Math.max(0, 10 - Math.floor(buildings / 5));
  } catch {
    return 5;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Badge helper
// ──────────────────────────────────────────────────────────────────────────────

function getBadge(total: number): string {
  if (total >= 85) return 'Platina';
  if (total >= 70) return 'Arany';
  if (total >= 55) return 'Ezüst';
  if (total >= 40) return 'Bronz';
  return 'Fejlesztendő';
}

// ──────────────────────────────────────────────────────────────────────────────
// Haversine distance in metres
// ──────────────────────────────────────────────────────────────────────────────

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ──────────────────────────────────────────────────────────────────────────────
// Route handler
// ──────────────────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: { buildingId: string } }
): Promise<NextResponse> {
  const { buildingId: workspaceId } = params;

  if (!UUID_REGEX.test(workspaceId)) {
    return NextResponse.json({ error: 'Invalid workspaceId' }, { status: 400 });
  }

  let physicalBuildingId: string;
  try {
    const context = await requireWorkspaceCapability(workspaceId, 'environment.read');
    physicalBuildingId = context.primaryBuildingId;
  } catch (error) {
    const status = error instanceof WorkspaceAuthorizationError && error.code === 'AUTH_REQUIRED' ? 401 : 403;
    return NextResponse.json({ error: status === 401 ? 'Unauthorized' : 'Forbidden' }, { status });
  }

  const supabase = createClient();
  // Fetch building coordinates
  const { data: building } = await supabase
    .from('buildings')
    .select('id, address, lat, lon')
    .eq('id', physicalBuildingId)
    .single();

  if (!building) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  let lat: number = (building as { lat?: number | null }).lat ?? 0;
  let lon: number = (building as { lon?: number | null }).lon ?? 0;

  // Geocode if no coords stored
  if (!lat || !lon) {
    try {
      const geoParams = new URLSearchParams({
        q: building.address,
        format: 'json',
        countrycodes: 'hu',
        limit: '1',
        addressdetails: '0',
      });
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?${geoParams}`,
        {
          headers: {
            'User-Agent': 'panellako.hu/1.0 (contact via panellako.hu)',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
          next: { revalidate: 86400 },
        }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (Array.isArray(geoData) && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lon = parseFloat(geoData[0].lon);
        }
      }
    } catch { /* use Budapest fallback */ }

    if (!lat || !lon) {
      lat = 47.4979;
      lon = 19.0402;
    }
  }

  // Compute all 6 sub-scores in parallel
  const [
    airResult,
    greenRaw,
    transitRaw,
    cyclingRaw,
    noiseRaw,
    uhiRaw,
  ] = await Promise.all([
    computeAirScore(lat, lon),
    computeGreenScore(lat, lon),
    computeTransitScore(lat, lon),
    computeCyclingScore(lat, lon),
    computeNoiseScore(lat, lon),
    computeUhiScore(lat, lon),
  ]);

  const air     = Math.min(25, Math.max(0, airResult.score));
  const green   = Math.min(20, Math.max(0, greenRaw));
  const transit = Math.min(20, Math.max(0, transitRaw));
  const cycling = Math.min(15, Math.max(0, cyclingRaw));
  const noise   = Math.min(10, Math.max(0, noiseRaw));
  const uhi     = Math.min(10, Math.max(0, uhiRaw));

  const total = Math.round(air + green + transit + cycling + noise + uhi);

  const result: GreenBuildingScore = {
    total,
    air:          Math.round(air * 10) / 10,
    green:        Math.round(green * 10) / 10,
    transit:      Math.round(transit * 10) / 10,
    cycling:      Math.round(cycling * 10) / 10,
    noise:        Math.round(noise * 10) / 10,
    uhi:          Math.round(uhi * 10) / 10,
    badge:        getBadge(total),
    airEstimated: airResult.estimated,
    lat,
    lon,
    computedAt: new Date().toISOString(),
  };

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
