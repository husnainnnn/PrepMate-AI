import { useState, useEffect } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import { SendHorizontal, CheckCircle2, XCircle, Clock, Sparkles, Trash2, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getSocketUrl } from '@/lib/socketUrl'

type Stage = 'applied' | 'under_review' | 'shortlisted' | 'interview' | 'hired' | 'rejected'
type FilterTab = 'all' | 'active' | 'hired' | 'rejected'

interface ApplicationRecord {
  _id: string
  id: string
  companyName: string
  jobTitle: string
  location: string
  appliedDate: string
  isRejected: boolean
  currentStage: Stage
  jobDeleted?: boolean
}

const STAGE_ORDER: Stage[] = ['applied', 'under_review', 'shortlisted', 'interview', 'hired']
const STAGE_LABELS: Record<Stage, string> = {
  applied: 'Applied',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Rejected',
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
  const { token, user } = useAuth()
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadApps = async () => {
    try {
      const data = await fetchApplications(token)
      setApplications(data)
    } catch {
      setApplications([])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadApps()
  }, [token])

  // ─── Socket.io — auto-refresh when interview is scheduled ───
  useEffect(() => {
    if (!token || !user) return

    let socket: any = null

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client')
        socket = io(getSocketUrl())

        socket.on('connect', () => {
          socket.emit('join', user.id || user._id)
        })

        // Interview scheduled → Application stage updated → refresh
        socket.on('interview-scheduled', () => {
          loadApps()
        })

        // Interview cancelled → refresh
        socket.on('interview-cancelled', () => {
          loadApps()
        })

        // Application shortlisted → refresh
        socket.on('application-shortlisted', () => {
          loadApps()
        })
      } catch { /* socket unavailable */ }
    }

    connectSocket()

    return () => {
      if (socket) socket.disconnect()
    }
  }, [token, user?.id, user?._id])

  const handleDelete = async () => {
    if (!deleteConfirm || !token) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/company/application/${deleteConfirm}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setApplications(prev => prev.filter(a => (a._id || a.id) !== deleteConfirm))
      }
    } catch { /* ignore */ }
    setDeleteConfirm(null)
    setDeleting(false)
  }

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
      <div className="p-4 sm:p-8">
        <div className="w-full">
          <div className="mb-6 flex items-center gap-3">
            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
              <SendHorizontal className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#101828]">My Applications</h1>
              <p className="text-[13px] text-[#667085]">Track every company you've applied to</p>
            </div>
          </div>

          {/* Delete Warning Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
              <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="mt-3 text-center text-[16px] font-semibold text-[#101828]">Delete Application?</h3>
                <p className="mt-2 text-center text-[13px] text-[#667085]">
                  This will <strong>permanently delete</strong> this application from the database.
                  It will be removed from both your view and the company's view. This action cannot be undone.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 rounded-lg border border-[#D0D5DD] py-2.5 text-[13px] font-medium text-[#667085]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 rounded-lg bg-red-500 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

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
              {sorted.map((app) => {
                const appId = app._id || app.id
                return (
                <div key={appId} className="rounded-2xl border border-[#EAECF0] bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[#101828] sm:text-base">{app.jobTitle}</h3>
                      <p className="text-[12px] text-[#667085] sm:text-[13px]">{app.companyName} &middot; {app.location}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline text-[12px] text-[#98A2B3]">Applied {formatDate(app.appliedDate)}</span>
                      {deleteConfirm === appId ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete()} disabled={deleting} className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-medium text-white sm:px-2.5 sm:py-1.5 sm:text-[11px]">
                            {deleting ? '...' : 'Confirm'}
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-[#EAECF0] px-2 py-1 text-[10px] font-medium text-[#667085] sm:px-2.5 sm:py-1.5 sm:text-[11px]">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(appId)}
                          className="rounded-lg border border-[#EAECF0] p-1.5 text-[#98A2B3] transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Show applied date below on mobile */}
                  <p className="mt-1 text-[11px] text-[#98A2B3] sm:hidden">Applied {formatDate(app.appliedDate)}</p>

                  {/* Job Deleted Banner */}
                  {app.jobDeleted && (
                    <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                        <XCircle className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-red-700">Job Deleted</p>
                        <p className="text-[12px] text-red-500">This job has been removed by the company.</p>
                      </div>
                    </div>
                  )}

                  {!app.jobDeleted && (
                  <>
                    {/* Mobile: compact stage badge */}
                    <div className="mt-4 sm:hidden">
                      {app.isRejected ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[12px] font-medium text-red-600 border border-red-200">
                          <XCircle className="h-3.5 w-3.5" /> Rejected
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium border ${
                          app.currentStage === 'hired'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-blue-50 text-[#1a6fa8] border-blue-200'
                        }`}>
                          {app.currentStage === 'hired' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          {app.isRejected ? 'Rejected' : STAGE_LABELS[app.currentStage]}
                        </span>
                      )}
                    </div>

                    {/* Desktop: full stepper */}
                    <div className="mt-5 hidden sm:block overflow-x-auto pb-1">
                    <div className="flex items-center min-w-[450px]">
                      {STAGE_ORDER.map((stage, index) => {
                        const currentIdx = STAGE_ORDER.indexOf(app.currentStage as Stage)
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
                    </div>
                  </>
                  )}

                  {!app.jobDeleted && app.isRejected && (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                      <p className="text-[13px] text-red-600">
                        This application wasn't successful. Best of luck for next time!
                      </p>
                    </div>
                  )}
                  {!app.jobDeleted && !app.isRejected && app.currentStage === 'hired' && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-600">
                      <Sparkles className="h-4 w-4" /> Congratulations! You were hired for this role!
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </StudentDashboardLayout>
  )
}
