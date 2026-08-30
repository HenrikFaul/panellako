-- PanelLako v0.10.4 - workspace person/unit registry and membership lifecycle.
--
-- The normalized domain graph remains authoritative. People may exist without
-- an auth account, unit relationships keep their own lifecycle, and workspace
-- access is suspended/ended independently through audited commands.

BEGIN;

ALTER TABLE public.unit_ownerships
  ADD COLUMN IF NOT EXISTS ended_reason text;

ALTER TABLE public.unit_occupancies
  ADD COLUMN IF NOT EXISTS ended_reason text;

ALTER TABLE public.workspace_memberships
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_changed_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- A verified ownership is a legal/financial entitlement, so its fractional
-- share must be explicit and all verified open shares of one unit must fit
-- into one whole. Locking the parent unit serializes concurrent owner writes;
-- otherwise two transactions could each observe spare capacity and together
-- over-allocate the same unit.
CREATE OR REPLACE FUNCTION private.enforce_verified_unit_ownership_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_existing_share numeric := 0;
BEGIN
  PERFORM 1
  FROM public.units unit
  WHERE unit.workspace_id = NEW.workspace_id
    AND unit.id = NEW.unit_id
  FOR UPDATE;

  IF NEW.status <> 'VERIFIED' OR NEW.valid_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Join approval uses the established review RPC from the foundation
  -- migration. Resolve its explicitly captured fraction instead of guessing
  -- that every approved owner owns 1/1.
  IF NEW.share_numerator IS NULL AND NEW.share_denominator IS NULL
     AND NEW.source = 'JOIN_REQUEST'
     AND NEW.evidence_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT request.requested_share_numerator, request.requested_share_denominator
    INTO NEW.share_numerator, NEW.share_denominator
    FROM public.join_requests request
    WHERE request.id = NEW.evidence_reference::uuid
      AND request.workspace_id = NEW.workspace_id
      AND request.requested_unit_id = NEW.unit_id;

    IF NEW.share_numerator IS NOT NULL AND NEW.share_denominator IS NOT NULL THEN
      NEW.ownership_type := CASE
        WHEN NEW.share_numerator = NEW.share_denominator THEN 'SOLE_OWNER'
        ELSE 'CO_OWNER'
      END;
    END IF;
  END IF;

  IF NEW.share_numerator IS NULL OR NEW.share_denominator IS NULL
     OR NEW.share_numerator <= 0 OR NEW.share_denominator <= 0
     OR NEW.share_numerator > NEW.share_denominator THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Verified ownership requires an explicit valid share',
      DETAIL = '{"error_code":"OWNERSHIP_SHARE_REQUIRED"}';
  END IF;

  IF (NEW.share_numerator = NEW.share_denominator AND NEW.ownership_type <> 'SOLE_OWNER')
     OR (NEW.share_numerator < NEW.share_denominator AND NEW.ownership_type <> 'CO_OWNER') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Ownership type does not match its fractional share',
      DETAIL = '{"error_code":"OWNERSHIP_TYPE_SHARE_MISMATCH"}';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.unit_ownerships ownership
    WHERE ownership.workspace_id = NEW.workspace_id
      AND ownership.unit_id = NEW.unit_id
      AND ownership.id <> NEW.id
      AND ownership.status = 'VERIFIED'
      AND ownership.valid_to IS NULL
      AND (ownership.share_numerator IS NULL OR ownership.share_denominator IS NULL)
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514', MESSAGE = 'Existing verified ownership has no enforceable share',
      DETAIL = '{"error_code":"OWNERSHIP_SHARE_DATA_CONFLICT"}';
  END IF;

  SELECT COALESCE(
    SUM(ownership.share_numerator::numeric / ownership.share_denominator::numeric),
    0
  )
  INTO v_existing_share
  FROM public.unit_ownerships ownership
  WHERE ownership.workspace_id = NEW.workspace_id
    AND ownership.unit_id = NEW.unit_id
    AND ownership.id <> NEW.id
    AND ownership.status = 'VERIFIED'
    AND ownership.valid_to IS NULL;

  IF v_existing_share
     + (NEW.share_numerator::numeric / NEW.share_denominator::numeric) > 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514', MESSAGE = 'Verified ownership shares exceed one whole unit',
      DETAIL = '{"error_code":"OWNERSHIP_SHARE_EXCEEDED"}';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_verified_unit_ownership_share()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.enforce_verified_unit_ownership_share()
  TO service_role;

-- Earlier flows represented a verified sole owner with a NULL share. That
-- state has one deterministic meaning, so normalize it to 1/1 before the
-- invariant is installed. Unknown co-owner shares are not guessed.
UPDATE public.unit_ownerships ownership
SET share_numerator = 1,
    share_denominator = 1,
    updated_at = now()
WHERE ownership.status = 'VERIFIED'
  AND ownership.valid_to IS NULL
  AND ownership.ownership_type = 'SOLE_OWNER'
  AND ownership.share_numerator IS NULL
  AND ownership.share_denominator IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.unit_ownerships ownership
    WHERE ownership.status = 'VERIFIED'
      AND ownership.valid_to IS NULL
      AND (
        ownership.share_numerator IS NULL
        OR ownership.share_denominator IS NULL
        OR ownership.share_numerator <= 0
        OR ownership.share_denominator <= 0
        OR ownership.share_numerator > ownership.share_denominator
        OR (
          ownership.share_numerator = ownership.share_denominator
          AND ownership.ownership_type <> 'SOLE_OWNER'
        )
        OR (
          ownership.share_numerator < ownership.share_denominator
          AND ownership.ownership_type <> 'CO_OWNER'
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.unit_ownerships ownership
    WHERE ownership.status = 'VERIFIED'
      AND ownership.valid_to IS NULL
    GROUP BY ownership.workspace_id, ownership.unit_id
    HAVING SUM(
      ownership.share_numerator::numeric / ownership.share_denominator::numeric
    ) > 1
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514', MESSAGE = 'Existing verified ownership shares are inconsistent',
      DETAIL = '{"error_code":"OWNERSHIP_SHARE_DATA_CONFLICT"}';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS unit_ownerships_verified_share_guard
  ON public.unit_ownerships;
CREATE TRIGGER unit_ownerships_verified_share_guard
BEFORE INSERT OR UPDATE OF
  workspace_id, unit_id, ownership_type, share_numerator,
  share_denominator, status, valid_to
ON public.unit_ownerships
FOR EACH ROW
EXECUTE FUNCTION private.enforce_verified_unit_ownership_share();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unit_ownerships_workspace_id_id_uq'
      AND conrelid = 'public.unit_ownerships'::regclass
  ) THEN
    ALTER TABLE public.unit_ownerships
      ADD CONSTRAINT unit_ownerships_workspace_id_id_uq UNIQUE (workspace_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unit_occupancies_workspace_id_id_uq'
      AND conrelid = 'public.unit_occupancies'::regclass
  ) THEN
    ALTER TABLE public.unit_occupancies
      ADD CONSTRAINT unit_occupancies_workspace_id_id_uq UNIQUE (workspace_id, id);
  END IF;
END;
$$;

-- One receipt is persisted because an OWNER_OCCUPANT command creates two
-- domain relationships while command_idempotency_keys stores one resource id.
CREATE TABLE IF NOT EXISTS public.workspace_person_relationship_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(party_id) ON DELETE RESTRICT,
  unit_id uuid NOT NULL,
  relationship_type text NOT NULL,
  ownership_id uuid,
  occupancy_id uuid,
  request_fingerprint text NOT NULL,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_person_relationship_commands_unit_fk
    FOREIGN KEY (workspace_id, unit_id)
    REFERENCES public.units(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT workspace_person_relationship_commands_ownership_fk
    FOREIGN KEY (workspace_id, ownership_id)
    REFERENCES public.unit_ownerships(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT workspace_person_relationship_commands_occupancy_fk
    FOREIGN KEY (workspace_id, occupancy_id)
    REFERENCES public.unit_occupancies(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT workspace_person_relationship_commands_type_check CHECK (
    relationship_type IN ('OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT')
  ),
  CONSTRAINT workspace_person_relationship_commands_shape_check CHECK (
    (relationship_type = 'OWNER' AND ownership_id IS NOT NULL AND occupancy_id IS NULL)
    OR (relationship_type = 'OWNER_OCCUPANT' AND ownership_id IS NOT NULL AND occupancy_id IS NOT NULL)
    OR (
      relationship_type IN ('TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT')
      AND ownership_id IS NULL
      AND occupancy_id IS NOT NULL
    )
  ),
  CONSTRAINT workspace_person_relationship_commands_fingerprint_check CHECK (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT workspace_person_relationship_commands_actor_idempotency_uq
    UNIQUE (created_by_profile_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS workspace_person_relationship_commands_scope_idx
  ON public.workspace_person_relationship_commands (workspace_id, person_id, unit_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.unit_relationship_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  relationship_kind text NOT NULL,
  ownership_id uuid,
  occupancy_id uuid,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  reason text,
  evidence_reference text,
  request_fingerprint text NOT NULL,
  changed_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_relationship_status_events_ownership_fk
    FOREIGN KEY (workspace_id, ownership_id)
    REFERENCES public.unit_ownerships(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT unit_relationship_status_events_occupancy_fk
    FOREIGN KEY (workspace_id, occupancy_id)
    REFERENCES public.unit_occupancies(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT unit_relationship_status_events_kind_check CHECK (
    relationship_kind IN ('OWNERSHIP', 'OCCUPANCY')
  ),
  CONSTRAINT unit_relationship_status_events_shape_check CHECK (
    (relationship_kind = 'OWNERSHIP' AND ownership_id IS NOT NULL AND occupancy_id IS NULL)
    OR (relationship_kind = 'OCCUPANCY' AND ownership_id IS NULL AND occupancy_id IS NOT NULL)
  ),
  CONSTRAINT unit_relationship_status_events_state_check CHECK (
    previous_status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED', 'DISPUTED')
    AND new_status IN ('VERIFIED', 'DISPUTED', 'ENDED')
  ),
  CONSTRAINT unit_relationship_status_events_reason_check CHECK (
    reason IS NULL OR CHAR_LENGTH(reason) BETWEEN 3 AND 1000
  ),
  CONSTRAINT unit_relationship_status_events_fingerprint_check CHECK (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT unit_relationship_status_events_actor_idempotency_uq
    UNIQUE (changed_by_profile_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS unit_relationship_status_events_scope_idx
  ON public.unit_relationship_status_events (workspace_id, created_at DESC, id);

CREATE TABLE IF NOT EXISTS public.workspace_membership_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  reason text NOT NULL,
  request_fingerprint text NOT NULL,
  changed_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_membership_status_events_membership_fk
    FOREIGN KEY (workspace_id, membership_id)
    REFERENCES public.workspace_memberships(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT workspace_membership_status_events_previous_check CHECK (
    previous_status IN ('PENDING', 'ACTIVE', 'SUSPENDED')
  ),
  CONSTRAINT workspace_membership_status_events_new_check CHECK (
    new_status IN ('ACTIVE', 'SUSPENDED', 'ENDED')
  ),
  CONSTRAINT workspace_membership_status_events_reason_check CHECK (
    CHAR_LENGTH(reason) BETWEEN 3 AND 1000
  ),
  CONSTRAINT workspace_membership_status_events_fingerprint_check CHECK (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT workspace_membership_status_events_actor_idempotency_uq
    UNIQUE (changed_by_profile_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS workspace_membership_status_events_scope_idx
  ON public.workspace_membership_status_events (workspace_id, membership_id, created_at DESC);

-- Relationship administration may be explicitly delegated. The delegation's
-- own capability_keys array still provides the upper bound, so adding these
-- role capabilities does not amplify an existing delegate silently.
INSERT INTO public.role_capabilities (
  role_key, capability_key, risk_level, reauthentication_window
)
VALUES
  ('DELEGATE_OPERATIONS', 'UNIT_RELATION_VERIFY', 'HIGH', interval '15 minutes'),
  ('DELEGATE_OPERATIONS', 'MEMBERSHIP_SUSPEND', 'HIGH', interval '15 minutes')
ON CONFLICT (role_key, capability_key) DO UPDATE
SET risk_level = EXCLUDED.risk_level,
    reauthentication_window = EXCLUDED.reauthentication_window;

ALTER TABLE public.workspace_person_relationship_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_person_relationship_commands FORCE ROW LEVEL SECURITY;
ALTER TABLE public.unit_relationship_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_relationship_status_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_membership_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_membership_status_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unit_relationship_status_events_scoped_select
  ON public.unit_relationship_status_events;
CREATE POLICY unit_relationship_status_events_scoped_select
  ON public.unit_relationship_status_events
  FOR SELECT TO authenticated
  USING (
    private.has_workspace_capability(auth.uid(), workspace_id, 'UNIT_RELATION_VERIFY')
  );

DROP POLICY IF EXISTS workspace_membership_status_events_scoped_select
  ON public.workspace_membership_status_events;
CREATE POLICY workspace_membership_status_events_scoped_select
  ON public.workspace_membership_status_events
  FOR SELECT TO authenticated
  USING (
    private.has_workspace_capability(auth.uid(), workspace_id, 'MEMBERSHIP_SUSPEND')
    OR private.has_workspace_capability(auth.uid(), workspace_id, 'AUDIT_READ')
  );

-- Receipts are implementation details and have no authenticated policy. Event
-- histories are readable in-scope but remain command-only for writes.
REVOKE ALL ON TABLE public.workspace_person_relationship_commands
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.unit_relationship_status_events
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.workspace_membership_status_events
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.unit_relationship_status_events TO authenticated;
GRANT SELECT ON TABLE public.workspace_membership_status_events TO authenticated;
GRANT SELECT ON TABLE public.workspace_person_relationship_commands TO service_role;
GRANT SELECT ON TABLE public.unit_relationship_status_events TO service_role;
GRANT SELECT ON TABLE public.workspace_membership_status_events TO service_role;

CREATE OR REPLACE FUNCTION private.reject_workspace_registry_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001', MESSAGE = 'Workspace registry history is immutable',
    DETAIL = '{"error_code":"WORKSPACE_REGISTRY_HISTORY_IMMUTABLE"}';
END;
$$;

REVOKE ALL ON FUNCTION private.reject_workspace_registry_history_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reject_workspace_registry_history_mutation()
  TO service_role;

DROP TRIGGER IF EXISTS trg_workspace_person_relationship_commands_immutable
  ON public.workspace_person_relationship_commands;
CREATE TRIGGER trg_workspace_person_relationship_commands_immutable
BEFORE UPDATE OR DELETE ON public.workspace_person_relationship_commands
FOR EACH ROW EXECUTE FUNCTION private.reject_workspace_registry_history_mutation();

DROP TRIGGER IF EXISTS trg_unit_relationship_status_events_immutable
  ON public.unit_relationship_status_events;
CREATE TRIGGER trg_unit_relationship_status_events_immutable
BEFORE UPDATE OR DELETE ON public.unit_relationship_status_events
FOR EACH ROW EXECUTE FUNCTION private.reject_workspace_registry_history_mutation();

DROP TRIGGER IF EXISTS trg_workspace_membership_status_events_immutable
  ON public.workspace_membership_status_events;
CREATE TRIGGER trg_workspace_membership_status_events_immutable
BEFORE UPDATE OR DELETE ON public.workspace_membership_status_events
FOR EACH ROW EXECUTE FUNCTION private.reject_workspace_registry_history_mutation();

CREATE OR REPLACE FUNCTION private.reconcile_legacy_person_relationships(
  p_workspace_id uuid,
  p_person_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_profile_id uuid;
  v_owner_unit_id uuid;
  v_occupancy_unit_id uuid;
BEGIN
  FOR v_profile_id IN
    SELECT pal.profile_id
    FROM public.person_account_links pal
    WHERE pal.person_id = p_person_id
      AND pal.status = 'ACTIVE'
      AND pal.valid_from <= now()
      AND pal.valid_to IS NULL
  LOOP
    IF NOT private.has_active_workspace_membership(v_profile_id, p_workspace_id) THEN
      UPDATE public.memberships legacy
      SET active = false
      WHERE legacy.profile_id = v_profile_id
        AND legacy.building_id = p_workspace_id
        AND legacy.role IN ('lako', 'tulajdonos')
        AND legacy.active;
      CONTINUE;
    END IF;

    SELECT uo.unit_id INTO v_owner_unit_id
    FROM public.unit_ownerships uo
    WHERE uo.workspace_id = p_workspace_id
      AND uo.party_id = p_person_id
      AND uo.status = 'VERIFIED'
      AND uo.valid_from <= now()
      AND uo.valid_to IS NULL
    ORDER BY uo.valid_from, uo.id
    LIMIT 1;

    IF v_owner_unit_id IS NULL THEN
      UPDATE public.memberships legacy
      SET active = false
      WHERE legacy.profile_id = v_profile_id
        AND legacy.building_id = p_workspace_id
        AND legacy.role = 'tulajdonos'
        AND legacy.active;
    ELSE
      PERFORM private.upsert_legacy_membership_projection(
        p_workspace_id, v_profile_id, v_owner_unit_id, 'tulajdonos', true
      );
    END IF;

    SELECT uoc.unit_id INTO v_occupancy_unit_id
    FROM public.unit_occupancies uoc
    WHERE uoc.workspace_id = p_workspace_id
      AND uoc.person_id = p_person_id
      AND uoc.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
      AND uoc.valid_from <= now()
      AND uoc.valid_to IS NULL
    ORDER BY uoc.valid_from, uoc.id
    LIMIT 1;

    IF v_occupancy_unit_id IS NULL THEN
      UPDATE public.memberships legacy
      SET active = false
      WHERE legacy.profile_id = v_profile_id
        AND legacy.building_id = p_workspace_id
        AND legacy.role = 'lako'
        AND legacy.active;
    ELSE
      PERFORM private.upsert_legacy_membership_projection(
        p_workspace_id, v_profile_id, v_occupancy_unit_id, 'lako', true
      );
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.reconcile_legacy_person_relationships(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reconcile_legacy_person_relationships(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.create_workspace_person_relationship(
  p_workspace_id uuid,
  p_person_id uuid,
  p_display_name text,
  p_unit_id uuid,
  p_relationship_type text,
  p_share_numerator bigint,
  p_share_denominator bigint,
  p_evidence_reference text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  person_id uuid,
  ownership_id uuid,
  occupancy_id uuid,
  relationship_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_receipt public.workspace_person_relationship_commands%ROWTYPE;
  v_person_id uuid := p_person_id;
  v_display_name text := NULLIF(BTRIM(p_display_name), '');
  v_relationship_type text := UPPER(BTRIM(COALESCE(p_relationship_type, '')));
  v_evidence_reference text := NULLIF(BTRIM(p_evidence_reference), '');
  v_share_numerator bigint := p_share_numerator;
  v_share_denominator bigint := p_share_denominator;
  v_ownership_id uuid;
  v_occupancy_id uuid;
  v_command_id uuid := gen_random_uuid();
  v_request_fingerprint text;
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'UNIT_RELATION_VERIFY');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  IF p_unit_id IS NULL OR p_idempotency_key IS NULL
     OR v_relationship_type NOT IN (
       'OWNER', 'OWNER_OCCUPANT', 'TENANT', 'HOUSEHOLD_MEMBER', 'AUTHORIZED_OCCUPANT'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Person relationship input is invalid',
      DETAIL = '{"error_code":"PERSON_RELATIONSHIP_INPUT_INVALID"}';
  END IF;

  IF v_evidence_reference IS NULL
     OR v_evidence_reference !~ '^[a-z][a-z0-9_-]{1,39}:[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Opaque relationship evidence reference is required',
      DETAIL = '{"error_code":"RELATIONSHIP_EVIDENCE_REQUIRED"}';
  END IF;

  IF v_relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
    IF v_share_numerator IS NULL OR v_share_denominator IS NULL
       OR v_share_numerator <= 0 OR v_share_denominator <= 0
       OR v_share_numerator > v_share_denominator THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'An explicit ownership share is required',
        DETAIL = '{"error_code":"OWNERSHIP_SHARE_REQUIRED"}';
    END IF;
  ELSIF v_share_numerator IS NOT NULL OR v_share_denominator IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Occupancy cannot carry an ownership share',
      DETAIL = '{"error_code":"OCCUPANCY_SHARE_FORBIDDEN"}';
  END IF;

  IF p_person_id IS NULL
     AND (v_display_name IS NULL OR CHAR_LENGTH(v_display_name) NOT BETWEEN 2 AND 160) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'A display name is required for a new person',
      DETAIL = '{"error_code":"PERSON_DISPLAY_NAME_INVALID"}';
  END IF;

  PERFORM 1
  FROM public.units u
  JOIN public.workspaces w ON w.id = u.workspace_id
  WHERE u.id = p_unit_id
    AND u.workspace_id = p_workspace_id
    AND u.status = 'ACTIVE'
    AND w.status = 'ACTIVE'
  FOR SHARE OF u;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Unit is not active in the workspace',
      DETAIL = '{"error_code":"UNIT_SCOPE_MISMATCH"}';
  END IF;

  v_request_fingerprint := encode(
    digest(
      concat_ws(
        '|',
        p_workspace_id::text,
        COALESCE(p_person_id::text, '<new>'),
        COALESCE(v_display_name, ''),
        p_unit_id::text,
        v_relationship_type,
        COALESCE(v_share_numerator::text, ''),
        COALESCE(v_share_denominator::text, ''),
        v_evidence_reference
      ),
      'sha256'
    ),
    'hex'
  );

  v_existing := private.lock_idempotent_command(
    v_actor, 'create_workspace_person_relationship', p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_receipt
    FROM public.workspace_person_relationship_commands receipt
    WHERE receipt.id = v_existing
      AND receipt.created_by_profile_id = v_actor;

    IF v_receipt.id IS NULL OR v_receipt.request_fingerprint <> v_request_fingerprint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Idempotency key payload mismatch',
        DETAIL = '{"error_code":"IDEMPOTENCY_PAYLOAD_MISMATCH"}';
    END IF;

    RETURN QUERY
    SELECT v_receipt.person_id, v_receipt.ownership_id, v_receipt.occupancy_id, 'VERIFIED'::text;
    RETURN;
  END IF;

  IF p_person_id IS NULL THEN
    v_person_id := gen_random_uuid();
    INSERT INTO public.parties (
      id, party_type, display_name, status, created_at, updated_at
    ) VALUES (
      v_person_id, 'PERSON', v_display_name, 'ACTIVE', now(), now()
    );
    INSERT INTO public.people (party_id, preferred_name, created_at)
    VALUES (v_person_id, v_display_name, now());
  ELSE
    SELECT people.party_id INTO v_person_id
    FROM public.people people
    JOIN public.parties party ON party.id = people.party_id
    WHERE people.party_id = p_person_id
      AND party.party_type = 'PERSON'
      AND party.status = 'ACTIVE'
      AND (
        EXISTS (
          SELECT 1 FROM public.unit_ownerships existing_owner
          WHERE existing_owner.workspace_id = p_workspace_id
            AND existing_owner.party_id = people.party_id
        )
        OR EXISTS (
          SELECT 1 FROM public.unit_occupancies existing_occupant
          WHERE existing_occupant.workspace_id = p_workspace_id
            AND existing_occupant.person_id = people.party_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.person_account_links account_link
          JOIN public.workspace_memberships membership
            ON membership.profile_id = account_link.profile_id
           AND membership.workspace_id = p_workspace_id
           AND membership.status = 'ACTIVE'
          JOIN public.membership_periods period
            ON period.workspace_id = membership.workspace_id
           AND period.membership_id = membership.id
           AND period.ended_at IS NULL
          WHERE account_link.person_id = people.party_id
            AND account_link.status = 'ACTIVE'
            AND account_link.valid_to IS NULL
        )
      )
    FOR SHARE OF people, party;

    IF v_person_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Person is outside the workspace registry',
        DETAIL = '{"error_code":"PERSON_SCOPE_MISMATCH"}';
    END IF;
  END IF;

  IF v_relationship_type IN ('OWNER', 'OWNER_OCCUPANT') AND EXISTS (
    SELECT 1 FROM public.unit_ownerships existing_owner
    WHERE existing_owner.workspace_id = p_workspace_id
      AND existing_owner.unit_id = p_unit_id
      AND existing_owner.party_id = v_person_id
      AND existing_owner.status <> 'ENDED'
      AND existing_owner.valid_to IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505', MESSAGE = 'An active ownership relationship already exists',
      DETAIL = '{"error_code":"OWNERSHIP_RELATIONSHIP_ALREADY_EXISTS"}';
  END IF;

  IF v_relationship_type <> 'OWNER' AND EXISTS (
    SELECT 1 FROM public.unit_occupancies existing_occupant
    WHERE existing_occupant.workspace_id = p_workspace_id
      AND existing_occupant.unit_id = p_unit_id
      AND existing_occupant.person_id = v_person_id
      AND existing_occupant.status <> 'ENDED'
      AND existing_occupant.valid_to IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505', MESSAGE = 'An active occupancy relationship already exists',
      DETAIL = '{"error_code":"OCCUPANCY_RELATIONSHIP_ALREADY_EXISTS"}';
  END IF;

  IF v_relationship_type IN ('OWNER', 'OWNER_OCCUPANT') THEN
    v_ownership_id := gen_random_uuid();
    INSERT INTO public.unit_ownerships (
      id, workspace_id, unit_id, party_id, ownership_type,
      share_numerator, share_denominator, valid_from, status,
      verification_method, verified_at, verified_by_profile_id,
      evidence_reference, source, created_at, updated_at
    ) VALUES (
      v_ownership_id, p_workspace_id, p_unit_id, v_person_id,
      CASE WHEN v_share_numerator = v_share_denominator THEN 'SOLE_OWNER' ELSE 'CO_OWNER' END,
      v_share_numerator, v_share_denominator, now(), 'VERIFIED',
      'WORKSPACE_ADMIN_REVIEW', now(), v_actor,
      v_evidence_reference, 'ADMIN', now(), now()
    );
  END IF;

  IF v_relationship_type <> 'OWNER' THEN
    v_occupancy_id := gen_random_uuid();
    INSERT INTO public.unit_occupancies (
      id, workspace_id, unit_id, person_id, occupancy_type,
      valid_from, status, is_primary_contact, verification_method,
      verified_at, verified_by_profile_id, evidence_reference,
      source, created_at, updated_at
    ) VALUES (
      v_occupancy_id, p_workspace_id, p_unit_id, v_person_id,
      v_relationship_type, now(), 'VERIFIED', false,
      'WORKSPACE_ADMIN_REVIEW', now(), v_actor, v_evidence_reference,
      'ADMIN', now(), now()
    );
  END IF;

  INSERT INTO public.workspace_person_relationship_commands (
    id, workspace_id, person_id, unit_id, relationship_type,
    ownership_id, occupancy_id, request_fingerprint,
    created_by_profile_id, idempotency_key
  ) VALUES (
    v_command_id, p_workspace_id, v_person_id, p_unit_id, v_relationship_type,
    v_ownership_id, v_occupancy_id, v_request_fingerprint,
    v_actor, p_idempotency_key
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'create_workspace_person_relationship', p_idempotency_key, v_command_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id,
    'WORKSPACE_PERSON_RELATIONSHIP_CREATED',
    'person',
    v_person_id,
    'STATE_CHANGE',
    v_relationship_type,
    jsonb_build_object(
      'unit_id', p_unit_id,
      'ownership_id', v_ownership_id,
      'occupancy_id', v_occupancy_id,
      'command_id', v_command_id
    )
  );
  PERFORM private.reconcile_legacy_person_relationships(p_workspace_id, v_person_id);

  RETURN QUERY
  SELECT v_person_id, v_ownership_id, v_occupancy_id, 'VERIFIED'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace_person_relationship(
  uuid, uuid, text, uuid, text, bigint, bigint, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_workspace_person_relationship(
  uuid, uuid, text, uuid, text, bigint, bigint, text, uuid
) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_workspace_unit_relationships(
  p_workspace_id uuid
)
RETURNS TABLE (
  relationship_kind text,
  relationship_id uuid,
  subject_party_id uuid,
  person_id uuid,
  profile_id uuid,
  display_name text,
  unit_id uuid,
  unit_designation text,
  relationship_type text,
  relationship_status text,
  share_numerator bigint,
  share_denominator bigint,
  verified_at timestamptz,
  evidence_reference text,
  source text,
  valid_from timestamptz,
  valid_to timestamptz,
  ended_reason text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_can_verify boolean := private.has_workspace_capability(
    auth.uid(), p_workspace_id, 'UNIT_RELATION_VERIFY'
  );
BEGIN
  IF NOT v_can_verify THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Workspace relationship directory access denied',
      DETAIL = '{"error_code":"WORKSPACE_CAPABILITY_REQUIRED","required":"unit_relation.verify"}';
  END IF;

  RETURN QUERY
  WITH relationships AS (
    SELECT
      'OWNERSHIP'::text AS kind,
      ownership.id AS rel_id,
      ownership.party_id AS subject_id,
      person.party_id AS person_subject_id,
      account.profile_id AS linked_profile_id,
      party.display_name AS subject_name,
      ownership.unit_id AS related_unit_id,
      unit.designation AS related_unit_designation,
      ownership.ownership_type AS rel_type,
      ownership.status AS rel_status,
      ownership.share_numerator AS rel_share_numerator,
      ownership.share_denominator AS rel_share_denominator,
      ownership.verified_at AS rel_verified_at,
      CASE WHEN v_can_verify THEN ownership.evidence_reference ELSE NULL END AS rel_evidence_reference,
      ownership.source AS rel_source,
      ownership.valid_from AS rel_valid_from,
      ownership.valid_to AS rel_valid_to,
      CASE WHEN v_can_verify THEN ownership.ended_reason ELSE NULL END AS rel_ended_reason,
      ownership.created_at AS rel_created_at
    FROM public.unit_ownerships ownership
    JOIN public.parties party ON party.id = ownership.party_id
    LEFT JOIN public.people person ON person.party_id = ownership.party_id
    JOIN public.units unit
      ON unit.workspace_id = ownership.workspace_id
     AND unit.id = ownership.unit_id
    LEFT JOIN LATERAL (
      SELECT link.profile_id
      FROM public.person_account_links link
      WHERE link.person_id = person.party_id
        AND link.status = 'ACTIVE'
        AND link.valid_from <= now()
        AND link.valid_to IS NULL
      ORDER BY link.valid_from DESC, link.id
      LIMIT 1
    ) account ON true
    WHERE ownership.workspace_id = p_workspace_id
      AND (
        v_can_verify
        OR (
          ownership.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
          AND ownership.valid_to IS NULL
        )
      )

    UNION ALL

    SELECT
      'OCCUPANCY'::text,
      occupancy.id,
      occupancy.person_id,
      occupancy.person_id,
      account.profile_id,
      party.display_name,
      occupancy.unit_id,
      unit.designation,
      occupancy.occupancy_type,
      occupancy.status,
      NULL::bigint,
      NULL::bigint,
      occupancy.verified_at,
      CASE WHEN v_can_verify THEN occupancy.evidence_reference ELSE NULL END,
      occupancy.source,
      occupancy.valid_from,
      occupancy.valid_to,
      CASE WHEN v_can_verify THEN occupancy.ended_reason ELSE NULL END,
      occupancy.created_at
    FROM public.unit_occupancies occupancy
    JOIN public.people person ON person.party_id = occupancy.person_id
    JOIN public.parties party ON party.id = person.party_id
    JOIN public.units unit
      ON unit.workspace_id = occupancy.workspace_id
     AND unit.id = occupancy.unit_id
    LEFT JOIN LATERAL (
      SELECT link.profile_id
      FROM public.person_account_links link
      WHERE link.person_id = person.party_id
        AND link.status = 'ACTIVE'
        AND link.valid_from <= now()
        AND link.valid_to IS NULL
      ORDER BY link.valid_from DESC, link.id
      LIMIT 1
    ) account ON true
    WHERE occupancy.workspace_id = p_workspace_id
      AND (
        v_can_verify
        OR (
          occupancy.status IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')
          AND occupancy.valid_to IS NULL
        )
      )
  )
  SELECT
    relationships.kind,
    relationships.rel_id,
    relationships.subject_id,
    relationships.person_subject_id,
    relationships.linked_profile_id,
    relationships.subject_name,
    relationships.related_unit_id,
    relationships.related_unit_designation,
    relationships.rel_type,
    relationships.rel_status,
    relationships.rel_share_numerator,
    relationships.rel_share_denominator,
    relationships.rel_verified_at,
    relationships.rel_evidence_reference,
    relationships.rel_source,
    relationships.rel_valid_from,
    relationships.rel_valid_to,
    relationships.rel_ended_reason,
    relationships.rel_created_at
  FROM relationships
  ORDER BY
    relationships.subject_name,
    relationships.related_unit_designation,
    relationships.kind,
    relationships.rel_created_at,
    relationships.rel_id
  LIMIT 2000;
END;
$$;

REVOKE ALL ON FUNCTION public.list_workspace_unit_relationships(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_workspace_unit_relationships(uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.review_workspace_unit_relationship(
  p_workspace_id uuid,
  p_relationship_kind text,
  p_relationship_id uuid,
  p_decision text,
  p_reason text,
  p_evidence_reference text,
  p_share_numerator bigint,
  p_share_denominator bigint,
  p_idempotency_key uuid
)
RETURNS TABLE (
  relationship_id uuid,
  relationship_kind text,
  relationship_status text,
  valid_to timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_kind text := UPPER(BTRIM(COALESCE(p_relationship_kind, '')));
  v_decision text := UPPER(BTRIM(COALESCE(p_decision, '')));
  v_reason text := NULLIF(BTRIM(p_reason), '');
  v_evidence_reference text := NULLIF(BTRIM(p_evidence_reference), '');
  v_existing uuid;
  v_event public.unit_relationship_status_events%ROWTYPE;
  v_event_id uuid := gen_random_uuid();
  v_previous_status text;
  v_new_status text;
  v_existing_evidence_reference text;
  v_existing_share_numerator bigint;
  v_existing_share_denominator bigint;
  v_effective_share_numerator bigint;
  v_effective_share_denominator bigint;
  v_subject_person_id uuid;
  v_current_valid_from timestamptz;
  v_result_valid_to timestamptz;
  v_changed_at timestamptz := clock_timestamp();
  v_request_fingerprint text;
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'UNIT_RELATION_VERIFY');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  IF p_relationship_id IS NULL OR p_idempotency_key IS NULL
     OR v_kind NOT IN ('OWNERSHIP', 'OCCUPANCY')
     OR v_decision NOT IN ('VERIFY', 'DISPUTE', 'END') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Relationship review input is invalid',
      DETAIL = '{"error_code":"RELATIONSHIP_REVIEW_INPUT_INVALID"}';
  END IF;

  IF v_reason IS NOT NULL AND CHAR_LENGTH(v_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Relationship review reason is invalid',
      DETAIL = '{"error_code":"RELATIONSHIP_REVIEW_REASON_INVALID"}';
  END IF;
  IF v_decision IN ('DISPUTE', 'END') AND v_reason IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'A reason is required for this relationship decision',
      DETAIL = '{"error_code":"RELATIONSHIP_REVIEW_REASON_REQUIRED"}';
  END IF;
  IF v_evidence_reference IS NOT NULL
     AND v_evidence_reference !~ '^[a-z][a-z0-9_-]{1,39}:[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Relationship evidence reference is invalid',
      DETAIL = '{"error_code":"RELATIONSHIP_EVIDENCE_INVALID"}';
  END IF;

  v_request_fingerprint := encode(
    digest(
      concat_ws(
        '|', p_workspace_id::text, v_kind, p_relationship_id::text,
        v_decision, COALESCE(v_reason, ''), COALESCE(v_evidence_reference, ''),
        COALESCE(p_share_numerator::text, ''), COALESCE(p_share_denominator::text, '')
      ),
      'sha256'
    ),
    'hex'
  );

  v_existing := private.lock_idempotent_command(
    v_actor, 'review_workspace_unit_relationship', p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_event
    FROM public.unit_relationship_status_events event
    WHERE event.id = v_existing
      AND event.changed_by_profile_id = v_actor;

    IF v_event.id IS NULL OR v_event.request_fingerprint <> v_request_fingerprint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Idempotency key payload mismatch',
        DETAIL = '{"error_code":"IDEMPOTENCY_PAYLOAD_MISMATCH"}';
    END IF;

    RETURN QUERY
    SELECT
      COALESCE(v_event.ownership_id, v_event.occupancy_id),
      v_event.relationship_kind,
      v_event.new_status,
      CASE v_event.relationship_kind
        WHEN 'OWNERSHIP' THEN (
          SELECT ownership.valid_to FROM public.unit_ownerships ownership
          WHERE ownership.id = v_event.ownership_id
            AND ownership.workspace_id = v_event.workspace_id
        )
        ELSE (
          SELECT occupancy.valid_to FROM public.unit_occupancies occupancy
          WHERE occupancy.id = v_event.occupancy_id
            AND occupancy.workspace_id = v_event.workspace_id
        )
      END;
    RETURN;
  END IF;

  IF v_kind = 'OWNERSHIP' THEN
    SELECT
      ownership.status,
      ownership.evidence_reference,
      ownership.share_numerator,
      ownership.share_denominator,
      person.party_id,
      ownership.valid_from,
      ownership.valid_to
    INTO
      v_previous_status,
      v_existing_evidence_reference,
      v_existing_share_numerator,
      v_existing_share_denominator,
      v_subject_person_id,
      v_current_valid_from,
      v_result_valid_to
    FROM public.unit_ownerships ownership
    LEFT JOIN public.people person ON person.party_id = ownership.party_id
    WHERE ownership.id = p_relationship_id
      AND ownership.workspace_id = p_workspace_id
    FOR UPDATE OF ownership;
  ELSE
    SELECT
      occupancy.status,
      occupancy.evidence_reference,
      occupancy.person_id,
      occupancy.valid_from,
      occupancy.valid_to
    INTO
      v_previous_status,
      v_existing_evidence_reference,
      v_subject_person_id,
      v_current_valid_from,
      v_result_valid_to
    FROM public.unit_occupancies occupancy
    WHERE occupancy.id = p_relationship_id
      AND occupancy.workspace_id = p_workspace_id
    FOR UPDATE OF occupancy;
  END IF;

  IF v_previous_status IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Relationship was not found in the workspace',
      DETAIL = '{"error_code":"RELATIONSHIP_NOT_FOUND"}';
  END IF;
  IF v_previous_status = 'ENDED' OR v_result_valid_to IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Relationship is already ended',
      DETAIL = '{"error_code":"RELATIONSHIP_ALREADY_ENDED"}';
  END IF;

  IF v_decision = 'VERIFY' THEN
    IF v_previous_status NOT IN ('CLAIMED', 'PENDING_VERIFICATION', 'DISPUTED') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Relationship cannot be verified from its current state',
        DETAIL = '{"error_code":"RELATIONSHIP_NOT_REVIEWABLE"}';
    END IF;
    v_evidence_reference := COALESCE(v_evidence_reference, v_existing_evidence_reference);
    IF v_evidence_reference IS NULL
       OR v_evidence_reference !~ '^[a-z][a-z0-9_-]{1,39}:[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$' THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Evidence is required to verify a relationship',
        DETAIL = '{"error_code":"RELATIONSHIP_EVIDENCE_REQUIRED"}';
    END IF;
    v_new_status := 'VERIFIED';
  ELSIF v_decision = 'DISPUTE' THEN
    IF v_previous_status NOT IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Relationship cannot be disputed from its current state',
        DETAIL = '{"error_code":"RELATIONSHIP_NOT_REVIEWABLE"}';
    END IF;
    v_evidence_reference := COALESCE(v_evidence_reference, v_existing_evidence_reference);
    v_new_status := 'DISPUTED';
  ELSE
    v_new_status := 'ENDED';
    v_result_valid_to := GREATEST(
      v_changed_at,
      v_current_valid_from + interval '1 microsecond'
    );
  END IF;

  IF v_kind = 'OWNERSHIP' AND v_decision = 'VERIFY' THEN
    IF (p_share_numerator IS NULL) <> (p_share_denominator IS NULL) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Ownership share must be supplied as a complete fraction',
        DETAIL = '{"error_code":"OWNERSHIP_SHARE_REQUIRED"}';
    END IF;
    v_effective_share_numerator := COALESCE(p_share_numerator, v_existing_share_numerator);
    v_effective_share_denominator := COALESCE(p_share_denominator, v_existing_share_denominator);
    IF v_effective_share_numerator IS NULL OR v_effective_share_denominator IS NULL
       OR v_effective_share_numerator <= 0 OR v_effective_share_denominator <= 0
       OR v_effective_share_numerator > v_effective_share_denominator THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'An explicit ownership share is required for verification',
        DETAIL = '{"error_code":"OWNERSHIP_SHARE_REQUIRED"}';
    END IF;
  ELSIF p_share_numerator IS NOT NULL OR p_share_denominator IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Ownership share is only accepted when verifying ownership',
      DETAIL = '{"error_code":"OWNERSHIP_SHARE_NOT_APPLICABLE"}';
  END IF;

  IF v_kind = 'OWNERSHIP' THEN
    UPDATE public.unit_ownerships ownership
    SET status = v_new_status,
        ownership_type = CASE
          WHEN v_new_status = 'VERIFIED' AND v_effective_share_numerator = v_effective_share_denominator
            THEN 'SOLE_OWNER'
          WHEN v_new_status = 'VERIFIED' THEN 'CO_OWNER'
          ELSE ownership.ownership_type
        END,
        share_numerator = CASE
          WHEN v_new_status = 'VERIFIED' THEN v_effective_share_numerator
          ELSE ownership.share_numerator
        END,
        share_denominator = CASE
          WHEN v_new_status = 'VERIFIED' THEN v_effective_share_denominator
          ELSE ownership.share_denominator
        END,
        valid_to = CASE WHEN v_new_status = 'ENDED' THEN v_result_valid_to ELSE NULL END,
        ended_reason = CASE WHEN v_new_status = 'ENDED' THEN v_reason ELSE NULL END,
        verification_method = CASE
          WHEN v_new_status = 'VERIFIED' THEN 'WORKSPACE_ADMIN_REVIEW'
          ELSE ownership.verification_method
        END,
        verified_at = CASE WHEN v_new_status = 'VERIFIED' THEN v_changed_at ELSE ownership.verified_at END,
        verified_by_profile_id = CASE WHEN v_new_status = 'VERIFIED' THEN v_actor ELSE ownership.verified_by_profile_id END,
        evidence_reference = COALESCE(v_evidence_reference, ownership.evidence_reference),
        updated_at = v_changed_at
    WHERE ownership.id = p_relationship_id
      AND ownership.workspace_id = p_workspace_id;
  ELSE
    UPDATE public.unit_occupancies occupancy
    SET status = v_new_status,
        valid_to = CASE WHEN v_new_status = 'ENDED' THEN v_result_valid_to ELSE NULL END,
        ended_reason = CASE WHEN v_new_status = 'ENDED' THEN v_reason ELSE NULL END,
        verification_method = CASE
          WHEN v_new_status = 'VERIFIED' THEN 'WORKSPACE_ADMIN_REVIEW'
          ELSE occupancy.verification_method
        END,
        verified_at = CASE WHEN v_new_status = 'VERIFIED' THEN v_changed_at ELSE occupancy.verified_at END,
        verified_by_profile_id = CASE WHEN v_new_status = 'VERIFIED' THEN v_actor ELSE occupancy.verified_by_profile_id END,
        evidence_reference = COALESCE(v_evidence_reference, occupancy.evidence_reference),
        updated_at = v_changed_at
    WHERE occupancy.id = p_relationship_id
      AND occupancy.workspace_id = p_workspace_id;
  END IF;

  INSERT INTO public.unit_relationship_status_events (
    id, workspace_id, relationship_kind, ownership_id, occupancy_id,
    previous_status, new_status, reason, evidence_reference,
    request_fingerprint, changed_by_profile_id, idempotency_key, created_at
  ) VALUES (
    v_event_id, p_workspace_id, v_kind,
    CASE WHEN v_kind = 'OWNERSHIP' THEN p_relationship_id ELSE NULL END,
    CASE WHEN v_kind = 'OCCUPANCY' THEN p_relationship_id ELSE NULL END,
    v_previous_status, v_new_status, v_reason, v_evidence_reference,
    v_request_fingerprint, v_actor, p_idempotency_key, v_changed_at
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'review_workspace_unit_relationship', p_idempotency_key, v_event_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id,
    'WORKSPACE_UNIT_RELATIONSHIP_REVIEWED',
    lower(v_kind),
    p_relationship_id,
    'STATE_CHANGE',
    v_decision,
    jsonb_build_object(
      'event_id', v_event_id,
      'previous_status', v_previous_status,
      'new_status', v_new_status
    )
  );

  IF v_subject_person_id IS NOT NULL THEN
    PERFORM private.reconcile_legacy_person_relationships(
      p_workspace_id, v_subject_person_id
    );
  END IF;

  RETURN QUERY
  SELECT p_relationship_id, v_kind, v_new_status, v_result_valid_to;
END;
$$;

REVOKE ALL ON FUNCTION public.review_workspace_unit_relationship(
  uuid, text, uuid, text, text, text, bigint, bigint, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_workspace_unit_relationship(
  uuid, text, uuid, text, text, text, bigint, bigint, uuid
) TO authenticated;

CREATE OR REPLACE FUNCTION public.change_workspace_membership_status(
  p_workspace_id uuid,
  p_membership_id uuid,
  p_target_status text,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS TABLE (
  membership_id uuid,
  membership_status text,
  changed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target_status text := UPPER(BTRIM(COALESCE(p_target_status, '')));
  v_reason text := NULLIF(BTRIM(p_reason), '');
  v_existing uuid;
  v_event public.workspace_membership_status_events%ROWTYPE;
  v_event_id uuid := gen_random_uuid();
  v_membership public.workspace_memberships%ROWTYPE;
  v_changed_at timestamptz := clock_timestamp();
  v_target_is_admin boolean := false;
  v_person_id uuid;
  v_role_key text;
  v_request_fingerprint text;
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'MEMBERSHIP_SUSPEND');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  IF p_membership_id IS NULL OR p_idempotency_key IS NULL
     OR v_target_status NOT IN ('ACTIVE', 'SUSPENDED', 'ENDED')
     OR v_reason IS NULL OR CHAR_LENGTH(v_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Membership status input is invalid',
      DETAIL = '{"error_code":"MEMBERSHIP_STATUS_INPUT_INVALID"}';
  END IF;

  v_request_fingerprint := encode(
    digest(
      concat_ws(
        '|', p_workspace_id::text, p_membership_id::text,
        v_target_status, v_reason
      ),
      'sha256'
    ),
    'hex'
  );

  v_existing := private.lock_idempotent_command(
    v_actor, 'change_workspace_membership_status', p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    SELECT * INTO v_event
    FROM public.workspace_membership_status_events event
    WHERE event.id = v_existing
      AND event.changed_by_profile_id = v_actor;

    IF v_event.id IS NULL OR v_event.request_fingerprint <> v_request_fingerprint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Idempotency key payload mismatch',
        DETAIL = '{"error_code":"IDEMPOTENCY_PAYLOAD_MISMATCH"}';
    END IF;

    RETURN QUERY
    SELECT v_event.membership_id, v_event.new_status, v_event.created_at;
    RETURN;
  END IF;

  -- Serializes all status decisions for one tenant, preventing two concurrent
  -- operators from each observing the other administrator as still active.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('workspace-membership-lifecycle:' || p_workspace_id::text, 0)
  );

  SELECT * INTO v_membership
  FROM public.workspace_memberships membership
  WHERE membership.id = p_membership_id
    AND membership.workspace_id = p_workspace_id
  FOR UPDATE;

  IF v_membership.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Membership was not found in the workspace',
      DETAIL = '{"error_code":"MEMBERSHIP_NOT_FOUND"}';
  END IF;
  IF v_membership.profile_id = v_actor THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Self membership status changes are forbidden',
      DETAIL = '{"error_code":"SELF_MEMBERSHIP_STATUS_CHANGE_FORBIDDEN"}';
  END IF;
  IF v_membership.status = 'ENDED'
     OR v_membership.status = v_target_status
     OR (v_target_status = 'ACTIVE' AND v_membership.status <> 'SUSPENDED')
     OR (v_target_status = 'SUSPENDED' AND v_membership.status <> 'ACTIVE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Membership cannot enter the requested state',
      DETAIL = '{"error_code":"MEMBERSHIP_STATUS_TRANSITION_INVALID"}';
  END IF;

  v_target_is_admin := private.effective_role_keys(
    v_membership.profile_id, p_workspace_id
  ) && ARRAY[
    'COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN'
  ]::text[];

  IF v_target_status <> 'ACTIVE' AND v_target_is_admin AND NOT EXISTS (
    SELECT 1
    FROM public.workspace_memberships other_membership
    JOIN public.membership_periods other_period
      ON other_period.workspace_id = other_membership.workspace_id
     AND other_period.membership_id = other_membership.id
     AND other_period.ended_at IS NULL
    WHERE other_membership.workspace_id = p_workspace_id
      AND other_membership.id <> p_membership_id
      AND other_membership.status = 'ACTIVE'
      AND private.effective_role_keys(
        other_membership.profile_id, p_workspace_id
      ) && ARRAY[
        'COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN'
      ]::text[]
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'The last active workspace administrator cannot be removed',
      DETAIL = '{"error_code":"LAST_ADMIN_PROTECTION"}';
  END IF;

  UPDATE public.workspace_memberships membership
  SET status = v_target_status,
      status_reason = v_reason,
      status_changed_at = v_changed_at,
      status_changed_by_profile_id = v_actor,
      updated_at = v_changed_at
  WHERE membership.id = p_membership_id
    AND membership.workspace_id = p_workspace_id;

  IF v_target_status = 'ACTIVE' THEN
    INSERT INTO public.membership_periods (
      workspace_id, membership_id, started_at, start_reason,
      created_by_profile_id, created_at
    ) VALUES (
      p_workspace_id, p_membership_id, v_changed_at,
      'ADMIN_REACTIVATION', v_actor, v_changed_at
    );

    FOR v_role_key IN
      SELECT assignment.role_key
      FROM public.role_assignments assignment
      WHERE assignment.workspace_id = p_workspace_id
        AND assignment.membership_id = p_membership_id
        AND assignment.status = 'ACTIVE'
        AND assignment.valid_from <= v_changed_at
        AND (assignment.valid_to IS NULL OR assignment.valid_to > v_changed_at)
    LOOP
      PERFORM private.project_legacy_workspace_role(
        p_workspace_id, v_membership.profile_id, v_role_key, true
      );
    END LOOP;

    FOR v_person_id IN
      SELECT account_link.person_id
      FROM public.person_account_links account_link
      WHERE account_link.profile_id = v_membership.profile_id
        AND account_link.status = 'ACTIVE'
        AND account_link.valid_from <= v_changed_at
        AND account_link.valid_to IS NULL
    LOOP
      PERFORM private.reconcile_legacy_person_relationships(
        p_workspace_id, v_person_id
      );
    END LOOP;
  ELSE
    UPDATE public.membership_periods period
    SET ended_at = GREATEST(
          v_changed_at,
          period.started_at + interval '1 microsecond'
        ),
        end_reason = v_reason
    WHERE period.workspace_id = p_workspace_id
      AND period.membership_id = p_membership_id
      AND period.ended_at IS NULL;
  END IF;

  IF v_target_status = 'ENDED' THEN
    UPDATE public.role_assignments assignment
    SET status = 'REVOKED',
        valid_to = GREATEST(
          v_changed_at,
          assignment.valid_from + interval '1 microsecond'
        ),
        revoked_by_profile_id = v_actor,
        reason = v_reason,
        updated_at = v_changed_at
    WHERE assignment.workspace_id = p_workspace_id
      AND assignment.membership_id = p_membership_id
      AND assignment.status = 'ACTIVE'
      AND (assignment.valid_to IS NULL OR assignment.valid_to > v_changed_at);

    UPDATE public.delegations delegation
    SET status = 'REVOKED',
        valid_to = GREATEST(
          v_changed_at,
          delegation.valid_from + interval '1 microsecond'
        ),
        reason = v_reason,
        updated_at = v_changed_at
    WHERE delegation.workspace_id = p_workspace_id
      AND (
        delegation.beneficiary_membership_id = p_membership_id
        OR delegation.granted_by_membership_id = p_membership_id
      )
      AND delegation.status = 'ACTIVE'
      AND (delegation.valid_to IS NULL OR delegation.valid_to > v_changed_at);
  END IF;

  INSERT INTO public.workspace_membership_status_events (
    id, workspace_id, membership_id, previous_status, new_status,
    reason, request_fingerprint, changed_by_profile_id,
    idempotency_key, created_at
  ) VALUES (
    v_event_id, p_workspace_id, p_membership_id, v_membership.status,
    v_target_status, v_reason, v_request_fingerprint, v_actor,
    p_idempotency_key, v_changed_at
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'change_workspace_membership_status', p_idempotency_key, v_event_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id,
    'WORKSPACE_MEMBERSHIP_STATUS_CHANGED',
    'workspace_membership',
    p_membership_id,
    'STATE_CHANGE',
    v_target_status,
    jsonb_build_object(
      'event_id', v_event_id,
      'previous_status', v_membership.status,
      'new_status', v_target_status
    )
  );

  RETURN QUERY
  SELECT p_membership_id, v_target_status, v_changed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.change_workspace_membership_status(
  uuid, uuid, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_workspace_membership_status(
  uuid, uuid, text, text, uuid
) TO authenticated;

-- Keep staff invitations least-privilege while allowing an administrator to
-- explicitly delegate the two new registry commands. They are intentionally
-- absent from the default delegate bundle.
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
       'MEMBERSHIP_REVIEW', 'MEMBERSHIP_SUSPEND', 'UNIT_RELATION_VERIFY',
       'TICKET_MANAGE', 'DOCUMENT_MANAGE', 'COMMUNICATION_MANAGE',
       'REMINDER_MANAGE', 'METER_MANAGE'
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

REVOKE ALL ON FUNCTION private.normalize_staff_invitation_capabilities(
  uuid, uuid, text, text[]
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.normalize_staff_invitation_capabilities(
  uuid, uuid, text, text[]
) TO service_role;

-- The direct limited-role command predates the registry capabilities and has
-- its own fail-closed allowlist. Replace it without widening the default
-- delegate bundle; the two new high-risk capabilities remain explicit opt-ins.
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

  v_existing := private.lock_idempotent_command(
    v_actor, 'grant_workspace_role', p_idempotency_key
  );
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
      SELECT ARRAY_AGG(
        DISTINCT COALESCE(ckm.internal_key, requested.capability_key)
        ORDER BY COALESCE(ckm.internal_key, requested.capability_key)
      )
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
      'MEMBERSHIP_REVIEW', 'MEMBERSHIP_SUSPEND', 'UNIT_RELATION_VERIFY',
      'TICKET_MANAGE', 'DOCUMENT_MANAGE', 'COMMUNICATION_MANAGE',
      'REMINDER_MANAGE', 'METER_MANAGE'
    )
    OR NOT private.has_workspace_capability(
      v_actor, p_workspace_id, requested.internal_key
    )
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

REVOKE ALL ON FUNCTION public.grant_workspace_role(
  uuid, uuid, text, text[], timestamptz, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_workspace_role(
  uuid, uuid, text, text[], timestamptz, uuid
) TO authenticated;

-- Staff invitation acceptance performs the same boundary check again at
-- consumption time. Keep that TOCTOU defense while recognizing the two new,
-- explicitly delegated registry capabilities.
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
        'MEMBERSHIP_REVIEW', 'MEMBERSHIP_SUSPEND', 'UNIT_RELATION_VERIFY',
        'TICKET_MANAGE', 'DOCUMENT_MANAGE',
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

COMMIT;
