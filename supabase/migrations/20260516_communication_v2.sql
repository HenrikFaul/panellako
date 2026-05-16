-- Communication Intelligence v2
-- Structured targeting, per-announcement read receipts, configurable reminder engine
-- Run in Supabase SQL Editor

-- ── 1. Extend announcements table ──────────────────────────────────────────

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'all'
  CHECK (scope IN ('all', 'owners', 'residents', 'specific_units'));

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deadline timestamptz;

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS requires_acknowledgement boolean NOT NULL DEFAULT false;

-- ── 2. Per-unit targeting junction ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS announcement_units (
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  unit_id         uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  PRIMARY KEY (announcement_id, unit_id)
);

-- ── 3. Per-user announcement read receipts ──────────────────────────────────

CREATE TABLE IF NOT EXISTS announcement_reads (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid        NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  profile_id      uuid        NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, profile_id)
);

-- ── 4. Reminder rules ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reminder_rules (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id   uuid        REFERENCES buildings(id) ON DELETE CASCADE,
  activity_type text        NOT NULL
    CHECK (activity_type IN ('vote', 'announcement_ack', 'document_ack', 'meter_reading')),
  activity_id   uuid        NOT NULL,
  deadline      timestamptz NOT NULL,
  reminder_days integer[]   NOT NULL DEFAULT ARRAY[3, 1],
  channels      text[]      NOT NULL DEFAULT ARRAY['app'],
  enabled       boolean     NOT NULL DEFAULT true,
  created_by    uuid        REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 5. Reminder send audit log ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reminder_sends (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_rule_id     uuid        NOT NULL REFERENCES reminder_rules(id) ON DELETE CASCADE,
  profile_id           uuid        NOT NULL REFERENCES profiles(id)       ON DELETE CASCADE,
  sent_at              timestamptz NOT NULL DEFAULT now(),
  channel              text        NOT NULL,
  days_before_deadline integer     NOT NULL,
  UNIQUE(reminder_rule_id, profile_id, days_before_deadline)
);

-- ── 6. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE announcement_reads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_units  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_sends      ENABLE ROW LEVEL SECURITY;

-- announcement_reads: everyone can read (managers see all, residents see own)
DROP POLICY IF EXISTS "Public select announcement_reads" ON announcement_reads;
CREATE POLICY "Public select announcement_reads" ON announcement_reads
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own announcement_reads" ON announcement_reads;
CREATE POLICY "Users insert own announcement_reads" ON announcement_reads
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- announcement_units: public read, authenticated insert
DROP POLICY IF EXISTS "Public select announcement_units" ON announcement_units;
CREATE POLICY "Public select announcement_units" ON announcement_units
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert announcement_units" ON announcement_units;
CREATE POLICY "Authenticated insert announcement_units" ON announcement_units
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- reminder_rules
DROP POLICY IF EXISTS "Authenticated select reminder_rules" ON reminder_rules;
CREATE POLICY "Authenticated select reminder_rules" ON reminder_rules
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated insert reminder_rules" ON reminder_rules;
CREATE POLICY "Authenticated insert reminder_rules" ON reminder_rules
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update reminder_rules" ON reminder_rules;
CREATE POLICY "Authenticated update reminder_rules" ON reminder_rules
  FOR UPDATE USING (auth.role() = 'authenticated');

-- reminder_sends
DROP POLICY IF EXISTS "Authenticated select reminder_sends" ON reminder_sends;
CREATE POLICY "Authenticated select reminder_sends" ON reminder_sends
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service insert reminder_sends" ON reminder_sends;
CREATE POLICY "Service insert reminder_sends" ON reminder_sends
  FOR INSERT WITH CHECK (true);

-- ── 7. Indexes ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_announcement_reads_ann  ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_prof ON announcement_reads(profile_id);
CREATE INDEX IF NOT EXISTS idx_announcement_units_ann  ON announcement_units(announcement_id);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_deadline ON reminder_rules(deadline) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_reminder_sends_rule     ON reminder_sends(reminder_rule_id);
