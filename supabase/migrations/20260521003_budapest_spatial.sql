-- Budapest open data: tree inventory (fakataszter) + park registry
-- Source: opendata.budapest.hu CKAN portal (no API key required)
-- Populated by the superadmin `budapest_import` job; queried per-building via bounding box + haversine

CREATE TABLE IF NOT EXISTS public.budapest_trees (
  id          bigint generated always as identity primary key,
  ext_id      text,
  lat         double precision not null,
  lon         double precision not null,
  species_lat text,                  -- scientific name
  species_hu  text,                  -- Hungarian common name
  condition   text,                  -- állapot
  district    text,                  -- kerület
  height_m    numeric(5,1),
  crown_r_m   numeric(5,1),
  imported_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_budapest_trees_latlon
  ON public.budapest_trees (lat, lon);

CREATE TABLE IF NOT EXISTS public.budapest_parks (
  id          bigint generated always as identity primary key,
  ext_id      text,
  name        text,
  district    text,
  area_m2     double precision,
  lat         double precision,      -- centroid latitude
  lon         double precision,      -- centroid longitude
  imported_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_budapest_parks_latlon
  ON public.budapest_parks (lat, lon);

-- Metadata: import state (last import timestamp, record counts, resource IDs)
CREATE TABLE IF NOT EXISTS public.budapest_data_meta (
  key   text primary key,
  value text
);

ALTER TABLE public.budapest_trees      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budapest_parks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budapest_data_meta  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read budapest trees"
  ON public.budapest_trees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can write budapest trees"
  ON public.budapest_trees FOR ALL USING (true);

CREATE POLICY "Authenticated can read budapest parks"
  ON public.budapest_parks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can write budapest parks"
  ON public.budapest_parks FOR ALL USING (true);

CREATE POLICY "Service role can manage budapest meta"
  ON public.budapest_data_meta FOR ALL USING (true);
