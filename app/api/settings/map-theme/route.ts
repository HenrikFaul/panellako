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
    return NextResponse.json({ theme: DEFAULT_THEME_ID });
  }

  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'map_theme')
    .maybeSingle();

  const theme = (data?.value as { id?: string } | null)?.id ?? DEFAULT_THEME_ID;
  return NextResponse.json({ theme: theme as MapThemeId });
}
