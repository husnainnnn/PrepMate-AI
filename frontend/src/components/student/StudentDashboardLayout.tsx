import { type ReactNode } from 'react'
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
  Search,
  User,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { DashboardSidebar, type SidebarItem } from '@/components/shared/DashboardSidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'

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
  { label: 'Analytics', href: '/student/analytics', icon: BarChart3 },
  { label: 'Resources', href: '/student/resources', icon: Library },
]

const footerItems: SidebarItem[] = [
  { label: 'Settings', href: '/student/settings', icon: Settings },
  { label: 'Help & Support', href: '/student/support', icon: HelpCircle },
]

export function StudentDashboardLayout({ children }: StudentDashboardLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const handleLogout = () => {
    logout()
    navigate('/login?role=student', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#101828]">
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
        }}
      />

      {/* Main content */}
      <div className="flex lg:pl-64">
        <div className="flex min-h-screen flex-1 flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#EAECF0] bg-white/80 px-6 py-4 backdrop-blur-sm lg:px-8">
            <div className="relative hidden max-w-sm flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
              <Input
                placeholder="Search interviews, questions, resources..."
                className="h-10 rounded-lg border-[#EAECF0] bg-[#F7F9FC] pl-9 text-[13.5px] placeholder:text-[#98A2B3] focus-visible:ring-[#1a6fa8]/30"
              />
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/student/interviews"
                className="hidden h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 text-[13.5px] font-medium text-white hover:brightness-110 sm:flex"
              >
                <Mic className="h-4 w-4" />
                Start Mock Interview
              </Link>

              <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#EAECF0] text-[#667085] transition-colors hover:bg-[#F7F9FC]">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#1a6fa8]" />
              </button>

              <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] py-1.5 pl-1.5 pr-3">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="" alt={user?.fullName || 'User'} />
                  <AvatarFallback className="bg-blue-50 text-[11px] font-semibold text-[#1a6fa8]">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-[13px] font-medium text-[#101828] sm:block">{user?.fullName || 'User'}</span>
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
