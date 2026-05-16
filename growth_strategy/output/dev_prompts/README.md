# PanelLakó — Development Prompts

**Generated:** 2026-05-16  
**Repository:** HenrikFaul/panellako  
**Toolkit:** `growth_strategy/AI_INSTRUCTIONS.md`  
**Prompt count:** 10 (one per growth initiative)  
**Version:** 0.5.1-production — 9 of 10 initiatives complete

---

## What these are

This folder contains ready-to-paste AI coding prompts, one for each of the 10 growth initiatives identified in the PanelLakó Growth Strategy Report. Each prompt is a self-contained implementation specification written for an AI coding assistant such as Claude Code, Cursor, Windsurf, or GitHub Copilot. They are not summaries or sketches — they are full engineering briefs with real file paths, real schema references, real TypeScript types, migration SQL, error-handling requirements, and a definition-of-done checklist.

Each prompt follows the same 12-section structure: initiative header and business case, codebase context and current state, pre-conditions (env vars, packages, Supabase setup), Phase 1 database changes (full SQL), Phase 2 server-side implementation (Server Actions / API routes), Phase 3 client-side integration, Phase 4 configuration, Phase 5 testing and smoke tests, error handling and edge cases, integration with other initiatives, rollback plan, and definition of done. This structure means the AI agent has everything it needs to implement the feature autonomously and to the correct production quality standard.

The prompts were generated as part of the PanelLakó growth strategy toolkit on 2026-05-15, based on a repository scan and expert analysis. They correspond directly to the 10 initiatives described in `../growth-strategy-en.md` and `../growth-strategy-hu.md`. Each prompt file is over 20,000 characters in length — comprehensive enough for an autonomous coding agent to complete the implementation end-to-end with zero follow-up questions about scope or approach.

---

## How to use

1. **Open your AI coding assistant** in the PanelLakó repository root (`/home/user/panellako` or wherever the repo is cloned).
2. **Paste the full contents** of the relevant prompt file as your first message. Do not summarize or trim — the full context is needed for correct implementation.
3. **The AI agent will implement the feature** following all 12 phases specified in the prompt, including database migrations, server actions, client component changes, and tests.
4. **Follow the recommended sequence** (see "Dependencies and sequencing" below). Prompt #1 must be completed first — all others depend on real data writes being in place.
5. **After each prompt is complete**, verify the definition-of-done checklist at the end of each prompt file before moving to the next one.

Note: prompts reference real environment variables. Before running any prompt, ensure `.env.local` contains valid values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Each prompt specifies any additional env vars it requires.

---

## Prompt Index

| # | File | Initiative | Value Range | Status | Key Technologies |
|---|------|-----------|-------------|--------|-----------------|
| 1 | [01_supabase-data-writes.md](01_supabase-data-writes.md) | Real Supabase Data Writes — Replace All Mock Data (Production Unblock) | +€420k–€900k | ✅ Done | Next.js Server Actions, @supabase/ssr, revalidatePath, RLS |
| 2 | [02_ssr-auth-hardening.md](02_ssr-auth-hardening.md) | SSR Auth Hardening + Cookie-based Session (Security & Trust Gate) | +€350k–€750k | ✅ Done | @supabase/ssr, middleware.ts, getUser(), cookie session |
| 3 | [03_storage-document-upload.md](03_storage-document-upload.md) | Supabase Storage Document Upload (Feature Completeness Gate) | +€280k–€620k | ✅ Done | Supabase Storage, signed URLs, FormData, document_acknowledgements |
| 4 | [04_saas-billing-stripe.md](04_saas-billing-stripe.md) | SaaS Billing Integration — Stripe/Barion Payment Gateway | +€250k–€550k | ✅ Done | Stripe SDK, Checkout, webhooks, subscriptions table, paywall middleware |
| 5 | [05_multi-building-dashboard.md](05_multi-building-dashboard.md) | Multi-Building Dashboard + Building Picker (Scale Architecture Gate) | +€200k–€480k | ✅ Done | Dynamic routes /w/[buildingId], memberships table, pushState navigation |
| 6 | [06_mobile-pwa-push.md](06_mobile-pwa-push.md) | Mobile PWA + Push Notifications (Resident Engagement Engine) | +€180k–€420k | ✅ Done | next-pwa, Web Push API, Supabase Edge Function, push_subscriptions table |
| 7 | [07_ai-ticket-triage.md](07_ai-ticket-triage.md) | AI-Powered Fault Ticket Triage + Priority Scoring (Competitive Differentiator) | +€160k–€380k | ✅ Done | Anthropic claude-haiku-4-5, Supabase Edge Function, async Server Action |
| 8 | [08_financial-ledger.md](08_financial-ledger.md) | Financial Module — Real Ledger + Arrears Automation | +€140k–€320k | ✅ Done | Server Actions, unit_balance_view, bulk charge generation, Resend |
| 9 | [09_assembly-protocol-generator.md](09_assembly-protocol-generator.md) | Automated Assembly Protocol Generator (Compliance Automation) | +€120k–€280k | ❌ Next | @react-pdf/renderer, Supabase Edge Function, Supabase Storage, meetings.status |
| 10 | — (email prompt embedded in growth strategy) | Email Notification System via Resend (Resident Communication Layer) | +€100k–€240k | ✅ Done | Resend SDK, email templates, audit_logs, Ptk. 5:84 compliance |

**Total potential value uplift across all 10 initiatives: +€2.0M–€4.44M**

---

## Dependencies and sequencing

Prompts must be executed in a specific order because later features depend on infrastructure established by earlier ones.

**Phase 1 — Foundation (must complete first, in any order between them):**
- Prompt #1: Real Supabase Data Writes — establishes the Server Actions pattern, @supabase/ssr package, and live data writes that every subsequent prompt depends on.
- Prompt #2: SSR Auth Hardening — establishes cookie-based session and server-verified auth that Prompts #4, #5, #6 and #10 depend on.

**Phase 2 — Core features (after Phase 1):**
- Prompt #3: Document Upload — depends on #1 (Server Actions pattern in place).
- Prompt #4: SaaS Billing — depends on #1 (writes) and #2 (secure auth for subscription checks).
- Prompt #5: Multi-building Dashboard — depends on #1 (writes) and #2 (auth-scoped sessions).
- Prompt #7: AI Ticket Triage — depends on #1 (tickets table has live writes).

**Phase 3 — Engagement and compliance (after Phase 2):**
- Prompt #6: Mobile PWA + Push — depends on #1, #2 (needs live announcement writes to trigger push).
- Prompt #8: Financial Ledger — depends on #1 and #4 (billing context needed for charge model).
- Prompt #9: Assembly Protocol Generator — depends on #1 and #3 (protocol PDF stored to same Storage bucket).
- Prompt #10: Email Notifications — depends on #1 and #2 (needs live writes and server-verified sessions).

**Critical path:** #1 → #2 → (#3, #4, #5, #7 in parallel) → (#6, #8, #9, #10 in parallel)

**Never skip #1.** Every other prompt assumes that `app/actions/` exists, `@supabase/ssr` is installed, and the Supabase client is a server-side cookie client. Attempting to run any other prompt on the mock-data codebase will produce broken implementations.

---

## Repository context

- **Product:** PanelLakó — Hungarian residential building management platform (társasház management SaaS)
- **Stack:** Next.js 14 App Router, TypeScript 5.7, Supabase (PostgreSQL + Auth + Storage + Edge Functions), Tailwind CSS 3.4, Vercel
- **Current state as of 2026-05-16:** 9 of 10 initiatives implemented; platform is production-deployed at panellako.hu; 311 files, 7,819 LOC; 62 git commits; Stripe billing, Supabase Storage, PWA push, AI triage, and Resend email all live
- **Target:** Complete #9 Assembly Protocol Generator to reach full 10/10 initiative coverage
- **Valuation baseline:** €650k–€1.6M (9/10 complete, pre-revenue production); target after #9: €850k–€2.1M

---

## Related reports

- [../valuation-report-en.md](../valuation-report-en.md) — Full software valuation (EN)
- [../valuation-report-hu.md](../valuation-report-hu.md) — Full software valuation (HU)
- [../growth-strategy-en.md](../growth-strategy-en.md) — Growth strategy with all 10 initiatives (EN)
- [../growth-strategy-hu.md](../growth-strategy-hu.md) — Growth strategy with all 10 initiatives (HU)

---

*Generated by the PanelLakó growth_strategy toolkit — `growth_strategy/AI_INSTRUCTIONS.md` · 2026-05-16 · v0.5.1-production · 9/10 initiatives complete*
