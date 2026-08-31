import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { strToU8, zipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuperadminGtfsImport, { parseCsvText } from '@/components/superadmin-gtfs-import';

function response(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response;
}

const OPERATION_REASON = 'BKK GTFS adatfrissítés kézi operátori ellenőrzéssel';

function provideOperationReason(): void {
  fireEvent.change(screen.getByLabelText('Indoklás'), {
    target: { value: OPERATION_REASON },
  });
}

function confirmPostImportChain(): void {
  provideOperationReason();
  fireEvent.click(screen.getByRole('button', { name: 'Automatikus befejezés' }));
  fireEvent.click(screen.getByRole('button', { name: 'Megerősítés: befejezés' }));
}

beforeEach(() => {
  document.documentElement.lang = 'hu';
  window.sessionStorage.clear();
  let uuidSequence = 0;
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => `00000000-0000-4000-8000-${String(++uuidSequence).padStart(12, '0')}`),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.lang = 'hu';
  window.sessionStorage.clear();
});

describe('SuperadminGtfsImport post-import chain', () => {
  it('locks every mutation entry point without the named job capability', () => {
    render(<SuperadminGtfsImport canMutate={false} />);

    expect(screen.getByLabelText('Indoklás')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Automatikus befejezés' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ZIP fájl választása' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Fájl választása' }).every(button => button.hasAttribute('disabled'))).toBe(true);
  });

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
    provideOperationReason();
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

    const parsed = JSON.parse(firstBody) as { batchId?: string; idempotencyKey?: string; reason?: string; rows?: unknown[] };
    expect(parsed.batchId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(parsed.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(parsed.batchId).not.toBe(parsed.idempotencyKey);
    expect(parsed.reason).toBe(OPERATION_REASON);
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
    provideOperationReason();
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
      'stops.txt': strToU8('stop_id,stop_name,stop_lat,stop_lon\nSTOP1,Main stop,47.5,19.1\n'),
      'routes.txt': strToU8('route_id,route_short_name,route_type\nR1,1,3\n'),
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
    provideOperationReason();
    const zipInput = container.querySelector<HTMLInputElement>('input[accept=".zip"]');
    expect(zipInput).not.toBeNull();
    fireEvent.change(zipInput!, { target: { files: [zipFile] } });

    expect(await screen.findByText('✗ A ZIP adatai importálva, de az automatikus levezetés sikertelen.')).toBeInTheDocument();
    expect(screen.queryByText('✅ ZIP import kész, az automatikus levezetés lefutott.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ZIP fájl választása' })).toBeEnabled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
  });

  it('rejects a ZIP missing a required file before any upload or post-import job', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const zipBytes = zipSync({
      'stops.txt': strToU8('stop_id,stop_name\nSTOP1,Main stop\n'),
      'routes.txt': strToU8('route_id,route_type\nR1,3\n'),
      'trips.txt': strToU8('route_id,service_id,trip_id\nR1,S1,T1\n'),
    });
    const file = {
      name: 'missing-stop-times.zip',
      size: zipBytes.byteLength,
      arrayBuffer: async () => zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength),
    } as File;

    const { container } = render(<SuperadminGtfsImport />);
    provideOperationReason();
    fireEvent.change(container.querySelector('input[accept=".zip"]')!, { target: { files: [file] } });

    expect(await screen.findByText(/Hiányzik egy kötelező GTFS-fájl.*stop_times\.txt/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an individual stop_times file with missing required headers before upload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ imported: 1, skipped: 0 }));
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<SuperadminGtfsImport />);
    provideOperationReason();
    const textInputs = container.querySelectorAll<HTMLInputElement>('input[accept=".txt,.csv"]');
    const tripsInput = textInputs[textInputs.length - 2];
    const stopTimesInput = textInputs[textInputs.length - 1];
    fireEvent.change(tripsInput, {
      target: {
        files: [{
          name: 'trips.txt',
          size: 64,
          text: async () => 'route_id,service_id,trip_id\nR1,S1,T1\n',
        } as File],
      },
    });
    expect(await screen.findByText(/1 trip importálva/)).toBeInTheDocument();

    fireEvent.change(stopTimesInput, {
      target: {
        files: [{
          name: 'stop_times.txt',
          size: 64,
          text: async () => 'trip_id,stop_sequence\nT1,1\n',
        } as File],
      },
    });

    expect(await screen.findByText(/Hiányzik egy kötelező GTFS-oszlop.*stop_times\.txt/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.some(call => String(call[0]) === '/api/superadmin/jobs/run')).toBe(false);
  });

  it('blocks the chain when a required import fails and never reuses an earlier trips map', async () => {
    const requestBodies: Array<Record<string, unknown>> = [];
    let individualTripsDone = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/superadmin/jobs/run') {
        return response({ ok: false, error: 'UNEXPECTED_POST_CHAIN' }, false);
      }
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      requestBodies.push(body);
      if (body.fileType === 'trips' && !individualTripsDone) {
        individualTripsDone = true;
        return response({ imported: 1, skipped: 0 });
      }
      if (body.fileType === 'trips') return response({ error: 'TRIPS_UPLOAD_FAILED' }, false);
      return response({ imported: Array.isArray(body.rows) ? body.rows.length : 0, skipped: 0 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<SuperadminGtfsImport />);
    provideOperationReason();
    const textInputs = container.querySelectorAll<HTMLInputElement>('input[accept=".txt,.csv"]');
    const tripsInput = textInputs[textInputs.length - 2];
    const individualTrips = {
      name: 'trips.txt',
      size: 64,
      text: async () => 'route_id,service_id,trip_id\nR0,S0,T0\n',
    } as File;
    fireEvent.change(tripsInput, { target: { files: [individualTrips] } });
    expect(await screen.findByText(/1 trip importálva/)).toBeInTheDocument();

    const zipBytes = zipSync({
      'stops.txt': strToU8('stop_id,stop_name\nSTOP1,Main stop\n'),
      'routes.txt': strToU8('route_id,route_type\nR1,3\n'),
      'trips.txt': strToU8('route_id,service_id,trip_id\nR1,S1,T1\n'),
      'stop_times.txt': strToU8('trip_id,stop_id,stop_sequence\nT1,STOP1,1\n'),
    });
    const zipFile = {
      name: 'required-import-failure.zip',
      size: zipBytes.byteLength,
      arrayBuffer: async () => zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength),
    } as File;
    fireEvent.change(container.querySelector('input[accept=".zip"]')!, { target: { files: [zipFile] } });

    expect((await screen.findAllByText(/kötelező GTFS-fájl/)).length).toBeGreaterThan(0);
    expect(requestBodies.some(body => body.fileType === 'stop_routes')).toBe(false);
    expect(fetchMock.mock.calls.some(call => String(call[0]) === '/api/superadmin/jobs/run')).toBe(false);
  });

  it('parses escaped quotes and multiline quoted CSV fields', () => {
    expect(parseCsvText('id,name,description\n1,"A ""quoted"" name","first line\nsecond line"\n')).toEqual([
      { id: '1', name: 'A "quoted" name', description: 'first line\nsecond line' },
    ]);
  });

  it('rejects an oversized compressed ZIP before reading it', async () => {
    const arrayBuffer = vi.fn();
    const file = { name: 'oversized.zip', size: 129 * 1024 * 1024, arrayBuffer } as unknown as File;
    const { container } = render(<SuperadminGtfsImport />);
    provideOperationReason();

    fireEvent.change(container.querySelector('input[accept=".zip"]')!, { target: { files: [file] } });

    expect(await screen.findByText(/A tömörített GTFS ZIP túl nagy/)).toBeInTheDocument();
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it('keeps mutation controls locked without a reason and exposes the MFA step-up link', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 428,
      json: async () => ({
        error: 'MFA_STEP_UP_REQUIRED',
        stepUpHref: '/account/security?next=%2Fsuperadmin',
      }),
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    render(<SuperadminGtfsImport />);
    expect(screen.getByRole('button', { name: 'Automatikus befejezés' })).toBeDisabled();

    confirmPostImportChain();

    const stepUp = await screen.findByRole('link', { name: 'MFA megerősítése' });
    expect(stepUp).toHaveAttribute('href', '/account/security?next=%2Fsuperadmin');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      job: 'gtfs_derive_refs',
      reason: OPERATION_REASON,
    });
  });
});
