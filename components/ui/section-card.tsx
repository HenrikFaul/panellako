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
      className={`min-w-0 overflow-hidden rounded-[18px] border border-white/[0.07] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:p-6${className ? ` ${className}` : ''}`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-[-0.01em] text-slate-100">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-500/[0.08] text-brand-300">
              {icon}
            </span>
            {title}
          </h2>
          {note && <p className="ml-[42px] mt-1 text-xs text-slate-400">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
