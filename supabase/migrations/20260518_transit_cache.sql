-- Transit API cache tables
-- Stop data cached per building (refreshed daily by sync endpoint or self-healing)
-- Alert data cached globally (singleton row, refreshed every 5 min)

CREATE TABLE IF NOT EXISTS public.transit_stop_cache (
  building_id UUID    NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  stop_id     TEXT    NOT NULL,
  stop_data   JSONB   NOT NULL,   -- Full NearbyStop object
  distance_m  INTEGER NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (building_id, stop_id)
);

CREATE INDEX IF NOT EXISTS idx_transit_stop_cache_building_dist
  ON public.transit_stop_cache (building_id, distance_m);

CREATE TABLE IF NOT EXISTS public.transit_alert_cache (
  singleton  BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton = true),
  alerts     JSONB   NOT NULL DEFAULT '[]',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transit_stop_cache   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit_alert_cache  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stop cache"
  ON public.transit_stop_cache FOR SELECT USING (true);
CREATE POLICY "API can write stop cache"
  ON public.transit_stop_cache FOR ALL WITH CHECK (true);
CREATE POLICY "Anyone can read alert cache"
  ON public.transit_alert_cache FOR SELECT USING (true);
CREATE POLICY "API can write alert cache"
  ON public.transit_alert_cache FOR ALL WITH CHECK (true);
