# Dev Prompt #2: SSR Auth Hardening + Cookie-based Session (Security & Trust Gate)

**Initiative ID:** PANELLAKO-AUTH-002  
**Priority:** HIGH — Security & Trust Gate  
**Business Value:** +€350,000–€750,000 (unlocks enterprise sales; blocking for GDPR compliance)  
**Estimated Engineering Effort:** 1–2 days  
**Assigned to:** AI Coding Agent  
**Date:** 2026-05-15  
**Prerequisite for:** ALL other initiatives  

---

## 1. Initiative Header and Business Case

### What This Initiative Does

This initiative hardens the server-side session handling layer of PanelLakó to use cryptographically verified, server-authoritative user identity on every request. It eliminates the use of `getSession()` (which trusts a potentially stale or tampered client-side JWT) and replaces it everywhere with `getUser()` (which makes a network call to Supabase's auth server and verifies the token's signature server-side). It also audits and hardens the middleware cookie refresh loop, the server-side Supabase client factory, the browser-side Supabase client factory, and the root `app/page.tsx` server component to ensure the authenticated user's identity is consistently loaded from a trustworthy source.

### Business Rationale — GDPR, Security Trust, and Enterprise Sales

PanelLakó handles sensitive personal data: full names, physical addresses, unit ownership percentages, financial balances, and building access records. Under GDPR Article 25 (Data Protection by Design) and Article 32 (Security of Processing), the controller (the building management company using PanelLakó) must implement "appropriate technical measures" to ensure data confidentiality. A session implementation that trusts a client-supplied JWT without server-side verification is not an "appropriate technical measure" — it is a vulnerability. If a JWT is stolen (e.g., via XSS), an attacker can impersonate a resident and read financial records, access building access codes, or view other tenants' data.

The GDPR implications are severe: a data breach caused by a defective session implementation could expose PanelLakó (and its customers) to fines of up to €20M or 4% of global annual turnover, whichever is higher. For a SaaS vendor, this also means unlimited indemnification liability under the Data Processing Agreements signed with enterprise customers. No Hungarian building management company's legal department will sign a DPA with a vendor whose session layer is demonstrably broken.

From an enterprise sales perspective: every B2B SaaS sale in the property management vertical requires a security questionnaire. The question "How do you validate user session identity on the server?" must be answered with "Via cryptographic token verification against the authentication authority" — not "We trust the JWT the client sends us." This initiative provides that answer.

The practical attack surface today: Supabase's `getSession()` reads the session from the cookie and returns it without making a network call. The cookie contains a JWT access token and a refresh token. The access token has a 1-hour TTL. If an attacker steals the cookie (via network interception, XSS, or log exfiltration), they have up to 1 hour of valid access. `getUser()` verifies the token with the Supabase auth service on every call — a revoked token is detected within seconds of revocation. This is the critical difference.

### Why This Is a Prerequisite for All Other Initiatives

Every other initiative in the PanelLakó roadmap depends on knowing who the current user is server-side. Multi-tenant routing (workspace ID in URL) depends on confirming the user's membership in the building before showing any data. Stripe billing depends on the billing identity matching the authenticated user. Document access controls depend on knowing the user's role. None of these security properties can be safely implemented without a trustworthy server-side user identity. This initiative is the foundation — implement it first, or risk building every subsequent feature on a flawed security model.

---

## 2. Current State — What `getSession()` Calls Look Like and Why They Are Wrong

### 2.1 The Supabase SSR Documentation Warning

The official Supabase SSR documentation (docs.supabase.com/guides/auth/server-side/nextjs) explicitly states:

> "In Server Components, you should use `supabase.auth.getUser()` to retrieve the user object. **Never use `supabase.auth.getSession()` inside server code** such as middleware. It isn't guaranteed to revalidate the Auth token."

This is because `getSession()` on the server reads the JWT from the cookie and decodes it locally without hitting the Supabase auth service. If the JWT has been revoked (e.g., the user changed their password, or an admin invalidated the session), `getSession()` will still return the old session as valid until the JWT's TTL expires (up to 1 hour). `getUser()` makes a network call to `POST /auth/v1/user` with the JWT as a Bearer token — Supabase validates it server-side and returns the user object, or a 401 if revoked.

### 2.2 Current State of Each Auth File

**`middleware.ts` (current — 34 lines):** The middleware already calls `getUser()`, not `getSession()`. The comment on line 27 correctly documents this. However, the implementation has a subtle bug: the `setAll` handler creates a new `supabaseResponse = NextResponse.next({ request })` inside the cookie setter, which can interfere with cookie propagation if the middleware response object is referenced before `setAll` is called. This must be verified against the canonical implementation pattern.

**`lib/supabase/server.ts` (current — 26 lines):** Correctly uses `createServerClient` from `@supabase/ssr` and implements `getAll`/`setAll` cookie handlers with a try-catch for the read-only Server Component context. No `getSession()` usage. This is correct.

**`lib/supabase/browser.ts` (current — 12 lines):** Correctly uses `createBrowserClient` from `@supabase/ssr`. The browser client should only be used in `'use client'` components. The `hasSupabaseConfig` export is also here, which is fine. No issue.

**`app/page.tsx` (current — 11 lines):** This is the critical problem. The root page is a Server Component that receives `role` from `searchParams` and renders `<Dashboard role={role} />`. It does NOT fetch the authenticated user server-side. The user identity is only obtained client-side in `dashboard-client.tsx` via `supabase.auth.getUser()` in a `useEffect`. This means:
1. On the initial server render, the page renders as if no user is authenticated (because there is no server-side user fetch).
2. The role-based view switching is done via `?role=` query parameter, which is entirely unauthenticated.
3. A user can navigate to `?role=kozos_kepviselo` without having that role in the database.

**`app/actions/tickets.ts` (current):** Uses `getUser()` — correct. The pattern is: `const { data: { user } } = await supabase.auth.getUser()`. This is the right approach.

**`app/actions/announcements.ts` (current):** Uses `getUser()` — correct. Has auth guard.

**`app/actions/notifications.ts` (current):** Uses `getUser()` — correct.

**`app/actions/documents.ts` (current):** Uses `getUser()` — correct.

**`app/actions/meter-readings.ts` (current):** Uses `getUser()` — correct but has no auth guard (allows anonymous submissions).

### 2.3 Summary of Risk Posture

| File | Uses getUser() | Auth Guard | Risk |
|------|---------------|------------|------|
| middleware.ts | YES | N/A | LOW (already correct) |
| lib/supabase/server.ts | N/A | N/A | LOW (factory only) |
| lib/supabase/browser.ts | N/A | N/A | LOW (browser only) |
| app/page.tsx | NO | NO | HIGH — role param unauthenticated |
| app/actions/tickets.ts | YES | PARTIAL | MEDIUM — createTicket allows anon |
| app/actions/meter-readings.ts | YES | NO | MEDIUM — allows anon submit |
| app/actions/announcements.ts | YES | YES | LOW |
| app/actions/notifications.ts | YES | YES | LOW |
| app/actions/documents.ts | YES | YES | LOW |
| dashboard-client.tsx | YES (browser) | N/A | LOW (client-side read only) |

---

## 3. Pre-Conditions

### 3.1 Required Packages

The following packages must be present:
```bash
npm list @supabase/ssr @supabase/supabase-js
```

Both must be installed. `@supabase/ssr` provides `createServerClient` and `createBrowserClient`. `@supabase/supabase-js` provides the underlying `SupabaseClient` type.

### 3.2 Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Both must be set. If either is missing, `createServerClient` will throw on instantiation.

### 3.3 Next.js Version

Next.js 14 App Router is required. Verify:
```bash
npm list next
```

Expected: `next@14.x.x`. The `cookies()` function from `next/headers` and the `NextRequest`/`NextResponse` types from `next/server` are App Router APIs. Pages Router does not support this pattern.

### 3.4 No Database Changes Needed

This initiative is a pure application-layer change. No SQL migrations are required. The auth tokens are managed entirely by Supabase's auth service and stored as cookies — no database table changes are involved. The `profiles` table (which stores user roles) already exists and is correctly seeded.

---

## 4. Phase 1 — No Database Changes: Why

Authentication state in `@supabase/ssr` is stored as HTTP cookies, not in the database. When a user logs in via magic link (the `app/login/page.tsx` flow), Supabase sets two cookies on the response:

- `sb-<project-ref>-auth-token` — the JWT access token (expires in 1 hour)
- `sb-<project-ref>-auth-token-refresh` — the refresh token (expires in 30+ days)

The middleware is responsible for detecting a near-expired access token and calling `supabase.auth.getUser()` (which internally calls `exchangeCodeForSession` or `refreshSession` when needed). The refreshed tokens are then written back to the response cookies. This is a stateless cookie-rotation flow — the database is not involved except that Supabase's auth server validates JWTs against its own internal auth tables, which are in the `auth` schema (not the `public` schema we manage).

No changes to `supabase/schema.sql` are needed.

---

## 5. Phase 2 — Complete Implementation of `middleware.ts`

The current `middleware.ts` is already functionally correct but has a subtle ordering issue in the `setAll` handler. The canonical pattern from Supabase's own documentation creates the response object once, then mutates it in `setAll`. The current code re-creates `supabaseResponse` inside `setAll`, which is correct — but it re-creates it without preserving any response headers that might have been set before `setAll` is called.

Additionally, the middleware should redirect unauthenticated users away from protected routes in production. For PanelLakó's current MVP state, all routes are accessible without authentication (the mock data fallback ensures the UI always renders). However, the middleware should at minimum add the session refresh logic robustly.

### 5.1 Complete `middleware.ts` Implementation

Replace the entire file `/home/user/panellako/middleware.ts` with:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * PanelLakó middleware — session refresh + route protection
 *
 * SECURITY RULE: Always call getUser(), never getSession().
 * getSession() trusts the client JWT without server-side verification.
 * getUser() calls POST /auth/v1/user with the JWT as Bearer token —
 * Supabase validates it and returns null for revoked/expired tokens.
 *
 * Cookie refresh pattern from @supabase/ssr canonical docs:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function middleware(request: NextRequest) {
  // Step 1: Create a mutable response to start with
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Step 2: Create the Supabase server client with cookie handlers.
  // The setAll handler updates BOTH the request object AND the response object.
  // This is required so the refreshed session cookie is forwarded to the browser.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mutate the request cookies (so downstream Server Components see the refreshed token)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Re-create the response with the mutated request (preserves request cookie state)
          supabaseResponse = NextResponse.next({
            request,
          });
          // Set cookies on the outgoing response (so the browser receives the refreshed tokens)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Step 3: Refresh the session.
  // CRITICAL: This MUST be getUser(), not getSession().
  // getUser() makes a verified server-side call to Supabase auth.
  // This call also triggers token refresh if the access token is near expiry.
  // The refreshed tokens are written via setAll above.
  //
  // Do not put any logic between creating supabase and calling getUser().
  // Do not put any code that might throw between supabase creation and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Step 4: Route protection (expand in future phases as auth becomes mandatory)
  // Currently PanelLakó allows unauthenticated access for demo purposes.
  // When production auth is mandatory, add protected route logic here:
  //
  // const pathname = request.nextUrl.pathname;
  // const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/w/');
  // const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth');
  //
  // if (!user && isProtectedRoute) {
  //   const redirectUrl = new URL('/login', request.url);
  //   redirectUrl.searchParams.set('redirectTo', pathname);
  //   return NextResponse.redirect(redirectUrl);
  // }
  //
  // if (user && isAuthRoute) {
  //   return NextResponse.redirect(new URL('/', request.url));
  // }

  // Step 5: Attach user info to request headers (optional — useful for Server Components)
  // This avoids a second getUser() call in page.tsx if needed.
  if (user) {
    supabaseResponse.headers.set('x-supabase-user-id', user.id);
    supabaseResponse.headers.set('x-supabase-user-email', user.email ?? '');
  }

  // Step 6: IMPORTANT — return supabaseResponse, not NextResponse.next()
  // If you return a different response object, the cookie refresh will be lost.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - Static assets (svg, png, jpg, jpeg, gif, webp)
     *
     * This pattern ensures the middleware runs on all page requests
     * (including API routes) but not on static file requests.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### 5.2 Why the `setAll` Re-creation Pattern Is Correct

The pattern of re-creating `supabaseResponse = NextResponse.next({ request })` inside `setAll` is intentional and required by `@supabase/ssr`. When Supabase's internal code calls `setAll`, it is because new tokens are being set. The response must be re-created with the updated request (which now has the new cookies in `request.cookies`) so that any subsequent calls within the same middleware execution see the refreshed cookies. The cookies are then set on the re-created response object via `supabaseResponse.cookies.set(...)`. This two-step pattern (request mutation + response mutation) ensures both server-side code and the browser receive the updated tokens.

---

## 6. Phase 3 — Complete Implementation of `lib/supabase/server.ts`

The current implementation is correct but lacks documentation and error handling for the missing environment variable case. Replace the file:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers (any server-side Next.js 14 App Router context).
 *
 * SECURITY: This client reads/writes session cookies from the Next.js
 * cookie store. It does NOT persist tokens to localStorage (that is what
 * createBrowserClient in lib/supabase/browser.ts does).
 *
 * ALWAYS call getUser() on this client, never getSession().
 * getUser() performs server-side JWT verification via Supabase auth service.
 * getSession() only decodes the JWT locally and does not verify revocation.
 *
 * Cookie write failures in Server Components are expected and safe to ignore:
 * middleware.ts handles the cookie refresh on every request. Server Components
 * are read-only by the time the response is being assembled. The try-catch
 * in setAll handles this silently.
 */
export function createClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      '[PanelLakó] Missing Supabase environment variables. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. ' +
      'See: https://supabase.com/docs/guides/auth/server-side/nextjs'
    );
  }

  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // This catch block is intentional.
            // Server Component context: cookies() is read-only after the response
            // has started streaming. The middleware handles token refresh on each
            // request, so this setAll failure is benign in Server Components.
            // In Server Actions (where cookies ARE mutable), this will not throw.
          }
        },
      },
    }
  );
}
```

---

## 7. Phase 4 — Complete Implementation of `lib/supabase/browser.ts`

The current browser client is correctly implemented. Add the missing `hasSupabaseConfig` export and environment validation:

```typescript
import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in Client Components ('use client').
 *
 * SECURITY NOTE: The anon key is intentionally exposed to the browser.
 * It is safe to expose because:
 * 1. It only has access to tables/operations allowed by RLS policies.
 * 2. All sensitive operations require a valid authenticated session.
 * 3. The service_role key (which bypasses RLS) is NEVER included here.
 *
 * USE CASES:
 * - Listening to realtime subscriptions
 * - Reading public data in client components
 * - Auth state change listeners (onAuthStateChange)
 * - Sign out (supabase.auth.signOut())
 *
 * DO NOT USE for server-side data fetching — use lib/supabase/server.ts instead.
 * DO NOT call getSession() — use getUser() for identity verification.
 *
 * Note: getUser() in a browser context still makes a server call to verify
 * the JWT. It is slower than getSession() but always authoritative.
 * Use getUser() when you need guaranteed-accurate identity.
 * Use onAuthStateChange for reactive UI updates.
 */
export function createClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      '[PanelLakó] Missing Supabase environment variables. ' +
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.'
    );
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Boolean flag indicating whether Supabase is configured.
 * Used by getDashboardData() and DashboardClient to toggle between
 * real Supabase data and mock/demo fallback data.
 *
 * When false, the app runs entirely on mock data (useful for UI development
 * without a Supabase project).
 */
export const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

---

## 8. Phase 5 — Update `app/page.tsx` to Use Server Client

The current `app/page.tsx` does not fetch the authenticated user server-side. This creates the role-spoofing vulnerability (anyone can pass `?role=kozos_kepviselo`). Update it to:

1. Fetch the current authenticated user server-side using the server client
2. Read the user's role from the `profiles` table (or memberships table)
3. Override the `?role=` parameter with the database-backed role when authenticated
4. Fall back to `?role=` parameter (defaulting to `lako`) for unauthenticated/demo users

Replace `/home/user/panellako/app/page.tsx` with:

```typescript
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/browser';
import Dashboard from '@/components/dashboard';
import { Role } from '@/lib/types';

const allowedRoles: Role[] = [
  'lako',
  'tulajdonos',
  'kozos_kepviselo',
  'megbizott',
  'bizottsag',
  'konyvelo',
];

/**
 * Root page — server-authoritative role resolution.
 *
 * SECURITY LOGIC:
 * 1. If Supabase is configured AND the user has a valid session,
 *    read the user's role from the profiles table. The ?role= param is ignored.
 * 2. If Supabase is configured but the user is NOT authenticated,
 *    treat as 'lako' (most restricted role). The ?role= param is ignored for
 *    security — unauthenticated users cannot self-elevate their role.
 * 3. If Supabase is NOT configured (demo/development mode),
 *    use the ?role= param to enable role switching for UI development.
 *
 * This prevents role spoofing in production while preserving demo flexibility.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams?: { role?: string };
}) {
  // Demo mode: no Supabase configured → trust the query param
  if (!hasSupabaseConfig) {
    const roleParam = searchParams?.role;
    const role = allowedRoles.includes(roleParam as Role)
      ? (roleParam as Role)
      : 'lako';
    return <Dashboard role={role} />;
  }

  // Production mode: resolve role from server-side auth
  try {
    const supabase = createClient();

    // MUST use getUser(), not getSession()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // Unauthenticated: render as most-restricted role
      // Do NOT use the ?role= param — this would allow role spoofing
      return <Dashboard role="lako" />;
    }

    // Authenticated: read role from database (authoritative source)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      // Profile not found — this user exists in auth.users but not in profiles.
      // This can happen during onboarding. Default to most-restricted role.
      console.warn(
        `[app/page.tsx] Profile not found for user ${user.id}:`,
        profileError?.message
      );
      return <Dashboard role="lako" />;
    }

    const dbRole = profile.role as Role;
    const resolvedRole = allowedRoles.includes(dbRole) ? dbRole : 'lako';

    return <Dashboard role={resolvedRole} />;
  } catch (error) {
    // Supabase client creation failed (missing env vars, network error, etc.)
    // Fall back to demo mode with query param
    console.error('[app/page.tsx] Failed to create Supabase client:', error);
    const roleParam = searchParams?.role;
    const role = allowedRoles.includes(roleParam as Role)
      ? (roleParam as Role)
      : 'lako';
    return <Dashboard role={role} />;
  }
}
```

### 8.1 Important Notes on `app/page.tsx`

The `searchParams` prop in Next.js 14 App Router is only available in Server Components (not Client Components). The page file is already a Server Component (no `'use client'` directive). The `createClient()` call here uses the server-side Supabase client that reads cookies from the Next.js cookie store — the same tokens that the middleware refreshed on this request.

The `await supabase.auth.getUser()` call here is the second call in the request lifecycle (the first was in middleware). This is acceptable and intentional: the middleware call is for session refresh, the page call is for identity verification. The Supabase JS SDK caches the result of `getUser()` within a single request cycle using an in-memory singleton, so the second call is served from cache in practice (though this is an implementation detail of the SDK and should not be relied upon).

---

## 9. Phase 6 — Audit All Server Actions for `getUser()` Compliance

All existing Server Actions in `app/actions/` already use `getUser()`. This section documents the required pattern for future actions and flags the one gap that needs filling.

### 9.1 Canonical Server Action Auth Pattern

Every Server Action that performs a write operation or returns user-specific data MUST follow this pattern:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function someProtectedAction(input: SomeInput) {
  const supabase = createClient();

  // ALWAYS use getUser(), never getSession()
  // getUser() makes a verified call to Supabase auth service
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // ALWAYS check for auth failure before any database operation
  if (authError || !user) {
    return {
      success: false,
      error: 'Ehhez a művelethez bejelentkezés szükséges.',
    };
  }

  // Optionally verify role from database (not from JWT claims, which can be stale)
  // const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  // if (profile?.role !== 'kozos_kepviselo') return { success: false, error: 'Nincs jogosultsága.' };

  // ... perform the database operation ...
  const { data, error } = await supabase
    .from('some_table')
    .insert({ /* ... */ })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}
```

### 9.2 Gap: `createTicket` Allows Unauthenticated Submissions

The `createTicket` action in `app/actions/tickets.ts` intentionally does not require authentication (it falls back to `user?.email ?? 'Névtelen'`). This is a product decision — allow residents to submit tickets even if not logged in. This is acceptable for the MVP but should be reconsidered when role-based access becomes a billing feature. Add a comment documenting this decision:

```typescript
// INTENTIONAL: createTicket allows unauthenticated submissions.
// Rationale: residents without a PanelLakó account should still be able
// to submit a fault ticket (e.g., via a QR code on the building notice board).
// The submitted_by field captures the name from the form as an unverified string.
// When authentication is mandatory, add: if (!user) return { success: false, error: '...' };
```

### 9.3 Gap: `submitMeterReading` Allows Unauthenticated Submissions

Same situation as tickets. Add the same style of comment. For security, consider adding a rate limit (e.g., one reading per unit per day) enforced at the RLS level in production.

### 9.4 Future Actions Must Always Use `getUser()`

Add this rule to `CLAUDE.md` and `codingLessonsLearnt.md` to prevent regression:

> **RULE (non-negotiable from v[current version]):** Every Server Action that writes to the database MUST call `supabase.auth.getUser()` and check that `user` is non-null before performing any database operation. NEVER use `getSession()` in Server Actions. NEVER trust the `?role=` query parameter for authorization decisions in Server Components.

---

## 10. Phase 7 — Testing

### Test 1: Cookie Deletion Test (Session Invalidation)

This test verifies that deleting the session cookie immediately invalidates server-side access.

1. Log in to PanelLakó via magic link at `http://localhost:3000/login`
2. Confirm you are logged in — the header should show "Session aktív" and the role should match your profile
3. Open Chrome DevTools > Application > Cookies > `http://localhost:3000`
4. Delete the cookie named `sb-<project-ref>-auth-token`
5. Navigate to `http://localhost:3000/` (full page refresh — no client-side SPA navigation)
6. Expected: The page renders as `lako` role (unauthenticated fallback from `app/page.tsx`)
7. Expected: The header shows "Belépés" (not "Session aktív")
8. Verify: `supabase.auth.getUser()` in the browser console returns `{ data: { user: null }, error: ... }`

### Test 2: Session Expiry Simulation

This test verifies that an expired JWT is rejected server-side.

1. Log in normally
2. In Supabase Dashboard > Authentication > Users, find your test user
3. Click "Send password reset" — this invalidates all existing sessions for that user
4. Navigate to any page in PanelLakó (full page refresh)
5. Expected: The page renders as unauthenticated (`lako` role from `app/page.tsx`)
6. Expected: A second call to a protected Server Action returns `{ success: false, error: 'Ehhez a művelethez bejelentkezés szükséges.' }`
7. Note: The middleware's `getUser()` call will detect the revoked token and return null user

### Test 3: Token Refresh Test

This test verifies that the middleware correctly refreshes near-expired tokens.

1. Log in normally
2. Open Chrome DevTools > Application > Cookies
3. Find the `sb-<project-ref>-auth-token` cookie and note its content
4. Set the system clock forward 55 minutes (or use the Supabase dashboard to manually expire the token — not possible directly, but see workaround below)
5. Navigate to any page — the middleware should call `getUser()`, detect the near-expiry, and call the refresh endpoint
6. After navigation, check cookies again — the `sb-<project-ref>-auth-token` should have a new value with a future expiry
7. Workaround for testing: Modify the JWT TTL in Supabase Dashboard > Authentication > Settings > JWT expiry to 60 seconds. Log in. Wait 60 seconds. Navigate. The middleware should refresh and a new JWT should appear in cookies.

### Test 4: Role Spoofing Prevention Test (Production Mode)

1. Ensure Supabase is configured and you are logged in as a `lako` role user
2. Navigate to `http://localhost:3000/?role=kozos_kepviselo`
3. Expected: The page renders as `lako` (your database-backed role), NOT as `kozos_kepviselo`
4. Verify: The manager-only "Célzott kommunikáció" section is NOT visible

### Test 5: Multi-Tab Session Consistency

1. Open two browser tabs to `http://localhost:3000/`
2. In tab 1, sign out (click "Kijelentkezés")
3. In tab 2, refresh the page
4. Expected: Tab 2 also shows as unauthenticated (because the cookie was cleared in tab 1)
5. This test verifies that session state is cookie-driven, not localStorage-driven

### Test 6: Unauthenticated Server Action Rejection

1. Sign out of PanelLakó
2. Open Chrome DevTools > Console
3. Attempt to call a protected action by directly calling the Server Action endpoint:
   ```javascript
   // This simulates a Client Component calling a Server Action without auth
   await fetch('/_next/action', { method: 'POST', body: JSON.stringify({}) });
   ```
4. All protected actions should return `{ success: false, error: 'Ehhez a művelethez bejelentkezés szükséges.' }`
5. Verify the vote action, announcement action, and notification action all reject unauthenticated callers

---

## 11. Error Handling for Session/Auth-Specific Scenarios

### Scenario 1: Expired Token Not Refreshed

**Symptom:** User sees the page render correctly but Server Actions return auth errors.
**Cause:** The middleware ran but `getUser()` returned a network error, so the token refresh was skipped.
**Fix:** The middleware's `getUser()` call is wrapped in try-catch by the Supabase SDK. If it fails, the old (potentially expired) token remains in cookies. The Server Action then calls `getUser()` itself and detects the expiry. Return the auth error to the client and redirect to `/login`.
**Client-side handling:**
```typescript
const result = await someAction(input);
if (!result.success && result.error === 'Ehhez a művelethez bejelentkezés szükséges.') {
  window.location.href = '/login';
}
```

### Scenario 2: Missing Environment Variables

**Symptom:** `createClient()` in `lib/supabase/server.ts` throws an unhandled error.
**Cause:** `.env.local` is missing or the server was not restarted after adding it.
**Fix:** The updated `lib/supabase/server.ts` throws a descriptive error: `[PanelLakó] Missing Supabase environment variables.` The `app/page.tsx` wraps the `createClient()` call in try-catch and falls back to demo mode.
**Detection:** Check the Next.js server console for the error message. Verify `.env.local` exists and contains both variables.

### Scenario 3: Middleware Loop (Infinite Redirect)

**Symptom:** The browser enters an infinite redirect loop between `/` and `/login`.
**Cause:** The route protection logic in middleware redirects unauthenticated users to `/login`, but `/login` is also matched by the middleware and attempts another redirect.
**Fix:** The `matcher` pattern in `middleware.ts` must exclude `/login`, `/auth`, and `/api` from the route protection redirect:
```typescript
// In the middleware route protection block (commented out in current impl):
const publicPaths = ['/login', '/auth/callback', '/api/', '/_next/'];
const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));
if (!user && isProtectedRoute && !isPublicPath) {
  return NextResponse.redirect(new URL('/login', request.url));
}
```

### Scenario 4: Cross-Domain Cookie Issues

**Symptom:** Cookies are set by Supabase but not sent on subsequent requests.
**Cause:** If PanelLakó is served from a different domain than expected (e.g., a Vercel preview deployment at `panellako-git-main.vercel.app` but cookies were set for `panellako.vercel.app`), the `SameSite` and `Domain` cookie attributes may prevent cookies from being sent.
**Fix:** Supabase's `@supabase/ssr` library sets cookies with `SameSite=Lax` and no `Domain` attribute (host-only), which is the most compatible configuration. If running behind a proxy or custom domain, ensure the `NEXT_PUBLIC_SUPABASE_URL` matches the actual URL the browser is connecting to. Do not set `NEXT_PUBLIC_SUPABASE_URL` to `localhost` in production.

### Scenario 5: `getUser()` Network Timeout in Middleware

**Symptom:** Pages load slowly or time out; middleware appears to hang.
**Cause:** The `getUser()` call in middleware makes an HTTP request to Supabase's auth service. If the Supabase project is paused (free tier) or there is network latency, this call can take 2–5 seconds.
**Fix:** The Supabase SDK does not expose a timeout parameter for `getUser()`. On free tier, the project must be un-paused via the Supabase dashboard. In production, use a paid Supabase plan with guaranteed uptime. For development, consider adding a timeout wrapper:
```typescript
const authPromise = supabase.auth.getUser();
const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
  setTimeout(() => resolve({ data: { user: null }, error: new Error('timeout') }), 3000)
);
const { data: { user } } = await Promise.race([authPromise, timeoutPromise]);
```

### Scenario 6: Cookie Store Read-Only Error in Server Components

**Symptom:** Console warning: `Warning: Cannot update cookies in a Server Component.`
**Cause:** The `setAll` handler in `lib/supabase/server.ts` attempts to write cookies when called from a Server Component (as opposed to a Server Action or Route Handler), which is read-only.
**Fix:** Already handled by the try-catch in `setAll`. The warning is benign — middleware handles the actual cookie write. The try-catch ensures the error does not propagate.

### Scenario 7: Profile Row Missing for Authenticated User

**Symptom:** `app/page.tsx` logs "Profile not found" and renders as `lako` even for authenticated managers.
**Cause:** The user exists in `auth.users` (managed by Supabase auth) but has no corresponding row in `public.profiles`.
**Fix:** A database trigger on `auth.users` INSERT should automatically create a `profiles` row:
```sql
-- Add to supabase/schema.sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'lako'  -- default role; upgrade via admin panel
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Scenario 8: `app/page.tsx` Accessing `searchParams` After Conversion to Async

**Symptom:** TypeScript error: `Property 'role' does not exist on type 'Promise<...>'`
**Cause:** In Next.js 14, `searchParams` in Server Components is synchronous. In Next.js 15, it becomes a Promise. The current implementation uses `searchParams?.role` which works in Next.js 14.
**Fix:** The current implementation is correct for Next.js 14. If the project upgrades to Next.js 15, update the page signature:
```typescript
// Next.js 15+ pattern:
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const resolvedParams = await searchParams;
  const roleParam = resolvedParams?.role;
  // ...
}
```

---

## 12. Security Analysis — What This Initiative Prevents

### Attack 1: JWT Theft via XSS

**Attack vector:** A Cross-Site Scripting (XSS) vulnerability in a third-party dependency allows an attacker to read `localStorage` and steal the Supabase access token.

**Why it's less dangerous with `getUser()`:** The Supabase `@supabase/ssr` library stores tokens in cookies (not localStorage). Cookies can be set as `HttpOnly`, which prevents JavaScript from reading them. The browser client (`lib/supabase/browser.ts`) cannot read `HttpOnly` cookies — it receives them implicitly on each request. An XSS attacker cannot steal the session.

**Additional mitigation:** Supabase sets cookies with `SameSite=Lax`, which prevents Cross-Site Request Forgery (CSRF) attacks from initiating state-changing requests from external sites.

### Attack 2: Session Replay After Password Change

**Attack vector:** An attacker obtains a valid JWT (e.g., from server logs). The user changes their password. With `getSession()`, the old JWT remains valid for up to 1 hour. With `getUser()`, the revoked JWT is rejected immediately on the next request.

**Why `getUser()` prevents this:** `getUser()` calls `POST /auth/v1/user` with the JWT as a Bearer token. When the user changes their password, Supabase invalidates all existing sessions. The next `getUser()` call returns an error, and the middleware/page treats the user as unauthenticated.

### Attack 3: Role Elevation via URL Manipulation

**Attack vector:** An attacker navigates to `/?role=kozos_kepviselo` to see manager-only UI or access manager-only Server Actions.

**What this initiative prevents:** The updated `app/page.tsx` ignores the `?role=` parameter when Supabase is configured and the user is authenticated. The role is read from `public.profiles` (database-authoritative). The `?role=` parameter only works in demo mode (`!hasSupabaseConfig`).

**Remaining gap:** Server Actions that perform manager-only operations still need explicit role verification:
```typescript
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
if (!['kozos_kepviselo', 'megbizott'].includes(profile?.role ?? '')) {
  return { success: false, error: 'Nincs jogosultsága ehhez a művelethez.' };
}
```
This is a future hardening step. Current RLS policies do not enforce role-based write restrictions (they use `with check (true)`). The role check must be added at the Server Action level.

### Attack 4: Session Fixation

**Attack vector:** An attacker tricks the user into using a pre-set session token.

**Why `@supabase/ssr` prevents this:** The Supabase SSR library rotates the refresh token on every use. Each `getUser()` call that triggers a token refresh issues a new refresh token and invalidates the old one. Even if an attacker fixated a refresh token, it would be invalidated after the legitimate user's first navigation.

### Attack 5: Information Disclosure via Stale Cache

**Attack vector:** A user logs out. The next user on the same shared computer (e.g., a building manager's shared PC) navigates to the app and sees the previous user's data due to Next.js cache serving a stale server-rendered page.

**What this initiative prevents:** `app/page.tsx` is a Server Component that calls `getUser()` on every request. There is no caching of the user identity. Next.js App Router does not cache Server Component output that depends on cookies (it uses the `cookies()` call as a cache-bust signal). The page will always re-render with the current session's user on a full navigation.

---

## 13. Integration with Other Initiatives

### This Initiative Is a Hard Prerequisite For:

1. **Dev Prompt #1 (Real Supabase Data Writes):** The audit log writes in those actions require a verified `user.id`. If `getUser()` is not called, the `actor_id` is null and audit records are incomplete. The role authorization checks added to `app/page.tsx` ensure that role-gated mutations (announcements, work orders) can be verified server-side.

2. **Multi-Tenant Workspace Routing (future):** Workspace-scoped routes at `/w/:workspaceId` must verify that the authenticated user is a member of that workspace before serving any data. This verification requires server-side `getUser()` + a membership table query — which this initiative establishes as the standard pattern.

3. **Stripe Billing Integration (future):** Subscription state must be attached to the authenticated user's Supabase profile. The Stripe webhook that records payment success must be able to look up the user by Supabase user ID. This only works if the user ID is consistently available server-side via `getUser()`.

4. **GDPR Compliance (ongoing):** The right to erasure (GDPR Article 17) requires that when a user's `auth.users` entry is deleted, all their data (tickets, votes, meter readings attributed to them) is either anonymized or deleted. This is already handled at the schema level via `ON DELETE SET NULL` and `ON DELETE CASCADE` constraints. However, the data can only be correctly attributed if it was written with a verified `user.id` — which requires `getUser()`.

5. **White-Label Embedding (future):** Property management companies that embed PanelLakó in their own portal will expect that user sessions are fully isolated between buildings. This isolation requires that the authenticated user identity is always server-verified, not client-trusted.

---

## 14. Rollback Plan

All changes in this initiative are backwards-compatible with the current behavior.

**Rollback `middleware.ts`:** The old version is preserved in git history. Revert with:
```bash
git revert HEAD --no-edit
```
The middleware will return to the previous implementation. Functional behavior is unchanged (both old and new versions call `getUser()`).

**Rollback `lib/supabase/server.ts`:** The only change is the added error message in the missing-env case and the documentation. Revert with git revert. Functional behavior is unchanged.

**Rollback `lib/supabase/browser.ts`:** The only change is added documentation and the missing-env error. Revert with git revert.

**Rollback `app/page.tsx`:** This is the most impactful change. If the role-from-database logic causes rendering issues, revert to:
```typescript
export default function HomePage({ searchParams }: { searchParams?: { role?: string } }) {
  const roleParam = searchParams?.role;
  const role = allowedRoles.includes(roleParam as Role) ? (roleParam as Role) : 'lako';
  return <Dashboard role={role} />;
}
```
This restores the original (insecure but functional) behavior. The security gap (role spoofing) returns, but the application continues to work for demo purposes.

**Feature flag pattern for gradual rollout:**
```typescript
// In app/page.tsx — add env var to toggle new auth behavior
const USE_DB_ROLE = process.env.NEXT_PUBLIC_USE_DB_ROLE === 'true';
if (USE_DB_ROLE && hasSupabaseConfig) {
  // ... new server-authoritative role resolution ...
} else {
  // ... original ?role= param behavior ...
}
```

---

## 15. Definition of Done — Checklist (14 Items)

- [ ] **DOD-1:** `middleware.ts` updated — canonical `setAll` pattern implemented, `getUser()` call is the ONLY auth call in middleware, inline comments document why `getSession()` is forbidden.
- [ ] **DOD-2:** `lib/supabase/server.ts` updated — missing-env error message added, `setAll` try-catch has inline explanation.
- [ ] **DOD-3:** `lib/supabase/browser.ts` updated — documentation of safe vs. unsafe usage added, `hasSupabaseConfig` export preserved.
- [ ] **DOD-4:** `app/page.tsx` updated — server-side `getUser()` + `profiles` table role lookup implemented; `?role=` param only trusted in demo mode.
- [ ] **DOD-5:** `app/page.tsx` wraps all Supabase calls in try-catch with fallback to demo mode — a Supabase outage cannot crash the landing page.
- [ ] **DOD-6:** `grep -r "getSession" app/ lib/ components/` returns zero results (no `getSession()` usage anywhere in application code).
- [ ] **DOD-7:** Test 1 (Cookie Deletion) passes — page renders as unauthenticated after cookie deletion.
- [ ] **DOD-8:** Test 4 (Role Spoofing Prevention) passes — `?role=kozos_kepviselo` is ignored when user is authenticated as `lako`.
- [ ] **DOD-9:** Test 6 (Unauthenticated Server Action Rejection) passes — all auth-guarded actions return `{ success: false }` without a valid session.
- [ ] **DOD-10:** `npm run build` completes with zero TypeScript errors — no type regressions introduced.
- [ ] **DOD-11:** The manager-only "Célzott kommunikáció" section is NOT visible when authenticated as `lako`.
- [ ] **DOD-12:** The manager-only section IS visible when the database `profiles.role` is `kozos_kepviselo` for the logged-in user.
- [ ] **DOD-13:** `CLAUDE.md` or `codingLessonsLearnt.md` updated with the rule "Always use getUser(), never getSession() in server-side code."
- [ ] **DOD-14:** The `app/login/page.tsx` magic link flow still works end-to-end — login, cookie set, redirect to `/`, page renders with authenticated user's DB role.

---

## Appendix A: The `getSession()` vs `getUser()` Comparison

| Property | `getSession()` | `getUser()` |
|----------|---------------|-------------|
| Network call made? | NO — reads from cookie/memory | YES — calls Supabase auth server |
| Verifies token revocation? | NO | YES |
| Performance | Faster (local decode) | Slower (~100–300ms round trip) |
| Use in middleware? | FORBIDDEN (Supabase docs) | REQUIRED |
| Use in Server Components? | FORBIDDEN | REQUIRED |
| Use in Server Actions? | FORBIDDEN | REQUIRED |
| Use in Client Components? | Acceptable for reading cached session | Preferred for security-sensitive checks |
| Stale after password change? | YES (for up to 1hr) | NO (immediately detects revocation) |

## Appendix B: Cookie Attributes Set by `@supabase/ssr`

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `HttpOnly` | true | Prevents JavaScript access (XSS protection) |
| `SameSite` | Lax | CSRF protection — cookies sent on top-level navigations but not cross-origin XHR |
| `Secure` | true (in production) | Only sent over HTTPS |
| `Path` | / | Available on all paths |
| `Max-Age` | 3600 (access) / 2592000 (refresh) | 1 hour / 30 days |

## Appendix C: File Change Summary

| File | Change Type | Risk |
|------|-------------|------|
| `middleware.ts` | Refactor + documentation | LOW — functionally equivalent |
| `lib/supabase/server.ts` | Documentation + error message | LOW — additive only |
| `lib/supabase/browser.ts` | Documentation + error message | LOW — additive only |
| `app/page.tsx` | SECURITY FIX — server-auth role resolution | MEDIUM — behavior change in production |

## Appendix D: Related Official Documentation

- Supabase SSR Next.js guide: https://supabase.com/docs/guides/auth/server-side/nextjs
- `@supabase/ssr` package: https://github.com/supabase/ssr
- Next.js 14 Server Components: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- Next.js 14 Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- GDPR Article 32 (Security of Processing): https://gdpr.eu/article-32-security-of-processing/
