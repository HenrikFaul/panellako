// Zajriporter page
// URL: /w/[buildingId]/zaj

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NoiseDashboardClient from '@/components/noise-dashboard-client';

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ZajPage({ params }: PageProps) {
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${buildingId}/zaj`);

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
    <NoiseDashboardClient
      buildingId={buildingId}
      buildingName={building.name}
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
    title: building ? `Zajriporter · ${building.name} — PanelLakó` : 'Zajriporter — PanelLakó',
    description: 'Rögzítse és kövesse az épülete körüli zajszennyezést',
  };
}
