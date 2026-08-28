import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseAnnouncementDeliveryStore,
  runAnnouncementDeliveryBatch,
  type AnnouncementDeliveryWorkerConfig,
} from '@/lib/announcement-delivery-worker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function json(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, private' },
  });
}

function secretsMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function configuredCronSecrets(): string[] {
  return [...new Set([
    process.env.ANNOUNCEMENT_DELIVERY_CRON_SECRET,
    process.env.CRON_SECRET,
  ].map(value => value?.trim() ?? '').filter(value => value.length >= 32))];
}

function isCronAuthorized(request: NextRequest, expected: string[]): boolean {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return false;
  const supplied = authorization.slice('Bearer '.length);
  return supplied.length > 0 && expected.some(secret => secretsMatch(supplied, secret));
}

function boundedInteger(raw: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function appBaseUrl(): string | null {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://panellako.hu').trim();
  try {
    const parsed = new URL(raw);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function workerConfig(baseUrl: string): AnnouncementDeliveryWorkerConfig {
  return {
    batchSize: boundedInteger(process.env.ANNOUNCEMENT_DELIVERY_BATCH_SIZE, 10, 1, 50),
    leaseSeconds: boundedInteger(process.env.ANNOUNCEMENT_DELIVERY_LEASE_SECONDS, 600, 60, 1800),
    maxAttempts: boundedInteger(process.env.ANNOUNCEMENT_DELIVERY_MAX_ATTEMPTS, 5, 1, 20),
    baseBackoffSeconds: boundedInteger(process.env.ANNOUNCEMENT_DELIVERY_BACKOFF_SECONDS, 30, 5, 3600),
    maxBackoffSeconds: boundedInteger(process.env.ANNOUNCEMENT_DELIVERY_MAX_BACKOFF_SECONDS, 3600, 5, 86400),
    appBaseUrl: baseUrl,
  };
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const secrets = configuredCronSecrets();
  if (secrets.length === 0) return json({ ok: false, error: 'Worker is not configured' }, 503);
  if (!isCronAuthorized(request, secrets)) return json({ ok: false, error: 'Unauthorized' }, 401);

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const baseUrl = appBaseUrl();
  if (!url || !serviceRoleKey || !baseUrl) {
    return json({ ok: false, error: 'Worker data service is not configured' }, 503);
  }

  try {
    const client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const result = await runAnnouncementDeliveryBatch(
      createSupabaseAnnouncementDeliveryStore(client),
      workerConfig(baseUrl),
    );
    return json({ ok: true, ...result }, 200);
  } catch {
    // Never echo provider, database, recipient or announcement details.
    return json({ ok: false, error: 'Delivery worker failed' }, 500);
  }
}

// Vercel Cron invokes GET and automatically supplies Authorization: Bearer
// ${CRON_SECRET}. POST is retained for an external scheduler using the same
// service credential.
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
