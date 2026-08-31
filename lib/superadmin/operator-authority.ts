import 'server-only';

import type { User } from '@supabase/supabase-js';
import { getLegacySuperadminSession } from '@/lib/superadmin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type PlatformAssuranceLevel = 'aal1' | 'aal2' | null;
export type PlatformAuthorityMode = 'operator' | 'bootstrap' | 'break_glass' | 'none';

export interface PlatformSupportSessionSummary {
  id: string;
  scopeType: 'WORKSPACE' | 'AGENCY';
  workspaceId: string | null;
  agencyId: string | null;
  capabilityKeys: string[];
  accessMode: 'READ_ONLY' | 'WRITE';
  expiresAt: string;
}

export interface PlatformAuthorityContext {
  authenticated: boolean;
  mode: PlatformAuthorityMode;
  operatorProfileId: string | null;
  operatorEmail: string | null;
  assuranceLevel: PlatformAssuranceLevel;
  roleKeys: string[];
  capabilityKeys: string[];
  authorityValidUntil: string | null;
  activeSupportSessions: PlatformSupportSessionSummary[];
  canBootstrap: boolean;
  breakGlassExpiresAt: string | null;
}

export interface PlatformAuthorityDecision {
  ok: boolean;
  context: PlatformAuthorityContext;
  status: 401 | 403 | 428 | 503;
  errorCode:
    | 'AUTH_REQUIRED'
    | 'PLATFORM_OPERATOR_REQUIRED'
    | 'PLATFORM_CAPABILITY_DENIED'
    | 'MFA_STEP_UP_REQUIRED'
    | 'PLATFORM_AUTHORITY_UNAVAILABLE';
  stepUpHref?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const READ_CAPABILITY_PATTERN = /(?:^|\.)read(?:[_.]|$)/;

const EMPTY_CONTEXT: PlatformAuthorityContext = {
  authenticated: false,
  mode: 'none',
  operatorProfileId: null,
  operatorEmail: null,
  assuranceLevel: null,
  roleKeys: [],
  capabilityKeys: [],
  authorityValidUntil: null,
  activeSupportSessions: [],
  canBootstrap: false,
  breakGlassExpiresAt: null,
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length <= 160))).sort();
}

function nullableIso(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return value;
}

function parseSupportSessions(value: unknown): PlatformSupportSessionSummary[] {
  if (!Array.isArray(value)) return [];
  const sessions: PlatformSupportSessionSummary[] = [];
  for (const candidate of value.slice(0, 50)) {
    if (!isRecord(candidate) || !UUID_PATTERN.test(String(candidate.id ?? ''))) continue;
    const scopeType = candidate.scope_type;
    const accessMode = candidate.access_mode;
    const expiresAt = nullableIso(candidate.expires_at);
    if ((scopeType !== 'WORKSPACE' && scopeType !== 'AGENCY') || (accessMode !== 'READ_ONLY' && accessMode !== 'WRITE') || !expiresAt) continue;
    sessions.push({
      id: String(candidate.id),
      scopeType,
      workspaceId: UUID_PATTERN.test(String(candidate.workspace_id ?? '')) ? String(candidate.workspace_id) : null,
      agencyId: UUID_PATTERN.test(String(candidate.agency_id ?? '')) ? String(candidate.agency_id) : null,
      capabilityKeys: textArray(candidate.capability_keys),
      accessMode,
      expiresAt,
    });
  }
  return sessions;
}

function parseOperatorContext(data: unknown, user: User, fallbackAal: PlatformAssuranceLevel): PlatformAuthorityContext | null {
  if (!isRecord(data)) return null;
  const profileId = data.operator_profile_id;
  if (typeof profileId !== 'string' || !UUID_PATTERN.test(profileId) || profileId !== user.id) return null;
  const assurance = data.assurance_level === 'aal2' || data.assurance_level === 'aal1'
    ? data.assurance_level
    : fallbackAal;
  return {
    authenticated: true,
    mode: 'operator',
    operatorProfileId: profileId,
    operatorEmail: user.email?.trim().toLowerCase() ?? null,
    assuranceLevel: assurance,
    roleKeys: textArray(data.role_keys),
    capabilityKeys: textArray(data.capability_keys),
    authorityValidUntil: nullableIso(data.authority_valid_until),
    activeSupportSessions: parseSupportSessions(data.active_support_sessions),
    canBootstrap: false,
    breakGlassExpiresAt: null,
  };
}

async function currentAssuranceLevel(supabase: ReturnType<typeof createClient>): Promise<PlatformAssuranceLevel> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) return null;
    if (data?.currentLevel === 'aal2') return 'aal2';
    if (data?.currentLevel === 'aal1') return 'aal1';
  } catch {
    // An older Supabase deployment can omit the MFA endpoint. The database is
    // still the final authority for every mutation and will fail closed.
  }
  return null;
}

function isVerifiedBootstrapIdentity(user: User): boolean {
  const configuredEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = user.email?.trim().toLowerCase();
  return Boolean(
    configuredEmail
    && userEmail
    && configuredEmail === userEmail
    && (user.email_confirmed_at || user.confirmed_at),
  );
}

async function hasNoPlatformOperators(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from('platform_operator_assignments')
      .select('id', { count: 'exact', head: true });
    return !error && count === 0;
  } catch {
    return false;
  }
}

export async function getPlatformAuthorityContext(): Promise<PlatformAuthorityContext> {
  try {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authError ? null : authData.user;
    if (user) {
      const assuranceLevel = await currentAssuranceLevel(supabase);
      const { data, error } = await supabase.rpc('get_platform_operator_context');
      if (!error) {
        const context = parseOperatorContext(data, user, assuranceLevel);
        if (context) return context;
      }

      const canBootstrap = isVerifiedBootstrapIdentity(user) && await hasNoPlatformOperators();
      return {
        ...EMPTY_CONTEXT,
        authenticated: true,
        mode: canBootstrap ? 'bootstrap' : 'none',
        operatorProfileId: user.id,
        operatorEmail: user.email?.trim().toLowerCase() ?? null,
        assuranceLevel,
        canBootstrap,
      };
    }
  } catch {
    // Continue with the explicitly limited legacy break-glass session.
  }

  const legacy = await getLegacySuperadminSession();
  if (!legacy) return EMPTY_CONTEXT;
  return {
    ...EMPTY_CONTEXT,
    authenticated: true,
    mode: 'break_glass',
    operatorEmail: legacy.email,
    breakGlassExpiresAt: new Date(legacy.expSec * 1000).toISOString(),
  };
}

export function hasPlatformCapability(context: PlatformAuthorityContext, capability: string): boolean {
  return context.mode === 'operator' && context.capabilityKeys.includes(capability);
}

function denied(
  context: PlatformAuthorityContext,
  status: PlatformAuthorityDecision['status'],
  errorCode: PlatformAuthorityDecision['errorCode'],
  stepUpHref?: string,
): PlatformAuthorityDecision {
  return { ok: false, context, status, errorCode, ...(stepUpHref ? { stepUpHref } : {}) };
}

export async function requirePlatformRead(capability: string): Promise<PlatformAuthorityDecision> {
  const context = await getPlatformAuthorityContext();
  if (!context.authenticated) return denied(context, 401, 'AUTH_REQUIRED');
  if (context.mode === 'break_glass' && READ_CAPABILITY_PATTERN.test(capability)) {
    return { ok: true, context, status: 403, errorCode: 'PLATFORM_CAPABILITY_DENIED' };
  }
  if (hasPlatformCapability(context, capability)) {
    return { ok: true, context, status: 403, errorCode: 'PLATFORM_CAPABILITY_DENIED' };
  }
  return denied(context, 403, 'PLATFORM_CAPABILITY_DENIED');
}

export async function requirePlatformMutation(capability: string): Promise<PlatformAuthorityDecision> {
  const context = await getPlatformAuthorityContext();
  if (!context.authenticated) return denied(context, 401, 'AUTH_REQUIRED');
  if (context.mode !== 'operator') return denied(context, 403, 'PLATFORM_OPERATOR_REQUIRED');
  if (!hasPlatformCapability(context, capability)) return denied(context, 403, 'PLATFORM_CAPABILITY_DENIED');
  if (context.assuranceLevel !== 'aal2') {
    return denied(context, 428, 'MFA_STEP_UP_REQUIRED', '/account/security?next=%2Fsuperadmin');
  }
  return { ok: true, context, status: 403, errorCode: 'PLATFORM_CAPABILITY_DENIED' };
}

export function platformAuthorityErrorCode(error: unknown, fallback = 'PLATFORM_ACTION_FAILED'): string {
  if (!isRecord(error)) return fallback;
  for (const field of ['details', 'message', 'hint']) {
    const value = error[field];
    if (typeof value !== 'string') continue;
    try {
      const parsed = JSON.parse(value) as unknown;
      if (isRecord(parsed) && typeof parsed.error_code === 'string') return parsed.error_code;
    } catch {
      const match = value.match(/\b(?:PLATFORM|SUPPORT|MFA|AUTH)_[A-Z0-9_]+\b/);
      if (match) return match[0];
    }
  }
  return fallback;
}

export async function getDatabasePlatformPayloadDigest(
  supabase: Pick<ReturnType<typeof createClient>, 'rpc'>,
  payload: Record<string, unknown>,
): Promise<{ digest: string | null; errorCode: string | null }> {
  const { data, error } = await supabase.rpc('get_platform_payload_digest', {
    p_payload: payload,
  });
  if (error) return { digest: null, errorCode: platformAuthorityErrorCode(error, 'PLATFORM_DIGEST_UNAVAILABLE') };
  return typeof data === 'string' && /^sha256:[0-9a-f]{64}$/.test(data)
    ? { digest: data, errorCode: null }
    : { digest: null, errorCode: 'PLATFORM_DIGEST_UNAVAILABLE' };
}
