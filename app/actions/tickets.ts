'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type TicketPriority = 'alacsony' | 'kozepes' | 'magas' | 'kritikus';
export type TicketStatus = 'uj' | 'folyamatban' | 'varakozik' | 'lezarva';

export interface CreateTicketInput {
  title: string;
  description: string;
  location: string;
  priority: TicketPriority;
  submitted_by?: string;
  unit_label?: string;
  building_id?: string;
}

export async function createTicket(input: CreateTicketInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title: input.title,
      description: input.description,
      location: input.location,
      priority: input.priority,
      submitted_by: input.submitted_by ?? user?.email ?? 'Névtelen',
      unit_label: input.unit_label,
      building_id: input.building_id,
      reporter_id: user?.id ?? null,
      status: 'uj'
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { error } = await supabase
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
