import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Loader2, Users, Building2, Crown } from 'lucide-react'

export default function AdminProPlan() {
  const [students, setStudents] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'students' | 'companies'>('students')
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('prepmate_token')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch('/api/admin/pro-plan', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok && r.json()).then(d => {
        if (d) { setStudents(d.students); setCompanies(d.companies) }
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <div className="border-b border-[#EAECF0] bg-white px-8 py-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <h1 className="text-lg font-semibold text-[#101828]">Pro Plan</h1>
        </div>
        <p className="text-[13px] text-[#667085]">Users subscribed to the Pro plan</p>
      </div>
      <div className="p-8">
        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 rounded-lg bg-[#F7F9FC] p-1 w-fit">
          <button onClick={() => setActiveTab('students')}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors ${
              activeTab === 'students' ? 'bg-white text-[#1a6fa8] shadow-sm' : 'text-[#667085] hover:text-[#101828]'
            }`}>
            <Users className="h-3.5 w-3.5" />
            Students ({students.length})
          </button>
          <button onClick={() => setActiveTab('companies')}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors ${
              activeTab === 'companies' ? 'bg-white text-[#1a6fa8] shadow-sm' : 'text-[#667085] hover:text-[#101828]'
            }`}>
            <Building2 className="h-3.5 w-3.5" />
            Companies ({companies.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#98A2B3]" /></div>
        ) : activeTab === 'students' ? (
          students.length === 0 ? (
            <div className="rounded-xl border border-[#EAECF0] bg-white py-16 text-center">
              <Crown className="mx-auto h-10 w-10 text-[#D0D5DD]" />
              <p className="mt-3 text-[13px] font-medium text-[#101828]">No Pro Students</p>
              <p className="text-[12px] text-[#667085]">No students have subscribed to Pro yet.</p>
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
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECF0]">
                  {students.map((s: any) => (
                    <tr key={s._id} className="hover:bg-[#F7F9FC]">
                      <td className="px-4 py-3 text-[13px] font-medium text-[#101828]">{s.fullName || '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-[#667085]">{s.email}</td>
                      <td className="px-4 py-3 text-[13px] text-[#667085]">{s.field || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">Pro</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#667085]">{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-[#EAECF0] px-4 py-2.5 text-[11px] text-[#98A2B3]">{students.length} pro student{students.length !== 1 ? 's' : ''}</p>
            </div>
          )
        ) : (
          companies.length === 0 ? (
            <div className="rounded-xl border border-[#EAECF0] bg-white py-16 text-center">
              <Crown className="mx-auto h-10 w-10 text-[#D0D5DD]" />
              <p className="mt-3 text-[13px] font-medium text-[#101828]">No Pro Companies</p>
              <p className="text-[12px] text-[#667085]">No companies have subscribed to Pro yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#EAECF0] bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EAECF0] bg-[#F7F9FC]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Company</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Email</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Plan</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-[#667085]">Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECF0]">
                  {companies.map((c: any) => (
                    <tr key={c._id} className="hover:bg-[#F7F9FC]">
                      <td className="px-4 py-3 text-[13px] font-medium text-[#101828]">{c.companyName || '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-[#667085]">{c.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">Pro</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#667085]">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-[#EAECF0] px-4 py-2.5 text-[11px] text-[#98A2B3]">{companies.length} pro compan{companies.length !== 1 ? 'ies' : 'y'}</p>
            </div>
          )
        )}

      </div>
    </AdminLayout>
  )
}
