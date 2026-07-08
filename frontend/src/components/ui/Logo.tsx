import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  linkTo?: string
}

const sizeMap = {
  sm: { img: 'h-6 w-6', text: 'text-xl' },
  md: { img: 'h-7 w-7', text: 'text-2xl' },
  lg: { img: 'h-8 w-8', text: 'text-3xl' },
}

export function Logo({ className, showText = true, size = 'md', linkTo }: LogoProps) {
  const { img, text } = sizeMap[size]

  const content = (
    <>
      <img src="/images.png" alt="PrepMate AI" className={cn('rounded-full', img)} />
      {showText && (
        <span className={cn('font-display tracking-tight text-white', text)}>
          PrepMate <span className="text-[#1a6fa8]">AI</span>
        </span>
      )}
    </>
  )

  if (linkTo) {
    return (
      <Link to={linkTo} className={cn('flex items-center gap-2', className)}>
        {content}
      </Link>
    )
  }

  return <div className={cn('flex items-center gap-2', className)}>{content}</div>
}
