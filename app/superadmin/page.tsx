import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SuperadminAuthorityGate } from '@/components/superadmin-authority-provider';
import { getPlatformAuthorityContext } from '@/lib/superadmin/operator-authority';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SuperadminPage() {
  const context = await getPlatformAuthorityContext();
  if (!context.authenticated) redirect('/superadmin/login');

  return <SuperadminAuthorityGate initialContext={context} />;
}
