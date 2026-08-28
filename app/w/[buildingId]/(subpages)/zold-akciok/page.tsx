// Közösségi Zöld Akciók page
// URL: /w/[buildingId]/zold-akciok

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GreenActionsClient from '@/components/green-actions-client';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

interface PageProps {
  params: { buildingId: string };
}

export default async function ZoldAkciokPage({ params }: PageProps) {
  const { buildingId: workspaceId } = params;

  if (!isWorkspaceId(workspaceId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${workspaceId}/zold-akciok`);

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');

  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', context.primaryBuildingId)
    .single();

  if (!building) redirect('/app');

  return (
    <GreenActionsClient
      buildingId={workspaceId}
      buildingName={(building as { name?: string | null }).name ?? building.address}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);

  return {
    title: context ? `Zöld Akciók · ${context.workspaceName} — PanelLakó` : 'Zöld Akciók — PanelLakó',
    description: 'Közösségi zöld akciók, CO₂ megtakarítás kalkulátor és épületi környezeti kezdeményezések',
  };
}
