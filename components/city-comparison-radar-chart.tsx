'use client';

import { useState } from 'react';
import { BUDAPEST_INDICATORS, EU_COMPARISON_CITIES, normalizeForRadar } from '@/lib/budapest-2030-data';

// ─── Radar math helpers ───────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function buildPolygon(cx: number, cy: number, maxR: number, values: number[]): string {
  return values
    .map((v, i) => {
      const angle = (i / values.length) * 360;
      const r = (v / 100) * maxR;
      const [x, y] = polarToCartesian(cx, cy, r, angle);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

// ─── Build city value arrays ──────────────────────────────────────────────────

function getCityValues(cityName: string): number[] {
  return BUDAPEST_INDICATORS.map(indicator => {
    const cityEntry = indicator.euComparisonData.find(c => c.city === cityName);
    if (!cityEntry) return 0;
    return normalizeForRadar(indicator, cityEntry.value);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CityComparisonRadarChart() {
  const [activeCities, setActiveCities] = useState<Set<string>>(
    new Set(['Budapest', 'Bécs'])
  );

  const CX = 240;
  const CY = 240;
  const MAX_R = 180;
  const N = BUDAPEST_INDICATORS.length;

  function toggleCity(id: string) {
    setActiveCities(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [25, 50, 75, 100];

  // Axis labels
  const axes = BUDAPEST_INDICATORS.map((ind, i) => {
    const angle = (i / N) * 360;
    const [lx, ly] = polarToCartesian(CX, CY, MAX_R + 22, angle);
    return { label: ind.categoryHu, x: lx, y: ly };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h2 className="text-xl font-black text-white">EU Városok Összehasonlítása</h2>
        <p className="text-sm text-slate-400">
          Mind a 11 EU Zöld Főváros indikátor normalizálva (0–100, 100 = legjobb teljesítmény).
          Jelöld ki a városokat az összehasonlításhoz.
        </p>
      </div>

      {/* City toggles */}
      <div className="flex flex-wrap gap-2">
        {EU_COMPARISON_CITIES.map(city => (
          <button
            key={city.id}
            onClick={() => toggleCity(city.id)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
              activeCities.has(city.id)
                ? 'border-white/30 text-white'
                : 'border-white/10 text-slate-600 hover:text-slate-400'
            }`}
            style={activeCities.has(city.id) ? { borderColor: city.color + '60', background: city.color + '18' } : {}}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: activeCities.has(city.id) ? city.color : '#334155' }}
            />
            {city.label}
          </button>
        ))}
      </div>

      {/* SVG Radar */}
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 480 480"
          className="mx-auto w-full max-w-[480px]"
          style={{ minWidth: 320 }}
        >
          {/* Grid rings */}
          {rings.map(pct => {
            const r = (pct / 100) * MAX_R;
            const ringPts = Array.from({ length: N }, (_, i) => {
              const angle = (i / N) * 360;
              const [x, y] = polarToCartesian(CX, CY, r, angle);
              return `${x.toFixed(2)},${y.toFixed(2)}`;
            }).join(' ');
            return (
              <g key={pct}>
                <polygon
                  points={ringPts}
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                />
                {/* Ring label */}
                <text
                  x={CX + 4}
                  y={CY - r + 3}
                  fontSize="8"
                  fill="rgba(148,163,184,0.5)"
                >
                  {pct}
                </text>
              </g>
            );
          })}

          {/* Axis spokes */}
          {Array.from({ length: N }, (_, i) => {
            const angle = (i / N) * 360;
            const [x2, y2] = polarToCartesian(CX, CY, MAX_R, angle);
            return (
              <line
                key={i}
                x1={CX}
                y1={CY}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* City polygons */}
          {EU_COMPARISON_CITIES.filter(c => activeCities.has(c.id)).map(city => {
            const values = getCityValues(city.id);
            const pts = buildPolygon(CX, CY, MAX_R, values);
            return (
              <g key={city.id}>
                <polygon
                  points={pts}
                  fill={city.color}
                  fillOpacity="0.12"
                  stroke={city.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {/* Dots */}
                {values.map((v, i) => {
                  const angle = (i / N) * 360;
                  const r = (v / 100) * MAX_R;
                  const [x, y] = polarToCartesian(CX, CY, r, angle);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill={city.color}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="1"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Axis labels */}
          {axes.map((ax, i) => {
            const angle = (i / N) * 360;
            let anchor: 'middle' | 'start' | 'end' = 'middle';
            if (angle > 10 && angle < 170) anchor = 'start';
            else if (angle > 190 && angle < 350) anchor = 'end';

            return (
              <text
                key={i}
                x={ax.x}
                y={ax.y}
                fontSize="8.5"
                fill="rgba(148,163,184,0.8)"
                textAnchor={anchor}
                dominantBaseline="middle"
              >
                {ax.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend scores table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-slate-400 font-semibold">Indikátor</th>
              {EU_COMPARISON_CITIES.filter(c => activeCities.has(c.id)).map(city => (
                <th
                  key={city.id}
                  className="px-3 py-2 text-center font-bold"
                  style={{ color: city.color }}
                >
                  {city.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BUDAPEST_INDICATORS.map((ind, i) => (
              <tr key={ind.id} className={i % 2 === 0 ? 'bg-slate-900/30' : ''}>
                <td className="px-3 py-1.5 text-slate-300">{ind.categoryHu}</td>
                {EU_COMPARISON_CITIES.filter(c => activeCities.has(c.id)).map(city => {
                  const entry = ind.euComparisonData.find(e => e.city === city.id);
                  const score = entry ? normalizeForRadar(ind, entry.value) : 0;
                  return (
                    <td key={city.id} className="px-3 py-1.5 text-center tabular-nums">
                      <span
                        className="font-bold"
                        style={{
                          color: score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171',
                        }}
                      >
                        {score}
                      </span>
                      <span className="text-slate-600 ml-0.5 text-[9px]">
                        ({entry?.value ?? '—'} {ind.unit})
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-slate-600">
        Normalizálási módszer: az EU referencia- vagy 2030-célértékhez viszonyítva. 100 pont = legjobb teljesítmény.
        Adatok: EEA European Green Capital Assessment 2023, városi éves riportok.
      </p>
    </div>
  );
}
