
import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-[#F5F7FB] to-[#EEF2FF] px-6">
      <div className="text-center max-w-md">
        {/* Large 404 text */}
        <h1 className="text-[10rem] font-bold leading-none tracking-tighter text-[#0b3b5c]/10 select-none">
          404
        </h1>

        {/* Content */}
        <div className="-mt-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
            <Home className="h-7 w-7 text-white" />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-[#101828]">
            Page not found
          </h2>
          <p className="mt-3 text-[15px] text-[#667085] leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl border border-[#E4E7EC] bg-white px-5 py-2.5 text-sm font-medium text-[#101828] transition-colors hover:bg-[#F5F7FB]"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-105 hover:shadow-xl hover:shadow-[#0b3b5c]/40"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
