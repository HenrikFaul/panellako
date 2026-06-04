import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/w/', '/app'];
const AUTH_ROUTES = ['/login'];

interface Subscription {
  status:    string;
  trial_end: string | null;
}

interface ProfileTrial {
  free_trial_never_expires: boolean;
  free_trial_start:         string | null;
  free_trial_days:          number;
  created_at:               string;
}

// Returns true if the superadmin-managed profile trial grants access.
function hasProfileTrialAccess(profile: ProfileTrial | null): boolean {
  if (!profile) return false;
  if (profile.free_trial_never_expires) return true;
  // Use free_trial_start if set, otherwise fall back to profile created_at
  const start = profile.free_trial_start ?? profile.created_at;
  if (!start) return false;
  const end = new Date(new Date(start).getTime() + profile.free_trial_days * 86_400_000);
  return end > new Date();
}

function hasSubscriptionAccess(subscription: Subscription | null): boolean {
  if (!subscription) return true; // no record = new building, allow + prompt
  if (subscription.status === 'active') return true;
  if (subscription.status === 'trialing') {
    if (!subscription.trial_end) return true;
    return new Date(subscription.trial_end) > new Date();
  }
  return false;
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
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/app';
    return NextResponse.redirect(redirectUrl);
  }

  // Unauthenticated users hitting protected routes → redirect to login
  if (
    !user &&
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
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
        .eq('building_id', buildingId)
        .maybeSingle(),
      adminClient
        .from('profiles')
        .select('free_trial_never_expires, free_trial_start, free_trial_days, created_at')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    // Allow if either the subscription is valid OR the superadmin-managed trial grants access
    const allowed =
      hasSubscriptionAccess(subscription as Subscription | null) ||
      hasProfileTrialAccess(profile as ProfileTrial | null);

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
