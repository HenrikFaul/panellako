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
  buildingId?: string;
}

// Fire-and-forget: calls the triage Edge Function without awaiting the result.
// The ticket is already saved; triage enriches it asynchronously.
function triggerAiTriage(ticketId: string, title: string, description: string, buildingId?: string): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/triage-ticket`;

  fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ ticket_id: ticketId, title, description, building_id: buildingId }),
  }).catch((err) => {
    console.error('[createTicket] AI triage trigger failed:', err);
  });
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
      status: 'uj',
      ai_triage_at: null,
      ai_override: false,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const bid = input.buildingId ?? input.building_id;

  // Fire-and-forget — do NOT await
  triggerAiTriage(data.id, input.title, input.description, bid);

  revalidatePath(bid ? `/w/${bid}` : '/');
  return { success: true, data };
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus, buildingId?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const query = supabase
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  const { error } = buildingId ? await query.eq('building_id', buildingId) : await query;

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(buildingId ? `/w/${buildingId}` : '/');
  return { success: true };
}

const VALID_AI_CATEGORIES = ['plumbing', 'electrical', 'structural', 'common_area', 'emergency', 'hvac', 'elevator', 'other'];

export async function updateTicketAiOverride(
  ticketId: string,
  overrides: { ai_category?: string; ai_urgency?: number; ai_vendor_suggestion?: string },
  buildingId?: string
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  if (overrides.ai_urgency !== undefined) {
    if (!Number.isInteger(overrides.ai_urgency) || overrides.ai_urgency < 1 || overrides.ai_urgency > 10) {
      return { success: false, error: 'Urgency must be an integer between 1 and 10' };
    }
  }

  if (overrides.ai_category !== undefined && !VALID_AI_CATEGORIES.includes(overrides.ai_category)) {
    return { success: false, error: `Invalid category. Must be one of: ${VALID_AI_CATEGORIES.join(', ')}` };
  }

  const { error } = await supabase
    .from('tickets')
    .update({ ...overrides, ai_override: true, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(buildingId ? `/w/${buildingId}` : '/');
  return { success: true };
}
