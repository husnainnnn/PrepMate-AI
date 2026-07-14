import { useState } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import { useAuth } from '@/context/AuthContext'
import { Check, Crown, Loader2, Zap, Sparkles, TrendingUp, Bell } from 'lucide-react'

const MONTHLY_PRICE = 9.99
const YEARLY_PRICE = 79.99
const YEARLY_MONTHLY = YEARLY_PRICE / 12
const SAVINGS_PERCENT = Math.round((1 - YEARLY_PRICE / (MONTHLY_PRICE * 12)) * 100) // ~33

const BENEFITS = [
  'Unlimited mock interviews',
  'Pro templates for resumes & cover letters',
  'Unlimited practice sessions',
  'Faster & more job recommendations',
  'Premium notifications for new opportunities',
]

export default function StudentProPlan() {
  const { token } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    if (!token) return
    setLoading(plan)
    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan, role: 'student' }),
      })
      const data = await res.json()
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        alert('Failed to create checkout session.')
        setLoading(null)
      }
    } catch (err) {
      console.error('Payment error:', err)
      alert('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <StudentDashboardLayout>
      {/* Header */}
      <div className="border-b border-[#EAECF0] dark:border-[#334155] bg-gradient-to-r from-[#F7F9FC] to-white dark:from-[#1E293B] dark:to-[#1E293B] px-8 py-6">
        <div>
          <h1 className="text-lg font-semibold text-[#101828] dark:text-[#F1F5F9]">Upgrade to Pro</h1>
          <p className="text-[13px] text-[#667085] dark:text-[#94A3B8]">Unlock premium features to accelerate your career</p>
        </div>
      </div>

      <div className="space-y-6 px-8 py-8">
        {/* ─── Pricing Cards ────────────────────────────────── */}
        <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-2 items-stretch">
          {/* Monthly Card */}
          <PricingCard
            title="Monthly Pro"
            price={`$${MONTHLY_PRICE}`}
            period="/month"
            popular={false}
            loading={loading === 'monthly'}
            onUpgrade={() => handleUpgrade('monthly')}
            benefits={BENEFITS}
          />

          {/* Yearly Card */}
          <PricingCard
            title="Yearly Pro"
            price={`$${YEARLY_PRICE}`}
            period="/year"
            monthlyLabel={`$${YEARLY_MONTHLY.toFixed(2)}/mo`}
            savingsPercent={SAVINGS_PERCENT}
            popular={true}
            loading={loading === 'yearly'}
            onUpgrade={() => handleUpgrade('yearly')}
            benefits={BENEFITS}
          />
        </div>

        {/* ─── Features Section ─────────────────────────────── */}
        <div className="mx-auto max-w-2xl pt-4">
          <h3 className="text-center text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Everything you get with Pro</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { icon: Zap, title: 'Unlimited Mock Interviews', desc: 'Practice as many times as you need with AI interviewers' },
              { icon: Sparkles, title: 'Pro Templates', desc: 'Access premium resume & cover letter templates' },
              { icon: Crown, title: 'Unlimited Practice', desc: 'No limits on practice questions and sessions' },
              { icon: TrendingUp, title: 'Job Recommendations', desc: 'Get faster, more relevant job matches' },
              { icon: Bell, title: 'Premium Notifications', desc: 'Be first to know about new opportunities' },
            ].map((feat, i) => {
              const Icon = feat.icon
              return (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-[#EAECF0] dark:border-[#334155] p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <Icon className="h-[18px] w-[18px] text-[#1a6fa8]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#101828] dark:text-[#F1F5F9]">{feat.title}</p>
                    <p className="mt-0.5 text-[12px] text-[#667085] dark:text-[#94A3B8]">{feat.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  )
}

// ─── Pricing Card Component ──────────────────────────────

function PricingCard({
  title,
  price,
  period,
  monthlyLabel,
  savingsPercent,
  popular,
  loading,
  onUpgrade,
  benefits,
}: {
  title: string
  price: string
  period: string
  monthlyLabel?: string
  savingsPercent?: number
  popular: boolean
  loading: boolean
  onUpgrade: () => void
  benefits: string[]
}) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-xl border overflow-hidden ${
        popular
          ? 'border-[#1a6fa8] shadow-lg shadow-[#1a6fa8]/10'
          : 'border-[#EAECF0] dark:border-[#334155] shadow-sm'
      }`}
    >
      {popular && (
        <div className="absolute top-0 right-0 rounded-bl-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-3 py-1 text-[10px] font-semibold text-white">
          Most Popular
        </div>
      )}
      <div className="flex h-full flex-col p-6 bg-white dark:bg-[#1E293B]">
        <h3 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">{title}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-[#101828] dark:text-[#F1F5F9]">{price}</span>
          <span className="text-[13px] text-[#667085] dark:text-[#94A3B8]">{period}</span>
        </div>

        {/* Reserved-height row so both cards align the same amount, whether or not this content exists */}
        <div className="mt-0.5 flex min-h-[22px] items-center gap-2 text-[12px]">
          {monthlyLabel && (
            <span className="font-medium text-emerald-600">{monthlyLabel} billed annually</span>
          )}
          {savingsPercent ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-900/30">
              Save {savingsPercent}%
            </span>
          ) : null}
        </div>

        <ul className="mt-5 flex-1 space-y-2.5">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#344054] dark:text-[#CBD5E1]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1a6fa8]" />
              {b}
            </li>
          ))}
        </ul>

        <button
          onClick={onUpgrade}
          disabled={loading}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold transition-all ${
            popular
              ? 'bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] text-white hover:brightness-110 shadow-md'
              : 'border border-[#D0D5DD] dark:border-[#334155] text-[#344054] dark:text-[#CBD5E1] hover:bg-[#F7F9FC] dark:hover:bg-[#334155]'
          } disabled:opacity-50`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
          {loading ? 'Processing...' : `Choose ${popular ? 'Yearly' : 'Monthly'}`}
        </button>
      </div>
    </div>
  )
}