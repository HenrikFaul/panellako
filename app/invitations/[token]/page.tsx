import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import InvitationAcceptClient from '@/components/invitation-accept-client';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Közösségi meghívás',
  robots: { index: false, follow: false },
};

interface InvitationPageProps {
  params: { token: string };
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const invitationPath = `/invitations/${encodeURIComponent(params.token)}`;
    redirect(`/login?next=${encodeURIComponent(invitationPath)}`);
  }

  return <InvitationAcceptClient token={params.token} />;
}
