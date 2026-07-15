import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '@/components/admin/AdminLayout'
import { Search, Loader2, Building2, Ban, Eye } from 'lucide-react'
import Pagination from '@/components/shared/Pagination'
import ConfirmModal from '@/components/shared/ConfirmModal'

export default function AdminCompanies() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const token = localStorage.getItem('prepmate_token')
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string; email: string } | null>(null)
  const [blocking, setBlocking] = useState(false)

  const fetchCompanies = async () => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', String(page))
    params.set('limit', '50')
    fetch(`/api/admin/companies?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok && r.json()).then(d => { if (d) { setCompanies(d.companies); setTotalPages(d.totalPages || 1); setTotal(d.total || 0) }; setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchCompanies() }, [search, page])

  return (
    <AdminLayout>
      <div className="border-b border-[#EAECF0] bg-white px-8 py-4">
        <h1 className="text-lg font-semibold text-[#101828]">Companies</h1>
        <p className="text-[13px] text-[#667085]">Manage all registered companies</p>
      </div>
      <div className="p-8">
        <div className="relative mb-6 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="h-9 w-full rounded-lg border border-[#D0D5DD] bg-white pl-9 pr-3 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#98A2B3]" /></div>
        ) : companies.length === 0 ? (
          <div className="rounded-xl border border-[#EAECF0] bg-white py-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-[#D0D5DD]" />
            <p className="mt-3 text-[13px] text-[#667085]">No companies found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#EAECF0] bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EAECF0] bg-[#F7F9FC]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Company</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Email</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Industry</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Plan</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Verified</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Joined</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase text-[#667085]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {companies.map((c: any) => (
                  <tr key={c._id} className="hover:bg-[#F7F9FC] cursor-pointer transition-colors" onClick={() => navigate(`/admin/companies/${c._id}`, { state: c })}>
                    <td className="px-4 py-3 text-[13px] font-medium text-[#101828]">{c.companyName || '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-[#667085]">{c.email}</td>
                    <td className="px-4 py-3 text-[13px] text-[#667085]">{c.industry || '—'}</td>
                    <td className="px-4 py-3">
                      {c.plan === 'pro' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                          PRO
                        </span>
                      ) : (
                        <span className="rounded-md bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${c.isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                        {c.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#667085]">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/admin/companies/${c._id}`, { state: c })}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-[11px] font-medium text-[#1a6fa8] transition-colors hover:bg-blue-50"
                          title="View full profile">
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <button onClick={() => setBlockTarget({ id: c._id, name: c.companyName || c.email, email: c.email })}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50"
                          title="Block this company permanently">
                          <Ban className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Block</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} label="companies" />
          </div>
        )}
      </div>

      {/* Block Confirmation Modal */}
      <ConfirmModal
        open={blockTarget !== null}
        title="Block Company"
        message={`Are you sure you want to permanently block ${blockTarget?.name || ''}?`}
        warning="This action will permanently delete the company account, all their job postings, applications, interviews, and associated data. The email will be blocked forever — no one can create a new account with this email."
        confirmLabel="Yes, Block Permanently"
        loading={blocking}
        onConfirm={async () => {
          if (!blockTarget) return
          setBlocking(true)
          try {
            await fetch('/api/admin/block', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ email: blockTarget.email }),
            })
          } catch { /* ignore */ }
          setBlocking(false)
          setBlockTarget(null)
          fetchCompanies()
        }}
        onCancel={() => { if (!blocking) setBlockTarget(null) }}
      />
    </AdminLayout>
  )
}


