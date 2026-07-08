import { BackgroundVideo } from '@/components/layout/BackgroundVideo'
import { Navbar } from '@/components/layout/Navbar'
import { Hero } from '@/components/layout/Hero'

export function Landing() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <style>{`
        @keyframes pulse-glow { 0%,100% { opacity: 0.15; } 50% { opacity: 0.35; } }
        .anim-glow { animation: pulse-glow 4s ease-in-out infinite; }
      `}</style>

      {/* Ambient blue glow to bridge theme with login page */}
      <div className="absolute -top-40 right-0 h-[700px] w-[700px] rounded-full bg-[#0b3b5c]/20 blur-[180px] anim-glow pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 h-[500px] w-[500px] rounded-full bg-[#1a6fa8]/15 blur-[150px] anim-glow pointer-events-none" />

      {/* Subtle radial glow behind hero content */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-[#1a6fa8]/10 blur-[200px] pointer-events-none" />

      <BackgroundVideo />
      <Navbar />
      <Hero />
    </div>
  )
}
