import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function serviceClient() {
  return createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim(),
    { auth: { persistSession: false } },
  );
}

export async function GET(req: NextRequest) {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get('search') ?? '';
  const limit  = Math.min(500, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '500') || 500));

  const supabase = serviceClient();

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, created_at, free_trial_start, free_trial_days, free_trial_never_expires')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data: profiles, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: profiles ?? [] });
}
