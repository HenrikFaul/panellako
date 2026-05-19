create table if not exists public.building_solar_cache (
  id               bigint generated always as identity primary key,
  building_id      uuid not null references public.buildings(id) on delete cascade,
  e_y_kwh_kwp      numeric(8,2),
  h_i_opt          numeric(8,2),
  e_d_kwh_kwp      numeric(8,2),
  monthly_kwh      jsonb,
  pvgis_raw        jsonb,
  computed_at      timestamptz not null default now(),
  UNIQUE(building_id)
);
alter table public.building_solar_cache enable row level security;
create policy "Authenticated can read solar cache" on public.building_solar_cache for select to authenticated using (true);
create policy "Service role can write solar cache" on public.building_solar_cache for all using (true);
