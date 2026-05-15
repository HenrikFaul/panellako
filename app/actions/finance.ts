'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface ChargeInput {
  buildingId: string;
  period: string;
  chargePerUnit: number;
  description?: string;
  dueDate: string;
}

export interface PaymentInput {
  unitId: string;
  amount: number;
  paymentDate: string;
  reference?: string;
  description?: string;
}

export interface ArrearsUnit {
  unit_id: string;
  unit_label: string;
  owner_name: string;
  total_charged: number;
  total_paid: number;
  computed_balance: number;
  latest_due_date: string | null;
}

export interface ArrearsReport {
  building_id: string;
  building_name: string;
  generated_at: string;
  total_arrears: number;
  units_in_arrears: number;
  units: ArrearsUnit[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

function validateAmount(amount: number): boolean {
  return typeof amount === 'number' && isFinite(amount) && amount > 0 && amount <= 10_000_000;
}

function validateDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  return !isNaN(new Date(dateStr).getTime());
}

// ─── 1. Bulk uniform charge for all units in a building ───────────────────────

export async function createCharge(input: ChargeInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };
  if (!input.buildingId) return { success: false, error: 'buildingId megadása kötelező' };
  if (!validatePeriod(input.period)) return { success: false, error: 'period formátuma helytelen (pl. 2026-01)' };
  if (!validateAmount(input.chargePerUnit)) return { success: false, error: 'chargePerUnit érvénytelen összeg' };
  if (!validateDate(input.dueDate)) return { success: false, error: 'dueDate formátuma helytelen (YYYY-MM-DD)' };

  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id, unit_label')
    .eq('building_id', input.buildingId)
    .order('unit_label');

  if (unitsError) return { success: false, error: `Albetétek lekérdezése sikertelen: ${unitsError.message}` };
  if (!units?.length) return { success: false, error: 'Nincs albetét ehhez az épülethez' };

  // Duplicate check
  const { data: existingCharges } = await supabase
    .from('finance_entries')
    .select('unit_id')
    .eq('period', input.period)
    .eq('entry_type', 'charge')
    .in('unit_id', units.map((u) => u.id));

  if (existingCharges?.length) {
    return { success: false, error: `Már létezik terhelés erre az időszakra (${input.period}). Válasszon más időszakot.` };
  }

  const description = input.description ?? `${input.period} közös költség`;
  const rows = units.map((unit) => ({
    unit_id: unit.id,
    period: input.period,
    expected_amount: input.chargePerUnit,
    paid_amount: 0,
    due_date: input.dueDate,
    description,
    entry_type: 'charge' as const,
    created_by: user.id,
  }));

  const { error: insertError } = await supabase.from('finance_entries').insert(rows);
  if (insertError) return { success: false, error: `Terhelés rögzítése sikertelen: ${insertError.message}` };

  revalidatePath('/');
  return { success: true, charged_units: units.length };
}

// ─── 2. Record a payment received from a unit ─────────────────────────────────

export async function recordPayment(input: PaymentInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };
  if (!input.unitId) return { success: false, error: 'unitId megadása kötelező' };
  if (!validateAmount(input.amount)) return { success: false, error: 'Összeg érvénytelen (1–10 000 000 Ft)' };
  if (!validateDate(input.paymentDate)) return { success: false, error: 'paymentDate formátuma helytelen (YYYY-MM-DD)' };

  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('id, unit_label')
    .eq('id', input.unitId)
    .single();

  if (unitError || !unit) return { success: false, error: 'Albetét nem található' };

  const period = input.paymentDate.substring(0, 7);

  const { data: newEntry, error: insertError } = await supabase
    .from('finance_entries')
    .insert({
      unit_id: input.unitId,
      period,
      expected_amount: 0,
      paid_amount: input.amount,
      due_date: input.paymentDate,
      payment_date: new Date(input.paymentDate).toISOString(),
      payment_reference: input.reference ?? null,
      description: input.description ?? `Befizetés — ${input.reference ?? 'nincs referencia'}`,
      entry_type: 'payment',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertError) return { success: false, error: `Befizetés rögzítése sikertelen: ${insertError.message}` };

  const { data: updatedUnit } = await supabase
    .from('units')
    .select('balance_amount')
    .eq('id', input.unitId)
    .single();

  revalidatePath('/');
  return { success: true, entry_id: newEntry?.id, new_balance: updatedUnit?.balance_amount };
}

// ─── 3. Get arrears report for a building ────────────────────────────────────

export async function getArrearsReport(buildingId: string): Promise<{ success: boolean; report?: ArrearsReport; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('id', buildingId)
    .single();

  if (buildingError || !building) return { success: false, error: 'Épület nem található' };

  const { data: arrears, error: arrearsError } = await supabase
    .from('building_arrears_view')
    .select('*')
    .eq('building_id', buildingId);

  if (arrearsError) return { success: false, error: `Hátralék lekérdezése sikertelen: ${arrearsError.message}` };

  const units = (arrears ?? []) as ArrearsUnit[];
  const totalArrears = units.reduce((acc, u) => acc + u.computed_balance, 0);

  return {
    success: true,
    report: {
      building_id: buildingId,
      building_name: building.name,
      generated_at: new Date().toISOString(),
      total_arrears: totalArrears,
      units_in_arrears: units.length,
      units,
    }
  };
}

// ─── 4. Get finance entries for a unit ───────────────────────────────────────

export async function getUnitFinanceHistory(unitId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nem vagy bejelentkezve', entries: [] };

  const { data, error } = await supabase
    .from('finance_entries')
    .select('*')
    .eq('unit_id', unitId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { success: false, error: error.message, entries: [] };
  return { success: true, entries: data ?? [] };
}
