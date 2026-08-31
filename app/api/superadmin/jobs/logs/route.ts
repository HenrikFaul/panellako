import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { adminJson } from '@/lib/superadmin/http';
import { requirePlatformRead } from '@/lib/superadmin/operator-authority';

export const dynamic = 'force-dynamic';

const SENSITIVE_FIELD = /(authorization|cookie|secret|token|password|credential|api[_-]?key|recipient|email|phone|command|sql|error|message|detail)/i;

function safeResult(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 240 ? `${value.slice(0, 240)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 20).map(item => safeResult(item, depth + 1));
  if (!value || typeof value !== 'object') return null;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 30)
      .map(([key, item]) => [
        key,
        SENSITIVE_FIELD.test(key) ? '[redacted]' : safeResult(item, depth + 1),
      ]),
  );
}

export async function GET(request: NextRequest) {
  const authority = await requirePlatformRead('platform.jobs.read');
  if (!authority.ok) return adminJson({ error: authority.errorCode }, authority.status);

  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? '30');
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
    return adminJson({ error: 'INVALID_LIMIT' }, 400);
  }
  const limit = Math.min(requestedLimit, 100);
  const rawJobId = request.nextUrl.searchParams.get('job')?.trim();
  if (rawJobId && !/^[a-z0-9_-]{1,80}$/i.test(rawJobId)) {
    return adminJson({ error: 'INVALID_JOB' }, 400);
  }

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('platform_job_logs')
      .select('id, job_id, triggered_by, status, result, started_at, finished_at')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (rawJobId) query = query.eq('job_id', rawJobId);

    const { data, error } = await query;
    if (error) return adminJson({ error: 'JOB_LOGS_UNAVAILABLE' }, 503);
    const logs = (data ?? []).map(row => ({
      ...row,
      triggered_by: row.triggered_by ? 'operator' : 'system',
      result: safeResult(row.result),
    }));
    return adminJson({ logs });
  } catch {
    return adminJson({ error: 'JOB_LOGS_UNAVAILABLE' }, 503);
  }
}
