-- PanelLako v0.10.1 - content command and predicate closure
--
-- Closes three audit findings:
--   * audience is a derived field and cannot be written independently;
--   * document audience + unit targets change in one database transaction;
--   * SECURITY DEFINER relationship predicates cannot be queried for an
--     arbitrary profile by an authenticated client.

BEGIN;

CREATE OR REPLACE FUNCTION private.sync_document_audience()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.visibility IS DISTINCT FROM OLD.visibility THEN
    NEW.audience := private.canonical_document_audience(NEW.visibility);
  ELSIF NEW.audience IS DISTINCT FROM OLD.audience THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Document audience is derived from visibility',
      DETAIL = '{"error_code":"DOCUMENT_AUDIENCE_DERIVED_FIELD"}';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_document_audience() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.can_current_user_read_announcement(
  p_announcement_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT private.can_read_announcement(auth.uid(), p_announcement_id);
$$;

CREATE OR REPLACE FUNCTION private.can_current_user_read_document(
  p_document_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT private.can_read_document(auth.uid(), p_document_id);
$$;

CREATE OR REPLACE FUNCTION private.current_user_has_verified_unit_relationship(
  p_workspace_id uuid,
  p_unit_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT private.has_verified_unit_relationship(auth.uid(), p_workspace_id, p_unit_id);
$$;

REVOKE EXECUTE ON FUNCTION private.has_verified_owner_relationship(uuid, uuid, uuid)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION private.has_verified_resident_relationship(uuid, uuid, uuid)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION private.has_verified_unit_relationship(uuid, uuid, uuid)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION private.can_read_announcement(uuid, uuid)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION private.can_read_document(uuid, uuid)
  FROM authenticated;

REVOKE ALL ON FUNCTION private.can_current_user_read_announcement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_current_user_read_document(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_has_verified_unit_relationship(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_current_user_read_announcement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_current_user_read_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_has_verified_unit_relationship(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS announcements_audience_select ON public.announcements;
CREATE POLICY announcements_audience_select ON public.announcements
FOR SELECT TO authenticated
USING (private.can_current_user_read_announcement(id));

DROP POLICY IF EXISTS announcement_units_audience_select ON public.announcement_units;
CREATE POLICY announcement_units_audience_select ON public.announcement_units
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.announcements announcement
    WHERE announcement.id = announcement_units.announcement_id
      AND (
        private.has_workspace_capability(auth.uid(), announcement.workspace_id, 'COMMUNICATION_MANAGE')
        OR (
          private.can_current_user_read_announcement(announcement.id)
          AND private.current_user_has_verified_unit_relationship(
            announcement.workspace_id,
            announcement_units.unit_id
          )
        )
      )
  )
);

DROP POLICY IF EXISTS announcement_reads_audience_insert ON public.announcement_reads;
CREATE POLICY announcement_reads_audience_insert ON public.announcement_reads
FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND private.can_current_user_read_announcement(announcement_id)
);

DROP POLICY IF EXISTS documents_audience_select ON public.documents;
CREATE POLICY documents_audience_select ON public.documents
FOR SELECT TO authenticated
USING (private.can_current_user_read_document(id));

DROP POLICY IF EXISTS document_units_audience_select ON public.document_units;
CREATE POLICY document_units_audience_select ON public.document_units
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.documents document
    WHERE document.id = document_units.document_id
      AND (
        private.has_workspace_capability(auth.uid(), document.workspace_id, 'DOCUMENT_MANAGE')
        OR (
          private.can_current_user_read_document(document.id)
          AND private.current_user_has_verified_unit_relationship(
            document.workspace_id,
            document_units.unit_id
          )
        )
      )
  )
);

DROP POLICY IF EXISTS document_acknowledgements_audience_insert
  ON public.document_acknowledgements;
CREATE POLICY document_acknowledgements_audience_insert
ON public.document_acknowledgements
FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND private.can_current_user_read_document(document_id)
);

DROP POLICY IF EXISTS documents_authoritative_select ON storage.objects;
CREATE POLICY documents_authoritative_select
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.documents document
    WHERE document.file_url = storage.objects.name
      AND private.can_current_user_read_document(document.id)
  )
);

CREATE OR REPLACE FUNCTION public.replace_document_audience(
  p_workspace_id uuid,
  p_document_id uuid,
  p_audience text,
  p_unit_ids uuid[],
  p_idempotency_key uuid
)
RETURNS TABLE (
  document_id uuid,
  audience text,
  targeted_unit_count integer,
  command_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_audience text := UPPER(BTRIM(COALESCE(p_audience, '')));
  v_unit_ids uuid[] := COALESCE(p_unit_ids, ARRAY[]::uuid[]);
  v_existing_resource_id uuid;
  v_valid_unit_count integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Authentication is required',
      DETAIL = '{"error_code":"AUTH_REQUIRED"}';
  END IF;
  IF p_workspace_id IS NULL OR p_document_id IS NULL OR p_idempotency_key IS NULL
     OR v_audience NOT IN ('COMMON', 'OWNERS', 'RESIDENTS', 'SPECIFIC_UNITS', 'ADMINS', 'FINANCE')
     OR CARDINALITY(v_unit_ids) > 500
     OR EXISTS (SELECT 1 FROM unnest(v_unit_ids) unit_id WHERE unit_id IS NULL)
     OR (v_audience = 'SPECIFIC_UNITS' AND CARDINALITY(v_unit_ids) = 0) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Document audience command is invalid',
      DETAIL = '{"error_code":"DOCUMENT_AUDIENCE_INPUT_INVALID"}';
  END IF;

  v_existing_resource_id := private.lock_idempotent_command(
    v_actor, 'replace_document_audience', p_idempotency_key
  );
  IF v_existing_resource_id IS NOT NULL THEN
    IF v_existing_resource_id IS DISTINCT FROM p_document_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023', MESSAGE = 'Idempotency key was used for another document',
        DETAIL = '{"error_code":"IDEMPOTENCY_KEY_REUSED"}';
    END IF;
    RETURN QUERY
    SELECT document.id, document.audience,
      (SELECT COUNT(*)::integer FROM public.document_units edge WHERE edge.document_id = document.id),
      'EXISTING'::text
    FROM public.documents document
    WHERE document.id = p_document_id AND document.workspace_id = p_workspace_id;
    RETURN;
  END IF;

  IF NOT private.has_workspace_capability(v_actor, p_workspace_id, 'DOCUMENT_MANAGE') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501', MESSAGE = 'Document management capability is required',
      DETAIL = '{"error_code":"CAPABILITY_REQUIRED"}';
  END IF;

  PERFORM 1
  FROM public.documents document
  WHERE document.id = p_document_id
    AND document.workspace_id = p_workspace_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Document does not belong to the workspace',
      DETAIL = '{"error_code":"DOCUMENT_SCOPE_MISMATCH"}';
  END IF;

  IF CARDINALITY(v_unit_ids) <> (
    SELECT COUNT(DISTINCT unit_id)::integer FROM unnest(v_unit_ids) unit_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023', MESSAGE = 'Document unit targets must be unique',
      DETAIL = '{"error_code":"DOCUMENT_UNIT_TARGET_DUPLICATE"}';
  END IF;

  SELECT COUNT(*)::integer INTO v_valid_unit_count
  FROM public.units unit_record
  WHERE unit_record.workspace_id = p_workspace_id
    AND unit_record.id = ANY(v_unit_ids)
    AND unit_record.status = 'ACTIVE';
  IF v_valid_unit_count <> CARDINALITY(v_unit_ids) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'A document target unit is outside the workspace',
      DETAIL = '{"error_code":"DOCUMENT_UNIT_WORKSPACE_MISMATCH"}';
  END IF;

  UPDATE public.documents
  SET visibility = v_audience
  WHERE id = p_document_id AND workspace_id = p_workspace_id;

  DELETE FROM public.document_units edge
  WHERE edge.document_id = p_document_id
    AND edge.workspace_id = p_workspace_id;

  IF v_audience = 'SPECIFIC_UNITS' THEN
    INSERT INTO public.document_units(document_id, unit_id)
    SELECT p_document_id, unit_id FROM unnest(v_unit_ids) unit_id;
  END IF;

  PERFORM private.record_idempotent_command(
    v_actor, 'replace_document_audience', p_idempotency_key, p_document_id
  );
  PERFORM private.write_authorization_event(
    p_workspace_id,
    'DOCUMENT_AUDIENCE_REPLACED',
    'document',
    p_document_id,
    'STATE_CHANGE',
    v_audience,
    jsonb_build_object('targeted_unit_count', CASE WHEN v_audience = 'SPECIFIC_UNITS' THEN CARDINALITY(v_unit_ids) ELSE 0 END)
  );

  RETURN QUERY SELECT p_document_id, v_audience,
    CASE WHEN v_audience = 'SPECIFIC_UNITS' THEN CARDINALITY(v_unit_ids) ELSE 0 END,
    'UPDATED'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_document_audience(uuid, uuid, text, uuid[], uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.replace_document_audience(uuid, uuid, text, uuid[], uuid)
  TO authenticated;

COMMIT;
