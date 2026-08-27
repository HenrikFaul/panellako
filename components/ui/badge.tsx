import type { ReactNode } from 'react';

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand:   'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger:  'bg-rose-50 text-rose-800 ring-rose-200',
  info:    'bg-sky-50 text-sky-800 ring-sky-200',
  violet:  'bg-violet-50 text-violet-800 ring-violet-200',
};

/*
 * Badge — the single status/label pill for the whole app (v0.9.33).
 * Soft daylight tints with matching ring; no saturated solid fills.
 */
export default function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
