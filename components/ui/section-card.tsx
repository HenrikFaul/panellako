import type { ReactNode } from 'react';

/*
 * SectionCard — the standard dashboard/subpage content section (v0.9.33).
 * Dark enterprise surface: white/4% card on #060c18, hairline border,
 * icon chip in muted brand tint, calm typography.
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
      className={`min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5${className ? ` ${className}` : ''}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-slate-100">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
              {icon}
            </span>
            {title}
          </h2>
          {note && <p className="ml-[42px] mt-0.5 text-[11px] text-slate-500">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
