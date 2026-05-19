create table if not exists public.building_compact_city_cache (
  id                    bigint generated always as identity primary key,
  building_id           uuid not null references public.buildings(id) on delete cascade,
  walkability_score     numeric(5,1) not null,
  transit_score         numeric(5,1) not null,
  mixed_use_score       numeric(5,1) not null,
  score_15min           numeric(5,1) not null,
  daily_needs_count     integer,
  education_count       integer,
  healthcare_count      integer,
  food_count            integer,
  culture_count         integer,
  shop_count            integer,
  nearest_supermarket_m numeric(7,0),
  nearest_pharmacy_m    numeric(7,0),
  nearest_school_m      numeric(7,0),
  transit_stops_500m    integer,
  computed_at           timestamptz not null default now(),
  unique(building_id)
);
create index if not exists idx_building_compact_city_building_id on public.building_compact_city_cache(building_id);
