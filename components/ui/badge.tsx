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
  neutral: 'bg-white/[0.06] text-slate-300 ring-white/10',
  brand:   'bg-brand-500/10 text-brand-300 ring-brand-500/25',
  success: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25',
  warning: 'bg-amber-500/10 text-amber-300 ring-amber-500/25',
  danger:  'bg-rose-500/10 text-rose-300 ring-rose-500/25',
  info:    'bg-sky-500/10 text-sky-300 ring-sky-500/25',
  violet:  'bg-violet-500/10 text-violet-300 ring-violet-500/25',
};

/*
 * Badge — the single status/label pill for the whole app (v0.9.33).
 * Dark tinted surfaces with matching ring; no saturated solid fills.
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
