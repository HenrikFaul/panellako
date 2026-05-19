-- GTFS trips table
-- Stores the full trips.txt data. Also used as the in-memory intermediate for
-- deriving transit_stop_routes from stop_times.txt.

CREATE TABLE IF NOT EXISTS public.gtfs_trips (
  trip_id               TEXT     PRIMARY KEY,
  route_id              TEXT     NOT NULL,
  service_id            TEXT     NOT NULL,
  trip_headsign         TEXT,
  direction_id          SMALLINT,
  block_id              TEXT,
  shape_id              TEXT,
  wheelchair_accessible SMALLINT,
  bikes_allowed         SMALLINT
);

CREATE INDEX IF NOT EXISTS idx_gtfs_trips_route_id
  ON public.gtfs_trips (route_id);

CREATE INDEX IF NOT EXISTS idx_gtfs_trips_service_id
  ON public.gtfs_trips (service_id);

ALTER TABLE public.gtfs_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gtfs_trips"
  ON public.gtfs_trips FOR SELECT USING (true);
CREATE POLICY "API can write gtfs_trips"
  ON public.gtfs_trips FOR ALL WITH CHECK (true);
