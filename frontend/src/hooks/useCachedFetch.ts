import { useState, useEffect, useRef } from 'react'
import { cachedFetch, invalidateCache, TTL } from '@/lib/apiCache'
import { useCache } from '@/context/CacheContext'

interface CachedState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Custom hook for cached API fetching.
 *
 * Features:
 * - In-memory cache with configurable TTL
 * - Returns stale data immediately, refetches in background
 * - Deduplicates in-flight requests
 * - Automatic refetch when URL or key changes
 * - Integration with CacheContext for global invalidation
 *
 * @param url - The API URL to fetch (null/empty to skip)
 * @param options - Standard fetch options (method, headers, body)
 * @param ttl - Cache TTL in ms (default LIST = 2 min)
 * @param key - Optional cache key override (defaults to URL)
 */
export function useCachedFetch<T = any>(
  url: string | null,
  options?: RequestInit,
  ttl?: number,
): CachedState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)
  const mountedRef = useRef(true)
  const { onInvalidate } = useCache()

  const refetch = () => setTick(t => t + 1)

  // Listen for cache invalidation events
  useEffect(() => {
    if (!url) return
    const handler = (invalidatedKey: string) => {
      if (url.includes(invalidatedKey)) {
        refetch()
      }
    }
    const unsub = onInvalidate(handler)
    return unsub
  }, [url, onInvalidate])

  useEffect(() => {
    if (!url) {
      setLoading(false)
      return
    }

    let cancelled = false
    mountedRef.current = true
    setLoading(true)
    setError(null)

    const actualTtl = ttl ?? TTL.LIST

    cachedFetch<T>(url, options, actualTtl)
      .then(result => {
        if (!cancelled && mountedRef.current) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled && mountedRef.current) {
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [url, options?.body, tick])

  // Reset state when URL changes
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [url])

  return { data, loading, error, refetch }
}

/**
 * Perform a mutation (POST/PUT/PATCH/DELETE) and invalidate related cache keys.
 * Returns [mutate, { loading, error }].
 */
export function useMutate() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = async (
    url: string,
    options: RequestInit,
    invalidatePatterns?: string[],
  ): Promise<any> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, options)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      // Invalidate related cache keys
      if (invalidatePatterns) {
        for (const pattern of invalidatePatterns) {
          invalidateCache(pattern)
        }
      }

      return data
    } catch (err: any) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return [mutate, { loading, error }] as const
}
