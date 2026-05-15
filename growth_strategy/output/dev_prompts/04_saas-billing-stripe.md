# Dev Prompt #4: SaaS Billing Integration — Stripe
## Initiative: "SaaS Billing Integration — Stripe/Barion Payment Gateway"
## Estimated Value: +€250k–€550k ARR unlock
## Priority: P0 — Revenue Generation Gate (no revenue without billing)

---

## 1. BUSINESS CASE

### 1.1 Why Billing Is the Most Important Milestone for PanelLakó

PanelLakó has no revenue today. Every user accessing the application is on an implicit perpetual free trial. There is no code path anywhere in the application that collects payment, enforces plan limits, or blocks access when a trial expires. Until billing is live, PanelLakó is not a SaaS company — it is a software project with zero monetization. The €250k–€550k ARR estimate in the growth model is entirely conditional on completing this feature. No other engineering initiative, no matter how technically impressive, generates revenue without this payment gate.

The billing milestone is also the primary forcing function for acquiring a real customer. Without a checkout flow, a közös képviselő or megbízott agency evaluating PanelLakó cannot say "yes" even if they want to. The sales conversation always ends at the same stall: "When can we actually pay for this?" The answer today is "not yet." Every week that passes without billing live is a week where a competitor closes the deal instead. The Hungarian PropTech market has low digital penetration — early movers establish durable relationships with management companies that tend to be sticky for 5+ years.

### 1.2 Pricing Model Analysis

The current pricing model has two tiers:
- **PanelLakó Alap**: €1.50/unit/month — targeted at self-managed buildings with an unpaid közös képviselő
- **PanelLakó Pro**: €3.00/unit/month — targeted at professional megbízott agencies managing multiple buildings

Both tiers are priced per residential unit (albetét), not per seat or per building. This is the correct pricing axis for the Hungarian market because:

1. Building committees think in units (the SZMSZ and the Társasházi törvény both define voting rights, cost allocations, and financial obligations per unit). The "cost per unit" framing maps directly to how they already think about building expenses.

2. Per-unit pricing scales naturally with building size. A 20-unit building pays €30/month (Alap) or €60/month (Pro). A 120-unit building pays €180/month (Alap) or €360/month (Pro). This is proportional to the value delivered.

3. The primary cost driver for a managing agency is staff time per unit. At €3.00/unit/month for Pro, even a 10% reduction in administrative time per unit creates immediate ROI justification.

Unit count for billing purposes must be pulled from the `units` table in the database, scoped to the subscribing building. The checkout flow MUST query the live unit count at session creation time to prevent gaming (a building cannot claim 20 units to get a lower price if they have 80 in the system).

### 1.3 Hungarian Market Considerations: Barion vs Stripe

The primary payment gateway recommendation is **Stripe** for the initial implementation because:

1. Stripe's API, documentation, and developer experience are industry-leading. The first implementation will be done by developers, possibly under time pressure. Stripe's SDKs and webhooks are extremely well-tested and the error messages are actionable.

2. Stripe operates legally in Hungary (EEA member state) and supports HUF as a payment currency in addition to EUR. Both B2B and B2C card payments work without additional registration requirements for the merchant.

3. Stripe's customer portal, subscription management, and invoice generation are production-ready out of the box. Building these from scratch for Barion would add 3-4 weeks of development time.

**Barion** is the Hungarian-founded payment processor used by approximately 40% of Hungarian e-commerce sites. It supports Hungarian payment cards that may have foreign-card limitations, and it offers Hungarian language checkout which improves conversion for Hungarian-speaking building committees. A Barion integration should be planned for Q3 as a secondary payment option (not replacement) once the Stripe integration is validated. This is documented in Phase 14 (Barion Roadmap).

### 1.4 Revenue Projections

Based on the addressable market in the growth model:
- 46,000 organized residential buildings in Hungary
- Average building size: 42 units
- 3% capture at Alap tier in year 1: 1,380 buildings × 42 units × €1.50/month = **€86,940/month = €1.04M/year**
- 1% capture at Pro tier in year 1: 460 buildings × 42 units × €3.00/month = **€57,960/month = €695k/year**

Total year-1 projection at 4% total penetration: **~€1.73M ARR**. This is reachable only if billing is live and the sales funnel is operational. Without billing live by Q3 2026, the year-1 target is mathematically impossible.

---

## 2. CURRENT STATE

There is no billing infrastructure anywhere in the PanelLakó codebase:

- No `subscriptions` table in `supabase/schema.sql`
- No `/billing` page or route
- No Stripe SDK installation (`package.json` has no `stripe` or `@stripe/stripe-js`)
- No webhook endpoint
- No customer portal integration
- No paywall logic in `middleware.ts` (it currently only refreshes the Supabase session)
- No environment variables for Stripe in `.env.local` or `.env.example`
- No plan enforcement anywhere in the application

The `buildings` table exists with `id`, `name`, `address` columns. The `units` table has `building_id`, `unit_label` and related columns. These are the foundation for deriving unit counts per building for billing.

---

## 3. PRE-CONDITIONS

Before writing any code, complete these setup steps:

### 3.1 Stripe Account Setup

1. Create a Stripe account at https://dashboard.stripe.com/register
2. Complete business verification (for Hungarian companies: company registration number, tax number, bank account in EUR or HUF)
3. Ensure you have access to both **Test mode** and **Live mode** API keys
4. Install the Stripe CLI locally: `brew install stripe/stripe-cli/stripe` or download from https://stripe.com/docs/stripe-cli

### 3.2 Install Stripe Node.js SDK

```bash
npm install stripe @stripe/stripe-js
npm install --save-dev @types/stripe
```

### 3.3 Environment Variables

Add to `.env.local` (never commit this file):

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...           # From Stripe Dashboard → Developers → API Keys
STRIPE_PUBLISHABLE_KEY=pk_test_...      # Publishable key (safe for client)
STRIPE_WEBHOOK_SECRET=whsec_...        # From Stripe CLI: stripe listen --print-secret
STRIPE_PRICE_ID_ALAP_MONTHLY=price_... # Created in Phase 2
STRIPE_PRICE_ID_PRO_MONTHLY=price_...  # Created in Phase 2

# Already existing
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Public vars (exposed to client)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env.local` AND to the Next.js config if you need server-side rendering with Stripe Elements. For our checkout flow (redirect to Stripe Hosted Checkout), only the server-side `STRIPE_SECRET_KEY` is needed; the publishable key is used only if you implement Stripe.js Elements in the future.

### 3.4 Webhook Endpoint Setup

For local development, run in a separate terminal:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
This outputs a `whsec_` webhook signing secret — copy it to `STRIPE_WEBHOOK_SECRET` in `.env.local`.

For production, register the webhook URL in Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://yourdomain.com/api/stripe/webhook`
- Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`

---

## 4. PHASE 1: DATABASE SCHEMA

Create a migration file at `supabase/migrations/20260515002_billing.sql`:

```sql
-- ============================================================
-- PanelLakó Billing Schema
-- Migration: 20260515002_billing.sql
-- ============================================================

-- subscriptions table: one row per building, tracks Stripe subscription state
create table if not exists subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  building_id           uuid not null references buildings(id) on delete cascade,
  stripe_customer_id    text not null,
  stripe_subscription_id text,               -- null during checkout, set on webhook
  plan                  text not null default 'trial'
                          check (plan in ('trial', 'alap', 'pro', 'cancelled', 'past_due')),
  unit_count            integer not null default 0,
  status                text not null default 'trialing'
                          check (status in ('trialing', 'active', 'past_due', 'cancelled', 'incomplete', 'incomplete_expired', 'unpaid')),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  trial_end             timestamptz,
  cancel_at_period_end  boolean not null default false,
  stripe_price_id       text,                -- the Stripe price ID currently subscribed to
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (building_id)  -- one active subscription per building
);

-- Index for Stripe ID lookups (used in webhook handler)
create index if not exists idx_subscriptions_stripe_customer_id
  on subscriptions (stripe_customer_id);

create index if not exists idx_subscriptions_stripe_subscription_id
  on subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Trigger to auto-update updated_at on any row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_subscriptions_updated_at on subscriptions;
create trigger set_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- RLS
alter table subscriptions enable row level security;

-- Building managers can read their own building's subscription
drop policy if exists "Manager read own subscription" on subscriptions;
create policy "Manager read own subscription" on subscriptions
  for select
  using (
    exists (
      select 1 from memberships
      where memberships.building_id = subscriptions.building_id
        and memberships.profile_id = auth.uid()
        and memberships.active = true
        and memberships.role in ('kozos_kepviselo', 'megbizott', 'konyvelo')
    )
  );

-- Only service role (server-side) can insert/update subscriptions
-- Application code uses SUPABASE_SERVICE_ROLE_KEY for webhook updates
-- Deny all direct client inserts/updates
drop policy if exists "No direct client insert subscriptions" on subscriptions;
create policy "No direct client insert subscriptions" on subscriptions
  for insert
  with check (false);  -- all inserts go through service role only

drop policy if exists "No direct client update subscriptions" on subscriptions;
create policy "No direct client update subscriptions" on subscriptions
  for update
  using (false);

-- invoice_events table: append-only log of billing events for audit and display
create table if not exists invoice_events (
  id                    uuid primary key default gen_random_uuid(),
  building_id           uuid not null references buildings(id) on delete cascade,
  stripe_invoice_id     text not null,
  stripe_subscription_id text,
  event_type            text not null,  -- 'paid', 'payment_failed', 'upcoming', 'voided'
  amount_due            integer,        -- in smallest currency unit (eurocents or HUF fillér)
  currency              text not null default 'eur',
  period_start          timestamptz,
  period_end            timestamptz,
  invoice_url           text,           -- Stripe-hosted invoice PDF URL
  created_at            timestamptz not null default now()
);

alter table invoice_events enable row level security;

drop policy if exists "Manager read own invoice events" on invoice_events;
create policy "Manager read own invoice events" on invoice_events
  for select
  using (
    exists (
      select 1 from memberships
      where memberships.building_id = invoice_events.building_id
        and memberships.profile_id = auth.uid()
        and memberships.active = true
        and memberships.role in ('kozos_kepviselo', 'megbizott', 'konyvelo')
    )
  );
```

---

## 5. PHASE 2: STRIPE PRODUCT/PRICE SETUP

### 5.1 Create Products in Stripe Dashboard (Test Mode)

Navigate to Stripe Dashboard → Products → Add product.

**Product 1: PanelLakó Alap**
- Name: `PanelLakó Alap`
- Description: `Alapszintű társasházkezelő csomag — digitális hibabejelentés, dokumentumtár, mérőóra-diktálás`
- Image: upload the PanelLakó logo
- Statement descriptor: `PANELLAKO ALAP`
- Add price:
  - Pricing model: Recurring
  - Billing period: Monthly
  - Price: €1.50 per unit (use "Usage-based pricing: tiered" OR simply "Per unit: 1" as a multiplier)
  - **Important**: For per-unit-per-month billing, use Stripe's "Graduated pricing" or set the price as a flat €1.50 and multiply by unit count at checkout session creation. The simpler approach for MVP is to compute `unitCount * 150` (in cents) as a one-time flat recurring price per building and create the subscription with `quantity: 1`. This avoids the complexity of Stripe's metered billing for the first version.
  - Currency: EUR
  - Copy the Price ID: `price_XXXXXXXXXXXXXXXX` → paste into `STRIPE_PRICE_ID_ALAP_MONTHLY`

**Product 2: PanelLakó Pro**
- Name: `PanelLakó Pro`
- Description: `Professzionális társasházkezelő csomag — korlátlan dokumentumfeltöltés, könyvelő hozzáférés, kimutatások, API hozzáférés`
- Add price:
  - Recurring, Monthly, €3.00 per unit
  - Currency: EUR
  - Copy the Price ID → paste into `STRIPE_PRICE_ID_PRO_MONTHLY`

### 5.2 Configure Trial Period in Stripe

In Stripe Dashboard → Products → PanelLakó Alap → Edit price:
- Under "Price options" → "Free trial": set 14 days
- Repeat for PanelLakó Pro

Alternatively, control trial at checkout session creation time via `subscription_data.trial_period_days: 14` in the API call (Phase 3). The API approach is preferred because it allows different trial lengths for different customer segments without modifying the Stripe product.

### 5.3 Configure Stripe Customer Portal

In Stripe Dashboard → Settings → Billing → Customer portal:
- Enable: Update subscriptions (plan changes)
- Enable: Cancel subscriptions
- Enable: View invoice history
- Business information: add PanelLakó name, privacy policy URL, terms URL
- Redirects: after cancel → `https://yourdomain.com/billing?cancelled=true`
- Copy the Customer portal link — this is used in Phase 10 (Customer Portal).

---

## 6. PHASE 3: CHECKOUT SESSION API ROUTE

Create file: `app/api/stripe/checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true
});

export interface CheckoutRequestBody {
  plan: 'alap' | 'pro';
  buildingId: string;
}

export async function POST(request: NextRequest) {
  // 1. Authenticate the user
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Nem vagy bejelentkezve' }, { status: 401 });
  }

  // 2. Parse and validate request body
  let body: CheckoutRequestBody;
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

  // 3. Verify user is a manager of this building
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

  // 4. Get building details
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', buildingId)
    .single();

  if (buildingError || !building) {
    return NextResponse.json({ error: 'Épület nem található' }, { status: 404 });
  }

  // 5. Count units for this building (determines pricing)
  const { count: unitCount, error: unitCountError } = await supabase
    .from('units')
    .select('id', { count: 'exact', head: true })
    .eq('building_id', buildingId);

  if (unitCountError) {
    console.error('[checkout] Unit count error:', unitCountError);
    return NextResponse.json({ error: 'Nem sikerült lekérdezni az albetétek számát' }, { status: 500 });
  }

  const units = unitCount ?? 0;
  if (units < 1) {
    return NextResponse.json(
      { error: 'Az épületben nincsenek rögzített albetétek. Kérjük, először adja meg az albetéteket.' },
      { status: 400 }
    );
  }

  // 6. Determine price ID and compute monthly amount
  const priceId = plan === 'alap'
    ? process.env.STRIPE_PRICE_ID_ALAP_MONTHLY!
    : process.env.STRIPE_PRICE_ID_PRO_MONTHLY!;

  const pricePerUnit = plan === 'alap' ? 150 : 300; // eurocents
  const monthlyAmountCents = units * pricePerUnit;

  // 7. Create or retrieve Stripe customer
  // Check if a subscription record already exists with a stripe_customer_id
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status')
    .eq('building_id', buildingId)
    .maybeSingle();

  let stripeCustomerId: string;

  if (existingSubscription?.stripe_customer_id) {
    stripeCustomerId = existingSubscription.stripe_customer_id;

    // If subscription is already active, redirect to customer portal instead
    if (existingSubscription.status === 'active' && existingSubscription.stripe_subscription_id) {
      try {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?building=${buildingId}`
        });
        return NextResponse.json({ url: portalSession.url });
      } catch (portalError) {
        console.error('[checkout] Portal session error:', portalError);
        // Fall through to create a new checkout session
      }
    }
  } else {
    // Create a new Stripe customer linked to this building and user
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

    // Upsert subscription record with customer ID (using service role to bypass RLS)
    // Note: In the webhook handler we use service role; here we can use it directly
    // if SUPABASE_SERVICE_ROLE_KEY is available. For simplicity, insert via standard client
    // since the subscription row doesn't exist yet and RLS allows nothing — so we must
    // use a server-side admin client:
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await adminClient.from('subscriptions').upsert({
      building_id: buildingId,
      stripe_customer_id: stripeCustomerId,
      plan: 'trial',
      status: 'trialing',
      unit_count: units,
      trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }, { onConflict: 'building_id' });
  }

  // 8. Create Stripe Checkout Session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: units  // unit count drives the price multiplier
        }
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          building_id: buildingId,
          plan,
          unit_count: String(units)
        }
      },
      metadata: {
        building_id: buildingId,
        plan,
        unit_count: String(units),
        supabase_user_id: user.id
      },
      success_url: `${appUrl}/billing?session_id={CHECKOUT_SESSION_ID}&building=${buildingId}&success=true`,
      cancel_url: `${appUrl}/billing?building=${buildingId}&cancelled=true`,
      locale: 'hu',  // Hungarian language checkout page
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto'
      },
      automatic_tax: {
        enabled: true  // Stripe Tax handles HU VAT (27%) automatically
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (stripeError) {
    console.error('[checkout] Stripe session creation error:', stripeError);
    const message = stripeError instanceof Stripe.errors.StripeError
      ? stripeError.message
      : 'Ismeretlen Stripe hiba';
    return NextResponse.json({ error: `Checkout hiba: ${message}` }, { status: 500 });
  }
}
```

---

## 7. PHASE 4: WEBHOOK HANDLER

Create file: `app/api/stripe/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true
});

// Use service role client to bypass RLS in webhook handler
// Webhooks run server-side with no user session context
const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// IMPORTANT: Next.js 14 App Router routes must export a named function
// The webhook needs the raw body buffer — disable Next.js's automatic body parsing
export const dynamic = 'force-dynamic';

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

  console.log(`[webhook] Processing event: ${event.type} (${event.id})`);

  // Idempotency check: if we've already processed this event, return 200 immediately
  // In production, store processed event IDs in a separate table.
  // For MVP, rely on Stripe's retry logic and database UNIQUE constraints.

  try {
    switch (event.type) {

      // ─── checkout.session.completed ──────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const buildingId = session.metadata?.building_id;
        const plan = session.metadata?.plan as 'alap' | 'pro';
        const unitCount = parseInt(session.metadata?.unit_count ?? '0', 10);
        const subscriptionId = session.subscription as string;

        if (!buildingId || !subscriptionId) {
          console.error('[webhook] checkout.session.completed: missing metadata', session.metadata);
          break;
        }

        // Retrieve full subscription object from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

        const { error: upsertError } = await supabase.from('subscriptions').upsert(
          {
            building_id: buildingId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            plan: plan ?? 'alap',
            unit_count: unitCount,
            status: stripeSubscription.status as string,
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            trial_end: stripeSubscription.trial_end
              ? new Date(stripeSubscription.trial_end * 1000).toISOString()
              : null,
            stripe_price_id: stripeSubscription.items.data[0]?.price.id ?? null,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end
          },
          { onConflict: 'building_id' }
        );

        if (upsertError) {
          console.error('[webhook] checkout.session.completed upsert error:', upsertError);
          return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }

        console.log(`[webhook] Subscription activated for building ${buildingId}`);
        break;
      }

      // ─── customer.subscription.updated ───────────────────────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const buildingId = subscription.metadata?.building_id;

        if (!buildingId) {
          // Try to look up building_id from our subscriptions table
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('building_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();
          if (!existing) {
            console.warn('[webhook] subscription.updated: no matching building for', subscription.id);
            break;
          }
        }

        // Determine plan from price ID
        const priceId = subscription.items.data[0]?.price.id;
        let plan: string = 'alap';
        if (priceId === process.env.STRIPE_PRICE_ID_PRO_MONTHLY) plan = 'pro';
        else if (priceId === process.env.STRIPE_PRICE_ID_ALAP_MONTHLY) plan = 'alap';

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            plan,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            stripe_price_id: priceId ?? null
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('[webhook] subscription.updated error:', updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        console.log(`[webhook] Subscription updated: ${subscription.id} → status=${subscription.status}`);
        break;
      }

      // ─── customer.subscription.deleted ───────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error: deleteUpdateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            plan: 'cancelled',
            cancel_at_period_end: false
          })
          .eq('stripe_subscription_id', subscription.id);

        if (deleteUpdateError) {
          console.error('[webhook] subscription.deleted error:', deleteUpdateError);
          return NextResponse.json({ error: deleteUpdateError.message }, { status: 500 });
        }

        console.log(`[webhook] Subscription cancelled: ${subscription.id}`);
        break;
      }

      // ─── invoice.payment_failed ───────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        // Update subscription status to past_due
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);

        // Look up building_id for the invoice_events insert
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('building_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (sub) {
          await supabase.from('invoice_events').insert({
            building_id: sub.building_id,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            event_type: 'payment_failed',
            amount_due: invoice.amount_due,
            currency: invoice.currency,
            period_start: invoice.period_start
              ? new Date(invoice.period_start * 1000).toISOString() : null,
            period_end: invoice.period_end
              ? new Date(invoice.period_end * 1000).toISOString() : null,
            invoice_url: invoice.hosted_invoice_url ?? null
          });
        }

        console.log(`[webhook] Payment failed for subscription ${subscriptionId}`);
        break;
      }

      // ─── invoice.paid ─────────────────────────────────────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        // Restore active status if it was past_due
        await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', subscriptionId)
          .eq('status', 'past_due'); // only update if currently past_due

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('building_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (sub) {
          await supabase.from('invoice_events').insert({
            building_id: sub.building_id,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            event_type: 'paid',
            amount_due: invoice.amount_due,
            currency: invoice.currency,
            period_start: invoice.period_start
              ? new Date(invoice.period_start * 1000).toISOString() : null,
            period_end: invoice.period_end
              ? new Date(invoice.period_end * 1000).toISOString() : null,
            invoice_url: invoice.hosted_invoice_url ?? null
          });
        }

        console.log(`[webhook] Invoice paid for subscription ${subscriptionId}`);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (handlerError) {
    console.error('[webhook] Handler threw unexpectedly:', handlerError);
    return NextResponse.json({ error: 'Internal handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

---

## 8. PHASE 5: BILLING PAGE

Create file: `app/billing/page.tsx`

This is a Server Component that fetches subscription state and renders pricing cards.

```typescript
import { createClient } from '@/lib/supabase/server';
import BillingPageClient from './billing-client';
import { redirect } from 'next/navigation';

export default async function BillingPage({
  searchParams
}: {
  searchParams: { building?: string; success?: string; cancelled?: string }
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/?role=kozos_kepviselo'); // Redirect to login
  }

  const buildingId = searchParams.building;

  // Fetch subscription if buildingId provided
  let subscription = null;
  let building = null;
  let unitCount = 0;

  if (buildingId) {
    const [subResult, buildingResult, unitResult] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('building_id', buildingId)
        .maybeSingle(),
      supabase
        .from('buildings')
        .select('id, name, address')
        .eq('id', buildingId)
        .single(),
      supabase
        .from('units')
        .select('id', { count: 'exact', head: true })
        .eq('building_id', buildingId)
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
```

Create file: `app/billing/billing-client.tsx`

```typescript
'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Building2, CreditCard, ExternalLink, Zap } from 'lucide-react';

interface Subscription {
  plan: string;
  status: string;
  unit_count: number;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
}

interface Building {
  id: string;
  name: string;
  address: string;
}

interface BillingPageClientProps {
  subscription: Subscription | null;
  building: Building | null;
  unitCount: number;
  buildingId?: string;
  successFromCheckout: boolean;
  cancelledFromCheckout: boolean;
}

const PLANS = [
  {
    key: 'alap',
    name: 'PanelLakó Alap',
    pricePerUnit: 1.50,
    currency: '€',
    period: '/albetét/hó',
    description: 'Tökéletes önszervező társasházaknak közös képviselővel',
    features: [
      'Digitális hibabejelentés (korlátlan)',
      'Dokumentumtár + visszaigazolás',
      'Mérőóra-diktálás',
      'Értesítések (app)',
      'Közgyűlési naptár',
      'Ház Radar műszerfal',
      'Alapszintű pénzügyi átláthatóság'
    ],
    highlight: false,
    badge: null
  },
  {
    key: 'pro',
    name: 'PanelLakó Pro',
    pricePerUnit: 3.00,
    currency: '€',
    period: '/albetét/hó',
    description: 'Professzionális megbízott cégeknek, több épület kezeléséhez',
    features: [
      'Minden Alap funkció',
      'Korlátlan dokumentumfeltöltés (50 MB/fájl)',
      'Könyvelő hozzáférés',
      'Munkamegrendelések és szerviz',
      'Szállítói adatbázis',
      'Tudásbázis (SZMSZ generátor)',
      'API hozzáférés',
      'Email értesítések',
      'Prioritásos ügyfélszolgálat'
    ],
    highlight: true,
    badge: 'Ajánlott'
  }
] as const;

export default function BillingPageClient({
  subscription,
  building,
  unitCount,
  buildingId,
  successFromCheckout,
  cancelledFromCheckout
}: BillingPageClientProps) {
  const [loading, setLoading] = useState<'alap' | 'pro' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (plan: 'alap' | 'pro') => {
    if (!buildingId) {
      setError('Kérjük, válasszon épületet a folytatáshoz.');
      return;
    }
    setLoading(plan);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, buildingId })
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        setError(data.error ?? 'Checkout hiba. Kérjük, próbálja újra.');
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      setError('Hálózati hiba. Kérjük, ellenőrizze az internetkapcsolatát.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!buildingId) return;
    setLoading('portal');
    setError(null);

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Nem sikerült megnyitni a számlázási portált.');
      }
    } catch {
      setError('Hálózati hiba.');
    } finally {
      setLoading(null);
    }
  };

  const isActive = subscription?.status === 'active';
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';

  const trialDaysRemaining = subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 14;

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,#f8fafc_30%,#eef2ff_100%)] px-4 py-12">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-sky-500 text-white shadow-lg shadow-brand-900/20">
            <CreditCard size={24} />
          </div>
          <h1 className="text-3xl font-black text-slate-950">Előfizetési csomagok</h1>
          <p className="mt-2 text-slate-500">
            14 napos ingyenes próbaidőszak · Kártyaadatok nem szükségesek a próbához
          </p>
        </div>

        {/* Success / Cancel banners */}
        {successFromCheckout && (
          <div className="mb-6 flex items-center gap-3 rounded-3xl bg-emerald-50 p-4 text-emerald-700">
            <CheckCircle2 size={20} className="shrink-0" />
            <div>
              <p className="font-black">Sikeres előfizetés!</p>
              <p className="text-sm">Az előfizetés aktiválva. Köszönjük, hogy a PanelLakót választotta!</p>
            </div>
          </div>
        )}

        {cancelledFromCheckout && (
          <div className="mb-6 flex items-center gap-3 rounded-3xl bg-amber-50 p-4 text-amber-700">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-semibold">A fizetési folyamat megszakadt. Bármikor folytathatja.</p>
          </div>
        )}

        {/* Building context */}
        {building && (
          <div className="mb-6 rounded-3xl border border-white/70 bg-white/90 p-4">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-brand-500" />
              <div>
                <p className="font-black text-slate-950">{building.name}</p>
                <p className="text-sm text-slate-500">{building.address} · {unitCount} albetét</p>
              </div>
            </div>
          </div>
        )}

        {/* Current subscription status */}
        {subscription && (
          <div className={`mb-6 rounded-3xl p-4 ${
            isActive ? 'bg-emerald-50 border border-emerald-200' :
            isTrialing ? 'bg-sky-50 border border-sky-200' :
            isPastDue ? 'bg-rose-50 border border-rose-200' :
            'bg-slate-50 border border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black">
                  {isActive && '✓ Aktív előfizetés'}
                  {isTrialing && `Próbaidőszak — ${trialDaysRemaining} nap hátra`}
                  {isPastDue && '⚠ Fizetés sikertelen'}
                  {subscription.status === 'cancelled' && 'Előfizetés lemondva'}
                </p>
                <p className="text-sm text-slate-600">
                  Csomag: {subscription.plan.toUpperCase()} ·
                  {subscription.current_period_end && ` Következő számlázás: ${formatDate(subscription.current_period_end)}`}
                </p>
              </div>
              {(isActive || isTrialing) && (
                <button
                  onClick={handleManageBilling}
                  disabled={loading === 'portal'}
                  className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ExternalLink size={14} />
                  {loading === 'portal' ? 'Betöltés...' : 'Számlázás kezelése'}
                </button>
              )}
            </div>

            {isTrialing && trialDaysRemaining <= 3 && (
              <div className="mt-3 rounded-2xl bg-amber-100 p-3 text-sm text-amber-800">
                <strong>Figyelem:</strong> A próbaidőszak {trialDaysRemaining} napon belül lejár.
                Az előfizetés aktiválásával biztosíthatja a folyamatos hozzáférést.
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => {
            const monthlyTotal = (plan.pricePerUnit * unitCount).toFixed(2);
            const isCurrentPlan = subscription?.plan === plan.key && (isActive || isTrialing);

            return (
              <div
                key={plan.key}
                className={`relative rounded-[1.75rem] border p-6 ${
                  plan.highlight
                    ? 'border-brand-300 bg-gradient-to-br from-brand-50 to-white shadow-lg shadow-brand-100'
                    : 'border-white/70 bg-white/90'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-black text-white shadow">
                    {plan.badge}
                  </span>
                )}

                <div className="mb-4">
                  <p className="text-lg font-black text-slate-950">{plan.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-950">{plan.currency}{plan.pricePerUnit.toFixed(2)}</span>
                    <span className="text-sm text-slate-500">{plan.period}</span>
                  </div>
                  {unitCount > 0 && (
                    <p className="mt-1 text-sm font-bold text-brand-600">
                      = {plan.currency}{monthlyTotal}/hó ({unitCount} albetét)
                    </p>
                  )}
                </div>

                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-center text-sm font-black text-emerald-700">
                    Jelenlegi csomag
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.key as 'alap' | 'pro')}
                    disabled={loading !== null}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      plan.highlight
                        ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-200'
                        : 'bg-slate-950 text-white hover:bg-slate-800'
                    }`}
                  >
                    <Zap size={14} />
                    {loading === plan.key
                      ? 'Átirányítás...'
                      : subscription
                        ? 'Váltás erre a csomagra'
                        : '14 napos próba indítása'
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust signals */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-slate-500">
          <div>
            <p className="font-bold text-slate-700">Biztonságos fizetés</p>
            <p>Stripe fizet. Adatait titkosítva kezeljük.</p>
          </div>
          <div>
            <p className="font-bold text-slate-700">Bármikor lemondható</p>
            <p>Nincs hosszú távú kötelezettség.</p>
          </div>
          <div>
            <p className="font-bold text-slate-700">GDPR-megfelelő</p>
            <p>Adatkezelés az EU jogszabályai szerint.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 9. PHASE 6: PAYWALL MIDDLEWARE

Modify `middleware.ts` to check subscription status on protected routes:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Routes that are always accessible regardless of subscription status
const PUBLIC_ROUTES = [
  '/',
  '/billing',
  '/api/stripe/checkout',
  '/api/stripe/webhook',
  '/api/stripe/portal',
  '/auth',
  '/login'
];

// Routes that require an active subscription (not just a valid session)
const PROTECTED_ROUTES = [
  '/w/',  // workspace routes (future)
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Always allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return supabaseResponse;
  }

  // Allow static assets (already excluded by matcher config)
  // Check if route requires subscription enforcement
  const requiresSubscription = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (requiresSubscription && user) {
    // Extract buildingId from URL if in /w/{buildingId}/... pattern
    const buildingIdMatch = pathname.match(/^\/w\/([^/]+)/);
    const buildingId = buildingIdMatch?.[1];

    if (buildingId) {
      // Use service role to check subscription (anon client can't read subscriptions due to RLS)
      const adminClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: subscription } = await adminClient
        .from('subscriptions')
        .select('status, trial_end, plan')
        .eq('building_id', buildingId)
        .maybeSingle();

      const hasAccess = checkSubscriptionAccess(subscription);

      if (!hasAccess) {
        const billingUrl = new URL('/billing', request.url);
        billingUrl.searchParams.set('building', buildingId);
        billingUrl.searchParams.set('reason', 'subscription_required');
        return NextResponse.redirect(billingUrl);
      }
    }
  }

  return supabaseResponse;
}

function checkSubscriptionAccess(subscription: {
  status: string;
  trial_end: string | null;
  plan: string;
} | null): boolean {
  if (!subscription) {
    // No subscription record at all → allow access (new building, prompt to subscribe)
    return true;
  }

  // Active subscription → full access
  if (subscription.status === 'active') {
    return true;
  }

  // Trialing → check if trial has expired
  if (subscription.status === 'trialing') {
    if (!subscription.trial_end) return true; // No end date = indefinite trial
    const trialEndDate = new Date(subscription.trial_end);
    return trialEndDate > new Date(); // true if trial is still valid
  }

  // All other states (past_due, cancelled, incomplete) → deny access
  return false;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
```

---

## 10. PHASE 7: BILLING PORTAL (CUSTOMER SELF-SERVICE)

Create file: `app/api/stripe/portal/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
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

  // Get stripe_customer_id from subscriptions table
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
```

The Stripe Customer Portal, once configured in the Stripe Dashboard (Phase 2 Step 3), allows customers to:
- Update their payment method (add/remove cards)
- Download PDF invoices for all historical billing periods
- Cancel their subscription at period end
- Upgrade or downgrade between Alap and Pro (if plan switching is enabled in Portal settings)

---

## 11. PHASE 8: INVOICE EMAILS VIA STRIPE

Stripe sends automated invoice emails by default. Configure in Stripe Dashboard → Settings → Emails:

- Enable: **Successful payment receipts** → sent automatically when `invoice.paid` fires
- Enable: **Failed payment receipts** → sent when `invoice.payment_failed` fires with a payment retry link
- Enable: **Upcoming renewal reminders** → sent 7 days before next billing date

Customize the email template:
- Brand name: `PanelLakó`
- Support email: `support@panellako.hu`
- Business address: your registered Hungarian company address

For custom invoice branding (logo, color), go to Stripe Dashboard → Settings → Branding → Upload logo.

To send custom follow-up emails beyond Stripe's defaults (e.g., a "Your trial expires in 3 days" reminder), use a cron job or Supabase Edge Function:

```sql
-- Edge Function trigger via pg_cron (requires pg_cron extension on Supabase Pro)
-- Schedule: daily at 09:00 UTC
select cron.schedule(
  'trial-expiry-reminders',
  '0 9 * * *',
  $$
    select net.http_post(
      url := 'https://<project>.supabase.co/functions/v1/send-trial-reminders',
      headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
```

---

## 12. TESTING WITH STRIPE TEST MODE

### 12.1 Test Card Numbers (Stripe)

Use these in the Stripe-hosted checkout page during local testing:

| Scenario | Card number | Expiry | CVC |
|---|---|---|---|
| Successful payment | 4242 4242 4242 4242 | Any future date | Any 3 digits |
| Payment requires 3DS | 4000 0027 6000 3184 | Any | Any |
| Card declined | 4000 0000 0000 9995 | Any | Any |
| Insufficient funds | 4000 0000 0000 9979 | Any | Any |

### 12.2 End-to-End Test Sequence

1. **Start Stripe webhook listener**: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. **Start Next.js dev server**: `npm run dev`
3. **Seed test data**: ensure a `buildings` row and multiple `units` rows exist
4. Navigate to `http://localhost:3000/billing?building=<uuid>`
5. Click "14 napos próba indítása" on the Pro plan
6. Verify: redirected to Stripe hosted checkout with Hungarian locale
7. Enter card `4242 4242 4242 4242`, complete checkout
8. Verify: redirected back to `/billing?success=true`
9. Check Stripe webhook listener terminal: `checkout.session.completed` event logged
10. Check Supabase `subscriptions` table: row updated with `stripe_subscription_id`, `status = 'trialing'`

### 12.3 Webhook Replay Testing

Use the Stripe CLI to replay events without making real payments:
```bash
stripe events resend evt_1234567890  # replace with real event ID from Stripe dashboard
```

### 12.4 Trial Expiry Test

```bash
# Advance test clock for a subscription (Stripe Test Clocks feature)
stripe test_helpers.test_clocks.advance \
  --id clk_1234567890 \
  --frozen_time $(($(date +%s) + 14*24*3600))
```

---

## 13. ERROR HANDLING

### 13.1 Payment Failure Recovery

When `invoice.payment_failed` fires:
1. Webhook sets `subscriptions.status = 'past_due'`
2. Stripe automatically retries the payment (Smart Retries: 3 attempts over 7 days by default)
3. Stripe emails the customer a payment retry link
4. If all retries fail, Stripe fires `customer.subscription.deleted`
5. Webhook sets `subscriptions.status = 'cancelled'`

For the middleware paywall: `past_due` status blocks access. This is intentional but harsh. Consider a grace period:

```typescript
// In checkSubscriptionAccess:
if (subscription.status === 'past_due') {
  // Grace period: allow access for 7 days after period end before hard blocking
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  if (periodEnd) {
    const gracePeriodEnd = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
    return gracePeriodEnd > new Date();
  }
  return false;
}
```

### 13.2 Webhook Replay / Duplicate Events

Stripe may deliver the same webhook event more than once (at-least-once delivery guarantee). The `subscriptions.upsert` pattern with `onConflict: 'building_id'` is inherently idempotent — applying the same update twice has the same result as applying it once.

For `invoice_events`, duplicate inserts would create two rows. Add idempotency:

```typescript
// In invoice.paid and invoice.payment_failed handlers:
await supabase.from('invoice_events')
  .upsert(
    { stripe_invoice_id: invoice.id, event_type: 'paid', ... },
    { onConflict: 'stripe_invoice_id,event_type' }  // add UNIQUE constraint for this
  );
```

Add the constraint to the migration:
```sql
alter table invoice_events
  add constraint uq_invoice_event unique (stripe_invoice_id, event_type);
```

### 13.3 Checkout Session Abandonment

If a user starts checkout but never completes it, the Stripe checkout session expires after 24 hours. The `subscriptions` record will have `stripe_customer_id` set but `stripe_subscription_id = null` and `status = 'trialing'`. This is fine — the next time the user initiates checkout, the existing customer ID is reused.

### 13.4 Stripe API Downtime

In the rare case Stripe's API is unavailable, the checkout API route will throw. All Stripe API calls are wrapped in try/catch blocks. The error message surfaced to the user is:

```
"Checkout hiba: The Stripe service is currently unavailable. Please try again in a moment."
```

The billing page continues to display the current subscription status from Supabase (not from Stripe), so managers can still see their plan details even when Stripe is down.

---

## 14. BARION INTEGRATION ROADMAP

Barion (https://www.barion.com) is Hungary's leading domestic payment processor. It is relevant for PanelLakó because:

1. Some Hungarian building committees have corporate cards (OTP, K&H, Erste) that may trigger additional 3D Secure friction on Stripe but work natively on Barion.
2. Barion offers a Hungarian-language merchant dashboard and Hungarian-language customer emails, which reduces friction for non-English-speaking managing companies.
3. Barion supports SZÉP kártya (a Hungarian government-subsidized benefit card) — not relevant for building management payments, but demonstrates the domestic ecosystem integration.

**Recommended sprint for Barion**: Q4 2026, after Stripe integration is stable and generating revenue.

**Technical approach for Barion integration**:
- Barion uses a REST API with HMAC-SHA256 authentication
- Their NPM ecosystem is sparse; build a thin wrapper (`lib/barion/client.ts`)
- The subscription model (recurring billing) in Barion requires special merchant approval ("recurring payment") — apply early as the approval process takes 2–4 weeks
- `subscriptions` table: add `barion_payment_id` and `payment_gateway` (`stripe` | `barion`) columns
- The webhook handler pattern is identical; just add a second endpoint at `app/api/barion/webhook/route.ts`

**Do not block Stripe on Barion**. The two gateways should operate independently. Customers choose their preferred gateway at checkout (show two "Pay with Stripe" / "Pay with Barion" buttons on the billing page).

---

## 15. INTEGRATION WITH MULTI-BUILDING INITIATIVE

The current schema assumes one subscription per building (`unique (building_id)` on the `subscriptions` table). The multi-building initiative (building selector/workspace routing, `/w/<workspaceId>` routes) will require a workspace-level subscription model.

**Future schema extension**:
```sql
-- When workspaces/organizations are introduced:
alter table subscriptions add column workspace_id uuid references workspaces(id) on delete cascade;
-- A workspace subscription covers all buildings in the workspace
-- Individual building subscriptions remain for single-building customers
```

For the current implementation, keep subscriptions at the `building_id` level. The billing page accepts `?building=<uuid>` as a query param. When the workspace initiative ships, add `?workspace=<uuid>` support and aggregate billing across buildings in the workspace.

**Important for the checkout flow**: The unit count used for pricing should reflect the total units across all buildings in the workspace when workspace billing is introduced. The query in the checkout route (`count from units where building_id = buildingId`) will need to be updated to `count from units where building_id in (select id from buildings where workspace_id = workspaceId)`.

---

## 16. ROLLBACK PLAN

### 16.1 Immediate Rollback (< 5 minutes)

1. Remove or disable the Stripe webhook endpoint in Stripe Dashboard → Webhooks → Disable
2. Delete `app/api/stripe/` directory
3. Delete `app/billing/` directory
4. Revert `middleware.ts` to the previous version (paywall logic removed)

The `subscriptions` and `invoice_events` tables can remain in the database — they are additive and do not affect any existing functionality.

### 16.2 Database Rollback (reversible)

```sql
-- Drop billing tables (only if no real subscription data exists)
drop table if exists invoice_events;
drop table if exists subscriptions;
```

**Warning**: If real customer subscriptions exist in the database, dropping these tables will lose billing records. In that case, only disable the middleware paywall and API routes — leave the database intact.

### 16.3 Stripe Configuration Rollback

In Stripe Dashboard:
- Archive the PanelLakó Alap and Pro products (archiving prevents new subscriptions but does not cancel existing ones)
- If no real subscriptions exist, the archived products can later be reactivated

---

## 17. DEFINITION OF DONE

This feature is considered complete when ALL of the following criteria are met:

1. **`subscriptions` table** exists in Supabase with all columns from Phase 1, correct RLS policies (managers can SELECT their own building's subscription; only service role can INSERT/UPDATE), and the `updated_at` trigger is active.

2. **`invoice_events` table** exists with the unique constraint on `(stripe_invoice_id, event_type)` for idempotent webhook processing.

3. **Stripe products and prices are created** in Stripe Dashboard (test mode): PanelLakó Alap at €1.50/unit/month and PanelLakó Pro at €3.00/unit/month, both with 14-day trial configured.

4. **All required environment variables are set** in `.env.local`: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_ALAP_MONTHLY`, `STRIPE_PRICE_ID_PRO_MONTHLY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`.

5. **Checkout API route** (`app/api/stripe/checkout/route.ts`) correctly: authenticates the user, verifies building membership, counts units from the database, creates/retrieves Stripe customer, creates checkout session with Hungarian locale and 14-day trial, and returns the session URL.

6. **Webhook handler** (`app/api/stripe/webhook/route.ts`) correctly: verifies Stripe signature, handles `checkout.session.completed` (activates subscription), `customer.subscription.updated` (syncs status), `customer.subscription.deleted` (cancels), `invoice.payment_failed` (sets past_due), and `invoice.paid` (restores active). All handlers are idempotent.

7. **Billing page** (`app/billing/page.tsx` + `billing-client.tsx`) renders pricing cards for both plans with: calculated monthly total based on live unit count, current subscription status banner, trial countdown (days remaining), success/cancel banners from checkout redirect, and "Számlázás kezelése" button for active subscribers.

8. **Customer portal route** (`app/api/stripe/portal/route.ts`) creates a Stripe Customer Portal session and returns the URL.

9. **Middleware paywall** in `middleware.ts` blocks access to `/w/` routes when subscription status is `cancelled` or `past_due` (beyond grace period), and redirects to `/billing` with reason parameter.

10. **14-day trial logic**: new buildings without a subscription record are NOT blocked by the paywall (implicit free trial). Buildings with `status = 'trialing'` and a future `trial_end` date have full access. Expired trials are blocked.

11. **Unit count is live**: the checkout flow queries the `units` table at session creation time, not a cached or user-supplied value. A building with 60 units cannot be billed as a 20-unit building.

12. **End-to-end test passes**: using Stripe test card `4242 4242 4242 4242`, a complete checkout → webhook → database update → billing page confirmation cycle completes successfully within 30 seconds.

13. **Webhook idempotency**: running the same `checkout.session.completed` event twice via `stripe events resend` does not create duplicate subscription rows or throw errors.

14. **Barion roadmap is documented** in `versioning/` and the `marketing/marketing_values/` file for this release, establishing the intent to support Barion in Q4 2026.

15. **No existing features are regressed**: the main dashboard, ticket creation, meter readings, document acknowledgement, and all existing navigation work without changes after the billing integration is deployed.

16. **Mobile layout of billing page**: pricing cards stack vertically on screens narrower than 768px, all buttons are minimum 44px touch target height, and the billing page is fully functional on iOS Safari and Android Chrome.
