import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const geodataSupabaseUrl = process.env.GEODATA_SUPABASE_URL || process.env.SUPABASE_URL;
const geodataSupabaseKey =
  process.env.GEODATA_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.GEODATA_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;
const addressSchema = process.env.GEODATA_SUPABASE_ADDRESS_SCHEMA || process.env.SUPABASE_ADDRESS_SCHEMA || 'public';
const addressTable = process.env.GEODATA_SUPABASE_ADDRESS_TABLE || process.env.SUPABASE_ADDRESS_TABLE || 'osm_addresses';

const hasSupabaseConfig = Boolean(geodataSupabaseUrl && geodataSupabaseKey);

const supabase = hasSupabaseConfig
  ? createClient(geodataSupabaseUrl!, geodataSupabaseKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      db: {
        schema: addressSchema
      }
    })
  : null;

type OsmAddressRow = {
  display_name: string | null;
  street: string | null;
  street_name: string | null;
  street_type: string | null;
  street_type_normalized: string | null;
  house_number: string | null;
  housenumber: string | null;
  city: string | null;
  town: string | null;
  village: string | null;
  municipality: string | null;
  district: string | null;
  suburb: string | null;
  postcode: string | null;
  lat: number | null;
  lon: number | null;
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getSettlement(row: OsmAddressRow) {
  return row.city || row.town || row.village || row.municipality || row.suburb || row.district;
}

function getStreet(row: OsmAddressRow) {
  const street = row.street_name || row.street;
  const streetType = row.street_type_normalized || row.street_type;

  if (!street) return '';
  if (!streetType || normalizeText(street).endsWith(normalizeText(streetType))) return street;

  return `${street} ${streetType}`;
}

function makeLabel(row: OsmAddressRow) {
  return (
    row.display_name ||
    [row.postcode, getSettlement(row), getStreet(row), row.house_number || row.housenumber]
      .filter(Boolean)
      .join(' ')
  );
}

function toIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scoreSuggestion(label: string, query: string, tokens: string[]) {
  const normalizedLabel = normalizeText(label);

  if (normalizedLabel === query) return 1200;
  if (normalizedLabel.startsWith(query)) return 1000;

  const fullWord = new RegExp(`\\b${escapeRegExp(query)}`);
  if (fullWord.test(normalizedLabel)) return 900;

  let score = 0;
  for (const token of tokens) {
    if (normalizedLabel.startsWith(token)) score += 120;
    else if (new RegExp(`\\b${escapeRegExp(token)}`).test(normalizedLabel)) score += 80;
    else if (normalizedLabel.includes(token)) score += 45;
  }

  return score;
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const normalizedQuery = normalizeText(rawQuery);

  if (normalizedQuery.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  if (!hasSupabaseConfig || !supabase) {
    return NextResponse.json(
      {
        error: 'GEODATA_SUPABASE_CONFIG_MISSING',
        message:
          'Hiányzik a GeoData Supabase konfiguráció. A címkereső szándékosan nem a Panellakó saját NEXT_PUBLIC/NEXT_SUPABASE backendjét használja. Állítsd be: GEODATA_SUPABASE_URL + GEODATA_SUPABASE_SERVICE_ROLE_KEY, vagy SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.'
      },
      { status: 503 }
    );
  }

  const safeQuery = toIlikeTerm(rawQuery);

  if (!safeQuery) {
    return NextResponse.json({ suggestions: [] });
  }

  const tokens = normalizedQuery.split(' ').filter((token) => token.length > 1).slice(0, 5);

  const orFilters = [
    `display_name.ilike.%${safeQuery}%`,
    `street.ilike.%${safeQuery}%`,
    `street_name.ilike.%${safeQuery}%`,
    `street_type.ilike.%${safeQuery}%`,
    `street_type_normalized.ilike.%${safeQuery}%`,
    `city.ilike.%${safeQuery}%`,
    `town.ilike.%${safeQuery}%`,
    `village.ilike.%${safeQuery}%`,
    `municipality.ilike.%${safeQuery}%`,
    `district.ilike.%${safeQuery}%`,
    `suburb.ilike.%${safeQuery}%`,
    `postcode.ilike.%${safeQuery}%`,
    `house_number.ilike.%${safeQuery}%`,
    `housenumber.ilike.%${safeQuery}%`
  ];

  for (const token of tokens) {
    orFilters.push(`display_name.ilike.%${token}%`);
    orFilters.push(`street.ilike.%${token}%`);
    orFilters.push(`street_name.ilike.%${token}%`);
    orFilters.push(`city.ilike.%${token}%`);
    orFilters.push(`town.ilike.%${token}%`);
    orFilters.push(`village.ilike.%${token}%`);
    orFilters.push(`municipality.ilike.%${token}%`);
    orFilters.push(`postcode.ilike.%${token}%`);
  }

  try {
    const { data, error } = await supabase
      .from(addressTable)
      .select(
        'display_name,street,street_name,street_type,street_type_normalized,house_number,housenumber,city,town,village,municipality,district,suburb,postcode,lat,lon'
      )
      .or(orFilters.join(','))
      .limit(40);

    if (error) {
      const looksLikeSchemaCacheIssue = /schema cache|Could not find the table/i.test(error.message);

      return NextResponse.json(
        {
          error: 'GEODATA_SUPABASE_QUERY_FAILED',
          message: 'Az adatbázisos címkeresés nem elérhető a GeoData Supabase projektből.',
          details: error.message,
          hint: looksLikeSchemaCacheIssue
            ? `A ${addressSchema}.${addressTable} tábla nem látszik a GeoData Supabase PostgREST schema cache-ben az aktuális API kulccsal/projekttel. Ellenőrizd, hogy a címkereső env a GeoData projektre mutat: GEODATA_SUPABASE_URL/SUPABASE_URL = https://buuoyyfzincmbxafvihc.supabase.co. Ez az endpoint nem használhatja a Panellakó saját NEXT_PUBLIC_SUPABASE_URL backendjét.`
            : undefined
        },
        { status: 500 }
      );
    }

    const ranked = ((data ?? []) as OsmAddressRow[])
      .map((row) => {
        const label = makeLabel(row);
        return {
          label,
          score: label ? scoreSuggestion(label, normalizedQuery, tokens) : 0
        };
      })
      .filter((item): item is { label: string; score: number } => Boolean(item.label))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'hu'));

    const suggestions = [...new Set(ranked.map((item) => item.label))].slice(0, 8);

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'GEODATA_SUPABASE_AUTOCOMPLETE_ERROR',
        message: error instanceof Error ? error.message : 'Ismeretlen GeoData Supabase címkeresési hiba.'
      },
      { status: 500 }
    );
  }
}
