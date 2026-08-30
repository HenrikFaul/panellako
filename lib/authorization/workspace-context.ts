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
  source: 'workspace-rpc';
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

  // Fail closed: an absent or failed multitenant RPC must never fall back to
  // legacy membership.role data and synthesize broader capabilities.
  return { workspaces: [], error: error.message, source: 'workspace-rpc' };
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

  // Fail closed on every error, including a missing RPC. Production authority
  // is derived only from the normalized workspace contract.
  return null;
}
