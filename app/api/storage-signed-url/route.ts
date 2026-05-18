import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const bucket = searchParams.get('bucket') ?? 'documents';

  if (!path) {
    return NextResponse.json({ error: 'path parameter required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 10); // 10 minutes

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'Failed to generate signed URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
