export default function Logo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="PanelLakó logó" fill="none">
      <defs>
        <linearGradient id="plGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="104" height="104" rx="24" fill="url(#plGrad)" />
      <path d="M31 82V38h24c14 0 22 7 22 19s-8 19-22 19H45v6H31z" fill="white" />
      <rect x="82" y="34" width="8" height="52" rx="4" fill="white" />
    </svg>
  );
}
