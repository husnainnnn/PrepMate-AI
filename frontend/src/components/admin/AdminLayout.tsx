import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Building2,
  Ticket,
  HelpCircle,
  CheckCircle,
  Crown,
  Info,
  Bell,
  Search,
} from 'lucide-react'
import { DashboardSidebar, type SidebarItem } from '@/components/shared/DashboardSidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Students Help', href: '/admin/student-help', icon: HelpCircle },
  { label: 'Companies', href: '/admin/companies', icon: Building2 },
  { label: 'Company Help', href: '/admin/company-help', icon: Ticket },
  { label: 'Company Verification', href: '/admin/verification', icon: CheckCircle },
  { label: 'Pro Plan', href: '/admin/pro-plan', icon: Crown },
  { label: 'About', href: '/admin/about', icon: Info },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const socketRef = useRef<any>(null)

  const initials = user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'A'

  // Fetch unread notification count
  useEffect(() => {
    if (!token) return
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUnreadNotifs(data.unreadCount || 0)
        }
      } catch { /* offline */ }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [token])

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (!token || !user?.id) return
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
          s.emit('join', user.id.toString())
        })
        s.on('notification', async () => {
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
  }, [token, user?.id])

  const handleLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0F172A] text-[#101828] dark:text-[#F1F5F9]">
      {/* Shared sidebar — fixed, static, same as student/company */}
      <DashboardSidebar
        logoHref="/admin/dashboard"
        badge="Admin"
        navItems={NAV_ITEMS}
        footerItems={[]}
        onLogout={handleLogout}
        upgradeCard={null}
      />

      {/* Main content area */}
      <div className="flex lg:pl-64">
        <div className="flex min-h-screen flex-1 flex-col">
          {/* Sticky Top Header — same pattern as student/company */}
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#EAECF0] dark:border-[#334155] bg-white/80 dark:bg-[#1E293B]/80 px-6 py-4 backdrop-blur-sm lg:px-8">
            <div className="relative hidden max-w-sm flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
              <Input
                placeholder="Search students, companies, tickets..."
                className="h-10 rounded-lg border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#334155] pl-9 text-[13.5px] text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#98A2B3] dark:placeholder:text-[#64748B] focus-visible:ring-[#1a6fa8]/30"
              />
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/admin/notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#EAECF0] dark:border-[#334155] text-[#667085] dark:text-[#94A3B8] transition-colors hover:bg-[#F7F9FC] dark:hover:bg-[#334155]"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unreadNotifs > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg">
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </span>
                )}
              </Link>

              <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] dark:border-[#334155] py-1.5 pl-1.5 pr-3">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="" alt="Admin" />
                  <AvatarFallback className="bg-blue-50 text-[11px] font-semibold text-[#1a6fa8]">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-[13px] font-medium text-[#101828] dark:text-[#F1F5F9] sm:block">
                  {user?.email?.split('@')[0] || 'Admin'}
                </span>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
