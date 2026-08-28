/**
 * Utility Provider Announcements API
 *
 * External service providers (Főtáv, waterworks, gas companies, etc.) use this
 * endpoint to push announcements into the building's news feed.
 *
 * POST /api/utility/announcements   — provider posts a new announcement
 * GET  /api/utility/announcements   — residents/managers read utility announcements
 *
 * Authentication (POST): X-Provider-Token is SHA-256 matched against an active,
 * physical-building and provider-type scoped utility_provider_tokens row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeUtilityProvider } from '@/lib/utility-provider-auth';
import {
  authorizationMessage,
  requireAuthenticatedUser,
  requireWorkspaceCapability,
} from '@/lib/authorization/guards';
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProviderType =
  | 'heating' | 'water' | 'gas' | 'electricity' | 'telecom' | 'other';

export type AnnouncementType =
  | 'reading_visit' | 'service_start' | 'service_stop' | 'maintenance' | 'general';

export interface UtilityAnnouncementPayload {
  /** UUID of the building this announcement targets */
  building_id:       string;
  /** Human-readable provider name shown in the feed (e.g. "Főtáv Zrt.") */
  provider_name:     string;
  provider_type:     ProviderType;
  /** Short headline */
  title:             string;
  /** Full body text shown when the announcement is opened */
  content:           string;
  announcement_type: AnnouncementType;
  /** ISO-8601: when the event/visit is scheduled to happen (optional) */
  scheduled_at?:     string | null;
  /** Provider's own reference / event ID (optional) */
  external_ref?:     string | null;
}

// Maps provider_type → category stored in the announcements table
const CATEGORY: Record<ProviderType, string> = {
  heating:     'Üzemeltetés',
  water:       'Üzemeltetés',
  gas:         'Üzemeltetés',
  electricity: 'Üzemeltetés',
  telecom:     'Üzemeltetés',
  other:       'Egyéb',
};

// Human-readable announcement type labels (used in auto-generated subject lines)
const TYPE_LABEL: Record<AnnouncementType, string> = {
  reading_visit:  'Mérőóra leolvasás',
  service_start:  'Szolgáltatás indítása',
  service_stop:   'Szolgáltatás leállítása',
  maintenance:    'Karbantartás',
  general:        'Tájékoztató',
};

// ─── POST — provider pushes an announcement ───────────────────────────────────
export async function POST(request: NextRequest) {
  let body: UtilityAnnouncementPayload;
  try {
    body = await request.json() as UtilityAnnouncementPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required fields
  const required = ['building_id', 'provider_name', 'provider_type', 'title', 'content', 'announcement_type'] as const;
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  const validProviderTypes: ProviderType[] = ['heating','water','gas','electricity','telecom','other'];
  const validAnnTypes: AnnouncementType[]   = ['reading_visit','service_start','service_stop','maintenance','general'];
  if (!validProviderTypes.includes(body.provider_type)) {
    return NextResponse.json({ error: `Invalid provider_type. Valid: ${validProviderTypes.join(', ')}` }, { status: 400 });
  }
  if (!validAnnTypes.includes(body.announcement_type)) {
    return NextResponse.json({ error: `Invalid announcement_type. Valid: ${validAnnTypes.join(', ')}` }, { status: 400 });
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

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      workspace_id:      providerAuth.workspaceId,
      building_id:       body.building_id,
      created_by:        null,        // external provider — no profile
      title:             body.title,
      content:           body.content,
      target_group:      'Mindenki',
      category:          CATEGORY[body.provider_type],
      source_label:      providerAuth.provider.provider_name,
      // utility-specific columns (added in migration 20260518_utility_provider_api)
      provider_type:     body.provider_type,
      announcement_type: body.announcement_type,
      scheduled_at:      body.scheduled_at ?? null,
      external_ref:      body.external_ref ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[utility/announcements] insert error:', error.message);
    return NextResponse.json({ error: 'Database error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id:               data.id,
    title:            data.title,
    announcement_type: body.announcement_type,
    type_label:       TYPE_LABEL[body.announcement_type],
    building_id:      body.building_id,
    workspace_id:     providerAuth.workspaceId,
    created_at:       data.created_at,
  }, { status: 201 });
}

// ─── GET — list utility announcements for a building ─────────────────────────
export async function GET(request: NextRequest) {
  const sp          = request.nextUrl.searchParams;
  const buildingId  = sp.get('building_id');
  const type        = sp.get('type') as AnnouncementType | null;
  const providerType = sp.get('provider_type') as ProviderType | null;
  const limit       = Math.min(parseInt(sp.get('limit') ?? '20', 10), 100);
  const offset      = parseInt(sp.get('offset') ?? '0', 10);
  const from        = sp.get('from');  // ISO date
  const to          = sp.get('to');    // ISO date

  if (!buildingId) {
    return NextResponse.json({ error: 'Missing required query param: building_id' }, { status: 400 });
  }

  let auth: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  let context: Awaited<ReturnType<typeof requireWorkspaceCapability>>;
  try {
    [auth, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(buildingId, 'announcement.read'),
    ]);
  } catch (error) {
    return NextResponse.json({ error: authorizationMessage(error) }, { status: 403 });
  }
  const { supabase } = auth;

  let q = supabase
    .from('announcements')
    .select('id, title, content, source_label, provider_type, announcement_type, scheduled_at, external_ref, created_at', { count: 'exact' })
    .eq('building_id', context.primaryBuildingId)
    .not('provider_type', 'is', null)   // only utility-sourced rows
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type)         q = q.eq('announcement_type', type);
  if (providerType) q = q.eq('provider_type', providerType);
  if (from)         q = q.gte('created_at', from);
  if (to)           q = q.lte('created_at', to);

  const { data, error, count } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count ?? 0, limit, offset });
}
