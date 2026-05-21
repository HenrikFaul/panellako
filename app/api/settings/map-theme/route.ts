import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_THEME_ID, type MapThemeId } from '@/lib/map-theme';

export const dynamic = 'force-dynamic';

function makeSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = makeSupabase();
  if (!supabase) {
    console.warn('[map-theme] Supabase env vars missing — returning default');
    return NextResponse.json({ theme: DEFAULT_THEME_ID });
  }

  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'map_theme')
    .maybeSingle();

  if (error) {
    console.error('[map-theme] DB read error:', error.message);
    return NextResponse.json({ theme: DEFAULT_THEME_ID });
  }

  const id = (data?.value as { id?: string } | null)?.id;
  const theme: MapThemeId = id && /^(minimal|nature|dark|dlc)$/.test(id)
    ? (id as MapThemeId)
    : DEFAULT_THEME_ID;

  return NextResponse.json({ theme });
}
