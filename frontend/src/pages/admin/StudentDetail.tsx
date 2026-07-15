import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import AdminLayout from '@/components/admin/AdminLayout'
import { ArrowLeft, Loader2, User, Mail, Phone, BookOpen, Award, Calendar, Star, Sparkles, Globe, Link, GitBranch, GraduationCap, Briefcase } from 'lucide-react'

type StudentData = Record<string, any>

export default function AdminStudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const passedData = location.state as StudentData | null

  const [student, setStudent] = useState<StudentData | null>(passedData || null)
  const [loading, setLoading] = useState(!passedData)
  const [error, setError] = useState('')
  const token = localStorage.getItem('prepmate_token')

  useEffect(() => {
    if (passedData) return // Data already passed via navigation state
    if (!token || !id) return

    setLoading(true)
    fetch(`/api/admin/students/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load student')
        return r.json()
      })
      .then(d => {
        if (d?.student) setStudent(d.student)
        else throw new Error('Student not found')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, token, passedData])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#98A2B3]" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !student) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-[15px] font-medium text-red-500">{error || 'Student not found'}</p>
          <button onClick={() => navigate('/admin/students')}
            className="mt-4 text-[13px] font-medium text-[#1a6fa8] hover:underline">
            ← Back to Students
          </button>
        </div>
      </AdminLayout>
    )
  }

  const s = student

  return (
    <AdminLayout>
      {/* Header */}
      <div className="border-b border-[#EAECF0] bg-white px-8 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/students')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-[#F7F9FC] hover:text-[#101828]"
            title="Back to students">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[#101828]">{s.fullName || 'Student Profile'}</h1>
              {s.stats?.plan === 'pro' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                  PRO
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#667085]">{s.email}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Basic Info */}
          <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
            <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="h-3.5 w-3.5" /> Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField icon={Mail} label="Email" value={s.email} />
              <InfoField icon={Phone} label="Phone" value={s.phone} />
              <InfoField icon={BookOpen} label="Field / Role" value={s.field} />
              <InfoField icon={Award} label="Experience" value={s.experience} />
              <InfoField icon={Calendar} label="Joined" value={s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''} />
              <InfoField icon={Star} label="Plan" value={s.stats?.plan === 'pro' ? 'Pro' : 'Free'} />
            </div>
          </div>

          {/* Bio */}
          {s.bio && (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Bio
              </h2>
              <p className="text-[13px] text-[#344054] leading-relaxed">{s.bio}</p>
            </div>
          )}

          {/* Links */}
          {(s.linkedin || s.github || s.portfolio) && (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" /> Links
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {s.linkedin && <InfoField icon={Link} label="LinkedIn" value={s.linkedin} />}
                {s.github && <InfoField icon={GitBranch} label="GitHub" value={s.github} />}
                {s.portfolio && <InfoField icon={Globe} label="Portfolio" value={s.portfolio} />}
              </div>
            </div>
          )}

          {/* Skills */}
          {s.skills?.length > 0 && (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award className="h-3.5 w-3.5" /> Skills ({s.skills.length})
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {s.skills.map((skill: string) => (
                  <span key={skill} className="rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-[#1a6fa8]">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {s.education?.length > 0 && (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
                <GraduationCap className="h-3.5 w-3.5" /> Education ({s.education.length})
              </h2>
              <div className="space-y-3">
                {s.education.map((edu: any, i: number) => (
                  <div key={i} className="rounded-xl border border-[#EAECF0] bg-[#F7F9FC] px-4 py-3">
                    <p className="text-[13px] font-medium text-[#101828]">{edu.degree || 'Degree'}{edu.institute ? ` — ${edu.institute}` : ''}</p>
                    <p className="text-[12px] text-[#667085]">{edu.startYear}{edu.endYear ? ` — ${edu.endYear}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {s.experienceDetails?.length > 0 && (
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6">
              <h2 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5" /> Work Experience ({s.experienceDetails.length})
              </h2>
              <div className="space-y-3">
                {s.experienceDetails.map((exp: any, i: number) => (
                  <div key={i} className="rounded-xl border border-[#EAECF0] bg-[#F7F9FC] px-4 py-3">
                    <p className="text-[13px] font-medium text-[#101828]">{exp.role || 'Role'}{exp.company ? ` at ${exp.company}` : ''}</p>
                    <p className="text-[12px] text-[#667085]">{exp.startDate}{exp.endDate ? ` — ${exp.endDate}` : ''}{exp.duration ? ` · ${exp.duration}` : ''}</p>
                    {exp.description && <p className="mt-1 text-[12px] text-[#344054]">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom spacer */}
          <div className="pb-8" />
        </div>
      </div>
    </AdminLayout>
  )
}

/* ─── Reusable Info Field ──────────────── */
function InfoField({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F7F9FC]">
        <Icon className="h-3.5 w-3.5 text-[#98A2B3]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#98A2B3]">{label}</p>
        <p className="text-[13px] text-[#344054] break-words">{value}</p>
      </div>
    </div>
  )
}
