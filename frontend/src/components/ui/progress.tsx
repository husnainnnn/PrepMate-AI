import { cn } from '@/lib/utils'

interface ProgressProps {
  value?: number
  className?: string
}

export function Progress({ value = 0, className }: ProgressProps) {
  return (
    <div className={cn('h-2 w-full rounded-full bg-[#EAECF0]', className)}>
      <div
        className="h-full rounded-full bg-[#1a6fa8] transition-all duration-300"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}
