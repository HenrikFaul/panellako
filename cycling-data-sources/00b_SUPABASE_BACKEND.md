# 00b — Supabase-alapú backend adaptáció (cycling-data-sources)

> Ez a dokumentum a `00_MASTER_PLAN.md`-ben rögzített backend-tervet **a panellako meglévő Supabase-projektéhez** igazítja. Ahol az eredeti terv külső komponensre épült (TimescaleDB, MinIO, Redis, Airflow, Martin tile-server, Prometheus), itt megmutatjuk a Supabase-natív megoldást, **vagy** egy minimális külső komponenst, amit nem lehet kiváltani.

**Rövid válasz:** **IGEN, fut Supabase-en**, a 9 forrásból **7 teljes egészében Supabase-en belül** (Postgres + Edge Functions + Storage + pg_cron + pg_net) megvalósítható; **2 forrás** (OSM PBF parsing és heti BKK infra GeoJSON merge) igényel külső workert, mert >256 MB memóriát vagy >50s futási időt kérnek, ami Edge Function-be nem fér.

---

## 1. Komponens-megfeleltetés

| Eredeti terv (00_MASTER_PLAN.md) | Supabase megfelelő | Megjegyzés |
|----------------------------------|---------------------|------------|
| PostgreSQL 15 + PostGIS 3.4 | **Supabase Postgres + `postgis` extension** | `CREATE EXTENSION postgis;` egyszer; minden további seamless. |
| TimescaleDB (GBFS history hypertable) | **`pg_partman` + range partitioning** | TimescaleDB-t Supabase 2024-től nem támogatja új projekteken. pg_partman + havi partíciók + `BRIN` index a `ts`-re lényegében ugyanaz a profil. |
| MinIO / S3 snapshot store | **Supabase Storage** (S3-kompatibilis) | Bucket `cycling-snapshots`, RLS-szel csak service-role írhat. SHA-256 verifikációt a kliens számítja. |
| Redis cache | **Postgres MATERIALIZED VIEW + `pg_cron` REFRESH** vagy Edge Function in-memory + Cloudflare KV | Bubi-status forró cache-hez nem kell Redis, ha az adat amúgy is Postgres-ben van, és vector tile-okat Cloudflare CDN-en cache-elünk. Ha tényleg kell, **Upstash Redis** (Supabase Partner) free tier elég. |
| FastAPI / komplex routing logic | **Supabase Edge Functions (Deno + TypeScript)** | Vagy a meglévő Next.js app `app/api/cycling/*` route handler-eivel, amik a panellako repó-ban élnek. |
| PostgREST | **Beépítve Supabase-be** | Auto-CRUD a `cycling`, `gbfs` sémákra; RLS-szel közönség read-only. |
| Martin tile-server | **`ST_AsMVT()` Postgres-függvény + Edge Function endpoint** vagy `pg_tileserv` (külső VPS) | A `ST_AsMVT()` natív PostGIS, Edge Function-ből kiszolgálható. Heavy load esetén külön `pg_tileserv` 5 €/hó VPS-en. |
| k8s CronJob | **`pg_cron` + Supabase Scheduled Edge Functions** | Belső SQL időzítések pg_cron-nal, külső HTTP/letöltések pg_net-tel vagy Edge Function cron-nal. |
| Apache Airflow | **Edge Function orchestrator + audit tábla** | Nincs szükség Airflow-ra ehhez a komplexitás-szinthez; egy `etl_meta.job_run` tábla + Edge Function "next-job" pattern bőven elég. |
| Prometheus + Grafana + Loki | **Supabase beépített Logs + Logflare** + külső Grafana Cloud free tier | Supabase Dashboard mutatja a kérés/lekérdezés-számokat. Logflare → Grafana Cloud free → metrika-dashboard. |
| HashiCorp Vault | **Supabase Vault** (Postgres-natív secrets) | `vault.create_secret('osm_api_key', '...')` → `SELECT vault.decrypted_secret('osm_api_key')` Edge Function-ből. |
| Helm / k8s manifests | **Supabase CLI + migrations** | `supabase migration new`, `supabase functions deploy`. |
| GitHub Actions CI/CD | **Marad** | Supabase CLI futtatás GitHub Actions-ből, migrációk + Edge Function deploy. |

---

## 2. Architektúra Supabase-szel (átrajzolva)

```mermaid
flowchart TB
  subgraph EXT["KÜLSŐ (csak ahol muszáj)"]
    GHA[GitHub Actions runner<br/>weekly OSM PBF parser<br/>2 vCPU / 8 GB / 30 perc]
    FLY[Fly.io worker<br/>BKK infra GeoJSON merge<br/>weekly]
  end

  subgraph SB["SUPABASE PROJEKT"]
    direction TB
    PG[(Postgres 15<br/>+ postgis<br/>+ pg_cron<br/>+ pg_net<br/>+ pg_partman<br/>+ pgmq<br/>+ vault)]

    EF1[Edge Function:<br/>fetch_bkk_gbfs<br/>cron: minutely]
    EF2[Edge Function:<br/>fetch_waymarkedtrails<br/>cron: daily]
    EF3[Edge Function:<br/>fetch_termeszetjaro<br/>cron: weekly]
    EF4[Edge Function:<br/>fetch_kormany_diff<br/>cron: monthly]
    EF5[Edge Function:<br/>fetch_bicikliparkolo<br/>cron: monthly]
    EF6[Edge Function:<br/>tiles_mvt<br/>per-request]
    EF7[Edge Function:<br/>routes_api<br/>per-request]
    EF8[Edge Function:<br/>admin_publish<br/>JWT-protected]

    ST[Supabase Storage<br/>cycling-snapshots bucket<br/>SHA-256 verified objects]

    AUTH[Supabase Auth<br/>JWT, RLS]

    RT[Realtime channel<br/>gbfs_changes]
  end

  subgraph CLIENT["KLIENS"]
    APP[panellako Next.js<br/>app/cycling page]
    MAP[Map widget<br/>vector tiles]
  end

  GHA -->|service_role REST| PG
  GHA -->|raw PBF upload| ST
  FLY -->|service_role REST| PG

  EF1 -->|UPSERT gbfs.station_status| PG
  EF1 -->|raw JSON| ST
  EF2 -->|UPSERT cycling.route| PG
  EF3 -->|UPSERT mtsz.tour| PG
  EF4 -->|hash compare + alert| PG
  EF5 -->|UPSERT bicycle_parking.point| PG

  PG -->|pg_cron schedules| EF1
  PG -->|pg_cron schedules| EF2
  PG -->|pg_cron schedules| EF3
  PG -->|pg_cron schedules| EF4
  PG -->|pg_cron schedules| EF5
  PG -->|pg_net.http_get for light HTTP| EF1

  APP --> EF7
  APP --> EF8
  MAP --> EF6
  EF7 -->|SELECT cycling.route_master| PG
  EF6 -->|ST_AsMVT()| PG
  EF8 -->|UPDATE publish_state| PG
  PG -->|publication| RT
  RT --> APP

  AUTH -.RLS.-> PG
```

---

## 3. Forrásonkénti futtatási hely

| # | Forrás | Hol fut | Miért |
|---|--------|---------|-------|
| 26 / 04 | **OSM Geofabrik HU PBF** (heti) | **GitHub Actions runner** (külső) | A `hungary-latest.osm.pbf` ~620 MB, az osm2pgsql vagy osmium-feldolgozás 5-15 perc 4 GB RAM-mal. Edge Function-be (256 MB / 50s) nem fér. |
| 26 / 04 | **OSM minutely diff** (1 min) | Supabase Edge Function (`fetch_osm_diff_hu`) | A HU-bbox-szűrt diff néhány KB; osmium-replication-apply futtatás a 04-ben nem kell — közvetlenül feldolgozzuk a diff-et és Postgres-be írjuk. |
| 15 | **Cycling Waymarked Trails** | Supabase Edge Function (`fetch_waymarkedtrails`) cron daily | REST API, oldalanként 100 reláció, max 5 perc → belefér. |
| 28 | **BKK GBFS station_status** (1 min) | Supabase Edge Function (`fetch_bkk_gbfs_status`) cron minutely | ~50 KB JSON, <1s feldolgozás. Realtime kanálra is push-olunk. |
| 28 | **BKK GBFS station_information** (1d) | Edge Function (`fetch_bkk_gbfs_info`) cron daily | Kis JSON, ritka változás. |
| 28 | **BKK infra GeoJSON** (heti) | **Fly.io worker** (külső, $0/hó free tier) | A merge + topology cleanup nehezebb művelet, és a forrás-formátum scrape-elendő. |
| 01 | **Magyar Közút KENYI** (negyedéves) | Manuális FOIA-igénylés + Edge Function (`import_kenyi_snapshot`) | Beérkezett XLSX-et a portál admin felület POST-olja; Edge Function feldolgozza openpyxl-ekvivalens xlsx-streamer-rel vagy átírja Python-ra GitHub Actions egyszeri job-jával. |
| 02 | **kormany.hu PDF hash-diff** (havi) | Edge Function (`fetch_kormany_diff`) cron monthly | HEAD + GET + SHA-256 diff. PDF parse csak változás esetén indul, akkor sem on-the-fly → manuális review queue-ba teszi az új PDF-et. |
| 24 | **Természetjáró.hu** (heti, csak partnerség után) | Edge Function (`fetch_termeszetjaro`) cron weekly | Sitemap-diff alapú. |
| 25 | **Bicikliparkoló kereső** (havi) + OSM amenity (heti) | Edge Function (`fetch_bicikliparkolo`) cron monthly + külön Overpass cron weekly | Kis volumen. |
| 08 | **BKK Biciklivel portál** (heti) | Edge Function (`fetch_bkk_portal`) cron weekly | Kis volumen, opendata.bkk.hu JSON. |

**Eredmény:** 9 forrásból 7 100%-ban Supabase Edge Function-ben fut, 2 igényel külső 30-perces ingyenes futtatást heti egyszer.

---

## 4. Postgres séma + extensionek

```sql
-- Egyszeri extension-ok engedélyezése (Supabase Dashboard → Database → Extensions, vagy SQL):
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_cron;       -- Supabase: enabled by default
CREATE EXTENSION IF NOT EXISTS pg_net;        -- HTTP from SQL
CREATE EXTENSION IF NOT EXISTS pg_partman;    -- range partitioning
CREATE EXTENSION IF NOT EXISTS pgmq;          -- message queue (job orchestration)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- vault is built-in to Supabase: schema "vault"

-- Sémák
CREATE SCHEMA IF NOT EXISTS cycling;
CREATE SCHEMA IF NOT EXISTS gbfs;
CREATE SCHEMA IF NOT EXISTS kenyi;
CREATE SCHEMA IF NOT EXISTS mtsz;
CREATE SCHEMA IF NOT EXISTS bkk_infra;
CREATE SCHEMA IF NOT EXISTS bicycle_parking;
CREATE SCHEMA IF NOT EXISTS etl_meta;
CREATE SCHEMA IF NOT EXISTS cycling_curated;

-- API expose
GRANT USAGE ON SCHEMA cycling, gbfs, kenyi, mtsz, bkk_infra, bicycle_parking TO anon, authenticated;

-- Master route tábla (00_MASTER_PLAN.md-ből, változatlanul)
CREATE TABLE cycling.route (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id   uuid NOT NULL,
  source_id   text NOT NULL,
  external_id text NOT NULL,
  name        text,
  geom        geometry(LineString, 4326) NOT NULL,
  length_m    numeric GENERATED ALWAYS AS (ST_Length(geom::geography)) STORED,
  tags        jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_from  timestamptz NOT NULL DEFAULT now(),
  valid_to    timestamptz,
  fetched_at  timestamptz NOT NULL,
  data_version text NOT NULL,
  UNIQUE (source_id, external_id, valid_from)
);
CREATE INDEX route_geom_gist ON cycling.route USING GIST (geom);
CREATE INDEX route_master ON cycling.route(master_id);
CREATE INDEX route_tags_gin ON cycling.route USING GIN (tags);

-- GBFS hypertable helyett: pg_partman havi partíció
CREATE TABLE gbfs.station_status (
  station_id text NOT NULL,
  ts         timestamptz NOT NULL,
  num_bikes_available int NOT NULL,
  num_docks_available int NOT NULL,
  is_renting boolean NOT NULL,
  is_returning boolean NOT NULL,
  last_reported timestamptz,
  PRIMARY KEY (station_id, ts)
) PARTITION BY RANGE (ts);

SELECT partman.create_parent(
  p_parent_table => 'gbfs.station_status',
  p_control      => 'ts',
  p_type         => 'native',
  p_interval     => 'monthly',
  p_premake      => 3
);

-- 90 napos retention
UPDATE partman.part_config
SET retention = '90 days', retention_keep_table = false
WHERE parent_table = 'gbfs.station_status';

CREATE INDEX station_status_ts_brin ON gbfs.station_status USING BRIN (ts);
CREATE INDEX station_status_station ON gbfs.station_status (station_id, ts DESC);

-- Job queue (pgmq + audit)
SELECT pgmq.create('cycling_jobs');
CREATE TABLE etl_meta.job_run (
  id            bigserial PRIMARY KEY,
  source_id     text NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text NOT NULL CHECK (status IN ('queued','running','success','failure','partial')),
  rows_in       int,
  rows_out      int,
  rows_rejected int,
  snapshot_uri  text,
  error_message text,
  trigger       text NOT NULL  -- 'cron', 'manual', 'webhook'
);

-- RLS: public read, service_role write
ALTER TABLE cycling.route ENABLE ROW LEVEL SECURITY;
CREATE POLICY route_public_read ON cycling.route FOR SELECT
  TO anon, authenticated USING (valid_to IS NULL);
-- service_role bypass-eli az RLS-t alapból
```

---

## 5. pg_cron időzítések (egyetlen helyen az ütemezés)

```sql
-- Minden minutely cron Edge Function-t hív (pg_net-tel)
SELECT cron.schedule(
  'fetch-bkk-gbfs-status',
  '* * * * *',  -- minden perc
  $$
    SELECT net.http_post(
      url := 'https://<project>.supabase.co/functions/v1/fetch_bkk_gbfs_status',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || vault.decrypted_secret('edge_function_invoke_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'fetch-osm-diff-hu',
  '5 * * * *',  -- óránként az 5. percben
  $$ SELECT net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/fetch_osm_diff_hu',
       headers := jsonb_build_object('Authorization', 'Bearer ' || vault.decrypted_secret('edge_function_invoke_key')),
       body := '{}'::jsonb
     ); $$
);

SELECT cron.schedule(
  'fetch-waymarkedtrails',
  '0 4 * * *',  -- napi 04:00 UTC
  $$ SELECT net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/fetch_waymarkedtrails',
       headers := jsonb_build_object('Authorization', 'Bearer ' || vault.decrypted_secret('edge_function_invoke_key')),
       body := '{}'::jsonb
     ); $$
);

SELECT cron.schedule(
  'refresh-route-master-mv',
  '15 4 * * *',  -- napi 04:15 UTC (Waymarked Trails után 15 perccel)
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY cycling.route_master; $$
);

SELECT cron.schedule(
  'partman-maintenance',
  '0 1 * * *',
  $$ SELECT partman.run_maintenance(p_analyze := true); $$
);

-- Heti BKK infra (Fly.io worker hívása)
SELECT cron.schedule(
  'fetch-bkk-infra-trigger',
  '0 3 * * 1',  -- hétfő 03:00 UTC
  $$ SELECT net.http_post(
       url := 'https://cycling-worker.fly.dev/run/bkk_infra',
       headers := jsonb_build_object('Authorization', 'Bearer ' || vault.decrypted_secret('fly_worker_token')),
       body := '{}'::jsonb
     ); $$
);

-- Havi kormany.hu hash-diff
SELECT cron.schedule(
  'fetch-kormany-diff',
  '0 5 1 * *',
  $$ SELECT net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/fetch_kormany_diff',
       headers := jsonb_build_object('Authorization', 'Bearer ' || vault.decrypted_secret('edge_function_invoke_key')),
       body := '{}'::jsonb
     ); $$
);
```

---

## 6. Edge Function példa: BKK GBFS minutely

```typescript
// supabase/functions/fetch_bkk_gbfs_status/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. ETag-cache
  const { data: meta } = await supabase
    .from("etl_meta.feed_etag")
    .select("etag")
    .eq("feed", "bkk_gbfs_status")
    .maybeSingle();

  const headers: HeadersInit = { "User-Agent": "panellako-cycling/1.0 (info@panellako.hu)" };
  if (meta?.etag) headers["If-None-Match"] = meta.etag;

  const resp = await fetch("https://gbfs.bubi.bkk.hu/gbfs/v3/station_status.json", { headers });
  if (resp.status === 304) {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }
  if (!resp.ok) {
    await supabase.from("etl_meta.job_run").insert({
      source_id: "bkk-gbfs-status", status: "failure",
      error_message: `HTTP ${resp.status}`, trigger: "cron"
    });
    return new Response(JSON.stringify({ error: resp.status }), { status: 502 });
  }

  const json = await resp.json();
  const ts = new Date(json.last_updated * 1000).toISOString();
  const rows = json.data.stations.map((s: any) => ({
    station_id: s.station_id,
    ts,
    num_bikes_available: s.num_bikes_available,
    num_docks_available: s.num_docks_available,
    is_renting: s.is_renting,
    is_returning: s.is_returning,
    last_reported: s.last_reported ? new Date(s.last_reported * 1000).toISOString() : null,
  }));

  const { error } = await supabase.schema("gbfs").from("station_status").insert(rows);
  if (error) throw error;

  // Snapshot Storage-ba
  await supabase.storage.from("cycling-snapshots").upload(
    `gbfs/bkk-status/${ts}.json`,
    new Blob([JSON.stringify(json)], { type: "application/json" }),
    { contentType: "application/json", upsert: false }
  );

  // ETag mentése
  await supabase.from("etl_meta.feed_etag").upsert({
    feed: "bkk_gbfs_status", etag: resp.headers.get("ETag")
  });

  await supabase.from("etl_meta.job_run").insert({
    source_id: "bkk-gbfs-status", status: "success",
    rows_in: json.data.stations.length, rows_out: rows.length,
    trigger: "cron", finished_at: new Date().toISOString()
  });

  return new Response(JSON.stringify({ rows: rows.length, ts }), { status: 200 });
});
```

---

## 7. Vector tile-ok ST_AsMVT-vel (Martin helyett)

```sql
CREATE OR REPLACE FUNCTION public.cycling_mvt(z int, x int, y int)
RETURNS bytea LANGUAGE plpgsql STABLE AS $$
DECLARE
  result bytea;
BEGIN
  SELECT ST_AsMVT(tile, 'cycling_routes', 4096, 'geom')
  INTO result
  FROM (
    SELECT
      master_id::text AS id,
      name,
      tags->>'network' AS network,
      length_m,
      ST_AsMVTGeom(
        ST_Transform(geom_merged, 3857),
        ST_TileEnvelope(z, x, y),
        4096, 64, true
      ) AS geom
    FROM cycling.route_master
    WHERE geom_merged && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
  ) AS tile
  WHERE tile.geom IS NOT NULL;

  RETURN result;
END $$;
```

```typescript
// supabase/functions/tiles_mvt/index.ts
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const [, , z, x, y] = url.pathname.match(/\/tiles\/(\w+)\/(\d+)\/(\d+)\/(\d+)\.pbf$/) ?? [];
  if (!z) return new Response("not found", { status: 404 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await supabase.rpc("cycling_mvt", { z: +z, x: +x, y: +y });
  if (error) return new Response(error.message, { status: 500 });

  return new Response(data, {
    headers: {
      "Content-Type": "application/x-protobuf",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
```

Cloudflare a `Cache-Control: s-maxage=604800` miatt CDN-en cache-eli — gyakorlatilag ingyenes "Martin-helyettes".

---

## 8. Mit veszítünk a Supabase-re váltással?

| Veszített képesség | Mértéke | Hatás | Mitigáció |
|--------------------|---------|-------|-----------|
| TimescaleDB continuous aggregates | Közepes | Bubi-historikus aggregátok kézi `MATERIALIZED VIEW`-vé válnak | `pg_cron` `REFRESH MATERIALIZED VIEW CONCURRENTLY` óránként |
| Airflow DAG-ok | Kis | Komplex függőség-gráfok pg_cron + pgmq kombóra esnek | A jelenlegi 9-forrás függőség lineáris (OSM → master_view refresh → tile cache invalidate), Airflow túlzás. |
| Edge Function 256 MB / 50s limit | Közepes | OSM PBF parsing nem fér ide | GitHub Actions runner heti egyszer (free 2000 perc/hó) |
| Redis sub-ms cache | Kis | Forró Bubi-állomáslista lekérdezés 30-50 ms helyett 80-120 ms | Cloudflare KV edge cache 5-20 ms-szal, vagy Postgres `MATERIALIZED VIEW` Bubi-aggregátra |
| Prometheus saját metrika | Közepes | Csak Supabase Dashboard metrikák | Logflare → Grafana Cloud free (10K metrika sorozat) |
| Vector tile QPS skálázás | Közepes | ST_AsMVT egy DB hívás per tile | Cloudflare CDN cache 7 nap → effektíven DB-t 1× hívunk per tile per hét |

---

## 9. Mit nyerünk a Supabase-re váltással?

| Nyert képesség | Érték |
|----------------|-------|
| Auth + RLS out of the box | Nincs külön auth-szerver, JWT-alapú publikus/admin elválasztás natív |
| PostgREST auto-CRUD | Az API ingyen jön — `/rest/v1/cycling.route?bbox=...` működik egyetlen sor REST nélkül |
| Realtime subscribe Bubi-változásra | Frontend `supabase.channel('gbfs').on('postgres_changes', ...)` egyetlen kliens-kódsor |
| Storage S3-kompatibilis | MinIO üzemeltetés-mentes |
| pg_net SQL-ből HTTP | Külső API-kat közvetlenül SQL `SELECT net.http_get(...)` |
| Vault Postgres-natív secrets | Külön Vault szerver nem kell |
| 0 DevOps overhead | Backup, replikáció, monitoring, patch automatizált |
| panellako egyetlen háttér | Egy projekt, egy auth, egy billing |

---

## 10. Új költségbecslés (Supabase-alapú)

| Komponens | Csomag | Havi költség |
|-----------|--------|--------------|
| Supabase Pro | Pro plan ($25 + use-based) | $25 alap + ~$10 use (DB 8 GB, Storage 100 GB, Edge Function 2M invocation, ingress/egress 50 GB) | **~€35** |
| GitHub Actions runner (heti OSM PBF parse) | Free 2000 min/hó (private repo) — heti 30 min = 120 min/hó | **€0** |
| Fly.io worker (heti BKK infra merge) | Free tier 3 shared-cpu-1x | **€0** |
| Cloudflare (vector tile CDN cache) | Free plan | **€0** |
| Grafana Cloud (free) | 10K series, 14d retention | **€0** |
| **Összesen** | | **~€35/hó** |

**Összehasonlítás az eredeti tervvel:** €300/hó önhostolva → **€35/hó Supabase-en**. A különbség (~€265/hó × 12 = €3 180/év) a Supabase-nek a meglévő projekt-beli pozíciójából **gyakorlatilag 0 többletköltség**, mert a panellako-projekt amúgy is Pro-csomagon van — a cycling-data csak hozzáadódik a meglévő erőforrásokhoz.

---

## 11. Implementációs roadmap (újraidőzítve Supabase-re)

| Verzió | Tartalom | Becsült idő |
|--------|----------|-------------|
| **v0.7.1** | `cycling`, `gbfs`, `etl_meta` sémák + extension-ok + RLS policies + Supabase Vault secrets | **3 nap** |
| **v0.7.2** | OSM Geofabrik HU GitHub Actions heti pipeline (osm2pgsql + Supabase service_role REST upload) | **1 hét** |
| **v0.7.3** | BKK GBFS Edge Function minutely + pg_partman + Realtime channel | **3 nap** |
| **v0.7.4** | Cycling Waymarked Trails Edge Function daily + `cycling.route_master` MV | **3 nap** |
| **v0.7.5** | kormany.hu hash-diff change-detector + KENYI XLSX import Edge Function | **1 hét** |
| **v0.8.0** | Vector tile Edge Function (`ST_AsMVT`) + REST endpoints + frontend térkép-réteg | **1 hét** |
| **v0.8.1** | Természetjáró.hu (PR után) + Bicikliparkoló kereső + OSM amenity merge | **1 hét** |
| **v0.9.0** | Grafana Cloud dashboard + quality-gate SQL function-ok + admin publish/rollback Edge Function | **1 hét** |
| **v1.0.0** | Hardening + runbook + production sign-off | **1 hét** |

**Összes MVP idő (v0.8.0):** **~5 hét** (Supabase-en — szemben az eredeti **11 héttel** önhostolt klaszteren). Az infrastruktúra-építést kihagyjuk, csak séma + Edge Function + cron-konfiguráció van.

---

## 12. Konkrét következő lépések (panellako-specifikus)

1. **Supabase Dashboard → Database → Extensions:** engedélyezni `postgis`, `pg_partman`, `pgmq` (a `pg_cron`, `pg_net`, `pgcrypto`, `vault` már alapból be van kapcsolva a panellako projekten — ezt csak megerősíteni kell).
2. **`supabase/migrations/<timestamp>_cycling_init.sql`:** a 4. fejezet DDL-jét bemásolni, és `supabase db push`-sal kihúzni.
3. **Vault titok hozzáadása:** `edge_function_invoke_key` (ugyanaz, mint a `SUPABASE_ANON_KEY` vagy `SERVICE_ROLE` projekt-specifikus jogosultsággal), `fly_worker_token` (ha van Fly.io worker).
4. **Storage bucket létrehozása:** `cycling-snapshots`, public = false, csak service_role-nak ír.
5. **Edge Function-ök leiratkozása:** a 6-7. fejezetekből indulva forrásonként egy `.ts` fájl, `supabase functions deploy fetch_bkk_gbfs_status` stb.
6. **`pg_cron` időzítések:** az 5. fejezet `SELECT cron.schedule(...)` blokkjait egyenként futtatni a Supabase Studio SQL Editor-ban (vagy migrációban).
7. **GitHub Actions:** új workflow `.github/workflows/cycling_osm_weekly.yml`, csütörtök 03:00 UTC, futtat `osm2pgsql --slim --output=flex -S cycling.lua hungary-latest.osm.pbf`, majd `pg_dump`-pal vagy egyenkénti `COPY`-val Supabase service_role-on át írja a `cycling.way` táblát.
8. **Fly.io worker** (opcionális, csak ha a BKK infra GeoJSON-merge nem fér Edge Function-be): külön `Dockerfile`, `fly deploy`.
9. **panellako frontend integráció:** `app/cycling/page.tsx` Map widget (Mapbox GL JS vagy MapLibre GL) + `https://<project>.supabase.co/functions/v1/tiles_mvt/cycling/{z}/{x}/{y}.pbf` mint vector tile source.

---

## 13. Összegző válasz a kérdésre

**Igen, az egész terv fut Supabase-en**, és **olcsóbb és gyorsabb** megvalósítani, mint az eredeti önhostolt verziót, ha:

- TimescaleDB helyett **pg_partman + BRIN** (funkcionálisan ekvivalens GBFS-history-ra)
- MinIO helyett **Supabase Storage**
- Redis helyett **MATERIALIZED VIEW + Cloudflare CDN-cache**
- FastAPI/PostgREST helyett **beépített PostgREST + Edge Functions**
- Martin tile-server helyett **`ST_AsMVT()` Edge Function-ből + Cloudflare cache**
- k8s CronJob + Airflow helyett **pg_cron + pg_net + pgmq**
- Prometheus + Grafana helyett **Supabase Dashboard + Grafana Cloud free**
- 2 forrás (OSM PBF heti parse, BKK infra heti merge) **külső workerre** kerül — GitHub Actions runner és Fly.io free tier elég.

**Új költség:** ~€35/hó (gyakorlatilag €0 többlet a meglévő panellako Supabase Pro-csomagon).
**Új MVP-idő:** ~5 hét (11 hét helyett).
**Karbantartási teher:** 1 darab Supabase projekt + 1 GitHub Actions workflow + opcionálisan 1 Fly.io worker.

Lásd még: `cycling-data-sources/00_MASTER_PLAN.md` az architektúra-független integrációs döntésekhez.
