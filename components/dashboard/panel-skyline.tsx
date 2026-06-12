/*
 * PanelSkylineSvg — decorative footer skyline (extracted from
 * dashboard-client.tsx in v0.9.33; rendering unchanged).
 */
export default function PanelSkylineSvg() {
  type Building = {
    x: number; top: number; w: number; cols: number; rows: number;
    chimneys: number[];
    antenna?: boolean;
  };
  const buildings: Building[] = [
    { x: 4,   top: 29, w: 86,  cols: 4, rows: 6, chimneys: [16, 58] },
    { x: 94,  top: 3,  w: 122, cols: 6, rows: 8, chimneys: [16, 56, 100], antenna: true },
    { x: 220, top: 16, w: 104, cols: 5, rows: 7, chimneys: [18, 80] },
    { x: 328, top: 42, w: 86,  cols: 4, rows: 5, chimneys: [14, 62] },
  ];
  const GROUND = 118;
  const winW = 12; const winH = 8;
  const gapX = 6;  const gapY = 5;
  const padX = 10; const padTop = 10;

  const windows = buildings.flatMap((b, bi) =>
    Array.from({ length: b.rows }, (_, r) =>
      Array.from({ length: b.cols }, (_, c) => {
        const seed = bi * 37 + r * 17 + c * 11;
        const lit  = seed % 10 < 7;
        const warm = (seed * 3) % 10 < 8;
        const wx   = b.x + padX + c * (winW + gapX);
        const wy   = b.top + padTop + r * (winH + gapY);
        return { wx, wy, lit, warm };
      })
    ).flat()
  );

  return (
    <svg
      viewBox="0 -20 418 138"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#010610" />
          <stop offset="40%"  stopColor="#040e24" />
          <stop offset="75%"  stopColor="#08193a" />
          <stop offset="100%" stopColor="#0d2248" />
        </linearGradient>
        <radialGradient id="sun-glow" cx="50%" cy="115%" r="35%">
          <stop offset="0%"   stopColor="#1a4a8a" stopOpacity="0.5" />
          <stop offset="60%"  stopColor="#0e2e5e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0e2e5e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bld-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#10182a" />
          <stop offset="100%" stopColor="#070a14" />
        </linearGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#4a7ab5" stopOpacity="0" />
          <stop offset="100%" stopColor="#4a7ab5" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Sky — covers extended viewBox */}
      <rect x="0" y="-20" width="418" height="138" fill="url(#sky-grad)" />
      {/* City horizon glow */}
      <ellipse cx="209" cy="138" rx="200" ry="48" fill="url(#sun-glow)" />
      {/* Atmospheric haze */}
      <rect x="0" y="60" width="418" height="1"   fill="#4a7ab5" fillOpacity="0.08" />
      <rect x="0" y="78" width="418" height="1.5" fill="#4a7ab5" fillOpacity="0.06" />
      {/* Stars */}
      <circle cx="30"  cy="8"  r="0.8" fill="#c8dff5" fillOpacity="0.7" />
      <circle cx="75"  cy="5"  r="1.0" fill="#d8e8ff" fillOpacity="0.8" />
      <circle cx="145" cy="10" r="0.7" fill="#c8dff5" fillOpacity="0.6" />
      <circle cx="200" cy="4"  r="0.9" fill="#d8e8ff" fillOpacity="0.75" />
      <circle cx="280" cy="7"  r="0.6" fill="#c8dff5" fillOpacity="0.5" />
      <circle cx="340" cy="12" r="0.8" fill="#d8e8ff" fillOpacity="0.7" />
      <circle cx="390" cy="6"  r="1.0" fill="#c8dff5" fillOpacity="0.8" />
      {/* Moon */}
      <circle cx="362" cy="18" r="5"   fill="#d4e8ff" fillOpacity="0.12" />
      <circle cx="362" cy="18" r="2.2" fill="#e8f4ff" fillOpacity="0.9" />

      {/* Buildings with architectural detail */}
      {buildings.map((b, bi) => {
        const bH = GROUND - b.top;
        // Pilasters: left edge, between each window col, right edge
        const pilasters = [
          b.x + 1,
          ...Array.from({ length: b.cols - 1 }, (_, c) =>
            b.x + padX + (c + 1) * (winW + gapX) - 3
          ),
          b.x + b.w - 4,
        ];
        // Slab joints between every row of windows
        const slabs = Array.from({ length: b.rows - 1 }, (_, r) =>
          b.top + padTop + (r + 1) * (winH + gapY) - 2.5
        );
        return (
          <g key={`bld-${bi}`}>
            {/* Body */}
            <rect x={b.x} y={b.top} width={b.w} height={bH} fill="url(#bld-grad)" rx="1.5" />
            {/* Vertical pilasters */}
            {pilasters.map((px, pi) => (
              <rect key={`p-${bi}-${pi}`} x={px} y={b.top} width={3} height={bH} fill="#14202e" rx="0.5" />
            ))}
            {/* Horizontal slab joints */}
            {slabs.map((sy, si) => (
              <rect key={`s-${bi}-${si}`} x={b.x} y={sy} width={b.w} height={1.5} fill="#1b2d44" />
            ))}
            {/* Rooftop chimneys */}
            {b.chimneys.map((off, ci) => {
              const ch = 9 + (ci % 2) * 5;
              return (
                <g key={`ch-${bi}-${ci}`}>
                  <rect x={b.x + off - 2.5} y={b.top - ch} width={5} height={ch} fill="#0d1520" rx="0.5" />
                  <rect x={b.x + off - 3.5} y={b.top - ch} width={7} height={2} fill="#16253a" rx="0.3" />
                </g>
              );
            })}
            {/* Antenna — tallest building only */}
            {b.antenna && (
              <g opacity="0.75">
                <line x1={b.x + b.w / 2} y1={b.top - 19} x2={b.x + b.w / 2} y2={b.top} stroke="#2a3f5c" strokeWidth="1" />
                <line x1={b.x + b.w / 2 - 9} y1={b.top - 14} x2={b.x + b.w / 2 + 9} y2={b.top - 14} stroke="#2a3f5c" strokeWidth="0.8" />
                <line x1={b.x + b.w / 2 - 5} y1={b.top - 9}  x2={b.x + b.w / 2 + 5} y2={b.top - 9}  stroke="#2a3f5c" strokeWidth="0.8" />
                <circle cx={b.x + b.w / 2} cy={b.top - 20} r="1.5" fill="#e03030" fillOpacity="0.65" />
              </g>
            )}
            {/* Copper rim light */}
            <rect x={b.x + b.w - 1.5} y={b.top} width="1.5" height={bH} fill="url(#rim)" />
          </g>
        );
      })}

      {/* Ground line — cool blue */}
      <rect x="0" y={GROUND} width="418" height="2" fill="#2a5080" fillOpacity="0.6" />

      {/* Windows */}
      {windows.map(({ wx, wy, lit, warm }, i) => (
        <rect
          key={`w-${i}`}
          x={wx} y={wy} width={winW} height={winH}
          rx="1"
          fill={lit ? (warm ? '#f7c873' : '#7fb6e8') : '#0a0f1c'}
          fillOpacity={lit ? (warm ? 0.92 : 0.55) : 0.6}
        />
      ))}
    </svg>
  );
}
