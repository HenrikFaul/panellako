'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sendBulkEmail, renderEmailTemplate, isEmailEnabledForProfile } from '@/lib/email';
import * as React from 'react';
import { AnnouncementEmail } from '@/lib/email-templates/announcement';

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  target_group: string;
  category?: string;
  building_id?: string;
  send_email?: boolean;
}

async function sendAnnouncementEmails(
  supabase: ReturnType<typeof createClient>,
  buildingId: string | null,
  title: string,
  content: string,
  category: string,
  senderName: string
): Promise<void> {
  // Fetch recipients: all profiles with email notifications enabled
  const query = supabase
    .from('profiles')
    .select('email, full_name, unsubscribe_token, notifications_email');

  // If building-scoped, only notify members of that building
  if (buildingId) {
    const { data: memberIds } = await supabase
      .from('memberships')
      .select('profile_id')
      .eq('building_id', buildingId)
      .eq('active', true);

    if (!memberIds?.length) return;
    const ids = memberIds.map((m: { profile_id: string }) => m.profile_id);
    query.in('id', ids);
  }

  const { data: recipients, error } = await query;
  if (error || !recipients?.length) return;

  // Get building info if applicable
  let buildingName = 'PanelLakó';
  let buildingAddress = '';
  if (buildingId) {
    const { data: building } = await supabase.from('buildings').select('name, address').eq('id', buildingId).single();
    if (building) {
      buildingName = building.name;
      buildingAddress = building.address;
    }
  }

  const emailableRecipients = recipients.filter(isEmailEnabledForProfile);

  const html = await renderEmailTemplate(
    React.createElement(AnnouncementEmail, {
      buildingName,
      buildingAddress,
      announcementTitle: title,
      announcementContent: content,
      category,
      senderName,
      unsubscribeUrl: 'PLACEHOLDER', // will be replaced per-recipient below
      dashboardUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu',
    })
  );

  // For announcements we send the same content to all recipients
  // In production use per-recipient unsubscribe URLs
  const recipientEmails: string[] = [];
  for (const r of emailableRecipients) {
    if (r.email) {
      recipientEmails.push(r.email);
    }
  }

  if (!recipientEmails.length) return;

  await sendBulkEmail({
    recipients: recipientEmails,
    subject: `[${buildingName}] ${title}`,
    html,
    tags: [{ name: 'type', value: 'announcement' }],
  });
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title: input.title,
      content: input.content,
      target_group: input.target_group,
      category: input.category ?? 'egyeb',
      building_id: input.building_id ?? null,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Send email notifications asynchronously (fire-and-forget)
  if (input.send_email !== false) {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    const senderName = profile?.full_name ?? user.email ?? 'Kezelő';

    sendAnnouncementEmails(
      supabase,
      input.building_id ?? null,
      input.title,
      input.content,
      input.category ?? 'egyeb',
      senderName
    ).catch((err) => console.error('[createAnnouncement] Email send failed:', err));
  }

  revalidatePath(input.building_id ? `/w/${input.building_id}` : '/');
  return { success: true, data };
}
