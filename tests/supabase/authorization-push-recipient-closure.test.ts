import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260829120000_authorization_push_recipient_closure.sql',
  ),
  'utf8',
);

const runtimeCanary = readFileSync(
  resolve(
    process.cwd(),
    'tests/supabase/authorization-push-recipient-runtime-canary.sql',
  ),
  'utf8',
);

function functionBlock(name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION ${name}`;
  const start = migration.indexOf(marker);
  expect(start, `${name} must exist`).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf('CREATE OR REPLACE FUNCTION ', start + marker.length);
  return migration.slice(start, next === -1 ? migration.length : next);
}

describe('authorization and push-recipient closure migration', () => {
  it('restores verified direct-mandate and derivative-delegation authority', () => {
    const capability = functionBlock('private.has_workspace_capability');

    expect(capability).toContain("mm.verification_status = 'VERIFIED'");
    expect(capability).toContain('dm.id = d.source_mandate_id');
    expect(capability).toContain("dm.verification_status = 'VERIFIED'");
    expect(capability).toContain('dm.id IS NOT NULL');
    expect(capability).toContain(
      '(SELECT internal_key FROM requested) = ANY(d.capability_keys)',
    );
  });

  it('grants no capabilities unless the workspace itself is active', () => {
    const capability = functionBlock('private.has_workspace_capability');
    const projection = functionBlock('private.effective_capabilities');

    expect(capability).toContain('FROM public.workspaces workspace');
    expect(capability).toContain("workspace.status = 'ACTIVE'");
    expect(projection).toContain('WITH active_workspace AS');
    expect(projection).toContain("workspace.status = 'ACTIVE'");
    expect(projection.match(/EXISTS \(SELECT 1 FROM active_workspace\)/g)).toHaveLength(3);
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION public.get_my_workspaces');
  });

  it('preserves relationship-derived voting instead of role-derived voting', () => {
    const capability = functionBlock('private.has_workspace_capability');
    const projection = functionBlock('private.effective_capabilities');

    expect(capability).toContain("(SELECT internal_key FROM requested) = 'VOTE_CAST'");
    expect(capability).toContain('private.has_verified_owner_relationship');
    expect(projection).toContain("SELECT 'VOTE_CAST'");
    expect(projection).toContain('private.has_verified_owner_relationship');
  });

  it('exposes a service-role-only tenant-scoped recipient resolver', () => {
    const resolver = functionBlock('public.resolve_workspace_push_recipients');

    expect(resolver).toContain("COALESCE(auth.role(), '') <> 'service_role'");
    expect(resolver).toContain('JOIN public.workspace_memberships membership');
    expect(resolver).toContain('JOIN public.membership_periods period');
    expect(resolver).toContain("workspace.status = 'ACTIVE'");
    expect(resolver).toContain('private.effective_role_keys');
    expect(resolver).toContain('FROM public.person_account_links account_link');
    expect(resolver).toContain('FROM public.unit_ownerships ownership');
    expect(resolver).toContain('FROM public.unit_occupancies occupancy');
    expect(resolver).toContain('ownership.workspace_id = p_workspace_id');
    expect(resolver).toContain('occupancy.workspace_id = p_workspace_id');
    expect(resolver.match(/status = 'VERIFIED'/g)).toHaveLength(2);
    expect(resolver.match(/unit\.status = 'ACTIVE'/g)).toHaveLength(2);
    expect(resolver).toContain('AS is_resident');
    expect(resolver).toContain("v_target_role = 'lako' AND classified.is_resident");
    expect(resolver).not.toContain('NOT classified.is_manager');
    expect(resolver).toContain("v_target_role NOT IN ('all', 'lako', 'manager')");
    expect(resolver).not.toMatch(/profiles\.(email|phone)|membership\.email/i);

    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.resolve_workspace_push_recipients(uuid, text)',
    );
    expect(migration).toContain('FROM PUBLIC, anon, authenticated, service_role;');
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.resolve_workspace_push_recipients(uuid, text)',
    );
    expect(migration).toContain('TO service_role;');
  });

  it('is a forward-only transactional migration', () => {
    expect(migration.trim()).toMatch(/^--[\s\S]*BEGIN;[\s\S]*COMMIT;$/);
    expect(migration).not.toMatch(/DROP\s+(TABLE|SCHEMA|COLUMN)/i);
  });

  it('ships final-schema runtime probes for every corrected boundary', () => {
    expect(runtimeCanary).toContain('unverified direct mandate retained a role capability');
    expect(runtimeCanary).toContain(
      'delegation retained power after its source mandate lost verification',
    );
    expect(runtimeCanary).toContain('suspended workspace retained a baseline capability');
    expect(runtimeCanary).toContain('archived workspace retained a baseline capability');
    expect(runtimeCanary).toContain(
      'authenticated role unexpectedly resolved push recipients',
    );
    expect(runtimeCanary).toContain(
      'manager audience was not derived from effective admin/delegate roles',
    );
    expect(runtimeCanary).toContain('all audience lost an active workspace member');
    expect(runtimeCanary).toContain('runtime-canary:foreign-resident');
    expect(runtimeCanary).toContain('recipient classification failed');
    expect(runtimeCanary).toContain('authorization push recipient runtime canary PASS');
  });
});
