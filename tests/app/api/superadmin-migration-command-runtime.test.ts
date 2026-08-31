import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PLATFORM_JOB_COMMAND_CONTRACT_VERSION } from '@/lib/superadmin/platform-job-command-sql';

const mocks = vi.hoisted(() => ({
  requireMutation: vi.fn(),
  authorityErrorCode: vi.fn(),
  digest: vi.fn(),
  createAdminClient: vi.fn(),
  createAuthenticatedClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  authenticatedRpc: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  requirePlatformMutation: mocks.requireMutation,
  platformAuthorityErrorCode: mocks.authorityErrorCode,
  getDatabasePlatformPayloadDigest: mocks.digest,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createAuthenticatedClient,
}));

import { POST } from '@/app/api/superadmin/apply-migrations/route';

function migrationRequest(
  idempotencyKey = '44444444-4444-4444-8444-444444444444',
  action: 'request' | 'execute' = 'execute',
) {
  return new NextRequest('https://panellako.hu/api/superadmin/apply-migrations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: 'panellako.hu',
      Origin: 'https://panellako.hu',
      'Sec-Fetch-Site': 'same-origin',
    },
    body: JSON.stringify({
      action,
      confirmation: 'APPLY_PENDING_MIGRATIONS',
      idempotencyKey,
      reason: 'A jóváhagyott platform migrációs lánc alkalmazása.',
      ...(action === 'execute' ? { approvalId: '66666666-6666-4666-8666-666666666666' } : {}),
    }),
  });
}

function queryFor(table: string) {
  return {
    select: vi.fn(() => ({
      limit: vi.fn().mockResolvedValue({
        data: table === 'features' ? [{ id: 'feature' }] : [],
        error: null,
      }),
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: { key: 'map_theme' }, error: null }),
      })),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.requireMutation.mockResolvedValue({
    ok: true,
    context: {
      authenticated: true,
      mode: 'operator',
      operatorProfileId: '11111111-1111-4111-8111-111111111111',
      operatorEmail: 'admin@panellako.hu',
      assuranceLevel: 'aal2',
      roleKeys: ['PLATFORM_ADMIN'],
      capabilityKeys: ['platform.migrations.apply'],
      authorityValidUntil: null,
      activeSupportSessions: [],
      canBootstrap: false,
      breakGlassExpiresAt: null,
    },
    status: 403,
    errorCode: 'PLATFORM_CAPABILITY_DENIED',
  });
  mocks.authorityErrorCode.mockReturnValue('PLATFORM_MIGRATION_AUTHORIZATION_FAILED');
  mocks.digest.mockResolvedValue({ digest: `sha256:${'a'.repeat(64)}`, errorCode: null });
  mocks.authenticatedRpc.mockResolvedValue({
    data: {
      outcome: 'authorized',
      approval_id: '66666666-6666-4666-8666-666666666666',
      payload_digest: `sha256:${'a'.repeat(64)}`,
    },
    error: null,
  });
  mocks.createAuthenticatedClient.mockReturnValue({ rpc: mocks.authenticatedRpc });
  mocks.from.mockImplementation((table: string) => queryFor(table));
  mocks.createAdminClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'private-service-key');
});

describe('superadmin migration command runtime guard', () => {
  it('creates a four-eyes approval without constructing the service-role client', async () => {
    mocks.authenticatedRpc.mockResolvedValue({
      data: { outcome: 'requested', approval_id: '66666666-6666-4666-8666-666666666666' },
      error: null,
    });

    const response = await POST(migrationRequest(undefined, 'request'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, approvalPending: true });
    expect(mocks.authenticatedRpc).toHaveBeenCalledWith('create_platform_command_approval', expect.objectContaining({
      p_capability_key: 'platform.migrations.apply',
      p_action_key: 'platform.migrations.apply',
      p_request_payload: expect.objectContaining({
        migration_head: '20260830140000_platform_operator_authority',
        migration_names: expect.any(Array),
        migration_sql_sha256: expect.any(Object),
      }),
    }));
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('rejects a concurrent platform mutation before applying SQL', async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'platform_job_command_contract_version') {
        return { data: PLATFORM_JOB_COMMAND_CONTRACT_VERSION, error: null };
      }
      if (name === 'begin_platform_job_command') {
        return { data: { outcome: 'already_running' }, error: null };
      }
      throw new Error(`unexpected RPC: ${name}`);
    });

    const response = await POST(migrationRequest());

    expect(response.status).toBe(409);
    expect(mocks.authenticatedRpc).toHaveBeenCalledWith('authorize_platform_action', expect.objectContaining({
      p_action_key: 'platform.migrations.apply',
    }));
    expect(await response.json()).toMatchObject({ error: 'MIGRATION_ALREADY_RUNNING' });
    expect(mocks.rpc).not.toHaveBeenCalledWith('exec_sql', expect.anything());
  });

  it('fails closed on a malformed approval authorization before constructing the executor', async () => {
    mocks.authenticatedRpc.mockResolvedValue({ data: { outcome: 'authorized' }, error: null });

    const response = await POST(migrationRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: 'PLATFORM_MIGRATION_AUTHORIZATION_FAILED' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it.each([
    { outcome: 'not_approved', approval_id: '66666666-6666-4666-8666-666666666666', payload_digest: `sha256:${'a'.repeat(64)}` },
    { outcome: 'authorized', approval_id: '77777777-7777-4777-8777-777777777777', payload_digest: `sha256:${'a'.repeat(64)}` },
    { outcome: 'authorized', approval_id: '66666666-6666-4666-8666-666666666666', payload_digest: `sha256:${'b'.repeat(64)}` },
  ])('rejects non-canonical authorization result %#', async authorization => {
    mocks.authenticatedRpc.mockResolvedValue({ data: authorization, error: null });

    const response = await POST(migrationRequest());

    expect(response.status).toBe(502);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('bootstraps a missing contract, then preserves idempotency conflict semantics', async () => {
    let contractChecks = 0;
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'platform_job_command_contract_version') {
        contractChecks += 1;
        return contractChecks === 1
          ? { data: null, error: { code: '42883' } }
          : { data: PLATFORM_JOB_COMMAND_CONTRACT_VERSION, error: null };
      }
      if (name === 'exec_sql') return { data: null, error: null };
      if (name === 'begin_platform_job_command') {
        return { data: { outcome: 'idempotency_conflict' }, error: null };
      }
      throw new Error(`unexpected RPC: ${name}`);
    });

    const response = await POST(migrationRequest());
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toMatchObject({ error: 'MIGRATION_IDEMPOTENCY_CONFLICT' });
    expect(mocks.rpc).toHaveBeenCalledWith('exec_sql', expect.objectContaining({
      sql: expect.stringContaining('create or replace function public.begin_platform_job_command'),
    }));
    expect(text).not.toContain('private-service-key');
    expect(text).not.toContain('create or replace function');
  });

  it('replays a completed migration receipt without applying SQL again', async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'platform_job_command_contract_version') {
        return { data: PLATFORM_JOB_COMMAND_CONTRACT_VERSION, error: null };
      }
      if (name === 'begin_platform_job_command') {
        return {
          data: {
            outcome: 'replayed',
            command_id: '55555555-5555-4555-8555-555555555555',
            status: 'ok',
            safe_result: { ok: true, applied: 2, already_applied: 7, failed: 0 },
          },
          error: null,
        };
      }
      throw new Error(`unexpected RPC: ${name}`);
    });

    const response = await POST(migrationRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      replayed: true,
      commandStatus: 'ok',
      result: { ok: true, applied: 2, already_applied: 7, failed: 0 },
      requestId: '44444444-4444-4444-8444-444444444444',
    });
    expect(mocks.rpc).not.toHaveBeenCalledWith('exec_sql', expect.anything());
    expect(mocks.rpc).not.toHaveBeenCalledWith('complete_platform_job_command', expect.anything());
  });

  it('completes an all-applied batch through the same atomic command contract', async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'platform_job_command_contract_version') {
        return { data: PLATFORM_JOB_COMMAND_CONTRACT_VERSION, error: null };
      }
      if (name === 'begin_platform_job_command') {
        return {
          data: {
            outcome: 'started',
            command_id: '55555555-5555-4555-8555-555555555555',
          },
          error: null,
        };
      }
      if (name === 'exec_sql') return { data: null, error: null };
      if (name === 'complete_platform_job_command') {
        return { data: { outcome: 'completed' }, error: null };
      }
      throw new Error(`unexpected RPC: ${name}`);
    });

    const response = await POST(migrationRequest());
    const body = await response.json() as { ok: boolean; results: unknown[] };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
    expect(mocks.rpc).toHaveBeenCalledWith('complete_platform_job_command', expect.objectContaining({
      p_command_id: '55555555-5555-4555-8555-555555555555',
      p_status: 'ok',
      p_actor_id: '11111111-1111-4111-8111-111111111111',
    }));
  });
});
