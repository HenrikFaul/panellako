import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const browserMocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('../../lib/supabase/browser', () => ({
  hasSupabaseConfig: true,
  createClient: () => ({ rpc: browserMocks.rpc }),
}));

vi.mock('../../app/actions/workspace-admin', () => ({
  acceptJoinRequestCounterOffer: vi.fn(),
}));

import OnboardingClient from '../../components/onboarding-client';

const approvedRequest = {
  request_id: '11111111-1111-4111-8111-111111111111',
  reserved_workspace_id: '',
  community_name: 'Napfény Lakóközösség',
  formatted_address: '1135 Budapest, Gidófalvy Lajos utca 9.',
  legal_form: 'CONDOMINIUM',
  governance_mode: 'SELF_MANAGED',
  declared_unit_count: 4,
  request_status: 'APPROVED',
  activation_pending: true,
  review_reason: 'A közösségi döntés bizonyítéka ellenőrizve.',
  verification_method: 'SELF_MANAGED_RESOLUTION',
};

beforeEach(() => {
  document.documentElement.lang = 'hu';
  browserMocks.rpc.mockReset().mockImplementation(async (name: string) => {
    if (name === 'list_my_join_requests') return { data: [], error: null };
    if (name === 'list_my_community_creation_requests') return { data: [approvedRequest], error: null };
    if (name === 'activate_approved_community_creation_request') {
      return { data: [{ request_status: 'ACTIVATED', workspace_id: '' }], error: null };
    }
    return { data: null, error: { code: 'PGRST202', message: 'missing RPC' } };
  });
});

afterEach(() => {
  cleanup();
});

describe('Onboarding community activation', () => {
  it('shows only reviewed requests as activation candidates and calls the claimant-bound RPC', async () => {
    render(<OnboardingClient />);

    fireEvent.click(screen.getByRole('button', { name: /Új közösséget kezdeményezek/i }));

    expect(await screen.findByText('Napfény Lakóközösség')).toBeInTheDocument();
    expect(screen.getByText('Jóváhagyva')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Közösség biztonságos aktiválása/i }));

    await waitFor(() => {
      expect(browserMocks.rpc).toHaveBeenCalledWith(
        'activate_approved_community_creation_request',
        expect.objectContaining({
          p_request_id: approvedRequest.request_id,
          p_idempotency_key: expect.stringMatching(/^[0-9a-f-]{36}$/i),
        }),
      );
    });
  });

  it('does not expose an activation control for a request still awaiting review', async () => {
    browserMocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'list_my_join_requests') return { data: [], error: null };
      if (name === 'list_my_community_creation_requests') {
        return {
          data: [{ ...approvedRequest, request_status: 'PENDING_VERIFICATION', activation_pending: false }],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    render(<OnboardingClient />);
    fireEvent.click(screen.getByRole('button', { name: /Új közösséget kezdeményezek/i }));

    expect(await screen.findByText('Napfény Lakóközösség')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Közösség biztonságos aktiválása/i })).not.toBeInTheDocument();
  });
});
