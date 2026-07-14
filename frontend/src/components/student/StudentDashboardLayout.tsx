import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Mic,
  BookOpen,
  FileText,
  Mail,
  MessageSquare,
  Sparkles,
  Video,
  BarChart3,
  Library,
  Bell,
  Settings,
  HelpCircle,
  Briefcase,
  User,
  Info,
} from 'lucide-react'

import { playNotificationSound, showDesktopNotification, requestDesktopNotifPermission, getDesktopNotifEnabled } from '@/lib/notificationSounds'
import { useAuth } from '@/context/AuthContext'
import { DashboardSidebar, type SidebarItem } from '@/components/shared/DashboardSidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import SmartSearch from '@/components/shared/SmartSearch'
import { useCachedFetch } from '@/hooks/useCachedFetch'
import { TTL } from '@/lib/apiCache'

interface StudentDashboardLayoutProps {
  children: ReactNode
}

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', href: '/student/profile', icon: User },
  { label: 'Mock Interviews', href: '/student/interviews', icon: Mic },
  { label: 'Practice', href: '/student/questions', icon: BookOpen },
  { label: 'Resume Builder', href: '/student/resumes', icon: FileText },
  { label: 'Job Matches', href: '/student/job-matches', icon: Briefcase },
  { label: 'Applications', href: '/student/applications', icon: Mail },
  { label: 'Messages', href: '/student/messages', icon: MessageSquare },
  { label: 'Live Interviews', href: '/student/live-interviews', icon: Video },
  { label: 'AI Feedback', href: '/student/feedback', icon: Sparkles },
  { label: 'Resources', href: '/student/resources', icon: Library },
  { label: 'Help & Support', href: '/student/support', icon: HelpCircle },
]

const footerItems: SidebarItem[] = [
  { label: 'Settings', href: '/student/settings', icon: Settings },
  { label: 'About Us', href: '/student/about', icon: Info },
]

const searchNavItems = [...sidebarItems, ...footerItems]

export function StudentDashboardLayout({ children }: StudentDashboardLayoutProps) {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const socketRef = useRef<any>(null)

  // Auto-request desktop notification permission if enabled
  useEffect(() => {
    if (getDesktopNotifEnabled()) {
      requestDesktopNotifPermission()
    }
  }, [])

  // Fetch unread notification count (cached — socket keeps it updated)
  const { data: notifData } = useCachedFetch<{ unreadCount: number }>(
    token ? '/api/notifications/unread-count' : null,
    { headers: { Authorization: `Bearer ${token}` } },
    TTL.SHORT,
  )
  useEffect(() => {
    if (notifData) setUnreadNotifs(notifData.unreadCount || 0)
  }, [notifData])

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (!token || !user?.id && !user?._id) return

    let disposed = false

    const connect = async () => {
      try {
        // Disconnect any lingering socket first
        if (socketRef.current) {
          socketRef.current.disconnect()
          socketRef.current = null
        }

        const { io } = await import('socket.io-client')
        if (disposed) return // effect cleaned up while we were loading

        const s = io('http://localhost:3001', { transports: ['websocket', 'polling'] })
        socketRef.current = s

        s.on('connect', () => {
          s.emit('join', (user.id || user._id).toString())
        })

        s.on('notification', async (notifData: any) => {
          playNotificationSound()
          // Show desktop notification with actual content
          if (notifData) {
            showDesktopNotification(
              notifData.title || 'New Notification',
              notifData.message || '',
              notifData.link || '/student/notifications'
            )
          } else {
            showDesktopNotification('New Notification', 'You have a new update.', '/student/notifications')
          }
          // Re-fetch from server to avoid double-count bug
          try {
            const res = await fetch('/api/notifications/unread-count', {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
              const data = await res.json()
              setUnreadNotifs(data.unreadCount || 0)
            }
          } catch { /* ignore */ }
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
  }, [token, user?.id, user?._id])

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const handleLogout = () => {
    logout()
    navigate('/login?role=student', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0F172A] text-[#101828] dark:text-[#F1F5F9]">
      {/* Shared sidebar */}
      <DashboardSidebar
        logoHref="/student/dashboard"
        navItems={sidebarItems}
        footerItems={footerItems}
        onLogout={handleLogout}
        upgradeCard={{
          title: 'Upgrade to Pro',
          description: 'Unlock unlimited mock interviews and advanced AI feedback.',
          buttonText: 'Upgrade Now',
          buttonHref: '/student/pro-plan',
        }}
      />

      {/* Main content */}
      <div className="flex lg:pl-64">
        <div className="flex min-h-screen flex-1 flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#EAECF0] dark:border-[#334155] bg-white/80 dark:bg-[#1E293B]/80 px-6 py-4 backdrop-blur-sm lg:px-8">
            <div className="relative hidden max-w-sm flex-1 md:block">
              <SmartSearch items={searchNavItems} placeholder="Search interviews, questions, resources..." />
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/student/interviews"
                className="hidden h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 text-[13.5px] font-medium text-white hover:brightness-110 sm:flex"
              >
                <Mic className="h-4 w-4" />
                Start Mock Interview
              </Link>

              <Link to="/student/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#EAECF0] dark:border-[#334155] text-[#667085] dark:text-[#94A3B8] transition-colors hover:bg-[#F7F9FC] dark:hover:bg-[#334155]">
                <Bell className="h-[18px] w-[18px]" />
                {unreadNotifs > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg">
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </span>
                )}
              </Link>

              <Link to="/student/profile" className="flex items-center gap-2 rounded-lg border border-[#EAECF0] dark:border-[#334155] py-1.5 pl-1.5 pr-3 transition-colors hover:bg-[#F7F9FC] dark:hover:bg-[#334155]">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.profilePicture || ''} alt={user?.fullName || 'User'} />
                  <AvatarFallback className="bg-blue-50 text-[11px] font-semibold text-[#1a6fa8]">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-[13px] font-medium text-[#101828] dark:text-[#F1F5F9] sm:block">{user?.fullName || 'User'}</span>
              </Link>

            </div>
          </header>

          {/* Page content with entrance animation */}
          <main className="flex-1 animate-fade-in-fast">{children}</main>
        </div>
      </div>
    </div>
  )
}
