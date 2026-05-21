'use client';

/**
 * DashboardHeroScene · v0.7.15
 * ─────────────────────────────────────────────────────────────────────────────
 * Time-of-day and season aware animated SVG scene that replaces the static
 * dark-night skyline in the dashboard hero header.
 *
 * Design goals (Crazy Innovations doctrine — original, useful, never pointless):
 *   - Ambient "alive city" feedback: the user can glance at the dashboard at
 *     any hour and feel the time of day and season — situational awareness
 *     that strengthens product memory.
 *   - Zero new dependencies. Pure CSS keyframes + inline SVG.
 *   - GPU-friendly: only transform / opacity animate; randomness is memoised.
 *   - Respects prefers-reduced-motion: in that case the scene renders the
 *     correct palette and silhouettes but freezes all motion.
 *   - Self-contained: no global CSS bleed; all keyframes are scoped inside
 *     a <style> tag that lives inside the component subtree.
 *   - Performance budget: ≤30 KB component, 2–5 s animation intervals, the
 *     tram only re-spawns every 25–45 s.
 *
 * Public API:
 *   <DashboardHeroScene forceTimeOfDay forceSeason className />
 *
 * Author notes:
 *   - The existing PanelSkylineSvg silhouette is kept conceptually (panel-
 *     building rows of windows, antenna, chimneys) so the hero remains
 *     recognisable — only the sky, props, and motion become alive.
 *   - The scene fits the same ~108 px hero slot. ViewBox 0 -20 → 418 138.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────
export type TimeOfDay =
  | 'dawn'
  | 'morning'
  | 'day'
  | 'afternoon'
  | 'sunset'
  | 'evening'
  | 'night';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

interface Props {
  /** Override the time of day (for testing / preview). Default: current browser time. */
  forceTimeOfDay?: TimeOfDay;
  /** Override the season. Default: current calendar month. */
  forceSeason?: Season;
  /** Optional className for the wrapper div */
  className?: string;
  /** When true, the internal tram is suppressed — use when HeroVehicle is
   *  rendered as a sibling overlay so the two don't collide. */
  hideTram?: boolean;
}

// ─── Time/season detection ─────────────────────────────────────────────────
function detectTimeOfDay(date: Date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'day';
  if (h >= 16 && h < 19) return 'afternoon';
  if (h >= 19 && h < 21) return 'sunset';
  if (h >= 21 && h < 23) return 'evening';
  return 'night'; // 23..4
}

function detectSeason(date: Date = new Date()): Season {
  const m = date.getMonth(); // 0-11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

// ─── Sky palettes per time of day ───────────────────────────────────────────
function skyGradient(tod: TimeOfDay): { from: string; mid: string; to: string; midOffset: number } {
  switch (tod) {
    case 'dawn':
      return { from: '#ea580c', mid: '#fbbf24', to: '#fed7aa', midOffset: 35 };
    case 'morning':
      return { from: '#fbbf24', mid: '#fde68a', to: '#fef3c7', midOffset: 50 };
    case 'day':
      return { from: '#38bdf8', mid: '#7dd3fc', to: '#bae6fd', midOffset: 55 };
    case 'afternoon':
      return { from: '#fde68a', mid: '#fbbf24', to: '#fef3c7', midOffset: 50 };
    case 'sunset':
      return { from: '#ea580c', mid: '#f97316', to: '#fed7aa', midOffset: 35 };
    case 'evening':
      return { from: '#1e1b4b', mid: '#312e81', to: '#4338ca', midOffset: 55 };
    case 'night':
    default:
      return { from: '#010610', mid: '#040e24', to: '#0d2248', midOffset: 40 };
  }
}

// Whether the celestial body shown is a moon (vs. sun).
function isNightish(tod: TimeOfDay): boolean {
  return tod === 'evening' || tod === 'night';
}

// Building palette adapts so windows don't disappear in bright sky.
function buildingPalette(tod: TimeOfDay): {
  topFill: string;
  bottomFill: string;
  pilaster: string;
  slab: string;
  rim: string;
  litWarm: string;
  litCool: string;
  windowDark: string;
  ground: string;
} {
  if (tod === 'day' || tod === 'morning' || tod === 'afternoon') {
    return {
      topFill: '#cbd5e1',
      bottomFill: '#94a3b8',
      pilaster: '#94a3b8',
      slab: '#64748b',
      rim: '#475569',
      litWarm: '#f7c873',
      litCool: '#7fb6e8',
      windowDark: '#334155',
      ground: '#475569',
    };
  }
  if (tod === 'dawn' || tod === 'sunset') {
    return {
      topFill: '#7c2d12',
      bottomFill: '#431407',
      pilaster: '#431407',
      slab: '#7c2d12',
      rim: '#fbbf24',
      litWarm: '#fde047',
      litCool: '#fb923c',
      windowDark: '#1c1917',
      ground: '#451a03',
    };
  }
  // evening / night
  return {
    topFill: '#10182a',
    bottomFill: '#070a14',
    pilaster: '#14202e',
    slab: '#1b2d44',
    rim: '#4a7ab5',
    litWarm: '#f7c873',
    litCool: '#7fb6e8',
    windowDark: '#0a0f1c',
    ground: '#2a5080',
  };
}

// ─── Deterministic pseudo-random helpers (mount-stable) ─────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function DashboardHeroScene({
  forceTimeOfDay,
  forceSeason,
  className,
  hideTram = false,
}: Props) {
  // Time-of-day re-evaluates once a minute (cheap).
  const [tod, setTod] = useState<TimeOfDay>(() => forceTimeOfDay ?? detectTimeOfDay());

  useEffect(() => {
    if (forceTimeOfDay) {
      setTod(forceTimeOfDay);
      return;
    }
    setTod(detectTimeOfDay());
    const id = setInterval(() => setTod(detectTimeOfDay()), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceTimeOfDay]);

  // Season is fixed for the session unless overridden — months don't change
  // during a dashboard view.
  const season: Season = useMemo(
    () => forceSeason ?? detectSeason(),
    [forceSeason]
  );

  // Tram trigger: re-spawns at random 25–45 s intervals.
  const [tramKey, setTramKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      const delay = 25_000 + Math.random() * 20_000;
      const id = setTimeout(() => {
        if (cancelled) return;
        setTramKey((k: number) => k + 1);
        schedule();
      }, delay);
      return id;
    };
    // First tram appears 5–15 s after mount so the user sees motion early.
    const firstDelay = 5_000 + Math.random() * 10_000;
    const firstId = setTimeout(() => {
      if (cancelled) return;
      setTramKey((k: number) => k + 1);
      schedule();
    }, firstDelay);
    return () => {
      cancelled = true;
      clearTimeout(firstId);
    };
  }, []);

  // Stable randomness for stars, snow, leaves — generated once.
  const rng = useMemo(() => mulberry32(1337), []);
  const stars = useMemo(
    () =>
      Array.from({ length: 38 }, (_, i) => ({
        cx: rng() * 418,
        cy: rng() * 70,
        r: 0.4 + rng() * 1.4,
        opacity: 0.4 + rng() * 0.5,
        twinkleDelay: rng() * 5,
        twinkleDuration: 2 + rng() * 4,
        id: i,
      })),
    [rng]
  );

  // Three slowly rotating constellation clusters.
  const constellations = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        cx: 60 + i * 130 + rng() * 20,
        cy: 12 + rng() * 18,
        pts: Array.from({ length: 5 }, () => ({
          x: (rng() - 0.5) * 14,
          y: (rng() - 0.5) * 8,
        })),
        duration: 10 + rng() * 8,
        id: i,
      })),
    [rng]
  );

  const snowflakes = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        startX: rng() * 418,
        r: 0.7 + rng() * 1.1,
        duration: 9 + rng() * 8,
        delay: rng() * 12,
        drift: 6 + rng() * 10,
        id: i,
      })),
    [rng]
  );

  const leaves = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        startX: rng() * 418,
        color: ['#f97316', '#dc2626', '#facc15', '#ea580c'][Math.floor(rng() * 4)],
        duration: 9 + rng() * 6,
        delay: rng() * 14,
        drift: 12 + rng() * 18,
        scale: 0.8 + rng() * 0.6,
        id: i,
      })),
    [rng]
  );

  const clouds = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        baseY: 18 + i * 12 + rng() * 6,
        duration: 50 + rng() * 30,
        delay: -rng() * 50,
        opacity: 0.55 + rng() * 0.35,
        scale: 0.8 + rng() * 0.5,
        id: i,
      })),
    [rng]
  );

  const sky = skyGradient(tod);
  const palette = buildingPalette(tod);
  const showStars = tod === 'night' || tod === 'evening';
  const showSun = !isNightish(tod);
  const showMoon = isNightish(tod);
  const showClouds = tod !== 'night' && tod !== 'evening';

  // Where on the sky is the celestial body? Higher for "day", low for dawn/sunset.
  const sunY = useMemo(() => {
    switch (tod) {
      case 'dawn':
        return 92;
      case 'morning':
        return 40;
      case 'day':
        return 18;
      case 'afternoon':
        return 38;
      case 'sunset':
        return 92;
      default:
        return 18; // moon
    }
  }, [tod]);

  // ─── SVG geometry (compatible with existing PanelSkylineSvg) ─────────────
  type Building = {
    x: number;
    top: number;
    w: number;
    cols: number;
    rows: number;
    chimneys: number[];
    antenna?: boolean;
  };
  const buildings: Building[] = [
    { x: 4, top: 29, w: 86, cols: 4, rows: 6, chimneys: [16, 58] },
    { x: 94, top: 3, w: 122, cols: 6, rows: 8, chimneys: [16, 56, 100], antenna: true },
    { x: 220, top: 16, w: 104, cols: 5, rows: 7, chimneys: [18, 80] },
    { x: 328, top: 42, w: 86, cols: 4, rows: 5, chimneys: [14, 62] },
  ];
  const GROUND = 118;
  const winW = 12;
  const winH = 8;
  const gapX = 6;
  const gapY = 5;
  const padX = 10;
  const padTop = 10;

  const windows = useMemo(
    () =>
      buildings.flatMap((b, bi) =>
        Array.from({ length: b.rows }, (_, r) =>
          Array.from({ length: b.cols }, (_, c) => {
            const seed = bi * 37 + r * 17 + c * 11;
            const lit = seed % 10 < 7;
            const warm = (seed * 3) % 10 < 8;
            const wx = b.x + padX + c * (winW + gapX);
            const wy = b.top + padTop + r * (winH + gapY);
            const flicker = (seed * 7) % 11 < 4; // ~36% of lit windows flicker subtly
            return { wx, wy, lit, warm, flicker, key: `w-${bi}-${r}-${c}` };
          })
        ).flat()
      ),
    // buildings is a stable literal; safe to leave deps empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── Tree placements (seasonal) ──────────────────────────────────────────
  // Trees sit between buildings on the ground line. We choose three slots
  // where they don't collide with the building rects.
  const treeSlots = useMemo(
    () => [
      { x: 92, scale: 0.9 }, // between bldg 0 and 1
      { x: 218, scale: 1.0 }, // between bldg 1 and 2
      { x: 326, scale: 0.85 }, // between bldg 2 and 3
    ],
    []
  );

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes panellako-twinkle {
          0%, 100% { opacity: var(--star-base-op, 0.7); }
          50%      { opacity: 0.15; }
        }
        @keyframes panellako-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes panellako-flicker {
          0%, 100% { opacity: 0.92; }
          47%      { opacity: 0.78; }
          51%      { opacity: 1.0; }
          54%      { opacity: 0.85; }
        }
        @keyframes panellako-cloud {
          0%   { transform: translateX(440px); }
          100% { transform: translateX(-160px); }
        }
        @keyframes panellako-tram {
          0%   { transform: translateX(-100px); }
          100% { transform: translateX(440px); }
        }
        @keyframes panellako-snow {
          0%   { transform: translate3d(0, -8px, 0); opacity: 0; }
          10%  { opacity: 0.9; }
          90%  { opacity: 0.9; }
          100% { transform: translate3d(var(--drift, 8px), 138px, 0); opacity: 0; }
        }
        @keyframes panellako-leaf {
          0%   { transform: translate3d(0, -6px, 0) rotate(0deg); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translate3d(var(--drift, 14px), 138px, 0) rotate(540deg); opacity: 0; }
        }
        @keyframes panellako-shoot {
          0%   { transform: translate(0,0); opacity: 0; }
          5%   { opacity: 1; }
          25%  { opacity: 1; }
          40%  { transform: translate(80px, 28px); opacity: 0; }
          100% { transform: translate(80px, 28px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .panellako-anim { animation: none !important; }
        }
      `}</style>

      <svg
        viewBox="0 -20 418 138"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="phs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sky.from} />
            <stop offset={`${sky.midOffset}%`} stopColor={sky.mid} />
            <stop offset="100%" stopColor={sky.to} />
          </linearGradient>
          <linearGradient id="phs-bldg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.topFill} />
            <stop offset="100%" stopColor={palette.bottomFill} />
          </linearGradient>
          <linearGradient id="phs-rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={palette.rim} stopOpacity="0" />
            <stop offset="100%" stopColor={palette.rim} stopOpacity="0.45" />
          </linearGradient>
          <radialGradient id="phs-celestial-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={showMoon ? '#fef3c7' : '#fde047'} stopOpacity="0.55" />
            <stop offset="60%" stopColor={showMoon ? '#fef3c7' : '#fde047'} stopOpacity="0.15" />
            <stop offset="100%" stopColor={showMoon ? '#fef3c7' : '#fde047'} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="phs-horizon" cx="50%" cy="115%" r="35%">
            <stop offset="0%" stopColor={tod === 'day' ? '#bae6fd' : tod === 'night' ? '#1a4a8a' : '#fde68a'} stopOpacity="0.5" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="-20" width="418" height="138" fill="url(#phs-sky)" />

        {/* Atmospheric horizon glow */}
        <ellipse cx="209" cy="138" rx="200" ry="48" fill="url(#phs-horizon)" />

        {/* Stars (night / evening) */}
        {showStars && (
          <g>
            {stars.map((s) => (
              <circle
                key={`star-${s.id}`}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill="#fef3c7"
                style={
                  {
                    opacity: s.opacity,
                    ['--star-base-op' as string]: String(s.opacity),
                    animation: `panellako-twinkle ${s.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
                  } as CSSProperties
                }
                className="panellako-anim"
              />
            ))}
            {/* Slowly rotating constellations */}
            {constellations.map((c) => (
              <g
                key={`con-${c.id}`}
                style={{
                  transformOrigin: `${c.cx}px ${c.cy}px`,
                  transformBox: 'fill-box',
                  animation: `panellako-rotate ${c.duration}s linear infinite`,
                }}
                className="panellako-anim"
              >
                {c.pts.map((p, i) => (
                  <circle
                    key={`con-${c.id}-${i}`}
                    cx={c.cx + p.x}
                    cy={c.cy + p.y}
                    r={0.8}
                    fill="#fef3c7"
                    opacity={0.85}
                  />
                ))}
              </g>
            ))}
            {/* Shooting star — slow, rare */}
            <g
              className="panellako-anim"
              style={{ animation: 'panellako-shoot 30s linear infinite' }}
            >
              <line
                x1="40"
                y1="14"
                x2="50"
                y2="16"
                stroke="#fef3c7"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0"
              />
            </g>
          </g>
        )}

        {/* Sun or Moon */}
        {(showSun || showMoon) && (
          <g>
            <circle
              cx={362}
              cy={sunY}
              r="22"
              fill="url(#phs-celestial-glow)"
            />
            <circle
              cx={362}
              cy={sunY}
              r={showMoon ? 7 : 9}
              fill={showMoon ? '#fef3c7' : '#fde047'}
              opacity={showMoon ? 0.95 : 1}
            />
            {/* Moon crater hint */}
            {showMoon && (
              <>
                <circle cx={359} cy={sunY - 1.5} r="1.2" fill="#fde68a" opacity="0.55" />
                <circle cx={364} cy={sunY + 2} r="0.9" fill="#fde68a" opacity="0.45" />
              </>
            )}
          </g>
        )}

        {/* Clouds (daytime + dawn/sunset) */}
        {showClouds && (
          <g opacity="0.85">
            {clouds.map((c) => (
              <g
                key={`cloud-${c.id}`}
                className="panellako-anim"
                style={{
                  animation: `panellako-cloud ${c.duration}s linear ${c.delay}s infinite`,
                  opacity: c.opacity,
                }}
              >
                <g transform={`translate(0 ${c.baseY}) scale(${c.scale})`}>
                  <ellipse cx="0" cy="0" rx="14" ry="5" fill="#ffffff" opacity="0.85" />
                  <ellipse cx="10" cy="-2" rx="10" ry="4" fill="#ffffff" opacity="0.8" />
                  <ellipse cx="-9" cy="1" rx="8" ry="3.5" fill="#ffffff" opacity="0.75" />
                </g>
              </g>
            ))}
          </g>
        )}

        {/* Background trees (drawn before buildings so buildings overlap front-tree foliage) */}
        <Trees slots={treeSlots} season={season} groundY={GROUND} />

        {/* Buildings */}
        {buildings.map((b, bi) => {
          const bH = GROUND - b.top;
          const pilasters = [
            b.x + 1,
            ...Array.from({ length: b.cols - 1 }, (_, c) =>
              b.x + padX + (c + 1) * (winW + gapX) - 3
            ),
            b.x + b.w - 4,
          ];
          const slabs = Array.from({ length: b.rows - 1 }, (_, r) =>
            b.top + padTop + (r + 1) * (winH + gapY) - 2.5
          );
          return (
            <g key={`bld-${bi}`}>
              <rect x={b.x} y={b.top} width={b.w} height={bH} fill="url(#phs-bldg)" rx="1.5" />
              {pilasters.map((px, pi) => (
                <rect
                  key={`p-${bi}-${pi}`}
                  x={px}
                  y={b.top}
                  width={3}
                  height={bH}
                  fill={palette.pilaster}
                  rx="0.5"
                />
              ))}
              {slabs.map((sy, si) => (
                <rect
                  key={`s-${bi}-${si}`}
                  x={b.x}
                  y={sy}
                  width={b.w}
                  height={1.5}
                  fill={palette.slab}
                />
              ))}
              {b.chimneys.map((off, ci) => {
                const ch = 9 + (ci % 2) * 5;
                return (
                  <g key={`ch-${bi}-${ci}`}>
                    <rect
                      x={b.x + off - 2.5}
                      y={b.top - ch}
                      width={5}
                      height={ch}
                      fill={palette.bottomFill}
                      rx="0.5"
                    />
                    <rect
                      x={b.x + off - 3.5}
                      y={b.top - ch}
                      width={7}
                      height={2}
                      fill={palette.slab}
                      rx="0.3"
                    />
                  </g>
                );
              })}
              {b.antenna && (
                <g opacity="0.75">
                  <line
                    x1={b.x + b.w / 2}
                    y1={b.top - 19}
                    x2={b.x + b.w / 2}
                    y2={b.top}
                    stroke={palette.slab}
                    strokeWidth="1"
                  />
                  <line
                    x1={b.x + b.w / 2 - 9}
                    y1={b.top - 14}
                    x2={b.x + b.w / 2 + 9}
                    y2={b.top - 14}
                    stroke={palette.slab}
                    strokeWidth="0.8"
                  />
                  <line
                    x1={b.x + b.w / 2 - 5}
                    y1={b.top - 9}
                    x2={b.x + b.w / 2 + 5}
                    y2={b.top - 9}
                    stroke={palette.slab}
                    strokeWidth="0.8"
                  />
                  <circle
                    cx={b.x + b.w / 2}
                    cy={b.top - 20}
                    r="1.5"
                    fill="#e03030"
                    fillOpacity="0.65"
                  />
                </g>
              )}
              <rect
                x={b.x + b.w - 1.5}
                y={b.top}
                width="1.5"
                height={bH}
                fill="url(#phs-rim)"
              />
            </g>
          );
        })}

        {/* Ground */}
        <rect x="0" y={GROUND} width="418" height="2" fill={palette.ground} fillOpacity="0.7" />
        <rect x="0" y={GROUND + 2} width="418" height="18" fill={palette.bottomFill} fillOpacity="0.35" />

        {/* Windows */}
        {windows.map(({ wx, wy, lit, warm, flicker, key }, i) => (
          <rect
            key={key}
            x={wx}
            y={wy}
            width={winW}
            height={winH}
            rx="1"
            fill={lit ? (warm ? palette.litWarm : palette.litCool) : palette.windowDark}
            fillOpacity={lit ? (warm ? 0.92 : 0.55) : 0.6}
            style={
              flicker && lit
                ? {
                    animation: `panellako-flicker ${4 + (i % 5)}s ease-in-out ${(i % 7) * 0.7}s infinite`,
                    transformOrigin: 'center',
                  }
                : undefined
            }
            className={flicker && lit ? 'panellako-anim' : undefined}
          />
        ))}

        {/* Falling leaves (autumn) */}
        {season === 'autumn' &&
          leaves.map((l) => (
            <g
              key={`leaf-${l.id}`}
              transform={`translate(${l.startX} 0)`}
            >
              <g
                className="panellako-anim"
                style={
                  {
                    animation: `panellako-leaf ${l.duration}s linear ${l.delay}s infinite`,
                    ['--drift' as string]: `${l.drift}px`,
                    transformOrigin: 'center',
                  } as CSSProperties
                }
              >
                <path
                  d={`M0,0 Q3,-3 6,0 Q3,3 0,0 Z`}
                  transform={`scale(${l.scale})`}
                  fill={l.color}
                  opacity="0.85"
                />
              </g>
            </g>
          ))}

        {/* Snowfall (winter) */}
        {season === 'winter' &&
          snowflakes.map((s) => (
            <g key={`snow-${s.id}`} transform={`translate(${s.startX} 0)`}>
              <g
                className="panellako-anim"
                style={
                  {
                    animation: `panellako-snow ${s.duration}s linear ${s.delay}s infinite`,
                    ['--drift' as string]: `${s.drift}px`,
                  } as CSSProperties
                }
              >
                <circle cx="0" cy="0" r={s.r} fill="#ffffff" opacity="0.92" />
              </g>
            </g>
          ))}

        {/* The mini tram — suppressed when HeroVehicle overlay is active */}
        {!hideTram && <Tram tramKey={tramKey} groundY={GROUND} nightish={isNightish(tod)} />}
      </svg>
    </div>
  );
}

// ─── Trees subcomponent ────────────────────────────────────────────────────
function Trees({
  slots,
  season,
  groundY,
}: {
  slots: { x: number; scale: number }[];
  season: Season;
  groundY: number;
}) {
  return (
    <g>
      {slots.map((slot, i) => (
        <Tree key={`tree-${i}`} x={slot.x} scale={slot.scale} season={season} groundY={groundY} idx={i} />
      ))}
    </g>
  );
}

function Tree({
  x,
  scale,
  season,
  groundY,
  idx,
}: {
  x: number;
  scale: number;
  season: Season;
  groundY: number;
  idx: number;
}) {
  // Trunk geometry — short and slim to fit under the panel buildings.
  const trunkH = 14 * scale;
  const trunkW = 3 * scale;
  const baseY = groundY;
  const trunkTop = baseY - trunkH;
  const canopyR = 9 * scale;
  const canopyCy = trunkTop - 2;

  // Spring: green canopy + pink blossom dots.
  // Summer: dense vibrant green.
  // Autumn: warm-colored canopy (no falling animation here — global leaves above).
  // Winter: bare branches only.

  if (season === 'winter') {
    return (
      <g>
        <rect x={x - trunkW / 2} y={trunkTop} width={trunkW} height={trunkH} fill="#3f2410" rx="0.5" />
        {/* bare branches */}
        <line x1={x} y1={trunkTop + 4} x2={x - 6 * scale} y2={trunkTop - 4} stroke="#3f2410" strokeWidth={1.2 * scale} strokeLinecap="round" />
        <line x1={x} y1={trunkTop + 6} x2={x + 6 * scale} y2={trunkTop - 3} stroke="#3f2410" strokeWidth={1.2 * scale} strokeLinecap="round" />
        <line x1={x} y1={trunkTop + 1} x2={x - 3 * scale} y2={trunkTop - 6} stroke="#3f2410" strokeWidth={1.0 * scale} strokeLinecap="round" />
        <line x1={x} y1={trunkTop + 1} x2={x + 3 * scale} y2={trunkTop - 7} stroke="#3f2410" strokeWidth={1.0 * scale} strokeLinecap="round" />
        {/* snow caps on branches */}
        <circle cx={x - 5 * scale} cy={trunkTop - 4} r="1" fill="#fff" opacity="0.85" />
        <circle cx={x + 4 * scale} cy={trunkTop - 5} r="1" fill="#fff" opacity="0.85" />
      </g>
    );
  }

  const isSpring = season === 'spring';
  const isSummer = season === 'summer';
  const isAutumn = season === 'autumn';

  const canopyMain = isSpring
    ? '#4ade80'
    : isSummer
    ? '#16a34a'
    : /* autumn */ '#ea580c';
  const canopyShadow = isSpring
    ? '#22c55e'
    : isSummer
    ? '#15803d'
    : /* autumn */ '#b45309';

  return (
    <g>
      <rect x={x - trunkW / 2} y={trunkTop} width={trunkW} height={trunkH} fill="#7c3a14" rx="0.5" />
      {/* Layered canopy = ellipse + a few overlapping circles for "texture" */}
      <ellipse cx={x} cy={canopyCy} rx={canopyR + 1} ry={canopyR * 0.75} fill={canopyShadow} opacity="0.85" />
      <ellipse cx={x - 2} cy={canopyCy - 1} rx={canopyR * 0.8} ry={canopyR * 0.65} fill={canopyMain} />
      <ellipse cx={x + 2} cy={canopyCy + 1} rx={canopyR * 0.7} ry={canopyR * 0.55} fill={canopyMain} opacity="0.9" />
      {/* Autumn: extra red and yellow accent leaves on canopy */}
      {isAutumn && (
        <>
          <circle cx={x - 3} cy={canopyCy - 2} r={1.4 * scale} fill="#dc2626" opacity="0.85" />
          <circle cx={x + 4} cy={canopyCy} r={1.2 * scale} fill="#facc15" opacity="0.85" />
          <circle cx={x + 1} cy={canopyCy + 3} r={1.0 * scale} fill="#f97316" opacity="0.85" />
        </>
      )}
      {/* Spring: pink blossoms */}
      {isSpring && (
        <>
          <circle cx={x - 3} cy={canopyCy - 2} r="1.3" fill="#fbcfe8" />
          <circle cx={x + 3} cy={canopyCy - 1} r="1.1" fill="#fbcfe8" />
          <circle cx={x} cy={canopyCy + 3} r="1.0" fill="#fbcfe8" />
          <circle cx={x - 5} cy={canopyCy + 1} r="0.9" fill="#f9a8d4" />
          <circle cx={x + 5} cy={canopyCy + 2} r="0.9" fill="#f9a8d4" />
        </>
      )}
      {/* Summer: butterfly that fades in/out near tree #2 (only the middle slot) */}
      {isSummer && idx === 1 && (
        <g
          className="panellako-anim"
          style={{
            transformOrigin: `${x}px ${canopyCy - 6}px`,
            animation: 'panellako-twinkle 7s ease-in-out infinite',
          }}
        >
          <path d={`M${x - 1.5},${canopyCy - 6} q-2,-2 -3,0 q2,2 3,0 z`} fill="#f472b6" opacity="0.85" />
          <path d={`M${x + 1.5},${canopyCy - 6} q2,-2 3,0 q-2,2 -3,0 z`} fill="#f472b6" opacity="0.85" />
          <line x1={x} y1={canopyCy - 7} x2={x} y2={canopyCy - 5} stroke="#1f2937" strokeWidth="0.5" />
        </g>
      )}
    </g>
  );
}

// ─── Tram subcomponent ─────────────────────────────────────────────────────
function Tram({
  tramKey,
  groundY,
  nightish,
}: {
  tramKey: number;
  groundY: number;
  nightish: boolean;
}) {
  if (tramKey === 0) return null; // no tram until first scheduled spawn
  const y = groundY - 22;
  const bodyFill = '#fcd34d'; // BKK yellow
  const bodyStroke = '#a16207';
  const windowFill = nightish ? '#fef3c7' : '#bfdbfe';
  const headlight = nightish ? '#fef9c3' : '#fef08a';
  return (
    <g
      key={tramKey}
      className="panellako-anim"
      style={{
        animation: 'panellako-tram 11s linear forwards',
        transform: 'translateX(-100px)',
        willChange: 'transform',
      }}
    >
      {/* Body */}
      <rect x="0" y={y} width="80" height="18" rx="2" fill={bodyFill} stroke={bodyStroke} strokeWidth="0.5" />
      {/* Roof stripe */}
      <rect x="0" y={y} width="80" height="3" fill="#a16207" opacity="0.4" rx="2" />
      {/* Windows */}
      <rect x="4" y={y + 4} width="14" height="8" rx="1" fill={windowFill} opacity={nightish ? 0.95 : 0.85} />
      <rect x="22" y={y + 4} width="14" height="8" rx="1" fill={windowFill} opacity={nightish ? 0.95 : 0.85} />
      <rect x="40" y={y + 4} width="14" height="8" rx="1" fill={windowFill} opacity={nightish ? 0.95 : 0.85} />
      <rect x="58" y={y + 4} width="14" height="8" rx="1" fill={windowFill} opacity={nightish ? 0.95 : 0.85} />
      {/* Headlight (front) */}
      <circle cx="76" cy={y + 14} r="1.4" fill={headlight} opacity={nightish ? 1 : 0.6} />
      {/* Door line */}
      <line x1="36" y1={y + 4} x2="36" y2={y + 16} stroke={bodyStroke} strokeWidth="0.4" opacity="0.5" />
      {/* Wheels (two bogies) */}
      <circle cx="14" cy={y + 19} r="2.4" fill="#1f2937" />
      <circle cx="14" cy={y + 19} r="1" fill="#6b7280" />
      <circle cx="66" cy={y + 19} r="2.4" fill="#1f2937" />
      <circle cx="66" cy={y + 19} r="1" fill="#6b7280" />
      {/* Pantograph (suggestive line at top) */}
      <line x1="38" y1={y - 4} x2="48" y2={y} stroke="#374151" strokeWidth="0.6" />
      <line x1="48" y1={y - 4} x2="58" y2={y} stroke="#374151" strokeWidth="0.6" />
    </g>
  );
}
