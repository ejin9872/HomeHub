const CACHE_VERSION = 2
const CACHE_PREFIX = 'hh_'
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CacheEntry<T> {
  v: number
  ts: number
  data: T
}

function key(namespace: string, id: string): string {
  return `${CACHE_PREFIX}${namespace}:${id}`
}

export function cacheGet<T>(namespace: string, id: string): T | null {
  try {
    const raw = localStorage.getItem(key(namespace, id))
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (entry.v !== CACHE_VERSION) return null
    if (Date.now() - entry.ts > DEFAULT_TTL) {
      localStorage.removeItem(key(namespace, id))
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function cacheSet<T>(namespace: string, id: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { v: CACHE_VERSION, ts: Date.now(), data }
    localStorage.setItem(key(namespace, id), JSON.stringify(entry))
  } catch {
    // localStorage full — evict oldest entries in this namespace
    try {
      const entries: { k: string; ts: number }[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith(`${CACHE_PREFIX}${namespace}:`)) {
          try {
            const e = JSON.parse(localStorage.getItem(k)!)
            entries.push({ k, ts: e.ts || 0 })
          } catch { entries.push({ k, ts: 0 }) }
        }
      }
      entries.sort((a, b) => a.ts - b.ts)
      // Remove oldest 25%
      const removeCount = Math.max(1, Math.floor(entries.length / 4))
      for (let i = 0; i < removeCount; i++) localStorage.removeItem(entries[i].k)
      // Retry
      const entry: CacheEntry<T> = { v: CACHE_VERSION, ts: Date.now(), data }
      localStorage.setItem(key(namespace, id), JSON.stringify(entry))
    } catch { /* give up silently */ }
  }
}

/** Merge partial metadata into an existing cached search result set */
export function cacheMergeSearchMeta(
  query: string,
  index: number,
  meta: Partial<{ image: string; rating: number; ratingCount: number; ingredientCount: number; totalTime: string; categories: string[] }>
): void {
  const cached = cacheGet<{ results: unknown[]; hasMore: boolean }>('search', query)
  if (!cached || !cached.results || !cached.results[index]) return
  const updatedResults = [...cached.results]
  updatedResults[index] = { ...(updatedResults[index] as Record<string, unknown>), ...meta }
  cacheSet('search', query, { ...cached, results: updatedResults })
}
