import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuperadminCommunityRequests from '@/components/superadmin-community-requests';
import { useI18n } from '@/src/i18n/useI18n';

const requestRow = {
  request_id: 'aaaaaaaa-1111-4111-8111-111111111111',
  community_name: 'Gidófalvy Lakóközösség',
  formatted_address: '1135 Budapest, Gidófalvy Lajos utca 9.',
  legal_form: 'CONDOMINIUM',
  governance_mode: 'REPRESENTATIVE_MANAGED',
  declared_unit_count: 16,
  request_status: 'PENDING_VERIFICATION',
  created_at: '2026-08-28T10:00:00.000Z',
  fuzzy_candidate_count: 0,
  unresolved_high_similarity_count: 0,
  highest_similarity_score: null,
};

beforeEach(() => {
  document.documentElement.lang = 'hu';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ requests: [requestRow] }),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.lang = 'hu';
});

describe('SuperadminCommunityRequests', () => {
  it('shows the exact review subject and the separate claimant MFA activation warning before approval', async () => {
    render(<SuperadminCommunityRequests />);

    expect(await screen.findByText('Gidófalvy Lakóközösség')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ellenőrzés megnyitása' }));
    fireEvent.change(screen.getByLabelText('Döntés'), { target: { value: 'APPROVE' } });
    fireEvent.change(screen.getByLabelText('Indoklás'), {
      target: { value: 'A hivatalos nyilvántartás és a címadatok egyeznek.' },
    });
    fireEvent.change(screen.getByLabelText('Bizonyíték-hivatkozások'), {
      target: { value: 'official-register:KCR-2026-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Döntés rögzítése' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('1135 Budapest, Gidófalvy Lajos utca 9.');
    expect(dialog).toHaveTextContent('Közös képviselő által kezelt');
    expect(dialog).toHaveTextContent('16 albetét');
    expect(dialog).toHaveTextContent('nem aktivál élő workspace-et');
    expect(dialog).toHaveTextContent('friss MFA/AAL2');
  });

  it('switches the whole review surface to English from the document locale', async () => {
    document.documentElement.lang = 'en';
    render(<SuperadminCommunityRequests />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Residential community review' })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: 'Pending verification' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open review' })).toBeInTheDocument();
  });

  it('offers board-managed requests only managed verification methods', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requests: [{ ...requestRow, governance_mode: 'BOARD_MANAGED' }] }),
    } as Response);
    render(<SuperadminCommunityRequests />);

    await screen.findByText('Gidófalvy Lakóközösség');
    fireEvent.click(screen.getByRole('button', { name: 'Ellenőrzés megnyitása' }));

    expect(screen.getByRole('option', { name: 'Hivatalos nyilvántartás' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Aláírt kezelési megbízás' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Lakóközösségi határozat' })).not.toBeInTheDocument();
  });

  it('uses nested translations and visibly falls back to an unknown key', async () => {
    document.documentElement.lang = 'en';
    function TranslationProbe() {
      const { t } = useI18n();
      return <p>{t('superadmin.communityRequests.approve')} · {t('missing.translation.key')}</p>;
    }

    render(<TranslationProbe />);

    expect(await screen.findByText('Approve · missing.translation.key')).toBeInTheDocument();
  });

  it('loads and resolves a high-similarity address candidate before approval', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests: [{
          ...requestRow,
          fuzzy_candidate_count: 1,
          unresolved_high_similarity_count: 1,
          highest_similarity_score: 0.94,
        }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{
          candidate_address_id: 'cccccccc-3333-4333-8333-333333333333',
          formatted_address: '1135 Budapest, Gidófalvy Lajos utca 9/A.',
          similarity_score: 0.94,
          candidate_kind: 'ACTIVE_WORKSPACE',
          candidate_workspace_id: 'dddddddd-4444-4444-8444-444444444444',
          duplicate_resolution: null,
        }] }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ candidates: [] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ requests: [] }) } as Response);

    render(<SuperadminCommunityRequests />);
    await screen.findByText('Gidófalvy Lakóközösség');
    expect(screen.getByText(/Feloldatlan erős egyezés: 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ellenőrzés megnyitása' }));

    expect(await screen.findByText('1135 Budapest, Gidófalvy Lajos utca 9/A.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Címazonossági döntés indoka'), {
      target: { value: 'A helyrajzi szám és a lépcsőház azonosítója eltér.' },
    });
    fireEvent.change(screen.getByLabelText('Címazonossági bizonyíték-hivatkozás'), {
      target: { value: 'link-existing:KCR-CIM-2026-8' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Címjelölt feloldása' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/superadmin/community-requests',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('RESOLVE_ADDRESS_CANDIDATE'),
      }),
    ));
  });
});
