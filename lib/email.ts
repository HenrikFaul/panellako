// Central email sending utility using the Brevo (Sendinblue) API v3.
// All email sends MUST go through this module for consistent error handling and logging.

import type { ReactElement } from 'react';

const BREVO_BASE = 'https://api.brevo.com/v3/smtp/email';

const brevoApiKey = process.env.BREVO_API_KEY;
const isEmailEnabled = Boolean(brevoApiKey);

export const EMAIL_FROM_DISPLAY = 'PanelLakó <no-reply@panellako.hu>';
export const EMAIL_REPLY_TO = 'support@panellako.hu';

const BULK_CHUNK_SIZE = 10;
const BULK_CHUNK_DELAY_MS = 200;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  from?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface BulkSendResult {
  total: number;
  sent: number;
  failed: number;
  errors: Array<{ to: string; error: string }>;
}

// Parse "Display Name <email@example.com>" → { name, email }
function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: 'PanelLakó', email: from.trim() };
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!isEmailEnabled) {
    console.log('[EMAIL STUB — no BREVO_API_KEY]', {
      to: options.to,
      subject: options.subject,
      htmlLength: options.html.length,
    });
    return { success: true, id: 'stub_' + Math.random().toString(36).slice(2) };
  }

  const sender = parseFrom(options.from ?? EMAIL_FROM_DISPLAY);
  const replyToEmail = options.replyTo ?? EMAIL_REPLY_TO;
  const toList = (Array.isArray(options.to) ? options.to : [options.to]).map(e => ({ email: e }));

  const body: Record<string, unknown> = {
    sender,
    to: toList,
    subject: options.subject,
    htmlContent: options.html,
    replyTo: { email: replyToEmail },
  };

  if (options.tags && options.tags.length > 0) {
    // Brevo tags are plain strings; encode as "name:value"
    body.tags = options.tags.map(t => `${t.name}:${t.value}`);
  }

  try {
    const res = await fetch(BREVO_BASE, {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey!,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      console.error('[sendEmail] Brevo API error:', res.status, text);
      // Surface a human-readable hint for the most common failure modes
      let hint = `Brevo ${res.status}`;
      if (res.status === 401) hint = 'Brevo 401: invalid or missing BREVO_API_KEY';
      if (res.status === 400 && text.includes('sender')) hint = 'Brevo 400: sender address not verified — verify no-reply@panellako.hu in Brevo dashboard → Senders & IP';
      if (res.status === 403) hint = 'Brevo 403: account blocked or plan limit reached';
      console.error('[sendEmail] hint:', hint, '| body:', text);
      return { success: false, error: hint };
    }

    const data = await res.json();
    return { success: true, id: data.messageId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[sendEmail] Unexpected error:', message);
    return { success: false, error: message };
  }
}

export async function sendBulkEmail({
  recipients,
  subject,
  html,
  replyTo,
  tags,
}: {
  recipients: string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}): Promise<BulkSendResult> {
  const result: BulkSendResult = { total: recipients.length, sent: 0, failed: 0, errors: [] };
  if (recipients.length === 0) return result;

  const chunks: string[][] = [];
  for (let i = 0; i < recipients.length; i += BULK_CHUNK_SIZE) {
    chunks.push(recipients.slice(i, i + BULK_CHUNK_SIZE));
  }

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    const sends = await Promise.allSettled(chunk.map(to => sendEmail({ to, subject, html, replyTo, tags })));

    for (let i = 0; i < sends.length; i++) {
      const s = sends[i];
      if (s.status === 'fulfilled' && s.value.success) {
        result.sent++;
      } else {
        result.failed++;
        const error = s.status === 'rejected' ? String(s.reason) : (s.value.error ?? 'Unknown error');
        result.errors.push({ to: chunk[i], error });
      }
    }

    if (chunkIdx < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, BULK_CHUNK_DELAY_MS));
    }
  }

  return result;
}

export async function renderEmailTemplate(element: ReactElement): Promise<string> {
  const { render } = await import('@react-email/render');
  return render(element);
}

export function generateUnsubscribeUrl(unsubscribeToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu';
  return `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}`;
}

export function isEmailEnabledForProfile(profile: { notifications_email?: boolean }): boolean {
  return profile.notifications_email !== false;
}
