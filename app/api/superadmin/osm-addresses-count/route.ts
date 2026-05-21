import { NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function makeClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = makeClient();
  if (!supabase) return NextResponse.json({ count: null });

  const { count } = await supabase
    .from('osm_addresses')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({ count: count ?? null });
}
