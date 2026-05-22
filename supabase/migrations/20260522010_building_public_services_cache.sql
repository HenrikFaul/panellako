-- Public services cache per building (polgármesteri hivatal, iskola, óvoda, egészségügy)
-- Populated on demand from Overpass API, refreshed when stale (> 7 days).
CREATE TABLE IF NOT EXISTS public.building_public_services_cache (
  building_id   uuid        NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  postcode      text,
  services      jsonb       NOT NULL DEFAULT '{}',
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (building_id)
);

ALTER TABLE public.building_public_services_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read public services cache"
  ON public.building_public_services_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can write public services cache"
  ON public.building_public_services_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);
