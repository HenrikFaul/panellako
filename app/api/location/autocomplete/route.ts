import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
  country: string | null;
  country_code: string | null;
  display_name: string | null;
  street: string | null;
  street_name: string | null;
  street_type: string | null;
  street_type_normalized: string | null;
  house_number: string | null;
  housenumber: string | null;
  house_number_suffix: string | null;
  city: string | null;
  town: string | null;
  village: string | null;
  municipality: string | null;
  district: string | null;
  suburb: string | null;
  neighbourhood: string | null;
  postcode: string | null;
  place: string | null;
  lat: number | null;
  lon: number | null;
};

const GENERIC_ADDRESS_WORDS = new Set([
  'utca', 'u', 'ut', 'ut.', 'út', 'ter', 'tér', 'koz', 'köz', 'korut', 'körút', 'krt',
  'sor', 'setany', 'sétány', 'lakotelep', 'lakótelep', 'dulo', 'dűlő', 'park', 'part',
  'rakpart', 'fasor', 'lejtő', 'lejto', 'orszag', 'ország', 'magyarorszag', 'magyarország', 'hu'
]);

const CITY_ALIASES: Record<string, string> = { bp: 'budapest', bpe: 'budapest', pest: 'budapest' };

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/%20/g, ' ')
    .replace(/[.,;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value.replace(/%20/g, ' ');
  }
}

function cleanPart(value?: string | null) {
  return value ? safeDecode(value).replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim() : '';
}

function getSettlement(row: OsmAddressRow) {
  return cleanPart(row.city || row.town || row.village || row.municipality || row.place || row.suburb || row.district);
}

function getStreet(row: OsmAddressRow) {
  const streetName = cleanPart(row.street_name || row.street);
  const streetType = cleanPart(row.street_type_normalized || row.street_type);
  if (!streetName) return '';
  if (!streetType || normalizeText(streetName).endsWith(` ${normalizeText(streetType)}`)) return streetName;
  return `${streetName} ${streetType}`.trim();
}

function getHouseNumber(row: OsmAddressRow) {
  return [cleanPart(row.house_number || row.housenumber), cleanPart(row.house_number_suffix)].filter(Boolean).join('');
}

function makeLabel(row: OsmAddressRow) {
  const countryCode = cleanPart(row.country_code || row.country || 'HU').toUpperCase();
  const postcode = cleanPart(row.postcode);
  const settlement = getSettlement(row);
  const street = getStreet(row);
  const houseNumber = getHouseNumber(row);
  const structured = [countryCode, [postcode, settlement].filter(Boolean).join(' '), [street, houseNumber].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return structured && (settlement || street) ? structured : cleanPart(row.display_name);
}

function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`).replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function queryTokens(rawQuery: string) {
  const normalized = normalizeText(rawQuery);
  const tokens = normalized
    .split(' ')
    .map((token) => CITY_ALIASES[token] || token)
    .filter((token) => token.length > 1)
    .slice(0, 8);
  const houseNumber = [...tokens].reverse().find((token) => /^\d+[a-z]?$/i.test(token)) || null;
  const meaningfulTokens = tokens.filter((token) => !GENERIC_ADDRESS_WORDS.has(token));
  const textTokens = meaningfulTokens.filter((token) => !/^\d+[a-z]?$/i.test(token));
  return { normalized, tokens, meaningfulTokens, textTokens, houseNumber };
}

function rowSearchText(row: OsmAddressRow) {
  return normalizeText([
    row.display_name, row.country_code, row.country, row.postcode, row.city, row.town, row.village,
    row.municipality, row.district, row.suburb, row.neighbourhood, row.place, row.street, row.street_name,
    row.street_type, row.street_type_normalized, row.house_number, row.housenumber, row.house_number_suffix
  ].map(cleanPart).filter(Boolean).join(' '));
}

function scoreAddress(row: OsmAddressRow, rawQuery: string) {
  const { normalized, tokens, meaningfulTokens, textTokens, houseNumber } = queryTokens(rawQuery);
  const label = makeLabel(row);
  const labelText = normalizeText(label);
  const searchable = rowSearchText(row);
  const settlement = normalizeText(getSettlement(row));
  const street = normalizeText(getStreet(row));
  const postcode = normalizeText(cleanPart(row.postcode));
  const rowHouseNumber = normalizeText(getHouseNumber(row));

  let score = 0;
  if (labelText === normalized || searchable === normalized) score += 5000;
  if (labelText.startsWith(normalized) || searchable.startsWith(normalized)) score += 2500;

  for (const token of tokens) {
    if (postcode === token) score += 450;
    if (settlement === token) score += 420;
    else if (settlement.startsWith(token)) score += 260;
    else if (settlement.includes(token)) score += 120;

    if (street === token) score += 700;
    else if (street.startsWith(token)) score += 520;
    else if (street.includes(token)) score += 260;

    if (rowHouseNumber === token) score += 700;
    else if (rowHouseNumber.startsWith(token)) score += 250;

    if (searchable.includes(token)) score += GENERIC_ADDRESS_WORDS.has(token) ? 20 : 90;
  }

  const missingImportantTokens = meaningfulTokens.filter((token) => !searchable.includes(token));
  score -= missingImportantTokens.length * 900;

  const matchedTextTokens = textTokens.filter((token) => searchable.includes(token)).length;
  if (textTokens.length > 0) score += matchedTextTokens * 350;
  if (textTokens.length > 1 && matchedTextTokens === textTokens.length) score += 850;

  if (houseNumber) {
    if (rowHouseNumber === houseNumber) score += 1100;
    else if (!rowHouseNumber) score -= 500;
    else score -= 700;
  }

  if (settlement === 'budapest') score += 70;
  if (street && rowHouseNumber) score += 140;
  if (label.includes('%20')) score -= 400;
  return score;
}

function buildSearchTerms(rawQuery: string) {
  const { tokens, meaningfulTokens, textTokens } = queryTokens(rawQuery);
  const raw = normalizeText(rawQuery);
  const streetLikePhrase = textTokens.filter((token) => token !== 'budapest').join(' ');
  return uniqueValues([raw, streetLikePhrase, ...meaningfulTokens, ...tokens.filter((token) => !GENERIC_ADDRESS_WORDS.has(token))])
    .filter((term) => term.length >= 2)
    .slice(0, 8);
}

function buildOrFilters(searchTerms: string[]) {
  const fields = [
    'display_name', 'postcode', 'city', 'town', 'village', 'municipality', 'district', 'suburb',
    'neighbourhood', 'place', 'street', 'street_name', 'street_type', 'street_type_normalized',
    'house_number', 'housenumber'
  ];
  return searchTerms.flatMap((term) => fields.map((field) => `${field}.ilike.%${escapeIlike(term)}%`));
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const normalizedQuery = normalizeText(rawQuery);

  if (normalizedQuery.length < 2) return NextResponse.json({ suggestions: [] });

  if (!hasSupabaseConfig || !supabase) {
    return NextResponse.json(
      {
        error: 'GEODATA_SUPABASE_CONFIG_MISSING',
        message: 'Hiányzik a GeoData Supabase konfiguráció. Állítsd be: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. A NEXT_PUBLIC_SUPABASE_URL a Panellakó saját backendjéhez tartozik, ezt a címkereső nem használja.'
      },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase
      .from(addressTable)
      .select('country,country_code,display_name,street,street_name,street_type,street_type_normalized,house_number,housenumber,house_number_suffix,city,town,village,municipality,district,suburb,neighbourhood,postcode,place,lat,lon')
      .or(buildOrFilters(buildSearchTerms(rawQuery)).join(','))
      .limit(300);

    if (error) {
      const looksLikeSchemaCacheIssue = /schema cache|Could not find the table/i.test(error.message);
      return NextResponse.json(
        {
          error: 'SUPABASE_QUERY_FAILED',
          message: 'Az adatbázisos címkeresés nem elérhető.',
          details: error.message,
          hint: looksLikeSchemaCacheIssue
            ? `A ${addressSchema}.${addressTable} tábla nem látszik a GeoData Supabase PostgREST schema cache-ben. Ellenőrizd, hogy a SUPABASE_URL tényleg a GeoData projektre mutat, majd futtasd: NOTIFY pgrst, 'reload schema';`
            : undefined
        },
        { status: 500 }
      );
    }

    const ranked = ((data ?? []) as OsmAddressRow[])
      .map((row) => ({ label: makeLabel(row), score: scoreAddress(row, rawQuery) }))
      .filter((item) => Boolean(item.label) && item.score > -1000)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'hu'));

    const suggestions = uniqueValues(ranked.map((item) => item.label)).slice(0, 8);
    return NextResponse.json({ suggestions });
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
