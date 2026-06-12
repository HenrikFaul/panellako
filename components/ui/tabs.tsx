'use client';

/*
 * SegmentedTabs — the single tab-bar style for the whole app (v0.9.33).
 * Replaces the three divergent bespoke tab designs (border-bottom on
 * budapest-2030, emerald pills on hulladék, amber pills on zaj).
 */
export interface SegmentedTab<T extends string = string> {
  key: T;
  label: string;
}

export default function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  className = '',
  ariaLabel,
}: {
  tabs: ReadonlyArray<SegmentedTab<T>>;
  active: T;
  onChange: (key: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex max-w-full flex-wrap gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
