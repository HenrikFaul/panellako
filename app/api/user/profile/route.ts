import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({ profile: profile ?? null, email: user.email });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  let body: { full_name?: string; phone?: string };
  try {
    body = (await request.json()) as { full_name?: string; phone?: string };
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const update: Record<string, string> = {};
  if (body.full_name?.trim()) update.full_name = body.full_name.trim();
  if (body.phone !== undefined) update.phone = body.phone.trim();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'MISSING_FIELDS', message: 'Nincs frissítendő adat.' }, { status: 400 });
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!url || !key) return NextResponse.json({ error: 'SERVER_CONFIG' }, { status: 500 });

  const admin = createServiceClient(url, key, { auth: { persistSession: false } });
  const { error } = await admin.from('profiles').update(update).eq('id', user.id);

  if (error) return NextResponse.json({ error: 'UPDATE_FAILED', message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
