import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface DarkModeContextType {
  darkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (val: boolean) => void
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

const STORAGE_KEY = 'prepmate-darkmode'

function getInitialDarkMode(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
    // Fallback: system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(getInitialDarkMode)

  // Sync the `dark` class on <html> whenever darkMode changes
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try { localStorage.setItem(STORAGE_KEY, darkMode ? 'true' : 'false') } catch { /* noop */ }
  }, [darkMode])

  const toggleDarkMode = () => setDarkModeState(prev => !prev)
  const setDarkMode = (val: boolean) => setDarkModeState(val)

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkMode() {
  const ctx = useContext(DarkModeContext)
  if (!ctx) throw new Error('useDarkMode must be used within DarkModeProvider')
  return ctx
}
