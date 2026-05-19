create table if not exists public.building_liveability_cache (
  id                bigint generated always as identity primary key,
  building_id       uuid not null references public.buildings(id) on delete cascade,
  total_score       numeric(5,1) not null,
  green_air_score   numeric(5,1),
  healthcare_score  numeric(5,1),
  education_score   numeric(5,1),
  culture_score     numeric(5,1),
  services_score    numeric(5,1),
  safety_score      numeric(5,1),
  label             text,
  computed_at       timestamptz not null default now(),
  unique(building_id)
);
create index if not exists idx_building_liveability_building_id on public.building_liveability_cache(building_id);
