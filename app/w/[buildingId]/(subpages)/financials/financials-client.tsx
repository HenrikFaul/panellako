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
      textColor: 'text-sky-300',
    },
    {
      label: 'Befolyt összeg',
      value: summary ? fmt(summary.total_paid) : '—',
      sub: 'aktuális hónap',
      textColor: 'text-emerald-300',
    },
    {
      label: 'Fennmaradó hátralék',
      value: summary ? fmt(summary.total_arrears) : '—',
      sub: 'összes nyitott tétel',
      textColor: 'text-rose-300',
    },
    {
      label: 'Befizetési arány',
      value: summary ? `${summary.collection_rate_pct}%` : '—',
      sub: 'aktuális hónap',
      textColor: 'text-violet-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
          <p className={`mt-1 text-lg font-semibold tracking-tight tabular-nums ${card.textColor}`}>{card.value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{card.sub}</p>
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
      <div className="rounded-xl bg-emerald-500/10 px-4 py-6 text-center ring-1 ring-emerald-500/25">
        <p className="text-sm font-semibold text-emerald-400">Nincs nyitott hátralék — minden rendben!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Albetét</th>
            <th className="px-3 py-2 text-right font-semibold">Hátralék</th>
            <th className="px-3 py-2 text-right font-semibold">0–30 nap</th>
            <th className="px-3 py-2 text-right font-semibold">31–60 nap</th>
            <th className="px-3 py-2 text-right font-semibold">60+ nap</th>
            <th className="px-3 py-2 text-right font-semibold">Utolsó esedékes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {units.map((u) => {
            const rowColor =
              u.arrears_over_60 > 0
                ? 'bg-rose-500/10 hover:bg-rose-500/20'
                : u.arrears_31_60 > 0
                ? 'bg-amber-500/10 hover:bg-amber-500/20'
                : 'hover:bg-white/[0.03]';

            return (
              <tr key={u.unit_id} className={`transition-colors ${rowColor}`}>
                <td className="px-3 py-2.5 font-semibold text-slate-200">{u.unit_label}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-rose-400">{fmt(Number(u.total_arrears))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{fmt(Number(u.arrears_0_30))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-amber-300">{fmt(Number(u.arrears_31_60))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-rose-400">{fmt(Number(u.arrears_over_60))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{u.latest_due_date ?? '—'}</td>
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
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Időszak
          </label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            required
            className="input-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
            className="input-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Esedékesség
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="input-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Megjegyzés (opcionális)
          </label>
          <input
            type="text"
            placeholder="pl. rendkívüli befizetés"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-base"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400 ring-1 ring-rose-500/25">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 ring-1 ring-emerald-500/25">{success}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-[0.625rem] bg-brand-500 px-4 py-2.5 text-sm font-semibold text-ink-base transition-colors hover:bg-brand-400 disabled:opacity-50"
      >
        {isPending ? 'Feldolgozás…' : 'Terhelés létrehozása minden albetétre'}
      </button>
    </form>
  );
}

// ─── Resident Finance View ────────────────────────────────────────────────────

interface ResidentViewProps {
  workspaceId: string;
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

function ResidentView({ workspaceId, unitId }: ResidentViewProps) {
  const [entries, setEntries] = useState<FinanceEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await getUnitFinanceHistory(workspaceId, unitId);
    if (result.success) {
      setEntries(result.entries as FinanceEntry[]);
    } else {
      setError(result.error ?? 'Hiba a betöltés során');
    }
    setLoading(false);
  }

  if (entries === null && !loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-6 text-center">
        <p className="mb-3 text-sm text-slate-400">Az albetéthez tartozó pénzügyi előzmények megtekintéséhez kattints az alábbi gombra.</p>
        <button
          onClick={load}
          className="rounded-[0.625rem] bg-brand-500 px-4 py-2.5 text-sm font-semibold text-ink-base transition-colors hover:bg-brand-400"
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
      <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400 ring-1 ring-rose-500/25">{error}</p>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <p className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-500">
        Nincs pénzügyi bejegyzés ehhez az albetéthez.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Időszak</th>
            <th className="px-3 py-2 text-left font-semibold">Típus</th>
            <th className="px-3 py-2 text-right font-semibold">Várható</th>
            <th className="px-3 py-2 text-right font-semibold">Befizetett</th>
            <th className="px-3 py-2 text-right font-semibold">Hátralék</th>
            <th className="px-3 py-2 text-right font-semibold">Esedékes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {entries.map((e) => {
            const arrears = Math.max(0, Number(e.expected_amount) - Number(e.paid_amount));
            return (
              <tr key={e.id} className="transition-colors hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 font-medium text-slate-200">{e.period}</td>
                <td className="px-3 py-2.5 text-slate-400">{e.entry_type}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{fmt(Number(e.expected_amount))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-400">{fmt(Number(e.paid_amount))}</td>
                <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${arrears > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {arrears > 0 ? fmt(arrears) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{e.due_date ?? '—'}</td>
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
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pénzügyek</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{buildingName}</h1>
            <p className="mt-0.5 text-sm text-slate-500">Közös költség nyilvántartás és hátralékok</p>
          </div>
          {canExport && (
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="mt-2 self-start rounded-lg bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/25 transition-colors hover:bg-violet-500/20 disabled:opacity-50 sm:mt-0"
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
                    ? 'bg-brand-500 text-ink-base'
                    : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Panels */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 sm:p-5">

          {activeTab === 'overview' && (
            <div>
              <h2 className="mb-4 text-base font-semibold text-slate-100">Pénzügyi összefoglaló</h2>
              {summary ? (
                <div className="space-y-2 text-sm text-slate-400">
                  <p>Aktuális hónap teljesítési aránya: <span className="font-semibold tabular-nums text-slate-100">{summary.collection_rate_pct}%</span></p>
                  <p>Nyitott hátralék: <span className="font-semibold tabular-nums text-rose-400">{fmt(summary.total_arrears)}</span></p>
                  {(isManager || isAccountant) && arrearsUnits !== null && (
                    <p>Hátralékon lévő albetétek száma: <span className="font-semibold tabular-nums text-slate-100">{arrearsUnits.length}</span></p>
                  )}
                  {isResident && (
                    <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-slate-500">
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
              <h2 className="mb-4 text-base font-semibold text-slate-100">
                Hátralék tábla{' '}
                <span className="ml-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/25">
                  {arrearsUnits.length} albetét
                </span>
              </h2>
              <p className="mb-3 text-xs text-slate-500">
                Piros sor: 60+ napos hátralék · Sárga sor: 31–60 napos hátralék
              </p>
              <AgingTable units={arrearsUnits} />
            </div>
          )}

          {activeTab === 'charge' && isManager && (
            <div>
              <h2 className="mb-1 text-base font-semibold text-slate-100">Terhelés rögzítése</h2>
              <p className="mb-4 text-xs text-slate-500">Az összeget minden aktív albetétre egységesen rögzíti a rendszer.</p>
              <ChargeForm
                key={refreshKey}
                buildingId={buildingId}
                onSuccess={() => setRefreshKey((k) => k + 1)}
              />
            </div>
          )}

          {activeTab === 'myunit' && isResident && (
            <div>
              <h2 className="mb-4 text-base font-semibold text-slate-100">Saját albetét egyenlege</h2>
              {unitId ? (
                <ResidentView workspaceId={buildingId} unitId={unitId} />
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
