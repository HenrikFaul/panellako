import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return new NextResponse('Érvénytelen leiratkozási link.', { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ notifications_email: false })
    .eq('unsubscribe_token', token);

  if (error) {
    console.error('[unsubscribe] DB error:', error);
    return new NextResponse('Hiba történt a leiratkozás során. Kérjük, próbálja újra.', { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const html = `<!DOCTYPE html>
<html lang="hu">
<head><meta charset="utf-8"><title>Leiratkozás sikeres — PanelLakó</title>
<style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f9}.card{background:#fff;border-radius:12px;padding:40px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}h1{color:#1e3a5f;font-size:20px;margin-bottom:12px}p{color:#555;line-height:1.6}a{color:#1e3a5f;font-weight:bold}</style>
</head>
<body><div class="card">
  <h1>✅ Leiratkozás sikeres</h1>
  <p>Sikeresen leiratkozott a PanelLakó e-mail értesítésekről.<br>Törvény által előírt közleményeket (pl. közgyűlési meghívók) továbbra is megkaphat.</p>
  <p style="margin-top:24px"><a href="https://app.panellako.hu">Vissza a PanelLakóba</a></p>
</div></body></html>`;

  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
