import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  // Authenticate via session cookie
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  let body: { full_name?: string };
  try {
    body = (await request.json()) as { full_name?: string };
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const full_name = body.full_name?.trim();
  if (!full_name) return NextResponse.json({ error: 'MISSING_FIELDS', message: 'full_name kötelező.' }, { status: 400 });

  // Use service role to bypass the missing UPDATE RLS policy on profiles
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!url || !key) return NextResponse.json({ error: 'SERVER_CONFIG' }, { status: 500 });

  const admin = createServiceClient(url, key, { auth: { persistSession: false } });
  const { error } = await admin.from('profiles').update({ full_name }).eq('id', user.id);

  if (error) return NextResponse.json({ error: 'UPDATE_FAILED', message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
