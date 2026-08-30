#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"
EXPECTED_MIGRATION_VERSION="${EXPECTED_MIGRATION_VERSION:-20260830120000}"
if [[ ! "$EXPECTED_MIGRATION_VERSION" =~ ^[0-9]{14}$ ]]; then
  echo "❌ EXPECTED_MIGRATION_VERSION must be a 14-digit migration timestamp."
  exit 1
fi

QUERY_FILE=$(mktemp)
REQUEST_BODY=$(mktemp)
RESPONSE_BODY=$(mktemp)
trap 'rm -f "$QUERY_FILE" "$REQUEST_BODY" "$RESPONSE_BODY"' EXIT

cat > "$QUERY_FILE" <<SQL
WITH
expected_versions(version) AS (
  SELECT expected.version
  FROM (VALUES
    ('20260828120000'),
    ('20260828121000'),
    ('20260828122000'),
    ('20260828123000'),
    ('20260828124000'),
    ('20260828125000'),
    ('20260828126000'),
    ('20260828127000'),
    ('20260828128000'),
    ('20260828129000'),
    ('20260828130000'),
    ('20260829100000'),
    ('20260829110000'),
    ('20260829120000'),
    ('20260829130000'),
    ('20260829140000'),
    ('20260829150000'),
    ('20260830120000')
  ) AS expected(version)
  WHERE expected.version <= '${EXPECTED_MIGRATION_VERSION}'
),
required_tables(name) AS (
  SELECT required.name
  FROM (VALUES
    ('workspaces', '20260828120000'),
    ('addresses', '20260828120000'),
    ('physical_buildings', '20260828120000'),
    ('building_address_assignments', '20260828120000'),
    ('workspace_buildings', '20260828120000'),
    ('parties', '20260828120000'),
    ('people', '20260828120000'),
    ('organizations', '20260828120000'),
    ('person_account_links', '20260828120000'),
    ('management_agency_details', '20260828120000'),
    ('organization_memberships', '20260828120000'),
    ('workspace_memberships', '20260828120000'),
    ('membership_periods', '20260828120000'),
    ('role_templates', '20260828120000'),
    ('role_capabilities', '20260828120000'),
    ('capability_key_map', '20260828120000'),
    ('management_mandates', '20260828120000'),
    ('delegations', '20260828120000'),
    ('role_assignments', '20260828120000'),
    ('unit_relations', '20260828120000'),
    ('billing_groups', '20260828120000'),
    ('billing_group_members', '20260828120000'),
    ('unit_ownerships', '20260828120000'),
    ('unit_legal_rights', '20260828120000'),
    ('unit_occupancies', '20260828120000'),
    ('membership_invitations', '20260828120000'),
    ('join_requests', '20260828120000'),
    ('join_request_offers', '20260828120000'),
    ('community_creation_requests', '20260828120000'),
    ('community_creation_attestations', '20260828120000'),
    ('authorization_audit_events', '20260828120000'),
    ('command_idempotency_keys', '20260828120000'),
    ('community_creation_reviews', '20260828122000'),
    ('community_address_duplicate_resolutions', '20260828122000'),
    ('workspace_staff_invitations', '20260828123000'),
    ('document_units', '20260828124000'),
    ('announcement_delivery_outbox', '20260828127000'),
    ('agency_staff_invitations', '20260828129000'),
    ('agency_portfolio_assignments', '20260828129000'),
    ('agency_workspace_grants', '20260828129000'),
    ('workspace_person_relationship_commands', '20260829110000'),
    ('unit_relationship_status_events', '20260829110000'),
    ('workspace_membership_status_events', '20260829110000'),
    ('join_request_evidence_events', '20260829130000'),
    ('workspace_unit_imports', '20260829140000'),
    ('address_registry_identities', '20260830120000'),
    ('address_source_aliases', '20260830120000')
  ) AS required(name, min_version)
  WHERE required.min_version <= '${EXPECTED_MIGRATION_VERSION}'
),
required_functions(name) AS (
  SELECT required.name
  FROM (VALUES
    ('search_address_candidates', '20260828120000'),
    ('search_joinable_communities', '20260828120000'),
    ('list_joinable_units', '20260828120000'),
    ('get_my_workspaces', '20260828120000'),
    ('get_workspace_context', '20260828120000'),
    ('submit_join_request', '20260828120000'),
    ('accept_join_request_offer', '20260828120000'),
    ('create_community_creation_request', '20260828120000'),
    ('create_workspace_unit', '20260828120000'),
    ('issue_membership_invitation', '20260828120000'),
    ('accept_membership_invitation', '20260828120000'),
    ('review_join_request', '20260828120000'),
    ('grant_workspace_role', '20260828120000'),
    ('revoke_workspace_role', '20260828120000'),
    ('create_management_agency', '20260828129000'),
    ('issue_agency_staff_invitation', '20260828129000'),
    ('accept_agency_staff_invitation', '20260828129000'),
    ('assign_agency_to_workspace', '20260828129000'),
    ('claim_announcement_delivery_batch', '20260828130000'),
    ('complete_announcement_delivery', '20260828130000'),
    ('fail_announcement_delivery', '20260828130000'),
    ('cancel_announcement_delivery', '20260828130000'),
    ('create_workspace_person_relationship', '20260829110000'),
    ('list_workspace_unit_relationships', '20260829110000'),
    ('review_workspace_unit_relationship', '20260829110000'),
    ('change_workspace_membership_status', '20260829110000'),
    ('resolve_workspace_push_recipients', '20260829120000'),
    ('revoke_membership_invitation', '20260829130000'),
    ('cancel_join_request', '20260829130000'),
    ('resubmit_join_request_evidence', '20260829130000'),
    ('preview_workspace_unit_import', '20260829140000'),
    ('apply_workspace_unit_import', '20260829140000'),
    ('consume_address_lookup_quota', '20260830120000'),
    ('consume_community_request_quota', '20260830120000'),
    ('upsert_user_reference_address_v2', '20260830120000'),
    ('create_community_creation_request_v2', '20260830120000')
  ) AS required(name, min_version)
  WHERE required.min_version <= '${EXPECTED_MIGRATION_VERSION}'
),
missing_versions AS (
  SELECT e.version
  FROM expected_versions e
  LEFT JOIN supabase_migrations.schema_migrations m USING (version)
  WHERE m.version IS NULL
),
missing_tables AS (
  SELECT r.name
  FROM required_tables r
  WHERE to_regclass(format('public.%I', r.name)) IS NULL
),
missing_functions AS (
  SELECT r.name
  FROM required_functions r
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = r.name
  )
),
rls_disabled AS (
  SELECT r.name
  FROM required_tables r
  JOIN pg_class c ON c.relname = r.name
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  WHERE NOT c.relrowsecurity
),
-- Legacy audit rows are deliberately excluded from the backfill gate. The
-- cutover policy makes NULL-scoped rows invisible and the table is append-only
-- for authenticated users, so guessing a tenant would corrupt audit history.
nullable_workspace_rows AS (
  SELECT 'announcements' AS table_name, count(*) AS row_count FROM public.announcements WHERE workspace_id IS NULL
  UNION ALL SELECT 'notifications', count(*) FROM public.notifications WHERE workspace_id IS NULL
  UNION ALL SELECT 'tickets', count(*) FROM public.tickets WHERE workspace_id IS NULL
  UNION ALL SELECT 'meter_readings', count(*) FROM public.meter_readings WHERE workspace_id IS NULL
  UNION ALL SELECT 'documents', count(*) FROM public.documents WHERE workspace_id IS NULL
  UNION ALL SELECT 'finance_entries', count(*) FROM public.finance_entries WHERE workspace_id IS NULL
  UNION ALL SELECT 'meetings', count(*) FROM public.meetings WHERE workspace_id IS NULL
  UNION ALL SELECT 'vendors', count(*) FROM public.vendors WHERE workspace_id IS NULL
  UNION ALL SELECT 'work_orders', count(*) FROM public.work_orders WHERE workspace_id IS NULL
  UNION ALL SELECT 'knowledge_base_articles', count(*) FROM public.knowledge_base_articles WHERE workspace_id IS NULL
  UNION ALL SELECT 'subscriptions', count(*) FROM public.subscriptions WHERE workspace_id IS NULL
  UNION ALL SELECT 'invoice_events', count(*) FROM public.invoice_events WHERE workspace_id IS NULL
  UNION ALL SELECT 'reminder_rules', count(*) FROM public.reminder_rules WHERE workspace_id IS NULL
),
address_command_oids AS (
  SELECT
    to_regprocedure(
      'public.create_community_creation_request(text,text,text,integer,text,uuid)'
    ) AS legacy_community_request,
    to_regprocedure(
      'public.upsert_user_reference_address_v2(uuid,text,double precision,double precision,text,text,text,text,text,text,text,text,text,uuid,text,text,text,text,text,numeric,text,timestamp with time zone)'
    ) AS reference_address_v2,
    to_regprocedure(
      'public.create_community_creation_request_v2(uuid,text,text,text,integer,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,numeric,numeric,uuid,text,text,numeric,text,text,text)'
    ) AS community_request_v2
)
SELECT
  NOT EXISTS (SELECT 1 FROM missing_versions) AS migration_history_ok,
  NOT EXISTS (SELECT 1 FROM missing_tables) AS required_tables_ok,
  NOT EXISTS (SELECT 1 FROM missing_functions) AS required_functions_ok,
  NOT EXISTS (SELECT 1 FROM rls_disabled) AS required_rls_ok,
  NOT EXISTS (SELECT 1 FROM nullable_workspace_rows WHERE row_count > 0) AS workspace_backfill_ok,
  (
    has_schema_privilege('service_role', 'private', 'USAGE')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'private'
        -- These v0.10.6 helpers are invoked only by database triggers. Direct
        -- service-role execution is neither needed nor intentionally granted.
        AND p.proname NOT IN (
          'prevent_untrusted_reference_registry_provenance',
          'prevent_community_address_snapshot_change'
        )
        AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
    )
  ) AS service_role_private_access_ok,
  (
    SELECT
      commands.legacy_community_request IS NOT NULL
      AND NOT has_function_privilege('anon', commands.legacy_community_request, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', commands.legacy_community_request, 'EXECUTE')
      AND commands.reference_address_v2 IS NOT NULL
      AND NOT has_function_privilege('anon', commands.reference_address_v2, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', commands.reference_address_v2, 'EXECUTE')
      AND has_function_privilege('service_role', commands.reference_address_v2, 'EXECUTE')
      AND commands.community_request_v2 IS NOT NULL
      AND NOT has_function_privilege('anon', commands.community_request_v2, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', commands.community_request_v2, 'EXECUTE')
      AND has_function_privilege('service_role', commands.community_request_v2, 'EXECUTE')
    FROM address_command_oids commands
  ) AS address_command_privileges_ok,
  COALESCE((SELECT json_agg(version ORDER BY version) FROM missing_versions), '[]'::json) AS missing_versions,
  COALESCE((SELECT json_agg(name ORDER BY name) FROM missing_tables), '[]'::json) AS missing_tables,
  COALESCE((SELECT json_agg(name ORDER BY name) FROM missing_functions), '[]'::json) AS missing_functions,
  COALESCE((SELECT json_agg(name ORDER BY name) FROM rls_disabled), '[]'::json) AS rls_disabled,
  COALESCE((SELECT json_agg(json_build_object('table', table_name, 'rows', row_count))
            FROM nullable_workspace_rows WHERE row_count > 0), '[]'::json) AS nullable_workspace_rows,
  (SELECT count(*) FROM public.audit_logs WHERE workspace_id IS NULL) AS legacy_unscoped_audit_rows;
SQL

jq -n --rawfile sql "$QUERY_FILE" \
  '{"query": $sql, "read_only": true}' > "$REQUEST_BODY"

HTTP_CODE=$(curl --silent --show-error \
  --output "$RESPONSE_BODY" \
  --write-out "%{http_code}" \
  -X POST "https://api.supabase.com/v1/projects/wzromwxpjlyrqbdiapep/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@$REQUEST_BODY")

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "❌ Production verification query failed (HTTP $HTTP_CODE)."
  exit 1
fi

jq -e '
  .[0].migration_history_ok == true and
  .[0].required_tables_ok == true and
  .[0].required_functions_ok == true and
  .[0].required_rls_ok == true and
  .[0].workspace_backfill_ok == true and
  .[0].service_role_private_access_ok == true and
  .[0].address_command_privileges_ok == true
' "$RESPONSE_BODY" > /dev/null

echo "✅ Production multitenancy verification PASS."
