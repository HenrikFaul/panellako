import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requirePlatformRead: vi.fn(),
  requirePlatformMutation: vi.fn(),
  digest: vi.fn(),
  authorityErrorCode: vi.fn(),
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  requirePlatformRead: mocks.requirePlatformRead,
  requirePlatformMutation: mocks.requirePlatformMutation,
  getDatabasePlatformPayloadDigest: mocks.digest,
  platformAuthorityErrorCode: mocks.authorityErrorCode,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createServerClient,
}));

import { GET as getHealth } from '@/app/api/superadmin/health/route';
import { PATCH as patchSettings } from '@/app/api/superadmin/settings/route';
import { GET as getJobLogs } from '@/app/api/superadmin/jobs/logs/route';

function settingsRequest(body: unknown, origin = 'https://panellako.hu') {
  return new NextRequest('https://panellako.hu/api/superadmin/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Host: 'panellako.hu',
      Origin: origin,
      'Sec-Fetch-Site': origin === 'https://panellako.hu' ? 'same-origin' : 'cross-site',
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  const context = {
    authenticated: true,
    mode: 'operator',
    operatorProfileId: '11111111-1111-4111-8111-111111111111',
    operatorEmail: 'operator@panellako.hu',
    assuranceLevel: 'aal2',
    roleKeys: ['PLATFORM_ADMIN'],
    capabilityKeys: ['platform.health.read', 'platform.jobs.read', 'platform.settings.manage'],
    authorityValidUntil: null,
    activeSupportSessions: [],
    canBootstrap: false,
    breakGlassExpiresAt: null,
  };
  mocks.requirePlatformRead.mockResolvedValue({ ok: true, context, status: 403, errorCode: 'PLATFORM_CAPABILITY_DENIED' });
  mocks.requirePlatformMutation.mockResolvedValue({ ok: true, context, status: 403, errorCode: 'PLATFORM_CAPABILITY_DENIED' });
  mocks.digest.mockResolvedValue({ digest: `sha256:${'a'.repeat(64)}`, errorCode: null });
  mocks.authorityErrorCode.mockReturnValue('PLATFORM_SETTING_UPDATE_FAILED');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-value');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'private-service-value');
  vi.stubEnv('SUPERADMIN_EMAIL', 'Admin@PanelLako.HU');
});

describe('superadmin health hardening', () => {
  it('authenticates before creating the service client', async () => {
    mocks.requirePlatformRead.mockResolvedValue({
      ok: false,
      context: { mode: 'none' },
      status: 401,
      errorCode: 'AUTH_REQUIRED',
    });

    const response = await getHealth();

    expect(response.status).toBe(401);
    expect(mocks.requirePlatformRead).toHaveBeenCalledWith('platform.health.read');
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('returns boolean configuration state without credential metadata', async () => {
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ count: 3, error: null }),
      })),
    });

    const response = await getHealth();
    const text = await response.text();
    const body = JSON.parse(text) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(body).toMatchObject({
      keyAnalysis: {
        serviceConfigured: true,
        anonConfigured: true,
        serviceOnly: true,
        noWhitespace: true,
      },
      supabaseTests: [{ label: 'service_role', ok: true, count: 3 }],
    });
    expect(text).not.toContain('private-service-value');
    expect(text).not.toContain('public-anon-value');
    expect(text).not.toContain('prefix');
    expect(text).not.toContain('length');
  });
});

describe('superadmin settings hardening', () => {
  it('rejects cross-origin and unknown setting writes before database access', async () => {
    const crossOrigin = await patchSettings(settingsRequest(
      {
        key: 'map_theme',
        value: { id: 'light' },
        reason: 'Térkép-kontraszt ellenőrzött módosítása.',
        idempotencyKey: '22222222-2222-4222-8222-222222222222',
      },
      'https://attacker.example',
    ));
    expect(crossOrigin.status).toBe(403);

    const unknown = await patchSettings(settingsRequest({
      key: 'service_role_key',
      value: 'attacker-controlled',
      reason: 'Ismeretlen beállítás elutasításának tesztje.',
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
    }));
    expect(unknown.status).toBe(400);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it('validates and persists an allowlisted setting through the authenticated atomic RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { outcome: 'updated', key: 'bkk_rate_limits', replayed: false },
      error: null,
    });
    const client = { rpc };
    mocks.createServerClient.mockReturnValue(client);

    const response = await patchSettings(settingsRequest({
      key: 'bkk_rate_limits',
      value: {
        cell_delay_ms: 5_000,
        retry_max: 3,
        retry_wait_ms: 90_000,
        cells_per_run: 0,
      },
      reason: 'BKK terheléskorlát auditált módosítása.',
      idempotencyKey: '33333333-3333-4333-8333-333333333333',
    }));

    expect(response.status).toBe(200);
    expect(mocks.digest).toHaveBeenCalledWith(client, expect.objectContaining({ key: 'bkk_rate_limits' }));
    expect(rpc).toHaveBeenCalledWith('update_platform_setting', expect.objectContaining({
      p_key: 'bkk_rate_limits',
      p_reason: 'BKK terheléskorlát auditált módosítása.',
      p_idempotency_key: '33333333-3333-4333-8333-333333333333',
    }));
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('fails closed when the atomic database authority RPC rejects the write', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: 'P0001' } });
    mocks.createServerClient.mockReturnValue({ rpc });

    const response = await patchSettings(settingsRequest({
      key: 'map_theme',
      value: { id: 'minimal' },
      reason: 'Térképtéma auditált módosítási próbája.',
      idempotencyKey: '44444444-4444-4444-8444-444444444444',
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'PLATFORM_SETTING_UPDATE_FAILED' });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
});

describe('superadmin job log hardening', () => {
  it('redacts operator identity and nested diagnostic secrets', async () => {
    const limit = vi.fn().mockReturnValue({
      data: [{
        id: '1',
        job_id: 'sync',
        triggered_by: 'private@example.hu',
        status: 'error',
        result: {
          apiKey: 'secret-value',
          error: 'database connection string leaked',
          counts: { processed: 4 },
        },
        started_at: '2026-08-30T10:00:00.000Z',
        finished_at: '2026-08-30T10:01:00.000Z',
      }],
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({ limit })),
        })),
      })),
    });

    const response = await getJobLogs(new NextRequest(
      'https://panellako.hu/api/superadmin/jobs/logs?limit=30',
    ));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('operator');
    expect(text).toContain('processed');
    expect(text).not.toContain('private@example.hu');
    expect(text).not.toContain('secret-value');
    expect(text).not.toContain('database connection string leaked');
  });
});
