-- Platform-level settings key/value store.
-- Only accessible via service-role (no public RLS policies).
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
-- No public policies: only server-side service-role client can read/write.

-- Default BKK rate-limit settings
INSERT INTO public.platform_settings (key, value) VALUES (
  'bkk_rate_limits',
  '{
    "cell_delay_ms":  3000,
    "retry_max":      3,
    "retry_wait_ms":  60000
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
