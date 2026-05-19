-- Job execution log — written by /api/superadmin/jobs/run on every manual or cron trigger
CREATE TABLE IF NOT EXISTS public.platform_job_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       TEXT        NOT NULL,
  triggered_by TEXT        NOT NULL DEFAULT 'manual',
  status       TEXT        NOT NULL DEFAULT 'running'
                           CHECK (status IN ('running', 'ok', 'error', 'partial')),
  result       JSONB,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_platform_job_logs_started
  ON public.platform_job_logs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_job_logs_job_started
  ON public.platform_job_logs (job_id, started_at DESC);

ALTER TABLE public.platform_job_logs ENABLE ROW LEVEL SECURITY;
-- No public policies — only service-role server-side access
