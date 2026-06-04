-- Superadmin: platform_audit_events + profiles trial columns + features registry
-- Applied via /api/superadmin/apply-migrations (v0.9.31)

-- 1. Platform audit events
CREATE TABLE IF NOT EXISTS public.platform_audit_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    text,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_audit_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS platform_audit_events_created_at_idx ON public.platform_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS platform_audit_events_action_idx     ON public.platform_audit_events (action);

-- 2. Free trial columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_trial_start         timestamptz,
  ADD COLUMN IF NOT EXISTS free_trial_days          integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS free_trial_never_expires boolean NOT NULL DEFAULT false;

-- 3. Features registry
CREATE TABLE IF NOT EXISTS public.features (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  module      text NOT NULL DEFAULT 'general',
  route_path  text,
  menu_path   text,
  tier        text NOT NULL DEFAULT 'alap',
  enabled     boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS features_module_idx ON public.features (module);
CREATE INDEX IF NOT EXISTS features_tier_idx   ON public.features (tier);

-- 4. Seed initial features (idempotent)
INSERT INTO public.features (feature_key, name, description, module, route_path, menu_path, tier, sort_order) VALUES
  ('issue_report',       'Digitális hibabejelentés (korlátlan)', 'Hibabejelentések rögzítése és kezelése',     'issues',     '/w/:id/issues',              'Hibabejelentések',           'alap', 10),
  ('documents',          'Dokumentumtár + visszaigazolás',       'Dokumentumok feltöltése és visszaigazolása', 'documents',  '/w/:id/documents',           'Dokumentumok',               'alap', 20),
  ('meter_reading',      'Mérőóra-diktálás',                     'Mérőóra állásának rögzítése',                'meters',     '/w/:id/meters',              'Mérőórák',                   'alap', 30),
  ('notifications',      'Értesítések (app + push)',             'Push értesítések kezelése',                  'notify',     '/w/:id/notifications',       'Értesítések',                'alap', 40),
  ('assembly_calendar',  'Közgyűlési naptár',                    'Közgyűlések tervezése és nyilvántartása',    'assembly',   '/w/:id/assembly',            'Közgyűlés',                  'alap', 50),
  ('haus_radar',         'Ház Radar műszerfal',                  'Épület-adatok összesítő nézete',             'dashboard',  '/w/:id',                     'Dashboard',                  'alap', 60),
  ('finance_basic',      'Alapszintű pénzügyi átláthatóság',     'Pénzügyi áttekintő nézet',                  'finance',    '/w/:id/financials',          'Pénzügyek',                  'alap', 70),
  ('noise_reporter',     'Zajriporter',                          'Zajszennyezés mérése és riportálása',        'noise',      '/w/:id/zaj',                 'Zajriporter',                'alap', 80),
  ('transit',            'Közlekedés',                           'Tömegközlekedési információk',               'transit',    '/w/:id/kozlekedes',          'Közlekedés',                 'alap', 90),
  ('documents_unlimited','Korlátlan dokumentumfeltöltés (50 MB)','Nagy fájlok feltöltése',                     'documents',  '/w/:id/documents',           'Dokumentumok',               'pro',  25),
  ('accountant_access',  'Könyvelő hozzáférés',                  'Könyvelői szerepkör hozzáadása',             'settings',   '/w/:id/settings/users',      'Beállítások > Felhasználók', 'pro',  35),
  ('ai_issue_triage',    'AI hibabejelentés-triázs',             'Mesterséges intelligencia alapú priorizálás','issues',     '/w/:id/issues',              'Hibabejelentések',           'pro',  45),
  ('email_notifications','E-mail értesítések lakóknak',          'E-mail küldés az épület lakóinak',           'notify',     '/w/:id/notifications',       'Értesítések',                'pro',  55),
  ('finance_arrears',    'Pénzügyi hátralék-riport',             'Fizetési hátralék nyilvántartása',           'finance',    '/w/:id/financials/arrears',  'Pénzügyek > Hátralék',       'pro',  75),
  ('assembly_protocol',  'Közgyűlési protokoll generator',       'Közgyűlési protokoll automatikus generálása','assembly',   '/w/:id/assembly/protocol',   'Közgyűlés > Protokoll',      'pro',  85),
  ('supplier_db',        'Szállítói adatbázis',                  'Szállítók és megbízottak nyilvántartása',    'suppliers',  '/w/:id/suppliers',           'Szállítók',                  'pro',  95),
  ('priority_support',   'Prioritásos ügyfélszolgálat',          'Elsőbbségi ügyfélszolgálati hozzáférés',     'support',    NULL,                         'Támogatás',                  'pro', 100)
ON CONFLICT (feature_key) DO NOTHING;
