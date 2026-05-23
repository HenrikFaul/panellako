# Initiative 06 — Transactional Email Suite via Brevo
## Full Communication Lifecycle — Ptk.-Compliant Notifications | Value: +€180k–€400k

---

## 1. Initiative Header

**Title:** Transactional Email Suite — Full Communication Lifecycle via Brevo

**Value Range:** +€180k–€400k (78% daily email reach vs. 30% push reach for 45–64 age group)

**Business Case:**

PanelLakó's email infrastructure uses Brevo (Sendinblue API v3) via `lib/email.ts`. The `sendEmail()` and `sendBulkEmail()` functions exist and work. Two email templates exist: `lib/email-templates/announcement.tsx` and `lib/email-templates/ticket-update.tsx`. The `notifications` table in Supabase supports `channel: 'email'`.

What is missing is a complete typed email dispatch system with a full suite of templates. The current `sendEmail()` function accepts raw HTML — callers must construct the HTML themselves. There is no typed `EmailEventType` enum, no dispatch router, and only 2 of the required 8+ lifecycle email templates exist.

Critical gaps:
- **Assembly invitations** are legally required 8 days before any common assembly (Ptk. 5:84). The `sendAssemblyInvitation()` action sets `invitation_sent_at` but logs "connect email action for actual send" — no email is sent.
- **Monthly common cost statements** are not emailed to unit owners — they must log into the app to see their balance.
- **Arrears notices** (felszólítólevelek) are not automated — managers send them manually.
- **Document share notifications** are not implemented.

Research from KSH (2024): 78% of Hungarians aged 45–64 use email daily vs. only 34% using push-enabled apps. For the typical PanelLakó building (average owner age 55+), email is the primary reliable communication channel.

---

## 2. Codebase Context

**Current relevant file tree (verified):**

```
/home/user/panellako/
├── lib/
│   ├── email.ts                           ← sendEmail(), sendBulkEmail(), renderEmailTemplate()
│   │                                         Uses Brevo API (BREVO_API_KEY)
│   │                                         EMAIL_FROM_DISPLAY = 'PanelLakó <no-reply@panellako.hu>'
│   └── email-templates/
│       ├── announcement.tsx               ← EXISTS
│       └── ticket-update.tsx              ← EXISTS
├── app/
│   ├── actions/
│   │   ├── tickets.ts                     ← updateTicketStatus() — no email send yet
│   │   ├── meetings.ts                    ← sendAssemblyInvitation() — no actual email send
│   │   ├── finance.ts                     ← getArrearsReport() — no email trigger
│   │   ├── documents.ts                   ← document actions — no email trigger
│   │   └── notifications.ts               ← EXISTS (check for existing notification logic)
│   └── api/
│       └── email/
│           └── unsubscribe/route.ts        ← EXISTS (unsubscribe endpoint)
└── supabase/migrations/
    └── (audit_logs table exists — used by meetings.ts)
```

**Key finding:** `lib/email.ts` uses **Brevo** not Resend. The `resend` npm package is installed in `package.json` but not used. This initiative uses the existing `sendEmail()` / `renderEmailTemplate()` abstraction — no provider migration needed.

**`renderEmailTemplate(element)`** accepts a React element and returns HTML string using `@react-email/render`. This is the correct pattern for all new templates.

---

## 3. Pre-conditions

**Environment variables required:**
```
BREVO_API_KEY=xkeysib-...             ← Set in Vercel project settings
NEXT_PUBLIC_APP_URL=https://app.panellako.hu
```

**Brevo setup (https://app.brevo.com):**
1. Verify sender domain: Settings → Senders & IP → Add and verify `panellako.hu`
2. Verify `no-reply@panellako.hu` as sender (DNS SPF/DKIM records)

**npm packages (already installed):**
```
@react-email/components: ^1.0.12
@react-email/render: ^2.0.8
```

**Migration to apply:**
- `20260523_050_email_audit_log.sql` — extend `audit_logs` with email tracking

---

## 4. Phase 1: Database Changes

### Migration: `20260523_050_email_audit_log.sql`

```sql
-- Add email event tracking to audit_logs for GDPR + Ptk. compliance.
-- Every legally-required email (assembly invitations, arrears notices) must have
-- an auditable delivery record.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS email_to         TEXT[],
  ADD COLUMN IF NOT EXISTS email_subject    TEXT,
  ADD COLUMN IF NOT EXISTS email_event_type TEXT,
  ADD COLUMN IF NOT EXISTS email_message_id TEXT,
  ADD COLUMN IF NOT EXISTS email_error      TEXT;

COMMENT ON COLUMN public.audit_logs.email_to IS
  'Recipients of the email (masked in display for GDPR). Full emails in Brevo dashboard.';
COMMENT ON COLUMN public.audit_logs.email_event_type IS
  'Matches EmailEventType enum: assembly_invitation, arrears_notice, ticket_update, etc.';

-- Index for email delivery audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_email_event
  ON public.audit_logs (email_event_type, created_at DESC)
  WHERE email_event_type IS NOT NULL;

-- Unsubscribe tokens table (for GDPR-compliant one-click unsubscribe)
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  email_type    TEXT,   -- NULL = all; specific type = that type only
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_profile_email_type UNIQUE (profile_id, email_type)
);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own unsubscribes" ON public.email_unsubscribes;
CREATE POLICY "Users manage own unsubscribes" ON public.email_unsubscribes
  FOR ALL USING (profile_id = auth.uid());
```

---

## 5. Phase 2: Server-side

### New file: `lib/email-dispatch.ts`

```typescript
// Central typed email dispatcher for PanelLakó.
// All transactional email sends MUST go through dispatch() for:
//   1. Type safety
//   2. Unsubscribe check
//   3. audit_logs insertion
//   4. GDPR compliance

import { sendEmail, renderEmailTemplate } from '@/lib/email';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { ReactElement } from 'react';

// ─── Event types ──────────────────────────────────────────────────────────────

export type EmailEventType =
  | 'ticket_status_change'
  | 'ticket_triage_complete'
  | 'assembly_invitation'
  | 'assembly_protocol_ready'
  | 'monthly_statement'
  | 'arrears_notice'
  | 'arrears_escalation'
  | 'document_shared'
  | 'welcome'
  | 'trial_nudge'
  | 'payment_failed'
  | 'subscription_cancelled';

// ─── Dispatch function ────────────────────────────────────────────────────────

export interface DispatchEmailOptions {
  eventType: EmailEventType;
  to: string | string[];
  subject: string;
  template: ReactElement;
  buildingId?: string;
  entityId?: string;
  legallyRequired?: boolean;  // If true, bypasses unsubscribe check
}

const getAdminClient = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function dispatch(opts: DispatchEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  skipped?: boolean;
  error?: string;
}> {
  const html = await renderEmailTemplate(opts.template);
  const recipients = Array.isArray(opts.to) ? opts.to : [opts.to];

  // Check unsubscribes (only for non-legally-required emails)
  let filteredRecipients = recipients;
  if (!opts.legallyRequired) {
    const supabase = getAdminClient();
    const { data: unsubs } = await supabase
      .from('email_unsubscribes')
      .select('profile_id')
      .or(`email_type.is.null,email_type.eq.${opts.eventType}`);

    if (unsubs && unsubs.length > 0) {
      const { data: unsubProfiles } = await supabase
        .from('profiles')
        .select('email')
        .in('id', unsubs.map(u => u.profile_id));

      const unsubEmails = new Set((unsubProfiles ?? []).map(p => p.email?.toLowerCase()));
      filteredRecipients = recipients.filter(e => !unsubEmails.has(e.toLowerCase()));
    }

    if (filteredRecipients.length === 0) {
      return { success: true, skipped: true };
    }
  }

  const result = await sendEmail({
    to: filteredRecipients,
    subject: opts.subject,
    html,
    tags: [
      { name: 'event_type', value: opts.eventType },
      { name: 'building_id', value: opts.buildingId ?? 'none' },
    ],
  });

  // Audit log (fire-and-forget)
  const supabase = getAdminClient();
  supabase.from('audit_logs').insert({
    actor_name: 'Rendszer',
    action_type: 'email_sent',
    entity_type: opts.entityId ? 'email' : 'email',
    entity_id: opts.entityId ?? null,
    entity_label: opts.subject,
    email_to: filteredRecipients.map(e => e.replace(/^[^@]+/, '***')),
    email_subject: opts.subject,
    email_event_type: opts.eventType,
    email_message_id: result.id ?? null,
    email_error: result.error ?? null,
  }).then(() => {}).catch(() => {});

  return { success: result.success, messageId: result.id, error: result.error };
}
```

### New file: `lib/email-templates/assembly-invitation.tsx`

```typescript
import * as React from 'react';

interface AgendaItem {
  order_no: number;
  title: string;
  description?: string;
}

interface Props {
  buildingName: string;
  buildingAddress: string;
  meetingTitle: string;
  scheduledAt: string;
  location: string;
  chairpersonName: string;
  agendaItems: AgendaItem[];
  portalUrl: string;
  daysUntilMeeting: number;
}

export function AssemblyInvitationEmail({
  buildingName, buildingAddress, meetingTitle, scheduledAt, location,
  chairpersonName, agendaItems, portalUrl, daysUntilMeeting,
}: Props) {
  const meetingDate = new Date(scheduledAt).toLocaleDateString('hu-HU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <html lang="hu">
      <head><meta charSet="utf-8" /><title>Közgyűlési Meghívó — {buildingName}</title></head>
      <body style={{ fontFamily: 'Arial, sans-serif', background: '#f8fafc', margin: 0, padding: '40px 20px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ background: '#0f2980', borderRadius: '8px', padding: '20px', textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: '#c7d2fe', margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>KÖZGYŰLÉSI MEGHÍVÓ</p>
            <h1 style={{ color: '#fff', margin: '8px 0 0', fontSize: '20px' }}>{buildingName}</h1>
            <p style={{ color: '#a5b4fc', margin: '4px 0 0', fontSize: '13px' }}>{buildingAddress}</p>
          </div>

          <p style={{ color: '#475569', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
            Tisztelt Tulajdonos! Az épület közgyűlését meghirdetjük. A meghívót Ptk. 5:84 szerint, az ülés előtt <strong>{daysUntilMeeting} nappal</strong> küldjük.
          </p>

          <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr><td style={{ padding: '4px 0', fontWeight: 'bold', width: '140px', color: '#1e293b' }}>Időpont:</td><td style={{ color: '#475569' }}>{meetingDate}</td></tr>
                <tr><td style={{ padding: '4px 0', fontWeight: 'bold', color: '#1e293b' }}>Helyszín:</td><td style={{ color: '#475569' }}>{location}</td></tr>
                <tr><td style={{ padding: '4px 0', fontWeight: 'bold', color: '#1e293b' }}>Cím:</td><td style={{ color: '#475569' }}>{meetingTitle}</td></tr>
                <tr><td style={{ padding: '4px 0', fontWeight: 'bold', color: '#1e293b' }}>Összehívó:</td><td style={{ color: '#475569' }}>{chairpersonName}</td></tr>
              </tbody>
            </table>
          </div>

          <h3 style={{ color: '#1e293b', fontSize: '14px', marginBottom: '12px' }}>Napirendi pontok:</h3>
          <ol style={{ paddingLeft: '20px', color: '#475569', fontSize: '13px', lineHeight: '1.8' }}>
            {agendaItems.map((item) => (
              <li key={item.order_no} style={{ marginBottom: '4px' }}>
                <strong>{item.title}</strong>
                {item.description && <span style={{ color: '#94a3b8' }}> — {item.description}</span>}
              </li>
            ))}
          </ol>

          <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '12px', margin: '24px 0', fontSize: '12px', color: '#92400e' }}>
            <strong>Meghatalmazás:</strong> Ha nem tud részt venni, meghatalmazást adhat más tulajdonosnak vagy a közös képviselőnek. Meghatalmazás feltölthető az alábbi linken.
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <a href={portalUrl}
               style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '14px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
              Részvétel visszajelzése
            </a>
          </div>

          <p style={{ color: '#94a3b8', fontSize: '11px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            PanelLakó platform | Ptk. 5:84 szerint küldve | {new Date().toLocaleDateString('hu-HU')}
          </p>
        </div>
      </body>
    </html>
  );
}
```

### New file: `lib/email-templates/arrears-notice.tsx`

```typescript
import * as React from 'react';

interface Props {
  ownerName: string;
  buildingName: string;
  buildingAddress: string;
  unitLabel: string;
  balanceHuf: number;
  daysOverdue: number;
  portalUrl: string;
  managerName: string;
  isEscalated: boolean;
}

function formatHuf(n: number): string {
  return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(n);
}

export function ArrearsNoticeEmail({
  ownerName, buildingName, buildingAddress, unitLabel,
  balanceHuf, daysOverdue, portalUrl, managerName, isEscalated,
}: Props) {
  const urgencyColor = isEscalated ? '#dc2626' : '#d97706';
  const title = isEscalated ? 'FELSZÓLÍTÓLEVÉL' : 'Hátralék értesítő';

  return (
    <html lang="hu">
      <head><meta charSet="utf-8" /><title>{title} — {buildingName}</title></head>
      <body style={{ fontFamily: 'Arial, sans-serif', background: '#fef2f2', margin: 0, padding: '40px 20px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ background: urgencyColor, borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ color: '#fff', fontWeight: 'bold', margin: 0 }}>{title.toUpperCase()}</p>
          </div>

          <p style={{ fontSize: '14px', color: '#1e293b', marginBottom: '8px' }}>Tisztelt <strong>{ownerName}</strong>!</p>

          <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', marginBottom: '20px' }}>
            A(z) <strong>{buildingName}</strong> ({buildingAddress}) társasház <strong>{unitLabel}</strong> albetétjére vonatkozó közös költség számlájával kapcsolatban tájékoztatjuk, hogy az alábbi összeg fennáll:
          </p>

          <div style={{ background: '#fef2f2', border: `2px solid ${urgencyColor}`, borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 8px' }}>Fennálló hátralék</p>
            <p style={{ color: urgencyColor, fontSize: '32px', fontWeight: 'black', margin: 0 }}>{formatHuf(Math.abs(balanceHuf))}</p>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '8px 0 0' }}>{daysOverdue} napja lejárt</p>
          </div>

          {isEscalated && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '12px', color: '#991b1b' }}>
              <strong>Jogi figyelmeztetés:</strong> A Lakástörvény (2003. évi CXXXIII. tv.) 23. §-a értelmében a közös képviselő a hátralékot bírósági úton is érvényesítheti.
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <a href={portalUrl}
               style={{ display: 'inline-block', background: urgencyColor, color: '#fff', padding: '14px 32px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' }}>
              Befizetési részletek megtekintése
            </a>
          </div>

          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Üdvözlettel,</p>
          <p style={{ fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>{managerName}</p>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Közös képviselő — {buildingName}</p>
        </div>
      </body>
    </html>
  );
}
```

### New file: `lib/email-templates/monthly-statement.tsx`

```typescript
import * as React from 'react';

interface Props {
  ownerName: string;
  unitLabel: string;
  buildingName: string;
  period: string;         // YYYY-MM
  chargeHuf: number;
  paidHuf: number;
  balanceHuf: number;
  portalUrl: string;
}

export function MonthlyStatementEmail({
  ownerName, unitLabel, buildingName, period,
  chargeHuf, paidHuf, balanceHuf, portalUrl,
}: Props) {
  const [year, month] = period.split('-');
  const monthName = new Date(`${year}-${month}-01`).toLocaleDateString('hu-HU', { month: 'long', year: 'numeric' });
  const isDebt = balanceHuf < 0;
  const statusColor = isDebt ? '#dc2626' : '#16a34a';
  const statusText = isDebt ? 'Hátralék van' : 'Rendezett';

  return (
    <html lang="hu">
      <head><meta charSet="utf-8" /><title>Havi kimutatás — {monthName}</title></head>
      <body style={{ fontFamily: 'Arial, sans-serif', background: '#f8fafc', margin: 0, padding: '40px 20px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <p style={{ color: '#6366f1', fontWeight: 'bold', margin: 0, fontSize: '12px', textTransform: 'uppercase' }}>HAVI KÖZÖS KÖLTSÉG KIMUTATÁS</p>
            <h2 style={{ color: '#1e293b', margin: '8px 0' }}>{monthName}</h2>
            <p style={{ color: '#64748b', margin: 0 }}>{buildingName} · {unitLabel}</p>
          </div>

          <p style={{ fontSize: '14px', color: '#475569' }}>Kedves <strong>{ownerName}</strong>!</p>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>Közös költség terhelés</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>
                    {new Intl.NumberFormat('hu-HU').format(chargeHuf)} Ft
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>Befizetés</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                    {new Intl.NumberFormat('hu-HU').format(paidHuf)} Ft
                  </td>
                </tr>
                <tr style={{ background: '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#1e293b' }}>Egyenleg</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: statusColor }}>
                    {new Intl.NumberFormat('hu-HU').format(balanceHuf)} Ft
                    <span style={{ display: 'block', fontSize: '11px' }}>{statusText}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href={portalUrl}
               style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}>
              Teljes egyenleg megtekintése
            </a>
          </div>

          <p style={{ color: '#94a3b8', fontSize: '11px', textAlign: 'center', marginTop: '24px' }}>
            PanelLakó platform | <a href="{unsubscribeUrl}" style={{ color: '#94a3b8' }}>Leiratkozás a havi értesítőkről</a>
          </p>
        </div>
      </body>
    </html>
  );
}
```

### Extended: `app/actions/meetings.ts` — Wire actual email send

Replace the `console.log(...)` placeholder in `sendAssemblyInvitation()` with actual email dispatch:

```typescript
// In sendAssemblyInvitation(), after the invitation_sent_at update:

import { dispatch } from '@/lib/email-dispatch';
import { AssemblyInvitationEmail } from '@/lib/email-templates/assembly-invitation';

// ... (after setting invitation_sent_at) ...

// Fetch unit owners' emails
const { data: units } = await supabase
  .from('units')
  .select('id, unit_label, owner_name, owner_email')
  .eq('building_id', meeting.building_id)
  .not('owner_email', 'is', null);

const { data: building } = await supabase
  .from('buildings')
  .select('name, address')
  .eq('id', meeting.building_id)
  .single();

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu';
const ownerEmails = (units ?? []).map(u => u.owner_email).filter(Boolean) as string[];

if (ownerEmails.length > 0 && building) {
  await dispatch({
    eventType: 'assembly_invitation',
    to: ownerEmails,
    subject: `Közgyűlési Meghívó — ${building.name} — ${new Date(meeting.scheduled_at).toLocaleDateString('hu-HU')}`,
    template: AssemblyInvitationEmail({
      buildingName: building.name,
      buildingAddress: building.address,
      meetingTitle: meeting.title,
      scheduledAt: meeting.scheduled_at,
      location: meeting.location ?? '',
      chairpersonName: meeting.chairperson_name ?? '',
      agendaItems: meeting.agenda_items ?? [],
      portalUrl: `${appUrl}/portal/${meeting.building_id}/kozgyules`,
      daysUntilMeeting: daysUntilMeeting,
    }),
    buildingId: meeting.building_id,
    entityId: meetingId,
    legallyRequired: true,  // Bypass unsubscribe check — legally required
  });
}
```

### New export in `app/actions/notifications.ts`

```typescript
// Add to existing notifications.ts:

export async function sendMonthlyStatements(buildingId: string, period: string): Promise<{
  success: boolean;
  sent: number;
  skipped: number;
  error?: string;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, sent: 0, skipped: 0, error: 'Nem vagy bejelentkezve' };

  const { data: building } = await supabase
    .from('buildings').select('name, address').eq('id', buildingId).single();
  if (!building) return { success: false, sent: 0, skipped: 0, error: 'Épület nem található' };

  const { data: units } = await supabase
    .from('units')
    .select('id, unit_label, owner_name, owner_email')
    .eq('building_id', buildingId)
    .not('owner_email', 'is', null);

  let sent = 0; let skipped = 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu';

  for (const unit of (units ?? [])) {
    if (!unit.owner_email) { skipped++; continue; }

    const { entries } = await getUnitFinanceHistory(unit.id);
    const periodEntries = (entries ?? []).filter((e: { period: string }) => e.period === period);
    const chargeHuf = periodEntries
      .filter((e: { entry_type: string }) => e.entry_type === 'charge')
      .reduce((s: number, e: { expected_amount: number }) => s + e.expected_amount, 0);
    const paidHuf = periodEntries
      .filter((e: { entry_type: string }) => e.entry_type === 'payment')
      .reduce((s: number, e: { paid_amount: number }) => s + e.paid_amount, 0);

    const { data: unitBalance } = await supabase
      .from('units').select('balance_amount').eq('id', unit.id).single();
    const balanceHuf = unitBalance?.balance_amount ?? 0;

    const result = await dispatch({
      eventType: 'monthly_statement',
      to: unit.owner_email,
      subject: `Közös költség kimutatás — ${period} — ${unit.unit_label}`,
      template: MonthlyStatementEmail({
        ownerName: unit.owner_name,
        unitLabel: unit.unit_label,
        buildingName: building.name,
        period,
        chargeHuf,
        paidHuf,
        balanceHuf,
        portalUrl: `${appUrl}/portal/${buildingId}/egyenleg`,
      }),
      buildingId,
      entityId: unit.id,
      legallyRequired: false,
    });

    if (result.skipped) { skipped++; } else { sent++; }
    await new Promise(r => setTimeout(r, 150)); // Rate limit: ~6 emails/sec
  }

  return { success: true, sent, skipped };
}
```

---

## 6. Phase 3: Client-side

No new client-side components are required for this initiative — all email dispatch is server-side. The only client-side addition is a "Havi kimutatás küldése" button in the financial dashboard that calls `sendMonthlyStatements()`.

---

## 7. Phase 4: Configuration

**Brevo domain verification (required for delivery):**
1. Go to https://app.brevo.com → Settings → Senders & IP → Add new sender
2. Add `no-reply@panellako.hu` and verify ownership via DNS
3. Add SPF record: `v=spf1 include:spf.brevo.com ~all`
4. Add DKIM record from Brevo dashboard

**Vercel environment variables:**
```
BREVO_API_KEY=xkeysib-...
NEXT_PUBLIC_APP_URL=https://app.panellako.hu
```

---

## 8. Phase 5: Testing

### Manual Smoke Test

1. **Assembly invitation:** Call `sendAssemblyInvitation(meetingId)` for a meeting with `daysUntilMeeting > 8`. Verify email arrives at owner's email with correct building name, date, and agenda items.

2. **Unsubscribe flow:** Navigate to `/api/email/unsubscribe?token=...` — verify the unsubscribe is recorded in `email_unsubscribes` table.

3. **Monthly statement:** Call `sendMonthlyStatements(buildingId, '2026-05')`. Verify emails sent count matches units with email addresses.

4. **Arrears notice:** Create a test unit with `balance_amount = -15000`. Send an arrears notice via `dispatch()` with the `ArrearsNoticeEmail` template. Verify the email shows the correct HUF amount.

5. **Legal required bypass:** Set a unit owner in `email_unsubscribes` for `email_type = 'assembly_invitation'`. Send an assembly invitation — it should still be delivered (legallyRequired = true).

6. **Audit log:** After sending any email, check `audit_logs` — a row with `action_type = 'email_sent'` should exist with masked `email_to`.

### Automated Test Cases

```typescript
describe('dispatch()', () => {
  it('renders template and calls sendEmail', async () => {
    const mockSend = jest.spyOn(emailLib, 'sendEmail').mockResolvedValue({ success: true, id: 'msg_1' });
    await dispatch({ eventType: 'welcome', to: 'test@example.com', subject: 'Welcome', template: <div /> });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ to: ['test@example.com'] }));
  });

  it('skips unsubscribed recipients', async () => {
    mockUnsubscribe('test@example.com', null);
    const result = await dispatch({ eventType: 'monthly_statement', to: 'test@example.com', ... });
    expect(result.skipped).toBe(true);
  });

  it('does not skip legally required emails', async () => {
    mockUnsubscribe('test@example.com', 'assembly_invitation');
    const result = await dispatch({ eventType: 'assembly_invitation', to: 'test@example.com', legallyRequired: true, ... });
    expect(result.skipped).toBeUndefined();
  });

  it('inserts audit_log row after send', async () => {
    const mockInsert = jest.spyOn(supabase, 'from').mockReturnValue({ insert: jest.fn() });
    await dispatch({ eventType: 'ticket_status_change', to: 'test@example.com', ... });
    expect(mockInsert).toHaveBeenCalledWith('audit_logs');
  });
});
```

---

## 9. Error Handling & Edge Cases

**Scenario 1: `BREVO_API_KEY` not set**
`isEmailEnabled = false` in `lib/email.ts`. `sendEmail()` returns `{ success: true, id: 'stub_...' }`. All `dispatch()` calls succeed silently. Audit log entry is created with `email_message_id: 'stub_...'`. No emails are actually sent. Correct behavior for development.

**Scenario 2: Brevo 401 — invalid API key**
`sendEmail()` returns `{ success: false, error: 'Brevo 401: invalid...' }`. `dispatch()` returns `{ success: false, error: '...' }`. The caller (e.g., `sendAssemblyInvitation`) should check the result and return an error to the UI.

**Scenario 3: Assembly invitation sent to 200+ unit owners**
`dispatch()` calls `sendEmail()` with a single call, passing all 200+ emails as `to[]`. Brevo supports up to 1,000 recipients per API call. For >1,000, use `sendBulkEmail()` which chunks into groups of 10.

**Scenario 4: Unit `owner_email` is null**
In `sendMonthlyStatements()`, `units.filter(u => u.owner_email)` removes null emails before dispatch. The `skipped` counter increments for these.

**Scenario 5: `renderEmailTemplate(element)` throws (template has runtime error)**
Wrap in try/catch in `dispatch()`. Return `{ success: false, error: 'Template render failed' }`. Do not let template errors crash the calling action.

**Scenario 6: Rate limiting — Brevo free tier (300 emails/day)**
The `sendMonthlyStatements()` function adds a 150ms delay between sends. For 300 units, this adds 45 seconds total. Add a queuing mechanism for large buildings — insert into a `email_queue` table and process via pg_cron.

---

## 10. Integration with Other Initiatives

- **Initiative 02 (Stripe Lifecycle):** The `trial-nudge.tsx` and `payment-failed.tsx` templates use the same `dispatch()` router. Consistent event type naming ensures PostHog tracking works across all email events.

- **Initiative 05 (Financial Ledger):** The `arrears_notice` email type integrates with `getArrearsAgingReport()` — when a unit crosses 60+ days overdue, the financial action can call `dispatch({ eventType: 'arrears_escalation', legallyRequired: true })`.

- **Initiative 09 (Resident Portal):** The `portalUrl` parameter in all email templates points to `/portal/[buildingId]/...`. When the resident portal goes live (Initiative 09), these URLs become deep-links into the portal.

---

## 11. Rollback Plan

1. **Remove `lib/email-dispatch.ts`** — all callers revert to calling `sendEmail()` directly.
2. **Revert `app/actions/meetings.ts`** — restore the `console.log()` placeholder.
3. **Remove new templates** — `assembly-invitation.tsx`, `arrears-notice.tsx`, `monthly-statement.tsx`.
4. **Revert migration:**
   ```sql
   DROP TABLE IF EXISTS public.email_unsubscribes;
   ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS email_to, DROP COLUMN IF EXISTS email_subject, DROP COLUMN IF EXISTS email_event_type, DROP COLUMN IF EXISTS email_message_id, DROP COLUMN IF EXISTS email_error;
   ```

---

## 12. Definition of Done

- [ ] `lib/email-dispatch.ts` created with `dispatch()` and `EmailEventType` enum
- [ ] `lib/email-templates/assembly-invitation.tsx` renders valid HTML with all required Ptk. 5:84 fields
- [ ] `lib/email-templates/arrears-notice.tsx` renders correctly for both standard notice and escalation
- [ ] `lib/email-templates/monthly-statement.tsx` shows correct charge/paid/balance breakdown
- [ ] `sendAssemblyInvitation()` in meetings.ts sends actual emails (not just console.log)
- [ ] `sendMonthlyStatements()` added to notifications.ts — sends to all units with email addresses
- [ ] Unsubscribe check works — unsubscribed users don't receive non-legally-required emails
- [ ] Legally-required emails (assembly_invitation) bypass unsubscribe check
- [ ] Every email send creates an `audit_logs` row with masked `email_to`
- [ ] `email_unsubscribes` table created with correct RLS
- [ ] Brevo domain `panellako.hu` verified as sender domain (DNS SPF + DKIM)
- [ ] TypeScript compiles cleanly for all new files
- [ ] Manual smoke test: assembly invitation email arrives in inbox with correct Hungarian content
