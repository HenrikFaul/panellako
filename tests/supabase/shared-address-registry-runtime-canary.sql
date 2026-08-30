\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES (
  '81111111-1111-4111-8111-111111111111',
  'address.registry.canary@example.test',
  now(),
  '{"full_name":"Address Registry Canary"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES (
  '81111111-1111-4111-8111-111111111112',
  'address.registry.second@example.test',
  now(),
  '{"full_name":"Address Registry Second Claimant"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

SELECT private.bootstrap_profile(
  '81111111-1111-4111-8111-111111111111',
  'address.registry.canary@example.test',
  'Address Registry Canary'
);

SELECT private.bootstrap_profile(
  '81111111-1111-4111-8111-111111111112',
  'address.registry.second@example.test',
  'Address Registry Second Claimant'
);

-- Hosted Supabase grants table DML to the API roles. The isolated PostgreSQL
-- fixture has no Supabase privilege event trigger, so emulate that grant inside
-- this rolled-back canary in order to exercise RLS and the provenance trigger.
GRANT SELECT, INSERT, UPDATE ON public.user_reference_addresses TO authenticated;
GRANT SELECT ON public.user_reference_addresses TO service_role;

CREATE OR REPLACE FUNCTION pg_temp.create_registry_request(
  p_idempotency_key uuid,
  p_community_name text,
  p_formatted_address text,
  p_street_name text,
  p_source_record_id text,
  p_registry_canonical_address_id uuid,
  p_latitude numeric DEFAULT 47.535,
  p_longitude numeric DEFAULT 19.071,
  p_actor_profile_id uuid DEFAULT '81111111-1111-4111-8111-111111111111'
)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  reserved_workspace_id uuid,
  address_id uuid,
  replayed boolean
)
LANGUAGE sql
AS $$
  SELECT *
  FROM public.create_community_creation_request_v2(
    p_actor_profile_id,
    p_community_name,
    p_formatted_address,
    'CONDOMINIUM',
    16,
    'REPRESENTATIVE_MANAGED',
    p_idempotency_key,
    'HU',
    '1135',
    'Budapest',
    'XIII. kerület',
    NULL,
    p_street_name,
    'utca',
    '9',
    NULL,
    NULL,
    NULL,
    'OSM',
    p_source_record_id,
    p_latitude,
    p_longitude,
    p_registry_canonical_address_id,
    '1.0',
    'CENTROID',
    0.99,
    'EXACT_HOUSE',
    'osm-hu-canary',
    'address-registry-v1'
  );
$$;

DO $privileges$
DECLARE
  v_command regprocedure := to_regprocedure(
    'public.create_community_creation_request_v2(uuid,text,text,text,integer,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,numeric,numeric,uuid,text,text,numeric,text,text,text)'
  );
  v_legacy_command regprocedure := to_regprocedure(
    'public.create_community_creation_request(text,text,text,integer,text,uuid)'
  );
  v_reference_command regprocedure := to_regprocedure(
    'public.upsert_user_reference_address_v2(uuid,text,double precision,double precision,text,text,text,text,text,text,text,text,text,uuid,text,text,text,text,text,numeric,text,timestamp with time zone)'
  );
BEGIN
  IF v_command IS NULL THEN
    RAISE EXCEPTION 'trusted address command signature is missing';
  END IF;
  IF has_function_privilege('anon', v_command, 'EXECUTE')
     OR has_function_privilege('authenticated', v_command, 'EXECUTE') THEN
    RAISE EXCEPTION 'browser roles can execute the trusted address command';
  END IF;
  IF NOT has_function_privilege('service_role', v_command, 'EXECUTE') THEN
    RAISE EXCEPTION 'service role cannot execute the trusted address command';
  END IF;
  IF v_legacy_command IS NULL THEN
    RAISE EXCEPTION 'legacy community request command signature is missing';
  END IF;
  IF has_function_privilege('anon', v_legacy_command, 'EXECUTE')
     OR has_function_privilege('authenticated', v_legacy_command, 'EXECUTE') THEN
    RAISE EXCEPTION 'browser roles can execute the legacy community request command';
  END IF;
  IF v_reference_command IS NULL THEN
    RAISE EXCEPTION 'trusted reference address command signature is missing';
  END IF;
  IF has_function_privilege('anon', v_reference_command, 'EXECUTE')
     OR has_function_privilege('authenticated', v_reference_command, 'EXECUTE') THEN
    RAISE EXCEPTION 'browser roles can execute the trusted reference address command';
  END IF;
  IF NOT has_function_privilege('service_role', v_reference_command, 'EXECUTE') THEN
    RAISE EXCEPTION 'service role cannot execute the trusted reference address command';
  END IF;
  IF has_table_privilege('anon', 'public.address_registry_identities', 'SELECT')
     OR has_table_privilege('authenticated', 'public.address_registry_identities', 'SELECT')
     OR has_table_privilege('anon', 'public.address_source_aliases', 'SELECT')
     OR has_table_privilege('authenticated', 'public.address_source_aliases', 'SELECT') THEN
    RAISE EXCEPTION 'browser role can read internal registry mappings';
  END IF;
END;
$privileges$;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '81111111-1111-4111-8111-111111111111',
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $legacy_v1_direct_call_blocked$
BEGIN
  BEGIN
    PERFORM public.create_community_creation_request(
      'Legacy direct call must fail',
      '1135 Budapest, Legacy bypass utca 1.',
      'CONDOMINIUM',
      4,
      'SELF_MANAGED',
      '82222222-2222-4222-8222-222222222220'
    );
    RAISE EXCEPTION 'authenticated client executed the legacy community request command';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$legacy_v1_direct_call_blocked$;

DO $quotas$
DECLARE
  v_result record;
BEGIN
  FOR v_index IN 1..30 LOOP
    SELECT * INTO v_result FROM public.consume_address_lookup_quota();
    IF v_result.allowed IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'lookup quota rejected request % too early', v_index;
    END IF;
  END LOOP;
  SELECT * INTO v_result FROM public.consume_address_lookup_quota();
  IF v_result.allowed IS DISTINCT FROM false OR v_result.retry_after_seconds < 1 THEN
    RAISE EXCEPTION 'lookup quota did not reject request 31: %', row_to_json(v_result);
  END IF;

  FOR v_index IN 1..10 LOOP
    SELECT * INTO v_result FROM public.consume_community_request_quota();
    IF v_result.allowed IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'submission quota rejected request % too early', v_index;
    END IF;
  END LOOP;
  SELECT * INTO v_result FROM public.consume_community_request_quota();
  IF v_result.allowed IS DISTINCT FROM false OR v_result.retry_after_seconds < 1 THEN
    RAISE EXCEPTION 'submission quota did not reject request 11: %', row_to_json(v_result);
  END IF;
END;
$quotas$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '81111111-1111-4111-8111-111111111112',
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $second_actor_quota_isolation$
DECLARE
  v_lookup record;
  v_submission record;
BEGIN
  SELECT * INTO v_lookup FROM public.consume_address_lookup_quota();
  SELECT * INTO v_submission FROM public.consume_community_request_quota();
  IF v_lookup.allowed IS DISTINCT FROM true
     OR v_submission.allowed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'one actor exhausted another actor quota: % / %',
      row_to_json(v_lookup), row_to_json(v_submission);
  END IF;
END;
$second_actor_quota_isolation$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '81111111-1111-4111-8111-111111111111',
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $untrusted_reference_provenance_guard$
DECLARE
  v_detail text;
BEGIN
  BEGIN
    INSERT INTO public.user_reference_addresses (
      user_id, display_name, lat, lon, source, registry_system,
      registry_canonical_address_id, registry_source_record_id,
      registry_contract_version, registry_dataset_version,
      registry_normalization_version, registry_coordinate_precision,
      registry_confidence, registry_match_type, registry_resolved_at
    ) VALUES (
      '81111111-1111-4111-8111-111111111111',
      '1135 Budapest, Forged utca 1.', NULL, NULL, 'supabase', 'OSM',
      '83333333-3333-5333-8333-333333333339', 'osm:way:99999',
      '1.0', 'forged-dataset', 'forged-normalizer', 'CENTROID',
      1, 'EXACT_HOUSE', now()
    );
    RAISE EXCEPTION 'authenticated client forged registry provenance';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%TRUSTED_REGISTRY_PROVENANCE_REQUIRED%' THEN
      RAISE;
    END IF;
  END;
  IF EXISTS (
    SELECT 1 FROM public.user_reference_addresses
    WHERE user_id = '81111111-1111-4111-8111-111111111111'
  ) THEN
    RAISE EXCEPTION 'failed forged reference address write left a row behind';
  END IF;
END;
$untrusted_reference_provenance_guard$;

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT set_config(
  'request.jwt.claim.sub',
  '81111111-1111-4111-8111-111111111111',
  true
);

SELECT public.upsert_user_reference_address_v2(
  '81111111-1111-4111-8111-111111111111',
  '1135 Budapest, Gidófalvy Lajos utca 9.',
  NULL::double precision, NULL::double precision,
  'Gidófalvy Lajos utca', '9', 'Budapest', 'XIII. kerület', '1135',
  '2', '5', 'supabase', 'OSM',
  '83333333-3333-5333-8333-333333333331', 'osm:way:9001',
  '1.0', 'osm-hu-canary', 'address-registry-v1', 'UNKNOWN',
  0.99, 'EXACT_HOUSE', now()
);

DO $trusted_reference_provenance$
DECLARE
  v_row record;
  v_detail text;
BEGIN
  SELECT * INTO v_row
  FROM public.user_reference_addresses
  WHERE user_id = '81111111-1111-4111-8111-111111111111';
  IF v_row.registry_system <> 'OSM'
     OR v_row.registry_canonical_address_id <>
       '83333333-3333-5333-8333-333333333331'
     OR v_row.registry_source_record_id <> 'osm:way:9001'
     OR v_row.lat IS NOT NULL
     OR v_row.lon IS NOT NULL THEN
    RAISE EXCEPTION 'trusted coordinate-pending provenance was not retained: %',
      row_to_json(v_row);
  END IF;

  BEGIN
    PERFORM public.upsert_user_reference_address_v2(
      '81111111-1111-4111-8111-111111111111',
      '1135 Budapest, Partial utca 1.',
      NULL::double precision, NULL::double precision,
      'Partial utca', '1', 'Budapest', NULL, '1135', NULL, NULL,
      'supabase', 'OSM',
      '83333333-3333-5333-8333-333333333338', NULL,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL
    );
    RAISE EXCEPTION 'partial reference provenance was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%REFERENCE_ADDRESS_PROVENANCE_INVALID%' THEN
      RAISE;
    END IF;
  END;
END;
$trusted_reference_provenance$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '81111111-1111-4111-8111-111111111112',
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $reference_address_claimant_isolation$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_reference_addresses
    WHERE user_id = '81111111-1111-4111-8111-111111111111'
  ) THEN
    RAISE EXCEPTION 'second claimant can read the first claimant reference address';
  END IF;
  UPDATE public.user_reference_addresses
  SET display_name = 'Cross-claimant rewrite'
  WHERE user_id = '81111111-1111-4111-8111-111111111111';
  IF FOUND THEN
    RAISE EXCEPTION 'second claimant can update the first claimant reference address';
  END IF;
END;
$reference_address_claimant_isolation$;

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config(
  'request.jwt.claim.sub',
  '81111111-1111-4111-8111-111111111111',
  true
);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT set_config(
  'request.headers',
  '{"x-request-id":"canary request/1!?","authorization":"Bearer must-not-persist","cookie":"session=must-not-persist"}',
  true
);
RESET ROLE;

DO $create_and_replay$
DECLARE
  v_first record;
  v_replay record;
  v_snapshot jsonb;
  v_verification text;
  v_audit_request_id text;
  v_audit_json text;
  v_detail text;
BEGIN
  SELECT * INTO v_first
  FROM pg_temp.create_registry_request(
    '82222222-2222-4222-8222-222222222221',
    'Address Registry Canary House',
    '1135 Budapest, Gidófalvy Lajos utca 9.',
    'Gidófalvy Lajos',
    'osm:way:9001',
    '83333333-3333-5333-8333-333333333331'
  );
  IF v_first.request_status <> 'PENDING_VERIFICATION'
     OR v_first.replayed IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'unexpected first request result: %', row_to_json(v_first);
  END IF;

  SELECT ccr.address_source_snapshot, a.verification_status
  INTO v_snapshot, v_verification
  FROM public.community_creation_requests ccr
  JOIN public.addresses a ON a.id = ccr.address_id
  WHERE ccr.id = v_first.request_id;

  IF v_snapshot ->> 'mode' <> 'REGISTRY'
     OR v_snapshot ->> 'contractVersion' <> '1.0'
     OR v_snapshot ->> 'canonicalAddressId' <> '83333333-3333-5333-8333-333333333331'
     OR v_snapshot ->> 'sourceRecordId' <> 'osm:way:9001'
     OR v_snapshot ->> 'matchType' <> 'EXACT_HOUSE'
     OR v_snapshot ->> 'datasetVersion' <> 'osm-hu-canary'
     OR v_verification <> 'SOURCE_MATCHED' THEN
    RAISE EXCEPTION 'registry snapshot/provenance is incomplete: % / %',
      v_snapshot, v_verification;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.address_registry_identities identity_map
    WHERE identity_map.registry_system = 'OSM'
      AND identity_map.registry_canonical_address_id =
        '83333333-3333-5333-8333-333333333331'
      AND identity_map.address_id = v_first.address_id
      AND identity_map.valid_to IS NULL
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.address_source_aliases alias
    WHERE alias.source_system = 'OSM'
      AND alias.source_record_id = 'osm:way:9001'
      AND alias.address_id = v_first.address_id
      AND alias.valid_to IS NULL
  ) THEN
    RAISE EXCEPTION 'registry identity or source alias was not persisted';
  END IF;

  SELECT request_id, decision, metadata::text
  INTO v_audit_request_id, v_verification, v_audit_json
  FROM public.authorization_audit_events
  WHERE object_id = v_first.request_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;
  IF v_audit_request_id <> 'canaryrequest/1'
     OR LOWER(v_audit_json) LIKE '%bearer%'
     OR LOWER(v_audit_json) LIKE '%cookie%'
     OR LOWER(v_audit_json) LIKE '%must-not-persist%' THEN
    RAISE EXCEPTION 'unsafe request headers reached the audit log: % / %',
      v_audit_request_id, v_audit_json;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = v_first.reserved_workspace_id
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_memberships
    WHERE workspace_id = v_first.reserved_workspace_id
  ) OR EXISTS (
    SELECT 1 FROM public.role_assignments
    WHERE workspace_id = v_first.reserved_workspace_id
  ) THEN
    RAISE EXCEPTION 'pending request created tenant access';
  END IF;

  SELECT * INTO v_replay
  FROM pg_temp.create_registry_request(
    '82222222-2222-4222-8222-222222222221',
    'Address Registry Canary House',
    '1135 Budapest, Gidófalvy Lajos utca 9.',
    'Gidófalvy Lajos',
    'osm:way:9001',
    '83333333-3333-5333-8333-333333333331'
  );
  IF v_replay.request_id <> v_first.request_id
     OR v_replay.replayed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'idempotent replay did not return the original request';
  END IF;

  BEGIN
    PERFORM * FROM pg_temp.create_registry_request(
      '82222222-2222-4222-8222-222222222221',
      'Different payload',
      '1135 Budapest, Gidófalvy Lajos utca 9.',
      'Gidófalvy Lajos',
      'osm:way:9001',
      '83333333-3333-5333-8333-333333333331'
    );
    RAISE EXCEPTION 'idempotency fingerprint mismatch was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%IDEMPOTENCY_KEY_REUSED%' THEN
      RAISE;
    END IF;
  END;
END;
$create_and_replay$;

DO $canonical_lineage_rollover$
DECLARE
  v_old record;
  v_redirect_retry record;
  v_current record;
  v_old_snapshot jsonb;
  v_current_snapshot jsonb;
BEGIN
  SELECT * INTO v_old
  FROM pg_temp.create_registry_request(
    '82222222-2222-4222-8222-222222222229',
    'Address Registry Lineage House',
    '1135 Budapest, Lineage utca 12.',
    'Lineage',
    'osm:way:9300',
    '83333333-3333-5333-8333-333333333333'
  );

  -- This is the database boundary seen after the provider resolves the old
  -- selection to its current canonical UUID. The same idempotency key must
  -- still replay because the stable OSM source lineage did not change.
  SELECT * INTO v_redirect_retry
  FROM pg_temp.create_registry_request(
    '82222222-2222-4222-8222-222222222229',
    'Address Registry Lineage House',
    '1135 Budapest, Lineage utca 12.',
    'Lineage',
    'osm:way:9300',
    '83333333-3333-5333-8333-333333333334'
  );
  IF v_redirect_retry.request_id <> v_old.request_id
     OR v_redirect_retry.replayed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'canonical redirect broke stable-lineage idempotent replay: % / %',
      row_to_json(v_old), row_to_json(v_redirect_retry);
  END IF;

  -- A later business command with a fresh idempotency key materializes the
  -- current canonical UUID while retaining the same local address identity.
  SELECT * INTO v_current
  FROM pg_temp.create_registry_request(
    '82222222-2222-4222-8222-222222222230',
    'Address Registry Lineage House',
    '1135 Budapest, Lineage utca 12.',
    'Lineage',
    'osm:way:9300',
    '83333333-3333-5333-8333-333333333334'
  );

  IF v_current.address_id <> v_old.address_id
     OR v_current.replayed IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'canonical lineage rollover forked the local address: % / %',
      row_to_json(v_old), row_to_json(v_current);
  END IF;

  SELECT address_source_snapshot INTO v_old_snapshot
  FROM public.community_creation_requests WHERE id = v_old.request_id;
  SELECT address_source_snapshot INTO v_current_snapshot
  FROM public.community_creation_requests WHERE id = v_current.request_id;
  IF v_old_snapshot ->> 'canonicalAddressId' <>
       '83333333-3333-5333-8333-333333333333'
     OR v_current_snapshot ->> 'canonicalAddressId' <>
       '83333333-3333-5333-8333-333333333334' THEN
    RAISE EXCEPTION 'immutable snapshots did not retain their observed canonical versions: % / %',
      v_old_snapshot, v_current_snapshot;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.address_registry_identities identity_map
    WHERE identity_map.registry_system = 'OSM'
      AND identity_map.address_id = v_old.address_id
      AND identity_map.registry_canonical_address_id =
        '83333333-3333-5333-8333-333333333333'
      AND identity_map.valid_to IS NOT NULL
  ) <> 1 OR (
    SELECT COUNT(*)
    FROM public.address_registry_identities identity_map
    WHERE identity_map.registry_system = 'OSM'
      AND identity_map.address_id = v_old.address_id
      AND identity_map.registry_canonical_address_id =
        '83333333-3333-5333-8333-333333333334'
      AND identity_map.valid_to IS NULL
  ) <> 1 OR (
    SELECT COUNT(*)
    FROM public.address_registry_identities identity_map
    WHERE identity_map.registry_system = 'OSM'
      AND identity_map.address_id = v_old.address_id
      AND identity_map.valid_to IS NULL
  ) <> 1 OR (
    SELECT COUNT(*)
    FROM public.address_source_aliases alias
    WHERE alias.source_system = 'OSM'
      AND alias.source_record_id = 'osm:way:9300'
      AND alias.address_id = v_old.address_id
      AND alias.valid_to IS NULL
  ) <> 1 THEN
    RAISE EXCEPTION 'canonical lineage history/current mapping invariant failed';
  END IF;
END;
$canonical_lineage_rollover$;

DO $canonical_alias_and_verified_guard$
DECLARE
  v_original_address_id uuid;
  v_second record;
  v_verified record;
  v_before record;
  v_after record;
BEGIN
  SELECT ccr.address_id INTO v_original_address_id
  FROM public.community_creation_requests ccr
  WHERE ccr.claimant_profile_id = '81111111-1111-4111-8111-111111111111'
    AND ccr.idempotency_key = '82222222-2222-4222-8222-222222222221';

  SELECT * INTO v_second
  FROM pg_temp.create_registry_request(
    '82222222-2222-4222-8222-222222222222',
    'Address Registry Alias House',
    '1135 Budapest, Gidófalvy Lajos köz 9.',
    'Gidófalvy Lajos köz',
    'osm:node:9002',
    '83333333-3333-5333-8333-333333333331'
  );
  IF v_second.address_id <> v_original_address_id THEN
    RAISE EXCEPTION 'stable external canonical UUID forked the local address identity';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM public.address_source_aliases alias
    WHERE alias.address_id = v_original_address_id
      AND alias.valid_to IS NULL
  ) <> 2 THEN
    RAISE EXCEPTION 'multiple OSM elements were not retained as aliases';
  END IF;

  UPDATE public.addresses
  SET verification_status = 'VERIFIED',
      formatted_address = 'LEGAL REVIEWED ADDRESS',
      latitude = 47.5000000,
      longitude = 19.0000000
  WHERE id = v_original_address_id;
  SELECT formatted_address, latitude, longitude INTO v_before
  FROM public.addresses WHERE id = v_original_address_id;

  SELECT * INTO v_verified
  FROM pg_temp.create_registry_request(
    '82222222-2222-4222-8222-222222222223',
    'Address Registry Verified Guard',
    '1135 Budapest, External Rewrite utca 9.',
    'External Rewrite',
    'osm:relation:9003',
    '83333333-3333-5333-8333-333333333331',
    48.0,
    20.0
  );
  IF v_verified.address_id <> v_original_address_id THEN
    RAISE EXCEPTION 'verified address lost its external identity mapping';
  END IF;
  SELECT formatted_address, latitude, longitude INTO v_after
  FROM public.addresses WHERE id = v_original_address_id;
  IF v_after IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION 'OSM request rewrote legally reviewed address data: % -> %',
      row_to_json(v_before), row_to_json(v_after);
  END IF;
END;
$canonical_alias_and_verified_guard$;

RESET ROLE;

DO $seed_conflict$
DECLARE
  v_conflict_address uuid := '84444444-4444-4444-8444-444444444441';
BEGIN
  INSERT INTO public.addresses (
    id, country_code, postal_code, settlement, street_name, street_type,
    house_number_from, address_level, formatted_address, canonical_key,
    source_system, source_record_id, verification_status
  ) VALUES (
    v_conflict_address, 'HU', '1135', 'Budapest', 'Conflict', 'utca', '9',
    'BUILDING', '1135 Budapest, Conflict utca 9.',
    public.normalize_address_key('HU 1135 Budapest XIII. kerület Conflict utca 9'),
    'OSM', 'osm:way:9999', 'SOURCE_MATCHED'
  );
  INSERT INTO public.address_source_aliases (
    source_system, source_record_id, address_id
  ) VALUES ('OSM', 'osm:way:9999', v_conflict_address);
END;
$seed_conflict$;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT set_config(
  'request.jwt.claim.sub',
  '81111111-1111-4111-8111-111111111111',
  true
);

DO $identity_conflict$
DECLARE
  v_detail text;
BEGIN
  BEGIN
    PERFORM * FROM pg_temp.create_registry_request(
      '82222222-2222-4222-8222-222222222224',
      'Address Registry Conflict',
      '1135 Budapest, Conflict utca 9.',
      'Conflict',
      'osm:way:9999',
      '83333333-3333-5333-8333-333333333331'
    );
    RAISE EXCEPTION 'conflicting registry/source identity was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%ADDRESS_IDENTITY_CONFLICT%' THEN
      RAISE;
    END IF;
  END;
END;
$identity_conflict$;

DO $manual_provenance_guard$
DECLARE
  v_detail text;
BEGIN
  BEGIN
    PERFORM *
    FROM public.create_community_creation_request_v2(
      '81111111-1111-4111-8111-111111111111',
      'Manual hidden field canary',
      '1135 Budapest, Manual utca 1.',
      'CONDOMINIUM', 4, 'SELF_MANAGED',
      '82222222-2222-4222-8222-222222222225',
      'HU', '1135', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      'MANUAL', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    );
    RAISE EXCEPTION 'manual request accepted hidden structured fields';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%ADDRESS_SOURCE_INVALID%' THEN
      RAISE;
    END IF;
  END;
END;
$manual_provenance_guard$;

RESET ROLE;

DO $snapshot_guards$
DECLARE
  v_request_id uuid;
  v_detail text;
BEGIN
  SELECT id INTO v_request_id
  FROM public.community_creation_requests
  WHERE claimant_profile_id = '81111111-1111-4111-8111-111111111111'
  ORDER BY created_at, id
  LIMIT 1;

  BEGIN
    UPDATE public.community_creation_requests
    SET address_source_snapshot = jsonb_build_object(
      'mode', 'MANUAL_REVIEW', 'contractVersion', 'manual-v1'
    )
    WHERE id = v_request_id;
    RAISE EXCEPTION 'immutable snapshot update was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%ADDRESS_SNAPSHOT_IMMUTABLE%' THEN
      RAISE;
    END IF;
  END;
END;
$snapshot_guards$;

ALTER TABLE public.community_creation_requests
  DISABLE TRIGGER trg_community_address_snapshot_immutable;
DO $snapshot_constraint$
DECLARE
  v_request_id uuid;
BEGIN
  SELECT id INTO v_request_id
  FROM public.community_creation_requests
  WHERE claimant_profile_id = '81111111-1111-4111-8111-111111111111'
  ORDER BY created_at, id
  LIMIT 1;
  BEGIN
    UPDATE public.community_creation_requests
    SET address_source_snapshot = '{}'::jsonb
    WHERE id = v_request_id;
    RAISE EXCEPTION 'snapshot without mode/contractVersion passed the CHECK';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$snapshot_constraint$;
ALTER TABLE public.community_creation_requests
  ENABLE TRIGGER trg_community_address_snapshot_immutable;

DO $expired_queue_does_not_lock_actor$
DECLARE
  v_address_id uuid;
BEGIN
  SELECT address_id INTO v_address_id
  FROM public.community_creation_requests
  WHERE claimant_profile_id = '81111111-1111-4111-8111-111111111111'
  ORDER BY created_at, id
  LIMIT 1;

  INSERT INTO public.community_creation_requests (
    id, reserved_workspace_id, claimant_profile_id, address_id,
    community_name, legal_form, governance_mode, declared_unit_count,
    status, address_lease_expires_at, idempotency_key
  )
  SELECT
    gen_random_uuid(), gen_random_uuid(),
    '81111111-1111-4111-8111-111111111111', v_address_id,
    'Expired request ' || sequence, 'CONDOMINIUM',
    'REPRESENTATIVE_MANAGED', 4, 'PENDING_VERIFICATION',
    now() - interval '1 hour', gen_random_uuid()
  FROM generate_series(1, 20) AS sequence;
END;
$expired_queue_does_not_lock_actor$;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT set_config(
  'request.jwt.claim.sub',
  '81111111-1111-4111-8111-111111111111',
  true
);
DO $expired_queue_call$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result
  FROM pg_temp.create_registry_request(
    '82222222-2222-4222-8222-222222222226',
    'Expired Queue Does Not Lock',
    '1135 Budapest, Gidófalvy Lajos utca 9.',
    'Gidófalvy Lajos',
    'osm:way:9001',
    '83333333-3333-5333-8333-333333333331'
  );
  IF v_result.request_id IS NULL THEN
    RAISE EXCEPTION 'expired queue prevented a valid request';
  END IF;
END;
$expired_queue_call$;

RESET ROLE;
DO $live_queue_seed$
DECLARE
  v_address_id uuid;
  v_live_count integer;
BEGIN
  SELECT address_id INTO v_address_id
  FROM public.community_creation_requests
  WHERE claimant_profile_id = '81111111-1111-4111-8111-111111111111'
  ORDER BY created_at, id
  LIMIT 1;
  SELECT COUNT(*) INTO v_live_count
  FROM public.community_creation_requests
  WHERE claimant_profile_id = '81111111-1111-4111-8111-111111111111'
    AND status IN ('DRAFT', 'PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED')
    AND address_lease_expires_at > now()
    AND (
      status <> 'APPROVED'
      OR (activation_expires_at IS NOT NULL AND activation_expires_at > now())
    );

  INSERT INTO public.community_creation_requests (
    id, reserved_workspace_id, claimant_profile_id, address_id,
    community_name, legal_form, governance_mode, declared_unit_count,
    status, address_lease_expires_at, idempotency_key
  )
  SELECT
    gen_random_uuid(), gen_random_uuid(),
    '81111111-1111-4111-8111-111111111111', v_address_id,
    'Live request ' || sequence, 'CONDOMINIUM',
    'REPRESENTATIVE_MANAGED', 4, 'PENDING_VERIFICATION',
    now() + interval '72 hours', gen_random_uuid()
  FROM generate_series(1, GREATEST(0, 20 - v_live_count)) AS sequence;
END;
$live_queue_seed$;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT set_config(
  'request.jwt.claim.sub',
  '81111111-1111-4111-8111-111111111111',
  true
);
DO $live_queue_limit$
DECLARE
  v_detail text;
BEGIN
  BEGIN
    PERFORM * FROM pg_temp.create_registry_request(
      '82222222-2222-4222-8222-222222222227',
      'Live Queue Must Be Limited',
      '1135 Budapest, Gidófalvy Lajos utca 9.',
      'Gidófalvy Lajos',
      'osm:way:9001',
      '83333333-3333-5333-8333-333333333331'
    );
    RAISE EXCEPTION '20 live requests did not enforce the active queue limit';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF COALESCE(v_detail, '') NOT LIKE '%ACTIVE_COMMUNITY_REQUEST_LIMIT%' THEN
      RAISE;
    END IF;
  END;
END;
$live_queue_limit$;

DO $second_claimant_not_blocked_by_first_cap$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result
  FROM pg_temp.create_registry_request(
    '82222222-2222-4222-8222-222222222228',
    'Second Claimant Independent House',
    '1135 Budapest, Második utca 10.',
    'Második',
    'osm:way:9100',
    '83333333-3333-5333-8333-333333333332',
    p_actor_profile_id => '81111111-1111-4111-8111-111111111112'
  );
  IF v_result.request_id IS NULL OR v_result.replayed IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'first claimant active cap blocked a second claimant';
  END IF;
END;
$second_claimant_not_blocked_by_first_cap$;

RESET ROLE;
ROLLBACK;
