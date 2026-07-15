import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { Shield } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
      <Logo size="lg" linkTo="/" />
      <Link
        to="/admin/login"
        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[12.5px] font-medium text-white/70 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white md:px-4"
      >
        <Shield className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Login as Admin</span>
      </Link>
    </nav>
  )
}
