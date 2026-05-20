-- ============================================================
-- v0.8.0 — pgmq job queue infrastructure (Tier 1 audit follow-up)
--
-- Standardizes background-job orchestration on top of the
-- pgmq extension (already enabled in 20260520_cycling_extensions_and_schemas.sql).
--
-- Creates 3 working queues + 1 dead-letter queue, an idempotency-key
-- tracking table, and two helper RPCs (enqueue-with-key, move-to-DLQ).
--
-- NOTE: this migration only sets up the INFRASTRUCTURE. The existing
-- `app/api/superadmin/jobs/run/route.ts` is not yet refactored to use it.
-- Job-runner Edge Functions / API routes can adopt pgmq incrementally.
-- ============================================================

-- 4 queues: 3 working + 1 dead-letter. Wrapped in a do-block so the
-- migration is idempotent even if some queues already exist (pgmq.create
-- raises when a queue is duplicate).
do $$
begin
  perform pgmq.create('q_transit_sync');
exception
  when undefined_function or invalid_schema_name then
    raise notice 'pgmq not available — skipping q_transit_sync';
  when others then
    null; -- already exists
end
$$;

do $$
begin
  perform pgmq.create('q_cycling_ingest');
exception
  when undefined_function or invalid_schema_name then
    raise notice 'pgmq not available — skipping q_cycling_ingest';
  when others then
    null;
end
$$;

do $$
begin
  perform pgmq.create('q_ndvi_render');
exception
  when undefined_function or invalid_schema_name then
    raise notice 'pgmq not available — skipping q_ndvi_render';
  when others then
    null;
end
$$;

do $$
begin
  perform pgmq.create('q_dead_letter');
exception
  when undefined_function or invalid_schema_name then
    raise notice 'pgmq not available — skipping q_dead_letter';
  when others then
    null;
end
$$;

-- ---------------------------------------------------------------
-- Idempotency-key tracking table
-- ---------------------------------------------------------------
-- Keys typically come from `idempotencyKey(source, payload)` in lib/integrity.ts:
--   `<source>:<32-hex-chars>`  e.g.  `transit_sync:9f2e8a...`
create table if not exists public.job_idempotency_keys (
  key            text primary key,
  queue          text not null,
  enqueued_at    timestamptz not null default now(),
  status         text not null default 'pending'
                 check (status in ('pending','running','success','failure')),
  message_id     bigint,
  result         jsonb,
  error_message  text
);

create index if not exists job_idempotency_status_enqueued
  on public.job_idempotency_keys (status, enqueued_at desc);

create index if not exists job_idempotency_queue_enqueued
  on public.job_idempotency_keys (queue, enqueued_at desc);

-- RLS: service-role only (job-runner Edge Functions use service-role)
alter table public.job_idempotency_keys enable row level security;
-- No public policies defined — service-role bypasses RLS.

-- ---------------------------------------------------------------
-- Helper RPC: enqueue_with_key
--   - If key already exists, returns existing message_id + was_new=false
--   - Otherwise: sends to pgmq, records the key, returns new id + was_new=true
-- ---------------------------------------------------------------
create or replace function public.enqueue_with_key(
  p_queue   text,
  p_key     text,
  p_payload jsonb
) returns table(message_id bigint, was_new boolean)
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare
  v_existing record;
  v_msg_id   bigint;
begin
  select * into v_existing
  from public.job_idempotency_keys
  where key = p_key;

  if v_existing.key is not null then
    return query select v_existing.message_id, false;
    return;
  end if;

  select pgmq.send(p_queue, p_payload) into v_msg_id;

  insert into public.job_idempotency_keys (key, queue, message_id, status)
    values (p_key, p_queue, v_msg_id, 'pending');

  return query select v_msg_id, true;
end
$$;

-- ---------------------------------------------------------------
-- Helper RPC: move_to_dead_letter
--   Moves a failed job's payload to q_dead_letter with reason + timestamp,
--   and updates the idempotency-key row to status='failure'.
-- ---------------------------------------------------------------
create or replace function public.move_to_dead_letter(
  p_key    text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare
  v_row record;
begin
  select * into v_row from public.job_idempotency_keys where key = p_key;
  if v_row.queue is null then return; end if;

  perform pgmq.send('q_dead_letter', jsonb_build_object(
    'original_key',   p_key,
    'original_queue', v_row.queue,
    'reason',         p_reason,
    'failed_at',      now()
  ));

  update public.job_idempotency_keys
     set status = 'failure',
         error_message = p_reason
   where key = p_key;
end
$$;
