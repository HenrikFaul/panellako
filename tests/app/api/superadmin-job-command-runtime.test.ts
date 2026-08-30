import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/superadmin-auth', () => ({
  isSuperadminAuthenticated: mocks.authenticated,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/lib/ndvi-mosaic', () => ({
  HU_BBOX: [45, 16, 49, 23],
  renderHungaryNdviTiled: vi.fn(),
  downscalePng: vi.fn(),
}));

import { POST } from '@/app/api/superadmin/jobs/run/route';

function jobRequest(idempotencyKey = '11111111-1111-4111-8111-111111111111') {
  return new NextRequest('https://panellako.hu/api/superadmin/jobs/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: 'panellako.hu',
      Origin: 'https://panellako.hu',
      'Sec-Fetch-Site': 'same-origin',
    },
    body: JSON.stringify({ job: 'bkk_building_stops', idempotencyKey }),
  });
}

function startedCommand() {
  return {
    data: {
      outcome: 'started',
      command_id: '22222222-2222-4222-8222-222222222222',
      log_id: '33333333-3333-4333-8333-333333333333',
      log_started_at: '2026-08-30T12:00:00.000Z',
    },
    error: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.authenticated.mockResolvedValue(true);
  mocks.createAdminClient.mockReturnValue({ rpc: mocks.rpc });
  vi.stubEnv('SUPERADMIN_EMAIL', 'Admin@PanelLako.HU');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://panellako.hu');
});

describe('superadmin job command runtime guard', () => {
  it('starts and completes through the atomic RPC contract', async () => {
    mocks.rpc
      .mockResolvedValueOnce(startedCommand())
      .mockResolvedValueOnce({ data: { outcome: 'completed' }, error: null });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      buildingsProcessed: 12,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jobRequest());
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      requestId: '11111111-1111-4111-8111-111111111111',
      result: { body: { buildingsProcessed: 12 } },
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'begin_platform_job_command', expect.objectContaining({
      p_command_kind: 'job',
      p_target_key: 'platform:mutations',
      p_lease_seconds: 900,
      p_start_payload: { job: 'bkk_building_stops' },
    }));
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'complete_platform_job_command', expect.objectContaining({
      p_status: 'ok',
      p_actor_id: 'admin@panellako.hu',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('replays a completed receipt without executing the job again', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        outcome: 'replayed',
        command_id: '22222222-2222-4222-8222-222222222222',
        status: 'ok',
        safe_result: { ok: true, status: 200, body: { buildingsProcessed: 12 } },
      },
      error: null,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jobRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      replayed: true,
      job: 'bkk_building_stops',
      commandStatus: 'ok',
      result: { ok: true, status: 200, body: { buildingsProcessed: 12 } },
      requestId: '11111111-1111-4111-8111-111111111111',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('does not execute side effects when the global target is already running', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { outcome: 'already_running' }, error: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jobRequest());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error: 'JOB_ALREADY_RUNNING' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('distinguishes idempotency key reuse from a legitimate replay', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { outcome: 'idempotency_conflict' }, error: null });
    vi.stubGlobal('fetch', vi.fn());

    const response = await POST(jobRequest());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error: 'JOB_IDEMPOTENCY_CONFLICT' });
  });

  it('fails closed when atomic completion cannot be proven', async () => {
    mocks.rpc
      .mockResolvedValueOnce(startedCommand())
      .mockResolvedValueOnce({ data: { outcome: 'not_running' }, error: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      buildingsProcessed: 3,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const response = await POST(jobRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ ok: false, error: 'JOB_AUDIT_INCOMPLETE' });
  });

  it('redacts provider diagnostics and returns an allowlisted error code', async () => {
    mocks.rpc
      .mockResolvedValueOnce(startedCommand())
      .mockResolvedValueOnce({ data: { outcome: 'completed' }, error: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      apiKey: 'private-key',
      error: 'postgres://private-connection',
      processed: 7,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })));

    const response = await POST(jobRequest());
    const text = await response.text();
    const body = JSON.parse(text) as Record<string, unknown>;

    expect(response.status).toBe(207);
    expect(body.error).toBe('JOB_EXECUTION_FAILED');
    expect(text).toContain('processed');
    expect(text).not.toContain('private-key');
    expect(text).not.toContain('private-connection');
  });
});
