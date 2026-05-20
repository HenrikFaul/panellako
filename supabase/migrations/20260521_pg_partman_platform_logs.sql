-- ============================================================
-- v0.8.0 — pg_partman monthly partitioning of platform_job_logs
--
-- Today `platform_job_logs` is an unbounded heap (see
-- 20260519_platform_job_logs.sql). Job-runner writes a row per cron
-- tick × per job; at 11+ scheduled jobs this would dominate the DB
-- footprint within 60–90 days. Partitioning enables cheap range scans
-- and automated retention (drop old partitions instead of DELETE).
--
-- IMPORTANT: the existing schema is
--   id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
--   job_id       TEXT NOT NULL
--   triggered_by TEXT NOT NULL DEFAULT 'manual'
--   status       TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','error','partial'))
--   result       JSONB
--   started_at   TIMESTAMPTZ NOT NULL DEFAULT now()
--   finished_at  TIMESTAMPTZ
--
-- The partitioned table preserves this schema exactly. The PK is changed
-- from `(id)` to `(id, started_at)` because Postgres requires every
-- partition-key column to be part of every UNIQUE constraint on the
-- partitioned table — this is the only safe way to keep the UUID PK.
--
-- ASSUMPTION: pg_partman extension is installed (the spec in
-- cycling-data-sources/00b_SUPABASE_BACKEND.md lists it among the
-- required extensions, and the audit explicitly recommends enabling it
-- as part of Tier 1). The migration is wrapped in an outer exception
-- handler that skips cleanly if pg_partman is unavailable, so an
-- environment without the extension simply keeps the unbounded table.
-- ============================================================

do $$
declare
  v_is_partitioned boolean;
  v_partman_available boolean := false;
begin
  -- Check whether pg_partman is installed (look for the partman schema)
  select exists (select 1 from pg_namespace where nspname = 'partman')
    into v_partman_available;

  if not v_partman_available then
    raise notice 'pg_partman not installed — keeping platform_job_logs as a regular heap';
    return;
  end if;

  -- Already partitioned? bail
  select pg_class.relkind = 'p' into v_is_partitioned
  from pg_class
  where relname = 'platform_job_logs'
    and relnamespace = 'public'::regnamespace;

  if v_is_partitioned then
    raise notice 'platform_job_logs already partitioned — skipping';
    return;
  end if;

  -- Rename old table (if exists) so we can recreate it as partitioned
  if exists (
    select 1 from pg_class
    where relname = 'platform_job_logs'
      and relnamespace = 'public'::regnamespace
  ) then
    execute 'alter table public.platform_job_logs rename to platform_job_logs_old';
  end if;

  -- Create new partitioned table matching the existing schema
  execute $tbl$
    create table public.platform_job_logs (
      id           uuid        not null default gen_random_uuid(),
      job_id       text        not null,
      triggered_by text        not null default 'manual',
      status       text        not null default 'running'
                               check (status in ('running','ok','error','partial')),
      result       jsonb,
      started_at   timestamptz not null default now(),
      finished_at  timestamptz,
      primary key (id, started_at)
    ) partition by range (started_at)
  $tbl$;

  -- Copy data from old to new (column order matches the original schema)
  if exists (
    select 1 from pg_class
    where relname = 'platform_job_logs_old'
      and relnamespace = 'public'::regnamespace
  ) then
    execute $cp$
      insert into public.platform_job_logs
        (id, job_id, triggered_by, status, result, started_at, finished_at)
      select id, job_id, triggered_by, status, result, started_at, finished_at
      from public.platform_job_logs_old
    $cp$;
    execute 'drop table public.platform_job_logs_old';
  end if;

  -- Preserve RLS posture from the original migration (service-role only)
  execute 'alter table public.platform_job_logs enable row level security';

  -- Hand off partition lifecycle to pg_partman (monthly buckets, 3 pre-made)
  perform partman.create_parent(
    p_parent_table => 'public.platform_job_logs',
    p_control      => 'started_at',
    p_type         => 'native',
    p_interval     => 'monthly',
    p_premake      => 3
  );

  -- Retention: drop partitions older than 12 months
  update partman.part_config
     set retention = '12 months',
         retention_keep_table = false
   where parent_table = 'public.platform_job_logs';

  -- BRIN index on append-only timestamp + btree on job_id for the existing UI lookups
  execute 'create index if not exists platform_job_logs_started_brin on public.platform_job_logs using brin (started_at)';
  execute 'create index if not exists platform_job_logs_job_id      on public.platform_job_logs (job_id, started_at desc)';

exception
  when others then
    raise notice 'platform_job_logs partition migration skipped: %', sqlerrm;
end
$$;
