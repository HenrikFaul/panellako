import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuperadminFeaturesTab from '@/components/superadmin-features-tab';
import SuperadminUsersTab from '@/components/superadmin-users-tab';
import { en } from '@/src/i18n/resources/en';
import { hu } from '@/src/i18n/resources/hu';

vi.mock('@/components/superadmin-authority-context', () => ({
  usePlatformAuthority: () => ({
    mode: 'operator',
    capabilityKeys: ['platform.users.manage_trial', 'platform.features.manage'],
  }),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';
const FEATURE_ID = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';

const user = {
  id: USER_ID,
  full_name: 'Teszt Elek',
  emailMasked: 't***@p***.hu',
  created_at: '2026-08-01T10:00:00.000Z',
  free_trial_start: '2026-08-01T10:00:00.000Z',
  free_trial_days: 14,
  free_trial_never_expires: false,
};

const feature = {
  id: FEATURE_ID,
  feature_key: 'documents.read',
  name: 'Dokumentumtár',
  description: 'Közösségi dokumentumok',
  module: 'documents',
  route_path: '/documents',
  menu_path: 'Dokumentumok',
  tier: 'alap',
  enabled: true,
  sort_order: 10,
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  document.documentElement.lang = 'hu';
  vi.stubGlobal('fetch', vi.fn());
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(REQUEST_ID);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
  document.documentElement.lang = 'hu';
});

describe('SuperadminUsersTab', () => {
  it('shows a recoverable loading error and retries the bounded read endpoint', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response({ users: [user], pagination: { offset: 0, hasMore: false, nextOffset: null } }));

    render(<SuperadminUsersTab />);
    expect(await screen.findByRole('alert')).toHaveTextContent(hu.superadmin.users.loadError);
    fireEvent.click(screen.getByRole('button', { name: hu.superadmin.users.retry }));

    expect(await screen.findByText('Teszt Elek')).toBeInTheDocument();
    expect(screen.getByText('t***@p***.hu')).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith('/api/superadmin/users?limit=50&offset=0', expect.objectContaining({ cache: 'no-store' }));
  });

  it('keeps one idempotency key across a transport retry and trusts only the canonical RPC result', async () => {
    const patchBodies: Array<Record<string, unknown>> = [];
    let patchAttempt = 0;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input).startsWith('/api/superadmin/users?')) {
        return response({ users: [user], pagination: { offset: 0, hasMore: false, nextOffset: null } });
      }
      patchBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      patchAttempt += 1;
      if (patchAttempt === 1) throw new Error('connection reset');
      return response({
        ok: true,
        outcome: 'updated',
        replayed: true,
        profileId: USER_ID,
        trial: {
          free_trial_start: '2026-08-30T00:00:00.000Z',
          free_trial_days: 45,
          free_trial_never_expires: false,
        },
      });
    });

    render(<SuperadminUsersTab />);
    fireEvent.click(await screen.findByRole('button', { name: /Teszt Elek/ }));
    fireEvent.change(screen.getByLabelText(hu.superadmin.users.trialDays), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText(hu.superadmin.users.reasonLabel), { target: { value: 'Bemutatói hozzáférés meghosszabbítása.' } });
    fireEvent.click(screen.getByRole('button', { name: hu.superadmin.users.save }));

    expect(await screen.findByRole('alert')).toHaveTextContent(hu.superadmin.users.errors.network);
    fireEvent.click(screen.getByRole('button', { name: hu.superadmin.users.save }));
    expect(await screen.findByRole('status')).toHaveTextContent(hu.superadmin.users.saveReplayed);

    expect(patchBodies).toHaveLength(2);
    expect(patchBodies[0].idempotencyKey).toBe(REQUEST_ID);
    expect(patchBodies[1].idempotencyKey).toBe(REQUEST_ID);
    expect(patchBodies[0]).toMatchObject({
      free_trial_days: 60,
      reason: 'Bemutatói hozzáférés meghosszabbítása.',
    });
  });

  it('renders MFA step-up and never labels a no-op/error response as success', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).startsWith('/api/superadmin/users?')) {
        return response({ users: [user], pagination: { offset: 0, hasMore: false, nextOffset: null } });
      }
      return response({ error: 'MFA_STEP_UP_REQUIRED', stepUpHref: '/account/security?next=%2Fsuperadmin' }, 428);
    });

    render(<SuperadminUsersTab />);
    fireEvent.click(await screen.findByRole('button', { name: /Teszt Elek/ }));
    fireEvent.change(screen.getByLabelText(hu.superadmin.users.reasonLabel), { target: { value: 'Próbaidőszak operátori ellenőrzése.' } });
    fireEvent.click(screen.getByRole('button', { name: hu.superadmin.users.save }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(hu.superadmin.users.errors.mfaRequired);
    expect(screen.getByRole('link', { name: hu.superadmin.authority.stepUp })).toHaveAttribute('href', '/account/security?next=%2Fsuperadmin');
    expect(screen.queryByText(hu.superadmin.users.saveSucceeded)).not.toBeInTheDocument();
  });

  it('renders the user controls from the English resource when the document locale is English', async () => {
    document.documentElement.lang = 'en';
    vi.mocked(fetch).mockResolvedValue(response({
      users: [],
      pagination: { offset: 0, hasMore: false, nextOffset: null },
    }));

    render(<SuperadminUsersTab />);

    expect(await screen.findByRole('heading', { name: en.superadmin.users.title })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(en.superadmin.users.search)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en.superadmin.users.searchAction })).toBeInTheDocument();
    expect(screen.getByText(en.superadmin.users.noMatch)).toBeInTheDocument();
  });
});

describe('SuperadminFeaturesTab', () => {
  it('shows a recoverable feature loading error', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response({ features: [feature], pagination: { offset: 0, hasMore: false, nextOffset: null } }));

    render(<SuperadminFeaturesTab />);
    expect(await screen.findByRole('alert')).toHaveTextContent(hu.superadmin.features.loadError);
    fireEvent.click(screen.getByRole('button', { name: hu.superadmin.features.retry }));
    expect(await screen.findByText('Dokumentumtár')).toBeInTheDocument();
  });

  it('sends reason plus idempotency metadata and applies only the returned canonical feature', async () => {
    let patchBody: Record<string, unknown> | null = null;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input).startsWith('/api/superadmin/features?')) {
        return response({ features: [feature], pagination: { offset: 0, hasMore: false, nextOffset: null } });
      }
      patchBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return response({
        ok: true,
        outcome: 'updated',
        replayed: false,
        featureId: FEATURE_ID,
        feature: {
          name: 'Hiteles dokumentumtár',
          description: 'Közösségi dokumentumok',
          module: 'documents',
          route_path: '/documents',
          menu_path: 'Dokumentumok',
          tier: 'pro',
          enabled: true,
          sort_order: 10,
        },
      });
    });

    render(<SuperadminFeaturesTab />);
    fireEvent.click(await screen.findByRole('button', { name: /Dokumentumtár/ }));
    fireEvent.change(screen.getByLabelText(hu.superadmin.features.name), { target: { value: 'Nem hiteles kliensérték' } });
    fireEvent.change(screen.getByLabelText(hu.superadmin.features.reasonLabel), { target: { value: 'A dokumentumtár csomagbeállításának javítása.' } });
    fireEvent.click(screen.getByRole('button', { name: hu.superadmin.features.save }));

    expect(await screen.findByRole('status')).toHaveTextContent(hu.superadmin.features.saveSucceeded);
    expect(screen.getByText('Hiteles dokumentumtár')).toBeInTheDocument();
    expect(screen.getByLabelText(hu.superadmin.features.name)).toHaveValue('Hiteles dokumentumtár');
    expect(patchBody).toMatchObject({
      reason: 'A dokumentumtár csomagbeállításának javítása.',
      idempotencyKey: REQUEST_ID,
      patch: expect.objectContaining({ name: 'Nem hiteles kliensérték' }),
    });
  });

  it('renders feature filters and actions from the English resource', async () => {
    document.documentElement.lang = 'en';
    vi.mocked(fetch).mockResolvedValue(response({
      features: [feature],
      pagination: { offset: 0, hasMore: false, nextOffset: null },
    }));

    render(<SuperadminFeaturesTab />);

    expect(await screen.findByRole('heading', { name: en.superadmin.features.title })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(en.superadmin.features.search)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en.superadmin.features.treeView })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en.superadmin.features.flatView })).toBeInTheDocument();
  });

  it('keeps the HU and EN admin editor resource shapes synchronized', () => {
    expect(Object.keys(hu.superadmin.users)).toEqual(Object.keys(en.superadmin.users));
    expect(Object.keys(hu.superadmin.users.errors)).toEqual(Object.keys(en.superadmin.users.errors));
    expect(Object.keys(hu.superadmin.features)).toEqual(Object.keys(en.superadmin.features));
    expect(Object.keys(hu.superadmin.features.errors)).toEqual(Object.keys(en.superadmin.features.errors));
    expect(Object.keys(hu.superadmin.features.tierLabels)).toEqual(Object.keys(en.superadmin.features.tierLabels));
  });
});
