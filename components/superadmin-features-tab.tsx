'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface Feature {
  id:          string;
  feature_key: string;
  name:        string;
  description: string | null;
  module:      string;
  route_path:  string | null;
  menu_path:   string | null;
  tier:        string;
  enabled:     boolean;
  sort_order:  number;
}

type ViewMode = 'tree' | 'flat';

const TIER_COLORS: Record<string, string> = {
  trial: 'bg-white/[0.06] text-slate-300 ring-1 ring-white/10',
  alap:  'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/25',
  pro:   'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/25',
};

const TIER_LABELS: Record<string, string> = {
  trial: 'Trial',
  alap:  'Alap',
  pro:   'Pro',
};

const VALID_TIERS = ['alap', 'pro', 'trial'];

function detectDuplicates(features: Feature[]): string[] {
  const seen = new Map<string, string[]>();
  for (const f of features) {
    if (!f.route_path || !f.menu_path) continue;
    const key = `${f.route_path}::${f.menu_path}`;
    const existing = seen.get(key) ?? [];
    existing.push(f.feature_key);
    seen.set(key, existing);
  }
  return [...seen.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([path, keys]) => `${path} (${keys.join(', ')})`);
}

interface EditState {
  name:        string;
  description: string;
  module:      string;
  route_path:  string;
  menu_path:   string;
  tier:        string;
  enabled:     boolean;
}

export default function SuperadminFeaturesTab() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [modFilter, setModFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing,  setEditing]  = useState<Record<string, EditState>>({});
  const [saving,   setSaving]   = useState<string | null>(null);
  const [saveMsg,  setSaveMsg]  = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/superadmin/features')
      .then(r => r.json())
      .then((d: { features?: Feature[]; error?: string }) => {
        if (d.error) return;
        setFeatures(d.features ?? []);
      })
      .catch(() => {/* ignore */})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const modules = useMemo(() => [...new Set(features.map(f => f.module))].sort(), [features]);

  const filtered = useMemo(() => features.filter(f => {
    const q = search.toLowerCase();
    const matchQ = !q || f.name.toLowerCase().includes(q) || f.feature_key.toLowerCase().includes(q) || (f.route_path ?? '').toLowerCase().includes(q);
    const matchM = !modFilter || f.module === modFilter;
    return matchQ && matchM;
  }), [features, search, modFilter]);

  const duplicates = useMemo(() => detectDuplicates(features), [features]);

  const tierGroups = useMemo(() => {
    const tiers: Record<string, Feature[]> = { alap: [], pro: [], trial: [] };
    for (const f of filtered) {
      if (!tiers[f.tier]) tiers[f.tier] = [];
      tiers[f.tier].push(f);
    }
    return tiers;
  }, [filtered]);

  const moduleTree = useMemo(() => {
    const tree: Record<string, Feature[]> = {};
    for (const f of filtered) {
      if (!tree[f.module]) tree[f.module] = [];
      tree[f.module].push(f);
    }
    return tree;
  }, [filtered]);

  function openEdit(f: Feature) {
    setExpanded(f.id);
    setEditing(prev => ({
      ...prev,
      [f.id]: {
        name:        f.name,
        description: f.description ?? '',
        module:      f.module,
        route_path:  f.route_path ?? '',
        menu_path:   f.menu_path ?? '',
        tier:        f.tier,
        enabled:     f.enabled,
      },
    }));
  }

  async function save(featureId: string) {
    const state = editing[featureId];
    if (!state) return;
    setSaving(featureId);

    const res = await fetch(`/api/superadmin/features/${featureId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...state,
        route_path: state.route_path || null,
        menu_path:  state.menu_path  || null,
      }),
    });

    const data = await res.json() as { ok?: boolean; error?: string };
    setSaveMsg(prev => ({ ...prev, [featureId]: data.ok ? '✓ Mentve' : `Hiba: ${data.error}` }));
    setSaving(null);

    if (data.ok) {
      setFeatures(prev => prev.map(f => f.id !== featureId ? f : {
        ...f,
        ...state,
        route_path: state.route_path || null,
        menu_path:  state.menu_path  || null,
      }));
      setExpanded(null);
      setTimeout(() => setSaveMsg(prev => { const n = { ...prev }; delete n[featureId]; return n; }), 3000);
    }
  }

  function patchEdit(featureId: string, field: keyof EditState, value: unknown) {
    setEditing(prev => ({ ...prev, [featureId]: { ...prev[featureId], [field]: value } }));
  }

  function renderEditPanel(f: Feature) {
    const state = editing[f.id];
    if (!state) return null;
    const msg = saveMsg[f.id];
    return (
      <div className="border-t border-white/[0.06] bg-white/[0.02] px-4 pb-4 pt-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Megnevezés</label>
            <input value={state.name} onChange={e => patchEdit(f.id, 'name', e.target.value)}
              className="input-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Modul</label>
            <input value={state.module} onChange={e => patchEdit(f.id, 'module', e.target.value)}
              className="input-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tier</label>
            <select value={state.tier} onChange={e => patchEdit(f.id, 'tier', e.target.value)}
              className="input-base">
              {VALID_TIERS.map(t => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Útvonal (route_path)</label>
            <input value={state.route_path} onChange={e => patchEdit(f.id, 'route_path', e.target.value)}
              placeholder="/w/:id/..."
              className="input-base font-mono" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Menü elhelyezkedés</label>
            <input value={state.menu_path} onChange={e => patchEdit(f.id, 'menu_path', e.target.value)}
              placeholder="Szekció > Alszekció"
              className="input-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Leírás</label>
            <input value={state.description} onChange={e => patchEdit(f.id, 'description', e.target.value)}
              className="input-base" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => save(f.id)}
            disabled={saving === f.id}
            className="rounded-[0.625rem] bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-base hover:bg-brand-400 disabled:opacity-50"
          >
            {saving === f.id ? 'Mentés…' : 'Mentés'}
          </button>
          <button
            onClick={() => setExpanded(null)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]"
          >
            Mégse
          </button>
          {/* Enabled toggle */}
          <button
            onClick={() => patchEdit(f.id, 'enabled', !state.enabled)}
            className={`ml-auto flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              state.enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-slate-400'
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${state.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            {state.enabled ? 'Aktív' : 'Kikapcsolt'}
          </button>
          {msg && (
            <span className={`text-sm font-semibold ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>{msg}</span>
          )}
        </div>
      </div>
    );
  }

  function FeatureRow({ f }: { f: Feature }) {
    const isOpen = expanded === f.id;
    return (
      <div key={f.id}>
        <div
          className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] ${!f.enabled ? 'opacity-50' : ''}`}
          onClick={() => (isOpen ? setExpanded(null) : openEdit(f))}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">{f.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIER_COLORS[f.tier] ?? 'bg-white/[0.06] text-slate-300 ring-1 ring-white/10'}`}>
                {TIER_LABELS[f.tier] ?? f.tier}
              </span>
              {!f.enabled && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 ring-1 ring-rose-500/25">Kikapcsolt</span>}
            </div>
            {f.route_path && (
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">{f.route_path}</p>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-slate-600">{isOpen ? '▲' : '▼'}</span>
        </div>
        {isOpen && renderEditPanel(f)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Funkció & Tier</h2>
          <p className="text-xs text-slate-500">{features.length} funkció · 3 tier (Trial / Alap / Pro)</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] disabled:opacity-50"
        >
          {loading ? 'Töltés…' : '↻ Frissítés'}
        </button>
      </div>

      {/* Routing audit warnings */}
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-300">
            <span>⚠</span> Routing audit — {duplicates.length} duplikált route_path + menu_path
          </p>
          <div className="space-y-1">
            {duplicates.map(d => (
              <p key={d} className="rounded-lg bg-amber-500/10 px-3 py-1.5 font-mono text-[11px] text-amber-300">{d}</p>
            ))}
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tier-ek',   value: '3' },
          { label: 'Funkciók',  value: String(features.length) },
          { label: 'Modulok',   value: String(modules.length) },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
            <p className="text-xs font-semibold text-slate-500">{s.label}</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-100">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Szabad szöveges keresés (funkció / kulcs / útvonal)…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base flex-1"
          style={{ minWidth: 220 }}
        />
        <select
          value={modFilter}
          onChange={e => setModFilter(e.target.value)}
          className="input-base w-auto"
        >
          <option value="">Összes modul</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="inline-flex gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {(['tree', 'flat'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${viewMode === v ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'}`}
            >
              {v === 'tree' ? 'Fa nézet' : 'Lapos útvonal'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && features.length === 0 ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Nincs találat</p>
      ) : viewMode === 'tree' ? (
        // Tree view — grouped by module
        <div className="space-y-3">
          {Object.entries(moduleTree).sort(([a], [b]) => a.localeCompare(b)).map(([mod, feats]) => (
            <div key={mod} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-4 py-2">
                <span className="text-sm font-semibold text-slate-300">{mod}</span>
                <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-slate-300">{feats.length}</span>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {feats.map(f => <FeatureRow key={f.id} f={f} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat view — grouped by tier
        <div className="space-y-4">
          {VALID_TIERS.map(tier => {
            const feats = tierGroups[tier] ?? [];
            if (feats.length === 0) return null;
            return (
              <div key={tier} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${TIER_COLORS[tier]}`}>
                    {TIER_LABELS[tier]}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">{feats.length} funkció</span>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {feats.map(f => (
                    <div key={f.id} className={`flex items-center gap-3 px-4 py-2.5 ${!f.enabled ? 'opacity-50' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold text-slate-100">{f.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">{f.feature_key}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          {f.route_path && <span className="font-mono">{f.route_path}</span>}
                          {f.route_path && f.menu_path && <span>→</span>}
                          {f.menu_path && <span>{f.menu_path}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => openEdit(f)}
                        className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.08]"
                      >
                        Szerkesztés
                      </button>
                    </div>
                  ))}
                </div>
                {/* Inline edit panel if expanded feature is in this tier */}
                {feats.map(f => expanded === f.id ? (
                  <div key={`edit-${f.id}`} className="border-t border-white/10">
                    {renderEditPanel(f)}
                  </div>
                ) : null)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
