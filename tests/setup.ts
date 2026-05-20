// tests/setup.ts — Vitest global setup
//
// Loaded once per worker before any test file. Add polyfills, jest-dom
// matchers, or global mocks here.

import '@testing-library/jest-dom/vitest';

// TextEncoder/TextDecoder polyfill for jsdom (some Node-side helpers
// like @supabase/ssr touch them indirectly).
import { TextDecoder, TextEncoder } from 'node:util';
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).TextDecoder = TextDecoder;
}
