import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/db-migrate.yml', 'utf8');
const verifier = readFileSync('scripts/verify-production-multitenancy.sh', 'utf8');

const newMigrations = [
  '20260829110000_workspace_relationship_registry.sql',
  '20260829120000_authorization_push_recipient_closure.sql',
  '20260829130000_invitation_join_lifecycle.sql',
  '20260829140000_workspace_unit_bulk_import.sql',
  '20260829150000_ownership_share_join_flow_closure.sql',
];

const migrationHashes = [
  'd9c17507ca29727563d167846541e32e6b32cebe5d7c6b0a577bccb9e1289369',
  '7fc3e8be055e068a71b28e5694c610f262d8060cc009bedf4d74574bc0d9e00a',
  'c798152672064ec809bc223665c11f6128bbbd02868e1cccdb00b5c9718f23fc',
  'f012ddec8a6c3de57e3096db8258e85d7c4665a473bc9d04576620f3986a5a94',
  '62c6c0baa5bd46b745f0dc995050a4aa54dc44f9521b31c23be10b0bf9cbb70a',
];

describe('v0.10.4 production migration workflow contract', () => {
  it('allowlists every new forward-only migration', () => {
    for (const migration of newMigrations) expect(workflow).toContain(`supabase/migrations/${migration}`);
  });

  it('pins every new migration to its locally validated SHA-256', () => {
    expect(workflow).toContain('ACTUAL_SQL_SHA256=$(sha256sum "$SQL_FILE"');
    for (const hash of migrationHashes) expect(workflow).toContain(hash);
  });

  it('passes the selected migration version to progressive production verification', () => {
    expect(workflow).toContain('EXPECTED_MIGRATION_VERSION=$MIGRATION_VERSION');
    expect(workflow).toContain('^[0-9]{14}$');
    expect(verifier).toContain('EXPECTED_MIGRATION_VERSION="${EXPECTED_MIGRATION_VERSION:-20260829150000}"');
    expect(verifier).toContain("('20260829150000')");
    expect(verifier).toContain("WHERE expected.version <= '${EXPECTED_MIGRATION_VERSION}'");
  });

  it('verifies the new tables and RPCs at their introducing migration', () => {
    for (const contract of [
      'workspace_person_relationship_commands',
      'unit_relationship_status_events',
      'workspace_membership_status_events',
      'join_request_evidence_events',
      'workspace_unit_imports',
      'create_workspace_person_relationship',
      'resolve_workspace_push_recipients',
      'revoke_membership_invitation',
      'resubmit_join_request_evidence',
      'preview_workspace_unit_import',
      'apply_workspace_unit_import',
    ]) expect(verifier).toContain(contract);
  });
});
