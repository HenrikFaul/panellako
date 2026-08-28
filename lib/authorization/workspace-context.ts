import { createClient } from '@/lib/supabase/server';
import {
  isWorkspaceCapability,
  isWorkspaceRoleKey,
  type WorkspaceContext,
  type WorkspaceRelationshipLabel,
  type WorkspaceRoleKey,
  type WorkspaceSummary,
} from './capabilities';

// Existing deterministic demo identifiers predate RFC-versioned UUID generation,
// so route validation checks the PostgreSQL uuid shape without pretending this is
// an authorization boundary. Database context resolution remains authoritative.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RPC_MISSING_CODES = new Set(['42883', 'PGRST202']);

interface WorkspaceRpcRow {
  workspace_id: string;
  workspace_name: string;
  primary_building_id: string;
  building_name?: string | null;
  address: string;
  governance_mode?: string | null;
  role_keys?: string[] | null;
  relationship_labels?: string[] | null;
  capabilities?: string[] | null;
  related_unit_ids?: string[] | null;
  primary_unit_id?: string | null;
  unit_count?: number | string | null;
  open_tickets?: number | string | null;
  member_since?: string | null;
}

function firstRow<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function roleKeys(values: string[] | null | undefined): WorkspaceRoleKey[] {
  return (values ?? []).filter(isWorkspaceRoleKey);
}

function relationships(values: string[] | null | undefined): WorkspaceRelationshipLabel[] {
  return (values ?? []).filter((value): value is string => typeof value === 'string');
}

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isWorkspaceId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function listMyWorkspaces(): Promise<{
  workspaces: WorkspaceSummary[];
  error: string | null;
  source: 'workspace-rpc' | 'legacy-compatibility';
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_my_workspaces');

  if (!error) {
    const rows = (Array.isArray(data) ? data : []) as WorkspaceRpcRow[];
    return {
      workspaces: rows.map((row) => ({
        workspaceId: row.workspace_id,
        workspaceName: row.workspace_name,
        primaryBuildingId: row.primary_building_id,
        address: row.address ?? '',
        governanceMode: row.governance_mode ?? 'REPRESENTATIVE_MANAGED',
        roleKeys: roleKeys(row.role_keys),
        relationshipLabels: relationships(row.relationship_labels),
        unitCount: numeric(row.unit_count),
        openTickets: numeric(row.open_tickets),
        memberSince: row.member_since ?? '',
      })),
      error: null,
      source: 'workspace-rpc',
    };
  }

  if (!RPC_MISSING_CODES.has(error.code ?? '')) {
    return { workspaces: [], error: error.message, source: 'workspace-rpc' };
  }

  const { data: legacy, error: legacyError } = await supabase.rpc('get_my_buildings');
  if (legacyError) {
    return { workspaces: [], error: legacyError.message, source: 'legacy-compatibility' };
  }

  const rows = (Array.isArray(legacy) ? legacy : []) as Array<{
    building_id: string;
    building_name: string;
    address: string;
    user_role: string;
    unit_count: number | string;
    open_tickets: number | string;
    member_since: string;
  }>;

  return {
    workspaces: rows.map((row) => ({
      workspaceId: row.building_id,
      workspaceName: row.building_name,
      primaryBuildingId: row.building_id,
      address: row.address ?? '',
      governanceMode: 'REPRESENTATIVE_MANAGED',
      roleKeys: legacyRoleKeys(row.user_role),
      relationshipLabels: legacyRelationships(row.user_role),
      unitCount: numeric(row.unit_count),
      openTickets: numeric(row.open_tickets),
      memberSince: row.member_since,
    })),
    error: null,
    source: 'legacy-compatibility',
  };
}

export async function resolveWorkspaceContext(workspaceId: string): Promise<WorkspaceContext | null> {
  if (!isWorkspaceId(workspaceId)) return null;

  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_workspace_context', { p_workspace_id: workspaceId });

  if (!error) {
    const row = firstRow(data as WorkspaceRpcRow | WorkspaceRpcRow[] | null);
    if (!row) return null;
    return {
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      primaryBuildingId: row.primary_building_id,
      buildingName: row.building_name ?? row.workspace_name,
      address: row.address ?? '',
      governanceMode: row.governance_mode ?? 'REPRESENTATIVE_MANAGED',
      roleKeys: roleKeys(row.role_keys),
      relationshipLabels: relationships(row.relationship_labels),
      capabilities: (row.capabilities ?? []).filter(isWorkspaceCapability),
      relatedUnitIds: (row.related_unit_ids ?? []).filter((value): value is string => typeof value === 'string'),
      primaryUnitId: row.primary_unit_id ?? null,
      source: 'workspace-rpc',
    };
  }

  if (!RPC_MISSING_CODES.has(error.code ?? '')) return null;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: memberships, error: membershipError } = await supabase
    .from('memberships')
    .select('role, unit_id')
    .eq('profile_id', user.id)
    .eq('building_id', workspaceId)
    .eq('active', true);

  if (membershipError || !memberships?.length) return null;

  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name, address')
    .eq('id', workspaceId)
    .maybeSingle();

  if (buildingError || !building) return null;

  const legacyRoles = Array.from(new Set(memberships.map((membership) => String(membership.role))));
  const unitIds = Array.from(new Set(
    memberships
      .map((membership) => membership.unit_id as string | null)
      .filter((unitId): unitId is string => Boolean(unitId)),
  ));

  return {
    workspaceId,
    workspaceName: (building as { name?: string | null }).name ?? building.address,
    primaryBuildingId: building.id,
    buildingName: (building as { name?: string | null }).name ?? building.address,
    address: building.address,
    governanceMode: 'REPRESENTATIVE_MANAGED',
    roleKeys: Array.from(new Set(legacyRoles.flatMap(legacyRoleKeys))),
    relationshipLabels: Array.from(new Set(legacyRoles.flatMap(legacyRelationships))),
    capabilities: legacyCapabilities(legacyRoles),
    relatedUnitIds: unitIds,
    primaryUnitId: unitIds[0] ?? null,
    source: 'legacy-compatibility',
  };
}

function legacyRoleKeys(role: string): WorkspaceRoleKey[] {
  switch (role) {
    case 'kozos_kepviselo': return ['COMMON_REPRESENTATIVE_ADMIN'];
    case 'megbizott': return ['DELEGATE_OPERATIONS'];
    case 'bizottsag': return ['COMMITTEE_OVERSIGHT'];
    case 'konyvelo': return ['ACCOUNTANT'];
    default: return [];
  }
}

function legacyRelationships(role: string): WorkspaceRelationshipLabel[] {
  if (role === 'tulajdonos') return ['OWNER'];
  if (role === 'lako') return ['TENANT'];
  return [];
}

function legacyCapabilities(roles: string[]) {
  const result = new Set<string>([
    'workspace.read', 'building.read', 'unit.directory.read_masked', 'ticket.create',
    'announcement.read', 'document.common.read', 'environment.read', 'meeting.read',
  ]);

  if (roles.some((role) => ['lako', 'tulajdonos'].includes(role))) {
    ['ticket.read_own', 'meter.submit_own_unit', 'meter.read_own_unit', 'document.unit.read', 'finance.unit.read']
      .forEach((capability) => result.add(capability));
  }
  if (roles.includes('tulajdonos')) result.add('document.owner.read');
  if (roles.some((role) => ['kozos_kepviselo', 'megbizott'].includes(role))) {
    [
      'workspace.settings.read', 'workspace.settings.manage', 'building.manage', 'unit.read_all', 'unit.manage',
      'membership.invite', 'membership.approve', 'unit_relation.propose', 'ticket.manage_all', 'meter.manage_all',
      'document.publish', 'announcement.publish', 'reminder.manage', 'finance.workspace.read', 'meeting.manage', 'audit.read',
    ].forEach((capability) => result.add(capability));
  }
  if (roles.includes('kozos_kepviselo')) {
    ['workspace.governance.manage', 'membership.suspend', 'unit_relation.verify', 'role.grant_limited', 'delegation.manage', 'mandate.manage']
      .forEach((capability) => result.add(capability));
  }
  if (roles.includes('konyvelo')) {
    ['finance.workspace.read', 'finance.write', 'finance.export'].forEach((capability) => result.add(capability));
  }
  if (roles.includes('bizottsag')) {
    ['audit.read', 'vote.audit'].forEach((capability) => result.add(capability));
  }

  return Array.from(result).filter(isWorkspaceCapability);
}
