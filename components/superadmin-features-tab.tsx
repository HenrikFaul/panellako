'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  acquireAdminRequestKey,
  isTerminalAdminCommandResponse,
  releaseAdminRequestKey,
} from '@/lib/superadmin/idempotency-client';
import { usePlatformAuthority } from '@/components/superadmin-authority-context';
import { useI18n } from '@/src/i18n/useI18n';

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

const VALID_TIERS = ['alap', 'pro', 'trial'];

type Translator = (key: string) => string;

function translated(t: Translator, key: string, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replace(`{${name}}`, String(value)),
    t(key),
  );
}

function tierLabel(t: Translator, tier: string): string {
  return VALID_TIERS.includes(tier) ? t(`superadmin.features.tierLabels.${tier}`) : tier;
}

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
  reason:      string;
}

interface ActionMessage {
  kind: 'success' | 'error';
  key: string;
  stepUpHref?: string;
}

function errorKey(code: unknown): string {
  switch (code) {
    case 'MFA_STEP_UP_REQUIRED': return 'superadmin.features.errors.mfaRequired';
    case 'PLATFORM_FEATURE_NO_CHANGE': return 'superadmin.features.errors.noChange';
    case 'PLATFORM_FEATURE_NOT_FOUND': return 'superadmin.features.errors.notFound';
    case 'IDEMPOTENCY_PAYLOAD_MISMATCH': return 'superadmin.features.errors.idempotencyMismatch';
    case 'PLATFORM_CAPABILITY_DENIED': return 'superadmin.features.errors.capabilityDenied';
    default: return 'superadmin.features.errors.actionFailed';
  }
}

async function jsonBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const value = await response.json() as unknown;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function canonicalFeature(value: unknown): Omit<Feature, 'id' | 'feature_key'> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const feature = value as Record<string, unknown>;
  if (
    typeof feature.name !== 'string'
    || feature.name.trim().length < 1
    || (feature.description !== null && typeof feature.description !== 'string')
    || typeof feature.module !== 'string'
    || !/^[a-z][a-z0-9_-]{0,99}$/.test(feature.module)
    || (feature.route_path !== null && (typeof feature.route_path !== 'string' || !feature.route_path.startsWith('/')))
    || (feature.menu_path !== null && typeof feature.menu_path !== 'string')
    || typeof feature.tier !== 'string'
    || !VALID_TIERS.includes(feature.tier)
    || typeof feature.enabled !== 'boolean'
    || typeof feature.sort_order !== 'number'
    || !Number.isInteger(feature.sort_order)
  ) return null;
  return {
    name: feature.name,
    description: feature.description as string | null,
    module: feature.module,
    route_path: feature.route_path as string | null,
    menu_path: feature.menu_path as string | null,
    tier: feature.tier,
    enabled: feature.enabled,
    sort_order: feature.sort_order,
  };
}

export default function SuperadminFeaturesTab() {
  const { t } = useI18n();
  const authority = usePlatformAuthority();
  const canManage = authority.mode === 'operator'
    && authority.capabilityKeys.includes('platform.features.manage');
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search,   setSearch]   = useState('');
  const [modFilter, setModFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing,  setEditing]  = useState<Record<string, EditState>>({});
  const [saving,   setSaving]   = useState<string | null>(null);
  const [saveMsg,  setSaveMsg]  = useState<Record<string, ActionMessage>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/superadmin/features?limit=100&offset=0', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const body = await jsonBody(response);
      if (!response.ok || !Array.isArray(body.features)) throw new Error('FEATURES_LOAD_FAILED');
      setFeatures(body.features as Feature[]);
    } catch {
      setLoadError('superadmin.features.loadError');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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
    setSaveMsg(previous => {
      const next = { ...previous };
      delete next[f.id];
      return next;
    });
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
        reason:      prev[f.id]?.reason ?? '',
      },
    }));
  }

  async function save(featureId: string) {
    const state = editing[featureId];
    if (!state || state.reason.trim().length < 10 || saving) return;
    const scope = `feature:${featureId}`;
    const idempotencyKey = acquireAdminRequestKey(scope);
    setSaving(featureId);
    setSaveMsg(previous => {
      const next = { ...previous };
      delete next[featureId];
      return next;
    });

    try {
      const response = await fetch(`/api/superadmin/features/${featureId}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          patch: {
            name: state.name,
            description: state.description || null,
            module: state.module,
            route_path: state.route_path || null,
            menu_path: state.menu_path || null,
            tier: state.tier,
            enabled: state.enabled,
          },
          reason: state.reason.trim(),
          idempotencyKey,
        }),
      });
      const body = await jsonBody(response);
      if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(scope);
      const canonical = canonicalFeature(body.feature);
      if (!response.ok || body.ok !== true || body.outcome !== 'updated' || !canonical) {
        setSaveMsg(previous => ({
          ...previous,
          [featureId]: {
            kind: 'error',
            key: errorKey(body.error),
            ...(response.status === 428 && typeof body.stepUpHref === 'string'
              ? { stepUpHref: body.stepUpHref }
              : {}),
          },
        }));
        return;
      }

      setFeatures(previous => previous.map(feature => feature.id !== featureId ? feature : {
        ...feature,
        ...canonical,
      } as Feature));
      setEditing(previous => ({
        ...previous,
        [featureId]: {
          ...previous[featureId],
          name: canonical.name,
          description: canonical.description ?? '',
          module: canonical.module,
          route_path: canonical.route_path ?? '',
          menu_path: canonical.menu_path ?? '',
          tier: canonical.tier,
          enabled: canonical.enabled,
          reason: '',
        },
      }));
      setSaveMsg(previous => ({
        ...previous,
        [featureId]: {
          kind: 'success',
          key: body.replayed === true
            ? 'superadmin.features.saveReplayed'
            : 'superadmin.features.saveSucceeded',
        },
      }));
    } catch {
      setSaveMsg(previous => ({
        ...previous,
        [featureId]: { kind: 'error', key: 'superadmin.features.errors.network' },
      }));
    } finally {
      setSaving(null);
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
            <label htmlFor={`feature-name-${f.id}`} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.features.name')}</label>
            <input id={`feature-name-${f.id}`} value={state.name} maxLength={200} onChange={e => patchEdit(f.id, 'name', e.target.value)}
              className="input-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`feature-module-${f.id}`} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.features.module')}</label>
            <input id={`feature-module-${f.id}`} value={state.module} maxLength={100} pattern="[a-z][a-z0-9_-]{0,99}" onChange={e => patchEdit(f.id, 'module', e.target.value)}
              className="input-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`feature-tier-${f.id}`} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.features.tier')}</label>
            <select id={`feature-tier-${f.id}`} value={state.tier} onChange={e => patchEdit(f.id, 'tier', e.target.value)}
              className="input-base">
              {VALID_TIERS.map(tier => <option key={tier} value={tier}>{tierLabel(t, tier)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`feature-route-${f.id}`} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.features.routePath')}</label>
            <input id={`feature-route-${f.id}`} value={state.route_path} maxLength={300} onChange={e => patchEdit(f.id, 'route_path', e.target.value)}
              placeholder="/w/:id/..."
              className="input-base font-mono" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`feature-menu-${f.id}`} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.features.menuPath')}</label>
            <input id={`feature-menu-${f.id}`} value={state.menu_path} maxLength={300} onChange={e => patchEdit(f.id, 'menu_path', e.target.value)}
              placeholder={t('superadmin.features.menuPlaceholder')}
              className="input-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`feature-description-${f.id}`} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.features.description')}</label>
            <input id={`feature-description-${f.id}`} value={state.description} maxLength={500} onChange={e => patchEdit(f.id, 'description', e.target.value)}
              className="input-base" />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <label htmlFor={`feature-reason-${f.id}`} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.features.reasonLabel')}</label>
          <textarea
            id={`feature-reason-${f.id}`}
            value={state.reason}
            minLength={10}
            maxLength={1000}
            required
            onChange={event => patchEdit(f.id, 'reason', event.target.value)}
            className="input-base min-h-20"
            placeholder={t('superadmin.features.reasonPlaceholder')}
          />
          <p className="text-[10px] text-slate-500">{translated(t, 'superadmin.features.reasonCounter', { count: state.reason.trim().length })}</p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => save(f.id)}
            disabled={saving === f.id || state.reason.trim().length < 10}
            className="rounded-[0.625rem] bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-base hover:bg-brand-400 disabled:opacity-50"
          >
            {saving === f.id ? t('superadmin.features.saving') : t('superadmin.features.save')}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(null)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]"
          >
            {t('superadmin.features.cancel')}
          </button>
          {/* Enabled toggle */}
          <button
            type="button"
            aria-pressed={state.enabled}
            onClick={() => patchEdit(f.id, 'enabled', !state.enabled)}
            className={`ml-auto flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              state.enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-slate-400'
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${state.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            {state.enabled ? t('superadmin.features.active') : t('superadmin.features.disabled')}
          </button>
          {msg && (
            <div role={msg.kind === 'error' ? 'alert' : 'status'} aria-live="polite" className={`text-sm font-semibold ${msg.kind === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{t(msg.key)}</span>
              {msg.stepUpHref && <a href={msg.stepUpHref} className="ml-2 underline">{t('superadmin.authority.stepUp')}</a>}
            </div>
          )}
        </div>
      </div>
    );
  }

  function FeatureRow({ f }: { f: Feature }) {
    const isOpen = expanded === f.id;
    const panelId = `platform-feature-editor-${f.id}`;
    return (
      <div key={f.id}>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          disabled={!canManage}
          title={!canManage ? t('superadmin.features.readOnlyAccess') : undefined}
          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.03] disabled:cursor-default ${!f.enabled ? 'opacity-50' : ''}`}
          onClick={() => (isOpen ? setExpanded(null) : openEdit(f))}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">{f.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIER_COLORS[f.tier] ?? 'bg-white/[0.06] text-slate-300 ring-1 ring-white/10'}`}>
                {tierLabel(t, f.tier)}
              </span>
              {!f.enabled && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 ring-1 ring-rose-500/25">{t('superadmin.features.disabled')}</span>}
            </div>
            {f.route_path && (
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">{f.route_path}</p>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-slate-600">{canManage ? (isOpen ? '▲' : '▼') : t('superadmin.features.readOnly')}</span>
        </button>
        {canManage && isOpen && <div id={panelId}>{renderEditPanel(f)}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{t('superadmin.features.title')}</h2>
          <p className="text-xs text-slate-500">{translated(t, 'superadmin.features.summary', { count: features.length })}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] disabled:opacity-50"
        >
          {loading ? t('superadmin.features.loading') : t('superadmin.features.refresh')}
        </button>
      </div>

      {/* Routing audit warnings */}
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-300">
            <span>⚠</span> {translated(t, 'superadmin.features.routeAuditSummary', { count: duplicates.length })}
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
          { label: t('superadmin.features.tiers'),    value: '3' },
          { label: t('superadmin.features.features'), value: String(features.length) },
          { label: t('superadmin.features.modules'),  value: String(modules.length) },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
            <p className="text-xs font-semibold text-slate-500">{s.label}</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-100">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <label htmlFor="platform-feature-search" className="sr-only">{t('superadmin.features.searchLabel')}</label>
        <input
          id="platform-feature-search"
          type="text"
          maxLength={120}
          placeholder={t('superadmin.features.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base flex-1"
          style={{ minWidth: 220 }}
        />
        <label htmlFor="platform-feature-module" className="sr-only">{t('superadmin.features.moduleFilterLabel')}</label>
        <select
          id="platform-feature-module"
          value={modFilter}
          onChange={e => setModFilter(e.target.value)}
          className="input-base w-auto"
        >
          <option value="">{t('superadmin.features.allModules')}</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="inline-flex gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {(['tree', 'flat'] as ViewMode[]).map(v => (
            <button
              type="button"
              key={v}
              aria-pressed={viewMode === v}
              onClick={() => setViewMode(v)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${viewMode === v ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'}`}
            >
              {v === 'tree' ? t('superadmin.features.treeView') : t('superadmin.features.flatView')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loadError ? (
        <div role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
          <p>{t(loadError)}</p>
          <button type="button" onClick={() => void load()} className="mt-3 rounded-lg border border-rose-400/30 px-3 py-1.5 font-semibold">{t('superadmin.features.retry')}</button>
        </div>
      ) : loading && features.length === 0 ? (
        <div role="status" aria-live="polite" className="space-y-2">
          <span className="sr-only">{t('superadmin.features.loadingFeatures')}</span>
          {[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">{t('superadmin.features.noMatch')}</p>
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
                    {tierLabel(t, tier)}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">{translated(t, 'superadmin.features.featureCount', { count: feats.length })}</span>
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
                        type="button"
                        disabled={!canManage}
                        title={!canManage ? t('superadmin.features.readOnlyAccess') : undefined}
                        onClick={() => openEdit(f)}
                        className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.08] disabled:cursor-default disabled:opacity-60"
                      >
                        {canManage ? t('superadmin.features.edit') : t('superadmin.features.readOnly')}
                      </button>
                    </div>
                  ))}
                </div>
                {/* Inline edit panel if expanded feature is in this tier */}
                {canManage && feats.map(f => expanded === f.id ? (
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
