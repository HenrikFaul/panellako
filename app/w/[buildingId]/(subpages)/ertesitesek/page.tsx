// Manager-only push notification send page
// URL: /w/[buildingId]/ertesitesek

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ErtesitesekClient from '@/components/ertesitesek-client';
import { hasWorkspaceCapability } from '@/lib/authorization/capabilities';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

interface PageProps {
  params: { buildingId: string };
}

export default async function ErtesitesekPage({ params }: PageProps) {
  const { buildingId: workspaceId } = params;

  if (!isWorkspaceId(workspaceId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${workspaceId}/ertesitesek`);

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');
  if (!hasWorkspaceCapability(context, 'announcement.publish')) {
    redirect(`/w/${workspaceId}`);
  }

  const { data: building } = await supabase
    .from('buildings')
    .select('name, address')
    .eq('id', context.primaryBuildingId)
    .single();

  if (!building) redirect('/app');

  return (
    <ErtesitesekClient
      buildingId={workspaceId}
      buildingName={(building as { name?: string | null }).name ?? building.address}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);
  return {
    title: context ? `Értesítések · ${context.workspaceName} — PanelLakó` : 'Értesítések — PanelLakó',
    description: 'Push értesítések küldése a társasház lakóinak és kezelőinek',
  };
}
