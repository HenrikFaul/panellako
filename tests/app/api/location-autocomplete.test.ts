import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  suggest: vi.fn(),
  reverse: vi.fn(),
  getUser: vi.fn(),
  quota: vi.fn(),
}));

vi.mock('@/lib/address-registry/server', () => ({
  AddressRegistryError: class AddressRegistryError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  suggestRegistryAddresses: mocks.suggest,
  reverseRegistryAddresses: mocks.reverse,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.quota,
  }),
}));

import { GET } from '@/app/api/location/autocomplete/route';

const registrySuggestion = {
  canonicalAddressId: '11111111-1111-4111-8111-111111111111',
  sourceSystem: 'OSM' as const,
  sourceRecordId: 'osm:node:123',
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
  addressLevel: 'BUILDING' as const,
  latitude: 47.535,
  longitude: 19.071,
  coordinatePrecision: 'rooftop',
  confidence: 0.98,
  matchType: 'EXACT_HOUSE' as const,
  datasetVersion: 'osm-hu-2026-08-30',
  normalizationVersion: 'address-registry-v1',
  attribution: {
    text: '© OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
  },
};

function request(query: string) {
  return new NextRequest(`https://panellako.hu/api/location/autocomplete?q=${encodeURIComponent(query)}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'profile-id' } }, error: null });
  mocks.quota.mockResolvedValue({ data: [{ allowed: true, retry_after_seconds: 0 }], error: null });
  mocks.suggest.mockResolvedValue([registrySuggestion]);
  mocks.reverse.mockResolvedValue([registrySuggestion]);
});

describe('shared GeoData location autocomplete adapter', () => {
  it('keeps the legacy response shape while preserving stable source identity', async () => {
    const response = await GET(request('1135 Gidófalvy Lajos utca 9'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.suggest).toHaveBeenCalledWith('1135 Gidófalvy Lajos utca 9', 'HU', 8);
    expect(body.source).toBe('supabase');
    expect(body.provider).toBe('shared_geodata_registry');
    expect(body.suggestions).toEqual([
      expect.objectContaining({
        id: registrySuggestion.canonicalAddressId,
        label: registrySuggestion.formattedAddress,
        source: 'supabase',
        sourceSystem: 'OSM',
        sourceRecordId: 'osm:node:123',
        countryCode: 'HU',
        addressLevel: 'BUILDING',
      }),
    ]);
  });

  it('preserves a ranged house number, suffix and building mark', async () => {
    mocks.suggest.mockResolvedValue([{
      ...registrySuggestion,
      houseNumberFrom: '9',
      houseNumberTo: '11',
      houseNumberSuffix: 'A',
      buildingMark: 'B épület',
    }]);

    const response = await GET(request('1135 Gidófalvy 9-11 A'));
    const body = await response.json();

    expect(body.suggestions[0].houseNumber).toBe('9-11/A B épület');
  });

  it('does not call authentication, quota or registry for short or empty queries', async () => {
    const shortResponse = await GET(request('11'));
    const emptyResponse = await GET(new NextRequest('https://panellako.hu/api/location/autocomplete'));

    expect(shortResponse.status).toBe(200);
    expect(emptyResponse.status).toBe(200);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.quota).not.toHaveBeenCalled();
    expect(mocks.suggest).not.toHaveBeenCalled();
    await expect(shortResponse.json()).resolves.toMatchObject({ suggestions: [] });
  });

  it('preserves reverse lookup through the shared registry', async () => {
    const response = await GET(new NextRequest(
      'https://panellako.hu/api/location/autocomplete?lat=47.5&lon=19.1',
    ));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      provider: 'shared_geodata_registry',
      suggestions: [expect.objectContaining({ matchType: 'reverse' })],
    });
    expect(mocks.reverse).toHaveBeenCalledWith(47.5, 19.1, 'HU', 8);
    expect(mocks.suggest).not.toHaveBeenCalled();
  });

  it('rejects incomplete reverse coordinates before authentication', async () => {
    const response = await GET(new NextRequest(
      'https://panellako.hu/api/location/autocomplete?lat=47.5',
    ));
    expect(response.status).toBe(400);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.reverse).not.toHaveBeenCalled();
  });

  it('rejects oversized input before any upstream request', async () => {
    const response = await GET(request('x'.repeat(121)));
    expect(response.status).toBe(400);
    expect(mocks.suggest).not.toHaveBeenCalled();
  });

  it('requires an authenticated user before consuming the shared registry token', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'AUTH' } });

    const response = await GET(request('1135 Gidófalvy'));

    expect(response.status).toBe(401);
    expect(mocks.quota).not.toHaveBeenCalled();
    expect(mocks.suggest).not.toHaveBeenCalled();
  });

  it('enforces the distributed per-user quota before the upstream request', async () => {
    mocks.quota.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 17 }],
      error: null,
    });

    const response = await GET(request('1135 Gidófalvy'));

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('17');
    expect(mocks.suggest).not.toHaveBeenCalled();
  });

  it('fails closed without leaking registry or database details', async () => {
    mocks.suggest.mockRejectedValue(new Error('postgres secret row resident@example.hu'));
    const response = await GET(request('1135 Gidófalvy'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe('ADDRESS_REGISTRY_UNAVAILABLE');
    expect(JSON.stringify(body)).not.toContain('postgres');
    expect(JSON.stringify(body)).not.toContain('resident@example.hu');
  });
});
