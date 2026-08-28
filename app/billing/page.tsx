import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import BillingPageClient from './billing-client';
import { redirect } from 'next/navigation';
import { hasWorkspaceCapability } from '@/lib/authorization/capabilities';
import { resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function BillingPage({
  searchParams
}: {
  searchParams: { building?: string; success?: string; cancelled?: string }
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/billing');
  }

  const buildingId = searchParams.building;

  let subscription = null;
  let building = null;
  let unitCount = 0;

  const { data: profile } = await supabase
    .from('profiles')
    .select('free_trial_never_expires')
    .eq('id', user.id)
    .maybeSingle();

  const hasPermanentAccess = Boolean(
    (profile as { free_trial_never_expires?: boolean } | null)?.free_trial_never_expires,
  );

  if (buildingId) {
    const context = await resolveWorkspaceContext(buildingId);
    if (!context || !hasWorkspaceCapability(context, 'billing.manage')) redirect('/app');

    const [subResult, buildingResult, unitResult] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('workspace_id', context.workspaceId).maybeSingle(),
      supabase.from('buildings').select('id, name, address').eq('id', context.primaryBuildingId).single(),
      supabase.from('units').select('id', { count: 'exact', head: true }).eq('building_id', context.primaryBuildingId)
    ]);

    subscription = subResult.data;
    building = buildingResult.data;
    unitCount = unitResult.count ?? 0;
  }

  return (
    <BillingPageClient
      subscription={subscription}
      building={building}
      unitCount={unitCount}
      buildingId={buildingId}
      hasPermanentAccess={hasPermanentAccess}
      successFromCheckout={searchParams.success === 'true'}
      cancelledFromCheckout={searchParams.cancelled === 'true'}
    />
  );
}
