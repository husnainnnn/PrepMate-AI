import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function AdminLogin() {
  // Admin login page hamesha light mode mein rahega
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')
    root.classList.remove('dark')
    return () => {
      if (wasDark) root.classList.add('dark')
    }
  }, [])
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid credentials')

      localStorage.setItem('prepmate_token', data.token)
      window.location.href = '/admin/dashboard'
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-[#F5F7FB] to-[#EEF2FF] px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/images.png" alt="PrepMate AI" className="h-8 w-8 rounded-full" />
          <span className="text-lg font-semibold tracking-tight text-[#101828]">
            PrepMate <span className="text-[#1a6fa8]">AI</span>
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#EAECF0] bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
            <Shield className="h-7 w-7 text-white" />
          </div>

          <h1 className="mt-4 text-center text-xl font-semibold text-[#101828]">Admin Login</h1>
          <p className="mt-1 text-center text-[13px] text-[#667085]">Secure access to admin panel</p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter admin email"
                className="w-full rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-[13.5px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-2 focus:ring-[#1a6fa8]/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#344054]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2.5 pr-10 text-[13.5px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-2 focus:ring-[#1a6fa8]/20"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {loading ? 'Authenticating...' : 'Login as Admin'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-[12.5px] text-[#667085] transition-colors hover:text-[#101828]">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
        </p>
      </div>
    </div>
  )
}
