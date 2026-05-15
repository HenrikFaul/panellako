# Change Intelligence Appendix — PanelLakó

**Generated:** 2026-05-15  
**Sprint:** v0.2.0 SSR Auth + Server Actions  
**Confidence:** High

---

## Recent Changes (v0.2.0 — 2026-05-15)

### 1. SSR Auth Hardening

**Files changed:** `lib/supabase/server.ts` (new), `lib/supabase/browser.ts` (new), `middleware.ts` (new)

**What changed:**
- Added `@supabase/ssr` for cookie-based server-side authentication
- `middleware.ts` refreshes the Supabase session on every request using `getUser()` (not `getSession()`)
- `lib/supabase/server.ts` provides a `createClient()` factory for Server Components and Server Actions
- `lib/supabase/browser.ts` provides a `createClient()` factory for Client Components

**Why:**
- `getSession()` reads from local cache — can be stale or spoofed
- `getUser()` always verifies against Supabase server — secure for auth-critical operations
- Cookie-based session required for Next.js App Router SSR compatibility

**Regression risks:**
- ✅ Low — additive change, browser client behavior unchanged for existing UI
- ⚠ Watch: if middleware.ts cookie-setting conflicts with Supabase magic link redirect, login flow may break. Test by completing a magic link login end-to-end.

---

### 2. Server Actions Layer

**Files added:** `app/actions/tickets.ts`, `app/actions/meter-readings.ts`, `app/actions/announcements.ts`, `app/actions/notifications.ts`, `app/actions/documents.ts`

**What changed:**
- All form mutations now call typed Server Actions instead of local state only
- `createTicket`, `updateTicketStatus`, `submitMeterReading`, `createAnnouncement`, `createNotification`, `markNotificationRead`, `acknowledgeDocument`, `createDocument`
- Each Server Action: (1) verifies user with `getUser()`, (2) inserts/updates in Supabase, (3) calls `revalidatePath('/')` to invalidate Next.js cache

**Optimistic UI:**
- Ticket creation and status update use optimistic local state — UI updates instantly, Server Action persists in background
- If Server Action fails, the optimistic state stays (no rollback UI yet — **pending improvement**)

**Regression risks:**
- ✅ Mock fallback still works: if Supabase is not configured, `getDashboardData()` returns mock data, Server Actions will fail silently (Supabase client will error but no UI crash because form handlers catch errors)
- ⚠ Watch: if `document_acknowledgements` table has a `NOT NULL` constraint on columns not provided in `upsert`, it will fail. Verify schema against action payload.

---

### 3. `lib/data.ts` Server Client

**What changed:** `getDashboardData()` now uses `createClient()` from `lib/supabase/server.ts` instead of the module-level `supabase` singleton

**Regression risks:**
- ✅ The function is called only from `components/dashboard.tsx` (server component) — correct context for cookies API
- ⚠ If called from a Client Component or browser context, `cookies()` from `next/headers` will throw. Currently safe — `dashboard.tsx` is a Server Component.

---

## Fragile Areas (Pre-existing)

| Area | Risk | Note |
|---|---|---|
| Mock data fallback | Medium | If Supabase returns empty arrays, mock data is shown — could mask real DB errors |
| Role-based routing | Low | `/?role=xxx` is URL-driven, no server auth check — any user can switch roles |
| RLS policies | High | Demo-level policies — no building-scope enforcement yet |
| No E2E tests | High | All QA is manual — regressions invisible without test suite |
| Optimistic state rollback | Medium | Failed Server Actions leave stale optimistic UI state |

---

## Pending Production Blockers

1. **RLS tightening** — scope all queries by `building_id` via `memberships`
2. **Optimistic rollback** — revert optimistic state if Server Action returns `success: false`
3. **Multi-building support** — `buildingId` not yet passed to Server Actions (uses `undefined`)
4. **Document file upload** — `documents.ts` Server Action exists but Supabase Storage bucket not created
5. **Email delivery** — `resend` installed but `lib/email.ts` not yet created
