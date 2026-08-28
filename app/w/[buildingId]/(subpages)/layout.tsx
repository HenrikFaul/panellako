import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/workspace-shell';
import { legacyRoleFromWorkspaceContext } from '@/lib/authorization/capabilities';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

interface SubpageLayoutProps {
  children: React.ReactNode;
  params: { buildingId: string };
}

export default async function SubpageLayout({ children, params }: SubpageLayoutProps) {
  const { buildingId: workspaceId } = params;

  if (!isWorkspaceId(workspaceId)) redirect('/app');

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect(`/login?next=/w/${workspaceId}`);
  const role = legacyRoleFromWorkspaceContext(context.roleKeys, context.relationshipLabels);

  return (
    <WorkspaceShell
      buildingId={workspaceId}
      buildingName={context.workspaceName}
      buildingAddress={context.address}
      role={role}
      capabilities={context.capabilities}
    >
      {children}
    </WorkspaceShell>
  );
}
