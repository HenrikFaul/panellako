'use client';

import { useEffect, useState } from 'react';
import { getTheme, DEFAULT_THEME_ID, type MapTheme } from '@/lib/map-theme';

// Module-level cache so multiple components share one fetch per page load.
let cachedTheme: MapTheme | null = null;
let fetchPromise: Promise<MapTheme> | null = null;

async function fetchMapTheme(): Promise<MapTheme> {
  if (cachedTheme) return cachedTheme;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/settings/map-theme', { cache: 'no-store' })
    .then(r => r.json())
    .then((data: { theme?: string }) => {
      cachedTheme = getTheme(data.theme);
      return cachedTheme;
    })
    .catch(() => getTheme(DEFAULT_THEME_ID));

  return fetchPromise;
}

export function useMapTheme(): MapTheme {
  const [theme, setTheme] = useState<MapTheme>(() => cachedTheme ?? getTheme(DEFAULT_THEME_ID));

  useEffect(() => {
    fetchMapTheme().then(t => setTheme(t));
  }, []);

  return theme;
}

/** Call this after the superadmin changes the theme so the next useMapTheme() sees the new value. */
export function invalidateMapThemeCache() {
  cachedTheme = null;
  fetchPromise = null;
}
