// Hulladékgazdálkodás page
// URL: /w/[buildingId]/hulladek

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WasteDashboardClient from '@/components/waste-dashboard-client';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

interface PageProps {
  params: { buildingId: string };
}

export default async function HulladekPage({ params }: PageProps) {
  const { buildingId: workspaceId } = params;

  if (!isWorkspaceId(workspaceId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${workspaceId}/hulladek`);

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');

  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', context.primaryBuildingId)
    .single();

  if (!building) redirect('/app');

  return (
    <WasteDashboardClient
      buildingId={workspaceId}
      buildingName={(building as { name?: string | null }).name ?? building.address}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);

  return {
    title: context ? `Hulladékgazdálkodás · ${context.workspaceName} — PanelLakó` : 'Hulladékgazdálkodás — PanelLakó',
    description: 'Szelektív hulladékgyűjtés nyomon követése és szabálytalan lerakás bejelentése',
  };
}
