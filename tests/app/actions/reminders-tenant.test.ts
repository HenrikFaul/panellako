import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'app/actions/reminders.ts'), 'utf8');

function between(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('reminder workspace authorization invariants', () => {
  it('accepts workspace identity on every public operation and requires reminder.manage', () => {
    const publicInput = between(
      'export interface ReminderRuleInput',
      'const ACTIVITY_TYPES',
    );

    expect(publicInput).toContain('workspaceId: string;');
    expect(source).toContain(
      'export async function toggleReminderRule(workspaceId: string, ruleId: string, enabled: boolean)',
    );
    expect(source).toContain(
      'export async function getPendingReminderRecipients(workspaceId: string, ruleId: string)',
    );
    expect(source).toMatch(
      /export async function executeReminderRule\(\s*workspaceId: string,\s*ruleId: string/,
    );
    expect(source).toContain("requireWorkspaceCapability(workspaceId, 'reminder.manage')");
    expect(publicInput).not.toContain('building_id: string;');
  });

  it('writes and queries both the workspace and its mapped physical building', () => {
    const createBody = between(
      'export async function createReminderRule',
      'export async function toggleReminderRule',
    );
    const toggleBody = between(
      'export async function toggleReminderRule',
      'export async function getPendingReminderRecipients',
    );

    expect(createBody).toContain('workspace_id: context.workspaceId');
    expect(createBody).toContain('building_id: context.primaryBuildingId');
    expect(toggleBody).toContain(".eq('workspace_id', context.workspaceId)");
    expect(toggleBody).toContain(".eq('building_id', context.primaryBuildingId)");
    expect(source).not.toContain(".eq('building_id', workspaceId)");
  });

  it('validates every activity object inside the resolved tenant before use', () => {
    const scopeBody = between(
      'async function requireActivityInWorkspace',
      'async function loadScopedRule',
    );

    expect(scopeBody).toContain(".from('announcements')");
    expect(scopeBody).toContain(".from('documents')");
    expect(scopeBody).toContain(".from('resolutions')");
    expect(scopeBody).toContain(".from('utility_reading_requests')");
    expect(scopeBody.match(/\.eq\('workspace_id', workspaceId\)/g)?.length).toBe(2);
    expect(scopeBody).toContain(".eq('meetings.workspace_id', workspaceId)");
    expect(scopeBody).toContain(".eq('meetings.building_id', physicalBuildingId)");
    expect(scopeBody).toContain(".eq('building_id', physicalBuildingId)");
  });

  it('derives recipients only from active workspace memberships without profile PII', () => {
    const recipientBody = between(
      'async function getPendingRecipientsForRule',
      'export async function createReminderRule',
    );

    expect(recipientBody).toContain(".from('workspace_memberships')");
    expect(recipientBody).toContain(".select('profile_id')");
    expect(recipientBody).toContain(".eq('workspace_id', rule.workspace_id)");
    expect(recipientBody).toContain(".eq('status', 'ACTIVE')");
    expect(recipientBody).not.toContain(".from('memberships')");
    expect(source).not.toContain(".from('profiles')");
    expect(recipientBody).not.toMatch(/full_name|email/);
  });

  it('does not nest public actions and writes tenant-scoped notifications with checked audit rows', () => {
    const executeBody = between(
      'export async function executeReminderRule',
      'function getReminderMessage',
    );

    expect(executeBody).toContain('getPendingRecipientsForRule(supabase, rule)');
    expect(executeBody).not.toContain('getPendingReminderRecipients(');
    expect(executeBody).toContain('workspace_id: context.workspaceId');
    expect(executeBody).toContain('building_id: context.primaryBuildingId');
    expect(executeBody).toContain(".from('reminder_sends')");
    expect(executeBody).toContain("supabase.rpc('record_reminder_send'");
    expect(executeBody).toContain('p_idempotency_key: reminderSendIdempotencyKey(');
    expect(executeBody).not.toMatch(/\.from\('reminder_sends'\)[\s\S]{0,120}\.upsert\(/);
    expect(executeBody).toContain('if (auditError)');
    expect(executeBody).toContain('Notification audit rollback failed.');
    expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(source).not.toContain('createClient<Database>');
  });

  it('fails closed with generic public errors instead of returning database messages', () => {
    expect(source).toContain("return 'A művelet nem engedélyezett.'");
    expect(source).not.toMatch(/error:\s*error\.message/);
    expect(source).not.toMatch(/error:\s*\w+Error\.message/);
  });
});
