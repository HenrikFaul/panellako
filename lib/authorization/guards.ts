import { createClient } from '@/lib/supabase/server';
import {
  hasWorkspaceCapability,
  type WorkspaceCapability,
  type WorkspaceContext,
} from './capabilities';
import { resolveWorkspaceContext } from './workspace-context';

export class WorkspaceAuthorizationError extends Error {
  readonly code: 'AUTH_REQUIRED' | 'WORKSPACE_FORBIDDEN' | 'CAPABILITY_REQUIRED' | 'OBJECT_SCOPE_MISMATCH';

  constructor(
    code: WorkspaceAuthorizationError['code'],
    message = 'A művelet nem engedélyezett.',
  ) {
    super(message);
    this.name = 'WorkspaceAuthorizationError';
    this.code = code;
  }
}

export async function requireAuthenticatedUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new WorkspaceAuthorizationError('AUTH_REQUIRED', 'Bejelentkezés szükséges.');
  return { supabase, user };
}

export async function requireWorkspaceAccess(workspaceId: string): Promise<WorkspaceContext> {
  const context = await resolveWorkspaceContext(workspaceId);
  if (!context) throw new WorkspaceAuthorizationError('WORKSPACE_FORBIDDEN');
  return context;
}

export async function requireWorkspaceCapability(
  workspaceId: string,
  capability: WorkspaceCapability,
): Promise<WorkspaceContext> {
  const context = await requireWorkspaceAccess(workspaceId);
  if (!hasWorkspaceCapability(context, capability)) {
    throw new WorkspaceAuthorizationError('CAPABILITY_REQUIRED');
  }
  return context;
}

export async function requireUnitAccess(
  workspaceId: string,
  unitId: string,
  elevatedCapability: WorkspaceCapability,
): Promise<WorkspaceContext> {
  const context = await requireWorkspaceAccess(workspaceId);
  if (context.relatedUnitIds.includes(unitId) || hasWorkspaceCapability(context, elevatedCapability)) {
    return context;
  }
  throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
}

export async function assertLegacyObjectBuilding(
  table: string,
  objectId: string,
  expectedBuildingId: string,
): Promise<void> {
  const { supabase } = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from(table)
    .select('building_id')
    .eq('id', objectId)
    .maybeSingle();

  if (error || !data || (data as { building_id?: string }).building_id !== expectedBuildingId) {
    // Deliberately do not reveal whether the object exists in another tenant.
    throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
  }
}

export async function assertLegacyObjectInWorkspace(
  table: string,
  objectId: string,
  workspaceId: string,
): Promise<WorkspaceContext> {
  const context = await requireWorkspaceAccess(workspaceId);
  await assertLegacyObjectBuilding(table, objectId, context.primaryBuildingId);
  return context;
}

export async function assertUnitInWorkspace(
  unitId: string,
  workspaceId: string,
): Promise<WorkspaceContext> {
  const context = await requireWorkspaceAccess(workspaceId);
  const { supabase } = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from('units')
    .select('id, building_id')
    .eq('id', unitId)
    .maybeSingle();

  if (error || !data || (data as { building_id?: string }).building_id !== context.primaryBuildingId) {
    throw new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
  }
  return context;
}

export function authorizationMessage(error: unknown): string {
  if (error instanceof WorkspaceAuthorizationError) return error.message;
  return error instanceof Error ? error.message : 'Ismeretlen hiba történt.';
}
