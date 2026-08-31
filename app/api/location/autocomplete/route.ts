import { NextRequest, NextResponse } from 'next/server';
import {
  AddressRegistryError,
  reverseRegistryAddresses,
  suggestRegistryAddresses,
} from '@/lib/address-registry/server';
import {
  formatRegistryHouseNumber,
  type AddressRegistrySuggestion,
} from '@/lib/address-registry/contracts';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type LegacyAddressSuggestion = {
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
  matchType: 'exact' | 'house' | 'street' | 'settlement' | 'fuzzy' | 'reverse';
  source: 'supabase';
  sourceSystem: 'OSM';
  sourceRecordId: string;
  addressLevel: 'BUILDING';
  datasetVersion: string;
  normalizationVersion: string;
};

function legacyMatchType(item: AddressRegistrySuggestion): LegacyAddressSuggestion['matchType'] {
  if (item.matchType === 'EXACT_HOUSE') return 'exact';
  if (item.matchType === 'PREFIX_HOUSE') return 'house';
  return 'fuzzy';
}

function toLegacySuggestion(
  item: AddressRegistrySuggestion,
  reverse = false,
): LegacyAddressSuggestion {
  return {
    id: item.canonicalAddressId,
    label: item.formattedAddress,
    countryCode: item.countryCode,
    postcode: item.postalCode,
    settlement: item.settlement,
    street: [item.streetName, item.streetType].filter(Boolean).join(' '),
    district: item.district || undefined,
    houseNumber: formatRegistryHouseNumber(item),
    lat: item.latitude,
    lon: item.longitude,
    confidence: item.confidence,
    matchType: reverse ? 'reverse' : legacyMatchType(item),
    source: 'supabase',
    sourceSystem: item.sourceSystem,
    sourceRecordId: item.sourceRecordId,
    addressLevel: item.addressLevel,
    datasetVersion: item.datasetVersion,
    normalizationVersion: item.normalizationVersion,
  };
}

function errorResponse(error: unknown) {
  const configurationError = error instanceof AddressRegistryError && error.code === 'CONFIGURATION';
  return NextResponse.json(
    {
      error: configurationError ? 'ADDRESS_REGISTRY_NOT_CONFIGURED' : 'ADDRESS_REGISTRY_UNAVAILABLE',
      message: 'A közös címjegyzék átmenetileg nem érhető el. Próbáld újra, vagy válaszd a kézi ellenőrzést.',
      suggestions: [],
      results: [],
    },
    {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const hasCoordinates = request.nextUrl.searchParams.has('lat') || request.nextUrl.searchParams.has('lon');
  let reverseCoordinates: { latitude: number; longitude: number } | null = null;

  if (!rawQuery) {
    if (hasCoordinates) {
      const rawLatitude = request.nextUrl.searchParams.get('lat');
      const rawLongitude = request.nextUrl.searchParams.get('lon');
      const latitude = rawLatitude === null || rawLatitude.trim() === '' ? Number.NaN : Number(rawLatitude);
      const longitude = rawLongitude === null || rawLongitude.trim() === '' ? Number.NaN : Number(rawLongitude);
      if (
        !Number.isFinite(latitude)
        || latitude < -90
        || latitude > 90
        || !Number.isFinite(longitude)
        || longitude < -180
        || longitude > 180
      ) {
        return NextResponse.json(
          { error: 'INVALID_COORDINATES', suggestions: [], results: [] },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      reverseCoordinates = { latitude, longitude };
    } else {
      return NextResponse.json(
        { suggestions: [], results: [], source: 'geodata_registry' },
        { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } },
      );
    }
  }

  if (!reverseCoordinates && rawQuery.length < 3) {
    return NextResponse.json(
      { suggestions: [], results: [], source: 'geodata_registry' },
      { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } },
    );
  }
  if (!reverseCoordinates && rawQuery.length > 120) {
    return NextResponse.json(
      { error: 'ADDRESS_QUERY_TOO_LONG', message: 'A címkeresés legfeljebb 120 karakter lehet.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json(
      { error: 'ADDRESS_LOOKUP_GUARD_UNAVAILABLE', suggestions: [], results: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json(
      { error: 'AUTH_REQUIRED', suggestions: [], results: [] },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { data: quotaData, error: quotaError } = await supabase.rpc('consume_address_lookup_quota');
  const quota = Array.isArray(quotaData) ? quotaData[0] as Record<string, unknown> | undefined : null;
  if (quotaError || !quota || typeof quota.allowed !== 'boolean') {
    return NextResponse.json(
      { error: 'ADDRESS_LOOKUP_GUARD_UNAVAILABLE', suggestions: [], results: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (!quota.allowed) {
    const retryAfter = Math.max(1, Math.min(60, Number(quota.retry_after_seconds) || 60));
    return NextResponse.json(
      { error: 'ADDRESS_LOOKUP_RATE_LIMITED', suggestions: [], results: [] },
      {
        status: 429,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) },
      },
    );
  }

  try {
    if (reverseCoordinates) {
      const registryItems = await reverseRegistryAddresses(
        reverseCoordinates.latitude,
        reverseCoordinates.longitude,
        'HU',
        8,
      );
      const suggestions = registryItems.map((item) => toLegacySuggestion(item, true));
      return NextResponse.json(
        {
          suggestions,
          results: suggestions,
          source: 'supabase',
          provider: 'shared_geodata_registry',
          attribution: registryItems[0]?.attribution ?? {
            text: '© OpenStreetMap contributors',
            url: 'https://www.openstreetmap.org/copyright',
          },
        },
        { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } },
      );
    }
    const registryItems = await suggestRegistryAddresses(rawQuery, 'HU', 8);
    const suggestions = registryItems.map((item) => toLegacySuggestion(item));
    return NextResponse.json(
      {
        suggestions,
        results: suggestions,
        source: 'supabase',
        provider: 'shared_geodata_registry',
        attribution: registryItems[0]?.attribution ?? {
          text: '© OpenStreetMap contributors',
          url: 'https://www.openstreetmap.org/copyright',
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
