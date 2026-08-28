import { notFound, redirect } from 'next/navigation';
import WorkspaceAdminClient from '@/components/workspace-admin-client';
import { getWorkspaceAdminSnapshot } from '@/app/actions/workspace-admin';
import { hasWorkspaceCapability } from '@/lib/authorization/capabilities';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: { buildingId: string };
}

export default async function WorkspaceAdminPage({ params }: PageProps) {
  const { buildingId: workspaceId } = params;
  if (!isWorkspaceId(workspaceId)) notFound();

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${workspaceId}/admin`);

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');

  const adminCapabilities = [
    'unit.manage',
    'membership.invite',
    'membership.approve',
    'role.grant_limited',
  ] as const;
  const canOpenAdmin = adminCapabilities.some((capability) => hasWorkspaceCapability(context, capability));
  if (!canOpenAdmin) redirect(`/w/${workspaceId}`);

  const snapshotResult = await getWorkspaceAdminSnapshot(workspaceId);
  if (!snapshotResult.success || !snapshotResult.data) {
    return (
      <main className="app-surface min-h-[70vh] px-4 py-8 sm:px-6">
        <section className="mx-auto max-w-3xl rounded-[1.5rem] border border-rose-200 bg-white p-6 shadow-card-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Kezelői központ</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-canvas-ink">Az adatok nem tölthetők be</h1>
          <p className="mt-3 text-sm leading-relaxed text-canvas-muted">
            {snapshotResult.error ?? 'A kezelői adatok átmenetileg nem érhetők el.'}
          </p>
        </section>
      </main>
    );
  }

  return <WorkspaceAdminClient initialSnapshot={snapshotResult.data} />;
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);
  return {
    title: context ? `Lakóközösség kezelése · ${context.workspaceName} — PanelLakó` : 'Lakóközösség kezelése — PanelLakó',
    description: 'Albetétek, lakói meghívások, csatlakozási kérelmek és delegált szerepkörök biztonságos kezelése.',
  };
}
