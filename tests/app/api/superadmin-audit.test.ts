import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

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

import { GET } from '@/app/api/superadmin/audit/route';

function auditClient(result: { data: unknown[] | null; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'limit', 'lt', 'or', 'abortSignal']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (
    resolve: (value: typeof result) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return {
    chain,
    client: { from: vi.fn(() => chain) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  mocks.requirePlatformRead.mockResolvedValue({ ok: true, context: { mode: 'operator' } });
});

describe('superadmin audit API', () => {
  it('authenticates before opening the platform data client', async () => {
    mocks.requirePlatformRead.mockResolvedValue({
      ok: false,
      status: 401,
      errorCode: 'AUTH_REQUIRED',
      context: { mode: 'none' },
    });

    const response = await GET(new NextRequest('https://panellako.hu/api/superadmin/audit'));

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.requirePlatformRead).toHaveBeenCalledWith('platform.audit.read');
  });

  it('clamps the page size, applies a normalized cursor and redacts actor and payload data', async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      actor_id: 'private.operator@example.hu',
      action: 'feature.update',
      target_type: 'feature',
      target_id: 'must-not-be-returned',
      outcome: index === 0 ? 'failed' : 'succeeded',
      support_session_id: index === 0 ? 'support-private-session' : null,
      payload: {
        recovery_marker: index === 0,
        secret: 'must-not-be-returned',
      },
      created_at: new Date(Date.UTC(2026, 7, 30, 10, 0, 0) - index * 1000).toISOString(),
    }));
    const { client, chain } = auditClient({ data: rows, error: null });
    mocks.createAdminClient.mockReturnValue(client);

    const response = await GET(new NextRequest(
      'https://panellako.hu/api/superadmin/audit?limit=999&before=2026-08-30T11%3A00%3A00Z',
    ));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(chain.select).toHaveBeenCalledWith(
      'id, actor_id, action, target_type, target_id, outcome, support_session_id, payload, created_at',
    );
    expect(chain.limit).toHaveBeenCalledWith(100);
    expect(chain.lt).toHaveBeenCalledWith('created_at', '2026-08-30T11:00:00.000Z');
    expect(body.events).toHaveLength(100);
    expect(chain.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(chain.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(body.nextCursor).toBe(Buffer.from(JSON.stringify([
      rows.at(-1)?.created_at,
      rows.at(-1)?.id,
    ]), 'utf8').toString('base64url'));
    expect(body.events[0]).toMatchObject({
      actor: 'operator',
      action: 'feature.update',
      target: 'feature',
      targetId: 'must-not-be-returned',
      outcome: 'failed',
      status: 'degraded',
      supportMarker: true,
      recoveryMarker: true,
    });
    expect(serialized).not.toContain('private.operator@example.hu');
    expect(serialized.match(/must-not-be-returned/g)).toHaveLength(100);
    expect(serialized).not.toContain('support-private-session');
  });

  it('uses the timestamp and id from an opaque cursor as a stable descending boundary', async () => {
    const createdAt = '2026-08-30T10:00:00.000Z';
    const id = 'aaaaaaaa-1111-4111-8111-111111111111';
    const cursor = Buffer.from(JSON.stringify([createdAt, id]), 'utf8').toString('base64url');
    const { client, chain } = auditClient({ data: [], error: null });
    mocks.createAdminClient.mockReturnValue(client);

    const response = await GET(new NextRequest(
      `https://panellako.hu/api/superadmin/audit?cursor=${encodeURIComponent(cursor)}`,
    ));

    expect(response.status).toBe(200);
    expect(chain.or).toHaveBeenCalledWith(
      `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`,
    );
    expect(chain.lt).not.toHaveBeenCalled();
  });

  it('accepts the new opaque cursor through the legacy before parameter', async () => {
    const createdAt = '2026-08-30T10:00:00.000Z';
    const id = 'aaaaaaaa-1111-4111-8111-111111111111';
    const cursor = Buffer.from(JSON.stringify([createdAt, id]), 'utf8').toString('base64url');
    const { client, chain } = auditClient({ data: [], error: null });
    mocks.createAdminClient.mockReturnValue(client);

    const response = await GET(new NextRequest(
      `https://panellako.hu/api/superadmin/audit?before=${encodeURIComponent(cursor)}`,
    ));

    expect(response.status).toBe(200);
    expect(chain.or).toHaveBeenCalledWith(
      `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`,
    );
  });

  it('rejects an invalid limit or cursor before constructing the data client', async () => {
    const invalidLimit = await GET(new NextRequest(
      'https://panellako.hu/api/superadmin/audit?limit=0',
    ));
    const invalidCursor = await GET(new NextRequest(
      'https://panellako.hu/api/superadmin/audit?before=not-a-date',
    ));
    const invalidCompositeCursor = await GET(new NextRequest(
      'https://panellako.hu/api/superadmin/audit?cursor=not-a-valid-cursor',
    ));
    const ambiguousCursor = await GET(new NextRequest(
      'https://panellako.hu/api/superadmin/audit?cursor=opaque&before=2026-08-30T11%3A00%3A00Z',
    ));

    expect(invalidLimit.status).toBe(400);
    expect(invalidCursor.status).toBe(400);
    expect(invalidCompositeCursor.status).toBe(400);
    expect(ambiguousCursor.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('returns a generic failure without echoing database details', async () => {
    const { client } = auditClient({
      data: null,
      error: { code: '42501', message: 'permission denied: raw-private-database-detail' },
    });
    mocks.createAdminClient.mockReturnValue(client);

    const response = await GET(new NextRequest('https://panellako.hu/api/superadmin/audit'));
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(text).toContain('Audit data unavailable');
    expect(text).not.toContain('raw-private-database-detail');
  });
});
