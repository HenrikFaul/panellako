-- =============================================================================
-- Migration:  20260520_cycling_extensions_and_schemas.sql
-- Date:       2026-05-20
-- Title:      Cycling-data domain — Postgres extensions and schemas
-- Version:    v0.7.1
-- Spec ref:   cycling-data-sources/00b_SUPABASE_BACKEND.md § 4
-- -----------------------------------------------------------------------------
-- Purpose: bootstrap the cycling-data domain on the panellako Supabase
-- project. This migration enables the Postgres extensions required by the
-- subsequent migrations (PostGIS, partitioning, message queue, http-from-sql,
-- crypto) and creates the per-domain schemas.
--
-- Notes:
--   * pg_cron is intentionally NOT enabled here. Supabase manages pg_cron
--     itself and a `create extension` call may fail on managed projects. The
--     scheduler migration (`20260520_cycling_pg_cron_schedules.sql`) assumes
--     pg_cron is already available in the `cron` schema.
--   * `vault` is built-in on Supabase (schema `vault`); no extension call.
-- =============================================================================

-- Extensions ------------------------------------------------------------------

create extension if not exists postgis;
create extension if not exists postgis_topology;
create extension if not exists pg_partman;
create extension if not exists pgmq;
create extension if not exists pg_net;
create extension if not exists pgcrypto;

-- Schemas ---------------------------------------------------------------------

create schema if not exists cycling;
create schema if not exists gbfs;
create schema if not exists kenyi;
create schema if not exists mtsz;
create schema if not exists bkk_infra;
create schema if not exists bicycle_parking;
create schema if not exists etl_meta;
create schema if not exists cycling_curated;

-- Public-readable schemas (PostgREST exposes them via the REST API). The
-- `etl_meta` schema is intentionally NOT granted to anon/authenticated — it
-- holds operational records that only service_role should see.

grant usage on schema cycling          to anon, authenticated;
grant usage on schema gbfs             to anon, authenticated;
grant usage on schema kenyi            to anon, authenticated;
grant usage on schema mtsz             to anon, authenticated;
grant usage on schema bkk_infra        to anon, authenticated;
grant usage on schema bicycle_parking  to anon, authenticated;
grant usage on schema cycling_curated  to anon, authenticated;
