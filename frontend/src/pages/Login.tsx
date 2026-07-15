import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Sparkles,
  MessageCircle,
  Code2,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Loader2,
  MailCheck,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

type FocusField = 'none' | 'email' | 'password'

const PUPIL_RANGE = 6

function unitOffset(dx: number, dy: number, range: number) {
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return { x: 0, y: 0 }
  return { x: (dx / dist) * range, y: (dy / dist) * range }
}

export function Login() {
  const navigate = useNavigate()
  const { login, googleLogin } = useAuth()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') || 'student'
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [focusField, setFocusField] = useState<FocusField>('none')
  const [lookAt, setLookAt] = useState({ x: 0, y: 0 })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Verification step
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', ''])
  const [verificationId, setVerificationId] = useState('')
  const verifyRefs = useRef<(HTMLInputElement | null)[]>([])

  // Google Sign-In
  const [googleLoaded, setGoogleLoaded] = useState(false)

  // Load Google Identity Services script
  useEffect(() => {
    if (typeof window.google !== 'undefined' && window.google?.accounts) {
      setGoogleLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setGoogleLoaded(true)
    document.body.appendChild(script)
    return () => {
      const el = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (el) el.remove()
    }
  }, [])

  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential, role }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed')

      googleLogin(data.token, data.user)
      const dashboardPath = role === 'company' ? '/company/dashboard' : '/student/dashboard'
      navigate(dashboardPath, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    if (!googleLoaded || !window.google?.accounts) {
      setError('Google Sign-In is loading. Please try again in a moment.')
      return
    }
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError('Google Sign-In is not configured. Contact support or add VITE_GOOGLE_CLIENT_ID to .env')
      return
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredentialResponse,
    })
    window.google.accounts.id.prompt()
  }

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')


  const leftEyeRef = useRef<SVGCircleElement | null>(null)
  const rightEyeRef = useRef<SVGCircleElement | null>(null)

  useEffect(() => {
    const handleMove = (e: MouseEvent) => setLookAt({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  const pupilOffset = (ref: React.RefObject<SVGCircleElement | null>) => {
    if (!ref.current) return { x: 0, y: 0 }
    const r = ref.current.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    return unitOffset(lookAt.x - cx, lookAt.y - cy, PUPIL_RANGE)
  }

  const eyesClosed = focusField === 'password' && !showPassword
  const lookingAtEmail = focusField === 'email'

  const leftPupil = lookingAtEmail ? { x: PUPIL_RANGE, y: 2 } : pupilOffset(leftEyeRef)
  const rightPupil = lookingAtEmail ? { x: PUPIL_RANGE, y: 2 } : pupilOffset(rightEyeRef)

  const handleSendVerification = async () => {
    if (!fullName.trim()) throw new Error(role === 'company' ? 'Company name is required.' : 'Full name is required.')
    if (!email.trim()) throw new Error('Email is required.')
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.')

    const res = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), type: 'signup' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send verification')
  }

  const handleVerifySignup = async () => {
    if (verifyCode.some(d => !d)) throw new Error('Please enter the full verification code.')
    const code = verifyCode.join('')

    // First verify the code
    const verifyRes = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), code, type: 'email_verification' }),
    })
    const verifyData = await verifyRes.json()
    if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid verification code')

    // Then create account
    const endpoint = role === 'company' ? '/api/auth/company-signup' : '/api/auth/signup'
    const body = role === 'company'
      ? { companyName: fullName.trim(), email: email.trim(), password, verificationCode: code }
      : { fullName: fullName.trim(), email: email.trim(), password, verificationCode: code }
    const signupRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const signupData = await signupRes.json()
    if (!signupRes.ok) throw new Error(signupData.error || 'Signup failed')

    // Auto-login
    await login(email.trim(), password, role as 'student' | 'company')
    const dashboardPath = role === 'company' ? '/company/dashboard' : '/student/dashboard'
    navigate(dashboardPath, { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signup' && !verificationId) {
        // Step 1: Send verification code
        await handleSendVerification()
        setVerificationId('pending')
        setError('') // clear any previous error
        setTimeout(() => verifyRefs.current[0]?.focus(), 100)
      } else if (mode === 'signup' && verificationId === 'pending') {
        // Step 2: Verify code + create account
        await handleVerifySignup()
      } else {
        // Login: use context, then go to dashboard
        await login(email.trim(), password, role as 'student' | 'company')
        const dashboardPath = role === 'company' ? '/company/dashboard' : '/student/dashboard'
        navigate(dashboardPath, { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const handleVerificationKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verifyCode[index] && index > 0) {
      verifyRefs.current[index - 1]?.focus()
    }
  }

  const handleVerificationPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split('')
      setVerifyCode(newCode)
      setTimeout(() => handleSubmit(e as any), 200)
    }
  }

  return (
    <div className="min-h-screen w-full bg-white text-[#101828] font-sans antialiased">
      <style>{`
        @keyframes floaty { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-12px);} }
        @keyframes floaty-slow { 0%,100% { transform: translateY(0) rotate(0);} 50% { transform: translateY(-8px) rotate(3deg);} }
        @keyframes pulse-ring { 0% { transform: scale(0.9); opacity: 0.6;} 100% { transform: scale(1.4); opacity: 0;} }
        @keyframes pulse-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.55; } }
        @keyframes page-enter { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
        .anim-float { animation: floaty 5s ease-in-out infinite; }
        .anim-float-slow { animation: floaty-slow 6s ease-in-out infinite; }
        .anim-float-delay { animation: floaty 5.5s ease-in-out infinite 0.6s; }
        .anim-ring { animation: pulse-ring 2.6s ease-out infinite; }
        .anim-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .pupil { transition: transform 0.15s ease-out; }
        .dotted-trail { stroke-dasharray: 2 6; }
        .animate-page-enter { animation: page-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .pm-input {
          width: 100%; border-radius: 0.75rem; background: #fff;
          border: 1px solid #E4E7EC; padding: 0.75rem 1rem;
          font-size: 0.9rem; color: #101828; outline: none;
          transition: box-shadow .15s ease, border-color .15s ease;
        }
        .pm-input::placeholder { color: #98A2B3; }
        .pm-input:focus { border-color: #1a6fa8; box-shadow: 0 0 0 4px rgba(26,111,168,0.15); }
      `}</style>

      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
        {/* LEFT — light panel */}
        <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-16 bg-gradient-to-br from-white via-[#F5F7FB] to-[#EEF2FF]">
          {/* Ambient blue glow */}
          <div className="absolute -top-60 right-0 h-[1000px] w-[1000px] rounded-full bg-[#0b3b5c]/18 blur-[200px] anim-glow" />
          <div className="absolute -bottom-60 -left-40 h-[800px] w-[800px] rounded-full bg-[#0b3b5c]/14 blur-[180px]" />

          <div className="z-10 flex items-center gap-2.5">
            <img src="/images.png" alt="PrepMate AI" className="h-9 w-9 rounded-full" />
            <span className="text-lg font-semibold tracking-tight text-[#101828]">
              PrepMate <span className="text-[#1a6fa8]">AI</span>
            </span>
          </div>

          <div className="relative flex flex-1 items-center justify-center py-10">
            <div className="absolute h-[1100px] w-[1100px] rounded-full bg-[#0b3b5c]/95 blur-[280px] anim-glow" />

            <div className="anim-float absolute left-4 top-12">
              <IconChip><Code2 className="h-5 w-5 text-white" /></IconChip>
            </div>
            <div className="anim-float-slow absolute right-6 top-20">
              <IconChip><MessageCircle className="h-5 w-5 text-white" /></IconChip>
            </div>
            <div className="anim-float-delay absolute right-2 bottom-36">
              <IconChip><BarChart3 className="h-5 w-5 text-white" /></IconChip>
            </div>
            <div className="anim-float absolute left-6 bottom-28">
              <IconChip><ShieldCheck className="h-5 w-5 text-white" /></IconChip>
            </div>

            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 500 500" fill="none">
              <path
                d="M60 420 C 150 340, 200 260, 320 200 S 460 100, 470 60"
                stroke="#1a6fa8" strokeOpacity="0.45" strokeWidth="2"
                className="dotted-trail" strokeLinecap="round"
              />
            </svg>

            <div className="relative anim-float">
              <div className="absolute inset-0 rounded-full bg-[#0b3b5c]/95 blur-[250px] anim-glow" />
              <svg width="290" height="290" viewBox="0 0 290 290"
                className="relative drop-shadow-[0_30px_60px_rgba(11,59,92,0.6)]">
                <defs>
                  <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#DCE4FF" />
                  </linearGradient>
                  <linearGradient id="faceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0b3b5c" />
                    <stop offset="100%" stopColor="#1a6fa8" />
                  </linearGradient>
                  <radialGradient id="cheek" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="#FFB4C7" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#FFB4C7" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <line x1="145" y1="55" x2="145" y2="35" stroke="#1a6fa8" strokeWidth="3" strokeLinecap="round" />
                <circle cx="145" cy="29" r="6" fill="#1a6fa8" />
                <circle cx="145" cy="29" r="10" fill="#1a6fa8" opacity="0.25" className="anim-ring" />

                <rect x="60" y="60" width="170" height="160" rx="45"
                  fill="url(#bodyGrad)" stroke="#E4E7EC" strokeWidth="1.5" />
                <rect x="80" y="90" width="130" height="90" rx="30" fill="url(#faceGrad)" />

                {eyesClosed ? (
                  <>
                    <path d="M108 138 Q 118 128 128 138" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
                    <path d="M162 138 Q 172 128 182 138" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
                  </>
                ) : (
                  <>
                    <circle ref={leftEyeRef} cx="118" cy="133" r="12" fill="#fff" />
                    <circle ref={rightEyeRef} cx="172" cy="133" r="12" fill="#fff" />
                    <circle cx={118 + leftPupil.x} cy={133 + leftPupil.y} r="5" fill="#101828" className="pupil" />
                    <circle cx={172 + rightPupil.x} cy={133 + rightPupil.y} r="5" fill="#101828" className="pupil" />
                  </>
                )}

                <circle cx="96" cy="160" r="8" fill="url(#cheek)" />
                <circle cx="194" cy="160" r="8" fill="url(#cheek)" />

                <rect x="38" y="133" width="24" height="50" rx="12" fill="url(#bodyGrad)" stroke="#E4E7EC" />
                <rect x="228" y="133" width="24" height="50" rx="12" fill="url(#bodyGrad)" stroke="#E4E7EC" />

                <ellipse cx="145" cy="248" rx="90" ry="10" fill="#1a6fa8" opacity="0.15" />
              </svg>
            </div>
          </div>

          <div className="relative z-10 rounded-2xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] p-5 shadow-lg shadow-[#0b3b5c]/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">AI-Powered Interview Preparation</h3>
                <p className="mt-1 text-sm text-white/70">Practice smarter. Get better. Crack interviews.</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="flex items-center justify-center bg-white px-10 py-12 sm:px-16 lg:px-20">
          <div className="w-full max-w-lg animate-page-enter">
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <img src="/images.png" alt="PrepMate AI" className="h-9 w-9 rounded-full" />
              <span className="text-lg font-semibold tracking-tight">
                PrepMate <span className="text-[#1a6fa8]">AI</span>
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-[#F5F7FB] px-3 py-1 text-xs font-medium text-[#667085]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1a6fa8]" />
              {mode === 'login' ? 'Welcome back' : 'Get started'}
            </div>

            <h1 className="mt-5 text-[2.5rem] font-semibold tracking-tight leading-[1.1] sm:text-5xl">
              {mode === 'login'
                ? role === 'company'
                  ? 'Welcome back, recruiter!'
                  : 'Glad to see you again!'
                : role === 'company'
                  ? "Set up your company profile"
                  : "Let's build your prep journey!"}
            </h1>
            <p className="mt-4 text-base text-[#667085] leading-relaxed">
              {mode === 'login'
                ? role === 'company'
                  ? 'Login to access your company dashboard and manage recruitment.'
                  : 'Login to continue your interview preparation journey with AI.'
                : role === 'company'
                  ? 'Create an account to start posting jobs and screening candidates.'
                  : 'Create an account to start practicing with AI-powered mock interviews.'}
            </p>

            {error && (
              <div className={`mt-6 rounded-xl border px-4 py-3 text-[13px] ${
                error.startsWith('Account created')
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}>
                {error}
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {mode === 'signup' && verificationId !== 'pending' && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Full name</span>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Husnain Sattar" className="pm-input" />
                </label>
              )}

              {verificationId !== 'pending' && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@prepmate.ai"
                    onFocus={() => setFocusField('email')}
                    onBlur={() => setFocusField('none')}
                    disabled={mode === 'signup' && verificationId === 'pending'}
                    className="pm-input" />
                </label>
              )}

              {verificationId !== 'pending' && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Password</span>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      onFocus={() => setFocusField('password')}
                      onBlur={() => setFocusField('none')}
                      className="pm-input pr-11"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] transition-colors hover:text-[#101828]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              )}

              {/* Verification code step */}
              {mode === 'signup' && verificationId === 'pending' && (
                <div className="rounded-xl border border-[#EAECF0] bg-[#F7F9FC] p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <MailCheck className="h-5 w-5 text-[#1a6fa8]" />
                    <span className="text-[13px] font-medium text-[#344054]">Verify your email</span>
                  </div>
                  <p className="text-[12.5px] text-[#667085] mb-4">
                    A 6-digit code has been sent to <span className="font-medium text-[#101828]">{email}</span>
                  </p>
                  <div className="flex justify-center gap-2 mb-4" onPaste={handleVerificationPaste}>
                    {verifyCode.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { verifyRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val.length > 1) return
                          const newCode = [...verifyCode]
                          newCode[i] = val
                          setVerifyCode(newCode)
                          if (val && i < 5) verifyRefs.current[i + 1]?.focus()
                        }}
                        onKeyDown={(e) => handleVerificationKeyDown(i, e)}
                        className="h-12 w-11 rounded-xl border-2 border-[#E4E7EC] bg-white text-center text-lg font-bold text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15"
                      />
                    ))}
                  </div>
                  <p className="text-center text-[11px] text-[#98A2B3]">
                    Didn't receive it?{' '}
                    <button type="button" onClick={async () => {
                      setLoading(true); setError(null)
                      try { await handleSendVerification(); setError('') }
                      catch (err: any) { setError(err.message) }
                      finally { setLoading(false) }
                    }} className="text-[#1a6fa8] hover:underline font-medium">
                      Resend code
                    </button>
                  </p>
                </div>
              )}

              {verificationId !== 'pending' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-[#667085]">
                    <input type="checkbox" className="h-4 w-4 rounded border-[#E4E7EC] text-[#1a6fa8] focus:ring-[#1a6fa8]/30" />
                    Remember me
                  </label>
                  <Link to={`/forgot-password?role=${role}`} className="font-medium text-[#1a6fa8] hover:underline">
                    Forgot password?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (mode === 'signup' && verificationId === 'pending' && verifyCode.some(d => !d))}
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-105 hover:shadow-xl hover:shadow-[#0b3b5c]/40 active:scale-[0.99] disabled:opacity-70"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Please wait...</>
                ) : (
                  <>
                    {mode === 'login'
                      ? `Login as ${role === 'company' ? 'Company' : 'Student'}`
                      : verificationId === 'pending' ? 'Verify & Create Account' : 'Sign up'
                    }
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="my-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E4E7EC]" />
              <span className="text-xs text-[#667085]">or continue with</span>
              <div className="h-px flex-1 bg-[#E4E7EC]" />
            </div>

            <button
              type="button"
              disabled={loading || !googleLoaded}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E4E7EC] bg-white px-5 py-3.5 text-sm font-medium text-[#101828] transition-all hover:bg-[#F5F7FB] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleGoogleSignIn}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>
              <p className="mt-8 text-center text-sm text-[#667085]">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setVerificationId('') }}
                  className="font-semibold text-[#1a6fa8] hover:underline">
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
              <p className="mt-6 text-center text-xs text-[#667085]">
                <Link to="/" className="hover:text-[#101828] transition-colors">← Back to home</Link>
              </p>
              <p className="mt-2 text-center text-xs text-[#667085]">
                <Link to={role === 'student' ? '/login?role=company' : '/login?role=student'} className="text-[#1a6fa8] hover:underline">
                  {role === 'student' ? 'Join as Company instead →' : 'Join as Student instead →'}
                </Link>
              </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
      {children}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  )
}
