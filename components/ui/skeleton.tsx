/*
 * Skeleton — shared loading placeholder (v0.9.33).
 */
export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} aria-hidden="true" />;
}

export function SkeletonGroup({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Betöltés">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={i === 0 ? 'h-24' : 'h-14'} />
      ))}
    </div>
  );
}
