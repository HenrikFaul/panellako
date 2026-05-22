// Hulladékgazdálkodás page
// URL: /w/[buildingId]/hulladek

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WasteDashboardClient from '@/components/waste-dashboard-client';

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function HulladekPage({ params }: PageProps) {
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${buildingId}/hulladek`);

  const { data: memberships } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);

  if (!memberships || memberships.length === 0) redirect('/app');

  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', buildingId)
    .single();

  if (!building) redirect('/app');

  return (
    <WasteDashboardClient
      buildingId={buildingId}
      buildingName={(building as { name?: string | null }).name ?? building.address}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data: building } = await supabase
    .from('buildings')
    .select('name')
    .eq('id', params.buildingId)
    .maybeSingle();

  return {
    title: building ? `Hulladékgazdálkodás · ${(building as { name?: string | null }).name ?? ''} — PanelLakó` : 'Hulladékgazdálkodás — PanelLakó',
    description: 'Szelektív hulladékgyűjtés nyomon követése és szabálytalan lerakás bejelentése',
  };
}
