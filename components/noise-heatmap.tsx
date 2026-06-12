'use client';

import { useEffect, useState } from 'react';

interface HeatmapCell {
  date: string;
  period: string;
  count: number;
  avg_severity: number;
}

const PERIODS = ['ejszaka', 'reggel', 'nappal', 'este'] as const;
const PERIOD_LABELS: Record<string, string> = {
  ejszaka: 'Éjszaka',
  reggel: 'Reggel',
  nappal: 'Nappal',
  este: 'Este',
};

function getColor(count: number): string {
  if (count === 0) return 'bg-white/5';
  if (count === 1) return 'bg-amber-300/30';
  if (count === 2) return 'bg-amber-300/60';
  if (count === 3) return 'bg-amber-400/80';
  if (count <= 5) return 'bg-red-400/70';
  return 'bg-red-500';
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

interface Props {
  workspaceId: string;
}

export default function NoiseHeatmap({ workspaceId }: Props) {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/noise/heatmap?workspace_id=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCells(data);
        else setError(data.error ?? 'Ismeretlen hiba');
      })
      .catch(() => setError('Nem sikerült betölteni az adatokat'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const days = getLast7Days();

  const getCell = (date: string, period: string) =>
    cells.find((c) => c.date === date && c.period === period);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="h-40 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
        {error}
      </div>
    );
  }

  const totalReports = cells.reduce((s, c) => s + c.count, 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Zajnaptár</h2>
          <p className="text-sm text-white/50">Utolsó 7 nap — 4 napszak</p>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
          {totalReports} bejelentés
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] table-fixed">
          <thead>
            <tr>
              <th className="w-20 pb-2 text-left text-xs text-white/40">Napszak</th>
              {days.map((d) => (
                <th key={d} className="pb-2 text-center text-xs text-white/40 font-normal">
                  {formatDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <tr key={period}>
                <td className="py-1 pr-2 text-xs text-white/60 whitespace-nowrap">
                  {PERIOD_LABELS[period]}
                </td>
                {days.map((date) => {
                  const cell = getCell(date, period);
                  const count = cell?.count ?? 0;
                  const avgSev = cell?.avg_severity;
                  return (
                    <td key={date} className="py-1 px-0.5">
                      <div
                        className={`flex h-9 w-full items-center justify-center rounded-lg text-xs font-bold transition-colors ${getColor(count)}`}
                        title={
                          count > 0
                            ? `${count} bejelentés, átlag súlyosság: ${avgSev}`
                            : 'Nincs bejelentés'
                        }
                      >
                        {count > 0 ? count : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <span className="text-xs text-white/40">Intenzitás:</span>
        {[
          { label: '0', cls: 'bg-white/5' },
          { label: '1', cls: 'bg-amber-300/30' },
          { label: '2–3', cls: 'bg-amber-400/80' },
          { label: '4–5', cls: 'bg-red-400/70' },
          { label: '6+', cls: 'bg-red-500' },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`h-3.5 w-3.5 rounded ${cls}`} />
            <span className="text-xs text-white/40">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
