import { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Bell, Loader2, CheckCircle, Trash2, Bug, Lightbulb, AlertTriangle, HelpCircle, UserX, Building2 } from 'lucide-react'
import { playNotificationSound, showDesktopNotification, requestDesktopNotifPermission } from '@/lib/notificationSounds'
import { getSocketUrl } from '@/lib/socketUrl'

const TYPE_ICONS: Record<string, any> = {
  bug: Bug,
  feature: Lightbulb,
  'report-company': AlertTriangle,
  'report-student': UserX,
  'need-help': HelpCircle,
  support_resolved: CheckCircle,
  company_verified: Building2,
}

const TYPE_COLORS: Record<string, string> = {
  bug: 'text-red-500 bg-red-50',
  feature: 'text-amber-500 bg-amber-50',
  'report-company': 'text-rose-500 bg-rose-50',
  'report-student': 'text-rose-500 bg-rose-50',
  'need-help': 'text-purple-500 bg-purple-50',
  support_resolved: 'text-emerald-500 bg-emerald-50',
  company_verified: 'text-emerald-500 bg-emerald-50',
}

interface NotificationItem {
  _id: string
  title: string
  message: string
  type: string
  link: string
  isRead: boolean
  createdAt: string
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const token = localStorage.getItem('prepmate_token')
  const autoMarked = useRef(false)
  const socketRef = useRef<any>(null)

  const fetchNotifs = async () => {
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
    } catch { /* ignore */ }
    setLoading(false)
  }

  // ── Auto-mark all as read on mount + fetch ───────────
  useEffect(() => {
    if (!token || autoMarked.current) return
    autoMarked.current = true

    // Single fetch instead of read-all + fetchNotifs — we want fresh data
    fetchNotifs()

    // Mark all as read in background without blocking
    fetch('/api/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }, [token])

  // ── Request desktop notification permission ─────────
  useEffect(() => {
    requestDesktopNotifPermission().then(granted => {
      setNotifEnabled(granted)
    })
  }, [])

  // ── Socket.io for real-time notifications ───────────
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

        const s = io(getSocketUrl())
        socketRef.current = s

        // Extract admin id from token payload
        let adminId = ''
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          adminId = payload.id || payload._id || ''
        } catch { /* ignore */ }

        s.on('connect', () => {
          if (adminId) {
            s.emit('join', adminId.toString())
          }
        })

        s.on('notification', (notifData: any) => {
          // Play sound
          playNotificationSound()

          // Show desktop notification
          if (notifData) {
            showDesktopNotification(
              notifData.title || 'New Notification',
              notifData.message || '',
              notifData.link || '/admin/notifications'
            )
          }

          // Refresh notifications
          fetchNotifs()
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
  }, [token])

  const markAsRead = async (id: string) => {
    if (!token) return
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    if (!token) return
    setMarkingAll(true)
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
    setMarkingAll(false)
  }

  const deleteNotif = async (id: string) => {
    if (!token) return
    setDeleting(id)
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch { /* ignore */ }
    setDeleting(null)
  }

  const clearAll = async () => {
    if (!token) return
    try {
      await fetch('/api/notifications', {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications([])
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return days === 1 ? 'Yesterday' : `${days}d ago`
  }

  return (
    <AdminLayout>
      <div className="border-b border-[#EAECF0] bg-white px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#101828]">Notifications</h1>
            <p className="text-[13px] text-[#667085]">
              {loading ? 'Loading...' : unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'No unread notifications'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!notifEnabled && 'Notification' in window && (
              <button onClick={() => requestDesktopNotifPermission().then(setNotifEnabled)}
                className="flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] px-3 py-1.5 text-[12px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]">
                <Bell className="h-3.5 w-3.5" />
                Enable Notifications
              </button>
            )}
            {notifications.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} disabled={markingAll}
                    className="flex items-center gap-1.5 rounded-lg bg-[#1a6fa8]/10 px-3 py-1.5 text-[12px] font-medium text-[#1a6fa8] transition-colors hover:bg-[#1a6fa8]/20 disabled:opacity-50">
                    {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Mark All Read
                  </button>
                )}
                <button onClick={clearAll}
                  className="flex items-center gap-1.5 rounded-lg border border-[#EAECF0] px-3 py-1.5 text-[12px] font-medium text-[#667085] transition-colors hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#98A2B3]" /></div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-[#EAECF0] bg-white py-16 text-center">
            <Bell className="mx-auto h-10 w-10 text-[#D0D5DD]" />
            <p className="mt-3 text-[13px] font-medium text-[#101828]">No notifications yet</p>
            <p className="text-[12px] text-[#667085]">When students or companies submit support requests, they'll appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Bell
              const colors = TYPE_COLORS[n.type] || 'text-gray-500 bg-gray-50'
              return (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markAsRead(n._id)}
                  className={`group flex items-start gap-3.5 rounded-xl border p-4 transition-all cursor-pointer ${
                    n.isRead
                      ? 'border-[#EAECF0] bg-white'
                      : 'border-blue-100 bg-blue-50/40 hover:bg-blue-50/60'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[13px] ${n.isRead ? 'text-[#667085]' : 'font-semibold text-[#101828]'}`}>
                          {n.title}
                        </p>
                        <p className={`mt-0.5 text-[12px] ${n.isRead ? 'text-[#98A2B3]' : 'text-[#667085]'}`}>
                          {n.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-[#98A2B3] whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotif(n._id) }}
                          disabled={deleting === n._id}
                          className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-[#98A2B3] transition-all hover:bg-red-50 hover:text-red-500"
                        >
                          {deleting === n._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
    </AdminLayout>
  )
}
