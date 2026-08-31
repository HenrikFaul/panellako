import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getPlatformAuthorityContext: vi.fn(),
  platformAuthorityErrorCode: vi.fn(),
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  getPlatformAuthorityContext: mocks.getPlatformAuthorityContext,
  platformAuthorityErrorCode: mocks.platformAuthorityErrorCode,
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));

import { GET, POST } from '@/app/api/superadmin/operator/context/route';

const bootstrapContext = {
  authenticated: true,
  mode: 'bootstrap',
  operatorProfileId: '11111111-1111-4111-8111-111111111111',
  operatorEmail: 'operator@panellako.hu',
  assuranceLevel: 'aal2',
  roleKeys: [],
  capabilityKeys: [],
  authorityValidUntil: null,
  activeSupportSessions: [],
  canBootstrap: true,
  breakGlassExpiresAt: null,
};

function request(body: unknown, origin = 'https://panellako.hu') {
  return new NextRequest('https://panellako.hu/api/superadmin/operator/context', {
    method: 'POST',
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
  mocks.getPlatformAuthorityContext.mockResolvedValue(bootstrapContext);
  mocks.createAdminClient.mockReturnValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ data: { outcome: 'bootstrapped' }, error: null });
  mocks.platformAuthorityErrorCode.mockReturnValue('PLATFORM_BOOTSTRAP_FAILED');
});

describe('superadmin operator context API', () => {
  it('returns the safe current authority context without caching it', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ context: bootstrapContext });
  });

  it('bootstraps only the authenticated verified candidate at AAL2', async () => {
    const response = await POST(request({ reason: 'Első név szerinti platformadmin beállítása.' }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('bootstrap_first_platform_operator', {
      p_profile_id: bootstrapContext.operatorProfileId,
      p_role_key: 'PLATFORM_ADMIN',
      p_reason: 'Első név szerinti platformadmin beállítása.',
    });
  });

  it('fails before touching the service client for cross-origin and low-assurance requests', async () => {
    expect((await POST(request({ reason: 'Hosszú, érvényes indok.' }, 'https://attacker.example'))).status).toBe(403);
    mocks.getPlatformAuthorityContext.mockResolvedValue({ ...bootstrapContext, assuranceLevel: 'aal1' });
    const lowAssurance = await POST(request({ reason: 'Hosszú, érvényes indok.' }));
    expect(lowAssurance.status).toBe(428);
    expect(await lowAssurance.json()).toMatchObject({ error: 'MFA_STEP_UP_REQUIRED' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
});
