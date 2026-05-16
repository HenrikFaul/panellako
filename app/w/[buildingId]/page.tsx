// Building-scoped dashboard.
// URL: /w/[buildingId]
// Access control: user must have an active membership in this building.

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';
import type { Role } from '@/lib/types';

interface PageProps {
  params: { buildingId: string };
}

interface MembershipValidation {
  is_member: boolean;
  user_role: string;
  unit_id: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedRoles: Role[] = [
  'lako',
  'tulajdonos',
  'kozos_kepviselo',
  'megbizott',
  'bizottsag',
  'konyvelo'
];

export default async function BuildingDashboardPage({ params }: PageProps) {
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) {
    notFound();
  }

  const supabase = createClient();

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=/w/${buildingId}`);
  }

  const { data: memberships } = await supabase
    .rpc('validate_building_membership', { _building_id: buildingId });

  if (!memberships || (memberships as MembershipValidation[]).length === 0) {
    redirect('/app');
  }

  const membership = (memberships as MembershipValidation[])[0];
  const role = allowedRoles.includes(membership.user_role as Role)
    ? (membership.user_role as Role)
    : 'lako';

  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', buildingId)
    .single();

  if (!building) {
    redirect('/app');
  }

  const data = await getDashboardData(role, buildingId);

  const enrichedData = {
    ...data,
    buildingId,
    buildingName: building.name,
    buildingAddress: building.address
  };

  return <DashboardClient data={enrichedData} />;
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data: building } = await supabase
    .from('buildings')
    .select('name, address')
    .eq('id', params.buildingId)
    .maybeSingle();

  return {
    title: building ? `${building.name} — PanelLakó` : 'Épület — PanelLakó',
    description: building?.address ?? 'Társasházi kezelőfelület'
  };
}
