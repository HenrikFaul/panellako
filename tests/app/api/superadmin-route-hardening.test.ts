import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/superadmin-auth', () => ({
  isSuperadminAuthenticated: mocks.authenticated,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
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
  mocks.authenticated.mockResolvedValue(true);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-value');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'private-service-value');
  vi.stubEnv('SUPERADMIN_EMAIL', 'Admin@PanelLako.HU');
});

describe('superadmin health hardening', () => {
  it('authenticates before creating the service client', async () => {
    mocks.authenticated.mockResolvedValue(false);

    const response = await getHealth();

    expect(response.status).toBe(401);
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
      { key: 'map_theme', value: { id: 'light' } },
      'https://attacker.example',
    ));
    expect(crossOrigin.status).toBe(403);

    const unknown = await patchSettings(settingsRequest({
      key: 'service_role_key',
      value: 'attacker-controlled',
    }));
    expect(unknown.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('validates, persists and audits an allowlisted setting', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { value: { id: 'nature' } }, error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'platform_audit_events') return { insert };
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
        upsert,
      };
    });
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await patchSettings(settingsRequest({
      key: 'bkk_rate_limits',
      value: {
        cell_delay_ms: 5_000,
        retry_max: 3,
        retry_wait_ms: 90_000,
        cells_per_run: 0,
      },
    }));

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ key: 'bkk_rate_limits' }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      actor_id: 'admin@panellako.hu',
      action: 'superadmin.setting.update',
      target_id: 'bkk_rate_limits',
    }));
  });

  it('reports audit failure and restores the previous setting', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { value: { id: 'nature' } }, error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: { code: 'AUDIT_WRITE_FAILED' } });
    const from = vi.fn((table: string) => {
      if (table === 'platform_audit_events') return { insert };
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
        upsert,
      };
    });
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await patchSettings(settingsRequest({
      key: 'map_theme',
      value: { id: 'minimal' },
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'SETTING_AUDIT_FAILED' });
    expect(upsert).toHaveBeenCalledTimes(2);
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
