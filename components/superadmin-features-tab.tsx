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
  trial: 'bg-slate-100 text-slate-600',
  alap:  'bg-sky-100 text-sky-700',
  pro:   'bg-violet-100 text-violet-700',
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
      <div className="border-t border-slate-100 bg-slate-50 px-4 pb-4 pt-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Megnevezés</label>
            <input value={state.name} onChange={e => patchEdit(f.id, 'name', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modul</label>
            <input value={state.module} onChange={e => patchEdit(f.id, 'module', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tier</label>
            <select value={state.tier} onChange={e => patchEdit(f.id, 'tier', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {VALID_TIERS.map(t => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Útvonal (route_path)</label>
            <input value={state.route_path} onChange={e => patchEdit(f.id, 'route_path', e.target.value)}
              placeholder="/w/:id/..."
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Menü elhelyezkedés</label>
            <input value={state.menu_path} onChange={e => patchEdit(f.id, 'menu_path', e.target.value)}
              placeholder="Szekció > Alszekció"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leírás</label>
            <input value={state.description} onChange={e => patchEdit(f.id, 'description', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => save(f.id)}
            disabled={saving === f.id}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving === f.id ? 'Mentés…' : 'Mentés'}
          </button>
          <button
            onClick={() => setExpanded(null)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
          >
            Mégse
          </button>
          {/* Enabled toggle */}
          <button
            onClick={() => patchEdit(f.id, 'enabled', !state.enabled)}
            className={`ml-auto flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
              state.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${state.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {state.enabled ? 'Aktív' : 'Kikapcsolt'}
          </button>
          {msg && (
            <span className={`text-sm font-bold ${msg.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</span>
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
          className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 ${!f.enabled ? 'opacity-50' : ''}`}
          onClick={() => (isOpen ? setExpanded(null) : openEdit(f))}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{f.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TIER_COLORS[f.tier] ?? 'bg-slate-100 text-slate-600'}`}>
                {TIER_LABELS[f.tier] ?? f.tier}
              </span>
              {!f.enabled && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">Kikapcsolt</span>}
            </div>
            {f.route_path && (
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">{f.route_path}</p>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-slate-300">{isOpen ? '▲' : '▼'}</span>
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
          <h2 className="text-lg font-black text-slate-900">Funkció & Tier</h2>
          <p className="text-xs text-slate-500">{features.length} funkció · 3 tier (Trial / Alap / Pro)</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? 'Töltés…' : '↻ Frissítés'}
        </button>
      </div>

      {/* Routing audit warnings */}
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
            <span>⚠</span> Routing audit — {duplicates.length} duplikált route_path + menu_path
          </p>
          <div className="space-y-1">
            {duplicates.map(d => (
              <p key={d} className="rounded-lg bg-amber-100 px-3 py-1.5 font-mono text-[11px] text-amber-700">{d}</p>
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
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{s.label}</p>
            <p className="text-2xl font-black text-slate-900">{s.value}</p>
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
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          style={{ minWidth: 220 }}
        />
        <select
          value={modFilter}
          onChange={e => setModFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Összes modul</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
          {(['tree', 'flat'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-4 py-2 text-sm font-bold transition-colors ${viewMode === v ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {v === 'tree' ? 'Fa nézet' : 'Lapos útvonal'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && features.length === 0 ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nincs találat</p>
      ) : viewMode === 'tree' ? (
        // Tree view — grouped by module
        <div className="space-y-3">
          {Object.entries(moduleTree).sort(([a], [b]) => a.localeCompare(b)).map(([mod, feats]) => (
            <div key={mod} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
                <span className="text-sm font-black text-slate-700">{mod}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">{feats.length}</span>
              </div>
              <div className="divide-y divide-slate-50">
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
              <div key={tier} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${TIER_COLORS[tier]}`}>
                    {TIER_LABELS[tier]}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">{feats.length} funkció</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {feats.map(f => (
                    <div key={f.id} className={`flex items-center gap-3 px-4 py-2.5 ${!f.enabled ? 'opacity-50' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold text-slate-900">{f.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{f.feature_key}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          {f.route_path && <span className="font-mono">{f.route_path}</span>}
                          {f.route_path && f.menu_path && <span>→</span>}
                          {f.menu_path && <span>{f.menu_path}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => openEdit(f)}
                        className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
                      >
                        Szerkesztés
                      </button>
                    </div>
                  ))}
                </div>
                {/* Inline edit panel if expanded feature is in this tier */}
                {feats.map(f => expanded === f.id ? (
                  <div key={`edit-${f.id}`} className="border-t border-slate-200">
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
