// Manager-only push notification send page
// URL: /w/[buildingId]/ertesitesek

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ErtesitesekClient from './ertesitesek-client';

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MANAGER_ROLES = ['kozos_kepviselo', 'megbizott'];

export default async function ErtesitesekPage({ params }: PageProps) {
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${buildingId}/ertesitesek`);

  const { data: memberships } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);

  if (!memberships || memberships.length === 0) redirect('/app');

  const role = (memberships[0] as { role: string }).role;
  if (!MANAGER_ROLES.includes(role)) {
    redirect(`/w/${buildingId}`);
  }

  const { data: building } = await supabase
    .from('buildings')
    .select('name, address')
    .eq('id', buildingId)
    .single();

  if (!building) redirect('/app');

  return (
    <ErtesitesekClient
      buildingId={buildingId}
      buildingName={(building as { name?: string | null }).name ?? building.address}
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
  const name = building ? ((building as { name?: string | null }).name ?? building.address) : '';
  return {
    title: building ? `Értesítések · ${name} — PanelLakó` : 'Értesítések — PanelLakó',
    description: 'Push értesítések küldése a társasház lakóinak és kezelőinek',
  };
}
