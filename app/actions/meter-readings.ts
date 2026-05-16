'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('meter_readings')
    .insert({
      meter_type: input.meter_type,
      value: input.value,
      reading_date: input.reading_date,
      unit_id: input.unit_id ?? null,
      unit_label: input.unit_label ?? null,
      building_id: input.building_id ?? null,
      reported_by: user?.id ?? null
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(input.building_id ? `/w/${input.building_id}` : '/');
  return { success: true, data };
}
