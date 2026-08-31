const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE_PREFIX = 'panellako:superadmin:request:';
const memoryKeys = new Map<string, string>();
const NON_TERMINAL_ERROR_CODES = new Set([
  'JOB_ALREADY_SUBMITTED',
  'JOB_AUDIT_INCOMPLETE',
  'JOB_AUDIT_UNAVAILABLE',
  'JOB_GUARD_UNAVAILABLE',
  'MIGRATION_ALREADY_SUBMITTED',
  'MIGRATION_AUDIT_INCOMPLETE',
  'MIGRATION_AUDIT_UNAVAILABLE',
  'MIGRATION_GUARD_UNAVAILABLE',
  'MIGRATION_EXECUTOR_UNAVAILABLE',
  'GTFS_IMPORT_ALREADY_SUBMITTED',
  'GTFS_IMPORT_AUDIT_INCOMPLETE',
  'GTFS_IMPORT_GUARD_UNAVAILABLE',
]);

function storageKey(scope: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(scope)}`;
}

/**
 * Keeps the same request key across transport retries (and a page refresh in
 * the same browser tab). A known JSON response must release the key explicitly.
 */
export function acquireAdminRequestKey(scope: string): string {
  const memoryKey = memoryKeys.get(scope);
  if (memoryKey) return memoryKey;

  if (typeof window !== 'undefined') {
    try {
      const stored = window.sessionStorage.getItem(storageKey(scope));
      if (stored && UUID_PATTERN.test(stored)) {
        memoryKeys.set(scope, stored);
        return stored;
      }
      if (stored) window.sessionStorage.removeItem(storageKey(scope));
    } catch {
      // Storage can be disabled; the in-memory fallback still protects retries.
    }
  }

  const requestKey = crypto.randomUUID();
  memoryKeys.set(scope, requestKey);
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(storageKey(scope), requestKey);
    } catch {
      // Best-effort persistence only.
    }
  }
  return requestKey;
}

export function releaseAdminRequestKey(scope: string): void {
  memoryKeys.delete(scope);
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(storageKey(scope));
    } catch {
      // Best-effort cleanup only.
    }
  }
}

/**
 * A parsed JSON response is not necessarily terminal. A command may still be
 * running or its audit completion may be uncertain. Keeping the key for those
 * outcomes lets a retry retrieve the same receipt instead of opening a second
 * command.
 */
export function isTerminalAdminCommandResponse(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  const error = typeof body.error === 'string' ? body.error : null;
  if (error && NON_TERMINAL_ERROR_CODES.has(error)) return false;
  if (body.replayed === true || body.ok === true) return true;
  if (error) return true;
  return typeof body.requestId === 'string' && typeof body.ok === 'boolean';
}
