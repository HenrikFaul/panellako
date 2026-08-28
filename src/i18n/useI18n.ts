'use client';

import { useCallback, useEffect, useState } from 'react';
import { en } from './resources/en';
import { hu } from './resources/hu';

export type AppLocale = 'hu' | 'en';

type MessageNode = string | { readonly [key: string]: MessageNode };

function browserLocale(): AppLocale {
  if (typeof document === 'undefined') return 'hu';
  const language = document.documentElement.lang || navigator.language || 'hu';
  return language.toLowerCase().startsWith('en') ? 'en' : 'hu';
}

function nestedMessage(resource: MessageNode, key: string): string | null {
  let current: MessageNode = resource;
  for (const segment of key.split('.')) {
    if (!segment || typeof current === 'string' || !(segment in current)) return null;
    current = current[segment];
  }
  return typeof current === 'string' ? current : null;
}

/**
 * Lightweight repository-wide locale access.
 *
 * Server rendering deterministically starts in Hungarian, then the client
 * follows `<html lang>` (or the browser locale when it is absent). Unknown
 * nested keys intentionally render their key so missing translations remain
 * visible during review rather than silently disappearing.
 */
export function useI18n() {
  const [locale, setLocale] = useState<AppLocale>('hu');

  useEffect(() => {
    const update = () => setLocale(browserLocale());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    window.addEventListener('languagechange', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('languagechange', update);
    };
  }, []);

  const t = useCallback((key: string): string => {
    const resource = (locale === 'en' ? en : hu) as MessageNode;
    return nestedMessage(resource, key) ?? key;
  }, [locale]);

  return { locale, t } as const;
}
