// N+1 query prevention utilities.
// Pattern: collect IDs → deduplicate → single bulk fetch → Map lookup.

/** Build a lookup Map keyed by id from a fetched array. */
export function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map(item => [item.id, item]));
}

/** Deduplicate an array of string IDs before bulk-fetching. */
export function dedupeIds(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((id): id is string => id != null))];
}

/**
 * Group an array of items by a string key.
 * Useful for fan-out queries where you need items grouped by parent ID.
 */
export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(k, [item]);
    }
  }
  return map;
}
