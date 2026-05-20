# fetch-bkk-gbfs-status

Minutely poller for the BKK MOL Bubi GBFS v3 `station_status` feed. Performs a
conditional GET (ETag / If-Modified-Since), normalises every station record into
`gbfs.station_status`, archives the raw JSON to Supabase Storage, and writes a
`etl_meta.job_run` audit row.

Source: <https://gbfs.bubi.bkk.hu/gbfs/v3/station_status.json>

Related spec:
- `cycling-data-sources/00b_SUPABASE_BACKEND.md` (§6)
- `cycling-data-sources/28_bkk-bringas-terkep.md`

## Required Vault secrets

None. The function only uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`,
which are injected automatically by the Supabase Edge runtime.

## Required tables / buckets

Created by the cycling-data migration (see `supabase/migrations/`):

- `gbfs.station_status` (partitioned by `ts`, PK `(station_id, ts)`)
- `etl_meta.feed_etag` (PK `feed`; columns `etag`, `last_modified`, `updated_at`)
- `etl_meta.job_run` (audit)
- `etl_meta.parse_error` (best-effort)
- Storage bucket `cycling-snapshots` (private, service-role write)

## Deploy

```bash
supabase functions deploy fetch-bkk-gbfs-status --no-verify-jwt
```

`--no-verify-jwt` is required because pg_cron invokes the function with a
service-role bearer token, not a user JWT.

## Schedule

Wired up via `pg_cron` + `pg_net` in the cycling-data migration:

```sql
SELECT cron.schedule(
  'fetch-bkk-gbfs-status',
  '* * * * *',
  $$ SELECT net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/fetch-bkk-gbfs-status',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || vault.decrypted_secret('edge_function_invoke_key'),
         'Content-Type', 'application/json'
       ),
       body := '{}'::jsonb
     ); $$
);
```

## Local development

```bash
# Start the function locally (uses the local Supabase stack).
supabase functions serve fetch-bkk-gbfs-status --env-file ./supabase/.env.local

# Trigger it manually.
curl -X POST http://localhost:54321/functions/v1/fetch-bkk-gbfs-status \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Manual trigger against deployed function

```bash
curl -X POST https://<project>.supabase.co/functions/v1/fetch-bkk-gbfs-status \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Inspecting logs

```bash
# Live tail.
supabase functions logs fetch-bkk-gbfs-status --tail

# Last 24 hours of audit history.
psql "$SUPABASE_DB_URL" -c "
  SELECT started_at, finished_at, status, rows_in, rows_out, error_message, snapshot_uri
  FROM etl_meta.job_run
  WHERE source_id = 'bkk-gbfs-status'
  ORDER BY started_at DESC LIMIT 50;"
```

## Failure modes

| Symptom | Job status | What it means |
|---------|------------|---------------|
| Response body `{ skipped: true }` | success, rows_in=0 | Upstream returned 304 — no new data this minute. |
| Response 502, `HTTP 5xx` | failure | Upstream Bubi feed is down or throttling us; retried 3× internally already. |
| Response 422, `data.stations is not an array` | failure (also parse_error) | Upstream changed schema; investigate before next poll. |
| `error_message LIKE 'duplicate%'` | success (but rows_out=0) | We polled twice in the same minute (clock drift); benign. |
| Response 500, `Database insert failed` | failure | Likely a missing partition (pg_partman maintenance lagging) — run `SELECT partman.run_maintenance();`. |
| `snapshot_uri IS NULL` on success | success | Storage upload failed (likely duplicate object); status rows were still inserted. |
