'use client';

/**
 * HeroVehicle · v0.8.2
 * ──────────────────────────────────────────────────────────────────────────
 * Animated vehicle overlay for the dashboard hero section.
 * Renders one of 5 vehicle types at random intervals:
 *   Tram · Trolleybus · Bus · Cyclists · A380
 *
 * Usage: drop inside any `position: relative; overflow: hidden` container.
 * The component positions itself absolutely and animates vehicles across
 * the full container width.
 *
 * No external dependencies — pure React + CSS keyframes.
 * Respects prefers-reduced-motion: vehicles don't spawn if the user has
 * requested reduced motion.
 */

import { useEffect, useRef, useState, useMemo } from 'react';

// ─── Vehicle SVG components ────────────────────────────────────────────────

export function Tram({ nightMode = false }: { nightMode?: boolean }) {
  const windowFill = nightMode ? '#fef3c7' : '#bfdbfe';
  const headlight  = nightMode ? '#fef9c3' : '#fef08a';
  return (
    <svg width="88" height="30" viewBox="0 0 88 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <rect x="0" y="3" width="82" height="18" rx="2" fill="#fcd34d" stroke="#a16207" strokeWidth="0.5" />
      {/* Roof stripe */}
      <rect x="0" y="3" width="82" height="3" fill="#a16207" opacity="0.35" rx="2" />
      {/* Windows */}
      <rect x="4"  y="7" width="14" height="8" rx="1" fill={windowFill} opacity="0.9" />
      <rect x="22" y="7" width="14" height="8" rx="1" fill={windowFill} opacity="0.9" />
      <rect x="40" y="7" width="14" height="8" rx="1" fill={windowFill} opacity="0.9" />
      <rect x="58" y="7" width="14" height="8" rx="1" fill={windowFill} opacity="0.9" />
      {/* Door line */}
      <line x1="36" y1="7" x2="36" y2="19" stroke="#a16207" strokeWidth="0.4" opacity="0.5" />
      {/* Headlight */}
      <circle cx="78" cy="17" r="1.4" fill={headlight} opacity={nightMode ? 1 : 0.6} />
      {/* Wheels */}
      <circle cx="14" cy="23" r="2.4" fill="#1f2937" />
      <circle cx="14" cy="23" r="1"   fill="#6b7280" />
      <circle cx="68" cy="23" r="2.4" fill="#1f2937" />
      <circle cx="68" cy="23" r="1"   fill="#6b7280" />
      {/* Pantograph */}
      <line x1="38" y1="0" x2="48" y2="3" stroke="#374151" strokeWidth="0.7" />
      <line x1="48" y1="0" x2="58" y2="3" stroke="#374151" strokeWidth="0.7" />
    </svg>
  );
}

export function Trolleybus({ nightMode = false }: { nightMode?: boolean }) {
  const windowFill = nightMode ? '#fef3c7' : '#bfdbfe';
  return (
    <svg width="72" height="30" viewBox="0 0 72 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <rect x="2" y="5" width="66" height="17" rx="3" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.5" />
      <rect x="2" y="5" width="66" height="4"  fill="#7f1d1d" opacity="0.3" rx="3" />
      {/* Windows */}
      <rect x="6"  y="9" width="10" height="6" rx="1" fill={windowFill} opacity="0.85" />
      <rect x="20" y="9" width="10" height="6" rx="1" fill={windowFill} opacity="0.85" />
      <rect x="34" y="9" width="10" height="6" rx="1" fill={windowFill} opacity="0.85" />
      <rect x="48" y="9" width="12" height="6" rx="1" fill={windowFill} opacity="0.85" />
      {/* Electric poles */}
      <line x1="22" y1="5" x2="22" y2="0" stroke="#374151" strokeWidth="0.9" />
      <line x1="46" y1="5" x2="46" y2="0" stroke="#374151" strokeWidth="0.9" />
      {/* Crossbar wire */}
      <line x1="22" y1="0" x2="46" y2="0" stroke="#374151" strokeWidth="0.5" strokeDasharray="2,2" />
      {/* Wheels */}
      <circle cx="14" cy="24" r="3"   fill="#1f2937" />
      <circle cx="14" cy="24" r="1.2" fill="#6b7280" />
      <circle cx="56" cy="24" r="3"   fill="#1f2937" />
      <circle cx="56" cy="24" r="1.2" fill="#6b7280" />
    </svg>
  );
}

export function Bus({ nightMode = false }: { nightMode?: boolean }) {
  const windowFill = nightMode ? '#fef3c7' : '#bfdbfe';
  return (
    <svg width="68" height="30" viewBox="0 0 68 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <rect x="2" y="4" width="62" height="19" rx="3" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="0.5" />
      <rect x="2" y="4" width="62" height="4"  fill="#1e3a8a" opacity="0.4" rx="3" />
      {/* Destination board */}
      <rect x="4" y="4" width="16" height="4" rx="1" fill="#fcd34d" />
      {/* Windows */}
      <rect x="6"  y="10" width="9" height="6" rx="1" fill={windowFill} opacity="0.85" />
      <rect x="19" y="10" width="9" height="6" rx="1" fill={windowFill} opacity="0.85" />
      <rect x="32" y="10" width="9" height="6" rx="1" fill={windowFill} opacity="0.85" />
      <rect x="45" y="10" width="9" height="6" rx="1" fill={windowFill} opacity="0.85" />
      {/* Headlight */}
      <circle cx="62" cy="20" r="1.2" fill="#fef9c3" opacity={nightMode ? 1 : 0.7} />
      {/* Wheels */}
      <circle cx="13" cy="25" r="3"   fill="#1f2937" />
      <circle cx="13" cy="25" r="1.2" fill="#6b7280" />
      <circle cx="54" cy="25" r="3"   fill="#1f2937" />
      <circle cx="54" cy="25" r="1.2" fill="#6b7280" />
    </svg>
  );
}

export function Cyclists() {
  // Three cyclists in a loose group
  return (
    <svg width="74" height="26" viewBox="0 0 74 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cyclist 1 — orange */}
      <circle cx="10" cy="21" r="4"   stroke="#1f2937" strokeWidth="1" fill="none" />
      <circle cx="10" cy="21" r="1.2" fill="#6b7280" />
      <circle cx="22" cy="21" r="4"   stroke="#1f2937" strokeWidth="1" fill="none" />
      <circle cx="22" cy="21" r="1.2" fill="#6b7280" />
      <path d="M10,21 L16,12 L22,21" stroke="#f97316" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <circle cx="16" cy="10" r="2.5" fill="#f97316" />
      <line x1="16" y1="12" x2="14" y2="14" stroke="#f97316" strokeWidth="1" />
      <line x1="16" y1="12" x2="18" y2="14" stroke="#f97316" strokeWidth="1" />
      {/* Cyclist 2 — green */}
      <circle cx="36" cy="21" r="4"   stroke="#1f2937" strokeWidth="1" fill="none" />
      <circle cx="36" cy="21" r="1.2" fill="#6b7280" />
      <circle cx="48" cy="21" r="4"   stroke="#1f2937" strokeWidth="1" fill="none" />
      <circle cx="48" cy="21" r="1.2" fill="#6b7280" />
      <path d="M36,21 L42,12 L48,21" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <circle cx="42" cy="10" r="2.5" fill="#22c55e" />
      <line x1="42" y1="12" x2="40" y2="14" stroke="#22c55e" strokeWidth="1" />
      <line x1="42" y1="12" x2="44" y2="14" stroke="#22c55e" strokeWidth="1" />
      {/* Cyclist 3 — blue */}
      <circle cx="60" cy="21" r="4"   stroke="#1f2937" strokeWidth="1" fill="none" />
      <circle cx="60" cy="21" r="1.2" fill="#6b7280" />
      <path d="M60,21 L66,13" stroke="#60a5fa" strokeWidth="1.5" fill="none" />
      <circle cx="66" cy="11" r="2.5" fill="#60a5fa" />
      <line x1="66" y1="13" x2="64" y2="15" stroke="#60a5fa" strokeWidth="1" />
      <line x1="66" y1="13" x2="68" y2="15" stroke="#60a5fa" strokeWidth="1" />
    </svg>
  );
}

export function A380() {
  return (
    <svg width="96" height="28" viewBox="0 0 96 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fuselage */}
      <ellipse cx="48" cy="14" rx="44" ry="5.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.6" />
      {/* Upper deck bump */}
      <ellipse cx="30" cy="11" rx="18" ry="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.4" />
      {/* Main wings */}
      <path d="M30,14 L8,24 L32,19 Z"  fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.4" />
      <path d="M60,14 L78,24 L64,19 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.4" />
      {/* Tail fin */}
      <path d="M4,12 L0,5 L10,12 Z" fill="#94a3b8" />
      {/* Horizontal stabilisers */}
      <path d="M4,15 L0,19 L8,16 Z"  fill="#cbd5e1" />
      {/* Engine nacelles */}
      <ellipse cx="16" cy="20" rx="5"   ry="2.2" fill="#94a3b8" />
      <ellipse cx="24" cy="21" rx="4"   ry="1.8" fill="#94a3b8" />
      <ellipse cx="66" cy="20" rx="5"   ry="2.2" fill="#94a3b8" />
      <ellipse cx="72" cy="21" rx="4"   ry="1.8" fill="#94a3b8" />
      {/* Windows */}
      {[26,31,36,41,46,51,56,62,68,74,80].map(x => (
        <rect key={x} x={x} y="11" width="3" height="2" rx="0.5" fill="#bae6fd" opacity="0.8" />
      ))}
      {/* Contrail */}
      <line x1="0"  y1="14" x2="-6"  y2="14" stroke="#f1f5f9" strokeWidth="1.5" opacity="0.6" />
      <line x1="-5" y1="13" x2="-14" y2="13" stroke="#f1f5f9" strokeWidth="1"   opacity="0.35" />
    </svg>
  );
}

// ─── Vehicle config ────────────────────────────────────────────────────────

type VehicleType = 'tram' | 'trolleybus' | 'bus' | 'cyclists' | 'a380';

interface VehicleConfig {
  type:       VehicleType;
  /** CSS `bottom` value — vehicles that roll on the ground use a positive bottom */
  bottom:     number;
  /** Duration for the crossing animation in seconds */
  duration:   number;
  /** Probability weight (sum doesn't need to be 1) */
  weight:     number;
}

const VEHICLES: VehicleConfig[] = [
  { type: 'tram',       bottom: 8,  duration: 12, weight: 3 },
  { type: 'trolleybus', bottom: 8,  duration: 11, weight: 2 },
  { type: 'bus',        bottom: 8,  duration: 10, weight: 2 },
  { type: 'cyclists',   bottom: 10, duration: 18, weight: 2 },
  { type: 'a380',       bottom: 48, duration: 14, weight: 1 },
];

const TOTAL_WEIGHT = VEHICLES.reduce((s, v) => s + v.weight, 0);

function pickVehicle(): VehicleConfig {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const v of VEHICLES) {
    r -= v.weight;
    if (r <= 0) return v;
  }
  return VEHICLES[0];
}

// ─── Spawn interval range ──────────────────────────────────────────────────
const MIN_INTERVAL_MS = 18_000;
const MAX_INTERVAL_MS = 38_000;
const FIRST_DELAY_MS  = 4_000;

// ─── Main component ────────────────────────────────────────────────────────

interface SpawnedVehicle {
  id:       number;
  cfg:      VehicleConfig;
  nightMode: boolean;
}

export default function HeroVehicle({ nightMode = false }: { nightMode?: boolean }) {
  const [vehicle, setVehicle] = useState<SpawnedVehicle | null>(null);
  const counterRef            = useRef(0);

  // Stable keyframe name — unique per animation instance to avoid collisions.
  const animName = useMemo(() => `hero-vehicle-cross-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    let cancelled = false;

    const pending: ReturnType<typeof setTimeout>[] = [];

    const spawn = () => {
      const cfg = pickVehicle();
      counterRef.current += 1;
      setVehicle({ id: counterRef.current, cfg, nightMode });
    };

    const schedule = () => {
      const delay = MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
      const id = setTimeout(() => {
        if (cancelled) return;
        spawn();
        schedule();
      }, delay);
      pending.push(id);
    };

    // First vehicle appears soon after mount
    const firstId = setTimeout(() => {
      if (cancelled) return;
      spawn();
      schedule();
    }, FIRST_DELAY_MS + Math.random() * 6_000);
    pending.push(firstId);

    return () => {
      cancelled = true;
      for (const id of pending) clearTimeout(id);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightMode]);

  if (!vehicle) return null;

  const { id, cfg } = vehicle;
  const isA380 = cfg.type === 'a380';

  return (
    <div
      key={id}
      aria-hidden="true"
      style={{
        position:   'absolute',
        bottom:     cfg.bottom,
        left:       0,
        width:      '100%',
        pointerEvents: 'none',
        zIndex:     10,
        // Animate from right edge → left edge
        animation:  `${animName} ${cfg.duration}s linear forwards`,
      }}
    >
      <style>{`
        @keyframes ${animName} {
          0%   { transform: translateX(calc(100vw + 120px)); opacity: ${isA380 ? 0 : 1}; }
          5%   { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(-160px); opacity: ${isA380 ? 0 : 1}; }
        }
      `}</style>
      <div style={{ display: 'inline-block', lineHeight: 0 }}>
        {cfg.type === 'tram'       && <Tram       nightMode={vehicle.nightMode} />}
        {cfg.type === 'trolleybus' && <Trolleybus nightMode={vehicle.nightMode} />}
        {cfg.type === 'bus'        && <Bus        nightMode={vehicle.nightMode} />}
        {cfg.type === 'cyclists'   && <Cyclists />}
        {cfg.type === 'a380'       && <A380 />}
      </div>
    </div>
  );
}
