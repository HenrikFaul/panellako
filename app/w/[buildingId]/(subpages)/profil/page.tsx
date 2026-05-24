// Lakói profil szerkesztő — /w/[buildingId]/profil
// WorkspaceShell (sidebar) a layout.tsx-ből jön.

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfilPageClient from './profil-client';

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROLE_LABELS: Record<string, string> = {
  lako: 'Lakó',
  tulajdonos: 'Tulajdonos',
  kozos_kepviselo: 'Közös képviselő',
  megbizott: 'Megbízott',
  bizottsag: 'Bizottsági tag',
  konyvelo: 'Könyvelő',
};

export default async function ProfilPage({ params }: PageProps) {
  const { buildingId } = params;
  if (!UUID_REGEX.test(buildingId)) notFound();

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${buildingId}/profil`);

  // Membership check
  const { data: memberships } = await supabase
    .from('memberships')
    .select('role, unit_id')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);
  if (!memberships || memberships.length === 0) redirect('/app');

  const membership = memberships[0] as { role: string; unit_id: string | null };

  // Building data
  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', buildingId)
    .single();
  if (!building) redirect('/app');

  // Profile data (name, phone)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .maybeSingle();

  // Linked unit
  const unitId = membership.unit_id;
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
      buildingId={buildingId}
      buildingName={(building as { name?: string | null }).name ?? building.address}
      buildingAddress={building.address}
      role={membership.role}
      roleLabel={ROLE_LABELS[membership.role] ?? membership.role}
      email={user.email ?? profile?.email ?? ''}
      initialName={(profile as { full_name?: string | null } | null)?.full_name ?? ''}
      initialPhone={(profile as { phone?: string | null } | null)?.phone ?? ''}
      unit={unit}
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
  const buildingName = building
    ? ((building as { name?: string | null }).name ?? building.address)
    : null;
  return {
    title: buildingName ? `Lakói profil · ${buildingName} — PanelLakó` : 'Lakói profil — PanelLakó',
    description: 'Személyes adatok, elérhetőségek és értesítési beállítások szerkesztése.',
  };
}
