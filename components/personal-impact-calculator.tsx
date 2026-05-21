'use client';

import { useState } from 'react';

// ─── CO2 emission factors (kg CO2/km) ────────────────────────────────────────
const CAR_CO2_PER_KM     = 0.171;  // average petrol car kg CO2/km
const PT_CO2_PER_KM      = 0.048;  // public transport average kg CO2/km
const CYCLE_CO2_PER_KM   = 0.0;    // cycling = zero emissions
const WALKING_CO2_PER_KM = 0.0;

// Budapest averages (2023)
const BUDAPEST_AVG_WATER_L    = 92;   // L/person/day
const BUDAPEST_AVG_RECYCLING  = 22;   // % recycling rate
const BUDAPEST_POP             = 1_700_000;

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  colorClass: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step = 1, unit, colorClass, onChange }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-semibold text-slate-300">{label}</label>
        <span className={`text-[13px] font-black tabular-nums ${colorClass}`}>
          {value} <span className="text-[10px] font-normal text-slate-500">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-500"
      />
      <div className="flex justify-between text-[9px] text-slate-600">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

interface ResultRowProps {
  label: string;
  value: string;
  subtext?: string;
  colorClass: string;
  icon: string;
}

function ResultRow({ label, value, subtext, colorClass, icon }: ResultRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-800/60 p-3">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="text-[11px] text-slate-400">{label}</p>
        {subtext && <p className="text-[10px] text-slate-600">{subtext}</p>}
      </div>
      <p className={`text-right text-sm font-black ${colorClass}`}>{value}</p>
    </div>
  );
}

export default function PersonalImpactCalculator() {
  const [carKm,      setCarKm]      = useState(20);
  const [ptKm,       setPtKm]       = useState(15);
  const [cycleKm,    setCycleKm]    = useState(3);
  const [waterL,     setWaterL]     = useState(BUDAPEST_AVG_WATER_L);
  const [recycling,  setRecycling]  = useState(BUDAPEST_AVG_RECYCLING);

  // ── Calculations ─────────────────────────────────────────────────────────

  // Daily CO2 from transport (kg)
  const dailyCO2Car   = carKm   * CAR_CO2_PER_KM;
  const dailyCO2Pt    = ptKm    * PT_CO2_PER_KM;
  const dailyCO2Cycle = cycleKm * CYCLE_CO2_PER_KM;
  const dailyCO2Total = dailyCO2Car + dailyCO2Pt + dailyCO2Cycle;

  // Budapest average daily CO2 from transport (assuming 25km car/day average):
  const avgDailyCO2 = 25 * CAR_CO2_PER_KM;

  // Annual CO2 savings vs Budapest avg (kg/year)
  const co2SavedVsAvg = Math.max(0, (avgDailyCO2 - dailyCO2Total) * 365);

  // Water savings vs Budapest average (L/day)
  const waterDiff = BUDAPEST_AVG_WATER_L - waterL;
  const waterSavedYearly = waterDiff * 365;

  // Recycling impact: average Budapesti generates ~1.2 kg waste/day
  const wastePerDay     = 1.2; // kg
  const recycledKgYear  = (recycling / 100) * wastePerDay * 365;
  const citywideCO2If   = co2SavedVsAvg * BUDAPEST_POP;
  const citywideCO2kton = Math.round(citywideCO2If / 1_000_000);

  // ── Derived labels ────────────────────────────────────────────────────────
  const co2Label = co2SavedVsAvg >= 0
    ? `−${co2SavedVsAvg.toFixed(0)} kg CO₂/év megtakarítás`
    : `+${Math.abs(co2SavedVsAvg).toFixed(0)} kg CO₂/év többlet`;

  const waterLabel = waterDiff >= 0
    ? `−${Math.abs(waterSavedYearly).toFixed(0)} L/év megtakarítás`
    : `+${Math.abs(waterSavedYearly).toFixed(0)} L/év többlet`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">Személyes Hatás Kalkulátor</h2>
        <p className="text-sm text-slate-400">
          Állítsd be a napi szokásaidat és nézd meg, mekkora hatással vagy Budapest 2030 céljaira.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Inputs */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5 space-y-5">
          <h3 className="text-sm font-black text-white">Napi szokások</h3>

          <SliderRow
            label="Személyautó napi km"
            value={carKm} min={0} max={80}
            unit="km" colorClass="text-red-400"
            onChange={setCarKm}
          />
          <SliderRow
            label="Tömegközlekedés napi km"
            value={ptKm} min={0} max={60}
            unit="km" colorClass="text-sky-400"
            onChange={setPtKm}
          />
          <SliderRow
            label="Kerékpározás napi km"
            value={cycleKm} min={0} max={30}
            unit="km" colorClass="text-emerald-400"
            onChange={setCycleKm}
          />
          <SliderRow
            label="Vízfogyasztás"
            value={waterL} min={50} max={300}
            unit="L/nap" colorClass="text-blue-400"
            onChange={setWaterL}
          />
          <SliderRow
            label="Szelektív hulladékgyűjtés"
            value={recycling} min={0} max={100}
            unit="%" colorClass="text-amber-400"
            onChange={setRecycling}
          />
        </div>

        {/* Results */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-white">A te hatásod</h3>

          <ResultRow
            icon="🚗"
            label="CO₂ kibocsátás (közlekedés)"
            value={`${(dailyCO2Total * 365 / 1000).toFixed(2)} t CO₂/év`}
            subtext={`Budapest átlag: ${(avgDailyCO2 * 365 / 1000).toFixed(2)} t CO₂/év`}
            colorClass={dailyCO2Total <= avgDailyCO2 ? 'text-emerald-400' : 'text-red-400'}
          />

          <ResultRow
            icon={co2SavedVsAvg >= 0 ? '✅' : '⚠️'}
            label="CO₂ megtakarítás vs. budapesti átlag"
            value={co2SavedVsAvg >= 0 ? `−${co2SavedVsAvg.toFixed(0)} kg/év` : `+${Math.abs(co2SavedVsAvg).toFixed(0)} kg/év`}
            colorClass={co2SavedVsAvg >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />

          <ResultRow
            icon="💧"
            label="Víz vs. budapesti átlag"
            value={waterDiff >= 0 ? `−${Math.abs(waterSavedYearly).toFixed(0)} L/év` : `+${Math.abs(waterSavedYearly).toFixed(0)} L/év`}
            subtext={`Budapest átlag: ${BUDAPEST_AVG_WATER_L} L/nap`}
            colorClass={waterDiff >= 0 ? 'text-sky-400' : 'text-amber-400'}
          />

          <ResultRow
            icon="♻️"
            label="Újrahasznosított hulladék"
            value={`${recycledKgYear.toFixed(0)} kg/év`}
            subtext={`Budapest átlag: ${Math.round((BUDAPEST_AVG_RECYCLING / 100) * wastePerDay * 365)} kg/év`}
            colorClass="text-amber-400"
          />

          {/* City-wide projection */}
          {co2SavedVsAvg > 0 && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
              <p className="text-[11px] font-semibold text-indigo-300 mb-1">
                Ha mind a 1,7M budapesti lakó így élne...
              </p>
              <p className="text-2xl font-black text-white">
                −{citywideCO2kton.toLocaleString('hu-HU')}
                <span className="ml-1 text-sm font-normal text-slate-400">kt CO₂/év</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Ez megközelíti Budapest teljes éves klímacélját a közlekedési szektorban.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-600">
        Számítások alapja: EEA Transport CO₂ faktorkészlet 2023, Fővárosi Vízművek adatok, KSH hulladékstatisztika.
        A kalkulátor becslésen alapul — pontos méréshez egyéni karbonlábnyom-számítót ajánlunk.
      </p>
    </div>
  );
}
