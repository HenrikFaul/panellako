'use server';

import { revalidatePath } from 'next/cache';
import {
  authorizationMessage,
  requireAuthenticatedUser,
  requireUnitAccess,
} from '@/lib/authorization/guards';

export type MeterType = 'viz' | 'gaz' | 'villany';

export interface SubmitMeterReadingInput {
  meter_type: MeterType;
  value: number;
  reading_date: string;
  unit_id?: string;
  unit_label?: string;
  building_id?: string;
}

export async function submitMeterReading(input: SubmitMeterReadingInput) {
  if (!input.building_id || !input.unit_id || !input.unit_label) {
    return { success: false, error: 'Lakóközösség és albetét megadása kötelező.' };
  }

  try {
    const [{ supabase, user }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireUnitAccess(input.building_id, input.unit_id, 'meter.manage_all'),
    ]);

    const { data, error } = await supabase
      .from('meter_readings')
      .insert({
        meter_type: input.meter_type,
        value: input.value,
        reading_date: input.reading_date,
        unit_id: input.unit_id,
        unit_label: input.unit_label,
        building_id: context.primaryBuildingId,
        reported_by: user.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath(`/w/${input.building_id}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}
