# PanelLakó — Growth Strategy Development Prompts

**Generated:** 2026-05-23  
**Repository:** HenrikFaul/panellako  
**Toolkit:** `growth_strategy/AI_INSTRUCTIONS.md`  
**Prompt count:** 10 (one per growth initiative)  
**Status:** All 10 files complete

---

## What these are

This folder contains 10 ready-to-paste AI coding prompts, one for each of the growth initiatives identified in the PanelLakó Growth Strategy Report. Each prompt is a self-contained implementation specification written for an AI coding assistant such as Claude Code, Cursor, Windsurf, or GitHub Copilot Workspace.

These are not summaries or sketches. They are full engineering briefs with:

- Real file paths verified against the actual repository (via `find` / `ls`)
- Real schema references from `supabase/migrations/`
- Complete, runnable TypeScript code blocks (not pseudocode)
- Full migration SQL with correct naming (`20260523_NNN_description.sql`)
- Hungarian terminology for all user-facing strings
- Error handling for ≥6 specific edge cases per file
- Automated test suites with ≥5 test cases per file
- Definition-of-done checklist of ≥10 items per file

Each prompt follows the same 12-section structure so that an AI agent can implement the feature autonomously with zero follow-up questions about scope or approach.

---

## The 12-section structure

Every prompt in this folder follows this exact structure:

1. **Initiative Header** — title, value range, 3–5 sentence business case
2. **Codebase Context** — verified file tree, current state table, what's missing
3. **Pre-conditions** — env vars, npm packages, Supabase migrations, external services
4. **Phase 1: Database Changes** — complete SQL with correct migration file naming
5. **Phase 2: Server-side** — Server Actions, API routes, Edge Functions (min 50 lines each)
6. **Phase 3: Client-side** — complete replacement TSX/TS code blocks (min 50 lines each)
7. **Phase 4: Configuration** — env vars, service setup, `next.config.mjs` changes
8. **Phase 5: Testing** — manual smoke test script + 5+ automated test cases
9. **Error handling & edge cases** — at least 6 specific scenarios with mitigations
10. **Integration with other initiatives** — cross-initiative dependencies and synergies
11. **Rollback plan** — environment variable rollback, code revert, DB migration revert
12. **Definition of done** — concrete checklist of ≥10 items

---

## Prompt Index

| # | File | Initiative | Value Range | Key Technologies |
|---|------|-----------|-------------|-----------------|
| 1 | [01_multi-building-portfolio-dashboard.md](01_multi-building-portfolio-dashboard.md) | Multi-building Portfolio Dashboard | +€450k–€900k | `get_my_buildings` RPC, Recharts, `WorkspaceTierBadge`, Stripe dunning banners |
| 2 | [02_stripe-subscription-lifecycle.md](02_stripe-subscription-lifecycle.md) | Stripe Subscription Lifecycle | +€380k–€800k | Stripe SDK, `checkout.session.completed`, `trial_will_end`, dunning webhooks |
| 3 | [03_ai-ticket-triage.md](03_ai-ticket-triage.md) | AI Ticket Triage | +€320k–€680k | Anthropic `claude-sonnet-4-6`, Supabase Edge Function, `work_orders` table |
| 4 | [04_assembly-protocol-generator.md](04_assembly-protocol-generator.md) | Assembly Protocol Generator | +€250k–€550k | `@react-pdf/renderer`, Supabase Storage, `Font.register()`, Ptk. 5:84–5:88 |
| 5 | [05_financial-ledger.md](05_financial-ledger.md) | Financial Ledger | +€220k–€480k | `finance_entries` table, `unit_balance_view`, CSV export, Lakástörvény §24 |
| 6 | [06_transactional-email-resend.md](06_transactional-email-resend.md) | Transactional Email (Brevo) | +€180k–€400k | Brevo API, `@react-email/components`, `sendEmail()`, `generateUnsubscribeUrl()` |
| 7 | [07_environmental-intelligence-dashboard.md](07_environmental-intelligence-dashboard.md) | Environmental Intelligence Dashboard | +€150k–€340k | EU EPBD 2024/1275/EU, `green_score_view`, `building_public_services_cache`, Recharts |
| 8 | [08_ssr-auth-hardening.md](08_ssr-auth-hardening.md) | SSR Auth Hardening | +€130k–€300k | `@supabase/ssr`, `getUser()`, rate limiting, `platform_audit_events`, Upstash Redis |
| 9 | [09_resident-self-service-portal.md](09_resident-self-service-portal.md) | Resident Self-Service Portal | +€100k–€240k | PWA, `app/portal/[buildingId]/`, `assembly_rsvps` table, Web Push, camera capture |
| 10 | [10_posthog-analytics-instrumentation.md](10_posthog-analytics-instrumentation.md) | PostHog Analytics Instrumentation | +€80k–€200k | `posthog-node`, `PanelLakoEvent` enum (30 events), feature flag `onboarding_flow_v2`, GDPR |

**Total potential value uplift across all 10 initiatives: +€2.26M–€4.88M**

---

## Dependencies and recommended sequencing

Prompts can be executed in any order within the same phase. Later phases assume the infrastructure from earlier phases.

**Phase 1 — Billing & Auth foundation (run first, in any order between them):**
- **Prompt #2: Stripe Subscription Lifecycle** — establishes the billing schema (`subscriptions`, `invoice_events`), webhook handler, and trial/dunning flow that every monetisation feature depends on.
- **Prompt #8: SSR Auth Hardening** — hardens the middleware with rate limiting and adds `platform_audit_events` logging. All subsequent features depend on the auth model being secure.

**Phase 2 — Core operational features (after Phase 1):**
- **Prompt #1: Multi-building Portfolio Dashboard** — depends on #2 (Stripe tier data) and #8 (secure auth).
- **Prompt #3: AI Ticket Triage** — depends on working `tickets` table writes. Can run independently of #1 and #2.
- **Prompt #4: Assembly Protocol Generator** — depends on working `meetings` table and `closeMeeting()` Server Action.
- **Prompt #5: Financial Ledger** — depends on `finance_entries` table from the existing migrations.

**Phase 3 — Communication & analytics (after Phase 2):**
- **Prompt #6: Transactional Email (Brevo)** — depends on the existing `lib/email.ts` (Brevo is already wired) and Server Actions from #3, #4, #5.
- **Prompt #7: Environmental Intelligence Dashboard** — depends on `building_public_services_cache` migration and existing environment sub-pages.
- **Prompt #9: Resident Self-Service Portal** — depends on #3 (ticket creation) and #4 (RSVP model from meetings).
- **Prompt #10: PostHog Analytics** — depends on all other features being in place so meaningful events can be tracked.

**Recommended critical path:**  
`#2 → #8 → (#1, #3, #4, #5 in parallel) → (#6, #7, #9 in parallel) → #10`

---

## Technical context

### Stack (verified from repo)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router, TypeScript 5.7 |
| Auth & DB | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Server sessions | `@supabase/ssr` `createServerClient` with cookie config |
| Auth guard | `supabase.auth.getUser()` (never `getSession()`) |
| Styling | Tailwind CSS 3.4 |
| Payments | Stripe (API version `2026-04-22.dahlia`) |
| Email | Brevo (Sendinblue) — `BREVO_API_KEY` — NOT Resend despite npm package |
| AI | Anthropic `claude-sonnet-4-6` (Edge Function runtime) |
| PDF | `@react-pdf/renderer` (API route) + `pdf-lib` (Edge Function for simple PDFs) |
| Analytics | `posthog-js` + `posthog-node` (EU data residency) |
| Deployment | Vercel (Edge runtime for middleware, Node.js for API routes) |

### Important gotchas discovered during prompt authoring

1. **Email provider mismatch:** `lib/email.ts` uses Brevo (`https://api.brevo.com/v3/smtp/email`, `BREVO_API_KEY`), not Resend. Prompt #6 is named `transactional-email-resend.md` per the initiative ID but all code inside correctly uses Brevo.

2. **PDF Hungarian characters:** `supabase/functions/generate-assembly-protocol/index.ts` uses `pdf-lib` with `StandardFonts.HelveticaBold` (ASCII only) — all Hungarian diacritics are stripped by a `toAscii()` helper. Prompt #4 moves PDF generation to a Next.js API route using `@react-pdf/renderer` with `Font.register()` to fix this legally critical defect.

3. **Auth is already hardened in middleware:** `middleware.ts` already uses `@supabase/ssr` `createServerClient` and `getUser()`. Prompt #8 adds rate limiting, audit logging, and `X-Frame-Options` headers rather than replacing the existing auth implementation.

4. **Workspace UUID routing:** Per governance (`ui_ux_rules.md` v3.16.0+), all workspace routes follow `/w/<workspaceId>/<rest>`. The portal routes in Prompt #9 use `/portal/<buildingId>/` as a separate unauthenticated domain — this is intentional for the resident-facing PWA.

5. **Server Action analytics:** PostHog server-side tracking (Prompt #10) must never await or block — `trackServerEvent()` fires into the `posthog-node` background queue. Always call `await flushServerAnalytics()` at the end of Stripe webhook handlers before returning `200 OK`.

---

## How to use a prompt

1. **Open Claude Code** (or your AI coding assistant) in the PanelLakó repository root.
2. **Paste the full contents** of the relevant prompt file as your first message. Do not summarise or trim — the full context (file paths, schema, code) is needed for correct implementation.
3. **Verify pre-conditions** listed in Section 3 of the prompt before the agent starts writing code.
4. **The agent will implement** all phases in sequence: DB migration → Server Actions → Client components → Tests.
5. **Check the definition-of-done checklist** (Section 12) before marking the initiative complete.
6. **Per repo governance** (`CLAUDE.md`), create `versioning/DDMMYYNNN_vX.Y.Z_slug.md` and `marketing/marketing_values/YYYYMMDD_vX.Y.Z_feature-slug_marketing_value.md` for every PR.

---

## Related reports

- [`../growth-strategy-en.md`](../growth-strategy-en.md) — Full growth strategy report (EN)
- [`../growth-strategy-hu.md`](../growth-strategy-hu.md) — Full growth strategy report (HU)
- [`../valuation-report-en.md`](../valuation-report-en.md) — Software valuation (EN)
- [`../valuation-report-hu.md`](../valuation-report-hu.md) — Software valuation (HU)

---

*Generated by the PanelLakó growth_strategy toolkit — `growth_strategy/AI_INSTRUCTIONS.md` · 2026-05-23 · All 10 initiatives complete*
