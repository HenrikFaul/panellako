'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sendBulkEmail, renderEmailTemplate, isEmailEnabledForProfile } from '@/lib/email';
import * as React from 'react';
import { AnnouncementEmail } from '@/lib/email-templates/announcement';

export type AnnouncementScope = 'all' | 'owners' | 'residents' | 'specific_units';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  category?: string;
  building_id?: string;
  scope?: AnnouncementScope;
  unit_ids?: string[];         // required when scope='specific_units'
  priority?: AnnouncementPriority;
  deadline?: string | null;    // ISO date string
  requires_acknowledgement?: boolean;
  reminder_days?: number[];    // e.g. [3, 1] — days before deadline to remind
  send_email?: boolean;
  // legacy field — preserved for backward compat, derived from scope when omitted
  target_group?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const MANAGER_ROLES = ['kozos_kepviselo', 'megbizott'];

const SCOPE_ROLE_MAP: Record<string, string[]> = {
  owners:    ['tulajdonos', 'kozos_kepviselo'],
  residents: ['lako'],
};

function scopeToTargetGroup(scope: AnnouncementScope, unitLabel?: string): string {
  if (scope === 'all') return 'Mindenki';
  if (scope === 'owners') return 'Tulajdonosok';
  if (scope === 'residents') return 'Lakók';
  if (scope === 'specific_units') return unitLabel ?? 'Célzott albetétek';
  return 'Mindenki';
}

async function getRecipientProfileIds(
  supabase: ReturnType<typeof createClient>,
  buildingId: string,
  scope: AnnouncementScope,
  unitIds?: string[]
): Promise<string[]> {
  if (scope === 'specific_units' && unitIds?.length) {
    const { data } = await supabase
      .from('memberships')
      .select('profile_id, unit_id')
      .eq('building_id', buildingId)
      .eq('active', true)
      .in('unit_id', unitIds);
    return (data ?? []).map((m: { profile_id: string }) => m.profile_id);
  }

  const query = supabase
    .from('memberships')
    .select('profile_id, role')
    .eq('building_id', buildingId)
    .eq('active', true);

  if (scope in SCOPE_ROLE_MAP) {
    query.in('role', SCOPE_ROLE_MAP[scope]);
  }

  const { data } = await query;
  return (data ?? []).map((m: { profile_id: string }) => m.profile_id);
}

// ─── email sending ────────────────────────────────────────────────────────────

async function sendAnnouncementEmails(
  supabase: ReturnType<typeof createClient>,
  buildingId: string | null,
  title: string,
  content: string,
  category: string,
  senderName: string,
  scope: AnnouncementScope = 'all',
  unitIds?: string[]
): Promise<void> {
  let profileIds: string[] | null = null;

  if (buildingId) {
    profileIds = await getRecipientProfileIds(supabase, buildingId, scope, unitIds);
    if (!profileIds.length) return;
  }

  const query = supabase
    .from('profiles')
    .select('id, email, full_name, unsubscribe_token, notifications_email');

  if (profileIds) {
    query.in('id', profileIds);
  }

  const { data: recipients, error } = await query;
  if (error || !recipients?.length) return;

  let buildingName = 'PanelLakó';
  let buildingAddress = '';
  if (buildingId) {
    const { data: building } = await supabase
      .from('buildings').select('name, address').eq('id', buildingId).single();
    if (building) { buildingName = building.name; buildingAddress = building.address; }
  }

  const emailable = recipients.filter(isEmailEnabledForProfile);
  if (!emailable.length) return;

  const html = await renderEmailTemplate(
    React.createElement(AnnouncementEmail, {
      buildingName, buildingAddress,
      announcementTitle: title, announcementContent: content,
      category, senderName,
      unsubscribeUrl: 'PLACEHOLDER',
      dashboardUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu',
    })
  );

  const emails = emailable.flatMap((r: { email?: string }) => r.email ? [r.email] : []);
  if (!emails.length) return;

  await sendBulkEmail({
    recipients: emails,
    subject: `[${buildingName}] ${title}`,
    html,
    tags: [{ name: 'type', value: 'announcement' }],
  });
}

// ─── createAnnouncement ───────────────────────────────────────────────────────

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const scope: AnnouncementScope = input.scope ?? 'all';
  const priority: AnnouncementPriority = input.priority ?? 'normal';

  // Derive readable target_group label for display
  let unitLabels: string | undefined;
  if (scope === 'specific_units' && input.unit_ids?.length && input.building_id) {
    const { data: units } = await supabase
      .from('units').select('unit_label').in('id', input.unit_ids);
    unitLabels = (units ?? []).map((u: { unit_label: string }) => u.unit_label).join(', ');
  }
  const targetGroup = input.target_group ?? scopeToTargetGroup(scope, unitLabels);

  // Insert announcement
  const { data: ann, error } = await supabase
    .from('announcements')
    .insert({
      title:                    input.title,
      content:                  input.content,
      target_group:             targetGroup,
      category:                 input.category ?? 'egyeb',
      building_id:              input.building_id ?? null,
      created_by:               user.id,
      scope,
      priority,
      deadline:                 input.deadline ?? null,
      requires_acknowledgement: input.requires_acknowledgement ?? false,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Insert per-unit targeting rows
  if (scope === 'specific_units' && input.unit_ids?.length) {
    await supabase.from('announcement_units').insert(
      input.unit_ids.map((uid) => ({ announcement_id: ann.id, unit_id: uid }))
    );
  }

  // Create reminder rule if deadline + reminder_days provided
  if (input.deadline && input.reminder_days?.length && input.building_id) {
    await supabase.from('reminder_rules').insert({
      building_id:   input.building_id,
      activity_type: 'announcement_ack',
      activity_id:   ann.id,
      deadline:      input.deadline,
      reminder_days: input.reminder_days,
      channels:      ['app'],
      created_by:    user.id,
    });
  }

  // Fire-and-forget email
  if (input.send_email !== false && input.building_id) {
    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single();
    const senderName = profile?.full_name ?? user.email ?? 'Kezelő';

    sendAnnouncementEmails(
      supabase, input.building_id, input.title, input.content,
      input.category ?? 'egyeb', senderName, scope, input.unit_ids
    ).catch((err) => console.error('[createAnnouncement] Email failed:', err));
  }

  revalidatePath(input.building_id ? `/w/${input.building_id}` : '/');
  return { success: true, data: ann };
}

// ─── acknowledgeAnnouncement ──────────────────────────────────────────────────

export async function acknowledgeAnnouncement(announcementId: string, buildingId?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const { error } = await supabase
    .from('announcement_reads')
    .upsert(
      { announcement_id: announcementId, profile_id: user.id, read_at: new Date().toISOString() },
      { onConflict: 'announcement_id,profile_id' }
    );

  if (error) return { success: false, error: error.message };

  revalidatePath(buildingId ? `/w/${buildingId}` : '/');
  return { success: true };
}

// ─── getAnnouncementReads (manager view) ──────────────────────────────────────

export async function getAnnouncementReads(announcementId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve', data: null };

  const { data, error } = await supabase
    .from('announcement_reads')
    .select('profile_id, read_at, profiles(full_name)')
    .eq('announcement_id', announcementId)
    .order('read_at', { ascending: false });

  if (error) return { success: false, error: error.message, data: null };
  return { success: true, data };
}

// ─── assertManagerRole (shared helper) ───────────────────────────────────────

export async function checkManagerRole(buildingId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: mem } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .maybeSingle();

  return mem ? MANAGER_ROLES.includes((mem as { role: string }).role) : false;
}
