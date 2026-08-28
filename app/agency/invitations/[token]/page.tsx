import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AgencyInvitationAcceptClient } from '@/components/agency-portfolio-client';
import { sanitizeReturnTo } from '@/lib/auth/return-to';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Kezelőcéges meghívás · PanelLakó',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface AgencyInvitationPageProps {
  params: { token: string };
}

const TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

export default async function AgencyInvitationPage({ params }: AgencyInvitationPageProps) {
  const token = params.token.trim().toLowerCase();
  if (!TOKEN_PATTERN.test(token)) notFound();

  const invitationPath = sanitizeReturnTo(`/agency/invitations/${token}`, '/agency');
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(invitationPath)}`);
  }

  return <AgencyInvitationAcceptClient token={token} />;
}
