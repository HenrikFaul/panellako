'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type TransportType = 'auto' | 'bkk' | 'kerekpar' | 'gyalog';

interface TripEntry {
  id: string;
  date: string; // ISO string
  distance: number;
  transport: TransportType;
  co2SavedGrams: number;
}

interface GreenAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  baseVotes: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CO2_PER_KM: Record<TransportType, number> = {
  auto:     0.21,
  bkk:      0.082,
  kerekpar: 0,
  gyalog:   0,
};

const TRANSPORT_LABELS: Record<TransportType, string> = {
  auto:     'Autó',
  bkk:      'BKK',
  kerekpar: 'Kerékpár',
  gyalog:   'Gyalog',
};

const GREEN_ACTIONS: GreenAction[] = [
  { id: 'fa', icon: '🌳', title: 'Faültetési nap', description: 'Szervezzünk közös faültetést az épület körül', baseVotes: 7 },
  { id: 'recycle', icon: '♻️', title: 'Szelektív hulladékgyűjtés', description: 'Emeljük a szelektív gyűjtés arányát 80% fölé', baseVotes: 12 },
  { id: 'energy', icon: '💡', title: 'Energiatakarékosság', description: 'Közös ledvilágítás-csere a lépcsőházban', baseVotes: 9 },
  { id: 'bike', icon: '🚲', title: 'Kerékpártároló', description: 'Fedett kerékpártároló kialakítása az udvarban', baseVotes: 11 },
  { id: 'green-wall', icon: '🌿', title: 'Tetőkert / zöldhomlokzat', description: 'Pilot zöldhomlokzat projekt tervezése', baseVotes: 5 },
  { id: 'rain', icon: '💧', title: 'Esővíz-gyűjtés', description: 'Közös esővízgyűjtő rendszer az öntözéshez', baseVotes: 8 },
];

const LS_KEY = 'pl_trip_log';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function calcCo2SavedGrams(distance: number, transport: TransportType): number {
  const autoCo2 = distance * CO2_PER_KM.auto;
  const chosenCo2 = distance * CO2_PER_KM[transport];
  return Math.round((autoCo2 - chosenCo2) * 1000);
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isSameMonth(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function loadTrips(): TripEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTrips(trips: TripEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(trips));
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  buildingId: string;
  buildingName: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function GreenActionsClient({ buildingName }: Props) {
  // Section 1 — Calculator state
  const [distance, setDistance] = useState(5);
  const [transport, setTransport] = useState<TransportType>('bkk');
  const [showResult, setShowResult] = useState(false);

  // Section 2 — Trip log state
  const [trips, setTrips] = useState<TripEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Section 3 — Voting state (local, resets on reload)
  const [votes, setVotes] = useState<Record<string, number>>(() =>
    Object.fromEntries(GREEN_ACTIONS.map((a) => [a.id, a.baseVotes]))
  );
  const [voted, setVoted] = useState<Record<string, boolean>>({});

  // Hydrate trips from localStorage after mount
  useEffect(() => {
    setTrips(loadTrips());
    setHydrated(true);
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCalculate = useCallback(() => {
    setShowResult(true);
  }, []);

  const handleSaveTrip = useCallback(() => {
    const newTrip: TripEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      distance,
      transport,
      co2SavedGrams: calcCo2SavedGrams(distance, transport),
    };
    const updated = [newTrip, ...trips].slice(0, 10);
    setTrips(updated);
    saveTrips(updated);
    setShowResult(false);
  }, [distance, transport, trips]);

  const handleClearTrips = useCallback(() => {
    setTrips([]);
    saveTrips([]);
  }, []);

  const handleVote = useCallback((actionId: string) => {
    if (voted[actionId]) return;
    setVotes((prev) => ({ ...prev, [actionId]: (prev[actionId] ?? 0) + 1 }));
    setVoted((prev) => ({ ...prev, [actionId]: true }));
  }, [voted]);

  // ─── Derived values ────────────────────────────────────────────────────────

  const autoCo2 = distance * CO2_PER_KM.auto;
  const bkkCo2 = distance * CO2_PER_KM.bkk;
  const savedGrams = calcCo2SavedGrams(distance, transport);
  const monthlySavedGrams = trips
    .filter((t) => isSameMonth(t.date))
    .reduce((sum, t) => sum + t.co2SavedGrams, 0);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-2">
          <p className="mb-1 text-sm text-white/40">{buildingName}</p>
          <h1 className="text-3xl font-black text-white">Közösségi Zöld Akciók</h1>
          <p className="mt-1 text-sm text-white/50">
            CO₂ megtakarítás kalkulátor, közlekedési napló és épületi kezdeményezések
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            Section 1 — CO₂ Megtakarítás Kalkulátor
        ══════════════════════════════════════════════════════════════════ */}
        <section className="rounded-2xl border border-emerald-800 bg-emerald-950/60 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-emerald-300">CO₂ Megtakarítás Kalkulátor</h2>

          {/* Distance slider */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-white/70">Út távolsága</label>
              <span className="tabular-nums text-sm font-bold text-emerald-300">{distance} km</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={distance}
              onChange={(e) => { setDistance(Number(e.target.value)); setShowResult(false); }}
              className="w-full accent-emerald-400"
            />
            <div className="mt-1 flex justify-between text-[11px] text-white/30">
              <span>0 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Transport selector */}
          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-white/70">Közlekedési mód</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(TRANSPORT_LABELS) as TransportType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTransport(t); setShowResult(false); }}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                    transport === t
                      ? 'border-emerald-400 bg-emerald-500 text-slate-900'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-emerald-600 hover:text-white'
                  }`}
                >
                  {TRANSPORT_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            className="mb-5 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-emerald-400 active:bg-emerald-600"
          >
            Kiszámol
          </button>

          {/* Result table */}
          {showResult && (
            <div className="mb-4 overflow-hidden rounded-xl border border-emerald-800 bg-emerald-900/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-800">
                    <th className="px-4 py-2 text-left font-semibold text-emerald-300/70">Mód</th>
                    <th className="px-4 py-2 text-right font-semibold text-emerald-300/70">CO₂ (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(TRANSPORT_LABELS) as TransportType[]).map((t) => {
                    const co2 = distance * CO2_PER_KM[t];
                    const isChosen = t === transport;
                    return (
                      <tr
                        key={t}
                        className={`border-b border-emerald-800/50 last:border-0 ${isChosen ? 'bg-emerald-500/10' : ''}`}
                      >
                        <td className="px-4 py-2 text-white/80">
                          {isChosen && <span className="mr-1 text-emerald-400">▶</span>}
                          {TRANSPORT_LABELS[t]}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-white/80">
                          {co2.toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="border-t border-emerald-700 bg-emerald-800/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-200">
                    Megtakarítás vs autó:
                  </span>
                  <span className="tabular-nums text-lg font-black text-emerald-300">
                    {savedGrams >= 0 ? `${savedGrams} g` : `+${Math.abs(savedGrams)} g`}
                  </span>
                </div>
                {transport === 'auto' && (
                  <p className="mt-1 text-xs text-white/40">
                    Autóval utazol — válassz más módot a megtakarítás látásához
                  </p>
                )}
                {transport !== 'auto' && (
                  <p className="mt-1 text-xs text-white/40">
                    Ha autó helyett {TRANSPORT_LABELS[transport].toLowerCase()}t választasz,
                    {' '}{savedGrams} gramm CO₂-t takarítasz meg ezen az úton
                    (autóval ez {(autoCo2 * 1000).toFixed(0)} g,
                    {' '}{transport === 'bkk' ? `BKK-val ${(bkkCo2 * 1000).toFixed(0)} g` : '0 g'} lett volna).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Save button */}
          {showResult && (
            <button
              onClick={handleSaveTrip}
              className="w-full rounded-xl border border-emerald-600 bg-emerald-900/60 px-4 py-3 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-800/60 active:bg-emerald-700/60"
            >
              Rögzítem a naplóba
            </button>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            Section 2 — Saját Közlekedési Napló
        ══════════════════════════════════════════════════════════════════ */}
        <section className="rounded-2xl border border-slate-200/10 bg-white/5 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Saját Közlekedési Napló</h2>
            {trips.length > 0 && (
              <button
                onClick={handleClearTrips}
                className="text-xs text-red-400/70 underline hover:text-red-400"
              >
                Törlés
              </button>
            )}
          </div>

          {/* Monthly summary */}
          {hydrated && trips.some((t) => isSameMonth(t.date)) && (
            <div className="mb-4 rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-4 py-3">
              <p className="text-sm text-emerald-300/70">Ezen a hónapban megtakarítva</p>
              <p className="tabular-nums text-2xl font-black text-emerald-300">
                {monthlySavedGrams >= 1000
                  ? `${(monthlySavedGrams / 1000).toFixed(2)} kg CO₂`
                  : `${monthlySavedGrams} g CO₂`}
              </p>
            </div>
          )}

          {!hydrated || trips.length === 0 ? (
            <p className="text-sm text-white/30">
              Még nincs rögzített út. Számolj ki egy utat fent, majd kattints a &bdquo;Rögzítem&rdquo; gombra.
            </p>
          ) : (
            <div className="space-y-2">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white/80">
                      {TRANSPORT_LABELS[trip.transport]} · {trip.distance} km
                    </p>
                    <p className="text-xs text-white/30">{formatDate(trip.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums text-sm font-bold text-emerald-400">
                      {trip.co2SavedGrams >= 1000
                        ? `−${(trip.co2SavedGrams / 1000).toFixed(2)} kg`
                        : `−${trip.co2SavedGrams} g`}
                    </p>
                    <p className="text-[10px] text-white/25">CO₂ megtakarítás</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            Section 3 — Épületi Zöld Akciók
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-white">Épületi Zöld Akciók</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {GREEN_ACTIONS.map((action) => {
              const hasVoted = voted[action.id] ?? false;
              return (
                <div
                  key={action.id}
                  className="rounded-2xl border border-slate-200/10 bg-white/5 p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="text-2xl leading-none">{action.icon}</span>
                    <span className="tabular-nums text-xs text-white/30">{votes[action.id]} szavazat</span>
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-white">{action.title}</h3>
                  <p className="mb-4 text-xs leading-relaxed text-white/50">{action.description}</p>
                  <button
                    onClick={() => handleVote(action.id)}
                    disabled={hasVoted}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      hasVoted
                        ? 'cursor-default border border-emerald-800/60 bg-emerald-950/40 text-emerald-500'
                        : 'border border-white/10 bg-white/[0.06] text-white/70 hover:border-emerald-600 hover:bg-emerald-900/40 hover:text-emerald-300'
                    }`}
                  >
                    {hasVoted ? '✓ Szavazatod leadva' : 'Szavazok rá!'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
