'use client';

import { createContext, useContext } from 'react';
import type { PlatformAuthorityContext } from '@/lib/superadmin/operator-authority';

export const SuperadminAuthorityContext = createContext<PlatformAuthorityContext | null>(null);

export function usePlatformAuthority(): PlatformAuthorityContext {
  const context = useContext(SuperadminAuthorityContext);
  if (!context) throw new Error('Platform authority context is unavailable');
  return context;
}
