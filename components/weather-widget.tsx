'use client';

import { useEffect, useState } from 'react';
import type { WeatherResult } from '@/app/api/weather/route';

type WeatherType = 'sunny' | 'clear_night' | 'partly_cloudy' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

// Maps WMO weather codes (Open-Meteo) → internal WeatherType
function getWeatherType(wmo: number, isDay: boolean): WeatherType {
  if (wmo === 0 || wmo === 1)                                          return isDay ? 'sunny' : 'clear_night';
  if (wmo === 2)                                                        return 'partly_cloudy';
  if (wmo === 3)                                                        return 'cloudy';
  if (wmo === 45 || wmo === 48)                                         return 'fog';
  if (wmo >= 51 && wmo <= 67)                                           return 'rain';
  if ((wmo >= 71 && wmo <= 77) || wmo === 85 || wmo === 86)            return 'snow';
  if (wmo >= 80 && wmo <= 82)                                           return 'rain';
  if (wmo === 95 || wmo === 96 || wmo === 99)                           return 'storm';
  return 'cloudy';
}

const WEEKDAYS = ['V', 'H', 'K', 'Sz', 'Cs', 'P', 'Szo'];
function getDayLabel(isoDate: string) {
  return WEEKDAYS[new Date(isoDate).getDay()];
}

// ─── Shared keyframe library (injected once, used by all icons) ───────────────
const WX_CSS = `
  @keyframes wx-sun-core {
    0%,100% { transform: scale(1); }
    50%      { transform: scale(1.12); }
  }
  @keyframes wx-glow-pulse {
    0%,100% { opacity: 0.18; r: 32; }
    50%     { opacity: 0.55; r: 42; }
  }
  @keyframes wx-rays-fast {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes wx-rays-med {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes wx-rays-ccw {
    from { transform: rotate(0deg); }
    to   { transform: rotate(-360deg); }
  }
  @keyframes wx-corona {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes wx-flare-a {
    0%   { transform: rotate(0deg)   translateX(40px) scale(1);   opacity: 0.5; }
    50%  { transform: rotate(180deg) translateX(40px) scale(2.2); opacity: 1; }
    100% { transform: rotate(360deg) translateX(40px) scale(1);   opacity: 0.5; }
  }
  @keyframes wx-flare-b {
    0%   { transform: rotate(0deg)   translateX(28px) scale(1.2); opacity: 0.3; }
    50%  { transform: rotate(-180deg) translateX(28px) scale(0.5); opacity: 0.9; }
    100% { transform: rotate(-360deg) translateX(28px) scale(1.2); opacity: 0.3; }
  }
  @keyframes wx-flare-c {
    0%   { transform: rotate(120deg) translateX(50px) scale(0.8); opacity: 0.2; }
    50%  { transform: rotate(300deg) translateX(50px) scale(1.8); opacity: 0.85; }
    100% { transform: rotate(480deg) translateX(50px) scale(0.8); opacity: 0.2; }
  }
  @keyframes wx-churn {
    0%   { transform: scale(1)    translate(0,0); }
    20%  { transform: scale(1.05) translate(-3px, 1px); }
    40%  { transform: scale(1.08) translate(3px, -2px); }
    60%  { transform: scale(1.04) translate(-2px, 2px); }
    80%  { transform: scale(1.06) translate(2px, -1px); }
    100% { transform: scale(1)    translate(0,0); }
  }
  @keyframes wx-bolt {
    0%,37%,47%,77%,87%,100% { opacity: 0; }
    39%,41%                  { opacity: 1; }
    79%,81%                  { opacity: 0.9; }
  }
  @keyframes wx-bolt-b {
    0%,37%,47%,77%,87%,100% { opacity: 0; }
    39%,41%                  { opacity: 0.85; }
    79%,81%                  { opacity: 0.7; }
  }
  @keyframes wx-bolt-c {
    0%,37%,47%,77%,87%,100% { opacity: 0; }
    39%,41%                  { opacity: 0.75; }
    79%,81%                  { opacity: 0.6; }
  }
  @keyframes wx-sky-flash {
    0%,36%,44%,76%,84%,100% { opacity: 0; }
    39%,41%                  { opacity: 1; }
    79%,81%                  { opacity: 0.8; }
  }
  @keyframes wx-screen-flash {
    0%,38%,46%,78%,86%,100% { opacity: 0; }
    40%                      { opacity: 0.45; }
    41%                      { opacity: 0.08; }
    43%                      { opacity: 0.32; }
    80%                      { opacity: 0.25; }
    81%                      { opacity: 0.05; }
  }
  @keyframes wx-rain-a {
    0%   { transform: translate(0, -24px);  opacity: 0; }
    8%   { opacity: 0.95; }
    88%  { opacity: 0.75; }
    100% { transform: translate(-9px, 46px); opacity: 0; }
  }
  @keyframes wx-rain-b {
    0%   { transform: translate(0, -20px);  opacity: 0; }
    12%  { opacity: 0.85; }
    86%  { opacity: 0.6; }
    100% { transform: translate(-6px, 44px); opacity: 0; }
  }
  @keyframes wx-rain-c {
    0%   { transform: translate(0, -22px);  opacity: 0; }
    15%  { opacity: 1; }
    84%  { opacity: 0.55; }
    100% { transform: translate(-11px, 48px); opacity: 0; }
  }
  @keyframes wx-rain-d {
    0%   { transform: translate(0, -18px);  opacity: 0; }
    10%  { opacity: 0.9; }
    90%  { opacity: 0.65; }
    100% { transform: translate(-7px, 42px); opacity: 0; }
  }
  @keyframes wx-splash {
    0%   { transform: scale(0);   opacity: 0.9; }
    55%  { transform: scale(1.5); opacity: 0.4; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  @keyframes wx-cloud-breathe {
    0%,100% { transform: scale(1)    translateY(0); }
    50%     { transform: scale(1.05) translateY(-3px); }
  }
  @keyframes wx-cloud-darken {
    0%,100% { opacity: 0.88; }
    50%     { opacity: 1; }
  }
  @keyframes wx-snow-a {
    0%   { transform: translate(0, -12px)  rotate(0deg);   opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 0.75; }
    100% { transform: translate(11px, 44px) rotate(300deg); opacity: 0; }
  }
  @keyframes wx-snow-b {
    0%   { transform: translate(0, -10px)  rotate(0deg);   opacity: 0; }
    8%   { opacity: 0.9; }
    92%  { opacity: 0.5; }
    100% { transform: translate(-9px, 42px) rotate(240deg); opacity: 0; }
  }
  @keyframes wx-snow-c {
    0%   { transform: translate(0, -8px)   rotate(0deg);   opacity: 0; }
    6%   { opacity: 1; }
    94%  { opacity: 0.45; }
    100% { transform: translate(6px, 40px)  rotate(400deg); opacity: 0; }
  }
  @keyframes wx-fog-r {
    0%,100% { transform: translateX(-8px); opacity: 0.52; }
    50%     { transform: translateX(12px);  opacity: 0.88; }
  }
  @keyframes wx-fog-l {
    0%,100% { transform: translateX(8px);  opacity: 0.45; }
    50%     { transform: translateX(-11px); opacity: 0.78; }
  }
  @keyframes wx-fog-fade {
    0%,100% { opacity: 0.22; }
    50%     { opacity: 0.65; }
  }
  @keyframes wx-moon-glow {
    0%,100% {
      filter: drop-shadow(0 0 6px #c7d2fe)
              drop-shadow(0 0 3px #a5b4fc);
    }
    50% {
      filter: drop-shadow(0 0 22px #6366f1)
              drop-shadow(0 0 44px #4f46e5)
              drop-shadow(0 0 70px #312e81);
    }
  }
  @keyframes wx-star-a {
    0%,100% { opacity: 0.1;  transform: scale(0.5); }
    50%     { opacity: 1;    transform: scale(1.7); }
  }
  @keyframes wx-star-b {
    0%,100% { opacity: 0.6;  transform: scale(0.9); }
    50%     { opacity: 0.05; transform: scale(0.35); }
  }
  @keyframes wx-star-c {
    0%,100% { opacity: 0.3;  transform: scale(0.8); }
    50%     { opacity: 1;    transform: scale(1.45); }
  }
  @keyframes wx-star-d {
    0%,100% { opacity: 0.8;  transform: scale(1.1); }
    35%     { opacity: 0.02; transform: scale(0.3); }
    70%     { opacity: 0.9;  transform: scale(1.3); }
  }
  @keyframes wx-meteor {
    0%,5%   { transform: translate(0,0)          scaleX(1);  opacity: 0; }
    6%      { opacity: 1; }
    22%     { transform: translate(56px, 28px)   scaleX(6);  opacity: 0.9; }
    30%,100%{ transform: translate(56px, 28px)   scaleX(6);  opacity: 0; }
  }
  @keyframes wx-aurora {
    0%,100% { transform: scaleY(1)   translateX(0);   opacity: 0.25; }
    33%     { transform: scaleY(1.6) translateX(8px);  opacity: 0.55; }
    66%     { transform: scaleY(0.7) translateX(-6px); opacity: 0.18; }
  }
  @keyframes wx-pc-peek {
    0%,100% { transform: translate(-5px, 4px) scale(0.85); }
    50%     { transform: translate(3px, -3px)  scale(1.04); }
  }
  @keyframes wx-pc-cloud {
    0%,100% { transform: translate(0, 0); }
    33%     { transform: translate(4px, -2px); }
    66%     { transform: translate(-3px, 1.5px); }
  }
`;

// ─── Snowflake helper (6-arm asterisk with barbs, pure SVG lines) ─────────────
function Snowflake({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const DEG = [0, 60, 120, 180, 240, 300];
  const toRad = (d: number) => (d * Math.PI) / 180;
  return (
    <g transform={`translate(${cx},${cy})`}>
      {DEG.map((deg) => {
        const rad = toRad(deg);
        const tx = Math.sin(rad) * r;
        const ty = -Math.cos(rad) * r;
        // barb points at 55% and 80% of arm
        const b55x = Math.sin(rad) * r * 0.55;
        const b55y = -Math.cos(rad) * r * 0.55;
        const b80x = Math.sin(rad) * r * 0.80;
        const b80y = -Math.cos(rad) * r * 0.80;
        // perpendicular direction ±55 deg from arm
        const barbLen = r * 0.28;
        const ang55a = toRad(deg + 55);
        const ang55b = toRad(deg - 55);
        const ang80a = toRad(deg + 55);
        const ang80b = toRad(deg - 55);
        return (
          <g key={deg}>
            {/* Main arm */}
            <line x1={0} y1={0} x2={tx} y2={ty} stroke={fill} strokeWidth={r * 0.2} strokeLinecap="round" />
            {/* Barbs at 55% */}
            <line
              x1={b55x} y1={b55y}
              x2={b55x + Math.sin(ang55a) * barbLen} y2={b55y - Math.cos(ang55a) * barbLen}
              stroke={fill} strokeWidth={r * 0.15} strokeLinecap="round" />
            <line
              x1={b55x} y1={b55y}
              x2={b55x + Math.sin(ang55b) * barbLen} y2={b55y - Math.cos(ang55b) * barbLen}
              stroke={fill} strokeWidth={r * 0.15} strokeLinecap="round" />
            {/* Barbs at 80% */}
            <line
              x1={b80x} y1={b80y}
              x2={b80x + Math.sin(ang80a) * barbLen * 0.7} y2={b80y - Math.cos(ang80a) * barbLen * 0.7}
              stroke={fill} strokeWidth={r * 0.13} strokeLinecap="round" />
            <line
              x1={b80x} y1={b80y}
              x2={b80x + Math.sin(ang80b) * barbLen * 0.7} y2={b80y - Math.cos(ang80b) * barbLen * 0.7}
              stroke={fill} strokeWidth={r * 0.13} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

// ─── SunnyIcon ────────────────────────────────────────────────────────────────
function SunnyIcon({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <radialGradient id="sun-core-g" cx="42%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="30%"  stopColor="#fef3c7" />
          <stop offset="70%"  stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <radialGradient id="sun-halo-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fef3c7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <filter id="sf-bloom" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="sf-softblur">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <style>{WX_CSS}</style>

      {/* Deep background bloom */}
      <circle cx="60" cy="60" r="50" fill="#fef3c7" opacity="0.12" filter="url(#sf-softblur)" />

      {/* Outer pulsing halo */}
      <circle cx="60" cy="60" r="44" fill="url(#sun-halo-g)"
        style={{ animation: 'wx-glow-pulse 2.8s ease-in-out infinite', transformOrigin: '60px 60px' }} />

      {/* Ring 1: 16 outer rays, slow CCW (20s) */}
      <g style={{ animation: 'wx-rays-ccw 20s linear infinite', transformOrigin: '60px 60px' }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={i} x1="60" y1="8" x2="60" y2="18"
            stroke="#fde68a" strokeWidth="1.8" strokeLinecap="round" opacity="0.35"
            transform={`rotate(${i * 22.5} 60 60)`} />
        ))}
      </g>

      {/* Ring 2: 12 mid rays, CW medium (13s) */}
      <g style={{ animation: 'wx-rays-med 13s linear infinite', transformOrigin: '60px 60px' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1="60" y1="14" x2="60" y2={i % 2 === 0 ? 28 : 24}
            stroke="#fbbf24" strokeWidth={i % 2 === 0 ? 3.2 : 2} strokeLinecap="round" opacity="0.65"
            transform={`rotate(${i * 30} 60 60)`} />
        ))}
      </g>

      {/* Ring 3: 8 inner thick rays, CW fast (8s) */}
      <g style={{ animation: 'wx-rays-fast 8s linear infinite', transformOrigin: '60px 60px' }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line key={deg} x1="60" y1="20" x2="60" y2="32"
            stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" opacity="0.9"
            transform={`rotate(${deg} 60 60)`} />
        ))}
      </g>

      {/* Dashed corona orbit (32s CW) */}
      <circle cx="60" cy="60" r="42" fill="none" stroke="#fde68a" strokeWidth="1.2"
        strokeDasharray="5 8" strokeOpacity="0.3"
        style={{ animation: 'wx-corona 32s linear infinite', transformOrigin: '60px 60px' }} />

      {/* Blurred bloom copy of core */}
      <circle cx="60" cy="60" r="20" fill="#fef9c3" opacity="0.6" filter="url(#sf-softblur)" />

      {/* Sun core with bloom filter */}
      <circle cx="60" cy="60" r="21" fill="url(#sun-core-g)" filter="url(#sf-bloom)"
        style={{ animation: 'wx-sun-core 2.5s ease-in-out infinite', transformOrigin: '60px 60px' }} />

      {/* Inner shimmer */}
      <circle cx="54" cy="54" r="8" fill="white" opacity="0.38" />
      <circle cx="50" cy="51" r="4" fill="white" opacity="0.25" />

      {/* Lens flare A — 7s CW orbit at r=40 */}
      <circle cx="60" cy="60" r="3.5" fill="#fff7ed" opacity="0.8"
        style={{ animation: 'wx-flare-a 7s ease-in-out infinite', transformOrigin: '60px 60px' }} />

      {/* Lens flare B — 11s CCW orbit at r=28 */}
      <circle cx="60" cy="60" r="2.2" fill="#fef3c7" opacity="0.7"
        style={{ animation: 'wx-flare-b 11s ease-in-out infinite', transformOrigin: '60px 60px' }} />

      {/* Lens flare C — 15s CW orbit at r=50 */}
      <circle cx="60" cy="60" r="2.8" fill="#fde68a" opacity="0.6"
        style={{ animation: 'wx-flare-c 15s ease-in-out infinite', transformOrigin: '60px 60px' }} />
    </svg>
  );
}

// ─── ClearNightIcon ───────────────────────────────────────────────────────────
function ClearNightIcon({ size = 120 }: { size?: number }) {
  const stars: Array<{ cx: number; cy: number; r: number; anim: string; dur: string; delay: string }> = [
    { cx: 10,  cy: 12,  r: 2.2, anim: 'wx-star-a', dur: '2.2s',  delay: '0s' },
    { cx: 98,  cy: 8,   r: 2.8, anim: 'wx-star-b', dur: '1.9s',  delay: '0.5s' },
    { cx: 108, cy: 38,  r: 1.8, anim: 'wx-star-a', dur: '2.7s',  delay: '1s' },
    { cx: 104, cy: 72,  r: 1.4, anim: 'wx-star-c', dur: '2.1s',  delay: '0.3s' },
    { cx: 16,  cy: 72,  r: 2.4, anim: 'wx-star-b', dur: '2.5s',  delay: '0.8s' },
    { cx: 8,   cy: 44,  r: 1.6, anim: 'wx-star-a', dur: '1.8s',  delay: '1.2s' },
    { cx: 72,  cy: 100, r: 2.0, anim: 'wx-star-c', dur: '3s',    delay: '0.2s' },
    { cx: 30,  cy: 104, r: 1.3, anim: 'wx-star-b', dur: '2.3s',  delay: '0.7s' },
    { cx: 84,  cy: 16,  r: 1.2, anim: 'wx-star-a', dur: '2.6s',  delay: '1.4s' },
    { cx: 20,  cy: 26,  r: 1.8, anim: 'wx-star-d', dur: '3.2s',  delay: '0.4s' },
    { cx: 112, cy: 18,  r: 2.0, anim: 'wx-star-c', dur: '2.0s',  delay: '1.6s' },
    { cx: 50,  cy: 108, r: 1.5, anim: 'wx-star-a', dur: '2.4s',  delay: '0.9s' },
    { cx: 94,  cy: 92,  r: 1.6, anim: 'wx-star-b', dur: '2.8s',  delay: '0.1s' },
    { cx: 4,   cy: 88,  r: 1.2, anim: 'wx-star-d', dur: '1.7s',  delay: '1.1s' },
    { cx: 62,  cy: 6,   r: 1.4, anim: 'wx-star-c', dur: '2.9s',  delay: '0.6s' },
    { cx: 116, cy: 56,  r: 1.8, anim: 'wx-star-a', dur: '2.2s',  delay: '1.8s' },
    { cx: 36,  cy: 8,   r: 1.0, anim: 'wx-star-b', dur: '3.1s',  delay: '0.3s' },
    { cx: 88,  cy: 108, r: 2.2, anim: 'wx-star-d', dur: '2.6s',  delay: '1.3s' },
  ];

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <radialGradient id="moon-g" cx="38%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#f8fafc" />
          <stop offset="55%"  stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        <radialGradient id="moon-glow-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="aurora-1-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="40%"  stopColor="#34d399" stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="aurora-2-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="50%"  stopColor="#818cf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <filter id="moon-bloom" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="star-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{WX_CSS}</style>

      {/* Aurora band 1 */}
      <ellipse cx="60" cy="90" rx="55" ry="8" fill="url(#aurora-1-g)"
        style={{ animation: 'wx-aurora 7s ease-in-out infinite', transformOrigin: '60px 90px' }} />

      {/* Aurora band 2 */}
      <ellipse cx="60" cy="102" rx="48" ry="6" fill="url(#aurora-2-g)"
        style={{ animation: 'wx-aurora 9s ease-in-out 2s infinite', transformOrigin: '60px 102px' }} />

      {/* Stars */}
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#c7d2fe" filter="url(#star-glow)"
          style={{ animation: `${s.anim} ${s.dur} ease-in-out ${s.delay} infinite`, transformOrigin: `${s.cx}px ${s.cy}px` }} />
      ))}

      {/* Shooting star with gradient trail */}
      <line x1="6" y1="22" x2="24" y2="31" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.95"
        style={{ animation: 'wx-meteor 6s ease-out 1.5s infinite', transformOrigin: '6px 22px' }} />

      {/* Moon glow halo */}
      <circle cx="60" cy="52" r="28" fill="url(#moon-glow-g)"
        style={{ animation: 'wx-moon-glow 3.5s ease-in-out infinite' }} />

      {/* Moon body with bloom */}
      <g style={{ animation: 'wx-moon-glow 3.5s ease-in-out infinite' }}>
        {/* Blurred layer behind for bloom */}
        <path d="M67 12 A32 32 0 1 0 67 92 A28 28 0 1 1 67 12Z" fill="#e2e8f0" opacity="0.4" filter="url(#moon-bloom)" />
        {/* Sharp crescent */}
        <path d="M67 12 A32 32 0 1 0 67 92 A28 28 0 1 1 67 12Z" fill="url(#moon-g)" />
        {/* Craters */}
        <circle cx="50" cy="48" r="5.5" fill="#94a3b8" opacity="0.28" />
        <circle cx="64" cy="70" r="3.5" fill="#94a3b8" opacity="0.22" />
        <circle cx="56" cy="30" r="3.0" fill="#94a3b8" opacity="0.25" />
        <circle cx="42" cy="65" r="2.2" fill="#94a3b8" opacity="0.18" />
        {/* Limb highlight */}
        <path d="M45 20 Q38 40 42 62" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.18" />
      </g>
    </svg>
  );
}

// ─── PartlyCloudyIcon ─────────────────────────────────────────────────────────
function PartlyCloudyIcon({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <radialGradient id="pcg-sun" cx="42%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="35%"  stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fbbf24" />
        </radialGradient>
        <radialGradient id="pcg-cloud-top" cx="40%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dde4ec" />
        </radialGradient>
        <filter id="pcf-sun-bloom" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{WX_CSS}</style>

      {/* Sun peeking behind cloud */}
      <g style={{ animation: 'wx-pc-peek 5s ease-in-out infinite', transformOrigin: '34px 40px' }}>
        {/* Outer ray ring CCW */}
        <g style={{ animation: 'wx-rays-ccw 20s linear infinite', transformOrigin: '34px 40px' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={i} x1="34" y1="12" x2="34" y2="20"
              stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"
              transform={`rotate(${i * 30} 34 40)`} />
          ))}
        </g>
        {/* Mid ray ring CW */}
        <g style={{ animation: 'wx-rays-med 13s linear infinite', transformOrigin: '34px 40px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1="34" y1="16" x2="34" y2={i % 2 === 0 ? 28 : 25}
              stroke="#fbbf24" strokeWidth={i % 2 === 0 ? 3 : 2} strokeLinecap="round" opacity="0.7"
              transform={`rotate(${i * 45} 34 40)`} />
          ))}
        </g>
        {/* Sun core */}
        <circle cx="34" cy="40" r="17" fill="url(#pcg-sun)" filter="url(#pcf-sun-bloom)" />
        <circle cx="29" cy="35" r="5" fill="white" opacity="0.32" />
      </g>

      {/* Large 3D fluffy cloud floating in front */}
      <g style={{ animation: 'wx-pc-cloud 6s ease-in-out infinite' }}>
        {/* Shadow layer */}
        <ellipse cx="72" cy="84" rx="34" ry="16" fill="#b8c4ce" opacity="0.4" />
        {/* Main cloud body */}
        <ellipse cx="72" cy="76" rx="34" ry="17" fill="#dde4ec" />
        <ellipse cx="52" cy="82" rx="22" ry="13" fill="#e8eef5" />
        <circle cx="48" cy="70" r="16" fill="#dde4ec" />
        <circle cx="66" cy="64" r="20" fill="#dde4ec" />
        <circle cx="84" cy="70" r="17" fill="#cdd5df" />
        <circle cx="96" cy="78" r="13" fill="#c5cfd9" />
        {/* 3D highlight */}
        <ellipse cx="62" cy="62" rx="14" ry="6" fill="white" opacity="0.42" />
        <ellipse cx="78" cy="66" rx="9"  ry="4" fill="white" opacity="0.28" />
      </g>
    </svg>
  );
}

// ─── CloudyIcon ───────────────────────────────────────────────────────────────
function CloudyIcon({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <filter id="cf-soft">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{WX_CSS}</style>

      {/* Back cloud layer — slow, slight left drift, low opacity */}
      <g style={{ animation: 'wx-fog-l 9s ease-in-out infinite' }} opacity="0.38">
        <ellipse cx="52" cy="36" rx="28" ry="13" fill="#7f8ea0" />
        <circle cx="34" cy="35" r="14" fill="#7f8ea0" />
        <circle cx="56" cy="28" r="17" fill="#7f8ea0" />
        <circle cx="74" cy="36" r="13" fill="#7f8ea0" />
      </g>

      {/* Middle cloud layer — medium speed, right drift */}
      <g style={{ animation: 'wx-fog-r 6.5s ease-in-out 1s infinite' }} opacity="0.6">
        <ellipse cx="60" cy="52" rx="30" ry="14" fill="#8fa0b4" />
        <circle cx="40" cy="51" r="15" fill="#8fa0b4" />
        <circle cx="64" cy="44" r="18" fill="#8fa0b4" />
        <circle cx="80" cy="52" r="14" fill="#7d909f" />
        <ellipse cx="56" cy="43" rx="12" ry="5" fill="#a0b0c0" opacity="0.4" />
      </g>

      {/* Front cloud — breathing slowly */}
      <g style={{ animation: 'wx-cloud-breathe 4.5s ease-in-out infinite' }}>
        {/* Soft bloom behind */}
        <ellipse cx="62" cy="72" rx="36" ry="18" fill="#94a3b8" opacity="0.3" filter="url(#cf-soft)" />
        {/* Main body */}
        <ellipse cx="62" cy="70" rx="35" ry="17" fill="#b0bec5" />
        <ellipse cx="42" cy="78" rx="22" ry="13" fill="#c8d6de" />
        <circle cx="38" cy="65" r="17" fill="#b0bec5" />
        <circle cx="62" cy="60" r="21" fill="#b0bec5" />
        <circle cx="82" cy="68" r="16" fill="#a0aeb8" />
        <circle cx="96" cy="76" r="12" fill="#98a8b2" />
        {/* Highlights */}
        <ellipse cx="55" cy="59" rx="14" ry="5.5" fill="white" opacity="0.32" />
        <ellipse cx="74" cy="63" rx="9"  ry="3.5" fill="white" opacity="0.2" />
      </g>
    </svg>
  );
}

// ─── RainIcon ─────────────────────────────────────────────────────────────────
function RainIcon({ size = 120 }: { size?: number }) {
  // 16 rain streaks at 4 animation variants, staggered delays
  const drops = [
    { x: 28, y: 52, delay: '0s',    dur: '0.95s', anim: 'wx-rain-a' },
    { x: 36, y: 50, delay: '0.18s', dur: '0.88s', anim: 'wx-rain-b' },
    { x: 44, y: 52, delay: '0.36s', dur: '1.02s', anim: 'wx-rain-c' },
    { x: 52, y: 50, delay: '0.54s', dur: '0.91s', anim: 'wx-rain-d' },
    { x: 60, y: 52, delay: '0.72s', dur: '0.97s', anim: 'wx-rain-a' },
    { x: 68, y: 50, delay: '0.1s',  dur: '0.85s', anim: 'wx-rain-b' },
    { x: 76, y: 52, delay: '0.46s', dur: '1.05s', anim: 'wx-rain-c' },
    { x: 84, y: 50, delay: '0.28s', dur: '0.93s', anim: 'wx-rain-d' },
    { x: 32, y: 52, delay: '0.62s', dur: '0.99s', anim: 'wx-rain-b' },
    { x: 40, y: 50, delay: '0.82s', dur: '0.87s', anim: 'wx-rain-a' },
    { x: 48, y: 52, delay: '0.04s', dur: '1.08s', anim: 'wx-rain-d' },
    { x: 56, y: 50, delay: '0.66s', dur: '0.94s', anim: 'wx-rain-c' },
    { x: 64, y: 52, delay: '0.44s', dur: '0.89s', anim: 'wx-rain-a' },
    { x: 72, y: 50, delay: '0.22s', dur: '1.0s',  anim: 'wx-rain-b' },
    { x: 80, y: 52, delay: '0.88s', dur: '0.96s', anim: 'wx-rain-d' },
    { x: 88, y: 50, delay: '0.33s', dur: '0.92s', anim: 'wx-rain-c' },
  ];
  const splashes = [
    { cx: 32,  cy: 104, r: 3.5, delay: '0s' },
    { cx: 48,  cy: 106, r: 4.0, delay: '0.3s' },
    { cx: 64,  cy: 104, r: 3.0, delay: '0.6s' },
    { cx: 80,  cy: 106, r: 3.8, delay: '0.15s' },
    { cx: 56,  cy: 108, r: 2.8, delay: '0.45s' },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="rain-drop-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#bae6fd" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
        </linearGradient>
        <filter id="rf-cloud-bloom" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{WX_CSS}</style>

      {/* Heavy dark cloud */}
      <g style={{ animation: 'wx-cloud-darken 3.5s ease-in-out infinite' }}>
        <ellipse cx="60" cy="38" rx="36" ry="16" fill="#334155" filter="url(#rf-cloud-bloom)" />
        <circle cx="36" cy="37" r="18" fill="#334155" />
        <circle cx="62" cy="28" r="22" fill="#1e293b" />
        <circle cx="82" cy="38" r="17" fill="#334155" />
        <ellipse cx="58" cy="27" rx="15" ry="6" fill="#475569" opacity="0.4" />
      </g>

      {/* Rain streaks */}
      {drops.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width="2.8" height="13" rx="1.4" fill="url(#rain-drop-g)"
          style={{ animation: `${d.anim} ${d.dur} linear ${d.delay} infinite` }} />
      ))}

      {/* Splash rings */}
      {splashes.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="none" stroke="#7dd3fc" strokeWidth="1.4"
          style={{ animation: `wx-splash 1.1s ease-out ${s.delay} infinite` }} />
      ))}
    </svg>
  );
}

// ─── StormIcon ────────────────────────────────────────────────────────────────
function StormIcon({ size = 120 }: { size?: number }) {
  // 14 angled rain streaks staggered
  const drops = [
    { x: 16,  y: 52, delay: '0s',    dur: '0.72s', anim: 'wx-rain-a' },
    { x: 24,  y: 50, delay: '0.18s', dur: '0.80s', anim: 'wx-rain-b' },
    { x: 32,  y: 52, delay: '0.36s', dur: '0.75s', anim: 'wx-rain-c' },
    { x: 72,  y: 50, delay: '0.08s', dur: '0.78s', anim: 'wx-rain-a' },
    { x: 80,  y: 52, delay: '0.28s', dur: '0.70s', anim: 'wx-rain-b' },
    { x: 88,  y: 50, delay: '0.50s', dur: '0.82s', anim: 'wx-rain-c' },
    { x: 96,  y: 52, delay: '0.42s', dur: '0.74s', anim: 'wx-rain-d' },
    { x: 20,  y: 50, delay: '0.64s', dur: '0.77s', anim: 'wx-rain-d' },
    { x: 104, y: 50, delay: '0.22s', dur: '0.79s', anim: 'wx-rain-a' },
    { x: 28,  y: 52, delay: '0.86s', dur: '0.73s', anim: 'wx-rain-b' },
    { x: 76,  y: 50, delay: '0.58s', dur: '0.81s', anim: 'wx-rain-c' },
    { x: 84,  y: 52, delay: '0.14s', dur: '0.76s', anim: 'wx-rain-d' },
    { x: 92,  y: 50, delay: '0.70s', dur: '0.83s', anim: 'wx-rain-a' },
    { x: 100, y: 52, delay: '0.38s', dur: '0.71s', anim: 'wx-rain-b' },
  ];

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="bolt-g" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%"   stopColor="white" />
          <stop offset="40%"  stopColor="#fef08a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id="sky-flash-g" cx="50%" cy="100%" r="60%">
          <stop offset="0%"   stopColor="rgba(180,210,255,0.5)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="stf-bolt-glow" x="-200%" y="-100%" width="500%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="stf-cloud-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{WX_CSS}</style>

      {/* Full-screen flash rect */}
      <rect x="0" y="0" width="120" height="120" fill="#e8f0ff" rx="8"
        style={{ animation: 'wx-screen-flash 3.5s ease-in-out infinite' }} />

      {/* Sky glow ellipse under cloud pulsing with lightning */}
      <ellipse cx="60" cy="120" rx="55" ry="32" fill="url(#sky-flash-g)"
        style={{ animation: 'wx-sky-flash 3.5s ease-in-out infinite' }} />

      {/* Churning dark storm cloud (5s) */}
      <g style={{ animation: 'wx-churn 4.5s ease-in-out infinite', transformOrigin: '60px 34px' }}>
        <ellipse cx="60" cy="34" rx="44" ry="18" fill="#0f172a" filter="url(#stf-cloud-glow)" />
        <circle cx="30" cy="33" r="20" fill="#0f172a" />
        <circle cx="62" cy="22" r="24" fill="#080f1a" />
        <circle cx="86" cy="34" r="19" fill="#0f172a" />
        <circle cx="100" cy="40" r="14" fill="#152030" />
        <ellipse cx="56" cy="20" rx="18" ry="7" fill="#1e2e40" opacity="0.6" />
      </g>

      {/* ── MAIN BOLT (with blur glow layer + sharp white layer) ── */}
      {/* Glow layer — blurred yellow */}
      <g style={{ animation: 'wx-bolt 3.5s ease-in-out infinite' }}>
        <path d="M 63,46 L 55,65 L 63,65 L 50,88"
          stroke="#fbbf24" strokeWidth="8" strokeLinejoin="round" fill="none"
          filter="url(#stf-bolt-glow)" opacity="0.9" />
        <path d="M 55,65 L 46,76"
          stroke="#fbbf24" strokeWidth="5" strokeLinejoin="round" fill="none"
          filter="url(#stf-bolt-glow)" opacity="0.7" />
        <path d="M 63,65 L 72,74"
          stroke="#fbbf24" strokeWidth="5" strokeLinejoin="round" fill="none"
          filter="url(#stf-bolt-glow)" opacity="0.7" />
      </g>
      {/* Sharp white layer on top */}
      <g style={{ animation: 'wx-bolt 3.5s ease-in-out infinite' }}>
        <path d="M 63,46 L 55,65 L 63,65 L 50,88"
          stroke="url(#bolt-g)" strokeWidth="3.5" strokeLinejoin="round" fill="none" />
        <path d="M 63,46 L 55,65 L 63,65 L 50,88"
          stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity="0.95" />
        <path d="M 55,65 L 46,76"
          stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="none" opacity="0.85" />
        <path d="M 63,65 L 72,74"
          stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="none" opacity="0.85" />
      </g>

      {/* Branch bolt B — 0.08s delay */}
      <g style={{ animation: 'wx-bolt-b 3.5s ease-in-out 0.08s infinite' }}>
        <path d="M 55,65 L 46,76"
          stroke="#fde68a" strokeWidth="6" strokeLinejoin="round" fill="none"
          filter="url(#stf-bolt-glow)" opacity="0.6" />
        <path d="M 55,65 L 46,76"
          stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.75" />
      </g>

      {/* Branch bolt C — 0.16s delay */}
      <g style={{ animation: 'wx-bolt-c 3.5s ease-in-out 0.16s infinite' }}>
        <path d="M 63,65 L 72,74"
          stroke="#fde68a" strokeWidth="6" strokeLinejoin="round" fill="none"
          filter="url(#stf-bolt-glow)" opacity="0.6" />
        <path d="M 63,65 L 72,74"
          stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.75" />
      </g>

      {/* Rain streaks */}
      {drops.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width="2.2" height="12" rx="1.1" fill="#7dd3fc" opacity="0.72"
          style={{ animation: `${d.anim} ${d.dur} linear ${d.delay} infinite` }} />
      ))}
    </svg>
  );
}

// ─── SnowIcon ─────────────────────────────────────────────────────────────────
function SnowIcon({ size = 120 }: { size?: number }) {
  // 9 detailed snowflakes at different sizes r=4 to r=8
  const flakes = [
    { cx: 24, cy: 52, r: 5,   delay: '0s',    dur: '2.5s', anim: 'wx-snow-a' },
    { cx: 36, cy: 50, r: 4,   delay: '0.55s', dur: '3.0s', anim: 'wx-snow-b' },
    { cx: 48, cy: 52, r: 6,   delay: '1.1s',  dur: '2.7s', anim: 'wx-snow-a' },
    { cx: 60, cy: 50, r: 4.5, delay: '0.28s', dur: '3.2s', anim: 'wx-snow-c' },
    { cx: 72, cy: 52, r: 5.5, delay: '0.82s', dur: '2.9s', anim: 'wx-snow-b' },
    { cx: 84, cy: 50, r: 4,   delay: '1.4s',  dur: '2.6s', anim: 'wx-snow-a' },
    { cx: 30, cy: 50, r: 7,   delay: '0.68s', dur: '2.8s', anim: 'wx-snow-c' },
    { cx: 54, cy: 52, r: 8,   delay: '1.2s',  dur: '3.1s', anim: 'wx-snow-b' },
    { cx: 78, cy: 50, r: 4.8, delay: '0.4s',  dur: '2.4s', anim: 'wx-snow-a' },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <filter id="snf-cloud-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="snf-flake-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{WX_CSS}</style>

      {/* Cloud */}
      <g style={{ animation: 'wx-cloud-breathe 5s ease-in-out infinite' }}>
        <ellipse cx="60" cy="34" rx="38" ry="16" fill="#7890a8" filter="url(#snf-cloud-soft)" />
        <circle cx="36" cy="33" r="17" fill="#7890a8" />
        <circle cx="62" cy="24" r="20" fill="#6880a0" />
        <circle cx="82" cy="34" r="16" fill="#7890a8" />
        <ellipse cx="56" cy="23" rx="14" ry="5.5" fill="#98aec0" opacity="0.45" />
      </g>

      {/* Snowflakes with glow filter + fall+rotation animations */}
      {flakes.map((f, i) => (
        <g key={i} style={{ animation: `${f.anim} ${f.dur} linear ${f.delay} infinite` }}
           filter="url(#snf-flake-glow)">
          <Snowflake cx={f.cx} cy={f.cy} r={f.r} fill="#bae6fd" />
        </g>
      ))}
    </svg>
  );
}

// ─── FogIcon ──────────────────────────────────────────────────────────────────
function FogIcon({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <filter id="fgf-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{WX_CSS}</style>

      {/* Band 1 — top, drift right */}
      <rect x="8"  y="20" width="104" height="8" rx="4" fill="#94a3b8" opacity="0.7"
        filter="url(#fgf-glow)"
        style={{ animation: 'wx-fog-r 4.2s ease-in-out infinite' }} />

      {/* Band 2 — drift left */}
      <rect x="16" y="36" width="88"  height="7" rx="3.5" fill="#94a3b8" opacity="0.6"
        filter="url(#fgf-glow)"
        style={{ animation: 'wx-fog-l 5.1s ease-in-out infinite' }} />

      {/* Band 3 — drift right */}
      <rect x="4"  y="52" width="112" height="8" rx="4" fill="#94a3b8" opacity="0.55"
        filter="url(#fgf-glow)"
        style={{ animation: 'wx-fog-r 3.8s ease-in-out 0.5s infinite' }} />

      {/* Band 4 — drift left */}
      <rect x="20" y="68" width="80"  height="7" rx="3.5" fill="#94a3b8" opacity="0.45"
        style={{ animation: 'wx-fog-l 4.7s ease-in-out 1s infinite' }} />

      {/* Band 5 — drift right, fade pulse */}
      <rect x="10" y="84" width="100" height="6" rx="3" fill="#94a3b8" opacity="0.35"
        style={{ animation: 'wx-fog-fade 6s ease-in-out infinite' }} />

      {/* Band 6 — bottom, drift left */}
      <rect x="24" y="98" width="72"  height="5" rx="2.5" fill="#94a3b8" opacity="0.22"
        style={{ animation: 'wx-fog-l 7s ease-in-out 0.8s infinite' }} />
    </svg>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
function WeatherIcon({ type, size = 120 }: { type: WeatherType; size?: number }) {
  switch (type) {
    case 'sunny':         return <SunnyIcon size={size} />;
    case 'clear_night':   return <ClearNightIcon size={size} />;
    case 'partly_cloudy': return <PartlyCloudyIcon size={size} />;
    case 'cloudy':        return <CloudyIcon size={size} />;
    case 'rain':          return <RainIcon size={size} />;
    case 'storm':         return <StormIcon size={size} />;
    case 'snow':          return <SnowIcon size={size} />;
    case 'fog':           return <FogIcon size={size} />;
  }
}

// Small emoji fallback for forecast row
function SmallWeatherIcon({ icon, isDay }: { icon: number; isDay?: boolean }) {
  const type = getWeatherType(icon, isDay ?? true);
  const emoji: Record<WeatherType, string> = {
    sunny: '☀️', clear_night: '🌙', partly_cloudy: '⛅',
    cloudy: '☁️', rain: '🌧️', storm: '⛈️', snow: '❄️', fog: '🌫️',
  };
  return <span className="text-base leading-none">{emoji[type]}</span>;
}

// ─── Main Widget ───────────────────────────────────────────────────────────────
export default function WeatherWidget({ city = 'Budapest' }: { city?: string }) {
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/weather')
      .then((r) => r.json())
      .then((d) => { setWeather(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 animate-pulse">
        <div className="h-24 w-24 rounded-full bg-white/10" />
        <div className="h-5 w-16 rounded bg-white/10" />
        <div className="h-3 w-28 rounded bg-white/10" />
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-slate-500">Időjárás nem elérhető</p>
      </div>
    );
  }

  const type = getWeatherType(weather.icon, weather.isDay);

  const idokepUrl = `https://www.idokep.hu/30napos/${encodeURIComponent(city)}`;

  return (
    <div className="flex h-full flex-col items-center">
      {/* Location label + idokep 30-day forecast icon */}
      <p className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">
        {weather.locationName}
        <a
          href={idokepUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`${city} — 30 napos előrejelzés (időkép.hu)`}
          className="transition-colors hover:text-slate-300"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0">
            <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M8 1h3m0 0v3m0-3L5.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </p>

      {/* Animated icon */}
      <div className="relative flex items-center justify-center">
        <WeatherIcon type={type} size={120} />
      </div>

      {/* Temperature */}
      <p className="mt-1 text-4xl font-black tabular-nums leading-none text-white tracking-tight">
        {weather.temp}°
      </p>
      <p className="mt-1 text-[11px] font-semibold text-slate-300 text-center leading-tight">
        {weather.conditionText}
      </p>

      {/* Stats row */}
      <div className="mt-2 flex flex-col gap-0.5 text-center">
        <p className="text-[9px] text-slate-500">
          Érzőhő <span className="text-slate-400">{weather.feelsLike}°</span>
        </p>
        <p className="text-[9px] text-slate-500">
          Szél <span className="text-slate-400">{weather.wind} km/h</span>
          {' · '}Párat <span className="text-slate-400">{weather.humidity}%</span>
        </p>
      </div>

      {/* 4-day forecast */}
      {weather.forecast.length > 0 && (
        <div className="mt-3 w-full grid grid-cols-4 gap-1 border-t border-white/10 pt-2">
          {weather.forecast.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-0.5">
              <p className="text-[9px] font-bold text-slate-600">{getDayLabel(day.date)}</p>
              <SmallWeatherIcon icon={day.icon} isDay />
              <p className="text-[9px] tabular-nums text-slate-400">{day.maxTemp}°</p>
              <p className="text-[9px] tabular-nums text-slate-600">{day.minTemp}°</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
