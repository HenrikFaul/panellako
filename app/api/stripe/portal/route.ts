import { NextRequest, NextResponse } from 'next/server';
import {
  authorizationMessage,
  requireAuthenticatedUser,
  requireWorkspaceCapability,
} from '@/lib/authorization/guards';
import { getStripeClient } from '@/lib/stripe/server';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { buildingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés formátum' }, { status: 400 });
  }
  const { buildingId } = body;

  if (!buildingId) {
    return NextResponse.json({ error: 'Lakóközösség azonosító hiányzik' }, { status: 400 });
  }

  let auth: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  let context: Awaited<ReturnType<typeof requireWorkspaceCapability>>;
  try {
    [auth, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(buildingId, 'billing.manage'),
    ]);
  } catch (error) {
    return NextResponse.json({ error: authorizationMessage(error) }, { status: 403 });
  }
  const { supabase } = auth;

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: 'A fizetési szolgáltatás átmenetileg nem érhető el.' },
      { status: 503 },
    );
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('workspace_id', context.workspaceId)
    .maybeSingle();

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
