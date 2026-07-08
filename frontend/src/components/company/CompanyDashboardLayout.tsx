import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Brain,
  Mic,
  UserCheck,
  BarChart3,
  MessageSquare,
  Building2,
  Bell,
  Settings,
  HelpCircle,
  Search,
} from 'lucide-react'
import { DashboardSidebar, type SidebarItem } from '@/components/shared/DashboardSidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'

interface CompanyDashboardLayoutProps {
  children: ReactNode
}

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/company/dashboard', icon: LayoutDashboard },
  { label: 'Post Job', href: '/company/post-job', icon: Briefcase },
  { label: 'Applicants', href: '/company/applicants', icon: Users },
  { label: 'AI Screening', href: '/company/screening', icon: Brain },
  { label: 'Interviews', href: '/company/interviews', icon: Mic },
  { label: 'Shortlisted', href: '/company/shortlisted', icon: UserCheck },
  { label: 'Analytics', href: '/company/analytics', icon: BarChart3 },
  { label: 'Messages', href: '/company/messages', icon: MessageSquare },
  { label: 'Company Profile', href: '/company/profile', icon: Building2 },
]

const footerItems: SidebarItem[] = [
  { label: 'Notifications', href: '/company/notifications', icon: Bell },
  { label: 'Settings', href: '/company/settings', icon: Settings },
  { label: 'Help & Support', href: '/company/support', icon: HelpCircle },
]

export function CompanyDashboardLayout({ children }: CompanyDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#101828]">
      {/* Shared sidebar */}
      <DashboardSidebar
        logoHref="/company/dashboard"
        badge="Company"
        navItems={sidebarItems}
        footerItems={footerItems}
        upgradeCard={{
          title: 'Enterprise Plan',
          description: 'Unlock advanced AI screening and unlimited job postings.',
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
                placeholder="Search applicants, jobs, messages..."
                className="h-10 rounded-lg border-[#EAECF0] bg-[#F7F9FC] pl-9 text-[13.5px] placeholder:text-[#98A2B3] focus-visible:ring-[#1a6fa8]/30"
              />
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/company/post-job"
                className="hidden h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 text-[13.5px] font-medium text-white hover:brightness-110 sm:flex"
              >
                <Briefcase className="h-4 w-4" />
                Post a Job
              </Link>

              <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#EAECF0] text-[#667085] transition-colors hover:bg-[#F7F9FC]">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
              </button>

              <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] py-1.5 pl-1.5 pr-3">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="" alt="TechCorp" />
                  <AvatarFallback className="bg-blue-50 text-[11px] font-semibold text-[#1a6fa8]">TC</AvatarFallback>
                </Avatar>
                <span className="hidden text-[13px] font-medium text-[#101828] sm:block">TechCorp Inc.</span>
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
