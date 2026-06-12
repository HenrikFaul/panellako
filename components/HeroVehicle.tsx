'use client';

/**
 * HeroVehicle · v1.0.0
 * ─────────────────────────────────────────────────────────────────────────────
 * Detailed animated vehicle overlay for the dashboard hero skyline.
 * Six vehicles rotate randomly at 16–32 s intervals:
 *   Tram (CAF Urbos 5-section) · Trolleybus (Solaris-Trollino 18) ·
 *   Bus (Mercedes Citaro) · 3 Cyclists (rotating wheels) ·
 *   A380 take-off · A380 landing
 *
 * Drop inside any `position:relative; overflow:hidden` container.
 * No external dependencies — pure React + inline CSS keyframes.
 */

import React, { useEffect, useState, Fragment } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

type VehicleKey = 'tram' | 'trolley' | 'bus' | 'cyclists' | 'a380_to' | 'a380_ld';

interface VehicleConfig {
  Component: React.ComponentType;
  width:     number;
  height:    number;
  duration:  number;
  layer:     'ground' | 'sky';
  takeoff?:  boolean;
}

// ─── SVG vehicle components ─────────────────────────────────────────────────

export function Tram() {
  return (
    <svg viewBox="0 0 540 40" fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="tramY" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fde047"/>
          <stop offset="35%"  stopColor="#fbd000"/>
          <stop offset="80%"  stopColor="#e0a800"/>
          <stop offset="100%" stopColor="#ca8a04"/>
        </linearGradient>
        <linearGradient id="tramGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.65"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="winBand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#080a14"/>
          <stop offset="50%"  stopColor="#1a2030"/>
          <stop offset="100%" stopColor="#06080f"/>
        </linearGradient>
        <linearGradient id="winLit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3a2a14"/>
          <stop offset="45%"  stopColor="#f59e0b" stopOpacity="0.72"/>
          <stop offset="100%" stopColor="#1a1209"/>
        </linearGradient>
        <linearGradient id="bellows" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1f2937"/>
          <stop offset="50%"  stopColor="#0a0e1a"/>
          <stop offset="100%" stopColor="#1f2937"/>
        </linearGradient>
        <radialGradient id="headlamp" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff"/>
          <stop offset="55%"  stopColor="#fff3c4" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#fff3c4" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <ellipse cx="540" cy="33" rx="26" ry="5" fill="url(#headlamp)" opacity="0.55"/>
      <ellipse cx="0"   cy="33" rx="26" ry="5" fill="url(#headlamp)" opacity="0.45"/>
      <line x1="0" y1="1.5" x2="540" y2="1.5" stroke="#0f172a" strokeWidth="0.5" opacity="0.7"/>

      {/* REAR CAB */}
      <path d="M 106 5 L 94 5 C 49 5, 17 16, 6 32 L 106 32 Z" fill="url(#tramY)"/>
      {/* Bellows 1 */}
      <rect x="106" y="7" width="8" height="25" fill="url(#bellows)"/>
      <g stroke="#06080f" strokeWidth="0.4" opacity="0.85">
        {[107.2,108.7,110.2,111.7,113.2].map(x => <line key={x} x1={x} y1="7" x2={x} y2="32"/>)}
      </g>
      {/* MID 1 */}
      <rect x="114" y="5" width="100" height="27" rx="1.8" fill="url(#tramY)"/>
      {/* Bellows 2 */}
      <rect x="214" y="7" width="8" height="25" fill="url(#bellows)"/>
      <g stroke="#06080f" strokeWidth="0.4" opacity="0.85">
        {[215.2,216.7,218.2,219.7,221.2].map(x => <line key={x} x1={x} y1="7" x2={x} y2="32"/>)}
      </g>
      {/* MID CENTER */}
      <rect x="222" y="5" width="100" height="27" rx="1.8" fill="url(#tramY)"/>
      {/* Bellows 3 */}
      <rect x="322" y="7" width="8" height="25" fill="url(#bellows)"/>
      <g stroke="#06080f" strokeWidth="0.4" opacity="0.85">
        {[323.2,324.7,326.2,327.7,329.2].map(x => <line key={x} x1={x} y1="7" x2={x} y2="32"/>)}
      </g>
      {/* MID 2 */}
      <rect x="330" y="5" width="100" height="27" rx="1.8" fill="url(#tramY)"/>
      {/* Bellows 4 */}
      <rect x="430" y="7" width="8" height="25" fill="url(#bellows)"/>
      <g stroke="#06080f" strokeWidth="0.4" opacity="0.85">
        {[431.2,432.7,434.2,435.7,437.2].map(x => <line key={x} x1={x} y1="7" x2={x} y2="32"/>)}
      </g>
      {/* FRONT CAB */}
      <path d="M 438 5 L 450 5 C 495 5, 527 16, 538 32 L 438 32 Z" fill="url(#tramY)"/>

      {/* Gloss highlights */}
      <path d="M 100 6.5 C 70 7.5, 38 13, 20 23" stroke="url(#tramGloss)" strokeWidth="1.4" fill="none" opacity="0.8"/>
      <path d="M 116 6 L 212 6 M 224 6 L 320 6 M 332 6 L 428 6" stroke="url(#tramGloss)" strokeWidth="1.2" fill="none" opacity="0.7"/>
      <path d="M 444 6.5 C 474 7.5, 506 13, 524 23" stroke="url(#tramGloss)" strokeWidth="1.4" fill="none" opacity="0.8"/>

      {/* Pantograph 1 on MID 1 */}
      <g>
        <rect x="138" y="12.5" width="52" height="1.8" rx="0.3" fill="#1f2937"/>
        {[140,155,170,185].map(x => <rect key={x} x={x} y="13.5" width="2.5" height="2.2" rx="0.3" fill="#1f2937"/>)}
        <g stroke="#0a0a0a" fill="none" strokeLinecap="round">
          <path d="M 144 11.5 L 157 3 L 173 3 L 186 11.5" strokeWidth="1.4"/>
          <path d="M 150 11 L 162 4.5 L 168 4.5 L 180 11" strokeWidth="1"/>
        </g>
        <line x1="153" y1="2.5" x2="177" y2="2.5" stroke="#0a0a0a" strokeWidth="1.8"/>
        <circle cx="165" cy="2.3" r="1.6" fill="#fff3c4" opacity="0.6"/>
        <circle cx="165" cy="2.3" r="0.8" fill="#ffffff" opacity="0.85"/>
      </g>
      {/* Pantograph 2 on MID 2 */}
      <g>
        <rect x="354" y="12.5" width="52" height="1.8" rx="0.3" fill="#1f2937"/>
        {[356,371,386,401].map(x => <rect key={x} x={x} y="13.5" width="2.5" height="2.2" rx="0.3" fill="#1f2937"/>)}
        <g stroke="#0a0a0a" fill="none" strokeLinecap="round">
          <path d="M 360 11.5 L 373 3 L 389 3 L 402 11.5" strokeWidth="1.4"/>
          <path d="M 366 11 L 378 4.5 L 384 4.5 L 396 11" strokeWidth="1"/>
        </g>
        <line x1="369" y1="2.5" x2="393" y2="2.5" stroke="#0a0a0a" strokeWidth="1.8"/>
      </g>

      {/* Window bands */}
      {[[116,96],[224,96],[332,96]].map(([x,w]) => (
        <rect key={x} x={x} y="11" width={w} height="9.5" rx="0.4" fill="url(#winBand)"/>
      ))}

      {/* REAR CAB windshield + details */}
      <path d="M 100 9 C 64 10, 33 16, 18 27 L 24 30 C 42 19, 68 12, 100 12 Z" fill="url(#winBand)" opacity="0.95"/>
      <g fill="#06080f" opacity="0.85">
        <ellipse cx="60" cy="17" rx="2.4" ry="2"/>
        <path d="M 56 19 L 64 19 L 62.5 24 L 57.5 24 Z"/>
      </g>
      <rect x="82" y="14" width="14" height="7" rx="1" fill="#fde047" stroke="#0a0a0a" strokeWidth="0.4"/>
      <text x="89" y="19.5" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="6" fill="#0a0a0a">17</text>
      <circle cx="12" cy="29" r="3" fill="url(#headlamp)" opacity="0.9"/>
      <circle cx="12" cy="29" r="1.7" fill="#fffce8"/>
      <circle cx="12" cy="29" r="1"   fill="#ffffff"/>

      {/* MID 1 windows */}
      <g>
        {[[116,6],[206,6]].map(([x]) => (
          <g key={x}>
            <rect x={x} y="11" width="6" height="18" fill="url(#tramY)"/>
            <rect x={x+0.6} y="11.6" width="4.8" height="8" rx="0.3" fill="url(#winBand)"/>
          </g>
        ))}
        {[[124,20,0.75],[146,20,0.85],[168,16,0.7],[186,18,0.85]].map(([x,w,op]) => (
          <rect key={x} x={x} y="12.5" width={w} height="6.5" rx="0.4" fill="url(#winLit)" opacity={op}/>
        ))}
      </g>
      {/* MID CENTER windows */}
      <g>
        {[[224,6],[314,6]].map(([x]) => (
          <g key={x}>
            <rect x={x} y="11" width="6" height="18" fill="url(#tramY)"/>
            <rect x={x+0.6} y="11.6" width="4.8" height="8" rx="0.3" fill="url(#winBand)"/>
          </g>
        ))}
        {[[232,20,0.7],[254,20,0.85],[276,16,0.75],[294,18,0.85]].map(([x,w,op]) => (
          <rect key={x} x={x} y="12.5" width={w} height="6.5" rx="0.4" fill="url(#winLit)" opacity={op}/>
        ))}
      </g>
      {/* MID 2 windows */}
      <g>
        {[[332,6],[422,6]].map(([x]) => (
          <g key={x}>
            <rect x={x} y="11" width="6" height="18" fill="url(#tramY)"/>
            <rect x={x+0.6} y="11.6" width="4.8" height="8" rx="0.3" fill="url(#winBand)"/>
          </g>
        ))}
        {[[340,20,0.75],[362,20,0.85],[384,16,0.7],[402,18,0.85]].map(([x,w,op]) => (
          <rect key={x} x={x} y="12.5" width={w} height="6.5" rx="0.4" fill="url(#winLit)" opacity={op}/>
        ))}
      </g>

      {/* FRONT CAB windshield + details */}
      <path d="M 444 9 C 480 10, 511 16, 526 27 L 520 30 C 502 19, 476 12, 444 12 Z" fill="url(#winBand)" opacity="0.95"/>
      <g fill="#06080f" opacity="0.85">
        <ellipse cx="484" cy="17" rx="2.4" ry="2"/>
        <path d="M 480 19 L 488 19 L 486.5 24 L 481.5 24 Z"/>
      </g>
      <rect x="448" y="14" width="14" height="7" rx="1" fill="#fde047" stroke="#0a0a0a" strokeWidth="0.4"/>
      <text x="455" y="19.5" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="6" fill="#0a0a0a">17</text>
      <circle cx="532" cy="29" r="3" fill="url(#headlamp)" opacity="0.9"/>
      <circle cx="532" cy="29" r="1.7" fill="#fffce8"/>
      <circle cx="532" cy="29" r="1"   fill="#ffffff"/>

      {/* Underframe + 7 bogies */}
      <rect x="6" y="31.5" width="532" height="1.6" fill="#06080f"/>
      {[60,138,188,272,356,406,480].map((cx) => (
        <g key={cx}>
          <rect x={cx-8} y="32.5" width="16" height="2.8" rx="0.4" fill="#0f172a"/>
          <circle cx={cx-5} cy="37" r="2.6" fill="#0a0e1a"/>
          <circle cx={cx+5} cy="37" r="2.6" fill="#0a0e1a"/>
          <circle cx={cx-5} cy="37" r="1"   fill="#52525b"/>
          <circle cx={cx+5} cy="37" r="1"   fill="#52525b"/>
        </g>
      ))}
      <ellipse cx="270" cy="39.5" rx="260" ry="0.8" fill="#000" opacity="0.22"/>
    </svg>
  );
}

export function Trolleybus() {
  return (
    <svg viewBox="0 0 380 42" fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="troBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ef4444"/>
          <stop offset="50%"  stopColor="#dc2626"/>
          <stop offset="100%" stopColor="#7f1d1d"/>
        </linearGradient>
        <linearGradient id="troGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="troWin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#080a14"/>
          <stop offset="50%" stopColor="#1a2030"/>
          <stop offset="100%" stopColor="#06080f"/>
        </linearGradient>
        <linearGradient id="troLit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3a2a14"/>
          <stop offset="45%"  stopColor="#f59e0b" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#1a1209"/>
        </linearGradient>
        <linearGradient id="troBel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1f2937"/>
          <stop offset="50%"  stopColor="#0a0e1a"/>
          <stop offset="100%" stopColor="#1f2937"/>
        </linearGradient>
        <radialGradient id="troLamp" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff"/>
          <stop offset="55%"  stopColor="#fff3c4" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#fff3c4" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <line x1="0" y1="2"   x2="380" y2="2"   stroke="#0f172a" strokeWidth="0.4" opacity="0.7"/>
      <line x1="0" y1="3.5" x2="380" y2="3.5" stroke="#0f172a" strokeWidth="0.4" opacity="0.55"/>
      <ellipse cx="380" cy="32" rx="22" ry="4" fill="url(#troLamp)" opacity="0.55"/>

      {/* Rear section */}
      <rect x="6" y="9" width="172" height="25" rx="1.6" fill="url(#troBody)"/>
      {/* Bellows */}
      <rect x="178" y="10" width="6" height="23" fill="url(#troBel)"/>
      <g stroke="#06080f" strokeWidth="0.35" opacity="0.8">
        {[179.1,180.4,181.6,182.8].map(x => <line key={x} x1={x} y1="10" x2={x} y2="33"/>)}
      </g>
      {/* Front section */}
      <path d="M 184 9 L 340 9 C 360 9, 372 18, 374 28 L 374 34 L 184 34 Z" fill="url(#troBody)"/>

      {/* Gloss */}
      <path d="M 8 10 L 178 10 M 186 10 L 340 10 C 358 10, 369 18, 372 27"
        stroke="url(#troGloss)" strokeWidth="1" fill="none" opacity="0.7"/>

      {/* Trolley poles */}
      <g>
        <rect x="140" y="6" width="14" height="3.5" rx="0.4" fill="#0f172a"/>
        <line x1="143" y1="7" x2="76"  y2="2"   stroke="#0f172a" strokeWidth="0.9"/>
        <line x1="151" y1="7" x2="86"  y2="3.5" stroke="#0f172a" strokeWidth="0.9"/>
        <rect x="73" y="1.2" width="6" height="1.5" rx="0.3" fill="#1f2937"/>
        <rect x="83" y="2.7" width="6" height="1.5" rx="0.3" fill="#1f2937"/>
        <circle cx="76" cy="2" r="1.4" fill="#fff3c4" opacity="0.55"/>
        <circle cx="76" cy="2" r="0.6" fill="#ffffff"/>
      </g>

      {/* Rear windows */}
      <rect x="14" y="13.5" width="160" height="8" rx="0.4" fill="url(#troWin)"/>
      {[[14,78,160]].flat().filter((_, i) => i < 3).map(x => (
        <g key={x}>
          <rect x={x}     y="13.5" width="6" height="17" fill="url(#troBody)"/>
          <rect x={x+0.6} y="14"   width="4.8" height="7" rx="0.3" fill="url(#troWin)"/>
        </g>
      ))}
      <g>
        {[[22,13,0.8],[37,13,0.7],[52,13,0.85],[67,9,0.7],[86,13,0.8],[101,13,0.85],[116,13,0.7],[131,13,0.85],[146,13,0.75]].map(([x,w,op]) => (
          <rect key={x} x={x} y="14.5" width={w} height="6" rx="0.4" fill="url(#troLit)" opacity={op}/>
        ))}
      </g>

      {/* Front windows */}
      <rect x="188" y="13.5" width="148" height="8" rx="0.4" fill="url(#troWin)"/>
      {[188, 252].map(x => (
        <g key={x}>
          <rect x={x}     y="13.5" width="6" height="17" fill="url(#troBody)"/>
          <rect x={x+0.6} y="14"   width="4.8" height="7" rx="0.3" fill="url(#troWin)"/>
        </g>
      ))}
      <g>
        {[[196,13,0.8],[211,13,0.7],[226,13,0.85],[241,9,0.7],[260,13,0.85],[275,13,0.75],[290,13,0.7]].map(([x,w,op]) => (
          <rect key={x} x={x} y="14.5" width={w} height="6" rx="0.4" fill="url(#troLit)" opacity={op}/>
        ))}
      </g>

      {/* Cab windshield */}
      <path d="M 305 13.5 L 338 13.5 C 358 13.5, 369 22, 370 28 L 305 28 Z" fill="url(#troWin)"/>
      <g fill="#06080f" opacity="0.85">
        <ellipse cx="356" cy="20" rx="2.2" ry="1.8"/>
        <path d="M 353 22 L 360 22 L 358.5 26 L 354.5 26 Z"/>
      </g>
      <rect x="312" y="16" width="12" height="6.5" rx="0.8" fill="#fbbf24" stroke="#0a0a0a" strokeWidth="0.4"/>
      <text x="318" y="21" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="5.5" fill="#0a0a0a">72</text>

      {/* BKK yellow stripe */}
      <rect x="14"  y="21.4" width="160" height="1.6" fill="#fbbf24"/>
      <rect x="188" y="21.4" width="148" height="1.6" fill="#fbbf24"/>

      {/* Headlights */}
      <circle cx="372" cy="28" r="2.4" fill="url(#troLamp)" opacity="0.9"/>
      <circle cx="372" cy="28" r="1.3" fill="#fffce8"/>
      <circle cx="372" cy="28" r="0.7" fill="#ffffff"/>

      {/* Wheels */}
      <rect x="6" y="33.5" width="368" height="1.2" fill="#06080f"/>
      {[28,156,230,320,358].map(cx => (
        <g key={cx}>
          <path d={`M ${cx-9} 34 Q ${cx} 30 ${cx+9} 34 Z`} fill="url(#troBody)"/>
          <circle cx={cx} cy="37.5" r="3.8" fill="#0a0e1a"/>
          <circle cx={cx} cy="37.5" r="2"   fill="#374151"/>
          <circle cx={cx} cy="37.5" r="0.9" fill="#94a3b8"/>
        </g>
      ))}
      <ellipse cx="190" cy="41.5" rx="180" ry="0.7" fill="#000" opacity="0.22"/>
    </svg>
  );
}

export function Bus() {
  return (
    <svg viewBox="0 0 320 40" fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="busBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#38bdf8"/>
          <stop offset="50%"  stopColor="#0ea5e9"/>
          <stop offset="100%" stopColor="#075985"/>
        </linearGradient>
        <linearGradient id="busWin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#080a14"/>
          <stop offset="50%" stopColor="#1a2030"/>
          <stop offset="100%" stopColor="#06080f"/>
        </linearGradient>
        <linearGradient id="busLit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3a2a14"/>
          <stop offset="45%"  stopColor="#f59e0b" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#1a1209"/>
        </linearGradient>
        <radialGradient id="busLamp" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff"/>
          <stop offset="55%"  stopColor="#fff3c4" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#fff3c4" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <ellipse cx="320" cy="30" rx="20" ry="4" fill="url(#busLamp)" opacity="0.55"/>
      <path d="M 6 8 L 282 8 C 300 8, 310 16, 312 26 L 312 32 L 6 32 L 6 10 Q 6 8 8 8 Z" fill="url(#busBody)"/>

      <rect x="14" y="11.5" width="266" height="9" rx="0.4" fill="url(#busWin)"/>

      {/* Doors */}
      {[14,110,210].map(x => (
        <g key={x}>
          <rect x={x}     y="11.5" width="6" height="17" fill="#f1f5f9"/>
          <rect x={x+0.6} y="12"   width="4.8" height="7.5" rx="0.3" fill="url(#busWin)"/>
        </g>
      ))}

      {/* Windows */}
      {[[22,16,0.75],[40,16,0.85],[58,16,0.7],[76,16,0.8],[94,14,0.7],[118,18,0.85],[138,18,0.7],[158,18,0.85],[178,18,0.75],[198,10,0.7],[218,18,0.85],[238,18,0.7],[258,20,0.85]].map(([x,w,op]) => (
        <rect key={x} x={x} y="13" width={w} height="6.5" rx="0.4" fill="url(#busLit)" opacity={op}/>
      ))}

      {/* Cab windshield */}
      <path d="M 256 11.5 L 282 11.5 C 296 11.5, 305 18, 307 25 L 256 25 Z" fill="url(#busWin)"/>
      <g fill="#06080f" opacity="0.85">
        <ellipse cx="296" cy="18" rx="2.1" ry="1.8"/>
        <path d="M 293 20 L 300 20 L 298.5 24 L 294 24 Z"/>
      </g>
      <rect x="260" y="14" width="12" height="6.5" rx="0.8" fill="#fbbf24" stroke="#0a0a0a" strokeWidth="0.4"/>
      <text x="266" y="18.8" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="5" fill="#0a0a0a">105</text>

      {/* Mercedes star */}
      <g>
        <circle cx="310" cy="22" r="2.4" fill="#f1f5f9" stroke="#0a0a0a" strokeWidth="0.35"/>
        <g stroke="#0a0a0a" strokeWidth="0.5" strokeLinecap="round">
          <line x1="310" y1="20.2" x2="310" y2="23.8"/>
          <line x1="308.4" y1="22.8" x2="311.6" y2="22.8"/>
          <line x1="311.5" y1="23.4" x2="308.5" y2="20.9"/>
        </g>
      </g>

      <rect x="6" y="21" width="306" height="1.2" fill="#f1f5f9"/>
      <circle cx="307" cy="27" r="1.8" fill="url(#busLamp)" opacity="0.9"/>
      <circle cx="307" cy="27" r="1"   fill="#fffce8"/>

      <rect x="6" y="31.5" width="306" height="1.2" fill="#06080f"/>
      {[42,240].map(cx => (
        <g key={cx}>
          <path d={`M ${cx-10} 32 Q ${cx} 28 ${cx+10} 32 Z`} fill="url(#busBody)"/>
          <circle cx={cx} cy="35.5" r="3.6" fill="#0a0e1a"/>
          <circle cx={cx} cy="35.5" r="1.9" fill="#374151"/>
          <circle cx={cx} cy="35.5" r="0.8" fill="#94a3b8"/>
        </g>
      ))}
      <ellipse cx="160" cy="39.5" rx="155" ry="0.7" fill="#000" opacity="0.22"/>
    </svg>
  );
}

export function Cyclists() {
  const riders = [
    { x: 18,  jersey: '#dc2626', helmet: '#0a0a0a' },
    { x: 86,  jersey: '#0ea5e9', helmet: '#f1f5f9' },
    { x: 154, jersey: '#fbbf24', helmet: '#dc2626' },
  ];
  return (
    <svg viewBox="0 0 220 36" fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <radialGradient id="cyHub" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#52525b"/>
          <stop offset="100%" stopColor="#0a0a0a"/>
        </radialGradient>
        <style>{`
          .cy-wheel{animation:cyspin 0.45s linear infinite;transform-box:fill-box;transform-origin:center}
          @keyframes cyspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        `}</style>
      </defs>
      {riders.map((r, i) => (
        <g key={i} transform={`translate(${r.x},0)`}>
          {/* Frame */}
          <line x1="16" y1="22" x2="40" y2="22" stroke="#0a0a0a" strokeWidth="1.3"/>
          <line x1="16" y1="22" x2="32" y2="29" stroke="#0a0a0a" strokeWidth="1.3"/>
          <line x1="32" y1="29" x2="28" y2="21" stroke="#0a0a0a" strokeWidth="1.3"/>
          <line x1="28" y1="21" x2="11" y2="29" stroke="#0a0a0a" strokeWidth="1"/>
          <line x1="32" y1="29" x2="11" y2="29" stroke="#0a0a0a" strokeWidth="1"/>
          <line x1="40" y1="22" x2="46" y2="29" stroke="#0a0a0a" strokeWidth="1.2"/>
          <line x1="40" y1="22" x2="42" y2="18" stroke="#0a0a0a" strokeWidth="1.2"/>
          <path d="M 38 17 Q 41 16 44 18" stroke="#0a0a0a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
          <ellipse cx="28" cy="19.5" rx="3" ry="0.9" fill="#0a0a0a"/>
          {/* Rider */}
          <path d="M 28 19 L 33 26 L 34 33" stroke="#0a0a0a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M 28 19 L 39 17 L 39 13 L 30 14 Z" fill={r.jersey}/>
          <path d="M 39 14 L 42 17 M 39 14 L 40 17" stroke={r.jersey} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          <circle cx="41" cy="11.5" r="2.4" fill="#f5d7a8"/>
          <path d="M 38.6 11.5 Q 41 8 43.5 10.5 L 43.8 12 Q 41 10.5 38.4 12 Z" fill={r.helmet}/>
          {/* Rear wheel */}
          <g transform="translate(11 29)">
            <circle r="6" fill="none" stroke="#0a0a0a" strokeWidth="1.2"/>
            <g className="cy-wheel">
              <line x1="-5.5" y1="0"    x2="5.5"  y2="0"    stroke="#52525b" strokeWidth="0.35"/>
              <line x1="0"    y1="-5.5" x2="0"    y2="5.5"  stroke="#52525b" strokeWidth="0.35"/>
              <line x1="-3.9" y1="-3.9" x2="3.9"  y2="3.9"  stroke="#52525b" strokeWidth="0.35"/>
              <line x1="-3.9" y1="3.9"  x2="3.9"  y2="-3.9" stroke="#52525b" strokeWidth="0.35"/>
              <circle r="1.1" fill="url(#cyHub)"/>
            </g>
          </g>
          {/* Front wheel */}
          <g transform="translate(46 29)">
            <circle r="6" fill="none" stroke="#0a0a0a" strokeWidth="1.2"/>
            <g className="cy-wheel">
              <line x1="-5.5" y1="0"    x2="5.5"  y2="0"    stroke="#52525b" strokeWidth="0.35"/>
              <line x1="0"    y1="-5.5" x2="0"    y2="5.5"  stroke="#52525b" strokeWidth="0.35"/>
              <line x1="-3.9" y1="-3.9" x2="3.9"  y2="3.9"  stroke="#52525b" strokeWidth="0.35"/>
              <line x1="-3.9" y1="3.9"  x2="3.9"  y2="-3.9" stroke="#52525b" strokeWidth="0.35"/>
              <circle r="1.1" fill="url(#cyHub)"/>
            </g>
          </g>
        </g>
      ))}
      <ellipse cx="110" cy="35" rx="105" ry="0.6" fill="#000" opacity="0.22"/>
    </svg>
  );
}

export function A380() {
  return (
    <svg viewBox="0 0 320 90" fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="a380Body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff"/>
          <stop offset="50%"  stopColor="#f1f5f9"/>
          <stop offset="100%" stopColor="#cbd5e1"/>
        </linearGradient>
        <linearGradient id="a380Wing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#e2e8f0"/>
          <stop offset="100%" stopColor="#94a3b8"/>
        </linearGradient>
        <linearGradient id="a380Eng" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#475569"/>
          <stop offset="50%"  stopColor="#1e293b"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <radialGradient id="a380In" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#0a0a0a"/>
          <stop offset="100%" stopColor="#1e293b"/>
        </radialGradient>
        <radialGradient id="a380Nav" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff"/>
          <stop offset="50%"  stopColor="#fef3c7" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0"/>
        </radialGradient>
        <style>{`
          .a-strobe{animation:astrobe 1.2s ease-in-out infinite}
          @keyframes astrobe{0%,90%,100%{opacity:.1}45%,55%{opacity:1}}
          .a-prop{animation:aprop .18s linear infinite;transform-box:fill-box;transform-origin:center}
          @keyframes aprop{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        `}</style>
      </defs>

      {/* Wings */}
      <path d="M 200 56 L 165 56 L 80 64 L 70 66 L 78 67 L 168 60 L 200 60 Z" fill="url(#a380Wing)"/>
      <path d="M 38 50 L 20 48 L 8 49 L 14 50.5 L 26 51 L 38 52 Z" fill="url(#a380Wing)"/>
      {/* Vertical tail */}
      <path d="M 30 50 L 25 32 L 38 31 L 50 50 Z" fill="url(#a380Body)" stroke="#cbd5e1" strokeWidth="0.4"/>
      <path d="M 28 47 L 27 38 L 36 37.5 L 44 47 Z" fill="#dc2626" opacity="0.92"/>
      <text x="34" y="44" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="6" fill="#fff" textAnchor="middle">★</text>

      {/* Fuselage */}
      <path d="M 60 44 Q 60 38 80 38 L 270 38 Q 295 38 310 50 Q 314 53 310 56 Q 295 58 270 58 L 80 58 Q 60 58 60 52 Z" fill="url(#a380Body)" stroke="#cbd5e1" strokeWidth="0.4"/>
      <path d="M 60 44 Q 50 44 38 49 Q 38 51 38 53 Q 50 56 60 56 Z" fill="url(#a380Body)" stroke="#cbd5e1" strokeWidth="0.4"/>

      {/* Upper deck windows */}
      {Array.from({length: 28}, (_, i) => (
        <rect key={`u${i}`} x={88+i*6.5} y="42.5" width="2.6" height="1.6" rx="0.3" fill="#1a2030" opacity="0.8"/>
      ))}
      {/* Lower deck windows */}
      {Array.from({length: 32}, (_, i) => (
        <rect key={`l${i}`} x={84+i*6} y="50.5" width="2.6" height="1.6" rx="0.3" fill="#1a2030" opacity="0.8"/>
      ))}

      {/* Red stripe */}
      <path d="M 65 47 L 295 47 L 305 50 L 295 50 L 65 50 Z" fill="#dc2626" opacity="0.85"/>

      {/* Cockpit */}
      <path d="M 280 41.5 L 302 47 L 298 49 L 280 45 Z" fill="#1a2030"/>

      {/* Engines */}
      <g transform="translate(150 67)">
        <ellipse cx="0" cy="0" rx="14" ry="5" fill="url(#a380Eng)"/>
        <ellipse cx="-12" cy="0" rx="2.5" ry="4" fill="url(#a380In)"/>
        <g className="a-prop">
          <line x1="-1.5" y1="-3.5" x2="1.5" y2="3.5"  stroke="#52525b" strokeWidth="0.4"/>
          <line x1="-1.5" y1="3.5"  x2="1.5" y2="-3.5" stroke="#52525b" strokeWidth="0.4"/>
          <line x1="-2"   y1="0"    x2="2"   y2="0"     stroke="#52525b" strokeWidth="0.4"/>
          <line x1="0"    y1="-3.5" x2="0"   y2="3.5"   stroke="#52525b" strokeWidth="0.4"/>
        </g>
        <path d="M -8 -5 L -6 -10 L 6 -10 L 8 -5 Z" fill="#cbd5e1"/>
      </g>
      <g transform="translate(105 70)">
        <ellipse cx="0" cy="0" rx="13" ry="4.5" fill="url(#a380Eng)"/>
        <ellipse cx="-11" cy="0" rx="2.2" ry="3.5" fill="url(#a380In)"/>
        <path d="M -7 -4.5 L -5 -9 L 5 -9 L 7 -4.5 Z" fill="#cbd5e1"/>
      </g>

      {/* Nav lights */}
      <circle cx="67"  cy="65" r="1.4" fill="#dc2626" className="a-strobe"/>
      <circle cx="200" cy="59" r="1.2" fill="#16a34a" className="a-strobe"/>
      <circle cx="305" cy="51" r="3"   fill="url(#a380Nav)" opacity="0.8"/>

      <text x="200" y="44.5" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="4" fill="#dc2626" letterSpacing="0.1em">AIR HUNGARY</text>

      <g stroke="#cbd5e1" strokeWidth="0.6" opacity="0.45" strokeLinecap="round">
        <line x1="0" y1="48" x2="30" y2="48"/>
        <line x1="0" y1="52" x2="22" y2="52"/>
      </g>
    </svg>
  );
}

// ─── Vehicle registry ───────────────────────────────────────────────────────

const VEHICLE_REGISTRY: Record<VehicleKey, VehicleConfig> = {
  tram:     { Component: Tram,       width: 360, height: 36, duration: 26, layer: 'ground' },
  trolley:  { Component: Trolleybus, width: 260, height: 36, duration: 22, layer: 'ground' },
  bus:      { Component: Bus,        width: 220, height: 36, duration: 20, layer: 'ground' },
  cyclists: { Component: Cyclists,   width: 180, height: 32, duration: 32, layer: 'ground' },
  a380_to:  { Component: A380,       width: 280, height: 76, duration: 16, layer: 'sky', takeoff: true  },
  a380_ld:  { Component: A380,       width: 280, height: 76, duration: 16, layer: 'sky', takeoff: false },
};

const VEHICLE_KEYS = Object.keys(VEHICLE_REGISTRY) as VehicleKey[];

function pickRandomKind(exclude: VehicleKey | null): VehicleKey {
  const pool = VEHICLE_KEYS.filter(k => k !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Main rotator component ─────────────────────────────────────────────────

export default function HeroVehicle() {
  // Hydration fix (v0.9.33): the initial vehicle must be deterministic —
  // render-time randomness desynced server and client HTML. The first random
  // pick happens after mount instead.
  const [kind, setKind] = useState<VehicleKey>(VEHICLE_KEYS[0]);
  const [seq,  setSeq]  = useState(0);

  useEffect(() => {
    setKind(pickRandomKind(null));
  }, []);

  const cfg = VEHICLE_REGISTRY[kind];

  const onEnd = () => {
    setTimeout(() => {
      setKind(prev => pickRandomKind(prev));
      setSeq(s => s + 1);
    }, 1200 + Math.random() * 1400);
  };

  const isSky    = cfg.layer === 'sky';
  const animName = isSky ? (cfg.takeoff ? 'vh-a380-to' : 'vh-a380-ld') : 'vh-ground';
  const { Component } = cfg;

  return (
    <Fragment>
      <div
        key={seq}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          width:             cfg.width,
          height:            cfg.height,
          left:              0,
          ...(isSky ? { top: 4 } : { bottom: 4 }),
          animation:         `${animName} ${cfg.duration}s linear forwards`,
          willChange:        'transform',
        }}
        onAnimationEnd={onEnd}
      >
        <Component />
      </div>
      <style>{`
        @keyframes vh-ground {
          0%   { transform: translateX(-440px); }
          100% { transform: translateX(calc(100vw + 80px)); }
        }
        @keyframes vh-a380-to {
          0%   { transform: translate(-300px,70px) rotate(-7deg); }
          60%  { transform: translate(60vw,-10px) rotate(-9deg); }
          100% { transform: translate(calc(100vw + 100px),-50px) rotate(-9deg); }
        }
        @keyframes vh-a380-ld {
          0%   { transform: translate(-300px,-50px) rotate(7deg); }
          60%  { transform: translate(60vw,30px) rotate(9deg); }
          100% { transform: translate(calc(100vw + 100px),80px) rotate(9deg); }
        }
      `}</style>
    </Fragment>
  );
}
