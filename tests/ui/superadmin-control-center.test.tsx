import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuperadminClient from '@/components/superadmin-client';
import SuperadminControlCenter from '@/components/superadmin-control-center';
import {
  CONTROL_CENTER_MANIFEST_FINGERPRINT,
  CONTROL_CENTER_SCHEMA_VERSION,
  type ControlCenterResponse,
} from '@/lib/superadmin/control-center';

vi.mock('@/components/superadmin-osm-import', () => ({ default: () => null }));
vi.mock('@/components/superadmin-gtfs-import', () => ({ default: () => null }));
vi.mock('@/components/superadmin-diagnostics', () => ({ default: () => null }));
vi.mock('@/components/superadmin-users-tab', () => ({ default: () => null }));
vi.mock('@/components/superadmin-features-tab', () => ({ default: () => null }));
vi.mock('@/components/superadmin-community-requests', () => ({ default: () => null }));
vi.mock('@/components/superadmin-governance', () => ({ default: () => null }));
vi.mock('@/components/superadmin-authority-context', () => ({
  usePlatformAuthority: () => ({
    mode: 'operator',
    capabilityKeys: [
      'platform.overview.read',
      'platform.users.manage_trial',
      'platform.features.manage',
      'platform.communities.review',
      'platform.jobs.run',
      'platform.settings.manage',
      'platform.migrations.apply',
    ],
  }),
}));

const snapshot: ControlCenterResponse = {
  schemaVersion: CONTROL_CENTER_SCHEMA_VERSION,
  manifestFingerprint: CONTROL_CENTER_MANIFEST_FINGERPRINT,
  generatedAt: '2026-08-30T10:30:00.000Z',
  overallStatus: 'attention',
  summary: {
    workspaces: 12,
    buildings: 14,
    units: 286,
    profiles: 431,
    agencies: 3,
  },
  attention: [{
    id: 'pending-community-requests',
    severity: 'warning',
    title: 'Community requests waiting for review',
    detail: 'Pending verification requires operator review.',
    count: 2,
    href: '/superadmin?tab=communityRequests',
  }],
  integrations: [{
    id: 'supabase',
    label: 'Supabase',
    status: 'configured',
    lastCheckedAt: '2026-08-30T10:30:00.000Z',
  }, {
    id: 'google-oauth',
    label: 'Google OAuth',
    status: 'unknown',
  }, {
    id: 'email',
    label: 'Email',
    status: 'partial',
  }],
  release: {
    environment: 'preview',
    version: '0.10.7',
    commitSha: '1234567890abcdef',
    deploymentId: 'dpl_control_center',
    deployedAt: '2026-08-30T09:00:00.000Z',
    status: 'healthy',
  },
  recentAudit: [{
    id: 'audit-1',
    action: 'superadmin.feature.update',
    actor: 'operator',
    createdAt: '2026-08-30T10:00:00.000Z',
    status: 'healthy',
    target: 'feature',
  }],
  sections: [
    { id: 'database', status: 'healthy' },
    { id: 'onboarding', status: 'attention' },
    { id: 'jobs', status: 'healthy' },
    { id: 'audit', status: 'healthy' },
    { id: 'integrations', status: 'attention' },
    { id: 'release', status: 'healthy' },
  ],
};

function response(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

async function flushAsyncEffects(): Promise<void> {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

function routeFetch(input: RequestInfo | URL): Promise<Response> {
  const url = String(input);
  if (url === '/api/superadmin/control-center') return Promise.resolve(response(snapshot));
  if (url === '/api/superadmin/settings') return Promise.resolve(response({ settings: [] }));
  if (url === '/api/superadmin/stats') return Promise.resolve(response({ tables: [], fetchedAt: snapshot.generatedAt }));
  if (url.startsWith('/api/superadmin/jobs/logs')) return Promise.resolve(response({ logs: [] }));
  if (url === '/api/superadmin/health') {
    return Promise.resolve(response({
      envVars: {},
      keyAnalysis: {
        serviceConfigured: true,
        anonConfigured: true,
        serviceOnly: true,
        noWhitespace: true,
      },
      supabaseTests: [],
      checkedAt: snapshot.generatedAt,
    }));
  }
  return Promise.resolve(response({}));
}

beforeEach(() => {
  document.documentElement.lang = 'hu';
  window.history.replaceState(null, '', '/superadmin');
  vi.stubGlobal('fetch', vi.fn(routeFetch));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.lang = 'hu';
  window.history.replaceState(null, '', '/');
});

describe('SuperadminControlCenter', () => {
  it('announces a non-animated fallback loading state', () => {
    vi.mocked(fetch).mockReturnValue(new Promise<Response>(() => undefined));
    render(<SuperadminControlCenter onOpenTab={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('A platform állapotképének betöltése…');
  });

  it('renders a localized, partial-safe platform snapshot without exposing backend fallback copy', async () => {
    const onOpenTab = vi.fn();
    render(<SuperadminControlCenter onOpenTab={onOpenTab} />);

    expect(await screen.findByRole('heading', { name: 'A PanelLakó működése egyetlen tiszta nézetben' })).toBeInTheDocument();
    expect(screen.getByText('Közösségek')).toBeInTheDocument();
    expect(screen.getByText('286')).toBeInTheDocument();
    expect(screen.getByText('Ellenőrzésre váró közösségi kérelmek')).toBeInTheDocument();
    expect(screen.queryByText('Community requests waiting for review')).not.toBeInTheDocument();
    expect(screen.getByText('PanelLakó adatbázis')).toBeInTheDocument();
    expect(screen.getByText('Részleges')).toBeInTheDocument();
    expect(screen.getByText('Előnézet')).toBeInTheDocument();
    expect(screen.getByText('Funkcióbeállítás módosítva')).toBeInTheDocument();
    expect(screen.getByText('Adminisztrátor · Funkció')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Megnyitás' }));
    expect(onOpenTab).toHaveBeenCalledWith('communityRequests');
  });

  it('shows a recoverable localized error and retries the same snapshot endpoint', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(response(snapshot));

    render(<SuperadminControlCenter onOpenTab={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'Az állapotkép most nem tölthető be' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Újrapróbálás' }));

    expect(await screen.findByRole('heading', { name: 'A PanelLakó működése egyetlen tiszta nézetben' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/superadmin/control-center', expect.objectContaining({ cache: 'no-store' }));
    consoleError.mockRestore();
  });

  it('renders contract drift and missing nested sections as a safe partial snapshot', async () => {
    vi.mocked(fetch).mockResolvedValue(response({
      schemaVersion: 'panellako.admin-control-center.v-next',
      manifestFingerprint: `sha256:${'0'.repeat(64)}`,
      generatedAt: 'not-a-date',
      overallStatus: 'healthy',
      summary: { workspaces: 'not-a-number' },
      attention: null,
      integrations: [{ id: 'supabase', label: 'Supabase', status: 'configured' }],
      release: null,
      recentAudit: null,
      sections: [{ id: 'database', status: 'healthy' }],
    }));

    render(<SuperadminControlCenter onOpenTab={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'A PanelLakó működése egyetlen tiszta nézetben' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Részleges állapotkép' })).toBeInTheDocument();
    expect(screen.getByText('Eltérés')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(5);
    expect(screen.queryByRole('heading', { name: 'Az állapotkép most nem tölthető be' })).not.toBeInTheDocument();
  });

  it('switches the complete surface to English from the document locale', async () => {
    document.documentElement.lang = 'en';
    render(<SuperadminControlCenter onOpenTab={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'PanelLakó platform health in one clear view' })).toBeInTheDocument();
    expect(screen.getByText('Community requests awaiting review')).toBeInTheDocument();
    expect(screen.getByText('PanelLakó database')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Feature configuration updated')).toBeInTheDocument();
  });
});

describe('SuperadminClient tab navigation', () => {
  it('keeps the previous admin surface available and writes user tab changes to browser history', async () => {
    render(<SuperadminClient />);
    await flushAsyncEffects();

    const homeTab = await screen.findByRole('tab', { name: 'Kezdőlap' });
    expect(homeTab).toHaveAttribute('aria-selected', 'true');

    const technicalTab = screen.getByRole('tab', { name: 'Technikai eszközök' });
    fireEvent.click(technicalTab);
    await flushAsyncEffects();

    expect(new URL(window.location.href).searchParams.get('tab')).toBe('operations');
    expect(technicalTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Adatbázis állapot' })).toBeInTheDocument();

    act(() => {
      window.history.replaceState(null, '', '/superadmin?tab=controlCenter');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(homeTab).toHaveAttribute('aria-selected', 'true'));
  });

  it('repairs an invalid system tab with replaceState and supports keyboard tab navigation', async () => {
    window.history.replaceState(null, '', '/superadmin?tab=invalid');
    render(<SuperadminClient />);
    await flushAsyncEffects();

    const homeTab = await screen.findByRole('tab', { name: 'Kezdőlap' });
    await waitFor(() => expect(new URL(window.location.href).searchParams.get('tab')).toBe('controlCenter'));

    fireEvent.keyDown(homeTab, { key: 'ArrowRight' });
    await flushAsyncEffects();
    const governanceTab = screen.getByRole('tab', { name: 'Hozzáférés és kontroll' });
    expect(governanceTab).toHaveFocus();
    expect(governanceTab).toHaveAttribute('aria-selected', 'true');
    expect(new URL(window.location.href).searchParams.get('tab')).toBe('governance');
  });

  it('normalizes and renders a replayed migration receipt summary', async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === '/api/superadmin/apply-migrations' && init?.method === 'POST') {
        return response({
          ok: true,
          replayed: true,
          commandStatus: 'ok',
          result: { ok: true, applied: 2, already_applied: 3, failed: 0 },
        });
      }
      return routeFetch(input);
    });

    render(<SuperadminClient />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Technikai eszközök' }));
    await flushAsyncEffects();
    fireEvent.click(screen.getByRole('button', { name: 'Migrációs kérelem' }));
    fireEvent.change(screen.getAllByLabelText('Művelet indoklása')[0], {
      target: { value: 'Platform migráció ellenőrzött kézi alkalmazása' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Jóváhagyási kérelem küldése' }));

    expect(await screen.findByText('Korábbi, azonos migrációs kérés hiteles eredménye')).toBeInTheDocument();
    expect(screen.getByText(/Alkalmazva: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Már alkalmazva: 3/)).toBeInTheDocument();
  });

  it('keeps the unfinished KENYI placeholder visibly disabled', async () => {
    render(<SuperadminClient />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Technikai eszközök' }));
    await flushAsyncEffects();

    const disabled = screen.getByRole('button', { name: 'Még nem elérhető' });
    expect(disabled).toBeDisabled();
    expect(disabled).toHaveAttribute('title', expect.stringContaining('KENYI'));
    expect(screen.getByText(/KENYI manuális feltöltőfelülete/)).toBeInTheDocument();
  });

  it('requires an audited reason and exposes the MFA step-up action for manual jobs', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input) === '/api/superadmin/jobs/run' && init?.method === 'POST') {
        return {
          ok: false,
          status: 428,
          json: async () => ({
            error: 'MFA_STEP_UP_REQUIRED',
            stepUpHref: '/account/security?next=%2Fsuperadmin',
          }),
        } as Response;
      }
      return routeFetch(input);
    });

    render(<SuperadminClient />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Technikai eszközök' }));
    await flushAsyncEffects();

    expect(screen.getAllByRole('button', { name: 'Azonnali indítás' })[0]).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Indoklás'), {
      target: { value: 'BKK kézi szinkron operátori incidenskezeléshez' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Azonnali indítás' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Megerősítés: indítás' }));

    const stepUp = await screen.findByRole('link', { name: 'MFA megerősítése' });
    expect(stepUp).toHaveAttribute('href', '/account/security?next=%2Fsuperadmin');
    const mutationCall = fetchMock.mock.calls.find(call => String(call[0]) === '/api/superadmin/jobs/run');
    expect(mutationCall).toBeDefined();
    expect(JSON.parse(String(mutationCall?.[1]?.body))).toMatchObject({
      job: 'bkk_full_sync',
      reason: 'BKK kézi szinkron operátori incidenskezeléshez',
    });
  });

  it('fails closed when settings cannot be loaded', async () => {
    vi.mocked(fetch).mockImplementation(async input => {
      if (String(input) === '/api/superadmin/settings') return response({ error: 'SETTINGS_UNAVAILABLE' }, false);
      return routeFetch(input);
    });

    render(<SuperadminClient />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Technikai eszközök' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A platformbeállítások nem tölthetők be');
    expect(screen.getByRole('button', { name: 'Beállítások mentése' })).toBeDisabled();
  });
});
