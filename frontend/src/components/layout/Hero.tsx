import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-40 min-h-[85vh]">
      <h1
        className="font-display font-normal text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-6xl animate-fade-rise"
      >
        Master interviews with{' '}
        <span className="text-[#1a6fa8] [text-shadow:0_0_28px_rgba(26,111,168,0.55)]">
          confidence
        </span>{' '}
        and{' '}
        <span className="text-[#1a6fa8] [text-shadow:0_0_28px_rgba(26,111,168,0.55)]">
          clarity
        </span>
        .
      </h1>

      <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mt-8 leading-relaxed animate-fade-rise-delay">
        An AI-powered platform designed to help students, developers, and
        professionals prepare smarter through mock interviews, resume
        analysis, personalized feedback, and real-time career guidance.
      </p>

      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-rise-delay-2">
        <Link
          to="/login?role=student"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-10 py-4 text-base font-medium text-[#0b3b5c] shadow-lg border border-[#1a6fa8]/15 transition-all hover:shadow-xl hover:shadow-[#1a6fa8]/15 hover:border-[#1a6fa8]/30 min-w-[220px]"
        >
          <svg className="h-5 w-5 text-[#1a6fa8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
          Join as Student
        </Link>
        <Link
          to="/login?role=company"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-10 py-4 text-base font-medium text-[#0b3b5c] shadow-lg border border-[#1a6fa8]/15 transition-all hover:shadow-xl hover:shadow-[#1a6fa8]/15 hover:border-[#1a6fa8]/30 min-w-[220px]"
        >
          <svg className="h-5 w-5 text-[#1a6fa8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Join as Company
        </Link>
      </div>
    </section>
  )
}
