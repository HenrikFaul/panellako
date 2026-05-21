'use client';

import { useEffect, useState } from 'react';
import { getTheme, DEFAULT_THEME_ID, type MapTheme, type MapThemeId } from '@/lib/map-theme';

const LS_KEY = 'panellako_map_theme';

// Module-level cache so multiple map components share one fetch per page load.
let cachedTheme: MapTheme | null = null;
let fetchPromise: Promise<MapTheme> | null = null;

// Subscribers: all mounted useMapTheme hooks register here so invalidation
// propagates to every component on the page, including cross-tab via storage events.
const subscribers = new Set<(t: MapTheme) => void>();

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
      // Fall back to localStorage, then default
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
    // Register with the subscriber set so invalidateMapThemeCache can push updates
    // to all mounted hooks without a re-fetch.
    subscribers.add(setTheme);

    fetchMapTheme().then(t => setTheme(t));

    // Cross-tab sync: when the admin changes the theme in another tab,
    // localStorage fires a 'storage' event here. Re-read and update.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_KEY || !e.newValue) return;
      const next = getTheme(e.newValue);
      cachedTheme = next;
      fetchPromise = null;
      setTheme(next);
    };
    window.addEventListener('storage', onStorage);

    return () => {
      subscribers.delete(setTheme);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return theme;
}

/**
 * Call after superadmin saves a new theme.
 * Immediately syncs the module cache + localStorage AND pushes the update
 * to all mounted useMapTheme hooks on this page — no reload required.
 */
export function invalidateMapThemeCache(newThemeId?: MapThemeId) {
  if (newThemeId) {
    const next = getTheme(newThemeId);
    cachedTheme = next;
    writeLocalStorage(newThemeId);
    // Push to all mounted map hooks on this page
    subscribers.forEach(fn => fn(next));
  } else {
    cachedTheme = null;
  }
  fetchPromise = null;
}
