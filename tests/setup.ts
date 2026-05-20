// tests/setup.ts — Vitest global setup
//
// Loaded once per worker before any test file. Add polyfills, jest-dom
// matchers, or global mocks here.

import '@testing-library/jest-dom/vitest';

// TextEncoder/TextDecoder polyfill for jsdom (some Node-side helpers
// like @supabase/ssr touch them indirectly).
import { TextDecoder, TextEncoder } from 'node:util';
if (typeof globalThis.TextEncoder === 'undefined') {
  // @ts-expect-error — jsdom env lacks these by default in some Node versions
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  // @ts-expect-error — jsdom env lacks these by default in some Node versions
  globalThis.TextDecoder = TextDecoder;
}
