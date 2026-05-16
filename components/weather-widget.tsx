'use client';

import { useEffect, useState } from 'react';
import type { WeatherResult } from '@/app/api/weather/route';

// Map AccuWeather icon codes → internal weather type
function getWeatherType(icon: number, isDay: boolean): WeatherType {
  if (icon >= 1 && icon <= 5) return isDay ? 'sunny' : 'clear_night';
  if (icon >= 6 && icon <= 8) return 'partly_cloudy';
  if (icon >= 11 && icon <= 11) return 'fog';
  if (icon >= 12 && icon <= 14) return 'rain';
  if (icon >= 15 && icon <= 17) return 'storm';
  if (icon >= 18 && icon <= 21) return 'rain';
  if (icon >= 22 && icon <= 29) return 'snow';
  if (icon >= 33 && icon <= 37) return 'partly_cloudy'; // night partly cloudy
  if (icon >= 38 && icon <= 40) return 'cloudy';
  if (icon >= 41 && icon <= 42) return 'rain';
  if (icon >= 43 && icon <= 44) return 'snow';
  return 'cloudy';
}

type WeatherType = 'sunny' | 'clear_night' | 'partly_cloudy' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

const WEEKDAYS = ['V', 'H', 'K', 'Sz', 'Cs', 'P', 'Szo'];

function getDayLabel(isoDate: string) {
  return WEEKDAYS[new Date(isoDate).getDay()];
}

// ─── Animated SVG Icons ────────────────────────────────────────────────────────

function SunnyIcon({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-glow { 0%,100% { opacity:0.6; r:28; } 50% { opacity:1; r:30; } }
        .sun-spin { transform-origin: 36px 36px; animation: spin-slow 12s linear infinite; }
        .sun-glow { transform-origin: 36px 36px; animation: spin-slow 20s linear infinite reverse; }
      `}</style>
      {/* Outer glow ring */}
      <circle className="sun-glow" cx="36" cy="36" r="30" fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
      {/* Rays */}
      <g className="sun-spin">
        {[0,45,90,135,180,225,270,315].map((deg) => (
          <line key={deg}
            x1="36" y1="6" x2="36" y2="13"
            stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round"
            transform={`rotate(${deg} 36 36)`}
          />
        ))}
      </g>
      {/* Core */}
      <circle cx="36" cy="36" r="15" fill="#fbbf24" />
      <circle cx="36" cy="36" r="12" fill="#fde68a" />
    </svg>
  );
}

function PartlyCloudyIcon({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <style>{`
        @keyframes sun-peek { 0%,100%{transform:translate(-2px,2px)} 50%{transform:translate(2px,-1px)} }
        @keyframes cloud-drift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }
        .peek { animation: sun-peek 4s ease-in-out infinite; transform-origin:24px 24px; }
        .drift { animation: cloud-drift 5s ease-in-out infinite; }
      `}</style>
      {/* Sun behind */}
      <g className="peek">
        <circle cx="24" cy="26" r="12" fill="#fbbf24" opacity="0.9" />
        {[0,60,120,180,240,300].map((deg) => (
          <line key={deg} x1="24" y1="10" x2="24" y2="15" stroke="#fde68a" strokeWidth="2" strokeLinecap="round"
            transform={`rotate(${deg} 24 26)`} />
        ))}
      </g>
      {/* Cloud */}
      <g className="drift">
        <ellipse cx="42" cy="44" rx="18" ry="11" fill="#e2e8f0" />
        <ellipse cx="32" cy="48" rx="14" ry="9" fill="#f1f5f9" />
        <circle cx="30" cy="43" r="10" fill="#e2e8f0" />
        <circle cx="42" cy="40" r="12" fill="#e2e8f0" />
        <circle cx="50" cy="44" r="9" fill="#cbd5e1" />
      </g>
    </svg>
  );
}

function CloudyIcon({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <style>{`
        @keyframes cloud1 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }
        @keyframes cloud2 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-3px)} }
        .c1{animation:cloud1 6s ease-in-out infinite;}
        .c2{animation:cloud2 8s ease-in-out infinite;}
      `}</style>
      <g className="c2" opacity="0.5">
        <ellipse cx="36" cy="28" rx="20" ry="10" fill="#94a3b8" />
        <circle cx="24" cy="27" r="10" fill="#94a3b8" />
        <circle cx="42" cy="24" r="13" fill="#94a3b8" />
      </g>
      <g className="c1">
        <ellipse cx="38" cy="44" rx="22" ry="12" fill="#cbd5e1" />
        <ellipse cx="26" cy="48" rx="15" ry="10" fill="#e2e8f0" />
        <circle cx="24" cy="41" r="12" fill="#cbd5e1" />
        <circle cx="40" cy="38" r="14" fill="#cbd5e1" />
        <circle cx="53" cy="44" r="11" fill="#b0bec5" />
      </g>
    </svg>
  );
}

function RainIcon({ size = 72 }: { size?: number }) {
  const drops = [
    { x: 24, delay: '0s', dur: '1.1s' },
    { x: 32, delay: '0.3s', dur: '0.9s' },
    { x: 40, delay: '0.6s', dur: '1.2s' },
    { x: 48, delay: '0.15s', dur: '1s' },
    { x: 29, delay: '0.8s', dur: '0.95s' },
    { x: 44, delay: '0.45s', dur: '1.15s' },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <style>{`
        @keyframes raindrop { 0%{transform:translateY(-8px);opacity:0} 20%{opacity:1} 80%{opacity:0.8} 100%{transform:translateY(22px);opacity:0} }
        .drop { animation: raindrop linear infinite; }
      `}</style>
      {/* Cloud */}
      <ellipse cx="38" cy="30" rx="20" ry="11" fill="#64748b" />
      <circle cx="26" cy="29" r="11" fill="#64748b" />
      <circle cx="40" cy="24" r="13" fill="#64748b" />
      <circle cx="51" cy="30" r="10" fill="#475569" />
      {/* Drops */}
      {drops.map((d, i) => (
        <rect key={i} x={d.x} y="42" width="2" height="8" rx="1" fill="#7dd3fc" className="drop"
          style={{ animationDelay: d.delay, animationDuration: d.dur }} />
      ))}
    </svg>
  );
}

function StormIcon({ size = 72 }: { size?: number }) {
  const drops = [
    { x: 20, delay: '0s', dur: '0.8s' },
    { x: 28, delay: '0.25s', dur: '0.9s' },
    { x: 44, delay: '0.1s', dur: '0.85s' },
    { x: 52, delay: '0.4s', dur: '0.75s' },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <style>{`
        @keyframes stormrain { 0%{transform:translate(0,-6px);opacity:0} 20%{opacity:1} 100%{transform:translate(-4px,20px);opacity:0} }
        @keyframes lightning { 0%,90%,100%{opacity:0} 92%,95%{opacity:1} 97%{opacity:0.3} }
        .srain { animation: stormrain linear infinite; }
        .bolt { animation: lightning 2.5s ease-in-out infinite; }
      `}</style>
      {/* Dark storm cloud */}
      <ellipse cx="38" cy="26" rx="22" ry="12" fill="#334155" />
      <circle cx="24" cy="25" r="12" fill="#334155" />
      <circle cx="40" cy="20" r="14" fill="#1e293b" />
      <circle cx="53" cy="26" r="11" fill="#334155" />
      {/* Lightning bolt */}
      <polyline className="bolt" points="38,36 32,48 38,48 30,62" stroke="#fef08a" strokeWidth="3" strokeLinejoin="round" fill="none" />
      <polyline className="bolt" points="38,36 32,48 38,48 30,62" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity="0.6" />
      {/* Rain */}
      {drops.map((d, i) => (
        <rect key={i} x={d.x} y="38" width="2" height="9" rx="1" fill="#7dd3fc" opacity="0.7" className="srain"
          style={{ animationDelay: d.delay, animationDuration: d.dur }} />
      ))}
    </svg>
  );
}

function SnowIcon({ size = 72 }: { size?: number }) {
  const flakes = [
    { x: 22, delay: '0s', dur: '2.2s' },
    { x: 32, delay: '0.6s', dur: '2.8s' },
    { x: 42, delay: '1.1s', dur: '2.5s' },
    { x: 52, delay: '0.3s', dur: '3s' },
    { x: 27, delay: '1.5s', dur: '2.4s' },
    { x: 47, delay: '0.9s', dur: '2.7s' },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <style>{`
        @keyframes snowfall { 0%{transform:translateY(-6px) rotate(0deg);opacity:0} 15%{opacity:1} 85%{opacity:0.7} 100%{transform:translateY(22px) rotate(180deg);opacity:0} }
        .flake { animation: snowfall linear infinite; }
      `}</style>
      <ellipse cx="38" cy="28" rx="20" ry="11" fill="#94a3b8" />
      <circle cx="26" cy="27" r="11" fill="#94a3b8" />
      <circle cx="40" cy="22" r="13" fill="#94a3b8" />
      <circle cx="51" cy="28" r="10" fill="#78909c" />
      {flakes.map((f, i) => (
        <text key={i} x={f.x} y="42" fontSize="10" fill="#bae6fd" className="flake"
          style={{ animationDelay: f.delay, animationDuration: f.dur }}>❄</text>
      ))}
    </svg>
  );
}

function FogIcon({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <style>{`
        @keyframes fog1 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(6px)} }
        @keyframes fog2 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-5px)} }
        @keyframes fog3 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }
        .f1{animation:fog1 4s ease-in-out infinite;}
        .f2{animation:fog2 5s ease-in-out infinite;}
        .f3{animation:fog3 3.5s ease-in-out infinite;}
      `}</style>
      <rect className="f1" x="10" y="26" width="52" height="5" rx="2.5" fill="#94a3b8" opacity="0.6" />
      <rect className="f2" x="14" y="36" width="44" height="5" rx="2.5" fill="#94a3b8" opacity="0.5" />
      <rect className="f3" x="8" y="46" width="56" height="5" rx="2.5" fill="#94a3b8" opacity="0.4" />
      <rect className="f1" x="16" y="56" width="40" height="4" rx="2" fill="#94a3b8" opacity="0.3" />
    </svg>
  );
}

function ClearNightIcon({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <style>{`
        @keyframes star-twinkle { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        .star{animation:star-twinkle ease-in-out infinite;}
      `}</style>
      {/* Moon */}
      <path d="M44 16 A22 22 0 1 0 44 56 A16 16 0 1 1 44 16Z" fill="#e2e8f0" />
      {/* Stars */}
      {[{x:14,y:14,d:'0s'},{x:58,y:20,d:'0.8s'},{x:62,y:42,d:'1.4s'},{x:10,y:50,d:'0.3s'},{x:52,y:58,d:'1.1s'}].map((s,i) => (
        <circle key={i} className="star" cx={s.x} cy={s.y} r="2" fill="#e2e8f0"
          style={{ animationDelay: s.d, animationDuration: '2s' }} />
      ))}
    </svg>
  );
}

function WeatherIcon({ type, size = 72 }: { type: WeatherType; size?: number }) {
  switch (type) {
    case 'sunny': return <SunnyIcon size={size} />;
    case 'clear_night': return <ClearNightIcon size={size} />;
    case 'partly_cloudy': return <PartlyCloudyIcon size={size} />;
    case 'cloudy': return <CloudyIcon size={size} />;
    case 'rain': return <RainIcon size={size} />;
    case 'storm': return <StormIcon size={size} />;
    case 'snow': return <SnowIcon size={size} />;
    case 'fog': return <FogIcon size={size} />;
  }
}

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
        <div className="h-16 w-16 rounded-full bg-white/10" />
        <div className="h-4 w-20 rounded bg-white/10" />
        <div className="h-3 w-32 rounded bg-white/10" />
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-slate-600">Időjárás nem elérhető</p>
      </div>
    );
  }

  const type = getWeatherType(weather.icon, weather.isDay);

  return (
    <div className="flex h-full flex-col">
      {/* Location */}
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {weather.locationName}
      </p>

      {/* Main weather */}
      <div className="flex flex-1 items-center gap-3">
        <WeatherIcon type={type} size={80} />
        <div>
          <p className="text-4xl font-black tabular-nums leading-none text-white">
            {weather.temp}°
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{weather.conditionText}</p>
          <p className="mt-0.5 text-[10px] text-slate-600">
            Érzőhő: {weather.feelsLike}° · Szél: {weather.wind} km/h · Párat: {weather.humidity}%
          </p>
        </div>
      </div>

      {/* 4-day forecast */}
      {weather.forecast.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-1 border-t border-white/10 pt-2">
          {weather.forecast.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-0.5">
              <p className="text-[10px] font-bold text-slate-500">{getDayLabel(day.date)}</p>
              <SmallWeatherIcon icon={day.icon} isDay />
              <p className="text-[10px] tabular-nums text-slate-400">{day.maxTemp}°</p>
              <p className="text-[9px] tabular-nums text-slate-600">{day.minTemp}°</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
