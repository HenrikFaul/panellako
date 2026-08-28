-- PanelLako v0.10.1 - multitenancy integrity closure
--
-- This additive migration closes two schema-level invariants found during the
-- implementation audit:
--   1. ACTIVATED community requests must always carry the complete provenance
--      graph, while every non-ACTIVATED request must carry none of it.
--   2. A document-to-unit audience edge can never cross workspace boundaries,
--      even when it is written by an owner/service process that bypasses RLS.

BEGIN;

-- Fail closed rather than silently repairing provenance. An ACTIVATED row with
-- missing IDs cannot be reconstructed safely, and provenance on another state
-- is likewise an incident that requires an explicit operator decision.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.community_creation_requests request
    WHERE (
      request.status = 'ACTIVATED'
      AND (
        request.activated_at IS NULL
        OR request.activated_workspace_id IS NULL
        OR request.activated_physical_building_id IS NULL
        OR request.activated_membership_id IS NULL
        OR request.activated_mandate_id IS NULL
        OR request.activated_role_assignment_id IS NULL
        OR request.activated_workspace_id IS DISTINCT FROM request.reserved_workspace_id
        OR request.activated_physical_building_id IS DISTINCT FROM request.reserved_workspace_id
      )
    ) OR (
      request.status <> 'ACTIVATED'
      AND (
        request.activated_at IS NOT NULL
        OR request.activated_workspace_id IS NOT NULL
        OR request.activated_physical_building_id IS NOT NULL
        OR request.activated_membership_id IS NOT NULL
        OR request.activated_mandate_id IS NOT NULL
        OR request.activated_role_assignment_id IS NOT NULL
      )
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Community activation provenance is inconsistent',
      DETAIL = '{"error_code":"COMMUNITY_ACTIVATION_PROVENANCE_INVALID"}';
  END IF;
END;
$$;

ALTER TABLE public.community_creation_requests
  DROP CONSTRAINT IF EXISTS community_creation_requests_activation_shape_check;

ALTER TABLE public.community_creation_requests
  ADD CONSTRAINT community_creation_requests_activation_shape_check CHECK (
    (
      status <> 'ACTIVATED'
      AND activated_at IS NULL
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

ALTER TABLE public.community_creation_requests
  VALIDATE CONSTRAINT community_creation_requests_activation_shape_check;

-- The command RPCs are the only supported mutation surface for immutable
-- platform-review evidence. Service role retains EXECUTE on the commands and
-- SELECT through their explicit projections, but has no direct INSERT policy.
DROP POLICY IF EXISTS community_creation_reviews_service_insert
  ON public.community_creation_reviews;
DROP POLICY IF EXISTS community_address_duplicate_service_insert
  ON public.community_address_duplicate_resolutions;

ALTER TABLE public.document_units
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

UPDATE public.document_units edge
SET workspace_id = document.workspace_id
FROM public.documents document
WHERE document.id = edge.document_id
  AND edge.workspace_id IS DISTINCT FROM document.workspace_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.document_units edge
    LEFT JOIN public.documents document ON document.id = edge.document_id
    LEFT JOIN public.units unit_record ON unit_record.id = edge.unit_id
    WHERE document.id IS NULL
      OR unit_record.id IS NULL
      OR document.workspace_id IS NULL
      OR unit_record.workspace_id IS NULL
      OR document.workspace_id IS DISTINCT FROM unit_record.workspace_id
      OR edge.workspace_id IS DISTINCT FROM document.workspace_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Document unit audience contains a cross-workspace edge',
      DETAIL = '{"error_code":"DOCUMENT_UNIT_WORKSPACE_MISMATCH"}';
  END IF;
END;
$$;

ALTER TABLE public.document_units
  ALTER COLUMN workspace_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.documents'::regclass
      AND conname = 'documents_workspace_id_id_uq'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_workspace_id_id_uq UNIQUE (workspace_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.document_units'::regclass
      AND conname = 'document_units_workspace_fk'
  ) THEN
    ALTER TABLE public.document_units
      ADD CONSTRAINT document_units_workspace_fk
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.document_units'::regclass
      AND conname = 'document_units_document_scope_fk'
  ) THEN
    ALTER TABLE public.document_units
      ADD CONSTRAINT document_units_document_scope_fk
      FOREIGN KEY (workspace_id, document_id)
      REFERENCES public.documents(workspace_id, id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.document_units'::regclass
      AND conname = 'document_units_unit_scope_fk'
  ) THEN
    ALTER TABLE public.document_units
      ADD CONSTRAINT document_units_unit_scope_fk
      FOREIGN KEY (workspace_id, unit_id)
      REFERENCES public.units(workspace_id, id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_document_unit_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_document_workspace_id uuid;
  v_unit_workspace_id uuid;
BEGIN
  SELECT document.workspace_id INTO v_document_workspace_id
  FROM public.documents document
  WHERE document.id = NEW.document_id;

  SELECT unit_record.workspace_id INTO v_unit_workspace_id
  FROM public.units unit_record
  WHERE unit_record.id = NEW.unit_id;

  IF v_document_workspace_id IS NULL
     OR v_unit_workspace_id IS NULL
     OR v_document_workspace_id IS DISTINCT FROM v_unit_workspace_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Document and unit must belong to the same workspace',
      DETAIL = '{"error_code":"DOCUMENT_UNIT_WORKSPACE_MISMATCH"}';
  END IF;

  NEW.workspace_id := v_document_workspace_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_document_unit_workspace() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_document_units_workspace_scope
  ON public.document_units;
CREATE TRIGGER trg_document_units_workspace_scope
BEFORE INSERT OR UPDATE OF workspace_id, document_id, unit_id
ON public.document_units
FOR EACH ROW EXECUTE FUNCTION private.sync_document_unit_workspace();

CREATE INDEX IF NOT EXISTS document_units_workspace_idx
  ON public.document_units(workspace_id, document_id, unit_id);

COMMIT;
