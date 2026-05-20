-- =============================================================================
-- Migration:  20260520_cycling_pg_cron_schedules.sql
-- Date:       2026-05-20
-- Title:      Cycling-data domain — pg_cron schedules for ETL Edge Functions
-- Version:    v0.7.1
-- Spec ref:   cycling-data-sources/00b_SUPABASE_BACKEND.md § 5
-- -----------------------------------------------------------------------------
-- Purpose: schedule every recurring cycling-data ETL job. Each job invokes a
-- Supabase Edge Function (or, for refresh-route-master-mv, a pure SQL action)
-- via pg_cron + pg_net.
--
-- PRE-REQUISITES (one-time, before running this migration):
--
--   1. Tell Postgres where the project lives. The Supabase project ref is
--      project-specific, so we read it from a `postgres` setting:
--
--        alter database postgres set app.project_url =
--          'https://<project-ref>.supabase.co';
--
--      If the setting is missing the schedules will use the placeholder
--      `https://REPLACE_WITH_PROJECT_REF.supabase.co` (jobs will still be
--      scheduled but their HTTP calls will fail until the setting is set).
--
--   2. Create the following secrets in the Supabase Vault
--      (`vault.create_secret('<name>', '<value>')`):
--
--        * `edge_function_invoke_key`  — bearer token that authorizes the
--          cron job to invoke an Edge Function (typically the project's
--          anon or service_role key with restricted scope).
--        * `fly_worker_token`          — bearer token for the optional
--          Fly.io worker that handles BKK infra GeoJSON merging. Only
--          required when the `fetch-bkk-infra-trigger` job is enabled.
--
-- Each cron.schedule call is wrapped in a do-block so that a missing Vault
-- secret raises a notice but does not abort the migration — the schedule is
-- still installed and will start working once the secret exists.
--
-- The unschedule block at the top makes the migration idempotent.
-- =============================================================================


-- 0. Drop any pre-existing schedules of the same name (idempotent re-runs) ---

do $$
declare
  v_jobs text[] := array[
    'fetch-bkk-gbfs-status',
    'fetch-bkk-gbfs-info',
    'fetch-osm-diff-hu',
    'fetch-waymarkedtrails',
    'refresh-route-master-mv',
    'partman-maintenance',
    'fetch-bkk-infra-trigger',
    'fetch-bkk-portal',
    'fetch-kormany-diff',
    'fetch-termeszetjaro',
    'fetch-bicikliparkolo'
  ];
  v_job text;
begin
  foreach v_job in array v_jobs loop
    begin
      perform cron.unschedule(v_job);
    exception when others then
      -- job did not exist — that's fine
      null;
    end;
  end loop;
end
$$;


-- 1. BKK GBFS station_status — every minute ----------------------------------

do $$
begin
  perform cron.schedule(
    'fetch-bkk-gbfs-status',
    '* * * * *',
    $job$
      select net.http_post(
        url := coalesce(current_setting('app.project_url', true), 'https://REPLACE_WITH_PROJECT_REF.supabase.co')
               || '/functions/v1/fetch_bkk_gbfs_status',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_invoke_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );
exception when others then
  raise notice 'fetch-bkk-gbfs-status not scheduled: %', sqlerrm;
end
$$;


-- 2. BKK GBFS station_information — daily 02:00 UTC --------------------------

do $$
begin
  perform cron.schedule(
    'fetch-bkk-gbfs-info',
    '0 2 * * *',
    $job$
      select net.http_post(
        url := coalesce(current_setting('app.project_url', true), 'https://REPLACE_WITH_PROJECT_REF.supabase.co')
               || '/functions/v1/fetch_bkk_gbfs_info',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_invoke_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );
exception when others then
  raise notice 'fetch-bkk-gbfs-info not scheduled: %', sqlerrm;
end
$$;


-- 3. OSM HU minutely diff — hourly @05 ----------------------------------------

do $$
begin
  perform cron.schedule(
    'fetch-osm-diff-hu',
    '5 * * * *',
    $job$
      select net.http_post(
        url := coalesce(current_setting('app.project_url', true), 'https://REPLACE_WITH_PROJECT_REF.supabase.co')
               || '/functions/v1/fetch_osm_diff_hu',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_invoke_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );
exception when others then
  raise notice 'fetch-osm-diff-hu not scheduled: %', sqlerrm;
end
$$;


-- 4. Waymarked Trails — daily 04:00 UTC --------------------------------------

do $$
begin
  perform cron.schedule(
    'fetch-waymarkedtrails',
    '0 4 * * *',
    $job$
      select net.http_post(
        url := coalesce(current_setting('app.project_url', true), 'https://REPLACE_WITH_PROJECT_REF.supabase.co')
               || '/functions/v1/fetch_waymarkedtrails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_invoke_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );
exception when others then
  raise notice 'fetch-waymarkedtrails not scheduled: %', sqlerrm;
end
$$;


-- 5. Refresh cycling.route_master — daily 04:15 UTC (after Waymarked Trails) -

do $$
begin
  perform cron.schedule(
    'refresh-route-master-mv',
    '15 4 * * *',
    $job$ refresh materialized view concurrently cycling.route_master; $job$
  );
exception when others then
  raise notice 'refresh-route-master-mv not scheduled: %', sqlerrm;
end
$$;


-- 6. pg_partman maintenance — daily 01:00 UTC --------------------------------

do $$
begin
  perform cron.schedule(
    'partman-maintenance',
    '0 1 * * *',
    $job$ select partman.run_maintenance(p_analyze := true); $job$
  );
exception when others then
  raise notice 'partman-maintenance not scheduled: %', sqlerrm;
end
$$;


-- 7. BKK infra (Fly.io worker trigger) — weekly Monday 03:00 UTC -------------
--    TODO: enable after Fly.io worker deploy and after the
--          `fly_worker_token` secret is added to vault.
--    The schedule is installed but the body is commented out — uncomment
--    the body once the worker exists.

do $$
begin
  perform cron.schedule(
    'fetch-bkk-infra-trigger',
    '0 3 * * 1',
    $job$
      -- TODO: enable after Fly.io worker deploy
      -- select net.http_post(
      --   url := 'https://cycling-worker.fly.dev/run/bkk_infra',
      --   headers := jsonb_build_object(
      --     'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'fly_worker_token'),
      --     'Content-Type', 'application/json'
      --   ),
      --   body := '{}'::jsonb
      -- );
      select 1;
    $job$
  );
exception when others then
  raise notice 'fetch-bkk-infra-trigger not scheduled: %', sqlerrm;
end
$$;


-- 8. BKK Biciklivel portal — weekly Monday 04:00 UTC -------------------------

do $$
begin
  perform cron.schedule(
    'fetch-bkk-portal',
    '0 4 * * 1',
    $job$
      select net.http_post(
        url := coalesce(current_setting('app.project_url', true), 'https://REPLACE_WITH_PROJECT_REF.supabase.co')
               || '/functions/v1/fetch_bkk_portal',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_invoke_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );
exception when others then
  raise notice 'fetch-bkk-portal not scheduled: %', sqlerrm;
end
$$;


-- 9. kormany.hu hash-diff — monthly on day 1 @ 05:00 UTC ---------------------

do $$
begin
  perform cron.schedule(
    'fetch-kormany-diff',
    '0 5 1 * *',
    $job$
      select net.http_post(
        url := coalesce(current_setting('app.project_url', true), 'https://REPLACE_WITH_PROJECT_REF.supabase.co')
               || '/functions/v1/fetch_kormany_diff',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_invoke_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );
exception when others then
  raise notice 'fetch-kormany-diff not scheduled: %', sqlerrm;
end
$$;


-- 10. Természetjáró (MTSZ) — weekly Sunday 02:00 UTC -------------------------
--    TODO: enable after MTSZ partnership / PR-required license is signed.

do $$
begin
  perform cron.schedule(
    'fetch-termeszetjaro',
    '0 2 * * 0',
    $job$
      -- TODO: enable after MTSZ partnership
      -- select net.http_post(
      --   url := coalesce(current_setting('app.project_url', true), 'https://REPLACE_WITH_PROJECT_REF.supabase.co')
      --          || '/functions/v1/fetch_termeszetjaro',
      --   headers := jsonb_build_object(
      --     'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_invoke_key'),
      --     'Content-Type', 'application/json'
      --   ),
      --   body := '{}'::jsonb
      -- );
      select 1;
    $job$
  );
exception when others then
  raise notice 'fetch-termeszetjaro not scheduled: %', sqlerrm;
end
$$;


-- 11. Bicikliparkoló kereső — monthly on day 5 @ 02:00 UTC -------------------

do $$
begin
  perform cron.schedule(
    'fetch-bicikliparkolo',
    '0 2 5 * *',
    $job$
      select net.http_post(
        url := coalesce(current_setting('app.project_url', true), 'https://REPLACE_WITH_PROJECT_REF.supabase.co')
               || '/functions/v1/fetch_bicikliparkolo',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_invoke_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );
exception when others then
  raise notice 'fetch-bicikliparkolo not scheduled: %', sqlerrm;
end
$$;
