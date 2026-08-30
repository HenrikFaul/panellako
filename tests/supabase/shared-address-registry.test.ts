import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260830120000_shared_geodata_address_registry.sql'),
  'utf8',
);

function functionBlock(name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION ${name}`;
  const start = migration.indexOf(marker);
  expect(start, `${name} must exist`).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf('CREATE OR REPLACE FUNCTION ', start + marker.length);
  return migration.slice(start, next === -1 ? migration.length : next);
}

describe('shared GeoData address registry database contract', () => {
  it('stores a bounded immutable source snapshot without creating tenant access', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS address_source_snapshot jsonb');
    expect(migration).toContain('octet_length(address_source_snapshot::text) <= 16384');
    expect(migration).toContain("'REGISTRY', 'MANUAL_REVIEW', 'LEGACY_MANUAL_REVIEW'");
    expect(migration).toContain("address_source_snapshot ? 'mode'");
    expect(migration).toContain("address_source_snapshot ? 'contractVersion'");
    expect(migration).toContain("jsonb_typeof(address_source_snapshot -> 'mode') = 'string'");
    expect(migration).toContain('trg_community_address_snapshot_immutable');
    expect(functionBlock('private.prevent_community_address_snapshot_change')).toContain(
      'ADDRESS_SNAPSHOT_IMMUTABLE',
    );

    const command = functionBlock('public.create_community_creation_request_v2');
    expect(command).toContain("'PENDING_VERIFICATION'");
    expect(command).not.toMatch(
      /INSERT INTO public\.(workspaces|physical_buildings|buildings|workspace_memberships|management_mandates|role_assignments)/i,
    );
  });

  it('allows only the trusted server role to assert an OSM source identity', () => {
    const command = functionBlock('public.create_community_creation_request_v2');
    expect(command).toContain("COALESCE(auth.role(), '') <> 'service_role'");
    expect(command).toContain('TRUSTED_ADDRESS_COMMAND_REQUIRED');
    expect(command).toContain("v_source_system NOT IN ('OSM', 'MANUAL')");
    expect(command).toContain("v_source_record_id !~ '^osm:(node|way|relation):[0-9]+$'");
    expect(command).toContain("CASE WHEN v_is_registry THEN 'SOURCE_MATCHED' ELSE 'UNVERIFIED' END");
    expect(command).toContain("'contractVersion', '1.0'");
    expect(command).toContain("'matchType', UPPER(BTRIM(p_match_type))");
    expect(command).toContain("'confidence', p_confidence");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.create_community_creation_request_v2\([\s\S]*?\) FROM PUBLIC, anon, authenticated;/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_community_creation_request_v2\([\s\S]*?\) TO service_role;/,
    );
  });

  it('closes direct browser execution of the legacy community request command', () => {
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.create_community_creation_request\(\s*text, text, text, integer, text, uuid\s*\) FROM PUBLIC, anon, authenticated;/,
    );
  });

  it('serializes source and canonical identity and fails closed on disagreement', () => {
    const command = functionBlock('public.create_community_creation_request_v2');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.address_registry_identities');
    expect(migration).toContain('address_registry_identities_active_external_uq');
    expect(migration).toContain('address_source_aliases_active_source_uq');
    expect(command).toContain("'address-registry:' || v_source_system");
    expect(command).toContain("'address-source:' || v_source_system");
    expect(command).toContain("hashtextextended('address:' || v_canonical_key");
    expect(command).toContain('v_registry_address_id <> v_source_address_id');
    expect(command).toContain('ADDRESS_REGISTRY_MAPPING_STALE');
    expect(command).toContain('ADDRESS_SOURCE_ALIAS_STALE');
    expect(command).toContain('ADDRESS_IDENTITY_CONFLICT');
    expect(command).toContain('v_source_address_id IS DISTINCT FROM v_address_id');
    expect(command).toContain('Address canonical identity changed without source lineage proof');
    expect(command).toMatch(
      /UPDATE public\.address_registry_identities registry_identity[\s\S]*?SET valid_to = clock_timestamp\(\)[\s\S]*?registry_identity\.registry_canonical_address_id <>\s*p_registry_canonical_address_id/,
    );
    expect(command).toContain('INSERT INTO public.address_registry_identities');
    expect(command).toContain('INSERT INTO public.address_source_aliases');
    expect(command).toContain('alias.address_id = v_address_id');
    expect(command).not.toMatch(/similarity\([^)]*\)[\s\S]*?(UPDATE|DELETE)/i);
  });

  it('never rewrites legally reviewed addresses and rejects hidden manual fields', () => {
    const command = functionBlock('public.create_community_creation_request_v2');
    expect(command).toContain(
      "a.verification_status IN ('UNVERIFIED', 'SOURCE_MATCHED')",
    );
    expect(command).not.toContain(
      "WHEN a.verification_status IN ('VERIFIED', 'DISPUTED') THEN a.verification_status",
    );
    expect(command).toContain('OR p_latitude IS NOT NULL');
    expect(command).toContain('OR p_longitude IS NOT NULL');
    expect(command).toContain("OR NULLIF(BTRIM(p_postal_code), '') IS NOT NULL");
    expect(command).toContain('Manual address cannot claim a source record');
  });

  it('binds retries to the original business payload and reports replay state', () => {
    const command = functionBlock('public.create_community_creation_request_v2');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS request_fingerprint text');
    expect(command).toContain("v_request_fingerprint := encode(digest(");
    expect(command).toContain(
      "WHEN v_is_registry THEN v_source_system || ':' || v_source_record_id",
    );
    expect(command).toContain('ccr.request_fingerprint = v_request_fingerprint');
    expect(command).toContain('IDEMPOTENCY_KEY_REUSED');
    expect(command).toContain('v_reserved_workspace_id, v_address_id, false');
    expect(command).toContain('ccr.address_id, true');
  });

  it('enforces a distributed authenticated lookup quota before proxy use', () => {
    const quota = functionBlock('public.consume_address_lookup_quota');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS private.address_lookup_rate_limits');
    expect(quota).toContain('v_actor uuid := auth.uid()');
    expect(quota).toContain('ON CONFLICT (profile_id) DO UPDATE');
    expect(quota).toContain('request_count < v_limit');
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.consume_address_lookup_quota() TO authenticated;',
    );
  });

  it('rate-limits submissions and bounds each actor active review queue', () => {
    const quota = functionBlock('public.consume_community_request_quota');
    const command = functionBlock('public.create_community_creation_request_v2');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS private.community_request_rate_limits');
    expect(quota).toContain("v_window interval := interval '1 hour'");
    expect(quota).toContain('v_limit integer := 10');
    expect(command).toContain("'community-request-actor:' || v_actor::text");
    expect(command).toContain('ACTIVE_COMMUNITY_REQUEST_LIMIT');
    expect(command).toContain(") >= 20 THEN");
    expect(command).toContain('ccr.address_lease_expires_at > now()');
    expect(command).toContain('ccr.activation_expires_at > now()');
    expect(migration).toContain('ADDRESS_LEASE_EXPIRED_DURING_ADDRESS_REGISTRY_MIGRATION');
  });

  it('never persists raw request headers or credentials in future audit rows', () => {
    const safeRequestId = functionBlock('private.safe_request_correlation_id');
    const auditWriter = functionBlock('private.write_authorization_event');
    const command = functionBlock('public.create_community_creation_request_v2');

    expect(safeRequestId).toContain("v_headers ->> 'x-request-id'");
    expect(safeRequestId).toContain("v_headers ->> 'cf-ray'");
    expect(safeRequestId).not.toContain("v_headers ->> 'authorization'");
    expect(auditWriter).toContain('private.safe_request_correlation_id()');
    expect(command).toContain('private.safe_request_correlation_id()');
    expect(command).not.toContain("current_setting('request.headers', true)");
    expect(migration).toContain("request_id ~* '(authorization|apikey|cookie|bearer[[:space:]])'");
  });

  it('stores profile-address provenance only through a trusted actor-bound command', () => {
    const command = functionBlock('public.upsert_user_reference_address_v2');
    const trigger = functionBlock('private.prevent_untrusted_reference_registry_provenance');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS registry_canonical_address_id uuid');
    expect(migration).toContain('user_reference_addresses_registry_shape_check');
    expect(migration).toContain('user_reference_addresses_coordinate_pair_check');
    expect(trigger).toContain('TRUSTED_REGISTRY_PROVENANCE_REQUIRED');
    expect(command).toContain("COALESCE(auth.role(), '') <> 'service_role'");
    expect(command).toContain('p_actor_profile_id');
    expect(command).toContain('REFERENCE_ADDRESS_PROVENANCE_INVALID');
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.upsert_user_reference_address_v2\([\s\S]*?\) FROM PUBLIC, anon, authenticated;/,
    );
  });

  it('is one explicit forward-only transaction', () => {
    expect(migration.trimStart().split(/\r?\n/).slice(0, 12)).toContain('BEGIN;');
    expect(migration.trimEnd()).toMatch(/COMMIT;$/);
  });
});
