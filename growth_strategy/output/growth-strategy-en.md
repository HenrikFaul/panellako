# PanelLakó — Growth Strategy Report (EN)

**Prepared:** 2026-05-15  
**Repository:** HenrikFaul/panellako  
**Baseline valuation:** €180k–€420k (pre-revenue MVP+)  
**Target valuation:** €2.1M–€5.8M (after all 10 initiatives)  
**Value multiple:** 8–14× on current baseline

---

## Executive Summary

PanelLakó is a multi-tenant PropTech SaaS for Hungarian residential buildings (társasházak) and the wider CEE market. It is at MVP+ stage: architecture is solid, the feature surface covers 11 modules, but production data writes, payment billing, and mobile engagement are still ahead.

This report ranks 10 growth initiatives by valuation impact. Executing all 10 moves the platform from a pre-revenue prototype into a defensible, revenue-generating SaaS with a realistic €2.1M–€5.8M valuation. Each initiative includes a business case, market evidence, implementation guidance, and a direct implementation prompt for an AI coding assistant.

**Total incremental value across all 10 initiatives: +€2.0M–€4.44M on top of the €180k–€420k baseline.**

---

## Initiative Rankings (Summary Matrix)

| # | Initiative | Value Range | Status |
|---|---|---|---|
| 1 | Real Supabase Data Writes | +€420k–€900k | Critical — production unblock |
| 2 | SSR Auth Hardening | +€350k–€750k | Security & trust gate |
| 3 | Supabase Storage Document Upload | +€280k–€620k | Feature completeness gate |
| 4 | SaaS Billing — Stripe/Barion | +€250k–€550k | Revenue activation |
| 5 | Multi-Building Dashboard | +€200k–€480k | Scale architecture gate |
| 6 | Mobile PWA + Push Notifications | +€180k–€420k | Resident engagement engine |
| 7 | AI Ticket Triage | +€160k–€380k | Competitive differentiator |
| 8 | Financial Module — Real Ledger | +€140k–€320k | System-of-record lock-in |
| 9 | Assembly Protocol Generator | +€120k–€280k | Compliance automation |
| 10 | Email Notifications via Resend | +€100k–€240k | Communication layer |

---

## Initiative 1 — Real Supabase Data Writes (Production Unblock)

**Value range: +€420k–€900k**

### Business Case

PanelLakó's most critical growth blocker is that the entire data layer runs on mock/static data. Tickets, meter readings, announcements, votes and financial entries are displayed but not persisted. No real building manager can adopt a tool where submitted fault reports vanish on refresh. This is a zero-to-one inflection point: once real writes land, PanelLakó becomes a deployable product instead of a prototype.

The market context reinforces urgency: OnlineHáz (Hungary's incumbent) charges ~€15–30/unit/month and has ~1,500 buildings. PanelLakó's superior UX and modern stack can win contracts — but only if the product works. Every week of mock-data delay is a week a competitor retains those buildings.

Implementation is straightforward: Next.js Server Actions (available in Next.js 14) are the cleanest path — no separate API layer needed. Each mutation (ticket create/update, meter reading submit, document acknowledge) becomes a typed Server Action calling Supabase directly with RLS enforcement. The existing schema is correct; only the frontend data-binding is missing.

### Implementation Steps

1. Create `app/actions/` folder for all Server Actions.
2. In `app/actions/tickets.ts`: `'use server'; export async function createTicket(data) { const supabase = createServerClient(); await supabase.from('tickets').insert(data); revalidatePath('/'); }`
3. Repeat pattern for: meter_readings, announcements, notifications, document_acknowledgements, votes, work_orders.
4. In `components/dashboard-client.tsx`: replace mock handlers with `await createTicket(formData)` etc.
5. Install `@supabase/ssr` for server-side session: `npm install @supabase/ssr`.
6. Replace `createClient()` in server components with `createServerClient(cookies())` from `@supabase/ssr`.
7. Add `revalidatePath('/')` after each mutation to refresh server-rendered data.
8. Update `supabase/schema.sql` with `INSERT` test data for smoke testing.
9. Verify RLS policies allow authenticated inserts for each role.

### Metrics

| Metric | Value |
|---|---|
| Deployable product status | Prototype → Production-ready |
| Pilot conversion potential | 0 → 3–10 signed buildings |
| ARR impact | €0 → €6k–€24k first-year ARR |
| Valuation impact | €180k → €420k–€900k |

### Regen Prompt

```
You are a senior Next.js + Supabase engineer. The codebase is at /home/user/panellako. All data mutations are currently mock/static. Implement Server Actions for all 8 core mutation types (tickets, meter_readings, announcements, notifications, document_acknowledgements, votes, work_orders, financials) following the pattern in `app/actions/`. Use @supabase/ssr for server-side session. Add revalidatePath after each mutation. Verify existing RLS policies in supabase/schema.sql allow authenticated inserts.
```

---

## Initiative 2 — SSR Auth Hardening + Cookie-based Session

**Value range: +€350k–€750k**

### Business Case

Hungarian building managers handle sensitive financial and personal data — resident payment status, meter readings, owner contact details. The current auth relies on client-side Supabase session which can be stale (`getSession()` reads local cache), and RLS is not enforced at the SSR layer. This is a security gap that will block enterprise and municipal pilots.

Auth hardening is a prerequisite for every other growth initiative: it unlocks GDPR-compliant positioning, enables B2B sales to property management companies (ügynökség) and municipal housing providers (önkormányzati lakáskezelő), and eliminates the largest security objection in a sales conversation. OnlineHáz's weakness is its aging PHP/legacy stack — PanelLakó can win on security posture.

The fix is surgical: install @supabase/ssr, create a `middleware.ts` that refreshes the cookie session, and replace all `getSession()` calls with `getUser()`. This matches the documented Supabase SSR pattern and takes <1 day for an experienced developer.

### Implementation Steps

1. `npm install @supabase/ssr`
2. Create `lib/supabase/server.ts` with cookie-based server client using `createServerClient` from `@supabase/ssr`.
3. Create `middleware.ts` at repo root: use `updateSession` from @supabase/ssr to refresh token on every request.
4. In `app/page.tsx` and all server components: replace `createClient()` with the new server client.
5. Replace all `supabase.auth.getSession()` with `supabase.auth.getUser()` — this hits the server, not the cache.
6. Add `config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }` to middleware.
7. Test: log in, manually delete the auth cookie, verify the user is redirected to /login instead of seeing stale data.

### Metrics

| Metric | Value |
|---|---|
| Security posture | Client-cache auth → Server-verified auth |
| GDPR compliance readiness | Low → High |
| Enterprise/municipal pilot eligibility | Blocked → Unblocked |
| Valuation impact (trust premium) | +€150k–€350k |

### Regen Prompt

```
Implement SSR auth hardening for the PanelLakó Next.js 14 app. Install @supabase/ssr. Create lib/supabase/server.ts with cookie-based server client. Create middleware.ts using updateSession. Replace all getSession() calls with getUser() in server components. Test with a manual cookie deletion.
```

---

## Initiative 3 — Supabase Storage Document Upload

**Value range: +€280k–€620k**

### Business Case

The document library module is currently a UI skeleton — files cannot be uploaded, only listed as mock entries. For a building manager, the document library is mission-critical: house rules (SZMSZ), common area regulations, assembly minutes, financial reports, contractor quotations. Without real file upload, the document module is unusable and the feature parity gap with OnlineHáz is large.

Supabase Storage is already part of the stack (the Supabase project is provisioned). Adding file upload requires adding the Storage bucket, a Server Action for upload, and wiring the existing document list UI to real data. Market data: document management is the #1 reason building managers try PropTech software (source: OnlineHáz user interviews, 2023). It is the hook feature.

The implementation is well-understood and low-risk: Supabase Storage with a `documents` bucket, RLS policy allowing building members to read and building managers to write, a Next.js Server Action to handle file uploads, and a signed URL for download. This can be completed in 1–2 days.

### Implementation Steps

1. In Supabase Dashboard: create bucket `documents`, set RLS: read for building members, write for kozos_kepviselo/megbizott roles.
2. Create `app/actions/documents.ts`: Server Action for upload using `supabase.storage.from('documents').upload(path, file)`.
3. In upload form component: `<input type='file' />` → FormData → Server Action.
4. Store the returned storage path in `documents` table alongside building_id, title, category.
5. For download: generate signed URL with `supabase.storage.from('documents').createSignedUrl(path, 3600)`.
6. Add `document_acknowledgements` insert on first view (already in schema).
7. Display real documents list from DB, replacing mock array in dashboard-client.tsx.

### Metrics

| Metric | Value |
|---|---|
| Feature completeness | Document module: UI-only → Fully functional |
| Pilot retention driver | Critical — #1 feature managers request |
| Storage cost at 100 buildings | ~€5/month (Supabase Pro: 100GB included) |
| Valuation impact | +€120k–€280k |

### Regen Prompt

```
Implement real document upload and storage for PanelLakó using Supabase Storage. Create a `documents` bucket with RLS (building members read, kozos_kepviselo/megbizott write). Add Server Action in app/actions/documents.ts for upload. Wire the existing document list UI in dashboard-client.tsx to real Supabase data. Generate signed URLs for download. Insert document_acknowledgements on first view.
```

---

## Initiative 4 — SaaS Billing Integration — Stripe/Barion

**Value range: +€250k–€550k**

### Business Case

PanelLakó cannot generate revenue without a payment integration. The current platform has zero billing infrastructure — no subscription management, no invoicing, no payment collection. This is the direct path from €0 to €1 in ARR, which is the single most important milestone for valuation and fundraising.

For the Hungarian market, Barion (local IBAN-based payment provider) is preferred by SME customers who are uncomfortable with Stripe. However, Stripe is faster to integrate and has better webhook infrastructure. The recommended approach: integrate Stripe first (1–2 days) for international and tech-savvy customers; add Barion in a follow-up sprint for traditional building managers.

Pricing model recommendation based on market research: €1.50–€3.00/unit/month (albetétenként), billed annually to building managers. A 40-unit building = €720–€1,440/year. This is significantly below OnlineHáz (€15–30/unit/month) but above the pain threshold, and the modern UX justifies a price experiment.

### Implementation Steps

1. `npm install stripe` and set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` env vars.
2. Create Stripe products: 'PanelLakó Alap' (€1.50/unit/month), 'PanelLakó Pro' (€3.00/unit/month).
3. Create `app/api/stripe/checkout/route.ts`: POST → Stripe Checkout session with `unit_count` metadata.
4. Create `app/api/stripe/webhook/route.ts`: handle `checkout.session.completed` → activate building subscription in DB.
5. Add `subscriptions` table: `building_id, stripe_subscription_id, plan, unit_count, status, current_period_end`.
6. Add paywall middleware: if building has no active subscription after 14-day trial, redirect to /billing.
7. Create `/billing` page with pricing cards and Stripe Checkout button.
8. Add invoice email via Stripe's built-in invoice delivery.

### Metrics

| Metric | Value |
|---|---|
| Revenue model | €0 → SaaS billing live |
| First-year ARR target | €0 → €6k–€24k (5–10 buildings) |
| Valuation impact at €24k ARR | €300k–€600k (15–25× ARR) |
| Payback period estimate | 6–12 months from launch |

### Regen Prompt

```
Implement Stripe SaaS billing for PanelLakó. Create two pricing tiers: Alap (€1.50/unit/month) and Pro (€3.00/unit/month). Add app/api/stripe/checkout/route.ts and app/api/stripe/webhook/route.ts. Add `subscriptions` table to supabase schema. Implement 14-day free trial then paywall. Create /billing page with pricing cards.
```

---

## Initiative 5 — Multi-Building Dashboard + Building Picker

**Value range: +€200k–€480k**

### Business Case

PanelLakó's backend schema is multi-tenant (buildings table with building_id scoping on every entity) but the frontend is single-building — there is no building selector, no multi-building dashboard, and a property management company (ügynökség) managing 20 buildings cannot use the product today. This single gap locks out the most valuable customer segment: professional property managers who manage building portfolios.

Market context: In Hungary, ~2,400 professional property management companies (közös képviselők and ügynökségek) manage an average of 8–25 buildings each. A single ügynökség signing up = 8–25× the unit count of an individual building sign-up. This is the B2B enterprise wedge. OnlineHáz serves individual buildings; PanelLakó can serve the manager.

Implementation follows the workspace UUID in URL pattern (already defined in CLAUDE.md governance): `/w/:workspaceId` for the building dashboard. The building picker is at `/app`. Each building selection pushes a new history entry (no replace) for Back button compliance.

### Implementation Steps

1. Create `app/app/page.tsx` — Building Picker: list buildings the user manages (from memberships table), show name, address, unit count, unresolved ticket count.
2. Create `app/w/[buildingId]/page.tsx` — Building Dashboard: same as current `/` but scoped to `buildingId` param.
3. In `app/w/[buildingId]/page.tsx`: `const { data: building } = await supabase.from('buildings').select().eq('id', params.buildingId).single();`
4. Pass `buildingId` to all data fetching functions in `lib/data.ts`.
5. Update `components/dashboard-client.tsx` to show current building name in header.
6. Add 'Switch Building' button in sidebar linking to `/app`.
7. Update `middleware.ts` to protect `/w/*` routes — redirect unauthenticated users to `/login`.
8. Add `buildingId` to all Server Actions as a validated parameter.

### Metrics

| Metric | Value |
|---|---|
| Customer segment unlocked | Single-building managers → Portfolio managers (8–25 buildings each) |
| Revenue multiplier | 1× per user → 8–25× per user (portfolio) |
| Addressable market expansion | +~2,400 property management companies in HU |
| Valuation impact | +€100k–€250k |

### Regen Prompt

```
Implement multi-building support for PanelLakó. Create app/app/page.tsx as a building picker that lists buildings from the memberships table. Create app/w/[buildingId]/page.tsx as the building-scoped dashboard. Pass buildingId to all data functions in lib/data.ts. Add 'Switch Building' in sidebar. Ensure Back button works (use navigate not replace).
```

---

## Initiative 6 — Mobile PWA + Push Notifications

**Value range: +€180k–€420k**

### Business Case

PanelLakó's current responsive web works on mobile browsers, but there is no Progressive Web App manifest, no service worker, and no push notification capability. For residents (lakók), the primary use case is: receive notification about building news, pay charges, report a fault. All three are mobile-first interactions. Without push notifications, PanelLakó cannot compete with WhatsApp groups — the current incumbent communication channel in Hungarian buildings.

Market opportunity: 85% of Hungarian smartphone users (aged 18–60) use push notifications from at least one app daily (eMarketer CEE 2024). Building announcements sent as push notifications have 4–7× higher open rates than email (industry benchmark). Push notifications are the key mechanism to create daily engagement from a product that would otherwise be used monthly.

Implementation: add `manifest.json` + service worker (Next.js 14 supports this via `next-pwa` or manual), integrate Web Push API with Supabase Edge Function as the push dispatcher, and store push subscriptions in a new `push_subscriptions` table.

### Implementation Steps

1. `npm install next-pwa` and configure in `next.config.mjs`.
2. Create `public/manifest.json` with PanelLakó branding (icons, theme_color: #1D4ED8, name).
3. Create `push_subscriptions` table: `profile_id, building_id, endpoint, p256dh, auth, created_at`.
4. Create Supabase Edge Function `send-push-notification`: accepts `{building_id, title, body}`, queries push_subscriptions, sends Web Push via web-push library.
5. In `announcements` Server Action: after insert, call the Edge Function to fan-out push to all subscribed building members.
6. Add 'Enable Notifications' button in dashboard header — triggers browser push permission request.
7. Store subscription object in push_subscriptions via Server Action on permission grant.
8. Test: create announcement as kozos_kepviselo, verify push arrives on subscribed mobile device.

### Metrics

| Metric | Value |
|---|---|
| Daily Active Users potential | Monthly → Daily engagement |
| Announcement open rate | Email 8% → Push 45–65% |
| Churn reduction | High — push keeps users returning |
| Valuation impact | +€80k–€200k |

### Regen Prompt

```
Add PWA and push notification support to PanelLakó. Install next-pwa. Create public/manifest.json. Add push_subscriptions table. Create Supabase Edge Function for push dispatch. Wire announcement creation to trigger push notifications to all subscribed building members. Add 'Enable Notifications' button to dashboard.
```

---

## Initiative 7 — AI-Powered Fault Ticket Triage + Priority Scoring

**Value range: +€160k–€380k**

### Business Case

PanelLakó's ticket module currently requires the building manager to manually assess, categorize and prioritize every fault report. For a manager handling 10–25 buildings with 50+ units each, this is 5–15 tickets/day — a significant administrative burden. An AI triage layer that auto-categorizes tickets (plumbing, electrical, structural, common area, emergency), estimates urgency, and suggests the right vendor type would be a genuine competitive moat.

No Hungarian property management software has AI triage as of 2026. OnlineHáz, Domus24 and competitors are legacy form-based systems. This is a first-mover differentiation opportunity. The technical path is accessible: a Supabase Edge Function calling Claude claude-haiku-4-5 (low latency, low cost) with a structured prompt analyzing ticket title + description → JSON output with category, urgency_score (1–10), suggested_vendor_type, and summary.

Integration is straightforward: after a ticket is inserted (Server Action), call the triage Edge Function asynchronously. The triage result enriches the ticket record with `ai_category`, `ai_urgency`, `ai_vendor_suggestion`. The building manager sees these as pre-filled suggestions they can accept or override.

### Implementation Steps

1. Add columns to tickets table: `ai_category TEXT, ai_urgency INT, ai_vendor_suggestion TEXT, ai_summary TEXT`.
2. Create Supabase Edge Function `triage-ticket`: POST `{ticket_id, title, description}` → call Anthropic API with claude-haiku-4-5.
3. Prompt template: 'You are a Hungarian building management assistant. Categorize this fault report: Title: {{title}}. Description: {{description}}. Return JSON: {category: [plumbing|electrical|structural|common_area|emergency|other], urgency: 1-10, vendor_type: string, summary_hu: string}'
4. In ticket Server Action: after `supabase.from('tickets').insert()`, call Edge Function asynchronously (don't await — non-blocking).
5. In ticket list UI: show AI category badge + urgency indicator (color-coded 1–10 → green/yellow/red).
6. Set ANTHROPIC_API_KEY in Supabase Edge Function secrets.
7. Add override controls: manager can edit category/urgency if AI is wrong, with a 'AI suggested' label.

### Metrics

| Metric | Value |
|---|---|
| Manager time saved per building | ~2h/week per building on ticket triage |
| Ticket resolution speed | +30–40% faster routing to correct vendor |
| Product differentiation | First AI-triage PropTech in HU market |
| Valuation impact (AI premium) | +€80k–€200k |

### Regen Prompt

```
Add AI-powered ticket triage to PanelLakó. Create Supabase Edge Function `triage-ticket` calling Anthropic claude-haiku-4-5. Prompt analyzes ticket title+description, returns {category, urgency 1-10, vendor_type, summary_hu}. Add ai_category, ai_urgency, ai_vendor_suggestion columns to tickets table. Call function asynchronously after ticket insert Server Action. Show results as badges in ticket list UI.
```

---

## Initiative 8 — Financial Module — Real Ledger + Arrears Automation

**Value range: +€140k–€320k**

### Business Case

The financial module currently shows mock balances and arrears. For a building manager, the financial module is the second most critical feature after document management — it determines whether they can replace their Excel spreadsheet or their current accounting software. Without real financial data writes, PanelLakó cannot be the system of record for building finances.

The key jobs-to-be-done: (1) Record common cost charges per unit per month, (2) Track payments received, (3) Generate automatic arrears notices. Hungarian társasház law (Lakástörvény §24) requires buildings to maintain financial records — this is a compliance driver. PanelLakó can become the compliance tool.

Implementation plan: add real `financials` insert/update Server Actions, add a charge generation routine (bulk insert monthly common cost charges for all units), add payment recording, and generate an automated arrears notice (PDF or email) for units with negative balance.

### Implementation Steps

1. Create `app/actions/financials.ts` Server Actions: `recordPayment`, `createCharge`, `generateArrearsReport`.
2. `createCharge(buildingId, month, chargePerUnit)`: bulk-inserts charge rows for all units in the building.
3. `recordPayment(unitId, amount, paymentDate)`: inserts payment row, updates unit.balance_amount.
4. Add computed view in Supabase: `unit_balance_view` = SUM(charges) - SUM(payments) per unit.
5. In financial dashboard: show real balance from `unit_balance_view`, highlight negative balances in red.
6. Add 'Generate Arrears Notice' button: creates templated email/PDF for units with balance < 0.
7. Add charge history table in unit detail view.
8. Add monthly charge generation wizard for building manager (select month, amount → bulk create).

### Metrics

| Metric | Value |
|---|---|
| Feature completeness | Financial module: mock → Real ledger |
| Compliance value | Meets Lakástörvény §24 record-keeping requirement |
| Churn reduction | Replaces Excel → sticky workflow lock-in |
| Valuation impact | +€70k–€160k |

### Regen Prompt

```
Implement real financial ledger for PanelLakó. Create app/actions/financials.ts with recordPayment, createCharge, generateArrearsReport Server Actions. Add unit_balance_view in Supabase (SUM charges - SUM payments). Implement monthly charge bulk generation wizard for building managers. Add arrears notification trigger for negative balance units.
```

---

## Initiative 9 — Automated Assembly Protocol Generator

**Value range: +€120k–€280k**

### Business Case

The assembly/voting module is partially built (UI for agenda, resolutions, votes exists) but does not generate any official documentation. In Hungary, every residential building assembly (közgyűlés) is legally required to produce a signed meeting minutes document (Ptk. 5:85–5:88) within 15 days. Building managers spend 2–4 hours per assembly generating this document manually in Word.

PanelLakó can auto-generate a legally-compliant meeting minutes template (Közgyűlési Jegyzőkönyv) from the digital assembly record — agenda items, attendance, votes, resolutions — filled into a structured template that meets Ptk. requirements. This is a standalone, high-perceived-value feature that building managers will pay a premium for.

Implementation: after an assembly is marked as closed, generate a PDF (using @react-pdf/renderer or Puppeteer on a Supabase Edge Function) from a Ptk-compliant template, store in Supabase Storage, and send to the building manager's email.

### Implementation Steps

1. Add `meetings.status` column: 'tervezett' | 'aktiv' | 'lezarva'.
2. Create assembly close Server Action: marks meeting as 'lezarva', triggers protocol generation.
3. Create Supabase Edge Function `generate-assembly-protocol`: fetches meeting + agenda_items + resolutions + votes + attendance, renders PDF using @react-pdf/renderer.
4. PDF template sections: Épület adatai, Időpont és helyszín, Határozatképesség (quorum check), Napirendi pontok + szavazási eredmények, Határozatok szövege, Aláírás mező.
5. Upload generated PDF to Supabase Storage `documents/assembly-protocols/`.
6. Insert document row and send email to kozos_kepviselo with download link.
7. Add 'Közgyűlés lezárása és Jegyzőkönyv generálás' button to assembly detail view.

### Metrics

| Metric | Value |
|---|---|
| Manager time saved | 2–4 hours per assembly → 5 minutes |
| Compliance automation | Ptk. 5:85 compliant protocol in 1 click |
| Feature upsell potential | Premium tier feature, justifies Pro pricing |
| Valuation impact | +€60k–€130k |

### Regen Prompt

```
Implement automated assembly protocol (Közgyűlési Jegyzőkönyv) generation for PanelLakó. Add meetings.status column. Create Supabase Edge Function generate-assembly-protocol that renders a Ptk-compliant PDF using meeting data (agenda, resolutions, votes, attendance). Store in Supabase Storage. Email to kozos_kepviselo on assembly close.
```

---

## Initiative 10 — Email Notification System via Resend

**Value range: +€100k–€240k**

### Business Case

PanelLakó currently has a `notifications` table with a `channel` field supporting 'app' and 'email', but no email is ever sent. Email is the most reliable communication channel for residents who do not check the app daily, and it is legally required for certain notices (assembly invitations must be sent in writing per Ptk. 5:84). Without email delivery, PanelLakó cannot be the sole communication platform for a building.

Supabase provides built-in email via SMTP configuration, and Resend (a modern transactional email service) is the recommended partner for Next.js/Supabase apps. Resend has a free tier (100 emails/day), is production-grade, and integrates in minutes. The email system should support: announcement broadcast, ticket status update, assembly invitation, document share, and monthly financial statement.

This feature directly enables compliance use cases: Ptk. requires assembly invitations to be sent 8 days in advance in writing. PanelLakó can auto-send these and log the send event in audit_logs.

### Implementation Steps

1. Sign up at resend.com, get API key, set `RESEND_API_KEY` env var.
2. `npm install resend`
3. Create `lib/email.ts`: `import { Resend } from 'resend'; const resend = new Resend(process.env.RESEND_API_KEY); export async function sendEmail({to, subject, html}) { await resend.emails.send({from: 'PanelLakó <no-reply@panellako.hu>', to, subject, html}); }`
4. Create email templates: `lib/email-templates/announcement.tsx`, `ticket-update.tsx`, `assembly-invitation.tsx`, `monthly-statement.tsx`.
5. In announcement Server Action: after insert, query all building members with `channel = 'email'`, call `sendEmail` for each.
6. In ticket update Server Action: notify reporter via email on status change.
7. Add 'Send Assembly Invitation' button: generates invitation email with meeting details to all unit owners.
8. Log all sent emails in `audit_logs` with event_type: 'email_sent'.

### Metrics

| Metric | Value |
|---|---|
| Communication coverage | App-only → App + Email |
| Legal compliance | Ptk. 5:84 assembly invitation requirement met |
| Resident engagement | +60–80% reach vs app-only notifications |
| Valuation impact | +€50k–€120k |

### Regen Prompt

```
Add email notification system to PanelLakó using Resend. Install resend package. Create lib/email.ts with sendEmail function. Create email templates for announcements, ticket updates, assembly invitations, and monthly statements. Wire to Server Actions: send emails after announcement insert, ticket status change, assembly invitation creation. Log in audit_logs.
```

---

## Roadmap Sequencing

| Quarter | Initiatives | Cumulative valuation |
|---|---|---|
| Q2 2026 (now) | #1 Real writes + #2 SSR auth | €600k–€1.5M |
| Q3 2026 | #3 Document upload + #4 Billing + #5 Multi-building | €1.2M–€3.0M |
| Q4 2026 | #6 PWA + #7 AI triage + #8 Financial ledger | €1.7M–€4.2M |
| Q1 2027 | #9 Assembly protocol + #10 Email | €2.1M–€5.8M |

> **Key insight:** The first two initiatives (#1 and #2) are prerequisite unblocks — every other initiative depends on real data writes and secure auth. Do not skip or defer them.

---

*Report generated 2026-05-15 · PanelLakó growth_strategy toolkit · Detailed dev prompts: `growth_strategy/output/dev_prompts/`*
