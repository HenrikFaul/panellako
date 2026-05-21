import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface HeatmapCell {
  date: string;
  period: string;
  count: number;
  avg_severity: number;
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id kötelező' }, { status: 400 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data, error } = await supabase
    .from('noise_reports')
    .select('occurred_at, period, severity')
    .eq('workspace_id', workspaceId)
    .gte('occurred_at', since.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Aggregate by date + period
  const map = new Map<string, { count: number; severity_sum: number }>();

  for (const row of (data ?? [])) {
    const date = (row.occurred_at as string).slice(0, 10);
    const key = `${date}|${row.period}`;
    const existing = map.get(key) ?? { count: 0, severity_sum: 0 };
    existing.count += 1;
    existing.severity_sum += row.severity as number;
    map.set(key, existing);
  }

  const result: HeatmapCell[] = [];
  for (const [key, val] of map.entries()) {
    const [date, period] = key.split('|');
    result.push({
      date,
      period,
      count: val.count,
      avg_severity: Math.round((val.severity_sum / val.count) * 10) / 10,
    });
  }

  result.sort((a, b) => a.date.localeCompare(b.date) || a.period.localeCompare(b.period));

  return NextResponse.json(result);
}
