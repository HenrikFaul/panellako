import type { ReactNode } from 'react';

export type StatTone = 'brand' | 'amber' | 'violet' | 'neutral' | 'rose' | 'emerald' | 'sky';

const TONE = {
  brand:   { chip: 'bg-brand-500/10 text-brand-400 ring-brand-500/25',     bar: 'bg-brand-500' },
  amber:   { chip: 'bg-amber-500/10 text-amber-400 ring-amber-500/25',     bar: 'bg-amber-500' },
  violet:  { chip: 'bg-violet-500/10 text-violet-400 ring-violet-500/25',  bar: 'bg-violet-500' },
  rose:    { chip: 'bg-rose-500/10 text-rose-400 ring-rose-500/25',        bar: 'bg-rose-500' },
  emerald: { chip: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/25', bar: 'bg-emerald-500' },
  sky:     { chip: 'bg-sky-500/10 text-sky-400 ring-sky-500/25',           bar: 'bg-sky-500' },
  neutral: { chip: 'bg-white/[0.06] text-slate-300 ring-white/10',         bar: 'bg-slate-500' },
} satisfies Record<StatTone, { chip: string; bar: string }>;

/*
 * StatCard — enterprise KPI card (v0.9.33).
 * Replaces the former gradient MetricCard: flat dark surface, left accent
 * bar in the semantic tone, tabular-nums value, uppercase micro label.
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone = 'brand',
  href,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  tone?: StatTone;
  href?: string;
}) {
  const t = TONE[tone];

  const inner = (
    <>
      <span className={`absolute inset-y-3 left-0 w-[3px] rounded-r-full ${t.bar}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-slate-100 tabular-nums">{value}</p>
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${t.chip}`}>
          {icon}
        </span>
      </div>
      {subtitle && <p className="mt-3 truncate text-xs leading-relaxed text-slate-500">{subtitle}</p>}
    </>
  );

  const baseClass =
    'relative block min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 pl-6';

  if (href) {
    return (
      <a href={href} className={`${baseClass} transition-colors hover:border-white/[0.14] hover:bg-white/[0.06]`}>
        {inner}
      </a>
    );
  }

  return <article className={baseClass}>{inner}</article>;
}
