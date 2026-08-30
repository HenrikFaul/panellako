-- PanelLako v0.10.4 - controlled, tenant-scoped unit bulk import.
--
-- Preview is read-only. Apply repeats the same validation under an advisory
-- lock, requires a fresh AAL2 step-up and writes every unit (including the
-- legacy compatibility columns) in one database transaction.

BEGIN;

CREATE TABLE IF NOT EXISTS public.workspace_unit_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL,
  request_fingerprint text NOT NULL,
  imported_count integer NOT NULL,
  results jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_unit_imports_count_check CHECK (
    imported_count BETWEEN 1 AND 500
  ),
  CONSTRAINT workspace_unit_imports_fingerprint_check CHECK (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT workspace_unit_imports_results_check CHECK (
    jsonb_typeof(results) = 'array'
    AND jsonb_array_length(results) = imported_count
  ),
  CONSTRAINT workspace_unit_imports_actor_idempotency_uq
    UNIQUE (created_by_profile_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS workspace_unit_imports_scope_idx
  ON public.workspace_unit_imports (workspace_id, created_at DESC, id);

ALTER TABLE public.workspace_unit_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_unit_imports FORCE ROW LEVEL SECURITY;

-- Import receipts are command internals. Authenticated callers can only use
-- the RPCs below; there is deliberately no authenticated table policy.
REVOKE ALL ON TABLE public.workspace_unit_imports
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.workspace_unit_imports TO service_role;

CREATE OR REPLACE FUNCTION private.reject_workspace_unit_import_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001', MESSAGE = 'Workspace unit import receipts are immutable',
    DETAIL = '{"error_code":"WORKSPACE_UNIT_IMPORT_IMMUTABLE"}';
END;
$$;

REVOKE ALL ON FUNCTION private.reject_workspace_unit_import_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reject_workspace_unit_import_mutation()
  TO service_role;

DROP TRIGGER IF EXISTS trg_workspace_unit_imports_immutable
  ON public.workspace_unit_imports;
CREATE TRIGGER trg_workspace_unit_imports_immutable
BEFORE UPDATE OR DELETE ON public.workspace_unit_imports
FOR EACH ROW EXECUTE FUNCTION private.reject_workspace_unit_import_mutation();

-- Internal validator. It deliberately scopes every lookup by both workspace
-- and canonical physical building, so a missing parent and a cross-tenant
-- parent are indistinguishable to the caller.
CREATE OR REPLACE FUNCTION private.validate_workspace_unit_import(
  p_workspace_id uuid,
  p_rows jsonb
)
RETURNS TABLE (
  row_number integer,
  designation text,
  normalized_designation text,
  unit_category text,
  parent_designation text,
  parent_normalized_designation text,
  status text,
  error_code text,
  error_message text,
  existing_parent_unit_id uuid,
  batch_parent_row_number integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_building_id uuid;
  v_row_count integer;
  v_changed integer;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Unit import rows must be a JSON array',
      DETAIL = '{"error_code":"UNIT_IMPORT_ROWS_INVALID"}';
  END IF;

  v_row_count := jsonb_array_length(p_rows);
  IF v_row_count < 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'At least one unit import row is required',
      DETAIL = '{"error_code":"UNIT_IMPORT_ROWS_REQUIRED"}';
  END IF;
  IF v_row_count > 500 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Unit import row limit exceeded',
      DETAIL = '{"error_code":"UNIT_IMPORT_ROW_LIMIT_EXCEEDED","maximum":500}';
  END IF;

  SELECT wb.physical_building_id
  INTO v_building_id
  FROM public.workspace_buildings wb
  JOIN public.workspaces workspace ON workspace.id = wb.workspace_id
  WHERE wb.workspace_id = p_workspace_id
    AND wb.is_primary
    AND wb.valid_to IS NULL
    AND workspace.status = 'ACTIVE'
  LIMIT 1;

  -- Match create_workspace_unit's canonical legacy projection invariant.
  IF v_building_id IS NULL OR v_building_id <> p_workspace_id
     OR NOT EXISTS (
       SELECT 1 FROM public.buildings building
       WHERE building.id = p_workspace_id
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Workspace is not available for unit import',
      DETAIL = '{"error_code":"LEGACY_PRIMARY_BUILDING_ID_INVARIANT"}';
  END IF;

  DROP TABLE IF EXISTS pg_temp.panellako_unit_import_validation;
  CREATE TEMP TABLE pg_temp.panellako_unit_import_validation (
    row_no integer PRIMARY KEY,
    payload jsonb NOT NULL,
    designation text,
    normalized_designation text,
    unit_category text,
    parent_designation text,
    parent_normalized_designation text,
    error_code text,
    error_message text,
    existing_parent_unit_id uuid,
    batch_parent_row_number integer
  ) ON COMMIT DROP;

  INSERT INTO pg_temp.panellako_unit_import_validation (
    row_no, payload, designation, unit_category, parent_designation
  )
  SELECT
    input.ordinality::integer,
    input.value,
    CASE
      WHEN jsonb_typeof(input.value) = 'object'
       AND jsonb_typeof(input.value -> 'designation') = 'string'
      THEN NULLIF(BTRIM(input.value ->> 'designation'), '')
      ELSE NULL
    END,
    CASE
      WHEN jsonb_typeof(input.value) <> 'object' THEN NULL
      WHEN NOT (input.value ? 'unit_category')
        OR jsonb_typeof(input.value -> 'unit_category') = 'null'
      THEN 'APARTMENT'
      WHEN jsonb_typeof(input.value -> 'unit_category') = 'string'
      THEN UPPER(NULLIF(BTRIM(input.value ->> 'unit_category'), ''))
      ELSE NULL
    END,
    CASE
      WHEN jsonb_typeof(input.value) = 'object'
       AND jsonb_typeof(input.value -> 'parent_designation') = 'string'
      THEN NULLIF(BTRIM(input.value ->> 'parent_designation'), '')
      ELSE NULL
    END
  FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS input(value, ordinality);

  UPDATE pg_temp.panellako_unit_import_validation validation
  SET normalized_designation = NULLIF(
        private.normalize_unit_designation(validation.designation), ''
      ),
      parent_normalized_designation = NULLIF(
        private.normalize_unit_designation(validation.parent_designation), ''
      );

  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'ROW_NOT_OBJECT',
      error_message = 'Each import row must be a JSON object.'
  WHERE jsonb_typeof(validation.payload) <> 'object';

  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'DESIGNATION_REQUIRED',
      error_message = 'A non-empty designation is required.'
  WHERE validation.error_code IS NULL
    AND validation.designation IS NULL;

  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'DESIGNATION_TOO_LONG',
      error_message = 'Designation cannot exceed 120 characters.'
  WHERE validation.error_code IS NULL
    AND CHAR_LENGTH(validation.designation) > 120;

  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'UNIT_CATEGORY_INVALID',
      error_message = 'Unit category is invalid.'
  WHERE validation.error_code IS NULL
    AND (
      validation.unit_category IS NULL
      OR validation.unit_category NOT IN (
        'APARTMENT', 'GARAGE', 'STORAGE', 'COMMERCIAL', 'OTHER'
      )
    );

  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'PARENT_DESIGNATION_INVALID',
      error_message = 'Parent designation must be text or null.'
  WHERE validation.error_code IS NULL
    AND validation.payload ? 'parent_designation'
    AND jsonb_typeof(validation.payload -> 'parent_designation')
      NOT IN ('string', 'null');

  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'PARENT_DESIGNATION_TOO_LONG',
      error_message = 'Parent designation cannot exceed 120 characters.'
  WHERE validation.error_code IS NULL
    AND CHAR_LENGTH(validation.parent_designation) > 120;

  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'SELF_PARENT_FORBIDDEN',
      error_message = 'A unit cannot be its own parent.'
  WHERE validation.error_code IS NULL
    AND validation.parent_normalized_designation = validation.normalized_designation;

  WITH duplicate_designations AS (
    SELECT candidate.normalized_designation
    FROM pg_temp.panellako_unit_import_validation candidate
    WHERE candidate.normalized_designation IS NOT NULL
    GROUP BY candidate.normalized_designation
    HAVING COUNT(*) > 1
  )
  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'DUPLICATE_IN_BATCH',
      error_message = 'The normalized designation occurs more than once in this batch.'
  FROM duplicate_designations duplicate
  WHERE validation.error_code IS NULL
    AND validation.normalized_designation = duplicate.normalized_designation;

  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'ACTIVE_UNIT_ALREADY_EXISTS',
      error_message = 'An active unit with this designation already exists.'
  WHERE validation.error_code IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.units existing
      WHERE existing.workspace_id = p_workspace_id
        AND existing.physical_building_id = v_building_id
        AND existing.normalized_designation = validation.normalized_designation
        AND existing.status = 'ACTIVE'
    );

  -- The legacy units table still has a non-partial (building_id, unit_label)
  -- unique constraint. An archived row with the exact label therefore remains
  -- reserved until a dedicated reactivation/rename command handles it.
  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'LEGACY_UNIT_LABEL_RESERVED',
      error_message = 'This exact legacy unit label is already reserved.'
  WHERE validation.error_code IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.units existing
      WHERE existing.workspace_id = p_workspace_id
        AND existing.physical_building_id = v_building_id
        AND existing.building_id = v_building_id
        AND existing.unit_label = validation.designation
    );

  UPDATE pg_temp.panellako_unit_import_validation validation
  SET existing_parent_unit_id = (
    SELECT parent.id
    FROM public.units parent
    WHERE parent.workspace_id = p_workspace_id
      AND parent.physical_building_id = v_building_id
      AND parent.normalized_designation = validation.parent_normalized_designation
      AND parent.status = 'ACTIVE'
    LIMIT 1
  )
  WHERE validation.parent_normalized_designation IS NOT NULL;

  WITH parent_candidates AS (
    SELECT
      child.row_no,
      COUNT(parent.row_no)::integer AS candidate_count,
      MIN(parent.row_no)::integer AS candidate_row
    FROM pg_temp.panellako_unit_import_validation child
    LEFT JOIN pg_temp.panellako_unit_import_validation parent
      ON parent.normalized_designation = child.parent_normalized_designation
    WHERE child.parent_normalized_designation IS NOT NULL
    GROUP BY child.row_no
  )
  UPDATE pg_temp.panellako_unit_import_validation child
  SET batch_parent_row_number = CASE
        WHEN candidate.candidate_count = 1
         AND child.existing_parent_unit_id IS NULL
        THEN candidate.candidate_row
        ELSE NULL
      END
  FROM parent_candidates candidate
  WHERE child.row_no = candidate.row_no;

  WITH parent_candidates AS (
    SELECT
      child.row_no,
      COUNT(parent.row_no)::integer AS candidate_count
    FROM pg_temp.panellako_unit_import_validation child
    LEFT JOIN pg_temp.panellako_unit_import_validation parent
      ON parent.normalized_designation = child.parent_normalized_designation
    WHERE child.parent_normalized_designation IS NOT NULL
    GROUP BY child.row_no
  )
  UPDATE pg_temp.panellako_unit_import_validation child
  SET error_code = 'PARENT_AMBIGUOUS_IN_BATCH',
      error_message = 'Parent designation resolves to multiple rows in this batch.'
  FROM parent_candidates candidate
  WHERE child.row_no = candidate.row_no
    AND child.error_code IS NULL
    AND child.existing_parent_unit_id IS NULL
    AND candidate.candidate_count > 1;

  WITH parent_candidates AS (
    SELECT
      child.row_no,
      COUNT(parent.row_no)::integer AS candidate_count
    FROM pg_temp.panellako_unit_import_validation child
    LEFT JOIN pg_temp.panellako_unit_import_validation parent
      ON parent.normalized_designation = child.parent_normalized_designation
    WHERE child.parent_normalized_designation IS NOT NULL
    GROUP BY child.row_no
  )
  UPDATE pg_temp.panellako_unit_import_validation child
  SET error_code = 'PARENT_NOT_FOUND',
      error_message = 'Parent unit was not found in this workspace or batch.'
  FROM parent_candidates candidate
  WHERE child.row_no = candidate.row_no
    AND child.error_code IS NULL
    AND child.existing_parent_unit_id IS NULL
    AND candidate.candidate_count = 0;

  -- Detect direct and transitive cycles without exposing or consulting any
  -- other workspace's graph.
  WITH RECURSIVE parent_walk AS (
    SELECT
      start.row_no AS start_row,
      start.row_no AS current_row,
      ARRAY[start.row_no]::integer[] AS path,
      false AS is_cycle
    FROM pg_temp.panellako_unit_import_validation start
    WHERE start.error_code IS NULL
      AND start.batch_parent_row_number IS NOT NULL

    UNION ALL

    SELECT
      walk.start_row,
      current.batch_parent_row_number,
      walk.path || current.batch_parent_row_number,
      current.batch_parent_row_number = ANY(walk.path)
    FROM parent_walk walk
    JOIN pg_temp.panellako_unit_import_validation current
      ON current.row_no = walk.current_row
     AND current.error_code IS NULL
    WHERE NOT walk.is_cycle
      AND current.batch_parent_row_number IS NOT NULL
      AND CARDINALITY(walk.path) <= 500
  ),
  cycle_starts AS (
    SELECT DISTINCT walk.start_row
    FROM parent_walk walk
    WHERE walk.is_cycle
  )
  UPDATE pg_temp.panellako_unit_import_validation validation
  SET error_code = 'PARENT_CYCLE',
      error_message = 'Parent relationships contain a cycle.'
  FROM cycle_starts cycle
  WHERE validation.row_no = cycle.start_row
    AND validation.error_code IS NULL;

  -- Propagate an invalid parent deterministically through all descendants.
  LOOP
    UPDATE pg_temp.panellako_unit_import_validation child
    SET error_code = 'PARENT_ROW_INVALID',
        error_message = 'The referenced parent row is invalid.'
    FROM pg_temp.panellako_unit_import_validation parent
    WHERE child.error_code IS NULL
      AND child.batch_parent_row_number = parent.row_no
      AND parent.error_code IS NOT NULL;

    GET DIAGNOSTICS v_changed = ROW_COUNT;
    EXIT WHEN v_changed = 0;
  END LOOP;

  RETURN QUERY
  SELECT
    validation.row_no,
    validation.designation,
    validation.normalized_designation,
    validation.unit_category,
    validation.parent_designation,
    validation.parent_normalized_designation,
    CASE
      WHEN validation.error_code IS NULL THEN 'READY'
      WHEN validation.error_code IN (
        'DUPLICATE_IN_BATCH',
        'ACTIVE_UNIT_ALREADY_EXISTS',
        'LEGACY_UNIT_LABEL_RESERVED',
        'PARENT_AMBIGUOUS_IN_BATCH'
      ) THEN 'CONFLICT'
      ELSE 'INVALID'
    END,
    validation.error_code,
    validation.error_message,
    validation.existing_parent_unit_id,
    validation.batch_parent_row_number
  FROM pg_temp.panellako_unit_import_validation validation
  ORDER BY validation.row_no;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_workspace_unit_import(uuid, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.validate_workspace_unit_import(uuid, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.preview_workspace_unit_import(
  p_workspace_id uuid,
  p_rows jsonb
)
RETURNS TABLE (
  row_number integer,
  designation text,
  normalized_designation text,
  unit_category text,
  parent_designation text,
  parent_normalized_designation text,
  status text,
  error_code text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'UNIT_MANAGE');

  RETURN QUERY
  SELECT
    validation.row_number,
    validation.designation,
    validation.normalized_designation,
    validation.unit_category,
    validation.parent_designation,
    validation.parent_normalized_designation,
    validation.status,
    validation.error_code,
    validation.error_message
  FROM private.validate_workspace_unit_import(p_workspace_id, p_rows) validation
  ORDER BY validation.row_number;
END;
$$;

REVOKE ALL ON FUNCTION public.preview_workspace_unit_import(uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_workspace_unit_import(uuid, jsonb)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_workspace_unit_import(
  p_workspace_id uuid,
  p_rows jsonb,
  p_idempotency_key uuid
)
RETURNS TABLE (
  import_id uuid,
  applied boolean,
  imported_count integer,
  results jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_receipt public.workspace_unit_imports%ROWTYPE;
  v_import_id uuid := gen_random_uuid();
  v_building_id uuid;
  v_request_fingerprint text;
  v_error_count integer;
  v_imported_count integer;
  v_results jsonb;
BEGIN
  PERFORM private.require_workspace_capability(p_workspace_id, 'UNIT_MANAGE');
  PERFORM private.require_recent_aal2(interval '15 minutes');

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Unit import rows must be a JSON array',
      DETAIL = '{"error_code":"UNIT_IMPORT_ROWS_INVALID"}';
  END IF;
  IF jsonb_array_length(p_rows) < 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'At least one unit import row is required',
      DETAIL = '{"error_code":"UNIT_IMPORT_ROWS_REQUIRED"}';
  END IF;
  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Unit import row limit exceeded',
      DETAIL = '{"error_code":"UNIT_IMPORT_ROW_LIMIT_EXCEEDED","maximum":500}';
  END IF;

  v_request_fingerprint := encode(
    digest(p_workspace_id::text || ':' || p_rows::text, 'sha256'),
    'hex'
  );

  v_existing := private.lock_idempotent_command(
    v_actor, 'apply_workspace_unit_import', p_idempotency_key
  );
  IF v_existing IS NOT NULL THEN
    SELECT receipt.*
    INTO v_receipt
    FROM public.workspace_unit_imports receipt
    WHERE receipt.id = v_existing
      AND receipt.created_by_profile_id = v_actor;

    IF v_receipt.id IS NULL
       OR v_receipt.workspace_id <> p_workspace_id
       OR v_receipt.request_fingerprint <> v_request_fingerprint THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001', MESSAGE = 'Idempotency key payload mismatch',
        DETAIL = '{"error_code":"IDEMPOTENCY_PAYLOAD_MISMATCH"}';
    END IF;

    RETURN QUERY SELECT
      v_receipt.id, true, v_receipt.imported_count, v_receipt.results;
    RETURN;
  END IF;

  -- Serialize bulk imports for one workspace. Unique indexes still remain the
  -- final authority against concurrent single-unit commands.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('workspace-unit-import:' || p_workspace_id::text, 0)
  );

  SELECT wb.physical_building_id
  INTO v_building_id
  FROM public.workspace_buildings wb
  JOIN public.workspaces workspace ON workspace.id = wb.workspace_id
  WHERE wb.workspace_id = p_workspace_id
    AND wb.is_primary
    AND wb.valid_to IS NULL
    AND workspace.status = 'ACTIVE'
  FOR UPDATE OF wb;

  IF v_building_id IS NULL OR v_building_id <> p_workspace_id
     OR NOT EXISTS (
       SELECT 1 FROM public.buildings building
       WHERE building.id = p_workspace_id
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Workspace is not available for unit import',
      DETAIL = '{"error_code":"LEGACY_PRIMARY_BUILDING_ID_INVARIANT"}';
  END IF;

  DROP TABLE IF EXISTS pg_temp.panellako_unit_import_apply_rows;
  CREATE TEMP TABLE pg_temp.panellako_unit_import_apply_rows
  ON COMMIT DROP
  AS
  SELECT validation.*, NULL::uuid AS unit_id
  FROM private.validate_workspace_unit_import(p_workspace_id, p_rows) validation;

  SELECT COUNT(*) FILTER (WHERE apply_row.error_code IS NOT NULL)
  INTO v_error_count
  FROM pg_temp.panellako_unit_import_apply_rows apply_row;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'row_number', apply_row.row_number,
        'designation', apply_row.designation,
        'normalized_designation', apply_row.normalized_designation,
        'unit_category', apply_row.unit_category,
        'parent_designation', apply_row.parent_designation,
        'parent_normalized_designation', apply_row.parent_normalized_designation,
        'status', apply_row.status,
        'error_code', apply_row.error_code,
        'error_message', apply_row.error_message,
        'unit_id', NULL
      ) ORDER BY apply_row.row_number
    ),
    '[]'::jsonb
  )
  INTO v_results
  FROM pg_temp.panellako_unit_import_apply_rows apply_row;

  IF v_error_count > 0 THEN
    RETURN QUERY SELECT NULL::uuid, false, 0, v_results;
    RETURN;
  END IF;

  UPDATE pg_temp.panellako_unit_import_apply_rows
  SET unit_id = gen_random_uuid();

  BEGIN
    -- The legacy and normalized columns are written together. This is a single
    -- authoritative table write, not application-level dual-write.
    INSERT INTO public.units (
      id, building_id, unit_label, unit_type, workspace_id,
      physical_building_id, designation, normalized_designation,
      unit_category, creation_idempotency_key, created_by_profile_id, status
    )
    SELECT
      apply_row.unit_id,
      v_building_id,
      apply_row.designation,
      CASE apply_row.unit_category
        WHEN 'APARTMENT' THEN 'Lakas'
        WHEN 'GARAGE' THEN 'Garazs'
        WHEN 'STORAGE' THEN 'Tarolo'
        WHEN 'COMMERCIAL' THEN 'Uzlethelyiseg'
        ELSE 'Egyeb'
      END,
      p_workspace_id,
      v_building_id,
      apply_row.designation,
      apply_row.normalized_designation,
      apply_row.unit_category,
      NULL,
      v_actor,
      'ACTIVE'
    FROM pg_temp.panellako_unit_import_apply_rows apply_row
    ORDER BY apply_row.row_number;

    INSERT INTO public.unit_relations (
      workspace_id, parent_unit_id, child_unit_id, relation_type
    )
    SELECT
      p_workspace_id,
      COALESCE(
        child.existing_parent_unit_id,
        batch_parent.unit_id
      ),
      child.unit_id,
      'ACCESSORY_OF'
    FROM pg_temp.panellako_unit_import_apply_rows child
    LEFT JOIN pg_temp.panellako_unit_import_apply_rows batch_parent
      ON batch_parent.row_number = child.batch_parent_row_number
    WHERE child.parent_normalized_designation IS NOT NULL;
  EXCEPTION
    WHEN unique_violation THEN
      -- A concurrent single-unit create may win after preview. The statement
      -- above is rolled back as a subtransaction; re-run scoped validation and
      -- return conflicts instead of leaving partial units behind.
      DROP TABLE IF EXISTS pg_temp.panellako_unit_import_apply_rows;
      CREATE TEMP TABLE pg_temp.panellako_unit_import_apply_rows
      ON COMMIT DROP
      AS
      SELECT validation.*, NULL::uuid AS unit_id
      FROM private.validate_workspace_unit_import(p_workspace_id, p_rows) validation;

      SELECT COUNT(*) FILTER (WHERE retry_row.error_code IS NOT NULL)
      INTO v_error_count
      FROM pg_temp.panellako_unit_import_apply_rows retry_row;

      IF v_error_count = 0 THEN
        RAISE;
      END IF;

      SELECT jsonb_agg(
        jsonb_build_object(
          'row_number', retry_row.row_number,
          'designation', retry_row.designation,
          'normalized_designation', retry_row.normalized_designation,
          'unit_category', retry_row.unit_category,
          'parent_designation', retry_row.parent_designation,
          'parent_normalized_designation', retry_row.parent_normalized_designation,
          'status', retry_row.status,
          'error_code', retry_row.error_code,
          'error_message', retry_row.error_message,
          'unit_id', NULL
        ) ORDER BY retry_row.row_number
      )
      INTO v_results
      FROM pg_temp.panellako_unit_import_apply_rows retry_row;

      RETURN QUERY SELECT NULL::uuid, false, 0, v_results;
      RETURN;
  END;

  SELECT
    COUNT(*)::integer,
    jsonb_agg(
      jsonb_build_object(
        'row_number', apply_row.row_number,
        'designation', apply_row.designation,
        'normalized_designation', apply_row.normalized_designation,
        'unit_category', apply_row.unit_category,
        'parent_designation', apply_row.parent_designation,
        'parent_normalized_designation', apply_row.parent_normalized_designation,
        'status', 'IMPORTED',
        'error_code', NULL,
        'error_message', NULL,
        'unit_id', apply_row.unit_id
      ) ORDER BY apply_row.row_number
    )
  INTO v_imported_count, v_results
  FROM pg_temp.panellako_unit_import_apply_rows apply_row;

  INSERT INTO public.workspace_unit_imports (
    id, workspace_id, created_by_profile_id, idempotency_key,
    request_fingerprint, imported_count, results
  ) VALUES (
    v_import_id, p_workspace_id, v_actor, p_idempotency_key,
    v_request_fingerprint, v_imported_count, v_results
  );

  PERFORM private.record_idempotent_command(
    v_actor, 'apply_workspace_unit_import', p_idempotency_key, v_import_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id,
    'WORKSPACE_UNITS_BULK_IMPORTED',
    'workspace_unit_import',
    v_import_id,
    'STATE_CHANGE',
    NULL,
    jsonb_build_object(
      'imported_count', v_imported_count,
      'request_fingerprint', v_request_fingerprint
    )
  );

  RETURN QUERY SELECT v_import_id, true, v_imported_count, v_results;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_workspace_unit_import(uuid, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_workspace_unit_import(uuid, jsonb, uuid)
  TO authenticated;

COMMIT;
