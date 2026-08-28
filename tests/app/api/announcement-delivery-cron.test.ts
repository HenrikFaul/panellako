import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createStore: vi.fn(),
  runBatch: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

vi.mock('@/lib/announcement-delivery-worker', () => ({
  createSupabaseAnnouncementDeliveryStore: mocks.createStore,
  runAnnouncementDeliveryBatch: mocks.runBatch,
}));

import { GET, POST } from '@/app/api/cron/announcement-delivery/route';

const secret = 'announcement-delivery-secret-32chars!';

function request(method: 'GET' | 'POST' = 'GET', token = secret, extraHeaders: HeadersInit = {}) {
  return new NextRequest('https://panellako.hu/api/cron/announcement-delivery', {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv('ANNOUNCEMENT_DELIVERY_CRON_SECRET', secret);
  vi.stubEnv('CRON_SECRET', 'different-global-secret-that-is-long-enough');
  vi.stubEnv('BREVO_API_KEY', 'brevo-key');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://panellako.hu');
  mocks.createClient.mockReturnValue({ client: 'service' });
  mocks.createStore.mockReturnValue({ store: 'delivery' });
  mocks.runBatch.mockResolvedValue({
    claimed: 1,
    delivered: 1,
    retryScheduled: 0,
    deadLettered: 0,
    cancelled: 0,
    claimLost: 0,
  });
});

describe('announcement delivery cron route', () => {
  it('fails closed when its service secret is missing or too short', async () => {
    vi.stubEnv('ANNOUNCEMENT_DELIVERY_CRON_SECRET', 'short');
    vi.stubEnv('CRON_SECRET', '');

    const response = await GET(request('GET', 'short'));

    expect(response.status).toBe(503);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.runBatch).not.toHaveBeenCalled();
  });

  it('requires a timing-safe Bearer credential and ignores a spoofed cron header', async () => {
    const wrongToken = await GET(request('GET', 'wrong-secret', { 'x-vercel-cron': '1' }));
    const noBearer = await GET(new NextRequest(
      'https://panellako.hu/api/cron/announcement-delivery?secret=announcement-delivery-secret-32chars!',
      { headers: { 'x-vercel-cron': '1' } },
    ));

    expect(wrongToken.status).toBe(401);
    expect(noBearer.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('accepts the Vercel Bearer CRON_SECRET even when a route-specific secret also exists', async () => {
    const response = await GET(request('GET', 'different-global-secret-that-is-long-enough'));

    expect(response.status).toBe(200);
    expect(mocks.runBatch).toHaveBeenCalledTimes(1);
  });

  it('uses only the configured service-role project and clamps all worker bounds', async () => {
    vi.stubEnv('ANNOUNCEMENT_DELIVERY_BATCH_SIZE', '999');
    vi.stubEnv('ANNOUNCEMENT_DELIVERY_LEASE_SECONDS', '1');
    vi.stubEnv('ANNOUNCEMENT_DELIVERY_MAX_ATTEMPTS', '999');
    vi.stubEnv('ANNOUNCEMENT_DELIVERY_BACKOFF_SECONDS', '1');
    vi.stubEnv('ANNOUNCEMENT_DELIVERY_MAX_BACKOFF_SECONDS', '999999');

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'service-role-key',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    expect(mocks.createStore).toHaveBeenCalledWith({ client: 'service' });
    expect(mocks.runBatch).toHaveBeenCalledWith(
      { store: 'delivery' },
      {
        batchSize: 50,
        leaseSeconds: 60,
        maxAttempts: 20,
        baseBackoffSeconds: 5,
        maxBackoffSeconds: 86400,
        appBaseUrl: 'https://panellako.hu/',
      },
    );
    await expect(response.json()).resolves.toMatchObject({ ok: true, claimed: 1, delivered: 1 });
  });

  it('supports authenticated POST schedulers with the same bounded worker', async () => {
    const response = await POST(request('POST'));

    expect(response.status).toBe(200);
    expect(mocks.runBatch).toHaveBeenCalledTimes(1);
  });

  it('returns a generic failure without leaking internal error details', async () => {
    mocks.runBatch.mockRejectedValue(new Error('resident@example.hu provider body secret'));

    const response = await GET(request());
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body).toEqual({ ok: false, error: 'Delivery worker failed' });
    expect(JSON.stringify(body)).not.toContain('resident@example.hu');
  });
});
