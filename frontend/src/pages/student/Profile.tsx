import { useState, useEffect, useRef } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import { User, Save, Plus, X, FileText, Upload, CheckCircle, ExternalLink, Camera, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

interface EducationItem {
  id: string
  institute: string
  degree: string
  startYear: string
  endYear: string
}

interface ProfileData {
  fullName: string
  email: string
  phone: string
  linkedin: string
  github: string
  portfolio: string
  bio: string
  field: string
  skills: string[]
  experience: string
  education: EducationItem[]
  introduction: string
  profilePicture: string
}

function makeId(): string { return Math.random().toString(36).slice(2, 10) }

const defaultProfile: ProfileData = {
  fullName: '',
  email: '',
  phone: '',
  linkedin: '',
  github: '',
  portfolio: '',
  bio: '',
  field: '',
  skills: [],
  experience: 'fresher',
  education: [],
  introduction: '',
  profilePicture: '',
}

export default function StudentProfilePage() {
  const { token, user, refreshUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData>(defaultProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [skillInput, setSkillInput] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef = useRef<number | null>(null)

  // Resume state
  const [resumeFileName, setResumeFileName] = useState<string>('')
  const [resumeFileUrl, setResumeFileUrl] = useState<string>('')
  const [uploadingResume, setUploadingResume] = useState(false)
  const [savedResumeName, setSavedResumeName] = useState<string>('')

  // Load profile from AuthContext (no extra API call!)
  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        linkedin: user.linkedin || '',
        github: user.github || '',
        portfolio: user.portfolio || '',
        bio: user.bio || '',
        field: user.field || '',
        skills: user.skills || [],
        experience: user.experience || 'fresher',
        education: (user.education || []).map((e: any) => ({
          id: e.id || makeId(),
          institute: e.institute || '',
          degree: e.degree || '',
          startYear: e.startYear || '',
          endYear: e.endYear || '',
        })),
        introduction: user.introduction || '',
        profilePicture: user.profilePicture || '',
      })
      setLoading(false)
    }
  }, [user])

  // Resume info — fetch only if needed (deduped for StrictMode)
  const resumeFetched = useRef(false)
  useEffect(() => {
    if (!token || resumeFetched.current) return
    resumeFetched.current = true
    fetch('/api/resume/latest', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok && r.json()).then(data => {
      if (!data) return
      if (data.resumeFileUrl) {
        setResumeFileUrl(data.resumeFileUrl)
        setSavedResumeName('Saved resume file')
      } else if (data.skills?.length > 0 || data.education?.length > 0 || data.personalInfo?.fullName) {
        setSavedResumeName('Resume data saved — open Resume Builder to generate PDF')
      }
    }).catch(() => {})
  }, [token])

  // Save profile to backend
  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error('Save failed')
      try {
        await refreshUser()
      } catch {
        // User data refresh failed, but save itself succeeded
        console.warn('Profile saved but failed to refresh user context')
      }
      setMessage({ type: 'success', text: 'Profile saved successfully!' })
      setToastVisible(true)
      if (toastTimerRef.current !== null) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 2000)
    } catch {
      setMessage({ type: 'error', text: 'Could not save to server right now. Your data is safe locally.' })
      setToastVisible(true)
      if (toastTimerRef.current !== null) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 2000)
    }
    setSaving(false)
  }

  const addSkill = () => {
    const v = skillInput.trim()
    if (v && !profile.skills.includes(v)) {
      setProfile({ ...profile, skills: [...profile.skills, v] })
    }
    setSkillInput('')
  }

  const removeSkill = (s: string) => setProfile({ ...profile, skills: profile.skills.filter((x) => x !== s) })

  const addEducation = () => setProfile({
    ...profile,
    education: [...profile.education, { id: makeId(), institute: '', degree: '', startYear: '', endYear: '' }],
  })

  const updateEducation = (id: string, patch: Partial<EducationItem>) =>
    setProfile({
      ...profile,
      education: profile.education.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })

  const removeEducation = (id: string) =>
    setProfile({ ...profile, education: profile.education.filter((e) => e.id !== id) })

  const updateField = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) =>
    setProfile({ ...profile, [key]: value })

  if (loading) {
    return (
      <StudentDashboardLayout>
        <div className="flex items-center justify-center p-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#EAECF0] border-t-[#1a6fa8]" />
        </div>
      </StudentDashboardLayout>
    )
  }

  return (
    <StudentDashboardLayout>
      <div className="p-8">
        <div className="w-full">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#101828]">My Profile</h1>
              <p className="text-[13px] text-[#667085]">
                Complete your profile — it autofills into Mock Interviews and Job Matches.
              </p>
            </div>
          </div>

          {/* Toast notification */}
          <div
            className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 transition-all duration-300 ${
              toastVisible
                ? 'translate-y-0 opacity-100'
                : '-translate-y-4 opacity-0 pointer-events-none'
            }`}
          >
            {message && (
              <div
                className={`rounded-xl border px-5 py-3 text-[14px] font-medium shadow-xl backdrop-blur-sm ${
                  message.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50/95 text-emerald-700'
                    : 'border-red-200 bg-red-50/95 text-red-700'
                }`}
              >
                {`${message.type === 'success' ? '\u2713' : '\u2717'} ${message.text}`}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="group relative shrink-0">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#D0D5DD] dark:border-[#475569] bg-[#F7F9FC] dark:bg-[#1E293B] transition-all group-hover:border-[#1a6fa8]">
                    {profile.profilePicture ? (
                      <img src={profile.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-[#98A2B3]" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-[#1E293B] border border-[#EAECF0] dark:border-[#334155] shadow-sm text-[#667085] dark:text-[#94A3B8] hover:text-[#1a6fa8] hover:border-[#1a6fa8] transition-all"
                  >
                    {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      // Show local preview
                      const reader = new FileReader()
                      reader.onload = (ev) => setProfile(prev => ({ ...prev, profilePicture: ev.target?.result as string }))
                      reader.readAsDataURL(file)
                      setUploadingPhoto(true)
                      try {
                        const fd = new FormData()
                        fd.append('photo', file)
                        const res = await fetch('/api/upload/profile-picture', { method: 'POST', body: fd })
                        if (res.ok) {
                          const data = await res.json()
                          setProfile(prev => ({ ...prev, profilePicture: data.url }))
                        }
                      } catch { /* upload failed */ }
                      setUploadingPhoto(false)
                      e.target.value = ''
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#101828]">Profile Photo</h3>
                  <p className="mt-0.5 text-[13px] text-[#667085]">
                    Upload a professional photo. It will show in the navbar and auto-fill your resume.
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[#101828]">Personal Information</h2>
              <p className="mb-4 text-[13px] text-[#667085]">This info is used to prefill your resume and interview details.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField key="fullName" label="Full Name" value={profile.fullName} onChange={(v) => updateField('fullName', v)} placeholder="e.g. Husnain Sattar" />
                <InputField key="email" label="Email" value={profile.email} onChange={(v) => updateField('email', v)} placeholder="husnain@example.com" />
                <InputField key="phone" label="Phone" value={profile.phone} onChange={(v) => updateField('phone', v)} placeholder="+92 300 1234567" />
                <InputField key="linkedin" label="LinkedIn" value={profile.linkedin} onChange={(v) => updateField('linkedin', v)} placeholder="linkedin.com/in/yourname" />
                <InputField key="github" label="GitHub" value={profile.github} onChange={(v) => updateField('github', v)} placeholder="github.com/yourname" />
                <InputField key="portfolio" label="Portfolio" value={profile.portfolio} onChange={(v) => updateField('portfolio', v)} placeholder="yourwebsite.com" />
              </div>
            </div>

            {/* Bio */}
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[#101828]">Bio</h2>
              <p className="mb-4 text-[13px] text-[#667085]">A short bio that appears on your profile.</p>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[#101828]">Short Bio</span>
                <textarea value={profile.bio} onChange={(e) => updateField('bio', e.target.value)}
                  placeholder="e.g. Passionate frontend developer with 2 years of experience building React applications."
                  rows={3}
                  className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15 resize-none" />
              </div>
            </div>

            {/* Field & Experience */}
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[#101828]">Career Details</h2>
              <p className="mb-4 text-[13px] text-[#667085]">Used to generate tailored interview questions and job matches.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField key="targetField" label="Target Field / Role" value={profile.field} onChange={(v) => updateField('field', v)} placeholder="e.g. Frontend Developer" />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-[#101828]">Experience Level</span>
                  <div className="grid grid-cols-4 gap-2">
                    {(['fresher', 'junior', 'mid', 'senior'] as const).map((level) => (
                      <button key={level} type="button" onClick={() => updateField('experience', level)}
                        className={`rounded-xl border-2 px-3 py-2.5 text-center text-sm font-medium transition-all capitalize ${
                          profile.experience === level
                            ? 'border-[#1a6fa8] bg-blue-50 text-[#1a6fa8] shadow-sm'
                            : 'border-[#EAECF0] bg-white text-[#667085] hover:border-[#D0D5DD] hover:text-[#101828]'
                        }`}>
                        {level === 'fresher' ? 'Fresher' : level === 'junior' ? 'Junior' : level === 'mid' ? 'Mid' : 'Senior'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-[#101828]">Skills</h2>
              <p className="mb-4 text-[13px] text-[#667085]">Add your technical and soft skills.</p>
              <div className="flex gap-2">
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                  placeholder="e.g. React, TypeScript, Node.js"
                  className="flex-1 rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
                <button onClick={addSkill} className="rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
                  Add
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span key={s} className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[13px] font-medium text-[#1a6fa8]">
                    {s}
                    <button onClick={() => removeSkill(s)} className="text-[#1a6fa8]/60 hover:text-[#1a6fa8]"><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
                {profile.skills.length === 0 && (
                  <p className="text-[13px] text-[#98A2B3]">No skills added yet.</p>
                )}
              </div>
            </div>

            {/* Education */}
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#101828]">Education</h2>
                  <p className="text-[13px] text-[#667085]">Your academic background.</p>
                </div>
                <button onClick={addEducation}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
                  <Plus className="h-3.5 w-3.5" /> Add Education
                </button>
              </div>
              <div className="space-y-4">
                {profile.education.map((edu) => (
                  <div key={edu.id} className="rounded-xl border border-[#EAECF0] bg-[#F7F9FC] p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <input value={edu.institute} onChange={(e) => updateEducation(edu.id, { institute: e.target.value })}
                        placeholder="Institute / University"
                        className="sm:col-span-2 rounded-xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
                      <input value={edu.degree} onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                        placeholder="Degree (e.g. BSCS)"
                        className="rounded-xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
                      <div className="flex gap-2">
                        <input value={edu.startYear} onChange={(e) => updateEducation(edu.id, { startYear: e.target.value })}
                          placeholder="Start" className="w-1/2 rounded-xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
                        <input value={edu.endYear} onChange={(e) => updateEducation(edu.id, { endYear: e.target.value })}
                          placeholder="End" className="w-1/2 rounded-xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
                      </div>
                    </div>
                    <button onClick={() => removeEducation(edu.id)} className="mt-2 flex items-center gap-1 text-[13px] text-red-500 hover:text-red-600">
                      <X className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                ))}
                {profile.education.length === 0 && (
                  <p className="text-[13px] text-[#98A2B3]">No education added yet.</p>
                )}
              </div>
            </div>

            {/* Resume */}
            <div className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#101828]">Resume</h2>
                  <p className="text-[13px] text-[#667085]">Upload a resume file or build one with the Resume Builder.</p>
                </div>
              </div>

              {/* Upload */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#EAECF0] bg-white px-4 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] disabled:opacity-50">
                  {uploadingResume ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D0D5DD] border-t-[#1a6fa8]" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingResume ? 'Uploading...' : 'Upload Resume (PDF/DOC)'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f || !token) return
                      setUploadingResume(true)
                      try {
                        const fd = new FormData()
                        fd.append('resume', f)
                        const uploadRes = await fetch('/api/upload/resume', {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                          body: fd,
                        })
                        if (!uploadRes.ok) throw new Error('Upload failed')
                        const data = await uploadRes.json()

                        // Save URL to Resume model
                        await fetch('/api/resume', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ resumeFileUrl: data.url }),
                        })

                        setResumeFileUrl(data.url)
                        setResumeFileName(f.name)
                        setSavedResumeName(f.name)
                      } catch { /* upload failed */ }
                      setUploadingResume(false)
                      e.target.value = ''
                    }}
                  />
                </label>

                <Link to="/student/resumes"
                  className="flex items-center gap-2 rounded-xl border border-[#EAECF0] bg-white px-4 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]">
                  <FileText className="h-4 w-4" />
                  Open Resume Builder
                </Link>
              </div>

              {/* Saved resume info */}
              {savedResumeName && (
                <div className="mt-3 flex items-center gap-2 text-[13px] text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{savedResumeName}</span>
                  {resumeFileUrl && (
                    <a href={resumeFileUrl} target="_blank" rel="noopener noreferrer"
                      className="ml-2 flex items-center gap-1 text-[#1a6fa8] underline hover:text-[#0b3b5c]">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
              {!savedResumeName && (
                <p className="mt-3 text-[12px] text-[#98A2B3]">
                  No resume uploaded yet. Upload a PDF/DOC or use the Resume Builder.
                </p>
              )}
            </div>

            {/* Save Button */}
            <button onClick={handleSave} disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-[#0b3b5c]/40 disabled:opacity-70">
              {saving
                ? <span className="flex items-center gap-2">Saving... <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /></span>
                : <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Profile</span>
              }
            </button>
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  )
}

/* Shared field component */
function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[#101828]">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
    </div>
  )
}
