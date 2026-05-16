'use server';

import { sendEmail } from '@/lib/email';

export type ContactSubject =
  | 'Ajánlatkérés'
  | 'Érdeklődés'
  | 'Hibabejelentés'
  | 'Visszajelzés'
  | 'Partnerség'
  | 'Egyéb';

export interface ContactInput {
  subject: ContactSubject;
  message: string;
}

export async function sendContactMessage(input: ContactInput): Promise<{ success: boolean; error?: string }> {
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL;
  if (!recipient) {
    console.error('[contact] CONTACT_RECIPIENT_EMAIL env var is not set');
    return { success: false, error: 'Az üzenetküldés jelenleg nem érhető el (konfiguráció hiányzik). Kérjük, próbáld később.' };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY env var is not set');
    return { success: false, error: 'Az üzenetküldés jelenleg nem érhető el (email rendszer nincs konfigurálva). Kérjük, próbáld később.' };
  }

  const trimmedMessage = input.message.trim();
  if (!trimmedMessage || trimmedMessage.length > 2000) {
    return { success: false, error: 'Az üzenet 1–2000 karakter között kell legyen.' };
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;margin-bottom:8px">PanelLakó — Kapcsolati üzenet</h2>
      <p style="color:#64748b;font-size:13px;margin-bottom:20px">Érkezett a panellako.hu kapcsolati űrlapon keresztül</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:100px;font-size:13px">Tárgy</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:13px">${escapeHtml(input.subject)}</td>
        </tr>
      </table>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;white-space:pre-wrap;color:#334155;font-size:14px;line-height:1.6">${escapeHtml(trimmedMessage)}</div>
      <p style="color:#94a3b8;font-size:11px;margin-top:20px">Küldés ideje: ${new Date().toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })}</p>
    </div>
  `;

  const result = await sendEmail({
    to: recipient,
    subject: `[PanelLakó Kapcsolat] ${input.subject}`,
    html,
    replyTo: undefined,
  });

  if (!result.success) {
    console.error('[contact] sendEmail failed:', result.error);
    return { success: false, error: `Küldés sikertelen: ${result.error ?? 'ismeretlen hiba'}` };
  }

  console.log('[contact] Message sent successfully, id:', result.id);
  return { success: true };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
