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
