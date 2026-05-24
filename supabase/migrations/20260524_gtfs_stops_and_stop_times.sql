-- Standard GTFS stops table
-- Required as FK target for gtfs_stop_times.
-- Populated by the GTFS import job alongside gtfs_trips and gtfs_shapes.
CREATE TABLE IF NOT EXISTS public.gtfs_stops (
  stop_id              text             PRIMARY KEY,
  stop_name            text             NOT NULL,
  stop_lat             double precision NOT NULL,
  stop_lon             double precision NOT NULL,
  stop_code            text,
  stop_desc            text,
  zone_id              text,
  location_type        smallint,
  parent_station       text,
  wheelchair_boarding  smallint
);

CREATE INDEX IF NOT EXISTS idx_gtfs_stops_name ON public.gtfs_stops(stop_name);

-- Standard GTFS stop_times table (per-trip timetable)
-- When populated, this is the authoritative source for stop ordering and
-- departure times in the transit live-map panel (no direction deduplication
-- needed — every row is already direction-specific).
-- The transit shape API falls back to transit_stop_routes when this is empty.
CREATE TABLE IF NOT EXISTS public.gtfs_stop_times (
  trip_id              text             NOT NULL,
  stop_sequence        integer          NOT NULL,
  stop_id              text             NOT NULL REFERENCES public.gtfs_stops(stop_id) ON DELETE CASCADE,
  arrival_time         text,            -- HH:MM:SS (may exceed 24:00:00 for overnight trips)
  departure_time       text,            -- HH:MM:SS
  stop_headsign        text,
  pickup_type          smallint,
  drop_off_type        smallint,
  shape_dist_traveled  double precision,
  timepoint            smallint,
  PRIMARY KEY (trip_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_trip ON public.gtfs_stop_times(trip_id, stop_sequence);
CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_stop ON public.gtfs_stop_times(stop_id);
