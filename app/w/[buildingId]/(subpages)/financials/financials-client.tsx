'use client';

import { useState, useTransition } from 'react';
import { createCharge, getUnitFinanceHistory } from '@/app/actions/finance';
import type { FinancialSummary, ArrearsUnit } from '@/app/actions/finance';
import type { Role } from '@/lib/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(amount);
}

function currentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(15);
  if (d < new Date()) d.setMonth(d.getMonth() + 1);
  return d.toISOString().substring(0, 10);
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  summary: FinancialSummary | null;
}

function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Összes várható bevétel',
      value: summary ? fmt(summary.total_expected) : '—',
      sub: 'aktuális hónap',
      color: 'from-blue-900/50 to-blue-950/50 border-blue-800/40',
      textColor: 'text-blue-300',
    },
    {
      label: 'Befolyt összeg',
      value: summary ? fmt(summary.total_paid) : '—',
      sub: 'aktuális hónap',
      color: 'from-emerald-900/50 to-emerald-950/50 border-emerald-800/40',
      textColor: 'text-emerald-300',
    },
    {
      label: 'Fennmaradó hátralék',
      value: summary ? fmt(summary.total_arrears) : '—',
      sub: 'összes nyitott tétel',
      color: 'from-red-900/50 to-red-950/50 border-red-800/40',
      textColor: 'text-red-300',
    },
    {
      label: 'Befizetési arány',
      value: summary ? `${summary.collection_rate_pct}%` : '—',
      sub: 'aktuális hónap',
      color: 'from-violet-900/50 to-violet-950/50 border-violet-800/40',
      textColor: 'text-violet-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border bg-gradient-to-br px-4 py-3 ${card.color}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{card.label}</p>
          <p className={`mt-1 text-xl font-black ${card.textColor}`}>{card.value}</p>
          <p className="mt-0.5 text-[10px] text-slate-600">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Aging Table ──────────────────────────────────────────────────────────────

interface AgingTableProps {
  units: ArrearsUnit[];
}

function AgingTable({ units }: AgingTableProps) {
  if (units.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-emerald-400">Nincs nyitott hátralék — minden rendben!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800/60">
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Albetét</th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Hátralék</th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">0–30 nap</th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">31–60 nap</th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">60+ nap</th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Utolsó esedékes</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => {
            const rowColor =
              u.arrears_over_60 > 0
                ? 'bg-red-950/30 hover:bg-red-950/50'
                : u.arrears_31_60 > 0
                ? 'bg-amber-950/30 hover:bg-amber-950/50'
                : 'hover:bg-white/[0.03]';

            return (
              <tr key={u.unit_id} className={`border-b border-slate-800/30 transition-colors ${rowColor}`}>
                <td className="px-3 py-2.5 font-semibold text-slate-200">{u.unit_label}</td>
                <td className="px-3 py-2.5 text-right font-bold text-red-400">{fmt(Number(u.total_arrears))}</td>
                <td className="px-3 py-2.5 text-right text-slate-300">{fmt(Number(u.arrears_0_30))}</td>
                <td className="px-3 py-2.5 text-right text-amber-400">{fmt(Number(u.arrears_31_60))}</td>
                <td className="px-3 py-2.5 text-right text-red-400">{fmt(Number(u.arrears_over_60))}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{u.latest_due_date ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── New Charge Form ──────────────────────────────────────────────────────────

interface ChargeFormProps {
  buildingId: string;
  onSuccess: () => void;
}

function ChargeForm({ buildingId, onSuccess }: ChargeFormProps) {
  const [period, setPeriod] = useState(currentMonth());
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const chargePerUnit = parseFloat(amount);
    if (!chargePerUnit || chargePerUnit <= 0) {
      setError('Kérjük adjon meg érvényes összeget');
      return;
    }

    startTransition(async () => {
      const result = await createCharge({
        buildingId,
        period,
        chargePerUnit,
        dueDate,
        description: description || undefined,
      });

      if (result.success) {
        setSuccess(`Terhelés sikeresen létrehozva — ${result.charged_units} albetét`);
        setAmount('');
        setDescription('');
        onSuccess();
      } else {
        setError(result.error ?? 'Ismeretlen hiba');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Időszak
          </label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Összeg / albetét (Ft)
          </label>
          <input
            type="number"
            min="1"
            max="10000000"
            step="1"
            placeholder="pl. 25000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Esedékesség
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Megjegyzés (opcionális)
          </label>
          <input
            type="text"
            placeholder="pl. rendkívüli befizetés"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-400">{success}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
      >
        {isPending ? 'Feldolgozás…' : 'Terhelés létrehozása minden albetétre'}
      </button>
    </form>
  );
}

// ─── Resident Finance View ────────────────────────────────────────────────────

interface ResidentViewProps {
  unitId: string;
}

interface FinanceEntry {
  id: string;
  period: string;
  entry_type: string;
  expected_amount: number;
  paid_amount: number;
  due_date: string | null;
  description: string | null;
}

function ResidentView({ unitId }: ResidentViewProps) {
  const [entries, setEntries] = useState<FinanceEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await getUnitFinanceHistory(unitId);
    if (result.success) {
      setEntries(result.entries as FinanceEntry[]);
    } else {
      setError(result.error ?? 'Hiba a betöltés során');
    }
    setLoading(false);
  }

  if (entries === null && !loading) {
    return (
      <div className="rounded-xl border border-slate-800/50 bg-white/[0.03] px-4 py-6 text-center">
        <p className="mb-3 text-sm text-slate-400">Az albetéthez tartozó pénzügyi előzmények megtekintéséhez kattints az alábbi gombra.</p>
        <button
          onClick={load}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-500"
        >
          Előzmények betöltése
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
        Betöltés…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2 text-sm text-red-400">{error}</p>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800/50 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-500">
        Nincs pénzügyi bejegyzés ehhez az albetéthez.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800/60">
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Időszak</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Típus</th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Várható</th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Befizetett</th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Hátralék</th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Esedékes</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const arrears = Math.max(0, Number(e.expected_amount) - Number(e.paid_amount));
            return (
              <tr key={e.id} className="border-b border-slate-800/30 transition-colors hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 font-medium text-slate-200">{e.period}</td>
                <td className="px-3 py-2.5 text-slate-400">{e.entry_type}</td>
                <td className="px-3 py-2.5 text-right text-slate-300">{fmt(Number(e.expected_amount))}</td>
                <td className="px-3 py-2.5 text-right text-emerald-400">{fmt(Number(e.paid_amount))}</td>
                <td className={`px-3 py-2.5 text-right font-semibold ${arrears > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {arrears > 0 ? fmt(arrears) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-500">{e.due_date ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FinancialsClientProps {
  buildingId: string;
  buildingName: string;
  role: Role;
  summary: FinancialSummary | null;
  arrearsUnits: ArrearsUnit[] | null;
  unitId: string | null;
}

type Tab = 'overview' | 'arrears' | 'charge' | 'myunit';

export default function FinancialsClient({
  buildingId,
  buildingName,
  role,
  summary,
  arrearsUnits,
  unitId,
}: FinancialsClientProps) {
  const isManager = ['kozos_kepviselo', 'megbizott'].includes(role);
  const isAccountant = role === 'konyvelo';
  const canExport = isManager || isAccountant;
  const isResident = role === 'lako' || role === 'tulajdonos';

  const tabs = [
    { id: 'overview' as Tab, label: 'Összefoglaló', show: true },
    { id: 'arrears' as Tab, label: 'Hátralék tábla', show: isManager || isAccountant },
    { id: 'charge' as Tab, label: 'Terhelés rögzítése', show: isManager },
    { id: 'myunit' as Tab, label: 'Saját albetét', show: isResident },
  ].filter((t) => t.show);

  const [activeTab, setActiveTab] = useState<Tab>(tabs[0].id);
  const [exportLoading, setExportLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleExport() {
    setExportLoading(true);
    try {
      const url = `/api/finance/export?buildingId=${encodeURIComponent(buildingId)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        alert(`Export hiba: ${text}`);
        return;
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `penziigyek_${buildingId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Pénzügyek</p>
            <h1 className="text-2xl font-black tracking-tight text-white">{buildingName}</h1>
            <p className="mt-0.5 text-sm text-slate-500">Közös költség nyilvántartás és hátralékok</p>
          </div>
          {canExport && (
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="mt-2 self-start rounded-lg border border-violet-800/50 bg-violet-950/30 px-4 py-2 text-xs font-bold text-violet-300 transition-colors hover:border-violet-500/50 hover:bg-violet-500/10 disabled:opacity-50 sm:mt-0"
            >
              {exportLoading ? 'Exportálás…' : 'Könyvelői export letöltése'}
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="mb-6">
          <SummaryCards summary={summary} />
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="mb-4 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Panels */}
        <div className="rounded-xl border border-slate-800/50 bg-white/[0.03] p-4 sm:p-5">

          {activeTab === 'overview' && (
            <div>
              <h2 className="mb-4 text-base font-bold text-slate-200">Pénzügyi összefoglaló</h2>
              {summary ? (
                <div className="space-y-2 text-sm text-slate-400">
                  <p>Aktuális hónap teljesítési aránya: <span className="font-bold text-white">{summary.collection_rate_pct}%</span></p>
                  <p>Nyitott hátralék: <span className="font-bold text-red-400">{fmt(summary.total_arrears)}</span></p>
                  {(isManager || isAccountant) && arrearsUnits !== null && (
                    <p>Hátralékon lévő albetétek száma: <span className="font-bold text-white">{arrearsUnits.length}</span></p>
                  )}
                  {isResident && (
                    <p className="mt-3 rounded-lg border border-slate-800/50 bg-white/[0.03] px-3 py-2 text-slate-500">
                      Saját albetétjének részletes előzményeit a &quot;Saját albetét&quot; fülön találja.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nincs elérhető pénzügyi adat.</p>
              )}
            </div>
          )}

          {activeTab === 'arrears' && (isManager || isAccountant) && arrearsUnits !== null && (
            <div>
              <h2 className="mb-4 text-base font-bold text-slate-200">
                Hátralék tábla{' '}
                <span className="ml-1 rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-bold text-red-400">
                  {arrearsUnits.length} albetét
                </span>
              </h2>
              <p className="mb-3 text-xs text-slate-600">
                Piros sor: 60+ napos hátralék · Sárga sor: 31–60 napos hátralék
              </p>
              <AgingTable units={arrearsUnits} />
            </div>
          )}

          {activeTab === 'charge' && isManager && (
            <div>
              <h2 className="mb-1 text-base font-bold text-slate-200">Terhelés rögzítése</h2>
              <p className="mb-4 text-xs text-slate-600">Az összeget minden aktív albetétre egységesen rögzíti a rendszer.</p>
              <ChargeForm
                key={refreshKey}
                buildingId={buildingId}
                onSuccess={() => setRefreshKey((k) => k + 1)}
              />
            </div>
          )}

          {activeTab === 'myunit' && isResident && (
            <div>
              <h2 className="mb-4 text-base font-bold text-slate-200">Saját albetét egyenlege</h2>
              {unitId ? (
                <ResidentView unitId={unitId} />
              ) : (
                <p className="text-sm text-slate-500">
                  A fiókjához nem tartozik albetét ehhez az épülethez. Kérje az épület kezelőjét a hozzárendelés elvégzéséhez.
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
