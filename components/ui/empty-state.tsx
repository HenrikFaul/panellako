import type { ReactNode } from 'react';

/*
 * EmptyState — standardized empty list/section placeholder (v0.9.33).
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center ${className}`}>
      {icon && (
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description && <p className="max-w-md text-xs leading-relaxed text-slate-500">{description}</p>}
      {action}
    </div>
  );
}
