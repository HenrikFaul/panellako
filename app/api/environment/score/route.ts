import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

export interface EnvScore {
  total:       number;
  airScore:    number;
  greenScore:  number;
  pollenScore: number;
  uvScore:     number;
  noiseScore:  number;
  label:       string;
  color:       string;
}

function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  const sp         = request.nextUrl.searchParams;
  const buildingId = sp.get('buildingId') ?? '';
  const lat        = parseFloat(sp.get('lat') ?? '47.4979');
  const lon        = parseFloat(sp.get('lon') ?? '19.0402');

  const base = new URL(request.url);
  base.pathname = '';

  // Fetch AQ and green in parallel
  const [aqRes, greenRes] = await Promise.allSettled([
    fetch(`${base.origin}/api/environment/air-quality?lat=${lat}&lon=${lon}`).then(r => r.json()),
    buildingId
      ? fetch(`${base.origin}/api/environment/green?buildingId=${buildingId}&lat=${lat}&lon=${lon}`).then(r => r.json())
      : Promise.resolve(null),
  ]);

  const aq    = aqRes.status    === 'fulfilled' ? aqRes.value    : null;
  const green = greenRes.status === 'fulfilled' ? greenRes.value : null;

  const aqi          = aq?.current?.aqi ?? 50;
  const maxPollen    = Math.max(aq?.current?.grassPollen ?? 0, aq?.current?.birchPollen ?? 0, aq?.current?.alderPollen ?? 0);
  const todayUv      = aq?.daily?.[0]?.maxUv ?? 5;
  const greenScoreV  = green?.greenScore ?? null;
  const noiseScoreV  = green?.noiseScore ?? null;

  const airScore    = Math.round(Math.max(0, 1 - aqi / 200) * 35);
  const greenScore  = greenScoreV !== null ? Math.round((greenScoreV / 100) * 25) : 12;
  const pollenScore = Math.round(Math.max(0, 1 - maxPollen / 150) * 15);
  const uvScore     = Math.round(Math.max(0, 1 - todayUv / 11) * 10);
  const noiseScore  = noiseScoreV !== null ? Math.round(noiseScoreV * 15) : 10;

  const total = airScore + greenScore + pollenScore + uvScore + noiseScore;

  const result: EnvScore = {
    total,
    airScore,
    greenScore,
    pollenScore,
    uvScore,
    noiseScore,
    label: total >= 80 ? 'Kiváló' : total >= 60 ? 'Jó' : total >= 40 ? 'Mérsékelt' : 'Gyenge',
    color: total >= 80 ? '#22c55e' : total >= 60 ? '#84cc16' : total >= 40 ? '#eab308' : '#ef4444',
  };

  const supabase = createServiceClient();
  if (supabase && buildingId) {
    await supabase.from('building_env_score').upsert({
      building_id:  buildingId,
      total_score:  total,
      air_score:    airScore,
      green_score:  greenScore,
      pollen_score: pollenScore,
      uv_score:     uvScore,
      noise_score:  noiseScore,
      aqi_snapshot: aqi,
      computed_at:  new Date().toISOString(),
    }, { onConflict: 'building_id' });
  }

  return NextResponse.json(result);
}
