// Map theme definitions — four canonical themes per the OSM Custom Map Style Spec v0.7.17.
// Each theme controls the Leaflet basemap tile URL and the color palette for data layers.

export type MapThemeId = 'minimal' | 'nature' | 'dark' | 'dlc';

export interface MapThemeColors {
  primary:    string;  // roads, primary features
  secondary:  string;  // secondary features, halos
  accent:     string;  // POI highlights, selected state
  building:   string;  // building marker fill
  text:       string;  // label text
  background: string;  // canvas / tile background
}

export interface MapTheme {
  id:          MapThemeId;
  label:       string;
  labelHu:     string;
  description: string;
  tileUrl:     string;
  attribution: string;
  colors:      MapThemeColors;
  swatchColors: string[];  // for UI preview (2-4 colors)
}

export const MAP_THEMES: Record<MapThemeId, MapTheme> = {
  minimal: {
    id:          'minimal',
    label:       'Minimal Urban',
    labelHu:     'Minimál Urbán',
    description: 'Semleges, fényes háttér — nappalra és hosszú munkamenetekre optimalizálva. Az adatok kiemelkednek, a térkép háttérbe húzódik.',
    tileUrl:     'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    colors: {
      primary:    '#fbb03b',
      secondary:  '#6366f1',
      accent:     '#0d8a8c',
      building:   '#6366f1',
      text:       '#212121',
      background: '#f8f8f8',
    },
    swatchColors: ['#f8f8f8', '#fbb03b', '#0d8a8c', '#6366f1'],
  },
  nature: {
    id:          'nature',
    label:       'Beautiful Nature',
    labelHu:     'Természet & Zöld',
    description: 'Meleg, organikus paletta — kerékpáros és zöldterület-nézetekhez. A növényzet és a víz dominál, az utak visszahúzódnak.',
    tileUrl:     'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    colors: {
      primary:    '#16a34a',
      secondary:  '#7fb87a',
      accent:     '#c1632b',
      building:   '#7e8a3a',
      text:       '#5b4a33',
      background: '#f0f5f0',
    },
    swatchColors: ['#f0f5f0', '#16a34a', '#c1632b', '#7fb87a'],
  },
  dark: {
    id:          'dark',
    label:       'Dark Mode / Night',
    labelHu:     'Sötét / Éjszaka',
    description: 'Mélykék éjszakai térkép — alacsony fénykörülmények között is kényelmes. Neon POI-ikonok, kontrasztos tranzitszínek.',
    tileUrl:     'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    colors: {
      primary:    '#f3c14a',
      secondary:  '#76d8f6',
      accent:     '#5ee3b8',
      building:   '#6366f1',
      text:       '#e2e8f0',
      background: '#0a0f1e',
    },
    swatchColors: ['#0a0f1e', '#f3c14a', '#5ee3b8', '#76d8f6'],
  },
  dlc: {
    id:          'dlc',
    label:       'DLC Brand / Cyberpunk',
    labelHu:     'DLC Márka / Cyberpunk',
    description: 'Neon márkapaletta — marketing screenshotokhoz, hero-jelenetekhez és "wow" élményhez. Minden adat változatlanul látható.',
    tileUrl:     'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    colors: {
      primary:    '#ec4899',
      secondary:  '#14b8a6',
      accent:     '#f59e0b',
      building:   '#ec4899',
      text:       '#f5f7ff',
      background: '#0d0822',
    },
    swatchColors: ['#0d0822', '#ec4899', '#14b8a6', '#f59e0b'],
  },
};

export const MAP_THEME_IDS = Object.keys(MAP_THEMES) as MapThemeId[];

export const DEFAULT_THEME_ID: MapThemeId = 'dark';

export function getTheme(id: string | null | undefined): MapTheme {
  return MAP_THEMES[(id as MapThemeId) in MAP_THEMES ? (id as MapThemeId) : DEFAULT_THEME_ID];
}
