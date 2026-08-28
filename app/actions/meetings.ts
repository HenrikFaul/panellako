'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceCapability,
  WorkspaceAuthorizationError,
} from '@/lib/authorization/guards';

type ServerSupabaseClient = ReturnType<typeof createClient>;

interface ScopedMeeting {
  id: string;
  building_id: string;
  scheduled_at: string;
  status: string;
  status_detail?: string | null;
}

interface ScopedResolution {
  id: string;
  meeting_id: string;
  outcome: string;
}

interface ScopedUnit {
  id: string;
  building_id: string;
  unit_label: string;
  owner_name: string;
  ownership_share: number;
}

interface AttendanceRow {
  meeting_id: string;
  unit_id: string;
  ownership_share: number;
  profile_id?: string | null;
  proxy_name?: string | null;
  attended_at?: string | null;
}

interface VoteRow {
  id: string;
  resolution_id: string;
  unit_id: string;
  vote_value: string;
  weight: number;
}

interface AgendaRow {
  id: string;
  meeting_id: string;
  order_no: number;
  title: string;
  description?: string | null;
}

interface ResolutionRow {
  id: string;
  meeting_id: string;
  agenda_item_id: string;
  text: string;
  outcome: string;
  effective_date?: string | null;
}

interface EligibleVoterRow {
  unit_id: string;
  profile_id: string;
  display_name: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgendaItemInput {
  order_no: number;
  title: string;
  description?: string;
}

export interface CreateMeetingInput {
  workspaceId: string;
  title: string;
  scheduled_at: string;
  location: string;
  quorum_threshold?: number;
  chairperson_name?: string;
  secretary_name?: string;
  agenda_items: AgendaItemInput[];
}

export interface RecordAttendanceInput {
  workspaceId: string;
  meeting_id: string;
  unit_id: string;
  profile_id?: string;
  proxy_name?: string;
}

export interface RecordVoteInput {
  workspaceId: string;
  resolution_id: string;
  unit_id: string;
  vote_value: 'igen' | 'nem' | 'tartozkodas';
  attendee_profile_id?: string;
}

function failClosed(error: unknown, fallback: string): string {
  if (error instanceof WorkspaceAuthorizationError) {
    return 'A művelet nem engedélyezett.';
  }
  console.error('[meetings] Action failed:', error);
  return fallback;
}

async function requireManager(workspaceId: string) {
  const [{ supabase, user }, context] = await Promise.all([
    requireAuthenticatedUser(),
    requireWorkspaceCapability(workspaceId, 'meeting.manage'),
  ]);
  return { supabase, user, context };
}

async function requireReader(workspaceId: string) {
  const [{ supabase, user }, context] = await Promise.all([
    requireAuthenticatedUser(),
    requireWorkspaceCapability(workspaceId, 'meeting.read'),
  ]);
  return { supabase, user, context };
}

async function requireMeetingInBuilding(
  supabase: ServerSupabaseClient,
  meetingId: string,
  physicalBuildingId: string,
): Promise<ScopedMeeting> {
  const { data, error } = await supabase
    .from('meetings')
    .select('id, building_id, scheduled_at, status, status_detail')
    .eq('id', meetingId)
    .eq('building_id', physicalBuildingId)
    .maybeSingle();

  if (error || !data) {
    throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
  }
  return data as ScopedMeeting;
}

async function requireResolutionInBuilding(
  supabase: ServerSupabaseClient,
  resolutionId: string,
  physicalBuildingId: string,
): Promise<{ resolution: ScopedResolution; meeting: ScopedMeeting }> {
  const { data, error } = await supabase
    .from('resolutions')
    .select('id, meeting_id, outcome')
    .eq('id', resolutionId)
    .maybeSingle();

  if (error || !data) {
    throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
  }

  const resolution = data as ScopedResolution;
  const meeting = await requireMeetingInBuilding(supabase, resolution.meeting_id, physicalBuildingId);
  return { resolution, meeting };
}

function revalidateWorkspace(workspaceId: string) {
  revalidatePath(`/w/${workspaceId}`);
}

// ─── createMeeting ───────────────────────────────────────────────────────────

export async function createMeeting(input: CreateMeetingInput) {
  try {
    const { supabase, user, context } = await requireManager(input.workspaceId);

    if (!input.title.trim() || !input.scheduled_at) {
      return { success: false, error: 'Kötelező mezők: cím, időpont.' };
    }
    if (!input.agenda_items?.length) {
      return { success: false, error: 'Legalább egy napirendi pont szükséges.' };
    }

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        building_id: context.primaryBuildingId,
        title: input.title,
        scheduled_at: input.scheduled_at,
        status: 'tervezett',
        status_detail: 'tervezett',
        location: input.location ?? null,
        quorum_threshold: input.quorum_threshold ?? 0.5,
        chairperson_name: input.chairperson_name ?? null,
        secretary_name: input.secretary_name ?? null,
        resolution_count: 0,
        agenda_preview: input.agenda_items[0]?.title ?? null,
      })
      .select()
      .single();

    if (meetingError || !meeting) {
      return { success: false, error: meetingError?.message ?? 'Közgyűlés létrehozása sikertelen.' };
    }

    const agendaRows = input.agenda_items.map((item) => ({
      meeting_id: meeting.id,
      order_no: item.order_no,
      title: item.title,
      description: item.description ?? null,
    }));
    const { error: agendaError } = await supabase.from('agenda_items').insert(agendaRows);

    if (agendaError) {
      await supabase
        .from('meetings')
        .delete()
        .eq('id', meeting.id)
        .eq('building_id', context.primaryBuildingId);
      return { success: false, error: `Napirendi pontok mentése sikertelen: ${agendaError.message}` };
    }

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_name: user.email ?? 'Rendszer',
      action_type: 'meeting_created',
      entity_type: 'meeting',
      entity_id: meeting.id,
      entity_label: input.title,
    });

    revalidateWorkspace(input.workspaceId);
    return { success: true, data: { meeting_id: meeting.id } };
  } catch (error) {
    return { success: false, error: failClosed(error, 'Közgyűlés létrehozása sikertelen.') };
  }
}

// ─── sendAssemblyInvitation ───────────────────────────────────────────────────

export async function sendAssemblyInvitation(meetingId: string, workspaceId: string) {
  try {
    const { supabase, context } = await requireManager(workspaceId);
    const meeting = await requireMeetingInBuilding(supabase, meetingId, context.primaryBuildingId);

    const now = new Date();
    const scheduled = new Date(meeting.scheduled_at);
    const daysUntilMeeting = Math.ceil((scheduled.getTime() - now.getTime()) / 86_400_000);

    if (daysUntilMeeting < 8) {
      return {
        success: false,
        error: `Ptk. 5:84 szerint a meghívót legalább 8 nappal korábban kell kiküldeni. Jelenlegi: ${daysUntilMeeting} nap.`,
      };
    }

    const { error: updateError } = await supabase
      .from('meetings')
      .update({ invitation_sent_at: now.toISOString() })
      .eq('id', meetingId)
      .eq('building_id', context.primaryBuildingId);

    if (updateError) return { success: false, error: updateError.message };

    console.log(`[sendAssemblyInvitation] Meeting ${meetingId} invitation logged. Connect email action for actual send.`);
    revalidateWorkspace(workspaceId);
    return { success: true, days_until_meeting: daysUntilMeeting };
  } catch (error) {
    return { success: false, error: failClosed(error, 'A meghívó küldése sikertelen.') };
  }
}

// ─── recordAttendance ────────────────────────────────────────────────────────

export async function recordAttendance(input: RecordAttendanceInput) {
  try {
    const { supabase, user, context } = await requireReader(input.workspaceId);
    const isManager = context.capabilities.includes('meeting.manage');
    if (isManager && !input.profile_id) {
      return { success: false, error: 'A jelenléthez ki kell választani a jogosult tulajdonost.' };
    }
    if (!isManager && input.profile_id && input.profile_id !== user.id) {
      throw new WorkspaceAuthorizationError('CAPABILITY_REQUIRED');
    }

    const { error } = await supabase.rpc('record_meeting_attendance', {
      p_workspace_id: input.workspaceId,
      p_meeting_id: input.meeting_id,
      p_unit_id: input.unit_id,
      p_voter_profile_id: input.profile_id ?? user.id,
      p_proxy_name: input.proxy_name ?? null,
    });

    if (error) {
      return { success: false, error: 'A jelenlét csak ellenőrzött tulajdonosi jogosultsággal rögzíthető.' };
    }
    revalidateWorkspace(input.workspaceId);
    return { success: true };
  } catch (error) {
    return { success: false, error: failClosed(error, 'A jelenlét rögzítése sikertelen.') };
  }
}

// ─── openMeetingVoting ────────────────────────────────────────────────────────

export async function openMeetingVoting(meetingId: string, workspaceId: string) {
  try {
    const { supabase } = await requireManager(workspaceId);
    const { error } = await supabase.rpc('open_meeting_voting', {
      p_workspace_id: workspaceId,
      p_meeting_id: meetingId,
    });
    if (error) {
      return { success: false, error: 'A szavazás csak nyitott határozati javaslattal indítható el.' };
    }
    revalidateWorkspace(workspaceId);
    return { success: true };
  } catch (error) {
    return { success: false, error: failClosed(error, 'A szavazás megnyitása sikertelen.') };
  }
}

// ─── recordVote ──────────────────────────────────────────────────────────────

export async function recordVote(input: RecordVoteInput) {
  try {
    const { supabase, user, context } = await requireReader(input.workspaceId);
    const isManager = context.capabilities.includes('meeting.manage');
    if (isManager && !input.attendee_profile_id) {
      return { success: false, error: 'A képviselői szavazathoz ki kell választani a jelenlévő jogosult tulajdonost.' };
    }
    if (!isManager && input.attendee_profile_id && input.attendee_profile_id !== user.id) {
      throw new WorkspaceAuthorizationError('CAPABILITY_REQUIRED');
    }
    const { error } = await supabase.rpc('cast_vote', {
      p_workspace_id: input.workspaceId,
      p_resolution_id: input.resolution_id,
      p_unit_id: input.unit_id,
      p_vote_value: input.vote_value,
      p_voter_profile_id: input.attendee_profile_id ?? user.id,
    });

    if (error) {
      return {
        success: false,
        error: 'A szavazat nem rögzíthető a jogosultság vagy a szavazási állapot miatt.',
      };
    }
    revalidateWorkspace(input.workspaceId);
    return { success: true };
  } catch (error) {
    return { success: false, error: failClosed(error, 'A szavazat rögzítése sikertelen.') };
  }
}

// ─── closeMeeting ─────────────────────────────────────────────────────────────

export async function closeMeeting(meetingId: string, workspaceId: string) {
  try {
    const { supabase, user, context } = await requireManager(workspaceId);
    await requireMeetingInBuilding(supabase, meetingId, context.primaryBuildingId);

    const [attendanceResult, unitsResult] = await Promise.all([
      supabase.from('meeting_attendances').select('unit_id').eq('meeting_id', meetingId),
      supabase.from('units').select('id, ownership_share').eq('building_id', context.primaryBuildingId),
    ]);
    if (attendanceResult.error || unitsResult.error) {
      return { success: false, error: 'A határozatképesség kiszámítása sikertelen.' };
    }

    const unitShares = new Map(
      (unitsResult.data ?? []).map((row: { id: string; ownership_share: number }) => [row.id, Number(row.ownership_share) || 0]),
    );
    const totalAttending = (attendanceResult.data ?? []).reduce(
      (sum: number, row: { unit_id: string }) => sum + (unitShares.get(row.unit_id) ?? 0),
      0,
    );
    const totalBuilding = Array.from(unitShares.values()).reduce((sum, share) => sum + share, 0);
    const actualQuorum = totalBuilding > 0 ? totalAttending / totalBuilding : 0;

    const { error } = await supabase
      .from('meetings')
      .update({ status: 'lezart', status_detail: 'lezarva', actual_quorum: actualQuorum })
      .eq('id', meetingId)
      .eq('building_id', context.primaryBuildingId);
    if (error) return { success: false, error: error.message };

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_name: user.email ?? 'Rendszer',
      action_type: 'meeting_closed',
      entity_type: 'meeting',
      entity_id: meetingId,
      entity_label: `Kvórum: ${(actualQuorum * 100).toFixed(1)}%`,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      fetch(`${supabaseUrl}/functions/v1/generate-assembly-protocol`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId, building_id: context.primaryBuildingId }),
      }).catch((fetchError) => console.error('[closeMeeting] Protocol generation trigger failed:', fetchError));
    }

    revalidateWorkspace(workspaceId);
    return { success: true, actual_quorum: actualQuorum };
  } catch (error) {
    return { success: false, error: failClosed(error, 'A közgyűlés lezárása sikertelen.') };
  }
}

// ─── addResolution ────────────────────────────────────────────────────────────

export async function addResolution(
  meetingId: string,
  agendaItemId: string,
  text: string,
  effectiveDate: string | undefined,
  workspaceId: string,
) {
  try {
    const { supabase, context } = await requireManager(workspaceId);
    await requireMeetingInBuilding(supabase, meetingId, context.primaryBuildingId);

    const { data: agendaItem, error: agendaError } = await supabase
      .from('agenda_items')
      .select('id, meeting_id')
      .eq('id', agendaItemId)
      .eq('meeting_id', meetingId)
      .maybeSingle();
    if (agendaError || !agendaItem) {
      throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
    }

    const { data, error } = await supabase
      .from('resolutions')
      .insert({
        meeting_id: meetingId,
        agenda_item_id: agendaItemId,
        text,
        outcome: 'folyamatban',
        effective_date: effectiveDate ?? null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidateWorkspace(workspaceId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: failClosed(error, 'A határozat létrehozása sikertelen.') };
  }
}

// ─── updateResolutionOutcome ──────────────────────────────────────────────────

export async function updateResolutionOutcome(
  resolutionId: string,
  outcome: 'elfogadva' | 'elutasitva' | 'folyamatban',
  workspaceId: string,
) {
  try {
    const { supabase, user, context } = await requireManager(workspaceId);
    const { resolution, meeting } = await requireResolutionInBuilding(
      supabase,
      resolutionId,
      context.primaryBuildingId,
    );
    if (meeting.status !== 'tervezett' || meeting.status_detail !== 'szavazas_folyamatban') {
      return { success: false, error: 'A határozat eredménye csak megnyitott szavazásban rögzíthető.' };
    }

    const { error } = await supabase
      .from('resolutions')
      .update({ outcome })
      .eq('id', resolution.id)
      .eq('meeting_id', resolution.meeting_id);
    if (error) return { success: false, error: error.message };

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_name: user.email ?? 'Rendszer',
      action_type: 'resolution_updated',
      entity_type: 'resolution',
      entity_id: resolution.id,
      entity_label: outcome,
    });

    revalidateWorkspace(workspaceId);
    return { success: true };
  } catch (error) {
    return { success: false, error: failClosed(error, 'A határozat módosítása sikertelen.') };
  }
}

// ─── removeAttendance ─────────────────────────────────────────────────────────

export async function removeAttendance(meetingId: string, unitId: string, workspaceId: string) {
  try {
    const { supabase } = await requireReader(workspaceId);
    const { error } = await supabase.rpc('remove_meeting_attendance', {
      p_workspace_id: workspaceId,
      p_meeting_id: meetingId,
      p_unit_id: unitId,
    });
    if (error) {
      return { success: false, error: 'Leadott szavazat után a jelenléti rekord már nem módosítható.' };
    }

    revalidateWorkspace(workspaceId);
    return { success: true };
  } catch (error) {
    return { success: false, error: failClosed(error, 'A jelenlét törlése sikertelen.') };
  }
}

// ─── getMeetingWithDetails ────────────────────────────────────────────────────

export async function getMeetingWithDetails(meetingId: string, workspaceId: string) {
  try {
    const { supabase, context } = await requireReader(workspaceId);
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .eq('building_id', context.primaryBuildingId)
      .maybeSingle();
    if (meetingError || !meeting) {
      throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
    }

    const [agendaResult, resolutionsResult, attendanceResult, voterOptionsResult] = await Promise.all([
      supabase.from('agenda_items').select('*').eq('meeting_id', meetingId).order('order_no'),
      supabase.from('resolutions').select('*').eq('meeting_id', meetingId),
      supabase.from('meeting_attendances').select('*').eq('meeting_id', meetingId),
      supabase.rpc('list_meeting_voter_options', {
        p_workspace_id: workspaceId,
        p_meeting_id: meetingId,
      }),
    ]);
    if (agendaResult.error || resolutionsResult.error || attendanceResult.error || voterOptionsResult.error) {
      throw new Error('Meeting detail query failed.');
    }

    const agendaItems = ((agendaResult.data ?? []) as AgendaRow[]).map((agendaItem) => ({
      ...agendaItem,
      description: agendaItem.description ?? undefined,
    }));
    const resolutions = (resolutionsResult.data ?? []) as ResolutionRow[];
    const rawAttendances = (attendanceResult.data ?? []) as AttendanceRow[];
    const eligibleVoters = (voterOptionsResult.data ?? []) as EligibleVoterRow[];
    const resolutionIds = resolutions.map((resolution) => resolution.id);

    let votes: VoteRow[] = [];
    if (resolutionIds.length > 0) {
      const { data, error } = await supabase
        .from('votes')
        .select('id, resolution_id, unit_id, vote_value, weight')
        .in('resolution_id', resolutionIds);
      if (error) throw new Error('Meeting vote query failed.');
      votes = (data ?? []) as VoteRow[];
    }

    const referencedUnitIds = Array.from(new Set([
      ...rawAttendances.map((attendance) => attendance.unit_id),
      ...votes.map((vote) => vote.unit_id),
    ]));
    const unitById = new Map<string, ScopedUnit>();
    if (referencedUnitIds.length > 0) {
      const { data, error } = await supabase
        .from('units')
        .select('id, building_id, unit_label, owner_name, ownership_share')
        .eq('building_id', context.primaryBuildingId)
        .in('id', referencedUnitIds);
      if (error) throw new Error('Meeting unit scope query failed.');
      for (const unit of (data ?? []) as ScopedUnit[]) unitById.set(unit.id, unit);
    }

    const attendances = rawAttendances.flatMap((attendance) => {
      const unit = unitById.get(attendance.unit_id);
      if (!unit) return [];
      return [{
        ...attendance,
        ownership_share: unit.ownership_share,
        proxy_name: attendance.proxy_name ?? undefined,
        units: {
          unit_label: unit.unit_label,
          owner_name: unit.owner_name,
          ownership_share: unit.ownership_share,
        },
      }];
    });
    const scopedVotes = votes.filter((vote) => unitById.has(vote.unit_id));
    const resolutionsWithVotes = resolutions.map((resolution) => ({
      ...resolution,
      effective_date: resolution.effective_date ?? undefined,
      votes: scopedVotes.filter((vote) => vote.resolution_id === resolution.id),
    }));

    return {
      success: true,
      meeting,
      agenda_items: agendaItems,
      resolutions: resolutionsWithVotes,
      attendances,
      eligible_voters: eligibleVoters,
    };
  } catch (error) {
    return {
      success: false,
      error: failClosed(error, 'A közgyűlés részletei nem tölthetők be.'),
      meeting: null,
      agenda_items: [],
      resolutions: [],
      attendances: [],
      eligible_voters: [],
    };
  }
}

// ─── generateProtocolManually ─────────────────────────────────────────────────

export async function generateProtocolManually(meetingId: string, workspaceId: string) {
  try {
    const { supabase, user, context } = await requireManager(workspaceId);
    await requireMeetingInBuilding(supabase, meetingId, context.primaryBuildingId);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return { success: false, error: 'Szerver konfiguráció hiányzik.' };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-assembly-protocol`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting_id: meetingId, building_id: context.primaryBuildingId }),
    });
    if (!response.ok) {
      return { success: false, error: 'A jegyzőkönyv generálása sikertelen.' };
    }

    const result = await response.json() as { protocol_url?: string };
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_name: user.email ?? 'Rendszer',
      action_type: 'protocol_generated',
      entity_type: 'meeting',
      entity_id: meetingId,
      entity_label: 'Közgyűlési Jegyzőkönyv generálva',
    });

    revalidateWorkspace(workspaceId);
    return { success: true, protocol_url: result.protocol_url };
  } catch (error) {
    return { success: false, error: failClosed(error, 'A jegyzőkönyv generálása sikertelen.') };
  }
}
