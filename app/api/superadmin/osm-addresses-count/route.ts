import { createAdminClient } from '@/lib/supabase/admin';
import { adminJson } from '@/lib/superadmin/http';
import { requirePlatformRead } from '@/lib/superadmin/operator-authority';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authority = await requirePlatformRead('platform.integrations.read');
  if (!authority.ok) return adminJson({ error: authority.errorCode }, authority.status);

  try {
    const { count, error } = await createAdminClient()
      .from('osm_addresses')
      .select('id', { count: 'exact', head: true });
    if (error || typeof count !== 'number') {
      return adminJson({ error: 'OSM_ADDRESS_COUNT_UNAVAILABLE' }, 503);
    }

    return adminJson({ count });
  } catch {
    return adminJson({ error: 'OSM_ADDRESS_COUNT_UNAVAILABLE' }, 503);
  }
}
