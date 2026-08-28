#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"

QUERY_FILE=$(mktemp)
REQUEST_BODY=$(mktemp)
trap 'rm -f "$QUERY_FILE" "$REQUEST_BODY"' EXIT

cat > "$QUERY_FILE" <<'SQL'
WITH
expected_versions(version) AS (
  VALUES
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
    ('20260829100000')
),
required_tables(name) AS (
  VALUES
    ('workspaces'),
    ('addresses'),
    ('physical_buildings'),
    ('building_address_assignments'),
    ('workspace_buildings'),
    ('parties'),
    ('people'),
    ('organizations'),
    ('person_account_links'),
    ('management_agency_details'),
    ('organization_memberships'),
    ('workspace_memberships'),
    ('membership_periods'),
    ('role_templates'),
    ('role_capabilities'),
    ('capability_key_map'),
    ('management_mandates'),
    ('delegations'),
    ('role_assignments'),
    ('unit_relations'),
    ('billing_groups'),
    ('billing_group_members'),
    ('unit_ownerships'),
    ('unit_legal_rights'),
    ('unit_occupancies'),
    ('membership_invitations'),
    ('join_requests'),
    ('join_request_offers'),
    ('community_creation_requests'),
    ('community_creation_attestations'),
    ('authorization_audit_events'),
    ('command_idempotency_keys'),
    ('community_creation_reviews'),
    ('community_address_duplicate_resolutions'),
    ('workspace_staff_invitations'),
    ('document_units'),
    ('announcement_delivery_outbox'),
    ('agency_staff_invitations'),
    ('agency_portfolio_assignments'),
    ('agency_workspace_grants')
),
required_functions(name) AS (
  VALUES
    ('search_address_candidates'),
    ('search_joinable_communities'),
    ('list_joinable_units'),
    ('get_my_workspaces'),
    ('get_workspace_context'),
    ('submit_join_request'),
    ('accept_join_request_offer'),
    ('create_community_creation_request'),
    ('create_workspace_unit'),
    ('issue_membership_invitation'),
    ('accept_membership_invitation'),
    ('review_join_request'),
    ('grant_workspace_role'),
    ('revoke_workspace_role'),
    ('create_management_agency'),
    ('issue_agency_staff_invitation'),
    ('accept_agency_staff_invitation'),
    ('assign_agency_to_workspace'),
    ('claim_announcement_delivery_batch'),
    ('complete_announcement_delivery'),
    ('fail_announcement_delivery'),
    ('cancel_announcement_delivery')
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
        AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
    )
  ) AS service_role_private_access_ok,
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

RESPONSE=$(curl --silent --show-error --write-out "\n%{http_code}" \
  -X POST "https://api.supabase.com/v1/projects/wzromwxpjlyrqbdiapep/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@$REQUEST_BODY")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "❌ Production verification query failed (HTTP $HTTP_CODE)."
  exit 1
fi

echo "$BODY" | jq .
echo "$BODY" | jq -e '
  .[0].migration_history_ok == true and
  .[0].required_tables_ok == true and
  .[0].required_functions_ok == true and
  .[0].required_rls_ok == true and
  .[0].workspace_backfill_ok == true and
  .[0].service_role_private_access_ok == true
' > /dev/null

echo "✅ Production multitenancy verification PASS."
