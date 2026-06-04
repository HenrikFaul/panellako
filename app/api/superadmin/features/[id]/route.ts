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

interface FeaturePatch {
  name?:        string;
  description?: string;
  module?:      string;
  route_path?:  string | null;
  menu_path?:   string | null;
  tier?:        string;
  enabled?:     boolean;
  sort_order?:  number;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as FeaturePatch;

  const VALID_TIERS = ['trial', 'alap', 'pro'];
  const patch: Record<string, unknown> = {};
  if ('name'        in body && body.name)        patch.name        = String(body.name).slice(0, 200);
  if ('description' in body)                     patch.description = body.description ? String(body.description).slice(0, 500) : null;
  if ('module'      in body && body.module)       patch.module      = String(body.module).slice(0, 100);
  if ('route_path'  in body)                     patch.route_path  = body.route_path  ? String(body.route_path).slice(0, 300)  : null;
  if ('menu_path'   in body)                     patch.menu_path   = body.menu_path   ? String(body.menu_path).slice(0, 300)   : null;
  if ('tier'        in body && body.tier && VALID_TIERS.includes(body.tier)) patch.tier = body.tier;
  if ('enabled'     in body)                     patch.enabled     = Boolean(body.enabled);
  if ('sort_order'  in body)                     patch.sort_order  = Math.floor(Number(body.sort_order ?? 0));

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const supabase = serviceClient();

  // Capture before state for audit
  const { data: before } = await supabase.from('features').select('tier, route_path, menu_path, enabled').eq('id', id).maybeSingle();

  const { error } = await supabase.from('features').update(patch).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await supabase.from('platform_audit_events').insert({
      actor_id:    'superadmin',
      action:      'superadmin.feature.update',
      target_type: 'feature',
      target_id:   id,
      payload:     { before, after: patch },
    });
  } catch { /* table may not exist yet */ }

  return NextResponse.json({ ok: true });
}
