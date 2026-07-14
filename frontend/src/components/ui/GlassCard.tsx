import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}

export function GlassCard({ children, className, as: Tag = 'div' }: GlassCardProps) {
  return (
    <Tag className={cn('liquid-glass rounded-2xl p-8 animate-fade-in', className)}>
      {children}
    </Tag>
  )
}
