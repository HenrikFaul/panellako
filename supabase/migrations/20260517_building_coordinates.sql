-- Add geocoded coordinates to buildings so TransportPanel can use the real address location.
-- Nominatim geocodes the address text on first dashboard load; results are stored here
-- so subsequent loads skip the geocoding round-trip.

ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS lat          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lon          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at  TIMESTAMPTZ;

-- RLS: existing policies already cover buildings; no new policy needed.
-- Any authenticated member of the building can read its own row (public read policy).
