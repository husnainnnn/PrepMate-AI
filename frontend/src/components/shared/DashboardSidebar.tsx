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
  upgradeCard?: {
    title: string
    description: string
    buttonText: string
  } | null
  onLogout?: () => void
}

export function DashboardSidebar({ logoHref, navItems, footerItems, badge, upgradeCard, onLogout }: DashboardSidebarProps) {
  const { pathname } = useLocation()

  return (
    <>
      <style>{`
        @keyframes typewriter {
          from { width: 0; opacity: 1; }
          to { width: var(--tw); opacity: 1; }
        }
        .typewriter-label {
          overflow: hidden;
          white-space: nowrap;
          display: inline-block;
          vertical-align: middle;
          width: 0;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .group:hover .typewriter-label {
          opacity: 1;
          animation: typewriter 0.35s steps(var(--steps, 10), end) forwards;
        }
      `}</style>
    <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] lg:flex">
      {/* Logo */}
      <Link to={logoHref} className="flex items-center gap-2 px-6 py-6">
        <img src="/images.png" alt="PrepMate AI" className="h-8 w-8 rounded-full" />
        <span className="text-[15px] font-semibold tracking-tight text-[#101828] dark:text-[#F1F5F9]">
          PrepMate <span className="text-[#1a6fa8]">AI</span>
        </span>
        {badge && (
          <span className="ml-auto rounded-md bg-[#1a6fa8]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1a6fa8]">
            {badge}
          </span>
        )}
      </Link>

      {/* Nav (scrollable) */}
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
                      ? 'bg-blue-50 dark:bg-[#1a6fa8]/20 text-[#1a6fa8]'
                      : 'text-[#667085] dark:text-[#94A3B8] hover:bg-[#F7F9FC] dark:hover:bg-[#334155] hover:text-[#101828] dark:hover:text-[#F1F5F9]'
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

      {/* Footer items (fixed — outside scrollable area) */}
      {footerItems.length > 0 && (
        <div className="px-3 py-2">
          <ul className="space-y-0.5">
            {footerItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 dark:bg-[#1a6fa8]/20 text-[#1a6fa8]'
                        : 'text-[#98A2B3] dark:text-[#64748B] hover:bg-[#F7F9FC] dark:hover:bg-[#334155] hover:text-[#667085] dark:hover:text-[#94A3B8]'
                    )}
                    title={item.label}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                    <span
                      className="typewriter-label text-[12px]"
                      style={{ '--tw': `${item.label.length * 8 + 4}px`, '--steps': item.label.length } as React.CSSProperties}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              )
            })}

            {/* Logout button */}
            {onLogout && (
              <li>
                <button
                  onClick={onLogout}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-[#98A2B3] transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Logout"
                >
                  <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span
                    className="typewriter-label text-[12px]"
                    style={{ '--tw': '48px', '--steps': 6 } as React.CSSProperties}
                  >
                    Logout
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Upgrade card — only shown if provided */}
      {upgradeCard && (
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
      )}
    </aside>
    </>
  )
}
