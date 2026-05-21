'use client';

import { useState, useMemo } from 'react';
import { calcWasteCO2Savings, WASTE_CO2_FACTORS } from '@/lib/waste-co2-factors';

const CATEGORIES = [
  { key: 'paper_kg', factorKey: 'paper', label: 'Papír', color: '#3b82f6', colorClass: 'bg-blue-500' },
  { key: 'plastic_kg', factorKey: 'plastic', label: 'Műanyag', color: '#f59e0b', colorClass: 'bg-amber-500' },
  { key: 'glass_kg', factorKey: 'glass', label: 'Üveg', color: '#10b981', colorClass: 'bg-emerald-500' },
  { key: 'organic_kg', factorKey: 'organic', label: 'Bio', color: '#84cc16', colorClass: 'bg-lime-500' },
  { key: 'electronic_kg', factorKey: 'electronic', label: 'Elektronika', color: '#8b5cf6', colorClass: 'bg-violet-500' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];
type FactorKey = typeof CATEGORIES[number]['factorKey'];

interface WasteValues {
  paper_kg: number;
  plastic_kg: number;
  glass_kg: number;
  organic_kg: number;
  electronic_kg: number;
}

function getThisMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

interface Props {
  workspaceId: string;
}

export default function WasteTrackerPanel({ workspaceId }: Props) {
  const [values, setValues] = useState<WasteValues>({
    paper_kg: 0,
    plastic_kg: 0,
    glass_kg: 0,
    organic_kg: 0,
    electronic_kg: 0,
  });
  const [households, setHouseholds] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const co2Savings = useMemo(() => calcWasteCO2Savings(values), [values]);
  const totalKg = useMemo(
    () => Object.values(values).reduce((s, v) => s + v, 0),
    [values]
  );

  const handleValueChange = (key: CategoryKey, val: string) => {
    const num = parseFloat(val);
    setValues((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : Math.max(0, num) }));
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
          workspace_id: workspaceId,
          month: getThisMonthStart(),
          households_participating: households || null,
          ...values,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Ismeretlen hiba');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Ismeretlen hiba');
    }
  };

  // Simple bar chart using divs
  const maxKg = Math.max(...CATEGORIES.map((c) => values[c.key]), 1);

  return (
    <div className="space-y-4">
      {/* CO2 savings hero */}
      {totalKg > 0 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-sm text-emerald-300/60">Becsült CO₂-megtakarítás</p>
          <p className="text-3xl font-black text-emerald-300">{co2Savings.toFixed(1)} kg CO₂</p>
          <p className="mt-1 text-xs text-emerald-300/50">
            {totalKg.toFixed(1)} kg szelektív hulladék alapján (EEA tényezők)
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-1 text-lg font-black text-white">Havi hulladékjelentés</h2>
        <p className="mb-5 text-sm text-white/50">
          Rögzítse az épület aktuális havi szelektív hulladékmennyiségét.
        </p>

        {status === 'success' && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            Hulladékjelentés mentve!
          </div>
        )}
        {status === 'error' && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Hiba: {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {CATEGORIES.map((cat) => {
            const factor = WASTE_CO2_FACTORS[cat.factorKey as FactorKey];
            const savings = ((values[cat.key] || 0) * factor).toFixed(2);
            return (
              <div key={cat.key}>
                <label className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/60">
                  <span style={{ color: cat.color }}>{cat.label}</span>
                  <span className="text-white/40">
                    CO₂: {savings} kg megtakarítás
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={values[cat.key] || ''}
                    onChange={(e) => handleValueChange(cat.key, e.target.value)}
                    placeholder="0"
                    className="w-24 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none"
                  />
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={0.5}
                    value={values[cat.key]}
                    onChange={(e) => handleValueChange(cat.key, e.target.value)}
                    className="flex-1"
                    style={{ accentColor: cat.color }}
                  />
                  <span className="w-16 text-right text-sm text-white/60">
                    {values[cat.key].toFixed(1)} kg
                  </span>
                </div>
              </div>
            );
          })}

          {/* Households */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
              Részt vevő háztartások száma
            </label>
            <input
              type="number"
              min={0}
              value={households || ''}
              onChange={(e) => setHouseholds(parseInt(e.target.value) || 0)}
              placeholder="pl. 24"
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
              Megjegyzés
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Havi megjegyzés, különleges hulladék..."
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading' || totalKg === 0}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            {status === 'loading' ? 'Mentés...' : 'Hulladékjelentés mentése'}
          </button>
        </form>
      </div>

      {/* Bar chart using CSS widths */}
      {totalKg > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-sm font-bold text-white/60 uppercase tracking-wider">
            Hulladék összetétele
          </h3>
          <div className="space-y-3">
            {CATEGORIES.filter((c) => values[c.key] > 0).map((cat) => {
              const pct = Math.round((values[cat.key] / maxKg) * 100);
              const sharePct = totalKg > 0 ? ((values[cat.key] / totalKg) * 100).toFixed(1) : '0';
              return (
                <div key={cat.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${cat.colorClass}`} />
                      <span className="text-xs text-white/70">{cat.label}</span>
                    </div>
                    <span className="text-xs text-white/50">
                      {values[cat.key].toFixed(1)} kg ({sharePct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${cat.colorClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
