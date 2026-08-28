// Financial Ledger page — manager + resident views
// URL: /w/[buildingId]/financials

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFinancialSummary, getArrearsReport } from '@/app/actions/finance';
import FinancialsClient from './financials-client';
import { hasWorkspaceCapability, legacyRoleFromWorkspaceContext } from '@/lib/authorization/capabilities';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

interface PageProps {
  params: { buildingId: string };
}

export default async function FinancialsPage({ params }: PageProps) {
  const { buildingId: workspaceId } = params;

  if (!isWorkspaceId(workspaceId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${workspaceId}/financials`);

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');
  const role = legacyRoleFromWorkspaceContext(context.roleKeys, context.relationshipLabels);
  const physicalBuildingId = context.primaryBuildingId;

  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', physicalBuildingId)
    .single();

  if (!building) redirect('/app');

  const buildingName = (building as { name?: string | null }).name ?? building.address;

  const canReadWorkspaceFinance = hasWorkspaceCapability(context, 'finance.workspace.read');

  // Fetch financial data server-side
  const [summaryResult, arrearsResult] = await Promise.all([
    getFinancialSummary(workspaceId),
    canReadWorkspaceFinance
      ? getArrearsReport(workspaceId)
      : Promise.resolve({ success: true, report: undefined }),
  ]);

  const unitId = context.primaryUnitId ?? context.relatedUnitIds[0] ?? null;

  return (
    <FinancialsClient
      buildingId={workspaceId}
      buildingName={buildingName}
      role={role}
      summary={summaryResult.summary ?? null}
      arrearsUnits={arrearsResult.report?.units ?? null}
      unitId={unitId}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);
  return {
    title: context ? `Pénzügyek · ${context.workspaceName} — PanelLakó` : 'Pénzügyek — PanelLakó',
    description: 'Közös költség, befizetések és hátralékok nyomon követése',
  };
}
