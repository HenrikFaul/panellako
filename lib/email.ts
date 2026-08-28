// Central email sending utility using the Brevo (Sendinblue) API v3.
// All email sends MUST go through this module for consistent error handling and logging.

import type { ReactElement } from 'react';

const BREVO_BASE = 'https://api.brevo.com/v3/smtp/email';
const EMAIL_REQUEST_TIMEOUT_MS = 15_000;

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
  errorCode?: string;
  retryable?: boolean;
  providerStatus?: number;
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
  const brevoApiKey = process.env.BREVO_API_KEY?.trim();
  if (!brevoApiKey) {
    // Keep local template previews useful without logging recipient or subject
    // PII. Production callers receive a hard failure, never a fake delivery.
    console.warn('[sendEmail] transport is not configured', {
      recipientCount: Array.isArray(options.to) ? options.to.length : 1,
      htmlLength: options.html.length,
      production: process.env.NODE_ENV === 'production',
    });
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'Email transport is not configured',
        errorCode: 'EMAIL_TRANSPORT_UNCONFIGURED',
        retryable: true,
      };
    }
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
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      const retryable = res.status === 408 || res.status === 425 || res.status === 429 || res.status >= 500;
      let errorCode = 'BREVO_REJECTED';
      let hint = `Brevo ${res.status}`;
      if (res.status === 400) {
        errorCode = 'BREVO_BAD_REQUEST';
        hint = text.toLowerCase().includes('sender')
          ? 'Brevo rejected the configured sender'
          : 'Brevo rejected the email request';
      } else if (res.status === 401) {
        errorCode = 'BREVO_AUTH_INVALID';
        hint = 'Brevo authentication failed';
      } else if (res.status === 403) {
        errorCode = 'BREVO_ACCOUNT_BLOCKED';
        hint = 'Brevo account or plan rejected the request';
      } else if (res.status === 429) {
        errorCode = 'BREVO_RATE_LIMITED';
        hint = 'Brevo rate limit reached';
      } else if (res.status >= 500) {
        errorCode = 'BREVO_UNAVAILABLE';
        hint = 'Brevo is temporarily unavailable';
      }
      // Provider bodies can echo message content or recipient data. Log only
      // the stable classification and numeric status.
      console.error('[sendEmail] provider request failed', { status: res.status, errorCode, retryable });
      return { success: false, error: hint, errorCode, retryable, providerStatus: res.status };
    }

    const data = await res.json() as { messageId?: unknown };
    if (typeof data.messageId !== 'string' || data.messageId.trim() === '') {
      console.error('[sendEmail] provider response did not contain a message id');
      return {
        success: false,
        error: 'Brevo returned an invalid response',
        errorCode: 'BREVO_RESPONSE_INVALID',
        retryable: true,
        providerStatus: res.status,
      };
    }
    return { success: true, id: data.messageId };
  } catch {
    // Do not log exception strings: fetch/runtime errors can include request
    // details. The worker needs only a stable retry classification.
    console.error('[sendEmail] provider request failed', { errorCode: 'EMAIL_NETWORK_ERROR', retryable: true });
    return {
      success: false,
      error: 'Email provider request failed',
      errorCode: 'EMAIL_NETWORK_ERROR',
      retryable: true,
    };
  }
}

export function isEmailTransportConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim());
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
