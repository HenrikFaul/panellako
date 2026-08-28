import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const actions = readSource('app/actions/meetings.ts');
const panel = readSource('components/meeting-detail-panel.tsx');
const dashboard = readSource('components/dashboard-client.tsx');
const voteMigration = readSource('supabase/migrations/20260828125000_vote_integrity_closure.sql');

describe('meeting workspace authorization invariants', () => {
  it('uses workspace capabilities for manager writes and delegates voting to the authoritative command', () => {
    expect(actions).toContain("requireWorkspaceCapability(workspaceId, 'meeting.manage')");
    expect(actions).toContain("requireWorkspaceCapability(workspaceId, 'meeting.read')");
    expect(actions).toContain("supabase.rpc('cast_vote'");
    expect(actions).toContain('p_voter_profile_id: input.attendee_profile_id ?? user.id');
    expect(actions).toContain("return 'A művelet nem engedélyezett.'");
    expect(actions).not.toContain(".from('votes')\n      .upsert");
    expect(actions).not.toContain('voter_profile_id?: string');
  });

  it('maps workspace IDs to the authoritative legacy physical building', () => {
    expect(actions).toContain('building_id: context.primaryBuildingId');
    expect(actions).toContain(".eq('building_id', context.primaryBuildingId)");
    expect(actions).toContain('body: JSON.stringify({ meeting_id: meetingId, building_id: context.primaryBuildingId })');
    expect(actions).not.toContain(".eq('building_id', workspaceId)");
  });

  it('chains meeting, resolution, attendance and unit scope checks', () => {
    expect(actions).toContain('requireMeetingInBuilding');
    expect(actions).toContain('requireResolutionInBuilding');
    expect(actions).toContain("supabase.rpc('record_meeting_attendance'");
    expect(actions).toContain(".from('meeting_attendances')");
    expect(voteMigration).toContain('m.workspace_id = p_workspace_id');
    expect(voteMigration).toContain('ma.meeting_id = v_meeting_id');
    expect(voteMigration).toContain('ma.unit_id = p_unit_id');
    expect(voteMigration).toContain('private.has_verified_owner_relationship');
    expect(voteMigration).toContain('v_weight');
    expect(actions).toContain('unitById.has(vote.unit_id)');
  });

  it('opens voting explicitly and rejects every non-open meeting state in the database command', () => {
    expect(actions).toContain("supabase.rpc('open_meeting_voting'");
    expect(panel).toContain('openMeetingVoting');
    expect(panel).toContain("meeting.status_detail === 'szavazas_folyamatban'");
    expect(voteMigration).toContain("v_meeting_status <> 'tervezett'");
    expect(voteMigration).toContain("v_meeting_status_detail IS DISTINCT FROM 'szavazas_folyamatban'");
    expect(voteMigration).toContain("v_resolution_outcome <> 'folyamatban'");
  });

  it('uses profile-bound attendance commands and locks attendance after the first ballot', () => {
    expect(actions).toContain("supabase.rpc('record_meeting_attendance'");
    expect(actions).toContain("supabase.rpc('remove_meeting_attendance'");
    expect(actions).toContain("supabase.rpc('list_meeting_voter_options'");
    expect(actions).not.toContain('profile_id: input.profile_id ?? null');
    expect(panel).toContain('eligibleVoters');
    expect(panel).toContain('Tulajdonos kiválasztása');
    expect(voteMigration).toContain('REVOKE INSERT, UPDATE, DELETE ON TABLE public.meeting_attendances FROM authenticated');
    expect(voteMigration).toContain('DROP POLICY IF EXISTS meeting_attendances_manager_insert');
    expect(voteMigration).toContain('trg_meeting_attendance_ballot_immutability');
    expect(voteMigration).toContain('ATTENDANCE_LOCKED_BY_BALLOT');
    expect(voteMigration).toContain('VOTE_ATTENDANCE_PROFILE_REQUIRED');
    expect(voteMigration).toContain('MANAGER_VOTER_PROFILE_REQUIRED');
    expect(voteMigration).toContain('p_voter_profile_id IS DISTINCT FROM v_attendee_profile_id');
    expect(voteMigration).toContain('private.has_verified_owner_relationship(v_attendee_profile_id');
  });

  it('derives VOTE_CAST from verified ownership in both capability projections', () => {
    expect(voteMigration).toContain("(SELECT internal_key FROM requested) = 'VOTE_CAST'");
    expect(voteMigration).toContain('private.has_verified_owner_relationship(p_profile_id, p_workspace_id, NULL)');
    expect(voteMigration).not.toMatch(/'MEETING_READ',\s*'VOTE_CAST',\s*'TICKET_CREATE'/);
  });

  it('requires workspace-scoped authenticated access for meeting details', () => {
    expect(actions).toContain('export async function getMeetingWithDetails(meetingId: string, workspaceId: string)');
    expect(actions).toContain('const { supabase, context } = await requireReader(workspaceId)');
    expect(actions).toMatch(/\.eq\('id', meetingId\)[\s\S]*?\.eq\('building_id', context\.primaryBuildingId\)/);
    expect(actions).toContain("error: failClosed(error, 'A közgyűlés részletei nem tölthetők be.')");
  });

  it('passes the route workspace ID through every direct UI action call', () => {
    expect(dashboard).toContain("getMeetingWithDetails(meeting.id, data.buildingId ?? '')");
    expect(dashboard).toContain('workspaceId: data.buildingId ??');
    expect(dashboard).toContain("sendInvitationAction(meeting.id, data.buildingId ?? '')");
    expect(panel).toContain('workspaceId: string');
    expect(panel).toContain('removeAttendance(meeting.id, unit.id, workspaceId)');
    expect(panel).toContain('sendAssemblyInvitation(meeting.id, workspaceId)');
    expect(panel).toContain('updateResolutionOutcome(resolutionId, outcome, workspaceId)');
    expect(panel).toContain('(isManager || canVote)');
    expect(dashboard).toContain("data.workspaceCapabilities.includes('meeting.manage')");
    expect(dashboard).toContain("canVote={data.workspaceCapabilities?.includes('vote.cast') ?? false}");
  });
});
