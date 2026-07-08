import { useState, useEffect } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import { SendHorizontal, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

type Stage = 'applied' | 'under_review' | 'shortlisted' | 'hired'
type FilterTab = 'all' | 'active' | 'hired' | 'rejected'

interface ApplicationRecord {
  id: string
  companyName: string
  jobTitle: string
  location: string
  appliedDate: string
  isRejected: boolean
  currentStage: Stage
}

const STAGE_ORDER: Stage[] = ['applied', 'under_review', 'shortlisted', 'hired']
const STAGE_LABELS: Record<Stage, string> = {
  applied: 'Applied',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  hired: 'Hired',
}

async function fetchApplications(token?: string): Promise<ApplicationRecord[]> {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch('/api/applications', { headers })
  if (!res.ok) throw new Error('Failed to fetch applications')
  const data: { applications: ApplicationRecord[] } = await res.json()
  return data.applications
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

export default function Applications() {
  const { token } = useAuth()
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchApplications(token)
        setApplications(data)
      } catch {
        setApplications([])
      }
      setIsLoading(false)
    }
    load()
  }, [token])

  const filtered = applications.filter((app) => {
    if (filter === 'all') return true
    if (filter === 'hired') return !app.isRejected && app.currentStage === 'hired'
    if (filter === 'rejected') return app.isRejected
    if (filter === 'active') return !app.isRejected && app.currentStage !== 'hired'
    return true
  })

  const sorted = [...filtered].sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime())

  const counts = {
    all: applications.length,
    active: applications.filter((a) => !a.isRejected && a.currentStage !== 'hired').length,
    hired: applications.filter((a) => !a.isRejected && a.currentStage === 'hired').length,
    rejected: applications.filter((a) => a.isRejected).length,
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'In Progress' },
    { key: 'hired', label: 'Hired' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <StudentDashboardLayout>
      <div className="p-8">
        <div className="w-full">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
              <SendHorizontal className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#101828]">My Applications</h1>
              <p className="text-[13px] text-[#667085]">Track every company you've applied to</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] text-white shadow-lg shadow-[#0b3b5c]/30'
                    : 'border border-[#EAECF0] bg-white text-[#667085] hover:bg-[#F7F9FC] hover:text-[#101828]'
                }`}>
                {tab.label} ({counts[tab.key]})
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-[#EAECF0] bg-white p-12 shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#EAECF0] border-t-[#1a6fa8]" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
              <p className="text-[#667085]">No applications in this category yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map((app) => (
                <div key={app.id} className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-[#101828]">{app.jobTitle}</h3>
                      <p className="text-[13px] text-[#667085]">{app.companyName} &middot; {app.location}</p>
                    </div>
                    <span className="text-[12px] text-[#98A2B3]">Applied {formatDate(app.appliedDate)}</span>
                  </div>

                  {/* Status stepper */}
                  <div className="mt-5 flex items-center">
                    {STAGE_ORDER.map((stage, index) => {
                      const currentIdx = STAGE_ORDER.indexOf(app.currentStage)
                      const isPast = index < currentIdx
                      const isCurrent = index === currentIdx
                      const isRejectedHere = app.isRejected && isCurrent
                      const isFuture = index > currentIdx

                      let circleClass = 'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shrink-0 '
                      if (isRejectedHere) circleClass += 'bg-red-500 text-white'
                      else if (isPast || (isCurrent && !app.isRejected)) circleClass += 'bg-emerald-500 text-white'
                      else circleClass += 'bg-[#EAECF0] text-[#98A2B3]'

                      return (
                        <div key={stage} className="flex flex-col items-center" style={{ width: 90 }}>
                          <div className={circleClass}>
                            {isRejectedHere ? <XCircle className="h-4 w-4" /> :
                             isPast || (isCurrent && !app.isRejected) ? <CheckCircle2 className="h-4 w-4" /> :
                             <Clock className="h-4 w-4" />}
                          </div>
                          <span className={`mt-1.5 text-center text-[11px] leading-tight ${
                            isRejectedHere ? 'text-red-500 font-medium' :
                            isFuture ? 'text-[#98A2B3]' :
                            'text-[#101828] font-medium'
                          }`}>
                            {isRejectedHere ? 'Rejected' : STAGE_LABELS[stage]}
                          </span>
                          {index < STAGE_ORDER.length - 1 && (
                            <div className={`h-0.5 w-full self-center ${index < currentIdx ? 'bg-emerald-400' : 'bg-[#EAECF0]'}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {app.isRejected && (
                    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                      This application wasn't successful at the <span className="font-medium">{STAGE_LABELS[app.currentStage]}</span> stage. Best of luck for next time!
                    </div>
                  )}
                  {!app.isRejected && app.currentStage === 'hired' && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-600">
                      <Sparkles className="h-4 w-4" /> Congratulations! You were hired for this role!
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudentDashboardLayout>
  )
}
