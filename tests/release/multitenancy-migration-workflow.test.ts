import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/db-migrate.yml', 'utf8');
const verifier = readFileSync('scripts/verify-production-multitenancy.sh', 'utf8');
const validator = readFileSync('scripts/validate-migration-release.mjs', 'utf8');
const manifestPath = '.github/migration-manifests/20260830120000_multitenancy-release.sha256';
const manifestLines = readFileSync(manifestPath, 'utf8').trim().split(/\r?\n/);
const manifestEntries = manifestLines.map((line) => {
  const match = /^([0-9a-f]{64}) \*(supabase\/migrations\/(\d{14})_.+\.sql)$/.exec(line);
  if (!match) throw new Error(`Malformed manifest fixture: ${line}`);
  return { hash: match[1], path: match[2], version: match[3], file: basename(match[2]) };
});

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function runValidator(args: string[]) {
  const result = spawnSync(process.execPath, ['scripts/validate-migration-release.mjs', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Validator failed.');
  return JSON.parse(result.stdout);
}

function writeFixture(name: string, value: unknown) {
  const directory = mkdtempSync(join(tmpdir(), 'panellako-migration-release-'));
  temporaryDirectories.push(directory);
  const file = join(directory, name);
  writeFileSync(file, JSON.stringify(value));
  return file;
}

describe('production migration release workflow contract', () => {
  it('pins the exact 18-file release manifest to the current migration bytes', () => {
    expect(manifestEntries).toHaveLength(18);
    expect(manifestEntries[0]?.version).toBe('20260828120000');
    expect(manifestEntries.at(-1)?.version).toBe('20260830120000');
    for (const entry of manifestEntries) {
      const actual = createHash('sha256').update(readFileSync(entry.path)).digest('hex');
      expect(actual, entry.path).toBe(entry.hash);
    }
    expect(workflow).toContain(`MIGRATION_MANIFEST: ${manifestPath}`);
    expect(workflow).toContain('sha256sum -c "${MIGRATION_MANIFEST}"');
  });

  it('uses a fixed protected production target with serialized audit/deploy modes', () => {
    expect(workflow).toContain('- audit');
    expect(workflow).toContain('- deploy');
    expect(workflow).toContain('environment:\n      name: production');
    expect(workflow).toContain('group: panellako-production-db-migration');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow.match(/wzromwxpjlyrqbdiapep/g)?.length).toBeGreaterThanOrEqual(3);
    expect(workflow).toContain('refs/heads/main');
    expect(workflow).toContain('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}');
    expect(workflow).toContain('SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}');
    expect(workflow).toContain('${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}');
    expect(workflow).toContain('${SUPABASE_DB_PASSWORD:?SUPABASE_DB_PASSWORD is required}');
    expect(workflow).toContain('actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6');
    expect(workflow).toContain('actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6');
    expect(workflow).toMatch(/supabase@2\.116\.0 link \\\n\s+--project-ref "\$\{PANELLAKO_PROJECT_REF\}" \\\n\s+--password "\$\{SUPABASE_DB_PASSWORD\}"/);
    expect(workflow.indexOf('supabase@2.116.0 link')).toBeLessThan(workflow.indexOf('migration list --linked'));
  });

  it('uses only pinned ledger-aware CLI deployment with machine-readable pre/post evidence', () => {
    expect(workflow).toContain('npx --yes supabase@2.116.0 --version');
    expect(workflow.match(/migration list --linked --output-format json/g)?.length).toBe(3);
    expect(workflow.match(/db push --linked --skip-vault --dry-run --output-format json/g)?.length).toBe(3);
    expect(workflow.match(/npx --yes supabase@2\.116\.0 db push --linked --skip-vault --yes/g)?.length).toBe(1);
    expect(workflow).not.toContain('/database/query');
    expect(workflow).not.toContain('migration repair');
    expect(workflow).not.toContain('--include-all');
    expect(workflow).not.toContain('--include-seed');
    expect(workflow).not.toContain('--include-roles');
    expect(workflow).not.toContain('supabase/seed.sql');
    expect(workflow).not.toContain('supabase/roles.sql');
    expect(workflow).not.toContain('BACKUP_CONFIRMATION');
    expect(workflow).not.toContain('manual-backup');
    expect(workflow).toMatch(/--dry-run --output-format json > "\$\{DRY_RUN\}"[\s\S]+?--expect suffix[\s\S]+?db push --linked --skip-vault --yes/);
    expect(workflow).toMatch(/migration-list\.postdeploy\.json[\s\S]+?db-push-dry-run\.postdeploy\.json[\s\S]+?--expect clean[\s\S]+?verify-production-multitenancy\.sh/);
  });

  it('requires a recent platform PITR point or completed backup without logging the payload', () => {
    expect(workflow).toContain('/database/backups');
    expect(workflow).toContain('--output "${BACKUP_RESPONSE}"');
    expect(workflow).not.toContain('echo "${BACKUP_RESPONSE}"');
    expect(validator).toContain('MAX_PITR_AGE_SECONDS = 2 * 60 * 60');
    expect(validator).toContain('MAX_BACKUP_AGE_SECONDS = 36 * 60 * 60');

    const now = 2_000_000_000;
    const freshPitr = writeFixture('pitr.json', {
      pitr_enabled: true,
      physical_backup_data: { latest_physical_backup_date_unix: now - 7_199 },
      backups: [],
    });
    expect(runValidator(['backup', '--backup', freshPitr, '--now-epoch', String(now)])).toMatchObject({
      status: 'ok', evidence: 'pitr', ageSeconds: 7_199,
    });

    const freshBackup = writeFixture('backup.json', {
      pitr_enabled: false,
      backups: [{ status: 'COMPLETED', inserted_at: new Date((now - 129_599) * 1000).toISOString() }],
    });
    expect(runValidator(['backup', '--backup', freshBackup, '--now-epoch', String(now)])).toMatchObject({
      status: 'ok', evidence: 'completed-backup', ageSeconds: 129_599,
    });

    const staleBackup = writeFixture('stale.json', {
      pitr_enabled: true,
      physical_backup_data: { latest_physical_backup_date_unix: now - 7_201 },
      backups: [{ status: 'COMPLETED', inserted_at: new Date((now - 129_601) * 1000).toISOString() }],
    });
    expect(() => runValidator(['backup', '--backup', staleBackup, '--now-epoch', String(now)])).toThrow(
      /No fresh platform PITR point/,
    );
  });

  it('accepts only an exact manifest-contiguous pending suffix', () => {
    const pending = manifestEntries.slice(-3);
    const migrationList = writeFixture('list.json', {
      migrations: [
        { local: '20260516', remote: '20260516', time: '' },
        { local: '20260518002', remote: '20260518002', time: '' },
        ...manifestEntries.map((entry, index) => ({
          local: entry.version,
          remote: index < manifestEntries.length - pending.length ? entry.version : '',
          time: '',
        })),
      ],
    });
    const dryRun = writeFixture('dry-run.json', {
      upToDate: false,
      dryRun: true,
      migrations: pending.map((entry) => entry.file),
      seeds: [],
      roles: [],
      message: 'Finished supabase db push.',
    });
    expect(runValidator([
      'state', '--manifest', manifestPath, '--migration-list', migrationList,
      '--dry-run', dryRun, '--expect', 'suffix',
    ])).toMatchObject({ status: 'ok', pendingCount: 3, pendingVersions: pending.map((entry) => entry.version) });

    const driftedList = writeFixture('drift.json', {
      migrations: [{ local: '', remote: '20260827120000', time: '' }],
    });
    expect(() => runValidator([
      'state', '--manifest', manifestPath, '--migration-list', driftedList,
      '--dry-run', dryRun, '--expect', 'suffix',
    ])).toThrow();

    const malformedList = writeFixture('malformed.json', {
      migrations: [
        { local: '202605160', remote: '202605160', time: '' },
        ...manifestEntries.map((entry) => ({ local: entry.version, remote: entry.version, time: '' })),
      ],
    });
    const cleanDryRun = writeFixture('clean.json', {
      upToDate: true, dryRun: true, migrations: [], seeds: [], roles: [],
    });
    expect(() => runValidator([
      'state', '--manifest', manifestPath, '--migration-list', malformedList,
      '--dry-run', cleanDryRun, '--expect', 'clean',
    ])).toThrow(/malformed version/);
  });

  it('keeps raw Management API SQL read-only and isolated to the verifier', () => {
    expect(verifier).toContain('/database/query');
    expect(verifier).toContain('{"query": $sql, "read_only": true}');
    expect(verifier).toContain('--output "$RESPONSE_BODY"');
    expect(verifier).not.toContain('"read_only": false');
    expect(verifier).not.toContain('echo "$BODY"');
    expect(verifier).not.toContain('jq .');
  });

  it('extends the progressive 1200-1500 verifier through the address registry closure', () => {
    expect(verifier).toContain('EXPECTED_MIGRATION_VERSION="${EXPECTED_MIGRATION_VERSION:-20260830120000}"');
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
      'address_registry_identities',
      'address_source_aliases',
      'consume_address_lookup_quota',
      'consume_community_request_quota',
      'upsert_user_reference_address_v2',
      'create_community_creation_request_v2',
    ]) expect(verifier).toContain(contract);
    expect(verifier).toContain("('20260830120000')");
    expect(verifier).toContain('address_command_privileges_ok');
    expect(verifier).toContain("has_function_privilege('anon', commands.legacy_community_request, 'EXECUTE')");
    expect(verifier).toContain("has_function_privilege('authenticated', commands.community_request_v2, 'EXECUTE')");
    expect(verifier).toContain("has_function_privilege('service_role', commands.community_request_v2, 'EXECUTE')");
    expect(verifier).toContain('prevent_untrusted_reference_registry_provenance');
    expect(verifier).toContain('prevent_community_address_snapshot_change');
  });
});
