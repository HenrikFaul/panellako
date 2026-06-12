/*
 * ScoreRing — shared circular score indicator (v0.9.33).
 * Single source of truth for the score arcs previously re-implemented on
 * green-score, compact-city and other dashboards.
 */
export default function ScoreRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 9,
  label,
  sublabel,
  color,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  /** Explicit stroke color; defaults to semantic thresholds (rose < 40 ≤ amber < 70 ≤ emerald). */
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = max > 0 ? clamped / max : 0;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const stroke =
    color ?? (pct < 0.4 ? '#fb7185' : pct < 0.7 ? '#fbbf24' : '#34d399');

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-semibold leading-none tracking-tight text-slate-100 tabular-nums">
          {Math.round(value)}
        </span>
        {label && <span className="mt-0.5 text-[10px] text-slate-500">{label}</span>}
        {sublabel && <span className="text-[9px] text-slate-600">{sublabel}</span>}
      </div>
    </div>
  );
}
