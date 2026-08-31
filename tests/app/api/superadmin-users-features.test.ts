import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const FEATURE_ID = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';

const mocks = vi.hoisted(() => ({
  requireRead: vi.fn(),
  requireMutation: vi.fn(),
  hasCapability: vi.fn(),
  authorityErrorCode: vi.fn(),
  digest: vi.fn(),
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  requirePlatformRead: mocks.requireRead,
  requirePlatformMutation: mocks.requireMutation,
  hasPlatformCapability: mocks.hasCapability,
  platformAuthorityErrorCode: mocks.authorityErrorCode,
  getDatabasePlatformPayloadDigest: mocks.digest,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createServerClient,
}));

import { GET as getUsers } from '@/app/api/superadmin/users/route';
import { PATCH as patchUser } from '@/app/api/superadmin/users/[id]/route';
import { GET as getFeatures } from '@/app/api/superadmin/features/route';
import { PATCH as patchFeature } from '@/app/api/superadmin/features/[id]/route';

function allowedContext(capabilityKeys: string[] = []) {
  return {
    authenticated: true,
    mode: 'operator',
    operatorProfileId: USER_ID,
    operatorEmail: 'operator@example.hu',
    assuranceLevel: 'aal2',
    roleKeys: ['PLATFORM_ADMIN'],
    capabilityKeys,
    authorityValidUntil: null,
    activeSupportSessions: [],
    canBootstrap: false,
    breakGlassExpiresAt: null,
  };
}

function queryChain(result: { data?: unknown[] | null; error?: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'order', 'or', 'eq']) chain[method] = vi.fn(() => chain);
  chain.range = vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }));
  return chain;
}

function readRequest(path: string): NextRequest {
  return new NextRequest(`https://panellako.hu${path}`);
}

function patchRequest(path: string, body: unknown, options?: { origin?: string; contentType?: string; rawBody?: string }): NextRequest {
  const origin = options?.origin ?? 'https://panellako.hu';
  return new NextRequest(`https://panellako.hu${path}`, {
    method: 'PATCH',
    headers: {
      Host: 'panellako.hu',
      Origin: origin,
      'Sec-Fetch-Site': origin === 'https://panellako.hu' ? 'same-origin' : 'cross-site',
      'Content-Type': options?.contentType ?? 'application/json',
    },
    body: options?.rawBody ?? JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  const context = allowedContext(['platform.users.read_masked', 'platform.users.manage_trial', 'platform.features.manage']);
  mocks.requireRead.mockResolvedValue({ ok: true, context, status: 403, errorCode: 'PLATFORM_CAPABILITY_DENIED' });
  mocks.requireMutation.mockResolvedValue({ ok: true, context, status: 403, errorCode: 'PLATFORM_CAPABILITY_DENIED' });
  mocks.hasCapability.mockImplementation((candidate: { capabilityKeys?: string[] }, capability: string) => candidate.capabilityKeys?.includes(capability) === true);
  mocks.authorityErrorCode.mockReturnValue('PLATFORM_ACTION_FAILED');
  mocks.digest.mockResolvedValue({ digest: `sha256:${'a'.repeat(64)}`, errorCode: null });
});

describe('superadmin users read plane', () => {
  it('requires the masked-read capability, bounds pagination, and never returns a raw email', async () => {
    const chain = queryChain({
      data: [{
        id: USER_ID,
        full_name: 'Teszt Elek',
        email: 'teszt.elek@panellako.hu',
        created_at: '2026-08-01T10:00:00.000Z',
        free_trial_start: '2026-08-01T10:00:00.000Z',
        free_trial_days: 14,
        free_trial_never_expires: false,
      }],
    });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => chain) });

    const response = await getUsers(readRequest('/api/superadmin/users?search=Teszt&limit=25&offset=50'));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.requireRead).toHaveBeenCalledWith('platform.users.read_masked');
    expect(chain.range).toHaveBeenCalledWith(50, 75);
    expect(body.users[0]).toMatchObject({ emailMasked: 't***@p***.hu' });
    expect(serialized).not.toContain('teszt.elek@panellako.hu');
  });

  it('rejects unbounded or filter-injection shaped queries before constructing the admin client', async () => {
    expect((await getUsers(readRequest('/api/superadmin/users?limit=500'))).status).toBe(400);
    expect((await getUsers(readRequest('/api/superadmin/users?search=x%29%2Cemail.eq.private'))).status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('allows the legacy read decision but returns only a generic database failure', async () => {
    const chain = queryChain({ error: { message: 'password=private-database-secret' } });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => chain) });

    const response = await getUsers(readRequest('/api/superadmin/users'));
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(text).toContain('PLATFORM_USERS_UNAVAILABLE');
    expect(text).not.toContain('private-database-secret');
  });
});

describe('superadmin feature read plane', () => {
  it('accepts an operator manage capability when the dedicated read capability is not seeded', async () => {
    const context = allowedContext(['platform.features.manage']);
    mocks.requireRead.mockResolvedValue({ ok: false, context, status: 403, errorCode: 'PLATFORM_CAPABILITY_DENIED' });
    const chain = queryChain({ data: [{
      id: FEATURE_ID,
      feature_key: 'documents.read',
      name: 'Dokumentumok',
      description: null,
      module: 'documents',
      route_path: '/documents',
      menu_path: 'Dokumentumok',
      tier: 'alap',
      enabled: true,
      sort_order: 10,
    }] });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => chain) });

    const response = await getFeatures(readRequest('/api/superadmin/features?limit=100&offset=0'));

    expect(response.status).toBe(200);
    expect(mocks.hasCapability).toHaveBeenCalledWith(context, 'platform.features.manage');
    expect(mocks.createAdminClient).toHaveBeenCalledTimes(1);
  });
});

describe('superadmin user trial mutation', () => {
  const validBody = {
    free_trial_start: '2026-08-30T00:00:00.000Z',
    free_trial_days: 30,
    free_trial_never_expires: false,
    reason: 'Bemutatói hozzáférés meghosszabbítása.',
    idempotencyKey: REQUEST_ID,
  };

  it('fails closed on MFA before parsing or constructing the authenticated RPC client', async () => {
    mocks.requireMutation.mockResolvedValue({
      ok: false,
      context: allowedContext(['platform.users.manage_trial']),
      status: 428,
      errorCode: 'MFA_STEP_UP_REQUIRED',
      stepUpHref: '/account/security?next=%2Fsuperadmin',
    });

    const response = await patchUser(patchRequest(`/api/superadmin/users/${USER_ID}`, validBody), { params: Promise.resolve({ id: USER_ID }) });
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.stepUpHref).toBe('/account/security?next=%2Fsuperadmin');
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it('requires same-origin JSON, strict fields, UUIDs, and an audit reason', async () => {
    expect((await patchUser(patchRequest(`/api/superadmin/users/${USER_ID}`, validBody, { origin: 'https://attacker.example' }), { params: Promise.resolve({ id: USER_ID }) })).status).toBe(403);
    expect((await patchUser(patchRequest(`/api/superadmin/users/${USER_ID}`, validBody, { contentType: 'text/plain' }), { params: Promise.resolve({ id: USER_ID }) })).status).toBe(415);
    expect((await patchUser(patchRequest('/api/superadmin/users/not-a-uuid', validBody), { params: Promise.resolve({ id: 'not-a-uuid' }) })).status).toBe(400);
    expect((await patchUser(patchRequest(`/api/superadmin/users/${USER_ID}`, { ...validBody, reason: 'rövid', unexpected: true }), { params: Promise.resolve({ id: USER_ID }) })).status).toBe(400);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it('calls only the authenticated atomic trial RPC with its final signature', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        outcome: 'updated',
        profile_id: USER_ID,
        trial: {
          free_trial_start: '2026-08-30T00:00:00.000Z',
          free_trial_days: 30,
          free_trial_never_expires: false,
        },
        replayed: false,
      },
      error: null,
    });
    mocks.createServerClient.mockReturnValue({ rpc });

    const response = await patchUser(patchRequest(`/api/superadmin/users/${USER_ID}`, validBody), { params: Promise.resolve({ id: USER_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, outcome: 'updated', profileId: USER_ID, replayed: false });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('update_platform_user_trial', {
      p_profile_id: USER_ID,
      p_free_trial_start: '2026-08-30T00:00:00.000Z',
      p_free_trial_days: 30,
      p_free_trial_never_expires: false,
      p_reason: validBody.reason,
      p_idempotency_key: REQUEST_ID,
    });
  });
});

describe('superadmin feature mutation', () => {
  const patch = {
    name: 'Dokumentumtár',
    description: null,
    module: 'documents',
    route_path: '/documents',
    menu_path: 'Dokumentumok',
    tier: 'pro',
    enabled: true,
  };
  const validBody = {
    patch,
    reason: 'A termékcsomag funkcióbeállításának javítása.',
    idempotencyKey: REQUEST_ID,
  };

  it('rejects unknown or malformed patch fields instead of coercing them', async () => {
    const response = await patchFeature(
      patchRequest(`/api/superadmin/features/${FEATURE_ID}`, { ...validBody, patch: { ...patch, enabled: 'yes', unsafe: true } }),
      { params: Promise.resolve({ id: FEATURE_ID }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.digest).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it('digests the allowlisted payload then calls the authenticated atomic feature RPC', async () => {
    const digest = `sha256:${'b'.repeat(64)}`;
    mocks.digest.mockResolvedValue({ digest, errorCode: null });
    const rpc = vi.fn().mockResolvedValue({
      data: {
        outcome: 'updated',
        feature_id: FEATURE_ID,
        feature: { ...patch, sort_order: 10 },
        replayed: true,
      },
      error: null,
    });
    const serverClient = { rpc };
    mocks.createServerClient.mockReturnValue(serverClient);

    const response = await patchFeature(patchRequest(`/api/superadmin/features/${FEATURE_ID}`, validBody), { params: Promise.resolve({ id: FEATURE_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, outcome: 'updated', replayed: true, featureId: FEATURE_ID });
    expect(mocks.digest).toHaveBeenCalledWith(serverClient, { feature_id: FEATURE_ID, patch });
    expect(rpc).toHaveBeenCalledWith('update_platform_feature', {
      p_feature_id: FEATURE_ID,
      p_patch: patch,
      p_reason: validBody.reason,
      p_idempotency_key: REQUEST_ID,
      p_expected_payload_digest: digest,
    });
  });

  it('maps a database no-op to a safe conflict without leaking raw details', async () => {
    mocks.authorityErrorCode.mockReturnValue('PLATFORM_FEATURE_NO_CHANGE');
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'password=private-database-secret' },
    });
    mocks.createServerClient.mockReturnValue({ rpc });

    const response = await patchFeature(patchRequest(`/api/superadmin/features/${FEATURE_ID}`, validBody), { params: Promise.resolve({ id: FEATURE_ID }) });
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(text).toContain('PLATFORM_FEATURE_NO_CHANGE');
    expect(text).not.toContain('private-database-secret');
  });
});
