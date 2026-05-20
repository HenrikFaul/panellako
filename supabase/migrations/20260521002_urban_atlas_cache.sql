-- Copernicus Urban Atlas 2018 land-use breakdown per building (500m radius)
-- Source: EEA ArcGIS REST service (no API key required)
-- TTL: 6 months (Urban Atlas dataset is updated every 3 years)

CREATE TABLE IF NOT EXISTS public.building_urban_atlas_cache (
  id                  bigint generated always as identity primary key,
  building_id         uuid not null references public.buildings(id) on delete cascade,
  green_urban_pct     numeric(5,2),   -- code 14100: green urban areas
  sports_leisure_pct  numeric(5,2),   -- code 14200: sports/leisure
  forest_pct          numeric(5,2),   -- code 23xxx: forests
  agricultural_pct    numeric(5,2),   -- code 2xxxx (non-forest): agriculture/open
  artificial_pct      numeric(5,2),   -- code 1xxxx: built-up/artificial
  total_green_pct     numeric(5,2),   -- sum of green_urban + sports + forest
  feature_count       integer,
  ua_raw              jsonb,          -- raw feature list for debugging
  computed_at         timestamptz not null default now(),
  UNIQUE(building_id)
);

ALTER TABLE public.building_urban_atlas_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read urban atlas cache"
  ON public.building_urban_atlas_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can write urban atlas cache"
  ON public.building_urban_atlas_cache FOR ALL USING (true);
