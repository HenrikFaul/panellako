import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  authorizationMessage,
  requireWorkspaceCapability,
  WorkspaceAuthorizationError,
} from './guards';
import { isWorkspaceId } from './workspace-context';

export const ENVIRONMENT_JOB_SECRET_HEADER = 'x-panellako-environment-secret';

export type EnvironmentBuildingScope = {
  mode: 'public' | 'workspace' | 'internal-job';
  physicalBuildingId: string | null;
};

class InvalidEnvironmentScopeError extends Error {
  constructor() {
    super('Érvénytelen workspace azonosító.');
    this.name = 'InvalidEnvironmentScopeError';
  }
}

function secretsMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function isAuthorizedEnvironmentJob(request: NextRequest): boolean {
  const expected = (
    process.env.ENVIRONMENT_REFRESH_SECRET
    ?? process.env.CRON_SECRET
    ?? ''
  ).trim();
  const actual = (request.headers.get(ENVIRONMENT_JOB_SECRET_HEADER) ?? '').trim();

  return Boolean(expected && actual && secretsMatch(actual, expected));
}

/**
 * Resolves the route's legacy physical-building cache key without trusting a
 * workspace id supplied by the browser. Calls without a workspace remain
 * public and must not read or write any building-scoped cache.
 *
 * Superadmin refresh jobs are the sole exception: after secret verification
 * they pass a physical building id directly because they operate across the
 * complete portfolio without a resident session.
 */
export async function resolveEnvironmentBuildingScope(
  request: NextRequest,
  workspaceId: string | null,
): Promise<EnvironmentBuildingScope> {
  if (!workspaceId) {
    return { mode: 'public', physicalBuildingId: null };
  }

  if (!isWorkspaceId(workspaceId)) {
    throw new InvalidEnvironmentScopeError();
  }

  if (isAuthorizedEnvironmentJob(request)) {
    return { mode: 'internal-job', physicalBuildingId: workspaceId };
  }

  const context = await requireWorkspaceCapability(workspaceId, 'environment.read');
  return { mode: 'workspace', physicalBuildingId: context.primaryBuildingId };
}

export function environmentScopeErrorResponse(error: unknown): NextResponse {
  if (error instanceof InvalidEnvironmentScopeError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof WorkspaceAuthorizationError) {
    const status = error.code === 'AUTH_REQUIRED' ? 401 : 403;
    return NextResponse.json({ error: authorizationMessage(error) }, { status });
  }

  return NextResponse.json({ error: 'A művelet nem engedélyezett.' }, { status: 403 });
}

export function environmentJobForwardHeaders(request: NextRequest): HeadersInit | undefined {
  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  const jobSecret = request.headers.get(ENVIRONMENT_JOB_SECRET_HEADER);

  if (cookie) headers.set('cookie', cookie);
  if (jobSecret) headers.set(ENVIRONMENT_JOB_SECRET_HEADER, jobSecret);

  return cookie || jobSecret ? headers : undefined;
}
