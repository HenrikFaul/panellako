// Financial Ledger page — manager + resident views
// URL: /w/[buildingId]/financials

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFinancialSummary, getArrearsReport } from '@/app/actions/finance';
import FinancialsClient from './financials-client';
import type { Role } from '@/lib/types';

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FINANCE_ROLES: Role[] = [
  'kozos_kepviselo', 'megbizott', 'konyvelo', 'lako', 'tulajdonos', 'bizottsag',
];

export default async function FinancialsPage({ params }: PageProps) {
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${buildingId}/financials`);

  const { data: memberships } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);

  if (!memberships || memberships.length === 0) redirect('/app');

  const rawRole = (memberships[0] as { role: string }).role;
  const role: Role = FINANCE_ROLES.includes(rawRole as Role) ? (rawRole as Role) : 'lako';

  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', buildingId)
    .single();

  if (!building) redirect('/app');

  const buildingName = (building as { name?: string | null }).name ?? building.address;

  const isManager = ['kozos_kepviselo', 'megbizott', 'konyvelo'].includes(role);

  // Fetch financial data server-side
  const [summaryResult, arrearsResult] = await Promise.all([
    getFinancialSummary(buildingId),
    isManager ? getArrearsReport(buildingId) : Promise.resolve({ success: true, report: undefined }),
  ]);

  // For resident view: fetch their unit's finance history
  let unitId: string | null = null;
  if (!isManager) {
    const { data: unitMembership } = await supabase
      .from('memberships')
      .select('unit_id')
      .eq('profile_id', user.id)
      .eq('building_id', buildingId)
      .eq('active', true)
      .limit(1)
      .single();
    unitId = (unitMembership as { unit_id?: string | null } | null)?.unit_id ?? null;
  }

  return (
    <FinancialsClient
      buildingId={buildingId}
      buildingName={buildingName}
      role={role}
      summary={summaryResult.summary ?? null}
      arrearsUnits={arrearsResult.report?.units ?? null}
      unitId={unitId}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data: building } = await supabase
    .from('buildings')
    .select('name, address')
    .eq('id', params.buildingId)
    .maybeSingle();
  const name = building
    ? ((building as { name?: string | null }).name ?? building.address)
    : '';
  return {
    title: building ? `Pénzügyek · ${name} — PanelLakó` : 'Pénzügyek — PanelLakó',
    description: 'Közös költség, befizetések és hátralékok nyomon követése',
  };
}
