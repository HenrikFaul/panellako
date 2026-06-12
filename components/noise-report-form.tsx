'use client';

import { useState } from 'react';

const CATEGORIES = [
  { value: 'forgalmi_zaj', label: 'Forgalmi zaj' },
  { value: 'epitkezesi_zaj', label: 'Építkezési zaj' },
  { value: 'szrakozohely_zaj', label: 'Szórakozóhely zaj' },
  { value: 'repulo_vonat', label: 'Repülő / vonat' },
  { value: 'ipari_zaj', label: 'Ipari zaj' },
  { value: 'egyeb', label: 'Egyéb' },
] as const;

const PERIODS = [
  { value: 'ejszaka', label: 'Éjszaka (22–06)' },
  { value: 'reggel', label: 'Reggel (06–10)' },
  { value: 'nappal', label: 'Nappal (10–18)' },
  { value: 'este', label: 'Este (18–22)' },
] as const;

interface Props {
  workspaceId: string;
}

export default function NoiseReportForm({ workspaceId }: Props) {
  const [category, setCategory] = useState<string>('forgalmi_zaj');
  const [severity, setSeverity] = useState<number>(3);
  const [period, setPeriod] = useState<string>('nappal');
  const [duration, setDuration] = useState<number>(30);
  const [estimatedDb, setEstimatedDb] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringPattern, setRecurringPattern] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const payload: Record<string, unknown> = {
        workspace_id: workspaceId,
        category,
        severity,
        period,
        duration_minutes: duration,
        description: description || null,
        is_recurring: isRecurring,
        recurring_pattern: isRecurring && recurringPattern ? recurringPattern : null,
      };

      if (estimatedDb !== '') {
        const db = parseInt(estimatedDb, 10);
        if (!isNaN(db)) payload.estimated_db = db;
      }

      const res = await fetch('/api/noise/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ismeretlen hiba');
      }

      setStatus('success');
      // Reset form
      setCategory('forgalmi_zaj');
      setSeverity(3);
      setPeriod('nappal');
      setDuration(30);
      setEstimatedDb('');
      setDescription('');
      setIsRecurring(false);
      setRecurringPattern('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Ismeretlen hiba történt');
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-1 text-lg font-semibold text-white">Zajbejelentés</h2>
      <p className="mb-5 text-sm text-white/50">
        Rögzítse az észlelt zajszennyezést — adatai segítik a közösség érdekérvényesítését.
      </p>

      {status === 'success' && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Bejelentés elmentve! Köszönjük.
        </div>
      )}
      {status === 'error' && (
        <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          Hiba: {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
            Zajforrás kategóriája
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:border-amber-400/50 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
            Súlyosság
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setSeverity(star)}
                className={`flex-1 rounded-xl border py-2 text-sm font-bold transition-colors ${
                  severity >= star
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-white/30 hover:border-white/20'
                }`}
              >
                {star}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-white/30">
            <span>Alig hallható</span>
            <span>Elviselhetetlen</span>
          </div>
        </div>

        {/* Period */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
            Napszak
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                  period === p.value
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration slider */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
            Időtartam: <span className="text-white">{duration} perc</span>
          </label>
          <input
            type="range"
            min={1}
            max={480}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full accent-amber-400"
          />
          <div className="mt-1 flex justify-between text-xs text-white/30">
            <span>1 perc</span>
            <span>8 óra</span>
          </div>
        </div>

        {/* Estimated dB */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
            Becsült hangerő (dB) — nem kötelező
          </label>
          <input
            type="number"
            min={30}
            max={120}
            placeholder="pl. 65"
            value={estimatedDb}
            onChange={(e) => setEstimatedDb(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
            Leírás (max. 500 karakter)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Mit tapasztalt? Hol és mikor?"
            className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none resize-none"
          />
          <p className="mt-1 text-right text-xs text-white/30">{description.length}/500</p>
        </div>

        {/* Recurring */}
        <div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            <span className="text-sm text-white/70">Rendszeresen ismétlődő zaj</span>
          </label>
          {isRecurring && (
            <input
              type="text"
              placeholder="pl. minden reggel 6–8 között"
              value={recurringPattern}
              onChange={(e) => setRecurringPattern(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-[0.625rem] bg-brand-500 px-4 py-3 text-sm font-semibold text-ink-base transition-colors hover:bg-brand-400 disabled:opacity-50"
        >
          {status === 'loading' ? 'Mentés...' : 'Zajbejelentés elküldése'}
        </button>
      </form>
    </div>
  );
}
