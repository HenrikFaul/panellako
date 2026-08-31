import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const mocks = vi.hoisted(() => ({
  requireRead: vi.fn(),
  requireMutation: vi.fn(),
  hasCapability: vi.fn(),
  digest: vi.fn(),
  authorityErrorCode: vi.fn(),
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  requirePlatformRead: mocks.requireRead,
  requirePlatformMutation: mocks.requireMutation,
  hasPlatformCapability: mocks.hasCapability,
  getDatabasePlatformPayloadDigest: mocks.digest,
  platformAuthorityErrorCode: mocks.authorityErrorCode,
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createServerClient }));

import { GET, PATCH } from '@/app/api/superadmin/settings/route';

function context(capabilityKeys: string[]) {
  return {
    authenticated: true,
    mode: 'operator',
    operatorProfileId: '11111111-1111-4111-8111-111111111111',
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

function patchRequest(body: unknown, origin = 'https://panellako.hu') {
  return new NextRequest('https://panellako.hu/api/superadmin/settings', {
    method: 'PATCH',
    headers: {
      Host: 'panellako.hu',
      Origin: origin,
      'Sec-Fetch-Site': origin === 'https://panellako.hu' ? 'same-origin' : 'cross-site',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  const allowed = context(['platform.settings.read', 'platform.settings.manage']);
  mocks.requireRead.mockResolvedValue({ ok: true, context: allowed, status: 403, errorCode: 'PLATFORM_CAPABILITY_DENIED' });
  mocks.requireMutation.mockResolvedValue({ ok: true, context: allowed, status: 403, errorCode: 'PLATFORM_CAPABILITY_DENIED' });
  mocks.hasCapability.mockImplementation((candidate: { capabilityKeys: string[] }, key: string) => candidate.capabilityKeys.includes(key));
  mocks.digest.mockResolvedValue({ digest: `sha256:${'a'.repeat(64)}`, errorCode: null });
  mocks.authorityErrorCode.mockReturnValue('PLATFORM_SETTING_UPDATE_FAILED');
});

describe('superadmin settings authority', () => {
  it('protects the read plane and returns only allowlisted settings without caching', async () => {
    const order = vi.fn(async () => ({ data: [{ key: 'map_theme', value: { id: 'nature' }, updated_at: '2026-08-30T00:00:00Z' }], error: null }));
    const chain = { select: vi.fn(() => ({ in: vi.fn(() => ({ order })) })) };
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => chain) });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.requireRead).toHaveBeenCalledWith('platform.settings.read');
    expect(body.settings).toHaveLength(1);
  });

  it('fails closed on MFA before touching the request body or database', async () => {
    mocks.requireMutation.mockResolvedValue({
      ok: false,
      context: context(['platform.settings.manage']),
      status: 428,
      errorCode: 'MFA_STEP_UP_REQUIRED',
      stepUpHref: '/account/security?next=%2Fsuperadmin',
    });

    const response = await PATCH(patchRequest({}));
    expect(response.status).toBe(428);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it('requires same-origin, exact fields, a reason, and a UUID request key', async () => {
    const valid = { key: 'map_theme', value: { id: 'nature' }, reason: 'Térképi kontraszt javítása.', idempotencyKey: REQUEST_ID };
    expect((await PATCH(patchRequest(valid, 'https://attacker.example'))).status).toBe(403);
    expect((await PATCH(patchRequest({ ...valid, unexpected: true }))).status).toBe(400);
    expect((await PATCH(patchRequest({ ...valid, reason: 'rövid' }))).status).toBe(400);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it('digests the canonical payload and invokes only the authenticated atomic RPC', async () => {
    const digest = `sha256:${'b'.repeat(64)}`;
    mocks.digest.mockResolvedValue({ digest, errorCode: null });
    const rpc = vi.fn().mockResolvedValue({ data: { outcome: 'updated', key: 'map_theme', replayed: false }, error: null });
    const client = { rpc };
    mocks.createServerClient.mockReturnValue(client);
    const request = { key: 'map_theme', value: { id: 'nature' }, reason: 'Térképi kontraszt javítása.', idempotencyKey: REQUEST_ID };

    const response = await PATCH(patchRequest(request));
    expect(response.status).toBe(200);
    expect(mocks.digest).toHaveBeenCalledWith(client, { key: 'map_theme', value: { id: 'nature' } });
    expect(rpc).toHaveBeenCalledWith('update_platform_setting', {
      p_key: 'map_theme',
      p_value: { id: 'nature' },
      p_reason: request.reason,
      p_idempotency_key: REQUEST_ID,
      p_expected_payload_digest: digest,
    });
  });
});
