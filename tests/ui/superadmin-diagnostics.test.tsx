import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuperadminDiagnostics from '@/components/superadmin-diagnostics';

beforeEach(() => {
  document.documentElement.lang = 'hu';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SuperadminDiagnostics', () => {
  it('sends only the selected server preset id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      presetId: 'overpass-kumi',
      status: 200,
      statusText: 'OK',
      elapsedMs: 12,
      finalUrl: 'https://overpass.kumi.systems/api/interpreter',
      redirected: false,
      contentType: 'application/json',
      responseHeaders: { 'content-type': 'application/json' },
      bodyBytes: 2,
      bodyText: '{}',
      bodyTruncated: false,
      error: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SuperadminDiagnostics />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kiválasztott próba futtatása' }));

    await screen.findByRole('status');
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ presetId: 'overpass-kumi' });
  });

  it('clears batch running state and uses an error tone after transport failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    render(<SuperadminDiagnostics />);
    const button = screen.getByRole('button', { name: 'Overpass tükrök ellenőrzése' });
    fireEvent.click(button);

    await waitFor(() => expect(screen.getAllByText('DIAGNOSTIC_REQUEST_FAILED')).toHaveLength(4));
    expect(button).toBeEnabled();
    expect(screen.getByText('Overpass tükörállapot').parentElement).toHaveClass('border-rose-200');
  });
});
