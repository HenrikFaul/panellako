import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface PublicService {
  id:         string;
  name:       string;
  category:   'townhall' | 'school' | 'kindergarten' | 'healthcare';
  subcategory?: string;
  address?:   string;
  phone?:     string;
  website?:   string;
  lat:        number;
  lon:        number;
  distanceM:  number;
}

export interface PublicServicesResult {
  townhalls:      PublicService[];
  schools:        PublicService[];
  kindergartens:  PublicService[];
  healthcare:     PublicService[];
  fetchedAt:      string;
  source:         'cache' | 'overpass' | 'mock';
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function distM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function fetchFromOverpass(lat: number, lon: number): Promise<PublicServicesResult> {
  const query = `
[out:json][timeout:20];
(
  node["amenity"="townhall"](around:5000,${lat},${lon});
  way["amenity"="townhall"](around:5000,${lat},${lon});
  node["amenity"="school"](around:2000,${lat},${lon});
  way["amenity"="school"](around:2000,${lat},${lon});
  node["amenity"="kindergarten"](around:1500,${lat},${lon});
  way["amenity"="kindergarten"](around:1500,${lat},${lon});
  node["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy)$"](around:2500,${lat},${lon});
  way["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy)$"](around:2500,${lat},${lon});
);
out body center;
  `.trim();

  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  let elements: OverpassElement[] = [];
  for (const mirror of mirrors) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(18_000),
      });
      if (!res.ok) continue;
      const data = await res.json() as { elements?: OverpassElement[] };
      elements = data.elements ?? [];
      break;
    } catch { continue; }
  }

  const toService = (el: OverpassElement, category: PublicService['category']): PublicService | null => {
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (!elLat || !elLon) return null;
    const tags = el.tags ?? {};
    const name = tags['name'] || tags['name:hu'] || tags['amenity'] || category;
    const subcategoryMap: Record<string, string> = {
      hospital: 'Kórház', clinic: 'Klinika / rendelő', doctors: 'Orvosi rendelő',
      dentist: 'Fogorvos', pharmacy: 'Gyógyszertár',
      school: 'Általános / középiskola', kindergarten: 'Óvoda', townhall: 'Polgármesteri hivatal',
    };
    return {
      id:          `${el.type}/${el.id}`,
      name,
      category,
      subcategory: subcategoryMap[tags['amenity'] ?? ''],
      address:     [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || undefined,
      phone:       tags['phone'] || tags['contact:phone'] || undefined,
      website:     tags['website'] || tags['contact:website'] || undefined,
      lat:         elLat,
      lon:         elLon,
      distanceM:   distM(lat, lon, elLat, elLon),
    };
  };

  const townhalls:     PublicService[] = [];
  const schools:       PublicService[] = [];
  const kindergartens: PublicService[] = [];
  const healthcare:    PublicService[] = [];

  for (const el of elements) {
    const amenity = el.tags?.['amenity'] ?? '';
    if (amenity === 'townhall') {
      const s = toService(el, 'townhall'); if (s) townhalls.push(s);
    } else if (amenity === 'school') {
      const s = toService(el, 'school'); if (s) schools.push(s);
    } else if (amenity === 'kindergarten') {
      const s = toService(el, 'kindergarten'); if (s) kindergartens.push(s);
    } else if (['hospital','clinic','doctors','dentist','pharmacy'].includes(amenity)) {
      const s = toService(el, 'healthcare'); if (s) healthcare.push(s);
    }
  }

  const byDist = (a: PublicService, b: PublicService) => a.distanceM - b.distanceM;
  return {
    townhalls:     townhalls.sort(byDist).slice(0, 5),
    schools:       schools.sort(byDist).slice(0, 8),
    kindergartens: kindergartens.sort(byDist).slice(0, 8),
    healthcare:    healthcare.sort(byDist).slice(0, 10),
    fetchedAt:     new Date().toISOString(),
    source:        'overpass',
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const buildingId = searchParams.get('buildingId') ?? '';
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'lat/lon required' }, { status: 400 });
  }

  // Try DB cache first
  if (buildingId) {
    try {
      const supabase = createServiceClient();
      if (supabase) {
        const { data: cached } = await supabase
          .from('building_public_services_cache')
          .select('services, fetched_at')
          .eq('building_id', buildingId)
          .maybeSingle();

        if (cached) {
          const age = Date.now() - new Date(cached.fetched_at as string).getTime();
          if (age < CACHE_TTL_MS) {
            return NextResponse.json({ ...(cached.services as object), source: 'cache', fetchedAt: cached.fetched_at });
          }
        }
      }
    } catch { /* cache miss — continue */ }
  }

  // Fetch from Overpass
  try {
    const result = await fetchFromOverpass(lat, lon);

    // Persist to DB cache (fire-and-forget)
    if (buildingId) {
      try {
        const supabase = createServiceClient();
        if (supabase) {
          await supabase.from('building_public_services_cache').upsert({
            building_id: buildingId,
            services: result,
            fetched_at: result.fetchedAt,
          });
        }
      } catch { /* ignore cache write failure */ }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      townhalls: [], schools: [], kindergartens: [], healthcare: [],
      fetchedAt: new Date().toISOString(), source: 'mock',
    } satisfies PublicServicesResult);
  }
}
