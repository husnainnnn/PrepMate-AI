import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react'
import { invalidateCache, clearAllCache } from '@/lib/apiCache'

type InvalidateHandler = (key: string) => void

interface CacheContextType {
  /** Invalidate cache entries matching a key/prefix */
  invalidate: (pattern: string) => void
  /** Clear entire cache */
  clearAll: () => void
  /** Subscribe to invalidation events (for hooks) */
  onInvalidate: (handler: InvalidateHandler) => () => void
}

const CacheContext = createContext<CacheContextType | undefined>(undefined)

export function CacheProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<Set<InvalidateHandler>>(new Set())

  const invalidate = useCallback((pattern: string) => {
    // Clear the backend cache
    invalidateCache(pattern)
    // Notify all subscribers
    handlersRef.current.forEach(handler => {
      try { handler(pattern) } catch { /* ignore */ }
    })
  }, [])

  const clearAll = useCallback(() => {
    clearAllCache()
  }, [])

  const onInvalidate = useCallback((handler: InvalidateHandler) => {
    handlersRef.current.add(handler)
    return () => {
      handlersRef.current.delete(handler)
    }
  }, [])

  return (
    <CacheContext.Provider value={{ invalidate, clearAll, onInvalidate }}>
      {children}
    </CacheContext.Provider>
  )
}

export function useCache(): CacheContextType {
  const ctx = useContext(CacheContext)
  if (!ctx) {
    throw new Error('useCache must be used within a CacheProvider')
  }
  return ctx
}
