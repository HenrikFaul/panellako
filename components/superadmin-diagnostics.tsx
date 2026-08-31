'use client';

import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '@/src/i18n/useI18n';

interface RunResponse {
  ok: boolean;
  presetId: string;
  status: number | null;
  statusText: string | null;
  elapsedMs: number;
  finalUrl: string | null;
  redirected: boolean;
  contentType: string | null;
  responseHeaders: Record<string, string>;
  bodyBytes: number;
  bodyText: string;
  bodyTruncated: boolean;
  error: string | null;
}

interface Preset {
  id: string;
  label: string;
  description: string;
  endpoint: string;
  group: 'overpass' | 'external' | 'internal';
}

const PRESET_DEFINITIONS = [
  ['overpass-kumi', 'Overpass · kumi.systems', 'overpassKumi', 'overpass.kumi.systems', 'overpass'],
  ['overpass-api-de', 'Overpass · overpass-api.de', 'overpassApiDe', 'overpass-api.de', 'overpass'],
  ['overpass-fr', 'Overpass · openstreetmap.fr', 'overpassFr', 'overpass.openstreetmap.fr', 'overpass'],
  ['overpass-lz4', 'Overpass · lz4', 'overpassLz4', 'lz4.overpass-api.de', 'overpass'],
  ['gibs-ndvi', 'NASA GIBS · MODIS NDVI', 'gibsNdvi', 'gibs.earthdata.nasa.gov', 'external'],
  ['earth-search', 'Earth Search STAC · Sentinel-2', 'earthSearch', 'earth-search.aws.element84.com', 'external'],
  ['open-meteo', 'Open-Meteo current', 'openMeteo', 'api.open-meteo.com', 'external'],
  ['open-meteo-aq', 'Open-Meteo air quality', 'openMeteoAq', 'air-quality-api.open-meteo.com', 'external'],
  ['self-diag', 'Internal · environment diagnostics', 'selfDiag', '/api/environment/diagnostics', 'internal'],
  ['pvgis', 'PVGIS REST', 'pvgis', 're.jrc.ec.europa.eu', 'external'],
  ['titiler', 'titiler.xyz NDVI point', 'titiler', 'titiler.xyz', 'external'],
] as const;

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadgeClass(status: number | null, ok: boolean): string {
  if (ok) return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
  if (status !== null && status >= 400 && status < 500) return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200';
  return 'bg-rose-50 text-rose-800 ring-1 ring-rose-200';
}

function fallbackResponse(presetId: string, error: string, status: number | null = null): RunResponse {
  return {
    ok: false,
    presetId,
    status,
    statusText: null,
    elapsedMs: 0,
    finalUrl: null,
    redirected: false,
    contentType: null,
    responseHeaders: {},
    bodyBytes: 0,
    bodyText: '',
    bodyTruncated: false,
    error,
  };
}

export default function SuperadminDiagnostics() {
  const { t } = useI18n();
  const [selectedPresetId, setSelectedPresetId] = useState('overpass-kumi');
  const [runningPresetId, setRunningPresetId] = useState<string | null>(null);
  const [response, setResponse] = useState<RunResponse | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{ preset: Preset; response: RunResponse }>>([]);

  const presets = useMemo<Preset[]>(() => PRESET_DEFINITIONS.map(([id, label, key, endpoint, group]) => ({
    id,
    label,
    description: t(`superadmin.diagnostics.presets.${key}`),
    endpoint,
    group,
  })), [t]);
  const selectedPreset = presets.find(item => item.id === selectedPresetId) ?? presets[0];

  const requestPreset = useCallback(async (presetId: string): Promise<RunResponse> => {
    try {
      const result = await fetch('/api/superadmin/diagnostics/curl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      });
      const body = await result.json().catch(() => null) as Partial<RunResponse> & { error?: string } | null;
      if (!result.ok || !body || typeof body.ok !== 'boolean') {
        return fallbackResponse(presetId, body?.error ?? 'DIAGNOSTIC_REQUEST_FAILED', result.status);
      }
      return { ...fallbackResponse(presetId, 'DIAGNOSTIC_REQUEST_FAILED'), ...body, presetId };
    } catch {
      return fallbackResponse(presetId, 'DIAGNOSTIC_REQUEST_FAILED');
    }
  }, []);

  const runSelected = useCallback(async () => {
    setRunningPresetId(selectedPreset.id);
    setResponse(null);
    try {
      setResponse(await requestPreset(selectedPreset.id));
    } finally {
      setRunningPresetId(null);
    }
  }, [requestPreset, selectedPreset.id]);

  const runOverpassBatch = useCallback(async () => {
    setBatchRunning(true);
    setBatchResults([]);
    const results: Array<{ preset: Preset; response: RunResponse }> = [];
    try {
      for (const preset of presets.filter(item => item.group === 'overpass')) {
        const result = await requestPreset(preset.id);
        results.push({ preset, response: result });
        setBatchResults([...results]);
      }
    } finally {
      setBatchRunning(false);
    }
  }, [presets, requestPreset]);

  const batchTone = batchResults.length === 0 || batchResults.every(item => item.response.ok)
    ? 'border-emerald-200 bg-emerald-50'
    : batchResults.some(item => item.response.ok)
      ? 'border-amber-200 bg-amber-50'
      : 'border-rose-200 bg-rose-50';

  return (
    <section className="rounded-2xl border border-canvas-line bg-white p-6 shadow-card" aria-labelledby="diagnostics-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="diagnostics-title" className="text-lg font-semibold text-canvas-ink">{t('superadmin.diagnostics.title')}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-canvas-muted">{t('superadmin.diagnostics.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => void runOverpassBatch()}
          disabled={batchRunning || runningPresetId !== null}
          className="btn-primary min-h-11 shrink-0 px-4 py-2 text-xs"
        >
          {batchRunning ? t('superadmin.diagnostics.batchRunning') : t('superadmin.diagnostics.batchRun')}
        </button>
      </div>

      {batchResults.length > 0 && (
        <div
          className={`mb-6 rounded-xl border p-4 ${batchTone}`}
          role={batchResults.every(item => item.response.ok) ? 'status' : 'alert'}
          aria-live="polite"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-canvas-ink">{t('superadmin.diagnostics.batchTitle')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-canvas-line text-left uppercase tracking-wider text-canvas-muted">
                <tr>
                  <th className="pb-2 pr-3">{t('superadmin.diagnostics.endpoint')}</th>
                  <th className="pb-2 pr-3">{t('superadmin.diagnostics.status')}</th>
                  <th className="pb-2 pr-3 text-right">{t('superadmin.diagnostics.latency')}</th>
                  <th className="pb-2 pr-3 text-right">{t('superadmin.diagnostics.bytes')}</th>
                  <th className="pb-2">{t('superadmin.diagnostics.note')}</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.map(({ preset, response: item }) => (
                  <tr key={preset.id} className="border-t border-canvas-line">
                    <td className="py-2 pr-3 font-mono text-canvas-ink">{preset.endpoint}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(item.status, item.ok)}`}>
                        {item.status ?? 'ERR'} {item.statusText ?? ''}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-canvas-muted">{item.elapsedMs} ms</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-canvas-muted">{fmtBytes(item.bodyBytes)}</td>
                    <td className="py-2 text-canvas-muted">{item.error ?? t('superadmin.diagnostics.ok')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label={t('superadmin.diagnostics.presetLabel')}>
        {presets.map(preset => {
          const selected = preset.id === selectedPreset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setSelectedPresetId(preset.id);
                setResponse(null);
              }}
              className={`min-h-20 rounded-xl border p-3 text-left focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                selected ? 'border-brand-500 bg-brand-50' : 'border-canvas-line bg-canvas-sage hover:border-brand-300'
              }`}
            >
              <span className="block text-sm font-semibold text-canvas-ink">{preset.label}</span>
              <span className="mt-1 block text-xs leading-5 text-canvas-muted">{preset.description}</span>
              <span className="mt-1 block truncate font-mono text-[10px] text-canvas-muted">{preset.endpoint}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void runSelected()}
          disabled={runningPresetId !== null || batchRunning}
          className="btn-primary min-h-11 px-5 py-2 text-sm"
        >
          {runningPresetId ? t('superadmin.diagnostics.running') : t('superadmin.diagnostics.runPreset')}
        </button>
        <p className="text-xs text-canvas-muted">{t('superadmin.diagnostics.serverOwned')}</p>
      </div>

      {response && (
        <div
          className={`mt-5 rounded-xl border p-4 ${response.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}
          role={response.ok ? 'status' : 'alert'}
          aria-live="polite"
        >
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className={`inline-block rounded-md px-2 py-1 text-xs font-semibold ${statusBadgeClass(response.status, response.ok)}`}>
              {response.status ?? 'ERR'} {response.statusText ?? ''}
            </span>
            <span className="text-xs tabular-nums text-canvas-muted">{response.elapsedMs} ms</span>
            <span className="text-xs tabular-nums text-canvas-muted">{fmtBytes(response.bodyBytes)}</span>
            {response.bodyTruncated && <span className="text-xs font-medium text-amber-900">{t('superadmin.diagnostics.truncated')}</span>}
          </div>
          {response.error && <p className="mb-3 text-sm font-semibold text-rose-800">{response.error}</p>}
          {response.finalUrl && <p className="mb-3 break-all font-mono text-[10px] text-canvas-muted">{response.finalUrl}</p>}
          {response.bodyText && (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs text-slate-50">
              {response.bodyText}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
