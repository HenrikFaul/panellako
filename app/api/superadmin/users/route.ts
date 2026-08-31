import { NextRequest } from 'next/server';
import { adminJson } from '@/lib/superadmin/http';
import { requirePlatformRead } from '@/lib/superadmin/operator-authority';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_OFFSET = 10_000;
const MAX_SEARCH_LENGTH = 120;
const SEARCH_PATTERN = /^[\p{L}\p{N}\s@._+'-]*$/u;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBoundedInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number | null {
  if (value === null || value === '') return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function normalizeSearch(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  if (normalized.length > MAX_SEARCH_LENGTH || !SEARCH_PATTERN.test(normalized)) return null;
  return normalized;
}

function postgrestSearchPattern(search: string): string {
  return `%${search.replace(/_/g, '\\_')}%`;
}

function maskEmail(value: unknown): string {
  if (typeof value !== 'string') return '***';
  const normalized = value.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) return '***';

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const labels = domain.split('.');
  const domainName = labels.shift() ?? '';
  const suffix = labels.length > 0 ? `.${labels.join('.')}` : '';
  return `${local.slice(0, 1)}***@${domainName.slice(0, 1)}***${suffix}`;
}

function safeIso(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

function normalizeUser(value: unknown): UnknownRecord | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  const trialDays = typeof value.free_trial_days === 'number' && Number.isInteger(value.free_trial_days)
    ? Math.min(3_650, Math.max(1, value.free_trial_days))
    : 14;
  return {
    id: value.id,
    full_name: typeof value.full_name === 'string' ? value.full_name.slice(0, 300) : null,
    emailMasked: maskEmail(value.email),
    created_at: safeIso(value.created_at),
    free_trial_start: safeIso(value.free_trial_start),
    free_trial_days: trialDays,
    free_trial_never_expires: value.free_trial_never_expires === true,
  };
}

export async function GET(request: NextRequest) {
  const authority = await requirePlatformRead('platform.users.read_masked');
  if (!authority.ok) {
    return adminJson({ error: authority.errorCode }, authority.status);
  }

  const search = normalizeSearch(request.nextUrl.searchParams.get('search'));
  const limit = readBoundedInteger(request.nextUrl.searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = readBoundedInteger(request.nextUrl.searchParams.get('offset'), 0, 0, MAX_OFFSET);
  if (search === null || limit === null || offset === null) {
    return adminJson({ error: 'PLATFORM_USER_QUERY_INVALID' }, 400);
  }

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, created_at, free_trial_start, free_trial_days, free_trial_never_expires')
      .order('created_at', { ascending: false });

    if (search) {
      const pattern = postgrestSearchPattern(search);
      query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
    }

    const { data, error } = await query.range(offset, offset + limit);
    if (error) return adminJson({ error: 'PLATFORM_USERS_UNAVAILABLE' }, 503);

    const normalized = Array.isArray(data)
      ? data.map(normalizeUser).filter((row): row is UnknownRecord => row !== null)
      : [];
    const hasMore = normalized.length > limit;
    const users = normalized.slice(0, limit);
    return adminJson({
      users,
      pagination: {
        limit,
        offset,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
      },
    });
  } catch {
    return adminJson({ error: 'PLATFORM_USERS_UNAVAILABLE' }, 503);
  }
}
