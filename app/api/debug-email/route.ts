import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

// Diagnostic endpoint for email configuration.
//
// GET  /api/debug-email
//   → checks env vars, pings Brevo account API, lists verified senders
//
// POST /api/debug-email?token=<DEBUG_EMAIL_TOKEN>&to=<address>
//   → sends a live test email (requires DEBUG_EMAIL_TOKEN env var)

const BREVO_BASE = 'https://api.brevo.com/v3';

async function brevoGet(path: string, apiKey: string) {
  const res = await fetch(`${BREVO_BASE}${path}`, {
    headers: { 'api-key': apiKey, Accept: 'application/json' },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

export async function GET() {
  const apiKey    = process.env.BREVO_API_KEY;
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL;

  // --- env var check ---
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      problem: 'BREVO_API_KEY env var is not set in Vercel.',
      fix: 'Vercel → Project Settings → Environment Variables → Add BREVO_API_KEY',
    }, { status: 500 });
  }

  // --- Brevo account ping (validates the key) ---
  const account = await brevoGet('/account', apiKey);
  if (!account.ok) {
    return NextResponse.json({
      ok: false,
      problem: `BREVO_API_KEY is set but Brevo rejected it (HTTP ${account.status}).`,
      brevo_response: account.body,
      fix: 'Check that BREVO_API_KEY is the full key from Brevo → SMTP & API → API Keys.',
    }, { status: 500 });
  }

  // --- Verified senders list ---
  const senders = await brevoGet('/senders', apiKey);
  const senderList: Array<{ name: string; email: string; active: boolean }> =
    (senders.body?.senders ?? []).map((s: { name: string; email: string; active: boolean }) => ({
      name: s.name,
      email: s.email,
      active: s.active,
    }));

  const fromAddress = 'no-reply@panellako.hu';
  const senderVerified = senderList.some(
    s => s.email.toLowerCase() === fromAddress && s.active
  );

  // --- Domain list ---
  const domains = await brevoGet('/senders/domains', apiKey);
  const domainList: Array<{ domain_name: string; verified: boolean }> =
    (domains.body?.domains ?? []).map((d: { domain_name: string; verified: boolean }) => ({
      domain_name: d.domain_name,
      verified: d.verified,
    }));
  const domainVerified = domainList.some(
    d => fromAddress.endsWith('@' + d.domain_name) && d.verified
  );

  const senderOk = senderVerified || domainVerified;

  return NextResponse.json({
    ok: senderOk && Boolean(recipient),
    account: {
      email: account.body?.email,
      plan: account.body?.plan?.[0]?.type ?? 'unknown',
    },
    config: {
      BREVO_API_KEY:          '✓ set and valid',
      CONTACT_RECIPIENT_EMAIL: recipient ? `✓ set (${recipient})` : '✗ MISSING',
      sender_from:            fromAddress,
    },
    sender_status: {
      verified: senderOk,
      matched_sender:  senderList.find(s => s.email.toLowerCase() === fromAddress) ?? null,
      matched_domain:  domainList.find(d => fromAddress.endsWith('@' + d.domain_name)) ?? null,
      all_senders:     senderList,
      all_domains:     domainList,
    },
    fix: senderOk
      ? null
      : [
          `"${fromAddress}" is NOT verified as a sender in Brevo.`,
          'Option A (quickest): Brevo dashboard → Senders & IP → Senders → Add a sender → enter "no-reply@panellako.hu", click the verification link sent to that address.',
          'Option B (domain-wide): Brevo → Senders & IP → Domains → Add panellako.hu → add the 3 DNS records shown → verify.',
          'Until one of these is done, Brevo will reject every send from this address.',
        ],
  });
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const to    = request.nextUrl.searchParams.get('to');

  const debugToken = process.env.DEBUG_EMAIL_TOKEN;
  if (!debugToken || token !== debugToken) {
    return NextResponse.json(
      { error: 'Unauthorized. Set DEBUG_EMAIL_TOKEN env var and pass ?token=<value>.' },
      { status: 401 }
    );
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
    id:      result.id,
    error:   result.error ?? null,
    to:      to.replace(/(?<=.{2}).(?=.*@)/g, '*'),
  });
}
