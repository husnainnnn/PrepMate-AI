import { useState, useEffect, useRef } from 'react'
import { CompanyDashboardLayout } from '@/components/company/CompanyDashboardLayout'
import { useAuth } from '@/context/AuthContext'
import { Loader2, Smartphone, Code2, Quote, Target, Zap, Users } from 'lucide-react'

interface Developer {
  name: string
  image: string
  text: string
}

interface AboutData {
  prepMateImage: string
  prepMateText: string
  developers: Developer[]
}

export default function CompanyAboutUs() {
  const { token } = useAuth()
  const [about, setAbout] = useState<AboutData | null>(null)
  const [loading, setLoading] = useState(true)
  const socketRef = useRef<any>(null)

  const fetchAbout = async () => {
    try {
      const res = await fetch('/api/about', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.about) setAbout(data.about)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!token) return
    fetchAbout().finally(() => setLoading(false))
  }, [token])

  // Listen for live updates when admin saves
  useEffect(() => {
    if (!token) return
    let disposed = false
    const connect = async () => {
      try {
        const { io } = await import('socket.io-client')
        if (disposed) return
        const s = io('http://localhost:3001')
        socketRef.current = s
        s.on('about_updated', () => { fetchAbout() })
      } catch { /* socket unavailable */ }
    }
    connect()
    return () => {
      disposed = true
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null }
    }
  }, [token])

  if (loading) {
    return (
      <CompanyDashboardLayout>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a6fa8]" />
        </div>
      </CompanyDashboardLayout>
    )
  }

  return (
    <CompanyDashboardLayout>
      {/* Page Header */}
      <div className="border-b border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-8 py-4">
        <h1 className="text-lg font-semibold text-[#101828] dark:text-[#F1F5F9]">About Us</h1>
        <p className="text-[13px] text-[#667085] dark:text-[#94A3B8]">Learn more about PrepMate and the team behind it</p>
      </div>

      <div className="space-y-12 p-8">
        {/* ─── About PrepMate ──────────────────────────────── */}
        <div className="rounded-xl border border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EAECF0] dark:border-[#334155] bg-gradient-to-r from-[#F7F9FC] to-white dark:from-[#1E293B] dark:to-[#1E293B] px-6 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] text-white shadow-sm">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[#101828] dark:text-[#F1F5F9]">About PrepMate</h2>
              <p className="text-[12px] text-[#667085] dark:text-[#94A3B8]">Our platform's mission, vision, and story</p>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">
            <div className="flex items-center justify-center">
              {about?.prepMateImage ? (
                <div className="overflow-hidden rounded-xl border border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#0F172A] shadow-sm">
                  <img src={about.prepMateImage} alt="About PrepMate" className="max-h-80 w-full object-contain p-4" />
                </div>
              ) : (
                <div className="flex h-64 w-full items-center justify-center rounded-xl border-2 border-dashed border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#0F172A]">
                  <div className="text-center">
                    <Target className="mx-auto h-10 w-10 text-[#98A2B3]" />
                    <p className="mt-2 text-[13px] text-[#667085] dark:text-[#94A3B8]">Image coming soon</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              {about?.prepMateText ? (
                <div className="relative">
                  <Quote className="absolute -top-1 -left-1 h-8 w-8 text-[#1a6fa8]/10" />
                  <p className="text-[14px] leading-relaxed text-[#344054] dark:text-[#CBD5E1] whitespace-pre-line">{about.prepMateText}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#0F172A] p-8 text-center">
                  <Zap className="h-8 w-8 text-[#98A2B3]" />
                  <p className="mt-2 text-[13px] text-[#667085] dark:text-[#94A3B8]">Content coming soon</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Developer Team ──────────────────────────────── */}
        <div className="rounded-xl border border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EAECF0] dark:border-[#334155] bg-gradient-to-r from-[#F7F9FC] to-white dark:from-[#1E293B] dark:to-[#1E293B] px-6 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] text-white shadow-sm">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Our Team</h2>
              <p className="text-[12px] text-[#667085] dark:text-[#94A3B8]">
                {about?.developers?.length ? `Meet the ${about.developers.length} ${about.developers.length === 1 ? 'person' : 'people'} behind PrepMate` : 'The people behind PrepMate'}
              </p>
            </div>
          </div>

          <div className="p-6">
            {!about?.developers?.length ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#0F172A] py-12">
                <Users className="h-10 w-10 text-[#98A2B3]" />
                <p className="mt-2 text-[13px] text-[#667085] dark:text-[#94A3B8]">Team information coming soon</p>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-5">
                {about.developers.map((dev, i) => (
                  <div
                    key={i}
                    className="group w-[240px] rounded-xl border border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#0F172A] p-5 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    {/* Avatar */}
                    <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-md">
                      {dev.image ? (
                        <img src={dev.image} alt={dev.name || 'Developer'} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-white">
                          {dev.name ? dev.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                        </span>
                      )}
                    </div>
                    {dev.name && (
                      <h3 className="mt-3 text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">{dev.name}</h3>
                    )}
                    {dev.text && (
                      <p className="mt-1.5 text-[12px] leading-relaxed text-[#667085] dark:text-[#94A3B8]">{dev.text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </CompanyDashboardLayout>
  )
}
