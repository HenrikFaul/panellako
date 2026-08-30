import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ rpc: rpcMock }),
}));

import {
  hasWorkspaceCapability,
  legacyRoleFromWorkspaceContext,
  WORKSPACE_CAPABILITIES,
} from '@/lib/authorization/capabilities';
import { isWorkspaceId, listMyWorkspaces, resolveWorkspaceContext } from '@/lib/authorization/workspace-context';

describe('workspace context contracts', () => {
  beforeEach(() => rpcMock.mockReset());

  it('treats workspace ids as UUIDs, not authorization secrets', () => {
    expect(isWorkspaceId('bbbbbbbb-0001-4001-8001-000000000001')).toBe(true);
    expect(isWorkspaceId('bbbbbbbb-0001-0001-0001-000000000001')).toBe(true);
    expect(isWorkspaceId('../another-workspace')).toBe(false);
  });

  it('maps the strongest effective context to the legacy UI role without collapsing relationships into admin roles', () => {
    expect(legacyRoleFromWorkspaceContext(['ACCOUNTANT'], ['OWNER'])).toBe('konyvelo');
    expect(legacyRoleFromWorkspaceContext([], ['OWNER_OCCUPANT'])).toBe('tulajdonos');
    expect(legacyRoleFromWorkspaceContext([], ['TENANT'])).toBe('lako');
    expect(legacyRoleFromWorkspaceContext(['SELF_MANAGED_ADMIN'], ['TENANT'])).toBe('kozos_kepviselo');
  });

  it('uses the resolved capability list instead of a client-provided role label', () => {
    const context = { capabilities: ['workspace.read', 'membership.invite'] as const };
    expect(hasWorkspaceCapability(context, 'membership.invite')).toBe(true);
    expect(hasWorkspaceCapability(context, 'role.grant_admin')).toBe(false);
    expect(WORKSPACE_CAPABILITIES).toContain('meter.submit_own_unit');
  });

  it('calls the authoritative context RPC with its declared workspace parameter', async () => {
    const workspaceId = 'bbbbbbbb-0001-4001-8001-000000000001';
    rpcMock.mockResolvedValue({
      data: [{
        workspace_id: workspaceId,
        workspace_name: 'Teszt közösség',
        primary_building_id: workspaceId,
        building_name: 'Teszt épület',
        address: '1135 Budapest, Teszt utca 1.',
        governance_mode: 'REPRESENTATIVE_MANAGED',
        role_keys: [],
        relationship_labels: ['TENANT'],
        capabilities: ['workspace.read'],
        related_unit_ids: [],
        primary_unit_id: null,
      }],
      error: null,
    });

    await expect(resolveWorkspaceContext(workspaceId)).resolves.toMatchObject({
      workspaceId,
      source: 'workspace-rpc',
    });
    expect(rpcMock).toHaveBeenCalledWith('get_workspace_context', { p_workspace_id: workspaceId });
  });

  it('fails closed when the workspace list RPC is missing instead of using legacy roles', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Function get_my_workspaces was not found' },
    });

    await expect(listMyWorkspaces()).resolves.toEqual({
      workspaces: [],
      error: 'Function get_my_workspaces was not found',
      source: 'workspace-rpc',
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).not.toHaveBeenCalledWith('get_my_buildings');
  });

  it('fails closed when context resolution is unavailable instead of querying legacy membership roles', async () => {
    const workspaceId = 'bbbbbbbb-0001-4001-8001-000000000001';
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '42883', message: 'function get_workspace_context does not exist' },
    });

    await expect(resolveWorkspaceContext(workspaceId)).resolves.toBeNull();
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });
});
