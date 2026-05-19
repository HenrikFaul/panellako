create table if not exists public.building_satellite_cache (
  id              bigint generated always as identity primary key,
  building_id     uuid not null references public.buildings(id) on delete cascade,
  ndvi            numeric(6,4),
  ndvi_label      text,
  ndvi_color      text,
  scene_date      text,
  cloud_cover     numeric(5,2),
  satellite       text,
  scene_id        text,
  b_red_value     numeric(10,2),
  b_nir_value     numeric(10,2),
  source          text not null default 'sentinel2',
  computed_at     timestamptz not null default now(),
  unique(building_id)
);
create index if not exists idx_building_satellite_cache_building_id on public.building_satellite_cache(building_id);
