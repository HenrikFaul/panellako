'use client';

import { useState, useEffect } from 'react';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  impact: string;
  link?: string;
}

const ACTIONS: ActionItem[] = [
  {
    id: 'tetokert',
    title: 'Tetőkertesítés',
    description: 'Zöldtető kialakítása csökkenti az épület hőterhelését és a csapadékvíz-lefolyást.',
    impact: '−0,8°C hatás',
  },
  {
    id: 'homlokzat',
    title: 'Homlokzatzöldítés',
    description: 'Futónövényekkel borított fal akadályozza a sugárzás elnyelését, javítja a mikroklímát.',
    impact: '−0,5°C hatás',
  },
  {
    id: 'arnyekolo',
    title: 'Árnyékoló berendezések',
    description: 'Redőny, napvitorla, pergola telepítése 30–50%-kal csökkenti a bejövő hőterhelést.',
    impact: 'Könnyebb hőterhelés',
  },
  {
    id: 'szellozes',
    title: 'Természetes szellőzés éjszaka',
    description: 'Nyitott ablakok éjszakai szellőztetéssel a lakás lehűtése 23–5 óra között a leghatékonyabb.',
    impact: '2–4°C beltéri hűtés',
  },
  {
    id: 'festek',
    title: 'Fehér / visszaverő festék a tetőre',
    description: 'Magas albedójú tetőfesték (cool roof) visszaveri a napsugárzás akár 85%-át.',
    impact: '−1,5°C hatás',
  },
  {
    id: 'udvar',
    title: 'Udvari zöldítés, növények',
    description: 'Belső udvaron, erkélyen és közös területeken ültetett növények párolgással hűtenek.',
    impact: 'Mikroklimatikus javulás',
  },
  {
    id: 'vizpermet',
    title: 'Vízpermet',
    description: 'Párásítók és vízpermet-rendszerek azonnali hűtőhatást nyújtanak extrém hőségben.',
    impact: '2–4°C azonnali hűtés',
  },
  {
    id: 'palyazat',
    title: 'EU pályázatok (KEHOP, KMÜ)',
    description: 'Uniós támogatások zöldítési és energiahatékonysági fejlesztésekre társasházi lakóépületeknek.',
    impact: 'Finanszírozás',
    link: 'https://www.palyazat.gov.hu',
  },
];

const STORAGE_KEY = 'panellako_klima_actions';

function loadChecked(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveChecked(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export default function ClimateActionPlan() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setChecked(loadChecked());
    setMounted(true);
  }, []);

  function toggle(id: string) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      saveChecked(next);
      return next;
    });
  }

  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="rounded-2xl bg-slate-900 border border-white/10 p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold text-base">Klíma-cselekvési terv</h3>
          <p className="text-slate-400 text-sm mt-0.5">
            Helyi intézkedések a hősziget-hatás csökkentéséhez
          </p>
        </div>
        {mounted && (
          <span className="flex-shrink-0 text-sm font-bold text-emerald-400">
            {doneCount}/{ACTIONS.length}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {mounted && (
        <div className="mb-5">
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(doneCount / ACTIONS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {ACTIONS.map((action) => {
          const isChecked = mounted && !!checked[action.id];
          return (
            <li
              key={action.id}
              className={`rounded-xl border p-4 transition-colors cursor-pointer select-none ${
                isChecked
                  ? 'bg-emerald-950/30 border-emerald-800/40'
                  : 'bg-slate-800/40 border-white/5 hover:border-white/10'
              }`}
              onClick={() => toggle(action.id)}
              role="checkbox"
              aria-checked={isChecked}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(action.id); } }}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                }`}>
                  {isChecked && (
                    <svg viewBox="0 0 10 8" className="w-3 h-2.5" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${isChecked ? 'text-slate-400 line-through' : 'text-white'}`}>
                      {action.title}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isChecked
                        ? 'bg-slate-700/50 text-slate-500'
                        : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'
                    }`}>
                      {action.impact}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${isChecked ? 'text-slate-600' : 'text-slate-400'}`}>
                    {action.description}
                  </p>
                  {action.link && !isChecked && (
                    <a
                      href={action.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1.5 text-xs text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Pályázatok megtekintése →
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-slate-600">
        A kipipált elemek böngészőben tárolódnak · Kattintásra be/kikapcsolható
      </p>
    </div>
  );
}
