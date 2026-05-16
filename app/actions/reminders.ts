'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ReminderRuleInput {
  building_id: string;
  activity_type: 'vote' | 'announcement_ack' | 'document_ack' | 'meter_reading';
  activity_id: string;
  deadline: string;           // ISO date string
  reminder_days: number[];    // days before deadline, e.g. [7, 3, 1]
  channels?: ('app' | 'email')[];
}

export async function createReminderRule(input: ReminderRuleInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const { data, error } = await supabase
    .from('reminder_rules')
    .insert({
      building_id:   input.building_id,
      activity_type: input.activity_type,
      activity_id:   input.activity_id,
      deadline:      input.deadline,
      reminder_days: input.reminder_days,
      channels:      input.channels ?? ['app'],
      created_by:    user.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/w/${input.building_id}`);
  return { success: true, data };
}

export async function toggleReminderRule(ruleId: string, enabled: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const { error } = await supabase
    .from('reminder_rules')
    .update({ enabled })
    .eq('id', ruleId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Returns a list of profiles who have NOT completed the required action
// and should receive a reminder for the given rule.
export async function getPendingReminderRecipients(ruleId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve', data: null };

  const { data: rule } = await supabase
    .from('reminder_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (!rule) return { success: false, error: 'Szabály nem található', data: null };

  // All building members
  const { data: members } = await supabase
    .from('memberships')
    .select('profile_id, profiles(full_name, email)')
    .eq('building_id', rule.building_id)
    .eq('active', true);

  if (!members?.length) return { success: true, data: [] };

  // Who already completed?
  let completedIds: Set<string> = new Set();

  if (rule.activity_type === 'announcement_ack') {
    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('profile_id')
      .eq('announcement_id', rule.activity_id);
    completedIds = new Set((reads ?? []).map((r: { profile_id: string }) => r.profile_id));

  } else if (rule.activity_type === 'document_ack') {
    const { data: acks } = await supabase
      .from('document_acknowledgements')
      .select('profile_id')
      .eq('document_id', rule.activity_id);
    completedIds = new Set((acks ?? []).map((r: { profile_id: string }) => r.profile_id));

  } else if (rule.activity_type === 'vote') {
    const { data: votes } = await supabase
      .from('votes')
      .select('voter_profile_id')
      .eq('resolution_id', rule.activity_id);
    completedIds = new Set((votes ?? []).map((v: { voter_profile_id: string }) => v.voter_profile_id));
  }

  const pending = (members as unknown as Array<{ profile_id: string; profiles: { full_name: string; email: string } | null }>)
    .filter((m) => !completedIds.has(m.profile_id));

  return { success: true, data: pending };
}

// Manually trigger reminders for a specific rule (idempotent due to unique constraint)
export async function executeReminderRule(ruleId: string, daysBeforeDeadline: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve', sent: 0 };

  const pendingResult = await getPendingReminderRecipients(ruleId);
  if (!pendingResult.success || !pendingResult.data) {
    return { success: false, error: pendingResult.error ?? 'Hiba', sent: 0 };
  }

  const { data: rule } = await supabase
    .from('reminder_rules')
    .select('activity_type, activity_id, building_id, channels')
    .eq('id', ruleId)
    .single();

  if (!rule) return { success: false, error: 'Szabály nem található', sent: 0 };

  let sent = 0;
  for (const member of pendingResult.data) {
    // Create in-app notification (idempotent via unique constraint)
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        building_id: rule.building_id,
        created_by:  user.id,
        title:       'Emlékeztető',
        message:     getReminderMessage(rule.activity_type, daysBeforeDeadline),
        audience:    member.profile_id,
        channel:     'app',
      });

    if (notifError) continue;

    // Record in reminder_sends (idempotent)
    await supabase
      .from('reminder_sends')
      .upsert(
        {
          reminder_rule_id:     ruleId,
          profile_id:           member.profile_id,
          channel:              'app',
          days_before_deadline: daysBeforeDeadline,
        },
        { onConflict: 'reminder_rule_id,profile_id,days_before_deadline' }
      );

    sent++;
  }

  return { success: true, sent };
}

function getReminderMessage(activityType: string, daysLeft: number): string {
  const dayStr = daysLeft === 1 ? 'holnap' : `${daysLeft} nap múlva`;
  switch (activityType) {
    case 'vote':            return `Szavazati határidő: ${dayStr} jár le. Kérjük, szavazzon!`;
    case 'announcement_ack': return `Olvasatlan értesítés — határ: ${dayStr}. Kérjük, olvassa el!`;
    case 'document_ack':    return `Dokumentum visszaigazolása szükséges — határ: ${dayStr}.`;
    case 'meter_reading':   return `Mérőállás-leadás határideje: ${dayStr}.`;
    default:                return `Teendő határideje: ${dayStr}.`;
  }
}
