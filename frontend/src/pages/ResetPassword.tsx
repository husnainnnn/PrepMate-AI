import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const code = searchParams.get('code') || ''
  const role = searchParams.get('role') || 'student'

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reset password')
      setDone(true)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (done) {
    return (
      <div className="min-h-screen w-full bg-white text-[#101828] font-sans antialiased flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center animate-page-enter">
          <style>{`@keyframes page-enter { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } } .animate-page-enter { animation: page-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }`}</style>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Password Reset!</h1>
          <p className="mt-2 text-[14px] text-[#667085]">Your password has been successfully reset.</p>
          <Link
            to={`/login?role=${role}`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-105"
          >
            Login with New Password
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-white text-[#101828] font-sans antialiased flex items-center justify-center px-6 py-12">
      <style>{`
        @keyframes page-enter { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-page-enter { animation: page-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <div className="w-full max-w-md animate-page-enter">
        <Link to={`/login?role=${role}`} className="inline-flex items-center gap-1.5 text-[13px] text-[#667085] hover:text-[#101828] transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        <div className="flex items-center gap-2.5 mb-2">
          <img src="/images.png" alt="PrepMate AI" className="h-8 w-8 rounded-full" />
          <span className="text-base font-semibold tracking-tight">
            PrepMate <span className="text-[#1a6fa8]">AI</span>
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mt-6">Set New Password</h1>
        <p className="mt-2 text-[14px] text-[#667085]">
          Create a new password for <span className="font-medium text-[#101828]">{email}</span>
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#344054]">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 pr-11 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#101828] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#344054]">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-105 disabled:opacity-70"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
