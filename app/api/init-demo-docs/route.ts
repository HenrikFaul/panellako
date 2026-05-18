import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

const BUCKET = 'documents';

const DEMO_DOCS = [
  {
    storagePath: 'demo/szmsz_v3.1.pdf',
    publicFile: 'szmsz_v3.1.pdf',
    legacyUrl: 'https://storage.panellako.hu/demo/szmsz_v3.1.pdf',
  },
  {
    storagePath: 'demo/elszamolas_2025.pdf',
    publicFile: 'elszamolas_2025.pdf',
    legacyUrl: 'https://storage.panellako.hu/demo/elszamolas_2025.pdf',
  },
  {
    storagePath: 'demo/kozgyules_meghivo_20260610.pdf',
    publicFile: 'kozgyules_meghivo_20260610.pdf',
    legacyUrl: 'https://storage.panellako.hu/demo/kozgyules_meghivo_20260610.pdf',
  },
  {
    storagePath: 'demo/tuzvedelmi_szabalyzat_v2.pdf',
    publicFile: 'tuzvedelmi_szabalyzat_v2.pdf',
    legacyUrl: 'https://storage.panellako.hu/demo/tuzvedelmi_szabalyzat_v2.pdf',
  },
];

async function handler(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Derive base URL from request so this works on any host (dev, staging, prod)
  const origin = request.nextUrl.origin;
  const results: { path: string; status: string; error?: string }[] = [];

  for (const doc of DEMO_DOCS) {
    // Fetch PDF from our own public/demo-docs/ static serving
    let bytes: ArrayBuffer;
    try {
      const res = await fetch(`${origin}/demo-docs/${doc.publicFile}`, { cache: 'no-store' });
      if (!res.ok) {
        results.push({ path: doc.storagePath, status: 'fetch_error', error: `HTTP ${res.status}` });
        continue;
      }
      bytes = await res.arrayBuffer();
    } catch (e) {
      results.push({ path: doc.storagePath, status: 'fetch_error', error: String(e) });
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(doc.storagePath, bytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      results.push({ path: doc.storagePath, status: 'upload_error', error: uploadError.message });
      continue;
    }

    // Update any DB records still pointing at the legacy URL
    await supabase
      .from('documents')
      .update({ file_url: doc.storagePath })
      .eq('file_url', doc.legacyUrl);

    results.push({ path: doc.storagePath, status: 'ok' });
  }

  return NextResponse.json({ results });
}

export async function POST(request: NextRequest) {
  return handler(request);
}

export async function GET(request: NextRequest) {
  return handler(request);
}
