'use server';

import { sendEmail } from '@/lib/email';

const CONTACT_SUBJECTS = [
  'Ajánlatkérés',
  'Érdeklődés',
  'Hibabejelentés',
  'Visszajelzés',
  'Partnerség',
  'Egyéb',
] as const;

export type ContactSubject = typeof CONTACT_SUBJECTS[number];
export { CONTACT_SUBJECTS };

export interface ContactInput {
  subject: ContactSubject;
  message: string;
}

export async function sendContactMessage(input: ContactInput): Promise<{ success: boolean; error?: string }> {
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL;
  if (!recipient) {
    // Fallback: log and return success so UI isn't broken without env var
    console.warn('[contact] CONTACT_RECIPIENT_EMAIL not set — message dropped', input.subject);
    return { success: true };
  }

  const trimmedMessage = input.message.trim();
  if (!trimmedMessage || trimmedMessage.length > 2000) {
    return { success: false, error: 'Az üzenet 1–2000 karakter között kell legyen.' };
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#0f172a">PanelLakó — Kapcsolati üzenet</h2>
      <p><strong>Tárgy:</strong> ${escapeHtml(input.subject)}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
      <div style="white-space:pre-wrap;color:#334155">${escapeHtml(trimmedMessage)}</div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
      <p style="color:#94a3b8;font-size:12px">Küldve a panellako.hu kapcsolati űrlapon keresztül.</p>
    </div>
  `;

  const result = await sendEmail({
    to: recipient,
    subject: `[PanelLakó Kapcsolat] ${input.subject}`,
    html,
  });

  if (!result.success) {
    return { success: false, error: 'Az üzenet küldése sikertelen. Kérjük, próbáld újra.' };
  }

  return { success: true };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
