import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuperadminGovernance from '@/components/superadmin-governance';

const OPERATOR_ID = '11111111-1111-4111-8111-111111111111';
const APPROVAL_ID = '22222222-2222-4222-8222-222222222222';

vi.mock('@/components/superadmin-authority-context', () => ({
  usePlatformAuthority: () => ({
    authenticated: true,
    mode: 'operator',
    operatorProfileId: OPERATOR_ID,
    operatorEmail: 'operator@example.hu',
    assuranceLevel: 'aal2',
    roleKeys: ['PLATFORM_ADMIN'],
    capabilityKeys: ['platform.migrations.apply'],
    authorityValidUntil: null,
    activeSupportSessions: [],
    canBootstrap: false,
    breakGlassExpiresAt: null,
  }),
}));

const snapshot = {
  roles: [],
  assignments: [],
  supportSessions: [],
  releaseAttestations: [],
  limited: false,
  approvals: [{
    id: APPROVAL_ID,
    initiator: { id: OPERATOR_ID, displayName: 'Operator', email: 'o***@e***.hu' },
    approver: { id: '33333333-3333-4333-8333-333333333333', displayName: 'Approver', email: 'a***@e***.hu' },
    capabilityKey: 'platform.migrations.apply',
    actionKey: 'platform.migrations.apply',
    targetType: 'migration_chain',
    targetId: '20260830140000_platform_operator_authority',
    payload: {
      migration_head: '20260830140000_platform_operator_authority',
      migration_names: ['platform_audit_events'],
    },
    payloadDigest: `sha256:${'a'.repeat(64)}`,
    reason: 'A jóváhagyott migrációs javítólánc alkalmazása.',
    status: 'APPROVED',
    decisionReason: 'A változáscsomag ellenőrizve.',
    requestedAt: '2026-08-30T10:00:00.000Z',
    expiresAt: '2026-08-30T10:10:00.000Z',
    consumedAt: null,
  }],
};

beforeEach(() => {
  document.documentElement.lang = 'hu';
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => '44444444-4444-4444-8444-444444444444') });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === '/api/superadmin/governance' && !init?.method) {
      return new Response(JSON.stringify(snapshot), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(input) === '/api/superadmin/apply-migrations' && init?.method === 'POST') {
      return new Response(JSON.stringify({ ok: true, results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected request: ${String(input)}`);
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe('SuperadminGovernance migration approval execution', () => {
  it('executes only the approved request as its initiator and preserves the audited reason', async () => {
    render(<SuperadminGovernance />);

    fireEvent.click(await screen.findByRole('button', { name: 'Jóváhagyott művelet végrehajtása' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/superadmin/apply-migrations', expect.objectContaining({ method: 'POST' })));
    const call = vi.mocked(fetch).mock.calls.find(([url, init]) => String(url) === '/api/superadmin/apply-migrations' && init?.method === 'POST');
    const body = JSON.parse(String(call?.[1]?.body));
    expect(body).toMatchObject({
      action: 'execute',
      confirmation: 'APPLY_PENDING_MIGRATIONS',
      reason: 'A jóváhagyott migrációs javítólánc alkalmazása.',
      approvalId: APPROVAL_ID,
      idempotencyKey: '44444444-4444-4444-8444-444444444444',
    });
  });
});
