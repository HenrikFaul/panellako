import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260828126000_multitenancy_integrity_closure.sql'),
  'utf8',
);

describe('multitenancy integrity closure migration', () => {
  it('requires complete activation provenance only for ACTIVATED requests', () => {
    expect(migration).toContain("status <> 'ACTIVATED'");
    expect(migration).toContain("status = 'ACTIVATED'");
    expect(migration).toContain('activated_workspace_id = reserved_workspace_id');
    expect(migration).toContain('VALIDATE CONSTRAINT community_creation_requests_activation_shape_check');
    expect(migration).toContain('COMMUNITY_ACTIVATION_PROVENANCE_INVALID');
  });

  it('removes direct service mutation policies from immutable review evidence', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS community_creation_reviews_service_insert');
    expect(migration).toContain('DROP POLICY IF EXISTS community_address_duplicate_service_insert');
  });

  it('binds every document-unit edge to one workspace at schema level', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS workspace_id uuid');
    expect(migration).toContain('document_units_document_scope_fk');
    expect(migration).toContain('FOREIGN KEY (workspace_id, document_id)');
    expect(migration).toContain('document_units_unit_scope_fk');
    expect(migration).toContain('FOREIGN KEY (workspace_id, unit_id)');
    expect(migration).toContain('DOCUMENT_UNIT_WORKSPACE_MISMATCH');
  });

  it('derives workspace scope server-side before every edge mutation', () => {
    expect(migration).toContain('private.sync_document_unit_workspace()');
    expect(migration).toContain('NEW.workspace_id := v_document_workspace_id');
    expect(migration).toContain('BEFORE INSERT OR UPDATE OF workspace_id, document_id, unit_id');
  });
});
