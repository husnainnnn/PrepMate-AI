import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
  className?: string
}

export function StatCard({
  title,
  value,
  trend,
  trendDirection = 'up',
  icon,
  className,
}: StatCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition-shadow hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)]',
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#667085]">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[#101828]">{value}</p>
          {trend && (
            <p className={cn(
              'mt-1 text-xs font-medium',
              trendDirection === 'up' && 'text-green-600',
              trendDirection === 'down' && 'text-red-500',
              trendDirection === 'neutral' && 'text-[#667085]'
            )}>
              {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a6fa8]/10">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
