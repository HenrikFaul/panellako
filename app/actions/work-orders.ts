'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface CreateWorkOrderInput {
  ticket_id?: string;
  vendor_id?: string;
  ticket_title: string;
  vendor_name: string;
  due_date: string;
  cost_estimate?: number;
}

export type WorkOrderStatus = 'tervezett' | 'kikuldve' | 'folyamatban' | 'lezarva';

export async function createWorkOrder(input: CreateWorkOrderInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { data, error } = await supabase
    .from('work_orders')
    .insert({
      ticket_id: input.ticket_id ?? null,
      vendor_id: input.vendor_id ?? null,
      ticket_title: input.ticket_title,
      vendor_name: input.vendor_name,
      due_date: input.due_date,
      cost_estimate: input.cost_estimate ?? 0,
      status: 'tervezett'
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}

export async function updateWorkOrderStatus(workOrderId: string, status: WorkOrderStatus) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { error } = await supabase
    .from('work_orders')
    .update({ status })
    .eq('id', workOrderId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
