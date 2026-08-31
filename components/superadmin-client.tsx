'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlatformAuthority } from '@/components/superadmin-authority-context';
import SuperadminControlCenter, { type SuperadminDestination } from '@/components/superadmin-control-center';
import SuperadminGtfsImport from '@/components/superadmin-gtfs-import';
import SuperadminDiagnostics from '@/components/superadmin-diagnostics';
import SuperadminOsmImport from '@/components/superadmin-osm-import';
import SuperadminUsersTab from '@/components/superadmin-users-tab';
import SuperadminFeaturesTab from '@/components/superadmin-features-tab';
import SuperadminCommunityRequests from '@/components/superadmin-community-requests';
import SuperadminGovernance from '@/components/superadmin-governance';
import { MAP_THEMES, MAP_THEME_IDS, DEFAULT_THEME_ID, type MapThemeId } from '@/lib/map-theme';
import { invalidateMapThemeCache } from '@/hooks/use-map-theme';
import { useI18n } from '@/src/i18n/useI18n';
import {
  acquireAdminRequestKey,
  isTerminalAdminCommandResponse,
  releaseAdminRequestKey,
} from '@/lib/superadmin/idempotency-client';

export type SuperadminTabId = 'controlCenter' | 'governance' | 'operations' | 'users' | 'features' | 'communityRequests';
const TABS: SuperadminTabId[] = ['controlCenter', 'governance', 'operations', 'users', 'features', 'communityRequests'];

function isTabId(value: string | null): value is SuperadminTabId {
  return value !== null && TABS.includes(value as SuperadminTabId);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type JobEndpoint = { url: string; note?: string };
type Job = { id: string; label: string; description: string; endpoints?: JobEndpoint[]; envVars?: string[] };
const JOBS: Job[] = [
  {
    id: 'bkk_full_sync', label: 'BKK teljes szinkron', description: 'stops/routes + building_stops + alerts (BKK API)',
    endpoints: [{ url: 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where/*', note: 'Futár OBA REST API' }],
    envVars: ['BKKFUTAR_API_KEY'],
  },
  {
    id: 'bkk_stops_cell_0', label: 'BKK stops · Cell 0 (Nyugat)', description: 'stops-routes szinkron — csak 0. cella (nyugati Budapest). Rate limit esetén cellánként fusd.',
    endpoints: [{ url: 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where/stops-for-location.json', note: 'cell=0' }],
    envVars: ['BKKFUTAR_API_KEY'],
  },
  {
    id: 'bkk_stops_cell_1', label: 'BKK stops · Cell 1 (Közép)', description: 'stops-routes szinkron — csak 1. cella (belső Budapest). Rate limit esetén cellánként fusd.',
    endpoints: [{ url: 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where/stops-for-location.json', note: 'cell=1' }],
    envVars: ['BKKFUTAR_API_KEY'],
  },
  {
    id: 'bkk_stops_cell_2', label: 'BKK stops · Cell 2 (Kelet)', description: 'stops-routes szinkron — csak 2. cella (keleti Budapest). Rate limit esetén cellánként fusd.',
    endpoints: [{ url: 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where/stops-for-location.json', note: 'cell=2' }],
    envVars: ['BKKFUTAR_API_KEY'],
  },
  {
    id: 'bkk_building_stops', label: 'BKK épület–megálló számítás', description: 'building_stops újraszámítás DB-ből (transit_stops)',
  },
  {
    id: 'bkk_alerts', label: 'BKK alerts', description: 'transit_alerts frissítés (BKK GTFS-RT, valós idejű)',
    endpoints: [{ url: 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where/*', note: 'Futár OBA REST API' }],
    envVars: ['BKKFUTAR_API_KEY'],
  },
  {
    id: 'gtfs_derive_refs', label: 'GTFS → Megálló járatrefs', description: 'transit_stops.route_refs + route_type frissítése transit_stop_routes alapján',
  },
  {
    id: 'air_quality_refresh', label: 'Levegőminőség frissítés', description: 'AQI + heatmap párhuzamos frissítés',
    endpoints: [
      { url: 'https://api.waqi.info/feed/{city}/', note: 'AQICN AQI feed' },
      { url: 'https://api.waqi.info/map/bounds/', note: 'AQICN map bounds' },
    ],
    envVars: ['AQICN_API_TOKEN'],
  },
  {
    id: 'env_refresh_green', label: 'Zöld cache frissítés', description: 'OSM Overpass lekérdezés minden épületre, 7 napos cache',
    endpoints: [
      { url: 'https://overpass-api.de/api/interpreter', note: 'OSM Overpass QL — szabad, kulcs nélkül' },
      { url: 'https://nominatim.openstreetmap.org/search', note: 'Geocódolás — szabad, kulcs nélkül' },
    ],
    envVars: [],
  },
  {
    id: 'satellite_refresh', label: 'Műhold NDVI frissítés', description: 'Sentinel-2 NDVI minden épületre, 7 napos cache',
    endpoints: [
      { url: 'https://earth-search.aws.element84.com/v1/search', note: 'Element84 STAC (Sentinel-2) — szabad, kulcs nélkül' },
      { url: 'https://titiler.xyz/cog/point/{lon},{lat}', note: 'Titiler COG pixel lekérdezés — szabad, kulcs nélkül' },
    ],
    envVars: [],
  },
  {
    id: 'urban_refresh', label: 'Kompakt & Élhetőség frissítés', description: 'OSM amenity + BKK transit minden épületre, 30 napos cache',
    endpoints: [
      { url: 'https://overpass-api.de/api/interpreter', note: 'OSM Overpass QL — szabad, kulcs nélkül' },
      { url: 'https://nominatim.openstreetmap.org/search', note: 'Geocódolás — szabad, kulcs nélkül' },
    ],
    envVars: [],
  },
  {
    id: 'urban_atlas_refresh', label: 'EU Urban Atlas frissítés', description: 'Copernicus Urban Atlas 2018 területhasználat minden épületre — 180 napos cache',
    endpoints: [
      { url: 'https://image.discomap.eea.europa.eu/arcgis/rest/services/UrbanAtlas/UA2018/MapServer/0/query', note: 'EEA ArcGIS REST — EU nyílt adat, kulcs nélkül' },
    ],
    envVars: [],
  },
  {
    id: 'budapest_import', label: 'Budapest Nyílt Adat importálás', description: 'Budapest fa-leltár + parknyilvántartás letöltése és Supabase-be importálása (CKAN)',
    endpoints: [
      { url: 'https://opendata.budapest.hu/api/3/action/package_search', note: 'CKAN dataset discovery — Budapest Főváros nyílt adat' },
      { url: 'https://opendata.budapest.hu/api/3/action/datastore_search', note: 'CKAN paginated record download — fa-leltár + parkok' },
    ],
    envVars: [],
  },
  {
    id: 'ndvi_hungary_render', label: 'NDVI Magyarország render', description: 'MODIS Terra/Aqua 8-Day NDVI Magyarország bbox-re, 5 felbontásban (1024×430 → 16384×6880 Brutális tiled mozaik px). 100% ingyenes — NASA GIBS WMS (kulcs nélkül). Felhasználó-oldalon toggle barral váltható a panelen.',
    endpoints: [
      { url: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi', note: 'NASA GIBS WMS — MODIS Terra/Aqua 8-Day NDVI rétegek, EOSDIS-CDN-en, kulcs nélkül' },
    ],
    envVars: [],
  },
  // ── Cycling data sources (v0.7.8) ───────────────────────────────────────
  {
    id: 'cycling_bkk_gbfs_status',
    label: 'Cycling · BKK Bubi GBFS station_status',
    description: 'MOL Bubi állomások aktuális kerékpár/dokkoló státusza percenként → gbfs.station_status (partíciós havi tábla)',
    endpoints: [{ url: 'https://gbfs.bubi.bkk.hu/gbfs/v3/station_status.json', note: 'BKK GBFS v3 — szabad, kulcs nélkül' }],
    envVars: [],
  },
  {
    id: 'cycling_bkk_gbfs_info',
    label: 'Cycling · BKK Bubi GBFS station_information',
    description: 'MOL Bubi állomások meta (név, lat, lon, capacity) → gbfs.station_information',
    endpoints: [{ url: 'https://gbfs.bubi.bkk.hu/gbfs/v3/station_information.json', note: 'BKK GBFS v3' }],
    envVars: [],
  },
  {
    id: 'cycling_waymarked_trails',
    label: 'Cycling · Waymarked Trails Magyarország',
    description: 'EuroVelo + nemzeti/regionális/lokális kerékpárrelációk OSM-derived REST API-ról → cycling.route (1 req/sec rate-limit, várhatóan ~50-200 reláció)',
    endpoints: [{ url: 'https://cycling.waymarkedtrails.org/api/v1/list/by_area', note: 'Waymarked Trails REST — szabad, kulcs nélkül' }],
    envVars: [],
  },
  {
    id: 'cycling_kenyi_import',
    label: 'Cycling · Magyar Közút KENYI (placeholder)',
    description: 'KENYI állami kerékpárút-nyilvántartás — FOIA-snapshot manuális XLSX upload-ra vár (még nincs UI)',
    endpoints: [{ url: 'manual', note: 'kormany.hu PDF + Infotv. 28. § adatigénylés Magyar Közút Nzrt.-től' }],
    envVars: [],
  },
];

interface BkkRateLimits {
  cell_delay_ms:  number;
  retry_max:      number;
  retry_wait_ms:  number;
  cells_per_run:  number;
}

interface EnvHealth {
  envVars: Record<string, { set: boolean }>;
  keyAnalysis: {
    serviceConfigured: boolean;
    anonConfigured: boolean;
    serviceOnly: boolean;
    noWhitespace: boolean;
  };
  supabaseTests: Array<{ label: string; ok: boolean; count: number | null }>;
  checkedAt: string;
}

interface TableStat {
  name: string;
  label: string;
  count: number | null;
  lastUpdated: string | null;
  error: string | null;
  group?: string;
}

const GROUP_LABELS: Record<string, string> = {
  transit:     'Transit (élő adatok)',
  gtfs:        'GTFS statikus import',
  other:       'Egyéb',
  environment: 'Környezeti adatok',
};

interface JobLog {
  id: string;
  job_id: string;
  triggered_by: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  result: unknown;
  started_at: string;
  finished_at: string | null;
}

const BKK_DEFAULTS: BkkRateLimits = { cell_delay_ms: 5000, retry_max: 3, retry_wait_ms: 90000, cells_per_run: 0 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' });
}

function duration(start: string, end: string | null): string {
  if (!end) return 'fut…';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} perc`;
}

const STATUS_PILL: Record<string, string> = {
  ok:      'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
  error:   'bg-rose-50 text-rose-800 ring-1 ring-rose-200',
  partial: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
  running: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuperadminClient() {
  const { t } = useI18n();
  const authority = usePlatformAuthority();
  const hasCapability = useCallback(
    (capability: string) => authority.mode === 'operator' && authority.capabilityKeys.includes(capability),
    [authority],
  );
  const readOnlyBreakGlass = authority.mode === 'break_glass';
  const visibleTabs = useMemo<SuperadminTabId[]>(() => TABS.filter(tab => {
    if (tab === 'controlCenter') return true;
    if (readOnlyBreakGlass) return true;
    if (tab === 'governance') return authority.capabilityKeys.some(key =>
      key === 'platform.overview.read'
      || key.startsWith('platform.operators.')
      || key.startsWith('platform.approvals.')
      || key.startsWith('platform.support.')
      || key.startsWith('platform.release.'),
    );
    if (tab === 'operations') return authority.capabilityKeys.some(key =>
      key.startsWith('platform.health.')
      || key.startsWith('platform.integrations.')
      || key.startsWith('platform.jobs.')
      || key.startsWith('platform.settings.')
      || key.startsWith('platform.migrations.'),
    );
    if (tab === 'users') return authority.capabilityKeys.some(key => key.startsWith('platform.users.'));
    if (tab === 'features') return authority.capabilityKeys.some(key => key.startsWith('platform.features.'));
    return authority.capabilityKeys.some(key => key.startsWith('platform.communities.'));
  }), [authority.capabilityKeys, readOnlyBreakGlass]);
  const canReadSettings = readOnlyBreakGlass
    || hasCapability('platform.settings.read')
    || hasCapability('platform.settings.manage');
  const canManageSettings = hasCapability('platform.settings.manage');
  const canRunJobs = hasCapability('platform.jobs.run');
  const canApplyMigrations = hasCapability('platform.migrations.apply');
  const [activeTab, setActiveTab] = useState<SuperadminTabId>('controlCenter');

  const selectTab = useCallback((tab: SuperadminTabId) => {
    if (!visibleTabs.includes(tab)) return;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') === tab) return;
    url.searchParams.set('tab', tab);
    window.history.pushState({ superadminTab: tab }, '', url);
  }, [visibleTabs]);

  useEffect(() => {
    function syncTabFromUrl() {
      const url = new URL(window.location.href);
      const requestedTab = url.searchParams.get('tab');
      if (requestedTab === null) {
        setActiveTab('controlCenter');
        return;
      }
      if (isTabId(requestedTab) && visibleTabs.includes(requestedTab)) {
        setActiveTab(requestedTab);
        return;
      }

      url.searchParams.set('tab', 'controlCenter');
      window.history.replaceState({ superadminTab: 'controlCenter' }, '', url);
      setActiveTab('controlCenter');
    }

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, [visibleTabs]);

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % visibleTabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + visibleTabs.length) % visibleTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = visibleTabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = visibleTabs[nextIndex];
    selectTab(nextTab);
    document.getElementById(`superadmin-tab-${nextTab}`)?.focus();
  }

  // Job runners
  const [running, setRunning]   = useState<string | null>(null);
  const [armedJob, setArmedJob] = useState<string | null>(null);
  const [results, setResults]   = useState<Record<string, unknown>>({});
  const [jobReason, setJobReason] = useState('');
  const [jobStepUpHref, setJobStepUpHref] = useState<string | null>(null);

  // Map theme settings
  const [mapTheme, setMapTheme]     = useState<MapThemeId>(DEFAULT_THEME_ID);
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSaveMsg, setThemeSaveMsg] = useState('');

  // BKK rate-limit settings
  const [bkkSettings, setBkkSettings] = useState<BkkRateLimits>(BKK_DEFAULTS);
  const [bkkSaving, setBkkSaving]     = useState(false);
  const [bkkSaveMsg, setBkkSaveMsg]   = useState('');
  const [settingsState, setSettingsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [settingsReason, setSettingsReason] = useState('');

  // DB stats
  const [stats, setStats]           = useState<TableStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsFetchedAt, setStatsFetchedAt] = useState<string | null>(null);
  const [statsError, setStatsError] = useState(false);

  // Health check
  const [health, setHealth]           = useState<EnvHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(false);

  // Job logs
  const [logs, setLogs]           = useState<JobLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logoutRunning, setLogoutRunning] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  // DB migrations
  const [migrRunning, setMigrRunning] = useState(false);
  const [migrArmed, setMigrArmed] = useState(false);
  const [migrationReason, setMigrationReason] = useState('');
  const [migrResult, setMigrResult]   = useState<{
    ok: boolean;
    results: Array<{ name: string; ok: boolean; status: 'already_applied' | 'applied' | 'failed'; method?: string; error?: string }>;
    replayed?: boolean;
    approvalPending?: boolean;
    approvalId?: string;
    summary?: { applied: number; already_applied: number; failed: number };
    error?: string;
  } | null>(null);

  // ── Load on mount ────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'operations' || !canReadSettings) return;
    setSettingsState('loading');
    fetch('/api/superadmin/settings')
      .then(async r => {
        const body = await r.json().catch(() => null) as { settings?: Array<{ key: string; value: unknown }> } | null;
        if (!r.ok || !body || !Array.isArray(body.settings)) throw new Error('SETTINGS_LOAD_FAILED');
        return body;
      })
      .then((data: { settings?: Array<{ key: string; value: unknown }> }) => {
        const bkkRow = data.settings?.find(s => s.key === 'bkk_rate_limits');
        if (bkkRow?.value && typeof bkkRow.value === 'object') {
          setBkkSettings({ ...BKK_DEFAULTS, ...(bkkRow.value as Partial<BkkRateLimits>) });
        }
        const themeRow = data.settings?.find(s => s.key === 'map_theme');
        if (themeRow?.value && typeof themeRow.value === 'object') {
          const id = (themeRow.value as { id?: string }).id;
          if (id && MAP_THEME_IDS.includes(id as MapThemeId)) setMapTheme(id as MapThemeId);
        }
        setSettingsState('ready');
      })
      .catch(() => setSettingsState('error'));
  }, [activeTab, canReadSettings]);

  const loadHealth = useCallback(() => {
    setHealthLoading(true);
    setHealthError(false);
    fetch('/api/superadmin/health')
      .then(async r => {
        if (!r.ok) throw new Error('HEALTH_LOAD_FAILED');
        return r.json() as Promise<EnvHealth>;
      })
      .then((data: EnvHealth) => setHealth(data))
      .catch(() => {
        setHealth(null);
        setHealthError(true);
      })
      .finally(() => setHealthLoading(false));
  }, []);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    setStatsError(false);
    fetch('/api/superadmin/stats')
      .then(async r => {
        const body = await r.json().catch(() => null) as { tables?: TableStat[]; fetchedAt?: string } | null;
        if (!r.ok || !body || !Array.isArray(body.tables)) throw new Error('STATS_LOAD_FAILED');
        return body;
      })
      .then((data: { tables?: TableStat[]; fetchedAt?: string }) => {
        setStats(data.tables ?? []);
        setStatsFetchedAt(data.fetchedAt ?? null);
      })
      .catch(() => setStatsError(true))
      .finally(() => setStatsLoading(false));
  }, []);

  const loadLogs = useCallback(() => {
    setLogsLoading(true);
    setLogsError(false);
    fetch('/api/superadmin/jobs/logs?limit=30')
      .then(async r => {
        const body = await r.json().catch(() => null) as { logs?: JobLog[] } | null;
        if (!r.ok || !body || !Array.isArray(body.logs)) throw new Error('LOGS_LOAD_FAILED');
        return body;
      })
      .then((data: { logs?: JobLog[] }) => setLogs(data.logs ?? []))
      .catch(() => setLogsError(true))
      .finally(() => setLogsLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'operations') return;
    loadStats();
    loadLogs();
    loadHealth();
  }, [activeTab, loadStats, loadLogs, loadHealth]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function saveMapTheme(id: MapThemeId) {
    const reason = settingsReason.trim();
    if (settingsState !== 'ready' || !canManageSettings) return;
    if (reason.length < 10) {
      setThemeSaveMsg(`✗ ${t('superadmin.operationsUi.reasonRequired')}`);
      return;
    }
    const requestScope = `setting:map_theme:${id}:${reason}`;
    const idempotencyKey = acquireAdminRequestKey(requestScope);
    setThemeSaving(true);
    setThemeSaveMsg('');
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'map_theme', value: { id }, reason, idempotencyKey }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string; stepUpHref?: string; value?: { id?: string } };
      if (res.status === 428 && body.stepUpHref) {
        window.location.assign(body.stepUpHref);
        return;
      }
      if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(requestScope);
      if (res.ok && body.value?.id === id) {
        setMapTheme(id);
        invalidateMapThemeCache(id);
        setThemeSaveMsg('✓ Mentve');
      } else {
        setThemeSaveMsg(`✗ Hiba: ${body.error ?? res.status}`);
      }
    } catch {
      setThemeSaveMsg(`✗ ${t('superadmin.operationsUi.saveFailed')}`);
    } finally {
      setThemeSaving(false);
      setTimeout(() => setThemeSaveMsg(''), 5000);
    }
  }

  async function saveBkkSettings() {
    const reason = settingsReason.trim();
    if (settingsState !== 'ready' || !canManageSettings) return;
    if (reason.length < 10) {
      setBkkSaveMsg(`✗ ${t('superadmin.operationsUi.reasonRequired')}`);
      return;
    }
    const valid = Number.isInteger(bkkSettings.cell_delay_ms)
      && bkkSettings.cell_delay_ms >= 1_000 && bkkSettings.cell_delay_ms <= 120_000
      && Number.isInteger(bkkSettings.retry_max) && bkkSettings.retry_max >= 0 && bkkSettings.retry_max <= 10
      && Number.isInteger(bkkSettings.retry_wait_ms) && bkkSettings.retry_wait_ms >= 1_000 && bkkSettings.retry_wait_ms <= 600_000
      && Number.isInteger(bkkSettings.cells_per_run) && bkkSettings.cells_per_run >= 0 && bkkSettings.cells_per_run <= 3;
    if (!valid) {
      setBkkSaveMsg(`✗ ${t('superadmin.operationsUi.invalidSettings')}`);
      return;
    }
    setBkkSaving(true);
    setBkkSaveMsg('');
    const requestScope = `setting:bkk_rate_limits:${JSON.stringify(bkkSettings)}:${reason}`;
    const idempotencyKey = acquireAdminRequestKey(requestScope);
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'bkk_rate_limits', value: bkkSettings, reason, idempotencyKey }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string; stepUpHref?: string };
      if (res.status === 428 && body.stepUpHref) {
        window.location.assign(body.stepUpHref);
        return;
      }
      if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(requestScope);
      setBkkSaveMsg(res.ok ? '✓ Mentve' : `✗ ${body.error ?? t('superadmin.operationsUi.saveFailed')}`);
    } catch {
      setBkkSaveMsg(`✗ ${t('superadmin.operationsUi.saveFailed')}`);
    } finally {
      setBkkSaving(false);
      setTimeout(() => setBkkSaveMsg(''), 3000);
    }
  }

  async function runJob(jobId: string) {
    const reason = jobReason.trim();
    if (!canRunJobs || reason.length < 10 || reason.length > 1_000) return;
    setArmedJob(null);
    setRunning(jobId);
    setJobStepUpHref(null);
    const requestScope = `job:${jobId}`;
    const idempotencyKey = acquireAdminRequestKey(requestScope);
    try {
      const res = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: jobId, idempotencyKey, reason }),
      });
      const body = await res.json() as Record<string, unknown>;
      if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(requestScope);
      if (
        res.status === 428
        && typeof body.stepUpHref === 'string'
        && body.stepUpHref.startsWith('/account/security?')
      ) {
        setJobStepUpHref(body.stepUpHref);
      }
      setResults(prev => ({ ...prev, [jobId]: { status: res.status, body } }));
    } catch {
      setResults(prev => ({
        ...prev,
        [jobId]: { status: 0, body: { ok: false, error: 'JOB_REQUEST_FAILED' } },
      }));
    } finally {
      setRunning(null);
      // Refresh logs + stats after a job finishes or fails at transport level.
      setTimeout(() => { loadLogs(); loadStats(); }, 800);
    }
  }

  async function applyMigrations() {
    const reason = migrationReason.trim();
    if (!canApplyMigrations || reason.length < 10 || reason.length > 1_000) return;
    setMigrRunning(true);
    setMigrArmed(false);
    setMigrResult(null);
    const requestScope = `migration:request-approval:${reason}`;
    const idempotencyKey = acquireAdminRequestKey(requestScope);
    try {
      const res = await fetch('/api/superadmin/apply-migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          confirmation: 'APPLY_PENDING_MIGRATIONS',
          reason,
          idempotencyKey,
        }),
      });
      const body = await res.json();
      if (res.status === 428 && typeof body?.stepUpHref === 'string') {
        window.location.assign(body.stepUpHref);
        return;
      }
      if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(requestScope);
      const replaySummary = body?.replayed === true && body?.result && typeof body.result === 'object'
        ? {
            applied: Number(body.result.applied ?? 0),
            already_applied: Number(body.result.already_applied ?? 0),
            failed: Number(body.result.failed ?? 0),
          }
        : undefined;
      setMigrResult({
        ok: body?.ok === true,
        results: Array.isArray(body?.results) ? body.results : [],
        replayed: body?.replayed === true,
        approvalPending: body?.approvalPending === true,
        ...(typeof body?.result?.approval_id === 'string' ? { approvalId: body.result.approval_id } : {}),
        ...(replaySummary ? { summary: replaySummary } : {}),
        ...(typeof body?.error === 'string' ? { error: body.error } : {}),
      });
    } catch {
      setMigrResult({ ok: false, error: 'MIGRATION_REQUEST_FAILED', results: [] });
    } finally {
      setMigrRunning(false);
    }
  }

  async function logout() {
    setLogoutRunning(true);
    setLogoutError(false);
    try {
      const response = await fetch('/api/superadmin/logout', { method: 'POST' });
      if (!response.ok) throw new Error('LOGOUT_FAILED');
      window.location.href = '/superadmin/login';
    } catch {
      setLogoutError(true);
    } finally {
      setLogoutRunning(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main id="superadmin-main-content" className="app-surface min-h-screen p-4 sm:p-6" style={{ backgroundImage: 'none' }}>
      <a href="#superadmin-navigation" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white">
        {t('superadmin.header.skipToNavigation')}
      </a>
      <div className="mx-auto max-w-[1480px] space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">{t('superadmin.header.eyebrow')}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-canvas-ink">{t('superadmin.header.title')}</h1>
            <p className="mt-1 text-sm text-canvas-muted">{t('superadmin.header.subtitle')}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button type="button" onClick={logout} disabled={logoutRunning} className="btn-secondary min-h-11 px-4 py-2 disabled:opacity-50">
              {logoutRunning ? t('superadmin.operationsUi.loggingOut') : t('superadmin.header.logout')}
            </button>
            {logoutError && <p role="alert" className="text-xs font-semibold text-rose-800">{t('superadmin.operationsUi.logoutFailed')}</p>}
          </div>
        </div>

        {/* Tab nav */}
        <div id="superadmin-navigation" role="tablist" aria-label={t('superadmin.navigation.ariaLabel')} className="thin-scroll flex gap-0.5 overflow-x-auto rounded-xl border border-canvas-line bg-canvas-sage p-1">
          {visibleTabs.map((tab, index) => (
            <button
              key={tab}
              id={`superadmin-tab-${tab}`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`superadmin-panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => selectTab(tab)}
              onKeyDown={event => handleTabKeyDown(event, index)}
              className={`min-h-11 min-w-fit flex-1 rounded-lg px-4 py-2 text-sm font-medium ${
                activeTab === tab
                  ? 'bg-white text-canvas-ink shadow-sm ring-1 ring-canvas-line'
                  : 'text-canvas-muted hover:bg-white/70 hover:text-canvas-ink'
              }`}
            >
              {t(`superadmin.navigation.${tab}`)}
            </button>
          ))}
        </div>

        {activeTab === 'controlCenter' && (
          <section id="superadmin-panel-controlCenter" role="tabpanel" aria-labelledby="superadmin-tab-controlCenter">
            <SuperadminControlCenter onOpenTab={(tab: SuperadminDestination) => selectTab(tab)} />
          </section>
        )}

        {activeTab === 'governance' && (
          <section id="superadmin-panel-governance" role="tabpanel" aria-labelledby="superadmin-tab-governance">
            <SuperadminGovernance />
          </section>
        )}

        {/* Felhasználók tab */}
        {activeTab === 'users' && (
          <section id="superadmin-panel-users" role="tabpanel" aria-labelledby="superadmin-tab-users" className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
            <SuperadminUsersTab />
          </section>
        )}

        {/* Funkció & Tier tab */}
        {activeTab === 'features' && (
          <section id="superadmin-panel-features" role="tabpanel" aria-labelledby="superadmin-tab-features" className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
            <SuperadminFeaturesTab />
          </section>
        )}

        {/* Lakóközösség-ellenőrzési kérelmek */}
        {activeTab === 'communityRequests' && (
          <section id="superadmin-panel-communityRequests" role="tabpanel" aria-labelledby="superadmin-tab-communityRequests" className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
            <SuperadminCommunityRequests />
          </section>
        )}

        {/* Existing technical controls stay available without behavior changes. */}
        {activeTab === 'operations' && (<div id="superadmin-panel-operations" role="tabpanel" aria-labelledby="superadmin-tab-operations" className="space-y-6">

        {settingsState === 'loading' && (
          <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
            {t('superadmin.operationsUi.settingsLoading')}
          </p>
        )}
        {settingsState === 'error' && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {t('superadmin.operationsUi.settingsUnavailable')}
          </p>
        )}

        {/* Integration status cards */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { name: 'BKK Futár',   key: 'BKKFUTAR_API_KEY',        note: 'LIMIT_EXCEEDED esetén várj éjfélig (UTC reset)' },
            { name: 'Supabase',    key: 'NEXT_PUBLIC_SUPABASE_URL', note: '' },
            { name: 'Air Quality', key: 'AQICN_API_TOKEN',          note: 'Ha Sanghaj jelenik meg, a demo token aktív — regisztrálj valódi kulcsot: aqicn.org/data-platform/token' },
          ].map(({ name, key, note }) => {
            const configured = health?.envVars[key]?.set;
            return (
              <div key={name} className="rounded-2xl border border-canvas-line bg-white p-4 shadow-card">
                <h3 className="text-sm font-semibold text-slate-700">{name}</h3>
                <p className={`mt-2 text-lg font-semibold ${
                  configured === true
                    ? 'text-emerald-800'
                    : configured === false
                      ? 'text-rose-800'
                      : 'text-canvas-muted'
                }`}>
                  {healthError
                    ? t('superadmin.operationsHealth.unavailable')
                    : configured === true
                    ? t('superadmin.operationsHealth.configured')
                    : configured === false
                      ? t('superadmin.operationsHealth.missing')
                      : t('superadmin.operationsHealth.checking')}
                </p>
                <p className="mt-1 text-xs text-canvas-muted">{t('superadmin.operationsHealth.envKey')}: {key}</p>
                {note && <p className="mt-2 text-[11px] text-amber-900">{note}</p>}
              </div>
            );
          })}
        </section>

        {/* Env / connectivity health */}
        <section className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-canvas-ink">Környezeti változók és kapcsolat</h2>
            <button
              onClick={loadHealth}
              disabled={healthLoading}
              className="min-h-11 rounded-xl border border-canvas-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-canvas-sage disabled:opacity-50"
            >
              {healthLoading ? 'Töltés…' : '↻ Ellenőrzés'}
            </button>
          </div>
          {!health ? (
            <p role={healthError ? 'alert' : 'status'} className={`text-sm ${healthError ? 'text-rose-800' : 'text-canvas-muted'}`}>
              {healthError ? t('superadmin.operationsHealth.unavailable') : t('superadmin.operationsHealth.loading')}
            </p>
          ) : (
            <div className="space-y-4">
              {/* Env vars table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-canvas-line text-left text-[10px] font-semibold uppercase tracking-wider text-canvas-muted">
                      <th className="pb-1.5 pr-4">Változó</th>
                      <th className="pb-1.5 pr-3">Be van állítva?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(health.envVars).map(([k, v]) => (
                      <tr key={k} className="border-b border-slate-200 last:border-0">
                        <td className="py-1.5 pr-4 font-mono font-semibold text-slate-700">{k}</td>
                        <td className="py-1.5 pr-3">
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${v.set ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'}`}>
                            {v.set ? '✓ igen' : '✗ hiányzik'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Key analysis */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: t('superadmin.operationsHealth.serviceConfigured'), ok: health.keyAnalysis.serviceConfigured },
                  { label: t('superadmin.operationsHealth.anonConfigured'), ok: health.keyAnalysis.anonConfigured },
                  { label: t('superadmin.operationsHealth.serviceOnly'), ok: health.keyAnalysis.serviceOnly },
                  { label: t('superadmin.operationsHealth.noWhitespace'), ok: health.keyAnalysis.noWhitespace },
                ].map(item => (
                  <span key={item.label} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.ok ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'}`}>
                    {item.ok ? '✓' : '✗'} {item.label}
                  </span>
                ))}
              </div>
              {/* Supabase connectivity */}
              <div className="flex flex-wrap gap-3">
                {health.supabaseTests.map(test => (
                  <div key={test.label} className={`rounded-xl border px-3 py-2 text-xs ${test.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                    <p className="font-semibold text-slate-700">{test.label}</p>
                    {test.ok
                      ? <p className="text-emerald-800">✓ OK — buildings rekord: {test.count}</p>
                      : <p className="text-rose-800">✗ {t('superadmin.operationsHealth.connectionFailed')}</p>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* DB stats */}
        <section className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-canvas-ink">Adatbázis állapot</h2>
              {statsFetchedAt && (
                <p className="text-xs text-canvas-muted">Lekérve: {fmt(statsFetchedAt)}</p>
              )}
            </div>
            <button
              onClick={loadStats}
              disabled={statsLoading}
              className="min-h-11 rounded-xl border border-canvas-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-canvas-sage disabled:opacity-50"
            >
              {statsLoading ? 'Töltés…' : '↻ Frissítés'}
            </button>
          </div>
           {statsError ? (
             <p role="alert" className="text-sm font-semibold text-rose-800">{t('superadmin.operationsUi.statsUnavailable')}</p>
           ) : stats.length === 0 && !statsLoading ? (
            <p className="text-sm text-canvas-muted">Nincs adat — próbáld frissíteni.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-canvas-line text-left text-xs font-semibold uppercase tracking-wider text-canvas-muted">
                    <th className="pb-2 pr-4">Tábla</th>
                    <th className="pb-2 pr-4 text-right">Rekordok</th>
                    <th className="pb-2">Utolsó frissítés</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.reduce<React.ReactNode[]>((acc, s, i) => {
                    const prevGroup = i > 0 ? stats[i - 1].group : undefined;
                    if (s.group && s.group !== prevGroup) {
                      acc.push(
                        <tr key={`group-${s.group}`}>
                          <td colSpan={3} className={`pb-1 ${i > 0 ? 'border-t border-canvas-line pt-4' : 'pt-1'}`}>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-canvas-muted">
                              {GROUP_LABELS[s.group] ?? s.group}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    acc.push(
                      <tr key={s.name} className="border-b border-slate-200 last:border-0 hover:bg-canvas-sage">
                        <td className="py-2 pr-4">
                          <span className="font-medium text-canvas-ink">{s.label}</span>
                          <span className="ml-2 font-mono text-[10px] text-canvas-muted">{s.name}</span>
                          {s.error && <span className="ml-2 text-[10px] text-rose-800">{s.error}</span>}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono font-semibold tabular-nums text-canvas-ink">
                          {s.count === null ? '—' : s.count.toLocaleString('en-US')}
                        </td>
                        <td className="py-2 text-canvas-muted">{fmt(s.lastUpdated)}</td>
                      </tr>
                    );
                    return acc;
                  }, [])}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* DB Migrations */}
        <section className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-canvas-ink">Adatbázis migrációk</h2>
              <p className="text-xs text-canvas-muted">Hiányzó táblák és alapértelmezett adatok létrehozása a Panellako Supabase projektben.</p>
            </div>
            {!migrArmed && (
              <button
                type="button"
                onClick={() => setMigrArmed(true)}
                disabled={!canApplyMigrations || migrRunning}
                className="min-h-11 rounded-xl border border-brand-200 bg-canvas-sage px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-100 disabled:opacity-50"
              >
                {migrRunning
                  ? t('superadmin.operationsUi.migrationRequestSending')
                  : canApplyMigrations
                    ? t('superadmin.operationsUi.migrationRequest')
                    : t('superadmin.operationsUi.readOnly')}
              </button>
            )}
          </div>
          {migrArmed && (
            <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">{t('superadmin.operationsUi.migrationConfirmTitle')}</p>
              <p className="mt-1 text-xs leading-5">{t('superadmin.operationsUi.migrationConfirmHint')}</p>
              <label htmlFor="platform-migration-reason" className="mt-3 block text-xs font-semibold">{t('superadmin.operationsUi.reasonLabel')}</label>
              <textarea
                id="platform-migration-reason"
                value={migrationReason}
                onChange={event => setMigrationReason(event.target.value)}
                minLength={10}
                maxLength={1_000}
                rows={2}
                className="input-base mt-1 w-full resize-y"
                placeholder={t('superadmin.operationsUi.reasonRequired')}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={applyMigrations} disabled={migrationReason.trim().length < 10 || migrationReason.trim().length > 1_000} className="btn-primary min-h-11 px-4 py-2 text-sm disabled:opacity-50">
                  {t('superadmin.operationsUi.requestApproval')}
                </button>
                <button type="button" onClick={() => setMigrArmed(false)} className="btn-secondary min-h-11 px-4 py-2 text-sm">
                  {t('superadmin.operationsUi.cancel')}
                </button>
              </div>
            </div>
          )}
          {migrResult && (
            <div className="space-y-2">
              {migrResult.approvalPending && (
                <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                  <p className="font-semibold">{t('superadmin.operationsUi.migrationApprovalReady')}</p>
                  <p className="mt-1 text-xs">{t('superadmin.operationsUi.migrationApprovalHint')}</p>
                  {migrResult.approvalId ? <p className="mt-1 font-mono text-[11px]">{migrResult.approvalId}</p> : null}
                  <button type="button" className="btn-secondary mt-3 min-h-11 px-4 py-2" onClick={() => selectTab('governance')}>{t('superadmin.operationsUi.openGovernance')}</button>
                </div>
              )}
              {migrResult.replayed && migrResult.summary && (
                <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                  <p className="font-semibold">{t('superadmin.operationsUi.migrationReplay')}</p>
                  <p className="mt-1 text-xs">
                    {t('superadmin.operationsUi.migrationApplied')}: {migrResult.summary.applied} · {t('superadmin.operationsUi.migrationAlreadyApplied')}: {migrResult.summary.already_applied} · {t('superadmin.operationsUi.migrationFailed')}: {migrResult.summary.failed}
                  </p>
                </div>
              )}
              {migrResult.error && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                  A migráció nem fejeződött be: {migrResult.error}
                </div>
              )}
              {migrResult.results.map(r => (
                <div key={r.name} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${r.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                  <span className={`font-semibold ${r.ok ? 'text-emerald-800' : 'text-rose-800'}`}>{r.ok ? '✓' : '✗'}</span>
                  <span className="font-mono text-xs text-slate-700">{r.name}</span>
                  {r.ok && r.status === 'already_applied' && <span className="text-[11px] text-canvas-muted">(már alkalmazva volt)</span>}
                  {r.ok && r.status === 'applied' && r.method && <span className="text-[11px] text-emerald-800">(most alkalmazva — {r.method})</span>}
                  {!r.ok && r.error && <span className="text-xs text-rose-800">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </section>

        {canReadSettings && (
          <section className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
            <h2 className="text-lg font-semibold text-canvas-ink">{t('superadmin.operationsUi.settingsReasonTitle')}</h2>
            <p className="mt-1 text-xs text-canvas-muted">
              {canManageSettings
                ? t('superadmin.operationsUi.settingsReasonManageHint')
                : t('superadmin.operationsUi.settingsReasonReadHint')}
            </p>
            <textarea
              value={settingsReason}
              onChange={event => setSettingsReason(event.target.value)}
              disabled={!canManageSettings}
              minLength={10}
              maxLength={1_000}
              rows={2}
              className="input-base mt-3 w-full resize-y disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={t('superadmin.operationsUi.reasonRequired')}
              aria-label={t('superadmin.operationsUi.settingsReasonTitle')}
            />
          </section>
        )}

        {/* Map Theme Selector */}
        {canReadSettings && <section className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-canvas-ink">Térképstílus</h2>
              <p className="text-xs text-canvas-muted">A kiválasztott stílus minden felhasználói térképnézeten érvényes — oldalfrissítés után életbe lép.</p>
            </div>
            {themeSaveMsg && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${themeSaveMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'}`}>
                {themeSaveMsg}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MAP_THEME_IDS.map(id => {
              const t = MAP_THEMES[id];
              const active = mapTheme === id;
              return (
                <button
                  key={id}
                  onClick={() => saveMapTheme(id)}
                  disabled={!canManageSettings || settingsReason.trim().length < 10 || themeSaving || settingsState !== 'ready'}
                  aria-pressed={active}
                  className={`rounded-xl border-2 p-3 text-left disabled:opacity-60 ${
                    active
                      ? 'border-brand-700 bg-canvas-sage'
                      : 'border-canvas-line bg-white hover:border-brand-300 hover:bg-canvas-sage'
                  }`}
                >
                  {/* Color swatches */}
                  <div className="mb-2 flex gap-1">
                    {t.swatchColors.map((c, i) => (
                      <span key={i} className="h-4 w-4 rounded-full border border-slate-300" style={{ background: c }} />
                    ))}
                  </div>
                  <p className={`text-xs font-semibold ${active ? 'text-brand-900' : 'text-canvas-ink'}`}>{t.labelHu}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-canvas-muted line-clamp-2">{t.description.split(' — ')[0]}</p>
                  {active && (
                    <span className="mt-2 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-900 ring-1 ring-brand-200">✓ Aktív</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>}

        {/* BKK Rate Limit Settings */}
        {canReadSettings && <section className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
          <h2 className="mb-1 text-lg font-semibold text-canvas-ink">BKK API rate-limit beállítások</h2>
          <div className="mb-4 space-y-1 rounded-xl border border-amber-200 bg-canvas-warm p-3 text-xs text-amber-900">
            <p className="font-semibold">BKK Futár API rate limit — amit tudunk</p>
            <p>A BKK nem publikálja pontosan a limiteket, de a következők érvényesek a tapasztalatok alapján:</p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>A <code className="rounded bg-amber-100 px-1">LIMIT_EXCEEDED</code> (HTTP 400, code: 400) a napi/óránkénti kvóta kimerülését jelzi</li>
              <li>Az ingyenes tesztkulcs valószínűleg <strong>~100–500 kérés/nap</strong> korláttal rendelkezik</li>
              <li>A kvóta valószínűleg <strong>éjfélkor UTC-ben resetel</strong> — ekkor próbáld újra</li>
              <li>Produkciós kulcsért vedd fel a kapcsolatot a BKK-val: <strong>futar@bkk.hu</strong></li>
              <li>A sync most <strong>3 cellát</strong> használ (korábbi 6 helyett) — felére csökkentve az API hívásokat</li>
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-700">Cellák közötti késleltetés (ms)</span>
              <span className="text-[10px] text-canvas-muted">{t('superadmin.operationsUi.bkkDelayHint')}</span>
              <input
                type="number" min={1000} max={120000} step={500}
                value={bkkSettings.cell_delay_ms}
                disabled={!canManageSettings || settingsState !== 'ready'}
                onChange={e => setBkkSettings(s => ({ ...s, cell_delay_ms: Number(e.target.value) }))}
                className="input-base mt-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-700">Max újrapróbálkozás / cella</span>
              <span className="text-[10px] text-canvas-muted">Rate limit esetén ennyiszer próbálja újra ugyanazt a cellát</span>
              <input
                type="number" min={0} max={10} step={1}
                value={bkkSettings.retry_max}
                disabled={!canManageSettings || settingsState !== 'ready'}
                onChange={e => setBkkSettings(s => ({ ...s, retry_max: Number(e.target.value) }))}
                className="input-base mt-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-700">Várakozás újrapróbálkozás előtt (ms)</span>
              <span className="text-[10px] text-canvas-muted">Rate limit után ennyi ideig vár újrapróbálkozás előtt</span>
              <input
                type="number" min={1000} max={600000} step={1000}
                value={bkkSettings.retry_wait_ms}
                disabled={!canManageSettings || settingsState !== 'ready'}
                onChange={e => setBkkSettings(s => ({ ...s, retry_wait_ms: Number(e.target.value) }))}
                className="input-base mt-1"
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 sm:col-span-1">
              <span className="text-xs font-semibold text-slate-700">Cellák száma / futás</span>
              <span className="text-[10px] text-canvas-muted">Budapest 3 cellára osztva. 0 = mind (3 db). Erős limit esetén állítsd 1-re.</span>
              <input
                type="number" min={0} max={3} step={1}
                value={bkkSettings.cells_per_run}
                disabled={!canManageSettings || settingsState !== 'ready'}
                onChange={e => setBkkSettings(s => ({ ...s, cells_per_run: Number(e.target.value) }))}
                className="input-base mt-1"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={saveBkkSettings} disabled={!canManageSettings || settingsReason.trim().length < 10 || bkkSaving || settingsState !== 'ready'} className="btn-primary px-4 py-2 text-sm">
              {bkkSaving ? 'Mentés...' : 'Beállítások mentése'}
            </button>
            {bkkSaveMsg && <span role={bkkSaveMsg.startsWith('✓') ? 'status' : 'alert'} className={`text-sm font-semibold ${bkkSaveMsg.startsWith('✓') ? 'text-emerald-800' : 'text-rose-800'}`}>{bkkSaveMsg}</span>}
            <span className="ml-auto text-xs text-canvas-muted">Alapértelmezett: 5 000 ms · 3 retry · 90 000 ms · 0 (mind)</span>
          </div>
        </section>}

        {/* Job runner */}
        <section className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-canvas-ink">Ütemezett feladatok / Manuális indítás</h2>
          <div className="mb-4">
            <label htmlFor="superadmin-job-reason" className="block text-xs font-semibold text-canvas-ink">{t('superadmin.governance.reason')}</label>
            <textarea
              id="superadmin-job-reason"
              value={jobReason}
              onChange={event => {
                setJobReason(event.target.value);
                setArmedJob(null);
              }}
              minLength={10}
              maxLength={1_000}
              disabled={!canRunJobs}
              rows={2}
              aria-describedby="superadmin-job-reason-hint"
              className="input-base mt-1 w-full resize-y"
              placeholder={t('superadmin.operationsUi.reasonRequired')}
            />
            <span id="superadmin-job-reason-hint" className="mt-1 block text-[11px] text-canvas-muted">
              {t('superadmin.operationsUi.reasonRequired')}
            </span>
          </div>
          {jobStepUpHref && (
            <p role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
              {t('agency.errors.mfaRequired')}{' '}
              <a href={jobStepUpHref} className="underline">{t('superadmin.authority.stepUp')}</a>
            </p>
          )}
          <div className="space-y-3">
            {JOBS.map(j => {
              const unavailable = j.id === 'cycling_kenyi_import';
              return (
              <div key={j.id} className="rounded-xl border border-slate-200 bg-canvas-sage p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-canvas-ink">{j.label}</p>
                    <p className="text-xs text-canvas-muted">{j.description}</p>
                    {/* API endpoints */}
                    {j.endpoints && j.endpoints.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {j.endpoints.map(ep => (
                          <span key={ep.url} title={ep.note} className="inline-flex max-w-full items-center gap-1 rounded-md border border-canvas-line bg-white px-1.5 py-0.5 font-mono text-[10px] text-canvas-muted">
                            <span className="truncate">{ep.url}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Env var requirements */}
                    {j.envVars !== undefined && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {j.envVars.length === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                            ✓ Nincs API kulcs szükséges
                          </span>
                        ) : j.envVars.map(v => (
                          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => armedJob === j.id ? runJob(j.id) : setArmedJob(j.id)}
                    disabled={!canRunJobs || running !== null || unavailable || jobReason.trim().length < 10 || jobReason.trim().length > 1_000}
                    title={unavailable ? t('superadmin.operationsUi.jobUnavailableReason') : undefined}
                    aria-describedby={unavailable ? `superadmin-job-unavailable-${j.id}` : undefined}
                    className="btn-primary shrink-0 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {unavailable
                      ? t('superadmin.operationsUi.jobUnavailable')
                      : running === j.id
                      ? 'Fut...'
                      : armedJob === j.id
                        ? 'Megerősítés: indítás'
                        : 'Azonnali indítás'}
                  </button>
                </div>
                {unavailable && (
                  <p id={`superadmin-job-unavailable-${j.id}`} className="mt-2 text-xs font-medium text-amber-900">
                    {t('superadmin.operationsUi.jobUnavailableReason')}
                  </p>
                )}
                {results[j.id] ? (
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-[#f8fafc]">
                    {JSON.stringify(results[j.id], null, 2)}
                  </pre>
                ) : null}
              </div>
              );
            })}
          </div>
        </section>

        {/* Job run logs */}
        <section className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-canvas-ink">Job futási napló</h2>
            <button
              onClick={loadLogs}
              disabled={logsLoading}
              className="min-h-11 rounded-xl border border-canvas-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-canvas-sage disabled:opacity-50"
            >
              {logsLoading ? 'Töltés…' : '↻ Frissítés'}
            </button>
          </div>
          {logsError ? (
            <p role="alert" className="text-sm font-semibold text-rose-800">{t('superadmin.operationsUi.logsUnavailable')}</p>
          ) : logs.length === 0 && !logsLoading ? (
            <p className="text-sm text-canvas-muted">Még nem futott le egyetlen job sem, vagy a platform_job_logs tábla hiányzik.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="rounded-xl border border-slate-200 bg-canvas-sage p-3">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer flex-wrap items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-brand-700"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    aria-expanded={expandedLog === log.id}
                    aria-controls={`superadmin-job-log-${log.id}`}
                  >
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_PILL[log.status] ?? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'}`}>
                      {log.status}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-700">{log.job_id}</span>
                    <span className="text-xs text-canvas-muted">{fmt(log.started_at)}</span>
                    <span className="text-xs text-canvas-muted">({duration(log.started_at, log.finished_at)})</span>
                    <span className="ml-auto text-[10px] text-canvas-muted">{expandedLog === log.id ? '▲' : '▼'}</span>
                  </button>
                  {expandedLog === log.id && (
                    <pre id={`superadmin-job-log-${log.id}`} className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] text-[#f8fafc]">
                      {JSON.stringify(log.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── OSM Cím-adatbázis import ─────────────────────────────────── */}
        <SuperadminOsmImport canMutate={canRunJobs} />

        {/* ── GTFS Import ─────────────────────────────────────────────── */}
        <SuperadminGtfsImport canMutate={canRunJobs} />

        {/* ── External-API diagnostics (custom curl runner) ───────────── */}
        <SuperadminDiagnostics />

        </div>)} {/* end operations tab */}

      </div>
    </main>
  );
}
