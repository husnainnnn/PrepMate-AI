import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  children: ReactNode
  className?: string
}

export function Avatar({ children, className }: AvatarProps) {
  return (
    <div className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)}>
      {children}
    </div>
  )
}

interface AvatarImageProps {
  src: string
  alt?: string
  className?: string
}

export function AvatarImage({ src, alt = '', className }: AvatarImageProps) {
  if (!src) return null
  return (
    <img src={src} alt={alt} className={cn('aspect-square h-full w-full', className)} />
  )
}

interface AvatarFallbackProps {
  children: ReactNode
  className?: string
}

export function AvatarFallback({ children, className }: AvatarFallbackProps) {
  return (
    <div className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted',
      className
    )}>
      {children}
    </div>
  )
}
