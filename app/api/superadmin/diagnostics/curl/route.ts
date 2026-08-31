import type { LookupAddress } from 'node:dns';
import dns from 'node:dns/promises';
import net from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { BoundedJsonError, readBoundedJson } from '@/lib/http/bounded-json';
import {
  adminJson,
  hasJsonContentType,
  isSameOriginAdminRequest,
} from '@/lib/superadmin/http';
import { requirePlatformRead } from '@/lib/superadmin/operator-authority';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type DiagnosticMethod = 'GET' | 'HEAD' | 'POST';

interface DiagnosticPreset {
  url: string | ((request: NextRequest) => string);
  method: DiagnosticMethod;
  headers?: Readonly<Record<string, string>>;
  body?: string;
  timeoutMs: number;
  allowedHosts?: readonly string[];
}

interface RunResponse {
  ok: boolean;
  presetId: string;
  status: number | null;
  statusText: string | null;
  elapsedMs: number;
  finalUrl: string | null;
  redirected: boolean;
  contentType: string | null;
  responseHeaders: Record<string, string>;
  bodyBytes: number;
  bodyText: string;
  bodyTruncated: boolean;
  error: string | null;
}

const OVERPASS_TINY = '[out:json][timeout:5];node[amenity=pharmacy](around:200,47.5278845,19.0705657);out qt 1;';
const USER_AGENT = 'panellako-superadmin-diag/2.0 (info@panellako.hu)';
const MAX_REQUEST_BYTES = 4 * 1024;
const MAX_BODY_BYTES = 512 * 1024;
const MAX_DISPLAY_BYTES = 32 * 1024;
const MAX_TIMEOUT_MS = 25_000;
const MAX_REDIRECT_HOPS = 3;
const SAFE_RESPONSE_HEADERS = new Set(['content-type', 'content-length', 'cache-control', 'etag', 'last-modified', 'retry-after']);
const FORBIDDEN_OUTBOUND_HEADER = /^(authorization|cookie|proxy-authorization|x-api-key)$/i;

const DIAGNOSTIC_PRESETS: Readonly<Record<string, DiagnosticPreset>> = Object.freeze({
  'overpass-kumi': {
    url: 'https://overpass.kumi.systems/api/interpreter',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(OVERPASS_TINY)}`,
    timeoutMs: 9_000,
  },
  'overpass-api-de': {
    url: 'https://overpass-api.de/api/interpreter',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(OVERPASS_TINY)}`,
    timeoutMs: 9_000,
  },
  'overpass-fr': {
    url: 'https://overpass.openstreetmap.fr/api/interpreter',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(OVERPASS_TINY)}`,
    timeoutMs: 9_000,
  },
  'overpass-lz4': {
    url: 'https://lz4.overpass-api.de/api/interpreter',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(OVERPASS_TINY)}`,
    timeoutMs: 9_000,
  },
  'gibs-ndvi': {
    url: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_NDVI_8Day&STYLES=&CRS=EPSG:4326&BBOX=45.7,16.0,48.6,22.9&WIDTH=1024&HEIGHT=430&FORMAT=image/png&TRANSPARENT=TRUE&TIME=2024-09-22',
    method: 'GET',
    timeoutMs: 20_000,
  },
  'earth-search': {
    url: 'https://earth-search.aws.element84.com/v1/search',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collections: ['sentinel-2-l2a'],
      intersects: { type: 'Point', coordinates: [19.0705657, 47.5278845] },
      limit: 1,
    }),
    timeoutMs: 15_000,
  },
  'open-meteo': {
    url: 'https://api.open-meteo.com/v1/forecast?latitude=47.5279&longitude=19.0706&current=temperature_2m',
    method: 'GET',
    timeoutMs: 5_000,
  },
  'open-meteo-aq': {
    url: 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=47.5279&longitude=19.0706&current=pm2_5,pm10',
    method: 'GET',
    timeoutMs: 5_000,
  },
  'self-diag': {
    url: request => `${request.nextUrl.origin}/api/environment/diagnostics`,
    method: 'GET',
    timeoutMs: 20_000,
  },
  pvgis: {
    url: 'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=47.5279&lon=19.0706&peakpower=1&loss=14&pvtechchoice=crystSi&outputformat=json',
    method: 'GET',
    timeoutMs: 15_000,
  },
  titiler: {
    url: 'https://titiler.xyz/cog/point/19.0706,47.5279?url=https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/33/U/XP/2024/9/S2A_33UXP_20240920_0_L2A/B08.tif',
    method: 'GET',
    timeoutMs: 15_000,
  },
});

function json(body: unknown, status = 200): NextResponse {
  return adminJson(body as Record<string, unknown>, status);
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(value => Number.parseInt(value, 10));
  if (parts.length !== 4 || parts.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (/^fe[89ab]/.test(lower) || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('ff')) return true;
  const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return v4Mapped ? isPrivateIPv4(v4Mapped[1]) : false;
}

async function ssrfGuard(target: URL): Promise<boolean> {
  const host = target.hostname.replace(/^\[|\]$/g, '');
  if (
    !host
    || host === 'localhost'
    || host.endsWith('.localhost')
    || host.endsWith('.internal')
    || host.endsWith('.local')
    || host.endsWith('.vercel.run')
  ) return false;
  if (net.isIPv4(host)) return !isPrivateIPv4(host);
  if (net.isIPv6(host)) return !isPrivateIPv6(host);

  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    return false;
  }
  return addresses.length > 0 && addresses.every(address => (
    address.family === 4 ? !isPrivateIPv4(address.address) : !isPrivateIPv6(address.address)
  ));
}

function allowedHostsFor(preset: DiagnosticPreset, initialTarget: URL): Set<string> {
  return new Set((preset.allowedHosts ?? [initialTarget.hostname]).map(host => host.toLowerCase()));
}

async function validateTarget(target: URL, allowedHosts: Set<string>): Promise<boolean> {
  return (
    target.protocol === 'https:'
    && !target.username
    && !target.password
    && allowedHosts.has(target.hostname.toLowerCase())
    && await ssrfGuard(target)
  );
}

function presetHeaders(preset: DiagnosticPreset): Record<string, string> {
  const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
  for (const [key, value] of Object.entries(preset.headers ?? {})) {
    if (FORBIDDEN_OUTBOUND_HEADER.test(key)) continue;
    headers[key] = value;
  }
  return headers;
}

function redactText(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/((?:authorization|cookie|set-cookie|api[_-]?key|token|secret|password)\s*[=:]\s*)[^\s,;"}]+/gi, '$1[redacted]')
    .replace(/("(?:authorization|cookie|set-cookie|api[_-]?key|token|secret|password)"\s*:\s*")[^"]*(")/gi, '$1[redacted]$2');
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (/(authorization|cookie|api[_-]?key|token|secret|password|signature|credential)/i.test(key)) {
        url.searchParams.set(key, '[redacted]');
      }
    }
    return url.toString();
  } catch {
    return '';
  }
}

function snapshotHeaders(headers: Headers): Record<string, string> {
  const safe: Record<string, string> = {};
  headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (SAFE_RESPONSE_HEADERS.has(normalized)) safe[normalized] = redactText(value);
  });
  return safe;
}

async function readBodyCapped(response: Response): Promise<{ text: string; bytes: number; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) return { text: '', bytes: 0, truncated: false };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (bytes + value.byteLength > MAX_BODY_BYTES) {
      const remaining = Math.max(0, MAX_BODY_BYTES - bytes);
      if (remaining > 0) chunks.push(value.slice(0, remaining));
      bytes += remaining;
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    bytes += value.byteLength;
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    text: new TextDecoder('utf-8', { fatal: false }).decode(buffer),
    bytes,
    truncated,
  };
}

function failedResponse(
  presetId: string,
  startedAt: number,
  error: string,
  overrides: Partial<RunResponse> = {},
): RunResponse {
  return {
    ok: false,
    presetId,
    status: null,
    statusText: null,
    elapsedMs: Date.now() - startedAt,
    finalUrl: null,
    redirected: false,
    contentType: null,
    responseHeaders: {},
    bodyBytes: 0,
    bodyText: '',
    bodyTruncated: false,
    error,
    ...overrides,
  };
}

async function fetchPreset(
  request: NextRequest,
  presetId: string,
  preset: DiagnosticPreset,
): Promise<RunResponse> {
  const initialTarget = new URL(typeof preset.url === 'function' ? preset.url(request) : preset.url);
  const allowedHosts = allowedHostsFor(preset, initialTarget);
  let target = initialTarget;
  let redirectCount = 0;
  const startedAt = Date.now();
  const signal = AbortSignal.timeout(Math.min(preset.timeoutMs, MAX_TIMEOUT_MS));

  while (true) {
    if (!(await validateTarget(target, allowedHosts))) {
      return failedResponse(presetId, startedAt, 'DIAGNOSTIC_TARGET_BLOCKED', { redirected: redirectCount > 0 });
    }

    let response: Response;
    try {
      response = await fetch(target.toString(), {
        method: preset.method,
        headers: presetHeaders(preset),
        body: preset.method === 'POST' ? preset.body : undefined,
        redirect: 'manual',
        signal,
      });
    } catch {
      return failedResponse(presetId, startedAt, 'DIAGNOSTIC_FETCH_FAILED', { redirected: redirectCount > 0 });
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      const base = {
        status: response.status,
        statusText: response.statusText || null,
        finalUrl: redactUrl(target.toString()),
        redirected: redirectCount > 0,
        responseHeaders: snapshotHeaders(response.headers),
      };
      if (!location || redirectCount >= MAX_REDIRECT_HOPS) {
        return failedResponse(
          presetId,
          startedAt,
          location ? 'DIAGNOSTIC_REDIRECT_LIMIT' : 'DIAGNOSTIC_REDIRECT_INVALID',
          base,
        );
      }
      let nextTarget: URL;
      try {
        nextTarget = new URL(location, target);
      } catch {
        return failedResponse(presetId, startedAt, 'DIAGNOSTIC_REDIRECT_INVALID', base);
      }
      if (!(await validateTarget(nextTarget, allowedHosts))) {
        return failedResponse(presetId, startedAt, 'DIAGNOSTIC_REDIRECT_BLOCKED', { ...base, redirected: true });
      }
      target = nextTarget;
      redirectCount += 1;
      continue;
    }

    const body = preset.method === 'HEAD'
      ? { text: '', bytes: 0, truncated: false }
      : await readBodyCapped(response);
    const redactedBody = redactText(body.text);
    return {
      ok: response.ok,
      presetId,
      status: response.status,
      statusText: response.statusText || null,
      elapsedMs: Date.now() - startedAt,
      finalUrl: redactUrl(target.toString()),
      redirected: redirectCount > 0,
      contentType: response.headers.get('content-type'),
      responseHeaders: snapshotHeaders(response.headers),
      bodyBytes: body.bytes,
      bodyText: redactedBody.slice(0, MAX_DISPLAY_BYTES),
      bodyTruncated: body.truncated || redactedBody.length > MAX_DISPLAY_BYTES,
      error: response.ok ? null : 'DIAGNOSTIC_UPSTREAM_ERROR',
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authority = await requirePlatformRead('platform.integrations.read');
  if (!authority.ok) return json({ error: authority.errorCode }, authority.status);
  if (!isSameOriginAdminRequest(request)) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
  if (!hasJsonContentType(request)) {
    return json({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await readBoundedJson(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof BoundedJsonError && error.code === 'REQUEST_TOO_LARGE') {
      return json({ error: 'REQUEST_TOO_LARGE' }, 413);
    }
    return json({ error: 'INVALID_JSON' }, 400);
  }
  if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
    return json({ error: 'INVALID_PRESET_REQUEST' }, 400);
  }
  const record = parsedBody as Record<string, unknown>;
  const keys = Object.keys(record);
  const presetId = record.presetId;
  if (keys.length !== 1 || typeof presetId !== 'string' || !/^[a-z0-9-]{1,64}$/.test(presetId)) {
    return json({ error: 'INVALID_PRESET_REQUEST' }, 400);
  }
  const preset = DIAGNOSTIC_PRESETS[presetId];
  if (!preset) return json({ error: 'DIAGNOSTIC_PRESET_NOT_FOUND' }, 404);

  try {
    return json(await fetchPreset(request, presetId, preset));
  } catch {
    return json(failedResponse(presetId, Date.now(), 'DIAGNOSTIC_FETCH_FAILED'));
  }
}
