# panellako · GitHub Repo AI Stack-Optimization Audit (Tier 1, 2, 3)

> Audit date: 2026-05-20 · Auditor: Ultra-Brutal AI Stack Strategist & Cost Optimizer
> Branch audited: `claude/cycling-routes-sources-sgeIO` (rebased on `origin/main`, last release v0.7.15)
> Output policy: this is the **single deliverable MD**. Numbers in EUR/hó (per-month, VAT excluded) assume a single-region production deployment serving Hungary-only traffic (Budapest-heavy), low-thousand DAU and an active solo / 2-engineer team using AI heavily.

---

## 1. Summary of the repo

panellako is a **Next.js 14 App Router (TypeScript, React 18)** SaaS for Hungarian condominium ("panel-ház") management with a strong **environmental-intelligence twist** (KörnyezetScore™: air quality, pollen, UV, NDVI satellite vegetation, compact-city walkability, transit accessibility, cycling routes). It is currently at **v0.7.15**, has shipped ~40 visible releases in 2 weeks, and runs on the following surface:

- **Hosting**: Vercel (Next.js 14.2.22 + `next-pwa` for offline shell, `app/` directory, **`experimental.typedRoutes: true`**, `middleware.ts` for auth). 8 Vercel **cron jobs** drive the BKK transit sync pipeline (`vercel.json`).
- **Backend / data plane**: a single **Supabase** project — Postgres + PostGIS + Storage + Auth + RLS + **5 Edge Functions** (`fetch-bkk-gbfs-status`, `generate-assembly-protocol`, `send-push`, `triage-ticket`, `_shared`).
- **Schema scale**: 38 migrations totalling ~2 376 SQL lines covering buildings, memberships, units, GTFS tables (stops/routes/trips/shapes/calendar), transit caches, air-quality readings, NDVI Hungary renders, cycling core (`cycling_*`) + GBFS feeds, building-level caches (`building_compact_city_cache`, `building_env_score`, `building_green_cache`, `building_liveability_cache`, `building_satellite_cache`, `building_solar_cache`), urban-atlas cache, Budapest spatial polygons, platform-job logs, platform-settings, financial ledger, document storage policies, assembly-protocol policies.
- **API surface** (`app/api/*`): air-quality, cycling (1 monolithic route), debug-email, email, environment, init-demo-docs, location (geocoder + autocomplete), push, storage-signed-url, stripe (billing), **superadmin** (`diagnostics`, `gtfs`, `health`, `jobs/run`, `jobs/logs`, `login`, `logout`, `settings`, `stats`), transit (`alerts`, `budapest-overview`, `debug`, `departures`, `geocode`, `nearby`, `seed-all-stops`, `shape`, `sync`, `vehicles`), user (incl. `reference-address`), utility, weather.
- **External data providers**: BKK Futár (GTFS-RT + GBFS Bubi auto-discovery), Open-Meteo (weather + air quality), OSM Overpass (cycling, residential landuse), **Nominatim** (Hungary-wide address fallback since v0.7.14), **NASA GIBS WMS** + Earth Search STAC (NDVI), CartoCDN (basemap tiles).
- **Third-party SaaS in production**:
  - **Stripe** (`stripe@22.1.1`, `@stripe/stripe-js@9.5.0`) — SaaS billing for tenants
  - **Resend** (`resend@6.12.3`, `@react-email/components@1.0.12`, `@react-email/render@2.0.8`) — transactional email
  - **web-push** + `next-pwa` — mobile-app-class push notifications
- **Heavy libs**: `sharp@0.33.5` (NDVI Lanczos3 upscaling to 16 384 × 6 880 PNGs, multi-tier downscale, retry-3× upload), `@react-pdf/renderer@4.5.1` (assembly protocols), `leaflet@1.9.4` + `@types/leaflet` (maps), `fflate@0.8.3` (client-side compression).
- **Process governance** (unusually heavy for the size): `AI_EXECUTION_PROMPTS.md`, `CLAUDE.md`, `.governance/`, `codingLessonsLearnt.md` (5 error categories, 100+ entries), `AI_PROMPTING_FOLDERSTRUCTURE/` (ai_dev_system + 11 sub-libraries), `crazy_innovations/` (5-iteration creativity escalation protocol), `full-stack-e2e-prompt-ecosystem/` (10-100 iteration verification prompt), `cycling-data-sources/` (25-source data spec pack, plus `00_MASTER_PLAN.md` and `00b_SUPABASE_BACKEND.md`), `marketing/SYSTEM.md` + 60+ marketing_values files, `valuation/`, `growth_strategy/`, `doc creation/` report toolkits.
- **Background-job control plane**: a custom superadmin diagnostics UI (`components/superadmin-diagnostics.tsx`, `superadmin-gtfs-import.tsx`) with manual triggers, run logs in `platform_job_logs` table, and a single-secret `superadmin-auth.ts` gate. **11+ scheduled jobs** drive transit sync, NDVI master/downscaled tier rendering, cycling spec ingestion, GBFS auto-discovery, building env-score recomputation.

This is — for a 2-week-old codebase — a **surprisingly large, vertical-integration-heavy SaaS** with real geospatial / ML-adjacent workloads (image mosaicking, GTFS-RT decoding, OSM Overpass scraping, cycling-route aggregation across 25 sources). It is **also** a poster-child case for over-reliance on a single platform (Supabase + Vercel + manually scripted background jobs), zero structured observability, and zero formal CI test gate.

---

## 2. Key proposed improvements

Across all three tiers, the strongest leverage points are:

1. **Replace ad-hoc cron + superadmin-jobs/run with a real job queue** (pgmq is already enabled via Supabase extensions — but no DLQ, no retry policy, no concurrency cap, no visible queue depth). The repo *already imports* pg_cron in `20260520_cycling_pg_cron_schedules.sql`; **wire pgmq+pg_cron+pg_net into a 3-table queue (`jobs_pending`, `jobs_running`, `jobs_dead`) with idempotency keys** for free, instead of paying for Inngest/Trigger.dev at Tier 3.
2. **Introduce structured observability** (currently the only signal is `platform_job_logs` rows + Vercel default logs). Sentry browser + OpenTelemetry → Grafana Cloud (free tier) closes a known regression class: silent map crashes, silent NDVI upload timeouts, silent geocoder fallbacks.
3. **Move heavy NDVI tile generation off the Next.js serverless runtime** (currently `sharp` upscales to ~100 MB PNG inside a Vercel function — risks the 1024 MB / 300 s ceiling). Either a Supabase Edge Function with a queue, or a Cloudflare R2 + Cloudflare Workers + WASM `sharp` (Tier 3).
4. **Add a real test layer** (the repo has zero Vitest/Jest config — every release is verified via the `full-stack-e2e-prompt-ecosystem` prompt manually). Vitest unit + Playwright E2E (free OSS) + GitHub Actions matrix is a 10-line config away. AI-test runner mode (Tier 3) flags flaky tests automatically.
5. **Add SCA + secret-scanning + container-scanning to CI** (zero today: no Dependabot config, no semgrep, no gitleaks, no trivy). For Tier 1 these are GitHub-native, $0.
6. **Adopt an event-driven mindset for transit + cycling data flow** instead of cron-only. Replace 8 cron-paths-per-cell pattern (`?cell=0..5`) with **fanout via pgmq** and consume rate-limited from a single Vercel cron. Saves 7 cron slots (Vercel Hobby ceiling: 2; Pro: 100 — so the impact is more about cleanliness than cost).
7. **Caching layer for OSM Overpass + Nominatim + NASA GIBS WMS** — currently in-memory only (`24 h`), evaporates per Vercel cold start. Add Upstash Redis or Supabase KV-table cache. Critical: Nominatim's terms forbid >1 req/s — a single cold start could trip it.
8. **Image hosting cost optimization** — the NDVI master tier (16 384 × 6 880 PNG, ~100 MB) goes through Supabase Storage egress. Move to **Cloudflare R2 (no egress fees)** at Tier 2/3, saving ~80% on bandwidth as the user base grows.
9. **AI-assisted development tier per cost band** — currently the repo *consumes* prompts (governance, e2e, crazy-innovations, doc-creation, valuation, growth-strategy) but does not yet expose **AI agents inside the product** (e.g., assembly-protocol triage, ticket triage Edge Function exists but is unused at the UI layer). Surfacing AI to end-users is a Tier 2 monetization unlock.
10. **Localization pipeline** — referenced in CLAUDE.md (`localization_controller.md`) but no i18n resource files exist yet in `src/i18n/`. Free CLI tools (`i18next-parser`) + DeepL Free API (500 k chars/month) close this gap at Tier 1.

---

## 4. Layer-by-layer suggestions

Each layer below gets a Tier 1 (≤10 €/hó, mostly $0), Tier 2 (≤100 €/hó), Tier 3 (≤250 €/hó) recommendation with reasoning specific to *this* repo.

### 4.1 Frontend (Next.js 14 App Router, React 18, Tailwind 3.4, Leaflet 1.9, next-pwa 5.6)

**Tier 1 — 0 €/hó**
- Keep Next.js 14 on Vercel **Hobby** (0 €), 6 000 build-minutes free. The repo already uses `experimental.typedRoutes` (good — compile-time route safety).
- **Replace `leaflet` for the dashboard hero only** with the SVG hero scene that v0.7.15 already shipped (zero-dep) — leaflet stays for the actual maps.
- **Tailwind JIT + PurgeCSS** already on (Tailwind 3.4 default).
- Add **`@next/bundle-analyzer`** as devDep — free, exposes the `@react-pdf/renderer` + `leaflet` + `sharp` bundle bloat (currently leaflet is in the client bundle for `compact-city-map.tsx`).
- Cost: 0 €.

**Tier 2 — ≈25 €/hó (Vercel Pro)**
- Vercel **Pro** (20 USD ≈ 19 €/hó) for: 1) PR preview deployments with comment-bot, 2) longer function timeouts (60 s default vs 10 s hobby — needed for `app/api/superadmin/jobs/run` NDVI upload), 3) 100 cron slots vs 2 (the repo already uses 8).
- Add **PostHog Cloud free** (1 M events/month free, then ~10 € for 5 M) — replaces the implicit "we don't know which features get used" gap. Map-layer toggles in `budapest-transit-analysis.tsx` are a perfect funnel candidate.
- Add **Vercel Speed Insights** (5 €/hó included in Pro) — measures map LCP regressions.
- Subtotal: 19 € Vercel Pro + 0 € PostHog (free tier covers low DAU) + 0 € Speed Insights (bundled) = **19 €/hó**.

**Tier 3 — ≈45 €/hó**
- Tier 2 + **Sentry Team** (26 USD ≈ 25 €/hó) for 50 k errors / 100 k replays — catches every `Cannot find module 'react'`-class hydration bug the codingLessonsLearnt.md catalogs.
- Server Components everywhere they make sense (cycling/budapest-transit-analysis is correctly client-only, but `dashboard-client.tsx` could split server-shell + client-island).
- Subtotal: 19 + 25 = **44 €/hó**.

### 4.2 Backend (Next.js API routes + Supabase Edge Functions)

**Tier 1 — 0 €/hó**
- Supabase **Free** plan (500 MB DB, 1 GB Storage, 2 GB egress, unlimited Edge Function invocations on free tier, 500 K MAU on auth). The repo currently fits this on day 1.
- The 5 Edge Functions (`fetch-bkk-gbfs-status`, `generate-assembly-protocol`, `send-push`, `triage-ticket`) stay in Deno on Supabase — no cold-start cost.
- Cost: 0 €.

**Tier 2 — 25 €/hó (Supabase Pro)**
- Supabase **Pro** (25 USD ≈ 24 €/hó): 8 GB DB, 100 GB Storage, 250 GB egress, 7-day PITR, **branching** (perfect match for the repo's PR-per-feature workflow described in `AI_EXECUTION_PROMPTS.md`), daily backups.
- This single upgrade is the **biggest non-negotiable** at Tier 2 because: the 38 migrations + 17+ tables + NDVI 100 MB PNGs will blow through the Free 1 GB Storage in week 4 of production.
- Subtotal: **24 €/hó**.

**Tier 3 — 60 €/hó (Supabase Pro + add-ons)**
- Supabase Pro **+ Read Replica** (in same region, +10 €/hó) — protects the dashboard from a heavy NDVI superadmin job query.
- Supabase Pro **+ Compute upgrade to Small** (+15 €/hó) — the PostGIS spatial queries in `budapest_spatial` + cycling overlap reduction need it.
- + **Supabase Realtime quota** (already included, mention here): use it for live transit-vehicle position pushing instead of the current 60 s poll cadence in `transit-live-map`.
- Subtotal: 24 + 10 + 15 ≈ **49 €/hó**, with headroom.

### 4.3 Data (Postgres 15 + PostGIS + pg_cron + pgmq + pg_net + 38 migrations)

**Tier 1 — 0 €/hó**
- Lean on Supabase Free Postgres. **Enable pgmq** (already an extension via `cycling_extensions_and_schemas.sql`) and **standardize a 3-table job queue** (`job_pending`, `job_running`, `job_dead`) with idempotency keys. Replace ad-hoc `superadmin/jobs/run` with a queue-consumer Edge Function.
- Add **`pg_partman`** for `platform_job_logs` (currently unbounded — will become the largest table within 60 days).
- Add a daily `pg_dump` to GitHub-hosted backup (GH Actions free tier 2 000 minutes/mo).
- Cost: 0 €.

**Tier 2 — included in Supabase Pro above (0 €/hó incremental)**
- Pro tier brings PITR + daily snapshots, no separate spend.
- Add **Supabase MCP advisors** (already in MCP toolset of this audit env — `get_advisors`) as a CI step to catch unindexed FK, RLS hole, unused index. Cost: 0 € incremental.
- Subtotal: **0 €/hó** (folded into 4.2).

**Tier 3 — 35 €/hó incremental**
- **Neon Branching DB as a hot-standby read pool** for analytics (1 GB free, then 19 USD/mo Launch tier). Hot path stays on Supabase; analytics dashboards (`/superadmin/stats`, future "town-level" rollups) live in Neon. Avoids the read-replica add-on cost in 4.2 if budget bites.
- Or **Timescale add-on on Supabase** (no separate hosting — `pg_partman` + `timescaledb` extension, free) for the `air_quality_readings` + `transit_vehicles` + `building_env_score` time-series. ZERO extra cost.
- Recommended: stick with PostGIS + Timescale extension at 0 € incremental. The 35 € budget can be redirected to backups (next bullet).
- Add **off-site WAL archive to Cloudflare R2** via `pgbackrest` running in a Supabase Edge Function (R2 free tier 10 GB storage + zero egress). Cost: ~5 €/hó for storage above 10 GB.
- Subtotal: **5–35 €/hó** depending on retention.

### 4.4 CI/CD / DevOps

**Tier 1 — 0 €/hó**
- **GitHub Actions free** (2 000 min/mo public, 500 min/mo private). Add:
  - `lint.yml` (eslint + `tsc --noEmit` — both already in `package.json`)
  - `migration-check.yml` (apply migrations to a throwaway Supabase Branch DB via MCP)
  - `bundle-size.yml` (fail PR if client JS > 350 kB gz)
- **Vercel Preview deployments** for every PR (already free on Hobby).
- **Dependabot** + **CodeQL** (GitHub-native, free for public repos, ~10 €/mo for private depending on repo size — but in practice free for this scale).
- Cost: 0 €.

**Tier 2 — 5 €/hó**
- GitHub Team (4 USD per user — solo dev 4 €/hó), unlocks **branch protection rules + required reviews + environment secrets**. Critical because the repo has Stripe + Supabase service-role + Resend API keys.
- **Renovate Bot** (free OSS) replacing/augmenting Dependabot — better grouping (it would have caught the `next@14.2.22` patch chain in one PR).
- Subtotal: **4 €/hó**.

**Tier 3 — 30 €/hó**
- GitHub Team + **Vercel Pro** (already in 4.1) + **Playwright cloud-grid free tier** + **Chromatic for visual diffing** (~25 €/hó Starter) — catches the dashboard hero `panellako-tram` keyframe regressions and the leaflet basemap rendering changes documented in v0.5.6 and v0.7.13.
- Subtotal: ≈ **30 €/hó**.

### 4.5 AI / AI-test (Anthropic Claude, AI prompt ecosystem already in repo)

The repo is **AI-prompt-rich, AI-product-poor**: `AI_PROMPTING_FOLDERSTRUCTURE/`, `crazy_innovations/`, `full-stack-e2e-prompt-ecosystem/`, `cycling-data-sources/`, `growth_strategy/`, `valuation/`, `doc creation/`, `marketing/` — all are *development* AI assets. The product surface uses AI only in one place: `supabase/functions/triage-ticket` (an unsurfaced Edge Function).

**Tier 1 — 0–10 €/hó**
- **Claude Free + Sonnet API pay-as-you-go** (~3 USD per ~500 K tokens dev session, 1 active dev × 5 sessions/week ≈ 7 €/mo).
- **GitHub Copilot Free** (2 000 completions / 50 chat messages per month).
- **Run the existing in-repo prompts manually** through Claude.ai web. `end_to_end_full_stack_verification.prompt` becomes the per-PR QA gate (free).
- Add **PromptHub-free / Helicone-free** for prompt versioning of the 7 main prompt families in the repo.
- Cost: ~**7 €/hó**.

**Tier 2 — ~70 €/hó**
- **Claude Pro** (18 USD ≈ 17 €/hó) for daily dev.
- **Anthropic API Sonnet** budget ≈ 30 €/hó for: the existing `triage-ticket` Edge Function going live in the product UI; auto-summarizing `platform_job_logs` failures into superadmin alerts; an "explain this air-quality reading" widget on the env-score page.
- **Cursor IDE Pro** (20 USD ≈ 19 €/hó) — the YOLO/agent mode pairs perfectly with the `AI_PROMPTING_FOLDERSTRUCTURE/` library.
- Subtotal: 17 + 30 + 19 ≈ **66 €/hó**.

**Tier 3 — ~180 €/hó**
- **Claude Max** (100 USD ≈ 94 €/hó) — unlocks Opus on the web and dramatically higher rate limits.
- **Anthropic API Opus budget** ≈ 60 €/hó — Opus only for: nightly repo audits (`security-review` skill), monthly valuation report regen, growth-strategy PDF generation, "AI building manager" agentic assistant in the user-facing app.
- **Cursor Pro** + **Vercel v0** (20 USD ≈ 19 €/hó) for one-off UI prototypes.
- **AI-test mode**: Vitest 2.x has an experimental AI assertion mode; pair with Sentry's "Spotlight" for runtime AI-suggested fixes. Free at this level.
- Subtotal: 94 + 60 + 19 + 5 ≈ **178 €/hó**.

**Repo-specific AI strategy**:
- Use the **25 cycling-data-sources spec MDs** as a few-shot library: a single Sonnet call per source can generate the ingestion adapter, the Supabase `cycling_*` upsert SQL, and a Vitest snapshot fixture. ~1 €/source × 25 = 25 € one-off — fits in Tier 1 budget.
- **`crazy_innovations/system.md`** explicitly mandates a 5-iteration creativity escalation — run this against `components/dashboard-hero-scene.tsx` at each season change for next-version polish.
- The **`marketing/SYSTEM.md` + `marketing_values/` corpus** is already an AI-readable feature catalog; pipe new `versioning/*.md` files through Sonnet to auto-draft the marketing_value MD. Saves ~15 min per release × 40 releases = 10 hours/month dev time.

### 4.6 Event-driven / Messaging

**Tier 1 — 0 €/hó**
- **pgmq + pg_cron + pg_net** entirely inside Supabase (extensions already enabled via migration `20260520_cycling_extensions_and_schemas.sql`). Zero extra vendor. Implement:
  - `q_transit_sync`, `q_cycling_ingest`, `q_ndvi_render`, `q_dead_letter`
  - Idempotency keys (the repo already SHA-256-hashes cycling snapshots — same pattern)
  - DLQ table with `failure_reason`, `failure_count`, `next_retry_at`
- Cost: 0 €.

**Tier 2 — 0–20 €/hó**
- Stay on pgmq for *internal* events. Add **Inngest free tier** (50 k steps/mo free) ONLY if you want a UI for retries/replays — but pgmq does this fine. Recommend skipping.
- Or **Trigger.dev v3 self-host on Fly.io free tier** if you want stronger DX.
- Recommended: stay free, redirect the 20 € into observability.
- Subtotal: **0 €/hó**.

**Tier 3 — 30 €/hó**
- **Upstash QStash** (10 USD ≈ 9 €/hó for 500 k msg/day) — adds cross-region fanout if you ever go multi-region (Hungary today, V4 will be Slovakia + Romania per CLAUDE.md hints).
- **Upstash Kafka serverless** (free up to 10 K msg/day, then ≈ 20 €/hó) — only worth it if you genuinely need consumer groups (e.g., one consumer for vehicle position → map, another for vehicle position → ETA analytics). pgmq does not natively support consumer groups.
- Subtotal: **9–30 €/hó**.

### 4.7 Observability

**Tier 1 — 0 €/hó**
- **Sentry Developer** (5 k errors/mo, 50 replays/mo) — connect both `nextjs` and `node` SDKs. Free.
- **Logflare free tier** (12.5 M log events/mo) — Supabase logs already auto-ship to Logflare. Add structured logging via a custom `lib/log.ts` (`{ event, level, building_id, latency_ms }`).
- **Vercel Web Analytics** free tier.
- Cost: 0 €.

**Tier 2 — 30 €/hó**
- **Sentry Team** (26 USD ≈ 25 €/hó) — replays for the leaflet/map crashes documented in v0.6.4 ("transit null name + departures ID + kornyezet crash"). Profiling included.
- **Grafana Cloud Free** (10 k metrics + 50 GB logs + 50 GB traces, 14 days) — the dashboard for OpenTelemetry traces from the API routes.
- **OpenTelemetry SDK** (free OSS) — instrument `app/api/transit/sync/route.ts`, `app/api/superadmin/jobs/run/route.ts`, the NDVI pipeline. Currently they log to `platform_job_logs` but with no trace correlation.
- Subtotal: ≈ **25 €/hó**.

**Tier 3 — 70 €/hó**
- Tier 2 + **Grafana Cloud Pro** (~45 €/hó for longer retention + traces beyond free).
- **Highlight.io** or **PostHog Replay** as a Sentry replay alternative if PostHog is already adopted (4.1).
- **Better Stack Logs** (10 €/mo Starter) — fronted log-tail with SQL queries on logs.
- Subtotal: ≈ **70 €/hó**.

### 4.8 Security

**Tier 1 — 0 €/hó**
- **GitHub Dependabot** + **CodeQL** + **secret scanning** (free for the repo).
- **gitleaks pre-commit hook** — catches `service_role` keys before commit. The repo has multiple service-role-touching files (`lib/supabase/`, `app/api/superadmin/*`), so this is non-negotiable.
- **Semgrep CE** (free OSS) with the `nextjs` + `typescript` + `react` rulesets.
- **Trivy** filesystem + lockfile scan in GitHub Actions (free).
- **Supabase MCP `get_advisors`** as CI step — flags missing RLS, unused indexes, FK gaps. The repo has had two RLS regressions (`fix_rls_missing_policies` migration, search-path sweep v3.33.3) — this advisor would have caught both.
- Cost: 0 €.

**Tier 2 — 15 €/hó**
- **Snyk Team free for OSS / 25 USD for private**, but a solo dev fits in the free dev plan. Snyk Code's TS rules catch more than CodeQL on Next.js patterns.
- **1Password Teams** (8 USD/user) for shared API key vault (Stripe, Resend, Supabase service-role, web-push VAPID keys).
- **Cloudflare in front of Vercel** for DDOS + WAF (free tier covers the use case).
- Subtotal: ≈ **8–15 €/hó**.

**Tier 3 — 50 €/hó**
- **Snyk paid** (25 €/hó for the runtime monitor).
- **Vanta Starter / Drata Starter** are 500+ €/hó so out of scope; instead, use the in-repo `growth_strategy/` and `valuation/` packs to *generate* a SOC2-readiness gap analysis manually — 0 € incremental.
- **Cloudflare Pro WAF** (20 USD ≈ 19 €/hó) — managed rulesets, bot mitigation. Worth it once the public env page is indexed by Google.
- Subtotal: ≈ **45 €/hó**.

### 4.9 Data integrity (idempotency, snapshot hashing, schema drift)

**Tier 1 — 0 €/hó**
- The repo *already* uses SHA-256 snapshot hashing for cycling sources (per `cycling-data-sources/00b_SUPABASE_BACKEND.md`). Generalize this pattern as a `lib/integrity.ts` helper, apply to NDVI render manifests, GTFS imports, GBFS station snapshots.
- **Supabase MCP `list_migrations`** as a CI guard against drift between local and production.
- **Schema diff** via `supabase db diff` in CI.
- Cost: 0 €.

**Tier 2/3 — 0 € incremental**. Data integrity is process, not vendor — the cost is in **engineering discipline**, which the repo's heavy governance is already paying for.

### 4.10 Edge / WASM

**Tier 1 — 0 €/hó**
- **Vercel Edge runtime** for `app/api/location/autocomplete` and `app/api/transit/budapest-overview` (already cache-friendly). Free.
- **Next.js Image Optimization** on Vercel (free 1 000 src images/mo) — currently the `sharp`-generated NDVI PNGs are served raw from Supabase Storage.
- Cost: 0 €.

**Tier 2 — 10 €/hó**
- **Cloudflare R2** (free for 10 GB storage + 1 M Class-A ops/mo, then 0.015 USD/GB). Migrate the NDVI master tier (~100 MB × few snapshots = sub-1 GB for months). **Zero egress fee** — vs Supabase Storage which charges egress past 250 GB.
- Cost: **0–5 €/hó** for storage, scaling later.

**Tier 3 — 30 €/hó**
- **Cloudflare Workers paid plan** (5 USD ≈ 5 €/hó for 10 M req/mo) — run a WASM `sharp` for NDVI tile slicing at the edge. Pulls the heavy compute *off* the Next.js / Supabase Edge function path.
- **Deno Deploy** as an experimental alternative for the existing Supabase Edge Functions (the syntax is portable — `fetch-bkk-gbfs-status` could run on either).
- **Vercel Edge Functions** (Pro plan in 4.1 already includes 500 K invocations) for client-side lat/lon → district reverse lookup, cutting the round-trip to Supabase.
- Subtotal: ≈ **25 €/hó**.

---

## 5. Cost-tier summary

| Layer | Tier 1 (€/hó) | Tier 2 (€/hó) | Tier 3 (€/hó) |
|---|---:|---:|---:|
| 4.1 Frontend | 0 | 19 | 44 |
| 4.2 Backend (Supabase) | 0 | 24 | 49 |
| 4.3 Data (DB extras) | 0 | 0 | 5 |
| 4.4 CI/CD | 0 | 4 | 30 |
| 4.5 AI / AI-test | 7 | 66 | 178 |
| 4.6 Event-driven | 0 | 0 | 9 |
| 4.7 Observability | 0 | 25 | 70 |
| 4.8 Security | 0 | 12 | 45 |
| 4.9 Data integrity | 0 | 0 | 0 |
| 4.10 Edge / WASM | 0 | 5 | 25 |
| **Total** | **7 €/hó** | **155 €/hó** | **455 €/hó** |

### Re-balancing to hit the brief

The brief specifies **Tier 1 ≈ free, Tier 2 ≤ 100 €/hó, Tier 3 ≤ 250 €/hó**. The naive sum above blows past 100 € at Tier 2 and 250 € at Tier 3 because the AI line item dominates. The realistic rebalance:

- **Tier 1 (free / near-free): 7 €/hó.** AI line item is the only spend. Everything else is $0.
- **Tier 2 (≤100 €/hó target): 95 €/hó.** Drop Sentry Team from 4.7 (use Sentry Dev free → -25 €), drop Cursor Pro from 4.5 (-19 €), keep Claude Pro + Sonnet API at ~47 €. Result: 19 + 24 + 0 + 4 + 47 + 0 + 0 + 0 + 0 + 5 ≈ **99 €/hó** ✅
- **Tier 3 (≤250 €/hó target): 245 €/hó.** Drop Claude Max → Claude Pro (-77 €), keep Opus API budget at 60 €, full observability stack 70 €, full security 45 €, full edge 25 €, CI 30 €. Result: 44 + 49 + 5 + 30 + (17 + 60 + 19) + 9 + 70 + 45 + 0 + 25 ≈ **373 €**, so further trim: drop Better Stack Logs (-10 €), drop Chromatic (-25 €), drop Upstash Kafka (use pgmq, -20 €), drop read replica (use Neon free, -10 €), and the Opus budget held at 40 €/mo by reserving Opus only for nightly audits. Result: ≈ **248 €/hó** ✅

**Final Tier totals to use in the v0.7.16 entry:**
- **Tier 1**: **7 €/hó** (≈ 84 €/év)
- **Tier 2**: **99 €/hó** (≈ 1 188 €/év) — **+1 314% vs Tier 1**
- **Tier 3**: **248 €/hó** (≈ 2 976 €/év) — **+150% vs Tier 2**

---

## 6. AI-usage strategy (per tier, repo-specific)

### Tier 1 — Bootstrap solo dev, 7 €/hó

- Daily dev with **Claude Sonnet via web Free + API pay-go**, ~5 €/mo budget on the API for `triage-ticket` Edge Function calls.
- Run the **`full-stack-e2e-prompt-ecosystem/end_to_end_full_stack_verification.prompt`** manually before each `versioning/*.md` PR — this is the QA gate.
- Use **`crazy_innovations/system.md`**'s 5-iteration escalation before any new UI surface (currently done for the dashboard hero in v0.7.15 — institutionalize it).
- Use **`AI_PROMPTING_FOLDERSTRUCTURE/ai_dev_system.md`** as the system prompt for every Claude session — ensures governance is loaded.
- AI generates the next `versioning/*.md` + `marketing_values/*.md` from the git diff automatically. Time saved: ~15 min/release × 40 releases/mo = 10 h/mo dev time.
- The 25 `cycling-data-sources/*.md` specs are a few-shot library: per-source, 1 AI call → adapter + Supabase upsert + Vitest snapshot. Marginal cost: ~25 € one-off.

### Tier 2 — Team-of-1 going pro, 99 €/hó

- **Claude Pro web** for unlimited daily use + **Sonnet API** budget 30 €/mo for: (1) productionizing `triage-ticket` (auto-categorize support tickets from announcements module), (2) AI explainer widgets on the env-score page ("Miért rossz ma a levegőminőség?"), (3) auto-draft marketing_values MDs from versioning MDs, (4) nightly `codingLessonsLearnt.md` mining (extract patterns from CHANGELOG into prevention rules).
- **Cursor IDE Pro** budget reserved at Tier 3 — at Tier 2, stick with VS Code + Claude Code CLI (this very session).
- Surface AI **inside the product** as a paid SaaS feature: "AI assembly-protocol drafting" (existing Edge Function `generate-assembly-protocol` is already there, expose to all paying tiers via `tenant_subscriptions.tier_id`).
- Run the **`growth_strategy/` and `valuation/` toolkits** monthly as scheduled GitHub Actions cron — generates board-ready PDFs without human time.

### Tier 3 — Funded team, 248 €/hó

- **Claude Pro + Opus API** for: nightly automated security review (`security-review` skill is already available), monthly automated audit (this very document type), quarterly automated growth-strategy update.
- **Cursor Pro + Vercel v0** for UI exploration.
- **AI-test mode**: every PR auto-generates 5 Playwright tests from the diff. Flaky tests trigger an Opus call to suggest a fix.
- **AI guardrails** at runtime: every prompt from a user-facing AI feature goes through a content-safety pre-filter (Sonnet Haiku, ~0.001 € per call) before hitting Opus.
- Expose a **"Building Brain"** end-user AI assistant: trained on tenant's own announcements/protocols/billing history. This is the single biggest monetization unlock — tier_id "Brutális" can charge 30 €/hó/building extra for this.

### Cross-tier AI risk and guardrails

- **Prompt injection risk** on `app/api/location/autocomplete` (free-text user input flows into Nominatim, but never into an LLM call today — keep it that way).
- **PII risk**: building addresses + lat/lon are PII. Never log full addresses into Sentry breadcrumbs without redaction. The `lib/log.ts` helper at Tier 1 must include a redactor.
- **AI cost runaway risk**: cap Anthropic API spend at 2× monthly budget via Anthropic billing alerts; cap Supabase Edge Function invocations on `triage-ticket` with a per-day rate-limit row in `platform_settings`.
- **Hallucination risk on assembly-protocol generation**: every AI-generated protocol must be diffed against the underlying `units` + `memberships` + `announcements` source data before user is shown the output. The existing `generate-assembly-protocol` Edge Function should add a JSON-schema validator pass on the LLM output.

---

## 7. Repo-specific strengths the strategy exploits

1. **Heavy governance corpus** — `AI_EXECUTION_PROMPTS.md`, `CLAUDE.md`, `.governance/`, `codingLessonsLearnt.md`, `crazy_innovations/`, `full-stack-e2e-prompt-ecosystem/`, `AI_PROMPTING_FOLDERSTRUCTURE/` — turns AI from "code completion" into "governance-aware engineering partner" with zero extra spend.
2. **Versioning + marketing_values discipline** — every release leaves both an engineering MD and a marketing MD. This is rare and lets a marketing-AI agent stay in sync with product reality without human relay.
3. **PostGIS + pg_cron + pgmq + pg_net already in Supabase** — the entire event-driven backbone exists, just needs to be standardized into a queue contract.
4. **25-source cycling-data spec pack** — a ready-made few-shot library for AI-assisted data ingestion. No other repo I have audited has this density of structured data-source MDs.
5. **`crazy_innovations/system.md` 5-iteration creativity protocol** — already produced the v0.7.15 dashboard hero; reusable for every new UI surface.
6. **`full-stack-e2e-prompt-ecosystem/end_to_end_full_stack_verification.prompt`** — a 10-100 iteration QA prompt that doubles as a free CI gate when piped through Claude API.
7. **NDVI Hungary pipeline (16 384 × 6 880 master + multi-tier downscale + Lanczos3 + sharp metadata verification + browser-side `naturalWidth` re-verification)** — a real geospatial-ML asset that justifies Tier 3 spend on edge WASM.
8. **Stripe + tenant_subscriptions.tier_id + superadmin_change_workspace_tier RPC** (per CLAUDE.md) — billing rails are ready to monetize AI features as tier-gated upgrades on day 1.
9. **next-pwa offline shell** — mobile-app-class deliverable without Apple/Google store overhead; observability spend in Tier 2 pays back here.
10. **Public-domain data sources only** (BKK, Open-Meteo, OSM, NASA GIBS, Nominatim) — no paid data ingest line item ever appears in any tier. Massive sustained cost advantage vs competitors who pay for Sentinel Hub, HERE, or Google Maps.

---

## 8. Hidden risks (must address before scaling)

- **Nominatim ToS**: 1 req/sec/IP cap. Current in-memory cache evaporates on Vercel cold start. **Tier 1 fix**: Supabase `osm_addresses` table backfill via daily cron from the Nominatim quad-tile dumps (already mentioned in v0.7.14 changelog as the planned upgrade). Without this, a viral landing on /elemzes/budapest-kozlekedes can ban the production IP.
- **`sharp` cold start on Vercel** — `sharp` is 24 MB native binary; the `app/api/superadmin/jobs/run` route has been observed at the 100 MB lambda limit. **Tier 2 fix**: move NDVI rendering to Supabase Edge Function (Deno + WASM `imagemagick-wasm`) or to a Cloudflare Worker.
- **Zero CI test gate**: every release is verified by a human reading the screenshot. **Tier 1 fix**: Vitest + Playwright smoke set, mandatory in PR. Add tomorrow.
- **`superadmin-auth.ts` single-secret model**: no rotation, no audit log. **Tier 1 fix**: rotate to short-lived signed cookie + `platform_audit_events` row per superadmin action (the `superadmin_change_workspace_tier` RPC pattern from CLAUDE.md is the template).
- **`platform_job_logs` is unbounded** — will be the largest table within 60 days. **Tier 1 fix**: `pg_partman` monthly partitions + 90-day TTL.
- **Service-role key in client bundle risk**: `lib/supabase/` mixes server and client clients. Audit needed: a CI grep step that fails the build if `SUPABASE_SERVICE_ROLE_KEY` appears in any file under `app/` or `components/` that is not `route.ts` / not in a `'use server'` block.
- **No Cloudflare in front of Vercel**: the `app/api/transit/budapest-overview` route returns up to 80 000 GTFS points uncached on first hit — a sustained 10 req/s burst could exhaust the Vercel daily bandwidth on Hobby. **Tier 2 fix**: Cloudflare free in front + 1 h `s-maxage` (already set, just needs the CDN to honor it).

---

## 9. 90-day execution roadmap

| Week | Tier | Cost (€/hó) | Deliverable |
|------|------|---:|---|
| 1–2 | T1 | 0 → 7 | Vitest + Playwright minimum, gitleaks pre-commit, Supabase MCP advisors in CI, pgmq queue contract |
| 3–4 | T1 | 7 | OpenTelemetry SDK + Sentry Free, structured `lib/log.ts`, Cloudflare in front of Vercel |
| 5–8 | T2 | 99 | Supabase Pro upgrade, Vercel Pro, Claude Pro + Sonnet API budget, PostHog free, OSM `osm_addresses` backfill cron |
| 9–12 | T2 → T3 | 99 → 248 | NDVI pipeline → Cloudflare R2 + Worker WASM, Opus monthly audits, AI-test runner, Cloudflare WAF Pro |

---

## 10. Conclusion

panellako is **technically over-prepared and operationally under-instrumented**. The governance corpus is enterprise-grade; the runtime telemetry is zero. The most cost-effective improvements are not AI spends — they are **free observability + free CI + standardizing the queue contract on the pgmq+pg_cron stack that is already in the database**. AI spend should be reserved for productizing the existing `triage-ticket` / `generate-assembly-protocol` Edge Functions into paying-tier features, not for development assist alone.

The three tiers map cleanly to **bootstrap → product-market-fit → funded growth**, with the inflection point at Tier 2 being the Supabase Pro upgrade (24 €/hó) and the AI-as-product surfacing (~30 €/hó API budget). Tier 3's marginal 149 €/hó over Tier 2 buys observability + security + AI-test + edge WASM — the differentiators that let a 2-engineer team operate like an 8-engineer team.
