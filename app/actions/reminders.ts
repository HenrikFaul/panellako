'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceCapability,
  WorkspaceAuthorizationError,
} from '@/lib/authorization/guards';
import { isWorkspaceId } from '@/lib/authorization/workspace-context';

type ServerSupabaseClient = ReturnType<typeof createClient>;
type ReminderActivityType = 'vote' | 'announcement_ack' | 'document_ack' | 'meter_reading';
type ReminderChannel = 'app' | 'email';

interface ScopedReminderRule {
  id: string;
  workspace_id: string;
  building_id: string;
  activity_type: ReminderActivityType;
  activity_id: string;
  reminder_days: number[];
  channels: ReminderChannel[];
  enabled: boolean;
}

interface ReminderRecipient {
  profile_id: string;
}

export interface ReminderRuleInput {
  workspaceId: string;
  activity_type: ReminderActivityType;
  activity_id: string;
  deadline: string;
  reminder_days: number[];
  channels?: ReminderChannel[];
}

const ACTIVITY_TYPES = new Set<ReminderActivityType>([
  'vote',
  'announcement_ack',
  'document_ack',
  'meter_reading',
]);
const CHANNELS = new Set<ReminderChannel>(['app', 'email']);

function failClosed(error: unknown, fallback: string): string {
  if (error instanceof WorkspaceAuthorizationError) return 'A művelet nem engedélyezett.';
  console.error('[reminders] Action failed:', error);
  return fallback;
}

function isUuid(value: string): boolean {
  return isWorkspaceId(value);
}

function reminderSendIdempotencyKey(
  ruleId: string,
  profileId: string,
  daysBeforeDeadline: number,
): string {
  const hex = createHash('sha256')
    .update(`reminder-send:${ruleId}:${profileId}:app:${daysBeforeDeadline}`)
    .digest('hex')
    .slice(0, 32)
    .split('');
  hex[12] = '5';
  hex[16] = ['8', '9', 'a', 'b'][Number.parseInt(hex[16], 16) % 4];
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function validReminderRuleInput(input: ReminderRuleInput): boolean {
  return isWorkspaceId(input.workspaceId)
    && isUuid(input.activity_id)
    && ACTIVITY_TYPES.has(input.activity_type)
    && Number.isFinite(Date.parse(input.deadline))
    && input.reminder_days.length > 0
    && input.reminder_days.every((day) => Number.isInteger(day) && day >= 0 && day <= 365)
    && (input.channels ?? ['app']).every((channel) => CHANNELS.has(channel));
}

async function requireReminderManager(workspaceId: string) {
  const [{ supabase, user }, context] = await Promise.all([
    requireAuthenticatedUser(),
    requireWorkspaceCapability(workspaceId, 'reminder.manage'),
  ]);
  return { supabase, user, context };
}

async function requireActivityInWorkspace(
  supabase: ServerSupabaseClient,
  activityType: ReminderActivityType,
  activityId: string,
  workspaceId: string,
  physicalBuildingId: string,
): Promise<void> {
  if (activityType === 'announcement_ack') {
    const { data, error } = await supabase
      .from('announcements')
      .select('id')
      .eq('id', activityId)
      .eq('workspace_id', workspaceId)
      .eq('building_id', physicalBuildingId)
      .maybeSingle();
    if (error || !data) throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
    return;
  }

  if (activityType === 'document_ack') {
    const { data, error } = await supabase
      .from('documents')
      .select('id')
      .eq('id', activityId)
      .eq('workspace_id', workspaceId)
      .eq('building_id', physicalBuildingId)
      .maybeSingle();
    if (error || !data) throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
    return;
  }

  if (activityType === 'vote') {
    const { data, error } = await supabase
      .from('resolutions')
      .select('id, meetings!inner(id)')
      .eq('id', activityId)
      .eq('meetings.workspace_id', workspaceId)
      .eq('meetings.building_id', physicalBuildingId)
      .maybeSingle();
    if (error || !data) throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
    return;
  }

  // Legacy meter reminders point at provider reading requests, which currently
  // carry the physical building key. That key is accepted only after it was
  // derived from the authoritative workspace context above.
  const { data, error } = await supabase
    .from('utility_reading_requests')
    .select('id')
    .eq('id', activityId)
    .eq('building_id', physicalBuildingId)
    .maybeSingle();
  if (error || !data) throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
}

async function loadScopedRule(
  supabase: ServerSupabaseClient,
  workspaceId: string,
  physicalBuildingId: string,
  ruleId: string,
): Promise<ScopedReminderRule> {
  const { data, error } = await supabase
    .from('reminder_rules')
    .select('id, workspace_id, building_id, activity_type, activity_id, reminder_days, channels, enabled')
    .eq('id', ruleId)
    .eq('workspace_id', workspaceId)
    .eq('building_id', physicalBuildingId)
    .maybeSingle();

  if (error || !data) throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
  const rule = data as ScopedReminderRule;
  if (!ACTIVITY_TYPES.has(rule.activity_type)) {
    throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
  }
  return rule;
}

async function getCompletedProfileIds(
  supabase: ServerSupabaseClient,
  rule: ScopedReminderRule,
): Promise<Set<string>> {
  if (rule.activity_type === 'announcement_ack') {
    const { data, error } = await supabase
      .from('announcement_reads')
      .select('profile_id')
      .eq('announcement_id', rule.activity_id);
    if (error) throw new Error('Reminder completion query failed.');
    return new Set((data ?? []).map((row: { profile_id: string }) => row.profile_id));
  }

  if (rule.activity_type === 'document_ack') {
    const { data, error } = await supabase
      .from('document_acknowledgements')
      .select('profile_id')
      .eq('document_id', rule.activity_id);
    if (error) throw new Error('Reminder completion query failed.');
    return new Set((data ?? []).map((row: { profile_id: string }) => row.profile_id));
  }

  if (rule.activity_type === 'vote') {
    const { data, error } = await supabase
      .from('votes')
      .select('voter_profile_id')
      .eq('resolution_id', rule.activity_id);
    if (error) throw new Error('Reminder completion query failed.');
    return new Set((data ?? []).map((row: { voter_profile_id: string }) => row.voter_profile_id));
  }

  // There is no request_id on legacy meter_readings, so claiming completion
  // for a particular provider request would be unsafe. Preserve the existing
  // behavior until that explicit relation is migrated.
  return new Set();
}

async function getPendingRecipientsForRule(
  supabase: ServerSupabaseClient,
  rule: ScopedReminderRule,
): Promise<ReminderRecipient[]> {
  const { data: memberships, error } = await supabase
    .from('workspace_memberships')
    .select('profile_id')
    .eq('workspace_id', rule.workspace_id)
    .eq('status', 'ACTIVE');
  if (error) throw new Error('Reminder recipient query failed.');

  const recipients = Array.from(new Set(
    (memberships ?? []).map((membership: { profile_id: string }) => membership.profile_id),
  )).map((profile_id) => ({ profile_id }));
  if (recipients.length === 0) return [];

  const completedIds = await getCompletedProfileIds(supabase, rule);
  return recipients.filter((recipient) => !completedIds.has(recipient.profile_id));
}

export async function createReminderRule(input: ReminderRuleInput) {
  if (!validReminderRuleInput(input)) {
    return { success: false, error: 'Az emlékeztető adatai érvénytelenek.' };
  }

  try {
    const { supabase, user, context } = await requireReminderManager(input.workspaceId);
    await requireActivityInWorkspace(
      supabase,
      input.activity_type,
      input.activity_id,
      context.workspaceId,
      context.primaryBuildingId,
    );

    const { data, error } = await supabase
      .from('reminder_rules')
      .insert({
        workspace_id: context.workspaceId,
        building_id: context.primaryBuildingId,
        activity_type: input.activity_type,
        activity_id: input.activity_id,
        deadline: input.deadline,
        reminder_days: Array.from(new Set(input.reminder_days)).sort((a, b) => b - a),
        channels: Array.from(new Set(input.channels ?? ['app'])),
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !data) throw new Error('Reminder rule insert failed.');
    revalidatePath(`/w/${context.workspaceId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: failClosed(error, 'Az emlékeztető létrehozása sikertelen.') };
  }
}

export async function toggleReminderRule(workspaceId: string, ruleId: string, enabled: boolean) {
  if (!isWorkspaceId(workspaceId) || !isUuid(ruleId) || typeof enabled !== 'boolean') {
    return { success: false, error: 'Az emlékeztető adatai érvénytelenek.' };
  }

  try {
    const { supabase, context } = await requireReminderManager(workspaceId);
    await loadScopedRule(supabase, context.workspaceId, context.primaryBuildingId, ruleId);

    const { data, error } = await supabase
      .from('reminder_rules')
      .update({ enabled })
      .eq('id', ruleId)
      .eq('workspace_id', context.workspaceId)
      .eq('building_id', context.primaryBuildingId)
      .select('id')
      .maybeSingle();

    if (error || !data) throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
    revalidatePath(`/w/${context.workspaceId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: failClosed(error, 'Az emlékeztető módosítása sikertelen.') };
  }
}

export async function getPendingReminderRecipients(workspaceId: string, ruleId: string) {
  if (!isWorkspaceId(workspaceId) || !isUuid(ruleId)) {
    return { success: false, error: 'Az emlékeztető adatai érvénytelenek.', data: null };
  }

  try {
    const { supabase, context } = await requireReminderManager(workspaceId);
    const rule = await loadScopedRule(supabase, context.workspaceId, context.primaryBuildingId, ruleId);
    await requireActivityInWorkspace(
      supabase,
      rule.activity_type,
      rule.activity_id,
      context.workspaceId,
      context.primaryBuildingId,
    );
    const pending = await getPendingRecipientsForRule(supabase, rule);
    return { success: true, data: pending };
  } catch (error) {
    return {
      success: false,
      error: failClosed(error, 'Az emlékeztetendők lekérése sikertelen.'),
      data: null,
    };
  }
}

export async function executeReminderRule(
  workspaceId: string,
  ruleId: string,
  daysBeforeDeadline: number,
) {
  if (
    !isWorkspaceId(workspaceId)
    || !isUuid(ruleId)
    || !Number.isInteger(daysBeforeDeadline)
    || daysBeforeDeadline < 0
    || daysBeforeDeadline > 365
  ) {
    return { success: false, error: 'Az emlékeztető adatai érvénytelenek.', sent: 0 };
  }

  try {
    const { supabase, user, context } = await requireReminderManager(workspaceId);
    const rule = await loadScopedRule(supabase, context.workspaceId, context.primaryBuildingId, ruleId);
    if (!rule.enabled) return { success: false, error: 'Az emlékeztető nincs engedélyezve.', sent: 0 };
    if (!rule.reminder_days.includes(daysBeforeDeadline) || !rule.channels.includes('app')) {
      return { success: false, error: 'Az emlékeztető időzítése vagy csatornája nincs engedélyezve.', sent: 0 };
    }

    await requireActivityInWorkspace(
      supabase,
      rule.activity_type,
      rule.activity_id,
      context.workspaceId,
      context.primaryBuildingId,
    );
    const pendingRecipients = await getPendingRecipientsForRule(supabase, rule);
    if (pendingRecipients.length === 0) return { success: true, sent: 0 };

    const { data: priorSends, error: priorSendsError } = await supabase
      .from('reminder_sends')
      .select('profile_id')
      .eq('reminder_rule_id', rule.id)
      .eq('days_before_deadline', daysBeforeDeadline);
    if (priorSendsError) throw new Error('Reminder send audit query failed.');
    const alreadySent = new Set(
      (priorSends ?? []).map((send: { profile_id: string }) => send.profile_id),
    );

    let sent = 0;
    for (const member of pendingRecipients) {
      if (alreadySent.has(member.profile_id)) continue;

      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          workspace_id: context.workspaceId,
          building_id: context.primaryBuildingId,
          created_by: user.id,
          title: 'Emlékeztető',
          message: getReminderMessage(rule.activity_type, daysBeforeDeadline),
          audience: member.profile_id,
          channel: 'app',
        })
        .select('id')
        .single();
      if (notificationError || !notification) {
        return { success: false, error: 'Az emlékeztetők küldése sikertelen.', sent };
      }

      const { data: auditResult, error: auditError } = await supabase.rpc('record_reminder_send', {
        p_reminder_rule_id: rule.id,
        p_profile_id: member.profile_id,
        p_channel: 'app',
        p_days_before_deadline: daysBeforeDeadline,
        p_idempotency_key: reminderSendIdempotencyKey(
          rule.id,
          member.profile_id,
          daysBeforeDeadline,
        ),
      });

      if (auditError) {
        // Fail closed: never count a delivery whose required audit record was
        // rejected. The scoped cleanup avoids leaving an unaudited notification.
        const { error: cleanupError } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notification.id)
          .eq('workspace_id', context.workspaceId)
          .eq('building_id', context.primaryBuildingId);
        if (cleanupError) console.error('[reminders] Notification audit rollback failed.');
        return { success: false, error: 'Az emlékeztetők naplózása sikertelen.', sent };
      }

      const auditRow = Array.isArray(auditResult) ? auditResult[0] : auditResult;
      if (!auditRow || !isUuid((auditRow as { reminder_send_id?: string }).reminder_send_id ?? '')) {
        const { error: cleanupError } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notification.id)
          .eq('workspace_id', context.workspaceId)
          .eq('building_id', context.primaryBuildingId);
        if (cleanupError) console.error('[reminders] Notification audit rollback failed.');
        return { success: false, error: 'Az emlékeztetők naplózása sikertelen.', sent };
      }

      sent++;
    }

    revalidatePath(`/w/${context.workspaceId}`);
    return { success: true, sent };
  } catch (error) {
    return { success: false, error: failClosed(error, 'Az emlékeztetők küldése sikertelen.'), sent: 0 };
  }
}

function getReminderMessage(activityType: string, daysLeft: number): string {
  const dayStr = daysLeft === 1 ? 'holnap' : `${daysLeft} nap múlva`;
  switch (activityType) {
    case 'vote': return `Szavazati határidő: ${dayStr} jár le. Kérjük, szavazzon!`;
    case 'announcement_ack': return `Olvasatlan értesítés — határ: ${dayStr}. Kérjük, olvassa el!`;
    case 'document_ack': return `Dokumentum visszaigazolása szükséges — határ: ${dayStr}.`;
    case 'meter_reading': return `Mérőállás-leadás határideje: ${dayStr}.`;
    default: return `Teendő határideje: ${dayStr}.`;
  }
}
