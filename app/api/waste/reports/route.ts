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

  const { type } = body as { type?: string };

  // Handle illegal dump report
  if (type === 'illegal_dump') {
    const { workspace_id, category, description, lat, lon } = body as {
      workspace_id?: string;
      category?: string;
      description?: string;
      lat?: number;
      lon?: number;
    };

    if (!workspace_id || !category) {
      return NextResponse.json({ error: 'Hiányzó kötelező mezők: workspace_id, category' }, { status: 400 });
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

    const { data, error } = await supabase
      .from('illegal_dump_reports')
      .insert({
        workspace_id: context.workspaceId,
        reporter_id: user.id,
        category,
        description: description ?? null,
        lat: lat ?? null,
        lon: lon ?? null,
        status: 'uj',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  }

  // Handle monthly waste report (upsert)
  const { workspace_id, month, households_participating, paper_kg, plastic_kg, glass_kg, organic_kg, electronic_kg, notes } = body as {
    workspace_id?: string;
    month?: string;
    households_participating?: number;
    paper_kg?: number;
    plastic_kg?: number;
    glass_kg?: number;
    organic_kg?: number;
    electronic_kg?: number;
    notes?: string;
  };

  if (!workspace_id || !month) {
    return NextResponse.json({ error: 'Hiányzó kötelező mezők: workspace_id, month' }, { status: 400 });
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
    month,
    households_participating: households_participating ?? null,
    paper_kg: paper_kg ?? 0,
    plastic_kg: plastic_kg ?? 0,
    glass_kg: glass_kg ?? 0,
    organic_kg: organic_kg ?? 0,
    electronic_kg: electronic_kg ?? 0,
    notes: notes ?? null,
  };

  const { data, error } = await supabase
    .from('waste_reports')
    .upsert(payload, { onConflict: 'workspace_id,month' })
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
  since.setFullYear(since.getFullYear() - 1);
  const sinceMonth = since.toISOString().slice(0, 7) + '-01';

  const { data, error } = await supabase
    .from('waste_reports')
    .select('*')
    .eq('workspace_id', context.workspaceId)
    .gte('month', sinceMonth)
    .order('month', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}
