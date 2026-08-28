-- PanelLako multi-tenancy RLS/storage cut-over.
--
-- This migration is intentionally fail closed. It aborts before replacing any
-- policy if legacy tenant rows cannot be mapped authoritatively. Because the
-- migration is transactional, a failed preflight leaves all prior policies
-- untouched.

BEGIN;

-- ---------------------------------------------------------------------------
-- Reconciliation gate: no policy cut-over with ambiguous/null tenant scope.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_violations bigint;
BEGIN
  SELECT COUNT(*) INTO v_violations
  FROM public.workspaces w
  WHERE w.status = 'ACTIVE'
    AND NOT (
      EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = w.id)
      AND EXISTS (SELECT 1 FROM public.physical_buildings pb WHERE pb.id = w.id)
      AND EXISTS (
        SELECT 1 FROM public.workspace_buildings wb
        WHERE wb.workspace_id = w.id
          AND wb.physical_building_id = w.id
          AND wb.is_primary
          AND wb.valid_to IS NULL
      )
      AND EXISTS (
        SELECT 1
        FROM public.workspace_buildings wb
        JOIN public.building_address_assignments baa
          ON baa.physical_building_id = wb.physical_building_id
         AND baa.assignment_role = 'PRIMARY'
         AND baa.valid_to IS NULL
        WHERE wb.workspace_id = w.id
          AND wb.is_primary
          AND wb.valid_to IS NULL
      )
    );
  IF v_violations > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'RLS cut-over blocked by incomplete workspace/building identity',
      DETAIL = jsonb_build_object(
        'error_code', 'RLS_CUTOVER_PREFLIGHT_FAILED',
        'check', 'ACTIVE_WORKSPACE_COMPATIBILITY',
        'row_count', v_violations
      )::text;
  END IF;

  SELECT COUNT(*) INTO v_violations
  FROM public.units u
  WHERE u.workspace_id IS NULL
     OR u.physical_building_id IS NULL
     OR u.designation IS NULL
     OR u.normalized_designation IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.workspace_buildings wb
       WHERE wb.workspace_id = u.workspace_id
         AND wb.physical_building_id = u.physical_building_id
         AND wb.valid_to IS NULL
     );
  IF v_violations > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'RLS cut-over blocked by unmappable units',
      DETAIL = jsonb_build_object(
        'error_code', 'RLS_CUTOVER_PREFLIGHT_FAILED',
        'check', 'UNIT_TENANT_SCOPE',
        'row_count', v_violations
      )::text;
  END IF;

  SELECT COUNT(*) INTO v_violations
  FROM public.memberships m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.workspace_id = m.building_id AND wm.profile_id = m.profile_id
  )
  OR (
    m.unit_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = m.unit_id AND u.workspace_id = m.building_id
    )
  );
  IF v_violations > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'RLS cut-over blocked by unmappable legacy memberships',
      DETAIL = jsonb_build_object(
        'error_code', 'RLS_CUTOVER_PREFLIGHT_FAILED',
        'check', 'LEGACY_MEMBERSHIP_SCOPE',
        'row_count', v_violations
      )::text;
  END IF;

  SELECT COUNT(*) INTO v_violations
  FROM public.workspace_memberships wm
  WHERE wm.status = 'ACTIVE'
    AND NOT EXISTS (
      SELECT 1 FROM public.membership_periods mp
      WHERE mp.workspace_id = wm.workspace_id
        AND mp.membership_id = wm.id
        AND mp.ended_at IS NULL
    );
  IF v_violations > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'RLS cut-over blocked by active membership without period',
      DETAIL = jsonb_build_object(
        'error_code', 'RLS_CUTOVER_PREFLIGHT_FAILED',
        'check', 'ACTIVE_MEMBERSHIP_PERIOD',
        'row_count', v_violations
      )::text;
  END IF;

  SELECT COUNT(*) INTO v_violations
  FROM (
    SELECT workspace_id FROM public.announcements WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.notifications WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.tickets WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.meter_readings WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.documents WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.finance_entries WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.meetings WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.vendors WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.work_orders WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.knowledge_base_articles WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.subscriptions WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.invoice_events WHERE workspace_id IS NULL
    UNION ALL SELECT workspace_id FROM public.reminder_rules WHERE workspace_id IS NULL
  ) unresolved;
  IF v_violations > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'RLS cut-over blocked by null tenant keys',
      DETAIL = jsonb_build_object(
        'error_code', 'RLS_CUTOVER_PREFLIGHT_FAILED',
        'check', 'CORE_TENANT_KEYS_NOT_NULL',
        'row_count', v_violations
      )::text;
  END IF;

  SELECT COUNT(*) INTO v_violations
  FROM public.reminder_rules rr
  WHERE NOT EXISTS (
    SELECT 1 FROM public.workspace_buildings wb
    WHERE wb.workspace_id = rr.workspace_id
      AND wb.physical_building_id = rr.building_id
      AND wb.valid_to IS NULL
  );
  IF v_violations > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'RLS cut-over blocked by invalid reminder tenant scope',
      DETAIL = jsonb_build_object(
        'error_code', 'RLS_CUTOVER_PREFLIGHT_FAILED',
        'check', 'REMINDER_WORKSPACE_BUILDING_SCOPE',
        'row_count', v_violations
      )::text;
  END IF;

  SELECT COUNT(*) INTO v_violations
  FROM public.tickets t
  JOIN public.units u ON u.id = t.unit_id
  WHERE t.unit_id IS NOT NULL AND u.workspace_id <> t.workspace_id;
  IF v_violations > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'RLS cut-over blocked by cross-tenant tickets',
      DETAIL = jsonb_build_object(
        'error_code', 'RLS_CUTOVER_PREFLIGHT_FAILED',
        'check', 'TICKET_UNIT_SCOPE',
        'row_count', v_violations
      )::text;
  END IF;

  SELECT COUNT(*) INTO v_violations
  FROM public.meter_readings mr
  JOIN public.units u ON u.id = mr.unit_id
  WHERE mr.unit_id IS NOT NULL AND u.workspace_id <> mr.workspace_id;
  IF v_violations > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'RLS cut-over blocked by cross-tenant meter readings',
      DETAIL = jsonb_build_object(
        'error_code', 'RLS_CUTOVER_PREFLIGHT_FAILED',
        'check', 'METER_UNIT_SCOPE',
        'row_count', v_violations
      )::text;
  END IF;

  SELECT COUNT(*) INTO v_violations
  FROM public.finance_entries fe
  JOIN public.units u ON u.id = fe.unit_id
  WHERE fe.unit_id IS NOT NULL AND u.workspace_id <> fe.workspace_id;
  IF v_violations > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'RLS cut-over blocked by cross-tenant finance entries',
      DETAIL = jsonb_build_object(
        'error_code', 'RLS_CUTOVER_PREFLIGHT_FAILED',
        'check', 'FINANCE_UNIT_SCOPE',
        'row_count', v_violations
      )::text;
  END IF;

  SELECT COUNT(*) INTO v_violations
  FROM public.work_orders wo
  LEFT JOIN public.tickets t ON t.id = wo.ticket_id
  LEFT JOIN public.vendors v ON v.id = wo.vendor_id
  WHERE (t.id IS NOT NULL AND t.workspace_id <> wo.workspace_id)
     OR (v.id IS NOT NULL AND v.workspace_id <> wo.workspace_id)
     OR (t.id IS NOT NULL AND v.id IS NOT NULL AND t.workspace_id <> v.workspace_id);
  IF v_violations > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'RLS cut-over blocked by cross-tenant work orders',
      DETAIL = jsonb_build_object(
        'error_code', 'RLS_CUTOVER_PREFLIGHT_FAILED',
        'check', 'WORK_ORDER_PARENT_SCOPE',
        'row_count', v_violations
      )::text;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Remove every legacy policy from tenant-bearing public tables dynamically.
-- Merely adding restrictive policies would not neutralize old permissive ORs.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_policy record;
  v_tables text[] := ARRAY[
    'profiles', 'memberships', 'buildings', 'units',
    'announcements', 'announcement_units', 'announcement_reads',
    'reminder_rules', 'reminder_sends', 'notifications', 'tickets',
    'meter_readings', 'documents', 'document_acknowledgements',
    'finance_entries', 'meetings', 'agenda_items', 'resolutions', 'votes',
    'meeting_attendances', 'vendors', 'work_orders', 'knowledge_base_articles',
    'audit_logs', 'subscriptions', 'invoice_events', 'push_subscriptions',
    'utility_reading_requests', 'utility_provider_tokens',
    'noise_reports', 'waste_reports', 'illegal_dump_reports',
    'transit_stop_cache', 'building_stops', 'building_solar_cache',
    'building_satellite_cache', 'building_liveability_cache',
    'building_green_cache', 'building_compact_city_cache', 'building_env_score',
    'building_public_services_cache', 'building_urban_atlas_cache'
  ];
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(v_tables)
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_policy record;
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    FOR v_policy IN
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname IN (
          'Authenticated users can read documents',
          'Authenticated users can upload documents',
          'Authenticated users can update documents',
          'Authenticated users can delete documents',
          'documents_authoritative_select',
          'documents_authoritative_insert',
          'documents_authoritative_update',
          'documents_authoritative_delete'
        )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', v_policy.policyname);
    END LOOP;
  END IF;
END;
$$;

-- Explicitly re-enable RLS in case a drifted environment disabled it.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_reading_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_provider_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noise_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.illegal_dump_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit_stop_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_solar_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_satellite_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_liveability_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_green_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_compact_city_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_env_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_public_services_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_urban_atlas_cache ENABLE ROW LEVEL SECURITY;

-- Reset direct privileges, then grant only operations protected below. Sensitive
-- state transitions remain SECURITY DEFINER command-only.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'profiles', 'memberships', 'buildings', 'units',
    'announcements', 'announcement_units', 'announcement_reads',
    'reminder_rules', 'reminder_sends', 'notifications', 'tickets',
    'meter_readings', 'documents', 'document_acknowledgements',
    'finance_entries', 'meetings', 'agenda_items', 'resolutions', 'votes',
    'meeting_attendances', 'vendors', 'work_orders', 'knowledge_base_articles',
    'audit_logs', 'subscriptions', 'invoice_events', 'push_subscriptions',
    'utility_reading_requests', 'utility_provider_tokens',
    'noise_reports', 'waste_reports', 'illegal_dump_reports',
    'transit_stop_cache', 'building_stops', 'building_solar_cache',
    'building_satellite_cache', 'building_liveability_cache',
    'building_green_cache', 'building_compact_city_cache', 'building_env_score',
    'building_public_services_cache', 'building_urban_atlas_cache'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', v_table);
  END LOOP;
END;
$$;

GRANT SELECT ON TABLE
  public.profiles, public.memberships, public.buildings, public.units,
  public.announcements, public.announcement_units, public.announcement_reads,
  public.reminder_rules, public.reminder_sends, public.notifications,
  public.tickets, public.meter_readings, public.documents,
  public.document_acknowledgements, public.finance_entries, public.meetings,
  public.agenda_items, public.resolutions, public.votes, public.meeting_attendances,
  public.vendors, public.work_orders, public.knowledge_base_articles,
  public.audit_logs, public.subscriptions, public.invoice_events,
  public.push_subscriptions, public.utility_reading_requests,
  public.noise_reports, public.waste_reports, public.illegal_dump_reports,
  public.transit_stop_cache, public.building_stops,
  public.building_solar_cache, public.building_satellite_cache,
  public.building_liveability_cache, public.building_green_cache,
  public.building_compact_city_cache, public.building_env_score,
  public.building_public_services_cache,
  public.building_urban_atlas_cache
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.transit_stop_cache, public.building_stops,
  public.building_solar_cache, public.building_satellite_cache,
  public.building_liveability_cache, public.building_green_cache,
  public.building_compact_city_cache, public.building_env_score,
  public.building_public_services_cache,
  public.building_urban_atlas_cache
TO service_role;

GRANT UPDATE (display_name, full_name, phone, notifications_email, notifications_statutory_email)
ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT INSERT, DELETE ON public.announcement_units TO authenticated;
GRANT INSERT, UPDATE ON public.announcement_reads TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reminder_rules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT INSERT, UPDATE ON public.tickets TO authenticated;
GRANT INSERT ON public.meter_readings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT INSERT, UPDATE ON public.document_acknowledgements TO authenticated;
GRANT INSERT, UPDATE ON public.finance_entries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.agenda_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resolutions TO authenticated;
GRANT INSERT, UPDATE ON public.votes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.meeting_attendances TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_base_articles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT INSERT ON public.noise_reports TO authenticated;
GRANT INSERT, UPDATE ON public.waste_reports TO authenticated;
GRANT INSERT, UPDATE ON public.illegal_dump_reports TO authenticated;

-- Building-scoped environment/transit caches are tenant data even though the
-- payload comes from public providers. Authenticated clients may read only
-- caches bound to a physical building in one of their active workspaces;
-- cache ingestion stays service_role-only.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'transit_stop_cache', 'building_stops', 'building_solar_cache',
    'building_satellite_cache', 'building_liveability_cache',
    'building_green_cache', 'building_compact_city_cache', 'building_env_score',
    'building_public_services_cache', 'building_urban_atlas_cache'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
         EXISTS (
           SELECT 1 FROM public.workspace_buildings wb
           WHERE wb.physical_building_id = %I.building_id
             AND wb.valid_to IS NULL
             AND private.has_workspace_capability(auth.uid(), wb.workspace_id, ''ENVIRONMENT_READ'')
         )
       )',
      'mt_environment_member_select_' || v_table,
      v_table,
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      'mt_environment_service_ingest_' || v_table,
      v_table
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Membership/capability/object-bound policies for legacy application tables.
-- ---------------------------------------------------------------------------

CREATE POLICY profiles_self_select ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_self_update ON public.profiles
FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY memberships_scoped_select ON public.memberships
FOR SELECT TO authenticated
USING (
  profile_id = auth.uid()
  OR private.has_workspace_capability(auth.uid(), building_id, 'MEMBER_DIRECTORY_READ')
);

CREATE POLICY buildings_member_select ON public.buildings
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), id));

CREATE POLICY units_object_select ON public.units
FOR SELECT TO authenticated
USING (
  private.has_workspace_capability(auth.uid(), workspace_id, 'UNIT_READ_ALL')
  OR private.can_access_unit(auth.uid(), workspace_id, id)
);

CREATE POLICY announcements_member_select ON public.announcements
FOR SELECT TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_READ'));
CREATE POLICY announcements_manager_insert ON public.announcements
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = building_id
  AND created_by = auth.uid()
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE')
);
CREATE POLICY announcements_manager_update ON public.announcements
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE'))
WITH CHECK (
  workspace_id = building_id
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE')
);
CREATE POLICY announcements_manager_delete ON public.announcements
FOR DELETE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE'));

CREATE POLICY announcement_units_member_select ON public.announcement_units
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.announcements a
  WHERE a.id = announcement_units.announcement_id
    AND private.has_workspace_capability(auth.uid(), a.workspace_id, 'COMMUNICATION_READ')
));
CREATE POLICY announcement_units_manager_insert ON public.announcement_units
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.announcements a
  JOIN public.units u ON u.id = announcement_units.unit_id
  WHERE a.id = announcement_units.announcement_id
    AND a.workspace_id = u.workspace_id
    AND private.has_workspace_capability(auth.uid(), a.workspace_id, 'COMMUNICATION_MANAGE')
));
CREATE POLICY announcement_units_manager_delete ON public.announcement_units
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.announcements a
  WHERE a.id = announcement_units.announcement_id
    AND private.has_workspace_capability(auth.uid(), a.workspace_id, 'COMMUNICATION_MANAGE')
));

CREATE POLICY announcement_reads_scoped_select ON public.announcement_reads
FOR SELECT TO authenticated
USING (
  profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_reads.announcement_id
      AND private.has_workspace_capability(auth.uid(), a.workspace_id, 'COMMUNICATION_MANAGE')
  )
);
CREATE POLICY announcement_reads_self_insert ON public.announcement_reads
FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_reads.announcement_id
      AND private.has_workspace_capability(auth.uid(), a.workspace_id, 'COMMUNICATION_READ')
  )
);
CREATE POLICY announcement_reads_self_update ON public.announcement_reads
FOR UPDATE TO authenticated
USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY reminder_rules_member_select ON public.reminder_rules
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), workspace_id));
CREATE POLICY reminder_rules_manager_insert ON public.reminder_rules
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'REMINDER_MANAGE')
  AND EXISTS (
    SELECT 1 FROM public.workspace_buildings wb
    WHERE wb.workspace_id = reminder_rules.workspace_id
      AND wb.physical_building_id = reminder_rules.building_id
      AND wb.valid_to IS NULL
  )
);
CREATE POLICY reminder_rules_manager_update ON public.reminder_rules
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'REMINDER_MANAGE'))
WITH CHECK (
  private.has_workspace_capability(auth.uid(), workspace_id, 'REMINDER_MANAGE')
  AND EXISTS (
    SELECT 1 FROM public.workspace_buildings wb
    WHERE wb.workspace_id = reminder_rules.workspace_id
      AND wb.physical_building_id = reminder_rules.building_id
      AND wb.valid_to IS NULL
  )
);
CREATE POLICY reminder_rules_manager_delete ON public.reminder_rules
FOR DELETE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'REMINDER_MANAGE'));

CREATE POLICY reminder_sends_scoped_select ON public.reminder_sends
FOR SELECT TO authenticated
USING (
  profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.reminder_rules rr
    WHERE rr.id = reminder_sends.reminder_rule_id
      AND private.has_workspace_capability(auth.uid(), rr.workspace_id, 'REMINDER_MANAGE')
  )
);
CREATE POLICY reminder_sends_service_only_insert ON public.reminder_sends
FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY notifications_member_select ON public.notifications
FOR SELECT TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_READ'));
CREATE POLICY notifications_manager_insert ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE')
  AND EXISTS (
    SELECT 1 FROM public.workspace_buildings wb
    WHERE wb.workspace_id = notifications.workspace_id
      AND wb.physical_building_id = notifications.building_id
      AND wb.valid_to IS NULL
  )
);
CREATE POLICY notifications_manager_update ON public.notifications
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE'))
WITH CHECK (
  private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE')
  AND EXISTS (
    SELECT 1 FROM public.workspace_buildings wb
    WHERE wb.workspace_id = notifications.workspace_id
      AND wb.physical_building_id = notifications.building_id
      AND wb.valid_to IS NULL
  )
);
CREATE POLICY notifications_manager_delete ON public.notifications
FOR DELETE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE'));

CREATE POLICY tickets_object_select ON public.tickets
FOR SELECT TO authenticated
USING (
  private.has_workspace_capability(auth.uid(), workspace_id, 'TICKET_MANAGE')
  OR reporter_id = auth.uid()
  OR (unit_id IS NOT NULL AND private.can_access_unit(auth.uid(), workspace_id, unit_id))
  OR (unit_id IS NULL AND private.has_active_workspace_membership(auth.uid(), workspace_id))
);
CREATE POLICY tickets_member_insert ON public.tickets
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = building_id
  AND reporter_id = auth.uid()
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'TICKET_CREATE')
  AND (unit_id IS NULL OR private.can_access_unit(auth.uid(), workspace_id, unit_id))
);
CREATE POLICY tickets_manager_update ON public.tickets
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'TICKET_MANAGE'))
WITH CHECK (
  workspace_id = building_id
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'TICKET_MANAGE')
);

CREATE POLICY meter_readings_object_select ON public.meter_readings
FOR SELECT TO authenticated
USING (
  reported_by = auth.uid()
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'UNIT_READ_ALL')
  OR (unit_id IS NOT NULL AND private.can_access_unit(auth.uid(), workspace_id, unit_id))
);
CREATE POLICY meter_readings_member_insert ON public.meter_readings
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = building_id
  AND reported_by = auth.uid()
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'METER_SUBMIT')
  AND unit_id IS NOT NULL
  AND private.can_access_unit(auth.uid(), workspace_id, unit_id)
);

CREATE POLICY documents_member_select ON public.documents
FOR SELECT TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'DOCUMENT_READ'));
CREATE POLICY documents_manager_insert ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = building_id
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'DOCUMENT_MANAGE')
  AND file_url LIKE ('workspace/' || workspace_id::text || '/documents/%')
);
CREATE POLICY documents_manager_update ON public.documents
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'DOCUMENT_MANAGE'))
WITH CHECK (
  workspace_id = building_id
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'DOCUMENT_MANAGE')
  AND (
    file_url LIKE ('workspace/' || workspace_id::text || '/documents/%')
    OR file_url LIKE 'http%'
    OR file_url = '#'
  )
);
CREATE POLICY documents_manager_delete ON public.documents
FOR DELETE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'DOCUMENT_MANAGE'));

CREATE POLICY document_acknowledgements_scoped_select ON public.document_acknowledgements
FOR SELECT TO authenticated
USING (
  profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_acknowledgements.document_id
      AND private.has_workspace_capability(auth.uid(), d.workspace_id, 'DOCUMENT_MANAGE')
  )
);
CREATE POLICY document_acknowledgements_self_insert ON public.document_acknowledgements
FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_acknowledgements.document_id
      AND private.has_workspace_capability(auth.uid(), d.workspace_id, 'DOCUMENT_READ')
  )
);
CREATE POLICY document_acknowledgements_self_update ON public.document_acknowledgements
FOR UPDATE TO authenticated
USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY finance_entries_manager_select ON public.finance_entries
FOR SELECT TO authenticated
USING (
  private.has_workspace_capability(auth.uid(), workspace_id, 'FINANCE_READ')
  OR (
    unit_id IS NOT NULL
    AND private.has_workspace_capability(auth.uid(), workspace_id, 'FINANCE_UNIT_READ')
    AND private.can_access_unit(auth.uid(), workspace_id, unit_id)
  )
);
CREATE POLICY finance_entries_manager_insert ON public.finance_entries
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'FINANCE_WRITE')
  AND (unit_id IS NULL OR private.can_access_unit(auth.uid(), workspace_id, unit_id))
);
CREATE POLICY finance_entries_manager_update ON public.finance_entries
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'FINANCE_WRITE'))
WITH CHECK (private.has_workspace_capability(auth.uid(), workspace_id, 'FINANCE_WRITE'));

CREATE POLICY meetings_member_select ON public.meetings
FOR SELECT TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'MEETING_READ'));
CREATE POLICY meetings_manager_insert ON public.meetings
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = building_id
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'MEETING_MANAGE')
);
CREATE POLICY meetings_manager_update ON public.meetings
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'MEETING_MANAGE'))
WITH CHECK (
  workspace_id = building_id
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'MEETING_MANAGE')
);
CREATE POLICY meetings_manager_delete ON public.meetings
FOR DELETE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'MEETING_MANAGE'));

CREATE POLICY agenda_items_member_select ON public.agenda_items
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = agenda_items.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_READ')
));
CREATE POLICY agenda_items_manager_insert ON public.agenda_items
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = agenda_items.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
));
CREATE POLICY agenda_items_manager_update ON public.agenda_items
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = agenda_items.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = agenda_items.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
));
CREATE POLICY agenda_items_manager_delete ON public.agenda_items
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = agenda_items.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
));

CREATE POLICY resolutions_member_select ON public.resolutions
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = resolutions.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_READ')
));
CREATE POLICY resolutions_manager_insert ON public.resolutions
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = resolutions.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
));
CREATE POLICY resolutions_manager_update ON public.resolutions
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = resolutions.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = resolutions.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
));
CREATE POLICY resolutions_manager_delete ON public.resolutions
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = resolutions.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
));

CREATE POLICY votes_member_select ON public.votes
FOR SELECT TO authenticated
USING (
  voter_profile_id = auth.uid()
  OR EXISTS (
  SELECT 1
  FROM public.resolutions r
  JOIN public.meetings m ON m.id = r.meeting_id
  WHERE r.id = votes.resolution_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'VOTE_AUDIT')
  )
);
CREATE POLICY votes_self_insert ON public.votes
FOR INSERT TO authenticated
WITH CHECK (
  voter_profile_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.resolutions r
    JOIN public.meetings m ON m.id = r.meeting_id
    WHERE r.id = votes.resolution_id
      AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_READ')
      AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'VOTE_CAST')
      AND (votes.unit_id IS NULL OR private.can_access_unit(auth.uid(), m.workspace_id, votes.unit_id))
  )
);
CREATE POLICY votes_manager_update ON public.votes
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.resolutions r
  JOIN public.meetings m ON m.id = r.meeting_id
  WHERE r.id = votes.resolution_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
))
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.resolutions r
  JOIN public.meetings m ON m.id = r.meeting_id
  WHERE r.id = votes.resolution_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
));

CREATE POLICY meeting_attendances_scoped_select ON public.meeting_attendances
FOR SELECT TO authenticated
USING (
  profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendances.meeting_id
      AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
  )
);
CREATE POLICY meeting_attendances_manager_insert ON public.meeting_attendances
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.meetings m
  JOIN public.units u ON u.id = meeting_attendances.unit_id
  WHERE m.id = meeting_attendances.meeting_id
    AND m.workspace_id = u.workspace_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
));
CREATE POLICY meeting_attendances_manager_update ON public.meeting_attendances
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = meeting_attendances.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = meeting_attendances.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
));
CREATE POLICY meeting_attendances_manager_delete ON public.meeting_attendances
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.meetings m
  WHERE m.id = meeting_attendances.meeting_id
    AND private.has_workspace_capability(auth.uid(), m.workspace_id, 'MEETING_MANAGE')
));

CREATE POLICY vendors_member_select ON public.vendors
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), workspace_id));
CREATE POLICY vendors_manager_insert ON public.vendors
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = building_id
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'VENDOR_MANAGE')
);
CREATE POLICY vendors_manager_update ON public.vendors
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'VENDOR_MANAGE'))
WITH CHECK (
  workspace_id = building_id
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'VENDOR_MANAGE')
);
CREATE POLICY vendors_manager_delete ON public.vendors
FOR DELETE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'VENDOR_MANAGE'));

CREATE POLICY work_orders_member_select ON public.work_orders
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), workspace_id));
CREATE POLICY work_orders_manager_insert ON public.work_orders
FOR INSERT TO authenticated
WITH CHECK (
  private.has_workspace_capability(auth.uid(), workspace_id, 'VENDOR_MANAGE')
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'TICKET_MANAGE')
);
CREATE POLICY work_orders_manager_update ON public.work_orders
FOR UPDATE TO authenticated
USING (
  private.has_workspace_capability(auth.uid(), workspace_id, 'VENDOR_MANAGE')
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'TICKET_MANAGE')
)
WITH CHECK (
  private.has_workspace_capability(auth.uid(), workspace_id, 'VENDOR_MANAGE')
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'TICKET_MANAGE')
);
CREATE POLICY work_orders_manager_delete ON public.work_orders
FOR DELETE TO authenticated
USING (
  private.has_workspace_capability(auth.uid(), workspace_id, 'VENDOR_MANAGE')
  OR private.has_workspace_capability(auth.uid(), workspace_id, 'TICKET_MANAGE')
);

CREATE POLICY knowledge_base_member_select ON public.knowledge_base_articles
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), workspace_id));
CREATE POLICY knowledge_base_manager_insert ON public.knowledge_base_articles
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = building_id
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE')
);
CREATE POLICY knowledge_base_manager_update ON public.knowledge_base_articles
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE'))
WITH CHECK (
  workspace_id = building_id
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE')
);
CREATE POLICY knowledge_base_manager_delete ON public.knowledge_base_articles
FOR DELETE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE'));

CREATE POLICY audit_logs_manager_select ON public.audit_logs
FOR SELECT TO authenticated
USING (
  workspace_id IS NOT NULL
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'AUDIT_READ')
);
-- No authenticated INSERT/UPDATE/DELETE policy or grant for legacy audit_logs.

CREATE POLICY subscriptions_billing_select ON public.subscriptions
FOR SELECT TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'BILLING_MANAGE'));
CREATE POLICY invoice_events_billing_select ON public.invoice_events
FOR SELECT TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'BILLING_MANAGE'));

CREATE POLICY push_subscriptions_self_select ON public.push_subscriptions
FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY push_subscriptions_self_insert ON public.push_subscriptions
FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY push_subscriptions_self_update ON public.push_subscriptions
FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY push_subscriptions_self_delete ON public.push_subscriptions
FOR DELETE TO authenticated USING (profile_id = auth.uid());

CREATE POLICY utility_reading_requests_member_select ON public.utility_reading_requests
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), building_id));
-- Provider request/token writes stay service-command-only. utility_provider_tokens
-- has no authenticated grant or policy in this cut-over.

CREATE POLICY noise_reports_member_select ON public.noise_reports
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), workspace_id));
CREATE POLICY noise_reports_member_insert ON public.noise_reports
FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND private.has_active_workspace_membership(auth.uid(), workspace_id)
);

CREATE POLICY waste_reports_member_select ON public.waste_reports
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), workspace_id));
CREATE POLICY waste_reports_manager_insert ON public.waste_reports
FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE')
);
CREATE POLICY waste_reports_manager_update ON public.waste_reports
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE'))
WITH CHECK (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE'));

CREATE POLICY illegal_dump_reports_member_select ON public.illegal_dump_reports
FOR SELECT TO authenticated
USING (private.has_active_workspace_membership(auth.uid(), workspace_id));
CREATE POLICY illegal_dump_reports_member_insert ON public.illegal_dump_reports
FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND private.has_active_workspace_membership(auth.uid(), workspace_id)
);
CREATE POLICY illegal_dump_reports_manager_update ON public.illegal_dump_reports
FOR UPDATE TO authenticated
USING (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE'))
WITH CHECK (private.has_workspace_capability(auth.uid(), workspace_id, 'COMMUNICATION_MANAGE'));

-- ---------------------------------------------------------------------------
-- Documents Storage: DB document metadata is the authoritative object mapping.
-- Upload is allowed only after a scoped documents row reserves the exact path.
-- No bucket-wide authenticated policy survives this migration.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001', MESSAGE = 'Storage objects table is unavailable',
      DETAIL = '{"error_code":"RLS_CUTOVER_PREFLIGHT_FAILED","check":"STORAGE_OBJECTS_REQUIRED"}';
  END IF;

  EXECUTE $policy$
    CREATE POLICY documents_authoritative_select
    ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'documents'
      AND EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.file_url = storage.objects.name
          AND private.has_workspace_capability(auth.uid(), d.workspace_id, 'DOCUMENT_READ')
      )
    )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY documents_authoritative_insert
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'documents'
      AND EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.file_url = storage.objects.name
          AND d.file_url LIKE ('workspace/' || d.workspace_id::text || '/documents/%')
          AND private.has_workspace_capability(auth.uid(), d.workspace_id, 'DOCUMENT_MANAGE')
      )
    )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY documents_authoritative_update
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'documents'
      AND EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.file_url = storage.objects.name
          AND private.has_workspace_capability(auth.uid(), d.workspace_id, 'DOCUMENT_MANAGE')
      )
    )
    WITH CHECK (
      bucket_id = 'documents'
      AND EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.file_url = storage.objects.name
          AND private.has_workspace_capability(auth.uid(), d.workspace_id, 'DOCUMENT_MANAGE')
      )
    )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY documents_authoritative_delete
    ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'documents'
      AND EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.file_url = storage.objects.name
          AND private.has_workspace_capability(auth.uid(), d.workspace_id, 'DOCUMENT_MANAGE')
      )
    )
  $policy$;
END;
$$;

COMMIT;
