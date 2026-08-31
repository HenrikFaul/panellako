-- v0.10.8 - named platform-operator authority, approvals, support sessions,
-- durable action quotas and release attestations.
--
-- This migration is additive. The v2 platform_job_commands receipt, payload
-- identity and global-lock semantics introduced by 20260830130000 remain
-- unchanged; nullable authority columns only enrich future executions.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.platform_operator_roles (
  role_key     text PRIMARY KEY,
  display_name text NOT NULL,
  description  text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_operator_roles_key_check CHECK (
    role_key ~ '^[A-Z][A-Z0-9_]{2,63}$'
  )
);

CREATE TABLE IF NOT EXISTS public.platform_operator_role_capabilities (
  role_key       text NOT NULL REFERENCES public.platform_operator_roles(role_key) ON DELETE CASCADE,
  capability_key text NOT NULL,
  risk_class      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_key, capability_key),
  CONSTRAINT platform_operator_role_capabilities_key_check CHECK (
    capability_key ~ '^platform[.][a-z0-9_.-]{2,95}$'
  ),
  CONSTRAINT platform_operator_role_capabilities_risk_check CHECK (
    risk_class IN ('R0', 'R1', 'R2', 'R3', 'R4')
  )
);

CREATE TABLE IF NOT EXISTS public.platform_operator_assignments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  role_key              text NOT NULL REFERENCES public.platform_operator_roles(role_key) ON DELETE RESTRICT,
  valid_from            timestamptz NOT NULL DEFAULT now(),
  valid_to              timestamptz,
  granted_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  grant_reason          text NOT NULL DEFAULT 'bootstrap',
  revoked_at            timestamptz,
  revoked_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revocation_reason     text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_operator_assignments_window_check CHECK (
    valid_to IS NULL OR valid_to > valid_from
  ),
  CONSTRAINT platform_operator_assignments_grant_reason_check CHECK (
    char_length(btrim(grant_reason)) BETWEEN 3 AND 1000
  ),
  CONSTRAINT platform_operator_assignments_revocation_check CHECK (
    (revoked_at IS NULL AND revoked_by_profile_id IS NULL AND revocation_reason IS NULL)
    OR (
      revoked_at IS NOT NULL
      AND revoked_at >= created_at
      AND revocation_reason IS NOT NULL
      AND char_length(btrim(revocation_reason)) BETWEEN 3 AND 1000
    )
  )
);

CREATE INDEX IF NOT EXISTS platform_operator_assignments_profile_active_idx
  ON public.platform_operator_assignments (profile_id, valid_from, valid_to)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS private.platform_operator_action_rate_limits (
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_key        text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count     integer NOT NULL CHECK (request_count > 0),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, action_key),
  CONSTRAINT platform_operator_action_rate_limits_action_check CHECK (
    action_key ~ '^platform[.][a-z0-9_.-]{2,95}$'
  )
);

CREATE TABLE IF NOT EXISTS private.platform_operator_action_receipts (
  profile_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_key       text NOT NULL,
  idempotency_key  uuid NOT NULL,
  payload_digest   text NOT NULL,
  result           jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, action_key, idempotency_key),
  CONSTRAINT platform_operator_action_receipts_action_check CHECK (
    action_key ~ '^platform[.][a-z0-9_.-]{2,95}$'
  ),
  CONSTRAINT platform_operator_action_receipts_digest_check CHECK (
    payload_digest ~ '^sha256:[0-9a-f]{64}$'
  ),
  CONSTRAINT platform_operator_action_receipts_result_check CHECK (
    jsonb_typeof(result) = 'object' AND pg_column_size(result) <= 65536
  )
);

CREATE TABLE IF NOT EXISTS public.platform_command_approvals (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approver_profile_id         uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  capability_key              text NOT NULL,
  action_key                  text NOT NULL,
  target_type                 text NOT NULL,
  target_id                   text NOT NULL,
  request_payload             jsonb NOT NULL,
  payload_digest              text NOT NULL,
  reason                      text NOT NULL,
  status                      text NOT NULL DEFAULT 'PENDING',
  decision_reason             text,
  idempotency_key             uuid NOT NULL,
  consumption_idempotency_key uuid,
  requested_at                timestamptz NOT NULL DEFAULT now(),
  expires_at                  timestamptz NOT NULL,
  decided_at                  timestamptz,
  consumed_at                 timestamptz,
  UNIQUE (initiator_profile_id, idempotency_key),
  CONSTRAINT platform_command_approvals_capability_check CHECK (
    capability_key ~ '^platform[.][a-z0-9_.-]{2,95}$'
  ),
  CONSTRAINT platform_command_approvals_action_check CHECK (
    action_key ~ '^platform[.][a-z0-9_.-]{2,95}$'
  ),
  CONSTRAINT platform_command_approvals_target_check CHECK (
    target_type ~ '^[a-z][a-z0-9_.-]{1,63}$'
    AND char_length(target_id) BETWEEN 1 AND 320
  ),
  CONSTRAINT platform_command_approvals_payload_check CHECK (
    jsonb_typeof(request_payload) = 'object'
    AND payload_digest ~ '^sha256:[0-9a-f]{64}$'
    AND pg_column_size(request_payload) <= 65536
  ),
  CONSTRAINT platform_command_approvals_reason_check CHECK (
    char_length(btrim(reason)) BETWEEN 3 AND 1000
  ),
  CONSTRAINT platform_command_approvals_status_check CHECK (
    status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONSUMED', 'CANCELLED')
  ),
  CONSTRAINT platform_command_approvals_window_check CHECK (
    expires_at > requested_at
    AND expires_at <= requested_at + interval '30 minutes'
  ),
  CONSTRAINT platform_command_approvals_four_eyes_check CHECK (
    approver_profile_id IS NULL OR approver_profile_id <> initiator_profile_id
  ),
  CONSTRAINT platform_command_approvals_state_check CHECK (
    (
      status = 'PENDING'
      AND approver_profile_id IS NULL
      AND decided_at IS NULL
      AND consumed_at IS NULL
      AND consumption_idempotency_key IS NULL
    )
    OR (
      status IN ('APPROVED', 'REJECTED')
      AND approver_profile_id IS NOT NULL
      AND decided_at IS NOT NULL
      AND decision_reason IS NOT NULL
      AND char_length(btrim(decision_reason)) BETWEEN 3 AND 1000
      AND consumed_at IS NULL
      AND consumption_idempotency_key IS NULL
    )
    OR (
      status = 'CONSUMED'
      AND approver_profile_id IS NOT NULL
      AND decided_at IS NOT NULL
      AND decision_reason IS NOT NULL
      AND consumed_at IS NOT NULL
      AND consumption_idempotency_key IS NOT NULL
    )
    OR (
      status IN ('EXPIRED', 'CANCELLED')
      AND consumed_at IS NULL
      AND consumption_idempotency_key IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS platform_command_approvals_pending_idx
  ON public.platform_command_approvals (expires_at, requested_at)
  WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS public.platform_support_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approver_profile_id   uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  scope_type            text NOT NULL,
  workspace_id          uuid REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  agency_id             uuid REFERENCES public.management_agency_details(organization_id) ON DELETE RESTRICT,
  capability_keys       text[] NOT NULL DEFAULT ARRAY[]::text[],
  access_mode           text NOT NULL DEFAULT 'READ_ONLY',
  reason                text NOT NULL,
  status                text NOT NULL DEFAULT 'PENDING',
  decision_reason       text,
  idempotency_key       uuid NOT NULL,
  requested_at          timestamptz NOT NULL DEFAULT now(),
  activated_at          timestamptz,
  expires_at            timestamptz NOT NULL,
  decided_at            timestamptz,
  revoked_at            timestamptz,
  revoked_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revocation_reason     text,
  UNIQUE (requester_profile_id, idempotency_key),
  CONSTRAINT platform_support_sessions_scope_check CHECK (
    (scope_type = 'WORKSPACE' AND workspace_id IS NOT NULL AND agency_id IS NULL)
    OR (scope_type = 'AGENCY' AND agency_id IS NOT NULL AND workspace_id IS NULL)
  ),
  CONSTRAINT platform_support_sessions_capabilities_check CHECK (
    cardinality(capability_keys) BETWEEN 1 AND 32
  ),
  CONSTRAINT platform_support_sessions_access_mode_check CHECK (
    access_mode IN ('READ_ONLY', 'WRITE')
  ),
  CONSTRAINT platform_support_sessions_reason_check CHECK (
    char_length(btrim(reason)) BETWEEN 3 AND 1000
  ),
  CONSTRAINT platform_support_sessions_status_check CHECK (
    status IN ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED')
  ),
  CONSTRAINT platform_support_sessions_four_eyes_check CHECK (
    approver_profile_id IS NULL OR approver_profile_id <> requester_profile_id
  ),
  CONSTRAINT platform_support_sessions_ttl_check CHECK (
    expires_at > requested_at
    AND expires_at <= requested_at + interval '60 minutes'
  ),
  CONSTRAINT platform_support_sessions_revocation_check CHECK (
    (revoked_at IS NULL AND revoked_by_profile_id IS NULL AND revocation_reason IS NULL)
    OR (
      revoked_at IS NOT NULL
      AND revoked_by_profile_id IS NOT NULL
      AND revocation_reason IS NOT NULL
      AND char_length(btrim(revocation_reason)) BETWEEN 3 AND 1000
    )
  )
);

CREATE INDEX IF NOT EXISTS platform_support_sessions_active_scope_idx
  ON public.platform_support_sessions (scope_type, workspace_id, agency_id, expires_at)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.platform_support_session_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_session_id uuid NOT NULL REFERENCES public.platform_support_sessions(id) ON DELETE RESTRICT,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type       text NOT NULL,
  outcome          text NOT NULL,
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_support_session_events_type_check CHECK (
    event_type IN ('REQUESTED', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED', 'ACCESSED')
  ),
  CONSTRAINT platform_support_session_events_payload_check CHECK (
    jsonb_typeof(payload) = 'object' AND pg_column_size(payload) <= 16384
  )
);

CREATE INDEX IF NOT EXISTS platform_support_session_events_session_idx
  ON public.platform_support_session_events (support_session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_release_attestations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment             text NOT NULL,
  deployment_id           text NOT NULL,
  commit_sha              text NOT NULL,
  artifact_digest         text NOT NULL,
  manifest_fingerprint    text NOT NULL,
  migration_head          text NOT NULL,
  outcome                 text NOT NULL,
  reason                  text NOT NULL,
  attested_by_profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approval_id             uuid NOT NULL REFERENCES public.platform_command_approvals(id) ON DELETE RESTRICT,
  idempotency_key         uuid NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attested_by_profile_id, idempotency_key),
  UNIQUE (environment, deployment_id, artifact_digest),
  CONSTRAINT platform_release_attestations_environment_check CHECK (
    environment IN ('production', 'preview', 'staging', 'development')
  ),
  CONSTRAINT platform_release_attestations_deployment_check CHECK (
    deployment_id ~ '^[A-Za-z0-9._:-]{3,160}$'
  ),
  CONSTRAINT platform_release_attestations_commit_check CHECK (
    commit_sha ~ '^[0-9a-f]{40}([0-9a-f]{24})?$'
  ),
  CONSTRAINT platform_release_attestations_digest_check CHECK (
    artifact_digest ~ '^sha256:[0-9a-f]{64}$'
    AND manifest_fingerprint ~ '^sha256:[0-9a-f]{64}$'
  ),
  CONSTRAINT platform_release_attestations_migration_check CHECK (
    migration_head ~ '^[0-9]{14}_[a-z0-9_]{3,120}$'
  ),
  CONSTRAINT platform_release_attestations_outcome_check CHECK (
    outcome IN ('PASS', 'HOLD', 'FAIL')
  ),
  CONSTRAINT platform_release_attestations_reason_check CHECK (
    char_length(btrim(reason)) BETWEEN 3 AND 1000
  )
);

INSERT INTO public.platform_operator_roles (role_key, display_name, description)
VALUES
  ('PLATFORM_OBSERVER', 'Platform observer', 'Read-only platform status and release visibility.'),
  ('SUPPORT_OPERATOR', 'Support operator', 'Scoped support requests without implicit tenant writes.'),
  ('COMMUNITY_REVIEWER', 'Community reviewer', 'Community onboarding and verification review.'),
  ('INTEGRATION_OPERATOR', 'Integration operator', 'Integration health and approved operational jobs.'),
  ('SECURITY_OPERATOR', 'Security operator', 'Audit, approvals, support approval and release attestation.'),
  ('PLATFORM_ADMIN', 'Platform administrator', 'Full catalog subject to risk gates; no gate bypass.')
ON CONFLICT (role_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    updated_at = now();

WITH capability_seed(role_key, capability_key, risk_class) AS (
  VALUES
    ('PLATFORM_OBSERVER', 'platform.overview.read', 'R0'),
    ('PLATFORM_OBSERVER', 'platform.health.read', 'R0'),
    ('PLATFORM_OBSERVER', 'platform.release.read', 'R0'),
    ('PLATFORM_OBSERVER', 'platform.integrations.read', 'R0'),
    ('PLATFORM_OBSERVER', 'platform.settings.read', 'R0'),
    ('PLATFORM_OBSERVER', 'platform.features.read', 'R0'),
    ('PLATFORM_OBSERVER', 'platform.communities.read', 'R0'),
    ('PLATFORM_OBSERVER', 'platform.migrations.read', 'R0'),
    ('SUPPORT_OPERATOR', 'platform.overview.read', 'R0'),
    ('SUPPORT_OPERATOR', 'platform.users.read_masked', 'R1'),
    ('SUPPORT_OPERATOR', 'platform.support.request', 'R3'),
    ('SUPPORT_OPERATOR', 'platform.support.revoke', 'R3'),
    ('COMMUNITY_REVIEWER', 'platform.overview.read', 'R0'),
    ('COMMUNITY_REVIEWER', 'platform.communities.read', 'R0'),
    ('COMMUNITY_REVIEWER', 'platform.communities.review', 'R3'),
    ('INTEGRATION_OPERATOR', 'platform.overview.read', 'R0'),
    ('INTEGRATION_OPERATOR', 'platform.health.read', 'R0'),
    ('INTEGRATION_OPERATOR', 'platform.integrations.read', 'R0'),
    ('INTEGRATION_OPERATOR', 'platform.jobs.read', 'R0'),
    ('INTEGRATION_OPERATOR', 'platform.settings.read', 'R0'),
    ('INTEGRATION_OPERATOR', 'platform.jobs.run', 'R2'),
    ('INTEGRATION_OPERATOR', 'platform.settings.manage', 'R2'),
    ('SECURITY_OPERATOR', 'platform.overview.read', 'R0'),
    ('SECURITY_OPERATOR', 'platform.audit.read', 'R1'),
    ('SECURITY_OPERATOR', 'platform.migrations.read', 'R0'),
    ('SECURITY_OPERATOR', 'platform.operators.manage', 'R4'),
    ('SECURITY_OPERATOR', 'platform.approvals.decide', 'R3'),
    ('SECURITY_OPERATOR', 'platform.support.approve', 'R3'),
    ('SECURITY_OPERATOR', 'platform.support.revoke', 'R3'),
    ('SECURITY_OPERATOR', 'platform.release.attest', 'R4'),
    ('PLATFORM_ADMIN', 'platform.overview.read', 'R0'),
    ('PLATFORM_ADMIN', 'platform.health.read', 'R0'),
    ('PLATFORM_ADMIN', 'platform.release.read', 'R0'),
    ('PLATFORM_ADMIN', 'platform.integrations.read', 'R0'),
    ('PLATFORM_ADMIN', 'platform.audit.read', 'R1'),
    ('PLATFORM_ADMIN', 'platform.users.read_masked', 'R1'),
    ('PLATFORM_ADMIN', 'platform.settings.read', 'R0'),
    ('PLATFORM_ADMIN', 'platform.features.read', 'R0'),
    ('PLATFORM_ADMIN', 'platform.communities.read', 'R0'),
    ('PLATFORM_ADMIN', 'platform.migrations.read', 'R0'),
    ('PLATFORM_ADMIN', 'platform.users.manage_trial', 'R3'),
    ('PLATFORM_ADMIN', 'platform.operators.manage', 'R4'),
    ('PLATFORM_ADMIN', 'platform.features.manage', 'R3'),
    ('PLATFORM_ADMIN', 'platform.communities.review', 'R3'),
    ('PLATFORM_ADMIN', 'platform.jobs.read', 'R0'),
    ('PLATFORM_ADMIN', 'platform.jobs.run', 'R2'),
    ('PLATFORM_ADMIN', 'platform.settings.manage', 'R2'),
    ('PLATFORM_ADMIN', 'platform.migrations.apply', 'R4'),
    ('PLATFORM_ADMIN', 'platform.approvals.decide', 'R3'),
    ('PLATFORM_ADMIN', 'platform.support.request', 'R3'),
    ('PLATFORM_ADMIN', 'platform.support.approve', 'R3'),
    ('PLATFORM_ADMIN', 'platform.support.revoke', 'R3'),
    ('PLATFORM_ADMIN', 'platform.release.attest', 'R4')
)
INSERT INTO public.platform_operator_role_capabilities (role_key, capability_key, risk_class)
SELECT role_key, capability_key, risk_class
FROM capability_seed
ON CONFLICT (role_key, capability_key) DO UPDATE
SET risk_class = EXCLUDED.risk_class;

ALTER TABLE public.platform_job_commands
  ADD COLUMN IF NOT EXISTS operator_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assurance_level text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS payload_digest text,
  ADD COLUMN IF NOT EXISTS approval_id uuid REFERENCES public.platform_command_approvals(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS support_session_id uuid REFERENCES public.platform_support_sessions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS outcome text;

ALTER TABLE public.platform_audit_events
  ADD COLUMN IF NOT EXISTS actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assurance_level text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS payload_digest text,
  ADD COLUMN IF NOT EXISTS approval_id uuid REFERENCES public.platform_command_approvals(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS support_session_id uuid REFERENCES public.platform_support_sessions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS before_digest text,
  ADD COLUMN IF NOT EXISTS after_digest text;

ALTER TABLE public.platform_job_commands
  DROP CONSTRAINT IF EXISTS platform_job_commands_assurance_check,
  DROP CONSTRAINT IF EXISTS platform_job_commands_digest_check,
  DROP CONSTRAINT IF EXISTS platform_job_commands_authority_text_check;
ALTER TABLE public.platform_job_commands
  ADD CONSTRAINT platform_job_commands_assurance_check CHECK (
    assurance_level IS NULL OR assurance_level IN ('aal1', 'aal2', 'system', 'unknown')
  ),
  ADD CONSTRAINT platform_job_commands_digest_check CHECK (
    payload_digest IS NULL OR payload_digest ~ '^sha256:[0-9a-f]{64}$'
  ),
  ADD CONSTRAINT platform_job_commands_authority_text_check CHECK (
    (reason IS NULL OR char_length(btrim(reason)) BETWEEN 3 AND 1000)
    AND (outcome IS NULL OR char_length(outcome) BETWEEN 1 AND 64)
  );

ALTER TABLE public.platform_audit_events
  DROP CONSTRAINT IF EXISTS platform_audit_events_assurance_check,
  DROP CONSTRAINT IF EXISTS platform_audit_events_digest_check,
  DROP CONSTRAINT IF EXISTS platform_audit_events_authority_text_check;
ALTER TABLE public.platform_audit_events
  ADD CONSTRAINT platform_audit_events_assurance_check CHECK (
    assurance_level IS NULL OR assurance_level IN ('aal1', 'aal2', 'system', 'unknown')
  ),
  ADD CONSTRAINT platform_audit_events_digest_check CHECK (
    (payload_digest IS NULL OR payload_digest ~ '^sha256:[0-9a-f]{64}$')
    AND (before_digest IS NULL OR before_digest ~ '^sha256:[0-9a-f]{64}$')
    AND (after_digest IS NULL OR after_digest ~ '^sha256:[0-9a-f]{64}$')
  ),
  ADD CONSTRAINT platform_audit_events_authority_text_check CHECK (
    (reason IS NULL OR char_length(btrim(reason)) BETWEEN 3 AND 1000)
    AND (outcome IS NULL OR char_length(outcome) BETWEEN 1 AND 64)
  );

-- ---------------------------------------------------------------------------
-- Canonical payload identity, named authority and durable operator controls.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.platform_payload_digest(p_payload jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT 'sha256:' || encode(
    public.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION private.platform_utc_iso(p_value timestamptz)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT to_char(
    p_value AT TIME ZONE 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );
$$;

CREATE OR REPLACE FUNCTION private.platform_operator_grant_payload(
  p_target_profile_id uuid,
  p_role_key text,
  p_valid_from timestamptz,
  p_valid_to timestamptz,
  p_reason text
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT jsonb_build_object(
    'profile_id', p_target_profile_id,
    'role_key', p_role_key,
    'valid_from', private.platform_utc_iso(p_valid_from),
    'valid_to', CASE WHEN p_valid_to IS NULL THEN NULL
      ELSE private.platform_utc_iso(p_valid_to) END,
    'grant_reason', btrim(p_reason)
  );
$$;

CREATE OR REPLACE FUNCTION private.require_platform_payload_digest(
  p_payload jsonb,
  p_expected_digest text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_digest text;
BEGIN
  IF p_payload IS NULL
     OR jsonb_typeof(p_payload) <> 'object'
     OR pg_column_size(p_payload) > 65536 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform action payload is invalid',
      DETAIL = '{"error_code":"PLATFORM_PAYLOAD_INVALID"}';
  END IF;

  v_digest := private.platform_payload_digest(p_payload);
  IF p_expected_digest IS NULL
     OR p_expected_digest !~ '^sha256:[0-9a-f]{64}$'
     OR p_expected_digest <> v_digest THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform action payload digest mismatch',
      DETAIL = jsonb_build_object(
        'error_code', 'PLATFORM_PAYLOAD_DIGEST_MISMATCH',
        'expected_digest', v_digest
      )::text;
  END IF;
  RETURN v_digest;
END;
$$;

ALTER TABLE public.platform_command_approvals
  DROP CONSTRAINT IF EXISTS platform_command_approvals_exact_digest_check;
ALTER TABLE public.platform_command_approvals
  ADD CONSTRAINT platform_command_approvals_exact_digest_check CHECK (
    payload_digest = private.platform_payload_digest(request_payload)
  );

CREATE OR REPLACE FUNCTION private.platform_current_assurance()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT CASE COALESCE(auth.jwt() ->> 'aal', '')
    WHEN 'aal1' THEN 'aal1'
    WHEN 'aal2' THEN 'aal2'
    ELSE 'unknown'
  END;
$$;

CREATE OR REPLACE FUNCTION private.platform_operator_has_capability(
  p_profile_id uuid,
  p_capability_key text,
  p_at timestamptz DEFAULT clock_timestamp()
)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT p_profile_id IS NOT NULL
    AND p_capability_key IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.platform_operator_assignments assignment
      JOIN public.platform_operator_roles operator_role
        ON operator_role.role_key = assignment.role_key
       AND operator_role.is_active
      JOIN public.platform_operator_role_capabilities role_capability
        ON role_capability.role_key = assignment.role_key
       AND role_capability.capability_key = p_capability_key
      WHERE assignment.profile_id = p_profile_id
        AND assignment.revoked_at IS NULL
        AND assignment.valid_from <= p_at
        AND (assignment.valid_to IS NULL OR assignment.valid_to > p_at)
    );
$$;

CREATE OR REPLACE FUNCTION private.require_platform_operator_capability(
  p_capability_key text
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  IF NOT private.platform_operator_has_capability(v_profile_id, p_capability_key, clock_timestamp()) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Platform capability denied',
      DETAIL = jsonb_build_object(
        'error_code', 'PLATFORM_CAPABILITY_DENIED',
        'capability', p_capability_key
      )::text;
  END IF;
  RETURN v_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.lock_platform_operator_action(
  p_profile_id uuid,
  p_action_key text,
  p_idempotency_key uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF p_profile_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform idempotency identity is required',
      DETAIL = '{"error_code":"IDEMPOTENCY_KEY_REQUIRED"}';
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      p_profile_id::text || ':' || COALESCE(p_action_key, '') || ':' || p_idempotency_key::text,
      0
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.platform_operator_action_replay(
  p_profile_id uuid,
  p_action_key text,
  p_idempotency_key uuid,
  p_payload_digest text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_receipt private.platform_operator_action_receipts%ROWTYPE;
BEGIN
  SELECT * INTO v_receipt
  FROM private.platform_operator_action_receipts receipt
  WHERE receipt.profile_id = p_profile_id
    AND receipt.action_key = p_action_key
    AND receipt.idempotency_key = p_idempotency_key;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v_receipt.payload_digest <> p_payload_digest THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505', MESSAGE = 'Platform idempotency payload mismatch',
      DETAIL = '{"error_code":"IDEMPOTENCY_PAYLOAD_MISMATCH"}';
  END IF;
  RETURN v_receipt.result || jsonb_build_object('replayed', true);
END;
$$;

CREATE OR REPLACE FUNCTION private.store_platform_operator_action_receipt(
  p_profile_id uuid,
  p_action_key text,
  p_idempotency_key uuid,
  p_payload_digest text,
  p_result jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  INSERT INTO private.platform_operator_action_receipts (
    profile_id, action_key, idempotency_key, payload_digest, result
  ) VALUES (
    p_profile_id, p_action_key, p_idempotency_key, p_payload_digest, p_result
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.consume_platform_operator_action_quota(
  p_profile_id uuid,
  p_action_key text,
  p_limit integer,
  p_window interval
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
BEGIN
  IF p_profile_id IS NULL
     OR p_action_key !~ '^platform[.][a-z0-9_.-]{2,95}$'
     OR p_limit NOT BETWEEN 1 AND 1000
     OR p_window < interval '1 second'
     OR p_window > interval '24 hours' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform action quota input is invalid',
      DETAIL = '{"error_code":"PLATFORM_RATE_LIMIT_INPUT_INVALID"}';
  END IF;

  INSERT INTO private.platform_operator_action_rate_limits (
    profile_id, action_key, window_started_at, request_count, updated_at
  ) VALUES (
    p_profile_id, p_action_key, v_now, 1, v_now
  )
  ON CONFLICT (profile_id, action_key) DO UPDATE
  SET window_started_at = CASE
        WHEN private.platform_operator_action_rate_limits.window_started_at <= v_now - p_window
          THEN v_now
        ELSE private.platform_operator_action_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN private.platform_operator_action_rate_limits.window_started_at <= v_now - p_window
          THEN 1
        ELSE private.platform_operator_action_rate_limits.request_count + 1
      END,
      updated_at = v_now
  WHERE private.platform_operator_action_rate_limits.window_started_at <= v_now - p_window
     OR private.platform_operator_action_rate_limits.request_count < p_limit
  RETURNING true, 0
  INTO allowed, retry_after_seconds;

  IF FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT quota.window_started_at
  INTO v_window_started_at
  FROM private.platform_operator_action_rate_limits quota
  WHERE quota.profile_id = p_profile_id
    AND quota.action_key = p_action_key;

  allowed := false;
  retry_after_seconds := GREATEST(
    1,
    CEIL(EXTRACT(epoch FROM (v_window_started_at + p_window - v_now)))::integer
  );
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION private.enforce_platform_operator_action_quota(
  p_profile_id uuid,
  p_action_key text,
  p_limit integer,
  p_window interval
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_quota record;
BEGIN
  SELECT * INTO v_quota
  FROM private.consume_platform_operator_action_quota(
    p_profile_id, p_action_key, p_limit, p_window
  );
  IF NOT v_quota.allowed THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Platform operator action rate limited',
      DETAIL = jsonb_build_object(
        'error_code', 'PLATFORM_RATE_LIMITED',
        'retry_after_seconds', v_quota.retry_after_seconds
      )::text;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.append_platform_operator_audit(
  p_actor_profile_id uuid,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_reason text,
  p_idempotency_key uuid,
  p_payload jsonb,
  p_payload_digest text,
  p_approval_id uuid,
  p_support_session_id uuid,
  p_outcome text,
  p_before_digest text,
  p_after_digest text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO public.platform_audit_events (
    actor_id, actor_profile_id, action, target_type, target_id, payload,
    assurance_level, reason, idempotency_key, payload_digest, approval_id,
    support_session_id, outcome, before_digest, after_digest
  ) VALUES (
    COALESCE(p_actor_profile_id::text, 'system'), p_actor_profile_id, p_action,
    p_target_type, p_target_id, COALESCE(p_payload, '{}'::jsonb),
    CASE WHEN p_actor_profile_id IS NULL THEN 'system'
      ELSE private.platform_current_assurance() END,
    p_reason, p_idempotency_key, p_payload_digest, p_approval_id,
    p_support_session_id, p_outcome, p_before_digest, p_after_digest
  )
  RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.reject_platform_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001', MESSAGE = 'Platform history is append-only',
    DETAIL = jsonb_build_object(
      'error_code', 'PLATFORM_HISTORY_APPEND_ONLY',
      'table', TG_TABLE_NAME
    )::text;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_audit_events_append_only
  ON public.platform_audit_events;
CREATE TRIGGER trg_platform_audit_events_append_only
BEFORE UPDATE OR DELETE ON public.platform_audit_events
FOR EACH ROW EXECUTE FUNCTION private.reject_platform_append_only_mutation();

DROP TRIGGER IF EXISTS trg_platform_support_session_events_append_only
  ON public.platform_support_session_events;
CREATE TRIGGER trg_platform_support_session_events_append_only
BEFORE UPDATE OR DELETE ON public.platform_support_session_events
FOR EACH ROW EXECUTE FUNCTION private.reject_platform_append_only_mutation();

DROP TRIGGER IF EXISTS trg_platform_release_attestations_append_only
  ON public.platform_release_attestations;
CREATE TRIGGER trg_platform_release_attestations_append_only
BEFORE UPDATE OR DELETE ON public.platform_release_attestations
FOR EACH ROW EXECUTE FUNCTION private.reject_platform_append_only_mutation();

CREATE OR REPLACE FUNCTION private.guard_platform_support_session_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Support sessions are retained history',
      DETAIL = '{"error_code":"SUPPORT_SESSION_DELETE_FORBIDDEN"}';
  END IF;

  IF NEW.requester_profile_id IS DISTINCT FROM OLD.requester_profile_id
     OR NEW.scope_type IS DISTINCT FROM OLD.scope_type
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.agency_id IS DISTINCT FROM OLD.agency_id
     OR NEW.capability_keys IS DISTINCT FROM OLD.capability_keys
     OR NEW.access_mode IS DISTINCT FROM OLD.access_mode
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Support session authority is immutable',
      DETAIL = '{"error_code":"SUPPORT_SESSION_AUTHORITY_IMMUTABLE"}';
  END IF;

  IF OLD.status IN ('REJECTED', 'REVOKED', 'EXPIRED')
     AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Terminal support session cannot be reactivated',
      DETAIL = '{"error_code":"SUPPORT_SESSION_TERMINAL"}';
  END IF;

  IF OLD.status = 'PENDING'
     AND NEW.status NOT IN ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Invalid support session transition',
      DETAIL = '{"error_code":"SUPPORT_SESSION_TRANSITION_INVALID"}';
  END IF;

  IF OLD.status = 'ACTIVE' AND NEW.status NOT IN ('ACTIVE', 'REVOKED', 'EXPIRED') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Support session cannot be reactivated',
      DETAIL = '{"error_code":"SUPPORT_SESSION_REACTIVATION_FORBIDDEN"}';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_support_sessions_guard
  ON public.platform_support_sessions;
CREATE TRIGGER trg_platform_support_sessions_guard
BEFORE UPDATE OR DELETE ON public.platform_support_sessions
FOR EACH ROW EXECUTE FUNCTION private.guard_platform_support_session_transition();

ALTER TABLE public.platform_operator_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_operator_role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_operator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_command_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_release_attestations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.platform_operator_roles
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.platform_operator_role_capabilities
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.platform_operator_assignments
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.platform_command_approvals
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.platform_support_sessions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.platform_support_session_events
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.platform_release_attestations
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.platform_operator_action_rate_limits
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.platform_operator_action_receipts
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE public.platform_operator_roles TO service_role;
GRANT SELECT ON TABLE public.platform_operator_role_capabilities TO service_role;
GRANT SELECT ON TABLE public.platform_operator_assignments TO service_role;
GRANT SELECT ON TABLE public.platform_command_approvals TO service_role;
GRANT SELECT ON TABLE public.platform_support_sessions TO service_role;
GRANT SELECT, INSERT ON TABLE public.platform_support_session_events TO service_role;
GRANT SELECT, INSERT ON TABLE public.platform_release_attestations TO service_role;

-- Keep existing command/log completion rights, but enforce audit/history as
-- SELECT + INSERT only even for the service role.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.platform_audit_events FROM service_role;
GRANT SELECT, INSERT ON TABLE public.platform_audit_events TO service_role;

REVOKE ALL ON FUNCTION private.platform_payload_digest(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.platform_utc_iso(timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.platform_operator_grant_payload(uuid, text, timestamptz, timestamptz, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.require_platform_payload_digest(jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.platform_current_assurance()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.platform_operator_has_capability(uuid, text, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.require_platform_operator_capability(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.lock_platform_operator_action(uuid, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.platform_operator_action_replay(uuid, text, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.store_platform_operator_action_receipt(uuid, text, uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.consume_platform_operator_action_quota(uuid, text, integer, interval)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.enforce_platform_operator_action_quota(uuid, text, integer, interval)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.append_platform_operator_audit(uuid, text, text, text, text, uuid, jsonb, text, uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.reject_platform_append_only_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.guard_platform_support_session_transition()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.consume_platform_command_approval(
  p_approval_id uuid,
  p_actor_profile_id uuid,
  p_action_key text,
  p_payload jsonb,
  p_consumption_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_approval public.platform_command_approvals%ROWTYPE;
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_payload_digest text := private.platform_payload_digest(v_payload);
BEGIN
  IF p_approval_id IS NULL OR p_consumption_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Approval consumption identity is required',
      DETAIL = '{"error_code":"APPROVAL_CONSUMPTION_IDENTITY_REQUIRED"}';
  END IF;

  SELECT * INTO v_approval
  FROM public.platform_command_approvals approval
  WHERE approval.id = p_approval_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Platform approval was not found',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_NOT_FOUND"}';
  END IF;
  IF v_approval.initiator_profile_id <> p_actor_profile_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Only the approval initiator can consume it',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_INITIATOR_MISMATCH"}';
  END IF;
  IF v_approval.action_key <> p_action_key
     OR v_approval.payload_digest <> v_payload_digest
     OR v_approval.request_payload <> v_payload THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Approval payload identity mismatch',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_PAYLOAD_MISMATCH"}';
  END IF;
  IF NOT private.platform_operator_has_capability(
    p_actor_profile_id, v_approval.capability_key, clock_timestamp()
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Approval initiator authority has expired',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_AUTHORITY_EXPIRED"}';
  END IF;
  IF v_approval.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Platform approval has expired',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_EXPIRED"}';
  END IF;

  IF v_approval.status = 'CONSUMED' THEN
    IF v_approval.consumption_idempotency_key = p_consumption_idempotency_key THEN
      RETURN jsonb_build_object(
        'outcome', 'replayed',
        'approval_id', v_approval.id,
        'payload_digest', v_approval.payload_digest,
        'consumed_at', v_approval.consumed_at
      );
    END IF;
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Platform approval was already consumed',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_ALREADY_CONSUMED"}';
  END IF;
  IF v_approval.status <> 'APPROVED' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Platform approval is not approved',
      DETAIL = jsonb_build_object(
        'error_code', 'PLATFORM_APPROVAL_NOT_APPROVED',
        'status', v_approval.status
      )::text;
  END IF;

  UPDATE public.platform_command_approvals
  SET status = 'CONSUMED',
      consumption_idempotency_key = p_consumption_idempotency_key,
      consumed_at = clock_timestamp()
  WHERE id = v_approval.id
    AND status = 'APPROVED';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Platform approval consumption conflict',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_CONSUMPTION_CONFLICT"}';
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'authorized',
    'approval_id', v_approval.id,
    'payload_digest', v_approval.payload_digest,
    'consumed_at', clock_timestamp()
  );
END;
$$;

REVOKE ALL ON FUNCTION private.consume_platform_command_approval(uuid, uuid, text, jsonb, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_platform_operator_context()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_roles text[];
  v_capabilities text[];
  v_valid_until timestamptz;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.overview.read');

  SELECT
    COALESCE(array_agg(DISTINCT assignment.role_key ORDER BY assignment.role_key), ARRAY[]::text[]),
    MIN(assignment.valid_to)
      FILTER (WHERE assignment.valid_to IS NOT NULL)
  INTO v_roles, v_valid_until
  FROM public.platform_operator_assignments assignment
  JOIN public.platform_operator_roles operator_role
    ON operator_role.role_key = assignment.role_key
   AND operator_role.is_active
  WHERE assignment.profile_id = v_actor
    AND assignment.revoked_at IS NULL
    AND assignment.valid_from <= clock_timestamp()
    AND (assignment.valid_to IS NULL OR assignment.valid_to > clock_timestamp());

  SELECT COALESCE(
    array_agg(DISTINCT role_capability.capability_key ORDER BY role_capability.capability_key),
    ARRAY[]::text[]
  )
  INTO v_capabilities
  FROM public.platform_operator_assignments assignment
  JOIN public.platform_operator_roles operator_role
    ON operator_role.role_key = assignment.role_key
   AND operator_role.is_active
  JOIN public.platform_operator_role_capabilities role_capability
    ON role_capability.role_key = assignment.role_key
  WHERE assignment.profile_id = v_actor
    AND assignment.revoked_at IS NULL
    AND assignment.valid_from <= clock_timestamp()
    AND (assignment.valid_to IS NULL OR assignment.valid_to > clock_timestamp());

  RETURN jsonb_build_object(
    'operator_profile_id', v_actor,
    'role_keys', v_roles,
    'capability_keys', v_capabilities,
    'assurance_level', private.platform_current_assurance(),
    'authority_valid_until', v_valid_until,
    'active_support_sessions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', support.id,
        'scope_type', support.scope_type,
        'workspace_id', support.workspace_id,
        'agency_id', support.agency_id,
        'capability_keys', support.capability_keys,
        'access_mode', support.access_mode,
        'expires_at', support.expires_at
      ) ORDER BY support.expires_at)
      FROM public.platform_support_sessions support
      WHERE support.requester_profile_id = v_actor
        AND support.status = 'ACTIVE'
        AND support.expires_at > clock_timestamp()
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_payload_digest(p_payload jsonb)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  PERFORM private.require_platform_operator_capability('platform.overview.read');
  IF p_payload IS NULL
     OR jsonb_typeof(p_payload) <> 'object'
     OR pg_column_size(p_payload) > 65536 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform action payload is invalid',
      DETAIL = '{"error_code":"PLATFORM_PAYLOAD_INVALID"}';
  END IF;
  RETURN private.platform_payload_digest(p_payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_platform_operator_grant_payload(
  p_target_profile_id uuid,
  p_role_key text,
  p_valid_from timestamptz,
  p_valid_to timestamptz,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_valid_from timestamptz := CASE WHEN p_valid_from IS NULL THEN NULL ELSE
    date_trunc('milliseconds', p_valid_from AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' END;
  v_valid_to timestamptz := CASE WHEN p_valid_to IS NULL THEN NULL ELSE
    date_trunc('milliseconds', p_valid_to AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' END;
  v_payload jsonb;
BEGIN
  PERFORM private.require_platform_operator_capability('platform.operators.manage');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF p_target_profile_id IS NULL
     OR v_valid_from IS NULL
     OR v_valid_from < clock_timestamp() - interval '5 minutes'
     OR v_valid_from > clock_timestamp() + interval '30 days'
     OR (v_valid_to IS NOT NULL AND v_valid_to <= v_valid_from)
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR NOT EXISTS (
       SELECT 1 FROM public.platform_operator_roles operator_role
       WHERE operator_role.role_key = p_role_key AND operator_role.is_active
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform operator grant input is invalid',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_GRANT_INPUT_INVALID"}';
  END IF;
  v_payload := private.platform_operator_grant_payload(
    p_target_profile_id, p_role_key, v_valid_from, v_valid_to, v_reason
  );
  RETURN jsonb_build_object(
    'action_key', 'platform.operators.grant',
    'payload', v_payload,
    'payload_digest', private.platform_payload_digest(v_payload)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_platform_command_approval(
  p_capability_key text,
  p_action_key text,
  p_target_type text,
  p_target_id text,
  p_request_payload jsonb,
  p_reason text,
  p_idempotency_key uuid,
  p_ttl interval DEFAULT interval '10 minutes'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_payload jsonb := COALESCE(p_request_payload, '{}'::jsonb);
  v_digest text;
  v_existing public.platform_command_approvals%ROWTYPE;
  v_created public.platform_command_approvals%ROWTYPE;
  v_requested_at timestamptz := clock_timestamp();
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  v_actor := private.require_platform_operator_capability(p_capability_key);
  PERFORM private.require_recent_aal2(interval '15 minutes');

  IF p_action_key !~ '^platform[.][a-z0-9_.-]{2,95}$'
     OR p_target_type !~ '^[a-z][a-z0-9_.-]{1,63}$'
     OR char_length(COALESCE(p_target_id, '')) NOT BETWEEN 1 AND 320
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR p_idempotency_key IS NULL
     OR p_ttl < interval '1 minute'
     OR p_ttl > interval '30 minutes'
     OR jsonb_typeof(v_payload) <> 'object'
     OR pg_column_size(v_payload) > 65536 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform approval request is invalid',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_INPUT_INVALID"}';
  END IF;
  v_digest := private.platform_payload_digest(v_payload);
  PERFORM private.lock_platform_operator_action(v_actor, 'platform.approvals.create', p_idempotency_key);

  SELECT * INTO v_existing
  FROM public.platform_command_approvals approval
  WHERE approval.initiator_profile_id = v_actor
    AND approval.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing.capability_key <> p_capability_key
       OR v_existing.action_key <> p_action_key
       OR v_existing.target_type <> p_target_type
       OR v_existing.target_id <> p_target_id
       OR v_existing.payload_digest <> v_digest
       OR v_existing.request_payload <> v_payload
       OR v_existing.reason <> v_reason THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505', MESSAGE = 'Approval idempotency payload mismatch',
        DETAIL = '{"error_code":"IDEMPOTENCY_PAYLOAD_MISMATCH"}';
    END IF;
    RETURN jsonb_build_object(
      'outcome', 'replayed',
      'approval_id', v_existing.id,
      'status', v_existing.status,
      'payload_digest', v_existing.payload_digest,
      'expires_at', v_existing.expires_at,
      'replayed', true
    );
  END IF;

  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.approvals.create', 20, interval '15 minutes'
  );

  INSERT INTO public.platform_command_approvals (
    initiator_profile_id, capability_key, action_key, target_type, target_id,
    request_payload, payload_digest, reason, idempotency_key,
    requested_at, expires_at
  ) VALUES (
    v_actor, p_capability_key, p_action_key, p_target_type, p_target_id,
    v_payload, v_digest, v_reason, p_idempotency_key,
    v_requested_at, v_requested_at + p_ttl
  ) RETURNING * INTO v_created;

  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.approval.requested', p_target_type, p_target_id,
    v_reason, p_idempotency_key,
    jsonb_build_object(
      'approval_id', v_created.id,
      'capability_key', p_capability_key,
      'action_key', p_action_key,
      'expires_at', v_created.expires_at
    ),
    v_digest, v_created.id, NULL, 'PENDING', NULL, NULL
  );

  RETURN jsonb_build_object(
    'outcome', 'created',
    'approval_id', v_created.id,
    'status', v_created.status,
    'payload_digest', v_created.payload_digest,
    'expires_at', v_created.expires_at,
    'replayed', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_platform_command_approval(
  p_approval_id uuid,
  p_decision text,
  p_expected_payload_digest text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_approval public.platform_command_approvals%ROWTYPE;
  v_decision text := upper(btrim(COALESCE(p_decision, '')));
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_status text;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.approvals.decide');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF v_decision NOT IN ('APPROVE', 'REJECT')
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR p_expected_payload_digest !~ '^sha256:[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform approval decision is invalid',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_DECISION_INVALID"}';
  END IF;
  SELECT * INTO v_approval
  FROM public.platform_command_approvals approval
  WHERE approval.id = p_approval_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Platform approval was not found',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_NOT_FOUND"}';
  END IF;
  IF v_approval.initiator_profile_id = v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Self approval is forbidden',
      DETAIL = '{"error_code":"PLATFORM_SELF_APPROVAL_FORBIDDEN"}';
  END IF;
  IF v_approval.payload_digest <> p_expected_payload_digest THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Approval payload digest mismatch',
      DETAIL = '{"error_code":"PLATFORM_APPROVAL_PAYLOAD_MISMATCH"}';
  END IF;
  IF v_approval.status <> 'PENDING' THEN
    RETURN jsonb_build_object(
      'outcome', 'already_decided',
      'approval_id', v_approval.id,
      'status', v_approval.status,
      'payload_digest', v_approval.payload_digest
    );
  END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.approvals.decide', 60, interval '15 minutes'
  );
  IF v_approval.expires_at <= clock_timestamp() THEN
    UPDATE public.platform_command_approvals
    SET status = 'EXPIRED', decided_at = clock_timestamp()
    WHERE id = v_approval.id AND status = 'PENDING';
    PERFORM private.append_platform_operator_audit(
      v_actor, 'superadmin.approval.expired', v_approval.target_type,
      v_approval.target_id, v_reason, NULL,
      jsonb_build_object('approval_id', v_approval.id),
      v_approval.payload_digest, v_approval.id, NULL, 'EXPIRED', NULL, NULL
    );
    RETURN jsonb_build_object(
      'outcome', 'expired', 'approval_id', v_approval.id, 'status', 'EXPIRED'
    );
  END IF;

  v_status := CASE v_decision WHEN 'APPROVE' THEN 'APPROVED' ELSE 'REJECTED' END;
  UPDATE public.platform_command_approvals
  SET status = v_status,
      approver_profile_id = v_actor,
      decision_reason = v_reason,
      decided_at = clock_timestamp()
  WHERE id = v_approval.id AND status = 'PENDING';

  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.approval.decided', v_approval.target_type,
    v_approval.target_id, v_reason, NULL,
    jsonb_build_object(
      'approval_id', v_approval.id,
      'decision', v_decision,
      'initiator_profile_id', v_approval.initiator_profile_id
    ),
    v_approval.payload_digest, v_approval.id, NULL, v_status, NULL, NULL
  );
  RETURN jsonb_build_object(
    'outcome', 'decided',
    'approval_id', v_approval.id,
    'status', v_status,
    'payload_digest', v_approval.payload_digest
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.authorize_platform_action(
  p_approval_id uuid,
  p_action_key text,
  p_payload jsonb,
  p_consumption_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  v_actor := auth.uid();
  PERFORM private.require_recent_aal2(interval '15 minutes');
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.approvals.consume', 60, interval '15 minutes'
  );
  v_result := private.consume_platform_command_approval(
    p_approval_id, v_actor, p_action_key, p_payload, p_consumption_idempotency_key
  );
  IF v_result ->> 'outcome' <> 'replayed' THEN
    PERFORM private.append_platform_operator_audit(
      v_actor, 'superadmin.action.authorized', 'platform_action', p_action_key,
      'Approved platform action authorization', p_consumption_idempotency_key,
      jsonb_build_object('approval_id', p_approval_id),
      private.platform_payload_digest(COALESCE(p_payload, '{}'::jsonb)), p_approval_id, NULL,
      v_result ->> 'outcome', NULL, NULL
    );
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_platform_operator(
  p_profile_id uuid,
  p_role_key text DEFAULT 'PLATFORM_ADMIN',
  p_reason text DEFAULT 'Initial platform operator bootstrap'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_jwt_role text := COALESCE(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );
  v_assignment public.platform_operator_assignments%ROWTYPE;
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  IF v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Service role is required',
      DETAIL = '{"error_code":"SERVICE_ROLE_REQUIRED"}';
  END IF;
  IF p_profile_id IS NULL
     OR p_role_key <> 'PLATFORM_ADMIN'
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform bootstrap input is invalid',
      DETAIL = '{"error_code":"PLATFORM_BOOTSTRAP_INPUT_INVALID"}';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('platform:first-operator-bootstrap', 0));
  IF EXISTS (SELECT 1 FROM public.platform_operator_assignments) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Platform operator bootstrap is closed',
      DETAIL = '{"error_code":"PLATFORM_BOOTSTRAP_CLOSED"}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles profile WHERE profile.id = p_profile_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Bootstrap profile was not found',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_PROFILE_NOT_FOUND"}';
  END IF;

  INSERT INTO public.platform_operator_assignments (
    profile_id, role_key, valid_from, granted_by_profile_id, grant_reason
  ) VALUES (
    p_profile_id, 'PLATFORM_ADMIN', clock_timestamp(), NULL, v_reason
  ) RETURNING * INTO v_assignment;

  PERFORM private.append_platform_operator_audit(
    NULL, 'superadmin.operator.bootstrap', 'platform_operator', p_profile_id::text,
    v_reason, NULL,
    jsonb_build_object(
      'assignment_id', v_assignment.id,
      'role_key', v_assignment.role_key,
      'valid_from', v_assignment.valid_from
    ),
    private.platform_payload_digest(jsonb_build_object(
      'profile_id', p_profile_id,
      'role_key', v_assignment.role_key,
      'valid_from', v_assignment.valid_from
    )),
    NULL, NULL, 'BOOTSTRAPPED', NULL, NULL
  );

  RETURN jsonb_build_object(
    'outcome', 'bootstrapped',
    'assignment_id', v_assignment.id,
    'profile_id', v_assignment.profile_id,
    'role_key', v_assignment.role_key,
    'valid_from', v_assignment.valid_from
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_platform_operator_assignment(
  p_target_profile_id uuid,
  p_role_key text,
  p_valid_from timestamptz,
  p_valid_to timestamptz,
  p_reason text,
  p_idempotency_key uuid,
  p_expected_payload_digest text,
  p_approval_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_valid_from timestamptz := CASE WHEN p_valid_from IS NULL THEN NULL ELSE
    date_trunc('milliseconds', p_valid_from AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' END;
  v_valid_to timestamptz := CASE WHEN p_valid_to IS NULL THEN NULL ELSE
    date_trunc('milliseconds', p_valid_to AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' END;
  v_payload jsonb;
  v_digest text;
  v_replay jsonb;
  v_approval jsonb;
  v_assignment public.platform_operator_assignments%ROWTYPE;
  v_after jsonb;
  v_after_digest text;
  v_result jsonb;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.operators.manage');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF p_target_profile_id IS NULL
     OR v_valid_from IS NULL
     OR v_valid_from < clock_timestamp() - interval '5 minutes'
     OR v_valid_from > clock_timestamp() + interval '30 days'
     OR (v_valid_to IS NOT NULL AND v_valid_to <= v_valid_from)
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR p_idempotency_key IS NULL
     OR p_approval_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform operator grant input is invalid',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_GRANT_INPUT_INVALID"}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_operator_roles operator_role
    WHERE operator_role.role_key = p_role_key AND operator_role.is_active
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform operator role is invalid',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_ROLE_INVALID"}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles profile WHERE profile.id = p_target_profile_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Platform operator profile was not found',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_PROFILE_NOT_FOUND"}';
  END IF;

  v_payload := private.platform_operator_grant_payload(
    p_target_profile_id, p_role_key, v_valid_from, v_valid_to, v_reason
  );
  v_digest := private.require_platform_payload_digest(v_payload, p_expected_payload_digest);
  PERFORM private.lock_platform_operator_action(
    v_actor, 'platform.operators.grant', p_idempotency_key
  );
  v_replay := private.platform_operator_action_replay(
    v_actor, 'platform.operators.grant', p_idempotency_key, v_digest
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.operators.grant', 20, interval '1 hour'
  );

  -- Serialize all assignment-set mutations, not only retries from one actor.
  -- Without this global authority lock, two independent approvers could both
  -- pass the overlap/last-admin preconditions against the same snapshot.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('platform:operator-assignment-authority', 0)
  );

  IF EXISTS (
    SELECT 1 FROM public.platform_operator_assignments assignment
    WHERE assignment.profile_id = p_target_profile_id
      AND assignment.role_key = p_role_key
      AND assignment.revoked_at IS NULL
      AND tstzrange(assignment.valid_from, assignment.valid_to, '[)')
          && tstzrange(v_valid_from, v_valid_to, '[)')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505', MESSAGE = 'Platform operator assignment overlaps',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_ASSIGNMENT_OVERLAP"}';
  END IF;

  v_approval := private.consume_platform_command_approval(
    p_approval_id, v_actor, 'platform.operators.grant', v_payload, p_idempotency_key
  );
  INSERT INTO public.platform_operator_assignments (
    profile_id, role_key, valid_from, valid_to, granted_by_profile_id, grant_reason
  ) VALUES (
    p_target_profile_id, p_role_key, v_valid_from, v_valid_to, v_actor, v_reason
  ) RETURNING * INTO v_assignment;

  v_after := jsonb_build_object(
    'assignment_id', v_assignment.id,
    'profile_id', v_assignment.profile_id,
    'role_key', v_assignment.role_key,
    'valid_from', v_assignment.valid_from,
    'valid_to', v_assignment.valid_to
  );
  v_after_digest := private.platform_payload_digest(v_after);
  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.operator.granted', 'platform_operator_assignment',
    v_assignment.id::text, v_reason, p_idempotency_key,
    jsonb_build_object('after', v_after), v_digest, p_approval_id, NULL,
    'GRANTED', NULL, v_after_digest
  );
  v_result := jsonb_build_object(
    'outcome', 'granted',
    'assignment', v_after,
    'payload_digest', v_digest,
    'approval_outcome', v_approval ->> 'outcome',
    'replayed', false
  );
  PERFORM private.store_platform_operator_action_receipt(
    v_actor, 'platform.operators.grant', p_idempotency_key, v_digest, v_result
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_platform_operator_assignment(
  p_assignment_id uuid,
  p_reason text,
  p_idempotency_key uuid,
  p_expected_payload_digest text,
  p_approval_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_payload jsonb;
  v_digest text;
  v_replay jsonb;
  v_approval jsonb;
  v_assignment public.platform_operator_assignments%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.operators.manage');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF p_assignment_id IS NULL
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR p_idempotency_key IS NULL
     OR p_approval_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform operator revocation input is invalid',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_REVOKE_INPUT_INVALID"}';
  END IF;

  v_payload := jsonb_build_object(
    'assignment_id', p_assignment_id,
    'revocation_reason', v_reason
  );
  v_digest := private.require_platform_payload_digest(v_payload, p_expected_payload_digest);
  PERFORM private.lock_platform_operator_action(
    v_actor, 'platform.operators.revoke', p_idempotency_key
  );
  v_replay := private.platform_operator_action_replay(
    v_actor, 'platform.operators.revoke', p_idempotency_key, v_digest
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.operators.revoke', 20, interval '1 hour'
  );

  -- Share the grant-side global lock so last-admin and overlap invariants are
  -- evaluated against one serialized assignment set.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('platform:operator-assignment-authority', 0)
  );

  SELECT * INTO v_assignment
  FROM public.platform_operator_assignments assignment
  WHERE assignment.id = p_assignment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Platform operator assignment was not found',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_ASSIGNMENT_NOT_FOUND"}';
  END IF;
  IF v_assignment.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Platform operator assignment is not active',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_ASSIGNMENT_NOT_ACTIVE"}';
  END IF;
  IF v_assignment.profile_id = v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Self revocation is forbidden',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_SELF_REVOKE_FORBIDDEN"}';
  END IF;
  IF v_assignment.role_key = 'PLATFORM_ADMIN'
     AND v_assignment.valid_from <= clock_timestamp()
     AND (v_assignment.valid_to IS NULL OR v_assignment.valid_to > clock_timestamp())
     AND NOT EXISTS (
       SELECT 1
       FROM public.platform_operator_assignments other_assignment
       WHERE other_assignment.id <> v_assignment.id
          AND other_assignment.role_key = 'PLATFORM_ADMIN'
          AND other_assignment.revoked_at IS NULL
          AND other_assignment.valid_from <= clock_timestamp()
          -- A finite replacement could expire immediately after this revoke
          -- and orphan the control plane. Only a non-expiring active admin is
          -- sufficient to permit revoking another active administrator.
          AND other_assignment.valid_to IS NULL
      ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Last platform administrator is protected',
      DETAIL = '{"error_code":"PLATFORM_LAST_ADMIN_PROTECTION"}';
  END IF;

  v_approval := private.consume_platform_command_approval(
    p_approval_id, v_actor, 'platform.operators.revoke', v_payload, p_idempotency_key
  );
  v_before := jsonb_build_object(
    'assignment_id', v_assignment.id,
    'profile_id', v_assignment.profile_id,
    'role_key', v_assignment.role_key,
    'valid_from', v_assignment.valid_from,
    'valid_to', v_assignment.valid_to,
    'revoked_at', v_assignment.revoked_at
  );
  UPDATE public.platform_operator_assignments
  SET revoked_at = clock_timestamp(),
      revoked_by_profile_id = v_actor,
      revocation_reason = v_reason
  WHERE id = v_assignment.id AND revoked_at IS NULL
  RETURNING jsonb_build_object(
    'assignment_id', id,
    'profile_id', profile_id,
    'role_key', role_key,
    'valid_from', valid_from,
    'valid_to', valid_to,
    'revoked_at', revoked_at
  ) INTO v_after;

  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.operator.revoked', 'platform_operator_assignment',
    v_assignment.id::text, v_reason, p_idempotency_key,
    jsonb_build_object('before', v_before, 'after', v_after),
    v_digest, p_approval_id, NULL, 'REVOKED',
    private.platform_payload_digest(v_before), private.platform_payload_digest(v_after)
  );
  v_result := jsonb_build_object(
    'outcome', 'revoked',
    'assignment', v_after,
    'payload_digest', v_digest,
    'approval_outcome', v_approval ->> 'outcome',
    'replayed', false
  );
  PERFORM private.store_platform_operator_action_receipt(
    v_actor, 'platform.operators.revoke', p_idempotency_key, v_digest, v_result
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_platform_support_session(
  p_scope_type text,
  p_workspace_id uuid,
  p_agency_id uuid,
  p_capability_keys text[],
  p_access_mode text DEFAULT 'READ_ONLY',
  p_reason text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_ttl interval DEFAULT interval '30 minutes'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_scope_type text := upper(btrim(COALESCE(p_scope_type, '')));
  v_access_mode text := upper(btrim(COALESCE(p_access_mode, 'READ_ONLY')));
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_capabilities text[];
  v_existing public.platform_support_sessions%ROWTYPE;
  v_session public.platform_support_sessions%ROWTYPE;
  v_requested_at timestamptz := clock_timestamp();
  v_payload jsonb;
  v_digest text;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.support.request');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  IF p_capability_keys IS NULL
     OR EXISTS (SELECT 1 FROM unnest(p_capability_keys) capability WHERE capability IS NULL) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Support session capabilities are invalid',
      DETAIL = '{"error_code":"SUPPORT_SESSION_CAPABILITIES_INVALID"}';
  END IF;
  SELECT array_agg(DISTINCT btrim(capability) ORDER BY btrim(capability))
  INTO v_capabilities
  FROM unnest(p_capability_keys) capability;

  IF v_scope_type NOT IN ('WORKSPACE', 'AGENCY')
     OR (v_scope_type = 'WORKSPACE' AND (p_workspace_id IS NULL OR p_agency_id IS NOT NULL))
     OR (v_scope_type = 'AGENCY' AND (p_agency_id IS NULL OR p_workspace_id IS NOT NULL))
     OR v_access_mode NOT IN ('READ_ONLY', 'WRITE')
     OR cardinality(v_capabilities) NOT BETWEEN 1 AND 32
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR p_idempotency_key IS NULL
     OR p_ttl < interval '5 minutes'
     OR p_ttl > interval '60 minutes'
     OR EXISTS (
       SELECT 1
       FROM unnest(v_capabilities) requested(capability_key)
       WHERE requested.capability_key !~ '^[a-z][a-z0-9_.-]{2,95}$'
          OR NOT EXISTS (
            SELECT 1 FROM public.capability_key_map capability_map
            WHERE capability_map.canonical_key = requested.capability_key
          )
          OR (
            v_access_mode = 'READ_ONLY'
            AND requested.capability_key !~ '(^|[.])read([_.]|$)'
          )
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Support session request is invalid',
      DETAIL = '{"error_code":"SUPPORT_SESSION_INPUT_INVALID"}';
  END IF;
  IF v_scope_type = 'WORKSPACE'
     AND NOT EXISTS (SELECT 1 FROM public.workspaces workspace WHERE workspace.id = p_workspace_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Support workspace was not found',
      DETAIL = '{"error_code":"SUPPORT_SCOPE_NOT_FOUND"}';
  END IF;
  IF v_scope_type = 'AGENCY'
     AND NOT EXISTS (
       SELECT 1
       FROM public.management_agency_details agency
       WHERE agency.organization_id = p_agency_id
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Support agency was not found',
      DETAIL = '{"error_code":"SUPPORT_SCOPE_NOT_FOUND"}';
  END IF;

  v_payload := jsonb_build_object(
    'scope_type', v_scope_type,
    'workspace_id', p_workspace_id,
    'agency_id', p_agency_id,
    'capability_keys', to_jsonb(v_capabilities),
    'access_mode', v_access_mode,
    'reason', v_reason
  );
  v_digest := private.platform_payload_digest(v_payload);
  PERFORM private.lock_platform_operator_action(
    v_actor, 'platform.support.request', p_idempotency_key
  );
  SELECT * INTO v_existing
  FROM public.platform_support_sessions support
  WHERE support.requester_profile_id = v_actor
    AND support.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.scope_type <> v_scope_type
       OR v_existing.workspace_id IS DISTINCT FROM p_workspace_id
       OR v_existing.agency_id IS DISTINCT FROM p_agency_id
       OR v_existing.capability_keys <> v_capabilities
       OR v_existing.access_mode <> v_access_mode
       OR v_existing.reason <> v_reason THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505', MESSAGE = 'Support request idempotency payload mismatch',
        DETAIL = '{"error_code":"IDEMPOTENCY_PAYLOAD_MISMATCH"}';
    END IF;
    RETURN jsonb_build_object(
      'outcome', 'replayed',
      'support_session_id', v_existing.id,
      'status', v_existing.status,
      'expires_at', v_existing.expires_at,
      'payload_digest', v_digest,
      'replayed', true
    );
  END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.support.request', 10, interval '1 hour'
  );

  INSERT INTO public.platform_support_sessions (
    requester_profile_id, scope_type, workspace_id, agency_id, capability_keys,
    access_mode, reason, idempotency_key, requested_at, expires_at
  ) VALUES (
    v_actor, v_scope_type, p_workspace_id, p_agency_id, v_capabilities,
    v_access_mode, v_reason, p_idempotency_key, v_requested_at, v_requested_at + p_ttl
  ) RETURNING * INTO v_session;
  INSERT INTO public.platform_support_session_events (
    support_session_id, actor_profile_id, event_type, outcome, payload
  ) VALUES (
    v_session.id, v_actor, 'REQUESTED', 'PENDING',
    jsonb_build_object(
      'scope_type', v_scope_type,
      'workspace_id', p_workspace_id,
      'agency_id', p_agency_id,
      'capability_keys', v_capabilities,
      'access_mode', v_access_mode,
      'expires_at', v_session.expires_at,
      'payload_digest', v_digest
    )
  );
  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.support.requested', 'support_session', v_session.id::text,
    v_reason, p_idempotency_key,
    jsonb_build_object(
      'scope_type', v_scope_type,
      'workspace_id', p_workspace_id,
      'agency_id', p_agency_id,
      'capability_keys', v_capabilities,
      'access_mode', v_access_mode,
      'expires_at', v_session.expires_at
    ),
    v_digest, NULL, v_session.id, 'PENDING', NULL, NULL
  );
  RETURN jsonb_build_object(
    'outcome', 'created',
    'support_session_id', v_session.id,
    'status', v_session.status,
    'expires_at', v_session.expires_at,
    'payload_digest', v_digest,
    'replayed', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_platform_support_session(
  p_support_session_id uuid,
  p_decision text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_session public.platform_support_sessions%ROWTYPE;
  v_decision text := upper(btrim(COALESCE(p_decision, '')));
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_status text;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.support.approve');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF v_decision NOT IN ('APPROVE', 'REJECT')
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Support decision input is invalid',
      DETAIL = '{"error_code":"SUPPORT_SESSION_DECISION_INVALID"}';
  END IF;
  SELECT * INTO v_session
  FROM public.platform_support_sessions support
  WHERE support.id = p_support_session_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Support session was not found',
      DETAIL = '{"error_code":"SUPPORT_SESSION_NOT_FOUND"}';
  END IF;
  IF v_session.requester_profile_id = v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Self approval is forbidden',
      DETAIL = '{"error_code":"SUPPORT_SESSION_SELF_APPROVAL_FORBIDDEN"}';
  END IF;
  IF v_session.status <> 'PENDING' THEN
    RETURN jsonb_build_object(
      'outcome', 'already_decided',
      'support_session_id', v_session.id,
      'status', v_session.status
    );
  END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.support.decide', 30, interval '1 hour'
  );
  IF v_session.expires_at <= clock_timestamp() THEN
    UPDATE public.platform_support_sessions
    SET status = 'EXPIRED', decided_at = clock_timestamp(), decision_reason = v_reason
    WHERE id = v_session.id AND status = 'PENDING';
    INSERT INTO public.platform_support_session_events (
      support_session_id, actor_profile_id, event_type, outcome, payload
    ) VALUES (
      v_session.id, v_actor, 'EXPIRED', 'EXPIRED', jsonb_build_object('reason', v_reason)
    );
    PERFORM private.append_platform_operator_audit(
      v_actor, 'superadmin.support.expired', 'support_session', v_session.id::text,
      v_reason, NULL,
      jsonb_build_object('previous_status', v_session.status, 'expiry_path', 'decision'),
      NULL, NULL, v_session.id, 'EXPIRED', NULL, NULL
    );
    RETURN jsonb_build_object(
      'outcome', 'expired', 'support_session_id', v_session.id, 'status', 'EXPIRED'
    );
  END IF;

  v_status := CASE v_decision WHEN 'APPROVE' THEN 'ACTIVE' ELSE 'REJECTED' END;
  UPDATE public.platform_support_sessions
  SET status = v_status,
      approver_profile_id = v_actor,
      decision_reason = v_reason,
      decided_at = clock_timestamp(),
      activated_at = CASE WHEN v_status = 'ACTIVE' THEN clock_timestamp() ELSE NULL END
  WHERE id = v_session.id AND status = 'PENDING';
  INSERT INTO public.platform_support_session_events (
    support_session_id, actor_profile_id, event_type, outcome, payload
  ) VALUES (
    v_session.id, v_actor,
    CASE WHEN v_status = 'ACTIVE' THEN 'APPROVED' ELSE 'REJECTED' END,
    v_status,
    jsonb_build_object('reason', v_reason, 'requester_profile_id', v_session.requester_profile_id)
  );
  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.support.decided', 'support_session', v_session.id::text,
    v_reason, NULL,
    jsonb_build_object('decision', v_decision, 'requester_profile_id', v_session.requester_profile_id),
    NULL, NULL, v_session.id, v_status, NULL, NULL
  );
  RETURN jsonb_build_object(
    'outcome', 'decided',
    'support_session_id', v_session.id,
    'status', v_status,
    'expires_at', v_session.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_platform_support_session(
  p_support_session_id uuid,
  p_reason text,
  p_idempotency_key uuid,
  p_expected_payload_digest text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_session public.platform_support_sessions%ROWTYPE;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_payload jsonb;
  v_digest text;
  v_replay jsonb;
  v_result jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000', MESSAGE = 'Authentication required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF p_support_session_id IS NULL
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Support revocation input is invalid',
      DETAIL = '{"error_code":"SUPPORT_SESSION_REVOKE_INPUT_INVALID"}';
  END IF;
  v_payload := jsonb_build_object(
    'support_session_id', p_support_session_id,
    'revocation_reason', v_reason
  );
  v_digest := private.require_platform_payload_digest(v_payload, p_expected_payload_digest);
  PERFORM private.lock_platform_operator_action(
    v_actor, 'platform.support.revoke', p_idempotency_key
  );
  v_replay := private.platform_operator_action_replay(
    v_actor, 'platform.support.revoke', p_idempotency_key, v_digest
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  SELECT * INTO v_session
  FROM public.platform_support_sessions support
  WHERE support.id = p_support_session_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Support session was not found',
      DETAIL = '{"error_code":"SUPPORT_SESSION_NOT_FOUND"}';
  END IF;
  IF v_actor <> v_session.requester_profile_id
     AND v_actor IS DISTINCT FROM v_session.approver_profile_id
     AND NOT private.platform_operator_has_capability(
       v_actor, 'platform.support.revoke', clock_timestamp()
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Support session revocation denied',
      DETAIL = '{"error_code":"SUPPORT_SESSION_REVOKE_DENIED"}';
  END IF;
  IF v_session.status IN ('REJECTED', 'REVOKED', 'EXPIRED') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Support session is already terminal',
      DETAIL = '{"error_code":"SUPPORT_SESSION_TERMINAL"}';
  END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.support.revoke', 60, interval '1 hour'
  );

  UPDATE public.platform_support_sessions
  SET status = 'REVOKED',
      revoked_at = clock_timestamp(),
      revoked_by_profile_id = v_actor,
      revocation_reason = v_reason
  WHERE id = v_session.id AND status IN ('PENDING', 'ACTIVE');
  INSERT INTO public.platform_support_session_events (
    support_session_id, actor_profile_id, event_type, outcome, payload
  ) VALUES (
    v_session.id, v_actor, 'REVOKED', 'REVOKED',
    jsonb_build_object('reason', v_reason, 'previous_status', v_session.status)
  );
  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.support.revoked', 'support_session', v_session.id::text,
    v_reason, p_idempotency_key,
    jsonb_build_object('previous_status', v_session.status),
    v_digest, NULL, v_session.id, 'REVOKED', NULL, NULL
  );
  v_result := jsonb_build_object(
    'outcome', 'revoked',
    'support_session_id', v_session.id,
    'status', 'REVOKED',
    'payload_digest', v_digest,
    'replayed', false
  );
  PERFORM private.store_platform_operator_action_receipt(
    v_actor, 'platform.support.revoke', p_idempotency_key, v_digest, v_result
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.authorize_platform_support_action(
  p_support_session_id uuid,
  p_capability_key text,
  p_workspace_id uuid,
  p_agency_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_session public.platform_support_sessions%ROWTYPE;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.overview.read');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  SELECT * INTO v_session
  FROM public.platform_support_sessions support
  WHERE support.id = p_support_session_id
    AND support.requester_profile_id = v_actor
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Support session was not found',
      DETAIL = '{"error_code":"SUPPORT_SESSION_NOT_FOUND"}';
  END IF;
  IF v_session.status <> 'ACTIVE' OR v_session.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Support session is not active',
      DETAIL = '{"error_code":"SUPPORT_SESSION_NOT_ACTIVE"}';
  END IF;
  IF p_capability_key IS NULL OR NOT (p_capability_key = ANY(v_session.capability_keys)) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Support capability denied',
      DETAIL = '{"error_code":"SUPPORT_SESSION_CAPABILITY_DENIED"}';
  END IF;
  IF (v_session.scope_type = 'WORKSPACE'
      AND (p_workspace_id IS DISTINCT FROM v_session.workspace_id OR p_agency_id IS NOT NULL))
     OR (v_session.scope_type = 'AGENCY'
      AND (p_agency_id IS DISTINCT FROM v_session.agency_id OR p_workspace_id IS NOT NULL)) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Support scope mismatch',
      DETAIL = '{"error_code":"SUPPORT_SESSION_SCOPE_MISMATCH"}';
  END IF;
  IF v_session.access_mode = 'READ_ONLY'
     AND p_capability_key !~ '(^|[.])read([_.]|$)' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Read-only support session cannot authorize a write',
      DETAIL = '{"error_code":"SUPPORT_SESSION_READ_ONLY"}';
  END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.support.access', 240, interval '15 minutes'
  );
  INSERT INTO public.platform_support_session_events (
    support_session_id, actor_profile_id, event_type, outcome, payload
  ) VALUES (
    v_session.id, v_actor, 'ACCESSED', 'AUTHORIZED',
    jsonb_build_object(
      'capability_key', p_capability_key,
      'workspace_id', p_workspace_id,
      'agency_id', p_agency_id,
      'access_mode', v_session.access_mode
    )
  );
  RETURN jsonb_build_object(
    'outcome', 'authorized',
    'support_session_id', v_session.id,
    'scope_type', v_session.scope_type,
    'workspace_id', v_session.workspace_id,
    'agency_id', v_session.agency_id,
    'capability_key', p_capability_key,
    'access_mode', v_session.access_mode,
    'expires_at', v_session.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.attest_platform_release(
  p_environment text,
  p_deployment_id text,
  p_commit_sha text,
  p_artifact_digest text,
  p_manifest_fingerprint text,
  p_migration_head text,
  p_outcome text,
  p_reason text,
  p_idempotency_key uuid,
  p_expected_payload_digest text,
  p_approval_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_environment text := lower(btrim(COALESCE(p_environment, '')));
  v_commit_sha text := lower(btrim(COALESCE(p_commit_sha, '')));
  v_outcome text := upper(btrim(COALESCE(p_outcome, '')));
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_payload jsonb;
  v_digest text;
  v_replay jsonb;
  v_approval jsonb;
  v_attestation public.platform_release_attestations%ROWTYPE;
  v_result jsonb;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.release.attest');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF v_environment NOT IN ('production', 'preview', 'staging', 'development')
     OR COALESCE(p_deployment_id, '') !~ '^[A-Za-z0-9._:-]{3,160}$'
     OR v_commit_sha !~ '^[0-9a-f]{40}([0-9a-f]{24})?$'
     OR COALESCE(p_artifact_digest, '') !~ '^sha256:[0-9a-f]{64}$'
     OR COALESCE(p_manifest_fingerprint, '') !~ '^sha256:[0-9a-f]{64}$'
     OR COALESCE(p_migration_head, '') !~ '^[0-9]{14}_[a-z0-9_]{3,120}$'
     OR v_outcome NOT IN ('PASS', 'HOLD', 'FAIL')
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR p_idempotency_key IS NULL
     OR p_approval_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Release attestation input is invalid',
      DETAIL = '{"error_code":"PLATFORM_RELEASE_ATTESTATION_INPUT_INVALID"}';
  END IF;
  v_payload := jsonb_build_object(
    'environment', v_environment,
    'deployment_id', p_deployment_id,
    'commit_sha', v_commit_sha,
    'artifact_digest', p_artifact_digest,
    'manifest_fingerprint', p_manifest_fingerprint,
    'migration_head', p_migration_head,
    'outcome', v_outcome
  );
  v_digest := private.require_platform_payload_digest(v_payload, p_expected_payload_digest);
  PERFORM private.lock_platform_operator_action(
    v_actor, 'platform.release.attest', p_idempotency_key
  );
  v_replay := private.platform_operator_action_replay(
    v_actor, 'platform.release.attest', p_idempotency_key, v_digest
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.release.attest', 10, interval '1 hour'
  );
  v_approval := private.consume_platform_command_approval(
    p_approval_id, v_actor, 'platform.release.attest', v_payload, p_idempotency_key
  );

  INSERT INTO public.platform_release_attestations (
    environment, deployment_id, commit_sha, artifact_digest,
    manifest_fingerprint, migration_head, outcome, reason,
    attested_by_profile_id, approval_id, idempotency_key
  ) VALUES (
    v_environment, p_deployment_id, v_commit_sha, p_artifact_digest,
    p_manifest_fingerprint, p_migration_head, v_outcome, v_reason,
    v_actor, p_approval_id, p_idempotency_key
  ) RETURNING * INTO v_attestation;

  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.release.attested', 'deployment', p_deployment_id,
    v_reason, p_idempotency_key,
    jsonb_build_object(
      'attestation_id', v_attestation.id,
      'environment', v_environment,
      'commit_sha', v_commit_sha,
      'artifact_digest', p_artifact_digest,
      'manifest_fingerprint', p_manifest_fingerprint,
      'migration_head', p_migration_head
    ),
    v_digest, p_approval_id, NULL, v_outcome, NULL, p_artifact_digest
  );
  v_result := jsonb_build_object(
    'outcome', 'attested',
    'attestation_id', v_attestation.id,
    'environment', v_attestation.environment,
    'deployment_id', v_attestation.deployment_id,
    'release_outcome', v_attestation.outcome,
    'payload_digest', v_digest,
    'approval_outcome', v_approval ->> 'outcome',
    'replayed', false
  );
  PERFORM private.store_platform_operator_action_receipt(
    v_actor, 'platform.release.attest', p_idempotency_key, v_digest, v_result
  );
  RETURN v_result;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING
    ERRCODE = '23505', MESSAGE = 'Release attestation already exists',
    DETAIL = '{"error_code":"PLATFORM_RELEASE_ATTESTATION_DUPLICATE"}';
END;
$$;

-- Direct application-role mutations of protected administration columns are
-- denied. SECURITY DEFINER RPC statements run as the migration owner and pass;
-- database owners retain explicit break-glass capability.
CREATE OR REPLACE FUNCTION private.guard_platform_controlled_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated', 'service_role') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Protected platform mutation requires an authority RPC',
      DETAIL = jsonb_build_object(
        'error_code', 'PLATFORM_AUTHORITY_RPC_REQUIRED',
        'table', TG_TABLE_NAME
      )::text;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.guard_profile_trial_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF NEW.free_trial_start IS DISTINCT FROM OLD.free_trial_start
     OR NEW.free_trial_days IS DISTINCT FROM OLD.free_trial_days
     OR NEW.free_trial_never_expires IS DISTINCT FROM OLD.free_trial_never_expires THEN
    IF current_user IN ('anon', 'authenticated', 'service_role') THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501', MESSAGE = 'Trial mutation requires an authority RPC',
        DETAIL = '{"error_code":"PLATFORM_AUTHORITY_RPC_REQUIRED"}';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_trial_authority
  ON public.profiles;
CREATE TRIGGER trg_profiles_trial_authority
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.guard_profile_trial_mutation();

DROP TRIGGER IF EXISTS trg_features_authority
  ON public.features;
CREATE TRIGGER trg_features_authority
BEFORE UPDATE OR DELETE ON public.features
FOR EACH ROW EXECUTE FUNCTION private.guard_platform_controlled_mutation();

DROP TRIGGER IF EXISTS trg_platform_settings_authority
  ON public.platform_settings;
CREATE TRIGGER trg_platform_settings_authority
BEFORE INSERT OR UPDATE OR DELETE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION private.guard_platform_controlled_mutation();

REVOKE ALL ON FUNCTION private.guard_platform_controlled_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.guard_profile_trial_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_platform_user_trial(
  p_profile_id uuid,
  p_free_trial_start timestamptz,
  p_free_trial_days integer,
  p_free_trial_never_expires boolean,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_trial_start timestamptz := CASE WHEN p_free_trial_start IS NULL THEN NULL ELSE
    date_trunc('milliseconds', p_free_trial_start AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' END;
  v_payload jsonb;
  v_digest text;
  v_replay jsonb;
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.users.manage_trial');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF p_profile_id IS NULL
     OR p_free_trial_days NOT BETWEEN 1 AND 3650
     OR p_free_trial_never_expires IS NULL
     OR (v_trial_start IS NOT NULL AND (
       v_trial_start < timestamptz '2000-01-01 00:00:00+00'
       OR v_trial_start > clock_timestamp() + interval '365 days'
     ))
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform user trial input is invalid',
      DETAIL = '{"error_code":"PLATFORM_USER_TRIAL_INPUT_INVALID"}';
  END IF;
  v_payload := jsonb_build_object(
    'profile_id', p_profile_id,
    'free_trial_start', CASE WHEN v_trial_start IS NULL THEN NULL
      ELSE private.platform_utc_iso(v_trial_start) END,
    'free_trial_days', p_free_trial_days,
    'free_trial_never_expires', p_free_trial_never_expires
  );
  v_digest := private.platform_payload_digest(v_payload);
  PERFORM private.lock_platform_operator_action(
    v_actor, 'platform.users.trial.update', p_idempotency_key
  );
  v_replay := private.platform_operator_action_replay(
    v_actor, 'platform.users.trial.update', p_idempotency_key, v_digest
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.users.trial.update', 30, interval '15 minutes'
  );

  SELECT jsonb_build_object(
    'free_trial_start', profile.free_trial_start,
    'free_trial_days', profile.free_trial_days,
    'free_trial_never_expires', profile.free_trial_never_expires
  ) INTO v_before
  FROM public.profiles profile
  WHERE profile.id = p_profile_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Platform user was not found',
      DETAIL = '{"error_code":"PLATFORM_USER_NOT_FOUND"}';
  END IF;

  v_after := jsonb_build_object(
    'free_trial_start', v_trial_start,
    'free_trial_days', p_free_trial_days,
    'free_trial_never_expires', p_free_trial_never_expires
  );
  IF v_before = v_after THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Platform user trial update is a no-op',
      DETAIL = '{"error_code":"PLATFORM_USER_TRIAL_NO_CHANGE"}';
  END IF;

  UPDATE public.profiles
  SET free_trial_start = v_trial_start,
      free_trial_days = p_free_trial_days,
      free_trial_never_expires = p_free_trial_never_expires
  WHERE id = p_profile_id;
  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.user.trial_update', 'profile', p_profile_id::text,
    v_reason, p_idempotency_key,
    jsonb_build_object('before', v_before, 'after', v_after),
    v_digest, NULL, NULL, 'UPDATED',
    private.platform_payload_digest(v_before), private.platform_payload_digest(v_after)
  );
  v_result := jsonb_build_object(
    'outcome', 'updated',
    'profile_id', p_profile_id,
    'trial', v_after,
    'payload_digest', v_digest,
    'replayed', false
  );
  PERFORM private.store_platform_operator_action_receipt(
    v_actor, 'platform.users.trial.update', p_idempotency_key, v_digest, v_result
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_platform_feature(
  p_feature_id uuid,
  p_patch jsonb,
  p_reason text,
  p_idempotency_key uuid,
  p_expected_payload_digest text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_payload jsonb;
  v_digest text;
  v_replay jsonb;
  v_feature public.features%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.features.manage');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF p_feature_id IS NULL
     OR p_patch IS NULL
     OR jsonb_typeof(p_patch) <> 'object'
     OR p_patch = '{}'::jsonb
     OR pg_column_size(p_patch) > 8192
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR p_idempotency_key IS NULL
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(p_patch) patch_key
       WHERE patch_key <> ALL(ARRAY[
         'name', 'description', 'module', 'route_path', 'menu_path',
         'tier', 'enabled', 'sort_order'
       ]::text[])
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform feature input is invalid',
      DETAIL = '{"error_code":"PLATFORM_FEATURE_INPUT_INVALID"}';
  END IF;

  IF (p_patch ? 'name' AND (
        jsonb_typeof(p_patch -> 'name') <> 'string'
        OR char_length(btrim(p_patch ->> 'name')) NOT BETWEEN 1 AND 200
      ))
     OR (p_patch ? 'description' AND p_patch -> 'description' <> 'null'::jsonb AND (
        jsonb_typeof(p_patch -> 'description') <> 'string'
        OR char_length(p_patch ->> 'description') > 500
      ))
     OR (p_patch ? 'module' AND (
        jsonb_typeof(p_patch -> 'module') <> 'string'
        OR (p_patch ->> 'module') !~ '^[a-z][a-z0-9_-]{0,99}$'
      ))
     OR (p_patch ? 'route_path' AND p_patch -> 'route_path' <> 'null'::jsonb AND (
        jsonb_typeof(p_patch -> 'route_path') <> 'string'
        OR char_length(p_patch ->> 'route_path') > 300
        OR (p_patch ->> 'route_path') !~ '^/'
      ))
     OR (p_patch ? 'menu_path' AND p_patch -> 'menu_path' <> 'null'::jsonb AND (
        jsonb_typeof(p_patch -> 'menu_path') <> 'string'
        OR char_length(p_patch ->> 'menu_path') > 300
      ))
     OR (p_patch ? 'tier' AND (
        jsonb_typeof(p_patch -> 'tier') <> 'string'
        OR (p_patch ->> 'tier') NOT IN ('trial', 'alap', 'pro')
      ))
     OR (p_patch ? 'enabled' AND jsonb_typeof(p_patch -> 'enabled') <> 'boolean')
     OR (p_patch ? 'sort_order' AND (
        jsonb_typeof(p_patch -> 'sort_order') <> 'number'
        OR (p_patch ->> 'sort_order') !~ '^-?[0-9]{1,6}$'
        OR (p_patch ->> 'sort_order')::integer NOT BETWEEN -100000 AND 100000
      )) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform feature patch is invalid',
      DETAIL = '{"error_code":"PLATFORM_FEATURE_INPUT_INVALID"}';
  END IF;

  v_payload := jsonb_build_object('feature_id', p_feature_id, 'patch', p_patch);
  v_digest := private.require_platform_payload_digest(v_payload, p_expected_payload_digest);
  PERFORM private.lock_platform_operator_action(
    v_actor, 'platform.features.update', p_idempotency_key
  );
  v_replay := private.platform_operator_action_replay(
    v_actor, 'platform.features.update', p_idempotency_key, v_digest
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.features.update', 30, interval '15 minutes'
  );

  SELECT * INTO v_feature
  FROM public.features feature
  WHERE feature.id = p_feature_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Platform feature was not found',
      DETAIL = '{"error_code":"PLATFORM_FEATURE_NOT_FOUND"}';
  END IF;
  v_before := jsonb_build_object(
    'name', v_feature.name,
    'description', v_feature.description,
    'module', v_feature.module,
    'route_path', v_feature.route_path,
    'menu_path', v_feature.menu_path,
    'tier', v_feature.tier,
    'enabled', v_feature.enabled,
    'sort_order', v_feature.sort_order
  );

  UPDATE public.features feature
  SET name = CASE WHEN p_patch ? 'name' THEN btrim(p_patch ->> 'name') ELSE feature.name END,
      description = CASE WHEN p_patch ? 'description' THEN
        CASE WHEN p_patch -> 'description' = 'null'::jsonb THEN NULL ELSE p_patch ->> 'description' END
        ELSE feature.description END,
      module = CASE WHEN p_patch ? 'module' THEN p_patch ->> 'module' ELSE feature.module END,
      route_path = CASE WHEN p_patch ? 'route_path' THEN
        CASE WHEN p_patch -> 'route_path' = 'null'::jsonb THEN NULL ELSE p_patch ->> 'route_path' END
        ELSE feature.route_path END,
      menu_path = CASE WHEN p_patch ? 'menu_path' THEN
        CASE WHEN p_patch -> 'menu_path' = 'null'::jsonb THEN NULL ELSE p_patch ->> 'menu_path' END
        ELSE feature.menu_path END,
      tier = CASE WHEN p_patch ? 'tier' THEN p_patch ->> 'tier' ELSE feature.tier END,
      enabled = CASE WHEN p_patch ? 'enabled' THEN (p_patch ->> 'enabled')::boolean ELSE feature.enabled END,
      sort_order = CASE WHEN p_patch ? 'sort_order' THEN (p_patch ->> 'sort_order')::integer ELSE feature.sort_order END
  WHERE feature.id = p_feature_id
  RETURNING * INTO v_feature;

  v_after := jsonb_build_object(
    'name', v_feature.name,
    'description', v_feature.description,
    'module', v_feature.module,
    'route_path', v_feature.route_path,
    'menu_path', v_feature.menu_path,
    'tier', v_feature.tier,
    'enabled', v_feature.enabled,
    'sort_order', v_feature.sort_order
  );
  IF v_before = v_after THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Platform feature update is a no-op',
      DETAIL = '{"error_code":"PLATFORM_FEATURE_NO_CHANGE"}';
  END IF;
  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.feature.update', 'feature', p_feature_id::text,
    v_reason, p_idempotency_key,
    jsonb_build_object('before', v_before, 'after', v_after),
    v_digest, NULL, NULL, 'UPDATED',
    private.platform_payload_digest(v_before), private.platform_payload_digest(v_after)
  );
  v_result := jsonb_build_object(
    'outcome', 'updated',
    'feature_id', p_feature_id,
    'feature', v_after,
    'payload_digest', v_digest,
    'replayed', false
  );
  PERFORM private.store_platform_operator_action_receipt(
    v_actor, 'platform.features.update', p_idempotency_key, v_digest, v_result
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_platform_setting(
  p_key text,
  p_value jsonb,
  p_reason text,
  p_idempotency_key uuid,
  p_expected_payload_digest text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_key text := lower(btrim(COALESCE(p_key, '')));
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_payload jsonb;
  v_digest text;
  v_replay jsonb;
  v_before jsonb;
  v_before_exists boolean := false;
  v_result jsonb;
  v_cell_delay_ms integer;
  v_retry_max integer;
  v_retry_wait_ms integer;
  v_cells_per_run integer;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.settings.manage');
  PERFORM private.require_recent_aal2(interval '15 minutes');
  IF v_key NOT IN ('map_theme', 'bkk_rate_limits')
     OR p_value IS NULL
     OR jsonb_typeof(p_value) <> 'object'
     OR pg_column_size(p_value) > 4096
     OR char_length(v_reason) NOT BETWEEN 3 AND 1000
     OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Platform setting input is invalid',
      DETAIL = '{"error_code":"PLATFORM_SETTING_INPUT_INVALID"}';
  END IF;

  IF v_key = 'map_theme' THEN
    IF NOT (p_value ? 'id')
       OR p_value - 'id' <> '{}'::jsonb
       OR jsonb_typeof(p_value -> 'id') <> 'string'
       OR (p_value ->> 'id') NOT IN ('minimal', 'nature', 'dark', 'dlc') THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Map theme setting is invalid',
        DETAIL = '{"error_code":"PLATFORM_SETTING_INPUT_INVALID"}';
    END IF;
  ELSE
    IF NOT (p_value ?& ARRAY['cell_delay_ms', 'retry_max', 'retry_wait_ms', 'cells_per_run'])
       OR p_value - ARRAY['cell_delay_ms', 'retry_max', 'retry_wait_ms', 'cells_per_run'] <> '{}'::jsonb
       OR jsonb_typeof(p_value -> 'cell_delay_ms') <> 'number'
       OR jsonb_typeof(p_value -> 'retry_max') <> 'number'
       OR jsonb_typeof(p_value -> 'retry_wait_ms') <> 'number'
       OR jsonb_typeof(p_value -> 'cells_per_run') <> 'number'
       OR (p_value ->> 'cell_delay_ms') !~ '^[0-9]{1,6}$'
       OR (p_value ->> 'retry_max') !~ '^[0-9]{1,2}$'
       OR (p_value ->> 'retry_wait_ms') !~ '^[0-9]{1,6}$'
       OR (p_value ->> 'cells_per_run') !~ '^[0-9]{1,2}$' THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'BKK rate-limit setting is invalid',
        DETAIL = '{"error_code":"PLATFORM_SETTING_INPUT_INVALID"}';
    END IF;
    v_cell_delay_ms := (p_value ->> 'cell_delay_ms')::integer;
    v_retry_max := (p_value ->> 'retry_max')::integer;
    v_retry_wait_ms := (p_value ->> 'retry_wait_ms')::integer;
    v_cells_per_run := (p_value ->> 'cells_per_run')::integer;
    IF v_cell_delay_ms NOT BETWEEN 1000 AND 120000
       OR v_retry_max NOT BETWEEN 0 AND 10
       OR v_retry_wait_ms NOT BETWEEN 1000 AND 600000
       OR v_cells_per_run NOT BETWEEN 0 AND 3 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'BKK rate-limit setting is invalid',
        DETAIL = '{"error_code":"PLATFORM_SETTING_INPUT_INVALID"}';
    END IF;
  END IF;

  v_payload := jsonb_build_object('key', v_key, 'value', p_value);
  v_digest := private.require_platform_payload_digest(v_payload, p_expected_payload_digest);
  PERFORM private.lock_platform_operator_action(
    v_actor, 'platform.settings.update', p_idempotency_key
  );
  v_replay := private.platform_operator_action_replay(
    v_actor, 'platform.settings.update', p_idempotency_key, v_digest
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.settings.update', 20, interval '15 minutes'
  );

  SELECT setting.value INTO v_before
  FROM public.platform_settings setting
  WHERE setting.key = v_key
  FOR UPDATE;
  v_before_exists := FOUND;
  IF v_before_exists AND v_before = p_value THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Platform setting update is a no-op',
      DETAIL = '{"error_code":"PLATFORM_SETTING_NO_CHANGE"}';
  END IF;

  INSERT INTO public.platform_settings (key, value, updated_at)
  VALUES (v_key, p_value, clock_timestamp())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at;
  PERFORM private.append_platform_operator_audit(
    v_actor, 'superadmin.setting.update', 'platform_setting', v_key,
    v_reason, p_idempotency_key,
    jsonb_build_object('before', v_before, 'after', p_value),
    v_digest, NULL, NULL, 'UPDATED',
    CASE WHEN v_before_exists THEN private.platform_payload_digest(v_before) ELSE NULL END,
    private.platform_payload_digest(p_value)
  );
  v_result := jsonb_build_object(
    'outcome', 'updated',
    'key', v_key,
    'value', p_value,
    'payload_digest', v_digest,
    'replayed', false
  );
  PERFORM private.store_platform_operator_action_receipt(
    v_actor, 'platform.settings.update', p_idempotency_key, v_digest, v_result
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_platform_community_address_candidate(
  p_request_id uuid,
  p_candidate_address_id uuid,
  p_resolution text,
  p_resolution_reason text,
  p_evidence_refs jsonb,
  p_idempotency_key uuid,
  p_expected_payload_digest text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_actor_email text;
  v_resolution text := upper(btrim(COALESCE(p_resolution, '')));
  v_reason text := btrim(COALESCE(p_resolution_reason, ''));
  v_refs jsonb;
  v_payload jsonb;
  v_digest text;
  v_replay jsonb;
  v_request public.community_creation_requests%ROWTYPE;
  v_existing public.community_address_duplicate_resolutions%ROWTYPE;
  v_request_address_key text;
  v_candidate_address_key text;
  v_candidate_workspace_id uuid;
  v_resolution_id uuid := gen_random_uuid();
  v_request_status text;
  v_resolved_at timestamptz;
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.communities.review');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  SELECT lower(btrim(profile.email))
  INTO v_actor_email
  FROM public.profiles profile
  WHERE profile.id = v_actor;
  IF char_length(COALESCE(v_actor_email, '')) NOT BETWEEN 3 AND 320
     OR v_actor_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Platform operator profile is invalid',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_PROFILE_INVALID"}';
  END IF;
  IF p_request_id IS NULL
     OR p_candidate_address_id IS NULL
     OR p_idempotency_key IS NULL
     OR v_resolution NOT IN ('NOT_DUPLICATE', 'LINK_EXISTING')
     OR char_length(v_reason) NOT BETWEEN 3 AND 2000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Duplicate resolution input is invalid',
      DETAIL = '{"error_code":"DUPLICATE_RESOLUTION_INVALID"}';
  END IF;

  v_refs := private.validate_opaque_evidence_references(p_evidence_refs);
  v_payload := jsonb_build_object(
    'request_id', p_request_id,
    'candidate_address_id', p_candidate_address_id,
    'resolution', v_resolution,
    'reason', v_reason,
    'evidence_refs', v_refs
  );
  v_digest := private.require_platform_payload_digest(v_payload, p_expected_payload_digest);
  PERFORM private.lock_platform_operator_action(
    v_actor, 'platform.communities.resolve_address_candidate', p_idempotency_key
  );
  v_replay := private.platform_operator_action_replay(
    v_actor, 'platform.communities.resolve_address_candidate', p_idempotency_key, v_digest
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.communities.resolve_address_candidate', 20, interval '1 minute'
  );

  SELECT request.* INTO v_request
  FROM public.community_creation_requests request
  WHERE request.id = p_request_id
  FOR UPDATE;
  IF v_request.id IS NULL
     OR v_request.status NOT IN ('PENDING_VERIFICATION', 'NEEDS_EVIDENCE', 'APPROVED')
     OR v_request.activated_at IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Community request cannot resolve duplicates',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_NOT_REVIEWABLE"}';
  END IF;
  IF v_request.claimant_profile_id = v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Reviewer cannot resolve their own request',
      DETAIL = '{"error_code":"REVIEWER_SELF_APPROVAL_FORBIDDEN"}';
  END IF;

  SELECT resolution.* INTO v_existing
  FROM public.community_address_duplicate_resolutions resolution
  WHERE resolution.community_creation_request_id = v_request.id
    AND resolution.candidate_address_id = p_candidate_address_id;
  IF v_existing.id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Address candidate was already resolved',
      DETAIL = '{"error_code":"DUPLICATE_CANDIDATE_ALREADY_RESOLVED"}';
  END IF;

  SELECT address.canonical_key INTO v_request_address_key
  FROM public.addresses address
  WHERE address.id = v_request.address_id AND address.valid_to IS NULL;
  SELECT address.canonical_key INTO v_candidate_address_key
  FROM public.addresses address
  WHERE address.id = p_candidate_address_id
    AND address.id <> v_request.address_id
    AND address.address_level = 'BUILDING'
    AND address.valid_to IS NULL;
  IF v_request_address_key IS NULL
     OR v_candidate_address_key IS NULL
     OR similarity(v_request_address_key, v_candidate_address_key) < 0.85 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Address is not a high-similarity candidate',
      DETAIL = '{"error_code":"ADDRESS_CANDIDATE_INVALID","threshold":0.85}';
  END IF;

  SELECT workspace.id INTO v_candidate_workspace_id
  FROM public.building_address_assignments assignment
  JOIN public.workspace_buildings workspace_building
    ON workspace_building.physical_building_id = assignment.physical_building_id
   AND workspace_building.is_primary
   AND workspace_building.valid_to IS NULL
  JOIN public.workspaces workspace
    ON workspace.id = workspace_building.workspace_id
   AND workspace.status = 'ACTIVE'
  WHERE assignment.address_id = p_candidate_address_id
    AND assignment.assignment_role = 'PRIMARY'
    AND assignment.valid_to IS NULL
  ORDER BY workspace.id
  LIMIT 1;
  IF v_candidate_workspace_id IS NULL AND NOT EXISTS (
    SELECT 1
    FROM public.community_creation_requests other_request
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

  v_resolved_at := clock_timestamp();
  v_before := jsonb_build_object(
    'status', v_request.status,
    'linked_existing_workspace_id', v_request.linked_existing_workspace_id
  );
  INSERT INTO public.community_address_duplicate_resolutions (
    id, community_creation_request_id, candidate_address_id,
    candidate_workspace_id, resolution, resolution_reason,
    evidence_references, reviewer_actor, reviewer_profile_id,
    idempotency_key, created_at
  ) VALUES (
    v_resolution_id, v_request.id, p_candidate_address_id,
    v_candidate_workspace_id, v_resolution, v_reason,
    v_refs, v_actor_email, v_actor,
    p_idempotency_key, v_resolved_at
  );

  IF v_resolution = 'LINK_EXISTING' THEN
    UPDATE public.community_creation_requests
    SET status = 'REJECTED',
        linked_existing_workspace_id = v_candidate_workspace_id,
        activation_expires_at = NULL,
        review_reason = v_reason,
        reviewed_by_profile_id = v_actor,
        reviewed_at = v_resolved_at,
        updated_at = v_resolved_at
    WHERE id = v_request.id;
    v_request_status := 'REJECTED';
  ELSE
    v_request_status := v_request.status;
  END IF;
  v_after := jsonb_build_object(
    'status', v_request_status,
    'linked_existing_workspace_id', v_candidate_workspace_id,
    'resolution_id', v_resolution_id,
    'resolution', v_resolution
  );

  INSERT INTO public.authorization_audit_events (
    workspace_id, actor_profile_id, action_key, object_type, object_id,
    decision, reason_code, metadata
  ) VALUES (
    v_candidate_workspace_id, v_actor, 'COMMUNITY_ADDRESS_DUPLICATE_RESOLVED',
    'community_creation_request', v_request.id, 'STATE_CHANGE', v_resolution,
    jsonb_build_object(
      'resolution_id', v_resolution_id,
      'candidate_address_id', p_candidate_address_id,
      'candidate_workspace_id', v_candidate_workspace_id
    )
  );
  PERFORM private.append_platform_operator_audit(
    v_actor,
    'superadmin.community.address_candidate.resolve',
    'community_creation_request',
    v_request.id::text,
    v_reason,
    p_idempotency_key,
    jsonb_build_object(
      'resolution_id', v_resolution_id,
      'candidate_address_id', p_candidate_address_id,
      'resolution', v_resolution
    ),
    v_digest,
    NULL,
    NULL,
    'RESOLVED',
    private.platform_payload_digest(v_before),
    private.platform_payload_digest(v_after)
  );

  v_result := jsonb_build_object(
    'outcome', 'resolved',
    'resolution_id', v_resolution_id,
    'request_id', v_request.id,
    'candidate_address_id', p_candidate_address_id,
    'duplicate_resolution', v_resolution,
    'request_status', v_request_status,
    'linked_existing_workspace_id', v_candidate_workspace_id,
    'resolved_at', private.platform_utc_iso(v_resolved_at),
    'payload_digest', v_digest,
    'replayed', false
  );
  PERFORM private.store_platform_operator_action_receipt(
    v_actor, 'platform.communities.resolve_address_candidate',
    p_idempotency_key, v_digest, v_result
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_platform_community_creation_request(
  p_request_id uuid,
  p_decision text,
  p_review_reason text,
  p_verification_method text,
  p_evidence_refs jsonb,
  p_idempotency_key uuid,
  p_expected_payload_digest text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid;
  v_actor_email text;
  v_decision text := upper(btrim(COALESCE(p_decision, '')));
  v_reason text := btrim(COALESCE(p_review_reason, ''));
  v_method text := NULLIF(upper(btrim(COALESCE(p_verification_method, ''))), '');
  v_refs jsonb;
  v_payload jsonb;
  v_digest text;
  v_replay jsonb;
  v_request public.community_creation_requests%ROWTYPE;
  v_review_id uuid := gen_random_uuid();
  v_new_status text;
  v_legal_basis text;
  v_activation_expires_at timestamptz;
  v_reviewed_at timestamptz;
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
BEGIN
  v_actor := private.require_platform_operator_capability('platform.communities.review');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  SELECT lower(btrim(profile.email))
  INTO v_actor_email
  FROM public.profiles profile
  WHERE profile.id = v_actor;
  IF char_length(COALESCE(v_actor_email, '')) NOT BETWEEN 3 AND 320
     OR v_actor_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Platform operator profile is invalid',
      DETAIL = '{"error_code":"PLATFORM_OPERATOR_PROFILE_INVALID"}';
  END IF;
  IF p_request_id IS NULL
     OR p_idempotency_key IS NULL
     OR v_decision NOT IN ('APPROVE', 'NEEDS_EVIDENCE', 'REJECT')
     OR v_method IS NULL
     OR v_method NOT IN ('OFFICIAL_REGISTER', 'SIGNED_MANDATE', 'SELF_MANAGED_RESOLUTION')
     OR char_length(v_reason) NOT BETWEEN 3 AND 2000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Community review input is invalid',
      DETAIL = '{"error_code":"COMMUNITY_REVIEW_INPUT_INVALID"}';
  END IF;

  v_refs := private.validate_opaque_evidence_references(p_evidence_refs);
  v_payload := jsonb_build_object(
    'request_id', p_request_id,
    'decision', v_decision,
    'reason', v_reason,
    'verification_method', v_method,
    'evidence_refs', v_refs
  );
  v_digest := private.require_platform_payload_digest(v_payload, p_expected_payload_digest);
  PERFORM private.lock_platform_operator_action(
    v_actor, 'platform.communities.review_request', p_idempotency_key
  );
  v_replay := private.platform_operator_action_replay(
    v_actor, 'platform.communities.review_request', p_idempotency_key, v_digest
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;
  PERFORM private.enforce_platform_operator_action_quota(
    v_actor, 'platform.communities.review_request', 20, interval '1 minute'
  );

  SELECT request.* INTO v_request
  FROM public.community_creation_requests request
  WHERE request.id = p_request_id
  FOR UPDATE;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002', MESSAGE = 'Community creation request is unavailable',
      DETAIL = '{"error_code":"COMMUNITY_REQUEST_UNAVAILABLE"}';
  END IF;
  IF v_request.claimant_profile_id = v_actor THEN
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
  IF v_request.governance_mode = 'SELF_MANAGED'
     AND v_method IS DISTINCT FROM 'SELF_MANAGED_RESOLUTION' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Verification method is invalid for self-managed governance',
      DETAIL = '{"error_code":"SELF_MANAGED_RESOLUTION_REQUIRED"}';
  ELSIF v_request.governance_mode IN ('REPRESENTATIVE_MANAGED', 'BOARD_MANAGED')
        AND v_method NOT IN ('OFFICIAL_REGISTER', 'SIGNED_MANDATE') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Verification method is invalid for managed governance',
      DETAIL = '{"error_code":"MANAGED_VERIFICATION_METHOD_INVALID"}';
  END IF;

  v_before := jsonb_build_object(
    'status', v_request.status,
    'governance_legal_basis', v_request.governance_legal_basis,
    'last_review_id', v_request.last_review_id,
    'activation_expires_at', CASE WHEN v_request.activation_expires_at IS NULL THEN NULL
      ELSE private.platform_utc_iso(v_request.activation_expires_at) END
  );
  IF v_decision = 'APPROVE' THEN
    IF v_request.address_lease_expires_at <= clock_timestamp() THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Address lease has expired',
        DETAIL = '{"error_code":"ADDRESS_LEASE_EXPIRED"}';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.building_address_assignments assignment
      JOIN public.workspace_buildings workspace_building
        ON workspace_building.physical_building_id = assignment.physical_building_id
       AND workspace_building.is_primary
       AND workspace_building.valid_to IS NULL
      JOIN public.workspaces workspace
        ON workspace.id = workspace_building.workspace_id
       AND workspace.status = 'ACTIVE'
      WHERE assignment.address_id = v_request.address_id
        AND assignment.assignment_role = 'PRIMARY'
        AND assignment.valid_to IS NULL
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
      clock_timestamp() + interval '72 hours'
    );
  ELSIF v_decision = 'NEEDS_EVIDENCE' THEN
    v_new_status := 'NEEDS_EVIDENCE';
  ELSE
    v_new_status := 'REJECTED';
  END IF;

  v_reviewed_at := clock_timestamp();
  INSERT INTO public.community_creation_reviews (
    id, community_creation_request_id, reviewer_actor, reviewer_profile_id,
    decision, review_reason, verification_method, evidence_references,
    idempotency_key, created_at
  ) VALUES (
    v_review_id, v_request.id, v_actor_email, v_actor,
    v_decision, v_reason, v_method, v_refs,
    p_idempotency_key, v_reviewed_at
  );
  UPDATE public.community_creation_requests
  SET status = v_new_status,
      governance_legal_basis = CASE
        WHEN v_decision = 'APPROVE' THEN v_legal_basis
        ELSE governance_legal_basis
      END,
      last_review_id = v_review_id,
      reviewed_by_profile_id = v_actor,
      review_reason = v_reason,
      reviewed_at = v_reviewed_at,
      activation_expires_at = v_activation_expires_at,
      updated_at = v_reviewed_at
  WHERE id = v_request.id;
  v_after := jsonb_build_object(
    'status', v_new_status,
    'governance_legal_basis', CASE WHEN v_decision = 'APPROVE' THEN v_legal_basis
      ELSE v_request.governance_legal_basis END,
    'last_review_id', v_review_id,
    'activation_expires_at', CASE WHEN v_activation_expires_at IS NULL THEN NULL
      ELSE private.platform_utc_iso(v_activation_expires_at) END
  );

  INSERT INTO public.authorization_audit_events (
    workspace_id, actor_profile_id, action_key, object_type, object_id,
    decision, reason_code, metadata
  ) VALUES (
    NULL, v_actor, 'COMMUNITY_CREATION_REVIEWED',
    'community_creation_request', v_request.id, 'STATE_CHANGE', v_new_status,
    jsonb_build_object(
      'review_id', v_review_id,
      'verification_method', v_method,
      'activation_pending', v_new_status = 'APPROVED'
    )
  );
  PERFORM private.append_platform_operator_audit(
    v_actor,
    'superadmin.community.review',
    'community_creation_request',
    v_request.id::text,
    v_reason,
    p_idempotency_key,
    jsonb_build_object(
      'review_id', v_review_id,
      'decision', v_decision,
      'verification_method', v_method,
      'request_status', v_new_status
    ),
    v_digest,
    NULL,
    NULL,
    'REVIEWED',
    private.platform_payload_digest(v_before),
    private.platform_payload_digest(v_after)
  );

  v_result := jsonb_build_object(
    'outcome', 'reviewed',
    'review_id', v_review_id,
    'request_id', v_request.id,
    'request_status', v_new_status,
    'activation_pending', v_new_status = 'APPROVED',
    'reviewed_at', private.platform_utc_iso(v_reviewed_at),
    'activation_expires_at', CASE WHEN v_activation_expires_at IS NULL THEN NULL
      ELSE private.platform_utc_iso(v_activation_expires_at) END,
    'payload_digest', v_digest,
    'replayed', false
  );
  PERFORM private.store_platform_operator_action_receipt(
    v_actor, 'platform.communities.review_request',
    p_idempotency_key, v_digest, v_result
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_platform_support_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_session public.platform_support_sessions%ROWTYPE;
  v_count integer := 0;
BEGIN
  FOR v_session IN
    SELECT *
    FROM public.platform_support_sessions support
    WHERE support.status IN ('PENDING', 'ACTIVE')
      AND support.expires_at <= clock_timestamp()
    ORDER BY support.expires_at, support.id
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.platform_support_sessions
    SET status = 'EXPIRED',
        decided_at = COALESCE(decided_at, clock_timestamp())
    WHERE id = v_session.id
      AND status IN ('PENDING', 'ACTIVE')
      AND expires_at <= clock_timestamp();
    IF FOUND THEN
      INSERT INTO public.platform_support_session_events (
        support_session_id, actor_profile_id, event_type, outcome, payload
      ) VALUES (
        v_session.id, NULL, 'EXPIRED', 'EXPIRED',
        jsonb_build_object('expired_at', clock_timestamp(), 'previous_status', v_session.status)
      );
      PERFORM private.append_platform_operator_audit(
        NULL, 'superadmin.support.expired', 'support_session', v_session.id::text,
        'Support session TTL elapsed', NULL,
        jsonb_build_object('previous_status', v_session.status),
        NULL, NULL, v_session.id, 'EXPIRED', NULL, NULL
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Public authority RPCs are authenticated-only; tables remain default-deny.
REVOKE ALL ON FUNCTION public.get_platform_operator_context()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_platform_payload_digest(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prepare_platform_operator_grant_payload(uuid, text, timestamptz, timestamptz, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_platform_command_approval(text, text, text, text, jsonb, text, uuid, interval)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.decide_platform_command_approval(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.authorize_platform_action(uuid, text, jsonb, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.bootstrap_first_platform_operator(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.grant_platform_operator_assignment(uuid, text, timestamptz, timestamptz, text, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_platform_operator_assignment(uuid, text, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.request_platform_support_session(text, uuid, uuid, text[], text, text, uuid, interval)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.decide_platform_support_session(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_platform_support_session(uuid, text, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.authorize_platform_support_action(uuid, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.attest_platform_release(text, text, text, text, text, text, text, text, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_platform_user_trial(uuid, timestamptz, integer, boolean, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_platform_feature(uuid, jsonb, text, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_platform_setting(text, jsonb, text, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.resolve_platform_community_address_candidate(uuid, uuid, text, text, jsonb, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.review_platform_community_creation_request(uuid, text, text, text, jsonb, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.expire_platform_support_sessions()
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_platform_operator_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_payload_digest(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_platform_operator_grant_payload(uuid, text, timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_platform_command_approval(text, text, text, text, jsonb, text, uuid, interval) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_platform_command_approval(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_platform_action(uuid, text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_platform_operator_assignment(uuid, text, timestamptz, timestamptz, text, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_platform_operator_assignment(uuid, text, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_platform_support_session(text, uuid, uuid, text[], text, text, uuid, interval) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_platform_support_session(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_platform_support_session(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_platform_support_action(uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attest_platform_release(text, text, text, text, text, text, text, text, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_platform_user_trial(uuid, timestamptz, integer, boolean, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_platform_feature(uuid, jsonb, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_platform_setting(text, jsonb, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_platform_community_address_candidate(uuid, uuid, text, text, jsonb, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_platform_community_creation_request(uuid, text, text, text, jsonb, uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.bootstrap_first_platform_operator(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_platform_support_sessions() TO service_role;
