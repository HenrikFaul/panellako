#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const RELEASE_START = '20260828120000';
const RELEASE_END = '20260830120000';
const RELEASE_COUNT = 18;
const MAX_PITR_AGE_SECONDS = 2 * 60 * 60;
const MAX_BACKUP_AGE_SECONDS = 36 * 60 * 60;
const MAX_FUTURE_SKEW_SECONDS = 5 * 60;
const LEGACY_OR_TIMESTAMP_VERSION = /^(?:\d{8}|\d{11}|\d{14})$/;

function fail(message) {
  throw new Error(message);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    fail(`Invalid JSON artifact: ${file}`);
  }
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const values = new Map();
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (!key?.startsWith('--') || value === undefined) fail('Arguments must be --key value pairs.');
    values.set(key.slice(2), value);
  }
  return { command, values };
}

export function loadManifest(file) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const entries = lines.map((line) => {
    const match = /^([0-9a-f]{64}) \*(supabase\/migrations\/(\d{14})_[a-z0-9_-]+\.sql)$/.exec(line);
    if (!match) fail(`Malformed SHA-256 manifest line: ${line}`);
    return { hash: match[1], path: match[2], version: match[3], file: basename(match[2]) };
  });

  const versions = entries.map((entry) => entry.version);
  if (entries.length !== RELEASE_COUNT) fail(`Manifest must contain exactly ${RELEASE_COUNT} migrations.`);
  if (versions[0] !== RELEASE_START || versions.at(-1) !== RELEASE_END) {
    fail(`Manifest must span ${RELEASE_START} through ${RELEASE_END}.`);
  }
  if (new Set(versions).size !== versions.length || new Set(entries.map((entry) => entry.path)).size !== entries.length) {
    fail('Manifest contains duplicate migration versions or paths.');
  }
  if (versions.some((version, index) => index > 0 && version <= versions[index - 1])) {
    fail('Manifest migrations must be strictly ordered by version.');
  }

  const filesInRange = readdirSync(resolve('supabase/migrations'))
    .filter((name) => /^\d{14}_.+\.sql$/.test(name))
    .filter((name) => {
      const version = name.slice(0, 14);
      return version >= RELEASE_START && version <= RELEASE_END;
    })
    .sort();
  if (JSON.stringify(filesInRange) !== JSON.stringify(entries.map((entry) => entry.file))) {
    fail('Manifest is not the exact on-disk migration set in the release range.');
  }
  return entries;
}

function verifyManifestHashes(entries) {
  for (const entry of entries) {
    const actual = createHash('sha256').update(readFileSync(entry.path)).digest('hex');
    if (actual !== entry.hash) fail(`SHA-256 mismatch for ${entry.path}.`);
  }
}

export function validateReleaseState(entries, migrationList, dryRun, expect) {
  if (!migrationList || !Array.isArray(migrationList.migrations)) {
    fail('Migration list JSON is missing its migrations array.');
  }
  if (!dryRun || dryRun.dryRun !== true || !Array.isArray(dryRun.migrations)) {
    fail('Dry-run JSON is missing a true dryRun flag or migrations array.');
  }
  if (!Array.isArray(dryRun.seeds) || dryRun.seeds.length !== 0) fail('Seed application is forbidden.');
  if (!Array.isArray(dryRun.roles) || dryRun.roles.length !== 0) fail('Role application is forbidden.');

  const localVersions = new Set();
  const remoteVersions = new Set();
  const localOnly = [];
  for (const row of migrationList.migrations) {
    const local = typeof row?.local === 'string' ? row.local : '';
    const remote = typeof row?.remote === 'string' ? row.remote : '';
    if ((local && !LEGACY_OR_TIMESTAMP_VERSION.test(local)) || (remote && !LEGACY_OR_TIMESTAMP_VERSION.test(remote))) {
      fail('Migration list contains a malformed version.');
    }
    if (!local && remote) fail(`Remote-only migration history detected at ${remote}.`);
    if (local && remote && local !== remote) fail(`Migration history mismatch: ${local} != ${remote}.`);
    if (local && localVersions.has(local)) fail(`Duplicate local migration version: ${local}.`);
    if (remote && remoteVersions.has(remote)) fail(`Duplicate remote migration version: ${remote}.`);
    if (local) localVersions.add(local);
    if (remote) remoteVersions.add(remote);
    if (local && !remote) localOnly.push(local);
  }

  const manifestVersions = entries.map((entry) => entry.version);
  for (const version of manifestVersions) {
    if (!localVersions.has(version)) fail(`Manifest migration is missing from the CLI local history: ${version}.`);
  }
  const expectedPendingVersions = manifestVersions.slice(manifestVersions.length - localOnly.length);
  if (JSON.stringify(localOnly) !== JSON.stringify(expectedPendingVersions)) {
    fail('Pending migrations are not an exact contiguous suffix of the release manifest.');
  }

  const expectedPendingFiles = entries.slice(entries.length - localOnly.length).map((entry) => entry.file);
  if (JSON.stringify(dryRun.migrations) !== JSON.stringify(expectedPendingFiles)) {
    fail('Dry-run migrations do not exactly match the manifest-derived pending suffix.');
  }
  if (dryRun.upToDate !== (localOnly.length === 0)) fail('Dry-run upToDate flag is inconsistent.');
  if (expect === 'clean' && localOnly.length !== 0) fail('Post-deploy verification still has pending migrations.');
  if (!['suffix', 'clean'].includes(expect)) fail('Expected state must be suffix or clean.');

  return {
    status: 'ok',
    releaseStart: entries[0].version,
    releaseEnd: entries.at(-1).version,
    migrationCount: entries.length,
    pendingCount: localOnly.length,
    pendingVersions: localOnly,
  };
}

export function validateBackupState(payload, nowEpochSeconds) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('Backup response is invalid.');
  if (!Number.isFinite(nowEpochSeconds) || nowEpochSeconds <= 0) fail('Current epoch is invalid.');

  const latestPhysical = Number(payload.physical_backup_data?.latest_physical_backup_date_unix);
  const pitrAge = nowEpochSeconds - latestPhysical;
  const freshPitr = payload.pitr_enabled === true
    && Number.isFinite(latestPhysical)
    && latestPhysical > 0
    && pitrAge >= -MAX_FUTURE_SKEW_SECONDS
    && pitrAge <= MAX_PITR_AGE_SECONDS;

  const completedAges = (Array.isArray(payload.backups) ? payload.backups : [])
    .filter((backup) => typeof backup?.status === 'string' && backup.status.toUpperCase() === 'COMPLETED')
    .map((backup) => Date.parse(backup.inserted_at) / 1000)
    .filter(Number.isFinite)
    .map((timestamp) => nowEpochSeconds - timestamp)
    .filter((age) => age >= -MAX_FUTURE_SKEW_SECONDS);
  const freshestCompletedAge = completedAges.length > 0 ? Math.min(...completedAges) : Number.POSITIVE_INFINITY;
  const freshCompletedBackup = freshestCompletedAge <= MAX_BACKUP_AGE_SECONDS;

  if (!freshPitr && !freshCompletedBackup) {
    fail('No fresh platform PITR point (2h) or completed platform backup (36h) is available.');
  }
  return {
    status: 'ok',
    evidence: freshPitr ? 'pitr' : 'completed-backup',
    ageSeconds: Math.max(0, Math.floor(freshPitr ? pitrAge : freshestCompletedAge)),
  };
}

function required(values, name) {
  const value = values.get(name);
  if (!value) fail(`Missing --${name}.`);
  return value;
}

export function main(argv = process.argv.slice(2)) {
  const { command, values } = parseArgs(argv);
  if (command === 'manifest') {
    const entries = loadManifest(required(values, 'manifest'));
    verifyManifestHashes(entries);
    return { status: 'ok', releaseStart: entries[0].version, releaseEnd: entries.at(-1).version, migrationCount: entries.length };
  }
  if (command === 'state') {
    const entries = loadManifest(required(values, 'manifest'));
    return validateReleaseState(
      entries,
      readJson(required(values, 'migration-list')),
      readJson(required(values, 'dry-run')),
      values.get('expect') ?? 'suffix',
    );
  }
  if (command === 'backup') {
    const now = values.has('now-epoch') ? Number(values.get('now-epoch')) : Math.floor(Date.now() / 1000);
    return validateBackupState(readJson(required(values, 'backup')), now);
  }
  fail('Usage: validate-migration-release.mjs manifest|state|backup [options]');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    console.log(JSON.stringify(main()));
  } catch (error) {
    console.error(`Migration release validation failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exit(1);
  }
}
