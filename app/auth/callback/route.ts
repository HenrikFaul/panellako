import { createClient } from '@/lib/supabase/server';
import { sanitizeReturnTo } from '@/lib/auth/return-to';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeReturnTo(searchParams.get('next'));

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // The database trigger is authoritative. This RPC is deliberately
      // best-effort so older deployments can still complete the auth flow.
      await supabase.rpc('ensure_profile').then(() => undefined, () => undefined);
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'auth_callback_error');
  loginUrl.searchParams.set('next', next);
  return NextResponse.redirect(loginUrl);
}
