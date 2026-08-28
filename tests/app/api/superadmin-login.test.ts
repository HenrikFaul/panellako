import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authMocks = vi.hoisted(() => ({
  getSuperadminCreds: vi.fn(),
  setSuperadminSession: vi.fn(),
}));

vi.mock('@/lib/superadmin-auth', () => authMocks);

import { POST } from '@/app/api/superadmin/login/route';

function loginRequest(
  body: Record<string, unknown>,
  ip: string,
  origin = 'https://panellako.hu',
) {
  return new NextRequest('https://panellako.hu/api/superadmin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: 'panellako.hu',
      Origin: origin,
      'Sec-Fetch-Site': 'same-origin',
      'X-Forwarded-For': ip,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.getSuperadminCreds.mockReturnValue({
    email: 'admin@panellako.hu',
    password: 'very-secret-password',
  });
  authMocks.setSuperadminSession.mockResolvedValue(undefined);
});

describe('superadmin login API', () => {
  it('normalizes the email but preserves exact password matching before issuing a session', async () => {
    const response = await POST(loginRequest({
      email: '  ADMIN@PanelLako.HU ',
      password: 'very-secret-password',
    }, '198.51.100.10'));

    expect(response.status).toBe(200);
    expect(authMocks.setSuperadminSession).toHaveBeenCalledWith('admin@panellako.hu');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('fails closed with a generic service response when auth configuration is incomplete', async () => {
    authMocks.getSuperadminCreds.mockImplementation(() => {
      throw new Error('SUPERADMIN_SESSION_SECRET env var must be set');
    });

    const response = await POST(loginRequest({
      email: 'admin@panellako.hu',
      password: 'very-secret-password',
    }, '198.51.100.11'));

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('SUPERADMIN_SESSION_SECRET');
    expect(authMocks.setSuperadminSession).not.toHaveBeenCalled();
  });

  it('rejects cross-origin credential submission before reading auth configuration', async () => {
    const response = await POST(loginRequest({
      email: 'admin@panellako.hu',
      password: 'very-secret-password',
    }, '198.51.100.12', 'https://attacker.example'));

    expect(response.status).toBe(403);
    expect(authMocks.getSuperadminCreds).not.toHaveBeenCalled();
    expect(authMocks.setSuperadminSession).not.toHaveBeenCalled();
  });

  it('rate-limits repeated credential attempts without exposing configured credentials', async () => {
    const responses = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(await POST(loginRequest({
        email: 'admin@panellako.hu',
        password: `wrong-password-${attempt}`,
      }, '198.51.100.13')));
    }

    expect(responses.slice(0, 5).every((response) => response.status === 401)).toBe(true);
    expect(responses[5].status).toBe(429);
    expect(Number(responses[5].headers.get('retry-after'))).toBeGreaterThan(0);
    expect(authMocks.setSuperadminSession).not.toHaveBeenCalled();
  });
});
