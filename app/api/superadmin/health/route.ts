import { NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const PRIVATE_NO_STORE = 'private, no-store';

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': PRIVATE_NO_STORE },
  });
}

function configured(value: string | undefined): { set: boolean } {
  return { set: Boolean(value?.trim()) };
}

export async function GET() {
  if (!(await isSuperadminAuthenticated())) {
    return json({ error: 'UNAUTHORIZED' }, 401);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: configured(url),
    SUPABASE_SERVICE_ROLE_KEY: configured(serviceKey),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: configured(anonKey),
    BKKFUTAR_API_KEY: configured(process.env.BKKFUTAR_API_KEY),
    AQICN_API_TOKEN: configured(process.env.AQICN_API_TOKEN),
    CRON_SECRET: configured(process.env.CRON_SECRET),
    TRANSIT_SYNC_SECRET: configured(process.env.TRANSIT_SYNC_SECRET),
  };

  const keyAnalysis = {
    serviceConfigured: envVars.SUPABASE_SERVICE_ROLE_KEY.set,
    anonConfigured: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY.set,
    serviceOnly: true,
    noWhitespace: url === url.trim() && serviceKey === serviceKey.trim(),
  };

  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('buildings')
      .select('*', { count: 'exact', head: true });

    return json({
      envVars,
      keyAnalysis,
      supabaseTests: [{
        label: 'service_role',
        ok: !error,
        count: error ? null : (count ?? 0),
      }],
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return json({ error: 'HEALTH_UNAVAILABLE' }, 503);
  }
}
