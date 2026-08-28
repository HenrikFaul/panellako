import { describe, expect, it } from 'vitest';
import {
  buildMfaStepUpHref,
  isMfaStepUpRequired,
  isValidTotpCode,
  normalizeTotpCode,
  toSafeMfaQrDataUrl,
} from '../../lib/auth/mfa';

describe('MFA helpers', () => {
  it('recognizes the step-up code in Supabase/PostgREST error shapes', () => {
    expect(isMfaStepUpRequired({ error_code: 'MFA_STEP_UP_REQUIRED' })).toBe(true);
    expect(isMfaStepUpRequired({
      code: 'P0001',
      details: '{"error_code":"MFA_STEP_UP_REQUIRED"}',
    })).toBe(true);
    expect(isMfaStepUpRequired({
      error: { message: 'RPC failed: MFA_STEP_UP_REQUIRED' },
    })).toBe(true);
  });

  it('does not mistake unrelated authorization errors for an MFA step-up', () => {
    expect(isMfaStepUpRequired(null)).toBe(false);
    expect(isMfaStepUpRequired({ code: '42501', message: 'insufficient_privilege' })).toBe(false);
    expect(isMfaStepUpRequired({ error_code: 'WORKSPACE_FORBIDDEN' })).toBe(false);
    expect(isMfaStepUpRequired({ message: 'NOT_MFA_STEP_UP_REQUIRED' })).toBe(false);
  });

  it('builds a same-origin MFA route and rejects an unsafe return destination', () => {
    expect(buildMfaStepUpHref('/w/bbbbbbbb-0001-0001-0001-000000000001/admin?tab=units'))
      .toBe('/account/security?next=%2Fw%2Fbbbbbbbb-0001-0001-0001-000000000001%2Fadmin%3Ftab%3Dunits');
    expect(buildMfaStepUpHref('https://evil.example/steal'))
      .toBe('/account/security?next=%2Fapp');
  });

  it('normalizes only separators and validates a six-digit TOTP code', () => {
    expect(normalizeTotpCode('123 456')).toBe('123456');
    expect(normalizeTotpCode('123-456')).toBe('123456');
    expect(isValidTotpCode('123 456')).toBe(true);
    expect(isValidTotpCode('12345')).toBe(false);
    expect(isValidTotpCode('12345x')).toBe(false);
  });

  it('turns a passive QR SVG into a local encoded data URL', () => {
    const result = toSafeMfaQrDataUrl('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>');

    expect(result).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(decodeURIComponent(result?.split(',')[1] ?? '')).toContain('<svg');
  });

  it('accepts Supabase SVG data URLs but rejects active or external content', () => {
    const encoded = `data:image/svg+xml;utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>')}`;

    expect(toSafeMfaQrDataUrl(encoded)).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(toSafeMfaQrDataUrl('https://qr.example/secret')).toBeNull();
    expect(toSafeMfaQrDataUrl('<svg onload="alert(1)"></svg>')).toBeNull();
    expect(toSafeMfaQrDataUrl('<svg><script>alert(1)</script></svg>')).toBeNull();
    expect(toSafeMfaQrDataUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });
});
