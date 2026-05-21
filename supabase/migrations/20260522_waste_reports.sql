-- Feature 12 (waste): Hulladékgazdálkodás (Waste Management)
-- Monthly waste tracking + illegal dump reporting

CREATE TABLE IF NOT EXISTS public.waste_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  month DATE NOT NULL, -- first day of the month
  households_participating INTEGER CHECK (households_participating >= 0),
  paper_kg NUMERIC(6,2) DEFAULT 0,
  plastic_kg NUMERIC(6,2) DEFAULT 0,
  glass_kg NUMERIC(6,2) DEFAULT 0,
  organic_kg NUMERIC(6,2) DEFAULT 0,
  electronic_kg NUMERIC(6,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, month)
);

CREATE TABLE IF NOT EXISTS public.illegal_dump_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('butor', 'epitesi', 'kommunalis', 'veszelyes', 'egyeb')),
  description TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'uj' CHECK (status IN ('uj', 'folyamatban', 'megoldva')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waste_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read waste reports" ON public.waste_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert waste reports" ON public.waste_reports FOR INSERT WITH CHECK (true);

ALTER TABLE public.illegal_dump_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read dump reports" ON public.illegal_dump_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert dump reports" ON public.illegal_dump_reports FOR INSERT WITH CHECK (true);
