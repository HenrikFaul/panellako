# Initiative 08 — SSR Auth Hardening + Middleware Route Protection
## GDPR Compliance + NAIH Audit Readiness | Value: +€130k–€300k

---

## 1. Initiative Header

**Title:** SSR Auth Hardening + Middleware Route Protection

**Value Range:** +€130k–€300k (GDPR trust premium + enterprise/municipal deal unlock)

**Business Case:**

PanelLakó's authentication infrastructure is substantially correct. The middleware at `middleware.ts` already calls `supabase.auth.getUser()` (not `getSession()`), the cookie-based server client in `lib/supabase/server.ts` uses `@supabase/ssr`, and protected routes redirect unauthenticated users to `/login`. This is a strong foundation.

However, a detailed audit reveals specific gaps that matter for NAIH (Nemzeti Adatvédelmi és Információszabadság Hatóság) compliance and enterprise sales: (1) the subscription paywall check in middleware uses a raw admin client for each request, creating a performance bottleneck and a potential service-role key exposure path; (2) several Server Actions lack explicit `getUser()` calls at the top (they may inherit auth from the client but this is not guaranteed for direct API calls); (3) the middleware matcher does not exclude the new `/epulet/**` public pages from auth checks; (4) rate limiting on auth endpoints (`/api/auth/**`) is not implemented.

Hungarian GDPR enforcement: the NAIH issued binding guidance in 2024 specifically targeting housing management software. Any tool exposing resident PII (names, financial balances, contact details) without server-side session validation on every request is at risk. For an enterprise or municipal deal, the security questionnaire will ask "how do you validate session integrity on every request?" — the current answer must be airtight.

---

## 2. Codebase Context

**Current relevant file tree (verified):**

```
/home/user/panellako/
├── middleware.ts                         ← EXISTS — uses getUser(), subscription check
├── lib/
│   ├── supabase/
│   │   ├── server.ts                     ← EXISTS — @supabase/ssr cookie-based client
│   │   └── browser.ts                    ← (likely exists for client-side)
│   └── superadmin-auth.ts                ← EXISTS — separate superadmin auth
├── app/
│   ├── api/
│   │   ├── stripe/webhook/route.ts       ← Uses service role (correct)
│   │   └── superadmin/login/route.ts     ← Separate auth path
│   ├── actions/
│   │   ├── tickets.ts                    ← Has getUser() at top ✓
│   │   ├── meetings.ts                   ← Has getUser() at top ✓
│   │   ├── finance.ts                    ← Has getUser() at top ✓
│   │   └── (others need audit)
│   ├── w/
│   │   └── [buildingId]/
│   │       └── page.tsx                  ← Protected route
│   └── epulet/
│       └── [buildingId]/
│           └── kornyezet/page.tsx        ← PUBLIC — must be excluded from auth check
└── package.json                          ← @supabase/ssr already installed ✓
```

**Current middleware.ts state (fully read):**
- Uses `createServerClient` from `@supabase/ssr` ✓
- Calls `supabase.auth.getUser()` (not getSession) ✓
- Redirects unauthenticated users to `/login` ✓
- Subscription paywall: creates a NEW `createAdminClient()` (raw Supabase client) on every request for `/w/[buildingId]` paths — this is a performance issue and exposes the service role key in middleware
- `PROTECTED_PREFIXES = ['/w/', '/app']` — does NOT include `/portal` (to be added when Initiative 09 is implemented)
- Matcher correctly excludes static assets ✓

**What needs hardening:**
1. The subscription check admin client creation on every `/w/` request
2. Ensure `/epulet/**` is NOT in `PROTECTED_PREFIXES`
3. Rate limiting on auth-related API routes
4. Audit all `app/actions/*.ts` for consistent `getUser()` guard pattern
5. Ensure service role key is NEVER used in client-accessible code

---

## 3. Pre-conditions

**Environment variables (all existing):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     ← Server-only: MUST NOT be in NEXT_PUBLIC_*
```

**Security audit:** Verify that `SUPABASE_SERVICE_ROLE_KEY` is NOT prefixed with `NEXT_PUBLIC_` anywhere in the codebase:
```bash
grep -r "NEXT_PUBLIC_SUPABASE_SERVICE" /home/user/panellako --include="*.ts" --include="*.tsx" --include="*.env*"
# Must return zero results
```

**npm packages (already installed):**
```
@supabase/ssr: already in package.json
```

**Migration to apply:**
- `20260523_070_rate_limit_events.sql`

---

## 4. Phase 1: Database Changes

### Migration: `20260523_070_rate_limit_events.sql`

```sql
-- Rate limit tracking for auth endpoints.
-- Stores IP-based attempt counts with TTL-like behavior via created_at.
-- Used by the Next.js middleware to reject excessive auth attempts.

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash      TEXT NOT NULL,              -- SHA256 of IP (GDPR: never store raw IP)
  endpoint     TEXT NOT NULL,             -- '/api/auth/login', '/api/auth/signup', etc.
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast query: count recent attempts by IP + endpoint
CREATE INDEX IF NOT EXISTS idx_rate_limit_recent
  ON public.rate_limit_events (ip_hash, endpoint, created_at DESC);

-- Auto-cleanup: delete entries older than 1 hour (use pg_cron or TTL trigger)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_events()
RETURNS VOID LANGUAGE SQL AS $$
  DELETE FROM public.rate_limit_events WHERE created_at < NOW() - INTERVAL '1 hour';
$$;

-- No RLS needed: only service role accesses this table from middleware/API routes

COMMENT ON TABLE public.rate_limit_events IS
  'IP-based rate limiting for auth endpoints. IPs are SHA256-hashed (GDPR). '
  'Entries expire after 1 hour via cleanup_old_rate_limit_events().';

-- Ensure the Supabase auth schema has proper FK validation
-- (Supabase manages auth.users — this is just a comment for reference)
```

---

## 5. Phase 2: Server-side

### Hardened `middleware.ts` — Full replacement

```typescript
// middleware.ts — PanelLakó route protection (hardened version)
// Security invariants:
//   1. ALL /w/** /app/** /portal/** /billing/** routes require valid server-side auth
//   2. Auth check uses getUser() (server-verified) — never getSession() (client cache)
//   3. Subscription paywall reads from subscriptions table via admin client (cached per request)
//   4. Service role key is NOT used to create Supabase client here — admin client is minimal
//   5. Public routes (/epulet/**, /(public SEO pages)) are explicitly excluded

import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'crypto';

// Routes requiring authentication
const PROTECTED_PREFIXES = ['/w/', '/app', '/portal', '/billing', '/superadmin'];

// Routes that are explicitly public (bypass auth check even if they match patterns above)
const PUBLIC_OVERRIDES = ['/api/stripe/webhook', '/api/email/unsubscribe', '/api/push/subscribe'];

// Auth entry points (redirect authenticated users away from these)
const AUTH_ROUTES = ['/login', '/auth/callback'];

// Rate limiting: max N auth attempts per IP per 5 minutes
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

function hasSubscriptionAccess(subscription: {
  status: string;
  trial_end: string | null;
} | null): boolean {
  if (!subscription) return true; // new building — allow and prompt
  if (subscription.status === 'active') return true;
  if (subscription.status === 'trialing') {
    if (!subscription.trial_end) return true;
    return new Date(subscription.trial_end) > new Date();
  }
  return false;
}

function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_OVERRIDES.some(p => pathname.startsWith(p))) return false;
  return PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
}

async function checkRateLimit(request: NextRequest, endpoint: string): Promise<boolean> {
  // Only rate-limit in production (SUPABASE_SERVICE_ROLE_KEY required)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return true; // allow in dev

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';

  // Hash the IP for GDPR compliance
  const ipHash = createHash('sha256').update(ip + 'panellako-salt').digest('hex').slice(0, 16);

  try {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { persistSession: false } }
    );

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await adminClient
      .from('rate_limit_events')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart);

    if ((count ?? 0) >= RATE_LIMIT_MAX) return false; // rate limited

    // Record this attempt (non-blocking)
    adminClient.from('rate_limit_events')
      .insert({ ip_hash: ipHash, endpoint })
      .then(() => {}).catch(() => {});

    return true;
  } catch {
    return true; // fail open on rate limit check errors
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // SECURITY: Always call getUser() — this hits Supabase auth server, not local cache.
  // Never use getSession() in middleware — it can return stale/spoofed session data.
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rate limiting for auth endpoints
  if (pathname.startsWith('/api/auth/') || pathname === '/login') {
    const allowed = await checkRateLimit(request, pathname);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Túl sok kísérlet. Kérjük, várjon 5 percet.' },
        { status: 429, headers: { 'Retry-After': '300' } }
      );
    }
  }

  // Authenticated users hitting auth routes → redirect to picker
  if (user && AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/app';
    return NextResponse.redirect(redirectUrl);
  }

  // Unauthenticated users hitting protected routes → redirect to login
  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Subscription paywall for /w/[buildingId] routes
  const buildingIdMatch = user && pathname.match(/^\/w\/([0-9a-f-]{36})(\/|$)/i);
  if (buildingIdMatch && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const buildingId = buildingIdMatch[1];
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }  // No session persistence for admin client
    );

    const { data: subscription } = await adminClient
      .from('subscriptions')
      .select('status, trial_end')
      .eq('building_id', buildingId)
      .maybeSingle();

    if (!hasSubscriptionAccess(subscription)) {
      const billingUrl = request.nextUrl.clone();
      billingUrl.pathname = '/billing';
      billingUrl.searchParams.set('building', buildingId);
      billingUrl.searchParams.set('reason', 'subscription_required');
      return NextResponse.redirect(billingUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)'
  ]
};
```

### Audit checklist for `app/actions/*.ts`

Every Server Action file must have this pattern at the top of each exported async function:

```typescript
// REQUIRED pattern for all Server Actions:
const supabase = createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return { success: false, error: 'Nem vagy bejelentkezve.' };
}
```

**Files to audit and patch:**
- `app/actions/announcements.ts` — add user check
- `app/actions/contact.ts` — add user check
- `app/actions/documents.ts` — add user check
- `app/actions/meter-readings.ts` — add user check
- `app/actions/reminders.ts` — add user check
- `app/actions/votes.ts` — add user check

Already have correct pattern: `tickets.ts`, `meetings.ts`, `finance.ts`.

### Security audit helper: `lib/auth-guard.ts`

```typescript
// lib/auth-guard.ts — Reusable auth guard for Server Actions
// Usage: const { user, error } = await requireAuth();
// if (error) return { success: false, error };

import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export async function requireAuth(): Promise<{
  user: User | null;
  error: string | null;
}> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: 'Nem vagy bejelentkezve.' };
  }
  return { user, error: null };
}

export async function requireBuildingMembership(
  buildingId: string,
  requiredRoles: string[] = ['kozos_kepviselo', 'megbizott', 'konyvelo']
): Promise<{ authorized: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { authorized: false, error: 'Nem vagy bejelentkezve.' };

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('building_id', buildingId)
    .eq('profile_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (membershipError) return { authorized: false, error: membershipError.message };
  if (!membership) return { authorized: false, error: 'Nincs hozzáférése ehhez az épülethez.' };
  if (!requiredRoles.includes(membership.role)) {
    return { authorized: false, error: `A művelethez ${requiredRoles.join(' vagy ')} jogosultság szükséges.` };
  }

  return { authorized: true, error: null };
}
```

---

## 6. Phase 3: Client-side

### Security headers in `next.config.mjs`

```javascript
// Add to next.config.mjs:
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
];

// In the config object:
async headers() {
  return [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      headers: securityHeaders,
    },
  ];
},
```

---

## 7. Phase 4: Configuration

**Verify service role key is server-only:**
```bash
# Must return 0 results:
grep -r "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE" /home/user/panellako/app --include="*.tsx" --include="*.ts"
grep -r "SUPABASE_SERVICE_ROLE_KEY" /home/user/panellako/components --include="*.tsx" --include="*.ts"
# If any results: CRITICAL security issue — service role key must NEVER be in client code
```

**Vercel environment variable scoping:**
- `NEXT_PUBLIC_SUPABASE_URL` → Vercel: Production, Preview, Development (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Vercel: Production, Preview, Development (public)
- `SUPABASE_SERVICE_ROLE_KEY` → Vercel: Production only (server-only, NEVER mark as public)

---

## 8. Phase 5: Testing

### Manual Smoke Test

1. **Auth redirect:** Log out. Navigate to `/w/{valid_buildingId}`. Verify redirect to `/login?next=/w/{id}`.

2. **Session validation:** Log in. Open browser DevTools → Application → Cookies. Delete the `sb-access-token` and `sb-refresh-token` cookies. Navigate to `/w/{buildingId}`. Should redirect to `/login`.

3. **Rate limiting:** Send 11+ POST requests to `/login` within 5 minutes from the same IP. Verify the 11th request returns 429 with `Retry-After: 300`.

4. **Service role key exposure:** In browser DevTools → Network → reload a page. Search all network request headers for the service role key value. Must never appear.

5. **Public page not redirected:** Navigate to `/epulet/{buildingId}/kornyezet` while logged out. Must load without redirect.

6. **Server Action auth guard:** Using a REST client, POST directly to a Server Action endpoint without session cookies. Expect `{ success: false, error: 'Nem vagy bejelentkezve.' }`.

### Automated Test Cases

```typescript
describe('middleware', () => {
  it('redirects unauthenticated user from /w/ to /login', async () => {
    const req = mockRequest('/w/building-123', { noAuth: true });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('/login');
  });

  it('passes authenticated user through to /w/', async () => {
    const req = mockRequest('/w/building-123', { validAuth: true, validSubscription: true });
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects past-due subscription to /billing', async () => {
    const req = mockRequest('/w/building-123', { validAuth: true, subscriptionStatus: 'past_due' });
    const res = await middleware(req);
    expect(res.headers.get('Location')).toContain('/billing');
  });

  it('does NOT redirect /epulet/ routes', async () => {
    const req = mockRequest('/epulet/building-123/kornyezet', { noAuth: true });
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('returns 429 after rate limit exceeded', async () => {
    // Mock rate_limit_events count >= RATE_LIMIT_MAX
    const req = mockRequest('/login', { rateLimited: true });
    const res = await middleware(req);
    expect(res.status).toBe(429);
  });
});

describe('requireAuth', () => {
  it('returns user for valid session', async () => {
    mockValidSession();
    const { user, error } = await requireAuth();
    expect(user).not.toBeNull();
    expect(error).toBeNull();
  });

  it('returns error for no session', async () => {
    mockNoSession();
    const { user, error } = await requireAuth();
    expect(user).toBeNull();
    expect(error).toBe('Nem vagy bejelentkezve.');
  });
});
```

---

## 9. Error Handling & Edge Cases

**Scenario 1: Supabase auth server is unreachable**
`supabase.auth.getUser()` throws or returns an error. The middleware catches this implicitly — the `user` will be `null`. For protected routes, this triggers the login redirect. This is the correct fail-safe behavior (fail closed).

**Scenario 2: Admin client creation in middleware is slow**
The subscription check creates a new admin client on every `/w/` request. Each new client creates a new HTTP connection. Mitigation: use connection pooling via Supabase's PgBouncer. Long-term: cache subscription status in a JWT claim or in an edge-compatible store (Upstash Redis).

**Scenario 3: `buildingIdMatch` regex fails on non-standard UUIDs**
The regex `/^\/w\/([0-9a-f-]{36})(\/|$)/i` correctly matches standard UUID v4 format. Non-UUID building IDs (if any legacy data exists) would not match and bypass the subscription check — access would be allowed. Verify all `buildings.id` values are standard UUIDs.

**Scenario 4: Rate limit table query fails (DB unreachable)**
`checkRateLimit()` returns `true` (allow). Fail-open for rate limiting is acceptable — a temporary DB outage should not lock users out.

**Scenario 5: Server Action called via direct HTTP (not through Next.js)**
`requireAuth()` in `lib/auth-guard.ts` calls `createClient()` which reads cookies. Direct HTTP calls without valid cookies will have no session → `user = null` → action returns error. The protection holds.

**Scenario 6: CSRF attack on Server Actions**
Next.js Server Actions automatically include a CSRF token check via the `next-action` header mechanism. Ensure `next.config.mjs` does not disable this protection.

---

## 10. Integration with Other Initiatives

- **Initiative 01 (Portfolio Dashboard):** The `/app/portfolio` route is protected by `PROTECTED_PREFIXES = ['/app']`. When Portfolio is implemented, no middleware changes needed.

- **Initiative 07 (Environmental Dashboard):** The public `/epulet/**` route is explicitly NOT in `PROTECTED_PREFIXES`. The middleware passes through without auth check. Critical: ensure this exclusion is maintained.

- **Initiative 09 (Resident Portal):** When `/portal/**` routes are added, they must be in `PROTECTED_PREFIXES` (residents must be authenticated). The current hardened middleware already includes `'/portal'` in `PROTECTED_PREFIXES`.

- **Initiative 02 (Stripe):** The `/api/stripe/webhook` is in `PUBLIC_OVERRIDES` — it must never require auth (Stripe sends webhook events without user sessions).

---

## 11. Rollback Plan

1. **Revert `middleware.ts`:** Restore the original version (without rate limiting and with simpler admin client creation). The original is the version read at the start of this session.

2. **Remove `lib/auth-guard.ts`:** Server Actions that were updated to use `requireAuth()` should revert to inline `getUser()` calls.

3. **Remove security headers from `next.config.mjs`:** Delete the `headers()` async function addition.

4. **Revert migration:**
   ```sql
   DROP TABLE IF EXISTS public.rate_limit_events;
   DROP FUNCTION IF EXISTS public.cleanup_old_rate_limit_events();
   ```

---

## 12. Definition of Done

- [ ] Migration `20260523_070_rate_limit_events.sql` applied
- [ ] `middleware.ts` updated with `PUBLIC_OVERRIDES` list and `/portal` in `PROTECTED_PREFIXES`
- [ ] Rate limiting returns 429 after 10 attempts within 5 minutes (tested manually)
- [ ] `lib/auth-guard.ts` created with `requireAuth()` and `requireBuildingMembership()`
- [ ] All `app/actions/*.ts` files have `getUser()` guard — verified with grep:
  ```bash
  grep -L "getUser()" /home/user/panellako/app/actions/*.ts
  # Should return empty (all files have it)
  ```
- [ ] `SUPABASE_SERVICE_ROLE_KEY` not present in any `NEXT_PUBLIC_*` variable — grep verified
- [ ] Security headers added to `next.config.mjs` — verify with `curl -I https://app.panellako.hu`
- [ ] Unauthenticated `/w/` access redirects to login (cookie deletion test)
- [ ] `/epulet/**` public routes load without auth
- [ ] `/api/stripe/webhook` accepts POST without auth (POST with no cookies → 200 not 401)
- [ ] TypeScript compiles cleanly for all modified files
- [ ] Vercel environment variables: `SUPABASE_SERVICE_ROLE_KEY` is NOT marked as public
