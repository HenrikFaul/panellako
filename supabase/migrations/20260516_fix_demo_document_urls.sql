-- Migration: fix_demo_document_urls
-- Replace dead storage.panellako.hu legacy URLs with correct Supabase Storage paths.
-- The demo PDFs must be uploaded to the `documents` bucket under `demo/` prefix
-- (via POST /api/init-demo-docs or manual upload) before signed URLs will work.

UPDATE documents SET file_url = 'demo/szmsz_v3.1.pdf'
  WHERE file_url = 'https://storage.panellako.hu/demo/szmsz_v3.1.pdf';

UPDATE documents SET file_url = 'demo/elszamolas_2025.pdf'
  WHERE file_url = 'https://storage.panellako.hu/demo/elszamolas_2025.pdf';

UPDATE documents SET file_url = 'demo/kozgyules_meghivo_20260610.pdf'
  WHERE file_url = 'https://storage.panellako.hu/demo/kozgyules_meghivo_20260610.pdf';

UPDATE documents SET file_url = 'demo/tuzvedelmi_szabalyzat_v2.pdf'
  WHERE file_url = 'https://storage.panellako.hu/demo/tuzvedelmi_szabalyzat_v2.pdf';
