# TECHNICAL_ARCHITECTURE.md — PanelLakó Technical Architecture

**Repository:** panellako  
**Branch:** main  
**Generated:** 2026-05-15  
**Confidence:** High (verified from source files)

---

## 1. Technology Stack

| Layer | Technology | Version | Source |
|-------|-----------|---------|--------|
| Framework | Next.js App Router | 14.2.22 | `package.json` (verified) |
| Language | TypeScript | ^5.7.2 | `package.json` (verified) |
| Styling | Tailwind CSS | ^3.4.16 | `package.json` (verified) |
| Auth & DB client | @supabase/supabase-js | ^2.50.0 | `package.json` (verified) |
| SSR Auth | @supabase/ssr | ^0.10.3 | `package.json` (verified) |
| Icons | Lucide React | ^0.469.0 | `package.json` (verified) |
| Email | Resend | ^6.12.3 | `package.json` (verified) |
| CSS utilities | clsx | ^2.1.1 | `package.json` (verified) |
| Database | Supabase PostgreSQL | (managed) | `supabase/schema.sql` (verified) |
| Hosting | Vercel | (managed) | Inferred from Next.js + `middleware.ts` |
| GeoData / Addresses | Versioned shared Address Registry API (OSM/Geofabrik source) | v1 | `app/api/location/autocomplete/route.ts` + `lib/address-registry/` |

---

## 2. Application Architecture

### 2.1 Next.js App Router Structure

```
app/
  layout.tsx          — Root layout (lang="hu", metadata)
  page.tsx            — Homepage; reads ?role= query param, renders Dashboard
  login/
    page.tsx          — Magic link login page ('use client')
  api/
    location/
      autocomplete/
        route.ts      — GeoData address autocomplete proxy (GET, force-dynamic)
  actions/
    tickets.ts        — Server Actions: createTicket, updateTicketStatus
    meter-readings.ts — Server Actions: submitMeterReading
    announcements.ts  — Server Actions: createAnnouncement
    documents.ts      — Server Actions: acknowledgeDocument, createDocument
    notifications.ts  — Server Actions: markNotificationRead, createNotification

components/
  dashboard.tsx       — Async Server Component: fetches data, passes to client
  dashboard-client.tsx — 854-line 'use client' component: all UI, state, optimistic updates

lib/
  types.ts            — Shared TypeScript types (Role, Ticket, MeterReading, etc.)
  data.ts             — getDashboardData(): Supabase queries with mock fallback
  supabase/
    server.ts         — createServerClient via @supabase/ssr + cookies()
    browser.ts        — createBrowserClient via @supabase/ssr; exports hasSupabaseConfig

middleware.ts         — Next.js Edge middleware: session refresh via getUser()
```

### 2.2 Server / Client Rendering Split

```
Request
  └─> middleware.ts (Edge Runtime)
        └─> Session refresh: supabase.auth.getUser() [always hits auth server]
              └─> Next.js App Router
                    └─> app/page.tsx (Server Component)
                          └─> components/dashboard.tsx (async Server Component)
                                └─> lib/data.ts: getDashboardData() — parallel Supabase queries
                                      └─> components/dashboard-client.tsx ('use client')
                                            └─> Hydrated browser component
                                                  └─> Optimistic updates via useState
                                                  └─> Server Actions for mutations
```

### 2.3 Data Fetching Pattern

`getDashboardData()` in `lib/data.ts`:
- Checks `hasSupabaseConfig` (env vars present)
- If true: fires 13 parallel `Promise.all()` Supabase queries with row limits
- If false (or query returns empty): falls back to mock data from `lib/mock-data.ts`
- Data is passed as a serialized prop to `DashboardClient`

**Fetch limits (verified):**

| Table | Limit | Sort |
|-------|-------|------|
| announcements | 5 | created_at DESC |
| notifications | 8 | created_at DESC |
| tickets | 12 | created_at DESC |
| meter_readings | 8 | reading_date DESC |
| documents | 10 | uploaded_at DESC |
| finance_entries | 8 | due_date DESC |
| meetings | 6 | scheduled_at DESC |
| units | 12 | (none) |
| vendors | 8 | (none) |
| work_orders | 8 | due_date ASC |
| knowledge_base_articles | 8 | (none) |
| audit_logs | 10 | created_at DESC |

---

## 3. Authentication Architecture

### 3.1 Auth Method
- **Magic link (OTP)** via `supabase.auth.signInWithOTP({ email })`
- Redirect target: `window.location.origin + '/'`
- Verified in `app/login/page.tsx`

### 3.2 SSR Auth Hardening (recent sprint)
- **`@supabase/ssr`** package replaces legacy `@supabase/auth-helpers-nextjs`
- Two separate Supabase clients:
  - `lib/supabase/server.ts` — uses `cookies()` from `next/headers`; for Server Components and Server Actions
  - `lib/supabase/browser.ts` — uses `createBrowserClient`; for Client Components
- **`middleware.ts`** — calls `supabase.auth.getUser()` (NOT `getSession()`) on every non-static request
  - `getUser()` hits the Supabase auth server directly, preventing stale JWT attacks
  - Session cookies are refreshed in-place via `setAll()` callback

### 3.3 Auth State in Client Components
- `DashboardClient` calls `supabase.auth.getUser()` on mount to set `isLoggedIn` state
- Subscribes to `supabase.auth.onAuthStateChange` to reactively update login state
- Sign-out button calls `supabase.auth.signOut()` and sets `isLoggedIn = false`

### 3.4 Role Model
- Role is stored in `profiles.role` (DB column)
- In the current MVP, role is also accepted as a URL query parameter `?role=<role>` on the homepage
- No middleware-enforced role gating is present in source (MVP simplification)
- `isManager` computed: `['kozos_kepviselo', 'megbizott'].includes(role)` — controls ticket status buttons
- `isAdminLike` computed: `['kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo'].includes(role)` — controls announcement form visibility

### 3.5 Middleware Matcher
```typescript
matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
```
Excludes all static assets and images. Applies to all page and API routes.

---

## 4. Supabase Configuration

### 4.1 Application Supabase
- `NEXT_PUBLIC_SUPABASE_URL` — public, used by both server and browser clients
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- Both clients (`server.ts`, `browser.ts`) use these env vars

### 4.2 Shared GeoData Address Registry (separate data plane)
- `GEODATA_ADDRESS_API_URL` — server-only base URL of the versioned registry API
- `GEODATA_ADDRESS_API_TOKEN` — server-to-server read credential
- PanelLakó never receives or uses the GeoData Supabase service-role key
- only public, non-personal address references cross this boundary

**Important:** tenant, authentication, workspace, membership and resident data
remain exclusively in the PanelLakó Supabase project. The external canonical UUID
is an opaque reference, not a cross-database foreign key. PanelLakó stores a
structured snapshot so reviews remain auditable during a registry outage.

---

## 5. Address Autocomplete Service

**Route:** `GET /api/location/autocomplete?q=<query>`
**Mode:** `force-dynamic`  
**Source:** `app/api/location/autocomplete/route.ts`, `lib/address-registry/server.ts`

### 5.1 Capabilities
- Indexed shared search: text query → at most 8 Hungarian building-level suggestions
- stable canonical UUID and `osm:<type>:<id>` source identity
- structured postcode, settlement, street, house number and coordinate snapshot
- dataset/normalization version plus mandatory OSM attribution
- explicit `EXACT` / `LINEAGE_REDIRECT` resolve metadata; old canonical IDs
  are accepted only when requested ID, current ID and OSM source identity agree
- backward-compatible response adapter for the existing profile address flow
- no public Nominatim autocomplete fallback
- fail-closed handling with no database or credential leakage

### 5.2 Debounce
- Client-side: 350ms debounce + AbortController for in-flight request cancellation
- Minimum query length: 3 characters on both client and server
- Accessible ARIA combobox with keyboard selection and stale-selection invalidation

### 5.3 Community onboarding trust boundary
- the browser submits only the selected canonical UUID
- `POST /api/onboarding/community-requests` authenticates the user and resolves
  that UUID server-to-server before any application-database write
- `create_community_creation_request_v2` stores the trusted structured snapshot
  as `SOURCE_MATCHED`, which is not proof of ownership or management authority
- an explicit manual path remains available, always `UNVERIFIED` and review-only

---

## 6. Server Actions

All mutations use Next.js 14 Server Actions (`'use server'` directive). Each action:
1. Creates a Supabase server client via `lib/supabase/server.ts`
2. Calls `supabase.auth.getUser()` to get the authenticated user
3. Performs the database mutation
4. Calls `revalidatePath('/')` to invalidate the root page cache

| Action File | Exported Actions |
|-------------|-----------------|
| `app/actions/tickets.ts` | `createTicket`, `updateTicketStatus` |
| `app/actions/meter-readings.ts` | `submitMeterReading` |
| `app/actions/announcements.ts` | `createAnnouncement` |
| `app/actions/documents.ts` | `acknowledgeDocument`, `createDocument` |
| `app/actions/notifications.ts` | `markNotificationRead`, `createNotification` |

---

## 7. Optimistic UI Updates

`DashboardClient` implements optimistic updates for the ticket workflow:
- On `submitTicket`: a synthetic ticket object with `id: optimistic-<timestamp>` is prepended to `tickets` state before the Server Action resolves
- On `updateTicketStatus`: the ticket's status is updated locally before the server confirms

---

## 8. Deployment

| Aspect | Detail | Confidence |
|--------|--------|------------|
| Hosting | Vercel (inferred from Next.js App Router + edge middleware) | Medium |
| Database | Supabase managed PostgreSQL | High |
| Edge middleware | Vercel Edge Runtime | Medium |
| Email | Resend (package installed, integration point TBD) | Medium |
| Static assets | Next.js built-in via `_next/static` | High |

---

## 9. Environment Variables Summary

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | App Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | App Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | PanelLakó application admin operations only |
| `GEODATA_ADDRESS_API_URL` | Server-only | Shared versioned address-registry base URL |
| `GEODATA_ADDRESS_API_TOKEN` | Server-only | Least-privilege address-registry read credential |
