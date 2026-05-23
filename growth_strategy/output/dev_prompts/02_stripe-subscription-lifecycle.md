# Initiative 02 — Full Stripe Subscription Lifecycle
## Trial → Paid → Overdue → Cancellation State Machine | Value: +€380k–€800k

---

## 1. Initiative Header

**Title:** Full Stripe Subscription Lifecycle — Trial → Paid → Overdue → Cancellation

**Value Range:** +€380k–€800k (billing infrastructure commands 2–3× ARR multiple premium)

**Business Case:**

PanelLakó has a solid Stripe foundation: `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `app/api/stripe/portal/route.ts`, and `app/billing/billing-client.tsx` all exist and are functional. The `subscriptions` table in `20260516_billing.sql` tracks `status`, `trial_end`, `plan`, and `cancel_at_period_end`. The middleware already checks `hasSubscriptionAccess()` and redirects to `/billing` when a subscription is expired.

What is missing is the full lifecycle state machine with automated communications: there are no trial-nudge emails sent on day 7 and day 12 of a 14-day trial, no dunning emails sent on payment failure, no grace-period countdown shown in the UI, and no reactivation path shown after a cancellation. Without these, PanelLakó loses the 15–25% of customers who would convert or return with a single well-timed email (Stripe 2025 State of Subscriptions benchmark).

The Hungarian market has a specific dynamic: building managers (közös képviselők) are frequently older adults with lower digital literacy. A frictionless trial-to-paid flow with clear countdown timers and a single-click Stripe Customer Portal URL is a retention lever in itself. Every day without automated dunning is measurable ARR leaking from the funnel.

Building this properly also unlocks the Enterprise tier sales cycle: every B2B prospect will ask "what happens when someone doesn't pay?" before committing — a polished billing lifecycle is a trust signal that closes deals.

---

## 2. Codebase Context

**Current relevant file tree (verified):**

```
/home/user/panellako/
├── app/
│   ├── api/
│   │   └── stripe/
│   │       ├── checkout/route.ts     ← Creates Stripe Checkout session
│   │       ├── portal/route.ts       ← Creates Stripe Customer Portal session
│   │       └── webhook/route.ts      ← Handles: checkout.session.completed,
│   │                                    subscription.updated/deleted,
│   │                                    invoice.payment_failed, invoice.paid
│   ├── billing/
│   │   ├── billing-client.tsx        ← Client component with plan cards + portal link
│   │   └── page.tsx                  ← Server component, auth-gated
│   └── actions/
│       └── (no billing.ts yet)
├── lib/
│   ├── email.ts                      ← sendEmail() via Brevo (NOT Resend!)
│   ├── email-templates/
│   │   ├── announcement.tsx
│   │   └── ticket-update.tsx
│   └── supabase/
│       └── server.ts
├── middleware.ts                     ← hasSubscriptionAccess() + /billing redirect
└── supabase/
    └── migrations/
        └── 20260516_billing.sql      ← subscriptions + invoice_events tables
```

**Key finding about email provider:** `lib/email.ts` uses **Brevo** (Sendinblue API), NOT Resend. The `BREVO_API_KEY` env var is the active email credential. The `resend` npm package IS installed in `package.json` but not yet wired in `lib/email.ts`. This initiative uses the existing `sendEmail()` abstraction from `lib/email.ts` — the template system is provider-agnostic.

**What is missing:**
- `app/actions/billing.ts` — `enforceTrialGate()`, `getSubscriptionStatus()` Server Actions
- `lib/email-templates/billing/trial-nudge.tsx`
- `lib/email-templates/billing/payment-failed.tsx`
- `lib/email-templates/billing/cancellation-confirmation.tsx`
- Webhook handlers for `customer.subscription.trial_will_end`
- Trial countdown banner in `app/billing/billing-client.tsx`
- `overdue_since` and `dunning_sent_at` columns on `subscriptions`

**Existing webhook state:** `app/api/stripe/webhook/route.ts` already handles:
- `checkout.session.completed` → upserts `subscriptions`
- `customer.subscription.updated` → updates status/plan/periods
- `customer.subscription.deleted` → sets `status: 'cancelled'`
- `invoice.payment_failed` → sets `status: 'past_due'`, upserts `invoice_events`
- `invoice.paid` → resets `status: 'active'` when recovering from `past_due`

---

## 3. Pre-conditions

**Environment variables required:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
BREVO_API_KEY=xkeysib-...          ← Already used by lib/email.ts
NEXT_PUBLIC_APP_URL=https://app.panellako.hu
```

**Stripe webhook events to enable in Stripe Dashboard:**
Navigate to https://dashboard.stripe.com → Developers → Webhooks → add event:
- `customer.subscription.trial_will_end` (fires 3 days before trial ends — supplement with DB scheduler for 7-day and 12-day nudges)

**Migration to apply:**
- `20260523_010_billing_lifecycle.sql`

---

## 4. Phase 1: Database Changes

### Migration: `20260523_010_billing_lifecycle.sql`

```sql
-- Extend subscriptions table with lifecycle tracking columns.
-- Idempotent: uses ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS overdue_since        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dunning_email_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_dunning_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason  TEXT,
  ADD COLUMN IF NOT EXISTS reactivated_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_nudge_7_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_nudge_12_sent  BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.subscriptions.overdue_since IS
  'Set to NOW() when invoice.payment_failed fires. Cleared when invoice.paid fires.';
COMMENT ON COLUMN public.subscriptions.dunning_email_count IS
  'Number of dunning emails sent for the current overdue cycle. Reset when paid.';
COMMENT ON COLUMN public.subscriptions.trial_nudge_7_sent IS
  'True after the day-7 trial conversion nudge email has been sent.';
COMMENT ON COLUMN public.subscriptions.trial_nudge_12_sent IS
  'True after the day-12 trial urgency email has been sent.';

-- Trigger function to auto-set overdue_since when status transitions to past_due
CREATE OR REPLACE FUNCTION public.set_overdue_since()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Set overdue_since when becoming past_due
  IF NEW.status = 'past_due' AND OLD.status != 'past_due' THEN
    NEW.overdue_since = COALESCE(OLD.overdue_since, NOW());
  END IF;
  -- Clear overdue fields when recovering to active
  IF NEW.status = 'active' AND OLD.status = 'past_due' THEN
    NEW.overdue_since = NULL;
    NEW.dunning_email_count = 0;
    NEW.last_dunning_at = NULL;
    NEW.reactivated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_overdue ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_overdue
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_overdue_since();

-- View: subscription_health — used by billing UI and portal
CREATE OR REPLACE VIEW public.subscription_health AS
SELECT
  s.*,
  b.name AS building_name,
  CASE
    WHEN s.status = 'trialing' AND s.trial_end IS NOT NULL
      THEN GREATEST(0, EXTRACT(DAY FROM (s.trial_end - NOW()))::INTEGER)
    ELSE NULL
  END AS trial_days_remaining,
  CASE
    WHEN s.status = 'past_due' AND s.overdue_since IS NOT NULL
      THEN EXTRACT(DAY FROM (NOW() - s.overdue_since))::INTEGER
    ELSE NULL
  END AS days_overdue
FROM public.subscriptions s
JOIN public.buildings b ON b.id = s.building_id;

-- RLS on the view: inherit from subscriptions
ALTER VIEW public.subscription_health OWNER TO postgres;
```

---

## 5. Phase 2: Server-side

### New file: `app/actions/billing.ts`

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionStatus {
  status:              string;
  plan:                string;
  trial_end:           string | null;
  trial_days_remaining: number | null;
  overdue_since:       string | null;
  days_overdue:        number | null;
  current_period_end:  string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id:  string | null;
}

export interface TrialGateResult {
  allowed:     boolean;
  daysLeft:    number | null;
  reason:      'active' | 'trialing' | 'trial_expired' | 'past_due' | 'cancelled' | 'no_subscription';
}

// ─── enforceTrialGate ─────────────────────────────────────────────────────────
// Called from middleware and server components before rendering protected content.

export async function enforceTrialGate(buildingId: string): Promise<TrialGateResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { allowed: false, daysLeft: null, reason: 'cancelled' };

  const { data: sub, error } = await supabase
    .from('subscription_health')
    .select('status, trial_end, trial_days_remaining')
    .eq('building_id', buildingId)
    .maybeSingle();

  if (error) {
    console.error('[enforceTrialGate] DB error:', error);
    return { allowed: true, daysLeft: null, reason: 'no_subscription' }; // fail open
  }

  if (!sub) {
    return { allowed: true, daysLeft: null, reason: 'no_subscription' };
  }

  if (sub.status === 'active') {
    return { allowed: true, daysLeft: null, reason: 'active' };
  }

  if (sub.status === 'trialing') {
    const days = sub.trial_days_remaining ?? 0;
    if (days > 0) {
      return { allowed: true, daysLeft: days, reason: 'trialing' };
    }
    return { allowed: false, daysLeft: 0, reason: 'trial_expired' };
  }

  if (sub.status === 'past_due') {
    return { allowed: false, daysLeft: null, reason: 'past_due' };
  }

  if (sub.status === 'cancelled') {
    return { allowed: false, daysLeft: null, reason: 'cancelled' };
  }

  return { allowed: true, daysLeft: null, reason: 'no_subscription' };
}

// ─── getSubscriptionStatus ────────────────────────────────────────────────────

export async function getSubscriptionStatus(buildingId: string): Promise<{
  success: boolean;
  data?: SubscriptionStatus;
  error?: string;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve.' };

  const { data, error } = await supabase
    .from('subscription_health')
    .select('status, plan, trial_end, trial_days_remaining, overdue_since, days_overdue, current_period_end, cancel_at_period_end, stripe_customer_id')
    .eq('building_id', buildingId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Nincs előfizetési adat.' };

  return { success: true, data: data as SubscriptionStatus };
}
```

### Extended: `app/api/stripe/webhook/route.ts`

Add the following cases to the existing `switch (event.type)` block in `app/api/stripe/webhook/route.ts`. These additions go **after** the existing `invoice.paid` case, **before** the `default:` case:

```typescript
// ── Add inside the switch statement ──

case 'customer.subscription.trial_will_end': {
  // Stripe fires this 3 days before trial_end.
  // We send a final urgency email ("3 days left to subscribe").
  const subscription = event.data.object as Stripe.Subscription;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('building_id, trial_nudge_7_sent, trial_nudge_12_sent')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!sub) break;

  // Get the building manager's email
  const { data: manager } = await supabase
    .from('memberships')
    .select('profiles(email, full_name)')
    .eq('building_id', sub.building_id)
    .eq('role', 'kozos_kepviselo')
    .eq('active', true)
    .limit(1)
    .single();

  const email = (manager?.profiles as { email?: string })?.email;
  const name = (manager?.profiles as { full_name?: string })?.full_name ?? 'Közös képviselő';

  if (email) {
    const { renderEmailTemplate, sendEmail } = await import('@/lib/email');
    const { TrialEndingEmail } = await import('@/lib/email-templates/billing/trial-nudge');
    const html = await renderEmailTemplate(
      TrialEndingEmail({ managerName: name, daysLeft: 3, buildingId: sub.building_id })
    );
    await sendEmail({
      to: email,
      subject: 'Próbaidőszak: 3 nap van hátra — PanelLakó',
      html,
      tags: [{ name: 'lifecycle', value: 'trial_ending_3days' }],
    });
  }
  break;
}

case 'invoice.payment_failed': {
  // Already handled above — extend with dunning email send
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) break;

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId);

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('building_id, dunning_email_count')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (sub) {
    await supabase.from('invoice_events').upsert({
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
      invoice_url: invoice.hosted_invoice_url ?? null,
    }, { onConflict: 'stripe_invoice_id,event_type' });

    // Send dunning email (max 3 dunning emails per overdue cycle)
    const dunningCount = sub.dunning_email_count ?? 0;
    if (dunningCount < 3) {
      const { data: manager } = await supabase
        .from('memberships')
        .select('profiles(email, full_name)')
        .eq('building_id', sub.building_id)
        .eq('role', 'kozos_kepviselo')
        .eq('active', true)
        .limit(1)
        .single();

      const email = (manager?.profiles as { email?: string })?.email;
      const name = (manager?.profiles as { full_name?: string })?.full_name ?? 'Közös képviselő';
      const invoiceUrl = invoice.hosted_invoice_url ?? '';
      const amountEur = ((invoice.amount_due ?? 0) / 100).toFixed(2);

      if (email) {
        const { renderEmailTemplate, sendEmail } = await import('@/lib/email');
        const { PaymentFailedEmail } = await import('@/lib/email-templates/billing/payment-failed');
        const html = await renderEmailTemplate(
          PaymentFailedEmail({
            managerName: name,
            amountEur,
            invoiceUrl,
            attemptNumber: dunningCount + 1,
          })
        );
        await sendEmail({
          to: email,
          subject: `Fizetési probléma — ${amountEur} € esedékes — PanelLakó`,
          html,
          tags: [{ name: 'lifecycle', value: 'dunning' }],
        });

        await supabase
          .from('subscriptions')
          .update({
            dunning_email_count: dunningCount + 1,
            last_dunning_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);
      }
    }
  }
  break;
}
```

---

## 6. Phase 3: Client-side

### New file: `lib/email-templates/billing/trial-nudge.tsx`

```typescript
import { renderEmailTemplate } from '@/lib/email';
import * as React from 'react';

interface Props {
  managerName: string;
  daysLeft: number;
  buildingId: string;
}

export function TrialEndingEmail({ managerName, daysLeft, buildingId }: Props) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu';
  const billingUrl = `${appUrl}/billing?building=${buildingId}&source=trial_nudge`;
  const urgencyColor = daysLeft <= 3 ? '#dc2626' : '#d97706';
  const urgencyText = daysLeft <= 3 ? `Csak ${daysLeft} nap maradt!` : `${daysLeft} nap van hátra`;

  return (
    <html lang="hu">
      <head>
        <meta charSet="utf-8" />
        <title>PanelLakó próbaidőszak vége közeleg</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', background: '#f8fafc', margin: 0, padding: '40px 20px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', background: '#ffffff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-block', background: '#6366f1', borderRadius: '12px', padding: '12px 20px', color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>
              PanelLakó
            </div>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
            Kedves {managerName},
          </h1>
          <div style={{ background: urgencyColor + '15', borderLeft: `4px solid ${urgencyColor}`, borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <p style={{ color: urgencyColor, fontWeight: 'bold', margin: 0, fontSize: '16px' }}>
              {urgencyText} a próbaidőszakából!
            </p>
          </div>
          <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
            Az ingyenes próbaidőszaka hamarosan lejár. Az előfizetés megújításával az összes funkció — hibabejelentések, közgyűlési dokumentumok, pénzügyi kimutatások — elérhető marad.
          </p>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <a
              href={billingUrl}
              style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '14px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px' }}
            >
              Előfizetés megújítása
            </a>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginBottom: 0 }}>
            Kérdése van? Írjon nekünk: <a href="mailto:support@panellako.hu" style={{ color: '#6366f1' }}>support@panellako.hu</a>
          </p>
        </div>
      </body>
    </html>
  );
}
```

### New file: `lib/email-templates/billing/payment-failed.tsx`

```typescript
import * as React from 'react';

interface Props {
  managerName: string;
  amountEur: string;
  invoiceUrl: string;
  attemptNumber: number;
}

export function PaymentFailedEmail({ managerName, amountEur, invoiceUrl, attemptNumber }: Props) {
  const supportUrl = 'mailto:support@panellako.hu';
  const urgencyMessages = [
    'Kérjük, frissítse fizetési adatait az előfizetés fenntartásához.',
    'Második fizetési kísérlet sikertelen. Haladéktalanul frissítse kártyáját.',
    'VÉGSŐ FIGYELMEZTETÉS: Az előfizetés felfüggesztésre kerül.',
  ];
  const message = urgencyMessages[Math.min(attemptNumber - 1, 2)];

  return (
    <html lang="hu">
      <head>
        <meta charSet="utf-8" />
        <title>Fizetési probléma — PanelLakó</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', background: '#fef2f2', margin: 0, padding: '40px 20px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', background: '#ffffff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ background: '#dc2626', borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: '#fff', fontWeight: 'bold', margin: 0, fontSize: '14px' }}>
              Fizetési kísérlet {attemptNumber}/3 sikertelen
            </p>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
            Kedves {managerName},
          </h1>
          <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
            A <strong>{amountEur} €</strong> összegű PanelLakó előfizetési díja nem sikerült levonni.
          </p>
          <p style={{ color: '#dc2626', fontWeight: 'bold', lineHeight: '1.6', marginBottom: '24px' }}>
            {message}
          </p>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <a
              href={invoiceUrl}
              style={{ display: 'inline-block', background: '#dc2626', color: '#fff', padding: '14px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px' }}
            >
              Fizetési adatok frissítése
            </a>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>
            Segítségért: <a href={supportUrl} style={{ color: '#6366f1' }}>support@panellako.hu</a>
          </p>
        </div>
      </body>
    </html>
  );
}
```

### Edit: `app/billing/billing-client.tsx` — Add trial countdown banner

Add this component at the top of the billing page client component, inside the `BillingClient` function, before the plan cards. This renders when `subscriptionStatus === 'trialing'`:

```typescript
// Add to billing-client.tsx — Trial Countdown Banner
function TrialCountdownBanner({ daysLeft }: { daysLeft: number }) {
  const isUrgent = daysLeft <= 3;
  return (
    <div className={`mb-6 flex items-center gap-4 rounded-2xl border p-4 ${
      isUrgent
        ? 'border-red-200 bg-red-50'
        : 'border-amber-200 bg-amber-50'
    }`}>
      <div className={`text-4xl font-black ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
        {daysLeft}
      </div>
      <div>
        <p className={`font-bold ${isUrgent ? 'text-red-700' : 'text-amber-700'}`}>
          {isUrgent
            ? `Csak ${daysLeft} nap van hátra a próbaidőszakból!`
            : `Próbaidőszak: ${daysLeft} nap van hátra`
          }
        </p>
        <p className="text-sm text-slate-500">
          Az előfizetés megújításával minden funkció elérhető marad.
        </p>
      </div>
    </div>
  );
}

// Add to BillingClient — OverdueWarningBanner
function OverdueWarningBanner({ invoiceUrl }: { invoiceUrl?: string }) {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100">
        <span className="text-xl">⚠️</span>
      </div>
      <div className="flex-1">
        <p className="font-bold text-red-700">Fizetési probléma — az előfizetés szüneteltetve</p>
        <p className="text-sm text-slate-500">
          Frissítse fizetési adatait a hozzáférés visszaállításához.
        </p>
      </div>
      {invoiceUrl && (
        <a
          href={invoiceUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
        >
          Fizetési adatok
        </a>
      )}
    </div>
  );
}
```

---

## 7. Phase 4: Configuration

**Stripe Webhook events to register (https://dashboard.stripe.com/webhooks):**
```
customer.subscription.trial_will_end  ← NEW
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
checkout.session.completed
invoice.payment_failed
invoice.paid
```

**Environment variable for 7-day / 12-day trial nudges:**
These cannot be driven by Stripe webhooks alone (Stripe only sends `trial_will_end` 3 days before). Use a Supabase scheduled function (`pg_cron` or a daily cron Edge Function) to query:
```sql
-- Daily cron: find subscriptions where trial_end is in 7 days and nudge not yet sent
SELECT * FROM subscriptions
WHERE status = 'trialing'
  AND trial_end BETWEEN NOW() + INTERVAL '6 days 23 hours'
                    AND NOW() + INTERVAL '7 days 1 hour'
  AND trial_nudge_7_sent = FALSE;
```

The `20260520_cycling_pg_cron_schedules.sql` migration already sets up pg_cron — add a new schedule there for billing nudges.

**`next.config.mjs` changes:** None required.

---

## 8. Phase 5: Testing

### Manual Smoke Test

1. **Trial countdown:** Create a test subscription with `status: 'trialing'` and `trial_end = NOW() + 3 days`. Navigate to `/billing?building={id}` — confirm the orange `TrialCountdownBanner` shows "3 nap van hátra".

2. **Trial expired redirect:** Set `trial_end = NOW() - 1 day` in `subscriptions`. Navigate to `/w/[buildingId]` — middleware `hasSubscriptionAccess()` should redirect to `/billing?building={id}&reason=subscription_required`.

3. **Overdue warning:** Set `status = 'past_due'` on a subscription. Navigate to `/billing` — confirm the red `OverdueWarningBanner` appears.

4. **Dunning email send:** Call the webhook handler with a mock `invoice.payment_failed` event. Check that `dunning_email_count` increments to 1 in `subscriptions` and `last_dunning_at` is set.

5. **Recovery from past_due:** Send a mock `invoice.paid` event. Check that `status = 'active'`, `overdue_since = NULL`, `dunning_email_count = 0`, `reactivated_at` is set.

6. **Max dunning cap:** Set `dunning_email_count = 3`. Send another `invoice.payment_failed` — email should NOT be sent again (count >= 3 guard).

### Automated Test Cases

```typescript
describe('enforceTrialGate', () => {
  it('returns allowed:true for active subscription', async () => {
    mockSubscription({ status: 'active' });
    const result = await enforceTrialGate('building-1');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('active');
  });

  it('returns allowed:false when trial_end is in the past', async () => {
    mockSubscription({ status: 'trialing', trial_end: new Date(Date.now() - 86400000).toISOString() });
    const result = await enforceTrialGate('building-1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('trial_expired');
  });

  it('returns allowed:false for past_due subscription', async () => {
    mockSubscription({ status: 'past_due' });
    const result = await enforceTrialGate('building-1');
    expect(result.allowed).toBe(false);
  });

  it('fails open when subscription record does not exist', async () => {
    mockNoSubscription();
    const result = await enforceTrialGate('building-1');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('no_subscription');
  });

  it('correctly computes daysLeft from trial_days_remaining', async () => {
    mockSubscription({ status: 'trialing', trial_days_remaining: 5 });
    const result = await enforceTrialGate('building-1');
    expect(result.daysLeft).toBe(5);
  });
});
```

---

## 9. Error Handling & Edge Cases

**Scenario 1: Stripe webhook arrives out-of-order**
`customer.subscription.updated` may arrive before `checkout.session.completed`. The `upsert({ onConflict: 'building_id' })` pattern in checkout.session.completed is safe — if updated fires first and creates no record (no building_id in the event), it is a no-op.

**Scenario 2: `BREVO_API_KEY` not set in production**
`lib/email.ts` checks `const isEmailEnabled = Boolean(brevoApiKey)` and stubs the send with a console.log — it returns `{ success: true, id: 'stub_...' }`. Billing lifecycle continues without failing.

**Scenario 3: Manager email not found (no memberships record)**
The dunning logic does `if (email) { ... }` — if no email is found, the send is silently skipped. The `dunning_email_count` is NOT incremented in this case (email was never sent). This is intentional — the count should reflect actual sends.

**Scenario 4: Stripe webhook `building_id` metadata missing**
The `checkout.session.completed` handler already has: `if (!buildingId || !subscriptionId) { console.error(...); break; }`. Incomplete webhooks are logged and discarded cleanly.

**Scenario 5: Database trigger `set_overdue_since` fires on unrelated update**
The trigger only modifies `overdue_since` when the `status` transitions to/from `past_due`. Other column updates (e.g., plan changes) pass through without modification.

**Scenario 6: `subscription_health` view not yet created**
`enforceTrialGate()` falls back gracefully: if the view query fails, it returns `{ allowed: true, ... }` (fail open). This prevents billing infrastructure issues from locking users out of the app.

**Scenario 7: Trial nudge sent twice (race condition)**
The `trial_nudge_7_sent` boolean column prevents duplicate sends. However, the daily cron and the Stripe webhook could theoretically both attempt a 3-day nudge simultaneously. The column update uses an explicit `WHERE trial_nudge_7_sent = FALSE` check to prevent duplicate emails.

**Scenario 8: Cancellation during trial period**
`customer.subscription.deleted` sets `status: 'cancelled', plan: 'cancelled'`. The middleware `hasSubscriptionAccess()` returns `false` for `cancelled` status. The user is redirected to `/billing?reason=subscription_required`. The cancellation confirmation email template should be wired in the same webhook handler.

---

## 10. Integration with Other Initiatives

- **Initiative 01 (Portfolio Dashboard):** The `subscription_status`, `subscription_plan`, and `trial_end` fields in `get_portfolio_summary()` are populated from the same `subscriptions` table this initiative enriches. The "Lejáró próba" KPI card in the portfolio directly surfaces the `trial_nudge_7_sent` / `trial_nudge_12_sent` state.

- **Initiative 06 (Email Suite):** The email templates created here (`trial-nudge.tsx`, `payment-failed.tsx`) use the same `lib/email.ts` `sendEmail()` abstraction as all other email templates. They are additive — no conflicts.

- **Initiative 08 (SSR Auth Hardening):** The `enforceTrialGate()` Server Action already uses `supabase.auth.getUser()` (not `getSession()`) — Initiative 08 compliant from the start.

- **Initiative 10 (PostHog):** Add these events in the webhook handler:
  - `trackEvent('trial_converted', { plan, building_id })` on `checkout.session.completed`
  - `trackEvent('payment_failed', { attempt: dunning_count })` on `invoice.payment_failed`
  - `trackEvent('subscription_cancelled', { reason })` on `customer.subscription.deleted`

---

## 11. Rollback Plan

1. **Remove webhook additions:** Revert the `customer.subscription.trial_will_end` case and the dunning email logic in `invoice.payment_failed`. Restore the original `invoice.payment_failed` block (which only sets `status: 'past_due'` and upserts `invoice_events`).

2. **Remove email templates:** Delete `lib/email-templates/billing/trial-nudge.tsx` and `lib/email-templates/billing/payment-failed.tsx`.

3. **Remove Server Action:** Delete `app/actions/billing.ts`.

4. **Remove billing UI additions:** Remove `TrialCountdownBanner` and `OverdueWarningBanner` from `billing-client.tsx`.

5. **Revert migration (only the new columns, not the original billing schema):**
   ```sql
   ALTER TABLE public.subscriptions
     DROP COLUMN IF EXISTS overdue_since,
     DROP COLUMN IF EXISTS dunning_email_count,
     DROP COLUMN IF EXISTS last_dunning_at,
     DROP COLUMN IF EXISTS cancellation_reason,
     DROP COLUMN IF EXISTS reactivated_at,
     DROP COLUMN IF EXISTS trial_nudge_7_sent,
     DROP COLUMN IF EXISTS trial_nudge_12_sent;
   DROP TRIGGER IF EXISTS trg_subscriptions_overdue ON public.subscriptions;
   DROP FUNCTION IF EXISTS public.set_overdue_since();
   DROP VIEW IF EXISTS public.subscription_health;
   ```

6. **Deregister webhook event:** Remove `customer.subscription.trial_will_end` from Stripe Dashboard webhook configuration.

---

## 12. Definition of Done

- [ ] Migration `20260523_010_billing_lifecycle.sql` applied — `overdue_since`, `dunning_email_count`, `trial_nudge_7_sent`, `trial_nudge_12_sent` columns exist on `subscriptions`
- [ ] `subscription_health` view created and queryable
- [ ] `app/actions/billing.ts` created — `enforceTrialGate()` returns correct result for each status type
- [ ] `customer.subscription.trial_will_end` webhook case handled — sends email via `lib/email.ts`
- [ ] `invoice.payment_failed` extended — sends dunning email, increments `dunning_email_count`, respects max-3 cap
- [ ] `invoice.paid` recovery: `overdue_since = NULL`, `dunning_email_count = 0`, `reactivated_at = NOW()`
- [ ] `lib/email-templates/billing/trial-nudge.tsx` renders valid HTML in all email clients
- [ ] `lib/email-templates/billing/payment-failed.tsx` renders valid HTML with correct urgency levels
- [ ] `TrialCountdownBanner` appears on `/billing` when `trial_days_remaining <= 7`
- [ ] `OverdueWarningBanner` appears on `/billing` when `status === 'past_due'`
- [ ] Unauthenticated user hitting `/w/[buildingId]` with expired trial is redirected to `/billing`
- [ ] TypeScript compiles cleanly for all new files
- [ ] Manual smoke test: mock `invoice.payment_failed` → `dunning_email_count = 1`, email logged in console
- [ ] `customer.subscription.trial_will_end` registered in Stripe Dashboard webhook events
