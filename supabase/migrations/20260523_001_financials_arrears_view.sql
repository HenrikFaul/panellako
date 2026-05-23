-- ============================================================
-- PanelLakó Financial Ledger — arrears view with aging brackets
-- Migration: 20260523_001_financials_arrears_view.sql
-- ============================================================

-- Ensure new columns exist on finance_entries (schema.sql already adds these,
-- but this migration makes them available for fresh installs where schema.sql
-- might lag behind).
ALTER TABLE finance_entries
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'charge'
    CHECK (entry_type IN ('charge','payment','adjustment','opening_balance')),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Drop old view (schema.sql version lacks aging brackets)
DROP VIEW IF EXISTS building_arrears_view CASCADE;

-- Recreate building_arrears_view with aging brackets
CREATE OR REPLACE VIEW building_arrears_view AS
SELECT
  u.id           AS unit_id,
  u.building_id,
  u.unit_label,
  u.owner_name,
  COALESCE(SUM(fe.expected_amount - fe.paid_amount), 0)::numeric AS total_arrears,
  COALESCE(SUM(
    CASE WHEN fe.due_date >= CURRENT_DATE - INTERVAL '30 days'
    THEN fe.expected_amount - fe.paid_amount ELSE 0 END
  ), 0)::numeric AS arrears_0_30,
  COALESCE(SUM(
    CASE WHEN fe.due_date < CURRENT_DATE - INTERVAL '30 days'
          AND fe.due_date >= CURRENT_DATE - INTERVAL '60 days'
    THEN fe.expected_amount - fe.paid_amount ELSE 0 END
  ), 0)::numeric AS arrears_31_60,
  COALESCE(SUM(
    CASE WHEN fe.due_date < CURRENT_DATE - INTERVAL '60 days'
    THEN fe.expected_amount - fe.paid_amount ELSE 0 END
  ), 0)::numeric AS arrears_over_60,
  MAX(fe.due_date) AS latest_due_date,
  COUNT(CASE WHEN fe.expected_amount > fe.paid_amount THEN 1 END) AS unpaid_periods
FROM units u
LEFT JOIN finance_entries fe
  ON fe.unit_id = u.id
  AND fe.entry_type = 'charge'
  AND fe.expected_amount > fe.paid_amount
GROUP BY u.id, u.building_id, u.unit_label, u.owner_name;

-- Recreate unit_balance_view (was dropped by CASCADE above)
DROP VIEW IF EXISTS unit_balance_view;
CREATE VIEW unit_balance_view AS
SELECT
  u.id AS unit_id,
  u.building_id,
  u.unit_label,
  u.owner_name,
  u.unit_type,
  u.balance_amount AS cached_balance,
  COALESCE(SUM(CASE WHEN fe.entry_type IN ('charge','opening_balance') THEN fe.expected_amount ELSE 0 END), 0) AS total_charged,
  COALESCE(SUM(CASE WHEN fe.entry_type = 'payment' THEN fe.paid_amount ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(
    CASE
      WHEN fe.entry_type IN ('charge','opening_balance') THEN fe.expected_amount
      WHEN fe.entry_type = 'payment'                    THEN -fe.paid_amount
      WHEN fe.entry_type = 'adjustment'                 THEN fe.expected_amount - fe.paid_amount
      ELSE 0
    END
  ), 0) AS computed_balance,
  COUNT(fe.id) AS entry_count
FROM units u
LEFT JOIN finance_entries fe ON fe.unit_id = u.id
GROUP BY u.id, u.building_id, u.unit_label, u.owner_name, u.unit_type, u.balance_amount;
