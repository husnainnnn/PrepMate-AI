import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Mail, Loader2, CheckCircle, ArrowRight } from 'lucide-react'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') || 'student'

  const [step, setStep] = useState<'email' | 'code' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  const sendResetCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send code')
      setStep('code')
      setMessage('A 6-digit code has been sent to your email.')
      setTimeout(() => codeRefs.current[0]?.focus(), 100)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    // Auto-advance to next input
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus()
    }
    // Auto-submit when all 6 digits entered
    if (value && index === 5) {
      const fullCode = [...newCode.slice(0, 5), value].join('')
      if (fullCode.length === 6) verifyCode(fullCode)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  const verifyCode = async (fullCode?: string) => {
    const finalCode = fullCode || code.join('')
    if (finalCode.length !== 6) { setError('Please enter the full 6-digit code.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: finalCode, type: 'password_reset' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')
      // Navigate to reset password with email + code
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}&code=${finalCode}`)
    } catch (err: any) { setError(err.message); setCode(['', '', '', '', '', '']); codeRefs.current[0]?.focus() }
    finally { setLoading(false) }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split('')
      setCode(newCode)
      if (newCode.every(d => d)) verifyCode(pasted)
    }
  }

  return (
    <div className="min-h-screen w-full bg-white text-[#101828] font-sans antialiased flex items-center justify-center px-6 py-12">
      <style>{`
        @keyframes page-enter { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-page-enter { animation: page-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>

      <div className="w-full max-w-md animate-page-enter">
        {/* Back to login */}
        <Link to={`/login?role=${role}`} className="inline-flex items-center gap-1.5 text-[13px] text-[#667085] hover:text-[#101828] transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        <div className="flex items-center gap-2.5 mb-2">
          <img src="/images.png" alt="PrepMate AI" className="h-8 w-8 rounded-full" />
          <span className="text-base font-semibold tracking-tight">
            PrepMate <span className="text-[#1a6fa8]">AI</span>
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mt-6">Forgot Password</h1>
        <p className="mt-2 text-[14px] text-[#667085]">
          {step === 'email' && 'Enter your email and we\'ll send you a reset code.'}
          {step === 'code' && 'Enter the 6-digit code sent to your email.'}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600 animate-shake">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-600">
            {message}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={sendResetCode} className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#344054]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@prepmate.ai"
                className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-105 disabled:opacity-70"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <div className="mt-6 space-y-5">
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="h-14 w-12 rounded-xl border-2 border-[#E4E7EC] bg-white text-center text-xl font-bold text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15"
                />
              ))}
            </div>
            <button
              onClick={() => verifyCode()}
              disabled={loading || code.some(d => !d)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-105 disabled:opacity-70"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify Code'}
            </button>
            <p className="text-center text-[12px] text-[#98A2B3]">
              Didn't receive the code?{' '}
              <button onClick={sendResetCode} className="text-[#1a6fa8] hover:underline font-medium">
                Resend
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
