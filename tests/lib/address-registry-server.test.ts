import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AddressRegistryError,
  resolveRegistryAddress,
  suggestRegistryAddresses,
} from '@/lib/address-registry/server';

const originalUrl = process.env.GEODATA_ADDRESS_API_URL;
const originalToken = process.env.GEODATA_ADDRESS_API_TOKEN;
const validItem = {
  canonicalAddressId: '11111111-1111-4111-8111-111111111111',
  sourceSystem: 'OSM',
  sourceRecordId: 'osm:way:987',
  formattedAddress: '1135 Budapest, Gidófalvy Lajos utca 9.',
  countryCode: 'HU',
  postalCode: '1135',
  settlement: 'Budapest',
  district: 'XIII. kerület',
  settlementPart: null,
  streetName: 'Gidófalvy Lajos',
  streetType: 'utca',
  houseNumberFrom: '9',
  houseNumberTo: null,
  houseNumberSuffix: null,
  buildingMark: null,
  addressLevel: 'BUILDING',
  latitude: 47.535,
  longitude: 19.071,
  coordinatePrecision: 'CENTROID',
  confidence: 0.99,
  matchType: 'EXACT_HOUSE',
  datasetVersion: 'osm-hu-2026-08-30',
  normalizationVersion: 'address-registry-v1',
  attribution: {
    text: '© OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
  },
};

beforeEach(() => {
  process.env.GEODATA_ADDRESS_API_URL = 'https://geodata.example';
  process.env.GEODATA_ADDRESS_API_TOKEN = 'test-consumer-token';
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalUrl === undefined) delete process.env.GEODATA_ADDRESS_API_URL;
  else process.env.GEODATA_ADDRESS_API_URL = originalUrl;
  if (originalToken === undefined) delete process.env.GEODATA_ADDRESS_API_TOKEN;
  else process.env.GEODATA_ADDRESS_API_TOKEN = originalToken;
});

describe('Address Registry bounded response reader', () => {
  it.each([
    ['missing', undefined],
    ['dishonest', '1'],
  ])('rejects an oversized chunked body with %s Content-Length', async (_label, length) => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (length) headers.set('Content-Length', length);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ version: '1.0', items: [], padding: 'x'.repeat(1_000_100) }),
      { status: 200, headers },
    )));

    await expect(suggestRegistryAddresses('1135 Gidófalvy')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    } satisfies Partial<AddressRegistryError>);
  });

  it.each([
    ['one malformed item', [validItem, { ...validItem, confidence: null }]],
    ['all malformed items', [{ ...validItem, coordinatePrecision: undefined }]],
  ])('fails closed for %s instead of returning a partial/empty result', async (_label, items) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ version: '1.0', items }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )));

    await expect(suggestRegistryAddresses('1135 Gidófalvy')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    } satisfies Partial<AddressRegistryError>);
  });
});

describe('Address Registry canonical lineage resolution', () => {
  const requestedId = validItem.canonicalAddressId;
  const redirectedId = '22222222-2222-4222-8222-222222222222';

  function response(overrides: Record<string, unknown> = {}) {
    return new Response(JSON.stringify({
      version: '1.0',
      resolution: 'EXACT',
      requestedCanonicalAddressId: requestedId,
      resolvedCanonicalAddressId: requestedId,
      sourceRecordId: validItem.sourceRecordId,
      item: validItem,
      ...overrides,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  it('accepts an exact, internally consistent resolution', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));

    await expect(resolveRegistryAddress(requestedId)).resolves.toMatchObject({
      canonicalAddressId: requestedId,
      sourceRecordId: validItem.sourceRecordId,
    });
  });

  it('accepts only an explicit, internally consistent lineage redirect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      resolution: 'LINEAGE_REDIRECT',
      resolvedCanonicalAddressId: redirectedId,
      item: { ...validItem, canonicalAddressId: redirectedId },
    })));

    await expect(resolveRegistryAddress(requestedId)).resolves.toMatchObject({
      canonicalAddressId: redirectedId,
      sourceRecordId: validItem.sourceRecordId,
    });
  });

  it.each([
    ['mismatched requested id', { requestedCanonicalAddressId: redirectedId }],
    ['implicit redirect', { resolvedCanonicalAddressId: redirectedId, item: { ...validItem, canonicalAddressId: redirectedId } }],
    ['redirect to the same id', { resolution: 'LINEAGE_REDIRECT' }],
    ['mismatched resolved id', { resolvedCanonicalAddressId: redirectedId }],
    ['mismatched source identity', { sourceRecordId: 'osm:way:999' }],
    ['unknown resolution', { resolution: 'ALIAS' }],
  ])('rejects %s', async (_label, overrides) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(overrides)));

    await expect(resolveRegistryAddress(requestedId)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    } satisfies Partial<AddressRegistryError>);
  });
});
