import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const dashboard = readSource('components/dashboard-client.tsx');
const sidebar = readSource('components/workspace-sidebar.tsx');
const shell = readSource('components/workspace-shell.tsx');
const globals = readSource('app/globals.css');
const environment = readSource('components/environment-page-client.tsx');

describe('quiet workspace redesign invariants', () => {
  it('keeps ambient dashboard artwork out of the runtime', () => {
    expect(dashboard).not.toContain("from '@/components/dashboard-hero-scene'");
    expect(dashboard).not.toContain("from '@/components/HeroVehicle'");
    expect(dashboard).not.toContain('<DashboardHeroScene');
    expect(dashboard).not.toContain('<HeroVehicle');
    expect(dashboard).not.toContain('<PanelSkylineSvg');
    expect(dashboard).not.toContain('heroAmbient');
  });

  it('preserves dashboard access, search, actions, data widgets and anchors', () => {
    expect(dashboard).toContain('<BillingWarningBanner');
    expect(dashboard).toContain('hasPermanentAccess={data.currentUser.free_trial_never_expires}');
    expect(dashboard).toContain('aria-label="Keresés…"');
    expect(dashboard).toContain('await supabase.auth.signOut()');
    expect(dashboard).toContain('<WeatherWidget quiet');
    expect(dashboard).toContain('<AirQualityWidget quiet');
    expect(dashboard).toContain('/kornyezet#sec-air');
    expect(dashboard).toContain('hidden min-w-0 rounded-xl bg-black/[0.11] p-4 lg:col-span-1 lg:block');

    for (const id of ['overview', 'tasks', 'tickets', 'units', 'documents', 'finances', 'meters', 'meetings', 'knowledge', 'audit']) {
      expect(dashboard).toContain(`id="${id}"`);
    }

    expect(dashboard).toContain("href: '#tickets'");
    expect(dashboard).toContain("href: '#finances'");
    expect(dashboard).toContain("href: '#documents'");
  });

  it('keeps every role-gated workspace destination in desktop and mobile navigation', () => {
    for (const route of [
      '/profil',
      '#meetings',
      '#knowledge',
      '#audit',
      '/ertesitesek',
      '/kozlekedes',
      '/kornyezet',
      '/lakokornyzet-szolgaltatasok',
      '/klimakockazat',
      '/zaj',
      '/hulladek',
      '/budapest-2030',
      '/green-score',
      '/zold-akciok',
    ]) {
      expect(sidebar).toContain(route);
    }

    expect(sidebar).toContain("['kozos_kepviselo', 'megbizott']");
    expect(sidebar).toContain("['kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo']");
    expect(sidebar).toContain('role="dialog"');
    expect(sidebar).toContain('aria-modal="true"');
    expect(sidebar).toContain("event.key === 'Escape'");
    expect(sidebar).toContain("window.matchMedia('(min-width: 1024px)')");
    expect(sidebar).toContain("desktopQuery.addEventListener('change', handleViewportChange)");
    expect(sidebar).toContain('aria-current={active ? \'page\' : undefined}');
    expect(globals).toContain('.app-surface [id]');
    expect(globals).toContain('scroll-margin-top: 4.5rem');
    expect(environment).toContain('environment-section');
    expect(environment).toContain('id="sec-air"');
    expect(environment).toContain('relative z-30');
    expect(environment).toContain('lg:sticky lg:top-0 lg:z-50');
  });

  it('removes the fixed mobile offset while retaining desktop collapse widths', () => {
    expect(dashboard).not.toContain('style={{ paddingLeft:');
    expect(shell).not.toContain('style={{ paddingLeft:');
    expect(dashboard).toContain("sidebarCollapsed ? 'lg:pl-[84px]' : 'lg:pl-[268px]'");
    expect(shell).toContain("collapsed ? 'lg:pl-16' : 'lg:pl-[248px]'");
    expect(shell).toContain('pt-14');
  });

  it('keeps quiet environmental widgets readable and data-attributed', () => {
    const weather = readSource('components/weather-widget.tsx');
    const airQuality = readSource('components/air-quality-widget.tsx');

    expect(weather).toContain('quiet = false');
    expect(airQuality).toContain('quiet = false');
    expect(airQuality).toContain('AQICN · OLM');
    expect(airQuality).toContain('text-[11px] text-slate-400');
    expect(weather).toContain('aria-label={forecastLinkLabel}');
    expect(weather).toContain('h-11 w-11');
  });
});
