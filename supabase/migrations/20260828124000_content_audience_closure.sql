-- PanelLako v0.10.1 - content audience authorization closure
--
-- Audience is an authorization decision, not presentation metadata. This
-- migration keeps the legacy `visibility` column for compatibility, derives a
-- typed value from it, and makes the same predicate authoritative for metadata,
-- acknowledgements and Storage downloads.

BEGIN;

CREATE OR REPLACE FUNCTION private.has_verified_owner_relationship(
  p_profile_id uuid,
  p_workspace_id uuid,
  p_unit_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.person_account_links pal
    JOIN public.unit_ownerships uo
      ON uo.party_id = pal.person_id
     AND uo.workspace_id = p_workspace_id
     AND (p_unit_id IS NULL OR uo.unit_id = p_unit_id)
     AND uo.status = 'VERIFIED'
     AND uo.valid_from <= now()
     AND (uo.valid_to IS NULL OR uo.valid_to > now())
    WHERE pal.profile_id = p_profile_id
      AND pal.status = 'ACTIVE'
      AND pal.valid_from <= now()
      AND (pal.valid_to IS NULL OR pal.valid_to > now())
  );
$$;

CREATE OR REPLACE FUNCTION private.has_verified_resident_relationship(
  p_profile_id uuid,
  p_workspace_id uuid,
  p_unit_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.person_account_links pal
    JOIN public.unit_occupancies uoc
      ON uoc.person_id = pal.person_id
     AND uoc.workspace_id = p_workspace_id
     AND (p_unit_id IS NULL OR uoc.unit_id = p_unit_id)
     AND uoc.status = 'VERIFIED'
     AND uoc.valid_from <= now()
     AND (uoc.valid_to IS NULL OR uoc.valid_to > now())
    WHERE pal.profile_id = p_profile_id
      AND pal.status = 'ACTIVE'
      AND pal.valid_from <= now()
      AND (pal.valid_to IS NULL OR pal.valid_to > now())
  );
$$;

CREATE OR REPLACE FUNCTION private.has_verified_unit_relationship(
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
  SELECT private.has_verified_owner_relationship(p_profile_id, p_workspace_id, p_unit_id)
      OR private.has_verified_resident_relationship(p_profile_id, p_workspace_id, p_unit_id);
$$;

REVOKE ALL ON FUNCTION private.has_verified_owner_relationship(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_verified_resident_relationship(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_verified_unit_relationship(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_verified_owner_relationship(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_verified_resident_relationship(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_verified_unit_relationship(uuid, uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Announcements: the target scope is enforced during parent-row reads. The
-- junction table exposes only the caller's own target row unless the caller is
-- a communication manager, preventing disclosure of the full target group.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.can_read_announcement(
  p_profile_id uuid,
  p_announcement_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT COALESCE((
    SELECT
      private.has_workspace_capability(p_profile_id, a.workspace_id, 'COMMUNICATION_MANAGE')
      OR (
        private.has_workspace_capability(p_profile_id, a.workspace_id, 'COMMUNICATION_READ')
        AND CASE a.scope
          WHEN 'all' THEN true
          WHEN 'owners' THEN private.has_verified_owner_relationship(p_profile_id, a.workspace_id, NULL)
          WHEN 'residents' THEN private.has_verified_resident_relationship(p_profile_id, a.workspace_id, NULL)
          WHEN 'specific_units' THEN EXISTS (
            SELECT 1
            FROM public.announcement_units au
            WHERE au.announcement_id = a.id
              AND private.has_verified_unit_relationship(p_profile_id, a.workspace_id, au.unit_id)
          )
          ELSE false
        END
      )
    FROM public.announcements a
    WHERE a.id = p_announcement_id
  ), false);
$$;

REVOKE ALL ON FUNCTION private.can_read_announcement(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_read_announcement(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS announcements_member_select ON public.announcements;
DROP POLICY IF EXISTS announcements_audience_select ON public.announcements;
CREATE POLICY announcements_audience_select ON public.announcements
FOR SELECT TO authenticated
USING (private.can_read_announcement(auth.uid(), id));

DROP POLICY IF EXISTS announcement_units_member_select ON public.announcement_units;
DROP POLICY IF EXISTS announcement_units_audience_select ON public.announcement_units;
CREATE POLICY announcement_units_audience_select ON public.announcement_units
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.announcements a
    WHERE a.id = announcement_units.announcement_id
      AND (
        private.has_workspace_capability(auth.uid(), a.workspace_id, 'COMMUNICATION_MANAGE')
        OR (
          private.can_read_announcement(auth.uid(), a.id)
          AND private.has_verified_unit_relationship(auth.uid(), a.workspace_id, announcement_units.unit_id)
        )
      )
  )
);

DROP POLICY IF EXISTS announcement_reads_self_insert ON public.announcement_reads;
DROP POLICY IF EXISTS announcement_reads_audience_insert ON public.announcement_reads;
CREATE POLICY announcement_reads_audience_insert ON public.announcement_reads
FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND private.can_read_announcement(auth.uid(), announcement_id)
);

-- ---------------------------------------------------------------------------
-- Documents: retain the legacy text for UI compatibility, but derive a typed,
-- constrained audience. Unknown legacy values become ADMINS (fail closed).
-- ---------------------------------------------------------------------------

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS audience text;

CREATE OR REPLACE FUNCTION private.canonical_document_audience(p_visibility text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE lower(trim(COALESCE(p_visibility, '')))
    WHEN 'mindenki' THEN 'COMMON'
    WHEN 'all' THEN 'COMMON'
    WHEN 'common' THEN 'COMMON'
    WHEN 'tulajdonosok' THEN 'OWNERS'
    WHEN 'owners' THEN 'OWNERS'
    WHEN 'lakók' THEN 'RESIDENTS'
    WHEN 'lakok' THEN 'RESIDENTS'
    WHEN 'residents' THEN 'RESIDENTS'
    WHEN 'célzott albetétek' THEN 'SPECIFIC_UNITS'
    WHEN 'celzott albetetek' THEN 'SPECIFIC_UNITS'
    WHEN 'specific_units' THEN 'SPECIFIC_UNITS'
    WHEN 'admins' THEN 'ADMINS'
    WHEN 'finance' THEN 'FINANCE'
    ELSE 'ADMINS'
  END;
$$;

REVOKE ALL ON FUNCTION private.canonical_document_audience(text) FROM PUBLIC;

UPDATE public.documents
SET audience = private.canonical_document_audience(visibility)
WHERE audience IS NULL
   OR audience NOT IN ('COMMON', 'OWNERS', 'RESIDENTS', 'SPECIFIC_UNITS', 'ADMINS', 'FINANCE');

ALTER TABLE public.documents ALTER COLUMN audience SET DEFAULT 'COMMON';
ALTER TABLE public.documents ALTER COLUMN audience SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.documents'::regclass
      AND conname = 'documents_audience_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_audience_check
      CHECK (audience IN ('COMMON', 'OWNERS', 'RESIDENTS', 'SPECIFIC_UNITS', 'ADMINS', 'FINANCE'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_document_audience()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.visibility IS DISTINCT FROM OLD.visibility THEN
    NEW.audience := private.canonical_document_audience(NEW.visibility);
  ELSIF NEW.audience IS NULL THEN
    NEW.audience := 'ADMINS';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_document_audience() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_documents_sync_audience ON public.documents;
CREATE TRIGGER trg_documents_sync_audience
BEFORE INSERT OR UPDATE OF visibility, audience ON public.documents
FOR EACH ROW EXECUTE FUNCTION private.sync_document_audience();

CREATE TABLE IF NOT EXISTS public.document_units (
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, unit_id)
);

CREATE INDEX IF NOT EXISTS document_units_unit_idx ON public.document_units(unit_id, document_id);
ALTER TABLE public.document_units ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.document_units FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.document_units TO authenticated;

CREATE OR REPLACE FUNCTION private.can_read_document(
  p_profile_id uuid,
  p_document_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT COALESCE((
    SELECT
      private.has_workspace_capability(p_profile_id, d.workspace_id, 'DOCUMENT_MANAGE')
      OR CASE d.audience
        WHEN 'COMMON' THEN private.has_workspace_capability(p_profile_id, d.workspace_id, 'DOCUMENT_READ')
        WHEN 'OWNERS' THEN
          private.has_workspace_capability(p_profile_id, d.workspace_id, 'DOCUMENT_OWNER_READ')
          AND private.has_verified_owner_relationship(p_profile_id, d.workspace_id, NULL)
        WHEN 'RESIDENTS' THEN
          private.has_workspace_capability(p_profile_id, d.workspace_id, 'DOCUMENT_READ')
          AND private.has_verified_resident_relationship(p_profile_id, d.workspace_id, NULL)
        WHEN 'SPECIFIC_UNITS' THEN
          private.has_workspace_capability(p_profile_id, d.workspace_id, 'DOCUMENT_UNIT_READ')
          AND EXISTS (
            SELECT 1
            FROM public.document_units du
            WHERE du.document_id = d.id
              AND private.has_verified_unit_relationship(p_profile_id, d.workspace_id, du.unit_id)
          )
        WHEN 'ADMINS' THEN false
        WHEN 'FINANCE' THEN private.has_workspace_capability(p_profile_id, d.workspace_id, 'FINANCE_READ')
        ELSE false
      END
    FROM public.documents d
    WHERE d.id = p_document_id
  ), false);
$$;

REVOKE ALL ON FUNCTION private.can_read_document(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_read_document(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS documents_member_select ON public.documents;
DROP POLICY IF EXISTS documents_audience_select ON public.documents;
CREATE POLICY documents_audience_select ON public.documents
FOR SELECT TO authenticated
USING (private.can_read_document(auth.uid(), id));

DROP POLICY IF EXISTS document_units_audience_select ON public.document_units;
CREATE POLICY document_units_audience_select ON public.document_units
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_units.document_id
      AND (
        private.has_workspace_capability(auth.uid(), d.workspace_id, 'DOCUMENT_MANAGE')
        OR (
          private.can_read_document(auth.uid(), d.id)
          AND private.has_verified_unit_relationship(auth.uid(), d.workspace_id, document_units.unit_id)
        )
      )
  )
);

DROP POLICY IF EXISTS document_units_manager_insert ON public.document_units;
CREATE POLICY document_units_manager_insert ON public.document_units
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.documents d
    JOIN public.units u ON u.id = document_units.unit_id
    WHERE d.id = document_units.document_id
      AND d.audience = 'SPECIFIC_UNITS'
      AND d.workspace_id = u.workspace_id
      AND private.has_workspace_capability(auth.uid(), d.workspace_id, 'DOCUMENT_MANAGE')
  )
);

DROP POLICY IF EXISTS document_units_manager_delete ON public.document_units;
CREATE POLICY document_units_manager_delete ON public.document_units
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_units.document_id
      AND private.has_workspace_capability(auth.uid(), d.workspace_id, 'DOCUMENT_MANAGE')
  )
);

DROP POLICY IF EXISTS document_acknowledgements_self_insert ON public.document_acknowledgements;
DROP POLICY IF EXISTS document_acknowledgements_audience_insert ON public.document_acknowledgements;
CREATE POLICY document_acknowledgements_audience_insert ON public.document_acknowledgements
FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND private.can_read_document(auth.uid(), document_id)
);

-- The Storage row and the document metadata use one shared audience predicate.
DROP POLICY IF EXISTS documents_authoritative_select ON storage.objects;
CREATE POLICY documents_authoritative_select
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.file_url = storage.objects.name
      AND private.can_read_document(auth.uid(), d.id)
  )
);

COMMIT;
