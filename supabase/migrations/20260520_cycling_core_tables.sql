-- =============================================================================
-- Migration:  20260520_cycling_core_tables.sql
-- Date:       2026-05-20
-- Title:      Cycling-data domain — core tables, indexes, RLS, MV, RPCs, seed
-- Version:    v0.7.1
-- Spec ref:   cycling-data-sources/00b_SUPABASE_BACKEND.md § 4, § 5.2, § 7
-- -----------------------------------------------------------------------------
-- Purpose: create every persistent object the cycling-data ETL pipelines and
-- the public cycling API need:
--   * the `cycling.source` registry seeded with the 9 production feeds
--   * master route / way / poi tables and the SCD2 publish_state row
--   * GBFS station_information and pg_partman-partitioned station_status
--   * KENYI, MTSZ, BKK infra, bicycle-parking, ETL audit tables
--   * GIST / GIN / BRIN / btree indexes
--   * `cycling.route_master` materialized view + supporting RPCs
--   * public.cycling_mvt(z,x,y) tile RPC
--   * row-level security policies (public read where appropriate, ETL tables
--     restricted to service_role)
-- =============================================================================


-- =============================================================================
-- 1. Source registry
-- =============================================================================

create table if not exists cycling.source (
  id              text primary key,
  display_name    text not null,
  license         text not null,
  attribution     text,
  priority        int  not null default 50,
  is_active       boolean not null default true,
  fetch_cadence   interval,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  config          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);


-- =============================================================================
-- 2. Master route + way + poi
-- =============================================================================

create table if not exists cycling.route (
  id            uuid primary key default gen_random_uuid(),
  master_id     uuid not null,
  source_id     text not null references cycling.source(id) on delete cascade,
  external_id   text not null,
  name          text,
  geom          geometry(LineString, 4326) not null,
  length_m      numeric generated always as (ST_Length(geom::geography)) stored,
  tags          jsonb not null default '{}'::jsonb,
  valid_from    timestamptz not null default now(),
  valid_to      timestamptz,
  fetched_at    timestamptz not null,
  data_version  text not null,
  unique (source_id, external_id, valid_from)
);

create index if not exists route_geom_gist on cycling.route using gist (geom);
-- The btree on master_id was originally named `route_master`, which collides
-- with the materialized view `cycling.route_master` declared later in this
-- file (Postgres puts indexes, tables and MVs in the same per-schema
-- namespace). Drop any leftover conflicting index from a partial previous
-- run, then recreate under a non-colliding name.
drop index if exists cycling.route_master;
create index if not exists route_master_id_idx on cycling.route (master_id);
create index if not exists route_source    on cycling.route (source_id);
create index if not exists route_external  on cycling.route (external_id);
create index if not exists route_tags_gin  on cycling.route using gin (tags);

-- Geometry-hash → master_id dedup table
create table if not exists cycling.dedup (
  geom_hash       text primary key,
  master_route_id uuid not null,
  created_at      timestamptz not null default now()
);
create index if not exists dedup_master_id on cycling.dedup (master_route_id);

-- Linear cycling infrastructure (per-source raw ways, e.g. OSM ways)
create table if not exists cycling.way (
  id                  uuid primary key default gen_random_uuid(),
  master_id           uuid,
  source_id           text not null references cycling.source(id) on delete cascade,
  external_id         text not null,
  osm_id              bigint,
  infrastructure_type text,
  oneway              boolean,
  surface             text,
  name                text,
  geom                geometry(LineString, 4326) not null,
  length_m            numeric generated always as (ST_Length(geom::geography)) stored,
  tags                jsonb not null default '{}'::jsonb,
  valid_from          timestamptz not null default now(),
  valid_to            timestamptz,
  fetched_at          timestamptz not null,
  data_version        text not null,
  unique (source_id, external_id, valid_from)
);
create index if not exists way_geom_gist on cycling.way using gist (geom);
create index if not exists way_master    on cycling.way (master_id);
create index if not exists way_source    on cycling.way (source_id);
create index if not exists way_external  on cycling.way (external_id);
create index if not exists way_osm_id    on cycling.way (osm_id);
create index if not exists way_tags_gin  on cycling.way using gin (tags);

-- Point-of-interest (rest area, repair station, viewpoint, water tap, etc.)
create table if not exists cycling.poi (
  id            uuid primary key default gen_random_uuid(),
  source_id     text not null references cycling.source(id) on delete cascade,
  external_id   text not null,
  category      text not null,
  name          text,
  geom          geometry(Point, 4326) not null,
  tags          jsonb not null default '{}'::jsonb,
  valid_from    timestamptz not null default now(),
  valid_to      timestamptz,
  fetched_at    timestamptz not null,
  data_version  text not null,
  unique (source_id, external_id, valid_from)
);
create index if not exists poi_geom_gist on cycling.poi using gist (geom);
create index if not exists poi_category  on cycling.poi (category);
create index if not exists poi_source    on cycling.poi (source_id);
create index if not exists poi_tags_gin  on cycling.poi using gin (tags);

-- Single-row publish state for atomic rollback
create table if not exists cycling.publish_state (
  id              int primary key default 1,
  current_version text not null,
  updated_at      timestamptz not null default now(),
  check (id = 1)
);


-- =============================================================================
-- 3. GBFS (BKK MOL Bubi)
-- =============================================================================

create table if not exists gbfs.station_information (
  station_id   text primary key,
  name         text not null,
  lat          double precision not null,
  lon          double precision not null,
  capacity     int,
  region_id    text,
  attributes   jsonb not null default '{}'::jsonb,
  valid_from   timestamptz not null default now(),
  valid_to     timestamptz
);
create index if not exists station_info_attrs_gin on gbfs.station_information using gin (attributes);

-- Partitioned (range on ts) — pg_partman creates monthly partitions
create table if not exists gbfs.station_status (
  station_id          text not null,
  ts                  timestamptz not null,
  num_bikes_available int  not null,
  num_docks_available int  not null,
  is_renting          boolean not null,
  is_returning        boolean not null,
  last_reported       timestamptz,
  primary key (station_id, ts)
) partition by range (ts);

-- pg_partman setup — wrapped in do-block so re-running the migration is safe
do $$
begin
  if not exists (
    select 1 from partman.part_config where parent_table = 'gbfs.station_status'
  ) then
    perform partman.create_parent(
      p_parent_table => 'gbfs.station_status',
      p_control      => 'ts',
      p_type         => 'native',
      p_interval     => 'monthly',
      p_premake      => 3
    );

    update partman.part_config
       set retention = '90 days',
           retention_keep_table = false
     where parent_table = 'gbfs.station_status';
  end if;
exception
  when undefined_table or undefined_function or invalid_schema_name then
    raise notice 'pg_partman not available — skipping partition setup';
end
$$;

create index if not exists station_status_ts_brin on gbfs.station_status using brin (ts);
create index if not exists station_status_station on gbfs.station_status (station_id, ts desc);


-- =============================================================================
-- 4. KENYI (Magyar Közút) — SCD2
-- =============================================================================

create table if not exists kenyi.section (
  id            uuid primary key default gen_random_uuid(),
  source_id     text not null references cycling.source(id) on delete cascade,
  external_id   text not null,
  road_number   text,
  name          text,
  geom          geometry(LineString, 4326),
  attributes    jsonb not null default '{}'::jsonb,
  snapshot_id   bigint,
  valid_from    timestamptz not null default now(),
  valid_to      timestamptz,
  unique (source_id, external_id, valid_from)
);
create index if not exists kenyi_section_geom_gist on kenyi.section using gist (geom);
create index if not exists kenyi_section_source    on kenyi.section (source_id);
create index if not exists kenyi_section_external  on kenyi.section (external_id);
create index if not exists kenyi_section_attrs_gin on kenyi.section using gin (attributes);

create table if not exists kenyi.snapshot (
  id           bigserial primary key,
  source_uri   text not null,
  sha256       text not null,
  imported_at  timestamptz not null default now(),
  row_count    int,
  notes        text
);


-- =============================================================================
-- 5. MTSZ (Természetjáró)
-- =============================================================================

create table if not exists mtsz.tour (
  id            uuid primary key default gen_random_uuid(),
  source_id     text not null references cycling.source(id) on delete cascade,
  external_id   text not null,
  name          text,
  difficulty    text,
  length_m      numeric,
  geom          geometry(LineString, 4326),
  tags          jsonb not null default '{}'::jsonb,
  valid_from    timestamptz not null default now(),
  valid_to      timestamptz,
  fetched_at    timestamptz not null default now(),
  unique (source_id, external_id, valid_from)
);
create index if not exists mtsz_tour_geom_gist on mtsz.tour using gist (geom);
create index if not exists mtsz_tour_source    on mtsz.tour (source_id);
create index if not exists mtsz_tour_external  on mtsz.tour (external_id);
create index if not exists mtsz_tour_tags_gin  on mtsz.tour using gin (tags);


-- =============================================================================
-- 6. BKK infrastructure (Budapest-only)
-- =============================================================================

create table if not exists bkk_infra.way (
  id                  uuid primary key default gen_random_uuid(),
  source_id           text not null references cycling.source(id) on delete cascade,
  external_id         text not null,
  infrastructure_type text,
  name                text,
  geom                geometry(LineString, 4326) not null,
  length_m            numeric generated always as (ST_Length(geom::geography)) stored,
  tags                jsonb not null default '{}'::jsonb,
  valid_from          timestamptz not null default now(),
  valid_to            timestamptz,
  fetched_at          timestamptz not null default now(),
  unique (source_id, external_id, valid_from)
);
create index if not exists bkk_infra_way_geom_gist on bkk_infra.way using gist (geom);
create index if not exists bkk_infra_way_source    on bkk_infra.way (source_id);
create index if not exists bkk_infra_way_external  on bkk_infra.way (external_id);
create index if not exists bkk_infra_way_tags_gin  on bkk_infra.way using gin (tags);


-- =============================================================================
-- 7. Bicycle parking
-- =============================================================================

create table if not exists bicycle_parking.point (
  id            uuid primary key default gen_random_uuid(),
  source_id     text not null references cycling.source(id) on delete cascade,
  external_id   text not null,
  geom          geometry(Point, 4326) not null,
  capacity      int,
  covered       boolean,
  lock_type     text,
  source        text,
  tags          jsonb not null default '{}'::jsonb,
  valid_from    timestamptz not null default now(),
  valid_to      timestamptz,
  fetched_at    timestamptz not null default now(),
  unique (source_id, external_id, valid_from)
);
create index if not exists bicycle_parking_point_geom_gist on bicycle_parking.point using gist (geom);
create index if not exists bicycle_parking_point_source    on bicycle_parking.point (source_id);
create index if not exists bicycle_parking_point_external  on bicycle_parking.point (external_id);
create index if not exists bicycle_parking_point_tags_gin  on bicycle_parking.point using gin (tags);


-- =============================================================================
-- 8. ETL meta — job runs, feed etags, parse errors, admin audit
-- =============================================================================

create table if not exists etl_meta.job_run (
  id            bigserial primary key,
  source_id     text not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null check (status in ('queued','running','success','failure','partial')),
  rows_in       int,
  rows_out      int,
  rows_rejected int,
  snapshot_uri  text,
  error_message text,
  trigger       text not null
);
create index if not exists job_run_source_started on etl_meta.job_run (source_id, started_at desc);
create index if not exists job_run_status         on etl_meta.job_run (status);

create table if not exists etl_meta.feed_etag (
  feed          text primary key,
  etag          text,
  last_modified text,
  updated_at    timestamptz not null default now()
);

create table if not exists etl_meta.parse_error (
  id             bigserial primary key,
  source_id      text not null,
  raw_record     jsonb,
  error_message  text not null,
  created_at     timestamptz not null default now()
);
create index if not exists parse_error_source on etl_meta.parse_error (source_id, created_at desc);

create table if not exists etl_meta.admin_audit (
  id          bigserial primary key,
  actor       text not null,
  action      text not null,
  target      text,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_actor on etl_meta.admin_audit (actor, created_at desc);


-- =============================================================================
-- 9. pgmq job queue (idempotent)
-- =============================================================================

do $$
begin
  perform pgmq.create('cycling_jobs');
exception
  when undefined_function or invalid_schema_name then
    raise notice 'pgmq not available — skipping queue creation';
  when others then
    -- queue already exists
    null;
end
$$;


-- =============================================================================
-- 10. Helpers: source_priority + cycling.route_master materialized view
-- =============================================================================

create or replace function public.source_priority(p_source_id text)
returns int
language sql stable as $$
  select coalesce(priority, 0) from cycling.source where id = p_source_id;
$$;

-- Master view: highest-priority current row per master_id, geometry as
-- multi-linestring + a single merged linestring for tile rendering.
create materialized view if not exists cycling.route_master as
with ranked as (
  select
    r.*,
    public.source_priority(r.source_id) as src_priority,
    row_number() over (
      partition by r.master_id
      order by public.source_priority(r.source_id) desc, r.fetched_at desc
    ) as rn
  from cycling.route r
  where r.valid_to is null
)
select
  master_id                                                       as id,
  master_id,
  name,
  ST_Multi(ST_Collect(geom))                                      as geom_multi,
  ST_LineMerge(ST_Collect(geom))                                  as geom_merged,
  jsonb_agg(distinct jsonb_build_object(
    'source_id',   source_id,
    'external_id', external_id,
    'priority',    src_priority
  ))                                                              as sources,
  max(fetched_at)                                                 as last_fetched_at
from ranked
where rn = 1
group by master_id, name;

create unique index if not exists route_master_master_id_uidx
  on cycling.route_master (master_id);
create index if not exists route_master_geom_gist
  on cycling.route_master using gist (geom_merged);


-- =============================================================================
-- 11. cycling.upsert_route — idempotent SCD2 upsert (spec § 5.2)
-- =============================================================================

create or replace function cycling.upsert_route(
  p_source_id     text,
  p_external_id   text,
  p_name          text,
  p_geom          geometry,
  p_tags          jsonb,
  p_fetched_at    timestamptz,
  p_data_version  text
) returns uuid
language plpgsql as $$
declare
  v_existing      cycling.route%rowtype;
  v_geom_hash     text;
  v_master_id     uuid;
  v_new_id        uuid;
begin
  -- Hash the geometry for dedup lookup
  v_geom_hash := encode(digest(ST_AsBinary(ST_SnapToGrid(p_geom, 0.00001)), 'sha256'), 'hex');

  -- Resolve master_id via dedup table; create new if not seen before
  select master_route_id into v_master_id
    from cycling.dedup
   where geom_hash = v_geom_hash;

  if v_master_id is null then
    v_master_id := gen_random_uuid();
    insert into cycling.dedup (geom_hash, master_route_id)
      values (v_geom_hash, v_master_id)
      on conflict (geom_hash) do update
        set master_route_id = excluded.master_route_id
      returning master_route_id into v_master_id;
  end if;

  -- Look for the current open SCD2 row for this (source, external_id)
  select * into v_existing
    from cycling.route
   where source_id = p_source_id
     and external_id = p_external_id
     and valid_to is null
   order by valid_from desc
   limit 1;

  if found then
    -- Skip if geometry / name / tags are identical
    if ST_Equals(v_existing.geom, p_geom)
       and coalesce(v_existing.name, '') = coalesce(p_name, '')
       and v_existing.tags = p_tags
    then
      return v_existing.id;
    end if;

    -- Close the previous version
    update cycling.route
       set valid_to = p_fetched_at
     where id = v_existing.id;
  end if;

  insert into cycling.route (
    master_id, source_id, external_id, name, geom, tags,
    valid_from, fetched_at, data_version
  ) values (
    v_master_id, p_source_id, p_external_id, p_name, p_geom, p_tags,
    p_fetched_at, p_fetched_at, p_data_version
  )
  returning id into v_new_id;

  return v_new_id;
end
$$;


-- =============================================================================
-- 12. public.cycling_mvt(z,x,y) — vector tile RPC (spec § 7)
-- =============================================================================

create or replace function public.cycling_mvt(z int, x int, y int)
returns bytea
language plpgsql stable as $$
declare
  result bytea;
begin
  select ST_AsMVT(tile, 'cycling_routes', 4096, 'geom')
    into result
  from (
    select
      master_id::text                                as id,
      name,
      (sources->0->>'priority')::int                 as priority,
      ST_AsMVTGeom(
        ST_Transform(geom_merged, 3857),
        ST_TileEnvelope(z, x, y),
        4096, 64, true
      )                                              as geom
    from cycling.route_master
    where geom_merged && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
  ) as tile
  where tile.geom is not null;

  return result;
end
$$;


-- =============================================================================
-- 13. Row-level security
-- =============================================================================

-- cycling.source — public read of active sources, write only by service_role
alter table cycling.source enable row level security;
drop policy if exists "anon can read cycling sources" on cycling.source;
create policy "anon can read cycling sources"
  on cycling.source for select
  to anon, authenticated
  using (is_active = true);

-- cycling.route — public read of currently-valid rows
alter table cycling.route enable row level security;
drop policy if exists "anon can read cycling routes" on cycling.route;
create policy "anon can read cycling routes"
  on cycling.route for select
  to anon, authenticated
  using (valid_to is null);

-- cycling.way — public read of currently-valid rows
alter table cycling.way enable row level security;
drop policy if exists "anon can read cycling ways" on cycling.way;
create policy "anon can read cycling ways"
  on cycling.way for select
  to anon, authenticated
  using (valid_to is null);

-- cycling.poi — public read of currently-valid rows
alter table cycling.poi enable row level security;
drop policy if exists "anon can read cycling pois" on cycling.poi;
create policy "anon can read cycling pois"
  on cycling.poi for select
  to anon, authenticated
  using (valid_to is null);

-- cycling.dedup — internal mapping; service_role only
alter table cycling.dedup enable row level security;

-- cycling.publish_state — read by anon/authenticated, write by service_role
alter table cycling.publish_state enable row level security;
drop policy if exists "anon can read publish state" on cycling.publish_state;
create policy "anon can read publish state"
  on cycling.publish_state for select
  to anon, authenticated
  using (true);

-- gbfs.station_information — public read
alter table gbfs.station_information enable row level security;
drop policy if exists "anon can read gbfs station info" on gbfs.station_information;
create policy "anon can read gbfs station info"
  on gbfs.station_information for select
  to anon, authenticated
  using (valid_to is null);

-- gbfs.station_status — public read (no valid_to column)
alter table gbfs.station_status enable row level security;
drop policy if exists "anon can read gbfs station status" on gbfs.station_status;
create policy "anon can read gbfs station status"
  on gbfs.station_status for select
  to anon, authenticated
  using (true);

-- kenyi.section — public read of currently-valid rows
alter table kenyi.section enable row level security;
drop policy if exists "anon can read kenyi sections" on kenyi.section;
create policy "anon can read kenyi sections"
  on kenyi.section for select
  to anon, authenticated
  using (valid_to is null);

-- kenyi.snapshot — internal; service_role only
alter table kenyi.snapshot enable row level security;

-- mtsz.tour — public read of currently-valid rows
alter table mtsz.tour enable row level security;
drop policy if exists "anon can read mtsz tours" on mtsz.tour;
create policy "anon can read mtsz tours"
  on mtsz.tour for select
  to anon, authenticated
  using (valid_to is null);

-- bkk_infra.way — public read of currently-valid rows
alter table bkk_infra.way enable row level security;
drop policy if exists "anon can read bkk infra ways" on bkk_infra.way;
create policy "anon can read bkk infra ways"
  on bkk_infra.way for select
  to anon, authenticated
  using (valid_to is null);

-- bicycle_parking.point — public read of currently-valid rows
alter table bicycle_parking.point enable row level security;
drop policy if exists "anon can read bicycle parking" on bicycle_parking.point;
create policy "anon can read bicycle parking"
  on bicycle_parking.point for select
  to anon, authenticated
  using (valid_to is null);

-- etl_meta.* — service_role only (RLS on, no policies for anon/authenticated)
alter table etl_meta.job_run     enable row level security;
alter table etl_meta.feed_etag   enable row level security;
alter table etl_meta.parse_error enable row level security;
alter table etl_meta.admin_audit enable row level security;


-- =============================================================================
-- 14. Seed cycling.source — 9 production feeds (idempotent)
-- =============================================================================

insert into cycling.source (id, display_name, license, attribution, priority, is_active, fetch_cadence, config)
values
  ('osm-hu',           'OpenStreetMap HU (Geofabrik)',          'ODbL',           'OpenStreetMap contributors',                   100, true,  interval '1 hour',  '{"region":"hungary","feed":"minutely-diff"}'),
  ('osm-planet',       'OpenStreetMap planet (alias)',          'ODbL',           'OpenStreetMap contributors',                   100, false, interval '7 days',  '{"note":"alias / not active by default"}'),
  ('waymarkedtrails',  'Cycling Waymarked Trails',              'ODbL',           'Waymarked Trails / Sarah Hoffmann',             80, true,  interval '1 day',   '{}'),
  ('bkk-gbfs-status',  'BKK MOL Bubi GBFS station_status',      'open',           'BKK Zrt. / MOL Bubi',                           95, true,  interval '1 minute','{"endpoint":"https://gbfs.bubi.bkk.hu/gbfs/v3/station_status.json"}'),
  ('bkk-gbfs-info',    'BKK MOL Bubi GBFS station_information', 'open',           'BKK Zrt. / MOL Bubi',                           95, true,  interval '1 day',   '{"endpoint":"https://gbfs.bubi.bkk.hu/gbfs/v3/station_information.json"}'),
  ('bkk-infra',        'BKK cycling infrastructure layer',      'open',           'BKK Zrt.',                                      90, true,  interval '7 days',  '{"runner":"fly.io"}'),
  ('bkk-portal',       'BKK Biciklivel Budapesten portal',      'open',           'BKK Zrt.',                                      85, true,  interval '7 days',  '{}'),
  ('kenyi',            'Magyar Közút KENYI',                    'kozadat',        'Magyar Közút Nonprofit Zrt.',                  100, true,  interval '90 days', '{"ingestion":"manual-foia"}'),
  ('kormany-diff',     'kormany.hu PDF hash-diff detector',     'kozadat',        'Magyarország Kormánya',                         70, true,  interval '30 days', '{"mode":"change-detector"}'),
  ('termeszetjaro',    'Természetjáró (MTSZ)',                  'PR-required',    'Magyar Természetjáró Szövetség',                90, false, interval '7 days',  '{"requires":"partnership-agreement"}'),
  ('bicikliparkolo',   'Bicikliparkoló kereső',                 'mixed',          'bicikliparkolo.hu + OSM amenity=bicycle_parking',75, true, interval '30 days', '{}')
on conflict (id) do nothing;
