/**
 * Meter Readings API
 *
 * Residents submit and track their own meter readings. Readings can be:
 *  - Free submissions (ongoing tracking, no request)
 *  - Responses to a specific utility_reading_request
 *
 * POST /api/utility/meter-readings   — resident submits a reading
 * GET  /api/utility/meter-readings   — query readings (resident sees own, manager sees all)
 *
 * Authentication: Supabase session cookie (standard auth flow, same as rest of app).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { MeterType } from '@/app/api/utility/reading-requests/route';
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MeterReadingPayload {
  /** UUID of the building */
  building_id:      string;
  /**
   * Human-readable unit label (e.g. "A/3", "B2-4").
   * Used when unit_id is unknown or the resident doesn't know their UUID.
   */
  unit_label:       string;
  /** UUID of the unit — optional if unit_label is provided */
  unit_id?:         string | null;
  meter_type:       MeterType;
  /** Numeric meter value */
  value:            number;
  /** Date the reading was taken, ISO format (YYYY-MM-DD) */
  reading_date:     string;
  /** UUID of the reading request this answers — optional */
  request_id?:      string | null;
  /** Optional display name override (defaults to authenticated user's name) */
  reported_by_name?: string | null;
}

export interface MeterReadingRow {
  id:               string;
  building_id:      string;
  unit_id:          string | null;
  unit_label:       string;
  meter_type:       MeterType;
  value:            number;
  reading_date:     string;
  request_id:       string | null;
  reported_by:      string | null;
  reported_by_name: string | null;
  created_at:       string;
}

// ─── POST — resident submits a meter reading ──────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Require authenticated session
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized: authentication required' }, { status: 401 });
  }

  let body: MeterReadingPayload;
  try {
    body = await request.json() as MeterReadingPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required fields
  const required = ['building_id','unit_label','meter_type','value','reading_date'] as const;
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  if (typeof body.value !== 'number' || body.value < 0) {
    return NextResponse.json({ error: 'value must be a non-negative number' }, { status: 400 });
  }

  const validMeterTypes: MeterType[] = ['viz','gaz','villany','ho','egyeb'];
  if (!validMeterTypes.includes(body.meter_type)) {
    return NextResponse.json({ error: `Invalid meter_type. Valid: ${validMeterTypes.join(', ')}` }, { status: 400 });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.reading_date)) {
    return NextResponse.json({ error: 'reading_date must be YYYY-MM-DD' }, { status: 400 });
  }

  // Verify building membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, role')
    .eq('building_id', body.building_id)
    .eq('profile_id', user.id)
    .eq('active', true)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden: not a member of this building' }, { status: 403 });
  }

  // If request_id provided, verify it belongs to this building and is still active
  if (body.request_id) {
    const { data: readingRequest } = await supabase
      .from('utility_reading_requests')
      .select('id, active, deadline_at')
      .eq('id', body.request_id)
      .eq('building_id', body.building_id)
      .single();

    if (!readingRequest) {
      return NextResponse.json({ error: 'reading_request not found in this building' }, { status: 404 });
    }
  }

  const { data, error } = await supabase
    .from('meter_readings')
    .insert({
      building_id:      body.building_id,
      unit_id:          body.unit_id ?? null,
      unit_label:       body.unit_label,
      meter_type:       body.meter_type,
      value:            body.value,
      reading_date:     body.reading_date,
      reported_by:      user.id,
      reported_by_name: body.reported_by_name ?? null,
      request_id:       body.request_id ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[utility/meter-readings] insert error:', error.message);
    return NextResponse.json({ error: 'Database error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json(data as MeterReadingRow, { status: 201 });
}

// ─── GET — query meter readings ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();

  // Require authenticated session
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized: authentication required' }, { status: 401 });
  }

  const sp         = request.nextUrl.searchParams;
  const buildingId = sp.get('building_id');
  const unitLabel  = sp.get('unit_label');
  const unitId     = sp.get('unit_id');
  const meterType  = sp.get('meter_type') as MeterType | null;
  const requestId  = sp.get('request_id');
  const from       = sp.get('from');   // YYYY-MM-DD
  const to         = sp.get('to');     // YYYY-MM-DD
  const limit      = Math.min(parseInt(sp.get('limit') ?? '50', 10), 200);
  const offset     = parseInt(sp.get('offset') ?? '0', 10);

  if (!buildingId) {
    return NextResponse.json({ error: 'Missing required query param: building_id' }, { status: 400 });
  }

  // Verify building membership; managers can see all, residents see their own unit
  const { data: membership } = await supabase
    .from('memberships')
    .select('role, unit_id')
    .eq('building_id', buildingId)
    .eq('profile_id', user.id)
    .eq('active', true)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden: not a member of this building' }, { status: 403 });
  }

  const isManager = ['kozos_kepviselo','megbizott','konyvelo'].includes(membership.role);

  let q = supabase
    .from('meter_readings')
    .select('*', { count: 'exact' })
    .eq('building_id', buildingId)
    .order('reading_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Non-managers can only see their own unit's readings
  if (!isManager) {
    if (membership.unit_id) q = q.eq('unit_id', membership.unit_id);
    else                    q = q.eq('reported_by', user.id);
  }

  if (meterType)  q = q.eq('meter_type', meterType);
  if (unitLabel)  q = q.ilike('unit_label', unitLabel);
  if (unitId)     q = q.eq('unit_id', unitId);
  if (requestId)  q = q.eq('request_id', requestId);
  if (from)       q = q.gte('reading_date', from);
  if (to)         q = q.lte('reading_date', to);

  const { data, error, count } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count ?? 0, limit, offset });
}
