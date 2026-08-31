import { getControlCenterSnapshot } from '@/lib/superadmin/control-center-server';
import { adminJson } from '@/lib/superadmin/http';
import { requirePlatformRead } from '@/lib/superadmin/operator-authority';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const authority = await requirePlatformRead('platform.overview.read');
  if (!authority.ok) return adminJson({ error: authority.errorCode }, authority.status);

  return adminJson(await getControlCenterSnapshot());
}
