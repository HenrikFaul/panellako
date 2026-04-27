-- PanelLakó MVP+ schema (Supabase/PostgreSQL)
-- Auth: Supabase auth.users table + profil tükör

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
  building_id uuid not null references buildings(id) on delete cascade,
  unit_label text not null,
  floor text,
  created_at timestamptz not null default now(),
  unique (building_id, unit_label)
);

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
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  title text not null,
  message text not null,
  audience text not null,
  channel text not null default 'app' check (channel in ('app','email')),
  created_at timestamptz not null default now()
);

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
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists meter_readings (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  reported_by uuid references profiles(id) on delete set null,
  meter_type text not null check (meter_type in ('viz','gaz','villany')),
  value numeric(12,2) not null,
  reading_date date not null,
  unit_label text not null,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  title text not null,
  category text not null,
  version text not null,
  file_url text not null,
  uploaded_at timestamptz not null default now()
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
alter table finance_entries enable row level security;
alter table meetings enable row level security;

-- Demo read policies
create policy "Public read profiles" on profiles for select using (true);
create policy "Public read memberships" on memberships for select using (true);
create policy "Public read buildings" on buildings for select using (true);
create policy "Public read units" on units for select using (true);
create policy "Public read announcements" on announcements for select using (true);
create policy "Public read notifications" on notifications for select using (true);
create policy "Public read tickets" on tickets for select using (true);
create policy "Public read meter readings" on meter_readings for select using (true);
create policy "Public read documents" on documents for select using (true);
create policy "Public read finance" on finance_entries for select using (true);
create policy "Public read meetings" on meetings for select using (true);

-- Demo insert policies (MVP gyors indulás)
create policy "Public insert tickets" on tickets for insert with check (true);
create policy "Public insert meter readings" on meter_readings for insert with check (true);
create policy "Manager insert announcements" on announcements for insert with check (true);
create policy "Manager insert notifications" on notifications for insert with check (true);
