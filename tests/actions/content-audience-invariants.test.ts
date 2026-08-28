import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const migration = readSource('supabase/migrations/20260828124000_content_audience_closure.sql');
const commandClosure = readSource('supabase/migrations/20260828128000_content_command_closure.sql');
const documents = readSource('app/actions/documents.ts');

describe('content audience authorization invariants', () => {
  it('uses one authoritative announcement predicate for rows and acknowledgements', () => {
    expect(migration).toContain('private.can_read_announcement(auth.uid(), id)');
    expect(migration).toContain('private.can_read_announcement(auth.uid(), announcement_id)');
    expect(migration).toContain('private.has_verified_unit_relationship');
    expect(migration).not.toContain('CREATE POLICY announcements_member_select');
  });

  it('does not disclose the complete specific-unit target group to a recipient', () => {
    expect(migration).toContain('CREATE POLICY announcement_units_audience_select');
    expect(migration).toContain(
      'private.has_verified_unit_relationship(auth.uid(), a.workspace_id, announcement_units.unit_id)',
    );
  });

  it('normalizes legacy document visibility into a typed fail-closed audience', () => {
    expect(migration).toContain("ELSE 'ADMINS'");
    expect(migration).toContain(
      "CHECK (audience IN ('COMMON', 'OWNERS', 'RESIDENTS', 'SPECIFIC_UNITS', 'ADMINS', 'FINANCE'))",
    );
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.document_units');
  });

  it('shares document authorization between metadata, acknowledgements and storage', () => {
    expect(migration).toContain('private.can_read_document(auth.uid(), id)');
    expect(migration).toContain('private.can_read_document(auth.uid(), document_id)');
    expect(migration).toContain('private.can_read_document(auth.uid(), d.id)');
  });

  it('requires explicit targets for specific-unit document writes', () => {
    expect(documents).toContain("audience === 'SPECIFIC_UNITS' && unitIds.length === 0");
    expect(documents).toContain(".from('document_units')");
    expect(documents).toContain("return { success: false, error: 'A dokumentum célzása sikertelen.' }");
  });

  it('makes audience a derived field and replaces targets transactionally', () => {
    expect(commandClosure).toContain('DOCUMENT_AUDIENCE_DERIVED_FIELD');
    expect(commandClosure).toContain('CREATE OR REPLACE FUNCTION public.replace_document_audience');
    expect(commandClosure).toContain('DELETE FROM public.document_units');
    expect(commandClosure).toContain('DOCUMENT_UNIT_WORKSPACE_MISMATCH');
    expect(documents).toContain("supabase.rpc('replace_document_audience'");
  });

  it('does not expose arbitrary-profile relationship predicates to clients', () => {
    expect(commandClosure).toContain(
      'REVOKE EXECUTE ON FUNCTION private.has_verified_owner_relationship(uuid, uuid, uuid)',
    );
    expect(commandClosure).toContain('private.can_current_user_read_document');
    expect(commandClosure).toContain('private.current_user_has_verified_unit_relationship');
  });
});
