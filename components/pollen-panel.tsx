'use client';


interface PollenCurrent {
  grassPollen:  number | null;
  birchPollen:  number | null;
  alderPollen:  number | null;
}
interface PollenDay {
  date:           string;
  maxGrassPollen: number;
  maxBirchPollen: number;
  maxAlderPollen: number;
}
interface Props {
  current: PollenCurrent;
  daily:   PollenDay[];
}

type Level = 'low' | 'moderate' | 'high' | 'unknown';

const LEVEL_STYLE: Record<Level, { bg: string; text: string; label: string }> = {
  low:     { bg: 'bg-emerald-50 ring-1 ring-emerald-100', text: 'text-emerald-700', label: 'Alacsony' },
  moderate:{ bg: 'bg-amber-50 ring-1 ring-amber-100',     text: 'text-amber-800',   label: 'Mérsékelt' },
  high:    { bg: 'bg-rose-50 ring-1 ring-rose-100',       text: 'text-rose-700',    label: 'Magas' },
  unknown: { bg: 'bg-slate-100 ring-1 ring-slate-200',    text: 'text-slate-700',   label: '—' },
};

function pollenLevel(value: number | null, lo: number, hi: number): Level {
  if (value === null) return 'unknown';
  if (value < lo)  return 'low';
  if (value < hi)  return 'moderate';
  return 'high';
}

const HU_DAYS = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];

function dayLabel(iso: string) {
  return HU_DAYS[new Date(iso).getDay()];
}

export default function PollenPanel({ current, daily }: Props) {
  const month = new Date().getMonth() + 1;
  const ragweedSeason = month >= 8 && month <= 10;

  const types = [
    { key: 'grass', label: 'Fű pollen',  value: current.grassPollen, lo: 10, hi: 50, max: 100 },
    { key: 'birch', label: 'Nyír pollen',value: current.birchPollen, lo: 10, hi: 80, max: 120 },
    { key: 'alder', label: 'Éger pollen',value: current.alderPollen, lo: 5,  hi: 30, max: 50  },
  ] as const;

  const highLevel = types.some(t => pollenLevel(t.value, t.lo, t.hi) === 'high');

  return (
    <div className="space-y-4">
      {/* Pollen rows */}
      {types.map(t => {
        const lv    = pollenLevel(t.value, t.lo, t.hi);
        const style = LEVEL_STYLE[lv];
        const pct   = t.value !== null ? Math.min((t.value / t.max) * 100, 100) : 0;
        return (
          <div key={t.key} className="flex items-center gap-2.5">
            <div className="min-w-[4.5rem]">
              <p className="text-[10px] font-semibold text-slate-800">{t.label}</p>
            </div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: lv === 'high' ? '#ef4444' : lv === 'moderate' ? '#eab308' : '#22c55e' }} />
            </div>
            <span className="w-14 text-right text-[10px] tabular-nums text-slate-700">
              {t.value !== null ? `${t.value.toFixed(0)} µg/m³` : '—'}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          </div>
        );
      })}

      {/* Ragweed season warning */}
      {ragweedSeason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[10px] font-semibold text-amber-800">⚠ Parlagfű szezon aktív</p>
          <p className="mt-0.5 text-[10px] text-slate-700/75">
            Budapest tipikusan magas parlagfű-terheléssel rendelkezik aug–okt között.
            Allergiásoknak fokozott óvatosság ajánlott.
          </p>
        </div>
      )}

      {/* High pollen alert */}
      {highLevel && !ragweedSeason && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-[10px] text-rose-700">⚠ Ma magas pollenterhelés — allergiásoknak gyógyszer ajánlott</p>
        </div>
      )}

      {/* 7-day mini forecast */}
      {daily.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">7 napos előrejelzés</p>
          <div className="grid grid-cols-7 gap-1">
            {daily.slice(0, 7).map(d => {
              const maxPollen = Math.max(d.maxGrassPollen, d.maxBirchPollen, d.maxAlderPollen);
              const lv = maxPollen >= 50 ? 'high' : maxPollen >= 10 ? 'moderate' : 'low';
              const style = LEVEL_STYLE[lv];
              return (
                <div key={d.date} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-700/75">{dayLabel(d.date)}</span>
                  <div className={`h-2 w-2 rounded-full ${lv === 'high' ? 'bg-rose-400' : lv === 'moderate' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <span className={`text-[9px] font-semibold ${style.text}`}>{maxPollen.toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
