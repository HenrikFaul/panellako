// Budapest 2030 Strategic Indicators Dashboard
// URL: /w/[buildingId]/budapest-2030
// Feature 11 — EU Green Capital indicators + Budapest 2030 strategy tracker

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Budapest2030DashboardClient from '@/components/budapest-2030-dashboard-client';

export const metadata = {
  title: 'Budapest 2030 — PanelLakó',
  description:
    'Mind a 11 EU Zöld Főváros indikátor, Budapest 2030 stratégiai célok, személyes hatás kalkulátor és EU városok összehasonlítása.',
};

interface PageProps {
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Budapest2030Page({ params }: PageProps) {
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) notFound();

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/w/${buildingId}/budapest-2030`);

  // Verify building membership
  const { data: memberships } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);

  if (!memberships || memberships.length === 0) redirect('/app');

  return (
    <main className="min-h-screen">
      <Budapest2030DashboardClient buildingId={buildingId} />
    </main>
  );
}
