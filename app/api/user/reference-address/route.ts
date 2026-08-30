// v0.10.6 — User reference address upsert + read.
// The browser session remains the actor source of truth; only the server-side
// command may persist registry provenance after re-resolving the opaque ID.

import { NextRequest, NextResponse } from 'next/server';
import {
  formatRegistryHouseNumber,
  isHungarianBuildingAddress,
} from '@/lib/address-registry/contracts';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AddressRegistryError, resolveRegistryAddress } from '@/lib/address-registry/server';
import { BoundedJsonError, readBoundedJson } from '@/lib/http/bounded-json';

export const dynamic = 'force-dynamic';

type Payload = {
  display_name?: string;
  lat?: number;
  lon?: number;
  street?: string | null;
  house_number?: string | null;
  city?: string | null;
  district?: string | null;
  postcode?: string | null;
  floor?: string | null;
  door?: string | null;
  source?: string;
  registry_canonical_address_id?: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalText(value: unknown, maximum: number): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function noStoreError(error: string, status: number, message?: string) {
  return NextResponse.json(
    { error, ...(message ? { message } : {}) },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return noStoreError('UNAUTHENTICATED', 401);

  const { data, error } = await supabase
    .from('user_reference_addresses')
    .select('display_name, lat, lon, street, house_number, city, district, postcode, floor, door, source, registry_system, registry_canonical_address_id, registry_source_record_id, registry_contract_version, registry_dataset_version, registry_normalization_version, registry_coordinate_precision, registry_confidence, registry_match_type, registry_resolved_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return noStoreError('QUERY_FAILED', 500);
  return NextResponse.json(
    { address: data ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return noStoreError('ORIGIN_NOT_ALLOWED', 403);
  }
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return noStoreError('CONTENT_TYPE_REQUIRED', 415);
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return noStoreError('UNAUTHENTICATED', 401);

  let parsedBody: unknown;
  try {
    parsedBody = await readBoundedJson(request, 16_384);
  } catch (error) {
    if (error instanceof BoundedJsonError && error.code === 'REQUEST_TOO_LARGE') {
      return noStoreError('REQUEST_TOO_LARGE', 413);
    }
    return noStoreError('INVALID_JSON', 400);
  }
  if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
    return noStoreError('INVALID_JSON', 400);
  }
  const body = parsedBody as Payload;

  const registryCanonicalAddressId = optionalText(body.registry_canonical_address_id, 36);
  if (
    body.registry_canonical_address_id !== undefined
    && body.registry_canonical_address_id !== null
    && body.registry_canonical_address_id !== ''
    && !registryCanonicalAddressId
  ) {
    return noStoreError('ADDRESS_SELECTION_INVALID', 400);
  }
  let resolved: Awaited<ReturnType<typeof resolveRegistryAddress>> | null = null;

  if (registryCanonicalAddressId) {
    if (!UUID.test(registryCanonicalAddressId)) {
      return noStoreError('ADDRESS_SELECTION_INVALID', 400);
    }
    const { data: quotaData, error: quotaError } = await supabase.rpc(
      'consume_address_lookup_quota',
    );
    if (quotaError) {
      return noStoreError('ADDRESS_LOOKUP_GUARD_UNAVAILABLE', 503);
    }
    const quota = (Array.isArray(quotaData) ? quotaData[0] : quotaData) as {
      allowed?: unknown;
      retry_after_seconds?: unknown;
    } | null;
    if (!quota || typeof quota.allowed !== 'boolean') {
      return noStoreError('ADDRESS_LOOKUP_GUARD_UNAVAILABLE', 503);
    }
    if (quota?.allowed !== true) {
      const retryAfter = Number.isFinite(Number(quota?.retry_after_seconds))
        ? Math.max(1, Math.ceil(Number(quota?.retry_after_seconds)))
        : 60;
      return NextResponse.json(
        { error: 'ADDRESS_LOOKUP_RATE_LIMITED' },
        {
          status: 429,
          headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) },
        },
      );
    }
    try {
      resolved = await resolveRegistryAddress(registryCanonicalAddressId);
    } catch (error) {
      const notFound = error instanceof AddressRegistryError && error.code === 'NOT_FOUND';
      return noStoreError(
        notFound ? 'ADDRESS_SELECTION_INVALID' : 'ADDRESS_REGISTRY_UNAVAILABLE',
        notFound ? 409 : 503,
      );
    }
    if (!isHungarianBuildingAddress(resolved)) {
      return noStoreError('ADDRESS_PRECISION_INVALID', 400);
    }
  }

  const displayName = resolved?.formattedAddress ?? optionalText(body.display_name, 500);
  // A regisztertalálat minden címadatot felülír. A regiszter által szándékosan
  // null koordinátára sem eshetünk vissza böngészőből érkező, nem megbízható adatra.
  const latitude = resolved ? resolved.latitude : body.lat;
  const longitude = resolved ? resolved.longitude : body.lon;
  if (
    !displayName
    || (!resolved && (typeof latitude !== 'number' || typeof longitude !== 'number'))
  ) {
    return noStoreError('MISSING_FIELDS', 400, 'display_name, lat, lon kötelező.');
  }
  if (
    (latitude === null) !== (longitude === null)
    || (latitude !== null && (
      typeof latitude !== 'number'
      || !Number.isFinite(latitude)
      || latitude < -90
      || latitude > 90
    ))
    || (longitude !== null && (
      typeof longitude !== 'number'
      || !Number.isFinite(longitude)
      || longitude < -180
      || longitude > 180
    ))
  ) return noStoreError('INVALID_COORDS', 400);

  const row = {
    user_id:      user.id,
    display_name: displayName,
    lat:          latitude,
    lon:          longitude,
    street:       resolved
      ? [resolved.streetName, resolved.streetType].filter(Boolean).join(' ')
      : optionalText(body.street, 255),
    house_number: resolved
      ? formatRegistryHouseNumber(resolved)
      : optionalText(body.house_number, 50),
    city:         resolved ? resolved.settlement : optionalText(body.city, 255),
    district:     resolved ? resolved.district : optionalText(body.district, 255),
    postcode:     resolved ? resolved.postalCode : optionalText(body.postcode, 20),
    floor:        optionalText(body.floor, 50),
    door:         optionalText(body.door, 50),
    source:       resolved ? 'supabase' : optionalText(body.source, 50) ?? 'nominatim',
    registry_system: resolved?.sourceSystem ?? null,
    registry_canonical_address_id: resolved?.canonicalAddressId ?? null,
    registry_source_record_id: resolved?.sourceRecordId ?? null,
    registry_contract_version: resolved ? '1.0' : null,
    registry_dataset_version: resolved?.datasetVersion ?? null,
    registry_normalization_version: resolved?.normalizationVersion ?? null,
    registry_coordinate_precision: resolved?.coordinatePrecision ?? null,
    registry_confidence: resolved?.confidence ?? null,
    registry_match_type: resolved?.matchType ?? null,
    registry_resolved_at: resolved ? new Date().toISOString() : null,
    updated_at:   new Date().toISOString(),
  };

  const { error: profileError } = await supabase.rpc('ensure_profile');
  if (profileError) return noStoreError('PROFILE_BOOTSTRAP_FAILED', 503);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return noStoreError('SYSTEM_UPDATE_REQUIRED', 503);
  }
  const { error } = await admin.rpc('upsert_user_reference_address_v2', {
    p_actor_profile_id: user.id,
    p_display_name: row.display_name,
    p_lat: row.lat,
    p_lon: row.lon,
    p_street: row.street,
    p_house_number: row.house_number,
    p_city: row.city,
    p_district: row.district,
    p_postcode: row.postcode,
    p_floor: row.floor,
    p_door: row.door,
    p_source: row.source,
    p_registry_system: row.registry_system,
    p_registry_canonical_address_id: row.registry_canonical_address_id,
    p_registry_source_record_id: row.registry_source_record_id,
    p_registry_contract_version: row.registry_contract_version,
    p_registry_dataset_version: row.registry_dataset_version,
    p_registry_normalization_version: row.registry_normalization_version,
    p_registry_coordinate_precision: row.registry_coordinate_precision,
    p_registry_confidence: row.registry_confidence,
    p_registry_match_type: row.registry_match_type,
    p_registry_resolved_at: row.registry_resolved_at,
  });

  if (error) return noStoreError('UPSERT_FAILED', 500, 'A cím mentése nem sikerült.');
  return NextResponse.json(
    { ok: true, address: row },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
