import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AmenityDetail {
  category:  string;
  label:     string;
  count:     number;
  nearestM:  number | null;
  icon:      string;
}

export interface CompactCityData {
  walkabilityScore:    number;
  transitScore:        number;
  mixedUseScore:       number;
  score15min:          number;
  amenities:           AmenityDetail[];
  nearestSupermarketM: number | null;
  nearestPharmacyM:    number | null;
  nearestSchoolM:      number | null;
  transitStops500m:    number;
  source:              'cache' | 'overpass';
  computedAt:          string;
}

export interface LiveabilityDimension {
  key:   string;
  label: string;
  score: number;
  icon:  string;
  color: string;
}

export interface LiveabilityData {
  totalScore:  number;
  label:       string;
  labelColor:  string;
  dimensions:  LiveabilityDimension[];
  source:      'cache' | 'overpass';
  computedAt:  string;
}

export interface UrbanData {
  compactCity:  CompactCityData;
  liveability:  LiveabilityData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function supabaseClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim();
  const key  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── OSM element typing ───────────────────────────────────────────────────────

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function elemCoords(el: OsmElement): { lat: number; lon: number } | null {
  if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
    return { lat: el.lat, lon: el.lon };
  }
  if (el.center) return el.center;
  return null;
}

// ─── Amenity classification ───────────────────────────────────────────────────

type AmenityCategory =
  | 'supermarket' | 'pharmacy' | 'bakery' | 'daily'
  | 'school' | 'education'
  | 'hospital' | 'healthcare'
  | 'restaurant' | 'cafe' | 'food'
  | 'culture'
  | 'sport'
  | 'safety'
  | 'services';

function classifyElement(tags: Record<string, string>): AmenityCategory | null {
  const a = tags.amenity ?? '';
  const s = tags.shop ?? '';
  const l = tags.leisure ?? '';

  if (/supermarket/i.test(a) || /supermarket|grocery/i.test(s)) return 'supermarket';
  if (/pharmacy/i.test(a))                                         return 'pharmacy';
  if (/bakery|butcher|greengrocer|convenience/i.test(s))          return 'bakery';
  if (/hospital|clinic/i.test(a))                                  return 'hospital';
  if (/doctor|dentist/i.test(a))                                   return 'healthcare';
  if (/school|kindergarten/i.test(a))                              return 'school';
  if (/university|college|library/i.test(a))                       return 'education';
  if (/restaurant|fast_food|food_court/i.test(a))                  return 'restaurant';
  if (/cafe|bar/i.test(a))                                         return 'cafe';
  if (/theatre|cinema|museum|gallery|arts_centre|community_centre/i.test(a)) return 'culture';
  if (/fitness_centre|sports_centre|swimming_pool/i.test(l))       return 'sport';
  if (/police|fire_station/i.test(a))                              return 'safety';
  if (/bank|post_office|atm/i.test(a))                             return 'services';
  if (s) return 'daily';
  return null;
}

// ─── Overpass query ───────────────────────────────────────────────────────────

async function fetchAmenities(lat: number, lon: number): Promise<OsmElement[]> {
  const query = `[out:json][timeout:30];
(
  node["amenity"~"supermarket|pharmacy|hospital|clinic|doctor|dentist|school|kindergarten|university|college|library|restaurant|cafe|fast_food|food_court|bar|theatre|cinema|museum|gallery|arts_centre|community_centre|police|fire_station|bank|post_office|atm"](around:1500,${lat},${lon});
  node["shop"~"supermarket|convenience|bakery|butcher|greengrocer|grocery"](around:1000,${lat},${lon});
  node["leisure"~"fitness_centre|sports_centre|swimming_pool"](around:1000,${lat},${lon});
  way["amenity"~"hospital|clinic|school|university|theatre|cinema|museum|sports_centre"](around:1500,${lat},${lon});
);
out center;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `data=${encodeURIComponent(query)}`,
    signal:  AbortSignal.timeout(35_000),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const json = await res.json() as { elements?: OsmElement[] };
  return json.elements ?? [];
}

// ─── Score computation ────────────────────────────────────────────────────────

interface AmenityRecord { cat: AmenityCategory; distM: number; name: string }

function computeScores(
  elements: OsmElement[],
  lat: number, lon: number,
  transitCount: number,
) {
  const records: AmenityRecord[] = [];
  for (const el of elements) {
    const coords = elemCoords(el);
    if (!coords || !el.tags) continue;
    const cat = classifyElement(el.tags);
    if (!cat) continue;
    const distM = haversineM(lat, lon, coords.lat, coords.lon);
    records.push({ cat, distM, name: el.tags.name ?? '' });
  }

  // --- Walkability (Walk Score–inspired decay) --------------------------------
  const DECAY = (dist: number, d0: number) => Math.exp(-dist / d0);

  let ws = 0;
  let nearestSupermarket: number | null = null;
  let nearestPharmacy:    number | null = null;
  let nearestSchool:      number | null = null;

  for (const r of records) {
    if (r.distM > 1500) continue;
    if (r.cat === 'supermarket') {
      ws += 25 * DECAY(r.distM, 400);
      nearestSupermarket = nearestSupermarket === null ? r.distM : Math.min(nearestSupermarket, r.distM);
    } else if (r.cat === 'pharmacy') {
      ws += 20 * DECAY(r.distM, 300);
      nearestPharmacy = nearestPharmacy === null ? r.distM : Math.min(nearestPharmacy, r.distM);
    } else if (r.cat === 'bakery' || r.cat === 'daily') {
      ws += 6 * DECAY(r.distM, 300);
    } else if (r.cat === 'school') {
      ws += 15 * DECAY(r.distM, 500);
      nearestSchool = nearestSchool === null ? r.distM : Math.min(nearestSchool, r.distM);
    } else if (r.cat === 'education') {
      ws += 8 * DECAY(r.distM, 600);
    } else if (r.cat === 'hospital') {
      ws += 10 * DECAY(r.distM, 700);
    } else if (r.cat === 'healthcare') {
      ws += 7 * DECAY(r.distM, 400);
    } else if (r.cat === 'restaurant') {
      ws += Math.min(8, 4 * DECAY(r.distM, 200));
    } else if (r.cat === 'cafe') {
      ws += Math.min(5, 3 * DECAY(r.distM, 200));
    }
  }
  const walkabilityScore = Math.min(100, Math.round(ws));

  // --- Transit ---------------------------------------------------------------
  const transitScore = Math.min(100, transitCount * 13);

  // --- Mixed-use diversity ---------------------------------------------------
  const presentCats = new Set(records.filter(r => r.distM <= 800).map(r => r.cat));
  const CATS_TOTAL  = 8;
  const mixedUseScore = Math.round((presentCats.size / CATS_TOTAL) * 100);

  // --- 15-min city score -----------------------------------------------------
  const score15min = Math.round((walkabilityScore * 0.45 + transitScore * 0.35 + mixedUseScore * 0.20));

  // --- Amenity detail rows ---------------------------------------------------
  const countOf = (cats: AmenityCategory[]) => records.filter(r => cats.includes(r.cat)).length;
  const nearest = (cats: AmenityCategory[]) => {
    const mins = records.filter(r => cats.includes(r.cat)).map(r => r.distM);
    return mins.length ? Math.round(Math.min(...mins)) : null;
  };

  const amenities: AmenityDetail[] = [
    { category: 'food',      label: 'Élelmiszer',     count: countOf(['supermarket','bakery','daily']), nearestM: nearest(['supermarket']), icon: '🛒' },
    { category: 'health',    label: 'Egészségügy',    count: countOf(['pharmacy','hospital','healthcare']), nearestM: nearest(['pharmacy']), icon: '💊' },
    { category: 'education', label: 'Oktatás',        count: countOf(['school','education']), nearestM: nearest(['school','education']), icon: '🏫' },
    { category: 'dining',    label: 'Vendéglátás',    count: countOf(['restaurant','cafe','food']), nearestM: nearest(['restaurant','cafe']), icon: '🍽️' },
    { category: 'culture',   label: 'Kultúra',        count: countOf(['culture']), nearestM: nearest(['culture']), icon: '🎭' },
    { category: 'sport',     label: 'Sport',          count: countOf(['sport']), nearestM: nearest(['sport']), icon: '⚽' },
  ];

  // --- Liveability dimensions ------------------------------------------------
  const healthScore = Math.min(100, Math.round(
    (countOf(['hospital']) > 0 ? 40 * DECAY(nearest(['hospital']) ?? 2000, 800) : 0)
    + (countOf(['pharmacy']) > 0 ? 30 * DECAY(nearest(['pharmacy']) ?? 1000, 400) : 0)
    + (countOf(['healthcare']) > 0 ? 20 * DECAY(nearest(['healthcare']) ?? 800, 400) : 0)
    + 10,
  ));

  const edScore = Math.min(100, Math.round(
    (countOf(['school','education']) > 0 ? 50 * DECAY(nearest(['school','education']) ?? 1500, 600) : 0)
    + Math.min(40, countOf(['school','education']) * 15)
    + 10,
  ));

  const cultureScore = Math.min(100, Math.round(
    Math.min(60, countOf(['culture']) * 20)
    + Math.min(30, countOf(['sport']) * 15)
    + 10,
  ));

  const servicesScore = Math.min(100, Math.round(
    Math.min(50, countOf(['restaurant','cafe','food']) * 5)
    + Math.min(30, countOf(['supermarket','bakery','daily']) * 10)
    + Math.min(20, countOf(['services']) * 10),
  ));

  const safetyBase = countOf(['safety']);
  const policeNearest = nearest(['safety']);
  const safetyScore = Math.min(100, Math.round(
    40
    + (safetyBase > 0 ? 40 * DECAY(policeNearest ?? 3000, 1500) : 0)
    + Math.min(20, transitCount * 3),
  ));

  return {
    walkabilityScore, transitScore, mixedUseScore, score15min,
    amenities,
    nearestSupermarket: nearestSupermarket !== null ? Math.round(nearestSupermarket) : null,
    nearestPharmacy:    nearestPharmacy    !== null ? Math.round(nearestPharmacy)    : null,
    nearestSchool:      nearestSchool      !== null ? Math.round(nearestSchool)      : null,
    healthScore, edScore, cultureScore, servicesScore, safetyScore,
    totalFood:   countOf(['supermarket','bakery','daily']),
    totalHealth: countOf(['pharmacy','hospital','healthcare']),
    totalEd:     countOf(['school','education']),
    totalFood2:  countOf(['restaurant','cafe','food']),
    totalCulture:countOf(['culture']),
  };
}

function liveabilityLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Kiváló lakókörnyezet',  color: '#22c55e' };
  if (score >= 65) return { label: 'Jó lakókörnyezet',      color: '#84cc16' };
  if (score >= 50) return { label: 'Átlagos',               color: '#eab308' };
  return               { label: 'Fejlesztendő',             color: '#f97316' };
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

  const supabase = buildingId ? supabaseClient() : null;

  // ── 1. Check DB cache (30-day TTL) ─────────────────────────────────────────
  if (supabase && buildingId) {
    const [{ data: cc }, { data: lc }] = await Promise.all([
      supabase
        .from('building_compact_city_cache')
        .select('*')
        .eq('building_id', buildingId)
        .gt('computed_at', new Date(Date.now() - 30 * 24 * 3600_000).toISOString())
        .maybeSingle(),
      supabase
        .from('building_liveability_cache')
        .select('*')
        .eq('building_id', buildingId)
        .gt('computed_at', new Date(Date.now() - 30 * 24 * 3600_000).toISOString())
        .maybeSingle(),
    ]);

    if (cc && lc) {
      const lvLabel = liveabilityLabel(lc.total_score as number);
      const result: UrbanData = {
        compactCity: {
          walkabilityScore:    cc.walkability_score as number,
          transitScore:        cc.transit_score as number,
          mixedUseScore:       cc.mixed_use_score as number,
          score15min:          cc.score_15min as number,
          amenities: [
            { category: 'food',      label: 'Élelmiszer',  count: cc.daily_needs_count ?? 0,  nearestM: cc.nearest_supermarket_m, icon: '🛒' },
            { category: 'health',    label: 'Egészségügy', count: cc.healthcare_count ?? 0,    nearestM: cc.nearest_pharmacy_m,    icon: '💊' },
            { category: 'education', label: 'Oktatás',     count: cc.education_count ?? 0,     nearestM: cc.nearest_school_m,      icon: '🏫' },
            { category: 'dining',    label: 'Vendéglátás', count: cc.food_count ?? 0,          nearestM: null,                     icon: '🍽️' },
            { category: 'culture',   label: 'Kultúra',     count: cc.culture_count ?? 0,       nearestM: null,                     icon: '🎭' },
            { category: 'sport',     label: 'Sport',       count: cc.shop_count ?? 0,          nearestM: null,                     icon: '⚽' },
          ],
          nearestSupermarketM: cc.nearest_supermarket_m,
          nearestPharmacyM:    cc.nearest_pharmacy_m,
          nearestSchoolM:      cc.nearest_school_m,
          transitStops500m:    cc.transit_stops_500m ?? 0,
          source: 'cache', computedAt: cc.computed_at as string,
        },
        liveability: {
          totalScore:  lc.total_score as number,
          label:       lvLabel.label,
          labelColor:  lvLabel.color,
          dimensions: [
            { key: 'greenAir',   label: 'Zöld & Levegő', score: lc.green_air_score   ?? 50, icon: '🌿', color: '#22c55e' },
            { key: 'health',     label: 'Egészségügy',   score: lc.healthcare_score  ?? 50, icon: '🏥', color: '#60a5fa' },
            { key: 'education',  label: 'Oktatás',       score: lc.education_score   ?? 50, icon: '🎓', color: '#a78bfa' },
            { key: 'culture',    label: 'Kultúra',       score: lc.culture_score     ?? 50, icon: '🎭', color: '#f472b6' },
            { key: 'services',   label: 'Szolgáltatások',score: lc.services_score    ?? 50, icon: '🛒', color: '#fb923c' },
            { key: 'safety',     label: 'Biztonság',     score: lc.safety_score      ?? 50, icon: '🛡️', color: '#eab308' },
          ],
          source: 'cache', computedAt: lc.computed_at as string,
        },
      };
      return NextResponse.json(result);
    }
  }

  // ── 2. Live Overpass query ─────────────────────────────────────────────────
  let elements: OsmElement[];
  try {
    elements = await fetchAmenities(lat, lon);
  } catch {
    return NextResponse.json({ error: 'Overpass unavailable' }, { status: 503 });
  }

  // ── 3. Transit stops count from DB ────────────────────────────────────────
  let transitCount = 0;
  if (supabase) {
    const { count } = await supabase
      .from('transit_stops')
      .select('*', { count: 'exact', head: true })
      .gte('lat', lat - 0.0045)
      .lte('lat', lat + 0.0045)
      .gte('lon', lon - 0.0060)
      .lte('lon', lon + 0.0060);
    transitCount = count ?? 0;
  }

  // ── 4. Get green/AQ scores from existing caches (best-effort) ─────────────
  let greenAirScore = 50;
  if (supabase && buildingId) {
    const [{ data: gc }, { data: sc }] = await Promise.all([
      supabase.from('building_green_cache').select('green_score').eq('building_id', buildingId).maybeSingle(),
      supabase.from('building_env_score').select('air_score').eq('building_id', buildingId).maybeSingle(),
    ]);
    const greenS = (gc?.green_score as number | null) ?? 50;
    const airS   = (sc?.air_score   as number | null) ?? 50;
    greenAirScore = Math.round((greenS * 0.6 + airS * 0.4));
  }

  // ── 5. Compute scores ──────────────────────────────────────────────────────
  const s = computeScores(elements, lat, lon, transitCount);

  const lvTotal = Math.round(
    (greenAirScore  * 0.20)
    + (s.healthScore  * 0.20)
    + (s.edScore      * 0.15)
    + (s.cultureScore * 0.15)
    + (s.servicesScore* 0.15)
    + (s.safetyScore  * 0.15),
  );
  const lvLabel = liveabilityLabel(lvTotal);

  // ── 6. Upsert both caches ─────────────────────────────────────────────────
  if (supabase && buildingId) {
    await Promise.all([
      supabase.from('building_compact_city_cache').upsert({
        building_id:           buildingId,
        walkability_score:     s.walkabilityScore,
        transit_score:         s.transitScore,
        mixed_use_score:       s.mixedUseScore,
        score_15min:           s.score15min,
        daily_needs_count:     s.totalFood,
        education_count:       s.totalEd,
        healthcare_count:      s.totalHealth,
        food_count:            s.totalFood2,
        culture_count:         s.totalCulture,
        nearest_supermarket_m: s.nearestSupermarket,
        nearest_pharmacy_m:    s.nearestPharmacy,
        nearest_school_m:      s.nearestSchool,
        transit_stops_500m:    transitCount,
        computed_at:           new Date().toISOString(),
      }, { onConflict: 'building_id' }),
      supabase.from('building_liveability_cache').upsert({
        building_id:      buildingId,
        total_score:      lvTotal,
        green_air_score:  greenAirScore,
        healthcare_score: s.healthScore,
        education_score:  s.edScore,
        culture_score:    s.cultureScore,
        services_score:   s.servicesScore,
        safety_score:     s.safetyScore,
        label:            lvLabel.label,
        computed_at:      new Date().toISOString(),
      }, { onConflict: 'building_id' }),
    ]);
  }

  // ── 7. Build response ──────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const result: UrbanData = {
    compactCity: {
      walkabilityScore:    s.walkabilityScore,
      transitScore:        s.transitScore,
      mixedUseScore:       s.mixedUseScore,
      score15min:          s.score15min,
      amenities:           s.amenities,
      nearestSupermarketM: s.nearestSupermarket,
      nearestPharmacyM:    s.nearestPharmacy,
      nearestSchoolM:      s.nearestSchool,
      transitStops500m:    transitCount,
      source:              'overpass',
      computedAt:          now,
    },
    liveability: {
      totalScore:  lvTotal,
      label:       lvLabel.label,
      labelColor:  lvLabel.color,
      dimensions: [
        { key: 'greenAir',  label: 'Zöld & Levegő', score: greenAirScore,    icon: '🌿', color: '#22c55e' },
        { key: 'health',    label: 'Egészségügy',   score: s.healthScore,    icon: '🏥', color: '#60a5fa' },
        { key: 'education', label: 'Oktatás',        score: s.edScore,        icon: '🎓', color: '#a78bfa' },
        { key: 'culture',   label: 'Kultúra',        score: s.cultureScore,   icon: '🎭', color: '#f472b6' },
        { key: 'services',  label: 'Szolgáltatások', score: s.servicesScore,  icon: '🛒', color: '#fb923c' },
        { key: 'safety',    label: 'Biztonság',      score: s.safetyScore,    icon: '🛡️', color: '#eab308' },
      ],
      source:     'overpass',
      computedAt: now,
    },
  };
  return NextResponse.json(result);
}
