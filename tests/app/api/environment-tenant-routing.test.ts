import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const scopedEnvironmentRoutes = [
  'app/api/environment/green/route.ts',
  'app/api/environment/score/route.ts',
  'app/api/environment/solar/route.ts',
  'app/api/environment/satellite/route.ts',
  'app/api/environment/urban/route.ts',
  'app/api/environment/urban-atlas/route.ts',
  'app/api/environment/public-services/route.ts',
];

describe('environment and transit tenant routing invariants', () => {
  it.each(scopedEnvironmentRoutes)(
    '%s resolves workspace identity before touching physical-building caches',
    (relativePath) => {
      const source = readSource(relativePath);

      expect(source).toContain('resolveEnvironmentBuildingScope');
      expect(source).toContain('physicalBuildingId');
      expect(source).not.toContain(".eq('building_id', buildingId)");
      expect(source).not.toContain('building_id:  buildingId');
      expect(source).not.toContain('building_id: buildingId');
    },
  );

  it('forwards the resident session or internal-job proof to the nested green-score request', () => {
    const source = readSource('app/api/environment/score/route.ts');

    expect(source).toContain('environmentJobForwardHeaders(request)');
    expect(source).toContain('headers: forwardedHeaders');
    expect(source).toContain('building_id:  physicalBuildingId');
  });

  it('keeps coordinate-only transit reads public but scopes all building cache operations', () => {
    const source = readSource('app/api/transit/nearby/route.ts');

    expect(source).toContain('resolveEnvironmentBuildingScope(request, workspaceId)');
    expect(source).toContain('if (!physicalBuildingId && _cache');
    expect(source).toContain('loadStopsFromCache(buildingCacheDb, physicalBuildingId)');
    expect(source).toContain('saveStopsToCache(buildingCacheDb, physicalBuildingId, stops)');
    expect(source).not.toContain('loadStopsFromCache(createClient(), buildingId)');
    expect(source).not.toContain('saveStopsToCache(createClient(), buildingId, stops)');
  });

  it('preserves only explicit secret-authenticated physical-id access for portfolio refresh jobs', () => {
    const scopeSource = readSource('lib/authorization/environment-scope.ts');
    const jobsSource = readSource('app/api/superadmin/jobs/run/route.ts');

    expect(scopeSource).toContain("'internal-job'");
    expect(scopeSource).toContain('ENVIRONMENT_REFRESH_SECRET');
    expect(scopeSource).toContain('timingSafeEqual');
    expect(jobsSource).toContain('ENVIRONMENT_JOB_SECRET_HEADER');
    expect(jobsSource.match(/headers: environmentRefreshHeaders\(\)/g)?.length).toBe(4);
  });

  it('leaves global, PII-free coordinate sources public because they do not use building caches', () => {
    const treesSource = readSource('app/api/environment/budapest-trees/route.ts');
    const heatIslandSource = readSource('app/api/environment/heat-island/route.ts');

    expect(treesSource).toContain('void buildingId; // available for future per-building caching');
    expect(treesSource).not.toContain(".eq('building_id', buildingId)");
    expect(heatIslandSource).toContain('const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`');
    expect(heatIslandSource).not.toContain(".from('");
  });
});
