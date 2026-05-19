import { NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function present(val: string | undefined): { set: boolean; length: number; prefix: string } {
  if (!val) return { set: false, length: 0, prefix: '' };
  const trimmed = val.trim();
  return { set: true, length: trimmed.length, prefix: trimmed.slice(0, 6) };
}

async function testSupabase(url: string, key: string, label: string) {
  try {
    const c = createClient(url.trim(), key.trim(), { auth: { persistSession: false } });
    const { count, error } = await c.from('buildings').select('*', { count: 'exact', head: true });
    return { label, ok: !error, count, error: error?.message ?? null };
  } catch (e) {
    return { label, ok: false, count: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url         = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ?? '';
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const bkkKey      = process.env.BKKFUTAR_API_KEY ?? '';
  const cronSecret  = process.env.CRON_SECRET ?? '';
  const syncSecret  = process.env.TRANSIT_SYNC_SECRET ?? '';

  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL:    present(url),
    SUPABASE_SERVICE_ROLE_KEY:   present(serviceKey),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: present(anonKey),
    BKKFUTAR_API_KEY:            present(bkkKey),
    CRON_SECRET:                 present(cronSecret),
    TRANSIT_SYNC_SECRET:         present(syncSecret),
  };

  const serviceKeyTrimmed = serviceKey.trim();
  const anonKeyTrimmed    = anonKey.trim();
  const urlTrimmed        = url.trim();

  const keyAnalysis = {
    serviceKeyIsJwt:  serviceKeyTrimmed.startsWith('eyJ'),
    anonKeyIsJwt:     anonKeyTrimmed.startsWith('eyJ'),
    serviceKeyHasWhitespace: serviceKey !== serviceKeyTrimmed,
    urlHasWhitespace: url !== urlTrimmed,
    effectiveKeyUsed: serviceKeyTrimmed.startsWith('eyJ') ? 'service_role' : 'anon',
  };

  const tests: Awaited<ReturnType<typeof testSupabase>>[] = [];
  if (urlTrimmed && serviceKeyTrimmed) {
    tests.push(await testSupabase(urlTrimmed, serviceKeyTrimmed, 'service_role_key'));
  }
  if (urlTrimmed && anonKeyTrimmed) {
    tests.push(await testSupabase(urlTrimmed, anonKeyTrimmed, 'anon_key'));
  }

  return NextResponse.json({ envVars, keyAnalysis, supabaseTests: tests, checkedAt: new Date().toISOString() });
}
