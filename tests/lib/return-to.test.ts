import { describe, expect, it } from 'vitest';
import { sanitizeReturnTo } from '../../lib/auth/return-to';

describe('sanitizeReturnTo', () => {
  it.each([
    ['/app', '/app'],
    ['/onboarding', '/onboarding'],
    ['/w/bbbbbbbb-0001-0001-0001-000000000001?tab=documents#latest', '/w/bbbbbbbb-0001-0001-0001-000000000001?tab=documents#latest'],
    ['/invitations/token-123', '/invitations/token-123'],
  ])('keeps a safe application path: %s', (value, expected) => {
    expect(sanitizeReturnTo(value)).toBe(expected);
  });

  it.each([
    'https://evil.example/steal',
    'javascript:alert(1)',
    '//evil.example/steal',
    '///evil.example/steal',
    '/\\evil.example/steal',
    '/%2f%2fevil.example/steal',
    '/%5cevil.example/steal',
    '/app%0d%0aLocation:https://evil.example',
    ' /app',
    '/app ',
    '',
  ])('rejects an unsafe destination: %s', (value) => {
    expect(sanitizeReturnTo(value)).toBe('/app');
  });

  it('uses a caller-provided safe fallback', () => {
    expect(sanitizeReturnTo(null, '/onboarding')).toBe('/onboarding');
    expect(sanitizeReturnTo('https://evil.example', '/onboarding')).toBe('/onboarding');
  });

  it('falls back to /app when the supplied fallback is unsafe', () => {
    expect(sanitizeReturnTo(null, '//evil.example')).toBe('/app');
  });
});
