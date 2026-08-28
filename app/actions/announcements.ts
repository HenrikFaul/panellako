'use server';

import { revalidatePath } from 'next/cache';
import {
  authorizationMessage,
  requireAuthenticatedUser,
  requireWorkspaceAccess,
  requireWorkspaceCapability,
} from '@/lib/authorization/guards';

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

function scopeToTargetGroup(scope: AnnouncementScope, unitLabel?: string): string {
  if (scope === 'all') return 'Mindenki';
  if (scope === 'owners') return 'Tulajdonosok';
  if (scope === 'residents') return 'Lakók';
  if (scope === 'specific_units') return unitLabel ?? 'Célzott albetétek';
  return 'Mindenki';
}

// ─── createAnnouncement ───────────────────────────────────────────────────────

export async function createAnnouncement(input: CreateAnnouncementInput) {
  if (!input.building_id) return { success: false, error: 'Lakóközösség megadása kötelező.' };
  try {
    const [{ supabase, user }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(input.building_id, 'announcement.publish'),
    ]);

    const scope: AnnouncementScope = input.scope ?? 'all';
    const priority: AnnouncementPriority = input.priority ?? 'normal';

    // Derive readable target_group label for display
    let unitLabels: string | undefined;
    if (scope === 'specific_units' && input.unit_ids?.length) {
      const { data: units } = await supabase
        .from('units')
        .select('id, unit_label')
        .eq('building_id', context.primaryBuildingId)
        .in('id', input.unit_ids);
      if ((units ?? []).length !== input.unit_ids.length) {
        return { success: false, error: 'A művelet nem engedélyezett.' };
      }
      unitLabels = (units ?? []).map((u: { unit_label: string }) => u.unit_label).join(', ');
    }
    const targetGroup = input.target_group ?? scopeToTargetGroup(scope, unitLabels);

    // Insert announcement
    const { data: ann, error } = await supabase
      .from('announcements')
      .insert({
        workspace_id: context.workspaceId,
        title: input.title,
        content: input.content,
        target_group: targetGroup,
        category: input.category ?? 'egyeb',
        building_id: context.primaryBuildingId,
        created_by: user.id,
        scope,
        priority,
        deadline: input.deadline ?? null,
        requires_acknowledgement: input.requires_acknowledgement ?? false,
      })
      .select()
      .single();

    if (error || !ann) return { success: false, error: 'A közleményt most nem sikerült létrehozni.' };

    const rollbackAnnouncement = async () => {
      await supabase
        .from('reminder_rules')
        .delete()
        .eq('building_id', context.primaryBuildingId)
        .eq('activity_type', 'announcement_ack')
        .eq('activity_id', ann.id);
      await supabase
        .from('announcements')
        .delete()
        .eq('id', ann.id)
        .eq('workspace_id', context.workspaceId);
    };

    // Insert per-unit targeting rows
    if (scope === 'specific_units' && input.unit_ids?.length) {
      const { error: unitTargetError } = await supabase.from('announcement_units').insert(
        input.unit_ids.map((uid) => ({ announcement_id: ann.id, unit_id: uid })),
      );
      if (unitTargetError) {
        await rollbackAnnouncement();
        return { success: false, error: 'A célzott albetétek rögzítése nem sikerült.' };
      }
    }

    // Create reminder rule if deadline + reminder_days provided
    if (input.deadline && input.reminder_days?.length) {
      const { error: reminderError } = await supabase.from('reminder_rules').insert({
        workspace_id: context.workspaceId,
        building_id: context.primaryBuildingId,
        activity_type: 'announcement_ack',
        activity_id: ann.id,
        deadline: input.deadline,
        reminder_days: input.reminder_days,
        channels: ['app'],
        created_by: user.id,
      });
      if (reminderError) {
        await rollbackAnnouncement();
        return { success: false, error: 'A közlemény emlékeztetőjét nem sikerült biztonságosan rögzíteni.' };
      }
    }

    let emailDelivery: 'DISABLED' | 'QUEUED' | 'EXISTING' = 'DISABLED';
    if (input.send_email !== false) {
      const { data: queueResult, error: queueError } = await supabase.rpc('enqueue_announcement_delivery', {
        p_workspace_id: context.workspaceId,
        p_announcement_id: ann.id,
        p_idempotency_key: ann.id,
      });
      if (queueError) {
        await rollbackAnnouncement();
        return { success: false, error: 'A közlemény címzettlistáját nem sikerült biztonságosan rögzíteni.' };
      }
      const queueRow = Array.isArray(queueResult) ? queueResult[0] : queueResult;
      emailDelivery = queueRow?.queue_status === 'EXISTING' ? 'EXISTING' : 'QUEUED';
    }

    revalidatePath(`/w/${input.building_id}`);
    return { success: true, data: ann, emailDelivery };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}

// ─── acknowledgeAnnouncement ──────────────────────────────────────────────────

export async function acknowledgeAnnouncement(announcementId: string, buildingId?: string) {
  if (!buildingId) return { success: false, error: 'Lakóközösség megadása kötelező.' };
  try {
    const [{ supabase, user }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceAccess(buildingId),
    ]);
    const { data: announcement } = await supabase
      .from('announcements')
      .select('id')
      .eq('id', announcementId)
      .eq('building_id', context.primaryBuildingId)
      .maybeSingle();
    if (!announcement) return { success: false, error: 'A művelet nem engedélyezett.' };

    const { error } = await supabase
      .from('announcement_reads')
      .upsert(
        { announcement_id: announcementId, profile_id: user.id, read_at: new Date().toISOString() },
        { onConflict: 'announcement_id,profile_id' },
      );

    if (error) return { success: false, error: error.message };

    revalidatePath(`/w/${buildingId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}

// ─── getAnnouncementReads (manager view) ──────────────────────────────────────

export async function getAnnouncementReads(announcementId: string, buildingId?: string) {
  if (!buildingId) return { success: false, error: 'Lakóközösség megadása kötelező.', data: null };
  try {
    const [{ supabase }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(buildingId, 'member.directory.read_minimal'),
    ]);
    const { data: announcement } = await supabase
      .from('announcements')
      .select('id')
      .eq('id', announcementId)
      .eq('building_id', context.primaryBuildingId)
      .maybeSingle();
    if (!announcement) return { success: false, error: 'A művelet nem engedélyezett.', data: null };

    const { data, error } = await supabase
      .from('announcement_reads')
      .select('profile_id, read_at, profiles(full_name)')
      .eq('announcement_id', announcementId)
      .order('read_at', { ascending: false });

    if (error) return { success: false, error: error.message, data: null };
    return { success: true, data };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), data: null };
  }
}

// ─── assertManagerRole (shared helper) ───────────────────────────────────────

export async function checkManagerRole(buildingId: string): Promise<boolean> {
  try {
    await requireWorkspaceCapability(buildingId, 'announcement.publish');
    return true;
  } catch {
    return false;
  }
}
