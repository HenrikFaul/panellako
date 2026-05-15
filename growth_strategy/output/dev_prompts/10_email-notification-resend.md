# Dev Prompt #10 — Email Notification System via Resend

**Initiative:** Email Notification System via Supabase Email (Resident Communication Layer)  
**Estimated Value:** +€100k–€240k ARR uplift  
**Priority:** P0 — Foundation for all legal-compliance notification workflows; prerequisite for Dev Prompt #9  
**Target Release:** v3.21.0  
**Author:** AI Execution Engine, 2026-05-15  
**Depends On:** Resend account, domain verification (panellako.hu), RESEND_API_KEY env var  

---

## 1. Business Case

### 1.1 Statutory Written Communication Requirements

Hungarian condominium law (Ptk.) mandates written communication for several legally significant events. Ptk. 5:84 requires that assembly invitations be sent "in writing" to every owner at least 8 days before the meeting. Ptk. 5:88 requires that assembly minutes (Közgyűlési Jegyzőkönyv) be distributed to all owners within 15 days. While "in writing" technically includes postal mail, email is widely accepted as the electronic equivalent in Hungarian civil practice when owners have provided an email address. The practical reality is that Hungarian condominium buildings produce 4–8 assemblies per year, plus ad-hoc maintenance notifications, financial statements, and service disruption alerts — all of which require reliable written communication. Without an email channel, PanelLakó is limited to in-app push notifications, which reach only users who have the app installed and are actively checking it — typically 20–40% of the total owner population in a building. Email reaches everyone, regardless of app engagement, and creates an auditable delivery trail.

### 1.2 Resident Communication Lifecycle and Revenue Impact

Building managers spend an estimated 3–5 hours per month on resident communication: drafting announcements, copying email addresses from spreadsheets, sending individual or BCC emails, and following up on missed notifications. This manual workflow is error-prone (forgotten recipients, wrong email addresses), legally risky (cannot prove who received what notification when), and completely disconnected from the rest of the platform. PanelLakó's integrated email notification system eliminates this entirely: a building manager composes a single announcement in the dashboard, clicks "Küldés", and within seconds all owners receive a professionally branded HTML email with the correct content, the correct sender domain, and an automatic unsubscribe link. The audit log records exactly who received what and when. This saves 2–3 hours per month per building, which at Hungarian professional rates represents €30–€75 saved monthly per building. For a portfolio of 50 buildings, this is €1,500–€3,750/month of labor cost reduction delivered directly to clients — a compelling ROI argument for the premium tier.

### 1.3 Resend vs. Alternative Email Providers

The `resend` package (v6.12.3) is already in `package.json`, indicating this was a pre-planned integration. Resend is the optimal choice for PanelLakó for several reasons. First, Resend is built for developer-oriented SaaS and supports React Email components natively — meaning email templates can be written as React/JSX components, keeping the authoring experience consistent with the rest of the codebase. Second, Resend's pricing is competitive: the free tier covers 3,000 emails/month (sufficient for early-stage testing), and the Pro plan at $20/month covers 50,000 emails/month. For a 100-building deployment with 40 units per building, a single announcement generates 4,000 emails — comfortably within the Pro plan. Third, Resend provides real-time delivery webhooks, bounce handling, and spam reporting out of the box — critical for maintaining email deliverability and complying with GDPR unsubscribe obligations. Supabase's built-in SMTP (via SendGrid) is limited to transactional auth emails and cannot be used for bulk building announcements without significant workaround. Resend is the correct choice.

### 1.4 GDPR and Unsubscribe Compliance

Every email sent to EU residents must include an unsubscribe mechanism under GDPR Article 21 and the ePrivacy Directive. PanelLakó serves Hungarian residents who are EU data subjects. Every email sent by the platform must include a one-click unsubscribe link. When a resident unsubscribes, the `profiles.notifications_email` flag must be set to `false` immediately, and no further marketing or announcement emails should be sent to that address. Note: legally required notifications (assembly invitations under Ptk. 5:84, assembly minutes under Ptk. 5:88) may still need to be sent even if a resident has unsubscribed from general notifications — this must be handled with a separate opt-out flag or by informing the resident that statutory communications cannot be suppressed. This prompt implements a unified `notifications_email` flag for non-statutory communications and provides guidance on the statutory vs. non-statutory distinction.

---

## 2. Current State Analysis

### 2.1 What Exists

The `notifications` table in `supabase/schema.sql` has a `channel TEXT NOT NULL DEFAULT 'app' CHECK (channel IN ('app','email'))` column, indicating the intent to support email notifications was present from the beginning of the schema design. The `NotificationItem` type in `lib/types.ts` also carries a `channel: 'app' | 'email'` field. The `resend` package at version 6.12.3 is listed in `package.json` — it is installed but never used. All existing Server Actions (`createNotification`, `createAnnouncement`, `createTicket`, `updateTicketStatus`) are app-only; none import Resend or send any email. The `createAnnouncement` action in `app/actions/announcements.ts` inserts a database record but does not send any notification to residents.

### 2.2 What Does NOT Exist

- `lib/email.ts` does not exist. There is no central email-sending utility anywhere in the codebase.
- `lib/email-templates/` directory does not exist. No React Email components are defined.
- No email is ever sent for any event: announcements, ticket updates, assembly invitations, or document sharing.
- No `profiles.notifications_email` column exists in the schema (must be added).
- No unsubscribe endpoint exists (`app/api/email/unsubscribe/route.ts` missing).
- No Resend webhook handler exists (`app/api/resend/webhook/route.ts` missing).
- The `RESEND_API_KEY` environment variable is not documented in any env example file.
- No monthly statement automation exists (no CRON or Edge Function for monthly emails).

### 2.3 Impact of Current State

Without this feature, PanelLakó cannot deliver on its Ptk. 5:84 compliance promise (assembly invitations), cannot notify residents of ticket status changes (the most common support request from residents is "nobody told me"), and cannot send monthly financial statements electronically. Every one of these gaps is a sales objection from building managers evaluating the platform.

---

## 3. Pre-Conditions

1. **Resend Account:** Create an account at resend.com. Navigate to Settings → Domains → Add Domain. Add `panellako.hu`. Follow the DNS verification steps (add the TXT and MX records Resend provides). Verification takes 5–15 minutes. The sender address will be `no-reply@panellako.hu`.
2. **API Key:** In Resend dashboard → API Keys → Create API Key with "Full Access" permissions. Copy the key (shown only once). It will begin with `re_`.
3. **Environment Variable:** Add to `.env.local` (development): `RESEND_API_KEY=re_xxxxxxxxxxxxx`. Add to Vercel/hosting provider environment variables for staging and production. Also add to `.env.example` (without the actual value): `RESEND_API_KEY=re_your_key_here`.
4. **Package Verification:** Confirm `resend` is in `package.json` dependencies. If for any reason it was removed, run `npm install resend`. As of 2026, `resend` v6.x includes the `@react-email/components` peer dependency; install it separately: `npm install @react-email/components @react-email/render`.
5. **TypeScript Environment:** The `@react-email/components` package provides TypeScript types out of the box. No additional `@types/` package needed.
6. **Domain Authorization:** Before sending bulk emails, ensure the `panellako.hu` domain is verified in Resend. Sending from an unverified domain will result in HTTP 422 errors from the Resend API.

---

## 4. Phase 1 — Data Model (No Breaking Changes Required)

The `notifications` table already supports the `channel` field. The only schema change needed is adding the email preference column to `profiles`. Execute this SQL:

```sql
-- 4.1 Add email notification preference to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN NOT NULL DEFAULT true;
-- Default true: opt-in by default (consistent with GDPR's "legitimate interest" basis for service notifications)
-- Users can opt out via the preferences UI or the unsubscribe link in emails

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_statutory_email BOOLEAN NOT NULL DEFAULT true;
-- notifications_statutory_email: cannot be turned off by user for statutory communications
-- (Ptk. 5:84 assembly invitations, Ptk. 5:88 assembly minutes)
-- This is a separate flag that building managers can see but residents cannot toggle off
-- NOTE: In practice, inform users that statutory emails cannot be suppressed; this is a legal obligation, not a preference.

-- 4.2 Add email audit tracking to audit_logs (already supported by existing schema; no change needed)
-- audit_logs.action_type = 'email_sent' | 'email_bounced' | 'email_spam' | 'email_unsubscribe'
-- These action_types are free-text and already supported by the existing audit_logs table.

-- 4.3 Add unsubscribe token for secure one-click unsubscribe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid();
-- Each profile has a unique token that appears in unsubscribe URLs
-- This prevents guessing other users' email addresses and unsubscribing them

-- 4.4 RLS for the new columns (inherits existing profiles RLS — public read, no write without auth)
-- No additional RLS changes needed; the columns are on the profiles table which already has policies.
-- The unsubscribe endpoint will use the service role to update profiles.notifications_email.
```

Update `supabase/schema.sql` to include these `ALTER TABLE` statements in the profiles section.

Also update `lib/types.ts` to extend `UserProfile`:

```typescript
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  notifications_email?: boolean;       // opt-out of general emails
  notifications_statutory_email?: boolean; // cannot opt out of statutory communications
  unsubscribe_token?: string;          // UUID for one-click unsubscribe links
}
```

---

## 5. Phase 2 — Core Email Infrastructure: `lib/email.ts`

Create the file `lib/email.ts`. This file does NOT exist; create it from scratch.

```typescript
// lib/email.ts
// Central email sending utility using the Resend SDK.
// All email sends in the application MUST go through this module.
// This ensures consistent error handling, logging, and rate limiting.

import { Resend } from 'resend';

// ─── Resend Client Initialization ────────────────────────────────────────────

const resendApiKey = process.env.RESEND_API_KEY;

// In development without a key, use a mock client that logs to console
const isEmailEnabled = Boolean(resendApiKey);

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!resendApiKey) {
      throw new Error(
        'RESEND_API_KEY is not set. Email sending is disabled. ' +
        'Set RESEND_API_KEY in your .env.local to enable email.'
      );
    }
    resendClient = new Resend(resendApiKey);
  }
  return resendClient;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const EMAIL_FROM = 'no-reply@panellako.hu';
export const EMAIL_FROM_DISPLAY = 'PanelLakó <no-reply@panellako.hu>';
export const EMAIL_REPLY_TO = 'support@panellako.hu';

// Resend rate limit: 2 requests/second on the free tier; 10 on Pro.
// The bulk send function respects this with chunked Promise.allSettled.
const BULK_CHUNK_SIZE = 10;  // Send in batches of 10 to stay within rate limits
const BULK_CHUNK_DELAY_MS = 200; // 200ms delay between chunks

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  from?: string;  // override sender if needed (must be a verified Resend domain)
  tags?: Array<{ name: string; value: string }>; // Resend email tags for categorization
}

export interface SendEmailResult {
  success: boolean;
  id?: string;       // Resend email ID for tracking
  error?: string;
}

export interface BulkSendResult {
  total: number;
  sent: number;
  failed: number;
  errors: Array<{ to: string; error: string }>;
}

// ─── sendEmail ────────────────────────────────────────────────────────────────

/**
 * Sends a single transactional email via Resend.
 * Safe to use in Server Actions and Edge Functions.
 * Returns { success, id } on success; { success: false, error } on failure.
 *
 * @example
 * const result = await sendEmail({
 *   to: 'owner@example.com',
 *   subject: 'Közgyűlési meghívó',
 *   html: renderToStaticMarkup(<AssemblyInvitationEmail ... />),
 * });
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!isEmailEnabled) {
    // Development fallback: log the email instead of sending
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
      reply_to: options.replyTo ?? EMAIL_REPLY_TO,
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

// ─── sendBulkEmail ────────────────────────────────────────────────────────────

/**
 * Sends the same email to multiple recipients, with rate-limit-aware chunking.
 * Uses Promise.allSettled so a single failure does not abort the entire batch.
 *
 * @param recipients - Array of email address strings
 * @param subject - Email subject line
 * @param html - Rendered HTML string (same for all recipients)
 * @param options - Additional options (replyTo, tags, etc.)
 *
 * @example
 * const result = await sendBulkEmail({
 *   recipients: ['a@b.com', 'c@d.com'],
 *   subject: 'Hirdetmény',
 *   html: announcementHtml,
 * });
 */
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
  const result: BulkSendResult = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  if (recipients.length === 0) return result;

  // Split into chunks to respect Resend rate limits
  const chunks: string[][] = [];
  for (let i = 0; i < recipients.length; i += BULK_CHUNK_SIZE) {
    chunks.push(recipients.slice(i, i + BULK_CHUNK_SIZE));
  }

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];

    const sends = await Promise.allSettled(
      chunk.map(to => sendEmail({ to, subject, html, replyTo, tags }))
    );

    for (let i = 0; i < sends.length; i++) {
      const sendResult = sends[i];
      if (sendResult.status === 'fulfilled' && sendResult.value.success) {
        result.sent++;
      } else {
        result.failed++;
        const error = sendResult.status === 'rejected'
          ? String(sendResult.reason)
          : sendResult.value.error ?? 'Unknown error';
        result.errors.push({ to: chunk[i], error });
      }
    }

    // Delay between chunks to respect rate limits (skip delay after last chunk)
    if (chunkIdx < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, BULK_CHUNK_DELAY_MS));
    }
  }

  return result;
}

// ─── renderEmailTemplate ──────────────────────────────────────────────────────

/**
 * Renders a React Email component to an HTML string.
 * Import this wherever you need to convert a React Email template to HTML.
 *
 * @example
 * import { renderEmailTemplate } from '@/lib/email';
 * import { AnnouncementEmail } from '@/lib/email-templates/announcement';
 *
 * const html = await renderEmailTemplate(
 *   <AnnouncementEmail title="Vízveszteség" content="..." buildingName="Napfény ház" />
 * );
 */
export async function renderEmailTemplate(element: React.ReactElement): Promise<string> {
  // @react-email/render provides the render function that converts React Email components to HTML
  const { render } = await import('@react-email/render');
  return render(element);
}

// ─── generateUnsubscribeUrl ────────────────────────────────────────────────────

/**
 * Generates a secure unsubscribe URL for inclusion in emails.
 * The token is the profile's unsubscribe_token (UUID).
 *
 * @example
 * const url = generateUnsubscribeUrl('550e8400-e29b-41d4-a716-446655440000');
 * // Returns: https://app.panellako.hu/api/email/unsubscribe?token=550e8400-e29b-41d4-a716-446655440000
 */
export function generateUnsubscribeUrl(unsubscribeToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu';
  return `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}`;
}

// ─── isEmailEnabledForProfile ─────────────────────────────────────────────────

/**
 * Check whether a profile has email notifications enabled.
 * Use this before sending non-statutory emails.
 * For statutory emails (Ptk. 5:84, Ptk. 5:88), use notifications_statutory_email instead.
 */
export function isEmailEnabledForProfile(profile: {
  notifications_email?: boolean;
}): boolean {
  return profile.notifications_email !== false;
}
```

---

## 6. Phase 3 — Email Templates

Create the directory `lib/email-templates/`. Create each of the following 5 files.

### 6.1 `lib/email-templates/announcement.tsx`

```typescript
// lib/email-templates/announcement.tsx
// Template for building announcements sent to all residents.

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Button,
} from '@react-email/components';
import * as React from 'react';

interface AnnouncementEmailProps {
  buildingName: string;
  buildingAddress: string;
  announcementTitle: string;
  announcementContent: string;
  category?: string;
  senderName: string;
  unsubscribeUrl: string;
  dashboardUrl?: string;
}

const categoryLabels: Record<string, string> = {
  tarsashazi_kozlony: '📋 Társasházi közlöny',
  keruleti_hir: '🏙️ Kerületi hír',
  uzemeltetes: '🔧 Üzemeltetés',
  biztonsag: '🔒 Biztonság',
  egyeb: '📌 Hirdetmény',
};

export function AnnouncementEmail({
  buildingName,
  buildingAddress,
  announcementTitle,
  announcementContent,
  category = 'egyeb',
  senderName,
  unsubscribeUrl,
  dashboardUrl = 'https://app.panellako.hu',
}: AnnouncementEmailProps) {
  const categoryLabel = categoryLabels[category] ?? '📌 Hirdetmény';
  const previewText = `${buildingName}: ${announcementTitle}`;

  return (
    <Html lang="hu" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', marginTop: '20px', marginBottom: '20px' }}>

          {/* Header */}
          <Section style={{ backgroundColor: '#1e3a5f', padding: '24px 32px' }}>
            <Text style={{ color: '#ffffff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
              PanelLakó
            </Text>
            <Text style={{ color: '#a0c4e8', fontSize: '13px', margin: '4px 0 0 0' }}>
              Társasházi kezelő platform
            </Text>
          </Section>

          {/* Building identifier */}
          <Section style={{ backgroundColor: '#eef2f7', padding: '12px 32px', borderBottom: '1px solid #dde3ed' }}>
            <Text style={{ margin: 0, fontSize: '13px', color: '#555' }}>
              🏢 <strong>{buildingName}</strong> — {buildingAddress}
            </Text>
          </Section>

          {/* Category badge */}
          <Section style={{ padding: '20px 32px 0 32px' }}>
            <Text style={{
              display: 'inline-block',
              backgroundColor: '#e8f0fe',
              color: '#1e3a5f',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '4px 12px',
              borderRadius: '12px',
              margin: 0,
            }}>
              {categoryLabel}
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ padding: '16px 32px 24px 32px' }}>
            <Heading as="h1" style={{ fontSize: '20px', color: '#1e3a5f', margin: '0 0 16px 0', lineHeight: '1.3' }}>
              {announcementTitle}
            </Heading>
            <Text style={{ fontSize: '15px', color: '#333', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {announcementContent}
            </Text>
          </Section>

          {/* CTA */}
          <Section style={{ padding: '0 32px 24px 32px' }}>
            <Button
              href={dashboardUrl}
              style={{
                backgroundColor: '#1e3a5f',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Megnyitás a PanelLakóban
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e0e0e0', margin: '0 32px' }} />

          {/* Footer */}
          <Section style={{ padding: '16px 32px 24px 32px' }}>
            <Text style={{ fontSize: '13px', color: '#555', margin: '0 0 4px 0' }}>
              Feladó: <strong>{senderName}</strong>
            </Text>
            <Text style={{ fontSize: '12px', color: '#888', margin: '8px 0 0 0' }}>
              Ez az üzenet automatikusan lett kiküldve a PanelLakó rendszer által.
              Ha nem szeretne több hirdetményt kapni e-mailben,{' '}
              <Link href={unsubscribeUrl} style={{ color: '#1e3a5f' }}>
                kattintson ide a leiratkozáshoz
              </Link>
              .
            </Text>
            <Text style={{ fontSize: '11px', color: '#aaa', marginTop: '8px' }}>
              © {new Date().getFullYear()} PanelLakó — Minden jog fenntartva.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default AnnouncementEmail;
```

### 6.2 `lib/email-templates/ticket-update.tsx`

```typescript
// lib/email-templates/ticket-update.tsx
// Sent to the ticket reporter when ticket status changes.

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Button,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

interface TicketUpdateEmailProps {
  recipientName: string;
  ticketTitle: string;
  ticketLocation: string;
  ticketPriority: string;
  oldStatus: string;
  newStatus: string;
  buildingName: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  uj:           { label: 'Új',           color: '#1e40af', bg: '#dbeafe' },
  folyamatban:  { label: 'Folyamatban',  color: '#065f46', bg: '#d1fae5' },
  varakozik:    { label: 'Várakozik',    color: '#92400e', bg: '#fef3c7' },
  lezarva:      { label: 'Lezárva',      color: '#374151', bg: '#f3f4f6' },
};

const priorityLabels: Record<string, string> = {
  alacsony: 'Alacsony',
  kozepes:  'Közepes',
  magas:    'Magas',
  kritikus: 'Kritikus ⚠️',
};

export function TicketUpdateEmail({
  recipientName,
  ticketTitle,
  ticketLocation,
  ticketPriority,
  oldStatus,
  newStatus,
  buildingName,
  dashboardUrl,
  unsubscribeUrl,
}: TicketUpdateEmailProps) {
  const newStatusInfo = statusLabels[newStatus] ?? { label: newStatus, color: '#333', bg: '#f3f4f6' };
  const oldStatusInfo = statusLabels[oldStatus] ?? { label: oldStatus, color: '#333', bg: '#f3f4f6' };

  return (
    <Html lang="hu" dir="ltr">
      <Head />
      <Preview>Bejelentés frissítve: {ticketTitle}</Preview>
      <Body style={{ backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '20px auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>

          {/* Header */}
          <Section style={{ backgroundColor: '#1e3a5f', padding: '24px 32px' }}>
            <Text style={{ color: '#ffffff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>PanelLakó</Text>
            <Text style={{ color: '#a0c4e8', fontSize: '13px', margin: '4px 0 0 0' }}>Bejelentés frissítés</Text>
          </Section>

          {/* Building */}
          <Section style={{ backgroundColor: '#eef2f7', padding: '12px 32px', borderBottom: '1px solid #dde3ed' }}>
            <Text style={{ margin: 0, fontSize: '13px', color: '#555' }}>
              🏢 <strong>{buildingName}</strong>
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ padding: '24px 32px' }}>
            <Text style={{ fontSize: '15px', color: '#333', margin: '0 0 16px 0' }}>
              Kedves <strong>{recipientName}</strong>!
            </Text>
            <Text style={{ fontSize: '15px', color: '#333', margin: '0 0 20px 0' }}>
              Az Ön bejelentésének státusza megváltozott.
            </Text>

            {/* Ticket info box */}
            <Section style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px' }}>
              <Heading as="h2" style={{ fontSize: '16px', color: '#1e3a5f', margin: '0 0 12px 0' }}>
                {ticketTitle}
              </Heading>
              <Row>
                <Column>
                  <Text style={{ fontSize: '12px', color: '#888', margin: '0 0 2px 0' }}>Helyszín</Text>
                  <Text style={{ fontSize: '13px', color: '#333', margin: 0 }}>{ticketLocation}</Text>
                </Column>
                <Column>
                  <Text style={{ fontSize: '12px', color: '#888', margin: '0 0 2px 0' }}>Prioritás</Text>
                  <Text style={{ fontSize: '13px', color: '#333', margin: 0 }}>
                    {priorityLabels[ticketPriority] ?? ticketPriority}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Status change */}
            <Row style={{ marginBottom: '20px' }}>
              <Column style={{ width: '40%', textAlign: 'center' as const }}>
                <Text style={{ fontSize: '11px', color: '#888', margin: '0 0 6px 0' }}>Korábbi státusz</Text>
                <Text style={{
                  display: 'inline-block',
                  backgroundColor: oldStatusInfo.bg,
                  color: oldStatusInfo.color,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}>
                  {oldStatusInfo.label}
                </Text>
              </Column>
              <Column style={{ width: '20%', textAlign: 'center' as const }}>
                <Text style={{ fontSize: '20px', color: '#888', margin: '18px 0 0 0' }}>→</Text>
              </Column>
              <Column style={{ width: '40%', textAlign: 'center' as const }}>
                <Text style={{ fontSize: '11px', color: '#888', margin: '0 0 6px 0' }}>Új státusz</Text>
                <Text style={{
                  display: 'inline-block',
                  backgroundColor: newStatusInfo.bg,
                  color: newStatusInfo.color,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}>
                  {newStatusInfo.label}
                </Text>
              </Column>
            </Row>

            <Button
              href={dashboardUrl}
              style={{
                backgroundColor: '#1e3a5f',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              Részletek megtekintése
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e0e0e0', margin: '0 32px' }} />

          {/* Footer */}
          <Section style={{ padding: '16px 32px 24px 32px' }}>
            <Text style={{ fontSize: '12px', color: '#888', margin: 0 }}>
              Ha nem szeretne értesítést kapni bejelentés frissítésekről,{' '}
              <Link href={unsubscribeUrl} style={{ color: '#1e3a5f' }}>leiratkozhat itt</Link>.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default TicketUpdateEmail;
```

### 6.3 `lib/email-templates/assembly-invitation.tsx`

```typescript
// lib/email-templates/assembly-invitation.tsx
// Ptk. 5:84 compliant assembly invitation.
// Must include: date, time, location, and COMPLETE agenda item list.
// Must be sent at least 8 days before the meeting.

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Button,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

interface AgendaItemEmailData {
  order_no: number;
  title: string;
  description?: string | null;
}

interface AssemblyInvitationEmailProps {
  recipientName: string;
  buildingName: string;
  buildingAddress: string;
  meetingTitle: string;
  meetingDate: string;      // Human-readable Hungarian date: "2026. június 15., hétfő"
  meetingTime: string;      // "18:00"
  meetingLocation: string;
  agendaItems: AgendaItemEmailData[];
  senderName: string;       // kozos_kepviselo name
  daysUntilMeeting: number;
  unsubscribeUrl: string;
  dashboardUrl: string;
  legalNoticeText?: string; // Custom legal notice, defaults to standard Ptk. 5:84 notice
}

export function AssemblyInvitationEmail({
  recipientName,
  buildingName,
  buildingAddress,
  meetingTitle,
  meetingDate,
  meetingTime,
  meetingLocation,
  agendaItems,
  senderName,
  daysUntilMeeting,
  unsubscribeUrl,
  dashboardUrl,
  legalNoticeText,
}: AssemblyInvitationEmailProps) {
  const legalNotice = legalNoticeText ??
    `E meghívót a Polgári Törvénykönyvről szóló 2013. évi V. törvény 5:84. § (1) bekezdése alapján küldjük. ` +
    `A társasházi közgyűlés összehívásáról legalább 8 nappal a megtartása előtt kell értesíteni a tulajdonostársakat. ` +
    `A meghívó kézbesítésének napja: ${new Date().toLocaleDateString('hu-HU')} (${daysUntilMeeting} nappal a közgyűlés előtt).`;

  const lateWarning = daysUntilMeeting < 8;

  return (
    <Html lang="hu" dir="ltr">
      <Head />
      <Preview>Közgyűlési meghívó: {meetingTitle} — {meetingDate}</Preview>
      <Body style={{ backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '20px auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>

          {/* Header */}
          <Section style={{ backgroundColor: '#1e3a5f', padding: '24px 32px' }}>
            <Text style={{ color: '#ffffff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>PanelLakó</Text>
            <Text style={{ color: '#a0c4e8', fontSize: '13px', margin: '4px 0 0 0' }}>Közgyűlési Meghívó</Text>
          </Section>

          {/* Building */}
          <Section style={{ backgroundColor: '#eef2f7', padding: '12px 32px', borderBottom: '1px solid #dde3ed' }}>
            <Text style={{ margin: 0, fontSize: '13px', color: '#555' }}>
              🏢 <strong>{buildingName}</strong> — {buildingAddress}
            </Text>
          </Section>

          {/* Late warning (Ptk. 5:84 violation) */}
          {lateWarning && (
            <Section style={{ backgroundColor: '#fef3c7', padding: '12px 32px', borderBottom: '1px solid #fbbf24' }}>
              <Text style={{ margin: 0, fontSize: '13px', color: '#92400e', fontWeight: 'bold' }}>
                ⚠️ FIGYELEM: Ez a meghívó a közgyűlés előtt {daysUntilMeeting} nappal kerül kézbesítésre. A Ptk. 5:84 § minimum 8 napos értesítési időt ír elő.
              </Text>
            </Section>
          )}

          {/* Content */}
          <Section style={{ padding: '24px 32px' }}>
            <Text style={{ fontSize: '15px', color: '#333', margin: '0 0 20px 0' }}>
              Tisztelt <strong>{recipientName}</strong>!
            </Text>
            <Text style={{ fontSize: '15px', color: '#333', margin: '0 0 8px 0' }}>
              Értesítjük, hogy a(z) <strong>{buildingName}</strong> társasház
            </Text>

            <Heading as="h1" style={{ fontSize: '20px', color: '#1e3a5f', margin: '0 0 20px 0', lineHeight: '1.3' }}>
              {meetingTitle}
            </Heading>

            {/* Meeting details box */}
            <Section style={{ backgroundColor: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
              <Row style={{ marginBottom: '8px' }}>
                <Column style={{ width: '120px' }}>
                  <Text style={{ fontSize: '12px', color: '#888', margin: 0 }}>📅 Időpont</Text>
                </Column>
                <Column>
                  <Text style={{ fontSize: '14px', color: '#1e3a5f', fontWeight: 'bold', margin: 0 }}>
                    {meetingDate}, {meetingTime} óra
                  </Text>
                </Column>
              </Row>
              <Row>
                <Column style={{ width: '120px' }}>
                  <Text style={{ fontSize: '12px', color: '#888', margin: 0 }}>📍 Helyszín</Text>
                </Column>
                <Column>
                  <Text style={{ fontSize: '14px', color: '#1e3a5f', fontWeight: 'bold', margin: 0 }}>
                    {meetingLocation}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Agenda */}
            <Heading as="h2" style={{ fontSize: '16px', color: '#1e3a5f', margin: '0 0 12px 0' }}>
              Napirendi pontok
            </Heading>
            {agendaItems.map((item, idx) => (
              <Section
                key={idx}
                style={{
                  borderLeft: '3px solid #1e3a5f',
                  paddingLeft: '12px',
                  marginBottom: '10px',
                }}
              >
                <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a5f', margin: '0 0 2px 0' }}>
                  {item.order_no}. {item.title}
                </Text>
                {item.description && (
                  <Text style={{ fontSize: '13px', color: '#555', margin: 0 }}>
                    {item.description}
                  </Text>
                )}
              </Section>
            ))}

            <Text style={{ fontSize: '14px', color: '#333', margin: '20px 0 8px 0' }}>
              Kérjük, hogy megjelenni szíveskedjék. Amennyiben személyesen nem tud részt venni, meghatalmazott útján is képviseltetheti magát (írásos meghatalmazás szükséges).
            </Text>

            <Button
              href={dashboardUrl}
              style={{
                backgroundColor: '#1e3a5f',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-block',
                marginTop: '16px',
              }}
            >
              Megtekintés a PanelLakóban
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e0e0e0', margin: '0 32px' }} />

          {/* Sender */}
          <Section style={{ padding: '16px 32px' }}>
            <Text style={{ fontSize: '13px', color: '#555', margin: '0 0 4px 0' }}>
              Tisztelettel,
            </Text>
            <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', margin: 0 }}>
              {senderName}
            </Text>
            <Text style={{ fontSize: '12px', color: '#888', margin: '2px 0 0 0' }}>
              Közös képviselő — {buildingName}
            </Text>
          </Section>

          <Hr style={{ borderColor: '#e0e0e0', margin: '0 32px' }} />

          {/* Legal notice */}
          <Section style={{ padding: '16px 32px 24px 32px', backgroundColor: '#f8f9fa' }}>
            <Text style={{ fontSize: '11px', color: '#888', margin: '0 0 8px 0', fontStyle: 'italic' }}>
              {legalNotice}
            </Text>
            <Text style={{ fontSize: '11px', color: '#aaa', margin: 0 }}>
              Ez egy kötelező jogi értesítés. A törvényi előírások miatt ez az e-mail akkor is megküldésre kerül, ha Ön korábban leiratkozott a hirdetményi e-mailekről.{' '}
              <Link href={unsubscribeUrl} style={{ color: '#1e3a5f' }}>Hirdetmény e-mailek leiratkozása</Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default AssemblyInvitationEmail;
```

### 6.4 `lib/email-templates/monthly-statement.tsx`

```typescript
// lib/email-templates/monthly-statement.tsx
// Monthly financial statement for a single unit.

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
  Button,
} from '@react-email/components';
import * as React from 'react';

interface FinanceLineItem {
  period: string;
  expected_amount: number;
  paid_amount: number;
  due_date: string;
  status: 'fizetve' | 'hátralék' | 'határidőn belül';
}

interface MonthlyStatementEmailProps {
  recipientName: string;
  unitLabel: string;
  buildingName: string;
  buildingAddress: string;
  statementPeriod: string;     // e.g. "2026. május"
  balanceAmount: number;       // current balance (positive = credit, negative = debt)
  lineItems: FinanceLineItem[];
  dashboardUrl: string;
  unsubscribeUrl: string;
}

function formatHUF(amount: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MonthlyStatementEmail({
  recipientName,
  unitLabel,
  buildingName,
  buildingAddress,
  statementPeriod,
  balanceAmount,
  lineItems,
  dashboardUrl,
  unsubscribeUrl,
}: MonthlyStatementEmailProps) {
  const isDebt = balanceAmount < 0;
  const balanceColor = isDebt ? '#dc2626' : '#059669';
  const balanceBg = isDebt ? '#fee2e2' : '#d1fae5';

  return (
    <Html lang="hu" dir="ltr">
      <Head />
      <Preview>Havi kimutatás {statementPeriod}: {unitLabel} — {buildingName}</Preview>
      <Body style={{ backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '20px auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>

          {/* Header */}
          <Section style={{ backgroundColor: '#1e3a5f', padding: '24px 32px' }}>
            <Text style={{ color: '#ffffff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>PanelLakó</Text>
            <Text style={{ color: '#a0c4e8', fontSize: '13px', margin: '4px 0 0 0' }}>Havi pénzügyi kimutatás — {statementPeriod}</Text>
          </Section>

          {/* Building + Unit */}
          <Section style={{ backgroundColor: '#eef2f7', padding: '12px 32px', borderBottom: '1px solid #dde3ed' }}>
            <Row>
              <Column>
                <Text style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                  🏢 <strong>{buildingName}</strong> — {buildingAddress}
                </Text>
              </Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                  🚪 Albetét: <strong>{unitLabel}</strong>
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Balance summary */}
          <Section style={{ padding: '24px 32px' }}>
            <Text style={{ fontSize: '15px', color: '#333', margin: '0 0 20px 0' }}>
              Kedves <strong>{recipientName}</strong>!
            </Text>
            <Text style={{ fontSize: '14px', color: '#555', margin: '0 0 12px 0' }}>
              Az alábbiakban megtalálja a(z) <strong>{statementPeriod}</strong> időszakra vonatkozó pénzügyi kimutatását.
            </Text>

            {/* Balance box */}
            <Section style={{
              backgroundColor: balanceBg,
              border: `1px solid ${balanceColor}`,
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '24px',
              textAlign: 'center' as const,
            }}>
              <Text style={{ fontSize: '13px', color: balanceColor, fontWeight: 'bold', margin: '0 0 4px 0' }}>
                {isDebt ? '⚠️ Tartozás' : '✅ Egyenleg (jóváírás)'}
              </Text>
              <Text style={{ fontSize: '28px', fontWeight: 'bold', color: balanceColor, margin: 0 }}>
                {formatHUF(Math.abs(balanceAmount))}
              </Text>
              {isDebt && (
                <Text style={{ fontSize: '12px', color: '#991b1b', margin: '6px 0 0 0' }}>
                  Kérjük, rendezze tartozását a legközelebbi esedékességig.
                </Text>
              )}
            </Section>

            {/* Line items table */}
            {lineItems.length > 0 && (
              <>
                <Heading as="h2" style={{ fontSize: '15px', color: '#1e3a5f', margin: '0 0 12px 0' }}>
                  Tételek
                </Heading>
                <Section style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  {/* Table header */}
                  <Row style={{ backgroundColor: '#1e3a5f', padding: '8px 12px' }}>
                    <Column style={{ width: '30%' }}>
                      <Text style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', margin: 0 }}>Időszak</Text>
                    </Column>
                    <Column style={{ width: '25%' }}>
                      <Text style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', margin: 0 }}>Előírás</Text>
                    </Column>
                    <Column style={{ width: '25%' }}>
                      <Text style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', margin: 0 }}>Befizetés</Text>
                    </Column>
                    <Column style={{ width: '20%' }}>
                      <Text style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', margin: 0 }}>Státusz</Text>
                    </Column>
                  </Row>
                  {lineItems.map((item, idx) => (
                    <Row
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        borderTop: '1px solid #e2e8f0',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <Column style={{ width: '30%' }}>
                        <Text style={{ fontSize: '12px', color: '#333', margin: 0 }}>{item.period}</Text>
                      </Column>
                      <Column style={{ width: '25%' }}>
                        <Text style={{ fontSize: '12px', color: '#333', margin: 0 }}>{formatHUF(item.expected_amount)}</Text>
                      </Column>
                      <Column style={{ width: '25%' }}>
                        <Text style={{ fontSize: '12px', color: '#333', margin: 0 }}>{formatHUF(item.paid_amount)}</Text>
                      </Column>
                      <Column style={{ width: '20%' }}>
                        <Text style={{
                          fontSize: '11px',
                          color: item.status === 'fizetve' ? '#059669' : item.status === 'hátralék' ? '#dc2626' : '#d97706',
                          fontWeight: 'bold',
                          margin: 0,
                        }}>
                          {item.status === 'fizetve' ? '✓ Fizetve' : item.status === 'hátralék' ? '✗ Hátralék' : '⏳ Esedékes'}
                        </Text>
                      </Column>
                    </Row>
                  ))}
                </Section>
              </>
            )}

            <Button
              href={dashboardUrl}
              style={{
                backgroundColor: '#1e3a5f',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                textDecoration: 'none',
                marginTop: '20px',
                display: 'inline-block',
              }}
            >
              Részletes kimutatás megtekintése
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e0e0e0', margin: '0 32px' }} />

          {/* Footer */}
          <Section style={{ padding: '16px 32px 24px 32px' }}>
            <Text style={{ fontSize: '12px', color: '#888', margin: 0 }}>
              Ha nem szeretne havi pénzügyi kimutatást kapni e-mailben,{' '}
              <Link href={unsubscribeUrl} style={{ color: '#1e3a5f' }}>kattintson ide</Link>.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default MonthlyStatementEmail;
```

### 6.5 `lib/email-templates/document-share.tsx`

```typescript
// lib/email-templates/document-share.tsx
// Notifies residents when a new building document is uploaded.

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Button,
} from '@react-email/components';
import * as React from 'react';

interface DocumentShareEmailProps {
  recipientName: string;
  buildingName: string;
  documentTitle: string;
  documentCategory: string;
  documentVersion: string;
  uploadedAt: string;          // Human-readable Hungarian date
  downloadUrl: string;         // Direct download URL or dashboard URL
  requiresAcknowledgement: boolean;
  unsubscribeUrl: string;
}

const categoryLabels: Record<string, string> = {
  'Közgyűlési anyag': '📋 Közgyűlési anyag',
  'Pénzügyi dokumentum': '💰 Pénzügyi dokumentum',
  'Műszaki dokumentum': '🔧 Műszaki dokumentum',
  'Jogi dokumentum': '⚖️ Jogi dokumentum',
  'Biztosítási dokumentum': '🛡️ Biztosítási dokumentum',
  'Házirendek': '📜 Házirendek',
};

export function DocumentShareEmail({
  recipientName,
  buildingName,
  documentTitle,
  documentCategory,
  documentVersion,
  uploadedAt,
  downloadUrl,
  requiresAcknowledgement,
  unsubscribeUrl,
}: DocumentShareEmailProps) {
  const categoryLabel = categoryLabels[documentCategory] ?? `📄 ${documentCategory}`;

  return (
    <Html lang="hu" dir="ltr">
      <Head />
      <Preview>Új dokumentum: {documentTitle} — {buildingName}</Preview>
      <Body style={{ backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '20px auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>

          {/* Header */}
          <Section style={{ backgroundColor: '#1e3a5f', padding: '24px 32px' }}>
            <Text style={{ color: '#ffffff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>PanelLakó</Text>
            <Text style={{ color: '#a0c4e8', fontSize: '13px', margin: '4px 0 0 0' }}>Új dokumentum értesítés</Text>
          </Section>

          {/* Building */}
          <Section style={{ backgroundColor: '#eef2f7', padding: '12px 32px', borderBottom: '1px solid #dde3ed' }}>
            <Text style={{ margin: 0, fontSize: '13px', color: '#555' }}>
              🏢 <strong>{buildingName}</strong>
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ padding: '24px 32px' }}>
            <Text style={{ fontSize: '15px', color: '#333', margin: '0 0 20px 0' }}>
              Kedves <strong>{recipientName}</strong>!
            </Text>
            <Text style={{ fontSize: '14px', color: '#555', margin: '0 0 20px 0' }}>
              Új dokumentum érkezett a társasház dokumentumtárába.
            </Text>

            {/* Document card */}
            <Section style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px' }}>
              <Text style={{ fontSize: '11px', color: '#888', margin: '0 0 6px 0', display: 'inline-block', backgroundColor: '#e8f0fe', padding: '3px 10px', borderRadius: '10px' }}>
                {categoryLabel}
              </Text>
              <Heading as="h2" style={{ fontSize: '16px', color: '#1e3a5f', margin: '8px 0 8px 0' }}>
                {documentTitle}
              </Heading>
              <Text style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                Verzió: {documentVersion} | Feltöltve: {uploadedAt}
              </Text>
            </Section>

            {requiresAcknowledgement && (
              <Section style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px' }}>
                <Text style={{ fontSize: '13px', color: '#92400e', margin: 0, fontWeight: 'bold' }}>
                  ⚠️ Ez a dokumentum átvételi elismervényt igényel. Kérjük, nyissa meg a PanelLakó rendszerben és erősítse meg a megtekintést.
                </Text>
              </Section>
            )}

            <Button
              href={downloadUrl}
              style={{
                backgroundColor: '#1e3a5f',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              {requiresAcknowledgement ? 'Megtekintés és visszaigazolás' : 'Dokumentum megtekintése'}
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e0e0e0', margin: '0 32px' }} />

          {/* Footer */}
          <Section style={{ padding: '16px 32px 24px 32px' }}>
            <Text style={{ fontSize: '12px', color: '#888', margin: 0 }}>
              Ha nem szeretne dokumentum értesítőt kapni e-mailben,{' '}
              <Link href={unsubscribeUrl} style={{ color: '#1e3a5f' }}>leiratkozhat itt</Link>.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DocumentShareEmail;
```

---

## 7. Phase 4 — Wire Announcements to Email

Update `app/actions/announcements.ts` to send emails after creating an announcement:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sendBulkEmail, renderEmailTemplate, generateUnsubscribeUrl } from '@/lib/email';
import { AnnouncementEmail } from '@/lib/email-templates/announcement';
import React from 'react';

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  target_group: string;
  category?: string;
  building_id?: string;
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  // 1. Insert announcement
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title: input.title,
      content: input.content,
      target_group: input.target_group,
      category: input.category ?? 'egyeb',
      building_id: input.building_id ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // 2. Send email notifications (non-blocking — do not await in the response path)
  if (input.building_id) {
    // Fire and forget — use void to explicitly discard the promise
    void sendAnnouncementEmails({
      announcementId: data.id,
      buildingId: input.building_id,
      title: input.title,
      content: input.content,
      category: input.category ?? 'egyeb',
      senderUserId: user.id,
    });
  }

  revalidatePath('/');
  return { success: true, data };
}

// ─── Private helper: fan-out email to building members ────────────────────────

async function sendAnnouncementEmails({
  announcementId,
  buildingId,
  title,
  content,
  category,
  senderUserId,
}: {
  announcementId: string;
  buildingId: string;
  title: string;
  content: string;
  category: string;
  senderUserId: string;
}) {
  const supabase = createClient();

  // Fetch building info
  const { data: building } = await supabase
    .from('buildings')
    .select('name, address')
    .eq('id', buildingId)
    .single();

  if (!building) return;

  // Fetch sender name
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', senderUserId)
    .single();

  // Fetch all active members with email notifications enabled
  const { data: members } = await supabase
    .from('memberships')
    .select('profiles(email, full_name, notifications_email, unsubscribe_token)')
    .eq('building_id', buildingId)
    .eq('active', true);

  if (!members || members.length === 0) return;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu'}`;

  // Build recipient list (filter out opted-out users)
  const recipientsWithContext = (members as any[])
    .map(m => m.profiles)
    .filter(p => p?.email && p?.notifications_email !== false);

  if (recipientsWithContext.length === 0) return;

  // Render the template once (same HTML for all recipients)
  // For personalized unsubscribe links, we need per-recipient rendering
  // Use Promise.allSettled for parallel per-recipient rendering + sending
  const emailSends = recipientsWithContext.map(async (profile: any) => {
    const unsubscribeUrl = generateUnsubscribeUrl(profile.unsubscribe_token);
    const html = await renderEmailTemplate(
      React.createElement(AnnouncementEmail, {
        buildingName: building.name,
        buildingAddress: building.address,
        announcementTitle: title,
        announcementContent: content,
        category,
        senderName: senderProfile?.full_name ?? 'Közös képviselő',
        unsubscribeUrl,
        dashboardUrl,
      })
    );
    return { email: profile.email as string, html };
  });

  const rendered = await Promise.allSettled(emailSends);
  const validEmails = rendered
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<{ email: string; html: string }>).value);

  // Send emails (chunked bulk send)
  // Since each email has a unique unsubscribe URL, send individually
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const sendResults = await Promise.allSettled(
    validEmails.map(({ email, html }) =>
      resend.emails.send({
        from: 'no-reply@panellako.hu',
        to: email,
        subject: `Hirdetmény: ${title} — ${building.name}`,
        html,
        tags: [
          { name: 'type', value: 'announcement' },
          { name: 'building_id', value: buildingId },
        ],
      })
    )
  );

  // Log results to audit_logs
  const sentCount = sendResults.filter(r => r.status === 'fulfilled').length;
  await supabase.from('audit_logs').insert({
    actor_id: senderUserId,
    actor_name: senderProfile?.full_name ?? 'Rendszer',
    action_type: 'bulk_email_sent',
    entity_type: 'announcement',
    entity_id: announcementId,
    entity_label: `Hirdetmény e-mail: ${title} → ${sentCount}/${recipientsWithContext.length} sikeres`,
  });
}
```

---

## 8. Phase 5 — Wire Ticket Updates to Email

Update `app/actions/tickets.ts` to send ticket status change emails:

```typescript
// Add to the existing updateTicketStatus function after the successful update:

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  // Fetch ticket with previous status and reporter info
  const { data: ticket } = await supabase
    .from('tickets')
    .select('title, location, priority, status, reporter_id, building_id, profiles!reporter_id(email, full_name, notifications_email, unsubscribe_token)')
    .eq('id', ticketId)
    .single();

  if (!ticket) {
    return { success: false, error: 'Bejelentés nem található' };
  }

  const oldStatus = ticket.status;

  const { error } = await supabase
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Send notification email to the reporter (non-blocking)
  const reporter = (ticket as any).profiles;
  if (reporter?.email && reporter?.notifications_email !== false && oldStatus !== status) {
    void (async () => {
      try {
        const { renderEmailTemplate, sendEmail, generateUnsubscribeUrl } = await import('@/lib/email');
        const { TicketUpdateEmail } = await import('@/lib/email-templates/ticket-update');
        const React = (await import('react')).default;

        const building = await supabase
          .from('buildings')
          .select('name')
          .eq('id', ticket.building_id)
          .single();

        const html = await renderEmailTemplate(
          React.createElement(TicketUpdateEmail, {
            recipientName: reporter.full_name ?? 'Tulajdonos',
            ticketTitle: ticket.title,
            ticketLocation: ticket.location,
            ticketPriority: ticket.priority,
            oldStatus: oldStatus,
            newStatus: status,
            buildingName: building.data?.name ?? 'Társasház',
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu'}`,
            unsubscribeUrl: generateUnsubscribeUrl(reporter.unsubscribe_token),
          })
        );

        await sendEmail({
          to: reporter.email,
          subject: `Bejelentés frissítve: ${ticket.title}`,
          html,
          tags: [{ name: 'type', value: 'ticket_update' }],
        });
      } catch (e) {
        console.error('[ticket email] Error sending ticket update email:', e);
      }
    })();
  }

  revalidatePath('/');
  return { success: true };
}
```

---

## 9. Phase 6 — Assembly Invitation Email Action

This is implemented in `app/actions/meetings.ts` as `sendAssemblyInvitation` (see Dev Prompt #9, Phase 2). The key difference from the stub there is that once `lib/email.ts` exists, replace the inline HTML with the proper React Email template:

```typescript
// In sendAssemblyInvitation, replace the inline invitationHtml with:
import { renderEmailTemplate, sendEmail, generateUnsubscribeUrl } from '@/lib/email';
import { AssemblyInvitationEmail } from '@/lib/email-templates/assembly-invitation';
import React from 'react';

// ...inside the loop:
const unsubscribeUrl = generateUnsubscribeUrl(profile.unsubscribe_token);
const html = await renderEmailTemplate(
  React.createElement(AssemblyInvitationEmail, {
    recipientName: profile.full_name ?? 'Tulajdonos',
    buildingName: building.name,
    buildingAddress: building.address,
    meetingTitle: meeting.title,
    meetingDate: new Date(meeting.scheduled_at).toLocaleDateString('hu-HU', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    }),
    meetingTime: new Date(meeting.scheduled_at).toLocaleTimeString('hu-HU', {
      hour: '2-digit', minute: '2-digit'
    }),
    meetingLocation: meeting.location ?? 'Meghatározandó',
    agendaItems: agendaItems ?? [],
    senderName: senderProfile?.full_name ?? 'Közös képviselő',
    daysUntilMeeting: Math.floor(daysUntilMeeting),
    unsubscribeUrl,
    dashboardUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu',
  })
);
await sendEmail({ to: profile.email, subject: `Közgyűlési Meghívó: ${meeting.title}`, html });
```

---

## 10. Phase 7 — Monthly Statement Automation

Create a Supabase Edge Function `send-monthly-statements` that runs on the 1st of each month. Configure via Supabase CRON (`pg_cron`):

```sql
-- Schedule monthly statement emails on the 1st of each month at 09:00 HU time (08:00 UTC)
SELECT cron.schedule(
  'monthly-statements',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-monthly-statements',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
```

The Edge Function `supabase/functions/send-monthly-statements/index.ts` should:
1. Fetch all buildings
2. For each building, fetch all unit owners with `notifications_email = true`
3. For each owner, fetch their finance_entries for the current month
4. Render `MonthlyStatementEmail` and send via Resend
5. Log sends to `audit_logs`

---

## 11. Phase 8 — Email Preferences UI

Add an "Email értesítések" toggle to the user settings panel in `components/dashboard-client.tsx`. The toggle should call a new Server Action:

```typescript
// app/actions/profile.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateEmailNotificationPreference(enabled: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve.' };

  const { error } = await supabase
    .from('profiles')
    .update({ notifications_email: enabled })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  return { success: true };
}
```

In the dashboard's settings section, add:
```tsx
<div className="flex items-center justify-between py-3 border-b border-gray-100">
  <div>
    <p className="text-sm font-medium text-gray-800">E-mail értesítések</p>
    <p className="text-xs text-gray-500">Hirdetmények és bejelentés frissítések e-mailben</p>
  </div>
  <button
    onClick={() => handleToggleEmailNotifications(!emailNotificationsEnabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      emailNotificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
    }`}
    aria-pressed={emailNotificationsEnabled}
    aria-label="Email értesítések kapcsoló"
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
      emailNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
    }`} />
  </button>
</div>
```

---

## 12. Phase 9 — Email Delivery Tracking via Resend Webhook

Create `app/api/resend/webhook/route.ts`:

```typescript
// app/api/resend/webhook/route.ts
// Handles Resend delivery webhook events: delivery, bounce, spam, etc.
// Configure the webhook URL in Resend dashboard: https://app.panellako.hu/api/resend/webhook
// Set the webhook signing secret in env: RESEND_WEBHOOK_SECRET=whsec_xxx

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Webhook } from 'svix';

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

interface ResendWebhookPayload {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    tags?: Array<{ name: string; value: string }>;
    bounce?: { message: string };
    reason?: string;
  };
}

export async function POST(req: NextRequest) {
  if (!RESEND_WEBHOOK_SECRET) {
    console.error('[resend/webhook] RESEND_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Verify webhook signature using svix
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 });
  }

  const rawBody = await req.text();
  let payload: ResendWebhookPayload;

  try {
    const wh = new Webhook(RESEND_WEBHOOK_SECRET);
    payload = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendWebhookPayload;
  } catch (e) {
    console.error('[resend/webhook] Signature verification failed:', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createClient();

  // Map Resend event type to audit log action_type
  const actionTypeMap: Record<string, string> = {
    'email.delivered':        'email_delivered',
    'email.bounced':          'email_bounced',
    'email.complained':       'email_spam',
    'email.delivery_delayed': 'email_delayed',
    'email.opened':           'email_opened',
    'email.clicked':          'email_clicked',
  };

  const actionType = actionTypeMap[payload.type] ?? payload.type;
  const toAddress = payload.data.to?.[0] ?? 'unknown';

  // Log to audit_logs
  await supabase.from('audit_logs').insert({
    actor_name: 'Resend Webhook',
    action_type: actionType,
    entity_type: 'email',
    entity_id: null,
    entity_label: `${payload.data.subject} → ${toAddress}`,
  });

  // If bounce: find the profile and log additional context
  if (payload.type === 'email.bounced') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', toAddress)
      .maybeSingle();

    console.warn(`[resend/webhook] Email bounced for ${toAddress}:`, payload.data.bounce?.message ?? payload.data.reason);

    if (profile) {
      await supabase.from('audit_logs').insert({
        actor_name: 'Resend Webhook',
        action_type: 'email_bounce_profile_flagged',
        entity_type: 'profile',
        entity_id: profile.id,
        entity_label: `E-mail visszapattant: ${toAddress} (${profile.full_name})`,
      });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
```

Install `svix` for webhook signature verification: `npm install svix`. Add `RESEND_WEBHOOK_SECRET` to `.env.local` and production env.

---

## 13. Phase 10 — Unsubscribe Endpoint

Create `app/api/email/unsubscribe/route.ts`:

```typescript
// app/api/email/unsubscribe/route.ts
// One-click unsubscribe endpoint. Linked from every email footer.
// URL format: /api/email/unsubscribe?token=<unsubscribe_token>
// Uses the service role client to bypass RLS and update the profile.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(
      renderPage('Érvénytelen leiratkozási link', 'A leiratkozási token hiányzik.', false),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Find profile by unsubscribe token
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, notifications_email')
    .eq('unsubscribe_token', token)
    .maybeSingle();

  if (error || !profile) {
    return new NextResponse(
      renderPage('Leiratkozás sikertelen', 'Érvénytelen leiratkozási token. Lehetséges, hogy ez a link már lejárt.', false),
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  if (profile.notifications_email === false) {
    // Already unsubscribed
    return new NextResponse(
      renderPage('Már leiratkozott', `A(z) ${profile.email} e-mail cím már le van iratkozva a PanelLakó értesítésekről.`, true),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Update the profile
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ notifications_email: false })
    .eq('id', profile.id);

  if (updateError) {
    return new NextResponse(
      renderPage('Leiratkozás sikertelen', 'Technikai hiba történt. Kérjük, próbálja újra.', false),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // Log to audit_logs
  await supabaseAdmin.from('audit_logs').insert({
    actor_name: profile.full_name ?? profile.email,
    action_type: 'email_unsubscribe',
    entity_type: 'profile',
    entity_id: profile.id,
    entity_label: `E-mail leiratkozás: ${profile.email}`,
  });

  return new NextResponse(
    renderPage(
      'Sikeres leiratkozás',
      `A(z) <strong>${profile.email}</strong> e-mail cím sikeresen le lett iratkozva a PanelLakó hirdetményi értesítésekről. ` +
      `Törvényi kötelezettség alapján küldött értesítők (pl. közgyűlési meghívó) ezután is megküldhetők.`,
      true
    ),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// Simple HTML page renderer (no React dependency in API routes)
function renderPage(title: string, message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — PanelLakó</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 40px 20px; }
    .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .icon { font-size: 48px; margin-bottom: 20px; }
    h1 { color: #1e3a5f; font-size: 22px; margin: 0 0 16px; }
    p { color: #555; font-size: 15px; line-height: 1.6; }
    a { color: #1e3a5f; }
    .footer { margin-top: 32px; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p><a href="https://app.panellako.hu">Vissza a PanelLakóhoz</a></p>
    <div class="footer">PanelLakó — Társasházi kezelő platform</div>
  </div>
</body>
</html>`;
}
```

---

## 14. Testing Checklist

Execute in order after implementation:

1. Verify `.env.local` contains `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` and `NEXT_PUBLIC_APP_URL`.
2. Verify the `panellako.hu` domain is verified in the Resend dashboard.
3. Run `npm run typecheck` — no TypeScript errors from the new files.
4. Send a test announcement as `kozos_kepviselo`. Verify the email is received by all `tulajdonos` members of the building with the correct HTML template (building name, content, unsubscribe link).
5. Change a ticket status from `uj` to `folyamatban`. Verify the reporter receives a ticket update email showing the status change badge.
6. Call `sendAssemblyInvitation` for a meeting with 3 agenda items. Verify the invitation email contains all 3 agenda items in the correct order, the meeting date/time/location, and the Ptk. 5:84 legal notice.
7. Click the unsubscribe link in an email. Verify the unsubscribe page renders, `profiles.notifications_email` is set to `false`, and an `email_unsubscribe` audit log entry is created.
8. Attempt to send an announcement after unsubscribing. Verify the unsubscribed user does NOT receive the email.
9. Test the Resend webhook by triggering a delivery event in the Resend dashboard (test mode). Verify the audit log entry is created.
10. Test the stub fallback: temporarily remove `RESEND_API_KEY` from `.env.local`, send an announcement, verify the console log shows `[EMAIL STUB — no RESEND_API_KEY]`.
11. Verify `app/api/resend/webhook/route.ts` rejects requests with invalid signatures (send a POST without Svix headers, expect 400).
12. Verify all 5 email templates render correctly in React Email preview: `npx react-email preview`.

---

## 15. Error Handling

| Error Scenario | Behavior |
|---|---|
| `RESEND_API_KEY` not set | `sendEmail` returns stub result with console log; no exception thrown; emails silently not sent |
| Domain not verified in Resend | Resend returns HTTP 422; `sendEmail` catches and returns `{ success: false, error: '...' }`; `sendBulkEmail` logs the failure without blocking other recipients |
| Bounced email | Resend webhook fires `email.bounced` event; `webhook/route.ts` logs to `audit_logs`; no automatic profile deactivation (manager must review) |
| Rate limit exceeded | `sendBulkEmail` chunks sends with 200ms delays; if still rate-limited, Resend returns 429; caught and logged; not retried automatically in this version |
| Template rendering failure | `renderEmailTemplate` throws; caught in the caller's try/catch; email not sent; logged to console |
| Invalid unsubscribe token | `GET /api/email/unsubscribe` returns 404 with a human-readable error page |
| `svix` verification failure | Webhook handler returns 400; no audit log entry; prevents replay attacks |
| `@react-email/render` import failure | Dynamic import in `renderEmailTemplate` throws; caught by caller; fallback to raw HTML string if available |

---

## 16. Cost Analysis — Resend at Scale

| Plan | Monthly Emails | Monthly Cost | Suitable For |
|---|---|---|---|
| Free | 3,000 | $0 | Development, up to ~5 buildings with monthly sends |
| Pro | 50,000 | $20 | Up to ~40 buildings with weekly announcements |
| Pro (100k) | 100,000 | $35 | Up to ~80 buildings |
| Scale | 200,000 | $90 | 100+ buildings |

Scenario: 100 buildings × 40 units = 4,000 recipients per announcement. One announcement per week = 16,000 emails/month. Plus assembly invitations (8/year × 4,000 = 32,000/year = ~2,700/month) and ticket updates (~500/month). Total: ~20,000 emails/month. The $20/month Pro plan covers this comfortably. At €40/building/month premium tier pricing, 100 buildings = €4,000/month revenue; the email cost is 0.5% of revenue — negligible. At 500 buildings (scale target), ~100,000 emails/month = $35/month; revenue = €20,000/month; email cost = 0.175% of revenue.

---

## 17. Integration with PWA Push (Complementary Channels)

Email and PWA push notifications are complementary, not competing. Email is the appropriate channel for: assembly invitations (legal compliance), assembly minutes delivery, monthly financial statements, and document sharing with acknowledgement requirements. PWA push is appropriate for: real-time alerts (water leak, power outage), ticket status changes (immediate feedback), maintenance reminders (same-day). When implementing PWA push (a future initiative), the `notifications` table's `channel` field will gain a third value `'push'` alongside `'app'` and `'email'`. The `createNotification` action should route to the appropriate channel based on the notification type and user preference. Both channels share the same audit trail via `audit_logs`.

---

## 18. Integration with Assembly Protocol Generator

After Dev Prompt #9's Edge Function generates the PDF protocol:
1. The Edge Function fetches `RESEND_API_KEY` from `Deno.env`
2. It calls `https://api.resend.com/emails` directly via fetch (no SDK in Deno — use raw fetch)
3. It uses an inline HTML template (the full `DocumentShareEmail` template rendered inline in Deno)
4. The email body contains: meeting title, 7-day signed Storage download URL, Ptk. 5:88 legal notice
5. Recipients: all `tulajdonos` memberships for the building (same query as `sendAssemblyInvitation`)

In the Next.js app, `generateProtocolManually` will also trigger the email via the Edge Function, ensuring protocol re-generation always sends a fresh signed URL.

---

## 19. Rollback Plan

1. **Revert `app/actions/announcements.ts`:** Remove the `sendAnnouncementEmails` call and import statements. The announcement insert logic is unchanged and will continue working.
2. **Revert `app/actions/tickets.ts`:** Remove the email send block from `updateTicketStatus`. Ticket updates continue to work without emails.
3. **Delete `lib/email.ts`:** No other files import it in the original codebase. Deletion is safe.
4. **Delete `lib/email-templates/`:** Same — no existing code depends on these files.
5. **Delete `app/api/resend/webhook/route.ts`:** The route simply stops responding; no data loss.
6. **Delete `app/api/email/unsubscribe/route.ts`:** Unsubscribe links in already-sent emails will 404 — acceptable short-term; previously sent emails are immutable.
7. **Revert schema:** `ALTER TABLE profiles DROP COLUMN IF EXISTS notifications_email, DROP COLUMN IF EXISTS notifications_statutory_email, DROP COLUMN IF EXISTS unsubscribe_token;` — safe since no existing queries use these columns.
8. **Keep `resend` in package.json** — already present, no change needed.

---

## 20. Definition of Done

All 14 items below must be true before this PR is merged:

1. `lib/email.ts` exists and exports: `sendEmail`, `sendBulkEmail`, `renderEmailTemplate`, `generateUnsubscribeUrl`, `isEmailEnabledForProfile`
2. All 5 email templates exist in `lib/email-templates/`: `announcement.tsx`, `ticket-update.tsx`, `assembly-invitation.tsx`, `monthly-statement.tsx`, `document-share.tsx`
3. `app/actions/announcements.ts` sends emails to opted-in building members after `createAnnouncement`
4. `app/actions/tickets.ts` sends a ticket update email to the reporter after `updateTicketStatus`
5. `app/api/resend/webhook/route.ts` exists, verifies Svix signatures, and logs delivery/bounce events to `audit_logs`
6. `app/api/email/unsubscribe/route.ts` exists, correctly sets `profiles.notifications_email = false`, and returns a user-friendly HTML page
7. `profiles.notifications_email`, `profiles.notifications_statutory_email`, and `profiles.unsubscribe_token` columns exist in the database
8. Email preferences toggle exists in the user settings UI
9. `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` are documented in `.env.example`
10. When `RESEND_API_KEY` is absent, `sendEmail` stubs gracefully (no crash, console log)
11. All email templates include a functioning unsubscribe link
12. `npm run typecheck` passes with zero errors
13. `CHANGELOG.md` is updated with entry for v3.21.0
14. `versioning/DDMMYYNNN_v3.21.0_email-notification-resend.md` and `marketing/marketing_values/YYYYMMDD_v3.21.0_email-notification-resend_marketing_value.md` are created
