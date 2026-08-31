import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requirePlatformMutation: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  requirePlatformMutation: mocks.requirePlatformMutation,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { POST } from '@/app/api/superadmin/gtfs/import/route';

const BATCH_ID = '11111111-1111-4111-8111-111111111111';
const IDEMPOTENCY_KEY = '22222222-2222-4222-8222-222222222222';
const COMMAND_ID = '33333333-3333-4333-8333-333333333333';
const ACTOR_ID = '44444444-4444-4444-8444-444444444444';
const REASON = 'BKK GTFS adatállomány kézi frissítése.';

type AdminClientOptions = {
  begin?: Record<string, unknown>;
  beginError?: unknown;
  complete?: Record<string, unknown>;
  completeError?: unknown;
  upsertError?: unknown;
};

function adminClient(options: AdminClientOptions = {}) {
  const upsert = vi.fn().mockResolvedValue({ error: options.upsertError ?? null });
  const from = vi.fn(() => ({ upsert }));
  const rpc = vi.fn(async (name: string, _params?: unknown) => {
    void _params;
    if (name === 'begin_platform_job_command') {
      return {
        data: options.begin ?? { outcome: 'started', command_id: COMMAND_ID },
        error: options.beginError ?? null,
      };
    }
    if (name === 'complete_platform_job_command') {
      return {
        data: options.complete ?? { outcome: 'completed' },
        error: options.completeError ?? null,
      };
    }
    return { data: null, error: { code: 'UNEXPECTED_RPC' } };
  });
  return { from, rpc, upsert };
}

function request(
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest('https://panellako.hu/api/superadmin/gtfs/import', {
    method: 'POST',
    headers: {
      host: 'panellako.hu',
      origin: 'https://panellako.hu',
      'sec-fetch-site': 'same-origin',
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function payload(rows: unknown[] = [{
  feed_id: 'bkk',
  feed_publisher_name: 'BKK',
  feed_publisher_url: 'https://bkk.hu',
  feed_lang: 'hu',
  feed_start_date: '20260830',
  feed_end_date: '20260930',
  feed_version: 'v1',
}]) {
  return {
    fileType: 'feed_info',
    rows,
    batchId: BATCH_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    reason: REASON,
  };
}

function digestFor(input: ReturnType<typeof payload>): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({
    fileType: input.fileType,
    batchId: input.batchId,
    rows: input.rows,
  })).digest('hex')}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePlatformMutation.mockResolvedValue({
    ok: true,
    context: { mode: 'operator', operatorProfileId: ACTOR_ID, assuranceLevel: 'aal2' },
  });
  mocks.createAdminClient.mockReturnValue(adminClient());
});

describe('superadmin GTFS batch import', () => {
  it('uses only the canonical service-role client and contains no anonymous fallback', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/api/superadmin/gtfs/import/route.ts'),
      'utf8',
    );

    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin'");
    expect(source).not.toContain("from '@supabase/supabase-js'");
    expect(source).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(source).not.toContain('NEXT_SUPABASE_SERVICE_ROLE_KEY');
    expect(source).not.toContain('process.env.SUPABASE_URL');
    expect(source).not.toContain('process.env.SUPERADMIN_EMAIL');
    expect(source).not.toContain("from('platform_job_commands')");
    expect(source).toContain("requirePlatformMutation('platform.jobs.run')");
  });

  it('requires a named AAL2 operator and a bounded reason before creating the admin client', async () => {
    mocks.requirePlatformMutation.mockResolvedValue({
      ok: false,
      status: 428,
      errorCode: 'MFA_STEP_UP_REQUIRED',
      stepUpHref: '/account/security?next=%2Fsuperadmin',
      context: { mode: 'operator', operatorProfileId: ACTOR_ID, assuranceLevel: 'aal1' },
    });
    const stepUp = await POST(request(payload()));
    expect(stepUp.status).toBe(428);
    expect(await stepUp.json()).toEqual({
      error: 'MFA_STEP_UP_REQUIRED',
      stepUpHref: '/account/security?next=%2Fsuperadmin',
    });

    mocks.requirePlatformMutation.mockResolvedValue({
      ok: true,
      context: { mode: 'operator', operatorProfileId: ACTOR_ID, assuranceLevel: 'aal2' },
    });
    const missingReason = await POST(request({ ...payload(), reason: undefined }));
    expect(missingReason.status).toBe(400);
    expect(await missingReason.json()).toEqual({ error: 'PLATFORM_REASON_REQUIRED' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('rejects cross-origin and oversized requests before constructing the admin client', async () => {
    const crossOrigin = await POST(request(payload(), { origin: 'https://evil.example' }));
    expect(crossOrigin.status).toBe(403);
    expect(await crossOrigin.json()).toEqual({ error: 'ORIGIN_NOT_ALLOWED' });

    const oversized = await POST(request(payload(), { 'content-length': String(2 * 1024 * 1024 + 1) }));
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({ error: 'REQUEST_TOO_LARGE' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('requires UUID batch/idempotency identities and enforces the 500-row contract', async () => {
    const invalidKey = await POST(request({ ...payload(), idempotencyKey: 'retry-me' }));
    expect(invalidKey.status).toBe(400);
    expect(await invalidKey.json()).toEqual({ error: 'IDEMPOTENCY_KEY_REQUIRED' });

    const tooManyRows = await POST(request(payload(Array.from({ length: 501 }, () => ({})))));
    expect(tooManyRows.status).toBe(400);
    expect(await tooManyRows.json()).toEqual({ error: 'GTFS_BATCH_LIMIT_EXCEEDED' });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('holds the global mutation command for exactly one batch and completes its audit', async () => {
    const client = adminClient();
    mocks.createAdminClient.mockReturnValue(client);
    const requestPayload = payload();
    const batchDigest = digestFor(requestPayload);

    const response = await POST(request(requestPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ imported: 1, skipped: 0, requestId: IDEMPOTENCY_KEY });
    expect(client.rpc).toHaveBeenNthCalledWith(1, 'begin_platform_job_command', {
      p_command_kind: 'job',
      p_job_id: `gtfs_import:feed_info:${BATCH_ID}`,
      p_target_key: 'platform:mutations',
      p_idempotency_key: IDEMPOTENCY_KEY,
      p_actor_id: ACTOR_ID,
      p_lease_seconds: 900,
      p_start_payload: {
        file_type: 'feed_info',
        batch_id: BATCH_ID,
        batch_digest: batchDigest,
        batch_rows: 1,
        reason: REASON,
      },
    });
    expect(client.upsert).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenNthCalledWith(2, 'complete_platform_job_command', expect.objectContaining({
      p_command_id: COMMAND_ID,
      p_actor_id: ACTOR_ID,
      p_status: 'ok',
      p_safe_result: expect.objectContaining({
        code: 'GTFS_IMPORT_COMPLETED',
        batch_id: BATCH_ID,
        batch_digest: batchDigest,
        imported: 1,
      }),
    }));
  });

  it('binds idempotency to a server-side digest of the complete batch content', async () => {
    const client = adminClient();
    mocks.createAdminClient.mockReturnValue(client);
    const firstPayload = payload();
    const changedPayload = payload([{ ...firstPayload.rows[0] as Record<string, string>, feed_version: 'v2' }]);

    await POST(request(firstPayload));
    await POST(request(changedPayload));

    const firstStart = client.rpc.mock.calls[0]?.[1] as { p_start_payload?: { batch_digest?: string } };
    const secondStart = client.rpc.mock.calls[2]?.[1] as { p_start_payload?: { batch_digest?: string } };
    expect(firstStart.p_start_payload?.batch_digest).toBe(digestFor(firstPayload));
    expect(secondStart.p_start_payload?.batch_digest).toBe(digestFor(changedPayload));
    expect(secondStart.p_start_payload?.batch_digest).not.toBe(firstStart.p_start_payload?.batch_digest);
  });

  it('rejects overlap before any GTFS upsert', async () => {
    const client = adminClient({ begin: { outcome: 'already_running' } });
    mocks.createAdminClient.mockReturnValue(client);

    const response = await POST(request(payload()));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'PLATFORM_MUTATION_ALREADY_RUNNING',
      requestId: IDEMPOTENCY_KEY,
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('replays a completed batch directly from the v2 begin receipt without a table read or upsert', async () => {
    const requestPayload = payload();
    const batchDigest = digestFor(requestPayload);
    const client = adminClient({
      begin: {
        outcome: 'replayed',
        command_id: COMMAND_ID,
        status: 'ok',
        safe_result: {
          code: 'GTFS_IMPORT_COMPLETED',
          batch_id: BATCH_ID,
          batch_digest: batchDigest,
          file_type: 'feed_info',
          imported: 1,
          skipped: 0,
        },
      },
    });
    mocks.createAdminClient.mockReturnValue(client);

    const response = await POST(request(requestPayload));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      imported: 1,
      skipped: 0,
      replayed: true,
      requestId: IDEMPOTENCY_KEY,
    });
    expect(client.from).not.toHaveBeenCalled();
    expect(client.upsert).not.toHaveBeenCalled();
  });

  it('redacts database failures and closes the command as an error', async () => {
    const client = adminClient({
      upsertError: { message: 'SUPABASE_SERVICE_ROLE_KEY=never-leak raw-row-details' },
    });
    mocks.createAdminClient.mockReturnValue(client);

    const response = await POST(request(payload()));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'GTFS_IMPORT_FAILED', requestId: IDEMPOTENCY_KEY });
    expect(serialized).not.toContain('never-leak');
    expect(client.rpc).toHaveBeenLastCalledWith('complete_platform_job_command', expect.objectContaining({
      p_status: 'error',
      p_safe_result: expect.objectContaining({ code: 'GTFS_IMPORT_FAILED' }),
    }));
  });
});
