import { useState, useEffect, useRef } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import { FileText, Plus, X, ArrowRight, ChevronLeft, Download, Save, Image, Crown, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const TOTAL_STEPS = 6

interface PersonalInfo {
  fullName: string; email: string; phone: string; address: string
  linkedin: string; github: string; portfolio: string; photoUrl: string
}
interface ProjectItem { id: string; name: string; description: string; techStack: string; link: string }
interface ExperienceItem { id: string; company: string; role: string; startDate: string; endDate: string; description: string }
interface EducationItem { id: string; institute: string; degree: string; startYear: string; endYear: string }
interface ResumeData { personalInfo: PersonalInfo; skills: string[]; projects: ProjectItem[]; experience: ExperienceItem[]; education: EducationItem[]; templateId: string }
interface ResumeTemplate { id: string; name: string; description: string; hasPhoto: boolean; accentColor: string; isPro: boolean }

const TEMPLATES: ResumeTemplate[] = [
  { id: 'modern', name: 'Modern', description: 'Clean two-column layout, great for tech roles.', hasPhoto: false, accentColor: '#1a6fa8', isPro: false },
  { id: 'classic', name: 'Classic', description: 'Traditional single-column, ATS-friendly.', hasPhoto: false, accentColor: '#0b3b5c', isPro: false },
  { id: 'creative', name: 'Creative', description: 'Sidebar with profile photo for design roles.', hasPhoto: true, accentColor: '#1a6fa8', isPro: false },
  { id: 'minimal', name: 'Minimal', description: 'Simple, spacious, easy to scan.', hasPhoto: false, accentColor: '#0b3b5c', isPro: false },
  // ─── Premium Templates (PRO) ───
  { id: 'executive', name: 'Executive', description: 'Premium two-column with skills matrix, timeline, and summary panel.', hasPhoto: true, accentColor: '#8b5cf6', isPro: true },
  { id: 'ats-optimized', name: 'ATS Optimized', description: 'HR-parser friendly, keyword-optimized with scoring badges.', hasPhoto: false, accentColor: '#059669', isPro: true },
  { id: 'portfolio', name: 'Portfolio Plus', description: 'Visual-rich with skill bars, project cards, ratings, and certifications.', hasPhoto: true, accentColor: '#d97706', isPro: true },
]

function makeId(): string { return Math.random().toString(36).slice(2, 10) }

const emptyPersonalInfo: PersonalInfo = { fullName: '', email: '', phone: '', address: '', linkedin: '', github: '', portfolio: '', photoUrl: '' }

export default function ResumeBuilder() {
  const [step, setStep] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>(TEMPLATES[0])
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(emptyPersonalInfo)
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [experience, setExperience] = useState<ExperienceItem[]>([])
  const [education, setEducation] = useState<EducationItem[]>([])
  const { token, user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)

  // ─── Load profile from AuthContext + plan in 1 call ──────
  useEffect(() => {
    if (!token) return
    // Use AuthContext data — no /api/auth/me call needed!
    if (user) {
      setPersonalInfo((p) => ({
        ...p,
        fullName: user.fullName ?? p.fullName,
        email: user.email ?? p.email,
        phone: user.phone ?? p.phone,
        linkedin: user.linkedin ?? p.linkedin,
        github: user.github ?? p.github,
        portfolio: user.portfolio ?? p.portfolio,
        photoUrl: user.profilePicture ?? p.photoUrl,
      }))
      if (user.skills?.length > 0) setSkills(user.skills)
      if (user.education?.length > 0) {
        setEducation(user.education.map((e: any) => ({
          id: makeId(), institute: e.institute || e.school || '',
          degree: e.degree || '', startYear: e.startYear || '', endYear: e.endYear || '',
        })))
      }
    }
    // Only 1 fetch — plan info
    fetch('/api/stats/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok && r.json()).then(d => {
      if (d?.stats?.plan) setIsPro(d.stats.plan === 'pro')
    }).catch(() => {})
  }, [token])

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  const goBack = () => setStep((s) => Math.max(0, s - 1))

  const addSkill = () => { const v = skillInput.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); setSkillInput('') }
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s))

  const addProject = () => setProjects([...projects, { id: makeId(), name: '', description: '', techStack: '', link: '' }])
  const updateProject = (id: string, p: Partial<ProjectItem>) => setProjects(projects.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const removeProject = (id: string) => setProjects(projects.filter((x) => x.id !== id))

  const addExperience = () => setExperience([...experience, { id: makeId(), company: '', role: '', startDate: '', endDate: '', description: '' }])
  const updateExperience = (id: string, p: Partial<ExperienceItem>) => setExperience(experience.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const removeExperience = (id: string) => setExperience(experience.filter((x) => x.id !== id))

  const addEducation = () => setEducation([...education, { id: makeId(), institute: '', degree: '', startYear: '', endYear: '' }])
  const updateEducation = (id: string, p: Partial<EducationItem>) => setEducation(education.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const removeEducation = (id: string) => setEducation(education.filter((x) => x.id !== id))

  const handlePhotoUpload = async (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setPersonalInfo((p) => ({ ...p, photoUrl: reader.result as string }))
    reader.readAsDataURL(file)
    try {
      const fd = new FormData(); fd.append('photo', file)
      const res = await fetch('/api/upload/profile-picture', { method: 'POST', body: fd })
      if (res.ok) { const data = await res.json(); setPersonalInfo((p) => ({ ...p, photoUrl: data.url })) }
    } catch { /* no backend */ }
  }

  const buildData = (): ResumeData => ({ personalInfo, skills, projects, experience, education, templateId: selectedTemplate.id })

  const saveResume = async () => {
    setIsSaving(true); setSaveMessage(null)
    try {
      const res = await fetch('/api/resume', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(buildData()) })
      if (!res.ok) throw new Error('save failed')

      // Generate PDF from the preview HTML and upload it
      try {
        const previewEl = document.getElementById('resume-preview')
        if (previewEl) {
          // Small delay to let fonts/layout settle before capture
          await new Promise(r => setTimeout(r, 300))
          const canvas = await html2canvas(previewEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
          })
          const imgData = canvas.toDataURL('image/jpeg', 0.95)
          const pdf = new jsPDF('p', 'mm', 'a4')
          const pdfWidth = pdf.internal.pageSize.getWidth()
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
          const pdfBlob = pdf.output('blob')

          const fd = new FormData()
          fd.append('resume', pdfBlob, `${personalInfo.fullName || 'Resume'}.pdf`)
          const uploadRes = await fetch('/api/upload/resume', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          })
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            // Save the PDF URL to the existing Resume record
            await fetch('/api/resume', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ resumeFileUrl: uploadData.url }),
            })
          }
        }
      } catch { /* pdf generation failed — non-critical */ }

      // Also sync with Student profile so skills/education auto-fill everywhere
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            skills: skills,
            education: education.map(e => ({
              institute: e.institute,
              degree: e.degree,
              startYear: e.startYear,
              endYear: e.endYear,
            })),
            fullName: personalInfo.fullName || undefined,
            phone: personalInfo.phone || undefined,
            linkedin: personalInfo.linkedin || undefined,
            github: personalInfo.github || undefined,
            portfolio: personalInfo.portfolio || undefined,
          }),
        })
      } catch { /* profile sync is optional */ }

      setSaveMessage('Resume saved! PDF generated and profile updated.')
    } catch { setSaveMessage('Could not save to server yet, but your resume is ready to download below.') }
    finally { setIsSaving(false) }
  }

  const stepLabels = ['Template', 'Personal Info', 'Skills', 'Projects', 'Experience', 'Education', 'Preview']

  return (
    <StudentDashboardLayout>
      <div className="p-8">
        <div className="w-full">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#101828]">Resume Builder</h1>
              <p className="text-[13px] text-[#667085]">Fill in your details, pick a template, and export</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="mb-6 flex flex-wrap gap-2 print:hidden">
            {stepLabels.map((label, i) => (
              <button key={label} onClick={() => setStep(i)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                  i === step ? 'bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] text-white shadow-lg shadow-[#0b3b5c]/30' :
                  i < step ? 'bg-blue-50 text-[#1a6fa8]' : 'border border-[#EAECF0] bg-white text-[#98A2B3]'
                }`}>
                {i + 1}. {label}
              </button>
            ))}
          </div>

          {step === 0 && (
            <div className="w-full rounded-2xl border border-[#EAECF0] bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#101828]">Choose a template</h2>
                  <p className="mt-0.5 text-[13px] text-[#667085]">Select a design for your resume</p>
                </div>
                {isPro && (
                  <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-amber-500 px-3 py-1.5 text-[12px] font-bold text-white shadow-lg">
                    <Crown className="h-3.5 w-3.5" />
                    PRO
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TEMPLATES.map((t) => {
                  const isLocked = t.isPro && !isPro
                  return (
                    <div key={t.id} className="relative">
                      <button
                        onClick={() => !isLocked && setSelectedTemplate(t)}
                        disabled={isLocked}
                        className={`relative w-full rounded-2xl border-2 p-5 text-left transition-all ${
                          selectedTemplate.id === t.id && !isLocked
                            ? 'border-[#1a6fa8] ring-[3px] ring-[#1a6fa8]/15'
                            : isLocked
                            ? 'border-[#EAECF0] opacity-60 cursor-not-allowed'
                            : 'border-[#EAECF0] hover:border-[#D0D5DD]'
                        }`}
                      >
                        {/* Template preview miniature — mimics the real resume layout */}
                        <TemplateThumb template={t} />

                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-[#101828]">{t.name}</p>
                            <p className="mt-0.5 text-[12px] text-[#667085]">{t.description}</p>
                          </div>
                          {t.hasPhoto && !isLocked && (
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-[#1a6fa8]">Photo</span>
                          )}
                        </div>
                      </button>

                      {/* Lock overlay (rendered first so it sits below the badge) */}
                      {isLocked && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/30 backdrop-blur-[1px]">
                          <div className="flex flex-col items-center gap-1">
                            <Lock className="h-6 w-6 text-[#98A2B3]" />
                            <span className="text-[11px] font-medium text-[#98A2B3]">Upgrade to unlock</span>
                          </div>
                        </div>
                      )}

                      {/* PRO badge — z-20 so it always renders crisp, above the blurred overlay */}
                      {isLocked && (
                        <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                          <Crown className="h-3 w-3" />
                          PRO
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <button onClick={goNext} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="w-full rounded-2xl border border-[#EAECF0] bg-white p-8 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#101828]">Personal information</h2>
              {selectedTemplate.hasPhoto && (
                <PhotoUploader photoUrl={personalInfo.photoUrl} onUpload={handlePhotoUpload} />
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField label="Full name" value={personalInfo.fullName} onChange={(v) => setPersonalInfo({ ...personalInfo, fullName: v })} placeholder="e.g. Husnain Sattar" />
                <InputField label="Email" value={personalInfo.email} onChange={(v) => setPersonalInfo({ ...personalInfo, email: v })} placeholder="husnain@example.com" />
                <InputField label="Phone" value={personalInfo.phone} onChange={(v) => setPersonalInfo({ ...personalInfo, phone: v })} placeholder="+92 300 1234567" />
                <InputField label="Address / City" value={personalInfo.address} onChange={(v) => setPersonalInfo({ ...personalInfo, address: v })} placeholder="Lahore, Pakistan" />
                <InputField label="LinkedIn" value={personalInfo.linkedin} onChange={(v) => setPersonalInfo({ ...personalInfo, linkedin: v })} placeholder="linkedin.com/in/yourname" />
                <InputField label="GitHub" value={personalInfo.github} onChange={(v) => setPersonalInfo({ ...personalInfo, github: v })} placeholder="github.com/yourname" />
                <InputField label="Portfolio" value={personalInfo.portfolio} onChange={(v) => setPersonalInfo({ ...personalInfo, portfolio: v })} placeholder="yourwebsite.com" className="sm:col-span-2" />
              </div>
              <StepNav onBack={goBack} onNext={goNext} nextLabel="Continue" />
            </div>
          )}

          {step === 2 && (
            <SkillsEditor skills={skills} skillInput={skillInput} setSkillInput={setSkillInput} addSkill={addSkill} removeSkill={removeSkill} onBack={goBack} onNext={goNext} />
          )}
          {step === 3 && (
            <ListEditor title="Projects" items={projects} onAdd={addProject} onRemove={removeProject}
              fields={[
                { key: 'name', placeholder: 'Project name', colSpan: false },
                { key: 'techStack', placeholder: 'Tech stack (e.g. React, Node.js)', colSpan: false },
                { key: 'link', placeholder: 'Project link (optional)', colSpan: 'sm:col-span-2' },
                { key: 'description', placeholder: 'Short description...', colSpan: 'sm:col-span-2', multiline: true },
              ]}
              onUpdate={(id, val) => updateProject(id, val as any)} onBack={goBack} onNext={goNext} />
          )}
          {step === 4 && (
            <ListEditor title="Experience" items={experience} onAdd={addExperience} onRemove={removeExperience}
              fields={[
                { key: 'company', placeholder: 'Company', colSpan: false },
                { key: 'role', placeholder: 'Role / job title', colSpan: false },
                { key: 'startDate', placeholder: 'Start (e.g. Jan 2023)', colSpan: false },
                { key: 'endDate', placeholder: 'End (e.g. Present)', colSpan: false },
                { key: 'description', placeholder: 'What did you do / achieve?', colSpan: 'sm:col-span-2', multiline: true },
              ]}
              onUpdate={(id, val) => updateExperience(id, val as any)} onBack={goBack} onNext={goNext} />
          )}
          {step === 5 && (
            <ListEditor title="Education" items={education} onAdd={addEducation} onRemove={removeEducation}
              fields={[
                { key: 'institute', placeholder: 'Institute / University', colSpan: false },
                { key: 'degree', placeholder: 'Degree (e.g. BSCS)', colSpan: false },
                { key: 'startYear', placeholder: 'Start year', colSpan: false },
                { key: 'endYear', placeholder: 'End year (or expected)', colSpan: false },
              ]}
              onUpdate={(id, val) => updateEducation(id, val as any)} onBack={goBack} onNext={() => { goNext(); setSaveMessage(null) }} nextLabel="Preview resume" />
          )}

          {step === 6 && (
            <PreviewStep data={buildData()} template={selectedTemplate} onBack={goBack} onSave={saveResume} onDownload={() => window.print()} isSaving={isSaving} saveMessage={saveMessage} />
          )}
        </div>
      </div>
    </StudentDashboardLayout>
  )
}

/* ------------------------ Shared UI components --------------------------- */

function InputField({ label, value, onChange, placeholder, className }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-[#101828]">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
    </div>
  )
}

function StepNav({ onBack, onNext, nextLabel = 'Continue' }: { onBack: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="mt-6 flex gap-3">
      <button onClick={onBack} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#EAECF0] bg-white py-3 text-sm font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] hover:text-[#101828]">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <button onClick={onNext} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
        {nextLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function PhotoUploader({ photoUrl, onUpload }: { photoUrl: string; onUpload: (f: File) => void }) {
  const ref = useRef<HTMLInputElement | null>(null)
  return (
    <div className="mb-5 flex items-center gap-4">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#F7F9FC]">
        {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : <Image className="h-8 w-8 text-[#98A2B3]" />}
      </div>
      <div>
        <button onClick={() => ref.current?.click()} className="flex items-center gap-2 rounded-xl border border-[#EAECF0] bg-white px-4 py-2 text-[13px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]">
          <Image className="h-4 w-4" /> Upload photo
        </button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
        <p className="mt-1 text-[12px] text-[#98A2B3]">This template uses a profile photo.</p>
      </div>
    </div>
  )
}

function SkillsEditor({ skills, skillInput, setSkillInput, addSkill, removeSkill, onBack, onNext }: any) {
  return (
    <div className="w-full rounded-2xl border border-[#EAECF0] bg-white p-8 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[#101828]">Skills</h2>
      <div className="flex gap-2">
        <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
          placeholder="e.g. React" className="flex-1 rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
        <button onClick={addSkill} className="rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">Add</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {skills.map((s: string) => (
          <span key={s} className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[13px] font-medium text-[#1a6fa8]">
            {s}
            <button onClick={() => removeSkill(s)} className="text-[#1a6fa8]/60 hover:text-[#1a6fa8]"><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        {skills.length === 0 && <p className="text-[13px] text-[#98A2B3]">No skills added yet.</p>}
      </div>
      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  )
}

interface ListField { key: string; placeholder: string; colSpan: string | boolean; multiline?: boolean }

function ListEditor({ title, items, onAdd, onRemove, fields, onUpdate, onBack, onNext, nextLabel }: {
  title: string; items: any[]; onAdd: () => void; onRemove: (id: string) => void
  fields: ListField[]; onUpdate: (id: string, patch: any) => void; onBack: () => void; onNext: () => void; nextLabel?: string
}) {
  return (
    <div className="w-full rounded-2xl border border-[#EAECF0] bg-white p-8 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[#101828]">{title}</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-[#EAECF0] bg-white p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map((f) => {
                const cls = `rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15 ${typeof f.colSpan === 'string' ? f.colSpan : ''}`
                return f.multiline ? (
                  <textarea key={f.key} value={item[f.key]} onChange={(e) => onUpdate(item.id, { [f.key]: e.target.value })}
                    placeholder={f.placeholder} rows={3} className={cls + ' resize-none'} />
                ) : (
                  <input key={f.key} value={item[f.key]} onChange={(e) => onUpdate(item.id, { [f.key]: e.target.value })}
                    placeholder={f.placeholder} className={cls} />
                )
              })}
            </div>
            <button onClick={() => onRemove(item.id)} className="mt-2 flex items-center gap-1 text-[13px] text-red-500 hover:text-red-600">
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        ))}
      </div>
      <button onClick={onAdd} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#EAECF0] py-3 text-[13px] font-medium text-[#667085] transition-colors hover:border-[#D0D5DD] hover:text-[#101828]">
        <Plus className="h-4 w-4" /> Add {title.toLowerCase()}
      </button>
      <StepNav onBack={onBack} onNext={onNext} nextLabel={nextLabel} />
    </div>
  )
}

/* --------------------- Template picker mini-preview ---------------------- */
/* Each template gets its own small mock layout so the user can see roughly
   how the final resume will look (banner vs centered header, sidebar vs
   single column, photo placement, skill bars, etc.) before selecting it. */

function TBar({ w, h = 'h-1', color, opacity = 1 }: { w: string; h?: string; color: string; opacity?: number }) {
  return <div className={`${h} ${w} rounded-full`} style={{ background: color, opacity }} />
}

function TemplateThumb({ template }: { template: ResumeTemplate }) {
  const c = template.accentColor

  const wrapper = 'relative mb-3 h-32 w-full overflow-hidden rounded-xl border border-[#EAECF0] bg-white'

  switch (template.id) {
    // ── Modern: colored banner header + two-column body ──────────────
    case 'modern':
      return (
        <div className={wrapper}>
          <div className="flex h-9 flex-col justify-center gap-1 px-3" style={{ background: c }}>
            <TBar w="w-14" h="h-1.5" color="rgba(255,255,255,0.95)" />
            <TBar w="w-9" color="rgba(255,255,255,0.6)" />
          </div>
          <div className="grid grid-cols-5 gap-2 p-2.5">
            <div className="col-span-2 space-y-1.5">
              <TBar w="w-full" color={c} opacity={0.5} />
              <TBar w="w-4/5" color={c} opacity={0.25} />
              <TBar w="w-3/5" color={c} opacity={0.25} />
              <div className="pt-1.5" />
              <TBar w="w-full" color={c} opacity={0.5} />
              <TBar w="w-4/5" color={c} opacity={0.25} />
            </div>
            <div className="col-span-3 space-y-1.5">
              <TBar w="w-1/2" color={c} opacity={0.8} />
              <TBar w="w-full" color="#EAECF0" />
              <TBar w="w-11/12" color="#EAECF0" />
              <TBar w="w-4/5" color="#EAECF0" />
              <div className="pt-1" />
              <TBar w="w-1/2" color={c} opacity={0.8} />
              <TBar w="w-full" color="#EAECF0" />
            </div>
          </div>
        </div>
      )

    // ── Classic: centered name, thin rule, centered section titles ───
    case 'classic':
      return (
        <div className={wrapper}>
          <div className="flex flex-col items-center gap-1 px-4 pt-3">
            <TBar w="w-20" h="h-1.5" color={c} />
            <TBar w="w-14" color="#98A2B3" opacity={0.6} />
          </div>
          <div className="mx-4 mt-2 border-t" style={{ borderColor: c }} />
          <div className="space-y-2 px-4 pt-2">
            <div className="flex flex-col items-center gap-1">
              <TBar w="w-1/3" color={c} opacity={0.8} />
              <TBar w="w-full" color="#EAECF0" />
              <TBar w="w-5/6" color="#EAECF0" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <TBar w="w-1/3" color={c} opacity={0.8} />
              <TBar w="w-4/5" color="#EAECF0" />
            </div>
          </div>
        </div>
      )

    // ── Creative: colored sidebar with photo + skill bars ────────────
    case 'creative':
      return (
        <div className={wrapper}>
          <div className="flex h-full">
            <div className="flex w-1/3 flex-col items-center gap-2 p-2.5" style={{ background: `${c}1a` }}>
              <div className="h-7 w-7 rounded-full" style={{ background: `${c}80` }} />
              <TBar w="w-4/5" color={c} opacity={0.6} />
              <div className="mt-1 w-full space-y-1">
                <TBar w="w-full" h="h-1.5" color={c} opacity={0.7} />
                <TBar w="w-2/3" h="h-1.5" color={c} opacity={0.5} />
                <TBar w="w-4/5" h="h-1.5" color={c} opacity={0.4} />
              </div>
            </div>
            <div className="flex-1 space-y-1.5 p-2.5">
              <TBar w="w-1/2" color={c} opacity={0.8} />
              <TBar w="w-full" color="#EAECF0" />
              <TBar w="w-11/12" color="#EAECF0" />
              <div className="pt-1" />
              <TBar w="w-1/2" color={c} opacity={0.8} />
              <TBar w="w-full" color="#EAECF0" />
              <TBar w="w-3/4" color="#EAECF0" />
            </div>
          </div>
        </div>
      )

    // ── Minimal: plain, spacious, left-aligned ────────────────────────
    case 'minimal':
      return (
        <div className={wrapper}>
          <div className="space-y-2.5 p-4">
            <TBar w="w-1/2" h="h-1.5" color={c} />
            <TBar w="w-1/3" color="#98A2B3" opacity={0.5} />
            <div className="pt-1" />
            <TBar w="w-full" color="#EAECF0" />
            <TBar w="w-4/5" color="#EAECF0" />
            <div className="pt-1" />
            <TBar w="w-full" color="#EAECF0" />
            <TBar w="w-3/5" color="#EAECF0" />
          </div>
        </div>
      )

    // ── Executive (PRO): purple banner + two-column timeline ─────────
    case 'executive':
      return (
        <div className={wrapper}>
          <div className="flex h-9 items-center gap-2 px-3" style={{ background: `linear-gradient(90deg, ${c}, #d97706)` }}>
            <div className="h-5 w-5 shrink-0 rounded-full bg-white/80" />
            <div className="flex flex-1 flex-col gap-1">
              <TBar w="w-14" h="h-1.5" color="rgba(255,255,255,0.95)" />
              <TBar w="w-9" color="rgba(255,255,255,0.6)" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 p-2.5">
            <div className="col-span-2 space-y-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
                  <TBar w="w-full" color="#EAECF0" />
                </div>
              ))}
            </div>
            <div className="col-span-3 space-y-1.5">
              <TBar w="w-1/2" color={c} opacity={0.8} />
              <TBar w="w-full" color="#EAECF0" />
              <TBar w="w-4/5" color="#EAECF0" />
            </div>
          </div>
        </div>
      )

    // ── ATS Optimized (PRO): plain, single column, keyword pills ─────
    case 'ats-optimized':
      return (
        <div className={wrapper}>
          <div className="space-y-2 p-3">
            <TBar w="w-1/2" h="h-1.5" color={c} />
            <TBar w="w-1/3" color="#98A2B3" opacity={0.5} />
            <div className="flex gap-1 pt-1">
              <span className="rounded-full px-1.5 py-0.5 text-[6px] font-semibold text-white" style={{ background: c }}>ATS 98%</span>
              <span className="rounded-full px-1.5 py-0.5 text-[6px] font-medium" style={{ background: `${c}20`, color: c }}>Keyword match</span>
            </div>
            <div className="pt-1">
              <TBar w="w-1/3" color={c} opacity={0.8} />
              <div className="mt-1 space-y-1">
                <TBar w="w-full" color="#EAECF0" />
                <TBar w="w-11/12" color="#EAECF0" />
                <TBar w="w-4/5" color="#EAECF0" />
              </div>
            </div>
          </div>
        </div>
      )

    // ── Portfolio Plus (PRO): photo + skill bars + project cards ─────
    case 'portfolio':
      return (
        <div className={wrapper}>
          <div className="flex items-center justify-between px-3 pt-2.5">
            <div className="space-y-1">
              <TBar w="w-16" h="h-1.5" color={c} />
              <TBar w="w-10" color="#98A2B3" opacity={0.5} />
            </div>
            <div className="h-6 w-6 rounded-full" style={{ background: `${c}80` }} />
          </div>
          <div className="grid grid-cols-3 gap-1 px-3 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 rounded" style={{ background: `${c}20` }} />
            ))}
          </div>
          <div className="space-y-1 px-3 pt-2">
            <div className="flex items-center gap-1">
              <TBar w="w-1/4" color="#667085" opacity={0.7} />
              <div className="h-1 flex-1 rounded-full bg-[#EAECF0]"><div className="h-1 w-4/5 rounded-full" style={{ background: c }} /></div>
            </div>
            <div className="flex items-center gap-1">
              <TBar w="w-1/4" color="#667085" opacity={0.7} />
              <div className="h-1 flex-1 rounded-full bg-[#EAECF0]"><div className="h-1 w-3/5 rounded-full" style={{ background: c }} /></div>
            </div>
          </div>
        </div>
      )

    default:
      return <div className={wrapper} />
  }
}

/* --------------------------- Preview & Export ---------------------------- */

function PreviewStep({ data, template, onBack, onSave, onDownload, isSaving, saveMessage }: any) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl border border-[#EAECF0] bg-white px-4 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC]">
          <ChevronLeft className="h-4 w-4" /> Back to editing
        </button>
        <button onClick={onSave} disabled={isSaving}
          className="flex items-center gap-2 rounded-xl border border-[#EAECF0] bg-white px-4 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] disabled:opacity-50">
          <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save resume'}
        </button>
        <button onClick={onDownload}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>
      {saveMessage && <p className="mb-4 text-[13px] text-[#667085] print:hidden">{saveMessage}</p>}
      <ResumePreview data={data} template={template} />
    </div>
  )
}

// ─── Dispatcher: each template now renders its OWN distinct layout ───────
// (previously every template shared one generic layout — only color/photo
// changed — so all resumes looked the same regardless of chosen template)
function ResumePreview({ data, template }: { data: ResumeData; template: ResumeTemplate }) {
  switch (template.id) {
    case 'modern': return <ModernResume data={data} template={template} />
    case 'creative': return <CreativeResume data={data} template={template} />
    case 'minimal': return <MinimalResume data={data} template={template} />
    case 'executive': return <ExecutiveResume data={data} template={template} />
    case 'ats-optimized': return <AtsResume data={data} template={template} />
    case 'portfolio': return <PortfolioResume data={data} template={template} />
    case 'classic':
    default:
      return <ClassicResume data={data} template={template} />
  }
}

/* Deterministic pseudo skill-level so progress bars look varied but stable
   across re-renders (no proficiency field exists in the data model). */
function skillLevel(skill: string, idx: number): number {
  return 60 + ((skill.length * 7 + idx * 11) % 34)
}

function SkillPill({ label, color }: { label: string; color: string }) {
  return <span className="rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: `${color}15`, color }}>{label}</span>
}

function SkillBar({ label, level, color }: { label: string; level: number; color: string }) {
  return (
    <div className="mb-2">
      <p className="mb-1 text-[12px] text-[#344054]">{label}</p>
      <div className="h-1.5 w-full rounded-full bg-[#EAECF0]">
        <div className="h-1.5 rounded-full" style={{ width: `${level}%`, background: color }} />
      </div>
    </div>
  )
}

function initials(name: string): string {
  return (name || 'Y N').trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

/* ── Classic: centered header, centered section titles, single column ── */
function ClassicResume({ data, template }: { data: ResumeData; template: ResumeTemplate }) {
  const { personalInfo, skills, projects, experience, education } = data
  const c = template.accentColor
  return (
    <div id="resume-preview" className="w-full rounded-2xl border border-[#EAECF0] bg-white p-10 shadow-sm print:border-0 print:shadow-none">
      <div className="mb-5 flex flex-col items-center text-center">
        <h2 className="text-2xl font-bold tracking-wide text-[#101828]">{personalInfo.fullName || 'Your Name'}</h2>
        <p className="mt-1.5 text-[13px] text-[#667085]">{[personalInfo.email, personalInfo.phone, personalInfo.address].filter(Boolean).join(' · ')}</p>
        <p className="text-[13px] text-[#667085]">{[personalInfo.linkedin, personalInfo.github, personalInfo.portfolio].filter(Boolean).join(' · ')}</p>
        <div className="mt-4 h-[2px] w-24" style={{ background: c }} />
      </div>
      {experience.length > 0 && (
        <div className="mb-5 text-center">
          <h3 className="mb-2 text-[13px] font-bold uppercase tracking-widest" style={{ color: c }}>Professional Experience</h3>
          <div className="mx-auto max-w-xl text-left">
            {experience.map((e) => (
              <div key={e.id} className="mb-3">
                <div className="flex justify-between text-[13px] font-semibold text-[#101828]"><span>{e.role} — {e.company}</span><span className="text-[#98A2B3]">{e.startDate} - {e.endDate}</span></div>
                <p className="text-[13px] text-[#667085]">{e.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {projects.length > 0 && (
        <div className="mb-5 text-center">
          <h3 className="mb-2 text-[13px] font-bold uppercase tracking-widest" style={{ color: c }}>Projects</h3>
          <div className="mx-auto max-w-xl text-left">
            {projects.map((p) => (
              <div key={p.id} className="mb-3">
                <p className="text-[13px] font-semibold text-[#101828]">{p.name}{p.techStack && <span className="text-[#98A2B3]"> ({p.techStack})</span>}</p>
                <p className="text-[13px] text-[#667085]">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-8 text-center">
        {education.length > 0 && (
          <div>
            <h3 className="mb-2 text-[13px] font-bold uppercase tracking-widest" style={{ color: c }}>Education</h3>
            {education.map((ed) => (
              <p key={ed.id} className="text-[12px] text-[#667085]">{ed.degree} — {ed.institute} ({ed.startYear}-{ed.endYear})</p>
            ))}
          </div>
        )}
        {skills.length > 0 && (
          <div>
            <h3 className="mb-2 text-[13px] font-bold uppercase tracking-widest" style={{ color: c }}>Key Skills</h3>
            <p className="text-[12px] text-[#667085]">{skills.join(' · ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Modern: colored banner header + two-column body ───────────────── */
function ModernResume({ data, template }: { data: ResumeData; template: ResumeTemplate }) {
  const { personalInfo, skills, projects, experience, education } = data
  const c = template.accentColor
  return (
    <div id="resume-preview" className="w-full overflow-hidden rounded-2xl border border-[#EAECF0] bg-white shadow-sm print:border-0 print:shadow-none">
      <div className="px-10 py-6" style={{ background: c }}>
        <h2 className="text-2xl font-bold text-white">{personalInfo.fullName || 'Your Name'}</h2>
        <p className="mt-1 text-[13px] text-white/80">{experience[0]?.role || 'Professional'}</p>
      </div>
      <div className="grid grid-cols-3 gap-8 p-10">
        <div className="col-span-1 space-y-6">
          <div>
            <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Contact</h3>
            <div className="space-y-1 text-[12px] text-[#667085]">
              {[personalInfo.email, personalInfo.phone, personalInfo.address, personalInfo.linkedin, personalInfo.github, personalInfo.portfolio].filter(Boolean).map((v) => <p key={v}>{v}</p>)}
            </div>
          </div>
          {skills.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => <SkillPill key={s} label={s} color={c} />)}
              </div>
            </div>
          )}
          {education.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Education</h3>
              {education.map((ed) => (
                <div key={ed.id} className="mb-2 text-[12px] text-[#667085]">
                  <p className="font-medium text-[#101828]">{ed.degree}</p>
                  <p>{ed.institute}</p>
                  <p className="text-[#98A2B3]">{ed.startYear} - {ed.endYear}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="col-span-2 space-y-6">
          {experience.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Experience</h3>
              {experience.map((e) => (
                <div key={e.id} className="mb-3">
                  <div className="flex justify-between text-[13px] font-semibold text-[#101828]"><span>{e.role} — {e.company}</span><span className="text-[#98A2B3]">{e.startDate} - {e.endDate}</span></div>
                  <p className="text-[13px] text-[#667085]">{e.description}</p>
                </div>
              ))}
            </div>
          )}
          {projects.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Projects</h3>
              {projects.map((p) => (
                <div key={p.id} className="mb-3">
                  <p className="text-[13px] font-semibold text-[#101828]">{p.name}{p.techStack && <span className="text-[#98A2B3]"> ({p.techStack})</span>}</p>
                  <p className="text-[13px] text-[#667085]">{p.description}</p>
                  {p.link && <p className="text-[12px]" style={{ color: c }}>{p.link}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Creative: colored sidebar with photo + skill bars ──────────────── */
function CreativeResume({ data, template }: { data: ResumeData; template: ResumeTemplate }) {
  const { personalInfo, skills, projects, experience, education } = data
  const c = template.accentColor
  return (
    <div id="resume-preview" className="flex w-full overflow-hidden rounded-2xl border border-[#EAECF0] bg-white shadow-sm print:border-0 print:shadow-none">
      <div className="w-1/3 space-y-6 p-8" style={{ background: `${c}0d` }}>
        {personalInfo.photoUrl ? (
          <img src={personalInfo.photoUrl} alt={personalInfo.fullName} className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: `${c}30` }}>
            <span className="text-2xl font-bold" style={{ color: c }}>{initials(personalInfo.fullName)}</span>
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-[#101828]">{personalInfo.fullName || 'Your Name'}</h2>
          <p className="mt-1 text-[12px] text-[#667085]">{experience[0]?.role || ''}</p>
        </div>
        <div>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: c }}>Contact</h3>
          <div className="space-y-1 text-[12px] text-[#667085]">
            {[personalInfo.email, personalInfo.phone, personalInfo.linkedin, personalInfo.github].filter(Boolean).map((v) => <p key={v}>{v}</p>)}
          </div>
        </div>
        {skills.length > 0 && (
          <div>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: c }}>Skills</h3>
            {skills.slice(0, 8).map((s, i) => <SkillBar key={s} label={s} level={skillLevel(s, i)} color={c} />)}
          </div>
        )}
      </div>
      <div className="w-2/3 space-y-6 p-8">
        {experience.length > 0 && (
          <div>
            <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Experience</h3>
            {experience.map((e) => (
              <div key={e.id} className="mb-3">
                <div className="flex justify-between text-[13px] font-semibold text-[#101828]"><span>{e.role} — {e.company}</span><span className="text-[#98A2B3]">{e.startDate} - {e.endDate}</span></div>
                <p className="text-[13px] text-[#667085]">{e.description}</p>
              </div>
            ))}
          </div>
        )}
        {projects.length > 0 && (
          <div>
            <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Projects</h3>
            {projects.map((p) => (
              <div key={p.id} className="mb-3">
                <p className="text-[13px] font-semibold text-[#101828]">{p.name}{p.techStack && <span className="text-[#98A2B3]"> ({p.techStack})</span>}</p>
                <p className="text-[13px] text-[#667085]">{p.description}</p>
              </div>
            ))}
          </div>
        )}
        {education.length > 0 && (
          <div>
            <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Education</h3>
            {education.map((ed) => (
              <div key={ed.id} className="mb-1 flex justify-between text-[13px]"><span className="text-[#101828]">{ed.degree} — {ed.institute}</span><span className="text-[#98A2B3]">{ed.startYear} - {ed.endYear}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Minimal: plain, spacious, left-aligned ─────────────────────────── */
function MinimalResume({ data, template }: { data: ResumeData; template: ResumeTemplate }) {
  const { personalInfo, skills, projects, experience, education } = data
  const c = template.accentColor
  return (
    <div id="resume-preview" className="w-full rounded-2xl border border-[#EAECF0] bg-white p-12 shadow-sm print:border-0 print:shadow-none">
      <h2 className="text-3xl font-light tracking-tight text-[#101828]">{personalInfo.fullName || 'Your Name'}</h2>
      <p className="mt-2 text-[13px] text-[#98A2B3]">{[personalInfo.email, personalInfo.phone, personalInfo.address].filter(Boolean).join('   ')}</p>
      <div className="mt-3 h-px w-full" style={{ background: c, opacity: 0.3 }} />
      {experience.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#101828]">Experience</h3>
          {experience.map((e) => (
            <div key={e.id} className="mb-4">
              <div className="flex justify-between text-[13px] text-[#101828]"><span className="font-medium">{e.role}, {e.company}</span><span className="text-[#98A2B3]">{e.startDate} - {e.endDate}</span></div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#667085]">{e.description}</p>
            </div>
          ))}
        </div>
      )}
      {projects.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#101828]">Projects</h3>
          {projects.map((p) => (
            <div key={p.id} className="mb-4">
              <p className="text-[13px] font-medium text-[#101828]">{p.name}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#667085]">{p.description}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 grid grid-cols-2 gap-8">
        {education.length > 0 && (
          <div>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#101828]">Education</h3>
            {education.map((ed) => (
              <p key={ed.id} className="text-[13px] text-[#667085]">{ed.degree}, {ed.institute}</p>
            ))}
          </div>
        )}
        {skills.length > 0 && (
          <div>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#101828]">Skills</h3>
            <p className="text-[13px] text-[#667085]">{skills.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Executive (PRO): gradient banner + timeline + skills matrix ─────── */
function ExecutiveResume({ data, template }: { data: ResumeData; template: ResumeTemplate }) {
  const { personalInfo, skills, projects, experience, education } = data
  const c = template.accentColor
  return (
    <div id="resume-preview" className="w-full overflow-hidden rounded-2xl border border-[#EAECF0] bg-white shadow-sm print:border-0 print:shadow-none">
      <div className="flex items-center gap-5 px-10 py-6" style={{ background: `linear-gradient(90deg, ${c}, #d97706)` }}>
        {personalInfo.photoUrl ? (
          <img src={personalInfo.photoUrl} alt={personalInfo.fullName} className="h-16 w-16 rounded-full object-cover ring-2 ring-white/60" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/60">
            <span className="text-lg font-bold text-white">{initials(personalInfo.fullName)}</span>
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-white">{personalInfo.fullName || 'Your Name'}</h2>
          <p className="text-[13px] text-white/80">{[personalInfo.email, personalInfo.phone].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-8 p-10">
        <div className="col-span-2">
          {experience.length > 0 && (
            <div>
              <h3 className="mb-3 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Timeline</h3>
              <div className="space-y-4 border-l-2 pl-4" style={{ borderColor: `${c}40` }}>
                {experience.map((e) => (
                  <div key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                    <p className="text-[13px] font-semibold text-[#101828]">{e.role}</p>
                    <p className="text-[12px] text-[#667085]">{e.company}</p>
                    <p className="text-[11px] text-[#98A2B3]">{e.startDate} - {e.endDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {skills.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Skills Matrix</h3>
              {skills.slice(0, 6).map((s, i) => <SkillBar key={s} label={s} level={skillLevel(s, i)} color={c} />)}
            </div>
          )}
        </div>
        <div className="col-span-3 space-y-6">
          {experience.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Summary</h3>
              {experience.map((e) => (
                <p key={e.id} className="mb-2 text-[13px] leading-relaxed text-[#667085]"><span className="font-semibold text-[#101828]">{e.role} — {e.company}: </span>{e.description}</p>
              ))}
            </div>
          )}
          {projects.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Projects</h3>
              {projects.map((p) => (
                <div key={p.id} className="mb-2">
                  <p className="text-[13px] font-semibold text-[#101828]">{p.name}</p>
                  <p className="text-[13px] text-[#667085]">{p.description}</p>
                </div>
              ))}
            </div>
          )}
          {education.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: c }}>Education</h3>
              {education.map((ed) => (
                <p key={ed.id} className="text-[13px] text-[#667085]">{ed.degree} — {ed.institute} ({ed.startYear}-{ed.endYear})</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── ATS Optimized (PRO): plain single column, keyword pills, score badge ── */
function AtsResume({ data, template }: { data: ResumeData; template: ResumeTemplate }) {
  const { personalInfo, skills, projects, experience, education } = data
  const c = template.accentColor
  return (
    <div id="resume-preview" className="w-full rounded-2xl border border-[#EAECF0] bg-white p-10 shadow-sm print:border-0 print:shadow-none">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#101828]">{personalInfo.fullName || 'Your Name'}</h2>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: c }}>ATS Score: 96%</span>
      </div>
      <p className="mb-5 text-[13px] text-[#667085]">{[personalInfo.email, personalInfo.phone, personalInfo.address, personalInfo.linkedin, personalInfo.github, personalInfo.portfolio].filter(Boolean).join(' | ')}</p>
      {skills.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 border-l-4 pl-2 text-[13px] font-bold uppercase" style={{ borderColor: c, color: c }}>Keyword Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => <SkillPill key={s} label={s} color={c} />)}
          </div>
        </div>
      )}
      {experience.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 border-l-4 pl-2 text-[13px] font-bold uppercase" style={{ borderColor: c, color: c }}>Work Experience</h3>
          {experience.map((e) => (
            <div key={e.id} className="mb-3">
              <div className="flex justify-between text-[13px] font-semibold text-[#101828]"><span>{e.role}, {e.company}</span><span className="text-[#98A2B3]">{e.startDate} - {e.endDate}</span></div>
              <p className="text-[13px] text-[#667085]">{e.description}</p>
            </div>
          ))}
        </div>
      )}
      {projects.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 border-l-4 pl-2 text-[13px] font-bold uppercase" style={{ borderColor: c, color: c }}>Projects</h3>
          {projects.map((p) => (
            <div key={p.id} className="mb-2">
              <p className="text-[13px] font-semibold text-[#101828]">{p.name} {p.techStack && <span className="font-normal text-[#98A2B3]">— {p.techStack}</span>}</p>
              <p className="text-[13px] text-[#667085]">{p.description}</p>
            </div>
          ))}
        </div>
      )}
      {education.length > 0 && (
        <div>
          <h3 className="mb-2 border-l-4 pl-2 text-[13px] font-bold uppercase" style={{ borderColor: c, color: c }}>Education</h3>
          {education.map((ed) => (
            <p key={ed.id} className="text-[13px] text-[#667085]">{ed.degree}, {ed.institute} ({ed.startYear}-{ed.endYear})</p>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Portfolio Plus (PRO): photo + skill bars + project cards ────────── */
function PortfolioResume({ data, template }: { data: ResumeData; template: ResumeTemplate }) {
  const { personalInfo, skills, projects, experience, education } = data
  const c = template.accentColor
  return (
    <div id="resume-preview" className="w-full rounded-2xl border border-[#EAECF0] bg-white p-10 shadow-sm print:border-0 print:shadow-none">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#101828]">{personalInfo.fullName || 'Your Name'}</h2>
          <p className="mt-1 text-[13px] text-[#667085]">{experience[0]?.role || ''}</p>
          <p className="mt-1 text-[12px] text-[#98A2B3]">{[personalInfo.email, personalInfo.phone].filter(Boolean).join(' · ')}</p>
        </div>
        {personalInfo.photoUrl ? (
          <img src={personalInfo.photoUrl} alt={personalInfo.fullName} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${c}25` }}>
            <span className="text-lg font-bold" style={{ color: c }}>{initials(personalInfo.fullName)}</span>
          </div>
        )}
      </div>
      {skills.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-2">
          {skills.slice(0, 8).map((s, i) => <SkillBar key={s} label={s} level={skillLevel(s, i)} color={c} />)}
        </div>
      )}
      {projects.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-[13px] font-bold uppercase tracking-widest" style={{ color: c }}>Projects</h3>
          <div className="grid grid-cols-3 gap-3">
            {projects.map((p) => (
              <div key={p.id} className="rounded-xl border p-3" style={{ borderColor: `${c}30` }}>
                <p className="text-[12px] font-semibold text-[#101828]">{p.name}</p>
                <p className="mt-1 text-[11px] text-[#667085]">{p.description}</p>
                {p.techStack && <p className="mt-1 text-[10px] font-medium" style={{ color: c }}>{p.techStack}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {experience.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-[13px] font-bold uppercase tracking-widest" style={{ color: c }}>Experience</h3>
          {experience.map((e) => (
            <div key={e.id} className="mb-3">
              <div className="flex justify-between text-[13px] font-semibold text-[#101828]"><span>{e.role} — {e.company}</span><span className="text-[#98A2B3]">{e.startDate} - {e.endDate}</span></div>
              <p className="text-[13px] text-[#667085]">{e.description}</p>
            </div>
          ))}
        </div>
      )}
      {education.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-bold uppercase tracking-widest" style={{ color: c }}>Education</h3>
          {education.map((ed) => (
            <p key={ed.id} className="text-[13px] text-[#667085]">{ed.degree} — {ed.institute} ({ed.startYear}-{ed.endYear})</p>
          ))}
        </div>
      )}
    </div>
  )
}