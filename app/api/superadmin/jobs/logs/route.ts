import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service-role env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '30', 10), 100);
  const jobId = request.nextUrl.searchParams.get('job') ?? undefined;

  const supabase = createServiceClient();
  let query = supabase
    .from('platform_job_logs')
    .select('id, job_id, triggered_by, status, result, started_at, finished_at')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (jobId) query = query.eq('job_id', jobId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
