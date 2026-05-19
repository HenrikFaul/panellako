create table if not exists public.building_green_cache (
  id                  bigint generated always as identity primary key,
  building_id         uuid not null references public.buildings(id) on delete cascade,
  green_score         numeric(5,1) not null,
  park_area_500m_m2   numeric(12,0),
  tree_count_200m     integer,
  nearest_park_name   text,
  nearest_park_m      numeric(7,0),
  playground_count    integer,
  sports_count        integer,
  noise_score         numeric(4,3),
  main_road_dist_m    numeric(7,0),
  rail_dist_m         numeric(7,0),
  overpass_raw        jsonb,
  computed_at         timestamptz not null default now(),
  UNIQUE(building_id)
);
alter table public.building_green_cache enable row level security;
create policy "Authenticated can read green cache" on public.building_green_cache for select to authenticated using (true);
create policy "Service role can write green cache" on public.building_green_cache for all using (true);
