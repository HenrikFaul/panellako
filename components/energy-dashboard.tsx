'use client';

import { FormEvent, useState } from 'react';
import { Droplets, Flame, Zap, Leaf, ChevronDown, ChevronUp } from 'lucide-react';
import type { MeterType } from '@/app/actions/meter-readings';
import type { MeterReading } from '@/lib/types';
import { formatHungarianMonthDay } from '../lib/hungarian-date';

// ─── CO₂ emission factors ─────────────────────────────────────────────────────
const CO2_FACTORS: Record<MeterType, number> = {
  viz:     0.344,
  gaz:     2.04,
  villany: 0.264,
};

const METER_CONFIG: Record<MeterType, {
  label: string; unit: string; icon: typeof Droplets;
  color: string; glow: string; bgLight: string; description: string;
}> = {
  viz:     { label: 'Víz',     unit: 'm³',  icon: Droplets, color: '#38bdf8', glow: 'shadow-sky-400/30',    bgLight: 'bg-sky-50',    description: 'Hidegvíz' },
  gaz:     { label: 'Gáz',     unit: 'm³',  icon: Flame,    color: '#fb923c', glow: 'shadow-orange-400/30', bgLight: 'bg-orange-50', description: 'Fűtés'    },
  villany: { label: 'Villany', unit: 'kWh', icon: Zap,      color: '#facc15', glow: 'shadow-yellow-400/30', bgLight: 'bg-yellow-50', description: 'Elektromos' },
};

// ─── SVG donut gauge ─────────────────────────────────────────────────────────
function DonutGauge({ value, max, color }: { value: number; max: number; color: string }) {
  const r = 26; const cx = 32; const cy = 32;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(Math.max(value / max, 0), 1);
  const dash = circ * frac;
  const gap  = circ * (1 - frac);

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="currentColor" strokeWidth="5" className="text-white/10"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        strokeLinecap="round" transform="rotate(135 32 32)"
      />
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
  const cfg    = METER_CONFIG[type];
  const Icon   = cfg.icon;
  const sorted = [...readings].sort((a, b) => b.reading_date.localeCompare(a.reading_date));
  const latest = sorted[0];
  const prev   = sorted[1];
  const delta  = latest && prev ? Math.abs(latest.value - prev.value) : null;
  const deltaUp = latest && prev ? latest.value > prev.value : null;
  const co2    = delta !== null ? delta * CO2_FACTORS[type] : null;
  const gaugeMax: Record<MeterType, number> = { viz: 300, gaz: 200, villany: 5000 };

  if (!latest) {
    return (
      <div className="flex min-h-[90px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-3 text-center">
        <Icon size={18} className="mb-1 text-slate-600" />
        <p className="text-xs font-semibold text-slate-400">{cfg.label}</p>
        <p className="mt-0.5 text-[10px] text-slate-600">Nincs adat</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]">
      {/* Header */}
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Icon size={13} style={{ color: cfg.color }} />
          <span className="text-xs font-semibold text-slate-300">{cfg.label}</span>
        </div>
        {delta !== null && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold leading-none ${deltaUp ? 'text-rose-500' : 'text-emerald-500'}`}>
            {deltaUp ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            {delta.toFixed(1)}&thinsp;{cfg.unit}
          </span>
        )}
      </div>

      {/* Gauge + value row */}
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <DonutGauge value={latest.value} max={gaugeMax[type]} color={cfg.color} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] font-bold tabular-nums leading-none text-slate-200">
              {latest.value.toLocaleString('hu-HU', { maximumFractionDigits: 1 })}
            </span>
            <span className="text-[7px] text-slate-400">{cfg.unit}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] leading-tight text-slate-500">{cfg.description}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
            {latest.unit_label && (
              <span className="font-semibold text-slate-400">{latest.unit_label}&thinsp;·&thinsp;</span>
            )}
            {formatHungarianMonthDay(latest.reading_date)}
          </p>
          {co2 !== null && co2 > 0 && (
            <div className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 ring-1 ring-emerald-500/25">
              <Leaf size={8} className="text-emerald-500" />
              <span className="text-[8px] font-semibold text-emerald-300">
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
  let hasData  = false;

  for (const type of ['viz', 'gaz', 'villany'] as MeterType[]) {
    const sorted = [...readings.filter(r => r.meter_type === type)]
      .sort((a, b) => b.reading_date.localeCompare(a.reading_date));
    if (sorted.length >= 2) {
      totalCo2 += Math.abs(sorted[0].value - sorted[1].value) * CO2_FACTORS[type];
      hasData   = true;
    }
  }
  if (!hasData || totalCo2 === 0) return null;

  const vsAvg  = totalCo2 - 100;
  const better = vsAvg < 0;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2">
      <Leaf size={13} className="shrink-0 text-emerald-400" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-emerald-300">
          ~{totalCo2.toFixed(1)} kg CO₂ ez az időszak
        </p>
        {Math.abs(vsAvg) > 1 && (
          <p className="text-[10px] text-emerald-400/80">
            {better
              ? `${Math.abs(vsAvg).toFixed(0)} kg-mal kevesebb a budapesti átlagnál`
              : `${vsAvg.toFixed(0)} kg-mal több a budapesti átlagnál`}
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
    <div>
      <ul className="space-y-1.5">
        {recent.map(r => {
          const cfg  = METER_CONFIG[r.meter_type];
          const Icon = cfg.icon;
          return (
            <li key={r.id} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.03] px-3 py-2">
              <Icon size={12} style={{ color: cfg.color }} className="shrink-0" />
              <span className="flex-1 truncate text-xs font-medium text-slate-300">
                {r.unit_label || '—'}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-slate-400">
                {r.value.toLocaleString('hu-HU', { maximumFractionDigits: 1 })}&thinsp;{cfg.unit}
              </span>
              <span className="shrink-0 text-[10px] text-slate-500">
                {formatHungarianMonthDay(r.reading_date)}
              </span>
            </li>
          );
        })}
      </ul>
      {readings.length > 4 && (
        <button
          onClick={() => setOpen(v => !v)}
          className="mt-2 w-full text-center text-[10px] font-semibold text-slate-500 transition-colors hover:text-slate-300"
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
  defaultReadingDate: string;
}

export default function EnergyDashboard({ readings, onSubmit, saved, defaultReadingDate }: EnergyDashboardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);

  const vizReadings     = readings.filter(r => r.meter_type === 'viz');
  const gazReadings     = readings.filter(r => r.meter_type === 'gaz');
  const villanyReadings = readings.filter(r => r.meter_type === 'villany');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form  = e.currentTarget;
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
    <div className="space-y-3">

      {/* Gauge cards — always 3 columns, compact */}
      <div className="grid grid-cols-3 gap-2">
        <MeterCard type="viz"     readings={vizReadings} />
        <MeterCard type="gaz"     readings={gazReadings} />
        <MeterCard type="villany" readings={villanyReadings} />
      </div>

      {/* CO₂ summary */}
      <CO2Strip readings={readings} />

      {/* Submission form — fully responsive, never overflows */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
        <p className="mb-2.5 text-xs font-semibold text-slate-300">Óraállás diktálása</p>
        <form onSubmit={handleSubmit} className="space-y-2">

          {/* Row 1: meter type select (full width) */}
          <select
            name="meter_type"
            className="input-base"
          >
            <option value="viz">Víz (m³)</option>
            <option value="gaz">Gáz (m³)</option>
            <option value="villany">Villany (kWh)</option>
          </select>

          {/* Row 2: value + date side by side */}
          <div className="flex gap-2">
            <input
              name="meter_value" type="number" step="0.01" required
              placeholder="Óraállás"
              className="input-base min-w-0 flex-1"
            />
            <input
              name="reading_date" type="date" required
              defaultValue={defaultReadingDate}
              className="input-base min-w-0 w-[140px] shrink-0"
            />
          </div>

          {/* Row 3: submit button (full width) */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[0.625rem] bg-brand-500 py-2.5 text-sm font-semibold text-ink-base transition-colors hover:bg-brand-400 disabled:opacity-50"
          >
            {submitting ? 'Mentés…' : 'Óraállás rögzítése'}
          </button>
        </form>

        {(saved || localSaved) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Óraállás rögzítve!
          </p>
        )}
      </div>

      {/* History */}
      <ReadingHistory readings={readings} />
    </div>
  );
}
