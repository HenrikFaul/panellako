import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true
});

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Nem vagy bejelentkezve' }, { status: 401 });
  }

  let body: { plan: string; buildingId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés formátum' }, { status: 400 });
  }

  const { plan, buildingId } = body;

  if (!['alap', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'Érvénytelen csomag' }, { status: 400 });
  }

  if (!buildingId) {
    return NextResponse.json({ error: 'Épület azonosító hiányzik' }, { status: 400 });
  }

  // Verify user is a manager of this building
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id, role')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .in('role', ['kozos_kepviselo', 'megbizott'])
    .single();

  if (membershipError || !membership) {
    return NextResponse.json(
      { error: 'Nincs jogosultságod előfizetést kezelni ehhez az épülethez' },
      { status: 403 }
    );
  }

  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', buildingId)
    .single();

  if (buildingError || !building) {
    return NextResponse.json({ error: 'Épület nem található' }, { status: 404 });
  }

  const { count: unitCount, error: unitCountError } = await supabase
    .from('units')
    .select('id', { count: 'exact', head: true })
    .eq('building_id', buildingId);

  if (unitCountError) {
    return NextResponse.json({ error: 'Nem sikerült lekérdezni az albetétek számát' }, { status: 500 });
  }

  const units = unitCount ?? 0;
  if (units < 1) {
    return NextResponse.json(
      { error: 'Az épületben nincsenek rögzített albetétek. Kérjük, először adja meg az albetéteket.' },
      { status: 400 }
    );
  }

  const priceId = plan === 'alap'
    ? process.env.STRIPE_PRICE_ID_ALAP_MONTHLY!
    : process.env.STRIPE_PRICE_ID_PRO_MONTHLY!;

  if (!priceId) {
    return NextResponse.json({ error: 'Stripe price ID nincs konfigurálva' }, { status: 500 });
  }

  // Create or retrieve Stripe customer
  const { data: existingSubscription } = await getAdminClient()
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status')
    .eq('building_id', buildingId)
    .maybeSingle();

  let stripeCustomerId: string;

  if (existingSubscription?.stripe_customer_id) {
    stripeCustomerId = existingSubscription.stripe_customer_id;

    // Already active → redirect to customer portal
    if (existingSubscription.status === 'active' && existingSubscription.stripe_subscription_id) {
      try {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing?building=${buildingId}`
        });
        return NextResponse.json({ url: portalSession.url });
      } catch (err) {
        console.error('[checkout] Portal session error:', err);
      }
    }
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      name: building.name,
      metadata: {
        building_id: buildingId,
        building_address: building.address,
        supabase_user_id: user.id
      }
    });
    stripeCustomerId = customer.id;

    await getAdminClient().from('subscriptions').upsert({
      building_id: buildingId,
      stripe_customer_id: stripeCustomerId,
      plan: 'trial',
      status: 'trialing',
      unit_count: units,
      trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }, { onConflict: 'building_id' });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: units }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { building_id: buildingId, plan, unit_count: String(units) }
      },
      metadata: { building_id: buildingId, plan, unit_count: String(units), supabase_user_id: user.id },
      success_url: `${appUrl}/billing?session_id={CHECKOUT_SESSION_ID}&building=${buildingId}&success=true`,
      cancel_url: `${appUrl}/billing?building=${buildingId}&cancelled=true`,
      locale: 'hu',
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true }
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe session creation error:', err);
    const message = err instanceof Stripe.errors.StripeError ? err.message : 'Ismeretlen Stripe hiba';
    return NextResponse.json({ error: `Checkout hiba: ${message}` }, { status: 500 });
  }
}
