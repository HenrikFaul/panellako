-- ============================================================
-- PANELLAKO — Missing table migrations
-- Generated: 2026-05-24
--
-- Paste this entire file into the Supabase SQL editor
-- (panellako project: wzromwxpjlyrqbdiapep) and run it.
-- All statements use IF NOT EXISTS / exception guards so it
-- is safe to re-run.
-- ============================================================

-- ── 1. gtfs_stops ────────────────────────────────────────────
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

-- ── 2. gtfs_stop_times ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gtfs_stop_times (
  trip_id              text             NOT NULL,
  stop_sequence        integer          NOT NULL,
  stop_id              text             NOT NULL REFERENCES public.gtfs_stops(stop_id) ON DELETE CASCADE,
  arrival_time         text,
  departure_time       text,
  stop_headsign        text,
  pickup_type          smallint,
  drop_off_type        smallint,
  shape_dist_traveled  double precision,
  timepoint            smallint,
  PRIMARY KEY (trip_id, stop_sequence)
);
CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_trip ON public.gtfs_stop_times(trip_id, stop_sequence);
CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_stop ON public.gtfs_stop_times(stop_id);

-- ── 3. building_public_services_cache ────────────────────────
CREATE TABLE IF NOT EXISTS public.building_public_services_cache (
  building_id   uuid        NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  postcode      text,
  services      jsonb       NOT NULL DEFAULT '{}',
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (building_id)
);
ALTER TABLE public.building_public_services_cache ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated can read public services cache"
    ON public.building_public_services_cache FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role can write public services cache"
    ON public.building_public_services_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. noise_reports ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE noise_category AS ENUM (
    'forgalmi_zaj','epitkezesi_zaj','szrakozohely_zaj',
    'repulo_vonat','ipari_zaj','egyeb'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE noise_period AS ENUM ('ejszaka','reggel','nappal','este');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.noise_reports (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid          NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  reporter_id      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  category         noise_category NOT NULL DEFAULT 'forgalmi_zaj',
  severity         smallint      NOT NULL CHECK (severity BETWEEN 1 AND 5),
  period           noise_period  NOT NULL DEFAULT 'nappal',
  duration_minutes smallint      CHECK (duration_minutes BETWEEN 1 AND 480),
  estimated_db     smallint      CHECK (estimated_db BETWEEN 30 AND 120),
  occurred_at      timestamptz   NOT NULL DEFAULT now(),
  description      text          CHECK (char_length(description) <= 500),
  is_recurring     boolean       NOT NULL DEFAULT false,
  recurring_pattern text,
  created_at       timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_noise_reports_workspace
  ON public.noise_reports(workspace_id, occurred_at DESC);
ALTER TABLE public.noise_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can read noise reports"
    ON public.noise_reports FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can insert noise reports"
    ON public.noise_reports FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. waste_reports + illegal_dump_reports ───────────────────
CREATE TABLE IF NOT EXISTS public.waste_reports (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            uuid        NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  reporter_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  month                   date        NOT NULL,
  households_participating integer    CHECK (households_participating >= 0),
  paper_kg                numeric(6,2) DEFAULT 0,
  plastic_kg              numeric(6,2) DEFAULT 0,
  glass_kg                numeric(6,2) DEFAULT 0,
  organic_kg              numeric(6,2) DEFAULT 0,
  electronic_kg           numeric(6,2) DEFAULT 0,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, month)
);
ALTER TABLE public.waste_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can read waste reports"
    ON public.waste_reports FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can insert waste reports"
    ON public.waste_reports FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.illegal_dump_reports (
  id           uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid   NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  reporter_id  uuid   REFERENCES auth.users(id) ON DELETE SET NULL,
  category     text   NOT NULL CHECK (category IN ('butor','epitesi','kommunalis','veszelyes','egyeb')),
  description  text,
  lat          double precision,
  lon          double precision,
  status       text   NOT NULL DEFAULT 'uj' CHECK (status IN ('uj','folyamatban','megoldva')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.illegal_dump_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can read dump reports"
    ON public.illegal_dump_reports FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can insert dump reports"
    ON public.illegal_dump_reports FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Done ──────────────────────────────────────────────────────
SELECT 'All missing tables created successfully.' AS result;
