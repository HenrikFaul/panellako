-- ============================================================
-- PanelLakó Billing Schema
-- Migration: 20260516_billing.sql
-- ============================================================

create table if not exists subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  building_id             uuid not null references buildings(id) on delete cascade,
  stripe_customer_id      text not null,
  stripe_subscription_id  text,
  plan                    text not null default 'trial'
                            check (plan in ('trial', 'alap', 'pro', 'cancelled', 'past_due')),
  unit_count              integer not null default 0,
  status                  text not null default 'trialing'
                            check (status in ('trialing', 'active', 'past_due', 'cancelled', 'incomplete', 'incomplete_expired', 'unpaid')),
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  trial_end               timestamptz,
  cancel_at_period_end    boolean not null default false,
  stripe_price_id         text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (building_id)
);

create index if not exists idx_subscriptions_stripe_customer_id
  on subscriptions (stripe_customer_id);

create index if not exists idx_subscriptions_stripe_subscription_id
  on subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

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

alter table subscriptions enable row level security;

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

drop policy if exists "No direct client insert subscriptions" on subscriptions;
create policy "No direct client insert subscriptions" on subscriptions
  for insert with check (false);

drop policy if exists "No direct client update subscriptions" on subscriptions;
create policy "No direct client update subscriptions" on subscriptions
  for update using (false);

-- invoice_events: append-only billing event log
create table if not exists invoice_events (
  id                      uuid primary key default gen_random_uuid(),
  building_id             uuid not null references buildings(id) on delete cascade,
  stripe_invoice_id       text not null,
  stripe_subscription_id  text,
  event_type              text not null,
  amount_due              integer,
  currency                text not null default 'eur',
  period_start            timestamptz,
  period_end              timestamptz,
  invoice_url             text,
  created_at              timestamptz not null default now(),
  constraint uq_invoice_event unique (stripe_invoice_id, event_type)
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
