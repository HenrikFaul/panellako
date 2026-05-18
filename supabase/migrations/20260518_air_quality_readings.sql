-- Air quality readings from AQICN / OLM stations
-- Only one row per (station_id, measured_at) — dedup via unique constraint

create table if not exists public.air_quality_readings (
  id              bigint generated always as identity primary key,
  station_id      text        not null,   -- AQICN station idx (e.g. '5765')
  station_name    text        not null,
  measured_at     timestamptz not null,   -- measurement timestamp from AQICN time.v
  aqi             integer,
  dominant_pol    text,
  pm25            numeric(7,2),
  pm10            numeric(7,2),
  no2             numeric(7,2),
  o3              numeric(7,2),
  so2             numeric(7,2),
  co              numeric(7,2),
  temperature     numeric(5,1),
  humidity        numeric(5,1),
  station_lat     double precision,
  station_lon     double precision,
  created_at      timestamptz not null default now()
);

-- Prevent duplicate rows for the same measurement
create unique index if not exists air_quality_readings_station_measured_uq
  on public.air_quality_readings (station_id, measured_at);

-- Fast lookup by recency
create index if not exists air_quality_readings_measured_at_idx
  on public.air_quality_readings (measured_at desc);

-- RLS: service role can insert; authenticated users can read
alter table public.air_quality_readings enable row level security;

create policy "Anyone can read air quality readings"
  on public.air_quality_readings for select
  using (true);

create policy "Service role can insert air quality readings"
  on public.air_quality_readings for insert
  with check (true);
