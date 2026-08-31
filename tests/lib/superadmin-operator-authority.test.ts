import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  rpc: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  getLegacySuperadminSession: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/lib/superadmin-auth', () => ({ getLegacySuperadminSession: mocks.getLegacySuperadminSession }));

import {
  getDatabasePlatformPayloadDigest,
  getPlatformAuthorityContext,
  platformAuthorityErrorCode,
  requirePlatformMutation,
  requirePlatformRead,
} from '@/lib/superadmin/operator-authority';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'operator@panellako.hu',
  email_confirmed_at: '2026-08-30T10:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockReturnValue({
    auth: {
      getUser: mocks.getUser,
      mfa: { getAuthenticatorAssuranceLevel: mocks.getAuthenticatorAssuranceLevel },
    },
    rpc: mocks.rpc,
  });
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal2' }, error: null });
  mocks.rpc.mockResolvedValue({
    data: {
      operator_profile_id: user.id,
      role_keys: ['PLATFORM_ADMIN'],
      capability_keys: ['platform.overview.read', 'platform.features.manage'],
      assurance_level: 'aal2',
      authority_valid_until: null,
      active_support_sessions: [],
    },
    error: null,
  });
  mocks.getLegacySuperadminSession.mockResolvedValue(null);
  mocks.createAdminClient.mockReturnValue({
    from: () => ({ select: vi.fn().mockResolvedValue({ count: 1, error: null }) }),
  });
  vi.stubEnv('SUPERADMIN_EMAIL', 'operator@panellako.hu');
});

describe('platform operator authority', () => {
  it('projects a named operator and enforces exact capabilities', async () => {
    const context = await getPlatformAuthorityContext();
    expect(context).toMatchObject({ mode: 'operator', operatorProfileId: user.id, assuranceLevel: 'aal2' });
    expect((await requirePlatformRead('platform.overview.read')).ok).toBe(true);
    expect((await requirePlatformMutation('platform.features.manage')).ok).toBe(true);
    expect(await requirePlatformMutation('platform.users.manage_trial')).toMatchObject({
      ok: false,
      status: 403,
      errorCode: 'PLATFORM_CAPABILITY_DENIED',
    });
  });

  it('requires an MFA step-up for a named write even when the capability exists', async () => {
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1' }, error: null });
    mocks.rpc.mockResolvedValue({
      data: {
        operator_profile_id: user.id,
        role_keys: ['PLATFORM_ADMIN'],
        capability_keys: ['platform.features.manage'],
        assurance_level: 'aal1',
        active_support_sessions: [],
      },
      error: null,
    });
    expect(await requirePlatformMutation('platform.features.manage')).toMatchObject({
      ok: false,
      status: 428,
      errorCode: 'MFA_STEP_UP_REQUIRED',
      stepUpHref: '/account/security?next=%2Fsuperadmin',
    });
  });

  it('limits the legacy break-glass credential to read capabilities', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.getLegacySuperadminSession.mockResolvedValue({
      email: 'legacy@panellako.hu',
      issuedAtSec: 1_788_086_400,
      expSec: 1_788_090_000,
    });
    expect((await requirePlatformRead('platform.audit.read')).ok).toBe(true);
    expect(await requirePlatformMutation('platform.settings.manage')).toMatchObject({
      ok: false,
      status: 403,
      errorCode: 'PLATFORM_OPERATOR_REQUIRED',
    });
  });

  it('offers the one-time bootstrap only to the verified configured identity when no assignment exists', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'denied' } });
    mocks.createAdminClient.mockReturnValue({
      from: () => ({ select: vi.fn().mockResolvedValue({ count: 0, error: null }) }),
    });
    expect(await getPlatformAuthorityContext()).toMatchObject({
      authenticated: true,
      mode: 'bootstrap',
      canBootstrap: true,
      operatorProfileId: user.id,
    });
  });

  it('extracts only stable database error codes', () => {
    expect(platformAuthorityErrorCode({ details: '{"error_code":"MFA_STEP_UP_REQUIRED"}' })).toBe('MFA_STEP_UP_REQUIRED');
    expect(platformAuthorityErrorCode(new Error('sensitive raw error'))).toBe('PLATFORM_ACTION_FAILED');
  });

  it('uses the database canonical JSONB digest contract', async () => {
    mocks.rpc.mockResolvedValue({ data: `sha256:${'a'.repeat(64)}`, error: null });
    await expect(getDatabasePlatformPayloadDigest({ rpc: mocks.rpc } as never, { enabled: true })).resolves.toEqual({
      digest: `sha256:${'a'.repeat(64)}`,
      errorCode: null,
    });
    expect(mocks.rpc).toHaveBeenCalledWith('get_platform_payload_digest', { p_payload: { enabled: true } });
  });
});
