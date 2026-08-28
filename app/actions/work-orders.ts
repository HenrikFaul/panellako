'use server';

import { revalidatePath } from 'next/cache';
import {
  authorizationMessage,
  requireAuthenticatedUser,
  requireWorkspaceCapability,
} from '@/lib/authorization/guards';

export interface CreateWorkOrderInput {
  workspaceId: string;
  ticket_id?: string;
  vendor_id?: string;
  ticket_title: string;
  vendor_name: string;
  due_date: string;
  cost_estimate?: number;
}

export type WorkOrderStatus = 'tervezett' | 'kikuldve' | 'folyamatban' | 'lezarva';

export async function createWorkOrder(input: CreateWorkOrderInput) {
  if (!input.workspaceId) return { success: false, error: 'Lakóközösség megadása kötelező.' };

  try {
    const [{ supabase }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(input.workspaceId, 'ticket.manage_all'),
    ]);

    if (input.ticket_id) {
      const { data: ticket } = await supabase
        .from('tickets')
        .select('id')
        .eq('id', input.ticket_id)
        .eq('building_id', context.primaryBuildingId)
        .maybeSingle();
      if (!ticket) return { success: false, error: 'A művelet nem engedélyezett.' };
    }

    if (input.vendor_id) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('id', input.vendor_id)
        .eq('building_id', context.primaryBuildingId)
        .maybeSingle();
      if (!vendor) return { success: false, error: 'A művelet nem engedélyezett.' };
    }

    const { data, error } = await supabase
      .from('work_orders')
      .insert({
        workspace_id: context.workspaceId,
        ticket_id: input.ticket_id ?? null,
        vendor_id: input.vendor_id ?? null,
        ticket_title: input.ticket_title,
        vendor_name: input.vendor_name,
        due_date: input.due_date,
        cost_estimate: input.cost_estimate ?? 0,
        status: 'tervezett',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath(`/w/${input.workspaceId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}

export async function updateWorkOrderStatus(
  workOrderId: string,
  status: WorkOrderStatus,
  workspaceId: string,
) {
  if (!workspaceId) return { success: false, error: 'Lakóközösség megadása kötelező.' };

  try {
    const [{ supabase }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(workspaceId, 'ticket.manage_all'),
    ]);

    const { data: workOrder } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', workOrderId)
      .eq('workspace_id', context.workspaceId)
      .maybeSingle();
    if (!workOrder) return { success: false, error: 'A művelet nem engedélyezett.' };

    const { error } = await supabase
      .from('work_orders')
      .update({ status })
      .eq('id', workOrderId)
      .eq('workspace_id', context.workspaceId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/w/${workspaceId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}
