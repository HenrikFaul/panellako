import { NextRequest, NextResponse } from 'next/server';
import {
  authorizationMessage,
  requireAuthenticatedUser,
  requireWorkspaceAccess,
  requireWorkspaceCapability,
} from '@/lib/authorization/guards';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés' }, { status: 400 });
  }

  const { workspace_id, category, severity, period, duration_minutes, estimated_db, occurred_at, description, is_recurring, recurring_pattern } = body as {
    workspace_id?: string;
    category?: string;
    severity?: number;
    period?: string;
    duration_minutes?: number;
    estimated_db?: number;
    occurred_at?: string;
    description?: string;
    is_recurring?: boolean;
    recurring_pattern?: string;
  };

  if (!workspace_id || !category || severity === undefined || !period) {
    return NextResponse.json({ error: 'Hiányzó kötelező mezők: workspace_id, category, severity, period' }, { status: 400 });
  }

  if (typeof severity !== 'number' || severity < 1 || severity > 5) {
    return NextResponse.json({ error: 'A súlyosság 1 és 5 között kell legyen' }, { status: 400 });
  }

  let auth: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  let context: Awaited<ReturnType<typeof requireWorkspaceAccess>>;
  try {
    [auth, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceAccess(workspace_id),
    ]);
  } catch (error) {
    return NextResponse.json({ error: authorizationMessage(error) }, { status: 403 });
  }
  const { supabase, user } = auth;

  const payload = {
    workspace_id: context.workspaceId,
    reporter_id: user.id,
    category,
    severity,
    period,
    duration_minutes: duration_minutes ?? null,
    estimated_db: estimated_db ?? null,
    occurred_at: occurred_at ?? new Date().toISOString(),
    description: description ?? null,
    is_recurring: is_recurring ?? false,
    recurring_pattern: recurring_pattern ?? null,
  };

  const { data, error } = await supabase
    .from('noise_reports')
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id kötelező' }, { status: 400 });
  }

  let auth: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  let context: Awaited<ReturnType<typeof requireWorkspaceCapability>>;
  try {
    [auth, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(workspaceId, 'environment.read'),
    ]);
  } catch (error) {
    return NextResponse.json({ error: authorizationMessage(error) }, { status: 403 });
  }
  const { supabase } = auth;

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data, error } = await supabase
    .from('noise_reports')
    .select('*')
    .eq('workspace_id', context.workspaceId)
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}
