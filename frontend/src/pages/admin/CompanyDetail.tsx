import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import AdminLayout from '@/components/admin/AdminLayout'
import { ArrowLeft, Loader2, Building2, Mail, Phone, Globe, MapPin, Calendar, Users, UserCircle, Briefcase, HeartHandshake, Sparkles, ShieldCheck, Star, Link } from 'lucide-react'

type CompanyData = Record<string, any>

export default function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const passedData = location.state as CompanyData | null

  const [company, setCompany] = useState<CompanyData | null>(passedData || null)
  const [loading, setLoading] = useState(!passedData)
  const [error, setError] = useState('')
  const token = localStorage.getItem('prepmate_token')

  useEffect(() => {
    if (passedData) return
    if (!token || !id) return

    setLoading(true)
    fetch(`/api/admin/companies/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load company')
        return r.json()
      })
      .then(d => {
        if (d?.company) setCompany(d.company)
        else throw new Error('Company not found')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, token, passedData])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#98A2B3]" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !company) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-[15px] font-medium text-red-500">{error || 'Company not found'}</p>
          <button onClick={() => navigate('/admin/companies')}
            className="mt-4 text-[13px] font-medium text-[#1a6fa8] hover:underline">
            ← Back to Companies
          </button>
        </div>
      </AdminLayout>
    )
  }

  const c = company

  return (
    <AdminLayout>
      {/* Header */}
      <div className="border-b border-[#EAECF0] bg-white px-8 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/companies')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-[#F7F9FC] hover:text-[#101828]"
            title="Back to companies">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[#101828]">{c.companyName || 'Company Profile'}</h1>
              {c.isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">✅ Verified</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">Pending</span>
              )}
              {c.plan === 'pro' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                  PRO
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#667085]">{c.email}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Company Information */}
          <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
            <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" /> Company Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField icon={Mail} label="Email" value={c.email} />
              <InfoField icon={Phone} label="Phone" value={c.phone} />
              <InfoField icon={Globe} label="Website" value={c.website} />
              <InfoField icon={MapPin} label="Location" value={[c.city, c.country].filter(Boolean).join(', ')} />
              <InfoField icon={Users} label="Employees" value={c.employeeCount} />
              <InfoField icon={Briefcase} label="Industry" value={c.industry} />
              <InfoField icon={Calendar} label="Founded" value={c.foundedYear} />
              <InfoField icon={Calendar} label="Joined" value={c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''} />
              <InfoField icon={Star} label="Plan" value={c.plan === 'pro' ? 'Pro' : 'Free'} />
              <InfoField icon={ShieldCheck} label="Verification" value={c.isVerified ? 'Verified' : 'Pending'} />
            </div>
          </div>

          {/* Description */}
          {c.description && (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Description
              </h2>
              <p className="text-[13px] text-[#344054] leading-relaxed">{c.description}</p>
            </div>
          )}

          {/* Leadership */}
          {(c.ceoName || c.ceoMessage) && (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserCircle className="h-3.5 w-3.5" /> Leadership
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {c.ceoName && <InfoField icon={UserCircle} label="CEO" value={c.ceoName} />}
                {c.ceoMessage && (
                  <div>
                    <p className="text-[11px] font-medium text-[#98A2B3] mb-1">CEO Message</p>
                    <p className="text-[13px] text-[#344054] bg-[#F7F9FC] rounded-xl px-4 py-3 leading-relaxed">{c.ceoMessage}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social Links */}
          {(c.linkedin || c.twitter || c.facebook) && (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Link className="h-3.5 w-3.5" /> Social Links
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {c.linkedin && <InfoField icon={Link} label="LinkedIn" value={c.linkedin} />}
                {c.twitter && <InfoField icon={Link} label="Twitter / X" value={c.twitter} />}
                {c.facebook && <InfoField icon={Link} label="Facebook" value={c.facebook} />}
              </div>
            </div>
          )}

          {/* Benefits */}
          {c.benefits?.length > 0 && (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
                <HeartHandshake className="h-3.5 w-3.5" /> Benefits & Perks ({c.benefits.length})
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {c.benefits.map((b: string) => (
                  <span key={b} className="rounded-md bg-rose-50 px-2.5 py-1 text-[12px] font-medium text-rose-600">{b}</span>
                ))}
              </div>
            </div>
          )}

          {/* Culture */}
          {c.culture && (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="h-3.5 w-3.5" /> Company Culture
              </h2>
              <p className="text-[13px] text-[#344054] bg-[#F7F9FC] rounded-xl px-4 py-3 leading-relaxed">{c.culture}</p>
            </div>
          )}

          {/* Bottom spacer */}
          <div className="pb-8" />
        </div>
      </div>
    </AdminLayout>
  )
}

/* ─── Reusable Info Field ──────────────── */
function InfoField({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F7F9FC]">
        <Icon className="h-3.5 w-3.5 text-[#98A2B3]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#98A2B3]">{label}</p>
        <p className="text-[13px] text-[#344054] break-words">{value}</p>
      </div>
    </div>
  )
}
