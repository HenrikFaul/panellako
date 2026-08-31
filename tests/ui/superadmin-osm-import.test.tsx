import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuperadminOsmImport from '@/components/superadmin-osm-import';

const OPERATION_REASON = 'Országos OSM címadatok operátori frissítése';

function provideOperationReason(): void {
  fireEvent.change(screen.getByLabelText('Indoklás'), {
    target: { value: OPERATION_REASON },
  });
}

beforeEach(() => {
  document.documentElement.lang = 'hu';
  window.sessionStorage.clear();
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => '11111111-1111-4111-8111-111111111111') });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe('SuperadminOsmImport', () => {
  it('keeps read-only count access available while locking mutations without the named capability', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ count: 10 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SuperadminOsmImport canMutate={false} />);

    expect(await screen.findByText('10 sor')).toBeInTheDocument();
    expect(screen.getByLabelText('Indoklás')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Egész ország' })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows a distinct unavailable count state with an accessible retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'OSM_ADDRESS_COUNT_UNAVAILABLE' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )));

    render(<SuperadminOsmImport />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sorszám nem elérhető');
    expect(screen.getByRole('button', { name: 'OSM-sorszám újratöltése' })).toBeEnabled();
  });

  it('renders a partial country import as warning and exposes failed counties for retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 10 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: false,
        commandStatus: 'partial',
        error: 'OSM_IMPORT_PARTIAL',
        result: {
          totalImported: 1200,
          failedCount: 2,
          failedCounties: ['Pest', 'Zala'],
          counties: [
            { county: 'Budapest', ok: true, imported: 1200, skipped: 0 },
            { county: 'Pest', ok: false, imported: 0, skipped: 0, error: 'OVERPASS_UNAVAILABLE' },
            { county: 'Zala', ok: false, imported: 0, skipped: 0, error: 'OVERPASS_UNAVAILABLE' },
          ],
        },
      }), { status: 207, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SuperadminOsmImport />);
    await screen.findByText('10 sor');
    provideOperationReason();
    fireEvent.click(screen.getByRole('button', { name: 'Egész ország' }));
    fireEvent.click(screen.getByRole('button', { name: 'Megerősítés: egész ország' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Részleges import');
    expect(screen.getByRole('alert')).toHaveTextContent('Pest, Zala');
    expect(screen.queryByText(/✓ Kész — 1,200/)).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      job: 'osm_addresses_import_all',
      reason: OPERATION_REASON,
    });
  });

  it('requires a reason and exposes an MFA step-up action for mutations', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 10 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'MFA_STEP_UP_REQUIRED',
        stepUpHref: '/account/security?next=%2Fsuperadmin',
      }), {
        status: 428,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SuperadminOsmImport />);
    await screen.findByText('10 sor');
    expect(screen.getByRole('button', { name: 'Egész ország' })).toBeDisabled();

    provideOperationReason();
    fireEvent.click(screen.getByRole('button', { name: 'Egész ország' }));
    fireEvent.click(screen.getByRole('button', { name: 'Megerősítés: egész ország' }));

    const stepUp = await screen.findByRole('link', { name: 'MFA megerősítése' });
    expect(stepUp).toHaveAttribute('href', '/account/security?next=%2Fsuperadmin');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
