import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

// GET  → returns config status (no secrets revealed)
// POST → sends a test email to ?to=<address> (manager use only, guarded by secret token)
//
// Usage:
//   GET  /api/debug-email                       → config status
//   POST /api/debug-email?token=<DEBUG_TOKEN>&to=test@mailinator.com  → test send

export async function GET() {
  const hasResendKey = Boolean(process.env.BREVO_API_KEY);
  const hasRecipient = Boolean(process.env.CONTACT_RECIPIENT_EMAIL);
  const fromAddress = process.env.EMAIL_FROM ?? 'PanelLakó <no-reply@panellako.hu>';

  return NextResponse.json({
    ok: hasResendKey && hasRecipient,
    config: {
      BREVO_API_KEY: hasResendKey ? '✓ set' : '✗ MISSING',
      CONTACT_RECIPIENT_EMAIL: hasRecipient ? '✓ set' : '✗ MISSING',
      from_address: fromAddress,
    },
    instructions: !hasResendKey || !hasRecipient
      ? 'Add missing env vars in Vercel → Project Settings → Environment Variables, then redeploy.'
      : 'Config looks good. POST to this route with ?token=<DEBUG_EMAIL_TOKEN>&to=<email> to send a test email.',
  });
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const to = request.nextUrl.searchParams.get('to');

  const debugToken = process.env.DEBUG_EMAIL_TOKEN;
  if (!debugToken || token !== debugToken) {
    return NextResponse.json({ error: 'Unauthorized. Set DEBUG_EMAIL_TOKEN env var and pass ?token=<token>.' }, { status: 401 });
  }

  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Missing or invalid ?to= parameter.' }, { status: 400 });
  }

  if (!process.env.BREVO_API_KEY) {
    return NextResponse.json({ error: 'BREVO_API_KEY is not set.' }, { status: 500 });
  }

  const result = await sendEmail({
    to,
    subject: '[PanelLakó] Test email — debug-email route',
    html: `
      <div style="font-family:sans-serif;padding:24px;max-width:500px">
        <h2 style="color:#0f172a">Test email sikeres!</h2>
        <p>Ha ezt az emailt látod, az email rendszer helyesen van konfigurálva.</p>
        <p style="color:#64748b;font-size:12px">Küldés ideje: ${new Date().toISOString()}</p>
      </div>
    `,
  });

  return NextResponse.json({
    success: result.success,
    id: result.id,
    error: result.error ?? null,
    to: to.replace(/(?<=.{2}).(?=.*@)/g, '*'),
  });
}
