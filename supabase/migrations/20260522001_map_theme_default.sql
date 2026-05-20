-- Insert default map_theme setting (dark) if not already present.
-- Admins change this via the superadmin panel → PATCH /api/superadmin/settings.
INSERT INTO public.platform_settings (key, value)
VALUES ('map_theme', '{"id": "dark"}')
ON CONFLICT (key) DO NOTHING;
