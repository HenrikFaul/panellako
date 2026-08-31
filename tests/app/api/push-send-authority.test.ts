import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireWorkspaceCapability: vi.fn(),
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  subscriptionIn: vi.fn(),
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => ({
  requireWorkspaceCapability: mocks.requireWorkspaceCapability,
  WorkspaceAuthorizationError: class WorkspaceAuthorizationError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createAdminClient,
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mocks.setVapidDetails,
    sendNotification: mocks.sendNotification,
  },
}));

import { POST } from '@/app/api/push/send/route';

const workspaceId = '11111111-1111-4111-8111-111111111111';

function request(overrides: Record<string, unknown> = {}) {
  return new NextRequest('https://panellako.hu/api/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      buildingId: workspaceId,
      title: 'Közlemény',
      body: 'Friss közlemény érkezett.',
      targetRole: 'manager',
      ...overrides,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  mocks.requireWorkspaceCapability.mockResolvedValue({ workspaceId });
  mocks.rpc.mockResolvedValue({
    data: [{ profile_id: '22222222-2222-4222-8222-222222222222' }],
    error: null,
  });
  mocks.subscriptionIn.mockResolvedValue({ data: [], error: null });
  mocks.from.mockImplementation((table: string) => {
    if (table !== 'push_subscriptions') {
      throw new Error(`Unexpected direct recipient query: ${table}`);
    }
    return {
      select: vi.fn(() => ({ in: mocks.subscriptionIn })),
    };
  });
  mocks.createAdminClient.mockReturnValue({ rpc: mocks.rpc, from: mocks.from });
});

describe('tenant-authoritative push send route', () => {
  it('resolves recipients through the service-role-only tenant RPC', async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sent: 0, failed: 0 });
    expect(mocks.requireWorkspaceCapability).toHaveBeenCalledWith(
      workspaceId,
      'announcement.publish',
    );
    expect(mocks.createAdminClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'service-role-key',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(mocks.rpc).toHaveBeenCalledWith('resolve_workspace_push_recipients', {
      p_workspace_id: workspaceId,
      p_target_role: 'manager',
    });
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith('push_subscriptions');
    expect(mocks.subscriptionIn).toHaveBeenCalledWith('profile_id', [
      '22222222-2222-4222-8222-222222222222',
    ]);
  });

  it('fails closed with a generic response when canonical recipient resolution fails', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'manager@example.test internal authority detail' },
    });

    const response = await POST(request());
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Push recipients could not be resolved' });
    expect(JSON.stringify(body)).not.toContain('manager@example.test');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects an unsupported target role before authorization or service access', async () => {
    const response = await POST(request({ targetRole: 'superadmin' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'targetRole is invalid' });
    expect(mocks.requireWorkspaceCapability).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('does not query membership or role tables directly', async () => {
    await POST(request({ targetRole: 'lako' }));

    expect(mocks.rpc).toHaveBeenCalledWith('resolve_workspace_push_recipients', {
      p_workspace_id: workspaceId,
      p_target_role: 'lako',
    });
    expect(mocks.from).not.toHaveBeenCalledWith('workspace_memberships');
    expect(mocks.from).not.toHaveBeenCalledWith('role_assignments');
  });

  it('keeps builds and empty-recipient requests independent from optional VAPID configuration', async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.setVapidDetails).not.toHaveBeenCalled();
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it('fails only the delivery request when subscriptions exist but VAPID is not configured', async () => {
    mocks.subscriptionIn.mockResolvedValue({
      data: [{ endpoint: 'https://push.example.test/subscription', p256dh: 'p256dh', auth: 'auth' }],
      error: null,
    });
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', '');
    vi.stubEnv('VAPID_PRIVATE_KEY', '');

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Push delivery service is not configured',
    });
    expect(mocks.setVapidDetails).not.toHaveBeenCalled();
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it('configures web-push lazily before sending to a real subscription', async () => {
    mocks.subscriptionIn.mockResolvedValue({
      data: [{ endpoint: 'https://push.example.test/subscription', p256dh: 'p256dh', auth: 'auth' }],
      error: null,
    });
    mocks.sendNotification.mockResolvedValue(undefined);
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'public-vapid-key');
    vi.stubEnv('VAPID_PRIVATE_KEY', 'private-vapid-key');
    vi.stubEnv('VAPID_SUBJECT', 'mailto:push@example.test');

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sent: 1, failed: 0 });
    expect(mocks.setVapidDetails).toHaveBeenCalledWith(
      'mailto:push@example.test',
      'public-vapid-key',
      'private-vapid-key',
    );
    expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
  });
});
