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
| GeoData / Addresses | Supabase (separate project, OSM data) | — | `app/api/location/autocomplete/route.ts` (verified) |

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

### 4.2 GeoData Supabase (separate project)
- `SUPABASE_URL` — server-only, different project (OSM address database)
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` — for address lookups
- `SUPABASE_ADDRESS_SCHEMA` (default: `'public'`)
- `SUPABASE_ADDRESS_TABLE` (default: `'osm_addresses'`)
- `GEODATA_USE_RPC` — if `'true'`, calls `search_osm_addresses` RPC instead of REST filter

**Important:** The GeoData Supabase project is entirely separate from the application Supabase project. The `NEXT_PUBLIC_SUPABASE_URL` is NOT used by the autocomplete route.

---

## 5. Address Autocomplete Service

**Route:** `GET /api/location/autocomplete?q=<query>[&lat=<lat>&lon=<lon>]`  
**Mode:** `force-dynamic`  
**Source:** `app/api/location/autocomplete/route.ts` (353 lines)

### 5.1 Capabilities
- Forward geocoding: text query → ranked address suggestions (max 8)
- Reverse geocoding: `?lat=&lon=` → nearest addresses (max 8, no query needed)
- Hungarian diacritic normalization (á→a, é→e, ő→o, etc.)
- Levenshtein fuzzy matching for typo tolerance
- City alias expansion: `bp` / `bpe` / `pest` → `budapest`
- Street type aliases: `u` → `utca`, `krt` → `körút`, etc.
- Roman numeral district expansion (i→1, ii→2 … xxiii→23)
- Accent variant expansion (up to 80 variants per search term)
- OR filter chain against 17 address fields, up to 180 filter conditions
- Scoring: exact (8000), postcode (1200), city (850), street match (1800), house number (1800)
- Deduplication of results by normalized label

### 5.2 Debounce
- Client-side: 350ms debounce + AbortController for in-flight request cancellation
- Minimum query length: 3 characters client-side, 2 characters server-side

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
| `SUPABASE_URL` | Server-only | GeoData Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | GeoData Supabase service key |
| `SUPABASE_ANON_KEY` | Server-only | GeoData Supabase anon key (fallback) |
| `SUPABASE_ADDRESS_SCHEMA` | Server-only | OSM addresses schema (default: `public`) |
| `SUPABASE_ADDRESS_TABLE` | Server-only | OSM addresses table (default: `osm_addresses`) |
| `GEODATA_USE_RPC` | Server-only | If `'true'`, use RPC for address search |
