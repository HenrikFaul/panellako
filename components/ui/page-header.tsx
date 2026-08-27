import type { ReactNode } from 'react';

/*
 * PageHeader — unified subpage header (v0.9.33).
 * One canonical pattern: icon chip + title + subtitle + optional meta line
 * (address, data sources) + optional right-side actions.
 */
export default function PageHeader({
  icon,
  title,
  subtitle,
  meta,
  actions,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0 flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="break-words text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm leading-relaxed text-slate-600">{subtitle}</p>}
          {meta && <div className="mt-1.5 text-xs text-slate-500">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
