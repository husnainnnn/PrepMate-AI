import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Search, Loader2, Building2, CheckCircle, XCircle, ShieldCheck, Eye } from 'lucide-react'
import { invalidateCache } from '@/lib/apiCache'

export default function AdminCompanyVerification() {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'pending' | 'verified'>('pending')
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyConfirm, setVerifyConfirm] = useState(false)
  const [unverifyConfirm, setUnverifyConfirm] = useState(false)
  const token = localStorage.getItem('prepmate_token')

  const fetchCompanies = async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/companies?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setCompanies(d.companies) }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchCompanies() }, [search])

  const filtered = companies.filter(c =>
    tab === 'verified' ? c.isVerified : !c.isVerified
  )

  const handleVerify = async () => {
    if (!token || !selectedCompany) return
    setVerifying(true)
    try {
      const res = await fetch(`/api/admin/companies/${selectedCompany._id}/verify`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setCompanies(prev => prev.map(c => c._id === selectedCompany._id ? { ...c, isVerified: true } : c))
        setVerifyConfirm(false)
        setSelectedCompany(null)
        // Invalidate all company-related caches so every page picks up the change
        invalidateCache('/api/admin/companies')
        invalidateCache('/api/companies')
        invalidateCache('/api/jobs')
      }
    } catch { /* ignore */ }
    setVerifying(false)
  }

  const handleUnverify = async () => {
    if (!token || !selectedCompany) return
    setVerifying(true)
    try {
      const res = await fetch(`/api/admin/companies/${selectedCompany._id}/unverify`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setCompanies(prev => prev.map(c => c._id === selectedCompany._id ? { ...c, isVerified: false } : c))
        setUnverifyConfirm(false)
        setSelectedCompany(null)
        // Invalidate all company-related caches so every page picks up the change
        invalidateCache('/api/admin/companies')
        invalidateCache('/api/companies')
        invalidateCache('/api/jobs')
      }
    } catch { /* ignore */ }
    setVerifying(false)
  }

  return (
    <AdminLayout>
      <div className="border-b border-[#EAECF0] bg-white px-8 py-4">
        <h1 className="text-lg font-semibold text-[#101828]">Company Verification</h1>
        <p className="text-[13px] text-[#667085]">Verify company accounts</p>
      </div>
      <div className="p-8">
        {/* Company Detail Panel — opens as a modal popup (form ki tarah) */}
        {selectedCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setSelectedCompany(null)}>
            <div className="w-full max-w-lg rounded-xl border border-[#EAECF0] bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[#101828]">Company Details</h3>
                <button onClick={() => setSelectedCompany(null)}
                  className="flex items-center gap-1 rounded-lg border border-[#D0D5DD] px-3 py-1.5 text-[12px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] hover:text-[#101828]">
                  <XCircle className="h-3.5 w-3.5" />
                  Close
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-[#101828]">{selectedCompany.companyName}</h3>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      selectedCompany.isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {selectedCompany.isVerified ? '✅ Verified' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-[12.5px] sm:grid-cols-2">
                    <div><span className="text-[#98A2B3]">Email:</span> <span className="text-[#667085]">{selectedCompany.email}</span></div>
                    <div><span className="text-[#98A2B3]">Industry:</span> <span className="text-[#667085]">{selectedCompany.industry || '—'}</span></div>
                    <div><span className="text-[#98A2B3]">Website:</span> <span className="text-[#667085]">{selectedCompany.website || '—'}</span></div>
                    <div><span className="text-[#98A2B3]">Phone:</span> <span className="text-[#667085]">{selectedCompany.phone || '—'}</span></div>
                    <div><span className="text-[#98A2B3]">Size:</span> <span className="text-[#667085]">{selectedCompany.employeeCount || '—'}</span></div>
                    <div><span className="text-[#98A2B3]">Location:</span> <span className="text-[#667085]">{[selectedCompany.city, selectedCompany.country].filter(Boolean).join(', ') || '—'}</span></div>
                    <div><span className="text-[#98A2B3]">Joined:</span> <span className="text-[#667085]">{new Date(selectedCompany.createdAt).toLocaleDateString()}</span></div>
                    {selectedCompany.description && <div className="sm:col-span-2"><span className="text-[#98A2B3]">About:</span> <span className="text-[#667085]">{selectedCompany.description}</span></div>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end border-t border-[#EAECF0] pt-4">
                  {selectedCompany.isVerified ? (
                    <button onClick={() => setUnverifyConfirm(true)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-amber-600 shadow-sm">
                      <XCircle className="h-4 w-4" />
                      Remove Verification
                    </button>
                  ) : (
                    <button onClick={() => setVerifyConfirm(true)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-emerald-700 shadow-sm">
                      <CheckCircle className="h-4 w-4" />
                      Verify Company
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 rounded-lg bg-[#F7F9FC] p-1 w-fit">
          <button onClick={() => setTab('pending')}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors ${
              tab === 'pending' ? 'bg-white text-[#1a6fa8] shadow-sm' : 'text-[#667085] hover:text-[#101828]'
            }`}>
            <XCircle className="h-3.5 w-3.5" />
            Pending ({companies.filter(c => !c.isVerified).length})
          </button>
          <button onClick={() => setTab('verified')}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors ${
              tab === 'verified' ? 'bg-white text-emerald-600 shadow-sm' : 'text-[#667085] hover:text-[#101828]'
            }`}>
            <CheckCircle className="h-3.5 w-3.5" />
            Verified ({companies.filter(c => c.isVerified).length})
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="h-9 w-full rounded-lg border border-[#D0D5DD] bg-white pl-9 pr-3 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#98A2B3]" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-[#EAECF0] bg-white py-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-[#D0D5DD]" />
            <p className="mt-3 text-[13px] text-[#667085]">No {tab} companies found</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c: any) => (
              <div key={c._id} onClick={() => setSelectedCompany(c)}
                className={`cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                  selectedCompany?._id === c._id ? 'border-[#1a6fa8] ring-1 ring-[#1a6fa8]/20' : 'border-[#EAECF0]'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    c.isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'
                  }`}>
                    {c.isVerified ? <ShieldCheck className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#101828] truncate">{c.companyName || '—'}</p>
                    <p className="text-[11px] text-[#667085] truncate">{c.email}</p>
                    <p className="mt-0.5 text-[11px] text-[#98A2B3]">{c.industry || '—'}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                    c.isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {c.isVerified ? 'Verified' : 'Pending'}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedCompany(c) }}
                    className="flex items-center gap-1 text-[11px] text-[#667085] hover:text-[#1a6fa8]">
                    <Eye className="h-3 w-3" /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Verify Confirmation Modal */}
        {verifyConfirm && selectedCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5" onClick={() => setVerifyConfirm(false)}>
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#101828]">Verify Company</h3>
                  <p className="text-[12px] text-[#667085]">Are you sure you want to verify <strong>{selectedCompany.companyName}</strong>?</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => setVerifyConfirm(false)} disabled={verifying}
                  className="rounded-lg border border-[#D0D5DD] px-4 py-1.5 text-[12px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleVerify} disabled={verifying}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
                  {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Confirm Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unverify Confirmation Modal */}
        {unverifyConfirm && selectedCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5" onClick={() => setUnverifyConfirm(false)}>
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                  <XCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#101828]">Remove Verification</h3>
                  <p className="text-[12px] text-[#667085]">Are you sure you want to remove verification for <strong>{selectedCompany.companyName}</strong>?</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => setUnverifyConfirm(false)} disabled={verifying}
                  className="rounded-lg border border-[#D0D5DD] px-4 py-1.5 text-[12px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleUnverify} disabled={verifying}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50">
                  {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Confirm Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
