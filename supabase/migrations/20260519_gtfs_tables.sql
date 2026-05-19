-- GTFS supplementary tables
-- Feed info, calendar exceptions, pathways, shapes, and translations.
-- All tables allow public read and anon/service-role write via RLS.

-- ─── gtfs_feed_info ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gtfs_feed_info (
  feed_id        TEXT        PRIMARY KEY,
  publisher_name TEXT        NOT NULL DEFAULT '',
  publisher_url  TEXT        NOT NULL DEFAULT '',
  lang           TEXT        NOT NULL DEFAULT 'hu',
  start_date     DATE,
  end_date       DATE,
  version        TEXT,
  imported_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gtfs_feed_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gtfs_feed_info"
  ON public.gtfs_feed_info FOR SELECT USING (true);
CREATE POLICY "API can write gtfs_feed_info"
  ON public.gtfs_feed_info FOR ALL WITH CHECK (true);

-- ─── gtfs_calendar_dates ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gtfs_calendar_dates (
  service_id     TEXT     NOT NULL,
  date           DATE     NOT NULL,
  exception_type SMALLINT NOT NULL,  -- 1=added, 2=removed
  PRIMARY KEY (service_id, date)
);

ALTER TABLE public.gtfs_calendar_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gtfs_calendar_dates"
  ON public.gtfs_calendar_dates FOR SELECT USING (true);
CREATE POLICY "API can write gtfs_calendar_dates"
  ON public.gtfs_calendar_dates FOR ALL WITH CHECK (true);

-- ─── gtfs_pathways ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gtfs_pathways (
  pathway_id       TEXT     PRIMARY KEY,
  pathway_mode     SMALLINT NOT NULL,            -- 1=walkway,2=stairs,5=elevator etc.
  is_bidirectional SMALLINT NOT NULL DEFAULT 1,
  from_stop_id     TEXT     NOT NULL,
  to_stop_id       TEXT     NOT NULL,
  traversal_time   INTEGER                       -- seconds, nullable
);

ALTER TABLE public.gtfs_pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gtfs_pathways"
  ON public.gtfs_pathways FOR SELECT USING (true);
CREATE POLICY "API can write gtfs_pathways"
  ON public.gtfs_pathways FOR ALL WITH CHECK (true);

-- ─── gtfs_shapes ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gtfs_shapes (
  shape_id      TEXT             NOT NULL,
  pt_sequence   INTEGER          NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lon           DOUBLE PRECISION NOT NULL,
  dist_traveled DOUBLE PRECISION,
  PRIMARY KEY (shape_id, pt_sequence)
);

CREATE INDEX IF NOT EXISTS idx_gtfs_shapes_shape_id
  ON public.gtfs_shapes (shape_id);

ALTER TABLE public.gtfs_shapes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gtfs_shapes"
  ON public.gtfs_shapes FOR SELECT USING (true);
CREATE POLICY "API can write gtfs_shapes"
  ON public.gtfs_shapes FOR ALL WITH CHECK (true);

-- ─── gtfs_translations ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gtfs_translations (
  table_name   TEXT NOT NULL,
  field_name   TEXT NOT NULL,
  language     TEXT NOT NULL,
  translation  TEXT NOT NULL,
  field_value  TEXT,
  PRIMARY KEY (table_name, field_name, language, translation)
);

ALTER TABLE public.gtfs_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gtfs_translations"
  ON public.gtfs_translations FOR SELECT USING (true);
CREATE POLICY "API can write gtfs_translations"
  ON public.gtfs_translations FOR ALL WITH CHECK (true);
