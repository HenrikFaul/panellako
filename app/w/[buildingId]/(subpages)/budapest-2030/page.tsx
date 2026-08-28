// Budapest 2030 Strategic Indicators Dashboard
// URL: /w/[buildingId]/budapest-2030
// Feature 11 — EU Green Capital indicators + Budapest 2030 strategy tracker

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Budapest2030DashboardClient from '@/components/budapest-2030-dashboard-client';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

interface PageProps {
  params: { buildingId: string };
}

export default async function Budapest2030Page({ params }: PageProps) {
  const { buildingId: workspaceId } = params;

  if (!isWorkspaceId(workspaceId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${workspaceId}/budapest-2030`);

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');

  return (
    <main className="min-h-screen">
      <Budapest2030DashboardClient buildingId={workspaceId} />
    </main>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);
  return {
    title: context ? `Budapest 2030 · ${context.workspaceName} — PanelLakó` : 'Budapest 2030 — PanelLakó',
    description:
      'Mind a 11 EU Zöld Főváros indikátor, Budapest 2030 stratégiai célok, személyes hatás kalkulátor és EU városok összehasonlítása.',
  };
}
