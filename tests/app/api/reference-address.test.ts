import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  userRpc: vi.fn(),
  adminRpc: vi.fn(),
  resolve: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.userRpc,
    from: mocks.from,
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc: mocks.adminRpc }),
}));

vi.mock('@/lib/address-registry/server', () => ({
  AddressRegistryError: class AddressRegistryError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  resolveRegistryAddress: mocks.resolve,
}));

import { GET, POST } from '@/app/api/user/reference-address/route';

const canonicalAddressId = '11111111-1111-4111-8111-111111111111';
const resolved = {
  canonicalAddressId,
  sourceSystem: 'OSM' as const,
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
  addressLevel: 'BUILDING' as const,
  latitude: null,
  longitude: null,
  coordinatePrecision: 'UNKNOWN',
  confidence: 0.91,
  matchType: 'EXACT_HOUSE' as const,
  datasetVersion: 'osm-hu-canary',
  normalizationVersion: 'address-registry-v1',
  attribution: {
    text: '© OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
  },
};

function request(body: unknown, origin = 'https://panellako.hu') {
  return new NextRequest('https://panellako.hu/api/user/reference-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
}

function requestWithLength(body: unknown, contentLength?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: 'https://panellako.hu',
  };
  if (contentLength !== undefined) headers['Content-Length'] = contentLength;
  return new NextRequest('https://panellako.hu/api/user/reference-address', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'profile-id' } }, error: null });
  mocks.userRpc.mockImplementation(async (name: string) => name === 'consume_address_lookup_quota'
    ? { data: [{ allowed: true, retry_after_seconds: 0 }], error: null }
    : { data: [{ profile_id: 'profile-id' }], error: null });
  mocks.resolve.mockResolvedValue(resolved);
  mocks.adminRpc.mockResolvedValue({ data: 'profile-id', error: null });
});

describe('reference address registry provenance', () => {
  it.each([null, [], 'invalid'])('rejects a non-object JSON body: %j', async (body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'INVALID_JSON' });
    expect(mocks.userRpc).not.toHaveBeenCalled();
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it.each([undefined, '1'])(
    'enforces the body limit when Content-Length is %s',
    async (contentLength) => {
      const response = await POST(requestWithLength({ padding: 'x'.repeat(17_000) }, contentLength));

      expect(response.status).toBe(413);
      expect(await response.json()).toMatchObject({ error: 'REQUEST_TOO_LARGE' });
      expect(mocks.userRpc).not.toHaveBeenCalled();
      expect(mocks.resolve).not.toHaveBeenCalled();
      expect(mocks.adminRpc).not.toHaveBeenCalled();
    },
  );

  it('re-resolves canonical identity and accepts a coordinate-pending address', async () => {
    const response = await POST(request({
      registry_canonical_address_id: canonicalAddressId,
      display_name: 'ATTACKER CONTROLLED',
      lat: 0,
      lon: 0,
      floor: '2',
      door: '5',
    }));

    expect(response.status).toBe(200);
    expect(mocks.resolve).toHaveBeenCalledWith(canonicalAddressId);
    expect(mocks.adminRpc).toHaveBeenCalledWith(
      'upsert_user_reference_address_v2',
      expect.objectContaining({
        p_actor_profile_id: 'profile-id',
        p_display_name: resolved.formattedAddress,
        p_lat: null,
        p_lon: null,
        p_registry_system: 'OSM',
        p_registry_canonical_address_id: canonicalAddressId,
        p_registry_source_record_id: 'osm:way:987',
        p_registry_contract_version: '1.0',
        p_registry_dataset_version: resolved.datasetVersion,
        p_registry_normalization_version: resolved.normalizationVersion,
      }),
    );
    expect(JSON.stringify(mocks.adminRpc.mock.calls[0]?.[1])).not.toContain('ATTACKER CONTROLLED');
  });

  it('persists the complete ranged house-number identity', async () => {
    mocks.resolve.mockResolvedValue({
      ...resolved,
      houseNumberFrom: '9',
      houseNumberTo: '11',
      houseNumberSuffix: 'A',
      buildingMark: 'B épület',
    });

    const response = await POST(request({
      registry_canonical_address_id: canonicalAddressId,
    }));

    expect(response.status).toBe(200);
    expect(mocks.adminRpc).toHaveBeenCalledWith(
      'upsert_user_reference_address_v2',
      expect.objectContaining({ p_house_number: '9-11/A B épület' }),
    );
  });

  it('enforces quota before external resolution or trusted writes', async () => {
    mocks.userRpc.mockImplementation(async (name: string) => name === 'consume_address_lookup_quota'
      ? { data: [{ allowed: false, retry_after_seconds: 19 }], error: null }
      : { data: null, error: null });

    const response = await POST(request({
      registry_canonical_address_id: canonicalAddressId,
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('19');
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'empty result', quotaData: [] },
    { label: 'wrong allowed type', quotaData: [{ allowed: 'false' }] },
  ])(
    'fails closed when the quota RPC payload is malformed: $label',
    async ({ quotaData }) => {
      mocks.userRpc.mockResolvedValue({ data: quotaData, error: null });

      const response = await POST(request({
        registry_canonical_address_id: canonicalAddressId,
      }));

      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: 'ADDRESS_LOOKUP_GUARD_UNAVAILABLE' });
      expect(mocks.resolve).not.toHaveBeenCalled();
      expect(mocks.adminRpc).not.toHaveBeenCalled();
    },
  );

  it('rejects a resolved registry identity outside the Hungarian building scope', async () => {
    mocks.resolve.mockResolvedValue({
      ...resolved,
      countryCode: 'AT',
      postalCode: '1010',
      formattedAddress: '1010 Wien, Testgasse 1.',
    });

    const response = await POST(request({
      registry_canonical_address_id: canonicalAddressId,
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'ADDRESS_PRECISION_INVALID' });
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it('keeps legacy coordinate saves but clears every registry provenance field', async () => {
    const response = await POST(request({
      display_name: '1135 Budapest, Legacy utca 1.',
      lat: 47.5,
      lon: 19.1,
      source: 'nominatim',
    }));

    expect(response.status).toBe(200);
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.adminRpc).toHaveBeenCalledWith(
      'upsert_user_reference_address_v2',
      expect.objectContaining({
        p_lat: 47.5,
        p_lon: 19.1,
        p_registry_system: null,
        p_registry_canonical_address_id: null,
        p_registry_source_record_id: null,
      }),
    );
  });

  it('rejects cross-origin writes before authentication', async () => {
    const response = await POST(request({
      registry_canonical_address_id: canonicalAddressId,
    }, 'https://evil.example'));

    expect(response.status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
});

describe('reference address privacy response', () => {
  it('never caches a saved home address', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { display_name: resolved.formattedAddress }, error: null }),
        }),
      }),
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('does not expose database errors from the home-address query', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: { message: 'secret database detail' } }),
        }),
      }),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({ error: 'QUERY_FAILED' });
    expect(JSON.stringify(body)).not.toContain('secret database detail');
  });
});
