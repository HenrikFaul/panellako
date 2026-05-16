import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

const BUCKET = 'documents';

const DEMO_DOCS = [
  {
    storagePath: 'demo/szmsz_v3.1.pdf',
    localFile: 'szmsz_v3.1.pdf',
    legacyUrl: 'https://storage.panellako.hu/demo/szmsz_v3.1.pdf',
  },
  {
    storagePath: 'demo/elszamolas_2025.pdf',
    localFile: 'elszamolas_2025.pdf',
    legacyUrl: 'https://storage.panellako.hu/demo/elszamolas_2025.pdf',
  },
  {
    storagePath: 'demo/kozgyules_meghivo_20260610.pdf',
    localFile: 'kozgyules_meghivo_20260610.pdf',
    legacyUrl: 'https://storage.panellako.hu/demo/kozgyules_meghivo_20260610.pdf',
  },
  {
    storagePath: 'demo/tuzvedelmi_szabalyzat_v2.pdf',
    localFile: 'tuzvedelmi_szabalyzat_v2.pdf',
    legacyUrl: 'https://storage.panellako.hu/demo/tuzvedelmi_szabalyzat_v2.pdf',
  },
];

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const demoDocsDir = path.join(process.cwd(), 'public', 'demo-docs');
  const results: { path: string; status: string; error?: string }[] = [];

  for (const doc of DEMO_DOCS) {
    const filePath = path.join(demoDocsDir, doc.localFile);
    if (!fs.existsSync(filePath)) {
      results.push({ path: doc.storagePath, status: 'skipped', error: 'local file not found' });
      continue;
    }

    const bytes = fs.readFileSync(filePath);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(doc.storagePath, bytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      results.push({ path: doc.storagePath, status: 'upload_error', error: uploadError.message });
      continue;
    }

    // Update any DB records still pointing at the legacy URL
    const { error: updateError } = await supabase
      .from('documents')
      .update({ file_url: doc.storagePath })
      .eq('file_url', doc.legacyUrl);

    if (updateError) {
      results.push({ path: doc.storagePath, status: 'db_error', error: updateError.message });
    } else {
      results.push({ path: doc.storagePath, status: 'ok' });
    }
  }

  return NextResponse.json({ results });
}

// GET — for manual browser trigger during development
export async function GET() {
  return POST();
}
