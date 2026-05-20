// v0.7.14 — User reference address upsert + read
// Egyszerű POST/GET endpoint. RLS védi az adatokat user-id szerint (auth.uid()).
// Tilos itt service_role kulccsal írni — a session-cookie-ból jövő user-id a single source of truth.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Payload = {
  display_name?: string;
  lat?: number;
  lon?: number;
  street?: string | null;
  house_number?: string | null;
  city?: string | null;
  district?: string | null;
  postcode?: string | null;
  floor?: string | null;
  door?: string | null;
  source?: string;
};

export async function GET() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_reference_addresses')
    .select('display_name, lat, lon, street, house_number, city, district, postcode, floor, door, source, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'QUERY_FAILED', message: error.message }, { status: 500 });
  return NextResponse.json({ address: data ?? null });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body.display_name || typeof body.lat !== 'number' || typeof body.lon !== 'number') {
    return NextResponse.json({ error: 'MISSING_FIELDS', message: 'display_name, lat, lon kötelező.' }, { status: 400 });
  }
  if (!Number.isFinite(body.lat) || !Number.isFinite(body.lon)) {
    return NextResponse.json({ error: 'INVALID_COORDS' }, { status: 400 });
  }

  const row = {
    user_id:      user.id,
    display_name: body.display_name,
    lat:          body.lat,
    lon:          body.lon,
    street:       body.street ?? null,
    house_number: body.house_number ?? null,
    city:         body.city ?? null,
    district:     body.district ?? null,
    postcode:     body.postcode ?? null,
    floor:        body.floor ?? null,
    door:         body.door ?? null,
    source:       body.source || 'nominatim',
    updated_at:   new Date().toISOString(),
  };

  const { error } = await supabase
    .from('user_reference_addresses')
    .upsert(row, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: 'UPSERT_FAILED', message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, address: row });
}
