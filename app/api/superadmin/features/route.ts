import { NextRequest } from 'next/server';
import { adminJson } from '@/lib/superadmin/http';
import {
  hasPlatformCapability,
  requirePlatformRead,
} from '@/lib/superadmin/operator-authority';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const MAX_OFFSET = 10_000;
const MAX_SEARCH_LENGTH = 120;
const SEARCH_PATTERN = /^[\p{L}\p{N}\s/.:_+'-]*$/u;
const MODULE_PATTERN = /^[a-z][a-z0-9_-]{0,99}$/;
const TIERS = new Set(['trial', 'alap', 'pro']);

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

function nullableText(value: unknown, maximum: number): string | null {
  return typeof value === 'string' ? value.slice(0, maximum) : null;
}

function normalizeFeature(value: unknown): UnknownRecord | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.feature_key !== 'string') return null;
  return {
    id: value.id,
    feature_key: value.feature_key.slice(0, 200),
    name: typeof value.name === 'string' ? value.name.slice(0, 200) : '',
    description: nullableText(value.description, 500),
    module: typeof value.module === 'string' ? value.module.slice(0, 100) : '',
    route_path: nullableText(value.route_path, 300),
    menu_path: nullableText(value.menu_path, 300),
    tier: typeof value.tier === 'string' && TIERS.has(value.tier) ? value.tier : 'trial',
    enabled: value.enabled === true,
    sort_order: typeof value.sort_order === 'number' && Number.isInteger(value.sort_order)
      ? Math.min(100_000, Math.max(-100_000, value.sort_order))
      : 0,
  };
}

export async function GET(request: NextRequest) {
  const authority = await requirePlatformRead('platform.features.read');
  const mayManage = hasPlatformCapability(authority.context, 'platform.features.manage');
  if (!authority.ok && !mayManage) {
    return adminJson({ error: authority.errorCode }, authority.status);
  }

  const search = normalizeSearch(request.nextUrl.searchParams.get('search'));
  const limit = readBoundedInteger(request.nextUrl.searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = readBoundedInteger(request.nextUrl.searchParams.get('offset'), 0, 0, MAX_OFFSET);
  const moduleFilter = request.nextUrl.searchParams.get('module')?.trim() ?? '';
  const tierFilter = request.nextUrl.searchParams.get('tier')?.trim() ?? '';
  if (
    search === null
    || limit === null
    || offset === null
    || (moduleFilter !== '' && !MODULE_PATTERN.test(moduleFilter))
    || (tierFilter !== '' && !TIERS.has(tierFilter))
  ) {
    return adminJson({ error: 'PLATFORM_FEATURE_QUERY_INVALID' }, 400);
  }

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('features')
      .select('id, feature_key, name, description, module, route_path, menu_path, tier, enabled, sort_order')
      .order('sort_order', { ascending: true });

    if (search) {
      const pattern = postgrestSearchPattern(search);
      query = query.or(`name.ilike.${pattern},feature_key.ilike.${pattern},route_path.ilike.${pattern}`);
    }
    if (moduleFilter) query = query.eq('module', moduleFilter);
    if (tierFilter) query = query.eq('tier', tierFilter);

    const { data, error } = await query.range(offset, offset + limit);
    if (error) return adminJson({ error: 'PLATFORM_FEATURES_UNAVAILABLE' }, 503);

    const normalized = Array.isArray(data)
      ? data.map(normalizeFeature).filter((row): row is UnknownRecord => row !== null)
      : [];
    const hasMore = normalized.length > limit;
    const features = normalized.slice(0, limit);
    return adminJson({
      features,
      pagination: {
        limit,
        offset,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
      },
    });
  } catch {
    return adminJson({ error: 'PLATFORM_FEATURES_UNAVAILABLE' }, 503);
  }
}
