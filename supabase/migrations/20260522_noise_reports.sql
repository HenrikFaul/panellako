-- Feature 07: Zajbejelentő (Traffic Noise Reporter)
-- Noise reports table with category, severity, period, and health metadata

CREATE TYPE noise_category AS ENUM ('forgalmi_zaj', 'epitkezesi_zaj', 'szrakozohely_zaj', 'repulo_vonat', 'ipari_zaj', 'egyeb');
CREATE TYPE noise_period AS ENUM ('ejszaka', 'reggel', 'nappal', 'este');

CREATE TABLE IF NOT EXISTS public.noise_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category noise_category NOT NULL DEFAULT 'forgalmi_zaj',
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  period noise_period NOT NULL DEFAULT 'nappal',
  duration_minutes SMALLINT CHECK (duration_minutes BETWEEN 1 AND 480),
  estimated_db SMALLINT CHECK (estimated_db BETWEEN 30 AND 120),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT CHECK (char_length(description) <= 500),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_pattern TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_noise_reports_workspace ON public.noise_reports(workspace_id, occurred_at DESC);

ALTER TABLE public.noise_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read noise reports" ON public.noise_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert noise reports" ON public.noise_reports FOR INSERT WITH CHECK (true);
