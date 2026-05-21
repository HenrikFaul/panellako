-- osm_addresses: Hungarian OSM address data for autocomplete
-- Imported via scripts/import-hungary-addresses.mjs targeting NEXT_PUBLIC_SUPABASE_URL (Panellako project).

create table if not exists public.osm_addresses (
  id                     bigserial primary key,
  external_id            text,
  country                text,
  country_code           text,
  display_name           text,
  name                   text,
  street                 text,
  street_name            text,
  street_type            text,
  street_type_normalized text,
  house_number           text,
  housenumber            text,
  house_number_suffix    text,
  conscriptionnumber     text,
  city                   text,
  town                   text,
  village                text,
  municipality           text,
  district               text,
  suburb                 text,
  neighbourhood          text,
  hamlet                 text,
  postcode               text,
  place                  text,
  lat                    double precision,
  lon                    double precision,
  geometry_type          text,
  created_at             timestamptz default now()
);

-- Unique index on external_id (required for upsert ON CONFLICT)
create unique index if not exists osm_addresses_external_id_unique
  on public.osm_addresses (external_id)
  where external_id is not null;

-- Indexes for autocomplete query patterns
create index if not exists osm_addresses_street_name_idx     on public.osm_addresses using gin (to_tsvector('simple', coalesce(street_name, '')));
create index if not exists osm_addresses_city_idx            on public.osm_addresses (lower(city));
create index if not exists osm_addresses_postcode_idx        on public.osm_addresses (postcode);
create index if not exists osm_addresses_country_code_idx    on public.osm_addresses (country_code);

-- Read-only from anon/authenticated roles; writes only via service role
alter table public.osm_addresses enable row level security;

create policy "osm_addresses_public_read"
  on public.osm_addresses for select
  using (true);
