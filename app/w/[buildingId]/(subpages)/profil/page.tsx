// Lakói profil szerkesztő — /w/[buildingId]/profil
// WorkspaceShell (sidebar) a layout.tsx-ből jön.

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfilPageClient from './profil-client';
import { legacyRoleFromWorkspaceContext } from '@/lib/authorization/capabilities';
import { isWorkspaceId, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

interface PageProps {
  params: { buildingId: string };
}

const ROLE_LABELS: Record<string, string> = {
  lako: 'Lakó',
  tulajdonos: 'Tulajdonos',
  kozos_kepviselo: 'Közös képviselő',
  megbizott: 'Megbízott',
  bizottsag: 'Bizottsági tag',
  konyvelo: 'Könyvelő',
};

export default async function ProfilPage({ params }: PageProps) {
  const { buildingId: workspaceId } = params;
  if (!isWorkspaceId(workspaceId)) notFound();

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${workspaceId}/profil`);

  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) redirect('/app');
  const role = legacyRoleFromWorkspaceContext(context.roleKeys, context.relationshipLabels);

  // Building data
  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', context.primaryBuildingId)
    .single();
  if (!building) redirect('/app');

  // Profile data (name, phone)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .maybeSingle();

  // Linked unit
  const unitId = context.primaryUnitId ?? context.relatedUnitIds[0] ?? null;
  let unit: { unit_label: string; floor: string | null; area_m2: number | null } | null = null;
  if (unitId) {
    const { data: u } = await supabase
      .from('units')
      .select('unit_label, floor, area_m2')
      .eq('id', unitId)
      .maybeSingle();
    unit = u ?? null;
  }

  return (
    <ProfilPageClient
      buildingId={workspaceId}
      buildingName={(building as { name?: string | null }).name ?? building.address}
      buildingAddress={building.address}
      role={role}
      roleLabel={ROLE_LABELS[role] ?? role}
      email={user.email ?? profile?.email ?? ''}
      initialName={(profile as { full_name?: string | null } | null)?.full_name ?? ''}
      initialPhone={(profile as { phone?: string | null } | null)?.phone ?? ''}
      unit={unit}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const context = await resolveWorkspaceContext(params.buildingId);
  return {
    title: context ? `Lakói profil · ${context.workspaceName} — PanelLakó` : 'Lakói profil — PanelLakó',
    description: 'Személyes adatok, elérhetőségek és értesítési beállítások szerkesztése.',
  };
}
