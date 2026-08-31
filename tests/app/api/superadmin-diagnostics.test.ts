import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requirePlatformRead: vi.fn(),
  lookup: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  requirePlatformRead: mocks.requirePlatformRead,
}));

vi.mock('node:dns/promises', () => ({
  default: { lookup: mocks.lookup },
}));

import { POST } from '@/app/api/superadmin/diagnostics/curl/route';

function request(body: unknown, options?: { origin?: string; contentType?: string; rawBody?: string }): NextRequest {
  const origin = options?.origin ?? 'https://panellako.hu';
  return new NextRequest('https://panellako.hu/api/superadmin/diagnostics/curl', {
    method: 'POST',
    headers: {
      Host: 'panellako.hu',
      Origin: origin,
      'Sec-Fetch-Site': origin === 'https://panellako.hu' ? 'same-origin' : 'cross-site',
      'Content-Type': options?.contentType ?? 'application/json',
    },
    body: options?.rawBody ?? JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePlatformRead.mockResolvedValue({ ok: true, context: { mode: 'operator' } });
  mocks.lookup.mockResolvedValue([{ address: '203.0.113.10', family: 4 }]);
});

describe('superadmin diagnostic presets', () => {
  it('authenticates before any outbound request', async () => {
    mocks.requirePlatformRead.mockResolvedValue({
      ok: false,
      status: 401,
      errorCode: 'AUTH_REQUIRED',
      context: { mode: 'none' },
    });
    const outbound = vi.spyOn(globalThis, 'fetch');

    const response = await POST(request({ presetId: 'open-meteo' }));

    expect(response.status).toBe(401);
    expect(outbound).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(mocks.requirePlatformRead).toHaveBeenCalledWith('platform.integrations.read');
  });

  it('requires same-origin JSON and rejects arbitrary request specifications', async () => {
    expect((await POST(request({ presetId: 'open-meteo' }, { origin: 'https://attacker.example' }))).status).toBe(403);
    expect((await POST(request({ presetId: 'open-meteo' }, { contentType: 'text/plain' }))).status).toBe(415);
    expect((await POST(request({ presetId: 'open-meteo', url: 'https://attacker.example' }))).status).toBe(400);
    expect((await POST(request({ presetId: 'missing-preset' }))).status).toBe(404);
  });

  it('uses the fixed server preset without credential headers', async () => {
    const outbound = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"current":{}}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const response = await POST(request({ presetId: 'open-meteo' }));
    const body = await response.json() as { ok: boolean; presetId: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, presetId: 'open-meteo' });
    expect(outbound).toHaveBeenCalledTimes(1);
    const [target, init] = outbound.mock.calls[0];
    expect(String(target)).toContain('api.open-meteo.com/v1/forecast');
    expect(init?.method).toBe('GET');
    expect(init?.redirect).toBe('manual');
    const headers = new Headers(init?.headers);
    expect(headers.has('authorization')).toBe(false);
    expect(headers.has('cookie')).toBe(false);
  });

  it('blocks a redirect outside the preset host before following it', async () => {
    const outbound = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, {
      status: 302,
      headers: { Location: 'https://127.0.0.1/private' },
    }));

    const response = await POST(request({ presetId: 'open-meteo' }));
    const body = await response.json() as { ok: boolean; error: string };

    expect(body).toMatchObject({ ok: false, error: 'DIAGNOSTIC_REDIRECT_BLOCKED' });
    expect(outbound).toHaveBeenCalledTimes(1);
  });

  it('revalidates an allowed redirect and redacts sensitive final URL parameters', async () => {
    const outbound = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: 'https://api.open-meteo.com/redirected?token=upstream-secret' },
      }))
      .mockResolvedValueOnce(new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    const response = await POST(request({ presetId: 'open-meteo' }));
    const body = await response.json() as { ok: boolean; finalUrl: string; redirected: boolean };

    expect(body.ok).toBe(true);
    expect(body.redirected).toBe(true);
    expect(body.finalUrl).toContain('redacted');
    expect(body.finalUrl).not.toContain('upstream-secret');
    expect(outbound).toHaveBeenCalledTimes(2);
    expect(mocks.lookup).toHaveBeenCalledTimes(3);
  });

  it('redacts sensitive response body fields and excludes sensitive headers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      '{"token":"top-secret","authorization":"Bearer abc.def"}',
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'session=private',
          'X-Api-Key': 'private-key',
        },
      },
    ));

    const response = await POST(request({ presetId: 'open-meteo' }));
    const text = await response.text();

    expect(text).not.toContain('top-secret');
    expect(text).not.toContain('abc.def');
    expect(text).not.toContain('session=private');
    expect(text).not.toContain('private-key');
    expect(text).toContain('[redacted]');
  });
});
