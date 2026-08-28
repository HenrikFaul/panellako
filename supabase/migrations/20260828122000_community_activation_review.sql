-- PanelLako community creation review and claimant-controlled activation.
--
-- Review is deliberately separated from activation:
--   1. a trusted service-role caller records the platform decision and the
--      opaque evidence references;
--   2. only the original claimant, with a fresh AAL2 session, may activate an
--      approved and still-valid request.
--
-- No attestation count, fuzzy address match, or reviewer approval can create a
-- tenant automatically.

BEGIN;

-- ---------------------------------------------------------------------------
-- Review history and activation provenance.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_creation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_creation_request_id uuid NOT NULL
    REFERENCES public.community_creation_requests(id) ON DELETE CASCADE,
  reviewer_actor text NOT NULL,
  reviewer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision text NOT NULL,
  review_reason text NOT NULL,
  verification_method text,
  evidence_references jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_creation_reviews_decision_check CHECK (
    decision IN ('APPROVE', 'NEEDS_EVIDENCE', 'REJECT')
  ),
  CONSTRAINT community_creation_reviews_reason_check CHECK (
    CHAR_LENGTH(BTRIM(review_reason)) BETWEEN 3 AND 2000
  ),
  CONSTRAINT community_creation_reviews_actor_check CHECK (
    reviewer_actor = LOWER(BTRIM(reviewer_actor))
    AND CHAR_LENGTH(reviewer_actor) BETWEEN 3 AND 320
    AND reviewer_actor ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  CONSTRAINT community_creation_reviews_method_check CHECK (
    verification_method IS NULL
    OR verification_method IN ('OFFICIAL_REGISTER', 'SIGNED_MANDATE', 'SELF_MANAGED_RESOLUTION')
  ),
  CONSTRAINT community_creation_reviews_evidence_shape_check CHECK (
    jsonb_typeof(evidence_references) = 'object'
    AND OCTET_LENGTH(evidence_references::text) <= 16384
  ),
  CONSTRAINT community_creation_reviews_actor_idempotency_uq
    UNIQUE (reviewer_actor, idempotency_key)
);

CREATE INDEX IF NOT EXISTS community_creation_reviews_request_created_idx
  ON public.community_creation_reviews (community_creation_request_id, created_at DESC, id DESC);

ALTER TABLE public.community_creation_requests
  ADD COLUMN IF NOT EXISTS last_review_id uuid,
  ADD COLUMN IF NOT EXISTS activation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_existing_workspace_id uuid,
  ADD COLUMN IF NOT EXISTS activated_workspace_id uuid,
  ADD COLUMN IF NOT EXISTS activated_physical_building_id uuid,
  ADD COLUMN IF NOT EXISTS activated_membership_id uuid,
  ADD COLUMN IF NOT EXISTS activated_mandate_id uuid,
  ADD COLUMN IF NOT EXISTS activated_role_assignment_id uuid,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.community_address_duplicate_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_creation_request_id uuid NOT NULL
    REFERENCES public.community_creation_requests(id) ON DELETE CASCADE,
  candidate_address_id uuid NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  candidate_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  resolution text NOT NULL,
  resolution_reason text NOT NULL,
  evidence_references jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewer_actor text NOT NULL,
  reviewer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_address_duplicate_resolution_check CHECK (
    resolution IN ('NOT_DUPLICATE', 'LINK_EXISTING')
  ),
  CONSTRAINT community_address_duplicate_reason_check CHECK (
    CHAR_LENGTH(BTRIM(resolution_reason)) BETWEEN 3 AND 2000
  ),
  CONSTRAINT community_address_duplicate_actor_check CHECK (
    reviewer_actor = LOWER(BTRIM(reviewer_actor))
    AND CHAR_LENGTH(reviewer_actor) BETWEEN 3 AND 320
    AND reviewer_actor ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  CONSTRAINT community_address_duplicate_evidence_shape_check CHECK (
    jsonb_typeof(evidence_references) = 'object'
    AND OCTET_LENGTH(evidence_references::text) <= 16384
  ),
  CONSTRAINT community_address_duplicate_pair_uq
    UNIQUE (community_creation_request_id, candidate_address_id),
  CONSTRAINT community_address_duplicate_actor_idempotency_uq
    UNIQUE (reviewer_actor, idempotency_key)
);

CREATE INDEX IF NOT EXISTS community_address_duplicate_candidate_idx
  ON public.community_address_duplicate_resolutions (candidate_address_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_creation_requests'::regclass
      AND conname = 'community_creation_requests_last_review_fk'
  ) THEN
    ALTER TABLE public.community_creation_requests
      ADD CONSTRAINT community_creation_requests_last_review_fk
      FOREIGN KEY (last_review_id) REFERENCES public.community_creation_reviews(id)
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_creation_requests'::regclass
      AND conname = 'community_creation_requests_activated_workspace_fk'
  ) THEN
    ALTER TABLE public.community_creation_requests
      ADD CONSTRAINT community_creation_requests_activated_workspace_fk
      FOREIGN KEY (activated_workspace_id) REFERENCES public.workspaces(id)
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_creation_requests'::regclass
      AND conname = 'community_creation_requests_linked_workspace_fk'
  ) THEN
    ALTER TABLE public.community_creation_requests
      ADD CONSTRAINT community_creation_requests_linked_workspace_fk
      FOREIGN KEY (linked_existing_workspace_id) REFERENCES public.workspaces(id)
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_creation_requests'::regclass
      AND conname = 'community_creation_requests_activated_building_fk'
  ) THEN
    ALTER TABLE public.community_creation_requests
      ADD CONSTRAINT community_creation_requests_activated_building_fk
      FOREIGN KEY (activated_physical_building_id) REFERENCES public.physical_buildings(id)
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_creation_requests'::regclass
      AND conname = 'community_creation_requests_activated_membership_fk'
  ) THEN
    ALTER TABLE public.community_creation_requests
      ADD CONSTRAINT community_creation_requests_activated_membership_fk
      FOREIGN KEY (activated_workspace_id, activated_membership_id)
      REFERENCES public.workspace_memberships(workspace_id, id)
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_creation_requests'::regclass
      AND conname = 'community_creation_requests_activated_mandate_fk'
  ) THEN
    ALTER TABLE public.community_creation_requests
      ADD CONSTRAINT community_creation_requests_activated_mandate_fk
      FOREIGN KEY (activated_workspace_id, activated_mandate_id)
      REFERENCES public.management_mandates(workspace_id, id)
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_creation_requests'::regclass
      AND conname = 'community_creation_requests_activated_role_fk'
  ) THEN
    ALTER TABLE public.community_creation_requests
      ADD CONSTRAINT community_creation_requests_activated_role_fk
      FOREIGN KEY (activated_role_assignment_id) REFERENCES public.role_assignments(id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.community_creation_requests
  DROP CONSTRAINT IF EXISTS community_creation_requests_status_check;
ALTER TABLE public.community_creation_requests
  ADD CONSTRAINT community_creation_requests_status_check CHECK (
    status IN (
      'DRAFT', 'PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED',
      'ACTIVATED', 'REJECTED', 'CANCELLED', 'EXPIRED'
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.community_creation_requests ccr
    WHERE ccr.legal_form NOT IN ('CONDOMINIUM', 'UNDIVIDED_COMMON_OWNERSHIP')
       OR ccr.declared_unit_count NOT BETWEEN 1 AND 5000
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Existing community requests violate activation bounds',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_CONSTRAINT_PREFLIGHT_FAILED"}';
  END IF;
END;
$$;

ALTER TABLE public.community_creation_requests
  DROP CONSTRAINT IF EXISTS community_creation_requests_unit_count_check;
ALTER TABLE public.community_creation_requests
  ADD CONSTRAINT community_creation_requests_unit_count_check
  CHECK (declared_unit_count BETWEEN 1 AND 5000);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_creation_requests'::regclass
      AND conname = 'community_creation_requests_legal_form_check'
  ) THEN
    ALTER TABLE public.community_creation_requests
      ADD CONSTRAINT community_creation_requests_legal_form_check CHECK (
        legal_form IN ('CONDOMINIUM', 'UNDIVIDED_COMMON_OWNERSHIP')
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_creation_requests'::regclass
      AND conname = 'community_creation_requests_activation_shape_check'
  ) THEN
    ALTER TABLE public.community_creation_requests
      ADD CONSTRAINT community_creation_requests_activation_shape_check CHECK (
        (
          activated_at IS NULL
          AND activated_workspace_id IS NULL
          AND activated_physical_building_id IS NULL
          AND activated_membership_id IS NULL
          AND activated_mandate_id IS NULL
          AND activated_role_assignment_id IS NULL
        )
        OR (
          status = 'ACTIVATED'
          AND activated_at IS NOT NULL
          AND activated_workspace_id IS NOT NULL
          AND activated_physical_building_id IS NOT NULL
          AND activated_membership_id IS NOT NULL
          AND activated_mandate_id IS NOT NULL
          AND activated_role_assignment_id IS NOT NULL
          AND activated_workspace_id = reserved_workspace_id
          AND activated_physical_building_id = reserved_workspace_id
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_creation_requests'::regclass
      AND conname = 'community_creation_requests_activation_expiry_check'
  ) THEN
    ALTER TABLE public.community_creation_requests
      ADD CONSTRAINT community_creation_requests_activation_expiry_check CHECK (
        activation_expires_at IS NULL
        OR activation_expires_at <= address_lease_expires_at
      ) NOT VALID;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS community_creation_requests_activated_workspace_uq
  ON public.community_creation_requests (activated_workspace_id)
  WHERE activated_workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_creation_requests_activation_queue_idx
  ON public.community_creation_requests (claimant_profile_id, status, activation_expires_at)
  WHERE status = 'APPROVED' AND activated_at IS NULL;

-- Replace the request command so legal form and bounded initial inventory are
-- enforced by the database command as well as by table constraints.
CREATE OR REPLACE FUNCTION public.create_community_creation_request(
  p_community_name text,
  p_formatted_address text,
  p_legal_form text,
  p_unit_count integer,
  p_governance_mode text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  reserved_workspace_id uuid,
  address_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_request_id uuid := gen_random_uuid();
  v_reserved_workspace_id uuid := gen_random_uuid();
  v_address_id uuid;
  v_canonical_key text := public.normalize_address_key(p_formatted_address);
  v_legal_form text := UPPER(BTRIM(COALESCE(p_legal_form, '')));
  v_party_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  PERFORM public.ensure_profile();
  v_existing := private.lock_idempotent_command(
    v_actor, 'create_community_creation_request', p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    RETURN QUERY
    SELECT ccr.id, ccr.status, ccr.reserved_workspace_id, ccr.address_id
    FROM public.community_creation_requests ccr
    WHERE ccr.id = v_existing;
    RETURN;
  END IF;

  IF CHAR_LENGTH(BTRIM(COALESCE(p_community_name, ''))) NOT BETWEEN 3 AND 255
     OR CHAR_LENGTH(BTRIM(COALESCE(p_formatted_address, ''))) NOT BETWEEN 5 AND 500
     OR v_canonical_key = '' THEN
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
  IF p_governance_mode NOT IN ('REPRESENTATIVE_MANAGED', 'BOARD_MANAGED', 'SELF_MANAGED') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Governance mode is invalid',
      DETAIL = '{"error_code":"GOVERNANCE_MODE_INVALID"}';
  END IF;

  -- Exact canonical identity is serialized. Similarity remains a reviewer aid
  -- and never selects, merges, or activates a community automatically.
  PERFORM pg_advisory_xact_lock(hashtextextended('address:' || v_canonical_key, 0));

  SELECT a.id INTO v_address_id
  FROM public.addresses a
  WHERE a.canonical_key = v_canonical_key
    AND a.address_level = 'BUILDING'
    AND a.valid_to IS NULL
  FOR UPDATE;

  IF v_address_id IS NULL THEN
    v_address_id := gen_random_uuid();
    INSERT INTO public.addresses (
      id, country_code, address_level, formatted_address, canonical_key,
      canonicalization_version, source_system, verification_status
    ) VALUES (
      v_address_id, 'HU', 'BUILDING', BTRIM(p_formatted_address), v_canonical_key,
      1, 'MANUAL', 'UNVERIFIED'
    );
  ELSIF EXISTS (
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
    declared_unit_count, status, idempotency_key
  ) VALUES (
    v_request_id, v_reserved_workspace_id, v_actor, v_party_id,
    v_address_id, BTRIM(p_community_name), v_legal_form, p_governance_mode,
    p_unit_count, 'PENDING_VERIFICATION', p_idempotency_key
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'create_community_creation_request', p_idempotency_key, v_request_id
  );
  PERFORM private.write_authorization_event(
    NULL, 'COMMUNITY_CREATION_REQUESTED', 'community_creation_request', v_request_id,
    'STATE_CHANGE', 'PENDING_VERIFICATION',
    jsonb_build_object(
      'reserved_workspace_id', v_reserved_workspace_id,
      'address_id', v_address_id,
      'activation_requires_platform_review', true,
      'activation_requires_fresh_aal2', true
    )
  );

  RETURN QUERY
  SELECT v_request_id, 'PENDING_VERIFICATION'::text,
    v_reserved_workspace_id, v_address_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_community_creation_request(text, text, text, integer, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_community_creation_request(text, text, text, integer, text, uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Verified-authority cut-over. Legacy CLAIMED mandates remain visible for
-- reconciliation but cannot grant administrator or derivative delegate power.
-- The single fixed public demo fixture is the only narrowly evidenced legacy
-- exception, preserving the presentation account without trusting any other
-- legacy role label.
-- ---------------------------------------------------------------------------

UPDATE public.management_mandates mm
SET verification_status = 'VERIFIED',
    evidence_reference = 'demo-seed:fixed-public-presentation-fixture',
    updated_at = now()
WHERE mm.workspace_id = 'bbbbbbbb-0001-0001-0001-000000000001'::uuid
  AND mm.mandate_party_id = 'aaaaaaaa-0001-0001-0001-000000000001'::uuid
  AND mm.mandate_type = 'COMMON_REPRESENTATIVE'
  AND mm.status = 'ACTIVE'
  AND EXISTS (
    SELECT 1
    FROM public.buildings b
    WHERE b.id = 'bbbbbbbb-0001-0001-0001-000000000001'::uuid
  )
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = 'aaaaaaaa-0001-0001-0001-000000000001'::uuid
      AND LOWER(BTRIM(p.email)) = 'demo.kepviselo@panellako.hu'
      AND p.free_trial_never_expires = true
  );

CREATE OR REPLACE FUNCTION private.has_workspace_capability(
  p_profile_id uuid,
  p_workspace_id uuid,
  p_capability_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  WITH requested AS (
    SELECT COALESCE(
      (SELECT ckm.internal_key FROM public.capability_key_map ckm
       WHERE ckm.canonical_key = p_capability_key),
      p_capability_key
    ) AS internal_key
  ), active_membership AS (
    SELECT wm.id
    FROM public.workspace_memberships wm
    JOIN public.membership_periods mp
      ON mp.workspace_id = wm.workspace_id
     AND mp.membership_id = wm.id
     AND mp.ended_at IS NULL
    WHERE wm.profile_id = p_profile_id
      AND wm.workspace_id = p_workspace_id
      AND wm.status = 'ACTIVE'
  )
  SELECT EXISTS (SELECT 1 FROM active_membership)
    AND (
      (SELECT internal_key FROM requested) IN (
        'WORKSPACE_READ', 'COMMUNICATION_READ', 'DOCUMENT_READ',
        'DOCUMENT_OWNER_READ', 'DOCUMENT_UNIT_READ', 'MEETING_READ',
        'VOTE_CAST', 'TICKET_CREATE', 'TICKET_READ_OWN',
        'METER_SUBMIT', 'METER_READ_OWN', 'ENVIRONMENT_READ',
        'FINANCE_UNIT_READ', 'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED'
      )
      OR EXISTS (
        SELECT 1
        FROM active_membership am
        JOIN public.role_assignments ra
          ON ra.workspace_id = p_workspace_id
         AND ra.membership_id = am.id
         AND ra.status = 'ACTIVE'
         AND ra.valid_from <= now()
         AND (ra.valid_to IS NULL OR ra.valid_to > now())
        JOIN public.role_capabilities rc
          ON rc.role_key = ra.role_key
         AND rc.capability_key = (SELECT internal_key FROM requested)
        LEFT JOIN public.management_mandates mm
          ON mm.workspace_id = ra.workspace_id
         AND mm.id = ra.source_mandate_id
         AND mm.status = 'ACTIVE'
         AND mm.verification_status = 'VERIFIED'
         AND mm.valid_from <= now()
         AND (mm.valid_to IS NULL OR mm.valid_to > now())
        LEFT JOIN public.delegations d
          ON d.workspace_id = ra.workspace_id
         AND d.id = ra.source_delegation_id
         AND d.status = 'ACTIVE'
         AND d.valid_from <= now()
         AND (d.valid_to IS NULL OR d.valid_to > now())
        LEFT JOIN public.management_mandates dm
          ON dm.workspace_id = d.workspace_id
         AND dm.id = d.source_mandate_id
         AND dm.status = 'ACTIVE'
         AND dm.verification_status = 'VERIFIED'
         AND dm.valid_from <= now()
         AND (dm.valid_to IS NULL OR dm.valid_to > now())
        WHERE
          (
            ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
            AND mm.id IS NOT NULL
          )
          OR (
            ra.role_key = 'DELEGATE_OPERATIONS'
            AND d.id IS NOT NULL
            AND dm.id IS NOT NULL
            AND (SELECT internal_key FROM requested) = ANY(d.capability_keys)
          )
          OR ra.role_key IN ('COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN')
      )
    );
$$;

REVOKE ALL ON FUNCTION private.has_workspace_capability(uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_workspace_capability(uuid, uuid, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION private.effective_role_keys(
  p_profile_id uuid,
  p_workspace_id uuid
)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT ra.role_key ORDER BY ra.role_key), ARRAY[]::text[])
  FROM public.workspace_memberships wm
  JOIN public.membership_periods mp
    ON mp.workspace_id = wm.workspace_id
   AND mp.membership_id = wm.id
   AND mp.ended_at IS NULL
  JOIN public.role_assignments ra
    ON ra.workspace_id = wm.workspace_id
   AND ra.membership_id = wm.id
   AND ra.status = 'ACTIVE'
   AND ra.valid_from <= now()
   AND (ra.valid_to IS NULL OR ra.valid_to > now())
  LEFT JOIN public.management_mandates mm
    ON mm.workspace_id = ra.workspace_id
   AND mm.id = ra.source_mandate_id
   AND mm.status = 'ACTIVE'
   AND mm.verification_status = 'VERIFIED'
   AND mm.valid_from <= now()
   AND (mm.valid_to IS NULL OR mm.valid_to > now())
  LEFT JOIN public.delegations d
    ON d.workspace_id = ra.workspace_id
   AND d.id = ra.source_delegation_id
   AND d.status = 'ACTIVE'
   AND d.valid_from <= now()
   AND (d.valid_to IS NULL OR d.valid_to > now())
  LEFT JOIN public.management_mandates dm
    ON dm.workspace_id = d.workspace_id
   AND dm.id = d.source_mandate_id
   AND dm.status = 'ACTIVE'
   AND dm.verification_status = 'VERIFIED'
   AND dm.valid_from <= now()
   AND (dm.valid_to IS NULL OR dm.valid_to > now())
  WHERE wm.profile_id = p_profile_id
    AND wm.workspace_id = p_workspace_id
    AND wm.status = 'ACTIVE'
    AND (
      (
        ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
        AND mm.id IS NOT NULL
      )
      OR (ra.role_key = 'DELEGATE_OPERATIONS' AND d.id IS NOT NULL AND dm.id IS NOT NULL)
      OR ra.role_key IN ('COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN')
    );
$$;

REVOKE ALL ON FUNCTION private.effective_role_keys(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.effective_role_keys(uuid, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION private.validate_role_assignment_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_mandate_type text;
  v_delegation_capabilities text[];
BEGIN
  IF NEW.status <> 'ACTIVE' THEN
    RETURN NEW;
  END IF;

  IF NEW.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN') THEN
    SELECT mm.mandate_type INTO v_mandate_type
    FROM public.management_mandates mm
    WHERE mm.workspace_id = NEW.workspace_id
      AND mm.id = NEW.source_mandate_id
      AND mm.status = 'ACTIVE'
      AND mm.verification_status = 'VERIFIED'
      AND mm.valid_from <= now()
      AND (mm.valid_to IS NULL OR mm.valid_to > now());

    IF v_mandate_type IS NULL
       OR (NEW.role_key = 'COMMON_REPRESENTATIVE_ADMIN' AND v_mandate_type <> 'COMMON_REPRESENTATIVE')
       OR (NEW.role_key = 'BOARD_ADMIN' AND v_mandate_type <> 'MANAGING_BOARD')
       OR (NEW.role_key = 'SELF_MANAGED_ADMIN' AND v_mandate_type <> 'SELF_MANAGED_COORDINATION') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Role assignment source mandate is invalid or unverified',
        DETAIL = '{"error_code":"ROLE_MANDATE_SOURCE_INVALID"}';
    END IF;
  ELSIF NEW.role_key = 'DELEGATE_OPERATIONS' THEN
    SELECT d.capability_keys INTO v_delegation_capabilities
    FROM public.delegations d
    JOIN public.management_mandates mm
      ON mm.workspace_id = d.workspace_id
     AND mm.id = d.source_mandate_id
     AND mm.status = 'ACTIVE'
     AND mm.verification_status = 'VERIFIED'
     AND mm.valid_from <= now()
     AND (mm.valid_to IS NULL OR mm.valid_to > now())
    WHERE d.workspace_id = NEW.workspace_id
      AND d.id = NEW.source_delegation_id
      AND d.beneficiary_membership_id = NEW.membership_id
      AND d.status = 'ACTIVE'
      AND d.valid_from <= now()
      AND (d.valid_to IS NULL OR d.valid_to > now());

    IF v_delegation_capabilities IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Role assignment source delegation is invalid or unverified',
        DETAIL = '{"error_code":"ROLE_DELEGATION_SOURCE_INVALID"}';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_role_assignment_source()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.validate_role_assignment_source()
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Fail-closed review storage.
-- ---------------------------------------------------------------------------

ALTER TABLE public.community_creation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_address_duplicate_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_creation_reviews_service_select
  ON public.community_creation_reviews;
CREATE POLICY community_creation_reviews_service_select
  ON public.community_creation_reviews
  FOR SELECT TO service_role
  USING (true);

DROP POLICY IF EXISTS community_creation_reviews_service_insert
  ON public.community_creation_reviews;
CREATE POLICY community_creation_reviews_service_insert
  ON public.community_creation_reviews
  FOR INSERT TO service_role
  WITH CHECK (true);

REVOKE ALL ON TABLE public.community_creation_reviews
  FROM PUBLIC, anon, authenticated, service_role;

DROP POLICY IF EXISTS community_address_duplicate_service_select
  ON public.community_address_duplicate_resolutions;
CREATE POLICY community_address_duplicate_service_select
  ON public.community_address_duplicate_resolutions
  FOR SELECT TO service_role
  USING (true);

DROP POLICY IF EXISTS community_address_duplicate_service_insert
  ON public.community_address_duplicate_resolutions;
CREATE POLICY community_address_duplicate_service_insert
  ON public.community_address_duplicate_resolutions
  FOR INSERT TO service_role
  WITH CHECK (true);

REVOKE ALL ON TABLE public.community_address_duplicate_resolutions
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.reject_community_creation_review_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001', MESSAGE = 'Community creation reviews are immutable',
    DETAIL = '{"error_code":"COMMUNITY_REVIEW_IMMUTABLE"}';
END;
$$;

REVOKE ALL ON FUNCTION private.reject_community_creation_review_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_community_creation_reviews_immutable
  ON public.community_creation_reviews;
CREATE TRIGGER trg_community_creation_reviews_immutable
BEFORE UPDATE OR DELETE ON public.community_creation_reviews
FOR EACH ROW EXECUTE FUNCTION private.reject_community_creation_review_mutation();

DROP TRIGGER IF EXISTS trg_community_address_duplicate_resolutions_immutable
  ON public.community_address_duplicate_resolutions;
CREATE TRIGGER trg_community_address_duplicate_resolutions_immutable
BEFORE UPDATE OR DELETE ON public.community_address_duplicate_resolutions
FOR EACH ROW EXECUTE FUNCTION private.reject_community_creation_review_mutation();

-- ---------------------------------------------------------------------------
-- Trusted reviewer and governance/evidence guards.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.require_service_role_reviewer(
  p_reviewer_actor text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor text := LOWER(BTRIM(COALESCE(p_reviewer_actor, '')));
  v_jwt_role text := COALESCE(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );
BEGIN
  IF v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Service role is required',
      DETAIL = '{"error_code":"SERVICE_ROLE_REQUIRED"}';
  END IF;

  IF CHAR_LENGTH(v_actor) NOT BETWEEN 3 AND 320
     OR v_actor !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Reviewer actor is invalid',
      DETAIL = '{"error_code":"REVIEWER_ACTOR_INVALID"}';
  END IF;

  RETURN v_actor;
END;
$$;

REVOKE ALL ON FUNCTION private.require_service_role_reviewer(text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.validate_opaque_evidence_references(
  p_evidence_refs jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_refs jsonb := COALESCE(p_evidence_refs, '{}'::jsonb);
BEGIN
  IF jsonb_typeof(v_refs) <> 'object'
     OR OCTET_LENGTH(v_refs::text) > 16384
     OR EXISTS (
       SELECT 1
       FROM jsonb_each(v_refs) AS item(key, value)
       WHERE item.key NOT IN (
         'official_register_reference', 'signed_mandate_reference',
         'community_resolution_reference', 'legal_basis_reference',
         'review_case_reference', 'duplicate_override_reference',
         'link_existing_reference'
       )
          OR jsonb_typeof(item.value) <> 'string'
          OR CHAR_LENGTH(item.value #>> '{}') NOT BETWEEN 3 AND 512
          OR (item.value #>> '{}') !~ '^[a-z][a-z0-9+.-]{1,31}:[^[:space:][:cntrl:]]+$'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Evidence references must be opaque references',
      DETAIL = '{"error_code":"EVIDENCE_REFERENCE_INVALID","pii_allowed":false}';
  END IF;

  RETURN v_refs;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_opaque_evidence_references(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.require_community_governance_evidence(
  p_governance_mode text,
  p_legal_form text,
  p_declared_unit_count integer,
  p_verification_method text,
  p_evidence_refs jsonb
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_refs jsonb := private.validate_opaque_evidence_references(p_evidence_refs);
BEGIN
  IF p_governance_mode IN ('REPRESENTATIVE_MANAGED', 'BOARD_MANAGED') THEN
    IF p_legal_form <> 'CONDOMINIUM' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Managed mandate legal form is unsupported',
        DETAIL = '{"error_code":"MANAGED_LEGAL_FORM_UNSUPPORTED"}';
    END IF;
    IF p_verification_method = 'OFFICIAL_REGISTER' THEN
      IF NULLIF(v_refs ->> 'official_register_reference', '') IS NULL THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001', MESSAGE = 'Official register evidence is required',
          DETAIL = '{"error_code":"OFFICIAL_REGISTER_EVIDENCE_REQUIRED"}';
      END IF;
      RETURN 'THT_OFFICIAL_REGISTER_VERIFIED';
    END IF;

    IF p_verification_method = 'SIGNED_MANDATE' THEN
      IF now() >= TIMESTAMPTZ '2026-11-01 00:00:00+01' THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001', MESSAGE = 'Transitional mandate evidence has expired',
          DETAIL = '{"error_code":"SIGNED_MANDATE_CUTOFF_EXPIRED","cutoff":"2026-11-01T00:00:00+01:00"}';
      END IF;
      IF NULLIF(v_refs ->> 'signed_mandate_reference', '') IS NULL THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001', MESSAGE = 'Signed mandate evidence is required',
          DETAIL = '{"error_code":"SIGNED_MANDATE_EVIDENCE_REQUIRED"}';
      END IF;
      RETURN 'THT_64A_TRANSITIONAL_MANDATE';
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Managed governance verification method is invalid',
      DETAIL = '{"error_code":"MANAGED_VERIFICATION_METHOD_INVALID"}';
  END IF;

  IF p_governance_mode = 'SELF_MANAGED' THEN
    IF p_verification_method <> 'SELF_MANAGED_RESOLUTION' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Self-managed resolution evidence is required',
        DETAIL = '{"error_code":"SELF_MANAGED_RESOLUTION_REQUIRED"}';
    END IF;
    IF NULLIF(v_refs ->> 'community_resolution_reference', '') IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Community resolution reference is required',
        DETAIL = '{"error_code":"COMMUNITY_RESOLUTION_EVIDENCE_REQUIRED"}';
    END IF;

    IF p_legal_form = 'CONDOMINIUM' THEN
      IF p_declared_unit_count > 6 THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001', MESSAGE = 'Self-managed condominium requires assisted legal review',
          DETAIL = '{"error_code":"SELF_MANAGED_UNIT_LIMIT_EXCEEDED","maximum_units":6}';
      END IF;
      RETURN 'THT_13_3_COMMUNITY_RESOLUTION';
    END IF;

    IF p_legal_form = 'UNDIVIDED_COMMON_OWNERSHIP' THEN
      IF NULLIF(v_refs ->> 'legal_basis_reference', '') IS NULL THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001', MESSAGE = 'Separate legal-basis evidence is required',
          DETAIL = '{"error_code":"UNDIVIDED_LEGAL_BASIS_REQUIRED"}';
      END IF;
      RETURN 'PTK_UNDIVIDED_COMMON_OWNERSHIP_AGREEMENT';
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Self-managed legal form requires assisted legal review',
      DETAIL = '{"error_code":"SELF_MANAGED_LEGAL_FORM_UNSUPPORTED"}';
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = 'P0001', MESSAGE = 'Governance mode is unsupported',
    DETAIL = '{"error_code":"GOVERNANCE_MODE_UNSUPPORTED"}';
END;
$$;

REVOKE ALL ON FUNCTION private.require_community_governance_evidence(text, text, integer, text, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_unresolved_community_address_candidate(
  p_request_id uuid,
  p_similarity_threshold real DEFAULT 0.85
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  WITH requested AS (
    SELECT ccr.id, ccr.address_id, a.canonical_key
    FROM public.community_creation_requests ccr
    JOIN public.addresses a ON a.id = ccr.address_id
    WHERE ccr.id = p_request_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM requested requested_address
    JOIN public.addresses candidate
      ON candidate.id <> requested_address.address_id
     AND candidate.valid_to IS NULL
     AND candidate.address_level = 'BUILDING'
     AND similarity(candidate.canonical_key, requested_address.canonical_key)
       >= p_similarity_threshold
    WHERE (
      EXISTS (
        SELECT 1
        FROM public.building_address_assignments baa
        JOIN public.workspace_buildings wb
          ON wb.physical_building_id = baa.physical_building_id
         AND wb.is_primary AND wb.valid_to IS NULL
        JOIN public.workspaces w
          ON w.id = wb.workspace_id AND w.status = 'ACTIVE'
        WHERE baa.address_id = candidate.id
          AND baa.assignment_role = 'PRIMARY'
          AND baa.valid_to IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.community_creation_requests other_request
        WHERE other_request.id <> requested_address.id
          AND other_request.address_id = candidate.id
          AND other_request.status IN ('PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED')
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.community_address_duplicate_resolutions resolution
      WHERE resolution.community_creation_request_id = requested_address.id
        AND resolution.candidate_address_id = candidate.id
        AND resolution.resolution = 'NOT_DUPLICATE'
    )
  );
$$;

REVOKE ALL ON FUNCTION private.has_unresolved_community_address_candidate(uuid, real)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_community_address_candidates(
  p_request_id uuid,
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  candidate_address_id uuid,
  formatted_address text,
  similarity_score real,
  candidate_kind text,
  candidate_workspace_id uuid,
  candidate_request_id uuid,
  candidate_request_status text,
  duplicate_resolution text,
  resolution_reason text,
  resolved_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  PERFORM private.require_service_role_reviewer('service-role@panellako.internal');
  IF p_request_id IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Address candidate query is invalid',
      DETAIL = '{"error_code":"ADDRESS_CANDIDATE_QUERY_INVALID"}';
  END IF;

  RETURN QUERY
  WITH requested AS (
    SELECT ccr.id, ccr.address_id, a.canonical_key
    FROM public.community_creation_requests ccr
    JOIN public.addresses a ON a.id = ccr.address_id
    WHERE ccr.id = p_request_id
  )
  SELECT
    candidate.id,
    candidate.formatted_address,
    similarity(candidate.canonical_key, requested.canonical_key)::real,
    CASE
      WHEN active_workspace.workspace_id IS NOT NULL THEN 'ACTIVE_WORKSPACE'
      WHEN open_request.request_id IS NOT NULL THEN 'OPEN_REQUEST'
      ELSE 'ADDRESS_ONLY'
    END,
    active_workspace.workspace_id,
    open_request.request_id,
    open_request.request_status,
    resolution.resolution,
    resolution.resolution_reason,
    resolution.created_at
  FROM requested
  JOIN public.addresses candidate
    ON candidate.id <> requested.address_id
   AND candidate.valid_to IS NULL
   AND candidate.address_level = 'BUILDING'
   AND similarity(candidate.canonical_key, requested.canonical_key) >= 0.20
  LEFT JOIN LATERAL (
    SELECT w.id AS workspace_id
    FROM public.building_address_assignments baa
    JOIN public.workspace_buildings wb
      ON wb.physical_building_id = baa.physical_building_id
     AND wb.is_primary AND wb.valid_to IS NULL
    JOIN public.workspaces w
      ON w.id = wb.workspace_id AND w.status = 'ACTIVE'
    WHERE baa.address_id = candidate.id
      AND baa.assignment_role = 'PRIMARY'
      AND baa.valid_to IS NULL
    ORDER BY w.id
    LIMIT 1
  ) active_workspace ON true
  LEFT JOIN LATERAL (
    SELECT ccr.id AS request_id, ccr.status AS request_status
    FROM public.community_creation_requests ccr
    WHERE ccr.id <> requested.id
      AND ccr.address_id = candidate.id
      AND ccr.status IN ('PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED')
    ORDER BY ccr.created_at, ccr.id
    LIMIT 1
  ) open_request ON true
  LEFT JOIN public.community_address_duplicate_resolutions resolution
    ON resolution.community_creation_request_id = requested.id
   AND resolution.candidate_address_id = candidate.id
  WHERE active_workspace.workspace_id IS NOT NULL OR open_request.request_id IS NOT NULL
  ORDER BY 3 DESC, candidate.formatted_address, candidate.id
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_community_address_candidates(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_address_candidates(uuid, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_community_address_candidate(
  p_request_id uuid,
  p_candidate_address_id uuid,
  p_resolution text,
  p_resolution_reason text,
  p_evidence_refs jsonb,
  p_reviewer_actor text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  resolution_id uuid,
  request_id uuid,
  candidate_address_id uuid,
  duplicate_resolution text,
  request_status text,
  linked_existing_workspace_id uuid,
  resolved_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor text := private.require_service_role_reviewer(p_reviewer_actor);
  v_resolution text := UPPER(BTRIM(COALESCE(p_resolution, '')));
  v_reason text := BTRIM(COALESCE(p_resolution_reason, ''));
  v_refs jsonb := private.validate_opaque_evidence_references(p_evidence_refs);
  v_request public.community_creation_requests%ROWTYPE;
  v_existing public.community_address_duplicate_resolutions%ROWTYPE;
  v_request_address_key text;
  v_candidate_address_key text;
  v_candidate_workspace_id uuid;
  v_reviewer_profile_id uuid;
  v_resolution_id uuid := gen_random_uuid();
  v_request_status text;
  v_resolved_at timestamptz := now();
BEGIN
  IF p_request_id IS NULL OR p_candidate_address_id IS NULL OR p_idempotency_key IS NULL
     OR v_resolution NOT IN ('NOT_DUPLICATE', 'LINK_EXISTING')
     OR CHAR_LENGTH(v_reason) NOT BETWEEN 3 AND 2000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Duplicate resolution input is invalid',
      DETAIL = '{"error_code":"DUPLICATE_RESOLUTION_INVALID"}';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('community-duplicate:' || v_actor || ':' || p_idempotency_key::text, 0)
  );
  SELECT resolution.* INTO v_existing
  FROM public.community_address_duplicate_resolutions resolution
  WHERE resolution.reviewer_actor = v_actor
    AND resolution.idempotency_key = p_idempotency_key;
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.community_creation_request_id <> p_request_id
       OR v_existing.candidate_address_id <> p_candidate_address_id
       OR v_existing.resolution <> v_resolution
       OR v_existing.resolution_reason <> v_reason
       OR v_existing.evidence_references <> v_refs THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Duplicate resolution idempotency key was reused',
        DETAIL = '{"error_code":"IDEMPOTENCY_KEY_REUSED"}';
    END IF;
    RETURN QUERY
    SELECT
      v_existing.id,
      ccr.id,
      v_existing.candidate_address_id,
      v_existing.resolution,
      ccr.status,
      ccr.linked_existing_workspace_id,
      v_existing.created_at
    FROM public.community_creation_requests ccr
    WHERE ccr.id = v_existing.community_creation_request_id;
    RETURN;
  END IF;

  SELECT ccr.* INTO v_request
  FROM public.community_creation_requests ccr
  WHERE ccr.id = p_request_id
  FOR UPDATE;
  IF v_request.id IS NULL
     OR v_request.status NOT IN ('PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED')
     OR v_request.activated_at IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Community request cannot resolve duplicates',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_NOT_REVIEWABLE"}';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles claimant
    WHERE claimant.id = v_request.claimant_profile_id
      AND LOWER(BTRIM(claimant.email)) = v_actor
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Reviewer cannot resolve their own request',
      DETAIL = '{"error_code":"REVIEWER_SELF_APPROVAL_FORBIDDEN"}';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.community_address_duplicate_resolutions resolution
    WHERE resolution.community_creation_request_id = v_request.id
      AND resolution.candidate_address_id = p_candidate_address_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Address candidate was already resolved',
      DETAIL = '{"error_code":"DUPLICATE_CANDIDATE_ALREADY_RESOLVED"}';
  END IF;

  SELECT a.canonical_key INTO v_request_address_key
  FROM public.addresses a WHERE a.id = v_request.address_id AND a.valid_to IS NULL;
  SELECT a.canonical_key INTO v_candidate_address_key
  FROM public.addresses a
  WHERE a.id = p_candidate_address_id
    AND a.id <> v_request.address_id
    AND a.address_level = 'BUILDING'
    AND a.valid_to IS NULL;
  IF v_request_address_key IS NULL OR v_candidate_address_key IS NULL
     OR similarity(v_request_address_key, v_candidate_address_key) < 0.85 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Address is not a high-similarity candidate',
      DETAIL = '{"error_code":"ADDRESS_CANDIDATE_INVALID","threshold":0.85}';
  END IF;

  SELECT w.id INTO v_candidate_workspace_id
  FROM public.building_address_assignments baa
  JOIN public.workspace_buildings wb
    ON wb.physical_building_id = baa.physical_building_id
   AND wb.is_primary AND wb.valid_to IS NULL
  JOIN public.workspaces w
    ON w.id = wb.workspace_id AND w.status = 'ACTIVE'
  WHERE baa.address_id = p_candidate_address_id
    AND baa.assignment_role = 'PRIMARY'
    AND baa.valid_to IS NULL
  ORDER BY w.id
  LIMIT 1;

  IF v_candidate_workspace_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.community_creation_requests other_request
    WHERE other_request.id <> v_request.id
      AND other_request.address_id = p_candidate_address_id
      AND other_request.status IN ('PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Address candidate no longer has a live subject',
      DETAIL = '{"error_code":"ADDRESS_CANDIDATE_STALE"}';
  END IF;

  IF v_resolution = 'NOT_DUPLICATE'
     AND NULLIF(v_refs ->> 'duplicate_override_reference', '') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Duplicate override evidence is required',
      DETAIL = '{"error_code":"DUPLICATE_OVERRIDE_EVIDENCE_REQUIRED"}';
  END IF;
  IF v_resolution = 'LINK_EXISTING' THEN
    IF v_candidate_workspace_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Only an active workspace can be linked',
        DETAIL = '{"error_code":"LINK_EXISTING_WORKSPACE_REQUIRED"}';
    END IF;
    IF NULLIF(v_refs ->> 'link_existing_reference', '') IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Existing-workspace link evidence is required',
        DETAIL = '{"error_code":"LINK_EXISTING_EVIDENCE_REQUIRED"}';
    END IF;
  END IF;

  SELECT p.id INTO v_reviewer_profile_id
  FROM public.profiles p
  WHERE LOWER(BTRIM(p.email)) = v_actor
  LIMIT 1;

  INSERT INTO public.community_address_duplicate_resolutions (
    id, community_creation_request_id, candidate_address_id,
    candidate_workspace_id, resolution, resolution_reason,
    evidence_references, reviewer_actor, reviewer_profile_id,
    idempotency_key, created_at
  ) VALUES (
    v_resolution_id, v_request.id, p_candidate_address_id,
    v_candidate_workspace_id, v_resolution, v_reason,
    v_refs, v_actor, v_reviewer_profile_id,
    p_idempotency_key, v_resolved_at
  );

  IF v_resolution = 'LINK_EXISTING' THEN
    UPDATE public.community_creation_requests
    SET status = 'REJECTED',
        linked_existing_workspace_id = v_candidate_workspace_id,
        activation_expires_at = NULL,
        review_reason = v_reason,
        reviewed_by_profile_id = v_reviewer_profile_id,
        reviewed_at = v_resolved_at,
        updated_at = v_resolved_at
    WHERE id = v_request.id;
    v_request_status := 'REJECTED';
  ELSE
    v_request_status := v_request.status;
  END IF;

  INSERT INTO public.authorization_audit_events (
    workspace_id, actor_profile_id, action_key, object_type, object_id,
    decision, reason_code, metadata
  ) VALUES (
    v_candidate_workspace_id,
    v_reviewer_profile_id,
    'COMMUNITY_ADDRESS_DUPLICATE_RESOLVED',
    'community_creation_request',
    v_request.id,
    'STATE_CHANGE',
    v_resolution,
    jsonb_build_object(
      'resolution_id', v_resolution_id,
      'candidate_address_id', p_candidate_address_id,
      'candidate_workspace_id', v_candidate_workspace_id
    )
  );

  RETURN QUERY SELECT
    v_resolution_id, v_request.id, p_candidate_address_id,
    v_resolution, v_request_status, v_candidate_workspace_id, v_resolved_at;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_community_address_candidate(uuid, uuid, text, text, jsonb, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_community_address_candidate(uuid, uuid, text, text, jsonb, text, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Service-role review queue and decision command.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.list_community_creation_requests(text, integer);
CREATE OR REPLACE FUNCTION public.list_community_creation_requests(
  p_status text DEFAULT 'PENDING_VERIFICATION',
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  request_id uuid,
  community_name text,
  formatted_address text,
  canonical_address_key text,
  address_verification_status text,
  legal_form text,
  governance_mode text,
  governance_legal_basis text,
  declared_unit_count integer,
  request_status text,
  claimant_profile_id uuid,
  claimant_display_name text,
  claimant_email text,
  created_at timestamptz,
  updated_at timestamptz,
  address_lease_expires_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid,
  reviewer_actor text,
  review_reason text,
  review_verification_method text,
  activation_expires_at timestamptz,
  activation_pending boolean,
  activated_workspace_id uuid,
  activated_at timestamptz,
  linked_existing_workspace_id uuid,
  fuzzy_candidate_count integer,
  unresolved_high_similarity_count integer,
  highest_similarity_score real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  PERFORM private.require_service_role_reviewer('service-role@panellako.internal');

  IF p_status IS NOT NULL AND p_status NOT IN (
    'DRAFT', 'PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED',
    'ACTIVATED', 'REJECTED', 'CANCELLED', 'EXPIRED'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Community request status is invalid',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_STATUS_INVALID"}';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Review queue limit is invalid',
      DETAIL = '{"error_code":"REVIEW_QUEUE_LIMIT_INVALID"}';
  END IF;

  RETURN QUERY
  SELECT
    ccr.id,
    ccr.community_name,
    a.formatted_address,
    a.canonical_key,
    a.verification_status,
    ccr.legal_form,
    ccr.governance_mode,
    ccr.governance_legal_basis,
    ccr.declared_unit_count,
    ccr.status,
    ccr.claimant_profile_id,
    p.display_name,
    p.email,
    ccr.created_at,
    ccr.updated_at,
    ccr.address_lease_expires_at,
    ccr.reviewed_at,
    ccr.reviewed_by_profile_id,
    review.reviewer_actor,
    ccr.review_reason,
    review.verification_method,
    ccr.activation_expires_at,
    ccr.status = 'APPROVED'
      AND ccr.activated_at IS NULL
      AND ccr.activation_expires_at > now(),
    ccr.activated_workspace_id,
    ccr.activated_at,
    ccr.linked_existing_workspace_id,
    COALESCE(fuzzy.fuzzy_candidate_count, 0),
    COALESCE(fuzzy.unresolved_high_similarity_count, 0),
    fuzzy.highest_similarity_score
  FROM public.community_creation_requests ccr
  JOIN public.addresses a ON a.id = ccr.address_id
  JOIN public.profiles p ON p.id = ccr.claimant_profile_id
  LEFT JOIN public.community_creation_reviews review ON review.id = ccr.last_review_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::integer AS fuzzy_candidate_count,
      COUNT(*) FILTER (
        WHERE candidate.score >= 0.85
          AND NOT EXISTS (
            SELECT 1
            FROM public.community_address_duplicate_resolutions resolution
            WHERE resolution.community_creation_request_id = ccr.id
              AND resolution.candidate_address_id = candidate.address_id
              AND resolution.resolution = 'NOT_DUPLICATE'
          )
      )::integer AS unresolved_high_similarity_count,
      MAX(candidate.score)::real AS highest_similarity_score
    FROM (
      SELECT
        candidate_address.id AS address_id,
        similarity(candidate_address.canonical_key, a.canonical_key)::real AS score
      FROM public.addresses candidate_address
      WHERE candidate_address.id <> ccr.address_id
        AND candidate_address.valid_to IS NULL
        AND candidate_address.address_level = 'BUILDING'
        AND similarity(candidate_address.canonical_key, a.canonical_key) >= 0.20
        AND (
          EXISTS (
            SELECT 1
            FROM public.building_address_assignments baa
            JOIN public.workspace_buildings wb
              ON wb.physical_building_id = baa.physical_building_id
             AND wb.is_primary AND wb.valid_to IS NULL
            JOIN public.workspaces w
              ON w.id = wb.workspace_id AND w.status = 'ACTIVE'
            WHERE baa.address_id = candidate_address.id
              AND baa.assignment_role = 'PRIMARY'
              AND baa.valid_to IS NULL
          )
          OR EXISTS (
            SELECT 1
            FROM public.community_creation_requests other_request
            WHERE other_request.id <> ccr.id
              AND other_request.address_id = candidate_address.id
              AND other_request.status IN ('PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED')
          )
        )
    ) candidate
  ) fuzzy ON true
  WHERE p_status IS NULL OR ccr.status = p_status
  ORDER BY ccr.created_at ASC, ccr.id ASC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_community_creation_requests(text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_creation_requests(text, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.review_community_creation_request(
  p_request_id uuid,
  p_decision text,
  p_review_reason text,
  p_verification_method text,
  p_evidence_refs jsonb,
  p_reviewer_actor text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  review_id uuid,
  request_id uuid,
  request_status text,
  activation_pending boolean,
  reviewed_at timestamptz,
  activation_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor text := private.require_service_role_reviewer(p_reviewer_actor);
  v_decision text := UPPER(BTRIM(COALESCE(p_decision, '')));
  v_reason text := BTRIM(COALESCE(p_review_reason, ''));
  v_method text := NULLIF(UPPER(BTRIM(COALESCE(p_verification_method, ''))), '');
  v_refs jsonb := private.validate_opaque_evidence_references(p_evidence_refs);
  v_request public.community_creation_requests%ROWTYPE;
  v_existing public.community_creation_reviews%ROWTYPE;
  v_review_id uuid := gen_random_uuid();
  v_reviewer_profile_id uuid;
  v_new_status text;
  v_legal_basis text;
  v_activation_expires_at timestamptz;
BEGIN
  IF p_request_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Review request and idempotency key are required',
      DETAIL = '{"error_code":"REVIEW_IDENTITY_REQUIRED"}';
  END IF;
  IF v_decision NOT IN ('APPROVE', 'NEEDS_EVIDENCE', 'REJECT') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Review decision is invalid',
      DETAIL = '{"error_code":"REVIEW_DECISION_INVALID"}';
  END IF;
  IF CHAR_LENGTH(v_reason) NOT BETWEEN 3 AND 2000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Review reason is required',
      DETAIL = '{"error_code":"REVIEW_REASON_REQUIRED"}';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('community-review:' || v_actor || ':' || p_idempotency_key::text, 0)
  );

  SELECT review.* INTO v_existing
  FROM public.community_creation_reviews review
  WHERE review.reviewer_actor = v_actor
    AND review.idempotency_key = p_idempotency_key;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.community_creation_request_id <> p_request_id
       OR v_existing.decision <> v_decision
       OR v_existing.review_reason <> v_reason
       OR v_existing.verification_method IS DISTINCT FROM v_method
       OR v_existing.evidence_references <> v_refs THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Review idempotency key was reused with different input',
        DETAIL = '{"error_code":"IDEMPOTENCY_KEY_REUSED"}';
    END IF;

    RETURN QUERY
    SELECT
      v_existing.id,
      ccr.id,
      ccr.status,
      ccr.status = 'APPROVED' AND ccr.activated_at IS NULL
        AND ccr.activation_expires_at > now(),
      v_existing.created_at,
      ccr.activation_expires_at
    FROM public.community_creation_requests ccr
    WHERE ccr.id = v_existing.community_creation_request_id;
    RETURN;
  END IF;

  SELECT ccr.* INTO v_request
  FROM public.community_creation_requests ccr
  WHERE ccr.id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Community creation request is unavailable',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_UNAVAILABLE"}';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.profiles claimant
    WHERE claimant.id = v_request.claimant_profile_id
      AND LOWER(BTRIM(claimant.email)) = v_actor
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Reviewer cannot decide their own request',
      DETAIL = '{"error_code":"REVIEWER_SELF_APPROVAL_FORBIDDEN"}';
  END IF;
  IF v_request.activated_at IS NOT NULL OR v_request.status = 'ACTIVATED' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Activated community request cannot be reviewed',
      DETAIL = '{"error_code":"COMMUNITY_ALREADY_ACTIVATED"}';
  END IF;
  IF v_request.status NOT IN ('PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Community request is not reviewable',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_NOT_REVIEWABLE"}';
  END IF;

  IF v_decision = 'APPROVE' THEN
    IF v_request.address_lease_expires_at <= now() THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Address lease has expired',
        DETAIL = '{"error_code":"ADDRESS_LEASE_EXPIRED"}';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.building_address_assignments baa
      JOIN public.workspace_buildings wb
        ON wb.physical_building_id = baa.physical_building_id
       AND wb.is_primary AND wb.valid_to IS NULL
      JOIN public.workspaces w
        ON w.id = wb.workspace_id AND w.status = 'ACTIVE'
      WHERE baa.address_id = v_request.address_id
        AND baa.assignment_role = 'PRIMARY'
        AND baa.valid_to IS NULL
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'An active community already uses this exact address',
      DETAIL = '{"error_code":"COMMUNITY_ALREADY_EXISTS","next_action":"SEARCH_AND_JOIN"}';
    END IF;
    IF private.has_unresolved_community_address_candidate(v_request.id, 0.85) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'High-similarity address candidate requires resolution',
        DETAIL = '{"error_code":"ADDRESS_DUPLICATE_REVIEW_REQUIRED","threshold":0.85}';
    END IF;

    v_legal_basis := private.require_community_governance_evidence(
      v_request.governance_mode,
      v_request.legal_form,
      v_request.declared_unit_count,
      v_method,
      v_refs
    );
    v_new_status := 'APPROVED';
    v_activation_expires_at := LEAST(
      v_request.address_lease_expires_at,
      now() + interval '72 hours'
    );
  ELSIF v_decision = 'NEEDS_EVIDENCE' THEN
    v_new_status := 'NEEDS_EVIDENCE';
  ELSE
    v_new_status := 'REJECTED';
  END IF;

  SELECT p.id INTO v_reviewer_profile_id
  FROM public.profiles p
  WHERE LOWER(BTRIM(p.email)) = v_actor
  LIMIT 1;

  INSERT INTO public.community_creation_reviews (
    id, community_creation_request_id, reviewer_actor, reviewer_profile_id,
    decision, review_reason, verification_method, evidence_references,
    idempotency_key
  ) VALUES (
    v_review_id, v_request.id, v_actor, v_reviewer_profile_id,
    v_decision, v_reason, v_method, v_refs, p_idempotency_key
  );

  UPDATE public.community_creation_requests
  SET status = v_new_status,
      governance_legal_basis = CASE
        WHEN v_decision = 'APPROVE' THEN v_legal_basis
        ELSE governance_legal_basis
      END,
      last_review_id = v_review_id,
      reviewed_by_profile_id = v_reviewer_profile_id,
      review_reason = v_reason,
      reviewed_at = now(),
      activation_expires_at = v_activation_expires_at,
      updated_at = now()
  WHERE id = v_request.id;

  INSERT INTO public.authorization_audit_events (
    workspace_id, actor_profile_id, action_key, object_type, object_id,
    decision, reason_code, metadata
  ) VALUES (
    NULL, v_reviewer_profile_id, 'COMMUNITY_CREATION_REVIEWED',
    'community_creation_request', v_request.id, 'STATE_CHANGE', v_new_status,
    jsonb_build_object(
      'review_id', v_review_id,
      'verification_method', v_method,
      'activation_pending', v_new_status = 'APPROVED'
    )
  );

  RETURN QUERY
  SELECT
    v_review_id,
    v_request.id,
    v_new_status,
    v_new_status = 'APPROVED',
    now(),
    v_activation_expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.review_community_creation_request(uuid, text, text, text, jsonb, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_community_creation_request(uuid, text, text, text, jsonb, text, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Subject-scoped request list for onboarding.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.list_my_community_creation_requests();
CREATE OR REPLACE FUNCTION public.list_my_community_creation_requests()
RETURNS TABLE (
  request_id uuid,
  request_status text,
  community_name text,
  formatted_address text,
  legal_form text,
  governance_mode text,
  governance_legal_basis text,
  declared_unit_count integer,
  address_lease_expires_at timestamptz,
  review_reason text,
  review_verification_method text,
  reviewed_at timestamptz,
  activation_expires_at timestamptz,
  activation_pending boolean,
  activated_workspace_id uuid,
  linked_existing_workspace_id uuid,
  activated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  RETURN QUERY
  SELECT
    ccr.id,
    ccr.status,
    ccr.community_name,
    a.formatted_address,
    ccr.legal_form,
    ccr.governance_mode,
    ccr.governance_legal_basis,
    ccr.declared_unit_count,
    ccr.address_lease_expires_at,
    ccr.review_reason,
    review.verification_method,
    ccr.reviewed_at,
    ccr.activation_expires_at,
    ccr.status = 'APPROVED'
      AND ccr.activated_at IS NULL
      AND ccr.activation_expires_at > now(),
    ccr.activated_workspace_id,
    ccr.linked_existing_workspace_id,
    ccr.activated_at,
    ccr.created_at,
    ccr.updated_at
  FROM public.community_creation_requests ccr
  JOIN public.addresses a ON a.id = ccr.address_id
  LEFT JOIN public.community_creation_reviews review ON review.id = ccr.last_review_id
  WHERE ccr.claimant_profile_id = v_actor
  ORDER BY ccr.created_at DESC, ccr.id DESC
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_community_creation_requests()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_community_creation_requests()
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Claimant AAL2 activation. The reserved UUID is used for workspace, physical
-- building and legacy building identity so existing /w/{uuid} routes remain
-- compatible. Every write is part of this single database transaction.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_approved_community_creation_request(
  p_request_id uuid,
  p_idempotency_key uuid
)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  workspace_id uuid,
  physical_building_id uuid,
  membership_id uuid,
  mandate_id uuid,
  role_assignment_id uuid,
  unit_count integer,
  activated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_request public.community_creation_requests%ROWTYPE;
  v_review public.community_creation_reviews%ROWTYPE;
  v_address public.addresses%ROWTYPE;
  v_party_id uuid;
  v_membership_id uuid := gen_random_uuid();
  v_mandate_id uuid := gen_random_uuid();
  v_role_assignment_id uuid := gen_random_uuid();
  v_role_key text;
  v_mandate_type text;
  v_mandate_valid_to timestamptz;
  v_legal_basis text;
  v_activated_at timestamptz := now();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  IF p_request_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Activation request and idempotency key are required',
      DETAIL = '{"error_code":"ACTIVATION_IDENTITY_REQUIRED"}';
  END IF;

  PERFORM private.require_recent_aal2(interval '15 minutes');
  v_existing := private.lock_idempotent_command(
    v_actor, 'activate_approved_community_creation_request', p_idempotency_key
  );
  IF v_existing IS NOT NULL AND v_existing <> p_request_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Activation idempotency key was reused',
      DETAIL = '{"error_code":"IDEMPOTENCY_KEY_REUSED"}';
  END IF;

  SELECT ccr.* INTO v_request
  FROM public.community_creation_requests ccr
  WHERE ccr.id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL OR v_request.claimant_profile_id <> v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Community creation request is unavailable',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_UNAVAILABLE"}';
  END IF;

  IF v_request.status = 'ACTIVATED' AND v_request.activated_at IS NOT NULL THEN
    PERFORM private.record_idempotent_command(
      v_actor, 'activate_approved_community_creation_request',
      p_idempotency_key, v_request.id
    );
    RETURN QUERY
    SELECT
      v_request.id,
      v_request.status,
      v_request.activated_workspace_id,
      v_request.activated_physical_building_id,
      v_request.activated_membership_id,
      v_request.activated_mandate_id,
      v_request.activated_role_assignment_id,
      v_request.declared_unit_count,
      v_request.activated_at;
    RETURN;
  END IF;

  IF v_request.status <> 'APPROVED'
     OR v_request.last_review_id IS NULL
     OR v_request.activation_expires_at IS NULL
     OR v_request.activation_expires_at <= now()
     OR v_request.address_lease_expires_at <= now() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Community approval is unavailable or expired',
      DETAIL = '{"error_code":"COMMUNITY_APPROVAL_UNAVAILABLE"}';
  END IF;

  SELECT review.* INTO v_review
  FROM public.community_creation_reviews review
  WHERE review.id = v_request.last_review_id
    AND review.community_creation_request_id = v_request.id
    AND review.decision = 'APPROVE';
  IF v_review.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Approved review provenance is missing',
      DETAIL = '{"error_code":"APPROVED_REVIEW_PROVENANCE_MISSING"}';
  END IF;

  v_legal_basis := private.require_community_governance_evidence(
    v_request.governance_mode,
    v_request.legal_form,
    v_request.declared_unit_count,
    v_review.verification_method,
    v_review.evidence_references
  );
  IF v_request.governance_legal_basis IS DISTINCT FROM v_legal_basis THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Governance legal basis changed after review',
      DETAIL = '{"error_code":"GOVERNANCE_REVIEW_STALE"}';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('address-activation:' || v_request.address_id::text, 0)
  );
  SELECT a.* INTO v_address
  FROM public.addresses a
  WHERE a.id = v_request.address_id
    AND a.valid_to IS NULL
  FOR UPDATE;
  IF v_address.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Request address is unavailable',
      DETAIL = '{"error_code":"REQUEST_ADDRESS_UNAVAILABLE"}';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.building_address_assignments baa
    JOIN public.workspace_buildings wb
      ON wb.physical_building_id = baa.physical_building_id
     AND wb.is_primary AND wb.valid_to IS NULL
    JOIN public.workspaces w
      ON w.id = wb.workspace_id AND w.status = 'ACTIVE'
    WHERE baa.address_id = v_request.address_id
      AND baa.assignment_role = 'PRIMARY'
      AND baa.valid_to IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'An active community already uses this exact address',
      DETAIL = '{"error_code":"COMMUNITY_ALREADY_EXISTS","next_action":"SEARCH_AND_JOIN"}';
  END IF;

  IF private.has_unresolved_community_address_candidate(v_request.id, 0.85) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'High-similarity address candidate requires resolution',
      DETAIL = '{"error_code":"ADDRESS_DUPLICATE_REVIEW_REQUIRED","threshold":0.85}';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = v_request.reserved_workspace_id
  ) OR EXISTS (
    SELECT 1 FROM public.buildings b WHERE b.id = v_request.reserved_workspace_id
  ) OR EXISTS (
    SELECT 1 FROM public.physical_buildings pb WHERE pb.id = v_request.reserved_workspace_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Reserved community identity is already occupied',
      DETAIL = '{"error_code":"RESERVED_WORKSPACE_ID_COLLISION"}';
  END IF;

  SELECT pal.person_id INTO v_party_id
  FROM public.person_account_links pal
  WHERE pal.profile_id = v_actor
    AND pal.status = 'ACTIVE'
    AND pal.valid_to IS NULL
  LIMIT 1;
  IF v_party_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Verified claimant party is required',
      DETAIL = '{"error_code":"CLAIMANT_PARTY_REQUIRED"}';
  END IF;

  IF v_request.governance_mode = 'REPRESENTATIVE_MANAGED' THEN
    v_role_key := 'COMMON_REPRESENTATIVE_ADMIN';
    v_mandate_type := 'COMMON_REPRESENTATIVE';
  ELSIF v_request.governance_mode = 'BOARD_MANAGED' THEN
    v_role_key := 'BOARD_ADMIN';
    v_mandate_type := 'MANAGING_BOARD';
  ELSE
    v_role_key := 'SELF_MANAGED_ADMIN';
    v_mandate_type := 'SELF_MANAGED_COORDINATION';
  END IF;

  IF v_review.verification_method = 'SIGNED_MANDATE' THEN
    v_mandate_valid_to := TIMESTAMPTZ '2026-11-01 00:00:00+01';
  END IF;

  INSERT INTO public.buildings (id, name, address, created_at)
  VALUES (
    v_request.reserved_workspace_id,
    v_request.community_name,
    v_address.formatted_address,
    v_activated_at
  );

  INSERT INTO public.physical_buildings (
    id, canonical_name, status, address_verification_status,
    latitude, longitude, created_at, updated_at
  ) VALUES (
    v_request.reserved_workspace_id,
    v_request.community_name,
    'ACTIVE',
    CASE WHEN v_review.verification_method = 'OFFICIAL_REGISTER' THEN 'VERIFIED' ELSE 'SOURCE_MATCHED' END,
    v_address.latitude,
    v_address.longitude,
    v_activated_at,
    v_activated_at
  );

  INSERT INTO public.workspaces (
    id, name, legal_form, governance_mode, governance_legal_basis,
    status, created_by_profile_id, created_at, updated_at
  ) VALUES (
    v_request.reserved_workspace_id,
    v_request.community_name,
    v_request.legal_form,
    v_request.governance_mode,
    v_legal_basis,
    'ACTIVE',
    v_actor,
    v_activated_at,
    v_activated_at
  );

  INSERT INTO public.workspace_buildings (
    workspace_id, physical_building_id, is_primary, valid_from, created_at
  ) VALUES (
    v_request.reserved_workspace_id,
    v_request.reserved_workspace_id,
    true,
    v_activated_at,
    v_activated_at
  );

  INSERT INTO public.building_address_assignments (
    physical_building_id, address_id, assignment_role, valid_from,
    is_verified, source, created_by_profile_id, created_at
  ) VALUES (
    v_request.reserved_workspace_id,
    v_request.address_id,
    'PRIMARY',
    v_activated_at,
    true,
    'PLATFORM_REVIEW',
    v_review.reviewer_profile_id,
    v_activated_at
  );

  UPDATE public.addresses
  SET verification_status = CASE
        WHEN v_review.verification_method = 'OFFICIAL_REGISTER' THEN 'VERIFIED'
        ELSE 'SOURCE_MATCHED'
      END,
      updated_at = v_activated_at
  WHERE id = v_request.address_id;

  INSERT INTO public.units (
    id, building_id, unit_label, workspace_id, physical_building_id,
    designation, normalized_designation, unit_category, status,
    created_by_profile_id, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    v_request.reserved_workspace_id,
    series.ordinal::text,
    v_request.reserved_workspace_id,
    v_request.reserved_workspace_id,
    series.ordinal::text,
    private.normalize_unit_designation(series.ordinal::text),
    'APARTMENT',
    'ACTIVE',
    v_actor,
    v_activated_at,
    v_activated_at
  FROM generate_series(1, v_request.declared_unit_count) AS series(ordinal);

  INSERT INTO public.workspace_memberships (
    id, workspace_id, profile_id, status, source, created_by_profile_id,
    created_at, updated_at
  ) VALUES (
    v_membership_id,
    v_request.reserved_workspace_id,
    v_actor,
    'ACTIVE',
    'BOOTSTRAP',
    v_actor,
    v_activated_at,
    v_activated_at
  );

  INSERT INTO public.membership_periods (
    workspace_id, membership_id, started_at, start_reason,
    created_by_profile_id, created_at
  ) VALUES (
    v_request.reserved_workspace_id,
    v_membership_id,
    v_activated_at,
    'COMMUNITY_ACTIVATION',
    v_actor,
    v_activated_at
  );

  INSERT INTO public.management_mandates (
    id, workspace_id, mandate_party_id, mandate_type, status,
    verification_status, evidence_reference, appointment_reference,
    valid_from, valid_to, created_by_profile_id, created_at, updated_at
  ) VALUES (
    v_mandate_id,
    v_request.reserved_workspace_id,
    v_party_id,
    v_mandate_type,
    'ACTIVE',
    'VERIFIED',
    jsonb_build_object(
      'review_id', v_review.id,
      'evidence_references', v_review.evidence_references
    )::text,
    v_review.verification_method,
    v_activated_at,
    v_mandate_valid_to,
    v_review.reviewer_profile_id,
    v_activated_at,
    v_activated_at
  );

  INSERT INTO public.role_assignments (
    id, workspace_id, membership_id, role_key, source_mandate_id,
    status, valid_from, valid_to, granted_by_profile_id, reason,
    created_at, updated_at
  ) VALUES (
    v_role_assignment_id,
    v_request.reserved_workspace_id,
    v_membership_id,
    v_role_key,
    v_mandate_id,
    'ACTIVE',
    v_activated_at,
    v_mandate_valid_to,
    v_review.reviewer_profile_id,
    'PLATFORM_REVIEWED_COMMUNITY_ACTIVATION',
    v_activated_at,
    v_activated_at
  );

  -- The legacy schema has no SELF_MANAGED_ADMIN role. Do not mislabel a
  -- community coordinator as a common representative merely for compatibility.
  -- Managed and board-admin activations can be projected truthfully.
  IF v_role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN') THEN
    PERFORM private.project_legacy_workspace_role(
      v_request.reserved_workspace_id, v_actor, v_role_key, true
    );
  END IF;

  UPDATE public.community_creation_requests
  SET status = 'ACTIVATED',
      activated_workspace_id = v_request.reserved_workspace_id,
      activated_physical_building_id = v_request.reserved_workspace_id,
      activated_membership_id = v_membership_id,
      activated_mandate_id = v_mandate_id,
      activated_role_assignment_id = v_role_assignment_id,
      activated_at = v_activated_at,
      updated_at = v_activated_at
  WHERE id = v_request.id;

  INSERT INTO public.authorization_audit_events (
    workspace_id, actor_profile_id, actor_party_id, action_key,
    object_type, object_id, decision, reason_code, source_mandate_id,
    metadata
  ) VALUES (
    v_request.reserved_workspace_id,
    v_actor,
    v_party_id,
    'COMMUNITY_CREATION_ACTIVATED',
    'workspace',
    v_request.reserved_workspace_id,
    'STATE_CHANGE',
    v_request.governance_mode,
    v_mandate_id,
    jsonb_build_object(
      'community_creation_request_id', v_request.id,
      'physical_building_id', v_request.reserved_workspace_id,
      'membership_id', v_membership_id,
      'role_assignment_id', v_role_assignment_id,
      'declared_unit_count', v_request.declared_unit_count,
      'verification_method', v_review.verification_method
    )
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'activate_approved_community_creation_request',
    p_idempotency_key, v_request.id
  );

  RETURN QUERY
  SELECT
    v_request.id,
    'ACTIVATED'::text,
    v_request.reserved_workspace_id,
    v_request.reserved_workspace_id,
    v_membership_id,
    v_mandate_id,
    v_role_assignment_id,
    v_request.declared_unit_count,
    v_activated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_approved_community_creation_request(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_approved_community_creation_request(uuid, uuid)
  TO authenticated;

COMMIT;
