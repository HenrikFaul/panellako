import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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
[out:json][timeout:15];
(
  node["amenity"="townhall"](around:5000,${lat},${lon});
  way["amenity"="townhall"](around:5000,${lat},${lon});
  node["amenity"~"^(school|college|university)$"](around:3000,${lat},${lon});
  way["amenity"~"^(school|college|university)$"](around:3000,${lat},${lon});
  node["amenity"="kindergarten"](around:2500,${lat},${lon});
  way["amenity"="kindergarten"](around:2500,${lat},${lon});
  node["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy|optician|physiotherapist|blood_bank|health_post|nursing_home|veterinary)$"](around:3000,${lat},${lon});
  way["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy|optician|physiotherapist|blood_bank|health_post|nursing_home|veterinary)$"](around:3000,${lat},${lon});
  node["healthcare"](around:3000,${lat},${lon});
  way["healthcare"](around:3000,${lat},${lon});
  node["social_facility"](around:2000,${lat},${lon});
  way["social_facility"](around:2000,${lat},${lon});
);
out center qt;
  `.trim();

  const mirrors = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
  ];

  let elements: OverpassElement[] = [];
  let fetched = false;
  for (const mirror of mirrors) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(9_000),
      });
      if (!res.ok) continue;
      const data = await res.json() as { elements?: OverpassElement[]; remark?: string };
      if (data.remark && /runtime error|timeout|Query timed out/i.test(data.remark)) continue;
      elements = data.elements ?? [];
      fetched = true;
      break;
    } catch { continue; }
  }
  if (!fetched) throw new Error('All Overpass mirrors failed');

  const HEALTHCARE_SUBTYPES: Record<string, string> = {
    hospital: 'Kórház', clinic: 'Klinika / rendelő', doctors: 'Orvosi rendelő',
    dentist: 'Fogorvos', pharmacy: 'Gyógyszertár', optician: 'Szemészet',
    physiotherapist: 'Gyógytornász / fizioterapeuta', blood_bank: 'Véradó',
    health_post: 'Egészségügyi állomás', nursing_home: 'Ápolási otthon',
    veterinary: 'Állatorvos', social_facility: 'Szociális intézmény',
  };

  const toService = (el: OverpassElement, category: PublicService['category']): PublicService | null => {
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (!elLat || !elLon) return null;
    const tags = el.tags ?? {};
    const name = tags['name'] || tags['name:hu'] || tags['operator'] || tags['amenity'] || category;
    const amenityTag = tags['amenity'] ?? '';
    const healthcareTag = tags['healthcare'] ?? '';
    const subcategoryMap: Record<string, string> = {
      school: 'Általános / középiskola', college: 'Főiskola', university: 'Egyetem',
      kindergarten: 'Óvoda', townhall: 'Polgármesteri hivatal',
      ...HEALTHCARE_SUBTYPES,
    };
    const subcategory = subcategoryMap[amenityTag] ?? subcategoryMap[healthcareTag]
      ?? (healthcareTag ? 'Egészségügyi intézmény' : undefined);
    return {
      id:          `${el.type}/${el.id}`,
      name,
      category,
      subcategory,
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
    const healthcareTag = el.tags?.['healthcare'] ?? '';
    const socialFacility = el.tags?.['social_facility'] ?? '';

    if (amenity === 'townhall') {
      const s = toService(el, 'townhall'); if (s) townhalls.push(s);
    } else if (['school','college','university'].includes(amenity)) {
      const s = toService(el, 'school'); if (s) schools.push(s);
    } else if (amenity === 'kindergarten') {
      const s = toService(el, 'kindergarten'); if (s) kindergartens.push(s);
    } else if ([
      'hospital','clinic','doctors','dentist','pharmacy','optician',
      'physiotherapist','blood_bank','health_post','nursing_home','veterinary',
    ].includes(amenity) || healthcareTag || socialFacility) {
      const s = toService(el, 'healthcare'); if (s) healthcare.push(s);
    }
  }

  const byDist = (a: PublicService, b: PublicService) => a.distanceM - b.distanceM;
  return {
    townhalls:     townhalls.sort(byDist).slice(0, 10),
    schools:       schools.sort(byDist).slice(0, 20),
    kindergartens: kindergartens.sort(byDist).slice(0, 20),
    healthcare:    healthcare.sort(byDist).slice(0, 40),
    fetchedAt:     new Date().toISOString(),
    source:        'overpass',
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const buildingId = searchParams.get('buildingId') ?? '';
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');
  const force = searchParams.get('force') === '1';

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'lat/lon required' }, { status: 400 });
  }

  // Try DB cache first (skipped when force=1)
  if (buildingId && !force) {
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
