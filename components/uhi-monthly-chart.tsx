'use client';

interface MonthlyEntry {
  month: number;
  label: string;
  celsius: number;
}

interface Props {
  data: MonthlyEntry[];
}

function barColor(celsius: number): string {
  if (celsius < 1.0) return '#38bdf8'; // sky blue — winter
  if (celsius < 1.8) return '#7dd3fc'; // light blue
  if (celsius < 2.5) return '#4ade80'; // green
  if (celsius < 3.2) return '#eab308'; // yellow
  if (celsius < 4.0) return '#f97316'; // orange
  return '#ef4444';                    // red — peak summer
}

export default function UHIMonthlyChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.celsius), 0.5);
  const chartH  = 140; // px height for bars

  return (
    <div className="rounded-2xl bg-slate-900 border border-white/10 p-6">
      <div className="mb-4">
        <h3 className="text-white font-semibold text-base">Szezonális hősziget-hatás</h3>
        <p className="text-slate-400 text-sm mt-0.5">
          Becsült hőmérsékleti többlet hónaponként (°C felett a vidéki háttérhez képest)
        </p>
      </div>

      {/* Bar chart (pure SVG) */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 320 ${chartH + 28}`}
          className="w-full"
          style={{ minWidth: 260 }}
          aria-label="Havi UHI grafikon"
        >
          {/* Y-axis grid lines at 0, 1, 2, 3, 4, 5 */}
          {[0, 1, 2, 3, 4, 5].map((tick) => {
            if (tick > maxVal + 0.5) return null;
            const y = chartH - (tick / (maxVal + 0.5)) * chartH;
            return (
              <g key={tick}>
                <line x1="26" x2="316" y1={y} y2={y} stroke="#1e293b" strokeWidth="1" />
                <text x="22" y={y + 4} textAnchor="end" fontSize="8" fill="#475569">
                  +{tick}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((entry, i) => {
            const totalBars  = data.length;
            const slotW      = (316 - 26) / totalBars;
            const innerPad   = slotW * 0.18;
            const bW         = slotW - innerPad * 2;
            const x          = 26 + i * slotW + innerPad;
            const barH       = Math.max(2, (entry.celsius / (maxVal + 0.5)) * chartH);
            const y          = chartH - barH;
            const color      = barColor(entry.celsius);

            // Highlight current month
            const currentMonth = new Date().getMonth() + 1;
            const isCurrent    = entry.month === currentMonth;

            return (
              <g key={entry.month}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={bW}
                  height={barH}
                  rx="2"
                  fill={color}
                  opacity={isCurrent ? 1 : 0.72}
                />
                {/* Current month ring */}
                {isCurrent && (
                  <rect
                    x={x - 1}
                    y={y - 1}
                    width={bW + 2}
                    height={barH + 2}
                    rx="3"
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    opacity={0.8}
                  />
                )}
                {/* Month label */}
                <text
                  x={x + bW / 2}
                  y={chartH + 14}
                  textAnchor="middle"
                  fontSize={isCurrent ? '8.5' : '8'}
                  fontWeight={isCurrent ? '700' : '400'}
                  fill={isCurrent ? '#e2e8f0' : '#64748b'}
                >
                  {entry.label}
                </text>
                {/* Value tooltip on hover via title */}
                <title>{`${entry.label}: +${entry.celsius.toFixed(1)}°C`}</title>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#38bdf8' }} />
          Téli (alacsony)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#eab308' }} />
          Átmeneti
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#ef4444' }} />
          Nyári (csúcs)
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="w-2.5 h-2.5 rounded border border-slate-400 inline-block" />
          Aktuális hónap
        </span>
      </div>
    </div>
  );
}
