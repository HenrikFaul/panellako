import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const action = readFileSync(join(root, 'app/actions/announcements.ts'), 'utf8');
const migration = readFileSync(
  join(root, 'supabase/migrations/20260828127000_announcement_delivery_outbox.sql'),
  'utf8',
);

describe('announcement delivery invariants', () => {
  it('derives recipients from the same verified audience predicate as reads', () => {
    expect(migration).toContain('private.can_read_announcement(membership.profile_id, p_announcement_id)');
    expect(migration).toContain("membership.status = 'ACTIVE'");
    expect(migration).toContain("private.has_workspace_capability(v_actor, p_workspace_id, 'COMMUNICATION_MANAGE')");
  });

  it('stores no email address or other recipient PII in the outbox', () => {
    const table = migration.slice(
      migration.indexOf('CREATE TABLE IF NOT EXISTS public.announcement_delivery_outbox'),
      migration.indexOf('CREATE INDEX IF NOT EXISTS announcement_delivery_outbox_worker_idx'),
    );
    expect(table).toContain('recipient_profile_id uuid');
    expect(table).not.toMatch(/recipient_email|email_address|email\s+(?:text|varchar)/i);
    expect(table).not.toMatch(/full_name|phone_number|postal_address/i);
  });

  it('is idempotent, audited and default-deny for application clients', () => {
    expect(migration).toContain('private.lock_idempotent_command');
    expect(migration).toContain('private.record_idempotent_command');
    expect(migration).toContain('ANNOUNCEMENT_DELIVERY_ENQUEUED');
    expect(migration).toContain('ALTER TABLE public.announcement_delivery_outbox FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON TABLE public.announcement_delivery_outbox');
    expect(migration).toContain('ON CONFLICT ON CONSTRAINT announcement_delivery_outbox_recipient_uq DO NOTHING');
  });

  it('uses the outbox command instead of legacy role projection or fire-and-forget email', () => {
    expect(action).toContain("supabase.rpc('enqueue_announcement_delivery'");
    expect(action).toContain('p_workspace_id: context.workspaceId');
    expect(action).toContain('p_idempotency_key: ann.id');
    expect(action).not.toContain(".from('memberships')");
    expect(action).not.toContain(".from('profiles')");
    expect(action).not.toContain('sendBulkEmail');
    expect(action).not.toContain('fire-and-forget');
  });

  it('compensates the created announcement when targeting, reminder or queue setup fails', () => {
    expect(action).toContain('const rollbackAnnouncement = async () =>');
    expect(action.match(/await rollbackAnnouncement\(\);/g)).toHaveLength(3);
  });
});
