import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nem vagy bejelentkezve' }, { status: 401 });
  }

  const { buildingId } = await request.json();

  if (!buildingId) {
    return NextResponse.json({ error: 'Épület azonosító hiányzik' }, { status: 400 });
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('building_id', buildingId)
    .single();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: 'Nincs aktív előfizetés ehhez az épülethez' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${appUrl}/billing?building=${buildingId}`
  });

  return NextResponse.json({ url: portalSession.url });
}
