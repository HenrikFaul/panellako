import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  listFactors: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  enroll: vi.fn(),
  challengeAndVerify: vi.fn(),
  unenroll: vi.fn(),
}));

vi.mock('../../lib/supabase/browser', () => ({
  hasSupabaseConfig: true,
  createClient: () => ({
    auth: {
      mfa: authMocks,
    },
  }),
}));

import MfaSecurityClient from '../../components/mfa-security-client';

function factorList(all: Array<Record<string, unknown>>) {
  return {
    data: {
      all,
      totp: all.filter((factor) => factor.factor_type === 'totp' && factor.status === 'verified'),
      phone: [],
      webauthn: [],
    },
    error: null,
  };
}

beforeEach(() => {
  authMocks.listFactors.mockReset().mockResolvedValue(factorList([]));
  authMocks.getAuthenticatorAssuranceLevel.mockReset().mockResolvedValue({
    data: { currentLevel: 'aal1', nextLevel: 'aal2', currentAuthenticationMethods: ['password'] },
    error: null,
  });
  authMocks.enroll.mockReset();
  authMocks.challengeAndVerify.mockReset();
  authMocks.unenroll.mockReset().mockResolvedValue({ data: { id: 'removed' }, error: null });
});

afterEach(() => {
  cleanup();
});

describe('MfaSecurityClient', () => {
  it('enrolls and verifies a TOTP factor without sending the QR to an external origin', async () => {
    authMocks.enroll.mockResolvedValue({
      data: {
        id: 'new-factor',
        type: 'totp',
        friendly_name: 'PanelLakó hitelesítő',
        totp: {
          qr_code: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>',
          secret: 'TESTSECRET123',
          uri: 'otpauth://totp/PanelLako:test',
        },
      },
      error: null,
    });
    authMocks.challengeAndVerify.mockResolvedValue({ data: { access_token: 'token' }, error: null });

    render(
      <MfaSecurityClient
        email="demo@panellako.hu"
        returnTo="/app"
      />,
    );

    expect(await screen.findByText('Még nincs hitelesítő alkalmazás kapcsolva ehhez a fiókhoz.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'QR-kód létrehozása' }));

    const qr = await screen.findByAltText('PanelLakó TOTP beállítási QR-kód');
    expect(qr.getAttribute('src')).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(qr.getAttribute('src')).not.toContain('http://');
    expect(screen.getByText('TESTSECRET123')).toBeInTheDocument();
    expect(authMocks.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'PanelLakó hitelesítő',
      issuer: 'PanelLakó',
    });

    fireEvent.change(screen.getByLabelText('Hatjegyű ellenőrző kód'), {
      target: { value: '123 456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bekapcsolás' }));

    await waitFor(() => {
      expect(authMocks.challengeAndVerify).toHaveBeenCalledWith({
        factorId: 'new-factor',
        code: '123456',
      });
    });
    expect(await screen.findByText('A kétlépcsős azonosítás aktív, a munkamenet AAL2 szintű.')).toBeInTheDocument();
    expect(screen.queryByText('TESTSECRET123')).not.toBeInTheDocument();
  });

  it('performs a fresh step-up with a verified TOTP factor and a sanitized destination', async () => {
    authMocks.listFactors.mockResolvedValue(factorList([{
      id: 'verified-factor',
      factor_type: 'totp',
      friendly_name: 'Munkahelyi hitelesítő',
      status: 'verified',
      created_at: '2026-08-28T08:00:00.000Z',
      updated_at: '2026-08-28T08:00:00.000Z',
    }]));
    authMocks.challengeAndVerify.mockResolvedValue({ data: { access_token: 'aal2-token' }, error: null });
    const onVerificationComplete = vi.fn();

    render(
      <MfaSecurityClient
        email="manager@panellako.hu"
        returnTo="/w/bbbbbbbb-0001-0001-0001-000000000001/admin"
        onVerificationComplete={onVerificationComplete}
      />,
    );

    expect(await screen.findByText('Munkahelyi hitelesítő')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Hitelesítő kód'), {
      target: { value: '654321' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Megerősítés és folytatás' }));

    await waitFor(() => {
      expect(authMocks.challengeAndVerify).toHaveBeenCalledWith({
        factorId: 'verified-factor',
        code: '654321',
      });
    });
    expect(onVerificationComplete).toHaveBeenCalledWith('/w/bbbbbbbb-0001-0001-0001-000000000001/admin');
  });

  it('blocks malformed codes before calling Supabase', async () => {
    authMocks.listFactors.mockResolvedValue(factorList([{
      id: 'verified-factor',
      factor_type: 'totp',
      friendly_name: 'Hitelesítő',
      status: 'verified',
      created_at: '2026-08-28T08:00:00.000Z',
      updated_at: '2026-08-28T08:00:00.000Z',
    }]));

    render(
      <MfaSecurityClient
        email="manager@panellako.hu"
        returnTo="https://evil.example/steal"
        onVerificationComplete={vi.fn()}
      />,
    );

    await screen.findByText('Hitelesítő');
    fireEvent.change(screen.getByLabelText('Hitelesítő kód'), {
      target: { value: '12x456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Megerősítés és folytatás' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Pontosan hat számjegyet adj meg.');
    expect(authMocks.challengeAndVerify).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Vissza' })).toHaveAttribute('href', '/app');
  });
});
