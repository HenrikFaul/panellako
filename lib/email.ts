// Central email sending utility using the Resend SDK.
// All email sends MUST go through this module for consistent error handling and logging.

import { Resend } from 'resend';
import type { ReactElement } from 'react';

const resendApiKey = process.env.RESEND_API_KEY;
const isEmailEnabled = Boolean(resendApiKey);

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not set.');
    }
    resendClient = new Resend(resendApiKey);
  }
  return resendClient;
}

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

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!isEmailEnabled) {
    console.log('[EMAIL STUB — no RESEND_API_KEY]', {
      to: options.to,
      subject: options.subject,
      htmlLength: options.html.length,
    });
    return { success: true, id: 'stub_' + Math.random().toString(36).slice(2) };
  }

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: options.from ?? EMAIL_FROM_DISPLAY,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo ?? EMAIL_REPLY_TO,
      tags: options.tags,
    });

    if (error) {
      console.error('[sendEmail] Resend API error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
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
