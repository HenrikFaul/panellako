import type { ReactNode } from 'react';

/*
 * SectionCard — the standard dashboard/subpage content section (v0.9.33).
 * Daylight application surface: white card on the warm canvas, a soft border,
 * restrained elevation and a muted brand icon chip.
 */
export default function SectionCard({
  id,
  title,
  icon,
  children,
  action,
  className,
  note,
}: {
  id?: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  note?: string;
}) {
  return (
    <section
      id={id}
      className={`workspace-card min-w-0 overflow-hidden rounded-[18px] p-5 md:p-6${className ? ` ${className}` : ''}`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-[-0.01em] text-slate-900">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              {icon}
            </span>
            {title}
          </h2>
          {note && <p className="ml-[42px] mt-1 text-xs text-slate-500">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
