import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260829140000_workspace_unit_bulk_import.sql',
  ),
  'utf8',
);
const runtimeCanary = readFileSync(
  resolve(
    process.cwd(),
    'tests/supabase/workspace-unit-bulk-import-runtime-canary.sql',
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

describe('workspace unit bulk import migration', () => {
  it('exposes stable preview and atomic apply RPC contracts', () => {
    const preview = functionBlock('public.preview_workspace_unit_import');
    const apply = functionBlock('public.apply_workspace_unit_import');

    expect(preview).toContain('p_workspace_id uuid');
    expect(preview).toContain('p_rows jsonb');
    for (const field of [
      'row_number integer',
      'designation text',
      'normalized_designation text',
      'unit_category text',
      'parent_designation text',
      'parent_normalized_designation text',
      'status text',
      'error_code text',
      'error_message text',
    ]) {
      expect(preview).toContain(field);
    }

    expect(apply).toContain('p_workspace_id uuid');
    expect(apply).toContain('p_rows jsonb');
    expect(apply).toContain('p_idempotency_key uuid');
    expect(apply).toMatch(
      /import_id uuid,[\s\S]*applied boolean,[\s\S]*imported_count integer,[\s\S]*results jsonb/,
    );
  });

  it('caps and normalizes a deterministic tenant-scoped preview', () => {
    const validate = functionBlock('private.validate_workspace_unit_import');
    const preview = functionBlock('public.preview_workspace_unit_import');

    expect(preview).toContain(
      "private.require_workspace_capability(p_workspace_id, 'UNIT_MANAGE')",
    );
    expect(preview).not.toContain('private.require_recent_aal2');
    expect(validate).toContain("jsonb_typeof(p_rows) <> 'array'");
    expect(validate).toContain('v_row_count > 500');
    expect(validate).toContain('private.normalize_unit_designation');
    expect(validate).toContain('DUPLICATE_IN_BATCH');
    expect(validate).toContain('ACTIVE_UNIT_ALREADY_EXISTS');
    expect(validate).toContain('LEGACY_UNIT_LABEL_RESERVED');
    expect(validate).toContain('PARENT_AMBIGUOUS_IN_BATCH');
    expect(validate).toContain('PARENT_NOT_FOUND');
    expect(validate).toContain('PARENT_ROW_INVALID');
    expect(validate).toContain('PARENT_CYCLE');
    expect(validate).toContain('WITH RECURSIVE parent_walk');
    expect(validate).toContain('parent.workspace_id = p_workspace_id');
    expect(validate).toContain('existing.workspace_id = p_workspace_id');
    expect(validate).toContain('parent.physical_building_id = v_building_id');
    expect(validate).toContain('existing.physical_building_id = v_building_id');
    expect(validate).not.toMatch(/similarity\s*\(/i);
  });

  it('requires fresh AAL2 and writes the whole normalized and legacy projection together', () => {
    const apply = functionBlock('public.apply_workspace_unit_import');

    expect(apply).toContain(
      "private.require_workspace_capability(p_workspace_id, 'UNIT_MANAGE')",
    );
    expect(apply).toContain("private.require_recent_aal2(interval '15 minutes')");
    expect(apply).toContain("'apply_workspace_unit_import'");
    expect(apply).toContain('private.lock_idempotent_command');
    expect(apply).toContain('IDEMPOTENCY_PAYLOAD_MISMATCH');
    expect(apply).toContain('pg_advisory_xact_lock');
    expect(apply).toContain('INSERT INTO public.units');
    expect(apply).toMatch(
      /id, building_id, unit_label, unit_type, workspace_id,[\s\S]*physical_building_id, designation, normalized_designation/,
    );
    expect(apply).toContain('INSERT INTO public.unit_relations');
    expect(apply).toContain("'ACCESSORY_OF'");
    expect(apply).toContain('EXCEPTION');
    expect(apply).toContain('WHEN unique_violation');
    expect(apply).toContain('RETURN QUERY SELECT NULL::uuid, false, 0, v_results');
  });

  it('persists immutable successful receipts and one aggregate audit event', () => {
    const apply = functionBlock('public.apply_workspace_unit_import');

    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS public.workspace_unit_imports',
    );
    expect(migration).toContain(
      'CONSTRAINT workspace_unit_imports_actor_idempotency_uq',
    );
    expect(migration).toContain(
      'ALTER TABLE public.workspace_unit_imports ENABLE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'ALTER TABLE public.workspace_unit_imports FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain('WORKSPACE_UNIT_IMPORT_IMMUTABLE');
    expect(migration).toContain(
      'REVOKE ALL ON TABLE public.workspace_unit_imports',
    );
    expect(migration).not.toMatch(
      /GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)[^;]*workspace_unit_imports[^;]*authenticated/i,
    );
    expect(apply).toContain('INSERT INTO public.workspace_unit_imports');
    expect(apply).toContain('private.record_idempotent_command');
    expect(apply).toContain('private.write_authorization_event');
    expect(apply).toContain("'WORKSPACE_UNITS_BULK_IMPORTED'");
  });

  it('revokes public access and grants only authenticated RPC execution', () => {
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION private.validate_workspace_unit_import(uuid, jsonb)',
    );
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.preview_workspace_unit_import(uuid, jsonb)',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.preview_workspace_unit_import(uuid, jsonb)',
    );
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.apply_workspace_unit_import(uuid, jsonb, uuid)',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.apply_workspace_unit_import(uuid, jsonb, uuid)',
    );
  });

  it('ships a rollback-only runtime canary for atomicity, isolation and MFA', () => {
    expect(runtimeCanary).toContain('\\set ON_ERROR_STOP on');
    expect(runtimeCanary).toContain('BEGIN;');
    expect(runtimeCanary).toContain('ROLLBACK;');
    expect(runtimeCanary).toContain('public.preview_workspace_unit_import');
    expect(runtimeCanary).toContain('public.apply_workspace_unit_import');
    expect(runtimeCanary).toContain('same-batch parent relationship was not created');
    expect(runtimeCanary).toContain('invalid batch left a partial unit write');
    expect(runtimeCanary).toContain('cross-tenant parent was not masked as not found');
    expect(runtimeCanary).toContain('MFA_STEP_UP_REQUIRED');
  });
});
