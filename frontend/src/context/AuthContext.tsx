import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface User {
  id: string
  role: 'student' | 'company' | 'admin'
  fullName?: string
  companyName?: string
  email: string
  phone?: string
  linkedin?: string
  github?: string
  portfolio?: string
  bio?: string
  field?: string
  skills?: string[]
  experience?: string
  education?: any[]
  introduction?: string
  profilePicture?: string
  // Company fields
  website?: string
  description?: string
  logo?: string
  ceoName?: string
  ceoMessage?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  industry?: string
  employeeCount?: string
  foundedYear?: string
  linkedin?: string
  twitter?: string
  facebook?: string
  benefits?: string[]
  culture?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string, role: 'student' | 'company') => Promise<void>
  signup: (name: string, email: string, password: string, role: 'student' | 'company') => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'prepmate_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  // On mount, if token exists, fetch user
  useEffect(() => {
    if (token) {
      fetchUser(token)
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async (jwt: string) => {
    try {
      // Try regular auth first, then admin
      let res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
        setLoading(false)
        return
      }

      // If regular auth fails, try admin auth
      res = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
      } else {
        // Token invalid/expired
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      }
    } catch {
      setUser(null)
    }
    setLoading(false)
  }

  const login = async (email: string, password: string, role: 'student' | 'company') => {
    const endpoint = role === 'company' ? '/api/auth/company-login' : '/api/auth/login'
    const body = role === 'company' ? { email, password } : { email, password }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const signup = async (name: string, email: string, password: string, role: 'student' | 'company') => {
    const endpoint = role === 'company' ? '/api/auth/company-signup' : '/api/auth/signup'
    const body = role === 'company' ? { companyName: name, email, password } : { fullName: name, email, password }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Signup failed')
    localStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const refreshUser = async () => {
    if (!token) return
    await fetchUser(token)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
