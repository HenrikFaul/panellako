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

import { GET } from '@/app/api/superadmin/osm-addresses-count/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePlatformRead.mockResolvedValue({ ok: true, context: { mode: 'operator' } });
});

describe('superadmin OSM address count', () => {
  it('authenticates before creating the canonical admin client', async () => {
    mocks.requirePlatformRead.mockResolvedValue({
      ok: false,
      status: 401,
      errorCode: 'AUTH_REQUIRED',
      context: { mode: 'none' },
    });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.requirePlatformRead).toHaveBeenCalledWith('platform.integrations.read');
  });

  it('returns a no-store count from the canonical admin client', async () => {
    const select = vi.fn().mockResolvedValue({ count: 42, error: null });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => ({ select })) });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(await response.json()).toEqual({ count: 42 });
    expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
  });

  it('fails closed with a stable error when the count is unavailable', async () => {
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ count: null, error: { code: '42P01' } }) })),
    });

    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'OSM_ADDRESS_COUNT_UNAVAILABLE' });
  });
});
