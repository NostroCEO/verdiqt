// In-process TTL cache for hot poll routes. The dashboard polls status every
// 5s, evidence every 2.5s, and SSE events trigger extra refetches in bursts;
// a ~2s cache collapses those bursts to one DB round-trip without visible
// staleness. Values are per-process (fine: one container) and keys embed the
// owning session, so a cached body can never cross visitors.
type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 1000;

function prune(now: number) {
  if (store.size <= MAX_ENTRIES) return;
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  // Still over the cap after dropping expired rows: evict oldest-inserted.
  const excess = store.size - MAX_ENTRIES;
  if (excess > 0) {
    for (const key of Array.from(store.keys()).slice(0, excess)) {
      store.delete(key);
    }
  }
}

export async function microCached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs });
  prune(now);
  return value;
}

export function microInvalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

// Test isolation: the store is module-level, so suites that replay the same
// ids across cases must clear it between cases.
export function microReset() {
  store.clear();
}
