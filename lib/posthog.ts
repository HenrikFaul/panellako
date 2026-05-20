'use client';

/**
 * lib/posthog.ts — PostHog client-side lightweight init
 *
 * No-ops unless `NEXT_PUBLIC_POSTHOG_KEY` is set, so adding this to a
 * layout is safe in any environment.
 *
 * Defaults: EU host, identified-only person profiles (GDPR-friendlier),
 * autocapture on, session recording OFF (enable explicitly in prod).
 *
 * NOT mounted automatically anywhere — wrap your app or call
 * `usePostHog()` from a top-level client component when ready.
 */

import posthog from 'posthog-js';
import { useEffect } from 'react';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === 'undefined' || !KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: true,
  });
  initialized = true;
}

export function usePostHog() {
  useEffect(() => {
    initPostHog();
  }, []);
  return posthog;
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!initialized || !KEY) return;
  posthog.capture(event, props);
}
