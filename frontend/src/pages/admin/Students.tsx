import { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Search, Loader2, User } from 'lucide-react'
import Pagination from '@/components/shared/Pagination'

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([])
  const [fields, setFields] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedField, setSelectedField] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const token = localStorage.getItem('prepmate_token')

  const fieldsFetched = useRef(false)

  const fetchStudents = async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedField) params.set('field', selectedField)
      params.set('page', String(page))
      params.set('limit', '50')
      const res = await fetch(`/api/admin/students?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setStudents(d.students); setTotalPages(d.totalPages || 1); setTotal(d.total || 0) }
    } catch { /* ignore */ }
    setLoading(false)
  }

  // ── Fetch fields only once (cached), not on every re-mount ──
  useEffect(() => {
    if (!token || fieldsFetched.current) return
    fieldsFetched.current = true
    fetch('/api/admin/student-fields', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok && r.json()).then(d => d && setFields(d.fields)).catch(() => {})
  }, [token])

  useEffect(() => { setPage(1) }, [search, selectedField])
  useEffect(() => { fetchStudents() }, [search, selectedField, page])

  return (
    <AdminLayout>
      <div className="border-b border-[#EAECF0] bg-white px-8 py-4">
        <h1 className="text-lg font-semibold text-[#101828]">Students</h1>
        <p className="text-[13px] text-[#667085]">Manage all registered students</p>
      </div>
      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
              className="h-9 w-full rounded-lg border border-[#D0D5DD] bg-white pl-9 pr-3 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8] focus:ring-1 focus:ring-[#1a6fa8]/20 placeholder:text-[#98A2B3]" />
          </div>
          <select value={selectedField} onChange={e => setSelectedField(e.target.value)}
            className="h-9 rounded-lg border border-[#D0D5DD] bg-white px-3 text-[13px] text-[#101828] outline-none focus:border-[#1a6fa8]">
            <option value="">All Fields</option>
            {fields.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#98A2B3]" /></div>
        ) : students.length === 0 ? (
          <div className="rounded-xl border border-[#EAECF0] bg-white py-16 text-center">
            <User className="mx-auto h-10 w-10 text-[#D0D5DD]" />
            <p className="mt-3 text-[13px] text-[#667085]">No students found</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#EAECF0] bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EAECF0] bg-[#F7F9FC]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Email</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Field</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Plan</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {students.map((s: any) => (
                  <tr key={s._id} className="hover:bg-[#F7F9FC]">
                    <td className="px-4 py-3 text-[13px] font-medium text-[#101828]">{s.fullName || '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-[#667085]">{s.email}</td>
                    <td className="px-4 py-3"><span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-[#1a6fa8]">{s.field || '—'}</span></td>
                    <td className="px-4 py-3">
                      {s.stats?.plan === 'pro' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                          ⭐ PRO
                        </span>
                      ) : (
                        <span className="rounded-md bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#667085]">{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} label="students" />
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
