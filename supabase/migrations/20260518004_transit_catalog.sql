-- Transit catalog tables (Layer 1)
-- Normalised stop/route/alert data synced daily + every 5 min
-- Keeps transit_stop_cache and transit_alert_cache for backward compatibility.

-- ─── transit_stops ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transit_stops (
  stop_id    TEXT        PRIMARY KEY,
  name       TEXT        NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lon        DOUBLE PRECISION NOT NULL,
  route_type TEXT        NOT NULL DEFAULT 'BUS',
  route_refs TEXT[]      NOT NULL DEFAULT '{}',
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transit_stops_lat_lon
  ON public.transit_stops (lat, lon);

ALTER TABLE public.transit_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read transit_stops"
  ON public.transit_stops FOR SELECT USING (true);
CREATE POLICY "Service role can write transit_stops"
  ON public.transit_stops FOR ALL WITH CHECK (true);

-- ─── transit_routes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transit_routes (
  route_id   TEXT        PRIMARY KEY,
  short_name TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'BUS',
  color      TEXT,
  text_color TEXT,
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transit_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read transit_routes"
  ON public.transit_routes FOR SELECT USING (true);
CREATE POLICY "Service role can write transit_routes"
  ON public.transit_routes FOR ALL WITH CHECK (true);

-- ─── transit_stop_routes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transit_stop_routes (
  stop_id  TEXT NOT NULL REFERENCES public.transit_stops(stop_id)  ON DELETE CASCADE,
  route_id TEXT NOT NULL REFERENCES public.transit_routes(route_id) ON DELETE CASCADE,
  headsign TEXT,
  PRIMARY KEY (stop_id, route_id)
);

ALTER TABLE public.transit_stop_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read transit_stop_routes"
  ON public.transit_stop_routes FOR SELECT USING (true);
CREATE POLICY "Service role can write transit_stop_routes"
  ON public.transit_stop_routes FOR ALL WITH CHECK (true);

-- ─── building_stops ───────────────────────────────────────────────────────────
-- No FK to buildings to avoid coupling with buildings table migrations.
CREATE TABLE IF NOT EXISTS public.building_stops (
  building_id UUID NOT NULL,
  stop_id     TEXT NOT NULL REFERENCES public.transit_stops(stop_id) ON DELETE CASCADE,
  distance_m  INTEGER NOT NULL,
  PRIMARY KEY (building_id, stop_id)
);

CREATE INDEX IF NOT EXISTS idx_building_stops_building_id
  ON public.building_stops (building_id);

ALTER TABLE public.building_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read building_stops"
  ON public.building_stops FOR SELECT USING (true);
CREATE POLICY "Service role can write building_stops"
  ON public.building_stops FOR ALL WITH CHECK (true);

-- ─── transit_alerts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transit_alerts (
  alert_id   TEXT        PRIMARY KEY,
  header_text TEXT       NOT NULL,
  desc_text   TEXT       NOT NULL DEFAULT '',
  effect      TEXT       NOT NULL DEFAULT 'UNKNOWN_EFFECT',
  route_refs  TEXT[]     NOT NULL DEFAULT '{}',
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  url         TEXT,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transit_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read transit_alerts"
  ON public.transit_alerts FOR SELECT USING (true);
CREATE POLICY "Service role can write transit_alerts"
  ON public.transit_alerts FOR ALL WITH CHECK (true);
