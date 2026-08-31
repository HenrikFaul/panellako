import 'server-only';

import {
  ADDRESS_REGISTRY_VERSION,
  normalizeAddressRegistrySuggestion,
  type AddressRegistrySuggestion,
} from './contracts';

const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AddressRegistryError extends Error {
  readonly code: 'CONFIGURATION' | 'UNAVAILABLE' | 'INVALID_RESPONSE' | 'NOT_FOUND';

  constructor(
    code: 'CONFIGURATION' | 'UNAVAILABLE' | 'INVALID_RESPONSE' | 'NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'AddressRegistryError';
    this.code = code;
  }
}

function registryBaseUrl(): string {
  const raw = process.env.GEODATA_ADDRESS_API_URL?.trim().replace(/\/$/, '');
  if (!raw) throw new AddressRegistryError('CONFIGURATION', 'Address registry URL is not configured.');

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new AddressRegistryError('CONFIGURATION', 'Address registry URL is invalid.');
  }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && local)) {
    throw new AddressRegistryError('CONFIGURATION', 'Address registry URL must use HTTPS.');
  }
  return parsed.toString().replace(/\/$/, '');
}

function registryHeaders(): HeadersInit {
  const token = process.env.GEODATA_ADDRESS_API_TOKEN?.trim();
  if (!token) throw new AddressRegistryError('CONFIGURATION', 'Address registry token is not configured.');
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'PanelLako-Address-Registry/1.0',
  };
}

async function readBoundedJson(response: Response): Promise<unknown> {
  if (!response.body) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry response has no body.');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        try {
          await reader.cancel('response-size-limit');
        } catch {
          // Cancellation is best effort; the bounded reader has already stopped.
        }
        throw new AddressRegistryError(
          'INVALID_RESPONSE',
          'Address registry response is too large.',
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry returned invalid JSON.');
  }
}

async function registryFetch(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${registryBaseUrl()}${path}`, {
      method: 'GET',
      headers: registryHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new AddressRegistryError('UNAVAILABLE', 'Address registry request failed.');
  }

  if (response.status === 404) {
    throw new AddressRegistryError('NOT_FOUND', 'Address registry item was not found.');
  }
  if (!response.ok) {
    throw new AddressRegistryError('UNAVAILABLE', 'Address registry is unavailable.');
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry response is too large.');
  }
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry response is not JSON.');
  }

  return readBoundedJson(response);
}

export async function suggestRegistryAddresses(
  query: string,
  countryCode = 'HU',
  limit = 8,
): Promise<AddressRegistrySuggestion[]> {
  const normalizedQuery = query.trim();
  const normalizedCountry = countryCode.trim().toUpperCase();
  if (normalizedQuery.length < 3 || normalizedQuery.length > 120 || !/^[A-Z]{2}$/.test(normalizedCountry)) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry query is invalid.');
  }
  const boundedLimit = Math.max(1, Math.min(8, Math.trunc(limit)));
  const params = new URLSearchParams({
    q: normalizedQuery,
    country: normalizedCountry,
    limit: String(boundedLimit),
  });
  const payload = await registryFetch(`/api/v1/addresses/suggest?${params.toString()}`);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry response is malformed.');
  }
  const record = payload as Record<string, unknown>;
  if (record.version !== ADDRESS_REGISTRY_VERSION || !Array.isArray(record.items) || record.items.length > 100) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry contract version is unsupported.');
  }
  const normalizedItems = record.items.map(normalizeAddressRegistrySuggestion);
  if (normalizedItems.some((item) => item === null)) {
    throw new AddressRegistryError(
      'INVALID_RESPONSE',
      'Address registry returned a malformed item.',
    );
  }
  const items = normalizedItems as AddressRegistrySuggestion[];
  if (items.some(
    (item) => item.countryCode !== normalizedCountry || item.addressLevel !== 'BUILDING',
  )) {
    throw new AddressRegistryError(
      'INVALID_RESPONSE',
      'Address registry returned an item outside the requested scope.',
    );
  }
  return items.slice(0, boundedLimit);
}

export async function resolveRegistryAddress(canonicalAddressId: string): Promise<AddressRegistrySuggestion> {
  if (!UUID.test(canonicalAddressId)) {
    throw new AddressRegistryError('NOT_FOUND', 'Address registry item was not found.');
  }
  const payload = await registryFetch(`/api/v1/addresses/${encodeURIComponent(canonicalAddressId)}`);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry response is malformed.');
  }
  const record = payload as Record<string, unknown>;
  const item = normalizeAddressRegistrySuggestion(record.item);
  const requestedCanonicalAddressId = typeof record.requestedCanonicalAddressId === 'string'
    ? record.requestedCanonicalAddressId
    : '';
  const resolvedCanonicalAddressId = typeof record.resolvedCanonicalAddressId === 'string'
    ? record.resolvedCanonicalAddressId
    : '';
  const sourceRecordId = typeof record.sourceRecordId === 'string' ? record.sourceRecordId : '';
  const resolution = record.resolution;
  const requestedNormalized = canonicalAddressId.toLowerCase();
  const responseRequestedNormalized = requestedCanonicalAddressId.toLowerCase();
  const resolvedNormalized = resolvedCanonicalAddressId.toLowerCase();
  const exactResolution = resolution === 'EXACT'
    && resolvedNormalized === requestedNormalized;
  const lineageRedirect = resolution === 'LINEAGE_REDIRECT'
    && resolvedNormalized !== requestedNormalized;
  if (
    record.version !== ADDRESS_REGISTRY_VERSION
    || !item
    || !UUID.test(requestedCanonicalAddressId)
    || responseRequestedNormalized !== requestedNormalized
    || !UUID.test(resolvedCanonicalAddressId)
    || item.canonicalAddressId.toLowerCase() !== resolvedNormalized
    || sourceRecordId !== item.sourceRecordId
    || (!exactResolution && !lineageRedirect)
  ) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry resolution did not match the selection.');
  }
  return item;
}

export async function reverseRegistryAddresses(
  latitude: number,
  longitude: number,
  countryCode = 'HU',
  limit = 8,
): Promise<AddressRegistrySuggestion[]> {
  const normalizedCountry = countryCode.trim().toUpperCase();
  if (
    !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
    || !/^[A-Z]{2}$/.test(normalizedCountry)
  ) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Reverse address coordinates are invalid.');
  }
  const boundedLimit = Math.max(1, Math.min(8, Math.trunc(limit)));
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    country: normalizedCountry,
    limit: String(boundedLimit),
  });
  const payload = await registryFetch(`/api/v1/addresses/reverse?${params.toString()}`);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry response is malformed.');
  }
  const record = payload as Record<string, unknown>;
  if (record.version !== ADDRESS_REGISTRY_VERSION || !Array.isArray(record.items) || record.items.length > 100) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry contract version is unsupported.');
  }
  const normalizedItems = record.items.map(normalizeAddressRegistrySuggestion);
  if (normalizedItems.some((item) => item === null)) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry returned a malformed item.');
  }
  const items = normalizedItems as AddressRegistrySuggestion[];
  if (items.some(
    (item) => item.countryCode !== normalizedCountry
      || item.addressLevel !== 'BUILDING'
      || item.latitude === null
      || item.longitude === null,
  )) {
    throw new AddressRegistryError('INVALID_RESPONSE', 'Address registry returned an item outside the requested scope.');
  }
  return items.slice(0, boundedLimit);
}
