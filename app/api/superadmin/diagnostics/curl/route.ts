import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import dns from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import net from 'node:net';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Superadmin HTTP runner — execute an arbitrary HTTP request from the
// Vercel serverless environment and return the full response. Useful for
// diagnosing whether upstream APIs (Overpass mirrors, Open-Meteo,
// Supabase REST, etc.) are reachable from this deployment.
//
// SECURITY:
//  - superadmin authentication required (cookie-based session)
//  - request hostname must resolve to public IPs only (SSRF guard against
//    Vercel internal infrastructure, cloud metadata services, RFC1918,
//    loopback, link-local, IPv6 ULA/link-local)
//  - response body capped at 512 KB
//  - response truncated for display if larger than 32 KB
//  - max 30 s total
//  - method limited to GET/POST/PUT/PATCH/DELETE/HEAD

interface RunRequest {
  url:        string;
  method?:    string;
  headers?:   Record<string, string>;
  body?:      string;
  timeoutMs?: number;
}

interface RunResponse {
  ok:          boolean;
  status:      number | null;
  statusText:  string | null;
  elapsedMs:   number;
  url:         string;
  finalUrl:    string | null;
  redirected:  boolean;
  contentType: string | null;
  responseHeaders: Record<string, string>;
  bodyBytes:   number;
  bodyText:    string;
  bodyTruncated: boolean;
  error:       string | null;
}

const MAX_BODY_BYTES        = 512 * 1024;   // 512 KB hard cap
const MAX_DISPLAY_BYTES     =  32 * 1024;   // truncate to 32 KB for the UI
const MAX_TIMEOUT_MS        = 25_000;       // a bit under maxDuration=30s
const DEFAULT_TIMEOUT_MS    = 10_000;
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(n => parseInt(n, 10));
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 10)                                        return true;   // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31)                 return true;   // 172.16.0.0/12
  if (a === 192 && b === 168)                          return true;   // 192.168.0.0/16
  if (a === 127)                                       return true;   // 127.0.0.0/8 loopback
  if (a === 169 && b === 254)                          return true;   // 169.254.0.0/16 link-local + cloud metadata
  if (a === 100 && b >= 64 && b <= 127)                return true;   // 100.64.0.0/10 CGNAT
  if (a === 0)                                         return true;   // 0.0.0.0/8
  if (a >= 224)                                        return true;   // multicast + reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1')                  return true;   // loopback
  if (lower === '::')                   return true;   // unspecified
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;  // link-local fe80::/10
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;  // ULA fc00::/7
  if (lower.startsWith('ff'))           return true;   // multicast
  // IPv4-mapped (::ffff:a.b.c.d) — re-check the v4 portion
  const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);
  return false;
}

async function ssrfGuard(targetUrl: URL): Promise<{ ok: true } | { ok: false; reason: string }> {
  const host = targetUrl.hostname.replace(/^\[|\]$/g, '');
  // Reject obviously dangerous strings outright
  if (!host || host === 'localhost' || host.endsWith('.localhost')) {
    return { ok: false, reason: `Host '${host}' is forbidden (localhost)` };
  }
  if (host.endsWith('.internal') || host.endsWith('.local') || host.endsWith('.vercel.run')) {
    return { ok: false, reason: `Host suffix forbidden: '${host}'` };
  }
  // If host is already an IP literal, check it directly
  if (net.isIPv4(host)) {
    if (isPrivateIPv4(host)) return { ok: false, reason: `Private IPv4 address ${host}` };
    return { ok: true };
  }
  if (net.isIPv6(host)) {
    if (isPrivateIPv6(host)) return { ok: false, reason: `Private IPv6 address ${host}` };
    return { ok: true };
  }
  // Resolve hostname; reject if ANY resolved address is private
  let addrs: LookupAddress[];
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch (err) {
    return { ok: false, reason: `DNS lookup failed for '${host}': ${err instanceof Error ? err.message : String(err)}` };
  }
  for (const a of addrs) {
    if (a.family === 4 && isPrivateIPv4(a.address)) {
      return { ok: false, reason: `Host '${host}' resolves to private IPv4 ${a.address}` };
    }
    if (a.family === 6 && isPrivateIPv6(a.address)) {
      return { ok: false, reason: `Host '${host}' resolves to private IPv6 ${a.address}` };
    }
  }
  return { ok: true };
}

function sanitizeHeaders(input: Record<string, string> | undefined): Record<string, string> {
  if (!input) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    const key = k.trim();
    // Forbid headers that could be used to bypass / forge identity
    if (/^host$/i.test(key))                                    continue;
    if (/^cookie$/i.test(key))                                  continue;  // don't leak our cookies
    if (/^authorization$/i.test(key) && typeof v === 'string' && v.length > 4000) continue;
    if (typeof v !== 'string')                                  continue;
    if (key.length === 0 || key.length > 200 || v.length > 4000) continue;
    out[key] = v;
  }
  return out;
}

function snapshotHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => { out[k] = v; });
  return out;
}

async function readBodyCapped(res: Response, cap: number): Promise<{ text: string; bytes: number; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { text: '', bytes: 0, truncated: false };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      if (bytes + value.length > cap) {
        const room = Math.max(0, cap - bytes);
        if (room > 0) chunks.push(value.subarray(0, room));
        bytes += room;
        truncated = true;
        try { await reader.cancel(); } catch { /* noop */ }
        break;
      }
      chunks.push(value);
      bytes += value.length;
    }
  }
  // Combine chunks into one Uint8Array
  const buf = new Uint8Array(bytes);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.length; }
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  return { text, bytes, truncated };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: RunRequest;
  try {
    payload = await req.json() as RunRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload?.url || typeof payload.url !== 'string') {
    return NextResponse.json({ error: 'Missing "url"' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(payload.url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return NextResponse.json({ error: `Protocol '${target.protocol}' not allowed (only http/https)` }, { status: 400 });
  }

  const method = (payload.method ?? 'GET').toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: `Method '${method}' not allowed` }, { status: 400 });
  }

  const ssrf = await ssrfGuard(target);
  if (!ssrf.ok) {
    return NextResponse.json({ error: `SSRF guard: ${ssrf.reason}` }, { status: 400 });
  }

  const timeoutMs = Math.min(Math.max(500, payload.timeoutMs ?? DEFAULT_TIMEOUT_MS), MAX_TIMEOUT_MS);
  const headers = sanitizeHeaders(payload.headers);
  if (!('User-Agent' in headers) && !('user-agent' in headers)) {
    headers['User-Agent'] = 'panellako-superadmin-diag/1.0';
  }

  const init: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  };
  if (payload.body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = payload.body;
  }

  const t0 = Date.now();
  let result: RunResponse;
  try {
    const res = await fetch(target.toString(), init);
    const body = method === 'HEAD'
      ? { text: '', bytes: 0, truncated: false }
      : await readBodyCapped(res, MAX_BODY_BYTES);
    const displayText = body.text.length > MAX_DISPLAY_BYTES
      ? body.text.slice(0, MAX_DISPLAY_BYTES)
      : body.text;
    result = {
      ok:              res.ok,
      status:          res.status,
      statusText:      res.statusText || null,
      elapsedMs:       Date.now() - t0,
      url:             target.toString(),
      finalUrl:        res.url,
      redirected:      res.redirected,
      contentType:     res.headers.get('content-type'),
      responseHeaders: snapshotHeaders(res.headers),
      bodyBytes:       body.bytes,
      bodyText:        displayText,
      bodyTruncated:   body.truncated || body.text.length > MAX_DISPLAY_BYTES,
      error:           null,
    };
  } catch (err) {
    result = {
      ok:              false,
      status:          null,
      statusText:      null,
      elapsedMs:       Date.now() - t0,
      url:             target.toString(),
      finalUrl:        null,
      redirected:      false,
      contentType:     null,
      responseHeaders: {},
      bodyBytes:       0,
      bodyText:        '',
      bodyTruncated:   false,
      error:           err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }

  return NextResponse.json(result);
}
