import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import MfaSecurityClient from '@/components/mfa-security-client';
import { sanitizeReturnTo } from '@/lib/auth/return-to';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Fiókbiztonság · PanelLakó',
  description: 'TOTP kétlépcsős azonosítás és friss MFA-megerősítés.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type SecurityPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AccountSecurityPage({ searchParams }: SecurityPageProps) {
  const rawReturnTo = firstSearchParam(searchParams?.next);
  const returnTo = sanitizeReturnTo(rawReturnTo);
  const returnAfterEnrollment = rawReturnTo !== null;
  const securityPath = returnAfterEnrollment
    ? `/account/security?next=${encodeURIComponent(returnTo)}`
    : '/account/security';

  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(securityPath)}`);
  }

  return (
    <MfaSecurityClient
      email={user.email ?? 'A bejelentkezett fiók'}
      returnTo={returnTo}
      returnAfterEnrollment={returnAfterEnrollment}
    />
  );
}
