-- Shared GeoData address registry hand-off for community onboarding.
--
-- Ownership boundary:
--   * the external GeoData service supplies public address reference data only;
--   * PanelLako remains authoritative for addresses used by tenant/workspace data;
--   * no cross-database foreign key is introduced;
--   * an OSM match is SOURCE_MATCHED, never legal/mandate verification.

BEGIN;

ALTER TABLE public.community_creation_requests
  ADD COLUMN IF NOT EXISTS address_source_snapshot jsonb NOT NULL
    DEFAULT '{"mode":"LEGACY_MANUAL_REVIEW","contractVersion":"legacy-v1"}'::jsonb;

ALTER TABLE public.community_creation_requests
  ALTER COLUMN address_source_snapshot SET DEFAULT
    '{"mode":"LEGACY_MANUAL_REVIEW","contractVersion":"legacy-v1"}'::jsonb;

UPDATE public.community_creation_requests
SET address_source_snapshot =
  '{"mode":"LEGACY_MANUAL_REVIEW","contractVersion":"legacy-v1"}'::jsonb
WHERE address_source_snapshot = '{}'::jsonb;

-- The legacy workflow did not materialize EXPIRED automatically. Close stale
-- leases before enforcing an active-queue limit so old requests cannot lock a
-- claimant out forever. Record the migration-driven state transition without
-- attributing it to the claimant.
WITH expired_requests AS (
  UPDATE public.community_creation_requests ccr
  SET status = 'EXPIRED',
      updated_at = now()
  WHERE ccr.status IN (
      'DRAFT', 'PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED'
    )
    AND ccr.activated_at IS NULL
    AND (
      ccr.address_lease_expires_at <= now()
      OR (
        ccr.status = 'APPROVED'
        AND (
          ccr.activation_expires_at IS NULL
          OR ccr.activation_expires_at <= now()
        )
      )
    )
  RETURNING ccr.id, ccr.claimant_profile_id, ccr.address_id,
    ccr.reserved_workspace_id
)
INSERT INTO public.authorization_audit_events (
  workspace_id, actor_profile_id, action_key, object_type, object_id,
  decision, reason_code, request_id, metadata
)
SELECT
  NULL, NULL, 'COMMUNITY_CREATION_REQUEST_EXPIRED',
  'community_creation_request', expired.id, 'STATE_CHANGE',
  'ADDRESS_LEASE_EXPIRED_DURING_ADDRESS_REGISTRY_MIGRATION', NULL,
  jsonb_build_object(
    'claimant_profile_id', expired.claimant_profile_id,
    'address_id', expired.address_id,
    'reserved_workspace_id', expired.reserved_workspace_id
  )
FROM expired_requests expired;

ALTER TABLE public.community_creation_requests
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

ALTER TABLE public.user_reference_addresses
  ALTER COLUMN lat DROP NOT NULL,
  ALTER COLUMN lon DROP NOT NULL;

ALTER TABLE public.user_reference_addresses
  ADD COLUMN IF NOT EXISTS registry_system text,
  ADD COLUMN IF NOT EXISTS registry_canonical_address_id uuid,
  ADD COLUMN IF NOT EXISTS registry_source_record_id text,
  ADD COLUMN IF NOT EXISTS registry_contract_version text,
  ADD COLUMN IF NOT EXISTS registry_dataset_version text,
  ADD COLUMN IF NOT EXISTS registry_normalization_version text,
  ADD COLUMN IF NOT EXISTS registry_coordinate_precision text,
  ADD COLUMN IF NOT EXISTS registry_confidence numeric,
  ADD COLUMN IF NOT EXISTS registry_match_type text,
  ADD COLUMN IF NOT EXISTS registry_resolved_at timestamptz;

ALTER TABLE public.user_reference_addresses
  DROP CONSTRAINT IF EXISTS user_reference_addresses_registry_shape_check;
ALTER TABLE public.user_reference_addresses
  ADD CONSTRAINT user_reference_addresses_registry_shape_check CHECK (
    (
      registry_canonical_address_id IS NULL
      AND registry_system IS NULL
      AND registry_source_record_id IS NULL
      AND registry_contract_version IS NULL
      AND registry_dataset_version IS NULL
      AND registry_normalization_version IS NULL
      AND registry_coordinate_precision IS NULL
      AND registry_confidence IS NULL
      AND registry_match_type IS NULL
      AND registry_resolved_at IS NULL
    )
    OR COALESCE((
      registry_canonical_address_id IS NOT NULL
      AND registry_system IS NOT NULL
      AND registry_system = 'OSM'
      AND registry_source_record_id IS NOT NULL
      AND registry_source_record_id ~ '^osm:(node|way|relation):[0-9]+$'
      AND registry_contract_version IS NOT NULL
      AND registry_contract_version = '1.0'
      AND registry_dataset_version IS NOT NULL
      AND NULLIF(BTRIM(registry_dataset_version), '') IS NOT NULL
      AND registry_normalization_version IS NOT NULL
      AND NULLIF(BTRIM(registry_normalization_version), '') IS NOT NULL
      AND registry_coordinate_precision IS NOT NULL
      AND NULLIF(BTRIM(registry_coordinate_precision), '') IS NOT NULL
      AND registry_confidence IS NOT NULL
      AND registry_confidence BETWEEN 0 AND 1
      AND registry_match_type IS NOT NULL
      AND registry_match_type IN ('EXACT_HOUSE', 'PREFIX_HOUSE', 'FUZZY')
      AND registry_resolved_at IS NOT NULL
    ), false)
  ) NOT VALID;
ALTER TABLE public.user_reference_addresses
  VALIDATE CONSTRAINT user_reference_addresses_registry_shape_check;

ALTER TABLE public.user_reference_addresses
  DROP CONSTRAINT IF EXISTS user_reference_addresses_coordinate_pair_check;
ALTER TABLE public.user_reference_addresses
  ADD CONSTRAINT user_reference_addresses_coordinate_pair_check CHECK (
    (lat IS NULL AND lon IS NULL)
    OR (
      lat IS NOT NULL AND lon IS NOT NULL
      AND lat BETWEEN -90 AND 90
      AND lon BETWEEN -180 AND 180
    )
  ) NOT VALID;
ALTER TABLE public.user_reference_addresses
  VALIDATE CONSTRAINT user_reference_addresses_coordinate_pair_check;

CREATE OR REPLACE FUNCTION private.prevent_untrusted_reference_registry_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF (
    NEW.registry_system IS NOT NULL
    OR NEW.registry_canonical_address_id IS NOT NULL
    OR NEW.registry_source_record_id IS NOT NULL
    OR NEW.registry_contract_version IS NOT NULL
    OR NEW.registry_dataset_version IS NOT NULL
    OR NEW.registry_normalization_version IS NOT NULL
    OR NEW.registry_coordinate_precision IS NOT NULL
    OR NEW.registry_confidence IS NOT NULL
    OR NEW.registry_match_type IS NOT NULL
    OR NEW.registry_resolved_at IS NOT NULL
  ) AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Trusted registry provenance writer required',
      DETAIL = '{"error_code":"TRUSTED_REGISTRY_PROVENANCE_REQUIRED"}';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_untrusted_reference_registry_provenance()
  FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_reference_address_registry_provenance
  ON public.user_reference_addresses;
CREATE TRIGGER trg_reference_address_registry_provenance
BEFORE INSERT OR UPDATE ON public.user_reference_addresses
FOR EACH ROW
EXECUTE FUNCTION private.prevent_untrusted_reference_registry_provenance();

ALTER TABLE public.community_creation_requests
  DROP CONSTRAINT IF EXISTS community_creation_requests_address_snapshot_shape_check;
ALTER TABLE public.community_creation_requests
  ADD CONSTRAINT community_creation_requests_address_snapshot_shape_check
  CHECK (
    jsonb_typeof(address_source_snapshot) = 'object'
    AND octet_length(address_source_snapshot::text) <= 16384
    AND address_source_snapshot ? 'mode'
    AND jsonb_typeof(address_source_snapshot -> 'mode') = 'string'
    AND COALESCE(address_source_snapshot ->> 'mode' IN (
      'REGISTRY', 'MANUAL_REVIEW', 'LEGACY_MANUAL_REVIEW'
    ), false)
    AND address_source_snapshot ? 'contractVersion'
    AND jsonb_typeof(address_source_snapshot -> 'contractVersion') = 'string'
    AND CHAR_LENGTH(address_source_snapshot ->> 'contractVersion') BETWEEN 1 AND 64
  ) NOT VALID;

ALTER TABLE public.community_creation_requests
  VALIDATE CONSTRAINT community_creation_requests_address_snapshot_shape_check;

CREATE TABLE IF NOT EXISTS public.address_registry_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_system text NOT NULL,
  registry_canonical_address_id uuid NOT NULL,
  address_id uuid NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT address_registry_identities_system_check CHECK (
    registry_system = 'OSM'
  ),
  CONSTRAINT address_registry_identities_validity_check CHECK (
    valid_to IS NULL OR valid_to > valid_from
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS address_registry_identities_active_external_uq
  ON public.address_registry_identities (
    registry_system, registry_canonical_address_id
  )
  WHERE valid_to IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS address_registry_identities_active_local_uq
  ON public.address_registry_identities (registry_system, address_id)
  WHERE valid_to IS NULL;
CREATE INDEX IF NOT EXISTS address_registry_identities_address_history_idx
  ON public.address_registry_identities (address_id, valid_from DESC);
ALTER TABLE public.address_registry_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.address_registry_identities
  FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.address_source_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  source_record_id text NOT NULL,
  address_id uuid NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT address_source_aliases_osm_shape_check CHECK (
    source_system = 'OSM'
    AND source_record_id ~ '^osm:(node|way|relation):[0-9]+$'
  ),
  CONSTRAINT address_source_aliases_validity_check CHECK (
    valid_to IS NULL OR valid_to > valid_from
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS address_source_aliases_active_source_uq
  ON public.address_source_aliases (source_system, source_record_id)
  WHERE valid_to IS NULL;
CREATE INDEX IF NOT EXISTS address_source_aliases_address_idx
  ON public.address_source_aliases (address_id, valid_from DESC);
ALTER TABLE public.address_source_aliases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.address_source_aliases FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.address_lookup_rate_limits (
  profile_id uuid PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.address_lookup_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_address_lookup_quota()
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_window interval := interval '60 seconds';
  v_limit integer := 30;
  v_started_at timestamptz;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  INSERT INTO private.address_lookup_rate_limits AS current_limit (
    profile_id, window_started_at, request_count, updated_at
  ) VALUES (
    v_actor, clock_timestamp(), 1, clock_timestamp()
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET window_started_at = CASE
        WHEN current_limit.window_started_at <= clock_timestamp() - v_window
          THEN clock_timestamp()
        ELSE current_limit.window_started_at
      END,
      request_count = CASE
        WHEN current_limit.window_started_at <= clock_timestamp() - v_window
          THEN 1
        ELSE current_limit.request_count + 1
      END,
      updated_at = clock_timestamp()
  WHERE current_limit.window_started_at <= clock_timestamp() - v_window
     OR current_limit.request_count < v_limit
  RETURNING current_limit.window_started_at
  INTO v_started_at;

  IF v_started_at IS NULL THEN
    SELECT arl.window_started_at INTO v_started_at
    FROM private.address_lookup_rate_limits arl
    WHERE arl.profile_id = v_actor;

    RETURN QUERY SELECT false, GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (v_started_at + v_window - clock_timestamp())))::integer
    );
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_address_lookup_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_address_lookup_quota() TO authenticated;

CREATE TABLE IF NOT EXISTS private.community_request_rate_limits (
  profile_id uuid PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.community_request_rate_limits
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_community_request_quota()
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_window interval := interval '1 hour';
  v_limit integer := 10;
  v_started_at timestamptz;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  INSERT INTO private.community_request_rate_limits AS current_limit (
    profile_id, window_started_at, request_count, updated_at
  ) VALUES (
    v_actor, clock_timestamp(), 1, clock_timestamp()
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET window_started_at = CASE
        WHEN current_limit.window_started_at <= clock_timestamp() - v_window
          THEN clock_timestamp()
        ELSE current_limit.window_started_at
      END,
      request_count = CASE
        WHEN current_limit.window_started_at <= clock_timestamp() - v_window
          THEN 1
        ELSE current_limit.request_count + 1
      END,
      updated_at = clock_timestamp()
  WHERE current_limit.window_started_at <= clock_timestamp() - v_window
     OR current_limit.request_count < v_limit
  RETURNING current_limit.window_started_at
  INTO v_started_at;

  IF v_started_at IS NULL THEN
    SELECT crl.window_started_at INTO v_started_at
    FROM private.community_request_rate_limits crl
    WHERE crl.profile_id = v_actor;

    RETURN QUERY SELECT false, GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (v_started_at + v_window - clock_timestamp())))::integer
    );
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_community_request_quota()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_community_request_quota()
  TO authenticated;

CREATE OR REPLACE FUNCTION private.prevent_community_address_snapshot_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF OLD.address_source_snapshot IS DISTINCT FROM NEW.address_source_snapshot THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514', MESSAGE = 'Community address source snapshot is immutable',
      DETAIL = '{"error_code":"ADDRESS_SNAPSHOT_IMMUTABLE"}';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_community_address_snapshot_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_community_address_snapshot_immutable
  ON public.community_creation_requests;
CREATE TRIGGER trg_community_address_snapshot_immutable
BEFORE UPDATE ON public.community_creation_requests
FOR EACH ROW
EXECUTE FUNCTION private.prevent_community_address_snapshot_change();

-- Never persist the raw PostgREST request.headers setting: it can include
-- Authorization, cookies and API keys. Only explicitly allowlisted,
-- length-bounded correlation identifiers may enter the audit log.
CREATE OR REPLACE FUNCTION private.safe_request_correlation_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_raw text := current_setting('request.headers', true);
  v_headers jsonb;
  v_candidate text;
BEGIN
  IF v_raw IS NULL OR v_raw = '' OR octet_length(v_raw) > 65536 THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_headers := v_raw::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  v_candidate := COALESCE(
    NULLIF(v_headers ->> 'x-request-id', ''),
    NULLIF(v_headers ->> 'cf-ray', ''),
    NULLIF(v_headers ->> 'x-vercel-id', '')
  );
  IF v_candidate IS NULL THEN
    RETURN NULL;
  END IF;

  v_candidate := LEFT(
    REGEXP_REPLACE(v_candidate, '[^A-Za-z0-9._:/-]', '', 'g'),
    200
  );
  RETURN NULLIF(v_candidate, '');
END;
$$;

REVOKE ALL ON FUNCTION private.safe_request_correlation_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.safe_request_correlation_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.write_authorization_event(
  p_workspace_id uuid,
  p_action_key text,
  p_object_type text,
  p_object_id uuid,
  p_decision text,
  p_reason_code text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_party_id uuid;
BEGIN
  SELECT pal.person_id INTO v_party_id
  FROM public.person_account_links pal
  WHERE pal.profile_id = auth.uid() AND pal.status = 'ACTIVE' AND pal.valid_to IS NULL
  LIMIT 1;

  INSERT INTO public.authorization_audit_events (
    id, workspace_id, actor_profile_id, actor_party_id, action_key,
    object_type, object_id, decision, reason_code, request_id, metadata
  ) VALUES (
    v_id, p_workspace_id, auth.uid(), v_party_id, p_action_key,
    p_object_type, p_object_id, p_decision, p_reason_code,
    private.safe_request_correlation_id(), COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION private.write_authorization_event(
  uuid, text, text, uuid, text, text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.write_authorization_event(
  uuid, text, text, uuid, text, text, jsonb
) TO authenticated;

-- Redact legacy raw-header payloads from the live table. Backups and external
-- log exports still require independent credential rotation and retention
-- handling; this forward migration cannot rewrite those copies.
UPDATE public.authorization_audit_events
SET request_id = NULL
WHERE request_id IS NOT NULL
  AND (
    LEFT(LTRIM(request_id), 1) = '{'
    OR request_id ~* '(authorization|apikey|cookie|bearer[[:space:]])'
  );

-- Community onboarding now crosses the trusted address-registry boundary only
-- through the actor-bound v2 command below. The legacy browser-callable RPC
-- cannot preserve that provenance, so close its inherited/direct API grants.
REVOKE EXECUTE ON FUNCTION public.create_community_creation_request(
  text, text, text, integer, text, uuid
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_user_reference_address_v2(
  p_actor_profile_id uuid,
  p_display_name text,
  p_lat double precision,
  p_lon double precision,
  p_street text,
  p_house_number text,
  p_city text,
  p_district text,
  p_postcode text,
  p_floor text,
  p_door text,
  p_source text,
  p_registry_system text,
  p_registry_canonical_address_id uuid,
  p_registry_source_record_id text,
  p_registry_contract_version text,
  p_registry_dataset_version text,
  p_registry_normalization_version text,
  p_registry_coordinate_precision text,
  p_registry_confidence numeric,
  p_registry_match_type text,
  p_registry_resolved_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_has_registry boolean := p_registry_canonical_address_id IS NOT NULL;
  v_has_any_registry_field boolean :=
    p_registry_system IS NOT NULL
    OR p_registry_canonical_address_id IS NOT NULL
    OR p_registry_source_record_id IS NOT NULL
    OR p_registry_contract_version IS NOT NULL
    OR p_registry_dataset_version IS NOT NULL
    OR p_registry_normalization_version IS NOT NULL
    OR p_registry_coordinate_precision IS NOT NULL
    OR p_registry_confidence IS NOT NULL
    OR p_registry_match_type IS NOT NULL
    OR p_registry_resolved_at IS NOT NULL;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Trusted reference address command required',
      DETAIL = '{"error_code":"TRUSTED_REFERENCE_ADDRESS_COMMAND_REQUIRED"}';
  END IF;
  IF p_actor_profile_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles profile WHERE profile.id = p_actor_profile_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Reference address actor is invalid',
      DETAIL = '{"error_code":"REFERENCE_ADDRESS_ACTOR_INVALID"}';
  END IF;
  IF CHAR_LENGTH(BTRIM(COALESCE(p_display_name, ''))) NOT BETWEEN 5 AND 500
     OR ((p_lat IS NULL) <> (p_lon IS NULL))
     OR (p_lat IS NOT NULL AND p_lat NOT BETWEEN -90 AND 90)
     OR (p_lon IS NOT NULL AND p_lon NOT BETWEEN -180 AND 180)
     OR CHAR_LENGTH(BTRIM(COALESCE(p_source, ''))) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Reference address payload is invalid',
      DETAIL = '{"error_code":"REFERENCE_ADDRESS_INVALID"}';
  END IF;

  IF v_has_any_registry_field AND NOT COALESCE((
    v_has_registry
    AND p_registry_system = 'OSM'
    AND p_registry_source_record_id ~ '^osm:(node|way|relation):[0-9]+$'
    AND p_registry_contract_version = '1.0'
    AND NULLIF(BTRIM(p_registry_dataset_version), '') IS NOT NULL
    AND NULLIF(BTRIM(p_registry_normalization_version), '') IS NOT NULL
    AND NULLIF(BTRIM(p_registry_coordinate_precision), '') IS NOT NULL
    AND p_registry_confidence BETWEEN 0 AND 1
    AND p_registry_match_type IN ('EXACT_HOUSE', 'PREFIX_HOUSE', 'FUZZY')
    AND p_registry_resolved_at IS NOT NULL
  ), false) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Reference address registry provenance is incomplete',
      DETAIL = '{"error_code":"REFERENCE_ADDRESS_PROVENANCE_INVALID"}';
  END IF;

  INSERT INTO public.user_reference_addresses (
    user_id, display_name, lat, lon, street, house_number, city, district,
    postcode, floor, door, source, registry_system,
    registry_canonical_address_id, registry_source_record_id,
    registry_contract_version, registry_dataset_version,
    registry_normalization_version, registry_coordinate_precision,
    registry_confidence, registry_match_type, registry_resolved_at, updated_at
  ) VALUES (
    p_actor_profile_id, BTRIM(p_display_name), p_lat, p_lon,
    NULLIF(BTRIM(p_street), ''), NULLIF(BTRIM(p_house_number), ''),
    NULLIF(BTRIM(p_city), ''), NULLIF(BTRIM(p_district), ''),
    NULLIF(BTRIM(p_postcode), ''), NULLIF(BTRIM(p_floor), ''),
    NULLIF(BTRIM(p_door), ''), BTRIM(p_source), p_registry_system,
    p_registry_canonical_address_id, p_registry_source_record_id,
    p_registry_contract_version, p_registry_dataset_version,
    p_registry_normalization_version, p_registry_coordinate_precision,
    p_registry_confidence, p_registry_match_type, p_registry_resolved_at, now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      lat = EXCLUDED.lat,
      lon = EXCLUDED.lon,
      street = EXCLUDED.street,
      house_number = EXCLUDED.house_number,
      city = EXCLUDED.city,
      district = EXCLUDED.district,
      postcode = EXCLUDED.postcode,
      floor = EXCLUDED.floor,
      door = EXCLUDED.door,
      source = EXCLUDED.source,
      registry_system = EXCLUDED.registry_system,
      registry_canonical_address_id = EXCLUDED.registry_canonical_address_id,
      registry_source_record_id = EXCLUDED.registry_source_record_id,
      registry_contract_version = EXCLUDED.registry_contract_version,
      registry_dataset_version = EXCLUDED.registry_dataset_version,
      registry_normalization_version = EXCLUDED.registry_normalization_version,
      registry_coordinate_precision = EXCLUDED.registry_coordinate_precision,
      registry_confidence = EXCLUDED.registry_confidence,
      registry_match_type = EXCLUDED.registry_match_type,
      registry_resolved_at = EXCLUDED.registry_resolved_at,
      updated_at = now();

  INSERT INTO public.authorization_audit_events (
    workspace_id, actor_profile_id, action_key, object_type, object_id,
    decision, reason_code, request_id, metadata
  ) VALUES (
    NULL, p_actor_profile_id, 'USER_REFERENCE_ADDRESS_UPDATED',
    'user_reference_address', p_actor_profile_id, 'STATE_CHANGE',
    CASE WHEN v_has_registry THEN 'REGISTRY_RESOLVED' ELSE 'LEGACY_COORDINATE_ADDRESS' END,
    private.safe_request_correlation_id(),
    jsonb_strip_nulls(jsonb_build_object(
      'registry_system', p_registry_system,
      'registry_canonical_address_id', p_registry_canonical_address_id,
      'registry_source_record_id', p_registry_source_record_id,
      'registry_contract_version', p_registry_contract_version
    ))
  );

  RETURN p_actor_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_user_reference_address_v2(
  uuid, text, double precision, double precision, text, text, text, text,
  text, text, text, text, text, uuid, text, text, text, text, text, numeric,
  text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_reference_address_v2(
  uuid, text, double precision, double precision, text, text, text, text,
  text, text, text, text, text, uuid, text, text, text, text, text, numeric,
  text, timestamptz
) TO service_role;

CREATE OR REPLACE FUNCTION public.create_community_creation_request_v2(
  p_actor_profile_id uuid,
  p_community_name text,
  p_formatted_address text,
  p_legal_form text,
  p_unit_count integer,
  p_governance_mode text,
  p_idempotency_key uuid,
  p_country_code text,
  p_postal_code text,
  p_settlement text,
  p_district text,
  p_settlement_part text,
  p_street_name text,
  p_street_type text,
  p_house_number_from text,
  p_house_number_to text,
  p_house_number_suffix text,
  p_building_mark text,
  p_source_system text,
  p_source_record_id text,
  p_latitude numeric,
  p_longitude numeric,
  p_registry_canonical_address_id uuid,
  p_registry_contract_version text,
  p_coordinate_precision text,
  p_confidence numeric,
  p_match_type text,
  p_dataset_version text,
  p_normalization_version text
)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  reserved_workspace_id uuid,
  address_id uuid,
  replayed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := p_actor_profile_id;
  v_existing uuid;
  v_request_id uuid := gen_random_uuid();
  v_reserved_workspace_id uuid := gen_random_uuid();
  v_address_id uuid;
  v_country_code text := UPPER(BTRIM(COALESCE(p_country_code, 'HU')));
  v_source_system text := UPPER(BTRIM(COALESCE(p_source_system, 'MANUAL')));
  v_source_record_id text := NULLIF(BTRIM(p_source_record_id), '');
  v_formatted_address text := BTRIM(COALESCE(p_formatted_address, ''));
  v_legal_form text := UPPER(BTRIM(COALESCE(p_legal_form, '')));
  v_canonical_key text;
  v_party_id uuid;
  v_is_registry boolean;
  v_registry_address_id uuid;
  v_source_address_id uuid;
  v_canonical_address_id uuid;
  v_governance_mode text := UPPER(BTRIM(COALESCE(p_governance_mode, '')));
  v_address_snapshot jsonb;
  v_request_fingerprint text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Trusted server role required',
      DETAIL = '{"error_code":"TRUSTED_ADDRESS_COMMAND_REQUIRED"}';
  END IF;
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_actor
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Claimant profile is invalid',
      DETAIL = '{"error_code":"CLAIMANT_PROFILE_INVALID"}';
  END IF;

  v_is_registry := v_source_system = 'OSM';
  IF v_source_system NOT IN ('OSM', 'MANUAL') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Address source is invalid',
      DETAIL = '{"error_code":"ADDRESS_SOURCE_INVALID"}';
  END IF;
  IF CHAR_LENGTH(BTRIM(COALESCE(p_community_name, ''))) NOT BETWEEN 3 AND 255
     OR CHAR_LENGTH(v_formatted_address) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Community request fields are invalid',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_INVALID"}';
  END IF;
  IF v_legal_form NOT IN ('CONDOMINIUM', 'UNDIVIDED_COMMON_OWNERSHIP') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Community legal form is invalid',
      DETAIL = '{"error_code":"COMMUNITY_LEGAL_FORM_INVALID"}';
  END IF;
  IF p_unit_count IS NULL OR p_unit_count NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Declared unit count is invalid',
      DETAIL = '{"error_code":"COMMUNITY_UNIT_COUNT_INVALID","minimum":1,"maximum":5000}';
  END IF;
  IF v_governance_mode NOT IN ('REPRESENTATIVE_MANAGED', 'BOARD_MANAGED', 'SELF_MANAGED') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Governance mode is invalid',
      DETAIL = '{"error_code":"GOVERNANCE_MODE_INVALID"}';
  END IF;
  IF (p_latitude IS NOT NULL AND p_latitude NOT BETWEEN -90 AND 90)
     OR (p_longitude IS NOT NULL AND p_longitude NOT BETWEEN -180 AND 180)
     OR ((p_latitude IS NULL) <> (p_longitude IS NULL)) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Address coordinates are invalid',
      DETAIL = '{"error_code":"ADDRESS_COORDINATES_INVALID"}';
  END IF;

  IF v_is_registry THEN
    IF v_country_code <> 'HU'
       OR p_postal_code IS NULL
       OR BTRIM(p_postal_code) !~ '^[0-9]{4}$'
       OR NULLIF(BTRIM(p_settlement), '') IS NULL
       OR NULLIF(BTRIM(p_street_name), '') IS NULL
       OR NULLIF(BTRIM(p_house_number_from), '') IS NULL
       OR v_source_record_id IS NULL
       OR v_source_record_id !~ '^osm:(node|way|relation):[0-9]+$'
       OR p_registry_canonical_address_id IS NULL
       OR BTRIM(COALESCE(p_registry_contract_version, '')) <> '1.0'
       OR NULLIF(BTRIM(p_coordinate_precision), '') IS NULL
       OR p_confidence IS NULL OR p_confidence NOT BETWEEN 0 AND 1
       OR UPPER(BTRIM(COALESCE(p_match_type, ''))) NOT IN (
         'EXACT_HOUSE', 'PREFIX_HOUSE', 'FUZZY'
       )
       OR NULLIF(BTRIM(p_dataset_version), '') IS NULL
       OR NULLIF(BTRIM(p_normalization_version), '') IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Registry address is not a Hungarian building address',
        DETAIL = '{"error_code":"ADDRESS_PRECISION_INVALID"}';
    END IF;

    v_canonical_key := public.normalize_address_key(concat_ws(
      ' ', v_country_code, p_postal_code, p_settlement, p_district,
      p_settlement_part, p_street_name, p_street_type,
      p_house_number_from, p_house_number_to, p_house_number_suffix, p_building_mark
    ));

    v_address_snapshot := jsonb_strip_nulls(jsonb_build_object(
      'mode', 'REGISTRY',
      'contractVersion', '1.0',
      'canonicalAddressId', p_registry_canonical_address_id,
      'sourceSystem', v_source_system,
      'sourceRecordId', v_source_record_id,
      'formattedAddress', v_formatted_address,
      'addressLevel', 'BUILDING',
      'countryCode', v_country_code,
      'postalCode', BTRIM(p_postal_code),
      'settlement', BTRIM(p_settlement),
      'district', NULLIF(BTRIM(p_district), ''),
      'settlementPart', NULLIF(BTRIM(p_settlement_part), ''),
      'streetName', BTRIM(p_street_name),
      'streetType', NULLIF(BTRIM(p_street_type), ''),
      'houseNumberFrom', BTRIM(p_house_number_from),
      'houseNumberTo', NULLIF(BTRIM(p_house_number_to), ''),
      'houseNumberSuffix', NULLIF(BTRIM(p_house_number_suffix), ''),
      'buildingMark', NULLIF(BTRIM(p_building_mark), ''),
      'latitude', p_latitude,
      'longitude', p_longitude,
      'coordinatePrecision', BTRIM(p_coordinate_precision),
      'confidence', p_confidence,
      'matchType', UPPER(BTRIM(p_match_type)),
      'datasetVersion', BTRIM(p_dataset_version),
      'normalizationVersion', BTRIM(p_normalization_version),
      'attribution', jsonb_build_object(
        'text', '© OpenStreetMap contributors',
        'url', 'https://www.openstreetmap.org/copyright'
      ),
      'resolvedAt', clock_timestamp()
    ));
  ELSE
    IF v_country_code <> 'HU'
       OR NULLIF(BTRIM(p_postal_code), '') IS NOT NULL
       OR NULLIF(BTRIM(p_settlement), '') IS NOT NULL
       OR NULLIF(BTRIM(p_district), '') IS NOT NULL
       OR NULLIF(BTRIM(p_settlement_part), '') IS NOT NULL
       OR NULLIF(BTRIM(p_street_name), '') IS NOT NULL
       OR NULLIF(BTRIM(p_street_type), '') IS NOT NULL
       OR NULLIF(BTRIM(p_house_number_from), '') IS NOT NULL
       OR NULLIF(BTRIM(p_house_number_to), '') IS NOT NULL
       OR NULLIF(BTRIM(p_house_number_suffix), '') IS NOT NULL
       OR NULLIF(BTRIM(p_building_mark), '') IS NOT NULL
       OR p_latitude IS NOT NULL
       OR p_longitude IS NOT NULL
       OR v_source_record_id IS NOT NULL
       OR p_registry_canonical_address_id IS NOT NULL
       OR NULLIF(BTRIM(p_registry_contract_version), '') IS NOT NULL
       OR NULLIF(BTRIM(p_coordinate_precision), '') IS NOT NULL
       OR p_confidence IS NOT NULL
       OR NULLIF(BTRIM(p_match_type), '') IS NOT NULL
       OR NULLIF(BTRIM(p_dataset_version), '') IS NOT NULL
       OR NULLIF(BTRIM(p_normalization_version), '') IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Manual address cannot claim a source record',
        DETAIL = '{"error_code":"ADDRESS_SOURCE_INVALID"}';
    END IF;
    v_canonical_key := public.normalize_address_key(v_formatted_address);
    v_address_snapshot := jsonb_build_object(
      'mode', 'MANUAL_REVIEW',
      'contractVersion', 'manual-v1',
      'formattedAddress', v_formatted_address,
      'countryCode', v_country_code,
      'submittedAt', clock_timestamp()
    );
  END IF;

  IF v_canonical_key = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Canonical address is empty',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_INVALID"}';
  END IF;

  IF octet_length(v_address_snapshot::text) > 16384 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Address snapshot is too large',
      DETAIL = '{"error_code":"ADDRESS_SNAPSHOT_INVALID"}';
  END IF;

  v_request_fingerprint := encode(digest(
    jsonb_build_object(
      'actorProfileId', v_actor,
      'communityName', BTRIM(p_community_name),
      'legalForm', v_legal_form,
      'unitCount', p_unit_count,
      'governanceMode', v_governance_mode,
      'addressIdentity', CASE
        -- A provider canonical UUID may legitimately roll forward when its
        -- normalized identity changes. The OSM element lineage is the stable
        -- business identity for an idempotent retry of the same selection.
        WHEN v_is_registry THEN v_source_system || ':' || v_source_record_id
        ELSE v_canonical_key
      END
    )::text,
    'sha256'
  ), 'hex');

  v_existing := private.lock_idempotent_command(
    v_actor, 'create_community_creation_request_v2', p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.community_creation_requests ccr
      WHERE ccr.id = v_existing
        AND ccr.claimant_profile_id = v_actor
        AND ccr.request_fingerprint = v_request_fingerprint
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Idempotency key was reused for another request',
        DETAIL = '{"error_code":"IDEMPOTENCY_KEY_REUSED"}';
    END IF;

    RETURN QUERY
    SELECT ccr.id, ccr.status, ccr.reserved_workspace_id, ccr.address_id, true
    FROM public.community_creation_requests ccr
    WHERE ccr.id = v_existing;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'community-request-actor:' || v_actor::text,
    0
  ));

  IF (
    SELECT COUNT(*)
    FROM public.community_creation_requests ccr
    WHERE ccr.claimant_profile_id = v_actor
      AND ccr.status IN (
        'DRAFT', 'PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED'
      )
      AND ccr.address_lease_expires_at > now()
      AND (
        ccr.status <> 'APPROVED'
        OR (
          ccr.activation_expires_at IS NOT NULL
          AND ccr.activation_expires_at > now()
        )
      )
  ) >= 20 THEN
    RAISE EXCEPTION USING
      ERRCODE = '54000', MESSAGE = 'Too many active community requests',
      DETAIL = '{"error_code":"ACTIVE_COMMUNITY_REQUEST_LIMIT"}';
  END IF;

  -- The normalized building identity is the serialization boundary. Similarity
  -- remains a reviewer-only signal and cannot auto-merge or auto-activate.
  IF v_is_registry THEN
    -- Every registry-backed request takes locks in this exact order. The
    -- external canonical UUID is the registry's current normalized identity;
    -- the OSM element ID is the durable lineage used to authorize an identity
    -- rollover. Locally normalized keys remain conflict-detection aliases.
    PERFORM pg_advisory_xact_lock(hashtextextended(
      'address-registry:' || v_source_system || ':' || p_registry_canonical_address_id::text,
      0
    ));
    PERFORM pg_advisory_xact_lock(hashtextextended(
      'address-source:' || v_source_system || ':' || v_source_record_id,
      0
    ));
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('address:' || v_canonical_key, 0));

  IF v_is_registry THEN
    SELECT a.id INTO v_registry_address_id
    FROM public.address_registry_identities registry_identity
    JOIN public.addresses a
      ON a.id = registry_identity.address_id
     AND a.valid_to IS NULL
    WHERE registry_identity.registry_system = v_source_system
      AND registry_identity.registry_canonical_address_id = p_registry_canonical_address_id
      AND registry_identity.valid_to IS NULL
    FOR UPDATE OF registry_identity, a;

    IF v_registry_address_id IS NULL AND EXISTS (
      SELECT 1
      FROM public.address_registry_identities registry_identity
      WHERE registry_identity.registry_system = v_source_system
        AND registry_identity.registry_canonical_address_id = p_registry_canonical_address_id
        AND registry_identity.valid_to IS NULL
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503', MESSAGE = 'Address registry identity points to an inactive local address',
        DETAIL = '{"error_code":"ADDRESS_REGISTRY_MAPPING_STALE"}';
    END IF;

    SELECT a.id INTO v_source_address_id
    FROM public.address_source_aliases alias
    JOIN public.addresses a
      ON a.id = alias.address_id
     AND a.valid_to IS NULL
    WHERE alias.source_system = v_source_system
      AND alias.source_record_id = v_source_record_id
      AND alias.valid_to IS NULL
    FOR UPDATE OF alias, a;

    IF v_source_address_id IS NULL AND EXISTS (
      SELECT 1
      FROM public.address_source_aliases alias
      WHERE alias.source_system = v_source_system
        AND alias.source_record_id = v_source_record_id
        AND alias.valid_to IS NULL
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503', MESSAGE = 'Address source alias points to an inactive local address',
        DETAIL = '{"error_code":"ADDRESS_SOURCE_ALIAS_STALE"}';
    END IF;

    IF v_source_address_id IS NULL THEN
      SELECT a.id INTO v_source_address_id
      FROM public.addresses a
      WHERE a.source_system = v_source_system
        AND a.source_record_id = v_source_record_id
        AND a.valid_to IS NULL
      FOR UPDATE;
    END IF;
  END IF;

  SELECT a.id INTO v_canonical_address_id
  FROM public.addresses a
  WHERE a.canonical_key = v_canonical_key
    AND a.address_level = 'BUILDING'
    AND a.valid_to IS NULL
  FOR UPDATE;

  IF (
       v_registry_address_id IS NOT NULL
       AND v_source_address_id IS NOT NULL
       AND v_registry_address_id <> v_source_address_id
     ) OR (
       v_registry_address_id IS NOT NULL
       AND v_canonical_address_id IS NOT NULL
       AND v_registry_address_id <> v_canonical_address_id
     ) OR (
       v_source_address_id IS NOT NULL
       AND v_canonical_address_id IS NOT NULL
       AND v_source_address_id <> v_canonical_address_id
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505', MESSAGE = 'Address source identity conflicts with canonical identity',
      DETAIL = '{"error_code":"ADDRESS_IDENTITY_CONFLICT"}';
  END IF;

  v_address_id := COALESCE(
    v_registry_address_id, v_source_address_id, v_canonical_address_id
  );

  IF v_address_id IS NULL THEN
    v_address_id := gen_random_uuid();
    INSERT INTO public.addresses (
      id, country_code, postal_code, settlement, district, settlement_part,
      street_name, street_type, house_number_from, house_number_to,
      house_number_suffix, building_mark, address_level, formatted_address,
      canonical_key, canonicalization_version, source_system, source_record_id,
      verification_status, latitude, longitude
    ) VALUES (
      v_address_id, v_country_code, NULLIF(BTRIM(p_postal_code), ''),
      NULLIF(BTRIM(p_settlement), ''), NULLIF(BTRIM(p_district), ''),
      NULLIF(BTRIM(p_settlement_part), ''), NULLIF(BTRIM(p_street_name), ''),
      NULLIF(BTRIM(p_street_type), ''), NULLIF(BTRIM(p_house_number_from), ''),
      NULLIF(BTRIM(p_house_number_to), ''), NULLIF(BTRIM(p_house_number_suffix), ''),
      NULLIF(BTRIM(p_building_mark), ''), 'BUILDING', v_formatted_address,
      v_canonical_key, 2, v_source_system, v_source_record_id,
      CASE WHEN v_is_registry THEN 'SOURCE_MATCHED' ELSE 'UNVERIFIED' END,
      p_latitude, p_longitude
    );
  ELSIF v_is_registry THEN
    -- A registry selection may enrich only an unverified/source-matched local
    -- identity. VERIFIED and DISPUTED rows are legal-review records: external
    -- OSM data must never rewrite their address or coordinates in place.
    UPDATE public.addresses a
    SET country_code = v_country_code,
        postal_code = NULLIF(BTRIM(p_postal_code), ''),
        settlement = NULLIF(BTRIM(p_settlement), ''),
        district = NULLIF(BTRIM(p_district), ''),
        settlement_part = NULLIF(BTRIM(p_settlement_part), ''),
        street_name = NULLIF(BTRIM(p_street_name), ''),
        street_type = NULLIF(BTRIM(p_street_type), ''),
        house_number_from = NULLIF(BTRIM(p_house_number_from), ''),
        house_number_to = NULLIF(BTRIM(p_house_number_to), ''),
        house_number_suffix = NULLIF(BTRIM(p_house_number_suffix), ''),
        building_mark = NULLIF(BTRIM(p_building_mark), ''),
        formatted_address = v_formatted_address,
        canonical_key = v_canonical_key,
        source_system = CASE
          WHEN a.source_record_id IS NULL THEN v_source_system
          ELSE a.source_system
        END,
        source_record_id = COALESCE(a.source_record_id, v_source_record_id),
        verification_status = 'SOURCE_MATCHED',
        latitude = COALESCE(p_latitude, a.latitude),
        longitude = COALESCE(p_longitude, a.longitude),
        canonicalization_version = GREATEST(a.canonicalization_version, 2),
        updated_at = now()
    WHERE a.id = v_address_id
      AND a.verification_status IN ('UNVERIFIED', 'SOURCE_MATCHED');
  END IF;

  IF v_is_registry THEN
    -- A canonical UUID can change after a registry normalization correction.
    -- Rotate the active external identity only when the unchanged OSM source
    -- lineage already resolves to this exact local address. A canonical-key
    -- match alone is insufficient: without source continuity the insert below
    -- must remain fail-closed rather than silently taking over an identity.
    IF EXISTS (
      SELECT 1
      FROM public.address_registry_identities registry_identity
      WHERE registry_identity.registry_system = v_source_system
        AND registry_identity.address_id = v_address_id
        AND registry_identity.registry_canonical_address_id <>
          p_registry_canonical_address_id
        AND registry_identity.valid_to IS NULL
    ) THEN
      IF v_source_address_id IS DISTINCT FROM v_address_id THEN
        RAISE EXCEPTION USING
          ERRCODE = '23505', MESSAGE = 'Address canonical identity changed without source lineage proof',
          DETAIL = '{"error_code":"ADDRESS_IDENTITY_CONFLICT"}';
      END IF;

      UPDATE public.address_registry_identities registry_identity
      SET valid_to = clock_timestamp()
      WHERE registry_identity.registry_system = v_source_system
        AND registry_identity.address_id = v_address_id
        AND registry_identity.registry_canonical_address_id <>
          p_registry_canonical_address_id
        AND registry_identity.valid_to IS NULL;
    END IF;

    INSERT INTO public.address_registry_identities (
      registry_system, registry_canonical_address_id, address_id
    ) VALUES (
      v_source_system, p_registry_canonical_address_id, v_address_id
    )
    ON CONFLICT (registry_system, registry_canonical_address_id)
      WHERE valid_to IS NULL
    DO NOTHING;

    IF NOT EXISTS (
      SELECT 1
      FROM public.address_registry_identities registry_identity
      WHERE registry_identity.registry_system = v_source_system
        AND registry_identity.registry_canonical_address_id = p_registry_canonical_address_id
        AND registry_identity.address_id = v_address_id
        AND registry_identity.valid_to IS NULL
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505', MESSAGE = 'Address registry identity belongs to another local address',
        DETAIL = '{"error_code":"ADDRESS_IDENTITY_CONFLICT"}';
    END IF;

    INSERT INTO public.address_source_aliases (
      source_system, source_record_id, address_id
    ) VALUES (
      v_source_system, v_source_record_id, v_address_id
    )
    ON CONFLICT (source_system, source_record_id)
      WHERE valid_to IS NULL
    DO NOTHING;

    IF NOT EXISTS (
      SELECT 1
      FROM public.address_source_aliases alias
      WHERE alias.source_system = v_source_system
        AND alias.source_record_id = v_source_record_id
        AND alias.address_id = v_address_id
        AND alias.valid_to IS NULL
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505', MESSAGE = 'Address source alias belongs to another identity',
        DETAIL = '{"error_code":"ADDRESS_IDENTITY_CONFLICT"}';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.building_address_assignments baa
    JOIN public.workspace_buildings wb
      ON wb.physical_building_id = baa.physical_building_id
     AND wb.is_primary AND wb.valid_to IS NULL
    JOIN public.workspaces w
      ON w.id = wb.workspace_id AND w.status = 'ACTIVE'
    WHERE baa.address_id = v_address_id
      AND baa.assignment_role = 'PRIMARY'
      AND baa.valid_to IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'A community already exists at this address',
      DETAIL = '{"error_code":"COMMUNITY_ALREADY_EXISTS","next_action":"SEARCH_AND_JOIN"}';
  END IF;

  SELECT pal.person_id INTO v_party_id
  FROM public.person_account_links pal
  WHERE pal.profile_id = v_actor
    AND pal.status = 'ACTIVE'
    AND pal.valid_to IS NULL
  LIMIT 1;

  INSERT INTO public.community_creation_requests (
    id, reserved_workspace_id, claimant_profile_id, claimant_party_id,
    address_id, community_name, legal_form, governance_mode,
    declared_unit_count, status, idempotency_key, address_source_snapshot,
    request_fingerprint
  ) VALUES (
    v_request_id, v_reserved_workspace_id, v_actor, v_party_id,
    v_address_id, BTRIM(p_community_name), v_legal_form, v_governance_mode,
    p_unit_count, 'PENDING_VERIFICATION', p_idempotency_key, v_address_snapshot,
    v_request_fingerprint
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'create_community_creation_request_v2', p_idempotency_key, v_request_id
  );
  INSERT INTO public.authorization_audit_events (
    workspace_id, actor_profile_id, actor_party_id, action_key,
    object_type, object_id, decision, reason_code, request_id, metadata
  ) VALUES (
    NULL, v_actor, v_party_id, 'COMMUNITY_CREATION_REQUESTED',
    'community_creation_request', v_request_id, 'STATE_CHANGE',
    'PENDING_VERIFICATION', private.safe_request_correlation_id(),
    jsonb_build_object(
      'reserved_workspace_id', v_reserved_workspace_id,
      'address_id', v_address_id,
      'address_source_system', v_source_system,
      'address_source_record_id', v_source_record_id,
      'address_verification_status', CASE WHEN v_is_registry THEN 'SOURCE_MATCHED' ELSE 'UNVERIFIED' END,
      'activation_requires_platform_review', true,
      'activation_requires_fresh_aal2', true
    )
  );

  RETURN QUERY
  SELECT v_request_id, 'PENDING_VERIFICATION'::text,
    v_reserved_workspace_id, v_address_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.create_community_creation_request_v2(
  uuid, text, text, text, integer, text, uuid,
  text, text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, numeric, uuid, text, text, numeric, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_creation_request_v2(
  uuid, text, text, text, integer, text, uuid,
  text, text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, numeric, uuid, text, text, numeric, text, text, text
) TO service_role;

COMMENT ON FUNCTION public.create_community_creation_request_v2(
  uuid, text, text, text, integer, text, uuid,
  text, text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, numeric, uuid, text, text, numeric, text, text, text
) IS 'Creates a review-only community request from a server-resolved shared GeoData address snapshot or an explicit manual-review address. Never grants workspace access.';

COMMIT;
