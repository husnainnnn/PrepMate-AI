import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'outline'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium',
      variant === 'default' && 'bg-primary/10 text-primary',
      variant === 'outline' && 'border',
      className
    )}>
      {children}
    </span>
  )
}
