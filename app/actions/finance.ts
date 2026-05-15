'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface CreateFinanceEntryInput {
  unit_id: string;
  period: string;
  expected_amount: number;
  paid_amount?: number;
  due_date: string;
}

export async function createFinanceEntry(input: CreateFinanceEntryInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { data, error } = await supabase
    .from('finance_entries')
    .insert({
      unit_id: input.unit_id,
      period: input.period,
      expected_amount: input.expected_amount,
      paid_amount: input.paid_amount ?? 0,
      due_date: input.due_date
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}

export async function recordPayment(financeEntryId: string, paidAmount: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { error } = await supabase
    .from('finance_entries')
    .update({ paid_amount: paidAmount })
    .eq('id', financeEntryId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
