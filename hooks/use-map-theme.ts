'use client';

import { useEffect, useState } from 'react';
import { getTheme, DEFAULT_THEME_ID, type MapTheme, type MapThemeId } from '@/lib/map-theme';

const LS_KEY = 'panellako_map_theme';

// Module-level cache so multiple map components share one fetch per page load.
let cachedTheme: MapTheme | null = null;
let fetchPromise: Promise<MapTheme> | null = null;

function readLocalStorage(): MapTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return getTheme(stored);
  } catch { /* localStorage blocked */ }
  return null;
}

function writeLocalStorage(id: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, id); } catch { /* noop */ }
}

async function fetchMapTheme(): Promise<MapTheme> {
  if (cachedTheme) return cachedTheme;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/settings/map-theme', { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data: { theme?: string }) => {
      const theme = getTheme(data.theme);
      cachedTheme = theme;
      fetchPromise = null;
      writeLocalStorage(theme.id);
      return theme;
    })
    .catch(() => {
      fetchPromise = null;  // Allow retry on next call
      // Fall back to localStorage, then default — never silently stay on dark
      const ls = readLocalStorage();
      return ls ?? getTheme(DEFAULT_THEME_ID);
    });

  return fetchPromise;
}

export function useMapTheme(): MapTheme {
  // Initial state: module cache → localStorage → default
  // localStorage gives instant correct theme on page reload without a DB round-trip.
  const [theme, setTheme] = useState<MapTheme>(
    () => cachedTheme ?? readLocalStorage() ?? getTheme(DEFAULT_THEME_ID),
  );

  useEffect(() => {
    fetchMapTheme().then(t => setTheme(t));
  }, []);

  return theme;
}

/**
 * Call after superadmin saves a new theme.
 * Passing the new ID immediately syncs the module cache + localStorage so
 * any component that re-renders within the same page sees the correct theme
 * WITHOUT waiting for a new fetch.
 */
export function invalidateMapThemeCache(newThemeId?: MapThemeId) {
  if (newThemeId) {
    cachedTheme = getTheme(newThemeId);
    writeLocalStorage(newThemeId);
  } else {
    cachedTheme = null;
  }
  fetchPromise = null;
}
