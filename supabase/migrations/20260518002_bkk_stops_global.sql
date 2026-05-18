-- Global BKK stop catalogue — seeded once via seed-bkk-stops.ts, refreshed nightly
-- This is a city-wide table (not per-building) so the transit live map and
-- stop search can query without hitting the BKK API on every request.

CREATE TABLE IF NOT EXISTS public.bkk_stops (
  stop_id     text                     PRIMARY KEY,
  name        text                     NOT NULL,
  lat         double precision         NOT NULL,
  lon         double precision         NOT NULL,
  route_refs  text[]                   NOT NULL DEFAULT '{}',
  route_type  text                     NOT NULL DEFAULT 'BUS',
  updated_at  timestamptz              NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bkk_stops_lat_lon ON public.bkk_stops (lat, lon);

ALTER TABLE public.bkk_stops ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) may read the stop catalogue
CREATE POLICY "bkk_stops_read_all"
  ON public.bkk_stops FOR SELECT USING (true);

-- Only service-role / backend may write
CREATE POLICY "bkk_stops_service_write"
  ON public.bkk_stops FOR ALL
  USING (true)
  WITH CHECK (true);
