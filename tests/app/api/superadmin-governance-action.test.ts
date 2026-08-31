import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requirePlatformMutation: vi.fn(),
  platformAuthorityErrorCode: vi.fn(),
  getDatabasePlatformPayloadDigest: vi.fn(),
  createClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  requirePlatformMutation: mocks.requirePlatformMutation,
  platformAuthorityErrorCode: mocks.platformAuthorityErrorCode,
  getDatabasePlatformPayloadDigest: mocks.getDatabasePlatformPayloadDigest,
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));

import { POST } from '@/app/api/superadmin/governance/action/route';

const operatorContext = {
  authenticated: true,
  mode: 'operator',
  operatorProfileId: '11111111-1111-4111-8111-111111111111',
  operatorEmail: 'operator@panellako.hu',
  assuranceLevel: 'aal2',
  roleKeys: ['PLATFORM_ADMIN'],
  capabilityKeys: ['platform.operators.manage'],
  authorityValidUntil: null,
  activeSupportSessions: [],
  canBootstrap: false,
  breakGlassExpiresAt: null,
};

function request(body: unknown, origin = 'https://panellako.hu') {
  return new NextRequest('https://panellako.hu/api/superadmin/governance/action', {
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
  mocks.createClient.mockReturnValue({ rpc: mocks.rpc });
  mocks.requirePlatformMutation.mockResolvedValue({
    ok: true,
    context: operatorContext,
    status: 403,
    errorCode: 'PLATFORM_CAPABILITY_DENIED',
  });
  mocks.platformAuthorityErrorCode.mockReturnValue('PLATFORM_ACTION_FAILED');
  mocks.getDatabasePlatformPayloadDigest.mockResolvedValue({ digest: `sha256:${'a'.repeat(64)}`, errorCode: null });
  mocks.rpc.mockResolvedValue({ data: { outcome: 'ok' }, error: null });
});

describe('superadmin governance action API', () => {
  it('rejects cross-origin requests before creating a user client', async () => {
    const response = await POST(request({ action: 'approval.decide' }, 'https://attacker.example'));
    expect(response.status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('prepares the canonical grant payload before requesting four-eyes approval', async () => {
    const canonical = {
      profile_id: '22222222-2222-4222-8222-222222222222',
      role_key: 'SUPPORT_OPERATOR',
      valid_from: '2026-08-30T20:00:00.000Z',
      valid_to: null,
      grant_reason: 'Ügyfélszolgálati feladatkör.',
    };
    mocks.rpc
      .mockResolvedValueOnce({ data: { action_key: 'platform.operators.grant', payload: canonical, payload_digest: `sha256:${'b'.repeat(64)}` }, error: null })
      .mockResolvedValueOnce({ data: { outcome: 'created', approval_id: '33333333-3333-4333-8333-333333333333' }, error: null });
    const response = await POST(request({
      action: 'approval.request',
      requestedAction: 'operator.grant',
      input: {
        targetProfileId: canonical.profile_id,
        roleKey: canonical.role_key,
        validFrom: canonical.valid_from,
        validTo: null,
        reason: canonical.grant_reason,
      },
      idempotencyKey: '44444444-4444-4444-8444-444444444444',
      ttlMinutes: 10,
    }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith('create_platform_command_approval', expect.objectContaining({
      p_action_key: 'platform.operators.grant',
      p_request_payload: canonical,
      p_target_id: canonical.profile_id,
    }));
  });

  it('passes the visible exact digest into a four-eyes decision', async () => {
    const digest = `sha256:${'c'.repeat(64)}`;
    const response = await POST(request({
      action: 'approval.decide',
      approvalId: '33333333-3333-4333-8333-333333333333',
      decision: 'APPROVE',
      payloadDigest: digest,
      reason: 'A cél és a változás ellenőrizve.',
    }));
    expect(response.status).toBe(200);
    expect(mocks.requirePlatformMutation).toHaveBeenCalledWith('platform.approvals.decide');
    expect(mocks.rpc).toHaveBeenCalledWith('decide_platform_command_approval', expect.objectContaining({
      p_expected_payload_digest: digest,
    }));
  });

  it('returns the MFA step-up contract before invoking a protected RPC', async () => {
    mocks.requirePlatformMutation.mockResolvedValue({
      ok: false,
      context: { ...operatorContext, assuranceLevel: 'aal1' },
      status: 428,
      errorCode: 'MFA_STEP_UP_REQUIRED',
      stepUpHref: '/account/security?next=%2Fsuperadmin',
    });
    const response = await POST(request({
      action: 'support.decide',
      supportSessionId: '55555555-5555-4555-8555-555555555555',
      decision: 'REJECT',
      reason: 'A kért jogosultsági kör túl széles.',
    }));
    expect(response.status).toBe(428);
    expect(await response.json()).toMatchObject({ error: 'MFA_STEP_UP_REQUIRED' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('computes the database digest before revoking a support session', async () => {
    const response = await POST(request({
      action: 'support.revoke',
      supportSessionId: '55555555-5555-4555-8555-555555555555',
      reason: 'A támogatási feladat befejeződött.',
      idempotencyKey: '66666666-6666-4666-8666-666666666666',
    }));
    expect(response.status).toBe(200);
    expect(mocks.getDatabasePlatformPayloadDigest).toHaveBeenCalledWith(expect.anything(), {
      support_session_id: '55555555-5555-4555-8555-555555555555',
      revocation_reason: 'A támogatási feladat befejeződött.',
    });
    expect(mocks.rpc).toHaveBeenCalledWith('revoke_platform_support_session', expect.objectContaining({
      p_expected_payload_digest: `sha256:${'a'.repeat(64)}`,
    }));
  });
});
