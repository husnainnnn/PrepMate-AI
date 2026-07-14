// ─── Lightweight In-Memory API Cache ──────────────────────
//
// Features:
//  - TTL-based expiration (default 2 minutes for lists, 30s for dynamic data)
//  - In-flight request deduplication (same URL called N times = 1 network request)
//  - Stale-while-revalidate pattern (show cached, refetch in background)
//  - Prefix-based cache invalidation (e.g., clear all /api/admin/students/*)
//  - Manual invalidation for mutations (POST/PUT/PATCH/DELETE)
// ──────────────────────────────────────────────────────────

interface CacheEntry<T = any> {
  data: T
  expiresAt: number
  staleAt: number  // after this, background refetch is triggered
}

// ─── Cache store ──────────────────────────────────────────
const store = new Map<string, CacheEntry>()

// ─── In-flight request deduplication ──────────────────────
const inFlight = new Map<string, Promise<any>>()

// ─── Default TTLs ─────────────────────────────────────────
export const TTL = {
  LIST: 120_000,        // 2 min — lists that rarely change
  DYNAMIC: 30_000,      // 30s — dashboard stats, counts
  STATIC: 300_000,      // 5 min — about us, resources
  SHORT: 10_000,        // 10s — notification count
} as const

// ─── Generate cache key from URL + options ────────────────
export function cacheKey(url: string, options?: RequestInit): string {
  const body = options?.body ? JSON.stringify(options.body) : ''
  const method = options?.method || 'GET'
  return `${method}::${url}::${body}`
}

// ─── Check if a key should be cached ──────────────────────
// Only cache GET requests
function isCachable(method?: string): boolean {
  return !method || method === 'GET'
}

// ─── Get from cache (returns null if expired or missing) ──
export function getFromCache<T>(key: string): { data: T; stale: boolean } | null {
  const entry = store.get(key)
  if (!entry) return null

  const now = Date.now()

  // Fresh data — return it
  if (now < entry.staleAt) {
    return { data: entry.data as T, stale: false }
  }

  // Stale but not expired — return it, caller should refetch
  if (now < entry.expiresAt) {
    return { data: entry.data as T, stale: true }
  }

  // Expired — remove and return null
  store.delete(key)
  return null
}

// ─── Set cache entry ──────────────────────────────────────
export function setCache<T>(key: string, data: T, ttl: number = TTL.LIST) {
  const now = Date.now()
  store.set(key, {
    data,
    expiresAt: now + ttl,
    staleAt: now + Math.floor(ttl * 0.5), // stale at 50% of TTL
  })
}

// ─── Invalidate cache by key or prefix ───────────────────
export function invalidateCache(match: string) {
  // If exact match, delete it
  if (store.has(match)) {
    store.delete(match)
    return
  }

  // Otherwise, delete all keys that start with this prefix
  for (const key of store.keys()) {
    if (key.includes(match)) {
      store.delete(key)
    }
  }
}

// ─── Invalidate all cache entries ────────────────────────
export function clearAllCache() {
  store.clear()
  inFlight.clear()
}

// ─── Cached fetch with deduplication ─────────────────────
// Returns a promise that resolves with the data.
// If the same URL is being fetched, returns the in-flight promise.
export async function cachedFetch<T = any>(
  url: string,
  options?: RequestInit,
  ttl: number = TTL.LIST,
): Promise<T> {
  const key = cacheKey(url, options)

  // Check cache first
  const cached = getFromCache<T>(key)
  if (cached && !cached.stale) {
    return cached.data
  }

  // Deduplicate in-flight requests
  if (inFlight.has(key)) {
    return inFlight.get(key) as Promise<T>
  }

  // Fetch
  const promise = (async () => {
    try {
      const res = await fetch(url, options)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()

      // Cache the result (only GET)
      if (isCachable(options?.method)) {
        setCache(key, data, ttl)
      }

      // If we have stale data, keep it but trigger background refetch
      if (cached?.stale) {
        // Store fresh data but don't block the return
        return data
      }

      return data as T
    } finally {
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, promise)

  // If stale data exists, return it immediately and trigger background refetch
  if (cached?.stale) {
    // Start the background fetch but return stale data
    promise.then(() => {}).catch(() => {})
    return cached.data
  }

  return promise
}

// ─── Get cache stats (for debugging) ──────────────────────
export function getCacheStats() {
  return {
    size: store.size,
    keys: Array.from(store.keys()),
    inFlight: inFlight.size,
  }
}
