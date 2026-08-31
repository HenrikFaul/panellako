-- v0.10.7 - fail-closed, idempotent manual platform mutation coordination.
--
-- platform_job_logs remains the operational history. The compact command table
-- owns global single-flight/idempotency state, while SECURITY DEFINER RPCs keep
-- command, partitioned log and immutable audit writes in one transaction.

create table if not exists public.platform_audit_events (
  id          uuid primary key default gen_random_uuid(),
  actor_id    text,
  action      text not null,
  target_type text,
  target_id   text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.platform_job_logs (
  id           uuid not null default gen_random_uuid(),
  job_id       text not null,
  triggered_by text not null default 'manual',
  status       text not null default 'running'
               check (status in ('running', 'ok', 'error', 'partial')),
  result       jsonb,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  primary key (id, started_at)
);

create table if not exists public.platform_job_commands (
  id               uuid primary key default gen_random_uuid(),
  command_kind     text not null default 'job'
                   check (command_kind in ('job', 'migration')),
  job_id           text not null,
  target_key       text not null,
  idempotency_key  uuid not null,
  actor_id         text not null,
  request_payload  jsonb not null default '{}'::jsonb,
  status           text not null default 'running'
                   check (status in ('running', 'ok', 'error', 'partial')),
  safe_result      jsonb,
  log_id           uuid,
  log_started_at   timestamptz,
  started_at       timestamptz not null default now(),
  lease_expires_at timestamptz not null,
  finished_at      timestamptz,
  check (
    (log_id is null and log_started_at is null)
    or (log_id is not null and log_started_at is not null)
  )
);

alter table public.platform_job_commands
  add column if not exists command_kind text default 'job',
  add column if not exists job_id text,
  add column if not exists target_key text,
  add column if not exists idempotency_key uuid,
  add column if not exists actor_id text,
  add column if not exists request_payload jsonb default '{}'::jsonb,
  add column if not exists status text default 'running',
  add column if not exists safe_result jsonb,
  add column if not exists log_id uuid,
  add column if not exists log_started_at timestamptz,
  add column if not exists started_at timestamptz default now(),
  add column if not exists lease_expires_at timestamptz,
  add column if not exists finished_at timestamptz;

drop index if exists public.platform_job_commands_one_running_job_idx;
drop index if exists public.platform_job_commands_one_running_target_idx;
drop index if exists public.platform_job_commands_id_idx;

update public.platform_job_commands
set
  command_kind = case
    when command_kind in ('job', 'migration') then command_kind
    when job_id = 'apply_migrations' then 'migration'
    else 'job'
  end,
  job_id = coalesce(job_id, 'legacy-command'),
  target_key = coalesce(target_key, job_id, 'platform:mutations'),
  idempotency_key = coalesce(idempotency_key, gen_random_uuid()),
  actor_id = coalesce(actor_id, 'legacy-operator'),
  request_payload = coalesce(request_payload, '{}'::jsonb),
  status = case
    when status in ('running', 'ok', 'error', 'partial') then status
    else 'error'
  end,
  started_at = coalesce(started_at, now()),
  lease_expires_at = coalesce(
    lease_expires_at,
    coalesce(started_at, now()) + interval '15 minutes'
  );

-- Resolve legacy log links only when the UUID identifies exactly one physical
-- partition row. Ambiguous/incomplete links are detached instead of guessed.
update public.platform_job_commands command_row
set log_started_at = log_row.started_at
from (
  select id, min(started_at) as started_at
  from public.platform_job_logs
  group by id
  having count(*) = 1
) log_row
where command_row.log_id = log_row.id
  and command_row.log_started_at is null;

update public.platform_job_commands
set log_id = null, log_started_at = null
where (log_id is null) <> (log_started_at is null);

-- Every newly submitted manual mutation competes for one conservative global
-- target. If legacy state contains more than one live command, index creation
-- fails closed and requires operator reconciliation instead of hiding a race.
update public.platform_job_commands
set
  target_key = 'platform:mutations',
  lease_expires_at = least(lease_expires_at, now() + interval '15 minutes')
where status = 'running';

alter table public.platform_job_commands
  alter column id set default gen_random_uuid(),
  alter column command_kind set default 'job',
  alter column status set default 'running',
  alter column started_at set default now(),
  alter column command_kind set not null,
  alter column job_id set not null,
  alter column target_key set not null,
  alter column idempotency_key set not null,
  alter column actor_id set not null,
  alter column request_payload set default '{}'::jsonb,
  alter column request_payload set not null,
  alter column status set not null,
  alter column started_at set not null,
  alter column lease_expires_at set not null;

alter table public.platform_job_commands
  drop constraint if exists platform_job_commands_status_check,
  drop constraint if exists platform_job_commands_command_kind_check,
  drop constraint if exists platform_job_commands_request_payload_check,
  drop constraint if exists platform_job_commands_log_link_check;

alter table public.platform_job_commands
  add constraint platform_job_commands_status_check
    check (status in ('running', 'ok', 'error', 'partial')),
  add constraint platform_job_commands_command_kind_check
    check (command_kind in ('job', 'migration')),
  add constraint platform_job_commands_request_payload_check
    check (jsonb_typeof(request_payload) = 'object'),
  add constraint platform_job_commands_log_link_check
    check (
      (log_id is null and log_started_at is null)
      or (log_id is not null and log_started_at is not null)
    );

create unique index if not exists platform_job_commands_idempotency_idx
  on public.platform_job_commands (idempotency_key);

-- Remove the redundant auto-named UNIQUE constraint created by the early
-- bootstrap draft only after the canonical unique index is safely present.
alter table public.platform_job_commands
  drop constraint if exists platform_job_commands_idempotency_key_key;

create unique index platform_job_commands_one_running_target_idx
  on public.platform_job_commands (target_key)
  where status = 'running';

create index if not exists platform_job_commands_started_at_idx
  on public.platform_job_commands (started_at desc);

alter table public.platform_audit_events enable row level security;
alter table public.platform_job_logs enable row level security;
alter table public.platform_job_commands enable row level security;

revoke all on table public.platform_audit_events from anon, authenticated;
revoke all on table public.platform_job_logs from anon, authenticated;
revoke all on table public.platform_job_commands from anon, authenticated;

revoke update, delete, truncate on table public.platform_audit_events from service_role;
grant select, insert on table public.platform_audit_events to service_role;
grant select, insert, update on table public.platform_job_logs to service_role;
grant select, insert, update on table public.platform_job_commands to service_role;

create or replace function public.expire_platform_job_commands()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  command_row public.platform_job_commands%rowtype;
  finished_timestamp timestamptz := clock_timestamp();
  affected_rows integer;
  expired_count integer := 0;
  expiry_result jsonb := jsonb_build_object('code', 'JOB_LEASE_EXPIRED');
begin
  for command_row in
    select *
    from public.platform_job_commands
    where status = 'running'
      and lease_expires_at < finished_timestamp
    order by lease_expires_at, id
    for update skip locked
  loop
    update public.platform_job_commands
    set
      status = 'error',
      safe_result = expiry_result,
      finished_at = finished_timestamp
    where id = command_row.id
      and status = 'running'
      and lease_expires_at < finished_timestamp;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 1 then
      raise exception using errcode = 'P0001', message = 'PLATFORM_COMMAND_EXPIRY_CONFLICT';
    end if;

    if command_row.log_id is not null then
      update public.platform_job_logs
      set
        status = 'error',
        result = expiry_result,
        finished_at = finished_timestamp
      where id = command_row.log_id
        and started_at = command_row.log_started_at
        and status = 'running';
      get diagnostics affected_rows = row_count;
      if affected_rows <> 1 then
        raise exception using errcode = 'P0001', message = 'PLATFORM_LOG_EXPIRY_CONFLICT';
      end if;
    end if;

    insert into public.platform_audit_events (
      actor_id,
      action,
      target_type,
      target_id,
      payload
    ) values (
      'system',
      case command_row.command_kind
        when 'migration' then 'superadmin.migrations.apply.expired'
        else 'superadmin.job.run.expired'
      end,
      case command_row.command_kind
        when 'migration' then 'migration_batch'
        else 'platform_job'
      end,
      command_row.id::text,
      jsonb_build_object(
        'job_id', command_row.job_id,
        'target_key', command_row.target_key,
        'status', 'error',
        'result', expiry_result
      )
    );

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$function$;

create or replace function public.begin_platform_job_command(
  p_command_kind text,
  p_job_id text,
  p_target_key text,
  p_idempotency_key uuid,
  p_actor_id text,
  p_lease_seconds integer default 900,
  p_start_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  prior_command public.platform_job_commands%rowtype;
  command_row public.platform_job_commands%rowtype;
  log_identifier uuid;
  log_timestamp timestamptz;
  affected_rows integer;
  normalized_payload jsonb := coalesce(p_start_payload, '{}'::jsonb);
begin
  if p_command_kind not in ('job', 'migration')
     or p_job_id is null or length(p_job_id) not between 1 and 120
     or p_target_key is null or length(p_target_key) not between 1 and 120
     or p_actor_id is null or length(p_actor_id) not between 1 and 320
     or jsonb_typeof(normalized_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_PLATFORM_COMMAND';
  end if;

  perform public.expire_platform_job_commands();

  select * into prior_command
  from public.platform_job_commands
  where idempotency_key = p_idempotency_key;

  if found then
    if prior_command.command_kind = p_command_kind
       and prior_command.job_id = p_job_id
       and prior_command.target_key = p_target_key
       and prior_command.actor_id = p_actor_id
       and prior_command.request_payload = normalized_payload then
      if prior_command.status = 'running' then
        return jsonb_build_object(
          'outcome', 'already_submitted',
          'command_id', prior_command.id,
          'status', prior_command.status
        );
      end if;
      return jsonb_build_object(
        'outcome', 'replayed',
        'command_id', prior_command.id,
        'status', prior_command.status,
        'safe_result', coalesce(prior_command.safe_result, '{}'::jsonb)
      );
    end if;
    return jsonb_build_object('outcome', 'idempotency_conflict');
  end if;

  if exists (
    select 1
    from public.platform_job_commands
    where target_key = p_target_key and status = 'running'
  ) then
    return jsonb_build_object('outcome', 'already_running');
  end if;

  begin
    insert into public.platform_job_commands (
      command_kind,
      job_id,
      target_key,
      idempotency_key,
      actor_id,
      request_payload,
      status,
      safe_result,
      lease_expires_at
    ) values (
      p_command_kind,
      p_job_id,
      p_target_key,
      p_idempotency_key,
      p_actor_id,
      normalized_payload,
      'running',
      jsonb_build_object('code', 'JOB_RUNNING'),
      clock_timestamp() + make_interval(secs => greatest(60, least(p_lease_seconds, 900)))
    )
    returning * into command_row;
  exception
    when unique_violation then
      select * into prior_command
      from public.platform_job_commands
      where idempotency_key = p_idempotency_key;

      if found then
        if prior_command.command_kind = p_command_kind
           and prior_command.job_id = p_job_id
           and prior_command.target_key = p_target_key
           and prior_command.actor_id = p_actor_id
           and prior_command.request_payload = normalized_payload then
          if prior_command.status = 'running' then
            return jsonb_build_object(
              'outcome', 'already_submitted',
              'command_id', prior_command.id,
              'status', prior_command.status
            );
          end if;
          return jsonb_build_object(
            'outcome', 'replayed',
            'command_id', prior_command.id,
            'status', prior_command.status,
            'safe_result', coalesce(prior_command.safe_result, '{}'::jsonb)
          );
        end if;
        return jsonb_build_object('outcome', 'idempotency_conflict');
      end if;

      if exists (
        select 1
        from public.platform_job_commands
        where target_key = p_target_key and status = 'running'
      ) then
        return jsonb_build_object('outcome', 'already_running');
      end if;
      raise;
  end;

  insert into public.platform_job_logs (
    job_id,
    status,
    triggered_by,
    result
  ) values (
    p_job_id,
    'running',
    p_actor_id,
    jsonb_build_object('code', 'JOB_RUNNING', 'command_id', command_row.id)
  )
  returning id, started_at into log_identifier, log_timestamp;

  update public.platform_job_commands
  set log_id = log_identifier, log_started_at = log_timestamp
  where id = command_row.id and status = 'running';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception using errcode = 'P0001', message = 'PLATFORM_COMMAND_LINK_CONFLICT';
  end if;

  insert into public.platform_audit_events (
    actor_id,
    action,
    target_type,
    target_id,
    payload
  ) values (
    p_actor_id,
    case p_command_kind
      when 'migration' then 'superadmin.migrations.apply.started'
      else 'superadmin.job.run.started'
    end,
    case p_command_kind
      when 'migration' then 'migration_batch'
      else 'platform_job'
    end,
    command_row.id::text,
    normalized_payload || jsonb_build_object(
      'job_id', p_job_id,
      'target_key', p_target_key,
      'idempotency_key', p_idempotency_key
    )
  );

  return jsonb_build_object(
    'outcome', 'started',
    'command_id', command_row.id,
    'log_id', log_identifier,
    'log_started_at', log_timestamp
  );
end;
$function$;

create or replace function public.complete_platform_job_command(
  p_command_id uuid,
  p_status text,
  p_safe_result jsonb,
  p_actor_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  command_row public.platform_job_commands%rowtype;
  finished_timestamp timestamptz := clock_timestamp();
  affected_rows integer;
  normalized_result jsonb := coalesce(p_safe_result, '{}'::jsonb);
begin
  if p_status not in ('ok', 'error', 'partial')
     or jsonb_typeof(normalized_result) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_PLATFORM_COMMAND_COMPLETION';
  end if;

  select * into command_row
  from public.platform_job_commands
  where id = p_command_id
  for update;

  if not found or command_row.status <> 'running' then
    return jsonb_build_object('outcome', 'not_running');
  end if;
  if command_row.actor_id <> p_actor_id then
    raise exception using errcode = '42501', message = 'PLATFORM_COMMAND_ACTOR_MISMATCH';
  end if;
  if command_row.log_id is null or command_row.log_started_at is null then
    raise exception using errcode = 'P0001', message = 'PLATFORM_COMMAND_LOG_MISSING';
  end if;

  update public.platform_job_logs
  set
    status = p_status,
    result = normalized_result,
    finished_at = finished_timestamp
  where id = command_row.log_id
    and started_at = command_row.log_started_at
    and status = 'running';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception using errcode = 'P0001', message = 'PLATFORM_LOG_COMPLETION_CONFLICT';
  end if;

  insert into public.platform_audit_events (
    actor_id,
    action,
    target_type,
    target_id,
    payload
  ) values (
    p_actor_id,
    case command_row.command_kind
      when 'migration' then 'superadmin.migrations.apply.completed'
      else 'superadmin.job.run.completed'
    end,
    case command_row.command_kind
      when 'migration' then 'migration_batch'
      else 'platform_job'
    end,
    command_row.id::text,
    jsonb_build_object(
      'job_id', command_row.job_id,
      'target_key', command_row.target_key,
      'status', p_status,
      'result', normalized_result
    )
  );

  update public.platform_job_commands
  set
    status = p_status,
    safe_result = normalized_result,
    finished_at = finished_timestamp
  where id = command_row.id and status = 'running';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception using errcode = 'P0001', message = 'PLATFORM_COMMAND_COMPLETION_CONFLICT';
  end if;

  return jsonb_build_object('outcome', 'completed');
end;
$function$;

create or replace function public.platform_job_command_contract_version()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select '20260830130000-v2'::text;
$function$;

revoke all on function public.expire_platform_job_commands() from public, anon, authenticated;
revoke all on function public.begin_platform_job_command(text, text, text, uuid, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.complete_platform_job_command(uuid, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.platform_job_command_contract_version() from public, anon, authenticated;

grant execute on function public.expire_platform_job_commands() to service_role;
grant execute on function public.begin_platform_job_command(text, text, text, uuid, text, integer, jsonb) to service_role;
grant execute on function public.complete_platform_job_command(uuid, text, jsonb, text) to service_role;
grant execute on function public.platform_job_command_contract_version() to service_role;
