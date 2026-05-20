'use client';

import React, { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RunResponse {
  ok:          boolean;
  status:      number | null;
  statusText:  string | null;
  elapsedMs:   number;
  url:         string;
  finalUrl:    string | null;
  redirected:  boolean;
  contentType: string | null;
  responseHeaders: Record<string, string>;
  bodyBytes:   number;
  bodyText:    string;
  bodyTruncated: boolean;
  error:       string | null;
}

interface RunSpec {
  url:       string;
  method?:   'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  headers?:  Record<string, string>;
  body?:     string;
  timeoutMs?: number;
}

// ─── Pre-set quick-actions ───────────────────────────────────────────────────

interface Preset { id: string; label: string; description: string; spec: RunSpec }

const OVERPASS_TINY = '[out:json][timeout:5];node[amenity=pharmacy](around:200,47.5278845,19.0705657);out qt 1;';

const PRESETS: Preset[] = [
  {
    id: 'overpass-kumi',
    label: 'Overpass · kumi.systems',
    description: '/api/cycling-ben első, próba-lekérés',
    spec: {
      url:    'https://overpass.kumi.systems/api/interpreter',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'panellako/1.0 (info@panellako.hu)' },
      body:    'data=' + encodeURIComponent(OVERPASS_TINY),
      timeoutMs: 9000,
    },
  },
  {
    id: 'overpass-api-de',
    label: 'Overpass · overpass-api.de',
    description: 'főtükör, gyakran terhelt',
    spec: {
      url:    'https://overpass-api.de/api/interpreter',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'panellako/1.0 (info@panellako.hu)' },
      body:    'data=' + encodeURIComponent(OVERPASS_TINY),
      timeoutMs: 9000,
    },
  },
  {
    id: 'overpass-fr',
    label: 'Overpass · openstreetmap.fr',
    description: 'Bordeaux egyetemi mirror',
    spec: {
      url:    'https://overpass.openstreetmap.fr/api/interpreter',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'panellako/1.0 (info@panellako.hu)' },
      body:    'data=' + encodeURIComponent(OVERPASS_TINY),
      timeoutMs: 9000,
    },
  },
  {
    id: 'overpass-lz4',
    label: 'Overpass · lz4',
    description: 'lz4.overpass-api.de',
    spec: {
      url:    'https://lz4.overpass-api.de/api/interpreter',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'panellako/1.0 (info@panellako.hu)' },
      body:    'data=' + encodeURIComponent(OVERPASS_TINY),
      timeoutMs: 9000,
    },
  },
  {
    id: 'gibs-ndvi',
    label: 'NASA GIBS · MODIS NDVI',
    description: 'a Magyarország NDVI render forrása — 1024×430 PNG',
    spec: {
      url:    'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_NDVI_8Day&STYLES=&CRS=EPSG:4326&BBOX=45.7,16.0,48.6,22.9&WIDTH=1024&HEIGHT=430&FORMAT=image/png&TRANSPARENT=TRUE&TIME=2024-09-22',
      method: 'GET',
      timeoutMs: 20000,
    },
  },
  {
    id: 'earth-search',
    label: 'Earth Search STAC · Sentinel-2',
    description: 'Element84 STAC keresés Budapest pontra',
    spec: {
      url:    'https://earth-search.aws.element84.com/v1/search',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'panellako/1.0 (info@panellako.hu)' },
      body:    JSON.stringify({ collections: ['sentinel-2-l2a'], intersects: { type: 'Point', coordinates: [19.0705657, 47.5278845] }, limit: 1 }),
      timeoutMs: 15000,
    },
  },
  {
    id: 'open-meteo',
    label: 'Open-Meteo current',
    description: 'időjárás current-temp lekérés',
    spec: {
      url:    'https://api.open-meteo.com/v1/forecast?latitude=47.5279&longitude=19.0706&current=temperature_2m',
      method: 'GET',
      timeoutMs: 5000,
    },
  },
  {
    id: 'open-meteo-aq',
    label: 'Open-Meteo air quality',
    description: 'levegő AQI lekérés',
    spec: {
      url:    'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=47.5279&longitude=19.0706&current=pm2_5,pm10',
      method: 'GET',
      timeoutMs: 5000,
    },
  },
  {
    id: 'self-diag',
    label: 'Internal · /api/environment/diagnostics',
    description: 'a panellako saját diagnosztikai végpontja',
    spec: {
      url:    'https://panellako.hu/api/environment/diagnostics',
      method: 'GET',
      timeoutMs: 20000,
    },
  },
  {
    id: 'pvgis',
    label: 'PVGIS REST',
    description: 'EU napenergia API',
    spec: {
      url:    'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=47.5279&lon=19.0706&peakpower=1&loss=14&pvtechchoice=crystSi&outputformat=json',
      method: 'GET',
      timeoutMs: 15000,
    },
  },
  {
    id: 'titiler',
    label: 'titiler.xyz NDVI point',
    description: 'Sentinel-2 NDVI extract',
    spec: {
      url:    'https://titiler.xyz/cog/point/19.0706,47.5279?url=https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/33/U/XP/2024/9/S2A_33UXP_20240920_0_L2A/B08.tif',
      method: 'GET',
      timeoutMs: 15000,
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function statusBadgeClass(status: number | null, ok: boolean): string {
  if (status === null) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (ok) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status >= 400 && status < 500) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-rose-100 text-rose-700 border-rose-200';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SuperadminDiagnostics() {
  const [url,        setUrl]        = useState<string>('https://overpass.kumi.systems/api/interpreter');
  const [method,     setMethod]     = useState<string>('POST');
  const [headersStr, setHeadersStr] = useState<string>(
    JSON.stringify({ 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'panellako/1.0 (info@panellako.hu)' }, null, 2)
  );
  const [body,       setBody]       = useState<string>('data=' + encodeURIComponent(OVERPASS_TINY));
  const [timeoutMs,  setTimeoutMs]  = useState<number>(9000);
  const [running,    setRunning]    = useState<boolean>(false);
  const [resp,       setResp]       = useState<RunResponse | null>(null);
  const [headersErr, setHeadersErr] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState<boolean>(false);
  const [batchResults, setBatchResults] = useState<Array<{ preset: Preset; resp: RunResponse }>>([]);

  const applyPreset = (p: Preset) => {
    setUrl(p.spec.url);
    setMethod(p.spec.method ?? 'GET');
    setHeadersStr(JSON.stringify(p.spec.headers ?? {}, null, 2));
    setBody(p.spec.body ?? '');
    setTimeoutMs(p.spec.timeoutMs ?? 10000);
    setResp(null);
    setHeadersErr(null);
  };

  const runSpec = useCallback(async (spec: RunSpec): Promise<RunResponse | null> => {
    const r = await fetch('/api/superadmin/diagnostics/curl', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(spec),
    });
    if (!r.ok) {
      const txt = await r.text();
      return { ok: false, status: r.status, statusText: r.statusText, elapsedMs: 0, url: spec.url, finalUrl: null, redirected: false, contentType: null, responseHeaders: {}, bodyBytes: 0, bodyText: txt, bodyTruncated: false, error: `Local proxy returned ${r.status}` };
    }
    return await r.json() as RunResponse;
  }, []);

  const run = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (headersStr.trim()) {
      try {
        const parsed = JSON.parse(headersStr) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === 'string') headers[k] = v;
          }
        } else {
          setHeadersErr('A headers JSON-nak objektumnak kell lennie');
          return;
        }
      } catch (e) {
        setHeadersErr(`Headers JSON parse hiba: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
    }
    setHeadersErr(null);
    setRunning(true);
    setResp(null);
    try {
      const r = await runSpec({
        url, method: method as RunSpec['method'], headers, body: method === 'GET' || method === 'HEAD' ? undefined : body, timeoutMs,
      });
      setResp(r);
    } finally {
      setRunning(false);
    }
  }, [url, method, headersStr, body, timeoutMs, runSpec]);

  const runOverpassBatch = useCallback(async () => {
    setBatchRunning(true);
    setBatchResults([]);
    const overpassPresets = PRESETS.filter(p => p.id.startsWith('overpass-'));
    const results: Array<{ preset: Preset; resp: RunResponse }> = [];
    // Run sequentially so the UI updates as each one finishes
    for (const p of overpassPresets) {
      const r = await runSpec(p.spec);
      if (r) {
        results.push({ preset: p, resp: r });
        setBatchResults([...results]);
      }
    }
    setBatchRunning(false);
  }, [runSpec]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">🛠 Diagnosztika — külső API curl</h2>
          <p className="mt-1 text-xs text-slate-500">
            Vercel serverless környezetből futtat tetszőleges HTTP kérést. SSRF-védelem aktív (privát IP-tartományok blokkolva), válasz 512 KB-ra cap-elve, megjelenítve 32 KB-ig.
          </p>
        </div>
        <button
          type="button"
          onClick={runOverpassBatch}
          disabled={batchRunning}
          className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {batchRunning ? 'Tesztelés...' : '⚡ Overpass health check (4 mirror)'}
        </button>
      </div>

      {/* Batch results */}
      {batchResults.length > 0 && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-emerald-700">Overpass mirror health</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2 pr-3">Mirror</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3 text-right">Latency</th>
                  <th className="pb-2 pr-3 text-right">Bytes</th>
                  <th className="pb-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.map(({ preset, resp: r }) => (
                  <tr key={preset.id} className="border-t border-emerald-100">
                    <td className="py-2 pr-3 font-mono text-slate-800">{new URL(preset.spec.url).hostname}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(r.status, r.ok)}`}>
                        {r.status ?? 'ERR'} {r.statusText ?? ''}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700">{r.elapsedMs} ms</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700">{fmtBytes(r.bodyBytes)}</td>
                    <td className="py-2 text-slate-600">{r.error ?? (r.ok ? 'OK' : r.bodyText.slice(0, 80))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preset buttons */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Gyors-akció előbeállítások</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              title={p.description}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Request form */}
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Method</label>
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="md:col-span-8">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">URL</label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://overpass.kumi.systems/api/interpreter"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Timeout (ms)</label>
          <input
            type="number"
            min={500}
            max={25000}
            step={500}
            value={timeoutMs}
            onChange={e => setTimeoutMs(parseInt(e.target.value, 10) || 10000)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="md:col-span-6">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Headers (JSON)</label>
          <textarea
            value={headersStr}
            onChange={e => setHeadersStr(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder='{ "Content-Type": "application/json" }'
          />
          {headersErr && <p className="mt-1 text-xs font-medium text-rose-600">{headersErr}</p>}
        </div>
        <div className="md:col-span-6">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Body (csak POST/PUT/PATCH/DELETE)</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            disabled={method === 'GET' || method === 'HEAD'}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
            placeholder='data=...'
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {running ? 'Futtatás...' : 'Futtatás'}
        </button>
        {resp && (
          <span className="text-xs text-slate-500">
            {resp.redirected && <>redirect → <span className="font-mono text-slate-700">{resp.finalUrl}</span> · </>}
            content-type: <span className="font-mono text-slate-700">{resp.contentType ?? '?'}</span>
          </span>
        )}
      </div>

      {/* Response */}
      {resp && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className={`inline-block rounded-md border px-2 py-1 text-xs font-bold ${statusBadgeClass(resp.status, resp.ok)}`}>
              {resp.status ?? 'ERR'} {resp.statusText ?? ''}
            </span>
            <span className="text-xs tabular-nums text-slate-600">{resp.elapsedMs} ms</span>
            <span className="text-xs tabular-nums text-slate-600">{fmtBytes(resp.bodyBytes)}</span>
            {resp.bodyTruncated && <span className="text-xs font-medium text-amber-600">(truncated)</span>}
          </div>

          {resp.error && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700">Error</p>
              <p className="mt-1 font-mono text-xs text-rose-800">{resp.error}</p>
            </div>
          )}

          <details className="mb-3" open={!resp.error}>
            <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-800">Response headers ({Object.keys(resp.responseHeaders).length})</summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-100">
              {Object.entries(resp.responseHeaders).map(([k, v]) => `${k}: ${v}`).join('\n')}
            </pre>
          </details>

          <details open={!resp.error}>
            <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-800">Body ({fmtBytes(resp.bodyBytes)}{resp.bodyTruncated ? ', truncated' : ''})</summary>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-100">
              {resp.bodyText || '(empty)'}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
}
