'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

/*
 * ErrorState — standardized error panel (v0.9.33).
 * One consistent error UX across subpages (previously each page had its own).
 */
export default function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Újrapróbálás',
  className = '',
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-6 py-8 text-center ${className}`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/25">
        <AlertTriangle size={18} />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        {message && <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">{message}</p>}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-1 px-3.5 py-2 text-xs">
          <RefreshCw size={13} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
