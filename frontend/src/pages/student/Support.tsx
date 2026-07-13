import { useState } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import {
  Bug, Lightbulb, ChevronDown, ChevronUp, Send, Loader2, CheckCircle, AlertCircle,
  Building2, HelpCircle,
} from 'lucide-react'

// ─── FAQ Data ──────────────────────────────────────────────

const FAQS = [
  {
    q: 'What is PrepMate AI?',
    a: 'PrepMate AI is an AI-powered interview preparation platform that helps students practice interviews, receive AI-generated feedback, improve resumes, and connect with verified companies.',
  },
  {
    q: 'Is PrepMate AI free to use?',
    a: 'Yes, students can access the core features of PrepMate AI for free. Some advanced features may be introduced in future updates.',
  },
  {
    q: 'Who can use PrepMate AI?',
    a: 'PrepMate AI is designed for students, job seekers, and companies looking to hire qualified candidates.',
  },
  {
    q: 'How does the AI mock interview work?',
    a: 'The AI asks interview questions based on your selected role or field. After the interview, it analyzes your responses and provides detailed feedback.',
  },
  {
    q: 'Will I receive feedback after the interview?',
    a: 'Yes. After completing a mock interview, you\'ll receive AI-generated feedback to help improve your performance.',
  },
  {
    q: 'Can I practice multiple interviews?',
    a: 'Yes. You can take multiple mock interviews to improve your confidence and interview skills.',
  },
  {
    q: 'Can I upload my resume?',
    a: 'Yes. You can upload your resume and use the available tools to analyze and improve it.',
  },
  {
    q: 'How do I apply for a job?',
    a: 'Browse available job postings, open the job details, and click the Apply button if you meet the requirements.',
  },
  {
    q: 'Are companies verified?',
    a: 'Yes. Companies go through a verification process before they can post jobs and conduct interviews on the platform.',
  },
  {
    q: 'Can I report a company?',
    a: 'Yes. If you believe a company is fake or violates platform policies, you can report it for review using the "Report a Company" section above.',
  },
  {
    q: 'How can a company register?',
    a: 'Companies can create an account, submit the required information, and complete the verification process before accessing hiring features.',
  },
  {
    q: 'I forgot my password. What should I do?',
    a: 'Click the Forgot Password option on the login page and follow the instructions sent to your registered email.',
  },
  {
    q: 'Can I edit my profile?',
    a: 'Yes. You can update your profile information, skills, education, and resume anytime from the Profile or Settings page.',
  },
  {
    q: 'What should I do if something isn\'t working?',
    a: 'Try refreshing the page or signing in again. If the issue continues, contact our support team through the Help & Support page.',
  },
  {
    q: 'How can I contact support?',
    a: 'Use the Contact Support form available on the Help & Support page. Our team will respond as soon as possible.',
  },
]

// ─── Component ─────────────────────────────────────────────

export default function SupportPage() {
  const { token } = useAuth()
  const [activeForm, setActiveForm] = useState<'none' | 'bug' | 'feature' | 'company' | 'help'>('none')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // ─── Bug report ───────────────────────────────────────
  const [bugName, setBugName] = useState('')
  const [bugDetails, setBugDetails] = useState('')
  const [bugSubmitting, setBugSubmitting] = useState(false)
  const [bugSuccess, setBugSuccess] = useState(false)
  const [bugError, setBugError] = useState('')

  const handleBugSubmit = async () => {
    if (!token) return
    setBugError(''); setBugSuccess(false)
    if (!bugName.trim()) { setBugError('Please enter a bug name.'); return }
    if (!bugDetails.trim()) { setBugError('Please describe the bug in detail.'); return }
    setBugSubmitting(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'bug', bugName: bugName.trim(), bugDetails: bugDetails.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setBugSuccess(true); setBugName(''); setBugDetails('')
      setTimeout(() => setBugSuccess(false), 5000)
    } catch (err: any) { setBugError(err.message || 'Something went wrong.') }
    setBugSubmitting(false)
  }

  // ─── Feature suggestion ────────────────────────────────
  const [featureName, setFeatureName] = useState('')
  const [featureDesc, setFeatureDesc] = useState('')
  const [featureSubmitting, setFeatureSubmitting] = useState(false)
  const [featureSuccess, setFeatureSuccess] = useState(false)
  const [featureError, setFeatureError] = useState('')

  const handleFeatureSubmit = async () => {
    if (!token) return
    setFeatureError(''); setFeatureSuccess(false)
    if (!featureName.trim()) { setFeatureError('Please enter a feature name.'); return }
    if (!featureDesc.trim()) { setFeatureError('Please describe the feature.'); return }
    setFeatureSubmitting(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'feature', featureName: featureName.trim(), featureDescription: featureDesc.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setFeatureSuccess(true); setFeatureName(''); setFeatureDesc('')
      setTimeout(() => setFeatureSuccess(false), 5000)
    } catch (err: any) { setFeatureError(err.message || 'Something went wrong.') }
    setFeatureSubmitting(false)
  }

  // ─── Report a Company ──────────────────────────────────
  const [companyName, setCompanyName] = useState('')
  const [companyReason, setCompanyReason] = useState('')
  const [companySubmitting, setCompanySubmitting] = useState(false)
  const [companySuccess, setCompanySuccess] = useState(false)
  const [companyError, setCompanyError] = useState('')

  const handleCompanySubmit = async () => {
    if (!token) return
    setCompanyError(''); setCompanySuccess(false)
    if (!companyName.trim()) { setCompanyError('Please enter the company name.'); return }
    if (!companyReason.trim()) { setCompanyError('Please provide a reason for reporting.'); return }
    setCompanySubmitting(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'report-company', companyName: companyName.trim(), companyReason: companyReason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setCompanySuccess(true); setCompanyName(''); setCompanyReason('')
      setTimeout(() => setCompanySuccess(false), 5000)
    } catch (err: any) { setCompanyError(err.message || 'Something went wrong.') }
    setCompanySubmitting(false)
  }

  // ─── Need Help ─────────────────────────────────────────
  const [helpMessage, setHelpMessage] = useState('')
  const [helpSubmitting, setHelpSubmitting] = useState(false)
  const [helpSuccess, setHelpSuccess] = useState(false)
  const [helpError, setHelpError] = useState('')

  const handleHelpSubmit = async () => {
    if (!token) return
    setHelpError(''); setHelpSuccess(false)
    if (!helpMessage.trim()) { setHelpError('Please describe how we can help you.'); return }
    setHelpSubmitting(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'need-help', helpMessage: helpMessage.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setHelpSuccess(true); setHelpMessage('')
      setTimeout(() => setHelpSuccess(false), 5000)
    } catch (err: any) { setHelpError(err.message || 'Something went wrong.') }
    setHelpSubmitting(false)
  }

  const inputCls = 'w-full rounded-lg border border-[#D0D5DD] dark:border-[#475569] bg-white dark:bg-[#1E293B] px-3.5 py-2.5 text-[13px] text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#98A2B3] dark:placeholder:text-[#64748B] outline-none transition-all focus:border-[#1a6fa8] focus:ring-2 focus:ring-[#1a6fa8]/20'

  return (
    <StudentDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
            <HelpCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828] dark:text-[#F1F5F9]">Help & Support</h1>
            <p className="text-[13.5px] text-[#667085] dark:text-[#94A3B8]">
              Report issues, suggest features, report companies, or get help from our team.
            </p>
          </div>
        </div>

        {/* ═══════════════ Report a Bug ═══════════════════ */}
        <Card className="rounded-xl border-[#EAECF0] dark:border-[#334155] shadow-sm">
          <CardContent className="p-6">
            <button
              onClick={() => setActiveForm(activeForm === 'bug' ? 'none' : 'bug')}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
                <Bug className="h-5 w-5 text-red-500 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Report a Bug</h2>
                <p className="text-[12.5px] text-[#667085] dark:text-[#94A3B8]">Found something broken? Let us know so we can fix it.</p>
              </div>
              {activeForm === 'bug' ? <ChevronUp className="h-5 w-5 text-[#667085]" /> : <ChevronDown className="h-5 w-5 text-[#667085]" />}
            </button>

            {activeForm === 'bug' && (
              <div className="mt-5 space-y-4 border-t border-[#EAECF0] dark:border-[#334155] pt-5">
                {bugSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-3 text-[13px] text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 shrink-0" /> Bug report submitted! We'll review it shortly.
                  </div>
                )}
                {bugError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {bugError}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8]">Bug Name <span className="text-red-500">*</span></label>
                  <input value={bugName} onChange={e => setBugName(e.target.value)} placeholder="e.g. Profile picture not uploading" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8]">Details <span className="text-red-500">*</span></label>
                  <textarea value={bugDetails} onChange={e => setBugDetails(e.target.value)} placeholder="Describe what happened, steps to reproduce, and what you expected..." rows={4} className={inputCls + ' resize-y'} />
                </div>
                <button onClick={handleBugSubmit} disabled={bugSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110 disabled:opacity-50">
                  {bugSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {bugSubmitting ? 'Submitting...' : 'Submit Bug Report'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════ Suggest a Feature ═══════════════ */}
        <Card className="rounded-xl border-[#EAECF0] dark:border-[#334155] shadow-sm">
          <CardContent className="p-6">
            <button
              onClick={() => setActiveForm(activeForm === 'feature' ? 'none' : 'feature')}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <Lightbulb className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Suggest a New Feature</h2>
                <p className="text-[12.5px] text-[#667085] dark:text-[#94A3B8]">Have an idea? Tell us what would make PrepMate AI better for you.</p>
              </div>
              {activeForm === 'feature' ? <ChevronUp className="h-5 w-5 text-[#667085]" /> : <ChevronDown className="h-5 w-5 text-[#667085]" />}
            </button>

            {activeForm === 'feature' && (
              <div className="mt-5 space-y-4 border-t border-[#EAECF0] dark:border-[#334155] pt-5">
                {featureSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-3 text-[13px] text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 shrink-0" /> Feature suggestion submitted! Thank you for your input.
                  </div>
                )}
                {featureError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {featureError}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8]">Feature Name <span className="text-red-500">*</span></label>
                  <input value={featureName} onChange={e => setFeatureName(e.target.value)} placeholder="e.g. Dark mode for all pages" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8]">Description <span className="text-red-500">*</span></label>
                  <textarea value={featureDesc} onChange={e => setFeatureDesc(e.target.value)} placeholder="Describe the feature and how it would help..." rows={4} className={inputCls + ' resize-y'} />
                </div>
                <button onClick={handleFeatureSubmit} disabled={featureSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110 disabled:opacity-50">
                  {featureSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {featureSubmitting ? 'Submitting...' : 'Submit Suggestion'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════ Need Help ═══════════════════════ */}
        <Card className="rounded-xl border-[#EAECF0] dark:border-[#334155] shadow-sm">
          <CardContent className="p-6">
            <button
              onClick={() => setActiveForm(activeForm === 'help' ? 'none' : 'help')}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <HelpCircle className="h-5 w-5 text-purple-500 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Need Help?</h2>
                <p className="text-[12.5px] text-[#667085] dark:text-[#94A3B8]">Have a question or issue? Describe it and our team will get back to you.</p>
              </div>
              {activeForm === 'help' ? <ChevronUp className="h-5 w-5 text-[#667085]" /> : <ChevronDown className="h-5 w-5 text-[#667085]" />}
            </button>

            {activeForm === 'help' && (
              <div className="mt-5 space-y-4 border-t border-[#EAECF0] dark:border-[#334155] pt-5">
                {helpSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-3 text-[13px] text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 shrink-0" /> Your request has been submitted. Our support team will get back to you soon.
                  </div>
                )}
                {helpError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {helpError}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8]">How can we help you? <span className="text-red-500">*</span></label>
                  <textarea value={helpMessage} onChange={e => setHelpMessage(e.target.value)} placeholder="Describe your question or issue in detail..." rows={4} className={inputCls + ' resize-y'} />
                </div>
                <button onClick={handleHelpSubmit} disabled={helpSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110 disabled:opacity-50">
                  {helpSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {helpSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════ Report a Company ════════════════ */}
        <Card className="rounded-xl border-[#EAECF0] dark:border-[#334155] shadow-sm">
          <CardContent className="p-6">
            <button
              onClick={() => setActiveForm(activeForm === 'company' ? 'none' : 'company')}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/30">
                <Building2 className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Report a Company</h2>
                <p className="text-[12.5px] text-[#667085] dark:text-[#94A3B8]">Report a suspicious or violating company for review by our team.</p>
              </div>
              {activeForm === 'company' ? <ChevronUp className="h-5 w-5 text-[#667085]" /> : <ChevronDown className="h-5 w-5 text-[#667085]" />}
            </button>

            {activeForm === 'company' && (
              <div className="mt-5 space-y-4 border-t border-[#EAECF0] dark:border-[#334155] pt-5">
                {companySuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-3 text-[13px] text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 shrink-0" /> Company report submitted. Our team will investigate.
                  </div>
                )}
                {companyError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {companyError}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8]">Company Name <span className="text-red-500">*</span></label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. ABC Solutions" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8]">Reason for Reporting <span className="text-red-500">*</span></label>
                  <textarea value={companyReason} onChange={e => setCompanyReason(e.target.value)} placeholder="Explain why you are reporting this company..." rows={4} className={inputCls + ' resize-y'} />
                </div>
                <button onClick={handleCompanySubmit} disabled={companySubmitting}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110 disabled:opacity-50">
                  {companySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {companySubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════ FAQs ════════════════════════════ */}
        <Card className="rounded-xl border-[#EAECF0] dark:border-[#334155] shadow-sm">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <svg className="h-[18px] w-[18px] text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Frequently Asked Questions</h2>
            </div>

            <div className="divide-y divide-[#EAECF0] dark:divide-[#334155]">
              {FAQS.map((faq, i) => (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-[#F7F9FC] dark:hover:bg-[#334155]/30 px-2 -mx-2 rounded-lg"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a6fa8]/10 dark:bg-[#1a6fa8]/20 text-[11px] font-bold text-[#1a6fa8]">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-[13.5px] font-medium text-[#101828] dark:text-[#F1F5F9] leading-snug">
                      {faq.q}
                    </span>
                    {openFaq === i ? <ChevronUp className="h-4 w-4 shrink-0 text-[#98A2B3]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#98A2B3]" />}
                  </button>
                  {openFaq === i && (
                    <div className="pb-3.5 px-2 text-[13px] text-[#667085] dark:text-[#94A3B8] leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentDashboardLayout>
  )
}
