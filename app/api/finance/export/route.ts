import { NextRequest, NextResponse } from 'next/server';
import {
  authorizationMessage,
  requireAuthenticatedUser,
  requireWorkspaceCapability,
} from '@/lib/authorization/guards';

export const dynamic = 'force-dynamic';

// GET /api/finance/export?buildingId=<uuid>&period=<YYYY-MM>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const buildingId = searchParams.get('buildingId');
  const period = searchParams.get('period') ?? undefined;

  if (!buildingId) {
    return NextResponse.json({ error: 'buildingId kötelező' }, { status: 400 });
  }
  if (period && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    return NextResponse.json({ error: 'A period formátuma YYYY-MM.' }, { status: 400 });
  }

  let auth: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  let context: Awaited<ReturnType<typeof requireWorkspaceCapability>>;
  try {
    [auth, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(buildingId, 'finance.export'),
    ]);
  } catch (error) {
    return NextResponse.json({ error: authorizationMessage(error) }, { status: 403 });
  }
  const { supabase } = auth;

  // Fetch units for this building
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id, unit_label')
    .eq('building_id', context.primaryBuildingId)
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
    .eq('workspace_id', context.workspaceId)
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
  const csvCell = (value: string | number) => {
    const raw = String(value);
    const formulaSafe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  };
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
      csvCell(label),
      csvCell(e.period),
      csvCell(e.entry_type),
      csvCell(Number(e.expected_amount).toFixed(2)),
      csvCell(Number(e.paid_amount).toFixed(2)),
      csvCell(arrears.toFixed(2)),
      csvCell(e.due_date ?? ''),
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
