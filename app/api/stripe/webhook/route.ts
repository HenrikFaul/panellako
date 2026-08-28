import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true
});

const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// In Stripe API 2026-04-22 (v22), period dates moved to subscription.items.data[0]
function getPeriodDates(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const start = item?.current_period_start;
  const end   = item?.current_period_end;
  return {
    current_period_start: start ? new Date(start * 1000).toISOString() : null,
    current_period_end:   end   ? new Date(end   * 1000).toISOString() : null,
  };
}

// In Stripe API 2026-04-22, invoice.subscription moved to invoice.parent.subscription_details.subscription
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === 'string' ? sub : sub.id;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[webhook] Signature verification failed:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const supabase = getAdminClient();

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId    = session.metadata?.workspace_id;
        const buildingId     = session.metadata?.building_id;
        const plan           = session.metadata?.plan as 'alap' | 'pro';
        const unitCount      = parseInt(session.metadata?.unit_count ?? '0', 10);
        const subscriptionId = session.subscription as string;

        if (!workspaceId || !buildingId || !subscriptionId) {
          console.error('[webhook] checkout.session.completed: missing metadata', session.metadata);
          break;
        }

        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        const periods   = getPeriodDates(stripeSub);

        await supabase.from('subscriptions').upsert(
          {
            workspace_id:            workspaceId,
            building_id:             buildingId,
            stripe_customer_id:      session.customer as string,
            stripe_subscription_id:  subscriptionId,
            plan:                    plan ?? 'alap',
            unit_count:              unitCount,
            status:                  stripeSub.status,
            current_period_start:    periods.current_period_start,
            current_period_end:      periods.current_period_end,
            trial_end:               stripeSub.trial_end
              ? new Date(stripeSub.trial_end * 1000).toISOString()
              : null,
            stripe_price_id:         stripeSub.items.data[0]?.price.id ?? null,
            cancel_at_period_end:    stripeSub.cancel_at_period_end
          },
          { onConflict: 'building_id' }
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId      = subscription.items.data[0]?.price.id;
        const periods      = getPeriodDates(subscription);
        const plan         = priceId === process.env.STRIPE_PRICE_ID_PRO_MONTHLY ? 'pro' : 'alap';

        await supabase
          .from('subscriptions')
          .update({
            status:               subscription.status,
            plan,
            current_period_start: periods.current_period_start,
            current_period_end:   periods.current_period_end,
            trial_end:            subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            stripe_price_id:      priceId ?? null
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', plan: 'cancelled', cancel_at_period_end: false })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice        = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (!subscriptionId) break;

        await supabase.from('subscriptions').update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);

        const { data: sub } = await supabase.from('subscriptions')
          .select('workspace_id, building_id').eq('stripe_subscription_id', subscriptionId).single();

        if (sub) {
          await supabase.from('invoice_events').upsert({
            workspace_id:           sub.workspace_id,
            building_id:            sub.building_id,
            stripe_invoice_id:      invoice.id,
            stripe_subscription_id: subscriptionId,
            event_type:             'payment_failed',
            amount_due:             invoice.amount_due,
            currency:               invoice.currency,
            period_start:           invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
            period_end:             invoice.period_end   ? new Date(invoice.period_end   * 1000).toISOString() : null,
            invoice_url:            invoice.hosted_invoice_url ?? null
          }, { onConflict: 'stripe_invoice_id,event_type' });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice        = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (!subscriptionId) break;

        await supabase.from('subscriptions').update({ status: 'active' })
          .eq('stripe_subscription_id', subscriptionId)
          .eq('status', 'past_due');

        const { data: sub } = await supabase.from('subscriptions')
          .select('workspace_id, building_id').eq('stripe_subscription_id', subscriptionId).single();

        if (sub) {
          await supabase.from('invoice_events').upsert({
            workspace_id:           sub.workspace_id,
            building_id:            sub.building_id,
            stripe_invoice_id:      invoice.id,
            stripe_subscription_id: subscriptionId,
            event_type:             'paid',
            amount_due:             invoice.amount_due,
            currency:               invoice.currency,
            period_start:           invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
            period_end:             invoice.period_end   ? new Date(invoice.period_end   * 1000).toISOString() : null,
            invoice_url:            invoice.hosted_invoice_url ?? null
          }, { onConflict: 'stripe_invoice_id,event_type' });
        }
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('[webhook] Handler threw unexpectedly:', err);
    return NextResponse.json({ error: 'Internal handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
