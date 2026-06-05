-- v0.9.32: Status lifecycle audit trail
-- Add resolved_at to illegal_dump_reports.
-- resolved_at is set when status transitions to 'megoldva'.
-- It is NOT cleared on reopen — the first resolution timestamp is preserved as audit evidence.

ALTER TABLE public.illegal_dump_reports
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.illegal_dump_reports.resolved_at IS
  'Set when status first becomes ''megoldva''; never cleared on reopen (audit trail).';
