import { Logo } from '@/components/ui/Logo'

export function Navbar() {
  return (
    <nav className="relative z-10 flex justify-center sm:justify-start items-center px-8 py-6 max-w-7xl mx-auto">
      <Logo size="lg" linkTo="/" />
    </nav>
  )
}
