-- Migration: 20260516_fix_rls_missing_policies.sql
-- Purpose: Add missing INSERT/UPDATE RLS policies.
-- These tables had SELECT policies but no INSERT/UPDATE, causing silent write failures.

-- vendors: managers register vendors
drop policy if exists "Public insert vendors" on vendors;
create policy "Public insert vendors" on vendors
  for insert with check (true);

drop policy if exists "Public update vendors" on vendors;
create policy "Public update vendors" on vendors
  for update using (true) with check (true);

-- push_subscriptions: users manage their own push subscriptions
-- (upsert support needs UPDATE in addition to existing policy)
drop policy if exists "User update own push subscriptions" on push_subscriptions;
create policy "User update own push subscriptions" on push_subscriptions
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- knowledge_base_articles: managers create KB articles
drop policy if exists "Public insert knowledge base" on knowledge_base_articles;
create policy "Public insert knowledge base" on knowledge_base_articles
  for insert with check (true);

drop policy if exists "Public update knowledge base" on knowledge_base_articles;
create policy "Public update knowledge base" on knowledge_base_articles
  for update using (true) with check (true);

-- audit_logs: allow updates (needed for soft-delete / metadata enrichment)
drop policy if exists "Public update audit logs" on audit_logs;
create policy "Public update audit logs" on audit_logs
  for update using (true) with check (true);
