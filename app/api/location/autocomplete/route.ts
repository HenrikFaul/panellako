import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const addressSchema = process.env.SUPABASE_ADDRESS_SCHEMA || 'public';
const addressTable = process.env.SUPABASE_ADDRESS_TABLE || 'osm_addresses';

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseKey!, {
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
  house_number: string | null;
  housenumber: string | null;
  city: string | null;
  town: string | null;
  village: string | null;
  municipality: string | null;
  district: string | null;
  suburb: string | null;
  postcode: string | null;
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function makeLabel(row: OsmAddressRow) {
  return (
    row.display_name ||
    [
      row.postcode,
      row.city || row.town || row.village || row.municipality,
      row.street_name || row.street,
      row.house_number || row.housenumber
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function toIlikeTerm(value: string) {
  return value.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreSuggestion(label: string, query: string, tokens: string[]) {
  const normalizedLabel = normalizeText(label);

  if (normalizedLabel === query) return 1200;
  if (normalizedLabel.startsWith(query)) return 1000;

  const fullWord = new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  if (fullWord.test(normalizedLabel)) return 900;

  let score = 0;
  for (const token of tokens) {
    if (normalizedLabel.startsWith(token)) score += 120;
    else if (new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(normalizedLabel)) score += 80;
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
        error: 'SUPABASE_CONFIG_MISSING',
        message:
          'Hiányzik a Supabase konfiguráció. Állítsd be: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (ajánlott), vagy NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      },
      { status: 503 }
    );
  }

  const safeQuery = toIlikeTerm(rawQuery);
  const tokens = normalizedQuery.split(' ').filter((token) => token.length > 1).slice(0, 5);

  const orFilters = [
    `display_name.ilike.%${safeQuery}%`,
    `street.ilike.%${safeQuery}%`,
    `street_name.ilike.%${safeQuery}%`,
    `city.ilike.%${safeQuery}%`,
    `town.ilike.%${safeQuery}%`,
    `village.ilike.%${safeQuery}%`,
    `municipality.ilike.%${safeQuery}%`,
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
  }

  try {
    const { data, error } = await supabase
      .from(addressTable)
      .select(
        'display_name,street,street_name,house_number,housenumber,city,town,village,municipality,district,suburb,postcode'
      )
      .or(orFilters.join(','))
      .limit(40);

    if (error) {
      const looksLikeSchemaCacheIssue = /schema cache|Could not find the table/i.test(error.message);

      return NextResponse.json(
        {
          error: 'SUPABASE_QUERY_FAILED',
          message: 'Az adatbázisos címkeresés nem elérhető.',
          details: error.message,
          hint: looksLikeSchemaCacheIssue
            ? `A ${addressSchema}.${addressTable} tábla nem látszik a PostgREST schema cache-ben az aktuális API kulccsal/projekttel. Ellenőrizd, hogy a Vercel env a megfelelő Supabase projektre mutat (SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL), és hogy a tábla elérhető az adott role számára (RLS/policy vagy service role kulcs).`
            : undefined
        },
        { status: 500 }
      );
    }

    const ranked = (data ?? [])
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
        error: 'SUPABASE_AUTOCOMPLETE_ERROR',
        message: error instanceof Error ? error.message : 'Ismeretlen Supabase címkeresési hiba.'
      },
      { status: 500 }
    );
  }
}
