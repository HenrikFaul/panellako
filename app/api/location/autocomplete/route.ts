import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type MatchType = 'exact' | 'house' | 'street' | 'settlement' | 'fuzzy' | 'reverse';

// These SUPABASE_* values intentionally point to the separate GeoData project,
// not the app's own Panellakó backend (NEXT_PUBLIC_SUPABASE_URL / NEXT_SUPABASE_*).
const geodataSupabaseUrl = process.env.SUPABASE_URL;
const geodataSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
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
  houseNumber: string;
  lat: number | null;
  lon: number | null;
  confidence: number;
  matchType: MatchType;
};

const SELECT_COLUMNS = [
  'id', 'external_id', 'country', 'country_code', 'display_name', 'name', 'street', 'street_name', 'street_type',
  'street_type_normalized', 'house_number', 'housenumber', 'house_number_suffix', 'conscriptionnumber', 'city', 'town',
  'village', 'municipality', 'district', 'suburb', 'neighbourhood', 'hamlet', 'postcode', 'place', 'lat', 'lon', 'geometry_type'
].join(',');

const GENERIC_ADDRESS_WORDS = new Set([
  'utca', 'u', 'ut', 'út', 'ter', 'tér', 'koz', 'köz', 'korut', 'körút', 'krt', 'krt.', 'sor', 'setany', 'sétány',
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
    } catch {
      break;
    }
  }
  return current
    .replace(/%20/gi, ' ')
    .replace(/%2c/gi, ',')
    .replace(/%40/gi, '@')
    .replace(/%/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPart(value?: string | number | null) {
  return value === null || value === undefined ? '' : safeDecode(String(value)).replace(/\s+,/g, ',').trim();
}

function stripDiacritics(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function normalizeText(value: string) {
  return stripDiacritics(safeDecode(value))
    .toLowerCase()
    .replace(/[.,;:()[\]{}]/g, ' ')
    .replace(/[/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  const rawTokens = safeDecode(rawQuery)
    .toLowerCase()
    .replace(/[.,;:()[\]{}]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 12);
  const normalizedTokens = rawTokens.map(normalizeToken).filter((token) => token.length > 0);
  const houseNumber = [...normalizedTokens].reverse().find((token) => /^\d+[a-z]?$/i.test(token)) || null;
  const postcode = normalizedTokens.find((token) => /^\d{4}$/.test(token)) || null;
  const cityTokens = normalizedTokens.filter((token) => token === 'budapest' || token === 'bp' || token === 'pest');
  const streetTypeTokens = normalizedTokens.filter((token) => GENERIC_ADDRESS_WORDS.has(token));
  const importantTextTokens = normalizedTokens.filter(
    (token) => token.length > 1 && !GENERIC_ADDRESS_WORDS.has(token) && !/^\d+[a-z]?$/i.test(token) && !/^\d{4}$/.test(token)
  );
  return {
    rawTokens,
    normalizedTokens,
    houseNumber,
    postcode,
    cityTokens,
    streetTypeTokens,
    importantTextTokens,
    normalizedQuery: normalizedTokens.join(' ')
  };
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 0; i < a.length; i += 1) {
    current[0] = i + 1;
    for (let j = 0; j < b.length; j += 1) {
      current[j + 1] = Math.min(current[j] + 1, previous[j + 1] + 1, previous[j] + (a[i] === b[j] ? 0 : 1));
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

function tokenMatches(token: string, text: string) {
  if (!token) return false;
  if (text.includes(token)) return true;
  const words = text.split(' ').filter(Boolean);
  return words.some((word) => {
    if (word.startsWith(token) || token.startsWith(word)) return true;
    if (token.length >= 5 && word.length >= 5 && levenshtein(token, word) <= 1) return true;
    if (token.length >= 7 && word.length >= 7 && levenshtein(token, word) <= 2) return true;
    return false;
  });
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

  if (labelText === parsed.normalizedQuery || searchable === parsed.normalizedQuery) {
    score += 8000;
    matchType = 'exact';
  }

  if (parsed.postcode && postcode === parsed.postcode) score += 1200;
  if (parsed.cityTokens.length && settlement === 'budapest') score += 850;

  const missingImportantTokens = parsed.importantTextTokens.filter((token) => !tokenMatches(token, searchable));
  if (missingImportantTokens.length) score -= missingImportantTokens.length * 2500;

  for (const token of parsed.importantTextTokens) {
    if (street === token) {
      score += 1800;
      matchType = 'street';
    } else if (street.startsWith(token)) {
      score += 1400;
      matchType = 'street';
    } else if (tokenMatches(token, street)) {
      score += 950;
      matchType = 'street';
    } else if (tokenMatches(token, settlement)) {
      score += 500;
      matchType = 'settlement';
    } else if (tokenMatches(token, searchable)) {
      score += 300;
    }
  }

  if (parsed.importantTextTokens.length > 1 && missingImportantTokens.length === 0) score += 2500;
  if (parsed.importantTextTokens.length && parsed.importantTextTokens.every((token) => tokenMatches(token, street))) score += 2200;

  if (parsed.houseNumber) {
    if (houseNumberMatches(parsed.houseNumber, rowHouseNumber)) {
      score += 1800;
      matchType = 'house';
    } else {
      score -= 1800;
    }
  }

  if (parsed.streetTypeTokens.length && parsed.streetTypeTokens.some((token) => tokenMatches(token, street))) score += 350;
  if (street && rowHouseNumber) score += 250;
  if (!rowHouseNumber && parsed.houseNumber) score -= 1200;
  if (!cleanPart(row.postcode)) score -= 150;
  if (cleanPart(row.geometry_type).toLowerCase() !== 'point') score -= 50;

  const confidence = Math.max(0, Math.min(0.99, score / 9500));
  return { score, confidence, matchType };
}

function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`).replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildSearchTerms(rawQuery: string) {
  const parsed = tokenize(rawQuery);
  const rawTokens = parsed.rawTokens.filter((token) => token.length > 1 && !GENERIC_ADDRESS_WORDS.has(normalizeToken(token)) && !/^\d+[a-z]?$/i.test(token));
  const normalizedTokens = parsed.importantTextTokens;
  const rawPhrase = rawTokens.join(' ');
  const normalizedPhrase = normalizedTokens.join(' ');

  // Never use only broad city/generic terms as the DB prefilter, otherwise PostgREST returns the first random Budapest rows.
  const candidateTerms = uniqueValues([
    rawPhrase,
    normalizedPhrase,
    ...rawTokens,
    ...normalizedTokens,
    parsed.postcode || '',
    parsed.houseNumber && normalizedTokens.length === 0 ? parsed.houseNumber : ''
  ]).filter((term) => term.length >= 2 && term !== 'budapest');

  return candidateTerms.slice(0, 10);
}

function buildEncodedVariants(term: string) {
  const decoded = safeDecode(term);
  const variants = [decoded, stripDiacritics(decoded), decoded.replace(/\s+/g, '%20%'), decoded.replace(/\s+/g, '%20'), stripDiacritics(decoded).replace(/\s+/g, '%20%')];
  return uniqueValues(variants).filter((variant) => variant.length >= 2);
}

function buildOrFilters(searchTerms: string[]) {
  const fields = ['display_name', 'name', 'postcode', 'city', 'town', 'village', 'municipality', 'district', 'suburb', 'neighbourhood', 'hamlet', 'place', 'street', 'street_name', 'house_number', 'housenumber', 'conscriptionnumber'];
  return searchTerms.flatMap((term) => buildEncodedVariants(term).flatMap((variant) => fields.map((field) => `${field}.ilike.%${escapeIlike(variant)}%`)));
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
    houseNumber: getHouseNumber(row),
    lat: row.lat,
    lon: row.lon,
    confidence: Number(scored.confidence.toFixed(2)),
    matchType: scored.matchType
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
  const latDelta = 0.02;
  const lonDelta = 0.03;
  const { data, error } = await supabase
    .from(addressTable)
    .select(SELECT_COLUMNS)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lon', lon - lonDelta)
    .lte('lon', lon + lonDelta)
    .limit(80);

  if (error) throw error;
  return ((data ?? []) as unknown as OsmAddressRow[])
    .map((row) => ({ row, distance: row.lat !== null && row.lon !== null ? distanceKm(lat, lon, row.lat, row.lon) : Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8)
    .map(({ row, distance }) => ({ ...toSuggestion(row, ''), matchType: 'reverse' as MatchType, confidence: Number(Math.max(0, 1 - distance / 3).toFixed(2)) }));
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const normalizedQuery = normalizeText(rawQuery);
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lon = Number(request.nextUrl.searchParams.get('lon'));

  if (!hasSupabaseConfig || !supabase) {
    return NextResponse.json(
      {
        error: 'GEODATA_SUPABASE_CONFIG_MISSING',
        message: 'Hiányzik a GeoData Supabase konfiguráció. Állítsd be: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. A NEXT_PUBLIC_SUPABASE_URL a Panellakó saját backendjéhez tartozik, ezt a címkereső nem használja.'
      },
      { status: 503 }
    );
  }

  if (!rawQuery && Number.isFinite(lat) && Number.isFinite(lon)) {
    try {
      const suggestions = await reverseLookup(lat, lon);
      return NextResponse.json({ suggestions: suggestions.map((item) => item.label), results: suggestions });
    } catch (error) {
      return NextResponse.json({ error: 'SUPABASE_REVERSE_GEOCODE_ERROR', message: error instanceof Error ? error.message : 'Ismeretlen reverse geocode hiba.' }, { status: 500 });
    }
  }

  if (normalizedQuery.length < 2) return NextResponse.json({ suggestions: [], results: [] });

  try {
    const searchTerms = buildSearchTerms(rawQuery);

    if (searchTerms.length === 0) return NextResponse.json({ suggestions: [], results: [] });

    // Preferred path: install supabase/geodata_address_search.sql in the GeoData project.
    // It searches decoded + unaccented address text in Postgres, so accentless and fuzzy queries work too.
    const rpcResult = await supabase.rpc('search_osm_addresses', { search_query: rawQuery, result_limit: 600 });

    let data = rpcResult.data as unknown as OsmAddressRow[] | null;
    let error = rpcResult.error;

    // Backward-compatible fallback if the SQL helper has not been installed yet.
    if (error && /function .*search_osm_addresses|Could not find the function|schema cache/i.test(error.message)) {
      const restResult = await supabase
        .from(addressTable)
        .select(SELECT_COLUMNS)
        .or(buildOrFilters(searchTerms).join(','))
        .limit(600);

      data = restResult.data as unknown as OsmAddressRow[] | null;
      error = restResult.error;
    }

    if (error) {
      const looksLikeSchemaCacheIssue = /schema cache|Could not find the table/i.test(error.message);
      return NextResponse.json(
        {
          error: 'SUPABASE_QUERY_FAILED',
          message: 'Az adatbázisos címkeresés nem elérhető.',
          details: error.message,
          hint: looksLikeSchemaCacheIssue
            ? `A ${addressSchema}.${addressTable} tábla vagy a search_osm_addresses RPC nem látszik a GeoData Supabase PostgREST schema cache-ben. Ellenőrizd, hogy a SUPABASE_URL tényleg a GeoData projektre mutat, majd futtasd: NOTIFY pgrst, 'reload schema';`
            : undefined
        },
        { status: 500 }
      );
    }

    const ranked = ((data ?? []) as unknown as OsmAddressRow[])
      .map((row) => {
        const scored = scoreAddress(row, rawQuery);
        return { row, ...scored };
      })
      .filter((item) => Boolean(makeLabel(item.row)) && item.score > 0)
      .sort((a, b) => b.score - a.score || makeLabel(a.row).localeCompare(makeLabel(b.row), 'hu'));

    const seen = new Set<string>();
    const results: AddressSuggestion[] = [];
    for (const item of ranked) {
      const suggestion = toSuggestion(item.row, rawQuery);
      const key = normalizeText(suggestion.label);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(suggestion);
      if (results.length >= 8) break;
    }

    return NextResponse.json({ suggestions: results.map((item) => item.label), results });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'SUPABASE_AUTOCOMPLETE_ERROR',
        message: error instanceof Error ? error.message : 'Ismeretlen Supabase címkeresési hiba.'
      },
      { status: 500 }
    );
  }
}
