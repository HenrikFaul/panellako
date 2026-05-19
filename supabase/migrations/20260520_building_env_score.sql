create table if not exists public.building_env_score (
  id              bigint generated always as identity primary key,
  building_id     uuid not null references public.buildings(id) on delete cascade,
  total_score     numeric(5,1) not null,
  air_score       numeric(5,1),
  green_score     numeric(5,1),
  pollen_score    numeric(5,1),
  uv_score        numeric(5,1),
  noise_score     numeric(5,1),
  aqi_snapshot    integer,
  computed_at     timestamptz not null default now(),
  UNIQUE(building_id)
);
alter table public.building_env_score enable row level security;
create policy "Authenticated can read env score" on public.building_env_score for select to authenticated using (true);
create policy "Service role can write env score" on public.building_env_score for all using (true);
