import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import {
  hasWorkspaceAccess,
  type ProfileTrialAccess,
  type SubscriptionAccess,
} from '@/lib/subscription-access';
import { sanitizeReturnTo } from '@/lib/auth/return-to';

const PROTECTED_ROUTES = ['/w', '/app', '/account', '/onboarding', '/invitations', '/reset-password'];
const AUTH_ROUTES = ['/login', '/register'];

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
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

  // IMPORTANT: always call getUser() to refresh the session — never getSession() in middleware
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Authenticated users hitting login → redirect to picker
  if (user && AUTH_ROUTES.some((route) => matchesRoute(pathname, route))) {
    const redirectUrl = request.nextUrl.clone();
    const next = sanitizeReturnTo(request.nextUrl.searchParams.get('next'));
    const safeDestination = new URL(next, request.nextUrl.origin);
    redirectUrl.pathname = safeDestination.pathname;
    redirectUrl.search = safeDestination.search;
    redirectUrl.hash = safeDestination.hash;
    return NextResponse.redirect(redirectUrl);
  }

  // Unauthenticated users hitting protected routes → redirect to login
  if (
    !user &&
    PROTECTED_ROUTES.some((route) => matchesRoute(pathname, route))
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.search = '';
    redirectUrl.hash = '';
    redirectUrl.searchParams.set(
      'next',
      sanitizeReturnTo(`${pathname}${request.nextUrl.search}`),
    );
    return NextResponse.redirect(redirectUrl);
  }

  // Subscription paywall: check /w/[buildingId] routes when Stripe is configured
  const buildingIdMatch = user && pathname.match(/^\/w\/([0-9a-f-]{36})(\/|$)/i);
  if (buildingIdMatch && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const buildingId = buildingIdMatch[1];
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch subscription and user profile trial settings in parallel
    const [{ data: subscription }, { data: profile }] = await Promise.all([
      adminClient
        .from('subscriptions')
        .select('status, trial_end')
        .eq('workspace_id', buildingId)
        .maybeSingle(),
      adminClient
        .from('profiles')
        .select('free_trial_never_expires, free_trial_start, free_trial_days, created_at')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    // Allow if either the subscription is valid OR the superadmin-managed trial grants access
    const allowed = hasWorkspaceAccess(
      subscription as SubscriptionAccess | null,
      profile as ProfileTrialAccess | null,
    );

    if (!allowed) {
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
