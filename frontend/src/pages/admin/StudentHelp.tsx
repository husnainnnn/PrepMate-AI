import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Loader2, CheckCircle, Ticket, Bug, Lightbulb, AlertTriangle, HelpCircle } from 'lucide-react'

const TYPE_MAP: Record<string, { label: string, icon: any, color: string }> = {
  bug: { label: 'Bug Report', icon: Bug, color: 'text-red-500 bg-red-50' },
  feature: { label: 'Feature Suggestion', icon: Lightbulb, color: 'text-amber-500 bg-amber-50' },
  'report-company': { label: 'Company Report', icon: AlertTriangle, color: 'text-rose-500 bg-rose-50' },
  'need-help': { label: 'Need Help', icon: HelpCircle, color: 'text-purple-500 bg-purple-50' },
}

export default function AdminStudentHelp() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const token = localStorage.getItem('prepmate_token')

  const fetchTickets = async () => {
    if (!token) return
    try {
      const res = await fetch('/api/admin/support-tickets?role=student', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setTickets(d.tickets) }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchTickets() }, [])

  const handleResolve = async (id: string) => {
    if (!token) return
    setResolving(id)
    try {
      await fetch(`/api/admin/support-tickets/${id}/resolve`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      setTickets(prev => prev.filter(t => t._id !== id))
    } catch { /* ignore */ }
    setResolving(null)
  }

  return (
    <AdminLayout>
      <div className="border-b border-[#EAECF0] bg-white px-8 py-4">
        <h1 className="text-lg font-semibold text-[#101828]">Student Help Requests</h1>
        <p className="text-[13px] text-[#667085]">Support tickets and reports from students</p>
      </div>
      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#98A2B3]" /></div>
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-[#EAECF0] bg-white py-16 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-3 text-[13px] font-medium text-[#101828]">All caught up!</p>
            <p className="text-[12px] text-[#667085]">No pending student requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t: any) => {
              const typeInfo = TYPE_MAP[t.type] || { label: t.type, icon: Ticket, color: 'text-gray-500 bg-gray-50' }
              const Icon = typeInfo.icon
              const detail = t.bugName || t.featureName || t.companyName || 'Help Request'
              return (
                <div key={t._id} className="rounded-xl border border-[#EAECF0] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${typeInfo.color}`}>
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] font-medium text-[#101828]">{detail}</p>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                        </div>
                        <p className="mt-0.5 text-[12.5px] text-[#667085] line-clamp-2">{t.bugDetails || t.featureDescription || t.companyReason || t.helpMessage || 'No details'}</p>
                        <p className="mt-1 text-[11px] text-[#98A2B3]">{new Date(t.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <button onClick={() => handleResolve(t._id)} disabled={resolving === t._id}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-600 transition-colors hover:bg-emerald-100 disabled:opacity-50">
                      {resolving === t._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                      Resolved
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
