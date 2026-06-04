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

interface TrialPatch {
  free_trial_start?:         string | null;
  free_trial_days?:          number;
  free_trial_never_expires?: boolean;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as TrialPatch;

  const patch: Record<string, unknown> = {};
  if ('free_trial_start'         in body) patch.free_trial_start         = body.free_trial_start ?? null;
  if ('free_trial_days'          in body) patch.free_trial_days          = Math.max(1, Math.floor(Number(body.free_trial_days ?? 14)));
  if ('free_trial_never_expires' in body) patch.free_trial_never_expires = Boolean(body.free_trial_never_expires);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = serviceClient();

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log — best-effort, don't fail the request if this errors
  try {
    await supabase.from('platform_audit_events').insert({
      actor_id:    'superadmin',
      action:      'superadmin.user.trial_update',
      target_type: 'profile',
      target_id:   id,
      payload:     patch,
    });
  } catch { /* table may not exist yet */ }

  return NextResponse.json({ ok: true });
}
