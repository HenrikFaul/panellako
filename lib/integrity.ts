/**
 * lib/integrity.ts — SHA-256 hashing + idempotency-key helpers
 *
 * Generalizes the SHA-256 snapshot pattern documented in
 * `cycling-data-sources/00b_SUPABASE_BACKEND.md` so the same hashing
 * convention can be reused for pgmq-job dedup, file-integrity checks,
 * and upsert change-detection across the codebase.
 *
 * Server-only (uses `node:crypto`). Do NOT import from a `'use client'`
 * file — for client-side hashing use `crypto.subtle.digest('SHA-256', ...)`.
 */

import { createHash } from 'node:crypto';

export type IntegrityHash = { algo: 'sha256'; hex: string; bytes: number };

/** Hash a string or byte-buffer; returns hex + the input byte length. */
export function sha256(input: string | Uint8Array | Buffer): IntegrityHash {
  const buf =
    typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
  const hex = createHash('sha256').update(buf).digest('hex');
  return { algo: 'sha256', hex, bytes: buf.length };
}

/** Stream-hash for large payloads (avoids loading the whole file into memory). */
export async function sha256Stream(
  stream: NodeJS.ReadableStream,
): Promise<IntegrityHash> {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    let bytes = 0;
    stream.on('data', (chunk: Buffer) => {
      h.update(chunk);
      bytes += chunk.length;
    });
    stream.on('end', () =>
      resolve({ algo: 'sha256', hex: h.digest('hex'), bytes }),
    );
    stream.on('error', reject);
  });
}

/** Compare two hashes by hex equality. */
export function eqHash(a: IntegrityHash, b: IntegrityHash): boolean {
  return a.algo === b.algo && a.hex === b.hex;
}

/**
 * Idempotency key from arbitrary content — used for pgmq job dedup.
 *
 * Format: `<source>:<32-hex-chars>` (truncated SHA-256). Sorts object keys
 * so `{a:1,b:2}` and `{b:2,a:1}` produce the same key.
 */
export function idempotencyKey(source: string, payload: unknown): string {
  const keys =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? Object.keys(payload as Record<string, unknown>).sort()
      : undefined;
  const norm = JSON.stringify(payload, keys);
  return `${source}:${sha256(norm).hex.slice(0, 32)}`;
}
