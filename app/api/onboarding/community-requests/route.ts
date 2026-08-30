import { NextRequest, NextResponse } from 'next/server';
import { isHungarianBuildingAddress } from '@/lib/address-registry/contracts';
import { resolveRegistryAddress, AddressRegistryError } from '@/lib/address-registry/server';
import { BoundedJsonError, readBoundedJson } from '@/lib/http/bounded-json';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type RegistryAddressInput = { mode: 'registry'; canonicalAddressId: string };
type ManualAddressInput = { mode: 'manual'; formattedAddress: string };
type CommunityRequestInput = {
  communityName?: unknown;
  legalForm?: unknown;
  unitCount?: unknown;
  governanceMode?: unknown;
  idempotencyKey?: unknown;
  address?: RegistryAddressInput | ManualAddressInput | unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGAL_FORMS = new Set(['CONDOMINIUM', 'UNDIVIDED_COMMON_OWNERSHIP']);
const GOVERNANCE_MODES = new Set(['REPRESENTATIVE_MANAGED', 'BOARD_MANAGED', 'SELF_MANAGED']);

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function errorCode(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const error = value as { code?: unknown; details?: unknown; message?: unknown };
  for (const candidate of [error.details, error.message]) {
    if (typeof candidate !== 'string') continue;
    try {
      const parsed = JSON.parse(candidate) as { error_code?: unknown };
      if (typeof parsed.error_code === 'string') return parsed.error_code;
    } catch {
      const match = candidate.match(/"error_code"\s*:\s*"([A-Z0-9_]+)"/);
      if (match?.[1]) return match[1];
    }
  }
  return typeof error.code === 'string' ? error.code : null;
}

function jsonError(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(
    { error: code, message },
    { status, headers: { 'Cache-Control': 'no-store', ...headers } },
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return jsonError('ORIGIN_NOT_ALLOWED', 'A kérés forrása nem engedélyezett.', 403);
  }
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return jsonError('CONTENT_TYPE_REQUIRED', 'A kérés formátuma nem támogatott.', 415);
  }

  let parsedInput: unknown;
  try {
    parsedInput = await readBoundedJson(request, 32_768);
  } catch (error) {
    if (error instanceof BoundedJsonError && error.code === 'REQUEST_TOO_LARGE') {
      return jsonError('REQUEST_TOO_LARGE', 'A kérés mérete túl nagy.', 413);
    }
    return jsonError('INVALID_JSON', 'A kérés nem értelmezhető.', 400);
  }
  if (!parsedInput || typeof parsedInput !== 'object' || Array.isArray(parsedInput)) {
    return jsonError('INVALID_JSON', 'A kérés nem értelmezhető.', 400);
  }
  const input = parsedInput as CommunityRequestInput;

  const communityName = text(input.communityName);
  const legalForm = text(input.legalForm).toUpperCase();
  const governanceMode = text(input.governanceMode).toUpperCase();
  const idempotencyKey = text(input.idempotencyKey);
  const unitCount = typeof input.unitCount === 'number' ? input.unitCount : Number.NaN;
  const addressInput = input.address && typeof input.address === 'object' && !Array.isArray(input.address)
    ? input.address as Record<string, unknown>
    : null;

  if (
    communityName.length < 3
    || communityName.length > 255
    || !LEGAL_FORMS.has(legalForm)
    || !GOVERNANCE_MODES.has(governanceMode)
    || !Number.isInteger(unitCount)
    || unitCount < 1
    || unitCount > 5000
    || !UUID.test(idempotencyKey)
    || !addressInput
  ) {
    return jsonError('COMMUNITY_REQUEST_INVALID', 'A közösségi kérelem adatai hiányosak vagy hibásak.', 400);
  }

  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return jsonError('AUTH_REQUIRED', 'A kérelem beküldéséhez jelentkezz be újra.', 401);
  }

  // This actor-scoped database quota is consumed before profile bootstrap,
  // registry resolution or service-role work. It protects both the external
  // shared address token and the manual-review queue across all app instances.
  const { data: quotaData, error: quotaError } = await supabase.rpc(
    'consume_community_request_quota',
  );
  if (quotaError) {
    return jsonError(
      'COMMUNITY_REQUEST_GUARD_UNAVAILABLE',
      'A közösségi kérelem védelmi ellenőrzése átmenetileg nem érhető el.',
      503,
    );
  }
  const quota = (Array.isArray(quotaData) ? quotaData[0] : quotaData) as {
    allowed?: unknown;
    retry_after_seconds?: unknown;
  } | null;
  if (!quota || typeof quota.allowed !== 'boolean') {
    return jsonError(
      'COMMUNITY_REQUEST_GUARD_UNAVAILABLE',
      'A közösségi kérelem védelmi ellenőrzése átmenetileg nem érhető el.',
      503,
    );
  }
  if (quota?.allowed !== true) {
    const retryAfter = Number.isFinite(Number(quota?.retry_after_seconds))
      ? Math.max(1, Math.ceil(Number(quota?.retry_after_seconds)))
      : 3600;
    return jsonError(
      'COMMUNITY_REQUEST_RATE_LIMITED',
      'Túl sok közösségi kérelmet indítottál. Próbáld újra később.',
      429,
      { 'Retry-After': String(retryAfter) },
    );
  }

  // Keep profile bootstrapping bound to the authenticated JWT. The trusted
  // address command itself is service-only so a browser cannot forge an OSM
  // source assertion by invoking the RPC directly.
  const { error: profileError } = await supabase.rpc('ensure_profile');
  if (profileError) {
    return jsonError('PROFILE_BOOTSTRAP_FAILED', 'A felhasználói profil előkészítése nem sikerült.', 503);
  }

  let resolved: Awaited<ReturnType<typeof resolveRegistryAddress>> | null = null;
  let manualAddress = '';
  const mode = text(addressInput.mode);
  if (mode === 'registry') {
    const canonicalAddressId = text(addressInput.canonicalAddressId);
    if (!UUID.test(canonicalAddressId)) {
      return jsonError('ADDRESS_SELECTION_INVALID', 'A kiválasztott cím nem érvényes.', 400);
    }
    try {
      resolved = await resolveRegistryAddress(canonicalAddressId);
    } catch (error) {
      const notFound = error instanceof AddressRegistryError && error.code === 'NOT_FOUND';
      return jsonError(
        notFound ? 'ADDRESS_SELECTION_INVALID' : 'ADDRESS_REGISTRY_UNAVAILABLE',
        notFound
          ? 'A kiválasztott cím már nem érvényes. Keresd meg és válaszd ki újra.'
          : 'A címjegyzék átmenetileg nem érhető el. A kiválasztást nem mentettük.',
        notFound ? 409 : 503,
      );
    }
    if (!isHungarianBuildingAddress(resolved)) {
      return jsonError('ADDRESS_PRECISION_INVALID', 'Közösséghez csak magyarországi épületszintű cím választható.', 400);
    }
  } else if (mode === 'manual') {
    manualAddress = text(addressInput.formattedAddress);
    if (manualAddress.length < 5 || manualAddress.length > 500) {
      return jsonError('MANUAL_ADDRESS_INVALID', 'Add meg a teljes, ellenőrizhető címet.', 400);
    }
  } else {
    return jsonError('ADDRESS_SELECTION_REQUIRED', 'Válassz címet vagy kérj kézi címellenőrzést.', 400);
  }

  const formattedAddress = resolved?.formattedAddress ?? manualAddress;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return jsonError('SYSTEM_UPDATE_REQUIRED', 'A közösségi kérelem szolgáltatása nincs konfigurálva.', 503);
  }

  const { data, error } = await admin.rpc('create_community_creation_request_v2', {
    p_actor_profile_id: authData.user.id,
    p_community_name: communityName,
    p_formatted_address: formattedAddress,
    p_legal_form: legalForm,
    p_unit_count: unitCount,
    p_governance_mode: governanceMode,
    p_idempotency_key: idempotencyKey,
    p_country_code: resolved?.countryCode ?? 'HU',
    p_postal_code: resolved?.postalCode || null,
    p_settlement: resolved?.settlement || null,
    p_district: resolved?.district || null,
    p_settlement_part: resolved?.settlementPart || null,
    p_street_name: resolved?.streetName || null,
    p_street_type: resolved?.streetType || null,
    p_house_number_from: resolved?.houseNumberFrom || null,
    p_house_number_to: resolved?.houseNumberTo || null,
    p_house_number_suffix: resolved?.houseNumberSuffix || null,
    p_building_mark: resolved?.buildingMark || null,
    p_source_system: resolved?.sourceSystem ?? 'MANUAL',
    p_source_record_id: resolved?.sourceRecordId ?? null,
    p_latitude: resolved?.latitude ?? null,
    p_longitude: resolved?.longitude ?? null,
    p_registry_canonical_address_id: resolved?.canonicalAddressId ?? null,
    p_registry_contract_version: resolved ? '1.0' : null,
    p_coordinate_precision: resolved?.coordinatePrecision ?? null,
    p_confidence: resolved?.confidence ?? null,
    p_match_type: resolved?.matchType ?? null,
    p_dataset_version: resolved?.datasetVersion ?? null,
    p_normalization_version: resolved?.normalizationVersion ?? null,
  });

  if (error) {
    const code = errorCode(error) ?? 'COMMUNITY_REQUEST_FAILED';
    const conflict = code === 'COMMUNITY_ALREADY_EXISTS' || code === 'IDEMPOTENCY_KEY_REUSED';
    const missingMigration = code === 'PGRST202' || code === '42883';
    return jsonError(
      missingMigration ? 'SYSTEM_UPDATE_REQUIRED' : code,
      conflict
        ? code === 'IDEMPOTENCY_KEY_REUSED'
          ? 'Ez a biztonságos újrapróbálási azonosító már más adatokhoz tartozik.'
          : 'Ehhez a címhez már tartozik aktív közösség. Keresd meg, és csatlakozz hozzá.'
        : missingMigration
          ? 'Rendszerfrissítés szükséges a közösségi kérelem beküldéséhez.'
          : 'A kérelmet most nem sikerült beküldeni. Azonos adatokkal biztonságosan újrapróbálhatod.',
      conflict ? 409 : missingMigration ? 503 : 400,
    );
  }

  const result = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  const replayed = result?.replayed === true;
  const requestStatus = typeof result?.request_status === 'string'
    ? result.request_status
    : 'PENDING_VERIFICATION';
  return NextResponse.json(
    { request: result ?? null, status: requestStatus, replayed },
    { status: replayed ? 200 : 201, headers: { 'Cache-Control': 'no-store' } },
  );
}
