import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { strToU8, zipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuperadminGtfsImport from '@/components/superadmin-gtfs-import';

function response(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response;
}

function confirmPostImportChain(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Automatikus befejezés' }));
  fireEvent.click(screen.getByRole('button', { name: 'Megerősítés: befejezés' }));
}

beforeEach(() => {
  window.sessionStorage.clear();
  let uuidSequence = 0;
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => `00000000-0000-4000-8000-${String(++uuidSequence).padStart(12, '0')}`),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe('SuperadminGtfsImport post-import chain', () => {
  it('retains the same batch scope and key for a later retry after transport uncertainty', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('connection reset after send'))
      .mockRejectedValueOnce(new Error('connection reset after retry'))
      .mockResolvedValueOnce(response({ imported: 1, skipped: 0 }));
    vi.stubGlobal('fetch', fetchMock);

    const file = {
      name: 'feed_info.txt',
      text: async () => [
        'feed_id,feed_publisher_name,feed_publisher_url,feed_lang,feed_start_date,feed_end_date,feed_version',
        'bkk,BKK,https://bkk.hu,hu,20260830,20260930,v1',
      ].join('\n'),
    } as File;

    const { container } = render(<SuperadminGtfsImport />);
    const input = container.querySelector<HTMLInputElement>('input[accept=".txt,.csv"]');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });

    expect(await screen.findByText('✗ GTFS_IMPORT_REQUEST_FAILED')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = String(fetchMock.mock.calls[0]?.[1]?.body);
    const secondBody = String(fetchMock.mock.calls[1]?.[1]?.body);
    expect(secondBody).toBe(firstBody);
    expect(window.sessionStorage.length).toBe(2);

    fireEvent.change(input!, { target: { files: [file] } });
    expect(await screen.findByText('✓ 1 importálva, 0 kihagyva')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const thirdBody = String(fetchMock.mock.calls[2]?.[1]?.body);
    expect(thirdBody).toBe(firstBody);

    const parsed = JSON.parse(firstBody) as { batchId?: string; idempotencyKey?: string; rows?: unknown[] };
    expect(parsed.batchId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(parsed.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(parsed.batchId).not.toBe(parsed.idempotencyKey);
    expect(parsed.rows).toHaveLength(1);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('retains batch identities while the server reports a non-terminal receipt', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        error: 'GTFS_IMPORT_ALREADY_SUBMITTED',
        requestId: '11111111-1111-4111-8111-111111111111',
      }, false))
      .mockResolvedValueOnce(response({ imported: 1, skipped: 0 }));
    vi.stubGlobal('fetch', fetchMock);

    const file = {
      name: 'feed_info.txt',
      text: async () => [
        'feed_id,feed_publisher_name,feed_publisher_url,feed_lang,feed_start_date,feed_end_date,feed_version',
        'bkk,BKK,https://bkk.hu,hu,20260830,20260930,v1',
      ].join('\n'),
    } as File;

    const { container } = render(<SuperadminGtfsImport />);
    const input = container.querySelector<HTMLInputElement>('input[accept=".txt,.csv"]');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });

    expect(await screen.findByText('✗ GTFS_IMPORT_ALREADY_SUBMITTED')).toBeInTheDocument();
    const firstBody = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(window.sessionStorage.length).toBe(2);

    fireEvent.change(input!, { target: { files: [file] } });
    expect(await screen.findByText('✓ 1 importálva, 0 kihagyva')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[1]?.[1]?.body)).toBe(firstBody);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('stops after a non-ok first HTTP response even if its JSON body claims success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({ ok: true, result: { updated: 12 } }, false),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<SuperadminGtfsImport />);
    confirmPostImportChain();

    expect(await screen.findByText('✗ Járatrefs hiba: JOB_REQUEST_FAILED')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Automatikus befejezés' })).toBeEnabled();
    expect(screen.queryByText(/Kész! Járatrefs/)).not.toBeInTheDocument();
  });

  it('reports a non-ok second-stage payload and always clears the running state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, result: { updated: 12 } }))
      .mockResolvedValueOnce(response({ ok: false, error: 'JOB_EXECUTION_FAILED' }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SuperadminGtfsImport />);
    confirmPostImportChain();

    expect(await screen.findByText('✗ Épület–megálló hiba: JOB_EXECUTION_FAILED')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Automatikus befejezés' })).toBeEnabled();
    expect(screen.queryByText(/Kész! Járatrefs/)).not.toBeInTheDocument();
  });

  it('does not report ZIP success when the building-stop stage fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/superadmin/gtfs/import') {
        return response({ imported: 1, skipped: 0 });
      }

      const requestBody = JSON.parse(String(init?.body ?? '{}')) as { job?: string };
      if (requestBody.job === 'gtfs_derive_refs') {
        return response({ ok: true, result: { updated: 1 } });
      }
      if (requestBody.job === 'bkk_building_stops') {
        return response({ ok: false, error: 'JOB_EXECUTION_FAILED' });
      }
      return response({ ok: false, error: 'UNEXPECTED_REQUEST' }, false);
    });
    vi.stubGlobal('fetch', fetchMock);

    const zipBytes = zipSync({
      'trips.txt': strToU8('route_id,service_id,trip_id\nR1,S1,T1\n'),
      'stop_times.txt': strToU8('trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,08:00:00,08:00:00,STOP1,1\n'),
    });
    const zipBuffer = zipBytes.buffer.slice(
      zipBytes.byteOffset,
      zipBytes.byteOffset + zipBytes.byteLength,
    ) as ArrayBuffer;
    const zipFile = {
      name: 'bkk-gtfs.zip',
      arrayBuffer: async () => zipBuffer,
    } as File;

    const { container } = render(<SuperadminGtfsImport />);
    const zipInput = container.querySelector<HTMLInputElement>('input[accept=".zip"]');
    expect(zipInput).not.toBeNull();
    fireEvent.change(zipInput!, { target: { files: [zipFile] } });

    expect(await screen.findByText('✗ A ZIP adatai importálva, de az automatikus levezetés sikertelen.')).toBeInTheDocument();
    expect(screen.queryByText('✅ ZIP import kész, az automatikus levezetés lefutott.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ZIP fájl választása' })).toBeEnabled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  });
});
