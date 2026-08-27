import type { ReactNode } from 'react';

export type StatTone = 'brand' | 'amber' | 'violet' | 'neutral' | 'rose' | 'emerald' | 'sky';

const TONE = {
  brand:   'bg-brand-500/[0.08] text-brand-300',
  amber:   'bg-amber-500/[0.08] text-amber-300',
  violet:  'bg-violet-500/[0.08] text-violet-300',
  rose:    'bg-rose-500/[0.08] text-rose-300',
  emerald: 'bg-emerald-500/[0.08] text-emerald-300',
  sky:     'bg-sky-500/[0.08] text-sky-300',
  neutral: 'bg-white/[0.045] text-slate-400',
} satisfies Record<StatTone, string>;

/*
 * StatCard — enterprise KPI card (v0.9.33).
 * Flat, quiet metric surface. Semantic tone is reserved for the small icon;
 * values and hierarchy stay visually consistent across the row.
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
  const toneClass = TONE[tone];

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-400">{title}</p>
          <p className="mt-2.5 text-[28px] font-semibold leading-none tracking-[-0.025em] text-slate-100 tabular-nums">{value}</p>
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneClass}`}>
          {icon}
        </span>
      </div>
      {subtitle && <p className="mt-3 text-xs leading-relaxed text-slate-400">{subtitle}</p>}
    </>
  );

  const baseClass =
    'relative block min-w-0 rounded-[18px] border border-white/[0.07] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';

  if (href) {
    return (
      <a href={href} className={`${baseClass} transition-colors duration-150 hover:border-white/[0.12] hover:bg-white/[0.05]`}>
        {inner}
      </a>
    );
  }

  return <article className={baseClass}>{inner}</article>;
}
