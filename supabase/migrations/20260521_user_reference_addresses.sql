-- v0.7.14 — User reference addresses (Magyarország-szintű címkereső profil-mentés)
-- Egyszerű, minimális tábla. A user explicit kérése: "ne told túl most ezt a betöltést mert
-- cserélni fogom egy jobb brutálabb táblára szóval sok logikát ne építs rá".
-- Egy user — egy referencia-cím (PK = user_id).

create table if not exists public.user_reference_addresses (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  lat          double precision not null,
  lon          double precision not null,
  street       text,
  house_number text,
  city         text,
  district     text,
  postcode     text,
  floor        text,   -- opcionális: emelet
  door         text,   -- opcionális: ajtó
  source       text not null default 'nominatim',
  updated_at   timestamptz not null default now()
);

alter table public.user_reference_addresses enable row level security;

drop policy if exists "Users can read own reference address" on public.user_reference_addresses;
create policy "Users can read own reference address"
  on public.user_reference_addresses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert own reference address" on public.user_reference_addresses;
create policy "Users can upsert own reference address"
  on public.user_reference_addresses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reference address" on public.user_reference_addresses;
create policy "Users can update own reference address"
  on public.user_reference_addresses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
