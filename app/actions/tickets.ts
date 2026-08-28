'use server';

import { revalidatePath } from 'next/cache';
import {
  assertLegacyObjectInWorkspace,
  authorizationMessage,
  requireAuthenticatedUser,
  requireUnitAccess,
  requireWorkspaceAccess,
  requireWorkspaceCapability,
} from '@/lib/authorization/guards';

export type TicketPriority = 'alacsony' | 'kozepes' | 'magas' | 'kritikus';
export type TicketStatus = 'uj' | 'folyamatban' | 'varakozik' | 'lezarva';

export interface CreateTicketInput {
  title: string;
  description: string;
  location: string;
  priority: TicketPriority;
  submitted_by?: string;
  unit_label?: string;
  unit_id?: string;
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
  const workspaceId = input.buildingId ?? input.building_id;
  if (!workspaceId) return { success: false, error: 'Lakóközösség megadása kötelező.' };

  try {
    const [{ supabase, user }, context] = await Promise.all([
      requireAuthenticatedUser(),
      input.unit_id
        ? requireUnitAccess(workspaceId, input.unit_id, 'ticket.manage_all')
        : requireWorkspaceAccess(workspaceId),
    ]);

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        title: input.title,
        description: input.description,
        location: input.location,
        priority: input.priority,
        submitted_by: input.submitted_by ?? user.email ?? 'Felhasználó',
        unit_label: input.unit_label,
        unit_id: input.unit_id ?? null,
        building_id: context.primaryBuildingId,
        reporter_id: user.id,
        status: 'uj',
        ai_triage_at: null,
        ai_override: false,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Fire-and-forget — do NOT await
    triggerAiTriage(data.id, input.title, input.description, context.primaryBuildingId);

    revalidatePath(`/w/${workspaceId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus, buildingId?: string) {
  if (!buildingId) return { success: false, error: 'Lakóközösség megadása kötelező.' };
  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(buildingId, 'ticket.manage_all'),
      requireAuthenticatedUser(),
    ]);
    await assertLegacyObjectInWorkspace('tickets', ticketId, buildingId);
    const { error } = await supabase
      .from('tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .eq('building_id', context.primaryBuildingId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/w/${buildingId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}

const VALID_AI_CATEGORIES = ['plumbing', 'electrical', 'structural', 'common_area', 'emergency', 'hvac', 'elevator', 'other'];

export async function updateTicketAiOverride(
  ticketId: string,
  overrides: { ai_category?: string; ai_urgency?: number; ai_vendor_suggestion?: string },
  buildingId?: string
) {
  if (!buildingId) return { success: false, error: 'Lakóközösség megadása kötelező.' };

  if (overrides.ai_urgency !== undefined) {
    if (!Number.isInteger(overrides.ai_urgency) || overrides.ai_urgency < 1 || overrides.ai_urgency > 10) {
      return { success: false, error: 'Urgency must be an integer between 1 and 10' };
    }
  }

  if (overrides.ai_category !== undefined && !VALID_AI_CATEGORIES.includes(overrides.ai_category)) {
    return { success: false, error: `Invalid category. Must be one of: ${VALID_AI_CATEGORIES.join(', ')}` };
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(buildingId, 'ticket.manage_all'),
      requireAuthenticatedUser(),
    ]);
    await assertLegacyObjectInWorkspace('tickets', ticketId, buildingId);
    const { error } = await supabase
      .from('tickets')
      .update({ ...overrides, ai_override: true, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .eq('building_id', context.primaryBuildingId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/w/${buildingId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}
