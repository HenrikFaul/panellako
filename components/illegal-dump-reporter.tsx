'use client';

import { useState } from 'react';

const CATEGORIES = [
  { value: 'butor', label: 'Bútor / lakberendezés' },
  { value: 'epitesi', label: 'Építési törmelék' },
  { value: 'kommunalis', label: 'Kommunális hulladék' },
  { value: 'veszelyes', label: 'Veszélyes anyag' },
  { value: 'egyeb', label: 'Egyéb' },
] as const;

interface Props {
  workspaceId: string;
}

export default function IllegalDumpReporter({ workspaceId }: Props) {
  const [category, setCategory] = useState<string>('butor');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setGpsStatus('ok');
      },
      () => setGpsStatus('error')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/waste/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'illegal_dump',
          workspace_id: workspaceId,
          category,
          description: description || null,
          lat,
          lon,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ismeretlen hiba');
      }

      setStatus('success');
      setDescription('');
      setLat(null);
      setLon(null);
      setGpsStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Ismeretlen hiba');
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-1 text-lg font-black text-white">Szabálytalan lerakás bejelentése</h2>
      <p className="mb-5 text-sm text-white/50">
        Jelezze az engedély nélkül lerakott hulladékot az épület közelében.
      </p>

      {status === 'success' && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Bejelentés elküldve! Köszönjük.
        </div>
      )}
      {status === 'error' && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Hiba: {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
            Hulladék típusa
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
            Leírás
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Hol és mit talált? Mikor vette észre?"
            className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-emerald-400/50 focus:outline-none resize-none"
          />
        </div>

        {/* GPS location */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
            Helyszín
          </label>
          <button
            type="button"
            onClick={handleGps}
            disabled={gpsStatus === 'loading'}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {gpsStatus === 'loading' ? 'GPS lekérdezés...' : 'GPS-koordináta automatikus kitöltése'}
          </button>
          {gpsStatus === 'ok' && lat !== null && lon !== null && (
            <p className="mt-1.5 text-xs text-emerald-300">
              ✓ {lat.toFixed(5)}, {lon.toFixed(5)}
            </p>
          )}
          {gpsStatus === 'error' && (
            <p className="mt-1.5 text-xs text-red-300">
              Helyszín-hozzáférés megtagadva — kézzel is beküldhet.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-400 disabled:opacity-50"
        >
          {status === 'loading' ? 'Küldés...' : 'Bejelentés elküldése'}
        </button>
      </form>
    </div>
  );
}
