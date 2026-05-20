-- =============================================================================
-- Migration:  20260520_ndvi_hungary_renders.sql
-- Date:       2026-05-20
-- Title:      Magyarország-szintű Sentinel-2 NDVI mozaik render-ek tárolása
-- Version:    v0.7.2
-- -----------------------------------------------------------------------------
-- Egyszerre 4 felbontásban előrenderelt PNG-eket tárolunk a `ndvi-maps`
-- bucketben.  Egy `ndvi_hungary_renders` rekord = egy lefuttatott job.
-- A felhasználói felületi kép a legutolsó `status='success'` rekord URL-jeire
-- mutat — a felhasználó soha nem fut le élő képfeldolgozást.
-- =============================================================================

create table if not exists public.ndvi_hungary_renders (
  id                  bigserial primary key,
  run_id              uuid not null default gen_random_uuid() unique,
  status              text not null default 'queued'
                      check (status in ('queued','running','success','failure','partial')),
  source_provider     text,                       -- 'sentinel-hub', 'earth-search-stac'
  source_satellite    text,                       -- 'Sentinel-2 L2A'
  source_scene_ids    text[],                     -- a felhasznált Sentinel-2 tile/scene azonosítók
  acquisition_from    timestamptz,                -- a kért időablak kezdete
  acquisition_to      timestamptz,                -- a kért időablak vége (mosaic = több scene)
  acquisition_latest  timestamptz,                -- a legutolsó scene capture-időpontja (megjelenítésre)
  cloud_cover_pct     numeric(5,2),               -- max engedett felhő %
  bbox                jsonb not null,             -- [minLon, minLat, maxLon, maxLat]
  resolutions         jsonb not null default '{}'::jsonb,
                      -- {
                      --   "large":              { "width": int, "height": int, "storage_path": str, "url": str, "bytes": int },
                      --   "very_large":         { ... },
                      --   "very_very_large":    { ... },
                      --   "very_very_very_very_large": { ... }
                      -- }
  started_at          timestamptz not null default now(),
  finished_at         timestamptz,
  duration_ms         int,
  error_message       text,
  triggered_by        text,                       -- admin email vagy 'cron'
  total_bytes         bigint,
  pu_consumed         numeric(10,2)               -- Sentinel Hub processing units
);

create index if not exists ndvi_hungary_renders_status_started
  on public.ndvi_hungary_renders (status, started_at desc);
create index if not exists ndvi_hungary_renders_finished
  on public.ndvi_hungary_renders (finished_at desc) where status = 'success';

-- Convenience view: legutolsó sikeres render
create or replace view public.ndvi_hungary_latest as
select *
  from public.ndvi_hungary_renders
 where status = 'success'
 order by acquisition_latest desc nulls last, finished_at desc nulls last
 limit 1;

-- RLS: anyone may read finished renders (publicly displayed image);
-- only service_role writes.
alter table public.ndvi_hungary_renders enable row level security;

drop policy if exists "anon can read finished ndvi hungary renders" on public.ndvi_hungary_renders;
create policy "anon can read finished ndvi hungary renders"
  on public.ndvi_hungary_renders for select
  to anon, authenticated
  using (status = 'success');

-- Storage bucket: ndvi-maps (idempotent insert).  Public read = true so the
-- frontend can simply <img src="https://<project>.supabase.co/storage/v1/
-- object/public/ndvi-maps/<run_id>/<resolution>.png" />.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ndvi-maps',
  'ndvi-maps',
  true,
  524288000,                                    -- 500 MB max (a legnagyobb felbontásra van fenntartva)
  array['image/png','image/webp','image/jpeg']
)
on conflict (id) do nothing;

-- Storage policies: only service_role writes; public reads.
drop policy if exists "ndvi-maps public read" on storage.objects;
create policy "ndvi-maps public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'ndvi-maps');

drop policy if exists "ndvi-maps service role write" on storage.objects;
create policy "ndvi-maps service role write"
  on storage.objects for all
  to service_role
  using (bucket_id = 'ndvi-maps')
  with check (bucket_id = 'ndvi-maps');
