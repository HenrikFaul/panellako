import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type MatchType = 'exact' | 'house' | 'street' | 'settlement' | 'fuzzy' | 'reverse';
type SuggestionSource = 'supabase' | 'nominatim';

// ─── Nominatim fallback (Magyarország-szintű címkereső) ──────────────────────
// Egyszerű in-memory cache 24h-ra (query -> {suggestions, expiresAt}).
// Per-IP throttling 1 req/sec — Nominatim usage policy.
const NOMINATIM_TTL_MS = 24 * 60 * 60 * 1000;
const nominatimCache = new Map<string, { suggestions: AddressSuggestion[]; expiresAt: number }>();
const nominatimLastHitByIp = new Map<string, number>();

type NominatimRow = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string; town?: string; village?: string; municipality?: string;
    road?: string; pedestrian?: string; house_number?: string;
    postcode?: string; suburb?: string; city_district?: string;
    county?: string; country?: string;
  };
  type?: string;
  importance?: number;
};

async function nominatimFallback(query: string, clientIp: string): Promise<AddressSuggestion[]> {
  const cacheKey = query.trim().toLowerCase();
  const cached = nominatimCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.suggestions;

  // Polite throttle: max 1 req/sec/IP
  const now = Date.now();
  const last = nominatimLastHitByIp.get(clientIp) ?? 0;
  if (now - last < 1000) return [];
  nominatimLastHitByIp.set(clientIp, now);

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&countrycodes=hu&addressdetails=1&limit=8`;
  let data: NominatimRow[] = [];
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'panellako.hu/1.0 (info@panellako.hu)',
        'Accept': 'application/json',
        'Referer': 'https://panellako.hu',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    data = (await res.json()) as NominatimRow[];
  } catch {
    return [];
  }

  const suggestions: AddressSuggestion[] = data.map((r) => {
    const street = r.address?.road || r.address?.pedestrian || '';
    const houseNumber = r.address?.house_number || '';
    const settlement = r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || '';
    const district = r.address?.city_district || r.address?.suburb || '';
    const postcode = r.address?.postcode || '';
    return {
      id: `nominatim:${r.place_id}`,
      label: r.display_name,
      countryCode: 'HU',
      postcode,
      settlement,
      street: street + (street && r.address?.pedestrian && !r.address?.road ? '' : ''),
      district,
      houseNumber,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      confidence: typeof r.importance === 'number' ? Math.max(0.05, Math.min(0.99, r.importance)) : 0.5,
      matchType: 'fuzzy' as MatchType,
      source: 'nominatim' as SuggestionSource,
    };
  });

  nominatimCache.set(cacheKey, { suggestions, expiresAt: Date.now() + NOMINATIM_TTL_MS });
  // Cap cache size
  if (nominatimCache.size > 500) {
    const oldestKey = nominatimCache.keys().next().value;
    if (oldestKey !== undefined) nominatimCache.delete(oldestKey);
  }
  return suggestions;
}

const geodataSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const geodataSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const addressSchema = process.env.SUPABASE_ADDRESS_SCHEMA || 'public';
const addressTable = process.env.SUPABASE_ADDRESS_TABLE || 'osm_addresses';
const hasSupabaseConfig = Boolean(geodataSupabaseUrl && geodataSupabaseKey);

const supabase = hasSupabaseConfig
  ? createClient(geodataSupabaseUrl!, geodataSupabaseKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: addressSchema }
    })
  : null;

type OsmAddressRow = {
  id: number | string | null;
  external_id: string | null;
  country: string | null;
  country_code: string | null;
  display_name: string | null;
  name: string | null;
  street: string | null;
  street_name: string | null;
  street_type: string | null;
  street_type_normalized: string | null;
  house_number: string | null;
  housenumber: string | null;
  house_number_suffix: string | null;
  conscriptionnumber: string | null;
  city: string | null;
  town: string | null;
  village: string | null;
  municipality: string | null;
  district: string | null;
  suburb: string | null;
  neighbourhood: string | null;
  hamlet: string | null;
  postcode: string | null;
  place: string | null;
  lat: number | null;
  lon: number | null;
  geometry_type: string | null;
};

type AddressSuggestion = {
  id: string;
  label: string;
  countryCode: string;
  postcode: string;
  settlement: string;
  street: string;
  district?: string;
  houseNumber: string;
  lat: number | null;
  lon: number | null;
  confidence: number;
  matchType: MatchType;
  source: SuggestionSource;
};

const SELECT_COLUMNS = [
  'id', 'external_id', 'country', 'country_code', 'display_name', 'name', 'street', 'street_name', 'street_type',
  'street_type_normalized', 'house_number', 'housenumber', 'house_number_suffix', 'conscriptionnumber', 'city', 'town',
  'village', 'municipality', 'district', 'suburb', 'neighbourhood', 'hamlet', 'postcode', 'place', 'lat', 'lon', 'geometry_type'
].join(',');

const GENERIC_ADDRESS_WORDS = new Set([
  'utca', 'u', 'ut', 'út', 'ter', 'tér', 'koz', 'köz', 'korut', 'körút', 'krt', 'sor', 'setany', 'sétány',
  'lakotelep', 'lakótelep', 'dulo', 'dűlő', 'park', 'part', 'rakpart', 'fasor', 'lejto', 'lejtő', 'orszag', 'ország',
  'magyarorszag', 'magyarország', 'hu', 'hungary', 'emelet', 'ajtó', 'ajto'
]);

const CITY_ALIASES: Record<string, string> = { bp: 'budapest', bpe: 'budapest', pest: 'budapest' };
const STREET_TYPE_ALIASES: Record<string, string> = { u: 'utca', 'u.': 'utca', ut: 'út', 'ut.': 'út', krt: 'körút', 'krt.': 'körút', ter: 'tér', koz: 'köz' };
const ROMAN_DISTRICTS: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10', xi: '11', xii: '12', xiii: '13', xiv: '14', xv: '15', xvi: '16', xvii: '17', xviii: '18', xix: '19', xx: '20', xxi: '21', xxii: '22', xxiii: '23' };

function safeDecode(value: string) {
  let current = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(current.replace(/%(?![0-9a-fA-F]{2})/g, '%25'));
      if (decoded === current) break;
      current = decoded;
    } catch { break; }
  }
  return current.replace(/%20/gi, ' ').replace(/%2c/gi, ',').replace(/%40/gi, '@').replace(/%/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanPart(value?: string | number | null) {
  return value === null || value === undefined ? '' : safeDecode(String(value)).replace(/\s+,/g, ',').trim();
}

function stripDiacritics(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function normalizeText(value: string) {
  return stripDiacritics(safeDecode(value)).toLowerCase().replace(/[.,;:()[\]{}]/g, ' ').replace(/[/-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeToken(token: string) {
  const normalized = normalizeText(token);
  return CITY_ALIASES[normalized] || STREET_TYPE_ALIASES[normalized] || ROMAN_DISTRICTS[normalized] || normalized;
}

function getSettlement(row: OsmAddressRow) {
  return cleanPart(row.city || row.town || row.village || row.municipality || row.place || row.hamlet || row.suburb || row.district || row.neighbourhood);
}

function getStreet(row: OsmAddressRow) {
  const streetName = cleanPart(row.street_name || row.street);
  const streetType = cleanPart(row.street_type_normalized || row.street_type);
  if (!streetName) return '';
  if (!streetType || normalizeText(streetName).endsWith(` ${normalizeText(streetType)}`)) return streetName;
  return `${streetName} ${streetType}`.trim();
}

function getHouseNumber(row: OsmAddressRow) {
  const house = cleanPart(row.house_number || row.housenumber);
  const suffix = cleanPart(row.house_number_suffix);
  if (house && suffix && house.endsWith('-')) return `${house}${suffix}`;
  return [house, suffix].filter(Boolean).join('') || cleanPart(row.conscriptionnumber);
}

function makeLabel(row: OsmAddressRow) {
  const countryCode = cleanPart(row.country_code || row.country || 'HU').toUpperCase();
  const postcode = cleanPart(row.postcode);
  const settlement = getSettlement(row);
  const street = getStreet(row);
  const houseNumber = getHouseNumber(row);
  const main = [postcode, settlement].filter(Boolean).join(' ');
  const addressLine = [street, houseNumber].filter(Boolean).join(' ');
  const structured = [countryCode, main, addressLine].filter(Boolean).join(', ');
  return structured && (settlement || street) ? structured : cleanPart(row.display_name);
}

function rowSearchText(row: OsmAddressRow) {
  return normalizeText([
    row.display_name, row.name, row.country_code, row.country, row.postcode, row.city, row.town, row.village, row.municipality,
    row.district, row.suburb, row.neighbourhood, row.hamlet, row.place, row.street, row.street_name, row.street_type,
    row.street_type_normalized, row.house_number, row.housenumber, row.house_number_suffix, row.conscriptionnumber
  ].map(cleanPart).filter(Boolean).join(' '));
}

function tokenize(rawQuery: string) {
  const rawTokens = safeDecode(rawQuery).toLowerCase().replace(/[.,;:()[\]{}]/g, ' ').split(/\s+/).map((token) => token.trim()).filter(Boolean).slice(0, 12);
  const normalizedTokens = rawTokens.map(normalizeToken).filter(Boolean);
  const houseNumber = [...normalizedTokens].reverse().find((token) => /^\d+[a-z]?$/i.test(token)) || null;
  const postcode = normalizedTokens.find((token) => /^\d{4}$/.test(token)) || null;
  const cityTokens = normalizedTokens.filter((token) => token === 'budapest' || token === 'bp' || token === 'pest');
  const streetTypeTokens = normalizedTokens.filter((token) => GENERIC_ADDRESS_WORDS.has(token));
  const importantTextTokens = normalizedTokens.filter((token) => token.length > 1 && !GENERIC_ADDRESS_WORDS.has(token) && !/^\d+[a-z]?$/i.test(token) && !/^\d{4}$/.test(token));
  return { rawTokens, normalizedTokens, houseNumber, postcode, cityTokens, streetTypeTokens, importantTextTokens, normalizedQuery: normalizedTokens.join(' ') };
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 0; i < a.length; i += 1) {
    current[0] = i + 1;
    for (let j = 0; j < b.length; j += 1) current[j + 1] = Math.min(current[j] + 1, previous[j + 1] + 1, previous[j] + (a[i] === b[j] ? 0 : 1));
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

function tokenMatches(token: string, text: string) {
  if (!token) return false;
  if (text.includes(token)) return true;
  return text.split(' ').filter(Boolean).some((word) => word.startsWith(token) || token.startsWith(word) || (token.length >= 5 && word.length >= 5 && levenshtein(token, word) <= 1) || (token.length >= 7 && word.length >= 7 && levenshtein(token, word) <= 2));
}

function houseNumberMatches(queryHouse: string | null, rowHouse: string) {
  if (!queryHouse) return true;
  if (!rowHouse) return false;
  const queryNumber = queryHouse.match(/\d+/)?.[0];
  const rowNumbers: string[] = rowHouse.match(/\d+/g) ?? [];
  return rowHouse === queryHouse || Boolean(queryNumber && rowNumbers.includes(queryNumber));
}

function scoreAddress(row: OsmAddressRow, rawQuery: string) {
  const parsed = tokenize(rawQuery);
  const label = makeLabel(row);
  const labelText = normalizeText(label);
  const searchable = rowSearchText(row);
  const settlement = normalizeText(getSettlement(row));
  const street = normalizeText(getStreet(row));
  const postcode = normalizeText(cleanPart(row.postcode));
  const rowHouseNumber = normalizeText(getHouseNumber(row));
  let score = 0;
  let matchType: MatchType = 'fuzzy';
  if (labelText === parsed.normalizedQuery || searchable === parsed.normalizedQuery) { score += 8000; matchType = 'exact'; }
  if (parsed.postcode && postcode === parsed.postcode) score += 1200;
  if (parsed.cityTokens.length && settlement === 'budapest') score += 850;
  const missingImportantTokens = parsed.importantTextTokens.filter((token) => !tokenMatches(token, searchable));
  if (missingImportantTokens.length) score -= missingImportantTokens.length * 2500;
  for (const token of parsed.importantTextTokens) {
    if (street === token) { score += 1800; matchType = 'street'; }
    else if (street.startsWith(token)) { score += 1400; matchType = 'street'; }
    else if (tokenMatches(token, street)) { score += 950; matchType = 'street'; }
    else if (tokenMatches(token, settlement)) { score += 500; matchType = 'settlement'; }
    else if (tokenMatches(token, searchable)) score += 300;
  }
  if (parsed.importantTextTokens.length > 1 && missingImportantTokens.length === 0) score += 2500;
  if (parsed.importantTextTokens.length && parsed.importantTextTokens.every((token) => tokenMatches(token, street))) score += 2200;
  if (parsed.houseNumber) {
    if (houseNumberMatches(parsed.houseNumber, rowHouseNumber)) { score += 1800; matchType = 'house'; }
    else score -= 1800;
  }
  if (parsed.streetTypeTokens.length && parsed.streetTypeTokens.some((token) => tokenMatches(token, street))) score += 350;
  if (street && rowHouseNumber) score += 250;
  if (!rowHouseNumber && parsed.houseNumber) score -= 1200;
  if (!cleanPart(row.postcode)) score -= 150;
  if (cleanPart(row.geometry_type).toLowerCase() !== 'point') score -= 50;
  return { score, confidence: Math.max(0, Math.min(0.99, score / 9500)), matchType };
}

function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`).replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
}
function uniqueValues(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }

function buildHungarianAccentVariants(term: string) {
  const normalized = stripDiacritics(safeDecode(term)).toLowerCase();
  if (!normalized || normalized.length > 24) return [term];
  const alternatives: Record<string, string[]> = { a: ['a', 'á'], e: ['e', 'é'], i: ['i', 'í'], o: ['o', 'ó', 'ö', 'ő'], u: ['u', 'ú', 'ü', 'ű'] };
  let variants = [''];
  for (const char of normalized) {
    const chars = alternatives[char] || [char];
    const next: string[] = [];
    for (const prefix of variants) {
      for (const candidate of chars) next.push(prefix + candidate);
      if (next.length >= 80) break;
    }
    variants = next.slice(0, 80);
  }
  return uniqueValues([term, normalized, ...variants]).slice(0, 80);
}

function buildSearchTerms(rawQuery: string) {
  const parsed = tokenize(rawQuery);
  const rawTokens = parsed.rawTokens.filter((token) => token.length > 1 && !GENERIC_ADDRESS_WORDS.has(normalizeToken(token)) && !/^\d+[a-z]?$/i.test(token));
  const normalizedTokens = parsed.importantTextTokens;
  const rawPhrase = rawTokens.join(' ');
  const normalizedPhrase = normalizedTokens.join(' ');
  return uniqueValues([rawPhrase, normalizedPhrase, ...rawTokens, ...normalizedTokens, parsed.postcode || '', parsed.houseNumber && normalizedTokens.length === 0 ? parsed.houseNumber : ''])
    .filter((term) => term.length >= 2 && term !== 'budapest')
    .slice(0, 8);
}

function buildEncodedVariants(term: string) {
  const decoded = safeDecode(term);
  const accentVariants = buildHungarianAccentVariants(decoded);
  const variants = accentVariants.flatMap((variant) => [variant, stripDiacritics(variant), variant.replace(/\s+/g, '%20%'), variant.replace(/\s+/g, '%20'), stripDiacritics(variant).replace(/\s+/g, '%20%')]);
  return uniqueValues(variants).filter((variant) => variant.length >= 2).slice(0, 120);
}

function buildOrFilters(searchTerms: string[]) {
  const fields = ['display_name', 'name', 'postcode', 'city', 'town', 'village', 'municipality', 'district', 'suburb', 'neighbourhood', 'hamlet', 'place', 'street', 'street_name', 'house_number', 'housenumber', 'conscriptionnumber'];
  return searchTerms.flatMap((term) => buildEncodedVariants(term).flatMap((variant) => fields.map((field) => `${field}.ilike.%${escapeIlike(variant)}%`))).slice(0, 180);
}

function toSuggestion(row: OsmAddressRow, rawQuery: string): AddressSuggestion {
  const scored = scoreAddress(row, rawQuery);
  return {
    id: String(row.id || row.external_id || makeLabel(row)),
    label: makeLabel(row),
    countryCode: cleanPart(row.country_code || row.country || 'HU').toUpperCase(),
    postcode: cleanPart(row.postcode),
    settlement: getSettlement(row),
    street: getStreet(row),
    district: cleanPart(row.district || row.suburb || row.neighbourhood) || undefined,
    houseNumber: getHouseNumber(row),
    lat: row.lat,
    lon: row.lon,
    confidence: Number(scored.confidence.toFixed(2)),
    matchType: scored.matchType,
    source: 'supabase',
  };
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseLookup(lat: number, lon: number) {
  if (!supabase) return [];
  const { data, error } = await supabase.from(addressTable).select(SELECT_COLUMNS).not('lat', 'is', null).not('lon', 'is', null).gte('lat', lat - 0.02).lte('lat', lat + 0.02).gte('lon', lon - 0.03).lte('lon', lon + 0.03).limit(80);
  if (error) throw error;
  return ((data ?? []) as unknown as OsmAddressRow[]).map((row) => ({ row, distance: row.lat !== null && row.lon !== null ? distanceKm(lat, lon, row.lat, row.lon) : Number.POSITIVE_INFINITY })).sort((a, b) => a.distance - b.distance).slice(0, 8).map(({ row, distance }) => ({ ...toSuggestion(row, ''), matchType: 'reverse' as MatchType, confidence: Number(Math.max(0, 1 - distance / 3).toFixed(2)) }));
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const normalizedQuery = normalizeText(rawQuery);
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lon = Number(request.nextUrl.searchParams.get('lon'));
  const clientIp = getClientIp(request);

  // Reverse geocode (Supabase-only)
  if (!rawQuery && Number.isFinite(lat) && Number.isFinite(lon)) {
    if (!hasSupabaseConfig || !supabase) return NextResponse.json({ suggestions: [], results: [] });
    try {
      const suggestions = await reverseLookup(lat, lon);
      return NextResponse.json({ suggestions, results: suggestions });
    } catch (error) {
      return NextResponse.json({ error: 'SUPABASE_REVERSE_GEOCODE_ERROR', message: error instanceof Error ? error.message : 'Ismeretlen reverse geocode hiba.' }, { status: 500 });
    }
  }

  if (normalizedQuery.length < 2) return NextResponse.json({ suggestions: [], results: [] });

  let supabaseResults: AddressSuggestion[] = [];

  // 1) Try Supabase first (osm_addresses) — if configured & query yields tokens
  if (hasSupabaseConfig && supabase) {
    try {
      const searchTerms = buildSearchTerms(rawQuery);
      if (searchTerms.length > 0) {
        let data: OsmAddressRow[] | null = null;
        let error: { message: string } | null = null;

        if (process.env.GEODATA_USE_RPC === 'true') {
          const rpcResult = await supabase.rpc('search_osm_addresses', { search_query: rawQuery, result_limit: 120 });
          data = rpcResult.data as unknown as OsmAddressRow[] | null;
          error = rpcResult.error;
        }

        if (!data || error) {
          // Simple targeted ILIKE on key fields using raw (accented) lowercase tokens.
          // The old buildOrFilters approach generated up to 180 conditions which
          // exceeded PostgREST URL limits and caused silent fallback to Nominatim.
          const parsed = tokenize(rawQuery);
          const rawImportant = parsed.rawTokens
            .filter(t => !GENERIC_ADDRESS_WORDS.has(normalizeToken(t)) && !/^\d+[a-z]?$/i.test(t) && t.length >= 2)
            .slice(0, 3);

          if (rawImportant.length > 0) {
            const simpleFilters = rawImportant.flatMap(term => [
              `street_name.ilike.%${escapeIlike(term)}%`,
              `display_name.ilike.%${escapeIlike(term)}%`,
              `city.ilike.%${escapeIlike(term)}%`,
            ]);
            const restResult = await supabase.from(addressTable).select(SELECT_COLUMNS).or(simpleFilters.join(',')).limit(220);
            data = restResult.data as unknown as OsmAddressRow[] | null;
            error = restResult.error;
          }
        }

        // Schema-cache / missing-table / RLS errors → silently fall through to Nominatim
        if (!error && data) {
          const ranked = data
            .map((row) => ({ row, ...scoreAddress(row, rawQuery) }))
            .filter((item) => Boolean(makeLabel(item.row)) && item.score > 0)
            .sort((a, b) => b.score - a.score || makeLabel(a.row).localeCompare(makeLabel(b.row), 'hu'));
          const seen = new Set<string>();
          for (const item of ranked) {
            const suggestion = toSuggestion(item.row, rawQuery);
            const key = normalizeText(suggestion.label);
            if (seen.has(key)) continue;
            seen.add(key);
            supabaseResults.push(suggestion);
            if (supabaseResults.length >= 8) break;
          }
        }
      }
    } catch {
      // Fall through to Nominatim
      supabaseResults = [];
    }
  }

  if (supabaseResults.length > 0) {
    return NextResponse.json({ suggestions: supabaseResults, results: supabaseResults, source: 'supabase' });
  }

  // 2) Fallback to Nominatim — only if query >= 4 chars (polite usage)
  if (normalizedQuery.length >= 4) {
    const nominatimResults = await nominatimFallback(rawQuery, clientIp);
    return NextResponse.json({ suggestions: nominatimResults, results: nominatimResults, source: 'nominatim' });
  }

  return NextResponse.json({ suggestions: [], results: [] });
}
