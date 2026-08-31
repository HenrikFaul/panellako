#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"
EXPECTED_MIGRATION_VERSION="${EXPECTED_MIGRATION_VERSION:-20260830140000}"
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
    ('20260830120000'),
    ('20260830130000'),
    ('20260830140000')
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
    ('address_source_aliases', '20260830120000'),
    ('platform_audit_events', '20260830130000'),
    ('platform_job_logs', '20260830130000'),
    ('platform_job_commands', '20260830130000'),
    ('platform_operator_roles', '20260830140000'),
    ('platform_operator_role_capabilities', '20260830140000'),
    ('platform_operator_assignments', '20260830140000'),
    ('platform_command_approvals', '20260830140000'),
    ('platform_support_sessions', '20260830140000'),
    ('platform_support_session_events', '20260830140000'),
    ('platform_release_attestations', '20260830140000')
  ) AS required(name, min_version)
  WHERE required.min_version <= '${EXPECTED_MIGRATION_VERSION}'
),
required_private_tables(name) AS (
  SELECT required.name
  FROM (VALUES
    ('platform_operator_action_rate_limits', '20260830140000'),
    ('platform_operator_action_receipts', '20260830140000')
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
    ('ensure_profile', '20260828120000'),
    ('get_my_buildings', '20260828120000'),
    ('list_my_join_requests', '20260828120000'),
    ('list_workspace_join_requests', '20260828120000'),
    ('list_workspace_members', '20260828120000'),
    ('normalize_address_key', '20260828120000'),
    ('record_reminder_send', '20260828120000'),
    ('validate_building_membership', '20260828120000'),
    ('activate_approved_community_creation_request', '20260828122000'),
    ('list_community_address_candidates', '20260828122000'),
    ('list_community_creation_requests', '20260828122000'),
    ('list_my_community_creation_requests', '20260828122000'),
    ('resolve_community_address_candidate', '20260828122000'),
    ('review_community_creation_request', '20260828122000'),
    ('accept_workspace_staff_invitation', '20260828123000'),
    ('issue_workspace_staff_invitation', '20260828123000'),
    ('cast_vote', '20260828125000'),
    ('list_meeting_voter_options', '20260828125000'),
    ('open_meeting_voting', '20260828125000'),
    ('record_meeting_attendance', '20260828125000'),
    ('remove_meeting_attendance', '20260828125000'),
    ('enqueue_announcement_delivery', '20260828127000'),
    ('replace_document_audience', '20260828128000'),
    ('create_management_agency', '20260828129000'),
    ('issue_agency_staff_invitation', '20260828129000'),
    ('accept_agency_staff_invitation', '20260828129000'),
    ('assign_agency_to_workspace', '20260828129000'),
    ('end_agency_portfolio_assignment', '20260828129000'),
    ('list_agency_portfolio', '20260828129000'),
    ('list_agency_staff', '20260828129000'),
    ('list_my_management_agencies', '20260828129000'),
    ('revoke_agency_staff_membership', '20260828129000'),
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
    ('create_community_creation_request_v2', '20260830120000'),
    ('expire_platform_job_commands', '20260830130000'),
    ('begin_platform_job_command', '20260830130000'),
    ('complete_platform_job_command', '20260830130000'),
    ('platform_job_command_contract_version', '20260830130000'),
    ('get_platform_operator_context', '20260830140000'),
    ('get_platform_payload_digest', '20260830140000'),
    ('prepare_platform_operator_grant_payload', '20260830140000'),
    ('create_platform_command_approval', '20260830140000'),
    ('decide_platform_command_approval', '20260830140000'),
    ('authorize_platform_action', '20260830140000'),
    ('bootstrap_first_platform_operator', '20260830140000'),
    ('grant_platform_operator_assignment', '20260830140000'),
    ('revoke_platform_operator_assignment', '20260830140000'),
    ('request_platform_support_session', '20260830140000'),
    ('decide_platform_support_session', '20260830140000'),
    ('revoke_platform_support_session', '20260830140000'),
    ('authorize_platform_support_action', '20260830140000'),
    ('attest_platform_release', '20260830140000'),
    ('update_platform_user_trial', '20260830140000'),
    ('update_platform_feature', '20260830140000'),
    ('update_platform_setting', '20260830140000'),
    ('resolve_platform_community_address_candidate', '20260830140000'),
    ('review_platform_community_creation_request', '20260830140000'),
    ('expire_platform_support_sessions', '20260830140000')
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
missing_private_tables AS (
  SELECT r.name
  FROM required_private_tables r
  WHERE to_regclass(format('private.%I', r.name)) IS NULL
),
missing_functions AS (
  SELECT r.name
  FROM required_functions r
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = r.name AND p.prokind = 'f'
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
),
platform_command_rpc_contract AS (
  SELECT bool_and(
    p.oid IS NOT NULL
    AND p.prokind = 'f'
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND has_function_privilege('service_role', p.oid, 'EXECUTE')
  ) AS ok
  FROM (VALUES
    ('public.expire_platform_job_commands()'),
    ('public.begin_platform_job_command(text,text,text,uuid,text,integer,jsonb)'),
    ('public.complete_platform_job_command(uuid,text,jsonb,text)'),
    ('public.platform_job_command_contract_version()')
  ) AS expected(signature)
  LEFT JOIN pg_proc p ON p.oid = to_regprocedure(expected.signature)
),
platform_authority_rpc_contract AS (
  SELECT bool_and(
    p.oid IS NOT NULL
    AND p.prokind = 'f'
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    AND CASE expected.access_mode
      WHEN 'authenticated' THEN
        has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
      WHEN 'service_role' THEN
        NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND has_function_privilege('service_role', p.oid, 'EXECUTE')
      ELSE false
    END
  ) AS ok
  FROM (VALUES
    ('public.get_platform_operator_context()', 'authenticated'),
    ('public.get_platform_payload_digest(jsonb)', 'authenticated'),
    ('public.prepare_platform_operator_grant_payload(uuid,text,timestamptz,timestamptz,text)', 'authenticated'),
    ('public.create_platform_command_approval(text,text,text,text,jsonb,text,uuid,interval)', 'authenticated'),
    ('public.decide_platform_command_approval(uuid,text,text,text)', 'authenticated'),
    ('public.authorize_platform_action(uuid,text,jsonb,uuid)', 'authenticated'),
    ('public.bootstrap_first_platform_operator(uuid,text,text)', 'service_role'),
    ('public.grant_platform_operator_assignment(uuid,text,timestamptz,timestamptz,text,uuid,text,uuid)', 'authenticated'),
    ('public.revoke_platform_operator_assignment(uuid,text,uuid,text,uuid)', 'authenticated'),
    ('public.request_platform_support_session(text,uuid,uuid,text[],text,text,uuid,interval)', 'authenticated'),
    ('public.decide_platform_support_session(uuid,text,text)', 'authenticated'),
    ('public.revoke_platform_support_session(uuid,text,uuid,text)', 'authenticated'),
    ('public.authorize_platform_support_action(uuid,text,uuid,uuid)', 'authenticated'),
    ('public.attest_platform_release(text,text,text,text,text,text,text,text,uuid,text,uuid)', 'authenticated'),
    ('public.update_platform_user_trial(uuid,timestamptz,integer,boolean,text,uuid)', 'authenticated'),
    ('public.update_platform_feature(uuid,jsonb,text,uuid,text)', 'authenticated'),
    ('public.update_platform_setting(text,jsonb,text,uuid,text)', 'authenticated'),
    ('public.resolve_platform_community_address_candidate(uuid,uuid,text,text,jsonb,uuid,text)', 'authenticated'),
    ('public.review_platform_community_creation_request(uuid,text,text,text,jsonb,uuid,text)', 'authenticated'),
    ('public.expire_platform_support_sessions()', 'service_role')
  ) AS expected(signature, access_mode)
  LEFT JOIN pg_proc p ON p.oid = to_regprocedure(expected.signature)
)
SELECT
  NOT EXISTS (SELECT 1 FROM missing_versions) AS migration_history_ok,
  NOT EXISTS (SELECT 1 FROM missing_tables) AS required_tables_ok,
  NOT EXISTS (SELECT 1 FROM missing_private_tables) AS required_private_tables_ok,
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
          'prevent_community_address_snapshot_change',
          'platform_payload_digest',
          'platform_utc_iso',
          'platform_operator_grant_payload',
          'require_platform_payload_digest',
          'platform_current_assurance',
          'platform_operator_has_capability',
          'require_platform_operator_capability',
          'lock_platform_operator_action',
          'platform_operator_action_replay',
          'store_platform_operator_action_receipt',
          'consume_platform_operator_action_quota',
          'enforce_platform_operator_action_quota',
          'append_platform_operator_audit',
          'reject_platform_append_only_mutation',
          'guard_platform_support_session_transition',
          'consume_platform_command_approval',
          'guard_platform_controlled_mutation',
          'guard_profile_trial_mutation'
        )
        AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
    )
  ) AS service_role_private_access_ok,
  (
    SELECT
      commands.legacy_community_request IS NOT NULL
      AND NOT has_function_privilege('anon', commands.legacy_community_request, 'EXECUTE')
      -- Phase 1 is deliberately backward-compatible with the currently
      -- deployed client. A later closure migration flips this assertion only
      -- after the v2 hosted onboarding smoke passes.
      AND has_function_privilege('authenticated', commands.legacy_community_request, 'EXECUTE')
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
  (
    '${EXPECTED_MIGRATION_VERSION}' < '20260830130000'
    OR COALESCE((SELECT ok FROM platform_command_rpc_contract), false)
  ) AS platform_command_privileges_ok,
  (
    '${EXPECTED_MIGRATION_VERSION}' < '20260830140000'
    OR NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'private'
        AND p.proname IN (
          'platform_payload_digest',
          'platform_utc_iso',
          'platform_operator_grant_payload',
          'require_platform_payload_digest',
          'platform_current_assurance',
          'platform_operator_has_capability',
          'require_platform_operator_capability',
          'lock_platform_operator_action',
          'platform_operator_action_replay',
          'store_platform_operator_action_receipt',
          'consume_platform_operator_action_quota',
          'enforce_platform_operator_action_quota',
          'append_platform_operator_audit',
          'reject_platform_append_only_mutation',
          'guard_platform_support_session_transition',
          'consume_platform_command_approval',
          'guard_platform_controlled_mutation',
          'guard_profile_trial_mutation'
        )
        AND (
          has_function_privilege('anon', p.oid, 'EXECUTE')
          OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
          OR has_function_privilege('service_role', p.oid, 'EXECUTE')
        )
    )
  ) AS platform_private_helpers_locked_ok,
  (
    '${EXPECTED_MIGRATION_VERSION}' < '20260830140000'
    OR (
      COALESCE((SELECT ok FROM platform_authority_rpc_contract), false)
      AND EXISTS (
        SELECT 1 FROM public.platform_operator_role_capabilities
        WHERE role_key = 'PLATFORM_OBSERVER' AND capability_key = 'platform.features.read'
      )
      AND EXISTS (
        SELECT 1 FROM public.platform_operator_role_capabilities
        WHERE role_key = 'PLATFORM_ADMIN' AND capability_key = 'platform.features.read'
      )
      AND EXISTS (
        SELECT 1 FROM public.platform_operator_role_capabilities
        WHERE role_key = 'PLATFORM_ADMIN' AND capability_key = 'platform.users.read_masked'
      )
    )
  ) AS platform_authority_contract_ok,
  COALESCE((SELECT json_agg(version ORDER BY version) FROM missing_versions), '[]'::json) AS missing_versions,
  COALESCE((SELECT json_agg(name ORDER BY name) FROM missing_tables), '[]'::json) AS missing_tables,
  COALESCE((SELECT json_agg(name ORDER BY name) FROM missing_private_tables), '[]'::json) AS missing_private_tables,
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
  .[0].required_private_tables_ok == true and
  .[0].required_functions_ok == true and
  .[0].required_rls_ok == true and
  .[0].workspace_backfill_ok == true and
  .[0].service_role_private_access_ok == true and
  .[0].address_command_privileges_ok == true and
  .[0].platform_command_privileges_ok == true and
  .[0].platform_private_helpers_locked_ok == true and
  .[0].platform_authority_contract_ok == true
' "$RESPONSE_BODY" > /dev/null

echo "✅ Production multitenancy verification PASS."
