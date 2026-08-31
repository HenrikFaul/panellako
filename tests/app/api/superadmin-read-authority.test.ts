import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requirePlatformRead: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  requirePlatformRead: mocks.requirePlatformRead,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { GET as getHealth } from '@/app/api/superadmin/health/route';
import { GET as getStats } from '@/app/api/superadmin/stats/route';
import { GET as getJobLogs } from '@/app/api/superadmin/jobs/logs/route';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePlatformRead.mockResolvedValue({
    ok: false,
    status: 403,
    errorCode: 'PLATFORM_CAPABILITY_DENIED',
    context: { mode: 'operator' },
  });
});

describe('superadmin read route authority mapping', () => {
  it('checks each named capability before constructing the service-role client', async () => {
    const health = await getHealth();
    const stats = await getStats();
    const logs = await getJobLogs(new NextRequest(
      'https://panellako.hu/api/superadmin/jobs/logs?limit=30',
    ));

    expect([health.status, stats.status, logs.status]).toEqual([403, 403, 403]);
    expect(await health.json()).toEqual({ error: 'PLATFORM_CAPABILITY_DENIED' });
    expect(await stats.json()).toEqual({ error: 'PLATFORM_CAPABILITY_DENIED' });
    expect(await logs.json()).toEqual({ error: 'PLATFORM_CAPABILITY_DENIED' });
    expect(mocks.requirePlatformRead.mock.calls.map(call => call[0])).toEqual([
      'platform.health.read',
      'platform.overview.read',
      'platform.jobs.read',
    ]);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    for (const response of [health, stats, logs]) {
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
  });

  it('contains no direct legacy-session gate in the migrated read routes', () => {
    for (const path of [
      'app/api/superadmin/health/route.ts',
      'app/api/superadmin/stats/route.ts',
      'app/api/superadmin/jobs/logs/route.ts',
    ]) {
      const route = source(path);
      expect(route).toContain('requirePlatformRead(');
      expect(route).toContain('adminJson(');
      expect(route).not.toContain('isSuperadminAuthenticated');
      expect(route).not.toContain('getLegacySuperadminSession');
    }
  });
});
