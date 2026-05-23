import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface OvEl {
  type: 'node' | 'way';
  id:   number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?:  Record<string, string>;
}

interface OverpassResponse {
  elements: OvEl[];
  remark?:  string;
}

// ─── Overpass mirrors — kumi.systems first (most reliable from Vercel) ─────────
const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

async function fetchOverpass(query: string): Promise<OvEl[]> {
  const body = `data=${encodeURIComponent(query)}`;
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
        signal:  AbortSignal.timeout(25_000),
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} @ ${url}`);
        continue;
      }
      const json = await res.json() as OverpassResponse;
      // Check for server-side timeout remark
      if (json.remark && /timed out/.test(json.remark)) {
        lastErr = new Error(`Overpass timeout @ ${url}: ${json.remark}`);
        continue;
      }
      return json.elements ?? [];
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('All Overpass mirrors failed');
}

// ─── GET /api/environment/residential-zones?lat=X&lon=Y ──────────────────────
export async function GET(request: NextRequest) {
  const sp  = request.nextUrl.searchParams;
  const lat = parseFloat(sp.get('lat') ?? '');
  const lon = parseFloat(sp.get('lon') ?? '');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const POLY_RADIUS = 2200;
  const query = `[out:json][timeout:30];(way["landuse"="residential"](around:${POLY_RADIUS},${lat},${lon}););out body;>;out skel qt;`;

  try {
    const elements = await fetchOverpass(query);
    return NextResponse.json({ elements });
  } catch (err) {
    console.warn('[environment/residential-zones] all mirrors failed:', err);
    return NextResponse.json({ elements: [] });
  }
}
