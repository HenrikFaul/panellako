import type { Role } from '@/lib/types';

export const WORKSPACE_CAPABILITIES = [
  'workspace.read',
  'workspace.settings.read',
  'workspace.settings.manage',
  'workspace.governance.manage',
  'workspace.archive',
  'building.read',
  'building.manage',
  'unit.directory.read_masked',
  'unit.read_all',
  'unit.manage',
  'membership.invite',
  'membership.approve',
  'membership.suspend',
  'unit_relation.propose',
  'unit_relation.verify',
  'unit_legal_right.verify',
  'role.grant_limited',
  'role.grant_admin',
  'delegation.manage',
  'mandate.manage',
  'governance.transfer',
  'member.directory.read_minimal',
  'member.contact.read',
  'ticket.create',
  'ticket.read_own',
  'ticket.manage_all',
  'meter.submit_own_unit',
  'meter.read_own_unit',
  'meter.manage_all',
  'document.common.read',
  'document.owner.read',
  'document.unit.read',
  'document.publish',
  'announcement.read',
  'announcement.publish',
  'reminder.manage',
  'environment.read',
  'finance.unit.read',
  'finance.workspace.read',
  'finance.write',
  'finance.export',
  'meeting.read',
  'meeting.manage',
  'vote.cast',
  'vote.audit',
  'audit.read',
  'billing.manage',
] as const;

export type WorkspaceCapability = (typeof WORKSPACE_CAPABILITIES)[number];

export type WorkspaceRoleKey =
  | 'COMMON_REPRESENTATIVE_ADMIN'
  | 'BOARD_ADMIN'
  | 'SELF_MANAGED_ADMIN'
  | 'DELEGATE_OPERATIONS'
  | 'COMMITTEE_OVERSIGHT'
  | 'ACCOUNTANT'
  | 'BILLING_ADMIN';

export type WorkspaceRelationshipLabel =
  | 'OWNER'
  | 'CO_OWNER'
  | 'OWNER_OCCUPANT'
  | 'TENANT'
  | 'HOUSEHOLD_MEMBER'
  | 'AUTHORIZED_OCCUPANT'
  | string;

export interface WorkspaceSummary {
  workspaceId: string;
  workspaceName: string;
  primaryBuildingId: string;
  address: string;
  governanceMode: string;
  roleKeys: WorkspaceRoleKey[];
  relationshipLabels: WorkspaceRelationshipLabel[];
  unitCount: number;
  openTickets: number;
  memberSince: string;
}

export interface WorkspaceContext {
  workspaceId: string;
  workspaceName: string;
  primaryBuildingId: string;
  buildingName: string;
  address: string;
  governanceMode: string;
  roleKeys: WorkspaceRoleKey[];
  relationshipLabels: WorkspaceRelationshipLabel[];
  capabilities: WorkspaceCapability[];
  relatedUnitIds: string[];
  primaryUnitId: string | null;
  source: 'workspace-rpc' | 'legacy-compatibility';
}

const LEGACY_ROLE_PRIORITY: Array<{ role: Role; roleKeys?: WorkspaceRoleKey[]; relationships?: string[] }> = [
  { role: 'kozos_kepviselo', roleKeys: ['COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN'] },
  { role: 'megbizott', roleKeys: ['DELEGATE_OPERATIONS'] },
  { role: 'konyvelo', roleKeys: ['ACCOUNTANT'] },
  { role: 'bizottsag', roleKeys: ['COMMITTEE_OVERSIGHT'] },
  { role: 'tulajdonos', relationships: ['OWNER', 'CO_OWNER', 'OWNER_OCCUPANT'] },
];

export function legacyRoleFromWorkspaceContext(
  roleKeys: readonly string[],
  relationshipLabels: readonly string[],
): Role {
  for (const candidate of LEGACY_ROLE_PRIORITY) {
    if (candidate.roleKeys?.some((roleKey) => roleKeys.includes(roleKey))) return candidate.role;
    if (candidate.relationships?.some((relationship) => relationshipLabels.includes(relationship))) return candidate.role;
  }
  return 'lako';
}

export function hasWorkspaceCapability(
  context: { capabilities: readonly WorkspaceCapability[] } | null | undefined,
  capability: WorkspaceCapability,
): boolean {
  return Boolean(context?.capabilities.includes(capability));
}

export function isWorkspaceRoleKey(value: string): value is WorkspaceRoleKey {
  return [
    'COMMON_REPRESENTATIVE_ADMIN',
    'BOARD_ADMIN',
    'SELF_MANAGED_ADMIN',
    'DELEGATE_OPERATIONS',
    'COMMITTEE_OVERSIGHT',
    'ACCOUNTANT',
    'BILLING_ADMIN',
  ].includes(value);
}

export function isWorkspaceCapability(value: string): value is WorkspaceCapability {
  return (WORKSPACE_CAPABILITIES as readonly string[]).includes(value);
}
