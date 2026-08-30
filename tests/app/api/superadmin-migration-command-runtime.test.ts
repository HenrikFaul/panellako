import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PLATFORM_JOB_COMMAND_CONTRACT_VERSION } from '@/lib/superadmin/platform-job-command-sql';

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  createAdminClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/superadmin-auth', () => ({
  isSuperadminAuthenticated: mocks.authenticated,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { POST } from '@/app/api/superadmin/apply-migrations/route';

function migrationRequest(idempotencyKey = '44444444-4444-4444-8444-444444444444') {
  return new NextRequest('https://panellako.hu/api/superadmin/apply-migrations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: 'panellako.hu',
      Origin: 'https://panellako.hu',
      'Sec-Fetch-Site': 'same-origin',
    },
    body: JSON.stringify({
      confirmation: 'APPLY_PENDING_MIGRATIONS',
      idempotencyKey,
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
  mocks.authenticated.mockResolvedValue(true);
  mocks.from.mockImplementation((table: string) => queryFor(table));
  mocks.createAdminClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'private-service-key');
  vi.stubEnv('SUPERADMIN_EMAIL', 'Admin@PanelLako.HU');
});

describe('superadmin migration command runtime guard', () => {
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
    expect(await response.json()).toMatchObject({ error: 'MIGRATION_ALREADY_RUNNING' });
    expect(mocks.rpc).not.toHaveBeenCalledWith('exec_sql', expect.anything());
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
      p_actor_id: 'admin@panellako.hu',
    }));
  });
});
