-- PanelLako v0.10.1 - email-bound staff invitation closure.
--
-- This migration deliberately keeps workspace membership neutral. Accepting a
-- staff invitation never asserts ownership, occupancy or a unit relationship;
-- it creates only the minimum workspace access period and the explicitly
-- reviewed limited role/delegation.

BEGIN;

CREATE TABLE IF NOT EXISTS public.workspace_staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invited_email_normalized text NOT NULL,
  role_key text NOT NULL REFERENCES public.role_templates(role_key) ON DELETE RESTRICT,
  capability_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz NOT NULL,
  assignment_valid_to timestamptz,
  accepted_at timestamptz,
  accepted_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  grantor_membership_id uuid NOT NULL,
  source_mandate_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  request_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_staff_invitations_grantor_fk
    FOREIGN KEY (workspace_id, grantor_membership_id)
    REFERENCES public.workspace_memberships(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT workspace_staff_invitations_mandate_fk
    FOREIGN KEY (workspace_id, source_mandate_id)
    REFERENCES public.management_mandates(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT workspace_staff_invitations_workspace_id_id_uq UNIQUE (workspace_id, id),
  CONSTRAINT workspace_staff_invitations_role_check CHECK (
    role_key IN ('DELEGATE_OPERATIONS', 'COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN')
  ),
  CONSTRAINT workspace_staff_invitations_capability_shape_check CHECK (
    role_key = 'DELEGATE_OPERATIONS' OR CARDINALITY(capability_keys) = 0
  ),
  CONSTRAINT workspace_staff_invitations_status_check CHECK (
    status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')
  ),
  CONSTRAINT workspace_staff_invitations_email_check CHECK (
    invited_email_normalized = LOWER(BTRIM(invited_email_normalized))
    AND CHAR_LENGTH(invited_email_normalized) BETWEEN 3 AND 254
    AND invited_email_normalized ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  CONSTRAINT workspace_staff_invitations_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT workspace_staff_invitations_assignment_validity_check CHECK (
    assignment_valid_to IS NULL OR assignment_valid_to > created_at
  ),
  CONSTRAINT workspace_staff_invitations_actor_idempotency_uq
    UNIQUE (created_by_profile_id, idempotency_key),
  CONSTRAINT workspace_staff_invitations_token_hash_uq UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS workspace_staff_invitations_workspace_status_idx
  ON public.workspace_staff_invitations (workspace_id, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS workspace_staff_invitations_email_status_idx
  ON public.workspace_staff_invitations (invited_email_normalized, status, expires_at DESC);

ALTER TABLE public.membership_periods
  ADD COLUMN IF NOT EXISTS source_staff_invitation_id uuid;

-- Resident invitations also need immutable authorization provenance. Existing
-- legacy rows stay nullable and therefore fail closed at acceptance until an
-- administrator issues a fresh invitation through the command below.
ALTER TABLE public.membership_invitations
  ADD COLUMN IF NOT EXISTS grantor_membership_id uuid,
  ADD COLUMN IF NOT EXISTS source_mandate_id uuid,
  ADD COLUMN IF NOT EXISTS source_delegation_id uuid,
  ADD COLUMN IF NOT EXISTS issued_authority_role_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'membership_periods_source_staff_invitation_fk'
      AND conrelid = 'public.membership_periods'::regclass
  ) THEN
    ALTER TABLE public.membership_periods
      ADD CONSTRAINT membership_periods_source_staff_invitation_fk
      FOREIGN KEY (workspace_id, source_staff_invitation_id)
      REFERENCES public.workspace_staff_invitations(workspace_id, id) ON DELETE RESTRICT;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'membership_invitations_workspace_id_id_uq'
      AND conrelid = 'public.membership_invitations'::regclass
  ) THEN
    ALTER TABLE public.membership_invitations
      ADD CONSTRAINT membership_invitations_workspace_id_id_uq UNIQUE (workspace_id, id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'membership_invitations_grantor_fk'
      AND conrelid = 'public.membership_invitations'::regclass
  ) THEN
    ALTER TABLE public.membership_invitations
      ADD CONSTRAINT membership_invitations_grantor_fk
      FOREIGN KEY (workspace_id, grantor_membership_id)
      REFERENCES public.workspace_memberships(workspace_id, id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'membership_invitations_source_mandate_fk'
      AND conrelid = 'public.membership_invitations'::regclass
  ) THEN
    ALTER TABLE public.membership_invitations
      ADD CONSTRAINT membership_invitations_source_mandate_fk
      FOREIGN KEY (workspace_id, source_mandate_id)
      REFERENCES public.management_mandates(workspace_id, id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'membership_invitations_source_delegation_fk'
      AND conrelid = 'public.membership_invitations'::regclass
  ) THEN
    ALTER TABLE public.membership_invitations
      ADD CONSTRAINT membership_invitations_source_delegation_fk
      FOREIGN KEY (workspace_id, source_delegation_id)
      REFERENCES public.delegations(workspace_id, id) ON DELETE RESTRICT;
  END IF;
END;
$$;

ALTER TABLE public.workspace_staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_staff_invitations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_staff_invitations_scoped_select
  ON public.workspace_staff_invitations;
CREATE POLICY workspace_staff_invitations_scoped_select
  ON public.workspace_staff_invitations
  FOR SELECT TO authenticated
  USING (
    created_by_profile_id = auth.uid()
    OR invited_email_normalized = LOWER(BTRIM(COALESCE(auth.jwt() ->> 'email', '')))
    OR private.has_workspace_capability(auth.uid(), workspace_id, 'ROLE_GRANT_LIMITED')
  );

-- There is intentionally no authenticated INSERT, UPDATE or DELETE policy.
-- All state transitions go through the audited SECURITY DEFINER commands below.
REVOKE ALL ON TABLE public.workspace_staff_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.workspace_staff_invitations TO authenticated;
GRANT SELECT ON TABLE public.workspace_staff_invitations TO service_role;

CREATE OR REPLACE FUNCTION private.reject_membership_invitation_provenance_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.invited_email_normalized IS DISTINCT FROM OLD.invited_email_normalized
     OR NEW.invited_party_id IS DISTINCT FROM OLD.invited_party_id
     OR NEW.unit_id IS DISTINCT FROM OLD.unit_id
     OR NEW.relationship_type IS DISTINCT FROM OLD.relationship_type
     OR NEW.token_hash IS DISTINCT FROM OLD.token_hash
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_by_profile_id IS DISTINCT FROM OLD.created_by_profile_id
     OR NEW.grantor_membership_id IS DISTINCT FROM OLD.grantor_membership_id
     OR NEW.source_mandate_id IS DISTINCT FROM OLD.source_mandate_id
     OR NEW.source_delegation_id IS DISTINCT FROM OLD.source_delegation_id
     OR NEW.issued_authority_role_key IS DISTINCT FROM OLD.issued_authority_role_key
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Membership invitation provenance is immutable',
      DETAIL = '{"error_code":"MEMBERSHIP_INVITATION_PROVENANCE_IMMUTABLE"}';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.reject_membership_invitation_provenance_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_membership_invitations_provenance_immutable
  ON public.membership_invitations;
CREATE TRIGGER trg_membership_invitations_provenance_immutable
BEFORE UPDATE ON public.membership_invitations
FOR EACH ROW EXECUTE FUNCTION private.reject_membership_invitation_provenance_mutation();

-- Finance is owner-specific data. A CLAIMED/PENDING ownership relation may
-- still support common and unit onboarding, but cannot unlock a unit ledger.
CREATE OR REPLACE FUNCTION private.can_read_verified_unit_finance(
  p_workspace_id uuid,
  p_unit_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT auth.uid() IS NOT NULL
    AND private.has_active_workspace_membership(auth.uid(), p_workspace_id)
    AND EXISTS (
      SELECT 1
      FROM public.person_account_links pal
      JOIN public.unit_ownerships uo
        ON uo.party_id = pal.person_id
       AND uo.workspace_id = p_workspace_id
       AND uo.unit_id = p_unit_id
       AND uo.status = 'VERIFIED'
       AND uo.valid_from <= now()
       AND uo.valid_to IS NULL
      WHERE pal.profile_id = auth.uid()
        AND pal.status = 'ACTIVE'
        AND pal.valid_from <= now()
        AND pal.valid_to IS NULL
    );
$$;

REVOKE ALL ON FUNCTION private.can_read_verified_unit_finance(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_read_verified_unit_finance(uuid, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION private.relationship_labels(
  p_profile_id uuid,
  p_workspace_id uuid
)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  WITH my_people AS (
    SELECT pal.person_id
    FROM public.person_account_links pal
    WHERE pal.profile_id = p_profile_id
      AND pal.status = 'ACTIVE'
      AND pal.valid_to IS NULL
  ), labels(label) AS (
    SELECT 'OWNER'
    FROM public.unit_ownerships uo
    JOIN my_people mp ON mp.person_id = uo.party_id
    WHERE uo.workspace_id = p_workspace_id
      AND uo.status = 'VERIFIED'
      AND uo.valid_from <= now()
      AND uo.valid_to IS NULL
    UNION
    SELECT uoc.occupancy_type
    FROM public.unit_occupancies uoc
    JOIN my_people mp ON mp.person_id = uoc.person_id
    WHERE uoc.workspace_id = p_workspace_id
      AND uoc.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
      AND uoc.valid_from <= now()
      AND uoc.valid_to IS NULL
    UNION
    SELECT ulr.right_type
    FROM public.unit_legal_rights ulr
    JOIN my_people mp ON mp.person_id = ulr.party_id
    WHERE ulr.workspace_id = p_workspace_id
      AND ulr.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
      AND ulr.valid_from <= now()
      AND ulr.valid_to IS NULL
  )
  SELECT COALESCE(ARRAY_AGG(DISTINCT label ORDER BY label), ARRAY[]::text[])
  FROM labels;
$$;

REVOKE ALL ON FUNCTION private.relationship_labels(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.relationship_labels(uuid, uuid)
  TO authenticated;

DROP POLICY IF EXISTS finance_entries_manager_select ON public.finance_entries;
CREATE POLICY finance_entries_manager_select ON public.finance_entries
FOR SELECT TO authenticated
USING (
  private.has_workspace_capability(auth.uid(), workspace_id, 'FINANCE_READ')
  OR (
    unit_id IS NOT NULL
    AND private.has_workspace_capability(auth.uid(), workspace_id, 'FINANCE_UNIT_READ')
    AND private.can_read_verified_unit_finance(workspace_id, unit_id)
  )
);

CREATE OR REPLACE FUNCTION private.normalize_staff_invitation_capabilities(
  p_actor_profile_id uuid,
  p_workspace_id uuid,
  p_role_key text,
  p_capability_keys text[]
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_internal_capabilities text[] := ARRAY[]::text[];
  v_invalid_count integer := 0;
BEGIN
  IF p_role_key NOT IN ('DELEGATE_OPERATIONS', 'COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Administrative roles cannot be issued by staff invitation',
      DETAIL = '{"error_code":"ADMIN_ROLE_STAFF_INVITATION_FORBIDDEN"}';
  END IF;

  IF p_role_key <> 'DELEGATE_OPERATIONS' THEN
    IF p_capability_keys IS NOT NULL AND CARDINALITY(p_capability_keys) > 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Custom capabilities require an operations delegate role',
        DETAIL = '{"error_code":"CUSTOM_CAPABILITIES_ROLE_INVALID"}';
    END IF;

    -- A fixed role bundle may be offered only when the inviter already owns
    -- every capability in that bundle. This prevents template-based privilege
    -- amplification even if role templates change later.
    IF EXISTS (
      SELECT 1
      FROM public.role_capabilities rc
      WHERE rc.role_key = p_role_key
        AND NOT private.has_workspace_capability(
          p_actor_profile_id,
          p_workspace_id,
          rc.capability_key
        )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501', MESSAGE = 'Role bundle exceeds inviter capabilities',
        DETAIL = '{"error_code":"STAFF_ROLE_CAPABILITY_AMPLIFICATION_FORBIDDEN"}';
    END IF;

    RETURN ARRAY[]::text[];
  END IF;

  IF p_capability_keys IS NULL OR CARDINALITY(p_capability_keys) = 0 THEN
    v_internal_capabilities := ARRAY[
      'WORKSPACE_READ', 'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED',
      'UNIT_READ_ALL', 'MEMBER_DIRECTORY_READ', 'TICKET_MANAGE',
      'DOCUMENT_MANAGE', 'COMMUNICATION_MANAGE', 'REMINDER_MANAGE', 'METER_MANAGE'
    ]::text[];
  ELSE
    IF CARDINALITY(p_capability_keys) > 32 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Too many delegated capabilities',
        DETAIL = '{"error_code":"STAFF_CAPABILITY_LIST_INVALID"}';
    END IF;

    SELECT COALESCE(
      ARRAY_AGG(
        DISTINCT COALESCE(ckm.internal_key, requested.capability_key)
        ORDER BY COALESCE(ckm.internal_key, requested.capability_key)
      ),
      ARRAY[]::text[]
    )
    INTO v_internal_capabilities
    FROM UNNEST(p_capability_keys) AS requested(capability_key)
    LEFT JOIN public.capability_key_map ckm
      ON ckm.canonical_key = requested.capability_key
      OR ckm.internal_key = requested.capability_key;
  END IF;

  SELECT COUNT(*)
  INTO v_invalid_count
  FROM UNNEST(v_internal_capabilities) AS requested(internal_key)
  WHERE requested.internal_key IS NULL
     OR requested.internal_key NOT IN (
       'WORKSPACE_READ', 'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED',
       'UNIT_READ_ALL', 'MEMBER_DIRECTORY_READ', 'MEMBERSHIP_INVITE',
       'MEMBERSHIP_REVIEW', 'TICKET_MANAGE', 'DOCUMENT_MANAGE',
       'COMMUNICATION_MANAGE', 'REMINDER_MANAGE', 'METER_MANAGE'
     )
     OR NOT EXISTS (
       SELECT 1
       FROM public.role_capabilities rc
       WHERE rc.role_key = 'DELEGATE_OPERATIONS'
         AND rc.capability_key = requested.internal_key
     )
     OR NOT private.has_workspace_capability(
       p_actor_profile_id,
       p_workspace_id,
       requested.internal_key
     );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Delegated capabilities exceed the inviter boundary',
      DETAIL = '{"error_code":"STAFF_ROLE_CAPABILITY_AMPLIFICATION_FORBIDDEN"}';
  END IF;

  RETURN v_internal_capabilities;
END;
$$;

REVOKE ALL ON FUNCTION private.normalize_staff_invitation_capabilities(uuid, uuid, text, text[])
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.issue_membership_invitation(
  p_workspace_id uuid,
  p_email text,
  p_unit_id uuid,
  p_relationship_type text,
  p_expires_at timestamptz,
  p_idempotency_key uuid
)
RETURNS TABLE (invitation_id uuid, invitation_token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_email text := LOWER(BTRIM(COALESCE(auth.jwt() ->> 'email', '')));
  v_existing uuid;
  v_invitation_id uuid := gen_random_uuid();
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_email text := LOWER(BTRIM(COALESCE(p_email, '')));
  v_expiry timestamptz := COALESCE(p_expires_at, now() + interval '7 days');
  v_grantor_membership_id uuid;
  v_source_mandate_id uuid;
  v_source_delegation_id uuid;
  v_authority_role_key text;
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'MEMBERSHIP_INVITE');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  v_existing := private.lock_idempotent_command(
    v_actor,
    'issue_membership_invitation',
    p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    RETURN QUERY
    SELECT mi.id, NULL::text, mi.expires_at
    FROM public.membership_invitations mi
    WHERE mi.id = v_existing
      AND mi.created_by_profile_id = v_actor;
    RETURN;
  END IF;

  IF CHAR_LENGTH(v_email) NOT BETWEEN 3 AND 254
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     OR p_relationship_type NOT IN ('OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT')
     OR v_expiry <= now()
     OR v_expiry > now() + interval '90 days'
     OR NOT EXISTS (
       SELECT 1
       FROM public.units u
       WHERE u.id = p_unit_id
         AND u.workspace_id = p_workspace_id
         AND u.status = 'ACTIVE'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Invitation fields are invalid',
      DETAIL = '{"error_code":"MEMBERSHIP_INVITATION_INVALID"}';
  END IF;

  IF v_email = v_actor_email
     AND p_relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'An administrator cannot invite their own email as an owner',
      DETAIL = '{"error_code":"OWNER_SELF_INVITATION_FORBIDDEN"}';
  END IF;

  -- Capture the exact current authority chain. Agency membership by itself is
  -- never considered: the chain must end in a VERIFIED workspace mandate.
  SELECT
    wm.id,
    COALESCE(ra.source_mandate_id, d.source_mandate_id),
    ra.source_delegation_id,
    ra.role_key
  INTO
    v_grantor_membership_id,
    v_source_mandate_id,
    v_source_delegation_id,
    v_authority_role_key
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
  LEFT JOIN public.delegations d
    ON d.workspace_id = ra.workspace_id
   AND d.id = ra.source_delegation_id
   AND d.beneficiary_membership_id = wm.id
   AND d.status = 'ACTIVE'
   AND d.valid_from <= now()
   AND (d.valid_to IS NULL OR d.valid_to > now())
   AND 'MEMBERSHIP_INVITE' = ANY(d.capability_keys)
  JOIN public.management_mandates mm
    ON mm.workspace_id = ra.workspace_id
   AND mm.id = COALESCE(ra.source_mandate_id, d.source_mandate_id)
   AND mm.status = 'ACTIVE'
   AND mm.verification_status = 'VERIFIED'
   AND mm.valid_from <= now()
   AND (mm.valid_to IS NULL OR mm.valid_to > now())
  WHERE wm.workspace_id = p_workspace_id
    AND wm.profile_id = v_actor
    AND wm.status = 'ACTIVE'
    AND (
      (
        ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
        AND ra.source_mandate_id IS NOT NULL
        AND ra.source_delegation_id IS NULL
      )
      OR (
        ra.role_key = 'DELEGATE_OPERATIONS'
        AND ra.source_mandate_id IS NULL
        AND d.id IS NOT NULL
      )
    )
  ORDER BY
    CASE WHEN ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN') THEN 0 ELSE 1 END,
    ra.valid_from DESC
  LIMIT 1;

  IF v_grantor_membership_id IS NULL OR v_source_mandate_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'A verified invitation authority chain is required',
      DETAIL = '{"error_code":"MEMBERSHIP_INVITER_AUTHORITY_REQUIRED"}';
  END IF;

  INSERT INTO public.membership_invitations (
    id, workspace_id, invited_email_normalized, unit_id, relationship_type,
    token_hash, status, expires_at, created_by_profile_id, idempotency_key,
    grantor_membership_id, source_mandate_id, source_delegation_id,
    issued_authority_role_key
  ) VALUES (
    v_invitation_id, p_workspace_id, v_email, p_unit_id, p_relationship_type,
    encode(digest(v_token, 'sha256'), 'hex'), 'PENDING', v_expiry,
    v_actor, p_idempotency_key, v_grantor_membership_id,
    v_source_mandate_id, v_source_delegation_id, v_authority_role_key
  );

  PERFORM private.record_idempotent_command(
    v_actor,
    'issue_membership_invitation',
    p_idempotency_key,
    v_invitation_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id,
    'MEMBERSHIP_INVITATION_ISSUED',
    'membership_invitation',
    v_invitation_id,
    'STATE_CHANGE',
    NULL,
    jsonb_build_object(
      'unit_id', p_unit_id,
      'relationship_type', p_relationship_type,
      'grantor_membership_id', v_grantor_membership_id,
      'source_mandate_id', v_source_mandate_id,
      'source_delegation_id', v_source_delegation_id,
      'authority_role_key', v_authority_role_key
    )
  );

  RETURN QUERY SELECT v_invitation_id, v_token, v_expiry;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_membership_invitation(uuid, text, uuid, text, timestamptz, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_membership_invitation(uuid, text, uuid, text, timestamptz, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_workspace_staff_invitation(
  p_workspace_id uuid,
  p_email text,
  p_role_key text,
  p_capability_keys text[],
  p_expires_at timestamptz,
  p_assignment_valid_to timestamptz,
  p_idempotency_key uuid
)
RETURNS TABLE (
  invitation_id uuid,
  invitation_token text,
  invitation_status text,
  expires_at timestamptz,
  role_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_existing_row public.workspace_staff_invitations%ROWTYPE;
  v_invitation_id uuid := gen_random_uuid();
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_email text := LOWER(BTRIM(COALESCE(p_email, '')));
  v_expiry timestamptz := COALESCE(p_expires_at, now() + interval '7 days');
  v_grantor_membership_id uuid;
  v_source_mandate_id uuid;
  v_internal_capabilities text[];
  v_request_fingerprint text;
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'ROLE_GRANT_LIMITED');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  IF CHAR_LENGTH(v_email) NOT BETWEEN 3 AND 254
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     OR v_expiry <= now()
     OR v_expiry > now() + interval '90 days'
     OR (p_assignment_valid_to IS NOT NULL AND p_assignment_valid_to <= v_expiry) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Staff invitation fields are invalid',
      DETAIL = '{"error_code":"STAFF_INVITATION_INVALID"}';
  END IF;

  -- Organization/agency membership is deliberately absent from this authority
  -- proof. Only a direct, workspace-scoped, verified mandate-backed admin may
  -- issue a staff invitation.
  SELECT wm.id, mm.id
  INTO v_grantor_membership_id, v_source_mandate_id
  FROM public.workspace_memberships wm
  JOIN public.membership_periods mp
    ON mp.workspace_id = wm.workspace_id
   AND mp.membership_id = wm.id
   AND mp.ended_at IS NULL
  JOIN public.role_assignments ra
    ON ra.workspace_id = wm.workspace_id
   AND ra.membership_id = wm.id
   AND ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
   AND ra.status = 'ACTIVE'
   AND ra.valid_from <= now()
   AND (ra.valid_to IS NULL OR ra.valid_to > now())
  JOIN public.management_mandates mm
    ON mm.workspace_id = ra.workspace_id
   AND mm.id = ra.source_mandate_id
   AND mm.status = 'ACTIVE'
   AND mm.verification_status = 'VERIFIED'
   AND mm.valid_from <= now()
   AND (mm.valid_to IS NULL OR mm.valid_to > now())
  WHERE wm.workspace_id = p_workspace_id
    AND wm.profile_id = v_actor
    AND wm.status = 'ACTIVE'
  ORDER BY ra.valid_from DESC
  LIMIT 1;

  IF v_grantor_membership_id IS NULL OR v_source_mandate_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'A direct verified workspace administrator is required',
      DETAIL = '{"error_code":"DIRECT_VERIFIED_ADMIN_REQUIRED"}';
  END IF;

  v_internal_capabilities := private.normalize_staff_invitation_capabilities(
    v_actor,
    p_workspace_id,
    p_role_key,
    p_capability_keys
  );
  v_request_fingerprint := encode(
    digest(
      concat_ws(
        '|', p_workspace_id::text, v_email, p_role_key,
        array_to_string(v_internal_capabilities, ','), v_expiry::text,
        COALESCE(p_assignment_valid_to::text, '')
      ),
      'sha256'
    ),
    'hex'
  );

  v_existing := private.lock_idempotent_command(
    v_actor,
    'issue_workspace_staff_invitation',
    p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_existing_row
    FROM public.workspace_staff_invitations wsi
    WHERE wsi.id = v_existing
      AND wsi.created_by_profile_id = v_actor;

    IF v_existing_row.id IS NULL OR v_existing_row.request_fingerprint <> v_request_fingerprint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Idempotency key was used for another staff invitation',
        DETAIL = '{"error_code":"IDEMPOTENCY_CONFLICT"}';
    END IF;

    RETURN QUERY SELECT
      v_existing_row.id,
      NULL::text,
      v_existing_row.status,
      v_existing_row.expires_at,
      v_existing_row.role_key;
    RETURN;
  END IF;

  INSERT INTO public.workspace_staff_invitations (
    id, workspace_id, invited_email_normalized, role_key, capability_keys,
    token_hash, status, expires_at, assignment_valid_to,
    created_by_profile_id, grantor_membership_id, source_mandate_id,
    idempotency_key, request_fingerprint
  ) VALUES (
    v_invitation_id, p_workspace_id, v_email, p_role_key, v_internal_capabilities,
    encode(digest(v_token, 'sha256'), 'hex'), 'PENDING', v_expiry,
    p_assignment_valid_to, v_actor, v_grantor_membership_id,
    v_source_mandate_id, p_idempotency_key, v_request_fingerprint
  );

  PERFORM private.record_idempotent_command(
    v_actor,
    'issue_workspace_staff_invitation',
    p_idempotency_key,
    v_invitation_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id,
    'WORKSPACE_STAFF_INVITATION_ISSUED',
    'workspace_staff_invitation',
    v_invitation_id,
    'STATE_CHANGE',
    p_role_key,
    jsonb_build_object(
      'expires_at', v_expiry,
      'assignment_valid_to', p_assignment_valid_to,
      'capability_keys', v_internal_capabilities,
      'email_bound', true,
      'unit_relationship_created', false
    )
  );

  RETURN QUERY SELECT
    v_invitation_id,
    v_token,
    'PENDING'::text,
    v_expiry,
    p_role_key;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_workspace_staff_invitation(uuid, text, text, text[], timestamptz, timestamptz, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_workspace_staff_invitation(uuid, text, text, text[], timestamptz, timestamptz, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_workspace_staff_invitation(
  p_token text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  membership_id uuid,
  workspace_id uuid,
  membership_status text,
  role_assignment_id uuid,
  assigned_role_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text := LOWER(BTRIM(COALESCE(auth.jwt() ->> 'email', '')));
  v_existing uuid;
  v_invitation public.workspace_staff_invitations%ROWTYPE;
  v_membership public.workspace_memberships%ROWTYPE;
  v_membership_id uuid;
  v_delegation_id uuid;
  v_assignment_id uuid := gen_random_uuid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  IF p_idempotency_key IS NULL OR NULLIF(BTRIM(COALESCE(p_token, '')), '') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Invitation token and idempotency key are required',
      DETAIL = '{"error_code":"STAFF_INVITATION_NOT_ACCEPTABLE"}';
  END IF;

  PERFORM public.ensure_profile();
  v_existing := private.lock_idempotent_command(
    v_actor,
    'accept_workspace_staff_invitation',
    p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    RETURN QUERY
    SELECT
      wm.id,
      wm.workspace_id,
      wm.status,
      ra.id,
      ra.role_key
    FROM public.role_assignments ra
    JOIN public.workspace_memberships wm
      ON wm.workspace_id = ra.workspace_id
     AND wm.id = ra.membership_id
    WHERE ra.id = v_existing
      AND wm.profile_id = v_actor;
    RETURN;
  END IF;

  SELECT * INTO v_invitation
  FROM public.workspace_staff_invitations wsi
  WHERE wsi.token_hash = encode(digest(COALESCE(p_token, ''), 'sha256'), 'hex')
  FOR UPDATE;

  IF v_invitation.id IS NULL
     OR v_invitation.status <> 'PENDING'
     OR v_invitation.expires_at <= now()
     OR v_invitation.invited_email_normalized <> v_email THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Staff invitation cannot be accepted',
      DETAIL = '{"error_code":"STAFF_INVITATION_NOT_ACCEPTABLE"}';
  END IF;

  IF v_invitation.accepted_at IS NOT NULL OR v_invitation.accepted_by_profile_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Staff invitation has already been consumed',
      DETAIL = '{"error_code":"STAFF_INVITATION_REPLAY_FORBIDDEN"}';
  END IF;
  IF v_invitation.created_by_profile_id = v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'A staff invitation cannot be self-accepted',
      DETAIL = '{"error_code":"STAFF_INVITATION_SELF_ACCEPT_FORBIDDEN"}';
  END IF;
  IF v_invitation.assignment_valid_to IS NOT NULL
     AND v_invitation.assignment_valid_to <= now() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'The invited role has expired',
      DETAIL = '{"error_code":"STAFF_ROLE_VALIDITY_EXPIRED"}';
  END IF;

  -- Re-check the exact stored grantor, workspace and verified mandate at
  -- acceptance time. Revoking the inviter's authority invalidates unused links.
  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_memberships wm
    JOIN public.membership_periods mp
      ON mp.workspace_id = wm.workspace_id
     AND mp.membership_id = wm.id
     AND mp.ended_at IS NULL
    JOIN public.role_assignments ra
      ON ra.workspace_id = wm.workspace_id
     AND ra.membership_id = wm.id
     AND ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
     AND ra.status = 'ACTIVE'
     AND ra.source_mandate_id = v_invitation.source_mandate_id
     AND ra.valid_from <= now()
     AND (ra.valid_to IS NULL OR ra.valid_to > now())
    JOIN public.management_mandates mm
      ON mm.workspace_id = ra.workspace_id
     AND mm.id = ra.source_mandate_id
     AND mm.status = 'ACTIVE'
     AND mm.verification_status = 'VERIFIED'
     AND mm.valid_from <= now()
     AND (mm.valid_to IS NULL OR mm.valid_to > now())
    WHERE wm.workspace_id = v_invitation.workspace_id
      AND wm.id = v_invitation.grantor_membership_id
      AND wm.profile_id = v_invitation.created_by_profile_id
      AND wm.status = 'ACTIVE'
      AND private.has_workspace_capability(
        v_invitation.created_by_profile_id,
        v_invitation.workspace_id,
        'ROLE_GRANT_LIMITED'
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'The staff inviter no longer has verified authority',
      DETAIL = '{"error_code":"STAFF_INVITER_AUTHORITY_EXPIRED"}';
  END IF;

  -- Serialize all staff accepts for the same profile/workspace, including two
  -- different invitation tokens racing one another.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'staff-membership:' || v_invitation.workspace_id::text || ':' || v_actor::text,
      0
    )
  );

  SELECT * INTO v_membership
  FROM public.workspace_memberships wm
  WHERE wm.workspace_id = v_invitation.workspace_id
    AND wm.profile_id = v_actor
  FOR UPDATE;

  IF v_membership.id IS NULL THEN
    INSERT INTO public.workspace_memberships (
      workspace_id, profile_id, status, source, created_by_profile_id,
      primary_context_unit_id
    ) VALUES (
      v_invitation.workspace_id, v_actor, 'ACTIVE', 'INVITATION',
      v_invitation.created_by_profile_id, NULL
    )
    RETURNING id INTO v_membership_id;
  ELSIF v_membership.status = 'ACTIVE' THEN
    v_membership_id := v_membership.id;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Suspended or ended membership cannot be reactivated by staff invitation',
      DETAIL = '{"error_code":"STAFF_TARGET_MEMBERSHIP_NOT_ELIGIBLE"}';
  END IF;

  INSERT INTO public.membership_periods (
    workspace_id, membership_id, started_at, start_reason,
    source_staff_invitation_id, created_by_profile_id
  )
  SELECT
    v_invitation.workspace_id, v_membership_id, now(),
    'STAFF_INVITATION_ACCEPTED', v_invitation.id,
    v_invitation.created_by_profile_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.membership_periods mp
    WHERE mp.workspace_id = v_invitation.workspace_id
      AND mp.membership_id = v_membership_id
      AND mp.ended_at IS NULL
  );

  IF EXISTS (
    SELECT 1
    FROM public.role_assignments ra
    WHERE ra.workspace_id = v_invitation.workspace_id
      AND ra.membership_id = v_membership_id
      AND ra.role_key = v_invitation.role_key
      AND ra.status = 'ACTIVE'
      AND ra.valid_from <= now()
      AND (ra.valid_to IS NULL OR ra.valid_to > now())
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'The invited staff role is already active',
      DETAIL = '{"error_code":"STAFF_ROLE_ALREADY_ACTIVE"}';
  END IF;

  IF v_invitation.role_key = 'DELEGATE_OPERATIONS' THEN
    -- Revalidate the capability boundary against the inviter at consumption
    -- time as well; stored invitations cannot outlive a privilege reduction.
    IF EXISTS (
      SELECT 1
      FROM UNNEST(v_invitation.capability_keys) AS requested(internal_key)
      WHERE requested.internal_key NOT IN (
        'WORKSPACE_READ', 'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED',
        'UNIT_READ_ALL', 'MEMBER_DIRECTORY_READ', 'MEMBERSHIP_INVITE',
        'MEMBERSHIP_REVIEW', 'TICKET_MANAGE', 'DOCUMENT_MANAGE',
        'COMMUNICATION_MANAGE', 'REMINDER_MANAGE', 'METER_MANAGE'
      )
         OR NOT EXISTS (
           SELECT 1 FROM public.role_capabilities rc
           WHERE rc.role_key = 'DELEGATE_OPERATIONS'
             AND rc.capability_key = requested.internal_key
         )
         OR NOT private.has_workspace_capability(
           v_invitation.created_by_profile_id,
           v_invitation.workspace_id,
           requested.internal_key
         )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501', MESSAGE = 'Delegated capabilities exceed the current inviter boundary',
        DETAIL = '{"error_code":"STAFF_ROLE_CAPABILITY_AMPLIFICATION_FORBIDDEN"}';
    END IF;

    v_delegation_id := gen_random_uuid();
    INSERT INTO public.delegations (
      id, workspace_id, source_mandate_id, granted_by_membership_id,
      beneficiary_membership_id, capability_keys, status, valid_from,
      valid_to, can_redelegate, reason
    ) VALUES (
      v_delegation_id, v_invitation.workspace_id,
      v_invitation.source_mandate_id, v_invitation.grantor_membership_id,
      v_membership_id, v_invitation.capability_keys, 'ACTIVE', now(),
      v_invitation.assignment_valid_to, false, 'STAFF_INVITATION_ACCEPTED'
    );
  ELSIF EXISTS (
    SELECT 1
    FROM public.role_capabilities rc
    WHERE rc.role_key = v_invitation.role_key
      AND NOT private.has_workspace_capability(
        v_invitation.created_by_profile_id,
        v_invitation.workspace_id,
        rc.capability_key
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'The fixed staff role exceeds the current inviter boundary',
      DETAIL = '{"error_code":"STAFF_ROLE_CAPABILITY_AMPLIFICATION_FORBIDDEN"}';
  END IF;

  INSERT INTO public.role_assignments (
    id, workspace_id, membership_id, role_key, source_delegation_id,
    status, valid_from, valid_to, granted_by_profile_id, reason
  ) VALUES (
    v_assignment_id, v_invitation.workspace_id, v_membership_id,
    v_invitation.role_key, v_delegation_id, 'ACTIVE', now(),
    v_invitation.assignment_valid_to, v_invitation.created_by_profile_id,
    'STAFF_INVITATION_ACCEPTED'
  );

  -- Transactional compatibility only; this never creates a unit, owner or
  -- occupant projection. DELEGATE_OPERATIONS maps narrowly to legacy megbizott.
  PERFORM private.project_legacy_workspace_role(
    v_invitation.workspace_id,
    v_actor,
    v_invitation.role_key,
    true
  );

  UPDATE public.workspace_staff_invitations
  SET status = 'ACCEPTED',
      accepted_at = now(),
      accepted_by_profile_id = v_actor,
      updated_at = now()
  WHERE id = v_invitation.id
    AND status = 'PENDING';

  PERFORM private.record_idempotent_command(
    v_actor,
    'accept_workspace_staff_invitation',
    p_idempotency_key,
    v_assignment_id
  );
  PERFORM private.write_authorization_event(
    v_invitation.workspace_id,
    'WORKSPACE_STAFF_INVITATION_ACCEPTED',
    'role_assignment',
    v_assignment_id,
    'STATE_CHANGE',
    v_invitation.role_key,
    jsonb_build_object(
      'invitation_id', v_invitation.id,
      'membership_id', v_membership_id,
      'delegation_id', v_delegation_id,
      'unit_relationship_created', false,
      'email_bound', true
    )
  );

  RETURN QUERY SELECT
    v_membership_id,
    v_invitation.workspace_id,
    'ACTIVE'::text,
    v_assignment_id,
    v_invitation.role_key;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_workspace_staff_invitation(text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_staff_invitation(text, uuid)
  TO authenticated;

-- Backward-compatible invitation endpoint used by /invitations/[token]. It
-- dispatches staff tokens into the staff state machine and leaves the existing
-- resident invitation semantics intact.
CREATE OR REPLACE FUNCTION public.accept_membership_invitation(
  p_token text,
  p_idempotency_key uuid
)
RETURNS TABLE (membership_id uuid, workspace_id uuid, membership_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_invitation public.membership_invitations%ROWTYPE;
  v_membership_id uuid;
  v_person_id uuid;
  v_email text := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workspace_staff_invitations wsi
    WHERE wsi.token_hash = encode(digest(COALESCE(p_token, ''), 'sha256'), 'hex')
  ) THEN
    RETURN QUERY
    SELECT
      accepted.membership_id,
      accepted.workspace_id,
      accepted.membership_status
    FROM public.accept_workspace_staff_invitation(p_token, p_idempotency_key) accepted;
    RETURN;
  END IF;

  PERFORM public.ensure_profile();
  v_existing := private.lock_idempotent_command(v_actor, 'accept_membership_invitation', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    RETURN QUERY
    SELECT wm.id, wm.workspace_id, wm.status
    FROM public.workspace_memberships wm WHERE wm.id = v_existing;
    RETURN;
  END IF;

  SELECT * INTO v_invitation
  FROM public.membership_invitations mi
  WHERE mi.token_hash = encode(digest(COALESCE(p_token, ''), 'sha256'), 'hex')
  FOR UPDATE;

  IF v_invitation.id IS NULL
     OR v_invitation.status <> 'PENDING'
     OR v_invitation.expires_at <= now()
     OR v_invitation.invited_email_normalized <> v_email THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Invitation cannot be accepted',
      DETAIL = '{"error_code":"INVITATION_NOT_ACCEPTABLE"}';
  END IF;

  IF v_invitation.created_by_profile_id = v_actor
     AND v_invitation.relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'An administrator cannot self-accept an owner invitation',
      DETAIL = '{"error_code":"OWNER_SELF_INVITATION_FORBIDDEN"}';
  END IF;

  IF v_invitation.grantor_membership_id IS NULL
     OR v_invitation.source_mandate_id IS NULL
     OR NOT private.has_workspace_capability(
       v_invitation.created_by_profile_id,
       v_invitation.workspace_id,
       'MEMBERSHIP_INVITE'
     )
     OR NOT EXISTS (
       SELECT 1
       FROM public.workspace_memberships grantor
       JOIN public.membership_periods grantor_period
         ON grantor_period.workspace_id = grantor.workspace_id
        AND grantor_period.membership_id = grantor.id
        AND grantor_period.ended_at IS NULL
       JOIN public.management_mandates mm
         ON mm.workspace_id = grantor.workspace_id
        AND mm.id = v_invitation.source_mandate_id
        AND mm.status = 'ACTIVE'
        AND mm.verification_status = 'VERIFIED'
        AND mm.valid_from <= now()
        AND (mm.valid_to IS NULL OR mm.valid_to > now())
       WHERE grantor.workspace_id = v_invitation.workspace_id
         AND grantor.id = v_invitation.grantor_membership_id
         AND grantor.profile_id = v_invitation.created_by_profile_id
         AND grantor.status = 'ACTIVE'
         AND (
           (
             v_invitation.source_delegation_id IS NULL
             AND EXISTS (
               SELECT 1
               FROM public.role_assignments admin_assignment
               WHERE admin_assignment.workspace_id = grantor.workspace_id
                 AND admin_assignment.membership_id = grantor.id
                 AND admin_assignment.role_key IN (
                   'COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN'
                 )
                 AND admin_assignment.source_mandate_id = v_invitation.source_mandate_id
                 AND admin_assignment.source_delegation_id IS NULL
                 AND admin_assignment.status = 'ACTIVE'
                 AND admin_assignment.valid_from <= now()
                 AND (admin_assignment.valid_to IS NULL OR admin_assignment.valid_to > now())
             )
           )
           OR (
             v_invitation.source_delegation_id IS NOT NULL
             AND EXISTS (
               SELECT 1
               FROM public.delegations d
               JOIN public.role_assignments delegate_assignment
                 ON delegate_assignment.workspace_id = d.workspace_id
                AND delegate_assignment.membership_id = d.beneficiary_membership_id
                AND delegate_assignment.source_delegation_id = d.id
                AND delegate_assignment.role_key = 'DELEGATE_OPERATIONS'
                AND delegate_assignment.status = 'ACTIVE'
                AND delegate_assignment.valid_from <= now()
                AND (delegate_assignment.valid_to IS NULL OR delegate_assignment.valid_to > now())
               WHERE d.workspace_id = grantor.workspace_id
                 AND d.id = v_invitation.source_delegation_id
                 AND d.source_mandate_id = v_invitation.source_mandate_id
                 AND d.beneficiary_membership_id = grantor.id
                 AND d.status = 'ACTIVE'
                 AND d.valid_from <= now()
                 AND (d.valid_to IS NULL OR d.valid_to > now())
                 AND 'MEMBERSHIP_INVITE' = ANY(d.capability_keys)
             )
           )
         )
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'The invitation grantor no longer has verified authority',
      DETAIL = '{"error_code":"INVITATION_GRANTOR_AUTHORITY_EXPIRED"}';
  END IF;

  INSERT INTO public.workspace_memberships (
    workspace_id, profile_id, status, source, created_by_profile_id, primary_context_unit_id
  ) VALUES (
    v_invitation.workspace_id, v_actor, 'ACTIVE', 'INVITATION',
    v_invitation.created_by_profile_id, v_invitation.unit_id
  )
  ON CONFLICT ON CONSTRAINT workspace_memberships_workspace_profile_uq DO UPDATE
  SET status = 'ACTIVE',
      source = 'INVITATION',
      primary_context_unit_id = COALESCE(EXCLUDED.primary_context_unit_id, public.workspace_memberships.primary_context_unit_id),
      updated_at = now()
  RETURNING id INTO v_membership_id;

  INSERT INTO public.membership_periods (
    workspace_id, membership_id, started_at, start_reason,
    source_invitation_id, created_by_profile_id
  )
  SELECT
    v_invitation.workspace_id, v_membership_id, now(), 'INVITATION_ACCEPTED',
    v_invitation.id, v_actor
  WHERE NOT EXISTS (
    SELECT 1 FROM public.membership_periods mp
    WHERE mp.membership_id = v_membership_id AND mp.ended_at IS NULL
  );

  SELECT pal.person_id INTO v_person_id
  FROM public.person_account_links pal
  WHERE pal.profile_id = v_actor AND pal.status = 'ACTIVE' AND pal.valid_to IS NULL
  LIMIT 1;

  IF v_invitation.relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
    INSERT INTO public.unit_ownerships (
      workspace_id, unit_id, party_id, ownership_type, status,
      verification_method, source, evidence_reference, valid_from
    ) VALUES (
      v_invitation.workspace_id, v_invitation.unit_id, v_person_id,
      'SOLE_OWNER', 'CLAIMED', 'INVITATION_ACCEPTED', 'INVITATION',
      v_invitation.id::text, now()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_invitation.relationship_type <> 'OWNER' THEN
    INSERT INTO public.unit_occupancies (
      workspace_id, unit_id, person_id, occupancy_type, status,
      verification_method, source, source_invitation_id, valid_from
    ) VALUES (
      v_invitation.workspace_id, v_invitation.unit_id, v_person_id,
      CASE v_invitation.relationship_type
        WHEN 'OWNER_OCCUPANT' THEN 'OWNER_OCCUPANT'
        WHEN 'TENANT' THEN 'TENANT'
        WHEN 'HOUSEHOLD_MEMBER' THEN 'HOUSEHOLD_MEMBER'
        ELSE 'AUTHORIZED_OCCUPANT'
      END,
      'CLAIMED', 'INVITATION_ACCEPTED', 'INVITATION', v_invitation.id, now()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- A claimed owner is not projected as legacy `tulajdonos`. Non-owner
  -- occupancy remains available for compatibility, while owner-only authority
  -- is unlocked solely by a separately VERIFIED ownership relation.
  IF v_invitation.relationship_type <> 'OWNER' THEN
    PERFORM private.upsert_legacy_membership_projection(
      v_invitation.workspace_id,
      v_actor,
      v_invitation.unit_id,
      'lako',
      true
    );
  END IF;

  UPDATE public.membership_invitations
  SET status = 'ACCEPTED', accepted_at = now(), accepted_by_profile_id = v_actor, updated_at = now()
  WHERE id = v_invitation.id;

  PERFORM private.record_idempotent_command(
    v_actor, 'accept_membership_invitation', p_idempotency_key, v_membership_id
  );
  PERFORM private.write_authorization_event(
    v_invitation.workspace_id, 'MEMBERSHIP_INVITATION_ACCEPTED',
    'workspace_membership', v_membership_id, 'STATE_CHANGE', NULL,
    jsonb_build_object(
      'invitation_id', v_invitation.id,
      'source_mandate_id', v_invitation.source_mandate_id,
      'source_delegation_id', v_invitation.source_delegation_id,
      'ownership_status', CASE
        WHEN v_invitation.relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN 'CLAIMED'
        ELSE NULL
      END,
      'legacy_owner_projected', false
    )
  );

  RETURN QUERY SELECT v_membership_id, v_invitation.workspace_id, 'ACTIVE'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_membership_invitation(text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_membership_invitation(text, uuid)
  TO authenticated;

COMMIT;
