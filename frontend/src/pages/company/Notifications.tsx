import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CompanyDashboardLayout } from '@/components/company/CompanyDashboardLayout'
import { useAuth } from '@/context/AuthContext'
import { showDesktopNotification } from '@/lib/notificationSounds'
import {
  Bell,
  UserPlus,
  MessageSquare,
  Calendar,
  XCircle,
  Trash2,
  Loader2,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface NotificationItem {
  _id: string
  userId: string
  userRole: string
  type: string
  title: string
  message: string
  link: string
  relatedId: string
  isRead: boolean
  createdAt: string
}

const NOTIF_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  new_applicant:         { icon: UserPlus,     color: 'text-green-600',   bg: 'bg-green-50' },
  message:               { icon: MessageSquare, color: 'text-purple-600',  bg: 'bg-purple-50' },
  interview_scheduled:   { icon: Calendar,     color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  interview_cancelled:   { icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50' },
}

const DEFAULT_ICON = { icon: Bell, color: 'text-gray-600', bg: 'bg-gray-50' }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CompanyNotifications() {
  const { token, user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const autoMarked = useRef(false)
  const socketRef = useRef<any>(null)

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch { /* offline */ }
    setLoading(false)
  }, [token])

  // Auto-mark all as read on mount & unmount
  useEffect(() => {
    if (!token || autoMarked.current) return
    autoMarked.current = true

    const init = async () => {
      try {
        await fetch('/api/notifications/read-all', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch { /* ignore */ }
      await fetchNotifications()
    }

    init()

    return () => {
      fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }, [token, fetchNotifications])

  // Socket for real-time notifications
  useEffect(() => {
    if (!token) return

    let disposed = false

    const connect = async () => {
      try {
        if (socketRef.current) {
          socketRef.current.disconnect()
          socketRef.current = null
        }

        const { io } = await import('socket.io-client')
        if (disposed) return

        const s = io('http://localhost:3001')
        socketRef.current = s

        s.on('connect', () => {
          if (user?.id || user?._id) {
            s.emit('join', (user.id || user._id).toString())
          }
        })

        s.on('notification', (notifData: any) => {
          if (notifData) {
            showDesktopNotification(
              notifData.title || 'New Notification',
              notifData.message || '',
              notifData.link || '/company/notifications'
            )
          }
          // Auto-mark as read & refresh
          fetch('/api/notifications/read-all', {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {})
          fetchNotifications()
        })
      } catch { /* socket unavailable */ }
    }

    connect()

    return () => {
      disposed = true
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [token, fetchNotifications, user?.id, user?._id])

  const deleteNotification = async (id: string) => {
    if (!token) return
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch { /* ignore */ }
  }

  const clearAll = async () => {
    if (!token || clearing) return
    setClearing(true)
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications([])
      setUnreadCount(0)
    } catch { /* ignore */ }
    setClearing(false)
  }

  return (
    <CompanyDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#101828]">Notifications</h1>
              <p className="text-[13px] text-[#667085]">
                {loading ? 'Loading...' : `${notifications.length} total`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button onClick={clearAll} disabled={clearing}
                className="flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
                {clearing ? 'Clearing...' : 'Clear all'}
              </button>
            )}
          </div>
        </div>

        {/* Auto-read notice */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-[13px] text-blue-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{unreadCount} notification{unreadCount > 1 ? 's' : ''} auto-marked as read</span>
          </div>
        )}

        {/* Notification list */}
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-[#EAECF0] bg-white py-20 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#1a6fa8]" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="rounded-xl border-[#EAECF0] shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <Bell className="h-8 w-8 text-[#1a6fa8]" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#101828]">No notifications yet</h2>
              <p className="mt-2 max-w-md mx-auto text-[13.5px] text-[#667085]">
                You'll be notified when students apply to your jobs, and when interviews are scheduled.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {notifications.map((n) => {
              const meta = NOTIF_ICONS[n.type] || DEFAULT_ICON
              const Icon = meta.icon
              return (
                <div
                  key={n._id}
                  className="group relative rounded-xl border border-[#EAECF0] bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg} transition-transform group-hover:scale-105`}>
                      <Icon className={`h-5 w-5 ${meta.color}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[13.5px] font-medium text-[#101828]">{n.title}</p>
                          <p className="mt-0.5 text-[13px] text-[#667085] leading-relaxed">{n.message}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-[#98A2B3] whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        {n.link && (
                          <Link to={n.link}
                            className="flex items-center gap-1 rounded-lg bg-[#F7F9FC] px-2.5 py-1 text-[11.5px] font-medium text-[#1a6fa8] hover:bg-[#EEF4FF] transition-colors">
                            View <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}
                        <button onClick={() => deleteNotification(n._id)}
                          className="ml-auto rounded-lg p-1 text-[#98A2B3] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CompanyDashboardLayout>
  )
}
