-- PanelLakó MVP schema (Supabase/PostgreSQL)
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  target_group text not null default 'Mindenki',
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  status text not null check (status in ('uj','folyamatban','varakozik','lezarva')),
  priority text not null check (priority in ('alacsony','kozepes','magas','kritikus')),
  location text not null,
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  version text not null,
  file_url text not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  period text not null,
  expected_amount numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  due_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scheduled_at timestamptz not null,
  status text not null check (status in ('tervezett','lezart')),
  resolution_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;
alter table tickets enable row level security;
alter table documents enable row level security;
alter table finance_entries enable row level security;
alter table meetings enable row level security;

-- Demo policy: public read access for MVP showcase.
create policy "Public read announcements" on announcements for select using (true);
create policy "Public read tickets" on tickets for select using (true);
create policy "Public read documents" on documents for select using (true);
create policy "Public read finance" on finance_entries for select using (true);
create policy "Public read meetings" on meetings for select using (true);
