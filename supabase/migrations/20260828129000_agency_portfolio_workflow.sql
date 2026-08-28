-- PanelLako v0.10.1 - management agency portfolio workflow
--
-- Agency membership alone never grants tenant access. Access is projected only
-- from the conjunction of:
--   * an active agency staff membership,
--   * an active, VERIFIED agency mandate for one workspace,
--   * an explicit portfolio assignment created by a current direct admin,
--   * an auditable, revocable workspace grant.

BEGIN;

ALTER TABLE public.management_agency_details
  ADD COLUMN IF NOT EXISTS creation_request_fingerprint text;

ALTER TABLE public.organization_memberships
  ADD COLUMN IF NOT EXISTS agency_revocation_fingerprint text;

CREATE TABLE IF NOT EXISTS public.agency_staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.management_agency_details(organization_id) ON DELETE CASCADE,
  invited_email_normalized text NOT NULL,
  organization_role text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz NOT NULL,
  invited_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  accepted_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_organization_membership_id uuid REFERENCES public.organization_memberships(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  idempotency_key uuid NOT NULL,
  request_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_staff_invitations_role_check CHECK (
    organization_role IN ('AGENCY_ADMIN', 'PORTFOLIO_MANAGER', 'OPERATIONS', 'ACCOUNTANT')
  ),
  CONSTRAINT agency_staff_invitations_status_check CHECK (
    status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')
  ),
  CONSTRAINT agency_staff_invitations_email_check CHECK (
    invited_email_normalized = lower(btrim(invited_email_normalized))
    AND invited_email_normalized ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  CONSTRAINT agency_staff_invitations_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT agency_staff_invitations_idempotency_uq
    UNIQUE (invited_by_profile_id, idempotency_key)
);

ALTER TABLE public.agency_staff_invitations
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

UPDATE public.agency_staff_invitations invitation
SET request_fingerprint = encode(
  digest(
    concat_ws(
      '|', invitation.agency_id::text, invitation.invited_email_normalized,
      invitation.organization_role, invitation.expires_at::text
    ),
    'sha256'
  ),
  'hex'
)
WHERE invitation.request_fingerprint IS NULL;

ALTER TABLE public.agency_staff_invitations
  ALTER COLUMN request_fingerprint SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agency_staff_one_pending_email_uq
  ON public.agency_staff_invitations(agency_id, invited_email_normalized)
  WHERE status = 'PENDING';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.organization_memberships'::regclass
      AND conname = 'organization_memberships_organization_id_id_uq'
  ) THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT organization_memberships_organization_id_id_uq
      UNIQUE (organization_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.role_assignments'::regclass
      AND conname = 'role_assignments_workspace_id_id_uq'
  ) THEN
    ALTER TABLE public.role_assignments
      ADD CONSTRAINT role_assignments_workspace_id_id_uq
      UNIQUE (workspace_id, id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.management_mandates'::regclass
      AND conname = 'management_mandates_workspace_id_id_agency_id_uq'
  ) THEN
    ALTER TABLE public.management_mandates
      ADD CONSTRAINT management_mandates_workspace_id_id_agency_id_uq
      UNIQUE (workspace_id, id, agency_id);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS organization_memberships_one_active_agency_staff_uq
  ON public.organization_memberships(organization_id, profile_id)
  WHERE status = 'ACTIVE' AND valid_to IS NULL;

CREATE TABLE IF NOT EXISTS public.agency_portfolio_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.management_agency_details(organization_id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  mandate_id uuid NOT NULL,
  grantor_membership_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  appointment_reference text NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  assigned_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ended_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ended_at timestamptz,
  ended_reason text,
  idempotency_key uuid NOT NULL,
  request_fingerprint text NOT NULL,
  end_request_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_portfolio_assignments_status_check CHECK (
    status IN ('ACTIVE', 'SUSPENDED', 'ENDED')
  ),
  CONSTRAINT agency_portfolio_assignments_validity_check CHECK (
    valid_to IS NULL OR valid_to > valid_from
  ),
  CONSTRAINT agency_portfolio_assignments_evidence_check CHECK (
    appointment_reference ~ '^signed-mandate:[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$'
  ),
  CONSTRAINT agency_portfolio_assignments_mandate_fk
    FOREIGN KEY (workspace_id, mandate_id)
    REFERENCES public.management_mandates(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT agency_portfolio_assignments_agency_mandate_fk
    FOREIGN KEY (workspace_id, mandate_id, agency_id)
    REFERENCES public.management_mandates(workspace_id, id, agency_id) ON DELETE RESTRICT,
  CONSTRAINT agency_portfolio_assignments_grantor_fk
    FOREIGN KEY (workspace_id, grantor_membership_id)
    REFERENCES public.workspace_memberships(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT agency_portfolio_assignments_workspace_id_id_uq UNIQUE (workspace_id, id),
  CONSTRAINT agency_portfolio_assignments_agency_workspace_id_id_uq
    UNIQUE (agency_id, workspace_id, id),
  CONSTRAINT agency_portfolio_assignments_actor_idempotency_uq
    UNIQUE (assigned_by_profile_id, idempotency_key)
);

ALTER TABLE public.agency_portfolio_assignments
  ADD COLUMN IF NOT EXISTS request_fingerprint text,
  ADD COLUMN IF NOT EXISTS end_request_fingerprint text;

UPDATE public.agency_portfolio_assignments assignment
SET request_fingerprint = encode(
  digest(
    concat_ws(
      '|', assignment.agency_id::text, assignment.workspace_id::text,
      assignment.appointment_reference, COALESCE(assignment.valid_to::text, '')
    ),
    'sha256'
  ),
  'hex'
)
WHERE assignment.request_fingerprint IS NULL;

ALTER TABLE public.agency_portfolio_assignments
  ALTER COLUMN request_fingerprint SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.agency_portfolio_assignments'::regclass
      AND conname = 'agency_portfolio_assignments_agency_mandate_fk'
  ) THEN
    ALTER TABLE public.agency_portfolio_assignments
      ADD CONSTRAINT agency_portfolio_assignments_agency_mandate_fk
      FOREIGN KEY (workspace_id, mandate_id, agency_id)
      REFERENCES public.management_mandates(workspace_id, id, agency_id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.agency_portfolio_assignments'::regclass
      AND conname = 'agency_portfolio_assignments_agency_workspace_id_id_uq'
  ) THEN
    ALTER TABLE public.agency_portfolio_assignments
      ADD CONSTRAINT agency_portfolio_assignments_agency_workspace_id_id_uq
      UNIQUE (agency_id, workspace_id, id);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS agency_portfolio_one_active_workspace_uq
  ON public.agency_portfolio_assignments(workspace_id)
  WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS agency_portfolio_agency_active_idx
  ON public.agency_portfolio_assignments(agency_id, workspace_id)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.agency_workspace_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.management_agency_details(organization_id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  portfolio_assignment_id uuid NOT NULL,
  organization_membership_id uuid NOT NULL,
  workspace_membership_id uuid NOT NULL,
  delegation_id uuid,
  role_assignment_id uuid NOT NULL,
  role_key text NOT NULL REFERENCES public.role_templates(role_key) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'ACTIVE',
  workspace_membership_created boolean NOT NULL DEFAULT false,
  workspace_membership_activated boolean NOT NULL DEFAULT false,
  delegation_created boolean NOT NULL DEFAULT false,
  role_assignment_created boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoke_reason text,
  CONSTRAINT agency_workspace_grants_status_check CHECK (status IN ('ACTIVE', 'REVOKED')),
  CONSTRAINT agency_workspace_grants_role_check CHECK (role_key IN ('DELEGATE_OPERATIONS', 'ACCOUNTANT')),
  CONSTRAINT agency_workspace_grants_assignment_fk
    FOREIGN KEY (workspace_id, portfolio_assignment_id)
    REFERENCES public.agency_portfolio_assignments(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT agency_workspace_grants_agency_assignment_fk
    FOREIGN KEY (agency_id, workspace_id, portfolio_assignment_id)
    REFERENCES public.agency_portfolio_assignments(agency_id, workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT agency_workspace_grants_organization_membership_fk
    FOREIGN KEY (agency_id, organization_membership_id)
    REFERENCES public.organization_memberships(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT agency_workspace_grants_workspace_membership_fk
    FOREIGN KEY (workspace_id, workspace_membership_id)
    REFERENCES public.workspace_memberships(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT agency_workspace_grants_delegation_fk
    FOREIGN KEY (workspace_id, delegation_id)
    REFERENCES public.delegations(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT agency_workspace_grants_role_assignment_fk
    FOREIGN KEY (workspace_id, role_assignment_id)
    REFERENCES public.role_assignments(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT agency_workspace_grants_delegation_shape_check CHECK (
    (role_key = 'DELEGATE_OPERATIONS' AND delegation_id IS NOT NULL)
    OR (role_key = 'ACCOUNTANT' AND delegation_id IS NULL)
  )
);

ALTER TABLE public.agency_workspace_grants
  ADD COLUMN IF NOT EXISTS workspace_membership_activated boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.agency_workspace_grants'::regclass
      AND conname = 'agency_workspace_grants_agency_assignment_fk'
  ) THEN
    ALTER TABLE public.agency_workspace_grants
      ADD CONSTRAINT agency_workspace_grants_agency_assignment_fk
      FOREIGN KEY (agency_id, workspace_id, portfolio_assignment_id)
      REFERENCES public.agency_portfolio_assignments(agency_id, workspace_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.agency_workspace_grants'::regclass
      AND conname = 'agency_workspace_grants_delegation_shape_check'
  ) THEN
    ALTER TABLE public.agency_workspace_grants
      ADD CONSTRAINT agency_workspace_grants_delegation_shape_check CHECK (
        (role_key = 'DELEGATE_OPERATIONS' AND delegation_id IS NOT NULL)
        OR (role_key = 'ACCOUNTANT' AND delegation_id IS NULL)
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS agency_workspace_grants_one_active_uq
  ON public.agency_workspace_grants(portfolio_assignment_id, organization_membership_id)
  WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS agency_workspace_grants_profile_lookup_idx
  ON public.agency_workspace_grants(agency_id, organization_membership_id, workspace_id)
  WHERE status = 'ACTIVE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.agency_staff_invitations'::regclass
      AND conname = 'agency_staff_invitations_fingerprint_check'
  ) THEN
    ALTER TABLE public.agency_staff_invitations
      ADD CONSTRAINT agency_staff_invitations_fingerprint_check
      CHECK (request_fingerprint ~ '^[0-9a-f]{64}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.agency_staff_invitations'::regclass
      AND conname = 'agency_staff_invitations_acceptance_shape_check'
  ) THEN
    ALTER TABLE public.agency_staff_invitations
      ADD CONSTRAINT agency_staff_invitations_acceptance_shape_check CHECK (
        (status = 'PENDING'
          AND accepted_by_profile_id IS NULL
          AND accepted_organization_membership_id IS NULL
          AND accepted_at IS NULL
          AND revoked_at IS NULL)
        OR (status = 'ACCEPTED'
          AND accepted_by_profile_id IS NOT NULL
          AND accepted_organization_membership_id IS NOT NULL
          AND accepted_at IS NOT NULL
          AND revoked_at IS NULL)
        OR (status = 'REVOKED' AND revoked_at IS NOT NULL)
        OR status = 'EXPIRED'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.agency_portfolio_assignments'::regclass
      AND conname = 'agency_portfolio_assignments_fingerprint_check'
  ) THEN
    ALTER TABLE public.agency_portfolio_assignments
      ADD CONSTRAINT agency_portfolio_assignments_fingerprint_check CHECK (
        request_fingerprint ~ '^[0-9a-f]{64}$'
        AND (end_request_fingerprint IS NULL OR end_request_fingerprint ~ '^[0-9a-f]{64}$')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.agency_workspace_grants'::regclass
      AND conname = 'agency_workspace_grants_activation_shape_check'
  ) THEN
    ALTER TABLE public.agency_workspace_grants
      ADD CONSTRAINT agency_workspace_grants_activation_shape_check CHECK (
        NOT (workspace_membership_created AND workspace_membership_activated)
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_agency_workspace_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_assignment public.agency_portfolio_assignments%ROWTYPE;
  v_organization_profile_id uuid;
  v_workspace_profile_id uuid;
  v_role_assignment public.role_assignments%ROWTYPE;
  v_delegation public.delegations%ROWTYPE;
BEGIN
  SELECT * INTO v_assignment
  FROM public.agency_portfolio_assignments assignment
  WHERE assignment.id = NEW.portfolio_assignment_id
    AND assignment.agency_id = NEW.agency_id
    AND assignment.workspace_id = NEW.workspace_id
    AND assignment.status = 'ACTIVE'
    AND assignment.valid_from <= now()
    AND (assignment.valid_to IS NULL OR assignment.valid_to > now());

  SELECT membership.profile_id INTO v_organization_profile_id
  FROM public.organization_memberships membership
  WHERE membership.id = NEW.organization_membership_id
    AND membership.organization_id = NEW.agency_id
    AND membership.status = 'ACTIVE'
    AND membership.valid_from <= now()
    AND (membership.valid_to IS NULL OR membership.valid_to > now());

  SELECT membership.profile_id INTO v_workspace_profile_id
  FROM public.workspace_memberships membership
  WHERE membership.id = NEW.workspace_membership_id
    AND membership.workspace_id = NEW.workspace_id
    AND membership.status = 'ACTIVE';

  SELECT * INTO v_role_assignment
  FROM public.role_assignments assignment
  WHERE assignment.id = NEW.role_assignment_id
    AND assignment.workspace_id = NEW.workspace_id
    AND assignment.membership_id = NEW.workspace_membership_id
    AND assignment.role_key = NEW.role_key
    AND assignment.status = 'ACTIVE'
    AND assignment.valid_from <= now()
    AND (assignment.valid_to IS NULL OR assignment.valid_to > now());

  IF v_assignment.id IS NULL
     OR v_organization_profile_id IS NULL
     OR v_workspace_profile_id IS DISTINCT FROM v_organization_profile_id
     OR v_role_assignment.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514', MESSAGE = 'Agency workspace grant provenance is invalid',
      DETAIL = '{"error_code":"AGENCY_WORKSPACE_GRANT_PROVENANCE_INVALID"}';
  END IF;

  IF NEW.role_key = 'DELEGATE_OPERATIONS' THEN
    SELECT * INTO v_delegation
    FROM public.delegations delegation
    WHERE delegation.id = NEW.delegation_id
      AND delegation.workspace_id = NEW.workspace_id
      AND delegation.beneficiary_membership_id = NEW.workspace_membership_id
      AND delegation.source_mandate_id = v_assignment.mandate_id
      AND delegation.status = 'ACTIVE'
      AND delegation.valid_from <= now()
      AND (delegation.valid_to IS NULL OR delegation.valid_to > now())
      AND delegation.can_redelegate = false;

    IF v_delegation.id IS NULL
       OR v_role_assignment.source_delegation_id IS DISTINCT FROM v_delegation.id
       OR v_role_assignment.source_mandate_id IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514', MESSAGE = 'Agency delegation provenance is invalid',
        DETAIL = '{"error_code":"AGENCY_DELEGATION_PROVENANCE_INVALID"}';
    END IF;
  ELSIF v_role_assignment.source_mandate_id IS NOT NULL
        OR v_role_assignment.source_delegation_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514', MESSAGE = 'Agency accountant role provenance is invalid',
      DETAIL = '{"error_code":"AGENCY_ACCOUNTANT_PROVENANCE_INVALID"}';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_agency_workspace_grant()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_agency_workspace_grants_validate
  ON public.agency_workspace_grants;
CREATE TRIGGER trg_agency_workspace_grants_validate
BEFORE INSERT ON public.agency_workspace_grants
FOR EACH ROW EXECUTE FUNCTION private.validate_agency_workspace_grant();

ALTER TABLE public.agency_staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_staff_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agency_portfolio_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_portfolio_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agency_workspace_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_workspace_grants FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agency_staff_invitations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.agency_portfolio_assignments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.agency_workspace_grants FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.agency_staff_invitations TO service_role;
GRANT SELECT ON TABLE public.agency_portfolio_assignments TO service_role;
GRANT SELECT ON TABLE public.agency_workspace_grants TO service_role;

CREATE OR REPLACE FUNCTION private.require_agency_admin(
  p_profile_id uuid,
  p_agency_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_membership_id uuid;
BEGIN
  SELECT membership.id INTO v_membership_id
  FROM public.organization_memberships membership
  JOIN public.management_agency_details agency
    ON agency.organization_id = membership.organization_id
  JOIN public.parties party
    ON party.id = agency.organization_id
   AND party.status = 'ACTIVE'
  WHERE membership.organization_id = p_agency_id
    AND membership.profile_id = p_profile_id
    AND membership.organization_role IN ('AGENCY_OWNER', 'AGENCY_ADMIN')
    AND membership.status = 'ACTIVE'
    AND membership.valid_from <= now()
    AND (membership.valid_to IS NULL OR membership.valid_to > now());

  IF v_membership_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Agency administrator membership is required',
      DETAIL = '{"error_code":"AGENCY_ADMIN_REQUIRED"}';
  END IF;
  RETURN v_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION private.require_agency_admin(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.agency_workspace_role(p_organization_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE p_organization_role
    WHEN 'ACCOUNTANT' THEN 'ACCOUNTANT'
    WHEN 'AGENCY_OWNER' THEN 'DELEGATE_OPERATIONS'
    WHEN 'AGENCY_ADMIN' THEN 'DELEGATE_OPERATIONS'
    WHEN 'PORTFOLIO_MANAGER' THEN 'DELEGATE_OPERATIONS'
    WHEN 'OPERATIONS' THEN 'DELEGATE_OPERATIONS'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION private.agency_workspace_role(text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.project_agency_staff_access(
  p_portfolio_assignment_id uuid,
  p_organization_membership_id uuid,
  p_actor_profile_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_assignment public.agency_portfolio_assignments%ROWTYPE;
  v_staff public.organization_memberships%ROWTYPE;
  v_mandate public.management_mandates%ROWTYPE;
  v_existing_grant_id uuid;
  v_workspace_membership_id uuid;
  v_workspace_membership_status text;
  v_workspace_membership_created boolean := false;
  v_workspace_membership_activated boolean := false;
  v_delegation_id uuid;
  v_delegation_created boolean := false;
  v_role_assignment_id uuid;
  v_role_assignment_created boolean := false;
  v_role_key text;
  v_grant_id uuid := gen_random_uuid();
  v_capabilities text[] := ARRAY[
    'WORKSPACE_READ', 'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED',
    'UNIT_READ_ALL', 'MEMBER_DIRECTORY_READ', 'TICKET_MANAGE',
    'DOCUMENT_MANAGE', 'COMMUNICATION_MANAGE', 'REMINDER_MANAGE', 'METER_MANAGE'
  ]::text[];
BEGIN
  SELECT * INTO v_assignment
  FROM public.agency_portfolio_assignments assignment
  WHERE assignment.id = p_portfolio_assignment_id
    AND assignment.status = 'ACTIVE'
    AND assignment.valid_from <= now()
    AND (assignment.valid_to IS NULL OR assignment.valid_to > now())
  FOR UPDATE;
  IF v_assignment.id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_staff
  FROM public.organization_memberships membership
  WHERE membership.id = p_organization_membership_id
    AND membership.organization_id = v_assignment.agency_id
    AND membership.status = 'ACTIVE'
    AND membership.valid_from <= now()
    AND (membership.valid_to IS NULL OR membership.valid_to > now())
  FOR UPDATE;
  IF v_staff.id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_mandate
  FROM public.management_mandates mandate
  WHERE mandate.id = v_assignment.mandate_id
    AND mandate.workspace_id = v_assignment.workspace_id
    AND mandate.agency_id = v_assignment.agency_id
    AND mandate.status = 'ACTIVE'
    AND mandate.verification_status = 'VERIFIED'
    AND mandate.valid_from <= now()
    AND (mandate.valid_to IS NULL OR mandate.valid_to > now())
  FOR UPDATE;
  IF v_mandate.id IS NULL THEN RETURN NULL; END IF;

  SELECT grant_record.id INTO v_existing_grant_id
  FROM public.agency_workspace_grants grant_record
  WHERE grant_record.portfolio_assignment_id = v_assignment.id
    AND grant_record.organization_membership_id = v_staff.id
    AND grant_record.status = 'ACTIVE';
  IF v_existing_grant_id IS NOT NULL THEN RETURN v_existing_grant_id; END IF;

  v_role_key := private.agency_workspace_role(v_staff.organization_role);
  IF v_role_key IS NULL THEN RETURN NULL; END IF;

  SELECT membership.id, membership.status
  INTO v_workspace_membership_id, v_workspace_membership_status
  FROM public.workspace_memberships membership
  WHERE membership.workspace_id = v_assignment.workspace_id
    AND membership.profile_id = v_staff.profile_id
  FOR UPDATE;

  IF v_workspace_membership_id IS NULL THEN
    v_workspace_membership_id := gen_random_uuid();
    INSERT INTO public.workspace_memberships(
      id, workspace_id, profile_id, status, source, created_by_profile_id
    ) VALUES (
      v_workspace_membership_id, v_assignment.workspace_id, v_staff.profile_id,
      'ACTIVE', 'ADMIN', p_actor_profile_id
    );
    v_workspace_membership_created := true;
  ELSIF v_workspace_membership_status = 'SUSPENDED' THEN
    RETURN NULL;
  ELSE
    UPDATE public.workspace_memberships
    SET status = 'ACTIVE', updated_at = now()
    WHERE id = v_workspace_membership_id;
    v_workspace_membership_activated := v_workspace_membership_status <> 'ACTIVE';
  END IF;

  INSERT INTO public.membership_periods(
    workspace_id, membership_id, started_at, start_reason
  )
  SELECT v_assignment.workspace_id, v_workspace_membership_id, now(), 'AGENCY_PORTFOLIO_GRANT'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.membership_periods period
    WHERE period.workspace_id = v_assignment.workspace_id
      AND period.membership_id = v_workspace_membership_id
      AND period.ended_at IS NULL
  );

  SELECT assignment.id, assignment.source_delegation_id
  INTO v_role_assignment_id, v_delegation_id
  FROM public.role_assignments assignment
  WHERE assignment.workspace_id = v_assignment.workspace_id
    AND assignment.membership_id = v_workspace_membership_id
    AND assignment.role_key = v_role_key
    AND assignment.status = 'ACTIVE'
    AND assignment.valid_from <= now()
    AND (assignment.valid_to IS NULL OR assignment.valid_to > now())
    AND (
      (v_role_key = 'DELEGATE_OPERATIONS'
        AND assignment.source_mandate_id IS NULL
        AND assignment.source_delegation_id IS NOT NULL)
      OR (v_role_key = 'ACCOUNTANT'
        AND assignment.source_mandate_id IS NULL
        AND assignment.source_delegation_id IS NULL)
    )
  LIMIT 1;

  IF v_role_key = 'DELEGATE_OPERATIONS'
     AND v_role_assignment_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.delegations delegation
       WHERE delegation.id = v_delegation_id
         AND delegation.workspace_id = v_assignment.workspace_id
         AND delegation.beneficiary_membership_id = v_workspace_membership_id
         AND delegation.source_mandate_id = v_assignment.mandate_id
         AND delegation.status = 'ACTIVE'
         AND delegation.valid_from <= now()
         AND (delegation.valid_to IS NULL OR delegation.valid_to > now())
         AND delegation.can_redelegate = false
     ) THEN
    v_role_assignment_id := NULL;
    v_delegation_id := NULL;
  END IF;

  IF v_role_assignment_id IS NULL THEN
    IF v_role_key = 'DELEGATE_OPERATIONS' THEN
      v_delegation_id := gen_random_uuid();
      INSERT INTO public.delegations(
        id, workspace_id, source_mandate_id, granted_by_membership_id,
        beneficiary_membership_id, capability_keys, status,
        valid_from, valid_to, can_redelegate, reason
      ) VALUES (
        v_delegation_id, v_assignment.workspace_id, v_assignment.mandate_id,
        v_assignment.grantor_membership_id, v_workspace_membership_id,
        v_capabilities, 'ACTIVE', now(), v_assignment.valid_to, false,
        'AGENCY_PORTFOLIO_PROJECTION'
      );
      v_delegation_created := true;
    END IF;

    v_role_assignment_id := gen_random_uuid();
    INSERT INTO public.role_assignments(
      id, workspace_id, membership_id, role_key, source_mandate_id,
      source_delegation_id, status, valid_from, valid_to,
      granted_by_profile_id, reason
    ) VALUES (
      v_role_assignment_id, v_assignment.workspace_id, v_workspace_membership_id,
      v_role_key, NULL, v_delegation_id, 'ACTIVE', now(), v_assignment.valid_to,
      p_actor_profile_id, 'AGENCY_PORTFOLIO_PROJECTION'
    );
    v_role_assignment_created := true;
  END IF;

  INSERT INTO public.agency_workspace_grants(
    id, agency_id, workspace_id, portfolio_assignment_id,
    organization_membership_id, workspace_membership_id, delegation_id,
    role_assignment_id, role_key, status, workspace_membership_created,
    workspace_membership_activated, delegation_created, role_assignment_created
  ) VALUES (
    v_grant_id, v_assignment.agency_id, v_assignment.workspace_id, v_assignment.id,
    v_staff.id, v_workspace_membership_id, v_delegation_id,
    v_role_assignment_id, v_role_key, 'ACTIVE', v_workspace_membership_created,
    v_workspace_membership_activated, v_delegation_created, v_role_assignment_created
  );

  PERFORM private.project_legacy_workspace_role(
    v_assignment.workspace_id, v_staff.profile_id, v_role_key, true
  );
  RETURN v_grant_id;
END;
$$;

REVOKE ALL ON FUNCTION private.project_agency_staff_access(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.revoke_agency_workspace_grant(
  p_grant_id uuid,
  p_actor_profile_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_grant public.agency_workspace_grants%ROWTYPE;
  v_profile_id uuid;
BEGIN
  SELECT * INTO v_grant
  FROM public.agency_workspace_grants grant_record
  WHERE grant_record.id = p_grant_id AND grant_record.status = 'ACTIVE'
  FOR UPDATE;
  IF v_grant.id IS NULL THEN RETURN; END IF;

  SELECT membership.profile_id INTO v_profile_id
  FROM public.workspace_memberships membership
  WHERE membership.id = v_grant.workspace_membership_id;

  IF v_grant.role_assignment_created THEN
    UPDATE public.role_assignments
    SET status = 'REVOKED',
        valid_to = GREATEST(clock_timestamp(), valid_from + interval '1 microsecond'),
        revoked_by_profile_id = p_actor_profile_id, reason = p_reason,
        updated_at = clock_timestamp()
    WHERE id = v_grant.role_assignment_id AND status = 'ACTIVE';
  END IF;
  IF v_grant.delegation_created AND v_grant.delegation_id IS NOT NULL THEN
    UPDATE public.delegations
    SET status = 'REVOKED',
        valid_to = GREATEST(clock_timestamp(), valid_from + interval '1 microsecond'),
        reason = p_reason, updated_at = clock_timestamp()
    WHERE id = v_grant.delegation_id AND status = 'ACTIVE';
  END IF;

  UPDATE public.agency_workspace_grants
  SET status = 'REVOKED', revoked_at = now(),
      revoked_by_profile_id = p_actor_profile_id, revoke_reason = p_reason
  WHERE id = v_grant.id;

  IF NOT EXISTS (
    SELECT 1 FROM public.role_assignments assignment
    WHERE assignment.workspace_id = v_grant.workspace_id
      AND assignment.membership_id = v_grant.workspace_membership_id
      AND assignment.role_key = v_grant.role_key
      AND assignment.status = 'ACTIVE'
      AND assignment.valid_from <= now()
      AND (assignment.valid_to IS NULL OR assignment.valid_to > now())
  ) THEN
    PERFORM private.project_legacy_workspace_role(
      v_grant.workspace_id, v_profile_id, v_grant.role_key, false
    );
  END IF;

  IF (v_grant.workspace_membership_created OR v_grant.workspace_membership_activated)
     AND NOT EXISTS (
       SELECT 1 FROM public.role_assignments assignment
       WHERE assignment.workspace_id = v_grant.workspace_id
         AND assignment.membership_id = v_grant.workspace_membership_id
         AND assignment.status = 'ACTIVE'
         AND assignment.valid_from <= now()
         AND (assignment.valid_to IS NULL OR assignment.valid_to > now())
     )
     AND NOT private.has_verified_unit_relationship(v_profile_id, v_grant.workspace_id, NULL) THEN
    UPDATE public.workspace_memberships
    SET status = 'ENDED', updated_at = now()
    WHERE id = v_grant.workspace_membership_id;
    UPDATE public.membership_periods
    SET ended_at = GREATEST(clock_timestamp(), started_at + interval '1 microsecond'),
        end_reason = p_reason
    WHERE workspace_id = v_grant.workspace_id
      AND membership_id = v_grant.workspace_membership_id
      AND ended_at IS NULL;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.revoke_agency_workspace_grant(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_management_agency(
  p_agency_name text,
  p_legal_name text,
  p_registration_number text,
  p_tax_number text,
  p_license_reference text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  organization_role text,
  command_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_agency_id uuid := gen_random_uuid();
  v_agency_name text := BTRIM(COALESCE(p_agency_name, ''));
  v_legal_name text := BTRIM(COALESCE(p_legal_name, ''));
  v_request_fingerprint text;
  v_existing_detail public.management_agency_details%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF p_idempotency_key IS NULL OR length(v_agency_name) NOT BETWEEN 2 AND 255
     OR length(v_legal_name) NOT BETWEEN 2 AND 255
     OR length(COALESCE(p_registration_number, '')) > 80
     OR length(COALESCE(p_tax_number, '')) > 50
     OR length(COALESCE(p_license_reference, '')) > 220 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Agency data is invalid',
      DETAIL = '{"error_code":"AGENCY_INPUT_INVALID"}';
  END IF;

  v_request_fingerprint := encode(
    digest(
      jsonb_build_object(
        'agency_name', v_agency_name,
        'legal_name', v_legal_name,
        'registration_number', COALESCE(NULLIF(BTRIM(p_registration_number), ''), ''),
        'tax_number', COALESCE(NULLIF(BTRIM(p_tax_number), ''), ''),
        'license_reference', COALESCE(NULLIF(BTRIM(p_license_reference), ''), '')
      )::text,
      'sha256'
    ),
    'hex'
  );

  v_existing := private.lock_idempotent_command(v_actor, 'create_management_agency', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_existing_detail
    FROM public.management_agency_details detail
    WHERE detail.organization_id = v_existing;
    IF v_existing_detail.organization_id IS NULL
       OR v_existing_detail.creation_request_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Idempotency key was used for another agency command',
        DETAIL = '{"error_code":"IDEMPOTENCY_CONFLICT"}';
    END IF;
    RETURN QUERY
    SELECT detail.organization_id, detail.agency_name, 'AGENCY_OWNER'::text, 'EXISTING'::text
    FROM public.management_agency_details detail
    WHERE detail.organization_id = v_existing;
    RETURN;
  END IF;

  INSERT INTO public.parties(id, party_type, display_name, status)
  VALUES (v_agency_id, 'ORGANIZATION', v_agency_name, 'ACTIVE');
  INSERT INTO public.organizations(
    party_id, legal_name, registration_number, tax_number, country_code
  ) VALUES (
    v_agency_id, v_legal_name, NULLIF(BTRIM(p_registration_number), ''),
    NULLIF(BTRIM(p_tax_number), ''), 'HU'
  );
  INSERT INTO public.management_agency_details(
    organization_id, agency_name, license_reference, creation_request_fingerprint
  ) VALUES (
    v_agency_id, v_agency_name, NULLIF(BTRIM(p_license_reference), ''),
    v_request_fingerprint
  );
  INSERT INTO public.organization_memberships(
    organization_id, profile_id, organization_role, status, valid_from
  ) VALUES (
    v_agency_id, v_actor, 'AGENCY_OWNER', 'ACTIVE', now()
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'create_management_agency', p_idempotency_key, v_agency_id
  );
  PERFORM private.write_authorization_event(
    NULL, 'MANAGEMENT_AGENCY_CREATED', 'management_agency', v_agency_id,
    'STATE_CHANGE', 'SELF_SERVICE_ROOT_NO_TENANT_ACCESS', '{}'::jsonb
  );
  RETURN QUERY SELECT v_agency_id, v_agency_name, 'AGENCY_OWNER'::text, 'CREATED'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.create_management_agency(text, text, text, text, text, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_management_agency(text, text, text, text, text, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_management_agencies()
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  legal_name text,
  registration_number text,
  tax_number text,
  organization_role text,
  staff_count bigint,
  workspace_count bigint,
  member_since timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT detail.organization_id, detail.agency_name, organization.legal_name,
    organization.registration_number, organization.tax_number,
    membership.organization_role,
    (SELECT COUNT(*) FROM public.organization_memberships staff
      WHERE staff.organization_id = detail.organization_id
        AND staff.status = 'ACTIVE'
        AND staff.valid_from <= now()
        AND (staff.valid_to IS NULL OR staff.valid_to > now())),
    (SELECT COUNT(*) FROM public.agency_portfolio_assignments assignment
      WHERE assignment.agency_id = detail.organization_id
        AND assignment.status = 'ACTIVE'
        AND assignment.valid_from <= now()
        AND (assignment.valid_to IS NULL OR assignment.valid_to > now())),
    membership.valid_from
  FROM public.organization_memberships membership
  JOIN public.management_agency_details detail
    ON detail.organization_id = membership.organization_id
  JOIN public.organizations organization
    ON organization.party_id = detail.organization_id
  WHERE membership.profile_id = auth.uid()
    AND membership.status = 'ACTIVE'
    AND membership.valid_from <= now()
    AND (membership.valid_to IS NULL OR membership.valid_to > now())
  ORDER BY detail.agency_name, detail.organization_id;
$$;

REVOKE ALL ON FUNCTION public.list_my_management_agencies() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_my_management_agencies() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_agency_staff(p_agency_id uuid)
RETURNS TABLE (
  organization_membership_id uuid,
  profile_id uuid,
  display_name text,
  email text,
  organization_role text,
  membership_status text,
  valid_from timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  PERFORM private.require_agency_admin(auth.uid(), p_agency_id);
  RETURN QUERY
  SELECT membership.id, membership.profile_id,
    COALESCE(profile.full_name, profile.email, '—'), profile.email,
    membership.organization_role, membership.status, membership.valid_from
  FROM public.organization_memberships membership
  JOIN public.profiles profile ON profile.id = membership.profile_id
  WHERE membership.organization_id = p_agency_id
    AND membership.status = 'ACTIVE'
    AND membership.valid_from <= now()
    AND (membership.valid_to IS NULL OR membership.valid_to > now())
  ORDER BY membership.organization_role, profile.full_name, profile.email;
END;
$$;

REVOKE ALL ON FUNCTION public.list_agency_staff(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_agency_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_agency_portfolio(p_agency_id uuid)
RETURNS TABLE (
  portfolio_assignment_id uuid,
  workspace_id uuid,
  workspace_name text,
  formatted_address text,
  assignment_status text,
  valid_from timestamptz,
  valid_to timestamptz,
  staff_grant_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships membership
    WHERE membership.organization_id = p_agency_id
      AND membership.profile_id = auth.uid()
      AND membership.status = 'ACTIVE'
      AND membership.valid_from <= now()
      AND (membership.valid_to IS NULL OR membership.valid_to > now())
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Agency membership is required',
      DETAIL = '{"error_code":"AGENCY_MEMBERSHIP_REQUIRED"}';
  END IF;

  RETURN QUERY
  SELECT assignment.id, assignment.workspace_id, workspace.name,
    COALESCE(address.formatted_address, building.address), assignment.status,
    assignment.valid_from, assignment.valid_to,
    (SELECT COUNT(*) FROM public.agency_workspace_grants grant_record
      WHERE grant_record.portfolio_assignment_id = assignment.id
        AND grant_record.status = 'ACTIVE')
  FROM public.agency_portfolio_assignments assignment
  JOIN public.workspaces workspace ON workspace.id = assignment.workspace_id
  LEFT JOIN public.buildings building ON building.id = assignment.workspace_id
  LEFT JOIN public.workspace_buildings workspace_building
    ON workspace_building.workspace_id = assignment.workspace_id
   AND workspace_building.is_primary AND workspace_building.valid_to IS NULL
  LEFT JOIN public.building_address_assignments address_assignment
    ON address_assignment.physical_building_id = workspace_building.physical_building_id
   AND address_assignment.assignment_role = 'PRIMARY' AND address_assignment.valid_to IS NULL
  LEFT JOIN public.addresses address
    ON address.id = address_assignment.address_id AND address.valid_to IS NULL
  WHERE assignment.agency_id = p_agency_id
  ORDER BY (assignment.status = 'ACTIVE') DESC, workspace.name, assignment.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.list_agency_portfolio(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_agency_portfolio(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_agency_staff_invitation(
  p_agency_id uuid,
  p_email text,
  p_organization_role text,
  p_expires_at timestamptz,
  p_idempotency_key uuid
)
RETURNS TABLE (
  invitation_id uuid,
  invitation_token text,
  invitation_status text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_role text := upper(btrim(COALESCE(p_organization_role, '')));
  v_existing uuid;
  v_existing_invitation public.agency_staff_invitations%ROWTYPE;
  v_invitation_id uuid := gen_random_uuid();
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_actor_email text := lower(btrim(COALESCE(auth.jwt() ->> 'email', '')));
  v_request_fingerprint text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  PERFORM private.require_recent_aal2(interval '15 minutes');
  PERFORM private.require_agency_admin(v_actor, p_agency_id);
  IF v_actor_email = '' THEN
    SELECT lower(btrim(profile.email)) INTO v_actor_email
    FROM public.profiles profile WHERE profile.id = v_actor;
  END IF;
  IF p_idempotency_key IS NULL OR v_role NOT IN ('AGENCY_ADMIN', 'PORTFOLIO_MANAGER', 'OPERATIONS', 'ACCOUNTANT')
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     OR length(v_email) > 254 OR v_email = v_actor_email
     OR p_expires_at <= now() OR p_expires_at > now() + interval '30 days' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Agency staff invitation is invalid',
      DETAIL = '{"error_code":"AGENCY_STAFF_INVITATION_INVALID"}';
  END IF;

  v_request_fingerprint := encode(
    digest(
      jsonb_build_object(
        'agency_id', p_agency_id,
        'email', v_email,
        'organization_role', v_role,
        'expires_at', p_expires_at
      )::text,
      'sha256'
    ),
    'hex'
  );

  v_existing := private.lock_idempotent_command(v_actor, 'issue_agency_staff_invitation', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_existing_invitation
    FROM public.agency_staff_invitations invitation
    WHERE invitation.id = v_existing AND invitation.agency_id = p_agency_id;
    IF v_existing_invitation.id IS NULL
       OR v_existing_invitation.request_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Idempotency key was used for another agency invitation',
        DETAIL = '{"error_code":"IDEMPOTENCY_CONFLICT"}';
    END IF;
    RETURN QUERY SELECT v_existing_invitation.id, NULL::text,
      v_existing_invitation.status, v_existing_invitation.expires_at;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organization_memberships membership
    JOIN public.profiles profile ON profile.id = membership.profile_id
    WHERE membership.organization_id = p_agency_id
      AND lower(btrim(profile.email)) = v_email
      AND membership.status = 'ACTIVE'
      AND membership.valid_from <= now()
      AND (membership.valid_to IS NULL OR membership.valid_to > now())
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'This account is already active agency staff',
      DETAIL = '{"error_code":"AGENCY_STAFF_ALREADY_ACTIVE"}';
  END IF;

  UPDATE public.agency_staff_invitations invitation
  SET status = 'EXPIRED', updated_at = clock_timestamp()
  WHERE invitation.agency_id = p_agency_id
    AND invitation.invited_email_normalized = v_email
    AND invitation.status = 'PENDING'
    AND invitation.expires_at <= now();

  IF EXISTS (
    SELECT 1 FROM public.agency_staff_invitations invitation
    WHERE invitation.agency_id = p_agency_id
      AND invitation.invited_email_normalized = v_email
      AND invitation.status = 'PENDING'
      AND invitation.expires_at > now()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'A pending invitation already exists',
      DETAIL = '{"error_code":"AGENCY_STAFF_INVITATION_ALREADY_PENDING"}';
  END IF;

  INSERT INTO public.agency_staff_invitations(
    id, agency_id, invited_email_normalized, organization_role, token_hash,
    status, expires_at, invited_by_profile_id, idempotency_key, request_fingerprint
  ) VALUES (
    v_invitation_id, p_agency_id, v_email, v_role,
    encode(digest(v_token, 'sha256'), 'hex'), 'PENDING', p_expires_at,
    v_actor, p_idempotency_key, v_request_fingerprint
  );
  PERFORM private.record_idempotent_command(
    v_actor, 'issue_agency_staff_invitation', p_idempotency_key, v_invitation_id
  );
  PERFORM private.write_authorization_event(
    NULL, 'AGENCY_STAFF_INVITATION_ISSUED', 'agency_staff_invitation', v_invitation_id,
    'STATE_CHANGE', v_role, jsonb_build_object('agency_id', p_agency_id, 'expires_at', p_expires_at)
  );
  RETURN QUERY SELECT v_invitation_id, v_token, 'PENDING'::text, p_expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_agency_staff_invitation(uuid, text, text, timestamptz, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.issue_agency_staff_invitation(uuid, text, text, timestamptz, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_agency_staff_invitation(p_token text)
RETURNS TABLE (
  agency_id uuid,
  organization_membership_id uuid,
  organization_role text,
  projected_workspace_count integer,
  invitation_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_email text := lower(btrim(COALESCE(auth.jwt() ->> 'email', '')));
  v_invitation public.agency_staff_invitations%ROWTYPE;
  v_existing_membership public.organization_memberships%ROWTYPE;
  v_membership_id uuid;
  v_assignment record;
  v_projected_count integer := 0;
BEGIN
  IF v_actor IS NULL OR p_token IS NULL OR p_token !~ '^[0-9a-fA-F]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Agency invitation token is invalid',
      DETAIL = '{"error_code":"AGENCY_INVITATION_TOKEN_INVALID"}';
  END IF;
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF v_actor_email = '' THEN
    SELECT lower(btrim(profile.email)) INTO v_actor_email
    FROM public.profiles profile WHERE profile.id = v_actor;
  END IF;

  SELECT * INTO v_invitation
  FROM public.agency_staff_invitations invitation
  WHERE invitation.token_hash = encode(digest(lower(p_token), 'sha256'), 'hex')
  FOR UPDATE;
  IF v_invitation.id IS NULL OR v_invitation.invited_email_normalized <> v_actor_email THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Agency invitation does not belong to this account',
      DETAIL = '{"error_code":"AGENCY_INVITATION_EMAIL_MISMATCH"}';
  END IF;
  IF v_invitation.status = 'ACCEPTED' AND v_invitation.accepted_by_profile_id = v_actor THEN
    RETURN QUERY SELECT v_invitation.agency_id,
      v_invitation.accepted_organization_membership_id,
      v_invitation.organization_role, 0, 'ACCEPTED'::text;
    RETURN;
  END IF;
  IF v_invitation.status <> 'PENDING' OR v_invitation.expires_at <= now() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Agency invitation is no longer active',
      DETAIL = '{"error_code":"AGENCY_INVITATION_INACTIVE"}';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships membership
    JOIN public.management_agency_details detail
      ON detail.organization_id = membership.organization_id
    JOIN public.parties party
      ON party.id = detail.organization_id
     AND party.status = 'ACTIVE'
    WHERE membership.organization_id = v_invitation.agency_id
      AND membership.profile_id = v_invitation.invited_by_profile_id
      AND membership.organization_role IN ('AGENCY_OWNER', 'AGENCY_ADMIN')
      AND membership.status = 'ACTIVE'
      AND membership.valid_from <= now()
      AND (membership.valid_to IS NULL OR membership.valid_to > now())
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Agency invitation issuer authority is no longer active',
      DETAIL = '{"error_code":"INVITATION_GRANTOR_AUTHORITY_EXPIRED"}';
  END IF;

  SELECT * INTO v_existing_membership
  FROM public.organization_memberships membership
  WHERE membership.organization_id = v_invitation.agency_id
    AND membership.profile_id = v_actor
  ORDER BY
    (membership.status = 'ACTIVE'
      AND membership.valid_from <= now()
      AND (membership.valid_to IS NULL OR membership.valid_to > now())) DESC,
    membership.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_existing_membership.status = 'SUSPENDED' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Suspended agency staff cannot rejoin by invitation',
      DETAIL = '{"error_code":"AGENCY_STAFF_SUSPENDED"}';
  ELSIF v_existing_membership.id IS NOT NULL
        AND v_existing_membership.status = 'ACTIVE'
        AND v_existing_membership.valid_from <= now()
        AND (v_existing_membership.valid_to IS NULL OR v_existing_membership.valid_to > now()) THEN
    IF v_existing_membership.organization_role IS DISTINCT FROM v_invitation.organization_role THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501', MESSAGE = 'Existing agency role conflicts with the invitation',
        DETAIL = '{"error_code":"AGENCY_MEMBERSHIP_ROLE_CONFLICT"}';
    END IF;
    v_membership_id := v_existing_membership.id;
  ELSIF v_existing_membership.id IS NOT NULL
        AND v_existing_membership.status = 'PENDING' THEN
    UPDATE public.organization_memberships
    SET organization_role = v_invitation.organization_role,
        status = 'ACTIVE', valid_from = clock_timestamp(), valid_to = NULL
    WHERE id = v_existing_membership.id;
    v_membership_id := v_existing_membership.id;
  ELSE
    IF v_existing_membership.id IS NOT NULL
       AND v_existing_membership.status = 'ACTIVE' THEN
      UPDATE public.organization_memberships
      SET status = 'ENDED'
      WHERE id = v_existing_membership.id;
    END IF;
    v_membership_id := gen_random_uuid();
    INSERT INTO public.organization_memberships(
      id, organization_id, profile_id, organization_role, status, valid_from
    ) VALUES (
      v_membership_id, v_invitation.agency_id, v_actor,
      v_invitation.organization_role, 'ACTIVE', now()
    );
  END IF;

  UPDATE public.agency_staff_invitations
  SET status = 'ACCEPTED', accepted_by_profile_id = v_actor,
      accepted_organization_membership_id = v_membership_id,
      accepted_at = now(), updated_at = now()
  WHERE id = v_invitation.id;

  FOR v_assignment IN
    SELECT assignment.id
    FROM public.agency_portfolio_assignments assignment
    WHERE assignment.agency_id = v_invitation.agency_id
      AND assignment.status = 'ACTIVE'
      AND assignment.valid_from <= now()
      AND (assignment.valid_to IS NULL OR assignment.valid_to > now())
  LOOP
    IF private.project_agency_staff_access(v_assignment.id, v_membership_id, v_actor) IS NOT NULL THEN
      v_projected_count := v_projected_count + 1;
    END IF;
  END LOOP;

  PERFORM private.write_authorization_event(
    NULL, 'AGENCY_STAFF_INVITATION_ACCEPTED', 'organization_membership', v_membership_id,
    'STATE_CHANGE', v_invitation.organization_role,
    jsonb_build_object('agency_id', v_invitation.agency_id, 'projected_workspace_count', v_projected_count)
  );
  RETURN QUERY SELECT v_invitation.agency_id, v_membership_id,
    v_invitation.organization_role, v_projected_count, 'ACCEPTED'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_agency_staff_invitation(text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.accept_agency_staff_invitation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_agency_to_workspace(
  p_agency_id uuid,
  p_workspace_id uuid,
  p_appointment_reference text,
  p_valid_to timestamptz,
  p_idempotency_key uuid
)
RETURNS TABLE (
  portfolio_assignment_id uuid,
  mandate_id uuid,
  projected_staff_count integer,
  assignment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_existing_assignment public.agency_portfolio_assignments%ROWTYPE;
  v_grantor_membership_id uuid;
  v_source_mandate_valid_to timestamptz;
  v_assignment_id uuid := gen_random_uuid();
  v_mandate_id uuid := gen_random_uuid();
  v_staff record;
  v_projected_count integer := 0;
  v_reference text := btrim(COALESCE(p_appointment_reference, ''));
  v_effective_valid_to timestamptz;
  v_request_fingerprint text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  PERFORM private.require_recent_aal2(interval '15 minutes');
  PERFORM private.require_agency_admin(v_actor, p_agency_id);
  IF p_workspace_id IS NULL OR p_idempotency_key IS NULL
     OR v_reference !~ '^signed-mandate:[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$'
     OR (p_valid_to IS NOT NULL AND p_valid_to <= now()) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Agency portfolio assignment is invalid',
      DETAIL = '{"error_code":"AGENCY_PORTFOLIO_INPUT_INVALID"}';
  END IF;

  v_request_fingerprint := encode(
    digest(
      jsonb_build_object(
        'agency_id', p_agency_id,
        'workspace_id', p_workspace_id,
        'appointment_reference', v_reference,
        'valid_to', p_valid_to
      )::text,
      'sha256'
    ),
    'hex'
  );

  v_existing := private.lock_idempotent_command(v_actor, 'assign_agency_to_workspace', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_existing_assignment
    FROM public.agency_portfolio_assignments assignment
    WHERE assignment.id = v_existing;
    IF v_existing_assignment.id IS NULL
       OR v_existing_assignment.agency_id IS DISTINCT FROM p_agency_id
       OR v_existing_assignment.workspace_id IS DISTINCT FROM p_workspace_id
       OR v_existing_assignment.request_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Idempotency key was used for another portfolio assignment',
        DETAIL = '{"error_code":"IDEMPOTENCY_CONFLICT"}';
    END IF;
    RETURN QUERY
    SELECT assignment.id, assignment.mandate_id,
      (SELECT COUNT(*)::integer FROM public.agency_workspace_grants grant_record
       WHERE grant_record.portfolio_assignment_id = assignment.id AND grant_record.status = 'ACTIVE'),
      assignment.status
    FROM public.agency_portfolio_assignments assignment
    WHERE assignment.id = v_existing;
    RETURN;
  END IF;

  SELECT membership.id, mandate.valid_to
  INTO v_grantor_membership_id, v_source_mandate_valid_to
  FROM public.workspace_memberships membership
  JOIN public.membership_periods period
    ON period.workspace_id = membership.workspace_id
   AND period.membership_id = membership.id
   AND period.ended_at IS NULL
  JOIN public.role_assignments role_assignment
    ON role_assignment.workspace_id = membership.workspace_id
   AND role_assignment.membership_id = membership.id
   AND role_assignment.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
   AND role_assignment.status = 'ACTIVE'
   AND role_assignment.valid_from <= now()
   AND (role_assignment.valid_to IS NULL OR role_assignment.valid_to > now())
  JOIN public.management_mandates mandate
    ON mandate.workspace_id = role_assignment.workspace_id
   AND mandate.id = role_assignment.source_mandate_id
   AND mandate.agency_id IS NULL
   AND mandate.status = 'ACTIVE'
   AND mandate.verification_status = 'VERIFIED'
   AND mandate.valid_from <= now()
   AND (mandate.valid_to IS NULL OR mandate.valid_to > now())
  WHERE membership.workspace_id = p_workspace_id
    AND membership.profile_id = v_actor
    AND membership.status = 'ACTIVE'
  ORDER BY mandate.created_at DESC
  LIMIT 1;
  IF v_grantor_membership_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A current direct mandate-backed admin is required',
      DETAIL = '{"error_code":"DIRECT_ADMIN_GRANT_REQUIRED"}';
  END IF;
  IF p_valid_to IS NOT NULL AND v_source_mandate_valid_to IS NOT NULL
     AND p_valid_to > v_source_mandate_valid_to THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Agency assignment cannot outlive the source mandate',
      DETAIL = '{"error_code":"AGENCY_PORTFOLIO_VALIDITY_EXCEEDS_SOURCE"}';
  END IF;
  v_effective_valid_to := COALESCE(p_valid_to, v_source_mandate_valid_to);
  IF EXISTS (
    SELECT 1 FROM public.agency_portfolio_assignments assignment
    WHERE assignment.workspace_id = p_workspace_id AND assignment.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Workspace already has an active agency assignment',
      DETAIL = '{"error_code":"AGENCY_PORTFOLIO_ALREADY_ASSIGNED"}';
  END IF;

  INSERT INTO public.management_mandates(
    id, workspace_id, mandate_party_id, agency_id, mandate_type,
    status, verification_status, evidence_reference, appointment_reference,
    valid_from, valid_to, created_by_profile_id
  ) VALUES (
    v_mandate_id, p_workspace_id, p_agency_id, p_agency_id, 'COMMON_REPRESENTATIVE',
    'ACTIVE', 'VERIFIED', v_reference, v_reference,
    now(), v_effective_valid_to, v_actor
  );
  INSERT INTO public.agency_portfolio_assignments(
    id, agency_id, workspace_id, mandate_id, grantor_membership_id,
    status, appointment_reference, valid_from, valid_to,
    assigned_by_profile_id, idempotency_key, request_fingerprint
  ) VALUES (
    v_assignment_id, p_agency_id, p_workspace_id, v_mandate_id,
    v_grantor_membership_id, 'ACTIVE', v_reference, now(), v_effective_valid_to,
    v_actor, p_idempotency_key, v_request_fingerprint
  );

  FOR v_staff IN
    SELECT membership.id
    FROM public.organization_memberships membership
    WHERE membership.organization_id = p_agency_id
      AND membership.status = 'ACTIVE'
      AND membership.valid_from <= now()
      AND (membership.valid_to IS NULL OR membership.valid_to > now())
  LOOP
    IF private.project_agency_staff_access(v_assignment_id, v_staff.id, v_actor) IS NOT NULL THEN
      v_projected_count := v_projected_count + 1;
    END IF;
  END LOOP;

  PERFORM private.record_idempotent_command(
    v_actor, 'assign_agency_to_workspace', p_idempotency_key, v_assignment_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id, 'AGENCY_PORTFOLIO_ASSIGNED', 'agency_portfolio_assignment', v_assignment_id,
    'STATE_CHANGE', 'VERIFIED_AGENCY_MANDATE',
    jsonb_build_object('agency_id', p_agency_id, 'mandate_id', v_mandate_id, 'projected_staff_count', v_projected_count)
  );
  RETURN QUERY SELECT v_assignment_id, v_mandate_id, v_projected_count, 'ACTIVE'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_agency_to_workspace(uuid, uuid, text, timestamptz, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.assign_agency_to_workspace(uuid, uuid, text, timestamptz, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_agency_staff_membership(
  p_agency_id uuid,
  p_organization_membership_id uuid,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS TABLE (organization_membership_id uuid, membership_status text, revoked_grant_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target public.organization_memberships%ROWTYPE;
  v_grant record;
  v_count integer := 0;
  v_existing uuid;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_request_fingerprint text;
  v_target_email text;
BEGIN
  PERFORM private.require_recent_aal2(interval '15 minutes');
  PERFORM private.require_agency_admin(v_actor, p_agency_id);
  IF p_idempotency_key IS NULL OR length(v_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Agency staff revocation is invalid',
      DETAIL = '{"error_code":"AGENCY_STAFF_REVOCATION_INVALID"}';
  END IF;
  v_request_fingerprint := encode(
    digest(
      jsonb_build_object(
        'agency_id', p_agency_id,
        'organization_membership_id', p_organization_membership_id,
        'reason', v_reason
      )::text,
      'sha256'
    ),
    'hex'
  );
  v_existing := private.lock_idempotent_command(v_actor, 'revoke_agency_staff_membership', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_target
    FROM public.organization_memberships membership
    WHERE membership.id = v_existing
      AND membership.organization_id = p_agency_id;
    IF v_target.id IS NULL
       OR v_target.id IS DISTINCT FROM p_organization_membership_id
       OR v_target.agency_revocation_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Idempotency key was used for another agency staff revocation',
        DETAIL = '{"error_code":"IDEMPOTENCY_CONFLICT"}';
    END IF;
    RETURN QUERY SELECT v_existing, 'ENDED'::text, 0;
    RETURN;
  END IF;

  SELECT * INTO v_target
  FROM public.organization_memberships membership
  WHERE membership.id = p_organization_membership_id
    AND membership.organization_id = p_agency_id
  FOR UPDATE;
  IF v_target.id IS NULL OR v_target.organization_role = 'AGENCY_OWNER' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Agency owner cannot be revoked by this command',
      DETAIL = '{"error_code":"AGENCY_OWNER_REVOCATION_FORBIDDEN"}';
  END IF;
  IF v_target.status <> 'ACTIVE' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Agency staff membership is not active',
      DETAIL = '{"error_code":"AGENCY_STAFF_MEMBERSHIP_NOT_ACTIVE"}';
  END IF;

  SELECT lower(btrim(profile.email)) INTO v_target_email
  FROM public.profiles profile
  WHERE profile.id = v_target.profile_id;

  FOR v_grant IN
    SELECT grant_record.id FROM public.agency_workspace_grants grant_record
    WHERE grant_record.organization_membership_id = v_target.id AND grant_record.status = 'ACTIVE'
  LOOP
    PERFORM private.revoke_agency_workspace_grant(v_grant.id, v_actor, v_reason);
    v_count := v_count + 1;
  END LOOP;
  UPDATE public.agency_staff_invitations invitation
  SET status = 'REVOKED', revoked_at = clock_timestamp(),
      revoke_reason = v_reason, updated_at = clock_timestamp()
  WHERE invitation.agency_id = p_agency_id
    AND invitation.status = 'PENDING'
    AND (
      invitation.invited_by_profile_id = v_target.profile_id
      OR invitation.invited_email_normalized = v_target_email
    );
  UPDATE public.organization_memberships
  SET status = 'ENDED',
      valid_to = GREATEST(clock_timestamp(), valid_from + interval '1 microsecond'),
      agency_revocation_fingerprint = v_request_fingerprint
  WHERE id = v_target.id;

  PERFORM private.record_idempotent_command(
    v_actor, 'revoke_agency_staff_membership', p_idempotency_key, v_target.id
  );
  PERFORM private.write_authorization_event(
    NULL, 'AGENCY_STAFF_MEMBERSHIP_REVOKED', 'organization_membership', v_target.id,
    'STATE_CHANGE', v_reason, jsonb_build_object('agency_id', p_agency_id, 'revoked_grant_count', v_count)
  );
  RETURN QUERY SELECT v_target.id, 'ENDED'::text, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_agency_staff_membership(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_agency_staff_membership(uuid, uuid, text, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.end_agency_portfolio_assignment(
  p_portfolio_assignment_id uuid,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS TABLE (portfolio_assignment_id uuid, assignment_status text, revoked_grant_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_assignment public.agency_portfolio_assignments%ROWTYPE;
  v_existing uuid;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_grant record;
  v_count integer := 0;
  v_agency_admin boolean;
  v_direct_admin boolean;
  v_request_fingerprint text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF p_idempotency_key IS NULL OR length(v_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Portfolio termination is invalid',
      DETAIL = '{"error_code":"AGENCY_PORTFOLIO_TERMINATION_INVALID"}';
  END IF;
  v_request_fingerprint := encode(
    digest(
      jsonb_build_object(
        'portfolio_assignment_id', p_portfolio_assignment_id,
        'reason', v_reason
      )::text,
      'sha256'
    ),
    'hex'
  );
  v_existing := private.lock_idempotent_command(v_actor, 'end_agency_portfolio_assignment', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_assignment
    FROM public.agency_portfolio_assignments assignment
    WHERE assignment.id = v_existing;
    IF v_assignment.id IS NULL
       OR v_assignment.id IS DISTINCT FROM p_portfolio_assignment_id
       OR v_assignment.end_request_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Idempotency key was used for another portfolio termination',
        DETAIL = '{"error_code":"IDEMPOTENCY_CONFLICT"}';
    END IF;
    RETURN QUERY SELECT v_existing, 'ENDED'::text, 0;
    RETURN;
  END IF;

  SELECT * INTO v_assignment
  FROM public.agency_portfolio_assignments assignment
  WHERE assignment.id = p_portfolio_assignment_id
  FOR UPDATE;
  IF v_assignment.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Portfolio assignment was not found',
      DETAIL = '{"error_code":"AGENCY_PORTFOLIO_NOT_FOUND"}';
  END IF;
  IF v_assignment.status <> 'ACTIVE' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Portfolio assignment is not active',
      DETAIL = '{"error_code":"AGENCY_PORTFOLIO_NOT_ACTIVE"}';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships membership
    JOIN public.management_agency_details detail
      ON detail.organization_id = membership.organization_id
    JOIN public.parties party
      ON party.id = detail.organization_id
     AND party.status = 'ACTIVE'
    WHERE membership.organization_id = v_assignment.agency_id
      AND membership.profile_id = v_actor
      AND membership.organization_role IN ('AGENCY_OWNER', 'AGENCY_ADMIN')
      AND membership.status = 'ACTIVE'
      AND membership.valid_from <= now()
      AND (membership.valid_to IS NULL OR membership.valid_to > now())
  ) INTO v_agency_admin;
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_memberships membership
    JOIN public.membership_periods period
      ON period.workspace_id = membership.workspace_id
     AND period.membership_id = membership.id
     AND period.ended_at IS NULL
    JOIN public.role_assignments role_assignment
      ON role_assignment.workspace_id = membership.workspace_id
     AND role_assignment.membership_id = membership.id
     AND role_assignment.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
     AND role_assignment.status = 'ACTIVE'
     AND role_assignment.valid_from <= now()
     AND (role_assignment.valid_to IS NULL OR role_assignment.valid_to > now())
    JOIN public.management_mandates mandate
      ON mandate.workspace_id = role_assignment.workspace_id
     AND mandate.id = role_assignment.source_mandate_id
     AND mandate.agency_id IS NULL
     AND mandate.status = 'ACTIVE' AND mandate.verification_status = 'VERIFIED'
     AND mandate.valid_from <= now()
     AND (mandate.valid_to IS NULL OR mandate.valid_to > now())
    WHERE membership.workspace_id = v_assignment.workspace_id
      AND membership.profile_id = v_actor AND membership.status = 'ACTIVE'
  ) INTO v_direct_admin;
  IF NOT v_agency_admin AND NOT v_direct_admin THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Agency admin or direct workspace admin is required',
      DETAIL = '{"error_code":"AGENCY_PORTFOLIO_END_AUTHORITY_REQUIRED"}';
  END IF;

  FOR v_grant IN
    SELECT grant_record.id FROM public.agency_workspace_grants grant_record
    WHERE grant_record.portfolio_assignment_id = v_assignment.id AND grant_record.status = 'ACTIVE'
  LOOP
    PERFORM private.revoke_agency_workspace_grant(v_grant.id, v_actor, v_reason);
    v_count := v_count + 1;
  END LOOP;
  UPDATE public.agency_portfolio_assignments
  SET status = 'ENDED',
      valid_to = GREATEST(clock_timestamp(), valid_from + interval '1 microsecond'),
      ended_at = clock_timestamp(), ended_by_profile_id = v_actor,
      ended_reason = v_reason, end_request_fingerprint = v_request_fingerprint,
      updated_at = clock_timestamp()
  WHERE id = v_assignment.id;
  UPDATE public.management_mandates
  SET status = 'REVOKED', verification_status = 'ENDED',
      valid_to = GREATEST(clock_timestamp(), valid_from + interval '1 microsecond'),
      ended_reason = v_reason, updated_at = clock_timestamp()
  WHERE id = v_assignment.mandate_id AND workspace_id = v_assignment.workspace_id;

  PERFORM private.record_idempotent_command(
    v_actor, 'end_agency_portfolio_assignment', p_idempotency_key, v_assignment.id
  );
  PERFORM private.write_authorization_event(
    v_assignment.workspace_id, 'AGENCY_PORTFOLIO_ENDED', 'agency_portfolio_assignment', v_assignment.id,
    'STATE_CHANGE', v_reason,
    jsonb_build_object('agency_id', v_assignment.agency_id, 'revoked_grant_count', v_count)
  );
  RETURN QUERY SELECT v_assignment.id, 'ENDED'::text, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.end_agency_portfolio_assignment(uuid, text, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.end_agency_portfolio_assignment(uuid, text, uuid)
  TO authenticated;

COMMIT;
