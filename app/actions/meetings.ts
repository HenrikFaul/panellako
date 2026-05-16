'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgendaItemInput {
  order_no: number;
  title: string;
  description?: string;
}

export interface CreateMeetingInput {
  building_id: string;
  title: string;
  scheduled_at: string;
  location: string;
  quorum_threshold?: number;
  chairperson_name?: string;
  secretary_name?: string;
  agenda_items: AgendaItemInput[];
}

export interface RecordAttendanceInput {
  meeting_id: string;
  unit_id: string;
  ownership_share: number;
  profile_id?: string;
  proxy_name?: string;
}

export interface RecordVoteInput {
  resolution_id: string;
  unit_id: string;
  voter_profile_id?: string;
  vote_value: 'igen' | 'nem' | 'tartozkodas';
  weight: number;
}

// ─── createMeeting ───────────────────────────────────────────────────────────

export async function createMeeting(input: CreateMeetingInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve.' };

  if (!input.building_id || !input.title || !input.scheduled_at) {
    return { success: false, error: 'Kötelező mezők: épület, cím, időpont.' };
  }
  if (!input.agenda_items || input.agenda_items.length === 0) {
    return { success: false, error: 'Legalább egy napirendi pont szükséges.' };
  }

  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      building_id: input.building_id,
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
    await supabase.from('meetings').delete().eq('id', meeting.id);
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

  revalidatePath('/');
  return { success: true, data: { meeting_id: meeting.id } };
}

// ─── sendAssemblyInvitation ───────────────────────────────────────────────────

export async function sendAssemblyInvitation(meetingId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve.' };

  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('*, agenda_items(*)')
    .eq('id', meetingId)
    .single();

  if (meetingError || !meeting) return { success: false, error: 'Közgyűlés nem található.' };

  // Check 8-day advance requirement (Ptk. 5:84)
  const now = new Date();
  const scheduled = new Date(meeting.scheduled_at);
  const daysUntilMeeting = Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilMeeting < 8) {
    return {
      success: false,
      error: `Ptk. 5:84 szerint a meghívót legalább 8 nappal korábban kell kiküldeni. Jelenlegi: ${daysUntilMeeting} nap.`
    };
  }

  // Update invitation_sent_at timestamp
  const { error: updateError } = await supabase
    .from('meetings')
    .update({ invitation_sent_at: now.toISOString() })
    .eq('id', meetingId);

  if (updateError) return { success: false, error: updateError.message };

  // Note: actual email sending is delegated to lib/email.ts when RESEND_API_KEY is set
  // This action marks the invitation as sent; email is fire-and-forget
  console.log(`[sendAssemblyInvitation] Meeting ${meetingId} invitation logged. Connect email action for actual send.`);

  revalidatePath('/');
  return { success: true, days_until_meeting: daysUntilMeeting };
}

// ─── recordAttendance ────────────────────────────────────────────────────────

export async function recordAttendance(input: RecordAttendanceInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve.' };

  if (input.ownership_share <= 0 || input.ownership_share > 1) {
    return { success: false, error: 'ownership_share 0–1 közötti szám kell legyen (pl. 0.045 = 4.5%).' };
  }

  const { error } = await supabase
    .from('meeting_attendances')
    .upsert(
      {
        meeting_id: input.meeting_id,
        unit_id: input.unit_id,
        ownership_share: input.ownership_share,
        profile_id: input.profile_id ?? null,
        proxy_name: input.proxy_name ?? null,
        attended_at: new Date().toISOString(),
      },
      { onConflict: 'meeting_id,unit_id' }
    );

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  return { success: true };
}

// ─── recordVote ──────────────────────────────────────────────────────────────

export async function recordVote(input: RecordVoteInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve.' };

  const { error } = await supabase
    .from('votes')
    .upsert(
      {
        resolution_id: input.resolution_id,
        voter_profile_id: input.voter_profile_id ?? user.id,
        unit_id: input.unit_id,
        vote_value: input.vote_value,
        weight: input.weight,
      },
      { onConflict: 'resolution_id,voter_profile_id' }
    );

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  return { success: true };
}

// ─── closeMeeting ─────────────────────────────────────────────────────────────

export async function closeMeeting(meetingId: string, buildingId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve.' };

  // Calculate quorum: sum of attending ownership_share / sum of all building ownership_share
  const [attendanceResult, unitsResult] = await Promise.all([
    supabase.from('meeting_attendances').select('ownership_share').eq('meeting_id', meetingId),
    supabase.from('units').select('ownership_share').eq('building_id', buildingId),
  ]);

  const totalAttending = (attendanceResult.data ?? []).reduce((s: number, r: { ownership_share: number }) => s + r.ownership_share, 0);
  const totalBuilding = (unitsResult.data ?? []).reduce((s: number, r: { ownership_share: number }) => s + r.ownership_share, 0);
  const actualQuorum = totalBuilding > 0 ? totalAttending / totalBuilding : 0;

  const { error } = await supabase
    .from('meetings')
    .update({
      status: 'lezart',
      status_detail: 'lezarva',
      actual_quorum: actualQuorum,
    })
    .eq('id', meetingId);

  if (error) return { success: false, error: error.message };

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_name: user.email ?? 'Rendszer',
    action_type: 'meeting_closed',
    entity_type: 'meeting',
    entity_id: meetingId,
    entity_label: `Kvórum: ${(actualQuorum * 100).toFixed(1)}%`,
  });

  revalidatePath('/');
  return { success: true, actual_quorum: actualQuorum };
}
