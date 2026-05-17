'use client';

import { FormEvent, useState } from 'react';
import { Droplets, Flame, Zap, Leaf, ChevronDown, ChevronUp } from 'lucide-react';
import type { MeterType } from '@/app/actions/meter-readings';
import type { MeterReading } from '@/lib/types';

// ─── CO₂ emission factors (kg CO₂ per unit) ─────────────────────────────────
// Water: per m³ (water + wastewater treatment)
// Gas:   per m³ (natural gas combustion)
// Electricity: per kWh (Hungarian grid average 2024)
const CO2_FACTORS: Record<MeterType, number> = {
  viz:     0.344,   // kg CO₂ / m³
  gaz:     2.04,    // kg CO₂ / m³ (natural gas ≈ 10.55 kWh/m³ × 0.193)
  villany: 0.264,   // kg CO₂ / kWh
};

const METER_CONFIG: Record<MeterType, {
  label: string;
  unit: string;
  icon: typeof Droplets;
  color: string;
  glow: string;
  bgLight: string;
  description: string;
}> = {
  viz:     { label: 'Víz',        unit: 'm³',  icon: Droplets, color: '#38bdf8', glow: 'shadow-sky-400/30',    bgLight: 'bg-sky-50',      description: 'Hidegvíz-fogyasztás' },
  gaz:     { label: 'Gáz',        unit: 'm³',  icon: Flame,    color: '#fb923c', glow: 'shadow-orange-400/30', bgLight: 'bg-orange-50',   description: 'Fűtési fogyasztás'   },
  villany: { label: 'Villany',    unit: 'kWh', icon: Zap,      color: '#facc15', glow: 'shadow-yellow-400/30', bgLight: 'bg-yellow-50',   description: 'Elektromos fogyasztás' },
};

// ─── SVG donut gauge ─────────────────────────────────────────────────────────
function DonutGauge({ value, max, color }: { value: number; max: number; color: string }) {
  const r = 26; const cx = 32; const cy = 32;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(Math.max(value / max, 0), 1);
  const dash = circ * frac;
  const gap  = circ * (1 - frac);

  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="currentColor" strokeWidth="5" className="text-slate-200"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        strokeLinecap="round" transform="rotate(135 32 32)"
      />
      {/* Fill */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="5.5" strokeLinecap="round"
        strokeDasharray={`${dash * 0.75} ${gap * 0.75 + circ * 0.25}`}
        transform="rotate(135 32 32)"
        style={{ filter: `drop-shadow(0 0 4px ${color}90)`, transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  );
}

// ─── Single meter type card ───────────────────────────────────────────────────
function MeterCard({ type, readings }: { type: MeterType; readings: MeterReading[] }) {
  const cfg = METER_CONFIG[type];
  const Icon = cfg.icon;

  const sorted = [...readings].sort((a, b) => b.reading_date.localeCompare(a.reading_date));
  const latest = sorted[0];
  const prev   = sorted[1];

  const delta = latest && prev ? Math.abs(latest.value - prev.value) : null;
  const deltaUp = latest && prev ? latest.value > prev.value : null;
  const co2 = delta !== null ? delta * CO2_FACTORS[type] : null;

  // Scale max for gauge: rough estimate based on type
  const gaugeMax: Record<MeterType, number> = { viz: 300, gaz: 200, villany: 5000 };

  if (!latest) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 p-4 text-center">
        <Icon size={20} className="mb-1 text-slate-300" />
        <p className="text-xs font-bold text-slate-400">{cfg.label}</p>
        <p className="mt-1 text-[11px] text-slate-300">Nincs adat</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md overflow-hidden">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={14} style={{ color: cfg.color }} />
          <span className="text-xs font-black text-slate-700">{cfg.label}</span>
        </div>
        {delta !== null && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${deltaUp ? 'text-rose-500' : 'text-emerald-500'}`}>
            {deltaUp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {delta.toFixed(1)} {cfg.unit}
          </span>
        )}
      </div>

      {/* Gauge + value */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <DonutGauge value={latest.value} max={gaugeMax[type]} color={cfg.color} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-black tabular-nums text-slate-800 leading-none">
              {latest.value.toLocaleString('hu-HU', { maximumFractionDigits: 1 })}
            </span>
            <span className="text-[8px] text-slate-400">{cfg.unit}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-500">{cfg.description}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {latest.unit_label && <span className="font-bold text-slate-600">{latest.unit_label} · </span>}
            {new Date(latest.reading_date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
          </p>

          {/* CO₂ badge */}
          {co2 !== null && co2 > 0 && (
            <div className="mt-1.5 flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 w-fit">
              <Leaf size={8} className="text-emerald-500" />
              <span className="text-[9px] font-bold text-emerald-600">
                {co2 < 1 ? `${(co2 * 1000).toFixed(0)} g` : `${co2.toFixed(1)} kg`} CO₂
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CO₂ summary strip ────────────────────────────────────────────────────────
function CO2Strip({ readings }: { readings: MeterReading[] }) {
  let totalCo2 = 0;
  let hasData = false;

  for (const type of ['viz', 'gaz', 'villany'] as MeterType[]) {
    const sorted = [...readings.filter(r => r.meter_type === type)]
      .sort((a, b) => b.reading_date.localeCompare(a.reading_date));
    if (sorted.length >= 2) {
      const delta = Math.abs(sorted[0].value - sorted[1].value);
      totalCo2 += delta * CO2_FACTORS[type];
      hasData = true;
    }
  }

  if (!hasData || totalCo2 === 0) return null;

  // Hungarian average apartment: ~1200 kg CO₂/year ≈ 100 kg/month
  const avgMonthly = 100;
  const vsAvg = totalCo2 - avgMonthly;
  const better = vsAvg < 0;

  return (
    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2">
      <Leaf size={14} className="shrink-0 text-emerald-500" />
      <div className="min-w-0">
        <p className="text-[11px] font-black text-emerald-700">
          ~{totalCo2.toFixed(1)} kg CO₂ ez az időszak
        </p>
        {Math.abs(vsAvg) > 1 && (
          <p className="text-[10px] text-emerald-600">
            {better
              ? `${Math.abs(vsAvg).toFixed(0)} kg-mal kevesebb a bp-i átlagnál 🌿`
              : `${vsAvg.toFixed(0)} kg-mal több a bp-i átlagnál`}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Reading history list ─────────────────────────────────────────────────────
function ReadingHistory({ readings }: { readings: MeterReading[] }) {
  const [open, setOpen] = useState(false);
  if (readings.length === 0) return null;

  const recent = [...readings]
    .sort((a, b) => b.reading_date.localeCompare(a.reading_date))
    .slice(0, open ? 12 : 4);

  return (
    <div className="mt-3">
      <ul className="space-y-1.5">
        {recent.map(r => {
          const cfg = METER_CONFIG[r.meter_type];
          const Icon = cfg.icon;
          return (
            <li key={r.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
              <Icon size={12} style={{ color: cfg.color }} className="shrink-0" />
              <span className="flex-1 text-xs font-semibold text-slate-700 truncate">
                {r.unit_label || '—'}
              </span>
              <span className="text-xs tabular-nums text-slate-600">
                {r.value.toLocaleString('hu-HU', { maximumFractionDigits: 1 })} {cfg.unit}
              </span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {new Date(r.reading_date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
              </span>
            </li>
          );
        })}
      </ul>
      {readings.length > 4 && (
        <button
          onClick={() => setOpen(v => !v)}
          className="mt-2 w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
        >
          {open ? 'Kevesebb' : `+${readings.length - 4} korábbi`}
        </button>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface EnergyDashboardProps {
  readings: MeterReading[];
  onSubmit: (type: MeterType, value: number, date: string) => Promise<void>;
  saved?: boolean;
}

export default function EnergyDashboard({ readings, onSubmit, saved }: EnergyDashboardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);

  const vizReadings     = readings.filter(r => r.meter_type === 'viz');
  const gazReadings     = readings.filter(r => r.meter_type === 'gaz');
  const villanyReadings = readings.filter(r => r.meter_type === 'villany');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const type  = (form.elements.namedItem('meter_type') as HTMLSelectElement).value as MeterType;
    const value = parseFloat((form.elements.namedItem('meter_value') as HTMLInputElement).value);
    const date  = (form.elements.namedItem('reading_date') as HTMLInputElement).value;
    setSubmitting(true);
    await onSubmit(type, value, date);
    setSubmitting(false);
    setLocalSaved(true);
    form.reset();
    setTimeout(() => setLocalSaved(false), 3000);
  }

  return (
    <div className="space-y-4">
      {/* Gauge cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MeterCard type="viz"     readings={vizReadings} />
        <MeterCard type="gaz"     readings={gazReadings} />
        <MeterCard type="villany" readings={villanyReadings} />
      </div>

      {/* CO₂ summary */}
      <CO2Strip readings={readings} />

      {/* Submission form */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <p className="mb-3 text-xs font-black text-slate-700">Óraállás diktálása</p>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select
            name="meter_type"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="viz">🔵 Víz (m³)</option>
            <option value="gaz">🟠 Gáz (m³)</option>
            <option value="villany">🟡 Villany (kWh)</option>
          </select>
          <input
            name="meter_value" type="number" step="0.01" required
            placeholder="Óraállás"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <input
            name="reading_date" type="date" required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit" disabled={submitting}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? '...' : 'Rögzít'}
          </button>
        </form>
        {(saved || localSaved) && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Óraállás rögzítve!
          </p>
        )}
      </div>

      {/* History */}
      <ReadingHistory readings={readings} />
    </div>
  );
}
