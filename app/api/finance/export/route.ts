import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/finance/export?buildingId=<uuid>&period=<YYYY-MM>
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const buildingId = searchParams.get('buildingId');
  const period = searchParams.get('period') ?? undefined;

  if (!buildingId) {
    return NextResponse.json({ error: 'buildingId kötelező' }, { status: 400 });
  }

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Hitelesítés szükséges' }, { status: 401 });
  }

  // Role check — must be member with finance access
  const { data: memberships } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ error: 'Nincs jogosultsága' }, { status: 403 });
  }

  const role = (memberships[0] as { role: string }).role;
  const ALLOWED = ['kozos_kepviselo', 'megbizott', 'konyvelo'];
  if (!ALLOWED.includes(role)) {
    return NextResponse.json({ error: 'Nincs jogosultsága a pénzügyi exporthoz' }, { status: 403 });
  }

  // Fetch units for this building
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id, unit_label')
    .eq('building_id', buildingId)
    .order('unit_label');

  if (unitsError) {
    return NextResponse.json({ error: unitsError.message }, { status: 500 });
  }

  if (!units || units.length === 0) {
    return NextResponse.json({ error: 'Nincs albetét ehhez az épülethez' }, { status: 404 });
  }

  const unitIds = units.map((u: { id: string }) => u.id);
  const unitLabelMap: Record<string, string> = {};
  for (const u of units as { id: string; unit_label: string }[]) {
    unitLabelMap[u.id] = u.unit_label;
  }

  // Fetch finance entries
  let query = supabase
    .from('finance_entries')
    .select('unit_id, period, entry_type, expected_amount, paid_amount, due_date')
    .in('unit_id', unitIds)
    .order('period', { ascending: false })
    .order('unit_id');

  if (period) {
    query = query.eq('period', period);
  }

  const { data: entries, error: entriesError } = await query;
  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  // Build CSV
  const header = 'Albetét,Időszak,Típus,Várható,Befizetett,Hátralék,Esedékes';
  const rows = (entries ?? []).map((e: {
    unit_id: string;
    period: string;
    entry_type: string;
    expected_amount: number;
    paid_amount: number;
    due_date: string | null;
  }) => {
    const arrears = Math.max(0, Number(e.expected_amount) - Number(e.paid_amount));
    const label = unitLabelMap[e.unit_id] ?? e.unit_id;
    return [
      `"${label}"`,
      e.period,
      e.entry_type,
      Number(e.expected_amount).toFixed(2),
      Number(e.paid_amount).toFixed(2),
      arrears.toFixed(2),
      e.due_date ?? '',
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');

  const filename = period
    ? `penziigyek_${period}.csv`
    : `penziigyek_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
