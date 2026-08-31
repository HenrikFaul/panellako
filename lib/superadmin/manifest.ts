import 'server-only';

import {
  CONTROL_CENTER_SCHEMA_VERSION,
  type ControlCenterIntegrationId,
  type PlatformAdminCapability,
  type PlatformAdminCriticality,
  type PlatformAdminManifestDefinition,
} from '@/lib/superadmin/control-center';

export interface PlatformAdminIntegrationDefinition extends PlatformAdminManifestDefinition {
  id: ControlCenterIntegrationId;
  label: string;
}

export interface PlatformAdminJobDefinition extends PlatformAdminManifestDefinition {
  criticality: PlatformAdminCriticality;
}

const moduleDefinition = (
  definition: PlatformAdminManifestDefinition,
): PlatformAdminManifestDefinition => definition;

const integrationDefinition = (
  definition: PlatformAdminIntegrationDefinition,
): PlatformAdminIntegrationDefinition => definition;

function jobDefinition(
  id: string,
  nameKey: string,
  criticality: PlatformAdminCriticality,
  timeoutMs: number,
  freshnessMs: number,
  runbook: string,
): PlatformAdminJobDefinition {
  return {
    id,
    category: 'job',
    nameKey,
    purposeKey: `${nameKey}.purpose`,
    capability: 'platform.jobs.run',
    scope: 'platform',
    criticality,
    timeoutMs,
    freshnessMs,
    probeKind: 'command',
    sideEffect: 'write',
    runbook,
    safeDeepLink: '/superadmin?tab=operations',
  };
}

/**
 * Canonical server-only manifest. It intentionally contains operational
 * metadata only: environment-variable names, credentials and tenant data are
 * kept in the collectors and never enter the public control-center DTO.
 */
export const PLATFORM_ADMIN_MODULES = [
  moduleDefinition({
    id: 'control-center',
    category: 'overview',
    nameKey: 'superadmin.tabs.controlCenter',
    purposeKey: 'superadmin.controlCenter.hero.subtitle',
    capability: 'platform.overview.read',
    scope: 'platform',
    criticality: 'critical',
    timeoutMs: 4_000,
    freshnessMs: 60_000,
    probeKind: 'local_read',
    sideEffect: 'read',
    runbook: 'admin-control-center-read-plane',
    safeDeepLink: '/superadmin?tab=controlCenter',
  }),
  moduleDefinition({
    id: 'operations',
    category: 'operations',
    nameKey: 'superadmin.tabs.operations',
    purposeKey: 'superadmin.operations.subtitle',
    capability: 'platform.health.read',
    scope: 'platform',
    criticality: 'high',
    timeoutMs: 3_000,
    freshnessMs: 60_000,
    probeKind: 'local_read',
    sideEffect: 'read',
    runbook: 'platform-operations-health',
    safeDeepLink: '/superadmin?tab=operations',
  }),
  moduleDefinition({
    id: 'users',
    category: 'identity',
    nameKey: 'superadmin.tabs.users',
    purposeKey: 'superadmin.users.subtitle',
    capability: 'platform.users.read_masked',
    scope: 'platform',
    criticality: 'high',
    timeoutMs: 3_000,
    freshnessMs: 60_000,
    probeKind: 'local_read',
    sideEffect: 'read',
    runbook: 'platform-user-administration',
    safeDeepLink: '/superadmin?tab=users',
  }),
  moduleDefinition({
    id: 'features',
    category: 'configuration',
    nameKey: 'superadmin.tabs.features',
    purposeKey: 'superadmin.features.subtitle',
    capability: 'platform.features.read',
    scope: 'platform',
    criticality: 'high',
    timeoutMs: 3_000,
    freshnessMs: 60_000,
    probeKind: 'local_read',
    sideEffect: 'read',
    runbook: 'platform-feature-controls',
    safeDeepLink: '/superadmin?tab=features',
  }),
  moduleDefinition({
    id: 'community-requests',
    category: 'onboarding',
    nameKey: 'superadmin.tabs.communityRequests',
    purposeKey: 'superadmin.communityRequests.subtitle',
    capability: 'platform.communities.review',
    scope: 'platform_or_workspace',
    criticality: 'high',
    timeoutMs: 2_500,
    freshnessMs: 60_000,
    probeKind: 'local_read',
    sideEffect: 'read',
    runbook: 'community-request-review',
    safeDeepLink: '/superadmin?tab=communityRequests',
  }),
  moduleDefinition({
    id: 'audit',
    category: 'security',
    nameKey: 'superadmin.controlCenter.audit.title',
    purposeKey: 'superadmin.controlCenter.audit.subtitle',
    capability: 'platform.audit.read',
    scope: 'platform',
    criticality: 'critical',
    timeoutMs: 2_500,
    freshnessMs: 60_000,
    probeKind: 'local_read',
    sideEffect: 'read',
    runbook: 'platform-audit-read',
    safeDeepLink: '/superadmin?tab=controlCenter',
  }),
  moduleDefinition({
    id: 'release',
    category: 'release',
    nameKey: 'superadmin.controlCenter.release.title',
    purposeKey: 'superadmin.controlCenter.release.subtitle',
    capability: 'platform.release.read',
    scope: 'platform',
    criticality: 'critical',
    timeoutMs: 1_000,
    freshnessMs: 60_000,
    probeKind: 'config_only',
    sideEffect: 'none',
    runbook: 'release-identity-mismatch',
    safeDeepLink: '/superadmin?tab=controlCenter',
  }),
] as const;

export const PLATFORM_ADMIN_INTEGRATIONS = [
  integrationDefinition({
    id: 'supabase',
    label: 'Supabase',
    category: 'data',
    nameKey: 'superadmin.controlCenter.integrationNames.supabase',
    purposeKey: 'superadmin.controlCenter.integrationPurposes.supabase',
    capability: 'platform.integrations.read',
    scope: 'platform',
    criticality: 'critical',
    timeoutMs: 2_500,
    freshnessMs: 60_000,
    probeKind: 'local_read',
    sideEffect: 'read',
    runbook: 'supabase-platform-data-plane',
    safeDeepLink: '/superadmin?tab=operations',
  }),
  integrationDefinition({
    id: 'address-registry',
    label: 'GeoData Address Registry',
    category: 'geodata',
    nameKey: 'superadmin.controlCenter.integrationNames.address-registry',
    purposeKey: 'superadmin.controlCenter.integrationPurposes.address-registry',
    capability: 'platform.integrations.read',
    scope: 'platform',
    criticality: 'critical',
    timeoutMs: 2_000,
    freshnessMs: 300_000,
    probeKind: 'config_only',
    sideEffect: 'none',
    runbook: 'address-registry-configuration',
    safeDeepLink: '/superadmin?tab=operations',
  }),
  integrationDefinition({
    id: 'email',
    label: 'Email',
    category: 'messaging',
    nameKey: 'superadmin.controlCenter.integrationNames.email',
    purposeKey: 'superadmin.controlCenter.integrationPurposes.email',
    capability: 'platform.integrations.read',
    scope: 'platform',
    criticality: 'high',
    timeoutMs: 2_000,
    freshnessMs: 300_000,
    probeKind: 'config_only',
    sideEffect: 'none',
    runbook: 'email-delivery-configuration',
    safeDeepLink: '/superadmin?tab=operations',
  }),
  integrationDefinition({
    id: 'push',
    label: 'Web Push',
    category: 'messaging',
    nameKey: 'superadmin.controlCenter.integrationNames.push',
    purposeKey: 'superadmin.controlCenter.integrationPurposes.push',
    capability: 'platform.integrations.read',
    scope: 'platform',
    criticality: 'medium',
    timeoutMs: 2_000,
    freshnessMs: 300_000,
    probeKind: 'config_only',
    sideEffect: 'none',
    runbook: 'web-push-configuration',
    safeDeepLink: '/superadmin?tab=operations',
  }),
  integrationDefinition({
    id: 'stripe',
    label: 'Stripe',
    category: 'billing',
    nameKey: 'superadmin.controlCenter.integrationNames.stripe',
    purposeKey: 'superadmin.controlCenter.integrationPurposes.stripe',
    capability: 'platform.integrations.read',
    scope: 'platform',
    criticality: 'high',
    timeoutMs: 2_000,
    freshnessMs: 300_000,
    probeKind: 'config_only',
    sideEffect: 'none',
    runbook: 'stripe-billing-configuration',
    safeDeepLink: '/superadmin?tab=operations',
  }),
  integrationDefinition({
    id: 'google-oauth',
    label: 'Google OAuth',
    category: 'identity',
    nameKey: 'superadmin.controlCenter.integrationNames.google-oauth',
    purposeKey: 'superadmin.controlCenter.integrationPurposes.google-oauth',
    capability: 'platform.integrations.read',
    scope: 'platform',
    criticality: 'high',
    timeoutMs: 2_000,
    freshnessMs: 300_000,
    probeKind: 'config_only',
    sideEffect: 'none',
    runbook: 'google-oauth-control-plane',
    safeDeepLink: '/superadmin?tab=operations',
  }),
  integrationDefinition({
    id: 'bkk',
    label: 'BKK',
    category: 'mobility',
    nameKey: 'superadmin.controlCenter.integrationNames.bkk',
    purposeKey: 'superadmin.controlCenter.integrationPurposes.bkk',
    capability: 'platform.integrations.read',
    scope: 'platform',
    criticality: 'medium',
    timeoutMs: 2_000,
    freshnessMs: 300_000,
    probeKind: 'config_only',
    sideEffect: 'none',
    runbook: 'bkk-data-configuration',
    safeDeepLink: '/superadmin?tab=operations',
  }),
  integrationDefinition({
    id: 'aqi',
    label: 'AQI',
    category: 'environment',
    nameKey: 'superadmin.controlCenter.integrationNames.aqi',
    purposeKey: 'superadmin.controlCenter.integrationPurposes.aqi',
    capability: 'platform.integrations.read',
    scope: 'platform',
    criticality: 'medium',
    timeoutMs: 2_000,
    freshnessMs: 300_000,
    probeKind: 'config_only',
    sideEffect: 'none',
    runbook: 'aqi-data-configuration',
    safeDeepLink: '/superadmin?tab=operations',
  }),
  integrationDefinition({
    id: 'cron',
    label: 'Scheduler',
    category: 'automation',
    nameKey: 'superadmin.controlCenter.integrationNames.cron',
    purposeKey: 'superadmin.controlCenter.integrationPurposes.cron',
    capability: 'platform.integrations.read',
    scope: 'platform',
    criticality: 'high',
    timeoutMs: 2_000,
    freshnessMs: 300_000,
    probeKind: 'config_only',
    sideEffect: 'none',
    runbook: 'scheduler-configuration',
    safeDeepLink: '/superadmin?tab=operations',
  }),
] as const;

export const PLATFORM_ADMIN_JOBS = [
  jobDefinition('bkk_full_sync', 'superadmin.jobs.bkkFullSync', 'high', 180_000, 86_400_000, 'bkk-full-sync'),
  jobDefinition('bkk_stops_routes', 'superadmin.jobs.bkkStopsRoutes', 'high', 180_000, 86_400_000, 'bkk-stops-routes'),
  jobDefinition('bkk_stops_cell_0', 'superadmin.jobs.bkkStopsCell0', 'medium', 120_000, 86_400_000, 'bkk-stops-cell'),
  jobDefinition('bkk_stops_cell_1', 'superadmin.jobs.bkkStopsCell1', 'medium', 120_000, 86_400_000, 'bkk-stops-cell'),
  jobDefinition('bkk_stops_cell_2', 'superadmin.jobs.bkkStopsCell2', 'medium', 120_000, 86_400_000, 'bkk-stops-cell'),
  jobDefinition('bkk_building_stops', 'superadmin.jobs.bkkBuildingStops', 'medium', 180_000, 86_400_000, 'bkk-building-stops'),
  jobDefinition('bkk_alerts', 'superadmin.jobs.bkkAlerts', 'medium', 120_000, 300_000, 'bkk-alerts'),
  jobDefinition('gtfs_derive_refs', 'superadmin.jobs.gtfsDeriveRefs', 'high', 180_000, 86_400_000, 'gtfs-derived-route-refs'),
  jobDefinition('air_quality_refresh', 'superadmin.jobs.airQualityRefresh', 'medium', 120_000, 3_600_000, 'air-quality-refresh'),
  jobDefinition('env_refresh_green', 'superadmin.jobs.envRefreshGreen', 'low', 180_000, 604_800_000, 'environment-green-refresh'),
  jobDefinition('satellite_refresh', 'superadmin.jobs.satelliteRefresh', 'low', 180_000, 604_800_000, 'satellite-refresh'),
  jobDefinition('urban_refresh', 'superadmin.jobs.urbanRefresh', 'medium', 180_000, 2_592_000_000, 'urban-refresh'),
  jobDefinition('urban_atlas_refresh', 'superadmin.jobs.urbanAtlasRefresh', 'low', 180_000, 15_552_000_000, 'urban-atlas-refresh'),
  jobDefinition('budapest_import', 'superadmin.jobs.budapestImport', 'medium', 180_000, 2_592_000_000, 'budapest-open-data-import'),
  jobDefinition('ndvi_hungary_render', 'superadmin.jobs.ndviHungaryRender', 'low', 300_000, 604_800_000, 'ndvi-hungary-render'),
  jobDefinition('cycling_bkk_gbfs_status', 'superadmin.jobs.cyclingBkkGbfsStatus', 'medium', 120_000, 300_000, 'cycling-bkk-gbfs-status'),
  jobDefinition('cycling_bkk_gbfs_info', 'superadmin.jobs.cyclingBkkGbfsInfo', 'medium', 120_000, 86_400_000, 'cycling-bkk-gbfs-info'),
  jobDefinition('cycling_waymarked_trails', 'superadmin.jobs.cyclingWaymarkedTrails', 'low', 180_000, 604_800_000, 'cycling-waymarked-trails'),
  jobDefinition('cycling_kenyi_import', 'superadmin.jobs.cyclingKenyiImport', 'low', 120_000, 2_592_000_000, 'cycling-kenyi-import'),
  jobDefinition('osm_fix_index', 'superadmin.jobs.osmFixIndex', 'high', 120_000, 86_400_000, 'osm-address-index'),
  jobDefinition('osm_addresses_import_phase1', 'superadmin.jobs.osmAddressesImportPhase1', 'high', 300_000, 2_592_000_000, 'osm-address-import'),
  jobDefinition('osm_addresses_import_phase2_county', 'superadmin.jobs.osmAddressesImportPhase2County', 'high', 300_000, 2_592_000_000, 'osm-address-import'),
  jobDefinition('osm_addresses_import_all', 'superadmin.jobs.osmAddressesImportAll', 'high', 300_000, 2_592_000_000, 'osm-address-import'),
] as const;

export const PLATFORM_ADMIN_MANIFEST = {
  schemaVersion: CONTROL_CENTER_SCHEMA_VERSION,
  modules: PLATFORM_ADMIN_MODULES,
  integrations: PLATFORM_ADMIN_INTEGRATIONS,
  jobs: PLATFORM_ADMIN_JOBS,
} as const;

function serializeDefinition(definition: PlatformAdminManifestDefinition): string {
  return [
    definition.id,
    definition.category,
    definition.nameKey,
    definition.purposeKey,
    definition.capability,
    definition.scope,
    definition.criticality,
    definition.timeoutMs,
    definition.freshnessMs,
    definition.probeKind,
    definition.sideEffect,
    definition.runbook,
    definition.safeDeepLink,
  ].join('~');
}

export const CONTROL_CENTER_MANIFEST_SEED = [
  CONTROL_CENTER_SCHEMA_VERSION,
  ...PLATFORM_ADMIN_MODULES.map(serializeDefinition),
  ...PLATFORM_ADMIN_INTEGRATIONS.map(serializeDefinition),
  ...PLATFORM_ADMIN_JOBS.map(serializeDefinition),
].join('|');

export function moduleManifestEntry(id: string): PlatformAdminManifestDefinition {
  return PLATFORM_ADMIN_MODULES.find(definition => definition.id === id)
    ?? PLATFORM_ADMIN_MODULES[0];
}

export function integrationManifestEntry(
  id: ControlCenterIntegrationId,
): PlatformAdminIntegrationDefinition {
  return PLATFORM_ADMIN_INTEGRATIONS.find(definition => definition.id === id)
    ?? PLATFORM_ADMIN_INTEGRATIONS[0];
}

export function hasPlatformCapability(
  definition: PlatformAdminManifestDefinition,
  capability: PlatformAdminCapability,
): boolean {
  return definition.capability === capability;
}
