/**
 * Utility Reading Requests API
 *
 * A provider (e.g. BKM Víziközmű) sends a request telling residents to submit
 * their meter reading by a given deadline. This endpoint:
 *   1. Records the request in `utility_reading_requests`
 *   2. Auto-creates an announcement in the building's news feed
 *
 * POST /api/utility/reading-requests   — provider submits a reading request
 * GET  /api/utility/reading-requests   — list active/all reading requests for a building
 *
 * Authentication (POST): Header X-Provider-Token (skeleton: any non-empty value)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ProviderType } from '@/app/api/utility/announcements/route';
import { hasWorkspaceCapability } from '@/lib/authorization/capabilities';
import {
  authorizationMessage,
  requireAuthenticatedUser,
  requireWorkspaceAccess,
} from '@/lib/authorization/guards';
import { authorizeUtilityProvider } from '@/lib/utility-provider-auth';
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeterType = 'viz' | 'gaz' | 'villany' | 'ho' | 'egyeb';

export interface ReadingRequestPayload {
  /** UUID of the building */
  building_id:   string;
  /** Human-readable provider name (e.g. "BKM Víziközmű Zrt.") */
  provider_name: string;
  provider_type: ProviderType;
  /** Which meter type residents should read */
  meter_type:    MeterType;
  /** Short headline shown in the feed */
  title:         string;
  /** Detailed instructions (optional) */
  description?:  string | null;
  /** ISO-8601 deadline by which residents must submit */
  deadline_at:   string;
  /** Provider's own reference ID (optional) */
  external_ref?: string | null;
}

export interface ReadingRequest {
  id:              string;
  building_id:     string;
  provider_name:   string;
  provider_type:   ProviderType;
  meter_type:      MeterType;
  title:           string;
  description:     string | null;
  deadline_at:     string;
  external_ref:    string | null;
  announcement_id: string | null;
  active:          boolean;
  created_at:      string;
}

// Meter type → Hungarian label for the auto-announcement
const METER_LABEL: Record<MeterType, string> = {
  viz:     'vízóra',
  gaz:     'gázóra',
  villany: 'villanymérő',
  ho:      'hőmennyiségmérő',
  egyeb:   'mérőóra',
};

// ─── POST — provider submits a reading request ───────────────────────────────
export async function POST(request: NextRequest) {
  let body: ReadingRequestPayload;
  try {
    body = await request.json() as ReadingRequestPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required fields
  const required = ['building_id','provider_name','provider_type','meter_type','title','deadline_at'] as const;
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  const validMeterTypes: MeterType[] = ['viz','gaz','villany','ho','egyeb'];
  if (!validMeterTypes.includes(body.meter_type)) {
    return NextResponse.json({ error: `Invalid meter_type. Valid: ${validMeterTypes.join(', ')}` }, { status: 400 });
  }

  // Validate deadline is in the future
  if (new Date(body.deadline_at) <= new Date()) {
    return NextResponse.json({ error: 'deadline_at must be in the future' }, { status: 400 });
  }

  const providerAuth = await authorizeUtilityProvider(
    request.headers.get('x-provider-token'),
    body.building_id,
    body.provider_type,
  );
  if (!providerAuth) {
    return NextResponse.json({ error: 'Unauthorized: missing or invalid X-Provider-Token' }, { status: 401 });
  }
  const supabase = providerAuth.client;

  const deadlineFormatted = new Date(body.deadline_at).toLocaleDateString('hu-HU', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const meterLabel = METER_LABEL[body.meter_type];

  // 1. Auto-create announcement in the news feed
  const announcementContent = body.description
    ?? `Kérjük, küldjék be a ${meterLabel} állását ${deadlineFormatted}-ig a PanelLakó alkalmazáson keresztül.`;

  const { data: announcement, error: annErr } = await supabase
    .from('announcements')
    .insert({
      workspace_id:      providerAuth.workspaceId,
      building_id:       body.building_id,
      created_by:        null,
      title:             body.title,
      content:           announcementContent,
      target_group:      'Mindenki',
      category:          'Üzemeltetés',
      source_label:      providerAuth.provider.provider_name,
      provider_type:     body.provider_type,
      announcement_type: 'reading_visit',
      scheduled_at:      null,
      deadline:          body.deadline_at,      // communication_v2 deadline column
      external_ref:      body.external_ref ?? null,
    })
    .select('id')
    .single();

  if (annErr) {
    console.error('[utility/reading-requests] announcement insert error:', annErr.message);
  }

  // 2. Insert reading request record
  const { data, error } = await supabase
    .from('utility_reading_requests')
    .insert({
      building_id:     body.building_id,
      provider_name:   providerAuth.provider.provider_name,
      provider_type:   body.provider_type,
      meter_type:      body.meter_type,
      title:           body.title,
      description:     body.description ?? null,
      deadline_at:     body.deadline_at,
      external_ref:    body.external_ref ?? null,
      announcement_id: announcement?.id ?? null,
      active:          true,
    })
    .select()
    .single();

  if (error) {
    console.error('[utility/reading-requests] insert error:', error.message);
    return NextResponse.json({ error: 'Database error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id:              data.id,
    meter_type:      data.meter_type,
    meter_label:     meterLabel,
    deadline_at:     data.deadline_at,
    announcement_id: data.announcement_id,
    building_id:     body.building_id,
    created_at:      data.created_at,
  }, { status: 201 });
}

// ─── GET — list reading requests for a building ───────────────────────────────
export async function GET(request: NextRequest) {
  const sp         = request.nextUrl.searchParams;
  const buildingId = sp.get('building_id');
  const meterType  = sp.get('meter_type') as MeterType | null;
  const activeOnly = sp.get('active') !== 'false';   // default: only active ones
  const limit      = Math.min(parseInt(sp.get('limit') ?? '20', 10), 100);
  const offset     = parseInt(sp.get('offset') ?? '0', 10);

  if (!buildingId) {
    return NextResponse.json({ error: 'Missing required query param: building_id' }, { status: 400 });
  }

  let auth: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  let context: Awaited<ReturnType<typeof requireWorkspaceAccess>>;
  try {
    [auth, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceAccess(buildingId),
    ]);
  } catch (error) {
    return NextResponse.json({ error: authorizationMessage(error) }, { status: 403 });
  }
  if (
    !hasWorkspaceCapability(context, 'meter.read_own_unit')
    && !hasWorkspaceCapability(context, 'meter.manage_all')
  ) {
    return NextResponse.json({ error: 'A művelet nem engedélyezett.' }, { status: 403 });
  }
  const { supabase } = auth;

  let q = supabase
    .from('utility_reading_requests')
    .select('*', { count: 'exact' })
    .eq('building_id', context.primaryBuildingId)
    .order('deadline_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (activeOnly) q = q.eq('active', true);
  if (meterType)  q = q.eq('meter_type', meterType);

  const { data, error, count } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count ?? 0, limit, offset });
}
