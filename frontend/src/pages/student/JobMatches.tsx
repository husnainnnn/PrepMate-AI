import { useState, useRef } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import { Briefcase, Upload, PenLine, RefreshCw, ArrowRight, ExternalLink } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

type SkillSource = 'resume' | 'upload' | 'manual'
type Stage = 'source' | 'manual' | 'results'

interface ManualProject {
  id: string
  name: string
  techStack: string
}

interface JobMatch {
  id: string
  companyName: string
  jobTitle: string
  location: string
  matchPercentage: number
  matchedSkills: string[]
  missingSkills: string[]
  applyUrl: string
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

async function fetchJobMatches(skills: string[], authToken?: string): Promise<JobMatch[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  const res = await fetch('/api/jobs/match', {
    method: 'POST',
    headers,
    body: JSON.stringify({ skills }),
  })
  if (!res.ok) throw new Error('Failed to fetch job matches')
  const data: { matches: JobMatch[] } = await res.json()
  return data.matches.sort((a, b) => b.matchPercentage - a.matchPercentage)
}

async function fetchResumeSkills(authToken?: string): Promise<string[]> {
  try {
    const headers: Record<string, string> = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    const res = await fetch('/api/resume/latest', { headers })
    if (!res.ok) throw new Error('no saved resume')
    const data: { skills: string[] } = await res.json()
    if (!data.skills?.length) throw new Error('no skills')
    return data.skills
  } catch {
    throw new Error('No saved resume found. Try uploading or adding skills manually.')
  }
}

export default function JobMatches() {
  const { token } = useAuth()
  const [stage, setStage] = useState<Stage>('source')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [projects, setProjects] = useState<ManualProject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleMatches = async (finalSkills: string[]) => {
    setIsLoading(true)
    setError(null)
    const matches = await fetchJobMatches(finalSkills, token)
    setJobMatches(matches)
    setIsLoading(false)
    setStage('results')
  }

  const useResumeSkills = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const savedSkills = await fetchResumeSkills(token)
      setSkills(savedSkills)
      await handleMatches(savedSkills)
    } catch (e: any) {
      setError(e.message)
      setIsLoading(false)
    }
  }

  const handleResumeUpload = async (file: File) => {
    setIsLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      formData.append('resume', file)
      const res = await fetch('/api/resume/parse', { method: 'POST', body: formData, headers })
      if (!res.ok) throw new Error('parse failed')
      const data: { skills: string[] } = await res.json()
      if (!data.skills?.length) throw new Error('no skills extracted')
      setSkills(data.skills)
      await handleMatches(data.skills)
    } catch {
      setError('Could not extract skills. Try adding them manually instead.')
      setIsLoading(false)
    }
  }

  const addSkill = () => {
    const val = skillInput.trim()
    if (val && !skills.map((s) => s.toLowerCase()).includes(val.toLowerCase())) {
      setSkills([...skills, val])
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) => setSkills(skills.filter((s) => s !== skill))

  const addProject = () => setProjects([...projects, { id: makeId(), name: '', techStack: '' }])
  const updateProject = (id: string, patch: Partial<ManualProject>) => setProjects(projects.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const removeProject = (id: string) => setProjects(projects.filter((p) => p.id !== id))

  const submitManualSkills = async () => {
    const projectSkills = projects.flatMap((p) => p.techStack.split(',')).map((s) => s.trim()).filter(Boolean)
    const combined = Array.from(new Set([...skills, ...projectSkills]))
    if (combined.length === 0) { setError('Add at least one skill.'); return }
    setSkills(combined)
    await handleMatches(combined)
  }

  const startOver = () => { setStage('source'); setSkills([]); setProjects([]); setJobMatches([]); setError(null) }

  return (
    <StudentDashboardLayout>
      <div className="p-8">
        <div className="w-full">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#101828]">Job Matches</h1>
              <p className="text-[13px] text-[#667085]">See which companies best match your skills</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
          )}

          {stage === 'source' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { title: 'Use my resume', desc: 'Pull skills from your saved resume.', icon: Briefcase, label: isLoading ? 'Loading...' : 'Use saved resume', onClick: useResumeSkills, disabled: isLoading },
                { title: 'Upload resume', desc: 'Upload PDF/DOC and extract skills.', icon: Upload, label: isLoading ? 'Uploading...' : 'Upload file', onClick: () => fileInputRef.current?.click(), disabled: isLoading },
                { title: 'Add manually', desc: 'Type in your skills and projects.', icon: PenLine, label: 'Add manually', onClick: () => setStage('manual') },
              ].map((card) => (
                <div key={card.title} className="flex flex-col justify-between rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                      <card.icon className="h-5 w-5 text-[#1a6fa8]" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#101828]">{card.title}</h3>
                    <p className="mt-1 text-[13px] text-[#667085]">{card.desc}</p>
                  </div>
                  <button onClick={card.onClick} disabled={card.disabled}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 disabled:opacity-50">
                    {card.label}
                  </button>
                </div>
              ))}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f) }} />

          {stage === 'manual' && (
            <div className="w-full rounded-2xl border border-[#EAECF0] bg-white p-8 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[#101828]">Add your skills</h2>
              <div className="flex gap-2">
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                  placeholder="e.g. React"
                  className="flex-1 rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
                <button onClick={addSkill}
                  className="rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
                  Add
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[13px] font-medium text-[#1a6fa8]">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="text-[#1a6fa8]/60 hover:text-[#1a6fa8]">&times;</button>
                  </span>
                ))}
                {skills.length === 0 && <p className="text-[13px] text-[#98A2B3]">No skills added yet.</p>}
              </div>

              <h2 className="mb-3 mt-8 text-lg font-semibold text-[#101828]">Projects (optional)</h2>
              <p className="mb-3 text-[13px] text-[#667085]">Helps us infer extra relevant skills.</p>
              <div className="space-y-3">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-[#EAECF0] bg-white p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input value={p.name} onChange={(e) => updateProject(p.id, { name: e.target.value })} placeholder="Project name"
                        className="rounded-xl border border-[#E4E7EC] px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
                      <input value={p.techStack} onChange={(e) => updateProject(p.id, { techStack: e.target.value })} placeholder="Tech stack (comma separated)"
                        className="rounded-xl border border-[#E4E7EC] px-4 py-3 text-[14px] text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15" />
                    </div>
                    <button onClick={() => removeProject(p.id)} className="mt-2 text-[13px] text-red-500 hover:text-red-600">Remove</button>
                  </div>
                ))}
              </div>
              <button onClick={addProject}
                className="mt-4 w-full rounded-xl border-2 border-dashed border-[#EAECF0] py-3 text-[13px] font-medium text-[#667085] transition-colors hover:border-[#D0D5DD] hover:text-[#101828]">
                + Add project
              </button>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setStage('source')}
                  className="flex-1 rounded-xl border border-[#EAECF0] bg-white py-3 text-sm font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] hover:text-[#101828]">Back</button>
                <button onClick={submitManualSkills} disabled={isLoading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 disabled:opacity-50">
                  {isLoading ? 'Finding matches...' : 'Find matching jobs'}
                </button>
              </div>
            </div>
          )}

          {stage === 'results' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[13px] text-[#667085]">
                  Matching against <span className="font-semibold text-[#101828]">{skills.length}</span> skill{skills.length === 1 ? '' : 's'}
                </p>
                <button onClick={startOver}
                  className="flex items-center gap-1.5 rounded-xl border border-[#EAECF0] bg-white px-4 py-2 text-[13px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] hover:text-[#101828]">
                  <RefreshCw className="h-3.5 w-3.5" /> Start over
                </button>
              </div>

              {jobMatches.length === 0 ? (
                <div className="rounded-2xl border border-[#EAECF0] bg-white p-8 text-center shadow-sm">
                  <p className="text-[#667085]">No matching companies found for these skills yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobMatches.map((job) => (
                    <div key={job.id} className="rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-[#101828]">{job.jobTitle}</h3>
                          <p className="text-[13px] text-[#667085]">{job.companyName} &middot; {job.location}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold ${
                          job.matchPercentage >= 70 ? 'bg-emerald-50 text-emerald-600' :
                          job.matchPercentage >= 40 ? 'bg-amber-50 text-amber-600' :
                          'bg-[#F7F9FC] text-[#667085]'
                        }`}>
                          {job.matchPercentage}% match
                        </span>
                      </div>
                      {job.matchedSkills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {job.matchedSkills.map((s) => (
                            <span key={s} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[12px] font-medium text-emerald-600">{s}</span>
                          ))}
                        </div>
                      )}
                      {job.missingSkills.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {job.missingSkills.map((s) => (
                            <span key={s} className="rounded-full bg-[#F7F9FC] px-2.5 py-0.5 text-[12px] text-[#98A2B3]">{s}</span>
                          ))}
                        </div>
                      )}
                      <a href={job.applyUrl}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
                        View & Apply <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </StudentDashboardLayout>
  )
}
