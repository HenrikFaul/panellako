import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  userRpc: vi.fn(),
  adminRpc: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.userRpc }),
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

import { POST } from '@/app/api/onboarding/community-requests/route';

const canonicalAddressId = '11111111-1111-4111-8111-111111111111';
const idempotencyKey = '22222222-2222-4222-8222-222222222222';
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
  latitude: 47.535,
  longitude: 19.071,
  coordinatePrecision: 'rooftop',
  confidence: 0.99,
  matchType: 'EXACT_HOUSE' as const,
  datasetVersion: 'osm-hu-2026-08-30',
  normalizationVersion: 'address-registry-v1',
  attribution: { text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' },
};

function request(address: Record<string, unknown>, origin = 'https://panellako.hu') {
  return new NextRequest('https://panellako.hu/api/onboarding/community-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      communityName: 'Gidófalvy 9. Társasház',
      legalForm: 'CONDOMINIUM',
      unitCount: 16,
      governanceMode: 'REPRESENTATIVE_MANAGED',
      idempotencyKey,
      address,
    }),
  });
}

function rawRequest(body: unknown, contentLength?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: 'https://panellako.hu',
  };
  if (contentLength !== undefined) headers['Content-Length'] = contentLength;
  return new NextRequest('https://panellako.hu/api/onboarding/community-requests', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'profile-id' } }, error: null });
  mocks.userRpc.mockImplementation(async (name: string) => {
    if (name === 'consume_community_request_quota') {
      return { data: [{ allowed: true, retry_after_seconds: 0 }], error: null };
    }
    return { data: [{ profile_id: 'profile-id' }], error: null };
  });
  mocks.resolve.mockResolvedValue(resolved);
  mocks.adminRpc.mockResolvedValue({ data: [{ request_id: 'request-id' }], error: null });
});

describe('community onboarding address hand-off', () => {
  it.each([null, [], 'invalid'])('rejects a non-object JSON body: %j', async (body) => {
    const response = await POST(rawRequest(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'INVALID_JSON' });
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.userRpc).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it.each([undefined, '1'])(
    'enforces the body limit when Content-Length is %s',
    async (contentLength) => {
      const response = await POST(rawRequest({ padding: 'x'.repeat(33_000) }, contentLength));

      expect(response.status).toBe(413);
      expect(await response.json()).toMatchObject({ error: 'REQUEST_TOO_LARGE' });
      expect(mocks.getUser).not.toHaveBeenCalled();
      expect(mocks.userRpc).not.toHaveBeenCalled();
      expect(mocks.adminRpc).not.toHaveBeenCalled();
    },
  );

  it.each([true, '16', ' ', null])('rejects a non-numeric unit count: %j', async (unitCount) => {
    const response = await POST(rawRequest({
      communityName: 'Gidófalvy 9. Társasház',
      legalForm: 'CONDOMINIUM',
      unitCount,
      governanceMode: 'REPRESENTATIVE_MANAGED',
      idempotencyKey,
      address: { mode: 'registry', canonicalAddressId },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'COMMUNITY_REQUEST_INVALID' });
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.userRpc).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it('re-resolves the opaque selection server-side and writes only that trusted snapshot', async () => {
    const response = await POST(request({
      mode: 'registry',
      canonicalAddressId,
      formattedAddress: 'ATTACKER CONTROLLED',
      latitude: 0,
    }));

    expect(response.status).toBe(201);
    expect(mocks.resolve).toHaveBeenCalledWith(canonicalAddressId);
    expect(mocks.userRpc).toHaveBeenCalledWith('ensure_profile');
    expect(mocks.adminRpc).toHaveBeenCalledWith(
      'create_community_creation_request_v2',
      expect.objectContaining({
        p_actor_profile_id: 'profile-id',
        p_formatted_address: resolved.formattedAddress,
        p_source_system: 'OSM',
        p_source_record_id: 'osm:way:987',
        p_latitude: resolved.latitude,
        p_longitude: resolved.longitude,
        p_registry_canonical_address_id: canonicalAddressId,
        p_registry_contract_version: '1.0',
        p_match_type: 'EXACT_HOUSE',
        p_confidence: 0.99,
        p_dataset_version: resolved.datasetVersion,
        p_normalization_version: resolved.normalizationVersion,
      }),
    );
    expect(JSON.stringify(mocks.adminRpc.mock.calls[0]?.[1])).not.toContain('ATTACKER CONTROLLED');
  });

  it('keeps missing addresses on an explicit manual-review path', async () => {
    const response = await POST(request({
      mode: 'manual',
      formattedAddress: '9999 Mintafalu, Ismeretlen utca 2.',
    }));

    expect(response.status).toBe(201);
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.adminRpc).toHaveBeenCalledWith(
      'create_community_creation_request_v2',
      expect.objectContaining({
        p_source_system: 'MANUAL',
        p_source_record_id: null,
        p_registry_canonical_address_id: null,
        p_registry_contract_version: null,
        p_match_type: null,
        p_confidence: null,
      }),
    );
  });

  it('rejects cross-origin submissions before authentication or database work', async () => {
    const response = await POST(request({ mode: 'registry', canonicalAddressId }, 'https://evil.example'));
    expect(response.status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.userRpc).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it('fails before address resolution when authenticated profile bootstrap fails', async () => {
    mocks.userRpc.mockImplementation(async (name: string) => name === 'consume_community_request_quota'
      ? { data: [{ allowed: true, retry_after_seconds: 0 }], error: null }
      : { data: null, error: { code: 'XX000' } });

    const response = await POST(request({ mode: 'registry', canonicalAddressId }));

    expect(response.status).toBe(503);
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it('rate-limits before registry resolution, profile bootstrap or service-role work', async () => {
    mocks.userRpc.mockImplementation(async (name: string) => name === 'consume_community_request_quota'
      ? { data: [{ allowed: false, retry_after_seconds: 733 }], error: null }
      : { data: [{ profile_id: 'profile-id' }], error: null });

    const response = await POST(request({ mode: 'registry', canonicalAddressId }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('733');
    expect(mocks.userRpc).toHaveBeenCalledTimes(1);
    expect(mocks.userRpc).toHaveBeenCalledWith('consume_community_request_quota');
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'empty result', quotaData: [] },
    { label: 'wrong allowed type', quotaData: [{ allowed: 'false' }] },
  ])(
    'fails closed when the submission quota payload is malformed: $label',
    async ({ quotaData }) => {
      mocks.userRpc.mockResolvedValue({ data: quotaData, error: null });

      const response = await POST(request({ mode: 'registry', canonicalAddressId }));

      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: 'COMMUNITY_REQUEST_GUARD_UNAVAILABLE' });
      expect(mocks.resolve).not.toHaveBeenCalled();
      expect(mocks.adminRpc).not.toHaveBeenCalled();
    },
  );

  it('returns an idempotent replay as 200 with the actual persisted status', async () => {
    mocks.adminRpc.mockResolvedValue({
      data: [{ request_id: 'request-id', request_status: 'NEEDS_EVIDENCE', replayed: true }],
      error: null,
    });

    const response = await POST(request({ mode: 'registry', canonicalAddressId }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'NEEDS_EVIDENCE', replayed: true });
  });
});
