import { createAdminClient } from '@/lib/supabase/admin';
import { adminJson } from '@/lib/superadmin/http';
import { requirePlatformRead } from '@/lib/superadmin/operator-authority';

export const dynamic = 'force-dynamic';

function configured(value: string | undefined): { set: boolean } {
  return { set: Boolean(value?.trim()) };
}

export async function GET() {
  const authority = await requirePlatformRead('platform.health.read');
  if (!authority.ok) return adminJson({ error: authority.errorCode }, authority.status);

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

    return adminJson({
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
    return adminJson({ error: 'HEALTH_UNAVAILABLE' }, 503);
  }
}
