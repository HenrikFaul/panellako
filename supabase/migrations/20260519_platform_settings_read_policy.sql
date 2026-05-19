-- Allow public read of platform_settings so the anon key (used in sync route
-- when service role key is missing) can load BKK rate-limit config.
-- Values in this table (rate limits, tuneable config) are not sensitive.
CREATE POLICY IF NOT EXISTS "Public can read platform_settings"
  ON public.platform_settings FOR SELECT USING (true);
