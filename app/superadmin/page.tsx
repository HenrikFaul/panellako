import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import SuperadminClient from '@/components/superadmin-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SuperadminPage() {
  const authed = await isSuperadminAuthenticated();
  if (!authed) redirect('/superadmin/login');

  return <SuperadminClient />;
}
