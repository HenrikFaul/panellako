import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GoogleAccountButton from '../../components/google-account-button';
import { en } from '../../src/i18n/resources/en';
import { hu } from '../../src/i18n/resources/hu';

const root = process.cwd();
const loginSource = readFileSync(join(root, 'app/login/page.tsx'), 'utf8');
const registerSource = readFileSync(join(root, 'app/register/page.tsx'), 'utf8');

describe('Google account auth surfaces', () => {
  it('exposes the visible localized label as the accessible button name', () => {
    const onClick = () => undefined;
    const { rerender } = render(createElement(GoogleAccountButton, {
      label: 'Continue with Google',
      pendingLabel: 'Redirecting to Google…',
      pending: false,
      onClick,
    }));

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    rerender(createElement(GoogleAccountButton, {
      label: 'Continue with Google',
      pendingLabel: 'Redirecting to Google…',
      pending: true,
      onClick,
    }));
    expect(screen.getByRole('button', { name: 'Redirecting to Google…' })).toBeDisabled();
  });

  it('offers an accessible shared Google account button on login and registration', () => {
    expect(loginSource).toContain('<GoogleAccountButton');
    expect(loginSource).toContain("label={t('auth.google.continue')}");
    expect(registerSource).toContain('<GoogleAccountButton');
    expect(registerSource).toContain("label={t('auth.google.register')}");
  });

  it('keeps registration on onboarding while login uses the safe app fallback', () => {
    expect(registerSource).toContain("fallback: '/onboarding'");
    expect(loginSource).toContain('requestGoogleOAuth(supabase, {');
    expect(loginSource).not.toContain("fallback: '/onboarding'");
  });

  it('keeps every new Google auth message synchronized in Hungarian and English', () => {
    expect(Object.keys(hu.auth.google)).toEqual(Object.keys(en.auth.google));
    expect(hu.auth.orUseEmail).toBeTruthy();
    expect(en.auth.orUseEmail).toBeTruthy();
    expect(hu.auth.google.register).toContain('Google');
    expect(en.auth.google.register).toContain('Google');
  });
});
