import { Link, useLocation } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface SidebarItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

interface DashboardSidebarProps {
  logoHref: string
  navItems: SidebarItem[]
  footerItems: SidebarItem[]
  badge?: string
  upgradeCard: {
    title: string
    description: string
    buttonText: string
  }
}

export function DashboardSidebar({ logoHref, navItems, footerItems, badge, upgradeCard }: DashboardSidebarProps) {
  const { pathname } = useLocation()

  return (
    <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-[#EAECF0] bg-white lg:flex">
      {/* Logo */}
      <Link to={logoHref} className="flex items-center gap-2 px-6 py-6">
        <img src="/images.png" alt="PrepMate AI" className="h-8 w-8 rounded-full" />
        <span className="text-[15px] font-semibold tracking-tight text-[#101828]">
          PrepMate <span className="text-[#1a6fa8]">AI</span>
        </span>
        {badge && (
          <span className="ml-auto rounded-md bg-[#1a6fa8]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1a6fa8]">
            {badge}
          </span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-[#1a6fa8]'
                      : 'text-[#667085] hover:bg-[#F7F9FC] hover:text-[#101828]'
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="my-3 border-t border-[#EAECF0]" />

        <ul className="space-y-0.5 pb-4">
          {footerItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-[#1a6fa8]'
                      : 'text-[#667085] hover:bg-[#F7F9FC] hover:text-[#101828]'
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Upgrade card */}
      <div className="p-4">
        <div className="rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] p-4 text-white shadow-sm">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <Crown className="h-4 w-4" />
          </div>
          <p className="text-[13px] font-semibold">{upgradeCard.title}</p>
          <p className="mt-1 text-[12px] leading-snug text-white/80">{upgradeCard.description}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-8 w-full rounded-lg border-[#1a6fa8]/30 text-[13px] font-medium text-[#1a6fa8] hover:bg-white/90"
          >
            {upgradeCard.buttonText}
          </Button>
        </div>
      </div>
    </aside>
  )
}
