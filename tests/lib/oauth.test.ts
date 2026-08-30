import { describe, expect, it, vi } from 'vitest';
import { buildOAuthCallbackUrl, requestGoogleOAuth } from '../../lib/auth/oauth';

describe('Google OAuth request safety', () => {
  it('preserves a sanitized invitation destination through the auth callback', () => {
    const callback = new URL(buildOAuthCallbackUrl({
      origin: 'https://panellako.hu',
      returnTo: '/invitations/token-123?source=register#accept',
      fallback: '/onboarding',
    }));

    expect(callback.origin).toBe('https://panellako.hu');
    expect(callback.pathname).toBe('/auth/callback');
    expect(callback.searchParams.get('next')).toBe('/invitations/token-123?source=register#accept');
  });

  it('fails closed to onboarding for an unsafe registration destination', () => {
    const callback = new URL(buildOAuthCallbackUrl({
      origin: 'https://panellako.hu/register',
      returnTo: 'https://evil.example/steal',
      fallback: '/onboarding',
    }));

    expect(callback.toString()).toBe('https://panellako.hu/auth/callback?next=%2Fonboarding');
  });

  it('rejects non-HTTP callback origins', () => {
    expect(() => buildOAuthCallbackUrl({
      origin: 'javascript:alert(1)',
      returnTo: '/app',
    })).toThrow(TypeError);
  });

  it('requests Google with the safe callback and no tenant role metadata', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { signInWithOAuth } };

    await requestGoogleOAuth(client, {
      origin: 'https://panellako.hu',
      returnTo: '//evil.example/steal',
    });

    expect(signInWithOAuth).toHaveBeenCalledOnce();
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://panellako.hu/auth/callback?next=%2Fapp',
        scopes: 'openid',
      },
    });
    expect(JSON.stringify(signInWithOAuth.mock.calls[0]?.[0])).not.toMatch(/role|workspace|tenant|membership/);
  });
});
