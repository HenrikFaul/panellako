import type { ReactNode } from 'react';

export type StatTone = 'brand' | 'amber' | 'violet' | 'neutral' | 'rose' | 'emerald' | 'sky';

const TONE = {
  brand:   'bg-brand-50 text-brand-700 ring-1 ring-brand-100',
  amber:   'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  violet:  'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  rose:    'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  sky:     'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
  neutral: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
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
          <p className="truncate text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2.5 text-[28px] font-semibold leading-none tracking-[-0.025em] text-slate-900 tabular-nums">{value}</p>
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneClass}`}>
          {icon}
        </span>
      </div>
      {subtitle && <p className="mt-3 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
    </>
  );

  const baseClass =
    'workspace-card relative block min-w-0 rounded-[18px] p-5';

  if (href) {
    return (
      <a href={href} className={`${baseClass} transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-md`}>
        {inner}
      </a>
    );
  }

  return <article className={baseClass}>{inner}</article>;
}
