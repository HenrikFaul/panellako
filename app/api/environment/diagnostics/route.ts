import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Diagnostic endpoint — hit this in production to see exactly which external
// data sources are reachable from THIS Vercel deployment. Use it when the
// `/api/environment/urban` or `/api/environment/green` route is failing so
// you can tell whether the issue is upstream availability or our code.
//
//   curl https://panellako.hu/api/environment/_diagnostics

const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

const TINY_QUERY = '[out:json][timeout:5];node[amenity=pharmacy](around:200,47.4979,19.0402);out qt 1;';

interface MirrorResult {
  url:         string;
  status:      number | null;
  ok:          boolean;
  elapsedMs:   number;
  bytes:       number | null;
  elementCount: number | null;
  error:       string | null;
}

async function pingOverpass(url: string): Promise<MirrorResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':   'panellako/1.0 (info@panellako.hu)',
      },
      body:   `data=${encodeURIComponent(TINY_QUERY)}`,
      signal: AbortSignal.timeout(8_000),
    });
    const text = await res.text();
    let elementCount: number | null = null;
    if (res.ok) {
      try {
        const j = JSON.parse(text) as { elements?: unknown[] };
        elementCount = j.elements?.length ?? 0;
      } catch {
        elementCount = null;
      }
    }
    return {
      url,
      status:       res.status,
      ok:           res.ok,
      elapsedMs:    Date.now() - t0,
      bytes:        text.length,
      elementCount,
      error:        res.ok ? null : text.slice(0, 200),
    };
  } catch (err) {
    return {
      url,
      status:       null,
      ok:           false,
      elapsedMs:    Date.now() - t0,
      bytes:        null,
      elementCount: null,
      error:        err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }
}

async function pingOpenMeteo(): Promise<MirrorResult> {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=47.49&longitude=19.04&current=temperature_2m';
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    const text = await res.text();
    return {
      url,
      status:       res.status,
      ok:           res.ok,
      elapsedMs:    Date.now() - t0,
      bytes:        text.length,
      elementCount: null,
      error:        res.ok ? null : text.slice(0, 200),
    };
  } catch (err) {
    return {
      url,
      status:       null,
      ok:           false,
      elapsedMs:    Date.now() - t0,
      bytes:        null,
      elementCount: null,
      error:        err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }
}

export async function GET() {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const [overpass, openMeteo] = await Promise.all([
    Promise.all(OVERPASS_MIRRORS.map(pingOverpass)),
    pingOpenMeteo(),
  ]);

  const reachableCount = overpass.filter(m => m.ok && (m.elementCount ?? 0) >= 0).length;

  return NextResponse.json({
    startedAt,
    totalElapsedMs: Date.now() - t0,
    summary: {
      overpassReachable:    reachableCount,
      overpassTotal:        OVERPASS_MIRRORS.length,
      openMeteoReachable:   openMeteo.ok,
    },
    overpass,
    openMeteo,
    env: {
      vercelRegion: process.env.VERCEL_REGION ?? null,
      runtime:      'nodejs',
      maxDuration:  30,
    },
    note: 'If overpassReachable > 0, the urban/green panels should work. If 0, all mirrors are blocked from this Vercel deployment — escalate to deeper fix (Supabase Edge Function proxy or self-hosted Overpass).',
  });
}
