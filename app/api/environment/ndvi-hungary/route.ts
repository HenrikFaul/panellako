import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Public endpoint: returns the latest successful Hungary-wide NDVI render's
// metadata (image URLs in 4 resolutions, acquisition date, bbox).  The PNGs
// themselves live in Supabase Storage (public bucket `ndvi-maps`) and the
// frontend loads them via the URLs in `resolutions`.

export interface NdviHungaryRender {
  runId:              string;
  status:             string;
  acquisitionFrom:    string | null;
  acquisitionTo:      string | null;
  acquisitionLatest:  string | null;     // a megjelenítendő "felvétel dátuma"
  renderedAt:         string | null;
  bbox:               [number, number, number, number];
  sourceSatellite:    string | null;
  sourceProvider:     string | null;
  cloudCoverPct:      number | null;
  resolutions: Record<string, {
    width:  number;
    height: number;
    url:    string;
    bytes:  number;
    label:  string;
  }>;
}

function makeClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = makeClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('ndvi_hungary_renders')
    .select('run_id, status, acquisition_from, acquisition_to, acquisition_latest, finished_at, bbox, source_satellite, source_provider, cloud_cover_pct, resolutions')
    .eq('status', 'success')
    .order('acquisition_latest', { ascending: false, nullsFirst: false })
    .order('finished_at',        { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'No successful render found. Run the ndvi_hungary_render job from superadmin first.' }, { status: 404 });
  }

  const out: NdviHungaryRender = {
    runId:             data.run_id as string,
    status:            data.status as string,
    acquisitionFrom:   data.acquisition_from   as string | null,
    acquisitionTo:     data.acquisition_to     as string | null,
    acquisitionLatest: data.acquisition_latest as string | null,
    renderedAt:        data.finished_at        as string | null,
    bbox:              data.bbox               as [number, number, number, number],
    sourceSatellite:   data.source_satellite   as string | null,
    sourceProvider:    data.source_provider    as string | null,
    cloudCoverPct:     data.cloud_cover_pct !== null ? Number(data.cloud_cover_pct) : null,
    resolutions:       (data.resolutions as NdviHungaryRender['resolutions']) ?? {},
  };

  return NextResponse.json(out, {
    headers: {
      // Cache aggressively — the render only changes when superadmin runs the job
      'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
