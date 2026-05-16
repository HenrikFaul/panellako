-- PanelLakó MVP+ schema (Supabase/PostgreSQL)
-- Auth: Supabase auth.users table + profil tükör
-- 2026-04-27 feature refresh: ticketing, albetétek, dokumentum read receipt, vendor/work order, tudásbázis, audit.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('lako','tulajdonos','kozos_kepviselo','megbizott','bizottsag','konyvelo')),
  created_at timestamptz not null default now()
);

create table if not exists buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  created_at timestamptz not null default now()
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  unit_label text not null,
  floor text,
  owner_name text not null default 'Ismeretlen tulajdonos',
  unit_type text not null default 'Lakas',
  area_m2 numeric(10,2) not null default 0,
  ownership_share numeric(10,2) not null default 0,
  balance_amount numeric(12,2) not null default 0,
  has_water_meter boolean not null default false,
  created_at timestamptz not null default now(),
  unique (building_id, unit_label)
);

alter table units add column if not exists owner_name text not null default 'Ismeretlen tulajdonos';
alter table units add column if not exists unit_type text not null default 'Lakas';
alter table units add column if not exists area_m2 numeric(10,2) not null default 0;
alter table units add column if not exists ownership_share numeric(10,2) not null default 0;
alter table units add column if not exists balance_amount numeric(12,2) not null default 0;
alter table units add column if not exists has_water_meter boolean not null default false;

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  building_id uuid not null references buildings(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  role text not null check (role in ('lako','tulajdonos','kozos_kepviselo','megbizott','bizottsag','konyvelo')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (profile_id, building_id, role)
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  title text not null,
  content text not null,
  target_group text not null default 'Mindenki',
  category text not null default 'egyeb',
  source_label text,
  created_at timestamptz not null default now()
);

alter table announcements add column if not exists category text not null default 'egyeb';
alter table announcements add column if not exists source_label text;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  title text not null,
  message text not null,
  audience text not null,
  channel text not null default 'app' check (channel in ('app','email')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table notifications add column if not exists read_at timestamptz;

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  reporter_id uuid references profiles(id) on delete set null,
  title text not null,
  description text not null,
  status text not null default 'uj' check (status in ('uj','folyamatban','varakozik','lezarva')),
  priority text not null default 'kozepes' check (priority in ('alacsony','kozepes','magas','kritikus')),
  location text not null,
  submitted_by text,
  unit_label text,
  due_date date,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table tickets add column if not exists submitted_by text;
alter table tickets add column if not exists unit_label text;
alter table tickets add column if not exists updated_at timestamptz not null default now();

create table if not exists meter_readings (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  reported_by uuid references profiles(id) on delete set null,
  meter_type text not null check (meter_type in ('viz','gaz','villany')),
  value numeric(12,2) not null,
  reading_date date not null,
  unit_label text not null,
  reported_by_name text,
  created_at timestamptz not null default now()
);

alter table meter_readings add column if not exists reported_by_name text;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  title text not null,
  category text not null,
  version text not null,
  file_url text not null,
  visibility text not null default 'Mindenki',
  acknowledged_at timestamptz,
  uploaded_at timestamptz not null default now()
);

alter table documents add column if not exists visibility text not null default 'Mindenki';
alter table documents add column if not exists acknowledged_at timestamptz;

create table if not exists document_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (document_id, profile_id)
);

create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id) on delete set null,
  period text not null,
  expected_amount numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  due_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  title text not null,
  scheduled_at timestamptz not null,
  status text not null check (status in ('tervezett','lezart')),
  resolution_count integer not null default 0,
  agenda_preview text,
  created_at timestamptz not null default now()
);

alter table meetings add column if not exists agenda_preview text;

create table if not exists agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  order_no integer not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists resolutions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  agenda_item_id uuid references agenda_items(id) on delete set null,
  text text not null,
  outcome text not null default 'tervezett',
  effective_date date,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  resolution_id uuid references resolutions(id) on delete cascade,
  voter_profile_id uuid references profiles(id) on delete set null,
  unit_id uuid references units(id) on delete set null,
  vote_value text not null check (vote_value in ('igen','nem','tartozkodas')),
  weight numeric(10,2) not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  name text not null,
  category text not null,
  contact text not null,
  sla_hours integer not null default 24,
  created_at timestamptz not null default now()
);

create table if not exists work_orders (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete set null,
  vendor_id uuid references vendors(id) on delete set null,
  ticket_title text not null,
  vendor_name text not null,
  status text not null default 'tervezett' check (status in ('tervezett','kikuldve','folyamatban','lezarva')),
  due_date date not null,
  cost_estimate numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_base_articles (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  title text not null,
  topic text not null,
  body text not null,
  audience text not null default 'Minden lakó',
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  actor_name text not null default 'Rendszer',
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  entity_label text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table buildings enable row level security;
alter table units enable row level security;
alter table announcements enable row level security;
alter table notifications enable row level security;
alter table tickets enable row level security;
alter table meter_readings enable row level security;
alter table documents enable row level security;
alter table document_acknowledgements enable row level security;
alter table finance_entries enable row level security;
alter table meetings enable row level security;
alter table agenda_items enable row level security;
alter table resolutions enable row level security;
alter table votes enable row level security;
alter table vendors enable row level security;
alter table work_orders enable row level security;
alter table knowledge_base_articles enable row level security;
alter table audit_logs enable row level security;

-- Demo policies: MVP gyors indulás. Élesben scope-alapú membership policy-re kell szigorítani.
drop policy if exists "Public read profiles" on profiles;
drop policy if exists "Public read memberships" on memberships;
drop policy if exists "Public read buildings" on buildings;
drop policy if exists "Public read units" on units;
drop policy if exists "Public read announcements" on announcements;
drop policy if exists "Public read notifications" on notifications;
drop policy if exists "Public read tickets" on tickets;
drop policy if exists "Public read meter readings" on meter_readings;
drop policy if exists "Public read documents" on documents;
drop policy if exists "Public read document acknowledgements" on document_acknowledgements;
drop policy if exists "Public read finance" on finance_entries;
drop policy if exists "Public read meetings" on meetings;
drop policy if exists "Public read agenda items" on agenda_items;
drop policy if exists "Public read resolutions" on resolutions;
drop policy if exists "Public read votes" on votes;
drop policy if exists "Public read vendors" on vendors;
drop policy if exists "Public read work orders" on work_orders;
drop policy if exists "Public read knowledge base" on knowledge_base_articles;
drop policy if exists "Public read audit logs" on audit_logs;

create policy "Public read profiles" on profiles for select using (true);
create policy "Public read memberships" on memberships for select using (true);
create policy "Public read buildings" on buildings for select using (true);
create policy "Public read units" on units for select using (true);
create policy "Public read announcements" on announcements for select using (true);
create policy "Public read notifications" on notifications for select using (true);
create policy "Public read tickets" on tickets for select using (true);
create policy "Public read meter readings" on meter_readings for select using (true);
create policy "Public read documents" on documents for select using (true);
create policy "Public read document acknowledgements" on document_acknowledgements for select using (true);
create policy "Public read finance" on finance_entries for select using (true);
create policy "Public read meetings" on meetings for select using (true);
create policy "Public read agenda items" on agenda_items for select using (true);
create policy "Public read resolutions" on resolutions for select using (true);
create policy "Public read votes" on votes for select using (true);
create policy "Public read vendors" on vendors for select using (true);
create policy "Public read work orders" on work_orders for select using (true);
create policy "Public read knowledge base" on knowledge_base_articles for select using (true);
create policy "Public read audit logs" on audit_logs for select using (true);

drop policy if exists "Public insert tickets" on tickets;
drop policy if exists "Public insert meter readings" on meter_readings;
drop policy if exists "Manager insert announcements" on announcements;
drop policy if exists "Manager insert notifications" on notifications;
drop policy if exists "Public insert audit logs" on audit_logs;

create policy "Public insert tickets" on tickets for insert with check (true);
create policy "Public insert meter readings" on meter_readings for insert with check (true);
create policy "Manager insert announcements" on announcements for insert with check (true);
create policy "Manager insert notifications" on notifications for insert with check (true);
create policy "Public insert audit logs" on audit_logs for insert with check (true);

-- Previously missing INSERT policies
drop policy if exists "Authenticated insert documents" on documents;
drop policy if exists "Authenticated insert document acknowledgements" on document_acknowledgements;
drop policy if exists "Authenticated insert finance entries" on finance_entries;
drop policy if exists "Authenticated insert votes" on votes;
drop policy if exists "Authenticated insert work orders" on work_orders;

create policy "Authenticated insert documents" on documents for insert with check (true);
create policy "Authenticated insert document acknowledgements" on document_acknowledgements for insert with check (true);
create policy "Authenticated insert finance entries" on finance_entries for insert with check (true);
create policy "Authenticated insert votes" on votes for insert with check (true);
create policy "Authenticated insert work orders" on work_orders for insert with check (true);

-- Previously missing UPDATE policies
drop policy if exists "Authenticated update tickets" on tickets;
drop policy if exists "Authenticated update notifications" on notifications;
drop policy if exists "Authenticated update document acknowledgements" on document_acknowledgements;
drop policy if exists "Authenticated update work orders" on work_orders;
drop policy if exists "Authenticated update resolutions" on resolutions;

create policy "Authenticated update tickets" on tickets for update using (true) with check (true);
create policy "Authenticated update notifications" on notifications for update using (true) with check (true);
create policy "Authenticated update document acknowledgements" on document_acknowledgements for update using (true) with check (true);
create policy "Authenticated update work orders" on work_orders for update using (true) with check (true);
create policy "Authenticated update resolutions" on resolutions for update using (true) with check (true);

-- Unique constraint for votes upsert (required for onConflict to work)
alter table votes drop constraint if exists votes_resolution_voter_unique;
alter table votes add constraint votes_resolution_voter_unique unique (resolution_id, voter_profile_id);

-- Initiative #6: PWA Push Notifications — push subscriptions table
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
drop policy if exists "User manages own push subscriptions" on push_subscriptions;
create policy "User manages own push subscriptions" on push_subscriptions
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create index if not exists idx_push_subscriptions_profile_id on push_subscriptions (profile_id);

-- Initiative #9: Assembly protocol generator — meetings table extensions
alter table meetings add column if not exists status_detail text
  check (status_detail in ('tervezett', 'aktiv', 'szavazas_folyamatban', 'lezarva'));
alter table meetings add column if not exists quorum_threshold numeric default 0.5;
alter table meetings add column if not exists actual_quorum numeric;
alter table meetings add column if not exists protocol_url text;
alter table meetings add column if not exists protocol_generated_at timestamptz;
alter table meetings add column if not exists invitation_sent_at timestamptz;
alter table meetings add column if not exists location text;
alter table meetings add column if not exists chairperson_name text;
alter table meetings add column if not exists secretary_name text;

create table if not exists meeting_attendances (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  unit_id uuid not null references units(id) on delete cascade,
  ownership_share numeric(10,4) not null,
  attended_at timestamptz not null default now(),
  proxy_name text,
  proxy_document_url text,
  unique (meeting_id, unit_id)
);

alter table meeting_attendances enable row level security;
drop policy if exists "Public read meeting attendances" on meeting_attendances;
create policy "Public read meeting attendances" on meeting_attendances for select using (true);
drop policy if exists "Manager insert meeting attendances" on meeting_attendances;
create policy "Manager insert meeting attendances" on meeting_attendances for insert with check (true);
drop policy if exists "Manager update meeting attendances" on meeting_attendances;
create policy "Manager update meeting attendances" on meeting_attendances for update using (true);

drop policy if exists "Manager insert meetings" on meetings;
create policy "Manager insert meetings" on meetings for insert with check (true);
drop policy if exists "Manager update meetings" on meetings;
create policy "Manager update meetings" on meetings for update using (true);

drop policy if exists "Manager insert agenda items" on agenda_items;
create policy "Manager insert agenda items" on agenda_items for insert with check (true);
drop policy if exists "Manager insert resolutions" on resolutions;
create policy "Manager insert resolutions" on resolutions for insert with check (true);

alter table documents add column if not exists document_type text default 'upload';

-- Initiative #8: Financial ledger enhancements
alter table finance_entries
  add column if not exists payment_date timestamptz,
  add column if not exists payment_reference text,
  add column if not exists created_by uuid references profiles(id) on delete set null,
  add column if not exists description text,
  add column if not exists entry_type text not null default 'charge'
    check (entry_type in ('charge', 'payment', 'adjustment', 'opening_balance'));

create index if not exists idx_finance_entries_unit_period on finance_entries (unit_id, period);
create index if not exists idx_finance_entries_unit_id on finance_entries (unit_id);
create index if not exists idx_finance_entries_entry_type on finance_entries (entry_type);
create index if not exists idx_units_balance_amount on units (balance_amount) where balance_amount < 0;

drop view if exists unit_balance_view;
create view unit_balance_view as
select
  u.id as unit_id,
  u.building_id,
  u.unit_label,
  u.owner_name,
  u.unit_type,
  u.balance_amount as cached_balance,
  coalesce(sum(case when fe.entry_type in ('charge','opening_balance') then fe.expected_amount else 0 end), 0) as total_charged,
  coalesce(sum(case when fe.entry_type = 'payment' then fe.paid_amount else 0 end), 0) as total_paid,
  coalesce(sum(
    case
      when fe.entry_type in ('charge','opening_balance') then fe.expected_amount
      when fe.entry_type = 'payment' then -fe.paid_amount
      when fe.entry_type = 'adjustment' then fe.expected_amount - fe.paid_amount
      else 0
    end
  ), 0) as computed_balance,
  count(fe.id) as entry_count
from units u
left join finance_entries fe on fe.unit_id = u.id
group by u.id, u.building_id, u.unit_label, u.owner_name, u.unit_type, u.balance_amount;

drop view if exists building_arrears_view;
create view building_arrears_view as
select
  ubv.building_id,
  b.name as building_name,
  ubv.unit_id,
  ubv.unit_label,
  ubv.owner_name,
  ubv.total_charged,
  ubv.total_paid,
  ubv.computed_balance,
  (select max(fe2.due_date) from finance_entries fe2 where fe2.unit_id = ubv.unit_id and fe2.entry_type = 'charge') as latest_due_date
from unit_balance_view ubv
join buildings b on b.id = ubv.building_id
where ubv.computed_balance > 0
order by ubv.computed_balance desc;

drop policy if exists "Finance managers can insert finance entries" on finance_entries;
drop policy if exists "Finance managers can update finance entries" on finance_entries;
create policy "Finance managers can insert finance entries" on finance_entries for insert with check (true);
create policy "Finance managers can update finance entries" on finance_entries for update using (true) with check (true);

create or replace function sync_unit_balance()
returns trigger language plpgsql as $$
declare v_computed_balance numeric(12,2);
begin
  select coalesce(sum(
    case
      when entry_type in ('charge','opening_balance') then expected_amount
      when entry_type = 'payment' then -paid_amount
      when entry_type = 'adjustment' then expected_amount - paid_amount
      else 0
    end
  ), 0) into v_computed_balance from finance_entries where unit_id = new.unit_id;
  update units set balance_amount = v_computed_balance where id = new.unit_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_unit_balance on finance_entries;
create trigger trg_sync_unit_balance
  after insert or update on finance_entries
  for each row execute function sync_unit_balance();

-- Initiative #10: Email notification preferences on profiles
alter table profiles add column if not exists notifications_email boolean not null default true;
alter table profiles add column if not exists notifications_statutory_email boolean not null default true;
alter table profiles add column if not exists unsubscribe_token uuid default gen_random_uuid();

-- Initiative #7: AI triage columns on tickets
alter table tickets add column if not exists ai_category text;
alter table tickets add column if not exists ai_urgency integer check (ai_urgency >= 1 and ai_urgency <= 10);
alter table tickets add column if not exists ai_vendor_suggestion text;
alter table tickets add column if not exists ai_summary_hu text;
alter table tickets add column if not exists ai_triage_at timestamptz;
alter table tickets add column if not exists ai_override boolean not null default false;

create index if not exists idx_tickets_ai_triage_at on tickets (ai_triage_at) where ai_triage_at is null;
create index if not exists idx_tickets_ai_urgency on tickets (ai_urgency desc) where ai_urgency is not null;

-- ============================================================
-- Initiative #5: Multi-building Dashboard RPCs (2026-05-16)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_buildings()
RETURNS TABLE (
  building_id   uuid,
  building_name text,
  address       text,
  user_role     text,
  unit_count    bigint,
  open_tickets  bigint,
  member_since  timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.name, b.address, m.role,
    COUNT(DISTINCT u.id),
    COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'lezarva'),
    m.created_at
  FROM memberships m
  JOIN buildings b ON b.id = m.building_id
  LEFT JOIN units u ON u.building_id = b.id
  LEFT JOIN tickets t ON t.building_id = b.id
  WHERE m.profile_id = auth.uid() AND m.active = true
  GROUP BY b.id, b.name, b.address, m.role, m.created_at
  ORDER BY b.name ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_buildings() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_my_buildings() TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_building_membership(_building_id uuid)
RETURNS TABLE (is_member boolean, user_role text, unit_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT true, m.role, m.unit_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.building_id = _building_id
    AND m.active = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_building_membership(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.validate_building_membership(uuid) TO authenticated;

-- ============================================================
-- Initiative #4: SaaS Billing — subscriptions + invoice_events (2026-05-16)
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

create index if not exists idx_subscriptions_stripe_customer_id on subscriptions (stripe_customer_id);
create index if not exists idx_subscriptions_stripe_subscription_id on subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;

drop trigger if exists set_subscriptions_updated_at on subscriptions;
create trigger set_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

alter table subscriptions enable row level security;

drop policy if exists "Manager read own subscription" on subscriptions;
create policy "Manager read own subscription" on subscriptions for select
  using (exists (
    select 1 from memberships
    where memberships.building_id = subscriptions.building_id
      and memberships.profile_id = auth.uid()
      and memberships.active = true
      and memberships.role in ('kozos_kepviselo', 'megbizott', 'konyvelo')
  ));

drop policy if exists "No direct client insert subscriptions" on subscriptions;
create policy "No direct client insert subscriptions" on subscriptions for insert with check (false);
drop policy if exists "No direct client update subscriptions" on subscriptions;
create policy "No direct client update subscriptions" on subscriptions for update using (false);

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
create policy "Manager read own invoice events" on invoice_events for select
  using (exists (
    select 1 from memberships
    where memberships.building_id = invoice_events.building_id
      and memberships.profile_id = auth.uid()
      and memberships.active = true
      and memberships.role in ('kozos_kepviselo', 'megbizott', 'konyvelo')
  ));
