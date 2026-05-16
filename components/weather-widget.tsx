'use client';

import { useEffect, useState } from 'react';
import type { WeatherResult } from '@/app/api/weather/route';

type WeatherType = 'sunny' | 'clear_night' | 'partly_cloudy' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

function getWeatherType(icon: number, isDay: boolean): WeatherType {
  if (icon >= 1 && icon <= 5) return isDay ? 'sunny' : 'clear_night';
  if (icon >= 6 && icon <= 8) return 'partly_cloudy';
  if (icon === 11) return 'fog';
  if ((icon >= 12 && icon <= 14) || (icon >= 18 && icon <= 21)) return 'rain';
  if (icon >= 15 && icon <= 17) return 'storm';
  if ((icon >= 22 && icon <= 29) || icon >= 43) return 'snow';
  if (icon >= 33 && icon <= 37) return isDay ? 'partly_cloudy' : 'clear_night';
  if (icon >= 38 && icon <= 40) return 'cloudy';
  if (icon >= 41 && icon <= 42) return 'rain';
  return 'cloudy';
}

const WEEKDAYS = ['V', 'H', 'K', 'Sz', 'Cs', 'P', 'Szo'];
function getDayLabel(isoDate: string) {
  return WEEKDAYS[new Date(isoDate).getDay()];
}

// ─── Shared keyframe library (injected once, used by all icons) ───────────────
const WX_CSS = `
  @keyframes wx-sun-core{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  @keyframes wx-sun-glow{0%,100%{r:30;opacity:.15}50%{r:36;opacity:.32}}
  @keyframes wx-rays-cw{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes wx-rays-ccw{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
  @keyframes wx-corona{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes wx-flare{
    0%{transform:rotate(0deg) translateX(36px) scale(1);opacity:.35}
    50%{transform:rotate(180deg) translateX(36px) scale(1.7);opacity:.9}
    100%{transform:rotate(360deg) translateX(36px) scale(1);opacity:.35}
  }
  @keyframes wx-cloud-breathe{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.04) translateY(-2px)}}
  @keyframes wx-cloud-dark{0%,100%{opacity:.82}50%{opacity:1}}
  @keyframes wx-storm-churn{
    0%{transform:scale(1) translate(0,0)}
    20%{transform:scale(1.04) translate(-2.5px,.5px)}
    40%{transform:scale(1.06) translate(2px,-1px)}
    60%{transform:scale(1.03) translate(-1.5px,1px)}
    80%{transform:scale(1.05) translate(1px,-.5px)}
    100%{transform:scale(1) translate(0,0)}
  }
  @keyframes wx-lightning{0%,37%,47%,77%,87%,100%{opacity:0}40%,44%{opacity:1}80%,84%{opacity:.75}}
  @keyframes wx-lightning-b{0%,39%,49%,79%,89%,100%{opacity:0}42%,46%{opacity:.85}82%,86%{opacity:.4}}
  @keyframes wx-screen-flash{0%,38%,46%,100%{opacity:0}40%{opacity:.28}41%{opacity:.05}43%{opacity:.18}}
  @keyframes wx-rain-a{0%{transform:translate(0,-20px);opacity:0}10%{opacity:.92}88%{opacity:.7}100%{transform:translate(-7px,38px);opacity:0}}
  @keyframes wx-rain-b{0%{transform:translate(0,-20px);opacity:0}13%{opacity:.8}87%{opacity:.6}100%{transform:translate(-5px,36px);opacity:0}}
  @keyframes wx-rain-c{0%{transform:translate(0,-20px);opacity:0}16%{opacity:1}84%{opacity:.5}100%{transform:translate(-9px,40px);opacity:0}}
  @keyframes wx-splash{0%{transform:scale(0);opacity:.8}60%{transform:scale(1.4);opacity:.35}100%{transform:scale(2);opacity:0}}
  @keyframes wx-snow-slow{0%{transform:translate(0,-10px) rotate(0deg);opacity:0}10%{opacity:1}90%{opacity:.7}100%{transform:translate(9px,38px) rotate(280deg);opacity:0}}
  @keyframes wx-snow-med{0%{transform:translate(0,-8px) rotate(0deg);opacity:0}8%{opacity:.9}92%{opacity:.5}100%{transform:translate(-7px,36px) rotate(200deg);opacity:0}}
  @keyframes wx-snow-fast{0%{transform:translate(0,-5px) rotate(0deg);opacity:0}6%{opacity:1}94%{opacity:.4}100%{transform:translate(5px,34px) rotate(360deg);opacity:0}}
  @keyframes wx-fog-r{0%,100%{transform:translateX(-5px);opacity:.5}50%{transform:translateX(10px);opacity:.8}}
  @keyframes wx-fog-l{0%,100%{transform:translateX(5px);opacity:.4}50%{transform:translateX(-9px);opacity:.7}}
  @keyframes wx-fog-fade{0%,100%{opacity:.28}50%{opacity:.6}}
  @keyframes wx-moon-glow{
    0%,100%{filter:drop-shadow(0 0 5px #c7d2fe) drop-shadow(0 0 2px #a5b4fc)}
    50%{filter:drop-shadow(0 0 16px #a5b4fc) drop-shadow(0 0 32px #6366f1)}
  }
  @keyframes wx-star-a{0%,100%{opacity:.12;transform:scale(.65)}50%{opacity:1;transform:scale(1.5)}}
  @keyframes wx-star-b{0%,100%{opacity:.55;transform:scale(.85)}50%{opacity:.06;transform:scale(.45)}}
  @keyframes wx-star-c{0%,100%{opacity:.35;transform:scale(.9)}50%{opacity:1;transform:scale(1.3)}}
  @keyframes wx-shoot{
    0%{transform:translate(0,0) scaleX(1);opacity:0}
    4%{opacity:1}
    28%{transform:translate(50px,25px) scaleX(5);opacity:.85}
    50%,100%{opacity:0}
  }
  @keyframes wx-pc-peek{0%,100%{transform:translate(-4px,3px) scale(.88)}50%{transform:translate(2px,-2px) scale(1.02)}}
  @keyframes wx-pc-cloud{0%,100%{transform:translate(0,0)}33%{transform:translate(3.5px,-1.5px)}66%{transform:translate(-2.5px,1px)}}
`;

// ─── Snowflake helper (6-arm asterisk, pure SVG) ──────────────────────────────
function Snowflake({ cx, cy, r, fill, opacity = 1 }: { cx: number; cy: number; r: number; fill: string; opacity?: number }) {
  const arms = [0, 60, 120, 180, 240, 300];
  return (
    <g transform={`translate(${cx},${cy})`} opacity={opacity}>
      {arms.map((a) => (
        <line key={a} x1={0} y1={-r} x2={0} y2={r} stroke={fill} strokeWidth={r * 0.22} strokeLinecap="round"
          transform={`rotate(${a})`} />
      ))}
      {arms.map((a) => (
        <g key={`b${a}`} transform={`rotate(${a})`}>
          <line x1={r * 0.3} y1={-r * 0.55} x2={0} y2={-r * 0.7} stroke={fill} strokeWidth={r * 0.18} strokeLinecap="round" />
          <line x1={-r * 0.3} y1={-r * 0.55} x2={0} y2={-r * 0.7} stroke={fill} strokeWidth={r * 0.18} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

// ─── SunnyIcon ────────────────────────────────────────────────────────────────
function SunnyIcon({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <defs>
        <radialGradient id="sg-core" cx="45%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="55%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <radialGradient id="sg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <filter id="sf-blur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <style>{WX_CSS}</style>

      {/* Soft background halo (blurred) */}
      <circle cx="48" cy="48" r="34" fill="#fef3c7" opacity="0.2" filter="url(#sf-blur)" />

      {/* Pulsating glow ring */}
      <circle cx="48" cy="48" r="30" fill="url(#sg-glow)"
        style={{ animation: 'wx-sun-glow 3s ease-in-out infinite', transformOrigin: '48px 48px' }} />

      {/* 12 outer wispy rays (counter-rotate slowly) */}
      <g style={{ animation: 'wx-rays-ccw 18s linear infinite', transformOrigin: '48px 48px' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1="48" y1="5" x2="48" y2="14"
            stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" opacity="0.45"
            transform={`rotate(${i * 30} 48 48)`} />
        ))}
      </g>

      {/* Dashed corona orbit */}
      <circle cx="48" cy="48" r="33" fill="none" stroke="#fde68a" strokeWidth="1"
        strokeDasharray="4 7" strokeOpacity="0.25"
        style={{ animation: 'wx-corona 28s linear infinite', transformOrigin: '48px 48px' }} />

      {/* 8 main thick rays (rotate) */}
      <g style={{ animation: 'wx-rays-cw 10s linear infinite', transformOrigin: '48px 48px' }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <line key={i} x1="48" y1="10" x2="48" y2={i % 2 === 0 ? 22 : 20}
            stroke="#fbbf24" strokeWidth={i % 2 === 0 ? 3.5 : 2.5} strokeLinecap="round"
            transform={`rotate(${deg} 48 48)`} />
        ))}
      </g>

      {/* Core */}
      <circle cx="48" cy="48" r="17" fill="url(#sg-core)"
        style={{ animation: 'wx-sun-core 2.8s ease-in-out infinite', transformOrigin: '48px 48px' }} />
      {/* Core inner shimmer */}
      <circle cx="43" cy="43" r="6" fill="white" opacity="0.35" />
      <circle cx="40" cy="41" r="3" fill="white" opacity="0.25" />

      {/* Orbiting lens flare */}
      <circle cx="48" cy="48" r="2.5" fill="#fff7ed" opacity="0.7"
        style={{ animation: 'wx-flare 7s ease-in-out infinite', transformOrigin: '48px 48px' }} />
    </svg>
  );
}

// ─── ClearNightIcon ───────────────────────────────────────────────────────────
function ClearNightIcon({ size = 96 }: { size?: number }) {
  const stars: Array<{ cx: number; cy: number; r: number; anim: string; dur: string; delay: string }> = [
    { cx: 10, cy: 12, r: 1.8, anim: 'wx-star-a', dur: '2.2s', delay: '0s' },
    { cx: 80, cy: 8,  r: 2.2, anim: 'wx-star-b', dur: '1.9s', delay: '0.5s' },
    { cx: 86, cy: 34, r: 1.5, anim: 'wx-star-a', dur: '2.7s', delay: '1s' },
    { cx: 82, cy: 60, r: 1.2, anim: 'wx-star-c', dur: '2.1s', delay: '0.3s' },
    { cx: 18, cy: 58, r: 2,   anim: 'wx-star-b', dur: '2.5s', delay: '0.8s' },
    { cx: 8,  cy: 36, r: 1.3, anim: 'wx-star-a', dur: '1.8s', delay: '1.2s' },
    { cx: 58, cy: 82, r: 1.6, anim: 'wx-star-c', dur: '3s',   delay: '0.2s' },
    { cx: 28, cy: 82, r: 1.1, anim: 'wx-star-b', dur: '2.3s', delay: '0.7s' },
    { cx: 68, cy: 14, r: 1,   anim: 'wx-star-a', dur: '2.6s', delay: '1.4s' },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <defs>
        <radialGradient id="mg-moon" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="65%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
      </defs>
      <style>{WX_CSS}</style>

      {/* Stars */}
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#c7d2fe"
          style={{ animation: `${s.anim} ${s.dur} ease-in-out ${s.delay} infinite`, transformOrigin: `${s.cx}px ${s.cy}px` }} />
      ))}

      {/* Shooting star */}
      <line x1="6" y1="20" x2="20" y2="26" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.9"
        style={{ animation: 'wx-shoot 6s ease-out 1.5s infinite', transformOrigin: '6px 20px' }} />

      {/* Moon body + glow */}
      <g style={{ animation: 'wx-moon-glow 3.5s ease-in-out infinite' }}>
        <path d="M54 10 A32 32 0 1 0 54 76 A24 24 0 1 1 54 10Z" fill="url(#mg-moon)" />
        {/* Subtle craters */}
        <circle cx="40" cy="40" r="4.5" fill="#94a3b8" opacity="0.3" />
        <circle cx="52" cy="58" r="3" fill="#94a3b8" opacity="0.22" />
        <circle cx="46" cy="27" r="2.5" fill="#94a3b8" opacity="0.28" />
        <circle cx="34" cy="54" r="2" fill="#94a3b8" opacity="0.2" />
      </g>
    </svg>
  );
}

// ─── PartlyCloudyIcon ─────────────────────────────────────────────────────────
function PartlyCloudyIcon({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <defs>
        <radialGradient id="pcg-sun" cx="45%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="100%" stopColor="#fbbf24" />
        </radialGradient>
      </defs>
      <style>{WX_CSS}</style>

      {/* Sun peeking (behind cloud) */}
      <g style={{ animation: 'wx-pc-peek 5s ease-in-out infinite', transformOrigin: '28px 32px' }}>
        {/* Sun rays */}
        <g style={{ animation: 'wx-rays-cw 12s linear infinite', transformOrigin: '28px 32px' }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <line key={i} x1="28" y1="14" x2="28" y2={i % 2 === 0 ? 22 : 20}
              stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round"
              transform={`rotate(${deg} 28 32)`} opacity="0.85" />
          ))}
        </g>
        <circle cx="28" cy="32" r="13" fill="url(#pcg-sun)" />
        <circle cx="24" cy="28" r="4" fill="white" opacity="0.3" />
      </g>

      {/* Cloud (foreground, floating) */}
      <g style={{ animation: 'wx-pc-cloud 6s ease-in-out infinite' }}>
        <ellipse cx="58" cy="62" rx="26" ry="14" fill="#e2e8f0" />
        <ellipse cx="44" cy="67" rx="18" ry="11" fill="#f1f5f9" />
        <circle cx="40" cy="58" r="13" fill="#e2e8f0" />
        <circle cx="56" cy="54" r="16" fill="#e2e8f0" />
        <circle cx="70" cy="60" r="12" fill="#cbd5e1" />
        {/* Cloud highlight */}
        <ellipse cx="50" cy="52" rx="10" ry="5" fill="white" opacity="0.35" />
      </g>
    </svg>
  );
}

// ─── CloudyIcon ───────────────────────────────────────────────────────────────
function CloudyIcon({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <style>{WX_CSS}</style>
      {/* Back cloud (slow, left drift) */}
      <g style={{ animation: 'wx-fog-l 8s ease-in-out infinite' }} opacity="0.45">
        <ellipse cx="44" cy="34" rx="22" ry="11" fill="#94a3b8" />
        <circle cx="30" cy="33" r="12" fill="#94a3b8" />
        <circle cx="48" cy="29" r="14" fill="#94a3b8" />
      </g>
      {/* Front cloud (breathe) */}
      <g style={{ animation: 'wx-cloud-breathe 4.5s ease-in-out infinite' }}>
        <ellipse cx="50" cy="56" rx="28" ry="14" fill="#cbd5e1" />
        <ellipse cx="34" cy="62" rx="18" ry="11" fill="#e2e8f0" />
        <circle cx="30" cy="52" r="14" fill="#cbd5e1" />
        <circle cx="50" cy="48" r="17" fill="#cbd5e1" />
        <circle cx="66" cy="56" r="13" fill="#b8c4ce" />
        <ellipse cx="46" cy="47" rx="12" ry="5" fill="white" opacity="0.3" />
      </g>
    </svg>
  );
}

// ─── RainIcon ─────────────────────────────────────────────────────────────────
function RainIcon({ size = 96 }: { size?: number }) {
  const drops = [
    { x: 26, y: 46, delay: '0s',    dur: '1.05s', anim: 'wx-rain-a', sx: 26, sy: 84, sr: 3 },
    { x: 36, y: 44, delay: '0.28s', dur: '0.95s', anim: 'wx-rain-b', sx: 33, sy: 82, sr: 2.5 },
    { x: 46, y: 46, delay: '0.55s', dur: '1.1s',  anim: 'wx-rain-a', sx: 40, sy: 86, sr: 3.5 },
    { x: 56, y: 44, delay: '0.15s', dur: '1s',    anim: 'wx-rain-c', sx: 49, sy: 84, sr: 2.5 },
    { x: 31, y: 46, delay: '0.75s', dur: '0.9s',  anim: 'wx-rain-b', sx: 26, sy: 82, sr: 2 },
    { x: 41, y: 44, delay: '0.4s',  dur: '1.15s', anim: 'wx-rain-a', sx: 33, sy: 83, sr: 3 },
    { x: 51, y: 46, delay: '0.88s', dur: '1.02s', anim: 'wx-rain-c', sx: 44, sy: 85, sr: 2 },
    { x: 62, y: 44, delay: '0.33s', dur: '0.97s', anim: 'wx-rain-b', sx: 55, sy: 83, sr: 2.5 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id="rg-drop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <style>{WX_CSS}</style>

      {/* Cloud */}
      <g style={{ animation: 'wx-cloud-dark 3.5s ease-in-out infinite' }}>
        <ellipse cx="50" cy="34" rx="26" ry="13" fill="#475569" />
        <circle cx="32" cy="33" r="14" fill="#475569" />
        <circle cx="52" cy="27" r="17" fill="#334155" />
        <circle cx="66" cy="34" r="13" fill="#475569" />
        <ellipse cx="48" cy="26" rx="12" ry="5" fill="#64748b" opacity="0.35" />
      </g>

      {/* Drops */}
      {drops.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width="2.5" height="11" rx="1.25" fill="url(#rg-drop)"
          style={{ animation: `${d.anim} ${d.dur} linear ${d.delay} infinite` }} />
      ))}

      {/* Splash rings */}
      {drops.slice(0, 4).map((d, i) => (
        <circle key={i} cx={d.sx} cy={d.sy} r={d.sr} fill="none" stroke="#7dd3fc" strokeWidth="1.2"
          style={{ animation: `wx-splash 1s ease-out ${d.delay} infinite` }} />
      ))}
    </svg>
  );
}

// ─── StormIcon ────────────────────────────────────────────────────────────────
function StormIcon({ size = 96 }: { size?: number }) {
  const drops = [
    { x: 18, y: 44, delay: '0s',    dur: '0.78s', anim: 'wx-rain-a' },
    { x: 26, y: 42, delay: '0.22s', dur: '0.85s', anim: 'wx-rain-b' },
    { x: 58, y: 44, delay: '0.08s', dur: '0.82s', anim: 'wx-rain-c' },
    { x: 66, y: 42, delay: '0.38s', dur: '0.72s', anim: 'wx-rain-a' },
    { x: 22, y: 44, delay: '0.58s', dur: '0.88s', anim: 'wx-rain-b' },
    { x: 62, y: 42, delay: '0.46s', dur: '0.79s', anim: 'wx-rain-c' },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <defs>
        <filter id="stf-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="stg-bolt" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <style>{WX_CSS}</style>

      {/* Screen flash overlay */}
      <rect x="0" y="0" width="96" height="96" fill="#fef9c3" rx="8"
        style={{ animation: 'wx-screen-flash 3.2s ease-in-out infinite' }} />

      {/* Churning storm cloud */}
      <g style={{ animation: 'wx-storm-churn 4.5s ease-in-out infinite', transformOrigin: '48px 30px' }}>
        <ellipse cx="50" cy="30" rx="30" ry="14" fill="#1e293b" />
        <circle cx="28" cy="29" r="15" fill="#1e293b" />
        <circle cx="52" cy="22" r="18" fill="#0f172a" />
        <circle cx="68" cy="30" r="14" fill="#1e293b" />
        <ellipse cx="46" cy="20" rx="14" ry="6" fill="#334155" opacity="0.5" />
      </g>

      {/* Main lightning bolt */}
      <g style={{ animation: 'wx-lightning 3.2s ease-in-out infinite' }}>
        <polyline points="50,44 42,58 50,58 38,78" stroke="url(#stg-bolt)" strokeWidth="4"
          strokeLinejoin="round" fill="none" filter="url(#stf-glow)" />
        <polyline points="50,44 42,58 50,58 38,78" stroke="white" strokeWidth="1.5"
          strokeLinejoin="round" fill="none" opacity="0.9" />
      </g>

      {/* Branch lightning */}
      <g style={{ animation: 'wx-lightning-b 3.2s ease-in-out infinite' }}>
        <polyline points="42,58 36,68 40,68" stroke="#fde68a" strokeWidth="2.5"
          strokeLinejoin="round" fill="none" />
      </g>

      {/* Angled rain */}
      {drops.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width="2" height="10" rx="1" fill="#7dd3fc" opacity="0.7"
          style={{ animation: `${d.anim} ${d.dur} linear ${d.delay} infinite` }} />
      ))}
    </svg>
  );
}

// ─── SnowIcon ─────────────────────────────────────────────────────────────────
function SnowIcon({ size = 96 }: { size?: number }) {
  const flakes = [
    { cx: 24, cy: 44, r: 5,   delay: '0s',    dur: '2.3s', anim: 'wx-snow-slow' },
    { cx: 36, cy: 42, r: 4,   delay: '0.55s', dur: '2.9s', anim: 'wx-snow-med' },
    { cx: 48, cy: 44, r: 6,   delay: '1.1s',  dur: '2.6s', anim: 'wx-snow-slow' },
    { cx: 60, cy: 42, r: 4.5, delay: '0.28s', dur: '3.1s', anim: 'wx-snow-fast' },
    { cx: 30, cy: 42, r: 3.5, delay: '1.4s',  dur: '2.5s', anim: 'wx-snow-med' },
    { cx: 54, cy: 44, r: 3,   delay: '0.88s', dur: '2.8s', anim: 'wx-snow-fast' },
    { cx: 42, cy: 42, r: 5.5, delay: '0.66s', dur: '2.4s', anim: 'wx-snow-slow' },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <style>{WX_CSS}</style>

      {/* Cloud */}
      <g style={{ animation: 'wx-cloud-breathe 5s ease-in-out infinite' }}>
        <ellipse cx="50" cy="30" rx="24" ry="12" fill="#94a3b8" />
        <circle cx="32" cy="29" r="13" fill="#94a3b8" />
        <circle cx="52" cy="24" r="15" fill="#94a3b8" />
        <circle cx="64" cy="30" r="12" fill="#78909c" />
        <ellipse cx="46" cy="23" rx="10" ry="4.5" fill="#b0bec5" opacity="0.4" />
      </g>

      {/* Snowflakes */}
      {flakes.map((f, i) => (
        <g key={i} style={{ animation: `${f.anim} ${f.dur} linear ${f.delay} infinite` }}>
          <Snowflake cx={f.cx} cy={f.cy} r={f.r} fill="#bae6fd" opacity={0.92} />
        </g>
      ))}
    </svg>
  );
}

// ─── FogIcon ──────────────────────────────────────────────────────────────────
function FogIcon({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <style>{WX_CSS}</style>
      <rect x="8"  y="20" width="80" height="6" rx="3" fill="#94a3b8" opacity="0.65"
        style={{ animation: 'wx-fog-r 4.2s ease-in-out infinite' }} />
      <rect x="14" y="32" width="68" height="6" rx="3" fill="#94a3b8" opacity="0.55"
        style={{ animation: 'wx-fog-l 5.1s ease-in-out infinite' }} />
      <rect x="6"  y="44" width="84" height="6" rx="3" fill="#94a3b8" opacity="0.5"
        style={{ animation: 'wx-fog-r 3.8s ease-in-out infinite' }} />
      <rect x="18" y="56" width="60" height="6" rx="3" fill="#94a3b8" opacity="0.4"
        style={{ animation: 'wx-fog-l 4.7s ease-in-out infinite' }} />
      <rect x="10" y="68" width="76" height="5" rx="2.5" fill="#94a3b8" opacity="0.3"
        style={{ animation: 'wx-fog-fade 6s ease-in-out infinite' }} />
    </svg>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
function WeatherIcon({ type, size = 96 }: { type: WeatherType; size?: number }) {
  switch (type) {
    case 'sunny':        return <SunnyIcon size={size} />;
    case 'clear_night':  return <ClearNightIcon size={size} />;
    case 'partly_cloudy':return <PartlyCloudyIcon size={size} />;
    case 'cloudy':       return <CloudyIcon size={size} />;
    case 'rain':         return <RainIcon size={size} />;
    case 'storm':        return <StormIcon size={size} />;
    case 'snow':         return <SnowIcon size={size} />;
    case 'fog':          return <FogIcon size={size} />;
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
export default function WeatherWidget() {
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
        <div className="h-20 w-20 rounded-full bg-white/10" />
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

  return (
    <div className="flex h-full flex-col items-center">
      {/* Location label */}
      <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">
        {weather.locationName}
      </p>

      {/* Animated icon */}
      <div className="relative flex items-center justify-center">
        <WeatherIcon type={type} size={96} />
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
