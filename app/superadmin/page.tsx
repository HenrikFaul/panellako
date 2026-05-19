import { redirect } from 'next/navigation';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import SuperadminClient from '@/components/superadmin-client';

export const dynamic = 'force-dynamic';

export default async function SuperadminPage() {
  const authed = await isSuperadminAuthenticated();
  if (!authed) redirect('/superadmin/login');

  return <SuperadminClient />;
}
