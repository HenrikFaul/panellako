import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import BillingPageClient from './billing-client';
import { redirect } from 'next/navigation';

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

  if (buildingId) {
    const [subResult, buildingResult, unitResult] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('building_id', buildingId).maybeSingle(),
      supabase.from('buildings').select('id, name, address').eq('id', buildingId).single(),
      supabase.from('units').select('id', { count: 'exact', head: true }).eq('building_id', buildingId)
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
      successFromCheckout={searchParams.success === 'true'}
      cancelledFromCheckout={searchParams.cancelled === 'true'}
    />
  );
}
