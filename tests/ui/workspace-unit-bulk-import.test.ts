import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const component = readFileSync('components/workspace-unit-bulk-import.tsx', 'utf8');
const actions = readFileSync('app/actions/workspace-admin.ts', 'utf8');

describe('workspace unit bulk import UI contract', () => {
  it('requires a server preview before the atomic apply action can be enabled', () => {
    expect(component).toContain('previewWorkspaceUnitImport');
    expect(component).toContain('const canApply = preview.length > 0 && issueCount === 0');
    expect(component).toContain('disabled={!canApply');
  });

  it('keeps the idempotency key stable for a retry of the same batch', () => {
    expect(component).toContain("attempt.current = { fingerprint, key: window.crypto.randomUUID() }");
    expect(component).toContain('idempotencyKey: attempt.current.key');
  });

  it('authorizes both RPC calls through unit.manage and validates the apply response', () => {
    expect(actions.match(/requireWorkspaceCapability\(input\.workspaceId, 'unit\.manage'\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(actions).toContain("supabase.rpc('preview_workspace_unit_import'");
    expect(actions).toContain("supabase.rpc('apply_workspace_unit_import'");
    expect(actions).toContain('(applied && (!importId || !isUuid(importId)))');
  });

  it('preserves the CSV draft and exposes the MFA step-up route before retry', () => {
    expect(component).toContain('window.sessionStorage.setItem(draftKey, source)');
    expect(component).toContain('window.sessionStorage.getItem(draftKey)');
    expect(component).toContain('result.mfaRequired ? result.stepUpHref : undefined');
    expect(component).toContain("t('workspaceAdmin.unitImport.openSecurity')");
  });
});
