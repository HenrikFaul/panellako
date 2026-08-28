-- PanelLako multi-tenancy foundation.
--
-- This migration is intentionally additive.  It introduces the authoritative
-- workspace/party/unit graph while retaining the legacy building UUID contract
-- used by /w/{uuid}.  RLS replacement for legacy tables is performed by the
-- following cut-over migration after reconciliation has proved every tenant row
-- mappable.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ---------------------------------------------------------------------------
-- Account profile bootstrap (account identity is not tenant authorization).
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'hu-HU',
  ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'Europe/Budapest',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.profiles
SET display_name = COALESCE(NULLIF(BTRIM(display_name), ''), NULLIF(BTRIM(full_name), ''), email)
WHERE display_name IS NULL OR BTRIM(display_name) = '';

ALTER TABLE public.profiles
  ALTER COLUMN display_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED_PENDING')) NOT VALID;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Tenant root, address identity and physical building topology.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_form text NOT NULL DEFAULT 'CONDOMINIUM',
  governance_mode text NOT NULL DEFAULT 'REPRESENTATIVE_MANAGED',
  governance_legal_basis text,
  status text NOT NULL DEFAULT 'PENDING_VERIFICATION',
  created_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  canonical_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT workspaces_governance_mode_check CHECK (
    governance_mode IN ('REPRESENTATIVE_MANAGED', 'BOARD_MANAGED', 'SELF_MANAGED')
  ),
  CONSTRAINT workspaces_status_check CHECK (
    status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'ARCHIVED', 'MERGED')
  ),
  CONSTRAINT workspaces_merge_target_check CHECK (
    (status = 'MERGED' AND canonical_workspace_id IS NOT NULL)
    OR (status <> 'MERGED' AND canonical_workspace_id IS NULL)
  )
);

CREATE OR REPLACE FUNCTION public.normalize_address_key(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT BTRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        LOWER(TRANSLATE(COALESCE(p_value, ''), '.,;:/\\-', '       ')),
        '\m(u|ucca)\M',
        'utca',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL DEFAULT 'HU',
  postal_code text,
  settlement text,
  district text,
  settlement_part text,
  street_name text,
  street_type text,
  house_number_from text,
  house_number_to text,
  house_number_suffix text,
  building_mark text,
  address_level text NOT NULL DEFAULT 'BUILDING',
  formatted_address text NOT NULL,
  canonical_key text NOT NULL,
  canonicalization_version integer NOT NULL DEFAULT 1,
  source_system text NOT NULL DEFAULT 'MANUAL',
  source_record_id text,
  verification_status text NOT NULL DEFAULT 'UNVERIFIED',
  latitude numeric(10,7),
  longitude numeric(10,7),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  superseded_by_address_id uuid REFERENCES public.addresses(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT addresses_level_check CHECK (
    address_level IN ('BUILDING', 'ENTRANCE', 'UNIT', 'POSTAL')
  ),
  CONSTRAINT addresses_verification_status_check CHECK (
    verification_status IN ('UNVERIFIED', 'SOURCE_MATCHED', 'VERIFIED', 'DISPUTED')
  ),
  CONSTRAINT addresses_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT addresses_coordinates_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS addresses_active_canonical_key_uq
  ON public.addresses (canonical_key, address_level)
  WHERE valid_to IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS addresses_verified_source_uq
  ON public.addresses (source_system, source_record_id)
  WHERE source_record_id IS NOT NULL AND valid_to IS NULL;
CREATE INDEX IF NOT EXISTS addresses_canonical_key_trgm_idx
  ON public.addresses USING gin (canonical_key gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.physical_buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  address_verification_status text NOT NULL DEFAULT 'UNVERIFIED',
  canonical_building_id uuid REFERENCES public.physical_buildings(id) ON DELETE RESTRICT,
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT physical_buildings_status_check CHECK (
    status IN ('CANDIDATE', 'ACTIVE', 'DISPUTED', 'MERGED', 'ARCHIVED')
  ),
  CONSTRAINT physical_buildings_merge_target_check CHECK (
    (status = 'MERGED' AND canonical_building_id IS NOT NULL)
    OR (status <> 'MERGED' AND canonical_building_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.building_address_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  physical_building_id uuid NOT NULL REFERENCES public.physical_buildings(id) ON DELETE CASCADE,
  address_id uuid NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  assignment_role text NOT NULL DEFAULT 'PRIMARY',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  is_verified boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'MIGRATION',
  created_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT building_address_assignment_role_check CHECK (
    assignment_role IN ('PRIMARY', 'ENTRANCE', 'POSTAL', 'HISTORICAL')
  ),
  CONSTRAINT building_address_assignment_validity_check CHECK (
    valid_to IS NULL OR valid_to > valid_from
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS building_one_active_primary_address_uq
  ON public.building_address_assignments (physical_building_id)
  WHERE assignment_role = 'PRIMARY' AND valid_to IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS address_one_active_primary_building_uq
  ON public.building_address_assignments (address_id)
  WHERE assignment_role = 'PRIMARY' AND valid_to IS NULL;

CREATE TABLE IF NOT EXISTS public.workspace_buildings (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  physical_building_id uuid NOT NULL REFERENCES public.physical_buildings(id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT false,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, physical_building_id),
  CONSTRAINT workspace_buildings_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_one_active_primary_building_uq
  ON public.workspace_buildings (workspace_id)
  WHERE is_primary AND valid_to IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS physical_building_one_active_workspace_uq
  ON public.workspace_buildings (physical_building_id)
  WHERE is_primary AND valid_to IS NULL;

-- ---------------------------------------------------------------------------
-- Domain identities. A party can exist without an authentication account.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  pii_ciphertext bytea,
  pii_key_reference uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parties_type_check CHECK (party_type IN ('PERSON', 'ORGANIZATION')),
  CONSTRAINT parties_status_check CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'PSEUDONYMIZED'))
);

CREATE TABLE IF NOT EXISTS public.people (
  party_id uuid PRIMARY KEY REFERENCES public.parties(id) ON DELETE CASCADE,
  preferred_name text,
  birth_year smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT people_birth_year_check CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2200)
);

CREATE TABLE IF NOT EXISTS public.organizations (
  party_id uuid PRIMARY KEY REFERENCES public.parties(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  registration_number text,
  tax_number text,
  country_code text NOT NULL DEFAULT 'HU',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.person_account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(party_id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'PENDING',
  verification_method text,
  verified_at timestamptz,
  verified_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  end_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_account_links_status_check CHECK (status IN ('PENDING', 'ACTIVE', 'ENDED')),
  CONSTRAINT person_account_links_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS person_account_links_one_active_profile_uq
  ON public.person_account_links (profile_id)
  WHERE status = 'ACTIVE' AND valid_to IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS person_account_links_one_active_person_uq
  ON public.person_account_links (person_id)
  WHERE status = 'ACTIVE' AND valid_to IS NULL;

CREATE TABLE IF NOT EXISTS public.management_agency_details (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(party_id) ON DELETE CASCADE,
  agency_name text NOT NULL,
  license_reference text,
  registry_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(party_id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_role text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_memberships_status_check CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED')),
  CONSTRAINT organization_memberships_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from),
  UNIQUE (organization_id, profile_id, valid_from)
);

CREATE INDEX IF NOT EXISTS organization_memberships_profile_active_idx
  ON public.organization_memberships (profile_id, organization_id)
  WHERE status = 'ACTIVE' AND valid_to IS NULL;

-- ---------------------------------------------------------------------------
-- Neutral workspace access, periods, roles, mandates and delegations.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workspace_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING',
  source text NOT NULL,
  created_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  primary_context_unit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_memberships_status_check CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED')),
  CONSTRAINT workspace_memberships_source_check CHECK (
    source IN ('INVITATION', 'JOIN_REQUEST', 'MIGRATION', 'ADMIN', 'BOOTSTRAP')
  ),
  CONSTRAINT workspace_memberships_workspace_id_id_uq UNIQUE (workspace_id, id),
  CONSTRAINT workspace_memberships_workspace_profile_uq UNIQUE (workspace_id, profile_id)
);

CREATE INDEX IF NOT EXISTS workspace_memberships_profile_active_idx
  ON public.workspace_memberships (profile_id, workspace_id)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.membership_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  start_reason text NOT NULL,
  end_reason text,
  source_invitation_id uuid,
  source_join_request_id uuid,
  created_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_periods_membership_fk
    FOREIGN KEY (workspace_id, membership_id)
    REFERENCES public.workspace_memberships(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT membership_periods_validity_check CHECK (ended_at IS NULL OR ended_at > started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS membership_periods_one_open_period_uq
  ON public.membership_periods (membership_id)
  WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS membership_periods_workspace_membership_idx
  ON public.membership_periods (workspace_id, membership_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.role_templates (
  role_key text PRIMARY KEY,
  display_name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_assignable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_capabilities (
  role_key text NOT NULL REFERENCES public.role_templates(role_key) ON DELETE CASCADE,
  capability_key text NOT NULL,
  risk_level text NOT NULL DEFAULT 'NORMAL',
  reauthentication_window interval,
  PRIMARY KEY (role_key, capability_key),
  CONSTRAINT role_capabilities_risk_check CHECK (risk_level IN ('NORMAL', 'HIGH'))
);

-- Stable bridge between database-internal policy keys and the frontend's
-- canonical lower.dotted capability vocabulary. effective_capabilities()
-- returns only canonical_key values.
CREATE TABLE IF NOT EXISTS public.capability_key_map (
  internal_key text PRIMARY KEY,
  canonical_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.capability_key_map (internal_key, canonical_key)
VALUES
  ('WORKSPACE_READ', 'workspace.read'),
  ('WORKSPACE_SETTINGS_READ', 'workspace.settings.read'),
  ('WORKSPACE_SETTINGS_MANAGE', 'workspace.settings.manage'),
  ('GOVERNANCE_MANAGE', 'workspace.governance.manage'),
  ('WORKSPACE_ARCHIVE', 'workspace.archive'),
  ('BUILDING_READ', 'building.read'),
  ('BUILDING_MANAGE', 'building.manage'),
  ('UNIT_DIRECTORY_READ_MASKED', 'unit.directory.read_masked'),
  ('UNIT_READ_ALL', 'unit.read_all'),
  ('UNIT_MANAGE', 'unit.manage'),
  ('MEMBERSHIP_INVITE', 'membership.invite'),
  ('MEMBERSHIP_REVIEW', 'membership.approve'),
  ('MEMBERSHIP_SUSPEND', 'membership.suspend'),
  ('UNIT_RELATION_PROPOSE', 'unit_relation.propose'),
  ('UNIT_RELATION_VERIFY', 'unit_relation.verify'),
  ('UNIT_LEGAL_RIGHT_VERIFY', 'unit_legal_right.verify'),
  ('ROLE_GRANT_LIMITED', 'role.grant_limited'),
  ('ROLE_GRANT_ADMIN', 'role.grant_admin'),
  ('DELEGATION_MANAGE', 'delegation.manage'),
  ('MANDATE_MANAGE', 'mandate.manage'),
  ('GOVERNANCE_TRANSFER', 'governance.transfer'),
  ('MEMBER_DIRECTORY_READ', 'member.directory.read_minimal'),
  ('MEMBER_CONTACT_READ', 'member.contact.read'),
  ('TICKET_CREATE', 'ticket.create'),
  ('TICKET_READ_OWN', 'ticket.read_own'),
  ('TICKET_MANAGE', 'ticket.manage_all'),
  ('METER_SUBMIT', 'meter.submit_own_unit'),
  ('METER_READ_OWN', 'meter.read_own_unit'),
  ('METER_MANAGE', 'meter.manage_all'),
  ('DOCUMENT_READ', 'document.common.read'),
  ('DOCUMENT_OWNER_READ', 'document.owner.read'),
  ('DOCUMENT_UNIT_READ', 'document.unit.read'),
  ('DOCUMENT_MANAGE', 'document.publish'),
  ('COMMUNICATION_READ', 'announcement.read'),
  ('COMMUNICATION_MANAGE', 'announcement.publish'),
  ('REMINDER_MANAGE', 'reminder.manage'),
  ('ENVIRONMENT_READ', 'environment.read'),
  ('FINANCE_UNIT_READ', 'finance.unit.read'),
  ('FINANCE_READ', 'finance.workspace.read'),
  ('FINANCE_WRITE', 'finance.write'),
  ('FINANCE_EXPORT', 'finance.export'),
  ('MEETING_READ', 'meeting.read'),
  ('MEETING_MANAGE', 'meeting.manage'),
  ('VOTE_CAST', 'vote.cast'),
  ('VOTE_AUDIT', 'vote.audit'),
  ('AUDIT_READ', 'audit.read'),
  ('BILLING_MANAGE', 'billing.manage')
ON CONFLICT (internal_key) DO UPDATE
SET canonical_key = EXCLUDED.canonical_key;

INSERT INTO public.role_templates (role_key, display_name, version, is_assignable)
VALUES
  ('COMMON_REPRESENTATIVE_ADMIN', 'Kozos kepviselo admin', 1, true),
  ('BOARD_ADMIN', 'Intézőbizottsági admin', 1, true),
  ('SELF_MANAGED_ADMIN', 'Közösségi koordinátor', 1, true),
  ('DELEGATE_OPERATIONS', 'Operatív megbízott', 1, true),
  ('COMMITTEE_OVERSIGHT', 'Felügyelőbizottsági betekintő', 1, true),
  ('ACCOUNTANT', 'Könyvelő', 1, true),
  ('BILLING_ADMIN', 'Számlázási admin', 1, true)
ON CONFLICT (role_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    version = EXCLUDED.version,
    is_assignable = EXCLUDED.is_assignable;

INSERT INTO public.role_capabilities (role_key, capability_key, risk_level, reauthentication_window)
SELECT role_key, capability_key, risk_level, reauthentication_window
FROM (VALUES
  ('COMMON_REPRESENTATIVE_ADMIN', 'WORKSPACE_READ', 'NORMAL', NULL::interval),
  ('COMMON_REPRESENTATIVE_ADMIN', 'UNIT_READ_ALL', 'NORMAL', NULL::interval),
  ('COMMON_REPRESENTATIVE_ADMIN', 'UNIT_MANAGE', 'HIGH', interval '15 minutes'),
  ('COMMON_REPRESENTATIVE_ADMIN', 'MEMBER_DIRECTORY_READ', 'NORMAL', NULL::interval),
  ('COMMON_REPRESENTATIVE_ADMIN', 'MEMBERSHIP_INVITE', 'HIGH', interval '15 minutes'),
  ('COMMON_REPRESENTATIVE_ADMIN', 'MEMBERSHIP_REVIEW', 'HIGH', interval '15 minutes'),
  ('COMMON_REPRESENTATIVE_ADMIN', 'TICKET_MANAGE', 'NORMAL', NULL::interval),
  ('COMMON_REPRESENTATIVE_ADMIN', 'DOCUMENT_MANAGE', 'HIGH', interval '15 minutes'),
  ('COMMON_REPRESENTATIVE_ADMIN', 'FINANCE_READ', 'NORMAL', NULL::interval),
  ('COMMON_REPRESENTATIVE_ADMIN', 'FINANCE_WRITE', 'HIGH', interval '15 minutes'),
  ('COMMON_REPRESENTATIVE_ADMIN', 'MEETING_MANAGE', 'HIGH', interval '15 minutes'),
  ('COMMON_REPRESENTATIVE_ADMIN', 'COMMUNICATION_MANAGE', 'NORMAL', NULL::interval),
  ('COMMON_REPRESENTATIVE_ADMIN', 'VENDOR_MANAGE', 'NORMAL', NULL::interval),
  ('COMMON_REPRESENTATIVE_ADMIN', 'AUDIT_READ', 'NORMAL', NULL::interval),
  ('COMMON_REPRESENTATIVE_ADMIN', 'GOVERNANCE_MANAGE', 'HIGH', interval '15 minutes'),
  ('COMMON_REPRESENTATIVE_ADMIN', 'VOTE_AUDIT', 'NORMAL', NULL::interval),
  ('COMMON_REPRESENTATIVE_ADMIN', 'BILLING_MANAGE', 'HIGH', interval '15 minutes'),
  ('BOARD_ADMIN', 'WORKSPACE_READ', 'NORMAL', NULL::interval),
  ('BOARD_ADMIN', 'UNIT_READ_ALL', 'NORMAL', NULL::interval),
  ('BOARD_ADMIN', 'UNIT_MANAGE', 'HIGH', interval '15 minutes'),
  ('BOARD_ADMIN', 'MEMBER_DIRECTORY_READ', 'NORMAL', NULL::interval),
  ('BOARD_ADMIN', 'MEMBERSHIP_INVITE', 'HIGH', interval '15 minutes'),
  ('BOARD_ADMIN', 'MEMBERSHIP_REVIEW', 'HIGH', interval '15 minutes'),
  ('BOARD_ADMIN', 'TICKET_MANAGE', 'NORMAL', NULL::interval),
  ('BOARD_ADMIN', 'DOCUMENT_MANAGE', 'HIGH', interval '15 minutes'),
  ('BOARD_ADMIN', 'FINANCE_READ', 'NORMAL', NULL::interval),
  ('BOARD_ADMIN', 'FINANCE_WRITE', 'HIGH', interval '15 minutes'),
  ('BOARD_ADMIN', 'MEETING_MANAGE', 'HIGH', interval '15 minutes'),
  ('BOARD_ADMIN', 'COMMUNICATION_MANAGE', 'NORMAL', NULL::interval),
  ('BOARD_ADMIN', 'AUDIT_READ', 'NORMAL', NULL::interval),
  ('BOARD_ADMIN', 'GOVERNANCE_MANAGE', 'HIGH', interval '15 minutes'),
  ('BOARD_ADMIN', 'VOTE_AUDIT', 'NORMAL', NULL::interval),
  ('BOARD_ADMIN', 'BILLING_MANAGE', 'HIGH', interval '15 minutes'),
  ('SELF_MANAGED_ADMIN', 'WORKSPACE_READ', 'NORMAL', NULL::interval),
  ('SELF_MANAGED_ADMIN', 'UNIT_READ_ALL', 'NORMAL', NULL::interval),
  ('SELF_MANAGED_ADMIN', 'UNIT_MANAGE', 'HIGH', interval '15 minutes'),
  ('SELF_MANAGED_ADMIN', 'MEMBER_DIRECTORY_READ', 'NORMAL', NULL::interval),
  ('SELF_MANAGED_ADMIN', 'MEMBERSHIP_INVITE', 'HIGH', interval '15 minutes'),
  ('SELF_MANAGED_ADMIN', 'MEMBERSHIP_REVIEW', 'HIGH', interval '15 minutes'),
  ('SELF_MANAGED_ADMIN', 'TICKET_MANAGE', 'NORMAL', NULL::interval),
  ('SELF_MANAGED_ADMIN', 'DOCUMENT_MANAGE', 'HIGH', interval '15 minutes'),
  ('SELF_MANAGED_ADMIN', 'FINANCE_READ', 'NORMAL', NULL::interval),
  ('SELF_MANAGED_ADMIN', 'FINANCE_WRITE', 'HIGH', interval '15 minutes'),
  ('SELF_MANAGED_ADMIN', 'MEETING_MANAGE', 'HIGH', interval '15 minutes'),
  ('SELF_MANAGED_ADMIN', 'COMMUNICATION_MANAGE', 'NORMAL', NULL::interval),
  ('SELF_MANAGED_ADMIN', 'AUDIT_READ', 'NORMAL', NULL::interval),
  ('SELF_MANAGED_ADMIN', 'GOVERNANCE_MANAGE', 'HIGH', interval '15 minutes'),
  ('SELF_MANAGED_ADMIN', 'VOTE_AUDIT', 'NORMAL', NULL::interval),
  ('SELF_MANAGED_ADMIN', 'BILLING_MANAGE', 'HIGH', interval '15 minutes'),
  ('DELEGATE_OPERATIONS', 'WORKSPACE_READ', 'NORMAL', NULL::interval),
  ('DELEGATE_OPERATIONS', 'BUILDING_READ', 'NORMAL', NULL::interval),
  ('DELEGATE_OPERATIONS', 'UNIT_DIRECTORY_READ_MASKED', 'NORMAL', NULL::interval),
  ('DELEGATE_OPERATIONS', 'UNIT_READ_ALL', 'NORMAL', NULL::interval),
  ('DELEGATE_OPERATIONS', 'MEMBER_DIRECTORY_READ', 'NORMAL', NULL::interval),
  ('DELEGATE_OPERATIONS', 'MEMBERSHIP_INVITE', 'HIGH', interval '15 minutes'),
  ('DELEGATE_OPERATIONS', 'MEMBERSHIP_REVIEW', 'HIGH', interval '15 minutes'),
  ('DELEGATE_OPERATIONS', 'TICKET_MANAGE', 'NORMAL', NULL::interval),
  ('DELEGATE_OPERATIONS', 'DOCUMENT_MANAGE', 'HIGH', interval '15 minutes'),
  ('DELEGATE_OPERATIONS', 'COMMUNICATION_MANAGE', 'NORMAL', NULL::interval),
  ('DELEGATE_OPERATIONS', 'REMINDER_MANAGE', 'NORMAL', NULL::interval),
  ('DELEGATE_OPERATIONS', 'METER_MANAGE', 'NORMAL', NULL::interval),
  ('DELEGATE_OPERATIONS', 'VENDOR_MANAGE', 'NORMAL', NULL::interval),
  ('COMMITTEE_OVERSIGHT', 'WORKSPACE_READ', 'NORMAL', NULL::interval),
  ('COMMITTEE_OVERSIGHT', 'UNIT_READ_ALL', 'NORMAL', NULL::interval),
  ('COMMITTEE_OVERSIGHT', 'FINANCE_READ', 'NORMAL', NULL::interval),
  ('COMMITTEE_OVERSIGHT', 'VOTE_AUDIT', 'NORMAL', NULL::interval),
  ('COMMITTEE_OVERSIGHT', 'AUDIT_READ', 'NORMAL', NULL::interval),
  ('ACCOUNTANT', 'WORKSPACE_READ', 'NORMAL', NULL::interval),
  ('ACCOUNTANT', 'UNIT_READ_ALL', 'NORMAL', NULL::interval),
  ('ACCOUNTANT', 'FINANCE_READ', 'NORMAL', NULL::interval),
  ('ACCOUNTANT', 'FINANCE_WRITE', 'HIGH', interval '15 minutes'),
  ('BILLING_ADMIN', 'WORKSPACE_READ', 'NORMAL', NULL::interval),
  ('BILLING_ADMIN', 'BILLING_MANAGE', 'HIGH', interval '15 minutes')
) AS seed(role_key, capability_key, risk_level, reauthentication_window)
ON CONFLICT (role_key, capability_key) DO UPDATE
SET risk_level = EXCLUDED.risk_level,
    reauthentication_window = EXCLUDED.reauthentication_window;

-- Complete canonical administrator bundles without duplicating the verbose
-- mapping above. These rows use internal keys, then map to lower.dotted output.
INSERT INTO public.role_capabilities (role_key, capability_key, risk_level, reauthentication_window)
SELECT
  role_key,
  ckm.internal_key,
  CASE
    WHEN ckm.canonical_key IN (
      'workspace.settings.manage', 'workspace.governance.manage', 'workspace.archive',
      'building.manage', 'unit.manage', 'membership.invite', 'membership.approve',
      'membership.suspend', 'unit_relation.verify', 'unit_legal_right.verify',
      'role.grant_limited', 'role.grant_admin', 'delegation.manage', 'mandate.manage',
      'governance.transfer', 'member.contact.read', 'document.publish',
      'finance.write', 'finance.export', 'meeting.manage', 'billing.manage'
    ) THEN 'HIGH'
    ELSE 'NORMAL'
  END,
  CASE
    WHEN ckm.canonical_key IN (
      'workspace.settings.manage', 'workspace.governance.manage', 'workspace.archive',
      'building.manage', 'unit.manage', 'membership.invite', 'membership.approve',
      'membership.suspend', 'unit_relation.verify', 'unit_legal_right.verify',
      'role.grant_limited', 'role.grant_admin', 'delegation.manage', 'mandate.manage',
      'governance.transfer', 'member.contact.read', 'document.publish',
      'finance.write', 'finance.export', 'meeting.manage', 'billing.manage'
    ) THEN interval '15 minutes'
    ELSE NULL::interval
  END
FROM (VALUES
  ('COMMON_REPRESENTATIVE_ADMIN'),
  ('BOARD_ADMIN'),
  ('SELF_MANAGED_ADMIN')
) AS administrator(role_key)
CROSS JOIN public.capability_key_map ckm
ON CONFLICT (role_key, capability_key) DO UPDATE
SET risk_level = EXCLUDED.risk_level,
    reauthentication_window = EXCLUDED.reauthentication_window;

CREATE TABLE IF NOT EXISTS public.management_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  mandate_party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
  agency_id uuid REFERENCES public.management_agency_details(organization_id) ON DELETE RESTRICT,
  mandate_type text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  verification_status text NOT NULL DEFAULT 'CLAIMED',
  evidence_reference text,
  appointment_reference text,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  ended_reason text,
  created_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT management_mandates_type_check CHECK (
    mandate_type IN ('COMMON_REPRESENTATIVE', 'MANAGING_BOARD', 'SELF_MANAGED_COORDINATION')
  ),
  CONSTRAINT management_mandates_status_check CHECK (
    status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED')
  ),
  CONSTRAINT management_mandates_verification_check CHECK (
    verification_status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED', 'DISPUTED', 'ENDED')
  ),
  CONSTRAINT management_mandates_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT management_mandates_workspace_id_id_uq UNIQUE (workspace_id, id),
  CONSTRAINT management_mandates_agency_subject_check CHECK (
    agency_id IS NULL OR agency_id = mandate_party_id
  )
);

CREATE INDEX IF NOT EXISTS management_mandates_workspace_active_idx
  ON public.management_mandates (workspace_id, mandate_party_id)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_mandate_id uuid,
  granted_by_membership_id uuid,
  beneficiary_membership_id uuid NOT NULL,
  capability_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'PENDING',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  can_redelegate boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delegations_status_check CHECK (
    status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED')
  ),
  CONSTRAINT delegations_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT delegations_no_redelegation_check CHECK (can_redelegate = false),
  CONSTRAINT delegations_workspace_id_id_uq UNIQUE (workspace_id, id),
  CONSTRAINT delegations_source_mandate_fk FOREIGN KEY (workspace_id, source_mandate_id)
    REFERENCES public.management_mandates(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT delegations_grantor_membership_fk FOREIGN KEY (workspace_id, granted_by_membership_id)
    REFERENCES public.workspace_memberships(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT delegations_beneficiary_membership_fk FOREIGN KEY (workspace_id, beneficiary_membership_id)
    REFERENCES public.workspace_memberships(workspace_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS delegations_beneficiary_active_idx
  ON public.delegations (workspace_id, beneficiary_membership_id)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL,
  role_key text NOT NULL REFERENCES public.role_templates(role_key) ON DELETE RESTRICT,
  source_mandate_id uuid,
  source_delegation_id uuid,
  status text NOT NULL DEFAULT 'PENDING',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  granted_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_assignments_status_check CHECK (
    status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED')
  ),
  CONSTRAINT role_assignments_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT role_assignments_membership_fk FOREIGN KEY (workspace_id, membership_id)
    REFERENCES public.workspace_memberships(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT role_assignments_source_mandate_fk FOREIGN KEY (workspace_id, source_mandate_id)
    REFERENCES public.management_mandates(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT role_assignments_source_delegation_fk FOREIGN KEY (workspace_id, source_delegation_id)
    REFERENCES public.delegations(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT role_assignments_source_shape_check CHECK (
    status <> 'ACTIVE'
    OR (
      role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
      AND source_mandate_id IS NOT NULL
      AND source_delegation_id IS NULL
    )
    OR (
      role_key = 'DELEGATE_OPERATIONS'
      AND source_mandate_id IS NULL
      AND source_delegation_id IS NOT NULL
    )
    OR role_key IN ('COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN')
  )
);

CREATE INDEX IF NOT EXISTS role_assignments_membership_active_idx
  ON public.role_assignments (workspace_id, membership_id, role_key)
  WHERE status = 'ACTIVE';

-- ---------------------------------------------------------------------------
-- Unit tenancy and typed composition/billing relations.
-- ---------------------------------------------------------------------------

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS physical_building_id uuid,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS normalized_designation text,
  ADD COLUMN IF NOT EXISTS unit_category text NOT NULL DEFAULT 'APARTMENT',
  ADD COLUMN IF NOT EXISTS staircase text,
  ADD COLUMN IF NOT EXISTS door text,
  ADD COLUMN IF NOT EXISTS official_property_id text,
  ADD COLUMN IF NOT EXISTS common_share_numerator bigint,
  ADD COLUMN IF NOT EXISTS common_share_denominator bigint,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS creation_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS created_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION private.normalize_unit_designation(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT REGEXP_REPLACE(LOWER(BTRIM(COALESCE(p_value, ''))), '\s+', '', 'g');
$$;

REVOKE ALL ON FUNCTION private.normalize_unit_designation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.normalize_unit_designation(text) TO authenticated;

CREATE OR REPLACE FUNCTION private.sync_unit_tenant_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  NEW.designation := COALESCE(NULLIF(BTRIM(NEW.designation), ''), NULLIF(BTRIM(NEW.unit_label), ''));
  NEW.normalized_designation := private.normalize_unit_designation(
    COALESCE(NEW.normalized_designation, NEW.designation, NEW.unit_label)
  );
  NEW.physical_building_id := COALESCE(NEW.physical_building_id, NEW.building_id);

  IF NEW.workspace_id IS NULL AND NEW.physical_building_id IS NOT NULL THEN
    SELECT wb.workspace_id
    INTO NEW.workspace_id
    FROM public.workspace_buildings wb
    WHERE wb.physical_building_id = NEW.physical_building_id
      AND wb.valid_to IS NULL
    ORDER BY wb.is_primary DESC, wb.valid_from
    LIMIT 1;
  END IF;

  IF NEW.building_id IS NULL
     AND NEW.physical_building_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = NEW.physical_building_id) THEN
    NEW.building_id := NEW.physical_building_id;
  END IF;

  IF NEW.workspace_id IS NULL OR NEW.physical_building_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Unit tenant scope is missing',
      DETAIL = '{"error_code":"UNIT_TENANT_SCOPE_REQUIRED"}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_buildings wb
    WHERE wb.workspace_id = NEW.workspace_id
      AND wb.physical_building_id = NEW.physical_building_id
      AND wb.valid_to IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Unit building is outside the workspace',
      DETAIL = '{"error_code":"UNIT_WORKSPACE_BUILDING_MISMATCH"}';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_unit_tenant_scope() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.sync_unit_tenant_scope() TO authenticated;

DROP TRIGGER IF EXISTS trg_units_tenant_scope ON public.units;
CREATE TRIGGER trg_units_tenant_scope
BEFORE INSERT OR UPDATE OF building_id, workspace_id, physical_building_id, unit_label, designation, normalized_designation
ON public.units
FOR EACH ROW EXECUTE FUNCTION private.sync_unit_tenant_scope();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.units'::regclass
      AND conname = 'units_workspace_fk'
  ) THEN
    ALTER TABLE public.units ADD CONSTRAINT units_workspace_fk
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.units'::regclass
      AND conname = 'units_workspace_building_fk'
  ) THEN
    ALTER TABLE public.units ADD CONSTRAINT units_workspace_building_fk
      FOREIGN KEY (workspace_id, physical_building_id)
      REFERENCES public.workspace_buildings(workspace_id, physical_building_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.units'::regclass
      AND conname = 'units_workspace_id_id_uq'
  ) THEN
    ALTER TABLE public.units ADD CONSTRAINT units_workspace_id_id_uq UNIQUE (workspace_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.units'::regclass
      AND conname = 'units_required_tenant_scope_check'
  ) THEN
    ALTER TABLE public.units ADD CONSTRAINT units_required_tenant_scope_check
      CHECK (workspace_id IS NOT NULL AND physical_building_id IS NOT NULL) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.units'::regclass
      AND conname = 'units_category_check'
  ) THEN
    ALTER TABLE public.units ADD CONSTRAINT units_category_check
      CHECK (unit_category IN ('APARTMENT', 'GARAGE', 'STORAGE', 'COMMERCIAL', 'OTHER')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.units'::regclass
      AND conname = 'units_status_check'
  ) THEN
    ALTER TABLE public.units ADD CONSTRAINT units_status_check
      CHECK (status IN ('ACTIVE', 'MERGED', 'SPLIT', 'ARCHIVED')) NOT VALID;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS units_active_designation_uq
  ON public.units (physical_building_id, normalized_designation)
  WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS units_creation_idempotency_uq
  ON public.units (workspace_id, creation_idempotency_key)
  WHERE creation_idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS units_workspace_idx ON public.units (workspace_id, id);

CREATE TABLE IF NOT EXISTS public.unit_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_unit_id uuid NOT NULL,
  child_unit_id uuid NOT NULL,
  relation_type text NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_relations_parent_fk FOREIGN KEY (workspace_id, parent_unit_id)
    REFERENCES public.units(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT unit_relations_child_fk FOREIGN KEY (workspace_id, child_unit_id)
    REFERENCES public.units(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT unit_relations_type_check CHECK (
    relation_type IN ('ACCESSORY_OF', 'BILLING_ASSOCIATED_WITH', 'SPLIT_FROM', 'MERGED_INTO')
  ),
  CONSTRAINT unit_relations_no_self_check CHECK (parent_unit_id <> child_unit_id),
  CONSTRAINT unit_relations_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS unit_relations_one_active_relation_uq
  ON public.unit_relations (workspace_id, parent_unit_id, child_unit_id, relation_type)
  WHERE valid_to IS NULL;

CREATE TABLE IF NOT EXISTS public.billing_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_groups_status_check CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  CONSTRAINT billing_groups_workspace_id_id_uq UNIQUE (workspace_id, id)
);

CREATE TABLE IF NOT EXISTS public.billing_group_members (
  workspace_id uuid NOT NULL,
  billing_group_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  allocation_numerator bigint NOT NULL DEFAULT 1,
  allocation_denominator bigint NOT NULL DEFAULT 1,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (billing_group_id, unit_id, valid_from),
  CONSTRAINT billing_group_members_group_fk FOREIGN KEY (workspace_id, billing_group_id)
    REFERENCES public.billing_groups(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT billing_group_members_unit_fk FOREIGN KEY (workspace_id, unit_id)
    REFERENCES public.units(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT billing_group_members_fraction_check CHECK (
    allocation_numerator > 0
    AND allocation_denominator > 0
    AND allocation_numerator <= allocation_denominator
  ),
  CONSTRAINT billing_group_members_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_group_members_one_active_uq
  ON public.billing_group_members (workspace_id, billing_group_id, unit_id)
  WHERE valid_to IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workspace_memberships'::regclass
      AND conname = 'workspace_memberships_primary_unit_fk'
  ) THEN
    ALTER TABLE public.workspace_memberships
      ADD CONSTRAINT workspace_memberships_primary_unit_fk
      FOREIGN KEY (workspace_id, primary_context_unit_id)
      REFERENCES public.units(workspace_id, id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.unit_ownerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL,
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
  ownership_type text NOT NULL DEFAULT 'SOLE_OWNER',
  share_numerator bigint,
  share_denominator bigint,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  status text NOT NULL DEFAULT 'CLAIMED',
  verification_method text,
  verified_at timestamptz,
  verified_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  evidence_reference text,
  source text NOT NULL DEFAULT 'ADMIN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_ownerships_unit_fk FOREIGN KEY (workspace_id, unit_id)
    REFERENCES public.units(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT unit_ownerships_type_check CHECK (ownership_type IN ('SOLE_OWNER', 'CO_OWNER')),
  CONSTRAINT unit_ownerships_status_check CHECK (
    status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED', 'DISPUTED', 'ENDED')
  ),
  CONSTRAINT unit_ownerships_share_check CHECK (
    (share_numerator IS NULL AND share_denominator IS NULL)
    OR (
      share_numerator > 0
      AND share_denominator > 0
      AND share_numerator <= share_denominator
    )
  ),
  CONSTRAINT unit_ownerships_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS unit_ownerships_one_open_relationship_uq
  ON public.unit_ownerships (workspace_id, unit_id, party_id, ownership_type)
  WHERE valid_to IS NULL AND status <> 'ENDED';
CREATE INDEX IF NOT EXISTS unit_ownerships_party_active_idx
  ON public.unit_ownerships (party_id, workspace_id, unit_id)
  WHERE valid_to IS NULL AND status <> 'ENDED';

CREATE TABLE IF NOT EXISTS public.unit_legal_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL,
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
  right_type text NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  status text NOT NULL DEFAULT 'CLAIMED',
  verification_method text,
  verified_at timestamptz,
  verified_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  evidence_reference text,
  source text NOT NULL DEFAULT 'ADMIN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_legal_rights_unit_fk FOREIGN KEY (workspace_id, unit_id)
    REFERENCES public.units(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT unit_legal_rights_type_check CHECK (right_type IN ('USUFRUCT', 'USE_RIGHT', 'OTHER')),
  CONSTRAINT unit_legal_rights_status_check CHECK (
    status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED', 'DISPUTED', 'ENDED')
  ),
  CONSTRAINT unit_legal_rights_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS unit_legal_rights_one_open_relationship_uq
  ON public.unit_legal_rights (workspace_id, unit_id, party_id, right_type)
  WHERE valid_to IS NULL AND status <> 'ENDED';

CREATE TABLE IF NOT EXISTS public.unit_occupancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.people(party_id) ON DELETE RESTRICT,
  occupancy_type text NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  status text NOT NULL DEFAULT 'CLAIMED',
  is_primary_contact boolean NOT NULL DEFAULT false,
  verification_method text,
  verified_at timestamptz,
  verified_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_invitation_id uuid,
  source_join_request_id uuid,
  evidence_reference text,
  source text NOT NULL DEFAULT 'ADMIN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_occupancies_unit_fk FOREIGN KEY (workspace_id, unit_id)
    REFERENCES public.units(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT unit_occupancies_type_check CHECK (
    occupancy_type IN ('OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT')
  ),
  CONSTRAINT unit_occupancies_status_check CHECK (
    status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED', 'DISPUTED', 'ENDED')
  ),
  CONSTRAINT unit_occupancies_validity_check CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS unit_occupancies_one_open_relationship_uq
  ON public.unit_occupancies (workspace_id, unit_id, person_id, occupancy_type)
  WHERE valid_to IS NULL AND status <> 'ENDED';
CREATE INDEX IF NOT EXISTS unit_occupancies_person_active_idx
  ON public.unit_occupancies (person_id, workspace_id, unit_id)
  WHERE valid_to IS NULL AND status <> 'ENDED';

-- ---------------------------------------------------------------------------
-- Invitation, joining and request-only community onboarding state machines.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.membership_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invited_email_normalized text NOT NULL,
  invited_party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  unit_id uuid,
  relationship_type text NOT NULL,
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_invitations_unit_fk FOREIGN KEY (workspace_id, unit_id)
    REFERENCES public.units(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT membership_invitations_relationship_check CHECK (
    relationship_type IN ('OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT')
  ),
  CONSTRAINT membership_invitations_status_check CHECK (
    status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')
  ),
  CONSTRAINT membership_invitations_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT membership_invitations_actor_idempotency_uq UNIQUE (created_by_profile_id, idempotency_key),
  CONSTRAINT membership_invitations_token_hash_uq UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS membership_invitations_workspace_status_idx
  ON public.membership_invitations (workspace_id, status, expires_at);
CREATE INDEX IF NOT EXISTS membership_invitations_email_status_idx
  ON public.membership_invitations (invited_email_normalized, status, expires_at);

CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requested_unit_id uuid,
  requester_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_person_id uuid REFERENCES public.people(party_id) ON DELETE SET NULL,
  requested_relationship_type text NOT NULL,
  message text,
  evidence_reference text,
  status text NOT NULL DEFAULT 'PENDING',
  version integer NOT NULL DEFAULT 1,
  reviewer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_reason text,
  reviewed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT join_requests_unit_fk FOREIGN KEY (workspace_id, requested_unit_id)
    REFERENCES public.units(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT join_requests_relationship_check CHECK (
    requested_relationship_type IN ('OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT')
  ),
  CONSTRAINT join_requests_status_check CHECK (
    status IN ('DRAFT', 'PENDING', 'NEEDS_EVIDENCE', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED')
  ),
  CONSTRAINT join_requests_actor_idempotency_uq UNIQUE (requester_profile_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS join_requests_workspace_review_idx
  ON public.join_requests (workspace_id, status, created_at);
CREATE INDEX IF NOT EXISTS join_requests_requester_idx
  ON public.join_requests (requester_profile_id, created_at DESC);

-- An offer is an immutable event. Acceptance creates a second immutable event
-- that references the COUNTER_OFFER; history is never overwritten.
CREATE TABLE IF NOT EXISTS public.join_request_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  join_request_id uuid NOT NULL REFERENCES public.join_requests(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  offered_relationship_type text,
  offered_unit_id uuid,
  supersedes_offer_id uuid REFERENCES public.join_request_offers(id) ON DELETE RESTRICT,
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT join_request_offers_unit_fk FOREIGN KEY (workspace_id, offered_unit_id)
    REFERENCES public.units(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT join_request_offers_event_type_check CHECK (
    event_type IN ('COUNTER_OFFER', 'ACCEPTED', 'WITHDRAWN', 'REVIEW_NOTE')
  ),
  CONSTRAINT join_request_offers_relationship_check CHECK (
    offered_relationship_type IS NULL
    OR offered_relationship_type IN ('OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT')
  ),
  CONSTRAINT join_request_offers_counter_shape_check CHECK (
    event_type <> 'COUNTER_OFFER'
    OR (offered_relationship_type IS NOT NULL AND offered_unit_id IS NOT NULL)
  ),
  CONSTRAINT join_request_offers_accept_shape_check CHECK (
    event_type <> 'ACCEPTED' OR supersedes_offer_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS join_request_offers_request_history_idx
  ON public.join_request_offers (join_request_id, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS join_request_offers_one_acceptance_uq
  ON public.join_request_offers (supersedes_offer_id)
  WHERE event_type = 'ACCEPTED';

CREATE TABLE IF NOT EXISTS public.community_creation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserved_workspace_id uuid NOT NULL DEFAULT gen_random_uuid(),
  claimant_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimant_party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  address_id uuid NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  community_name text NOT NULL,
  legal_form text NOT NULL,
  governance_mode text NOT NULL,
  governance_legal_basis text,
  declared_unit_count integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING_VERIFICATION',
  evidence_reference text,
  address_lease_expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  reviewed_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_reason text,
  reviewed_at timestamptz,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_creation_requests_governance_check CHECK (
    governance_mode IN ('REPRESENTATIVE_MANAGED', 'BOARD_MANAGED', 'SELF_MANAGED')
  ),
  CONSTRAINT community_creation_requests_status_check CHECK (
    status IN ('DRAFT', 'PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED')
  ),
  CONSTRAINT community_creation_requests_unit_count_check CHECK (declared_unit_count > 0),
  CONSTRAINT community_creation_requests_actor_idempotency_uq UNIQUE (claimant_profile_id, idempotency_key),
  CONSTRAINT community_creation_requests_reserved_workspace_uq UNIQUE (reserved_workspace_id)
);

CREATE INDEX IF NOT EXISTS community_creation_requests_address_status_idx
  ON public.community_creation_requests (address_id, status, address_lease_expires_at);

CREATE TABLE IF NOT EXISTS public.community_creation_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_creation_request_id uuid NOT NULL REFERENCES public.community_creation_requests(id) ON DELETE CASCADE,
  attestor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attestation_type text NOT NULL,
  statement_version text NOT NULL,
  evidence_reference text,
  status text NOT NULL DEFAULT 'PENDING_VERIFICATION',
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT community_creation_attestations_status_check CHECK (
    status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'REVOKED')
  ),
  UNIQUE (community_creation_request_id, attestor_profile_id, attestation_type)
);

-- Deliberately no attestation-count trigger: a PROVISIONAL/ACTIVE workspace may
-- only be created by a later reviewed activation command with fresh legal and
-- AAL2 checks. This migration never auto-merges addresses or auto-activates a
-- provisional community.

CREATE TABLE IF NOT EXISTS public.authorization_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  action_key text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  decision text NOT NULL,
  reason_code text,
  source_mandate_id uuid,
  source_delegation_id uuid,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT authorization_audit_events_decision_check CHECK (decision IN ('ALLOW', 'DENY', 'STATE_CHANGE')),
  CONSTRAINT authorization_audit_events_mandate_fk FOREIGN KEY (workspace_id, source_mandate_id)
    REFERENCES public.management_mandates(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT authorization_audit_events_delegation_fk FOREIGN KEY (workspace_id, source_delegation_id)
    REFERENCES public.delegations(workspace_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS authorization_audit_events_workspace_created_idx
  ON public.authorization_audit_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS authorization_audit_events_actor_created_idx
  ON public.authorization_audit_events (actor_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.command_idempotency_keys (
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  command_name text NOT NULL,
  idempotency_key uuid NOT NULL,
  resource_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_profile_id, command_name, idempotency_key)
);

-- Complete deferred provenance foreign keys after workflow tables exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.membership_periods'::regclass
      AND conname = 'membership_periods_source_invitation_fk'
  ) THEN
    ALTER TABLE public.membership_periods
      ADD CONSTRAINT membership_periods_source_invitation_fk
      FOREIGN KEY (source_invitation_id) REFERENCES public.membership_invitations(id)
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.membership_periods'::regclass
      AND conname = 'membership_periods_source_join_request_fk'
  ) THEN
    ALTER TABLE public.membership_periods
      ADD CONSTRAINT membership_periods_source_join_request_fk
      FOREIGN KEY (source_join_request_id) REFERENCES public.join_requests(id)
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.unit_occupancies'::regclass
      AND conname = 'unit_occupancies_source_invitation_fk'
  ) THEN
    ALTER TABLE public.unit_occupancies
      ADD CONSTRAINT unit_occupancies_source_invitation_fk
      FOREIGN KEY (source_invitation_id) REFERENCES public.membership_invitations(id)
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.unit_occupancies'::regclass
      AND conname = 'unit_occupancies_source_join_request_fk'
  ) THEN
    ALTER TABLE public.unit_occupancies
      ADD CONSTRAINT unit_occupancies_source_join_request_fk
      FOREIGN KEY (source_join_request_id) REFERENCES public.join_requests(id)
      ON DELETE SET NULL NOT VALID;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Legacy tenant columns and compatibility triggers. The application writes one
-- authoritative row; database triggers project its tenant key into old tables,
-- avoiding application-level dual-write/split-brain during the rollout.
-- ---------------------------------------------------------------------------

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.meter_readings ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.finance_entries ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.knowledge_base_articles ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.invoice_events ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.reminder_rules ADD COLUMN IF NOT EXISTS workspace_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reminder_rules'::regclass
      AND conname = 'reminder_rules_workspace_fk'
  ) THEN
    ALTER TABLE public.reminder_rules
      ADD CONSTRAINT reminder_rules_workspace_fk
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
      ON DELETE CASCADE NOT VALID;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_physical_building_workspace_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_matches integer;
  v_workspace_id uuid;
  v_building_id uuid;
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.building_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Tenant row has no workspace/building scope',
      DETAIL = '{"error_code":"WORKSPACE_BUILDING_SCOPE_REQUIRED"}';
  END IF;

  IF NEW.workspace_id IS NULL THEN
    SELECT COUNT(*) INTO v_matches
    FROM public.workspace_buildings wb
    WHERE wb.physical_building_id = NEW.building_id
      AND wb.valid_to IS NULL;

    IF v_matches <> 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Physical building does not resolve to one workspace',
        DETAIL = jsonb_build_object(
          'error_code', 'PHYSICAL_BUILDING_WORKSPACE_SCOPE_AMBIGUOUS',
          'physical_building_id', NEW.building_id,
          'active_workspace_count', v_matches
        )::text;
    END IF;

    SELECT wb.workspace_id INTO v_workspace_id
    FROM public.workspace_buildings wb
    WHERE wb.physical_building_id = NEW.building_id
      AND wb.valid_to IS NULL;
    NEW.workspace_id := v_workspace_id;
  ELSIF NEW.building_id IS NULL THEN
    SELECT wb.physical_building_id INTO v_building_id
    FROM public.workspace_buildings wb
    WHERE wb.workspace_id = NEW.workspace_id
      AND wb.is_primary
      AND wb.valid_to IS NULL;

    IF v_building_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Workspace has no active primary building',
        DETAIL = '{"error_code":"WORKSPACE_PRIMARY_BUILDING_REQUIRED"}';
    END IF;
    NEW.building_id := v_building_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_buildings wb
    WHERE wb.workspace_id = NEW.workspace_id
      AND wb.physical_building_id = NEW.building_id
      AND wb.valid_to IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Workspace/building scope mismatch',
      DETAIL = '{"error_code":"WORKSPACE_BUILDING_SCOPE_MISMATCH"}';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_physical_building_workspace_scope() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.sync_physical_building_workspace_scope() TO authenticated;

DROP TRIGGER IF EXISTS trg_reminder_rules_workspace_scope ON public.reminder_rules;
DROP FUNCTION IF EXISTS private.sync_reminder_rule_scope();
CREATE TRIGGER trg_reminder_rules_workspace_scope
BEFORE INSERT OR UPDATE OF building_id, workspace_id ON public.reminder_rules
FOR EACH ROW EXECUTE FUNCTION private.sync_physical_building_workspace_scope();

CREATE OR REPLACE FUNCTION private.sync_building_workspace_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  NEW.workspace_id := COALESCE(NEW.workspace_id, NEW.building_id);
  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Legacy tenant row has no workspace',
      DETAIL = '{"error_code":"WORKSPACE_SCOPE_REQUIRED"}';
  END IF;
  IF NEW.building_id IS NOT NULL AND NEW.workspace_id <> NEW.building_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Legacy building/workspace compatibility mismatch',
      DETAIL = '{"error_code":"LEGACY_WORKSPACE_ID_MISMATCH"}';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_building_workspace_scope() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.sync_building_workspace_scope() TO authenticated;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'announcements', 'notifications', 'tickets', 'meter_readings', 'documents',
    'meetings', 'vendors', 'knowledge_base_articles', 'subscriptions', 'invoice_events'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_workspace_scope ON public.%I', v_table, v_table);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_workspace_scope BEFORE INSERT OR UPDATE OF building_id, workspace_id ON public.%I FOR EACH ROW EXECUTE FUNCTION private.sync_building_workspace_scope()',
      v_table,
      v_table
    );
  END LOOP;
END;
$$;

-- Notifications are already used by manager-side reminder actions. Unlike the
-- remaining first-rollout legacy tables, their physical building key may differ
-- from the workspace UUID, so replace the compatibility-equality trigger with
-- an authoritative workspace_buildings binding check.
DROP TRIGGER IF EXISTS trg_notifications_workspace_scope ON public.notifications;
CREATE TRIGGER trg_notifications_workspace_scope
BEFORE INSERT OR UPDATE OF building_id, workspace_id ON public.notifications
FOR EACH ROW EXECUTE FUNCTION private.sync_physical_building_workspace_scope();

CREATE OR REPLACE FUNCTION private.sync_finance_workspace_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  IF NEW.unit_id IS NOT NULL THEN
    SELECT u.workspace_id INTO v_workspace_id FROM public.units u WHERE u.id = NEW.unit_id;
    IF NEW.workspace_id IS NOT NULL AND NEW.workspace_id <> v_workspace_id THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Finance unit/workspace mismatch',
        DETAIL = '{"error_code":"FINANCE_UNIT_SCOPE_MISMATCH"}';
    END IF;
    NEW.workspace_id := COALESCE(NEW.workspace_id, v_workspace_id);
  END IF;
  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Finance row has no workspace',
      DETAIL = '{"error_code":"WORKSPACE_SCOPE_REQUIRED"}';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_finance_workspace_scope() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.sync_finance_workspace_scope() TO authenticated;

DROP TRIGGER IF EXISTS trg_finance_entries_workspace_scope ON public.finance_entries;
CREATE TRIGGER trg_finance_entries_workspace_scope
BEFORE INSERT OR UPDATE OF unit_id, workspace_id ON public.finance_entries
FOR EACH ROW EXECUTE FUNCTION private.sync_finance_workspace_scope();

CREATE OR REPLACE FUNCTION private.sync_work_order_workspace_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_ticket_workspace uuid;
  v_vendor_workspace uuid;
BEGIN
  IF NEW.ticket_id IS NOT NULL THEN
    SELECT t.workspace_id INTO v_ticket_workspace FROM public.tickets t WHERE t.id = NEW.ticket_id;
  END IF;
  IF NEW.vendor_id IS NOT NULL THEN
    SELECT v.workspace_id INTO v_vendor_workspace FROM public.vendors v WHERE v.id = NEW.vendor_id;
  END IF;
  IF v_ticket_workspace IS NOT NULL AND v_vendor_workspace IS NOT NULL
     AND v_ticket_workspace <> v_vendor_workspace THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Work order parents cross tenant boundaries',
      DETAIL = '{"error_code":"WORK_ORDER_SCOPE_MISMATCH"}';
  END IF;
  NEW.workspace_id := COALESCE(NEW.workspace_id, v_ticket_workspace, v_vendor_workspace);
  IF NEW.workspace_id IS NULL OR (
    v_ticket_workspace IS NOT NULL AND NEW.workspace_id <> v_ticket_workspace
  ) OR (
    v_vendor_workspace IS NOT NULL AND NEW.workspace_id <> v_vendor_workspace
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Work order has invalid workspace scope',
      DETAIL = '{"error_code":"WORK_ORDER_SCOPE_REQUIRED"}';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_work_order_workspace_scope() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.sync_work_order_workspace_scope() TO authenticated;

DROP TRIGGER IF EXISTS trg_work_orders_workspace_scope ON public.work_orders;
CREATE TRIGGER trg_work_orders_workspace_scope
BEFORE INSERT OR UPDATE OF ticket_id, vendor_id, workspace_id ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION private.sync_work_order_workspace_scope();

-- ---------------------------------------------------------------------------
-- Legacy reconciliation/backfill.  Identity compatibility is deliberate:
-- workspace.id = primary physical_building.id = legacy buildings.id.
-- ---------------------------------------------------------------------------

INSERT INTO public.workspaces (
  id, name, legal_form, governance_mode, status, created_at, updated_at
)
SELECT
  b.id,
  b.name,
  'CONDOMINIUM',
  'REPRESENTATIVE_MANAGED',
  'ACTIVE',
  b.created_at,
  b.created_at
FROM public.buildings b
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.physical_buildings (
  id, canonical_name, status, address_verification_status, latitude, longitude, created_at, updated_at
)
SELECT
  b.id,
  b.name,
  'ACTIVE',
  'UNVERIFIED',
  b.lat,
  b.lon,
  b.created_at,
  b.created_at
FROM public.buildings b
ON CONFLICT (id) DO NOTHING;

WITH legacy_addresses AS (
  SELECT
    b.id,
    b.address,
    public.normalize_address_key(b.address) AS canonical_key,
    ROW_NUMBER() OVER (
      PARTITION BY public.normalize_address_key(b.address)
      ORDER BY b.id::text
    ) AS canonical_rank
  FROM public.buildings b
)
INSERT INTO public.addresses (
  id,
  country_code,
  address_level,
  formatted_address,
  canonical_key,
  canonicalization_version,
  source_system,
  source_record_id,
  verification_status,
  created_at,
  updated_at
)
SELECT
  la.id,
  'HU',
  'BUILDING',
  la.address,
  la.canonical_key,
  1,
  'LEGACY',
  la.id::text,
  'UNVERIFIED',
  now(),
  now()
FROM legacy_addresses la
WHERE la.canonical_rank = 1
  AND la.canonical_key <> ''
ON CONFLICT DO NOTHING;

WITH address_candidates AS (
  SELECT
    b.id AS physical_building_id,
    a.id AS address_id,
    ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY b.id::text) AS address_rank
  FROM public.buildings b
  JOIN public.addresses a
    ON a.address_level = 'BUILDING'
   AND a.valid_to IS NULL
   AND a.canonical_key = public.normalize_address_key(b.address)
)
INSERT INTO public.building_address_assignments (
  physical_building_id,
  address_id,
  assignment_role,
  valid_from,
  is_verified,
  source
)
SELECT
  ac.physical_building_id,
  ac.address_id,
  'PRIMARY',
  now(),
  false,
  'MIGRATION'
FROM address_candidates ac
WHERE ac.address_rank = 1
ON CONFLICT DO NOTHING;

INSERT INTO public.workspace_buildings (
  workspace_id, physical_building_id, is_primary, valid_from
)
SELECT b.id, b.id, true, b.created_at
FROM public.buildings b
JOIN public.workspaces w ON w.id = b.id
JOIN public.physical_buildings pb ON pb.id = b.id
ON CONFLICT (workspace_id, physical_building_id) DO UPDATE
SET is_primary = true,
    valid_to = NULL;

-- Reminder rules used the legacy building key as their only tenant boundary.
-- Resolve that key through the authoritative active workspace/building binding;
-- never guess when a physical building has zero or multiple active workspaces.
DO $$
DECLARE
  v_unresolved bigint;
BEGIN
  SELECT COUNT(*) INTO v_unresolved
  FROM public.reminder_rules rr
  WHERE rr.workspace_id IS NULL
    AND (
      rr.building_id IS NULL
      OR 1 <> (
        SELECT COUNT(*)
        FROM public.workspace_buildings wb
        WHERE wb.physical_building_id = rr.building_id
          AND wb.valid_to IS NULL
      )
    );

  IF v_unresolved > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Reminder rules cannot be mapped to one workspace',
      DETAIL = jsonb_build_object(
        'error_code', 'REMINDER_SCOPE_BACKFILL_REQUIRED',
        'row_count', v_unresolved
      )::text;
  END IF;
END;
$$;

UPDATE public.reminder_rules rr
SET workspace_id = (
  SELECT wb.workspace_id
  FROM public.workspace_buildings wb
  WHERE wb.physical_building_id = rr.building_id
    AND wb.valid_to IS NULL
  LIMIT 1
)
WHERE rr.workspace_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reminder_rules'::regclass
      AND conname = 'reminder_rules_workspace_building_fk'
  ) THEN
    ALTER TABLE public.reminder_rules
      ADD CONSTRAINT reminder_rules_workspace_building_fk
      FOREIGN KEY (workspace_id, building_id)
      REFERENCES public.workspace_buildings(workspace_id, physical_building_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.reminder_rules VALIDATE CONSTRAINT reminder_rules_workspace_fk;
ALTER TABLE public.reminder_rules VALIDATE CONSTRAINT reminder_rules_workspace_building_fk;
ALTER TABLE public.reminder_rules ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS reminder_rules_workspace_deadline_idx
  ON public.reminder_rules (workspace_id, deadline)
  WHERE enabled;

UPDATE public.units u
SET workspace_id = u.building_id,
    physical_building_id = u.building_id,
    designation = COALESCE(NULLIF(BTRIM(u.designation), ''), u.unit_label),
    normalized_designation = private.normalize_unit_designation(
      COALESCE(NULLIF(BTRIM(u.designation), ''), u.unit_label)
    ),
    unit_category = CASE
      WHEN LOWER(COALESCE(u.unit_type, '')) LIKE '%garazs%'
        OR LOWER(COALESCE(u.unit_type, '')) LIKE '%garázs%' THEN 'GARAGE'
      WHEN LOWER(COALESCE(u.unit_type, '')) LIKE '%tarolo%'
        OR LOWER(COALESCE(u.unit_type, '')) LIKE '%tároló%' THEN 'STORAGE'
      WHEN LOWER(COALESCE(u.unit_type, '')) LIKE '%uzlet%'
        OR LOWER(COALESCE(u.unit_type, '')) LIKE '%üzlet%' THEN 'COMMERCIAL'
      ELSE 'APARTMENT'
    END,
    updated_at = now()
WHERE u.building_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_buildings wb
    WHERE wb.workspace_id = u.building_id
      AND wb.physical_building_id = u.building_id
      AND wb.valid_to IS NULL
  );

UPDATE public.announcements SET workspace_id = building_id WHERE workspace_id IS NULL AND building_id IS NOT NULL;
UPDATE public.notifications SET workspace_id = building_id WHERE workspace_id IS NULL AND building_id IS NOT NULL;
UPDATE public.tickets SET workspace_id = building_id WHERE workspace_id IS NULL AND building_id IS NOT NULL;
UPDATE public.meter_readings SET workspace_id = building_id WHERE workspace_id IS NULL AND building_id IS NOT NULL;
UPDATE public.documents SET workspace_id = building_id WHERE workspace_id IS NULL AND building_id IS NOT NULL;
UPDATE public.meetings SET workspace_id = building_id WHERE workspace_id IS NULL AND building_id IS NOT NULL;
UPDATE public.vendors SET workspace_id = building_id WHERE workspace_id IS NULL AND building_id IS NOT NULL;
UPDATE public.knowledge_base_articles SET workspace_id = building_id WHERE workspace_id IS NULL AND building_id IS NOT NULL;
UPDATE public.subscriptions SET workspace_id = building_id WHERE workspace_id IS NULL AND building_id IS NOT NULL;
UPDATE public.invoice_events SET workspace_id = building_id WHERE workspace_id IS NULL AND building_id IS NOT NULL;

UPDATE public.finance_entries fe
SET workspace_id = u.workspace_id
FROM public.units u
WHERE fe.unit_id = u.id
  AND fe.workspace_id IS NULL;

UPDATE public.work_orders wo
SET workspace_id = t.workspace_id
FROM public.tickets t
WHERE wo.workspace_id IS NULL AND wo.ticket_id = t.id;

UPDATE public.work_orders wo
SET workspace_id = v.workspace_id
FROM public.vendors v
WHERE wo.workspace_id IS NULL AND wo.vendor_id = v.id;

DO $$
DECLARE
  v_table text;
  v_constraint text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'announcements', 'notifications', 'tickets', 'meter_readings', 'documents',
    'finance_entries', 'meetings', 'vendors', 'work_orders',
    'knowledge_base_articles', 'audit_logs', 'subscriptions', 'invoice_events'
  ] LOOP
    v_constraint := v_table || '_workspace_fk';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', v_table)::regclass
        AND conname = v_constraint
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE NOT VALID',
        v_table,
        v_constraint
      );
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tickets'::regclass
      AND conname = 'tickets_workspace_unit_fk'
  ) THEN
    ALTER TABLE public.tickets ADD CONSTRAINT tickets_workspace_unit_fk
      FOREIGN KEY (workspace_id, unit_id)
      REFERENCES public.units(workspace_id, id) ON DELETE NO ACTION NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.meter_readings'::regclass
      AND conname = 'meter_readings_workspace_unit_fk'
  ) THEN
    ALTER TABLE public.meter_readings ADD CONSTRAINT meter_readings_workspace_unit_fk
      FOREIGN KEY (workspace_id, unit_id)
      REFERENCES public.units(workspace_id, id) ON DELETE NO ACTION NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.finance_entries'::regclass
      AND conname = 'finance_entries_workspace_unit_fk'
  ) THEN
    ALTER TABLE public.finance_entries ADD CONSTRAINT finance_entries_workspace_unit_fk
      FOREIGN KEY (workspace_id, unit_id)
      REFERENCES public.units(workspace_id, id) ON DELETE NO ACTION NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS announcements_workspace_idx ON public.announcements (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_workspace_idx ON public.notifications (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_workspace_idx ON public.tickets (workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS meter_readings_workspace_idx ON public.meter_readings (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS documents_workspace_idx ON public.documents (workspace_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS finance_entries_workspace_idx ON public.finance_entries (workspace_id, due_date DESC);
CREATE INDEX IF NOT EXISTS meetings_workspace_idx ON public.meetings (workspace_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS vendors_workspace_idx ON public.vendors (workspace_id, name);
CREATE INDEX IF NOT EXISTS work_orders_workspace_idx ON public.work_orders (workspace_id, status, due_date);
CREATE INDEX IF NOT EXISTS knowledge_base_articles_workspace_idx ON public.knowledge_base_articles (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_workspace_idx ON public.subscriptions (workspace_id);
CREATE INDEX IF NOT EXISTS invoice_events_workspace_idx ON public.invoice_events (workspace_id, created_at DESC);

-- Profiles become person parties with the same UUID. This is a deterministic,
-- reversible bootstrap; legacy owner_name text is never promoted to VERIFIED.
INSERT INTO public.parties (id, party_type, display_name, status, created_at, updated_at)
SELECT p.id, 'PERSON', p.display_name, 'ACTIVE', p.created_at, p.updated_at
FROM public.profiles p
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.people (party_id, preferred_name, created_at)
SELECT p.id, p.display_name, p.created_at
FROM public.profiles p
JOIN public.parties party ON party.id = p.id AND party.party_type = 'PERSON'
ON CONFLICT (party_id) DO NOTHING;

INSERT INTO public.person_account_links (
  id, profile_id, person_id, status, verification_method, verified_at, valid_from, created_at, updated_at
)
SELECT p.id, p.id, p.id, 'ACTIVE', 'LEGACY_ACCOUNT', p.created_at, p.created_at, p.created_at, p.updated_at
FROM public.profiles p
JOIN public.people person ON person.party_id = p.id
ON CONFLICT DO NOTHING;

WITH legacy_membership_choice AS (
  SELECT DISTINCT ON (m.building_id, m.profile_id)
    m.id,
    m.building_id,
    m.profile_id,
    m.unit_id,
    m.active,
    m.created_at
  FROM public.memberships m
  WHERE m.building_id IS NOT NULL
  ORDER BY m.building_id, m.profile_id, m.active DESC, m.created_at, m.id::text
)
INSERT INTO public.workspace_memberships (
  id, workspace_id, profile_id, status, source, primary_context_unit_id, created_at, updated_at
)
SELECT
  lmc.id,
  lmc.building_id,
  lmc.profile_id,
  CASE WHEN lmc.active THEN 'ACTIVE' ELSE 'ENDED' END,
  'MIGRATION',
  CASE WHEN u.workspace_id = lmc.building_id THEN lmc.unit_id ELSE NULL END,
  lmc.created_at,
  now()
FROM legacy_membership_choice lmc
JOIN public.workspaces w ON w.id = lmc.building_id
LEFT JOIN public.units u ON u.id = lmc.unit_id
ON CONFLICT (workspace_id, profile_id) DO NOTHING;

INSERT INTO public.membership_periods (
  id, workspace_id, membership_id, started_at, ended_at, start_reason, end_reason, created_at
)
SELECT
  wm.id,
  wm.workspace_id,
  wm.id,
  wm.created_at,
  CASE WHEN wm.status = 'ACTIVE' THEN NULL ELSE wm.updated_at END,
  'LEGACY_MIGRATION',
  CASE WHEN wm.status = 'ACTIVE' THEN NULL ELSE 'LEGACY_INACTIVE' END,
  wm.created_at
FROM public.workspace_memberships wm
WHERE wm.source = 'MIGRATION'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.management_mandates (
  id, workspace_id, mandate_party_id, mandate_type, status,
  verification_status, valid_from, created_by_profile_id, created_at, updated_at
)
SELECT
  m.id,
  m.building_id,
  m.profile_id,
  'COMMON_REPRESENTATIVE',
  CASE WHEN m.active THEN 'ACTIVE' ELSE 'REVOKED' END,
  'CLAIMED',
  m.created_at,
  m.profile_id,
  m.created_at,
  now()
FROM public.memberships m
JOIN public.workspace_memberships wm
  ON wm.workspace_id = m.building_id AND wm.profile_id = m.profile_id
JOIN public.parties p ON p.id = m.profile_id
WHERE m.role = 'kozos_kepviselo'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.delegations (
  id, workspace_id, source_mandate_id, granted_by_membership_id,
  beneficiary_membership_id, capability_keys, status, valid_from, reason,
  created_at, updated_at
)
SELECT
  m.id,
  m.building_id,
  mandate.id,
  grantor.id,
  beneficiary.id,
  ARRAY[
    'WORKSPACE_READ', 'UNIT_READ_ALL', 'MEMBER_DIRECTORY_READ',
    'MEMBERSHIP_INVITE', 'MEMBERSHIP_REVIEW', 'TICKET_MANAGE',
    'DOCUMENT_MANAGE', 'COMMUNICATION_MANAGE', 'VENDOR_MANAGE'
  ]::text[],
  CASE WHEN m.active AND mandate.id IS NOT NULL THEN 'ACTIVE' ELSE 'PENDING' END,
  m.created_at,
  'LEGACY_MIGRATION',
  m.created_at,
  now()
FROM public.memberships m
JOIN public.workspace_memberships beneficiary
  ON beneficiary.workspace_id = m.building_id AND beneficiary.profile_id = m.profile_id
LEFT JOIN LATERAL (
  SELECT mm.id, mm.mandate_party_id
  FROM public.management_mandates mm
  WHERE mm.workspace_id = m.building_id
    AND mm.status = 'ACTIVE'
    AND mm.valid_from <= now()
    AND (mm.valid_to IS NULL OR mm.valid_to > now())
  ORDER BY mm.valid_from DESC, mm.id
  LIMIT 1
) mandate ON true
LEFT JOIN public.workspace_memberships grantor
  ON grantor.workspace_id = m.building_id
 AND grantor.profile_id = mandate.mandate_party_id
WHERE m.role = 'megbizott'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_assignments (
  id, workspace_id, membership_id, role_key, source_mandate_id,
  source_delegation_id, status, valid_from, granted_by_profile_id, reason,
  created_at, updated_at
)
SELECT
  m.id,
  m.building_id,
  wm.id,
  CASE m.role
    WHEN 'kozos_kepviselo' THEN 'COMMON_REPRESENTATIVE_ADMIN'
    WHEN 'megbizott' THEN 'DELEGATE_OPERATIONS'
    WHEN 'bizottsag' THEN 'COMMITTEE_OVERSIGHT'
    WHEN 'konyvelo' THEN 'ACCOUNTANT'
  END,
  CASE WHEN m.role = 'kozos_kepviselo' THEN mm.id ELSE NULL END,
  CASE WHEN m.role = 'megbizott' THEN d.id ELSE NULL END,
  CASE
    WHEN NOT m.active THEN 'REVOKED'
    WHEN m.role = 'megbizott' AND (d.id IS NULL OR d.status <> 'ACTIVE') THEN 'PENDING'
    ELSE 'ACTIVE'
  END,
  m.created_at,
  m.profile_id,
  'LEGACY_MIGRATION',
  m.created_at,
  now()
FROM public.memberships m
JOIN public.workspace_memberships wm
  ON wm.workspace_id = m.building_id AND wm.profile_id = m.profile_id
LEFT JOIN public.management_mandates mm ON mm.id = m.id AND mm.workspace_id = m.building_id
LEFT JOIN public.delegations d ON d.id = m.id AND d.workspace_id = m.building_id
WHERE m.role IN ('kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.unit_ownerships (
  id, workspace_id, unit_id, party_id, ownership_type, status,
  verification_method, source, valid_from, created_at, updated_at
)
SELECT
  m.id,
  m.building_id,
  m.unit_id,
  m.profile_id,
  'SOLE_OWNER',
  'CLAIMED',
  'LEGACY_ROLE_ONLY',
  'MIGRATION',
  m.created_at,
  m.created_at,
  now()
FROM public.memberships m
JOIN public.units u ON u.id = m.unit_id AND u.workspace_id = m.building_id
JOIN public.parties p ON p.id = m.profile_id
WHERE m.role = 'tulajdonos' AND m.unit_id IS NOT NULL AND m.active
ON CONFLICT DO NOTHING;

INSERT INTO public.unit_occupancies (
  id, workspace_id, unit_id, person_id, occupancy_type, status,
  verification_method, source, valid_from, created_at, updated_at
)
SELECT
  m.id,
  m.building_id,
  m.unit_id,
  m.profile_id,
  CASE WHEN m.role = 'tulajdonos' THEN 'OWNER_OCCUPANT' ELSE 'AUTHORIZED_OCCUPANT' END,
  'CLAIMED',
  'LEGACY_ROLE_ONLY',
  'MIGRATION',
  m.created_at,
  m.created_at,
  now()
FROM public.memberships m
JOIN public.units u ON u.id = m.unit_id AND u.workspace_id = m.building_id
JOIN public.people p ON p.party_id = m.profile_id
WHERE m.role IN ('lako', 'tulajdonos') AND m.unit_id IS NOT NULL AND m.active
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Auth/bootstrap and database-authoritative authorization helpers.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.bootstrap_profile(
  p_profile_id uuid,
  p_email text,
  p_display_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_name text := COALESCE(NULLIF(BTRIM(p_display_name), ''), NULLIF(BTRIM(p_email), ''), 'PanelLako felhasznalo');
BEGIN
  IF p_profile_id IS NULL OR NULLIF(BTRIM(p_email), '') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Confirmed account identity is required',
      DETAIL = '{"error_code":"AUTH_IDENTITY_REQUIRED"}';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, display_name, email, role, locale, time_zone, status, created_at, updated_at
  ) VALUES (
    p_profile_id, v_name, v_name, LOWER(BTRIM(p_email)), 'lako',
    'hu-HU', 'Europe/Budapest', 'ACTIVE', now(), now()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name),
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
      updated_at = now();

  INSERT INTO public.parties (id, party_type, display_name, status)
  VALUES (p_profile_id, 'PERSON', v_name, 'ACTIVE')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.people (party_id, preferred_name)
  SELECT p_profile_id, v_name
  WHERE EXISTS (
    SELECT 1 FROM public.parties p WHERE p.id = p_profile_id AND p.party_type = 'PERSON'
  )
  ON CONFLICT (party_id) DO NOTHING;

  INSERT INTO public.person_account_links (
    profile_id, person_id, status, verification_method, verified_at, valid_from
  )
  SELECT p_profile_id, p_profile_id, 'ACTIVE', 'CONFIRMED_AUTH_ACCOUNT', now(), now()
  WHERE EXISTS (SELECT 1 FROM public.people person WHERE person.party_id = p_profile_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.person_account_links pal
      WHERE pal.profile_id = p_profile_id AND pal.status = 'ACTIVE' AND pal.valid_to IS NULL
    );

  RETURN p_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION private.bootstrap_profile(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.bootstrap_profile(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.handle_new_panellako_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  PERFORM private.bootstrap_profile(
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_panellako_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.handle_new_panellako_user() TO authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_panellako ON auth.users;
CREATE TRIGGER on_auth_user_created_panellako
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION private.handle_new_panellako_user();

CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS TABLE (profile_id uuid, display_name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, auth
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_name text := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'display_name',
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    SPLIT_PART(COALESCE(v_email, ''), '@', 1)
  );
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  PERFORM private.bootstrap_profile(v_profile_id, v_email, v_name);

  RETURN QUERY
  SELECT p.id, p.display_name, p.email
  FROM public.profiles p
  WHERE p.id = v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;

CREATE OR REPLACE FUNCTION private.has_active_workspace_membership(
  p_profile_id uuid,
  p_workspace_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_memberships wm
    JOIN public.membership_periods mp
      ON mp.workspace_id = wm.workspace_id
     AND mp.membership_id = wm.id
     AND mp.ended_at IS NULL
    WHERE wm.profile_id = p_profile_id
      AND wm.workspace_id = p_workspace_id
      AND wm.status = 'ACTIVE'
  );
$$;

REVOKE ALL ON FUNCTION private.has_active_workspace_membership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_active_workspace_membership(uuid, uuid) TO authenticated;

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
      (SELECT ckm.internal_key FROM public.capability_key_map ckm WHERE ckm.canonical_key = p_capability_key),
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
         AND mm.valid_from <= now()
         AND (mm.valid_to IS NULL OR mm.valid_to > now())
        LEFT JOIN public.delegations d
          ON d.workspace_id = ra.workspace_id
         AND d.id = ra.source_delegation_id
         AND d.status = 'ACTIVE'
         AND d.valid_from <= now()
         AND (d.valid_to IS NULL OR d.valid_to > now())
        WHERE
          (
            ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
            AND mm.id IS NOT NULL
          )
          OR (
            ra.role_key = 'DELEGATE_OPERATIONS'
            AND d.id IS NOT NULL
            AND (SELECT internal_key FROM requested) = ANY(d.capability_keys)
          )
          OR ra.role_key IN ('COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN')
      )
    );
$$;

REVOKE ALL ON FUNCTION private.has_workspace_capability(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_workspace_capability(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.can_access_unit(
  p_profile_id uuid,
  p_workspace_id uuid,
  p_unit_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT private.has_workspace_capability(p_profile_id, p_workspace_id, 'UNIT_READ_ALL')
    OR (
      private.has_active_workspace_membership(p_profile_id, p_workspace_id)
      AND EXISTS (
        SELECT 1
        FROM public.person_account_links pal
        WHERE pal.profile_id = p_profile_id
          AND pal.status = 'ACTIVE'
          AND pal.valid_to IS NULL
          AND (
            EXISTS (
              SELECT 1 FROM public.unit_ownerships uo
              WHERE uo.workspace_id = p_workspace_id
                AND uo.unit_id = p_unit_id
                AND uo.party_id = pal.person_id
                AND uo.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
                AND uo.valid_to IS NULL
            )
            OR EXISTS (
              SELECT 1 FROM public.unit_legal_rights ulr
              WHERE ulr.workspace_id = p_workspace_id
                AND ulr.unit_id = p_unit_id
                AND ulr.party_id = pal.person_id
                AND ulr.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
                AND ulr.valid_to IS NULL
            )
            OR EXISTS (
              SELECT 1 FROM public.unit_occupancies uoc
              WHERE uoc.workspace_id = p_workspace_id
                AND uoc.unit_id = p_unit_id
                AND uoc.person_id = pal.person_id
                AND uoc.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
                AND uoc.valid_to IS NULL
            )
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION private.can_access_unit(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_access_unit(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.require_workspace_capability(
  p_workspace_id uuid,
  p_capability_key text
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  IF NOT private.has_workspace_capability(auth.uid(), p_workspace_id, p_capability_key) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Workspace capability denied',
      DETAIL = jsonb_build_object(
        'error_code', 'WORKSPACE_CAPABILITY_DENIED',
        'workspace_id', p_workspace_id,
        'capability', p_capability_key
      )::text;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.require_workspace_capability(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.require_workspace_capability(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.require_recent_aal2(
  p_max_age interval DEFAULT interval '15 minutes'
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_latest_second_factor timestamptz;
BEGIN
  IF COALESCE(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'MFA step-up is required',
      DETAIL = '{"error_code":"MFA_STEP_UP_REQUIRED","reason":"AAL2_REQUIRED"}';
  END IF;

  SELECT MAX(to_timestamp((entry ->> 'timestamp')::double precision))
  INTO v_latest_second_factor
  FROM jsonb_array_elements(COALESCE(auth.jwt() -> 'amr', '[]'::jsonb)) AS entry
  WHERE entry ->> 'method' IN ('totp', 'webauthn', 'phone')
    AND COALESCE(entry ->> 'timestamp', '') ~ '^[0-9]+([.][0-9]+)?$';

  IF v_latest_second_factor IS NULL OR v_latest_second_factor < now() - p_max_age THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Fresh MFA step-up is required',
      DETAIL = '{"error_code":"MFA_STEP_UP_REQUIRED","reason":"AMR_TOO_OLD"}';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.require_recent_aal2(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.require_recent_aal2(interval) TO authenticated;

CREATE OR REPLACE FUNCTION private.lock_idempotent_command(
  p_actor_profile_id uuid,
  p_command_name text,
  p_idempotency_key uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_resource_id uuid;
BEGIN
  IF p_actor_profile_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Idempotency identity is required',
      DETAIL = '{"error_code":"IDEMPOTENCY_KEY_REQUIRED"}';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_actor_profile_id::text || ':' || p_command_name || ':' || p_idempotency_key::text, 0)
  );

  SELECT cik.resource_id
  INTO v_resource_id
  FROM public.command_idempotency_keys cik
  WHERE cik.actor_profile_id = p_actor_profile_id
    AND cik.command_name = p_command_name
    AND cik.idempotency_key = p_idempotency_key;

  RETURN v_resource_id;
END;
$$;

REVOKE ALL ON FUNCTION private.lock_idempotent_command(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.lock_idempotent_command(uuid, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.record_idempotent_command(
  p_actor_profile_id uuid,
  p_command_name text,
  p_idempotency_key uuid,
  p_resource_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  INSERT INTO public.command_idempotency_keys (
    actor_profile_id, command_name, idempotency_key, resource_id
  ) VALUES (
    p_actor_profile_id, p_command_name, p_idempotency_key, p_resource_id
  )
  ON CONFLICT (actor_profile_id, command_name, idempotency_key) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION private.record_idempotent_command(uuid, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.record_idempotent_command(uuid, text, uuid, uuid) TO authenticated;

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
    current_setting('request.headers', true), COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION private.write_authorization_event(uuid, text, text, uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.write_authorization_event(uuid, text, text, uuid, text, text, jsonb) TO authenticated;

-- Transactional compatibility projection for legacy readers. The normalized
-- model remains authoritative; these helpers run inside the same RPC
-- transaction and avoid application-level dual writes.
CREATE OR REPLACE FUNCTION private.upsert_legacy_membership_projection(
  p_workspace_id uuid,
  p_profile_id uuid,
  p_unit_id uuid,
  p_legacy_role text,
  p_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_membership_id uuid;
BEGIN
  IF p_legacy_role NOT IN ('lako', 'tulajdonos', 'kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Legacy membership role is invalid',
      DETAIL = '{"error_code":"LEGACY_MEMBERSHIP_ROLE_INVALID"}';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    JOIN public.buildings b ON b.id = w.id
    WHERE w.id = p_workspace_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Workspace has no legacy-compatible building',
      DETAIL = '{"error_code":"LEGACY_PRIMARY_BUILDING_ID_INVARIANT"}';
  END IF;

  IF p_unit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = p_unit_id AND u.workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Legacy membership unit is outside the workspace',
      DETAIL = '{"error_code":"LEGACY_MEMBERSHIP_UNIT_SCOPE_MISMATCH"}';
  END IF;

  INSERT INTO public.memberships (
    profile_id, building_id, unit_id, role, active
  ) VALUES (
    p_profile_id, p_workspace_id, p_unit_id, p_legacy_role, p_active
  )
  ON CONFLICT (profile_id, building_id, role) DO UPDATE
  SET unit_id = COALESCE(EXCLUDED.unit_id, public.memberships.unit_id),
      active = EXCLUDED.active
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION private.upsert_legacy_membership_projection(uuid, uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.project_legacy_relationship(
  p_workspace_id uuid,
  p_profile_id uuid,
  p_unit_id uuid,
  p_relationship_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF p_relationship_type NOT IN ('OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Relationship type is invalid for legacy projection',
      DETAIL = '{"error_code":"LEGACY_RELATIONSHIP_TYPE_INVALID"}';
  END IF;

  IF p_relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
    PERFORM private.upsert_legacy_membership_projection(
      p_workspace_id, p_profile_id, p_unit_id, 'tulajdonos', true
    );
  END IF;

  IF p_relationship_type <> 'OWNER' THEN
    PERFORM private.upsert_legacy_membership_projection(
      p_workspace_id, p_profile_id, p_unit_id, 'lako', true
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.project_legacy_relationship(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.project_legacy_workspace_role(
  p_workspace_id uuid,
  p_profile_id uuid,
  p_role_key text,
  p_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_legacy_role text;
BEGIN
  v_legacy_role := CASE p_role_key
    WHEN 'COMMON_REPRESENTATIVE_ADMIN' THEN 'kozos_kepviselo'
    WHEN 'BOARD_ADMIN' THEN 'kozos_kepviselo'
    WHEN 'SELF_MANAGED_ADMIN' THEN 'kozos_kepviselo'
    WHEN 'DELEGATE_OPERATIONS' THEN 'megbizott'
    WHEN 'COMMITTEE_OVERSIGHT' THEN 'bizottsag'
    WHEN 'ACCOUNTANT' THEN 'konyvelo'
    ELSE NULL
  END;

  -- BILLING_ADMIN intentionally has no legacy projection: mapping it to
  -- konyvelo would grant a broader legacy meaning than the normalized role.
  IF v_legacy_role IS NOT NULL THEN
    PERFORM private.upsert_legacy_membership_projection(
      p_workspace_id, p_profile_id, NULL, v_legacy_role, p_active
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.project_legacy_workspace_role(uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.close_legacy_membership_projection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF OLD.status = 'ACTIVE' AND NEW.status <> 'ACTIVE' THEN
    UPDATE public.memberships m
    SET active = false
    WHERE m.profile_id = NEW.profile_id
      AND m.building_id = NEW.workspace_id
      AND m.active;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.close_legacy_membership_projection() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.close_legacy_membership_projection() TO authenticated;

DROP TRIGGER IF EXISTS trg_workspace_memberships_close_legacy_projection
  ON public.workspace_memberships;
CREATE TRIGGER trg_workspace_memberships_close_legacy_projection
AFTER UPDATE OF status ON public.workspace_memberships
FOR EACH ROW EXECUTE FUNCTION private.close_legacy_membership_projection();

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
      AND mm.valid_from <= now()
      AND (mm.valid_to IS NULL OR mm.valid_to > now());

    IF v_mandate_type IS NULL
       OR (NEW.role_key = 'COMMON_REPRESENTATIVE_ADMIN' AND v_mandate_type <> 'COMMON_REPRESENTATIVE')
       OR (NEW.role_key = 'BOARD_ADMIN' AND v_mandate_type <> 'MANAGING_BOARD')
       OR (NEW.role_key = 'SELF_MANAGED_ADMIN' AND v_mandate_type <> 'SELF_MANAGED_COORDINATION') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Role assignment source mandate is invalid',
        DETAIL = '{"error_code":"ROLE_MANDATE_SOURCE_INVALID"}';
    END IF;
  ELSIF NEW.role_key = 'DELEGATE_OPERATIONS' THEN
    SELECT d.capability_keys INTO v_delegation_capabilities
    FROM public.delegations d
    WHERE d.workspace_id = NEW.workspace_id
      AND d.id = NEW.source_delegation_id
      AND d.beneficiary_membership_id = NEW.membership_id
      AND d.status = 'ACTIVE'
      AND d.valid_from <= now()
      AND (d.valid_to IS NULL OR d.valid_to > now());

    IF v_delegation_capabilities IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Role assignment source delegation is invalid',
        DETAIL = '{"error_code":"ROLE_DELEGATION_SOURCE_INVALID"}';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_role_assignment_source() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.validate_role_assignment_source() TO authenticated;

DROP TRIGGER IF EXISTS trg_role_assignments_validate_source ON public.role_assignments;
CREATE CONSTRAINT TRIGGER trg_role_assignments_validate_source
AFTER INSERT OR UPDATE OF workspace_id, membership_id, role_key, source_mandate_id, source_delegation_id, status, valid_from, valid_to
ON public.role_assignments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION private.validate_role_assignment_source();

CREATE OR REPLACE FUNCTION private.assert_active_workspace_legacy_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND NOT (
    EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = NEW.id)
    AND EXISTS (SELECT 1 FROM public.physical_buildings pb WHERE pb.id = NEW.id)
    AND EXISTS (
      SELECT 1 FROM public.workspace_buildings wb
      WHERE wb.workspace_id = NEW.id
        AND wb.physical_building_id = NEW.id
        AND wb.is_primary
        AND wb.valid_to IS NULL
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Active workspace must preserve legacy UUID identity',
      DETAIL = '{"error_code":"LEGACY_PRIMARY_BUILDING_ID_INVARIANT"}';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.assert_active_workspace_legacy_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.assert_active_workspace_legacy_identity() TO authenticated;

DROP TRIGGER IF EXISTS trg_workspaces_legacy_identity ON public.workspaces;
CREATE CONSTRAINT TRIGGER trg_workspaces_legacy_identity
AFTER INSERT OR UPDATE OF status ON public.workspaces
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION private.assert_active_workspace_legacy_identity();

CREATE OR REPLACE FUNCTION private.reject_join_request_offer_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000', MESSAGE = 'Join request offer events are immutable',
    DETAIL = '{"error_code":"JOIN_REQUEST_OFFER_IMMUTABLE"}';
END;
$$;

REVOKE ALL ON FUNCTION private.reject_join_request_offer_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.reject_join_request_offer_mutation() TO authenticated;

DROP TRIGGER IF EXISTS trg_join_request_offers_immutable ON public.join_request_offers;
CREATE TRIGGER trg_join_request_offers_immutable
BEFORE UPDATE OR DELETE ON public.join_request_offers
FOR EACH ROW EXECUTE FUNCTION private.reject_join_request_offer_mutation();

-- ---------------------------------------------------------------------------
-- RLS for the new model: direct client writes are not granted. Reads are
-- caller-bound; addresses and command idempotency remain RPC-only/default deny.
-- ---------------------------------------------------------------------------

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_address_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_agency_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capability_key_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_legal_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_occupancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_request_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_creation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_creation_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorization_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspaces_member_select ON public.workspaces;
CREATE POLICY workspaces_member_select ON public.workspaces
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), id));

-- public.addresses intentionally has no direct SELECT policy. Candidate search
-- is rate-limit-ready and projection-limited through RPCs below.

DROP POLICY IF EXISTS physical_buildings_member_select ON public.physical_buildings;
CREATE POLICY physical_buildings_member_select ON public.physical_buildings
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspace_buildings wb
  WHERE wb.physical_building_id = physical_buildings.id
    AND wb.valid_to IS NULL
    AND private.has_active_workspace_membership(auth.uid(), wb.workspace_id)
));

DROP POLICY IF EXISTS building_address_assignments_member_select ON public.building_address_assignments;
CREATE POLICY building_address_assignments_member_select ON public.building_address_assignments
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspace_buildings wb
  WHERE wb.physical_building_id = building_address_assignments.physical_building_id
    AND wb.valid_to IS NULL
    AND private.has_active_workspace_membership(auth.uid(), wb.workspace_id)
));

DROP POLICY IF EXISTS workspace_buildings_member_select ON public.workspace_buildings;
CREATE POLICY workspace_buildings_member_select ON public.workspace_buildings
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), workspace_id));

DROP POLICY IF EXISTS parties_subject_select ON public.parties;
CREATE POLICY parties_subject_select ON public.parties
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.person_account_links pal
    WHERE pal.profile_id = auth.uid()
      AND pal.person_id = parties.id
      AND pal.status = 'ACTIVE'
      AND pal.valid_to IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.profile_id = auth.uid()
      AND om.organization_id = parties.id
      AND om.status = 'ACTIVE'
      AND om.valid_to IS NULL
  )
);

DROP POLICY IF EXISTS people_subject_select ON public.people;
CREATE POLICY people_subject_select ON public.people
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.person_account_links pal
  WHERE pal.profile_id = auth.uid()
    AND pal.person_id = people.party_id
    AND pal.status = 'ACTIVE'
    AND pal.valid_to IS NULL
));

DROP POLICY IF EXISTS organizations_member_select ON public.organizations;
CREATE POLICY organizations_member_select ON public.organizations
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_memberships om
  WHERE om.profile_id = auth.uid()
    AND om.organization_id = organizations.party_id
    AND om.status = 'ACTIVE'
    AND om.valid_to IS NULL
));

DROP POLICY IF EXISTS person_account_links_self_select ON public.person_account_links;
CREATE POLICY person_account_links_self_select ON public.person_account_links
FOR SELECT TO authenticated USING (profile_id = auth.uid());

DROP POLICY IF EXISTS management_agency_details_member_select ON public.management_agency_details;
CREATE POLICY management_agency_details_member_select ON public.management_agency_details
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_memberships om
  WHERE om.profile_id = auth.uid()
    AND om.organization_id = management_agency_details.organization_id
    AND om.status = 'ACTIVE'
    AND om.valid_to IS NULL
));

DROP POLICY IF EXISTS organization_memberships_self_select ON public.organization_memberships;
CREATE POLICY organization_memberships_self_select ON public.organization_memberships
FOR SELECT TO authenticated USING (profile_id = auth.uid());

DROP POLICY IF EXISTS workspace_memberships_scoped_select ON public.workspace_memberships;
CREATE POLICY workspace_memberships_scoped_select ON public.workspace_memberships
FOR SELECT TO authenticated
USING (
  profile_id = auth.uid()
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'MEMBER_DIRECTORY_READ')
);

DROP POLICY IF EXISTS membership_periods_scoped_select ON public.membership_periods;
CREATE POLICY membership_periods_scoped_select ON public.membership_periods
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspace_memberships wm
  WHERE wm.workspace_id = membership_periods.workspace_id
    AND wm.id = membership_periods.membership_id
    AND (
      wm.profile_id = auth.uid()
      OR private.has_workspace_capability(auth.uid(), wm.workspace_id, 'MEMBER_DIRECTORY_READ')
    )
));

DROP POLICY IF EXISTS role_templates_authenticated_select ON public.role_templates;
CREATE POLICY role_templates_authenticated_select ON public.role_templates
FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS role_capabilities_authenticated_select ON public.role_capabilities;
CREATE POLICY role_capabilities_authenticated_select ON public.role_capabilities
FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS capability_key_map_authenticated_select ON public.capability_key_map;
CREATE POLICY capability_key_map_authenticated_select ON public.capability_key_map
FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS role_assignments_scoped_select ON public.role_assignments;
CREATE POLICY role_assignments_scoped_select ON public.role_assignments
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspace_memberships wm
  WHERE wm.workspace_id = role_assignments.workspace_id
    AND wm.id = role_assignments.membership_id
    AND (
      wm.profile_id = auth.uid()
      OR private.has_workspace_capability(auth.uid(), wm.workspace_id, 'MEMBER_DIRECTORY_READ')
    )
));

DROP POLICY IF EXISTS management_mandates_scoped_select ON public.management_mandates;
CREATE POLICY management_mandates_scoped_select ON public.management_mandates
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.person_account_links pal
    WHERE pal.profile_id = auth.uid()
      AND pal.person_id = management_mandates.mandate_party_id
      AND pal.status = 'ACTIVE'
      AND pal.valid_to IS NULL
  )
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'AUDIT_READ')
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'GOVERNANCE_MANAGE')
);

DROP POLICY IF EXISTS delegations_scoped_select ON public.delegations;
CREATE POLICY delegations_scoped_select ON public.delegations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.workspace_id = delegations.workspace_id
      AND wm.id = delegations.beneficiary_membership_id
      AND wm.profile_id = auth.uid()
  )
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'GOVERNANCE_MANAGE')
);

DROP POLICY IF EXISTS unit_relations_scoped_select ON public.unit_relations;
CREATE POLICY unit_relations_scoped_select ON public.unit_relations
FOR SELECT TO authenticated
USING (
  private.can_access_unit(auth.uid(), workspace_id, parent_unit_id)
  OR private.can_access_unit(auth.uid(), workspace_id, child_unit_id)
);

DROP POLICY IF EXISTS billing_groups_scoped_select ON public.billing_groups;
CREATE POLICY billing_groups_scoped_select ON public.billing_groups
FOR SELECT TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'FINANCE_READ'));

DROP POLICY IF EXISTS billing_group_members_scoped_select ON public.billing_group_members;
CREATE POLICY billing_group_members_scoped_select ON public.billing_group_members
FOR SELECT TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'FINANCE_READ'));

DROP POLICY IF EXISTS unit_ownerships_scoped_select ON public.unit_ownerships;
CREATE POLICY unit_ownerships_scoped_select ON public.unit_ownerships
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.person_account_links pal
    WHERE pal.profile_id = auth.uid()
      AND pal.person_id = unit_ownerships.party_id
      AND pal.status = 'ACTIVE'
      AND pal.valid_to IS NULL
  )
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'UNIT_READ_ALL')
);

DROP POLICY IF EXISTS unit_legal_rights_scoped_select ON public.unit_legal_rights;
CREATE POLICY unit_legal_rights_scoped_select ON public.unit_legal_rights
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.person_account_links pal
    WHERE pal.profile_id = auth.uid()
      AND pal.person_id = unit_legal_rights.party_id
      AND pal.status = 'ACTIVE'
      AND pal.valid_to IS NULL
  )
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'UNIT_READ_ALL')
);

DROP POLICY IF EXISTS unit_occupancies_scoped_select ON public.unit_occupancies;
CREATE POLICY unit_occupancies_scoped_select ON public.unit_occupancies
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.person_account_links pal
    WHERE pal.profile_id = auth.uid()
      AND pal.person_id = unit_occupancies.person_id
      AND pal.status = 'ACTIVE'
      AND pal.valid_to IS NULL
  )
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'UNIT_READ_ALL')
);

DROP POLICY IF EXISTS membership_invitations_scoped_select ON public.membership_invitations;
CREATE POLICY membership_invitations_scoped_select ON public.membership_invitations
FOR SELECT TO authenticated
USING (
  created_by_profile_id = auth.uid()
  OR invited_email_normalized = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'MEMBERSHIP_INVITE')
);

DROP POLICY IF EXISTS join_requests_scoped_select ON public.join_requests;
CREATE POLICY join_requests_scoped_select ON public.join_requests
FOR SELECT TO authenticated
USING (
  requester_profile_id = auth.uid()
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'MEMBERSHIP_REVIEW')
);

DROP POLICY IF EXISTS join_request_offers_scoped_select ON public.join_request_offers;
CREATE POLICY join_request_offers_scoped_select ON public.join_request_offers
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.join_requests jr
  WHERE jr.id = join_request_offers.join_request_id
    AND jr.workspace_id = join_request_offers.workspace_id
    AND (
      jr.requester_profile_id = auth.uid()
      OR private.has_workspace_capability(auth.uid(), jr.workspace_id, 'MEMBERSHIP_REVIEW')
    )
));

DROP POLICY IF EXISTS community_creation_requests_subject_select ON public.community_creation_requests;
CREATE POLICY community_creation_requests_subject_select ON public.community_creation_requests
FOR SELECT TO authenticated USING (claimant_profile_id = auth.uid());

DROP POLICY IF EXISTS community_creation_attestations_subject_select ON public.community_creation_attestations;
CREATE POLICY community_creation_attestations_subject_select ON public.community_creation_attestations
FOR SELECT TO authenticated
USING (
  attestor_profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_creation_requests ccr
    WHERE ccr.id = community_creation_attestations.community_creation_request_id
      AND ccr.claimant_profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS authorization_audit_events_scoped_select ON public.authorization_audit_events;
CREATE POLICY authorization_audit_events_scoped_select ON public.authorization_audit_events
FOR SELECT TO authenticated
USING (
  actor_profile_id = auth.uid()
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'AUDIT_READ')
);

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'workspaces', 'addresses', 'physical_buildings', 'building_address_assignments',
    'workspace_buildings', 'parties', 'people', 'organizations',
    'person_account_links', 'management_agency_details', 'organization_memberships',
    'workspace_memberships', 'membership_periods', 'role_templates',
    'role_capabilities', 'capability_key_map', 'management_mandates', 'delegations', 'role_assignments',
    'unit_relations', 'billing_groups', 'billing_group_members', 'unit_ownerships',
    'unit_legal_rights', 'unit_occupancies', 'membership_invitations',
    'join_requests', 'join_request_offers', 'community_creation_requests',
    'community_creation_attestations', 'authorization_audit_events',
    'command_idempotency_keys'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', v_table);
  END LOOP;
END;
$$;

GRANT SELECT ON TABLE
  public.workspaces,
  public.physical_buildings,
  public.building_address_assignments,
  public.workspace_buildings,
  public.parties,
  public.people,
  public.organizations,
  public.person_account_links,
  public.management_agency_details,
  public.organization_memberships,
  public.workspace_memberships,
  public.membership_periods,
  public.role_templates,
  public.role_capabilities,
  public.capability_key_map,
  public.management_mandates,
  public.delegations,
  public.role_assignments,
  public.unit_relations,
  public.billing_groups,
  public.billing_group_members,
  public.unit_ownerships,
  public.unit_legal_rights,
  public.unit_occupancies,
  public.membership_invitations,
  public.join_requests,
  public.join_request_offers,
  public.community_creation_requests,
  public.community_creation_attestations,
  public.authorization_audit_events
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
   AND mm.valid_from <= now()
   AND (mm.valid_to IS NULL OR mm.valid_to > now())
  LEFT JOIN public.delegations d
    ON d.workspace_id = ra.workspace_id
   AND d.id = ra.source_delegation_id
   AND d.status = 'ACTIVE'
   AND d.valid_from <= now()
   AND (d.valid_to IS NULL OR d.valid_to > now())
  WHERE wm.profile_id = p_profile_id
    AND wm.workspace_id = p_workspace_id
    AND wm.status = 'ACTIVE'
    AND (
      (ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN') AND mm.id IS NOT NULL)
      OR (ra.role_key = 'DELEGATE_OPERATIONS' AND d.id IS NOT NULL)
      OR ra.role_key IN ('COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN')
    );
$$;

REVOKE ALL ON FUNCTION private.effective_role_keys(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.effective_role_keys(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.effective_capabilities(
  p_profile_id uuid,
  p_workspace_id uuid
)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  WITH candidate(internal_key) AS (
    SELECT UNNEST(ARRAY[
      'WORKSPACE_READ', 'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED',
      'COMMUNICATION_READ', 'DOCUMENT_READ', 'DOCUMENT_OWNER_READ',
      'DOCUMENT_UNIT_READ', 'MEETING_READ', 'VOTE_CAST', 'TICKET_CREATE',
      'TICKET_READ_OWN', 'METER_SUBMIT', 'METER_READ_OWN',
      'ENVIRONMENT_READ', 'FINANCE_UNIT_READ'
    ]::text[])
    WHERE private.has_active_workspace_membership(p_profile_id, p_workspace_id)
    UNION
    SELECT rc.capability_key
    FROM public.role_capabilities rc
    WHERE rc.role_key = ANY(private.effective_role_keys(p_profile_id, p_workspace_id))
      AND private.has_workspace_capability(p_profile_id, p_workspace_id, rc.capability_key)
  )
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT ckm.canonical_key ORDER BY ckm.canonical_key),
    ARRAY[]::text[]
  )
  FROM candidate c
  JOIN public.capability_key_map ckm ON ckm.internal_key = c.internal_key;
$$;

REVOKE ALL ON FUNCTION private.effective_capabilities(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.effective_capabilities(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.related_unit_ids(
  p_profile_id uuid,
  p_workspace_id uuid
)
RETURNS uuid[]
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
  ), related AS (
    SELECT uo.unit_id
    FROM public.unit_ownerships uo JOIN my_people mp ON mp.person_id = uo.party_id
    WHERE uo.workspace_id = p_workspace_id
      AND uo.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
      AND uo.valid_to IS NULL
    UNION
    SELECT ulr.unit_id
    FROM public.unit_legal_rights ulr JOIN my_people mp ON mp.person_id = ulr.party_id
    WHERE ulr.workspace_id = p_workspace_id
      AND ulr.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
      AND ulr.valid_to IS NULL
    UNION
    SELECT uoc.unit_id
    FROM public.unit_occupancies uoc JOIN my_people mp ON mp.person_id = uoc.person_id
    WHERE uoc.workspace_id = p_workspace_id
      AND uoc.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
      AND uoc.valid_to IS NULL
  )
  SELECT COALESCE(ARRAY_AGG(DISTINCT unit_id ORDER BY unit_id), ARRAY[]::uuid[])
  FROM related;
$$;

REVOKE ALL ON FUNCTION private.related_unit_ids(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.related_unit_ids(uuid, uuid) TO authenticated;

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
    FROM public.unit_ownerships uo JOIN my_people mp ON mp.person_id = uo.party_id
    WHERE uo.workspace_id = p_workspace_id
      AND uo.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
      AND uo.valid_to IS NULL
    UNION
    SELECT uoc.occupancy_type
    FROM public.unit_occupancies uoc JOIN my_people mp ON mp.person_id = uoc.person_id
    WHERE uoc.workspace_id = p_workspace_id
      AND uoc.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
      AND uoc.valid_to IS NULL
    UNION
    SELECT ulr.right_type
    FROM public.unit_legal_rights ulr JOIN my_people mp ON mp.person_id = ulr.party_id
    WHERE ulr.workspace_id = p_workspace_id
      AND ulr.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
      AND ulr.valid_to IS NULL
  )
  SELECT COALESCE(ARRAY_AGG(DISTINCT label ORDER BY label), ARRAY[]::text[])
  FROM labels;
$$;

REVOKE ALL ON FUNCTION private.relationship_labels(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.relationship_labels(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_address_candidates(
  p_query text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  address_id uuid,
  formatted_address text,
  verification_status text,
  similarity_score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT
    a.id,
    a.formatted_address,
    a.verification_status,
    similarity(a.canonical_key, public.normalize_address_key(p_query))::real
  FROM public.addresses a
  WHERE auth.uid() IS NOT NULL
    AND a.valid_to IS NULL
    AND a.address_level = 'BUILDING'
    AND similarity(a.canonical_key, public.normalize_address_key(p_query)) >= 0.20
  ORDER BY 4 DESC, a.formatted_address
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 25);
$$;

REVOKE ALL ON FUNCTION public.search_address_candidates(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_address_candidates(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_joinable_communities(
  p_query text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  workspace_id uuid,
  workspace_name text,
  primary_building_id uuid,
  address text,
  governance_mode text,
  match_score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT
    w.id,
    w.name,
    wb.physical_building_id,
    a.formatted_address,
    w.governance_mode,
    similarity(a.canonical_key, public.normalize_address_key(p_query))::real
  FROM public.workspaces w
  JOIN public.workspace_buildings wb
    ON wb.workspace_id = w.id
   AND wb.is_primary
   AND wb.valid_to IS NULL
  JOIN public.building_address_assignments baa
    ON baa.physical_building_id = wb.physical_building_id
   AND baa.assignment_role = 'PRIMARY'
   AND baa.valid_to IS NULL
  JOIN public.addresses a
    ON a.id = baa.address_id
   AND a.valid_to IS NULL
  WHERE auth.uid() IS NOT NULL
    AND w.status = 'ACTIVE'
    AND similarity(a.canonical_key, public.normalize_address_key(p_query)) >= 0.20
  ORDER BY 6 DESC, w.name
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 25);
$$;

REVOKE ALL ON FUNCTION public.search_joinable_communities(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_joinable_communities(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_joinable_units(p_workspace_id uuid)
RETURNS TABLE (
  unit_id uuid,
  designation text,
  unit_category text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT u.id, u.designation, u.unit_category
  FROM public.units u
  JOIN public.workspaces w ON w.id = u.workspace_id
  WHERE auth.uid() IS NOT NULL
    AND u.workspace_id = p_workspace_id
    AND u.status = 'ACTIVE'
    AND w.status = 'ACTIVE'
  ORDER BY u.normalized_designation, u.id
  LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.list_joinable_units(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_joinable_units(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_workspaces()
RETURNS TABLE (
  workspace_id uuid,
  workspace_name text,
  primary_building_id uuid,
  address text,
  governance_mode text,
  role_keys text[],
  relationship_labels text[],
  unit_count bigint,
  open_tickets bigint,
  member_since timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT
    w.id,
    w.name,
    wb.physical_building_id,
    COALESCE(a.formatted_address, b.address),
    w.governance_mode,
    private.effective_role_keys(auth.uid(), w.id),
    private.relationship_labels(auth.uid(), w.id),
    (SELECT COUNT(*) FROM public.units u WHERE u.workspace_id = w.id AND u.status = 'ACTIVE'),
    (SELECT COUNT(*) FROM public.tickets t WHERE t.workspace_id = w.id AND t.status <> 'lezarva'),
    mp.started_at
  FROM public.workspace_memberships wm
  JOIN public.membership_periods mp
    ON mp.workspace_id = wm.workspace_id
   AND mp.membership_id = wm.id
   AND mp.ended_at IS NULL
  JOIN public.workspaces w ON w.id = wm.workspace_id
  JOIN public.workspace_buildings wb
    ON wb.workspace_id = w.id
   AND wb.is_primary
   AND wb.valid_to IS NULL
  LEFT JOIN public.buildings b ON b.id = w.id
  LEFT JOIN public.building_address_assignments baa
    ON baa.physical_building_id = wb.physical_building_id
   AND baa.assignment_role = 'PRIMARY'
   AND baa.valid_to IS NULL
  LEFT JOIN public.addresses a ON a.id = baa.address_id AND a.valid_to IS NULL
  WHERE wm.profile_id = auth.uid()
    AND wm.status = 'ACTIVE'
    AND w.status IN ('ACTIVE', 'SUSPENDED')
  ORDER BY w.name, w.id;
$$;

REVOKE ALL ON FUNCTION public.get_my_workspaces() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_workspaces() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_workspace_context(p_workspace_id uuid)
RETURNS TABLE (
  workspace_id uuid,
  workspace_name text,
  primary_building_id uuid,
  building_name text,
  address text,
  governance_mode text,
  role_keys text[],
  relationship_labels text[],
  capabilities text[],
  related_unit_ids uuid[],
  primary_unit_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT
    w.id,
    w.name,
    wb.physical_building_id,
    pb.canonical_name,
    COALESCE(a.formatted_address, b.address),
    w.governance_mode,
    private.effective_role_keys(auth.uid(), w.id),
    private.relationship_labels(auth.uid(), w.id),
    private.effective_capabilities(auth.uid(), w.id),
    private.related_unit_ids(auth.uid(), w.id),
    CASE
      WHEN wm.primary_context_unit_id = ANY(private.related_unit_ids(auth.uid(), w.id))
        OR private.has_workspace_capability(auth.uid(), w.id, 'UNIT_READ_ALL')
      THEN wm.primary_context_unit_id
      ELSE (private.related_unit_ids(auth.uid(), w.id))[1]
    END
  FROM public.workspace_memberships wm
  JOIN public.membership_periods mp
    ON mp.workspace_id = wm.workspace_id
   AND mp.membership_id = wm.id
   AND mp.ended_at IS NULL
  JOIN public.workspaces w ON w.id = wm.workspace_id
  JOIN public.workspace_buildings wb
    ON wb.workspace_id = w.id
   AND wb.is_primary
   AND wb.valid_to IS NULL
  JOIN public.physical_buildings pb ON pb.id = wb.physical_building_id
  LEFT JOIN public.buildings b ON b.id = w.id
  LEFT JOIN public.building_address_assignments baa
    ON baa.physical_building_id = wb.physical_building_id
   AND baa.assignment_role = 'PRIMARY'
   AND baa.valid_to IS NULL
  LEFT JOIN public.addresses a ON a.id = baa.address_id AND a.valid_to IS NULL
  WHERE wm.profile_id = auth.uid()
    AND wm.workspace_id = p_workspace_id
    AND wm.status = 'ACTIVE'
    AND w.status IN ('ACTIVE', 'SUSPENDED');
$$;

REVOKE ALL ON FUNCTION public.get_workspace_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_context(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_join_requests()
RETURNS TABLE (
  request_id uuid,
  workspace_id uuid,
  workspace_name text,
  request_status text,
  requested_relationship_type text,
  requested_unit_id uuid,
  requested_unit_designation text,
  review_reason text,
  submitted_at timestamptz,
  expires_at timestamptz,
  latest_counter_offer_id uuid,
  latest_counter_offer_relationship_type text,
  latest_counter_offer_unit_id uuid,
  latest_counter_offer_unit_designation text,
  latest_counter_offer_reason text,
  latest_counter_offer_accepted boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT
    jr.id,
    jr.workspace_id,
    w.name,
    jr.status,
    jr.requested_relationship_type,
    jr.requested_unit_id,
    requested_unit.designation,
    jr.review_reason,
    jr.created_at,
    jr.expires_at,
    latest_offer.id,
    latest_offer.offered_relationship_type,
    latest_offer.offered_unit_id,
    offered_unit.designation,
    latest_offer.reason,
    CASE
      WHEN latest_offer.id IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.join_request_offers accepted
        WHERE accepted.supersedes_offer_id = latest_offer.id
          AND accepted.event_type = 'ACCEPTED'
      )
    END
  FROM public.join_requests jr
  JOIN public.workspaces w ON w.id = jr.workspace_id
  LEFT JOIN public.units requested_unit
    ON requested_unit.id = jr.requested_unit_id
   AND requested_unit.workspace_id = jr.workspace_id
  LEFT JOIN LATERAL (
    SELECT jro.id, jro.offered_relationship_type, jro.offered_unit_id, jro.reason
    FROM public.join_request_offers jro
    WHERE jro.join_request_id = jr.id
      AND jro.workspace_id = jr.workspace_id
      AND jro.event_type = 'COUNTER_OFFER'
    ORDER BY jro.created_at DESC, jro.id DESC
    LIMIT 1
  ) latest_offer ON true
  LEFT JOIN public.units offered_unit
    ON offered_unit.id = latest_offer.offered_unit_id
   AND offered_unit.workspace_id = jr.workspace_id
  WHERE auth.uid() IS NOT NULL
    AND jr.requester_profile_id = auth.uid()
  ORDER BY jr.created_at DESC, jr.id DESC;
$$;

REVOKE ALL ON FUNCTION public.list_my_join_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_join_requests() TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_workspace_id uuid,
  p_unit_id uuid,
  p_relationship_type text,
  p_message text,
  p_idempotency_key uuid
)
RETURNS TABLE (request_id uuid, request_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_request_id uuid := gen_random_uuid();
  v_person_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  PERFORM public.ensure_profile();
  v_existing := private.lock_idempotent_command(v_actor, 'submit_join_request', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT jr.id, jr.status FROM public.join_requests jr WHERE jr.id = v_existing;
    RETURN;
  END IF;

  IF p_relationship_type NOT IN ('OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Unsupported relationship type',
      DETAIL = '{"error_code":"RELATIONSHIP_TYPE_INVALID"}';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.workspaces w ON w.id = u.workspace_id
    WHERE u.id = p_unit_id
      AND u.workspace_id = p_workspace_id
      AND u.status = 'ACTIVE'
      AND w.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join target is not available',
      DETAIL = '{"error_code":"JOIN_TARGET_NOT_AVAILABLE"}';
  END IF;

  SELECT pal.person_id INTO v_person_id
  FROM public.person_account_links pal
  WHERE pal.profile_id = v_actor AND pal.status = 'ACTIVE' AND pal.valid_to IS NULL
  LIMIT 1;

  INSERT INTO public.join_requests (
    id, workspace_id, requested_unit_id, requester_profile_id,
    requester_person_id, requested_relationship_type, message, status,
    idempotency_key
  ) VALUES (
    v_request_id, p_workspace_id, p_unit_id, v_actor,
    v_person_id, p_relationship_type, NULLIF(BTRIM(p_message), ''), 'PENDING',
    p_idempotency_key
  );

  PERFORM private.record_idempotent_command(v_actor, 'submit_join_request', p_idempotency_key, v_request_id);
  PERFORM private.write_authorization_event(
    p_workspace_id, 'JOIN_REQUEST_SUBMITTED', 'join_request', v_request_id,
    'STATE_CHANGE', NULL, jsonb_build_object('relationship_type', p_relationship_type)
  );

  RETURN QUERY SELECT v_request_id, 'PENDING'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_join_request(uuid, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, uuid, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_join_request_offer(
  p_request_id uuid,
  p_offer_id uuid
)
RETURNS TABLE (request_id uuid, request_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_request public.join_requests%ROWTYPE;
  v_offer public.join_request_offers%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  SELECT * INTO v_request
  FROM public.join_requests jr
  WHERE jr.id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL OR v_request.requester_profile_id <> v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Join request offer is not available',
      DETAIL = '{"error_code":"JOIN_OFFER_NOT_AVAILABLE"}';
  END IF;

  SELECT * INTO v_offer
  FROM public.join_request_offers jro
  WHERE jro.id = p_offer_id
    AND jro.join_request_id = p_request_id
    AND jro.workspace_id = v_request.workspace_id
    AND jro.event_type = 'COUNTER_OFFER';

  IF v_offer.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Counter-offer is not available',
      DETAIL = '{"error_code":"COUNTER_OFFER_NOT_AVAILABLE"}';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.join_request_offers accepted
    WHERE accepted.supersedes_offer_id = p_offer_id AND accepted.event_type = 'ACCEPTED'
  ) THEN
    RETURN QUERY SELECT v_request.id, v_request.status;
    RETURN;
  END IF;

  INSERT INTO public.join_request_offers (
    join_request_id, workspace_id, event_type, offered_relationship_type,
    offered_unit_id, supersedes_offer_id, actor_profile_id, reason
  ) VALUES (
    v_request.id, v_request.workspace_id, 'ACCEPTED',
    v_offer.offered_relationship_type, v_offer.offered_unit_id,
    v_offer.id, v_actor, 'REQUESTER_ACCEPTED_COUNTER_OFFER'
  );

  UPDATE public.join_requests
  SET requested_relationship_type = v_offer.offered_relationship_type,
      requested_unit_id = v_offer.offered_unit_id,
      status = 'PENDING',
      version = version + 1,
      reviewer_profile_id = NULL,
      review_reason = NULL,
      reviewed_at = NULL,
      updated_at = now()
  WHERE id = v_request.id;

  PERFORM private.write_authorization_event(
    v_request.workspace_id, 'JOIN_COUNTER_OFFER_ACCEPTED', 'join_request', v_request.id,
    'STATE_CHANGE', NULL, jsonb_build_object('offer_id', v_offer.id)
  );

  RETURN QUERY SELECT v_request.id, 'PENDING'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_join_request_offer(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_join_request_offer(uuid, uuid) TO authenticated;

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
  v_party_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  PERFORM public.ensure_profile();
  v_existing := private.lock_idempotent_command(v_actor, 'create_community_creation_request', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    RETURN QUERY
    SELECT ccr.id, ccr.status, ccr.reserved_workspace_id, ccr.address_id
    FROM public.community_creation_requests ccr WHERE ccr.id = v_existing;
    RETURN;
  END IF;

  IF NULLIF(BTRIM(p_community_name), '') IS NULL OR v_canonical_key = '' OR p_unit_count <= 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Community request fields are invalid',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_INVALID"}';
  END IF;
  IF p_governance_mode NOT IN ('REPRESENTATIVE_MANAGED', 'BOARD_MANAGED', 'SELF_MANAGED') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Governance mode is invalid',
      DETAIL = '{"error_code":"GOVERNANCE_MODE_INVALID"}';
  END IF;

  -- Exact canonical identity is serialized; pg_trgm similarity is only a
  -- candidate/review aid and is never used for an automatic merge.
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
     AND wb.is_primary
     AND wb.valid_to IS NULL
    JOIN public.workspaces w ON w.id = wb.workspace_id AND w.status = 'ACTIVE'
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
  WHERE pal.profile_id = v_actor AND pal.status = 'ACTIVE' AND pal.valid_to IS NULL
  LIMIT 1;

  INSERT INTO public.community_creation_requests (
    id, reserved_workspace_id, claimant_profile_id, claimant_party_id,
    address_id, community_name, legal_form, governance_mode,
    declared_unit_count, status, idempotency_key
  ) VALUES (
    v_request_id, v_reserved_workspace_id, v_actor, v_party_id,
    v_address_id, BTRIM(p_community_name), UPPER(BTRIM(p_legal_form)), p_governance_mode,
    p_unit_count, 'PENDING_VERIFICATION', p_idempotency_key
  );

  -- HOLD: activation is intentionally not client-granted in this rollout. A
  -- reviewed activation command must create workspaces.id, buildings.id and
  -- physical_buildings.id from reserved_workspace_id in one transaction.
  PERFORM private.record_idempotent_command(
    v_actor, 'create_community_creation_request', p_idempotency_key, v_request_id
  );
  PERFORM private.write_authorization_event(
    NULL, 'COMMUNITY_CREATION_REQUESTED', 'community_creation_request', v_request_id,
    'STATE_CHANGE', 'PENDING_VERIFICATION',
    jsonb_build_object('reserved_workspace_id', v_reserved_workspace_id, 'address_id', v_address_id)
  );

  RETURN QUERY
  SELECT v_request_id, 'PENDING_VERIFICATION'::text, v_reserved_workspace_id, v_address_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_community_creation_request(text, text, text, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_community_creation_request(text, text, text, integer, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_workspace_unit(
  p_workspace_id uuid,
  p_designation text,
  p_unit_category text,
  p_parent_unit_id uuid,
  p_idempotency_key uuid
)
RETURNS TABLE (unit_id uuid, designation text, unit_category text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_unit_id uuid := gen_random_uuid();
  v_building_id uuid;
  v_designation text := NULLIF(BTRIM(p_designation), '');
  v_category text := UPPER(BTRIM(COALESCE(p_unit_category, 'APARTMENT')));
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'UNIT_MANAGE');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  v_existing := private.lock_idempotent_command(v_actor, 'create_workspace_unit', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT u.id, u.designation, u.unit_category FROM public.units u WHERE u.id = v_existing;
    RETURN;
  END IF;

  IF v_designation IS NULL OR v_category NOT IN ('APARTMENT', 'GARAGE', 'STORAGE', 'COMMERCIAL', 'OTHER') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Unit fields are invalid',
      DETAIL = '{"error_code":"UNIT_INPUT_INVALID"}';
  END IF;

  SELECT wb.physical_building_id INTO v_building_id
  FROM public.workspace_buildings wb
  JOIN public.workspaces w ON w.id = wb.workspace_id
  WHERE wb.workspace_id = p_workspace_id
    AND wb.is_primary
    AND wb.valid_to IS NULL
    AND w.status = 'ACTIVE'
  FOR UPDATE OF wb;

  -- First-rollout compatibility: the legacy dashboard and /w/{uuid} expect the
  -- tenant UUID to also be the primary building UUID.
  IF v_building_id IS NULL OR v_building_id <> p_workspace_id
     OR NOT EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = p_workspace_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Workspace is not legacy-compatible',
      DETAIL = '{"error_code":"LEGACY_PRIMARY_BUILDING_ID_INVARIANT"}';
  END IF;

  IF p_parent_unit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.units parent
    WHERE parent.id = p_parent_unit_id
      AND parent.workspace_id = p_workspace_id
      AND parent.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Parent unit is outside the workspace',
      DETAIL = '{"error_code":"PARENT_UNIT_NOT_AVAILABLE"}';
  END IF;

  INSERT INTO public.units (
    id, building_id, unit_label, unit_type, workspace_id,
    physical_building_id, designation, normalized_designation,
    unit_category, creation_idempotency_key, created_by_profile_id, status
  ) VALUES (
    v_unit_id, v_building_id, v_designation,
    CASE v_category
      WHEN 'APARTMENT' THEN 'Lakas'
      WHEN 'GARAGE' THEN 'Garazs'
      WHEN 'STORAGE' THEN 'Tarolo'
      WHEN 'COMMERCIAL' THEN 'Uzlethelyiseg'
      ELSE 'Egyeb'
    END,
    p_workspace_id, v_building_id, v_designation,
    private.normalize_unit_designation(v_designation), v_category,
    p_idempotency_key, v_actor, 'ACTIVE'
  );

  IF p_parent_unit_id IS NOT NULL THEN
    INSERT INTO public.unit_relations (
      workspace_id, parent_unit_id, child_unit_id, relation_type
    ) VALUES (
      p_workspace_id, p_parent_unit_id, v_unit_id, 'ACCESSORY_OF'
    );
  END IF;

  PERFORM private.record_idempotent_command(v_actor, 'create_workspace_unit', p_idempotency_key, v_unit_id);
  PERFORM private.write_authorization_event(
    p_workspace_id, 'UNIT_CREATED', 'unit', v_unit_id, 'STATE_CHANGE', NULL,
    jsonb_build_object('category', v_category, 'parent_unit_id', p_parent_unit_id)
  );

  RETURN QUERY SELECT v_unit_id, v_designation, v_category;
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace_unit(uuid, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace_unit(uuid, text, text, uuid, uuid) TO authenticated;

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
  v_existing uuid;
  v_invitation_id uuid := gen_random_uuid();
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_expiry timestamptz := COALESCE(p_expires_at, now() + interval '7 days');
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'MEMBERSHIP_INVITE');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  v_existing := private.lock_idempotent_command(v_actor, 'issue_membership_invitation', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    RETURN QUERY
    SELECT mi.id, NULL::text, mi.expires_at
    FROM public.membership_invitations mi WHERE mi.id = v_existing;
    RETURN;
  END IF;

  IF NULLIF(BTRIM(p_email), '') IS NULL
     OR p_relationship_type NOT IN ('OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT')
     OR v_expiry <= now()
     OR NOT EXISTS (
       SELECT 1 FROM public.units u
       WHERE u.id = p_unit_id AND u.workspace_id = p_workspace_id AND u.status = 'ACTIVE'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Invitation fields are invalid',
      DETAIL = '{"error_code":"MEMBERSHIP_INVITATION_INVALID"}';
  END IF;

  INSERT INTO public.membership_invitations (
    id, workspace_id, invited_email_normalized, unit_id, relationship_type,
    token_hash, status, expires_at, created_by_profile_id, idempotency_key
  ) VALUES (
    v_invitation_id, p_workspace_id, LOWER(BTRIM(p_email)), p_unit_id, p_relationship_type,
    encode(digest(v_token, 'sha256'), 'hex'), 'PENDING', v_expiry, v_actor, p_idempotency_key
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'issue_membership_invitation', p_idempotency_key, v_invitation_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id, 'MEMBERSHIP_INVITATION_ISSUED', 'membership_invitation', v_invitation_id,
    'STATE_CHANGE', NULL, jsonb_build_object('unit_id', p_unit_id, 'relationship_type', p_relationship_type)
  );

  RETURN QUERY SELECT v_invitation_id, v_token, v_expiry;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_membership_invitation(uuid, text, uuid, text, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_membership_invitation(uuid, text, uuid, text, timestamptz, uuid) TO authenticated;

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

  PERFORM private.project_legacy_relationship(
    v_invitation.workspace_id,
    v_actor,
    v_invitation.unit_id,
    v_invitation.relationship_type
  );

  UPDATE public.membership_invitations
  SET status = 'ACCEPTED', accepted_at = now(), accepted_by_profile_id = v_actor, updated_at = now()
  WHERE id = v_invitation.id;

  PERFORM private.record_idempotent_command(
    v_actor, 'accept_membership_invitation', p_idempotency_key, v_membership_id
  );
  PERFORM private.write_authorization_event(
    v_invitation.workspace_id, 'MEMBERSHIP_INVITATION_ACCEPTED',
    'workspace_membership', v_membership_id, 'STATE_CHANGE', NULL,
    jsonb_build_object('invitation_id', v_invitation.id)
  );

  RETURN QUERY SELECT v_membership_id, v_invitation.workspace_id, 'ACTIVE'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_membership_invitation(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_membership_invitation(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_join_request(
  p_request_id uuid,
  p_decision text,
  p_offered_relationship_type text,
  p_offered_unit_id uuid,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  offer_id uuid,
  workspace_membership_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_request public.join_requests%ROWTYPE;
  v_offer_id uuid;
  v_membership_id uuid;
  v_person_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  SELECT * INTO v_request
  FROM public.join_requests jr
  WHERE jr.id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request was not found',
      DETAIL = '{"error_code":"JOIN_REQUEST_NOT_FOUND"}';
  END IF;

  PERFORM private.require_workspace_capability(v_request.workspace_id, 'MEMBERSHIP_REVIEW');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF v_request.requester_profile_id = v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Self approval is forbidden',
      DETAIL = '{"error_code":"SELF_APPROVAL_FORBIDDEN"}';
  END IF;

  v_existing := private.lock_idempotent_command(v_actor, 'review_join_request', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    RETURN QUERY
    SELECT jr.id, jr.status,
      (SELECT jro.id FROM public.join_request_offers jro
       WHERE jro.join_request_id = jr.id AND jro.actor_profile_id = v_actor
       ORDER BY jro.created_at DESC, jro.id DESC LIMIT 1),
      (SELECT wm.id FROM public.workspace_memberships wm
       WHERE wm.workspace_id = jr.workspace_id AND wm.profile_id = jr.requester_profile_id)
    FROM public.join_requests jr WHERE jr.id = v_existing;
    RETURN;
  END IF;

  IF v_request.status NOT IN ('PENDING', 'NEEDS_EVIDENCE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Join request is not reviewable',
      DETAIL = '{"error_code":"JOIN_REQUEST_NOT_REVIEWABLE"}';
  END IF;

  IF p_decision = 'COUNTER_OFFER' THEN
    IF p_offered_relationship_type NOT IN ('OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT')
       OR NOT EXISTS (
         SELECT 1 FROM public.units u
         WHERE u.id = p_offered_unit_id
           AND u.workspace_id = v_request.workspace_id
           AND u.status = 'ACTIVE'
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Counter-offer is invalid',
        DETAIL = '{"error_code":"COUNTER_OFFER_INVALID"}';
    END IF;

    v_offer_id := gen_random_uuid();
    INSERT INTO public.join_request_offers (
      id, join_request_id, workspace_id, event_type, offered_relationship_type,
      offered_unit_id, actor_profile_id, reason
    ) VALUES (
      v_offer_id, v_request.id, v_request.workspace_id, 'COUNTER_OFFER',
      p_offered_relationship_type, p_offered_unit_id, v_actor, NULLIF(BTRIM(p_reason), '')
    );

    UPDATE public.join_requests
    SET status = 'NEEDS_EVIDENCE', version = version + 1,
        reviewer_profile_id = v_actor, review_reason = p_reason,
        reviewed_at = now(), updated_at = now()
    WHERE id = v_request.id;

  ELSIF p_decision = 'NEEDS_EVIDENCE' THEN
    v_offer_id := gen_random_uuid();
    INSERT INTO public.join_request_offers (
      id, join_request_id, workspace_id, event_type, actor_profile_id, reason
    ) VALUES (
      v_offer_id, v_request.id, v_request.workspace_id, 'REVIEW_NOTE', v_actor,
      NULLIF(BTRIM(p_reason), '')
    );
    UPDATE public.join_requests
    SET status = 'NEEDS_EVIDENCE', version = version + 1,
        reviewer_profile_id = v_actor, review_reason = p_reason,
        reviewed_at = now(), updated_at = now()
    WHERE id = v_request.id;

  ELSIF p_decision = 'REJECT' THEN
    UPDATE public.join_requests
    SET status = 'REJECTED', version = version + 1,
        reviewer_profile_id = v_actor, review_reason = p_reason,
        reviewed_at = now(), updated_at = now()
    WHERE id = v_request.id;

  ELSIF p_decision = 'APPROVE' THEN
    SELECT pal.person_id INTO v_person_id
    FROM public.person_account_links pal
    WHERE pal.profile_id = v_request.requester_profile_id
      AND pal.status = 'ACTIVE' AND pal.valid_to IS NULL
    LIMIT 1;

    IF v_person_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Requester person identity is incomplete',
        DETAIL = '{"error_code":"REQUESTER_PERSON_LINK_REQUIRED"}';
    END IF;

    INSERT INTO public.workspace_memberships (
      workspace_id, profile_id, status, source, created_by_profile_id, primary_context_unit_id
    ) VALUES (
      v_request.workspace_id, v_request.requester_profile_id, 'ACTIVE', 'JOIN_REQUEST',
      v_actor, v_request.requested_unit_id
    )
    ON CONFLICT ON CONSTRAINT workspace_memberships_workspace_profile_uq DO UPDATE
    SET status = 'ACTIVE', source = 'JOIN_REQUEST',
        primary_context_unit_id = COALESCE(EXCLUDED.primary_context_unit_id, public.workspace_memberships.primary_context_unit_id),
        updated_at = now()
    RETURNING id INTO v_membership_id;

    INSERT INTO public.membership_periods (
      workspace_id, membership_id, started_at, start_reason,
      source_join_request_id, created_by_profile_id
    )
    SELECT
      v_request.workspace_id, v_membership_id, now(), 'JOIN_REQUEST_APPROVED',
      v_request.id, v_actor
    WHERE NOT EXISTS (
      SELECT 1 FROM public.membership_periods mp
      WHERE mp.membership_id = v_membership_id AND mp.ended_at IS NULL
    );

    IF v_request.requested_relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
      INSERT INTO public.unit_ownerships (
        workspace_id, unit_id, party_id, ownership_type, status,
        verification_method, verified_at, verified_by_profile_id,
        source, evidence_reference, valid_from
      ) VALUES (
        v_request.workspace_id, v_request.requested_unit_id, v_person_id,
        'SOLE_OWNER', 'VERIFIED', 'JOIN_REQUEST_REVIEW', now(), v_actor,
        'JOIN_REQUEST', v_request.id::text, now()
      )
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_request.requested_relationship_type <> 'OWNER' THEN
      INSERT INTO public.unit_occupancies (
        workspace_id, unit_id, person_id, occupancy_type, status,
        verification_method, verified_at, verified_by_profile_id,
        source, source_join_request_id, valid_from
      ) VALUES (
        v_request.workspace_id, v_request.requested_unit_id, v_person_id,
        CASE v_request.requested_relationship_type
          WHEN 'OWNER_OCCUPANT' THEN 'OWNER_OCCUPANT'
          WHEN 'TENANT' THEN 'TENANT'
          WHEN 'HOUSEHOLD_MEMBER' THEN 'HOUSEHOLD_MEMBER'
          ELSE 'AUTHORIZED_OCCUPANT'
        END,
        'VERIFIED', 'JOIN_REQUEST_REVIEW', now(), v_actor,
        'JOIN_REQUEST', v_request.id, now()
      )
      ON CONFLICT DO NOTHING;
    END IF;

    PERFORM private.project_legacy_relationship(
      v_request.workspace_id,
      v_request.requester_profile_id,
      v_request.requested_unit_id,
      v_request.requested_relationship_type
    );

    UPDATE public.join_requests
    SET status = 'APPROVED', version = version + 1,
        reviewer_profile_id = v_actor, review_reason = p_reason,
        reviewed_at = now(), updated_at = now()
    WHERE id = v_request.id;

  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Review decision is invalid',
      DETAIL = '{"error_code":"JOIN_REVIEW_DECISION_INVALID"}';
  END IF;

  PERFORM private.record_idempotent_command(
    v_actor, 'review_join_request', p_idempotency_key, v_request.id
  );
  PERFORM private.write_authorization_event(
    v_request.workspace_id, 'JOIN_REQUEST_REVIEWED', 'join_request', v_request.id,
    'STATE_CHANGE', p_decision,
    jsonb_build_object('offer_id', v_offer_id, 'membership_id', v_membership_id)
  );

  RETURN QUERY
  SELECT
    v_request.id,
    CASE p_decision
      WHEN 'APPROVE' THEN 'APPROVED'
      WHEN 'REJECT' THEN 'REJECTED'
      ELSE 'NEEDS_EVIDENCE'
    END::text,
    v_offer_id,
    v_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_join_request(uuid, text, text, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_join_request(uuid, text, text, uuid, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_workspace_join_requests(p_workspace_id uuid)
RETURNS TABLE (
  request_id uuid,
  request_status text,
  requested_relationship_type text,
  requested_unit_id uuid,
  unit_designation text,
  requester_display_name text,
  submitted_at timestamptz,
  expires_at timestamptz,
  latest_offer_id uuid,
  latest_offer_relationship_type text,
  latest_offer_unit_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'MEMBERSHIP_REVIEW');

  RETURN QUERY
  SELECT
    jr.id,
    jr.status,
    jr.requested_relationship_type,
    jr.requested_unit_id,
    u.designation,
    p.display_name,
    jr.created_at,
    jr.expires_at,
    latest_offer.id,
    latest_offer.offered_relationship_type,
    latest_offer.offered_unit_id
  FROM public.join_requests jr
  JOIN public.profiles p ON p.id = jr.requester_profile_id
  LEFT JOIN public.units u
    ON u.id = jr.requested_unit_id AND u.workspace_id = jr.workspace_id
  LEFT JOIN LATERAL (
    SELECT jro.id, jro.offered_relationship_type, jro.offered_unit_id
    FROM public.join_request_offers jro
    WHERE jro.join_request_id = jr.id AND jro.event_type = 'COUNTER_OFFER'
    ORDER BY jro.created_at DESC, jro.id DESC
    LIMIT 1
  ) latest_offer ON true
  WHERE jr.workspace_id = p_workspace_id
    AND jr.status IN ('PENDING', 'NEEDS_EVIDENCE')
  ORDER BY jr.created_at, jr.id
  LIMIT 500;
END;
$$;

REVOKE ALL ON FUNCTION public.list_workspace_join_requests(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_workspace_join_requests(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_workspace_members(p_workspace_id uuid)
RETURNS TABLE (
  membership_id uuid,
  profile_id uuid,
  display_name text,
  membership_status text,
  primary_unit_designation text,
  role_keys text[],
  role_assignment_ids uuid[],
  effective_capabilities text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF NOT (
    private.has_workspace_capability(auth.uid(), p_workspace_id, 'MEMBERSHIP_REVIEW')
    OR private.has_workspace_capability(auth.uid(), p_workspace_id, 'MEMBER_DIRECTORY_READ')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Workspace member directory access denied',
      DETAIL = '{"error_code":"WORKSPACE_CAPABILITY_REQUIRED","required_any":["membership.approve","member.directory.read_minimal"]}';
  END IF;

  RETURN QUERY
  SELECT
    wm.id,
    wm.profile_id,
    p.display_name,
    wm.status,
    u.designation,
    private.effective_role_keys(wm.profile_id, wm.workspace_id),
    ARRAY(
      SELECT ra.id
      FROM public.role_assignments ra
      WHERE ra.workspace_id = wm.workspace_id
        AND ra.membership_id = wm.id
        AND ra.status = 'ACTIVE'
        AND ra.valid_from <= now()
        AND (ra.valid_to IS NULL OR ra.valid_to > now())
        AND ra.role_key = ANY(private.effective_role_keys(wm.profile_id, wm.workspace_id))
      ORDER BY ra.valid_from, ra.id
    )::uuid[],
    private.effective_capabilities(wm.profile_id, wm.workspace_id)
  FROM public.workspace_memberships wm
  JOIN public.profiles p ON p.id = wm.profile_id
  LEFT JOIN public.units u
    ON u.workspace_id = wm.workspace_id
   AND u.id = wm.primary_context_unit_id
  WHERE wm.workspace_id = p_workspace_id
    AND wm.status <> 'ENDED'
  ORDER BY p.display_name, wm.profile_id
  LIMIT 1000;
END;
$$;

REVOKE ALL ON FUNCTION public.list_workspace_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_workspace_members(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_reminder_send(
  p_reminder_rule_id uuid,
  p_profile_id uuid,
  p_channel text,
  p_days_before_deadline integer,
  p_idempotency_key uuid
)
RETURNS TABLE (reminder_send_id uuid, send_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_send_id uuid;
  v_workspace_id uuid;
  v_channels text[];
  v_reminder_days integer[];
  v_enabled boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;

  SELECT rr.workspace_id, rr.channels, rr.reminder_days, rr.enabled
  INTO v_workspace_id, v_channels, v_reminder_days, v_enabled
  FROM public.reminder_rules rr
  WHERE rr.id = p_reminder_rule_id
  FOR UPDATE;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Reminder rule was not found',
      DETAIL = '{"error_code":"REMINDER_RULE_NOT_FOUND"}';
  END IF;

  PERFORM private.require_workspace_capability(v_workspace_id, 'REMINDER_MANAGE');
  v_existing := private.lock_idempotent_command(v_actor, 'record_reminder_send', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT rs.id, 'EXISTING'::text
    FROM public.reminder_sends rs WHERE rs.id = v_existing;
    RETURN;
  END IF;

  IF NOT v_enabled
     OR NULLIF(BTRIM(p_channel), '') IS NULL
     OR NOT (p_channel = ANY(v_channels))
     OR NOT (p_days_before_deadline = ANY(v_reminder_days)) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Reminder send does not match the active rule',
      DETAIL = '{"error_code":"REMINDER_SEND_RULE_MISMATCH"}';
  END IF;

  IF NOT private.has_active_workspace_membership(p_profile_id, v_workspace_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Reminder recipient is not an active workspace member',
      DETAIL = '{"error_code":"REMINDER_RECIPIENT_NOT_ACTIVE"}';
  END IF;

  INSERT INTO public.reminder_sends (
    reminder_rule_id, profile_id, channel, days_before_deadline
  ) VALUES (
    p_reminder_rule_id, p_profile_id, p_channel, p_days_before_deadline
  )
  ON CONFLICT (reminder_rule_id, profile_id, days_before_deadline) DO NOTHING
  RETURNING id INTO v_send_id;

  IF v_send_id IS NULL THEN
    SELECT rs.id INTO v_send_id
    FROM public.reminder_sends rs
    WHERE rs.reminder_rule_id = p_reminder_rule_id
      AND rs.profile_id = p_profile_id
      AND rs.days_before_deadline = p_days_before_deadline;
  END IF;

  PERFORM private.record_idempotent_command(
    v_actor, 'record_reminder_send', p_idempotency_key, v_send_id
  );
  PERFORM private.write_authorization_event(
    v_workspace_id, 'REMINDER_SEND_RECORDED', 'reminder_send', v_send_id,
    'STATE_CHANGE', NULL,
    jsonb_build_object(
      'reminder_rule_id', p_reminder_rule_id,
      'recipient_profile_id', p_profile_id,
      'channel', p_channel,
      'days_before_deadline', p_days_before_deadline
    )
  );

  RETURN QUERY SELECT v_send_id, 'RECORDED'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.record_reminder_send(uuid, uuid, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_reminder_send(uuid, uuid, text, integer, uuid) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS role_assignments_one_active_role_uq
  ON public.role_assignments (workspace_id, membership_id, role_key)
  WHERE status = 'ACTIVE';

CREATE OR REPLACE FUNCTION public.grant_workspace_role(
  p_workspace_id uuid,
  p_profile_id uuid,
  p_role_key text,
  p_capability_keys text[],
  p_valid_to timestamptz,
  p_idempotency_key uuid
)
RETURNS TABLE (
  role_assignment_id uuid,
  delegation_id uuid,
  assignment_status text,
  effective_capabilities text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_grantor_membership_id uuid;
  v_target_membership_id uuid;
  v_source_mandate_id uuid;
  v_assignment_id uuid := gen_random_uuid();
  v_delegation_id uuid;
  v_internal_capabilities text[];
  v_invalid_count integer;
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'ROLE_GRANT_LIMITED');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  -- Limited role grant is available only to a direct mandate-backed admin.
  -- A delegated operator can never redelegate, even if a future template drifts.
  SELECT wm.id, ra.source_mandate_id
  INTO v_grantor_membership_id, v_source_mandate_id
  FROM public.workspace_memberships wm
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
   AND mm.valid_from <= now()
   AND (mm.valid_to IS NULL OR mm.valid_to > now())
  WHERE wm.workspace_id = p_workspace_id
    AND wm.profile_id = v_actor
    AND wm.status = 'ACTIVE'
  ORDER BY ra.valid_from DESC
  LIMIT 1;

  IF v_grantor_membership_id IS NULL OR v_source_mandate_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'A direct mandate-backed admin is required',
      DETAIL = '{"error_code":"DIRECT_ADMIN_GRANT_REQUIRED"}';
  END IF;

  IF p_role_key NOT IN ('DELEGATE_OPERATIONS', 'COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Admin roles require governance transfer',
      DETAIL = '{"error_code":"ADMIN_ROLE_LIMITED_GRANT_FORBIDDEN"}';
  END IF;
  IF p_valid_to IS NOT NULL AND p_valid_to <= now() THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Role expiry must be in the future',
      DETAIL = '{"error_code":"ROLE_VALIDITY_INVALID"}';
  END IF;

  SELECT wm.id INTO v_target_membership_id
  FROM public.workspace_memberships wm
  JOIN public.membership_periods mp
    ON mp.workspace_id = wm.workspace_id
   AND mp.membership_id = wm.id
   AND mp.ended_at IS NULL
  WHERE wm.workspace_id = p_workspace_id
    AND wm.profile_id = p_profile_id
    AND wm.status = 'ACTIVE'
  FOR UPDATE OF wm;

  IF v_target_membership_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Target profile is not an active workspace member',
      DETAIL = '{"error_code":"TARGET_MEMBERSHIP_REQUIRED"}';
  END IF;

  v_existing := private.lock_idempotent_command(v_actor, 'grant_workspace_role', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    RETURN QUERY
    SELECT ra.id, ra.source_delegation_id, ra.status,
      private.effective_capabilities(p_profile_id, p_workspace_id)
    FROM public.role_assignments ra WHERE ra.id = v_existing;
    RETURN;
  END IF;

  SELECT ra.id INTO v_existing
  FROM public.role_assignments ra
  WHERE ra.workspace_id = p_workspace_id
    AND ra.membership_id = v_target_membership_id
    AND ra.role_key = p_role_key
    AND ra.status = 'ACTIVE'
  LIMIT 1;
  IF v_existing IS NOT NULL THEN
    PERFORM private.project_legacy_workspace_role(
      p_workspace_id, p_profile_id, p_role_key, true
    );
    PERFORM private.record_idempotent_command(
      v_actor, 'grant_workspace_role', p_idempotency_key, v_existing
    );
    RETURN QUERY
    SELECT ra.id, ra.source_delegation_id, ra.status,
      private.effective_capabilities(p_profile_id, p_workspace_id)
    FROM public.role_assignments ra WHERE ra.id = v_existing;
    RETURN;
  END IF;

  IF p_role_key = 'DELEGATE_OPERATIONS' THEN
    IF p_capability_keys IS NULL OR CARDINALITY(p_capability_keys) = 0 THEN
      v_internal_capabilities := ARRAY[
        'WORKSPACE_READ', 'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED',
        'UNIT_READ_ALL', 'MEMBER_DIRECTORY_READ', 'TICKET_MANAGE',
        'DOCUMENT_MANAGE', 'COMMUNICATION_MANAGE', 'REMINDER_MANAGE', 'METER_MANAGE'
      ]::text[];
    ELSE
      SELECT ARRAY_AGG(DISTINCT COALESCE(ckm.internal_key, requested.capability_key) ORDER BY COALESCE(ckm.internal_key, requested.capability_key))
      INTO v_internal_capabilities
      FROM UNNEST(p_capability_keys) AS requested(capability_key)
      LEFT JOIN public.capability_key_map ckm
        ON ckm.canonical_key = requested.capability_key
        OR ckm.internal_key = requested.capability_key;
    END IF;

    SELECT COUNT(*) INTO v_invalid_count
    FROM UNNEST(v_internal_capabilities) requested(internal_key)
    WHERE requested.internal_key NOT IN (
      'WORKSPACE_READ', 'BUILDING_READ', 'UNIT_DIRECTORY_READ_MASKED',
      'UNIT_READ_ALL', 'MEMBER_DIRECTORY_READ', 'MEMBERSHIP_INVITE',
      'MEMBERSHIP_REVIEW', 'TICKET_MANAGE', 'DOCUMENT_MANAGE',
      'COMMUNICATION_MANAGE', 'REMINDER_MANAGE', 'METER_MANAGE'
    )
    OR NOT private.has_workspace_capability(v_actor, p_workspace_id, requested.internal_key)
    OR NOT EXISTS (
      SELECT 1 FROM public.role_capabilities rc
      WHERE rc.role_key = 'DELEGATE_OPERATIONS'
        AND rc.capability_key = requested.internal_key
    );

    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501', MESSAGE = 'Delegation capabilities exceed the limited grant boundary',
        DETAIL = '{"error_code":"DELEGATION_CAPABILITY_FORBIDDEN"}';
    END IF;

    v_delegation_id := gen_random_uuid();
    INSERT INTO public.delegations (
      id, workspace_id, source_mandate_id, granted_by_membership_id,
      beneficiary_membership_id, capability_keys, status, valid_from,
      valid_to, can_redelegate, reason
    ) VALUES (
      v_delegation_id, p_workspace_id, v_source_mandate_id, v_grantor_membership_id,
      v_target_membership_id, v_internal_capabilities, 'ACTIVE', now(),
      p_valid_to, false, 'LIMITED_ROLE_GRANT'
    );
  ELSIF p_capability_keys IS NOT NULL AND CARDINALITY(p_capability_keys) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Custom capabilities require a delegation role',
      DETAIL = '{"error_code":"CUSTOM_CAPABILITIES_ROLE_INVALID"}';
  END IF;

  INSERT INTO public.role_assignments (
    id, workspace_id, membership_id, role_key, source_delegation_id,
    status, valid_from, valid_to, granted_by_profile_id, reason
  ) VALUES (
    v_assignment_id, p_workspace_id, v_target_membership_id, p_role_key,
    v_delegation_id, 'ACTIVE', now(), p_valid_to, v_actor, 'LIMITED_ROLE_GRANT'
  );

  PERFORM private.project_legacy_workspace_role(
    p_workspace_id, p_profile_id, p_role_key, true
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'grant_workspace_role', p_idempotency_key, v_assignment_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id, 'WORKSPACE_ROLE_GRANTED', 'role_assignment', v_assignment_id,
    'STATE_CHANGE', p_role_key,
    jsonb_build_object(
      'target_profile_id', p_profile_id,
      'delegation_id', v_delegation_id,
      'valid_to', p_valid_to
    )
  );

  RETURN QUERY SELECT
    v_assignment_id,
    v_delegation_id,
    'ACTIVE'::text,
    private.effective_capabilities(p_profile_id, p_workspace_id);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_workspace_role(uuid, uuid, text, text[], timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_workspace_role(uuid, uuid, text, text[], timestamptz, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_workspace_role(
  p_workspace_id uuid,
  p_role_assignment_id uuid,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS TABLE (role_assignment_id uuid, assignment_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_grantor_membership_id uuid;
  v_assignment public.role_assignments%ROWTYPE;
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'ROLE_GRANT_LIMITED');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  SELECT wm.id INTO v_grantor_membership_id
  FROM public.workspace_memberships wm
  JOIN public.role_assignments ra
    ON ra.workspace_id = wm.workspace_id
   AND ra.membership_id = wm.id
   AND ra.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')
   AND ra.status = 'ACTIVE'
  JOIN public.management_mandates mm
    ON mm.workspace_id = ra.workspace_id
   AND mm.id = ra.source_mandate_id
   AND mm.status = 'ACTIVE'
   AND mm.valid_from <= now()
   AND (mm.valid_to IS NULL OR mm.valid_to > now())
  WHERE wm.workspace_id = p_workspace_id
    AND wm.profile_id = v_actor
    AND wm.status = 'ACTIVE'
  LIMIT 1;

  IF v_grantor_membership_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'A direct mandate-backed admin is required',
      DETAIL = '{"error_code":"DIRECT_ADMIN_GRANT_REQUIRED"}';
  END IF;

  v_existing := private.lock_idempotent_command(v_actor, 'revoke_workspace_role', p_idempotency_key);
  IF v_existing IS NOT NULL THEN
    RETURN QUERY
    SELECT ra.id, ra.status FROM public.role_assignments ra WHERE ra.id = v_existing;
    RETURN;
  END IF;

  SELECT * INTO v_assignment
  FROM public.role_assignments ra
  WHERE ra.id = p_role_assignment_id AND ra.workspace_id = p_workspace_id
  FOR UPDATE;

  IF v_assignment.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Role assignment was not found',
      DETAIL = '{"error_code":"ROLE_ASSIGNMENT_NOT_FOUND"}';
  END IF;
  IF v_assignment.role_key NOT IN ('DELEGATE_OPERATIONS', 'COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Admin role revocation requires governance transfer',
      DETAIL = '{"error_code":"ADMIN_ROLE_LIMITED_REVOKE_FORBIDDEN"}';
  END IF;

  UPDATE public.role_assignments
  SET status = 'REVOKED',
      valid_to = GREATEST(clock_timestamp(), valid_from + interval '1 microsecond'),
      revoked_by_profile_id = v_actor, reason = NULLIF(BTRIM(p_reason), ''),
      updated_at = now()
  WHERE id = v_assignment.id;

  IF v_assignment.source_delegation_id IS NOT NULL THEN
    UPDATE public.delegations
    SET status = 'REVOKED',
        valid_to = GREATEST(clock_timestamp(), valid_from + interval '1 microsecond'),
        reason = NULLIF(BTRIM(p_reason), ''), updated_at = now()
    WHERE id = v_assignment.source_delegation_id
      AND workspace_id = p_workspace_id;
  END IF;

  PERFORM private.project_legacy_workspace_role(
    p_workspace_id,
    (SELECT wm.profile_id
     FROM public.workspace_memberships wm
     WHERE wm.id = v_assignment.membership_id
       AND wm.workspace_id = p_workspace_id),
    v_assignment.role_key,
    false
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'revoke_workspace_role', p_idempotency_key, v_assignment.id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id, 'WORKSPACE_ROLE_REVOKED', 'role_assignment', v_assignment.id,
    'STATE_CHANGE', v_assignment.role_key,
    jsonb_build_object('reason', p_reason)
  );

  RETURN QUERY SELECT v_assignment.id, 'REVOKED'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_workspace_role(uuid, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_workspace_role(uuid, uuid, text, uuid) TO authenticated;

-- Legacy wrappers retain their exact return signatures while delegating to the
-- new neutral workspace context. get_my_buildings now emits one row/workspace.
CREATE OR REPLACE FUNCTION public.get_my_buildings()
RETURNS TABLE (
  building_id uuid,
  building_name text,
  address text,
  user_role text,
  unit_count bigint,
  open_tickets bigint,
  member_since timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT
    mw.workspace_id,
    mw.workspace_name,
    mw.address,
    CASE
      WHEN 'COMMON_REPRESENTATIVE_ADMIN' = ANY(mw.role_keys) THEN 'kozos_kepviselo'
      WHEN 'BOARD_ADMIN' = ANY(mw.role_keys) THEN 'kozos_kepviselo'
      WHEN 'SELF_MANAGED_ADMIN' = ANY(mw.role_keys) THEN 'kozos_kepviselo'
      WHEN 'DELEGATE_OPERATIONS' = ANY(mw.role_keys) THEN 'megbizott'
      WHEN 'COMMITTEE_OVERSIGHT' = ANY(mw.role_keys) THEN 'bizottsag'
      WHEN 'ACCOUNTANT' = ANY(mw.role_keys) THEN 'konyvelo'
      WHEN 'OWNER' = ANY(mw.relationship_labels) THEN 'tulajdonos'
      ELSE 'lako'
    END,
    mw.unit_count,
    mw.open_tickets,
    mw.member_since
  FROM public.get_my_workspaces() mw;
$$;

REVOKE ALL ON FUNCTION public.get_my_buildings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_buildings() TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_building_membership(_building_id uuid)
RETURNS TABLE (is_member boolean, user_role text, unit_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT
    true,
    CASE
      WHEN 'COMMON_REPRESENTATIVE_ADMIN' = ANY(private.effective_role_keys(auth.uid(), wm.workspace_id)) THEN 'kozos_kepviselo'
      WHEN 'BOARD_ADMIN' = ANY(private.effective_role_keys(auth.uid(), wm.workspace_id)) THEN 'kozos_kepviselo'
      WHEN 'SELF_MANAGED_ADMIN' = ANY(private.effective_role_keys(auth.uid(), wm.workspace_id)) THEN 'kozos_kepviselo'
      WHEN 'DELEGATE_OPERATIONS' = ANY(private.effective_role_keys(auth.uid(), wm.workspace_id)) THEN 'megbizott'
      WHEN 'COMMITTEE_OVERSIGHT' = ANY(private.effective_role_keys(auth.uid(), wm.workspace_id)) THEN 'bizottsag'
      WHEN 'ACCOUNTANT' = ANY(private.effective_role_keys(auth.uid(), wm.workspace_id)) THEN 'konyvelo'
      WHEN 'OWNER' = ANY(private.relationship_labels(auth.uid(), wm.workspace_id)) THEN 'tulajdonos'
      ELSE 'lako'
    END,
    CASE
      WHEN wm.primary_context_unit_id = ANY(private.related_unit_ids(auth.uid(), wm.workspace_id))
        OR private.has_workspace_capability(auth.uid(), wm.workspace_id, 'UNIT_READ_ALL')
      THEN wm.primary_context_unit_id
      ELSE (private.related_unit_ids(auth.uid(), wm.workspace_id))[1]
    END
  FROM public.workspace_memberships wm
  JOIN public.membership_periods mp
    ON mp.workspace_id = wm.workspace_id
   AND mp.membership_id = wm.id
   AND mp.ended_at IS NULL
  WHERE wm.profile_id = auth.uid()
    AND wm.workspace_id = _building_id
    AND wm.status = 'ACTIVE'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_building_membership(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_building_membership(uuid) TO authenticated;

COMMIT;
