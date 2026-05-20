-- Extend building_satellite_cache with 500m bbox area statistics
-- Computed by querying Titiler /cog/statistics over B08 + B04 bands
-- ndvi_area_mean : NDVI from mean(B08)/mean(B04) over the bbox (area-level)
-- ndvi_veg_pct   : estimated % of bbox pixels that are vegetated (NIR histogram threshold)

ALTER TABLE public.building_satellite_cache
  ADD COLUMN IF NOT EXISTS ndvi_area_mean   numeric(6,4),
  ADD COLUMN IF NOT EXISTS ndvi_veg_pct     numeric(5,1),
  ADD COLUMN IF NOT EXISTS b08_area_mean    numeric(10,2),
  ADD COLUMN IF NOT EXISTS b04_area_mean    numeric(10,2);
