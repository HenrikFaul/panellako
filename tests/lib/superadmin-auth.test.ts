import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieMocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => cookieMocks,
}));

import { isSuperadminAuthenticated, setSuperadminSession } from '@/lib/superadmin-auth';

const initialTime = new Date('2026-08-28T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(initialTime);
  vi.clearAllMocks();
  vi.stubEnv('SUPERADMIN_SESSION_SECRET', 'test-session-secret-with-at-least-32-characters');
  vi.stubEnv('SUPERADMIN_EMAIL', 'Admin@PanelLako.HU');
  vi.stubEnv('SUPERADMIN_PASSWORD', 'correct horse battery staple');
  vi.stubEnv('CRON_SECRET', 'must-never-sign-admin-sessions');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('superadmin session security', () => {
  it('never falls back to CRON_SECRET when the dedicated session secret is absent', async () => {
    vi.stubEnv('SUPERADMIN_SESSION_SECRET', '');

    await expect(setSuperadminSession('admin@panellako.hu')).rejects.toThrow(
      'SUPERADMIN_SESSION_SECRET env var must be set',
    );
    expect(await isSuperadminAuthenticated()).toBe(false);
    expect(cookieMocks.set).not.toHaveBeenCalled();
  });

  it('creates a versioned one-hour session with issued-at and secure cookie controls', async () => {
    await setSuperadminSession('  ADMIN@panellako.hu ');

    expect(cookieMocks.set).toHaveBeenCalledTimes(1);
    const [name, token, options] = cookieMocks.set.mock.calls[0] as [string, string, Record<string, unknown>];
    const [version, email, issuedAt, expiresAt, signature] = token.split('|');

    expect(name).toBe('pl_superadmin_session');
    expect(version).toBe('v2');
    expect(email).toBe('admin@panellako.hu');
    expect(Number(expiresAt) - Number(issuedAt)).toBe(3600);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,
    });
  });

  it('invalidates the session when the configured actor changes or the absolute TTL expires', async () => {
    let storedToken = '';
    cookieMocks.set.mockImplementation((_name: string, value: string) => {
      storedToken = value;
    });
    cookieMocks.get.mockImplementation(() => storedToken ? { value: storedToken } : undefined);

    await setSuperadminSession('admin@panellako.hu');
    expect(await isSuperadminAuthenticated()).toBe(true);

    vi.stubEnv('SUPERADMIN_EMAIL', 'replacement@panellako.hu');
    expect(await isSuperadminAuthenticated()).toBe(false);

    vi.stubEnv('SUPERADMIN_EMAIL', 'admin@panellako.hu');
    vi.setSystemTime(new Date(initialTime.getTime() + 3_601_000));
    expect(await isSuperadminAuthenticated()).toBe(false);
  });

  it('rejects a caller-supplied session actor that differs from current configuration', async () => {
    await expect(setSuperadminSession('different@panellako.hu')).rejects.toThrow(
      'Superadmin session actor does not match configuration',
    );
    expect(cookieMocks.set).not.toHaveBeenCalled();
  });
});
