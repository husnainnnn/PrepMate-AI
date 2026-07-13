import { useState, useEffect, useMemo } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import { useAuth } from '@/context/AuthContext'
import {
  Search,
  ExternalLink,
  BookOpen,
  Filter,
  Sparkles,
  Library,
  GraduationCap,
  Award,
  ChevronDown,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CURATED_RESOURCES,
  RESOURCE_CATEGORIES,
  RESOURCE_TYPE_META,
  type Resource,
  type FieldSlug,
  type ResourceType,
} from '@/data/resources'

// ─── AI Resource Type ─────────────────────────────────────

interface AIResource {
  id: string
  title: string
  url: string
  description: string
  type: ResourceType
  reason: string
  difficulty: string
}

interface ResourcesResponse {
  resources: AIResource[]
  cached: boolean
  generatedAt?: string
  field: string
  skills: string[]
}

// ─── Helpers ──────────────────────────────────────────────

const DIFFICULTY_META: Record<string, { label: string; color: string }> = {
  beginner:     { label: 'Beginner',     color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  intermediate: { label: 'Intermediate', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  advanced:     { label: 'Advanced',     color: 'bg-red-50 text-red-600 border-red-100' },
}

const TYPE_ICONS: Record<string, string> = {
  video: '📺', article: '📄', course: '🎓', practice: '💻', docs: '📚', tool: '🔧',
}

const TYPE_COLORS: Record<string, string> = {
  video: 'bg-red-50 text-red-600 border-red-100',
  article: 'bg-blue-50 text-blue-600 border-blue-100',
  course: 'bg-purple-50 text-purple-600 border-purple-100',
  practice: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  docs: 'bg-amber-50 text-amber-600 border-amber-100',
  tool: 'bg-cyan-50 text-cyan-600 border-cyan-100',
}

function ResourceCard({ resource }: { resource: Resource }) {
  const meta = RESOURCE_TYPE_META[resource.type]
  const diff = DIFFICULTY_META[resource.difficulty] || DIFFICULTY_META.beginner

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-[#EAECF0] bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[#D0D5DD] hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.color}`}>
          {meta.icon} {meta.label}
        </Badge>
        {resource.isFree && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
            <Award className="h-3 w-3" /> Free
          </span>
        )}
      </div>
      <h4 className="text-[14px] font-semibold text-[#101828] group-hover:text-[#1a6fa8] transition-colors">
        {resource.title}
      </h4>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#667085] line-clamp-2">
        {resource.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        {resource.skills.slice(0, 3).map(skill => (
          <span key={skill} className="rounded-md bg-[#F7F9FC] px-1.5 py-0.5 text-[10.5px] font-medium text-[#667085]">
            {skill}
          </span>
        ))}
        {resource.skills.length > 3 && (
          <span className="text-[10.5px] text-[#98A2B3]">+{resource.skills.length - 3}</span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#EAECF0] pt-3">
        <Badge variant="outline" className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${diff.color}`}>
          {diff.label}
        </Badge>
        <span className="flex items-center gap-1 text-[12px] font-medium text-[#1a6fa8] opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </a>
  )
}

function AIResourceCard({ resource }: { resource: AIResource }) {
  const typeColor = TYPE_COLORS[resource.type] || 'bg-gray-50 text-gray-600 border-gray-100'
  const typeIcon = TYPE_ICONS[resource.type] || '📄'
  const typeLabel = resource.type.charAt(0).toUpperCase() + resource.type.slice(1)
  const diff = DIFFICULTY_META[resource.difficulty] || DIFFICULTY_META.beginner

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-[#EAECF0] bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[#1a6fa8]/30 hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${typeColor}`}>
          {typeIcon} {typeLabel}
        </Badge>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
          <Award className="mr-0.5 inline h-3 w-3" />Free
        </span>
      </div>
      <h4 className="text-[14px] font-semibold text-[#101828] group-hover:text-[#1a6fa8] transition-colors">
        {resource.title}
      </h4>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#667085] line-clamp-2">
        {resource.description}
      </p>
      {resource.reason && (
        <div className="mt-3 rounded-lg bg-blue-50/50 px-3 py-2 text-[11.5px] text-[#344054] leading-relaxed">
          <span className="font-medium text-[#1a6fa8]">Why this?</span> {resource.reason}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-[#EAECF0] pt-3">
        <Badge variant="outline" className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${diff.color}`}>
          {diff.label}
        </Badge>
        <span className="flex items-center gap-1 text-[12px] font-medium text-[#1a6fa8] opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </a>
  )
}

// ─── Main Page ────────────────────────────────────────────

export default function ResourcesPage() {
  const { token, user } = useAuth()
  const [search, setSearch] = useState('')
  const [activeField, setActiveField] = useState<FieldSlug | 'all'>('all')
  const [activeType, setActiveType] = useState<ResourceType | 'all'>('all')

  // AI Resources state
  const [aiResources, setAiResources] = useState<AIResource[]>([])
  const [aiLoading, setAiLoading] = useState(true)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiCached, setAiCached] = useState(false)
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null)
  const [aiError, setAiError] = useState('')
  const [showAiSection, setShowAiSection] = useState(true)

  const profileData = user ? { field: user.field, skills: user.skills } : null
  const hasProfile = profileData?.field || (profileData?.skills && profileData.skills.length > 0)

  // ── Fetch cached AI resources on mount ────────────────
  useEffect(() => {
    if (!token) return
    fetchCachedResources()
  }, [token])

  const fetchCachedResources = async () => {
    try {
      const res = await fetch('/api/resources', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data: ResourcesResponse = await res.json()
        setAiResources(data.resources || [])
        setAiCached(data.cached)
        setAiGeneratedAt(data.generatedAt || null)

        // Auto-generate if no cached resources and profile exists
        if (!data.cached && data.resources.length === 0 && hasProfile) {
          generateResources()
          return
        }
      }
    } catch { /* offline */ }
    setAiLoading(false)
  }

  const generateResources = async () => {
    if (!token) return
    setAiGenerating(true)
    setAiError('')
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate resources')
      }
      const data: ResourcesResponse = await res.json()
      setAiResources(data.resources || [])
      setAiCached(false)
      setAiGeneratedAt(data.generatedAt || null)
    } catch (err: any) {
      setAiError(err.message || 'Something went wrong')
    }
    setAiGenerating(false)
    setAiLoading(false)
  }

  // ── Filtered Curated Resources ─────────────────────────
  const filteredResources = useMemo(() => {
    let list = CURATED_RESOURCES
    if (activeField !== 'all') {
      list = list.filter(r => r.fields.includes(activeField))
    }
    if (activeType !== 'all') {
      list = list.filter(r => r.type === activeType)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.skills.some(s => s.toLowerCase().includes(q))
      )
    }
    return list
  }, [activeField, activeType, search])

  // ── Profile-based curated recommendations ─────────────
  const recommendedResources = useMemo(() => {
    if (!profileData) return []

    const fieldSlugMap: Record<string, FieldSlug> = {
      'web development': 'web-dev',
      'web': 'web-dev',
      'frontend': 'web-dev',
      'backend': 'web-dev',
      'full stack': 'web-dev',
      'mobile': 'mobile-dev',
      'mobile development': 'mobile-dev',
      'ai': 'ai-ml',
      'artificial intelligence': 'ai-ml',
      'machine learning': 'ai-ml',
      'data science': 'data-science',
      'data': 'data-science',
      'devops': 'devops',
      'cloud': 'devops',
      'cybersecurity': 'cybersecurity',
      'security': 'cybersecurity',
      'ui/ux': 'ui-ux',
      'design': 'ui-ux',
      'software engineering': 'software-engineering',
      'software': 'software-engineering',
    }

    const studentField = (profileData.field || '').toLowerCase().trim()
    const studentSkills = (profileData.skills || []).map(s => s.toLowerCase().trim()).filter(s => s.length >= 2)

    const matchedSlugs: FieldSlug[] = []
    for (const [key, slug] of Object.entries(fieldSlugMap)) {
      if (studentField.includes(key) || studentField === key) {
        matchedSlugs.push(slug)
      }
    }

    return CURATED_RESOURCES.map(r => {
      let score = 0
      if (matchedSlugs.some(slug => r.fields.includes(slug))) score += 3
      const matchedSkills = r.skills.filter(s =>
        s.length >= 3 && studentSkills.some(ss =>
          ss.length >= 3 && (s.toLowerCase().includes(ss) || ss.includes(s.toLowerCase()))
        )
      )
      score += matchedSkills.length * 2
      return { resource: r, score }
    })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.resource)
  }, [profileData])

  const hasCuratedRecommendations = recommendedResources.length > 0

  return (
    <StudentDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">

        {/* ── Header ───────────────────────────────────── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">
              Learning Resources
            </h1>
            <p className="mt-1 text-[13.5px] text-[#667085]">
              AI-powered recommendations personalized for your field and skills
            </p>
          </div>
          {hasProfile && (
            <Button
              variant="ghost"
              onClick={generateResources}
              disabled={aiGenerating}
              className="inline-flex h-11 items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-6 text-[13.5px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/25 transition-all duration-200 hover:shadow-xl hover:brightness-110 disabled:opacity-60"
            >
              {aiGenerating ? (
                <><Loader2 className="h-[18px] w-[18px] animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="h-[18px] w-[18px]" /> {aiResources.length > 0 ? 'Regenerate' : 'Generate Resources'}</>
              )}
            </Button>
          )}
        </div>

        {/* ── AI-Powered Resources Section ─────────────── */}
        {aiLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#EAECF0] bg-white py-16 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#1a6fa8]" />
            <p className="mt-4 text-[14px] font-medium text-[#667085]">Loading your personalized resources...</p>
          </div>
        ) : aiGenerating ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#EAECF0] bg-gradient-to-br from-[#0b3b5c]/5 to-[#1a6fa8]/5 py-16 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0b3b5c]/10 to-[#1a6fa8]/10">
              <Loader2 className="h-8 w-8 animate-spin text-[#1a6fa8]" />
            </div>
            <p className="mt-5 text-[15px] font-semibold text-[#101828]">Finding the best resources for you...</p>
            <p className="mt-1.5 text-[13px] text-[#667085]">AI is analyzing your field and skills to recommend personalized resources</p>
            <div className="mt-6 flex gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#1a6fa8]" style={{ animationDelay: '0s' }} />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#1a6fa8]" style={{ animationDelay: '0.3s' }} />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#1a6fa8]" style={{ animationDelay: '0.6s' }} />
            </div>
          </div>
        ) : aiResources.length > 0 && showAiSection ? (
          <Card className="rounded-xl border-[#EAECF0] bg-gradient-to-br from-[#0b3b5c]/5 to-[#1a6fa8]/5 shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/20">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#101828]">
                      AI-Powered Recommendations
                    </h3>
                    <p className="text-[12px] text-[#667085]">
                      Based on your profile — {profileData?.field || 'Your Field'}
                      {profileData?.skills && profileData.skills.length > 0 && (
                        <> &middot; {profileData.skills.slice(0, 3).join(', ')}{profileData.skills.length > 3 ? '...' : ''}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {aiCached && aiGeneratedAt && (
                    <span className="hidden sm:inline text-[11px] text-[#667085]">
                      Cached: {new Date(aiGeneratedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <button
                    onClick={() => setShowAiSection(false)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#667085] hover:bg-white/60 transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    Hide
                  </button>
                </div>
              </div>

              {aiCached && aiGeneratedAt && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[12px] text-blue-700">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  Resources from {new Date(aiGeneratedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })} &mdash; updates automatically when you change your profile
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {aiResources.map(r => (
                  <AIResourceCard key={r.id} resource={r} />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : aiResources.length > 0 && !showAiSection ? (
          <button
            onClick={() => setShowAiSection(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D0D5DD] bg-white py-3 text-[13px] font-medium text-[#667085] transition-all hover:border-[#1a6fa8]/30 hover:text-[#1a6fa8] hover:bg-[#F7F9FC]"
          >
            <Sparkles className="h-4 w-4" />
            Show AI-powered resources ({aiResources.length})
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        ) : aiError ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div>
              <p className="text-[13px] font-medium text-red-800">Couldn't generate resources</p>
              <p className="text-[12.5px] text-red-600">{aiError}</p>
              <button onClick={generateResources} className="mt-2 text-[12px] font-medium text-red-700 hover:underline">
                Try again
              </button>
            </div>
          </div>
        ) : !hasProfile ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/50 py-12 shadow-sm text-center">
            <Sparkles className="h-10 w-10 text-amber-400" />
            <p className="mt-4 text-[15px] font-semibold text-[#101828]">Set up your profile first</p>
            <p className="mt-1 text-[13px] text-[#667085] max-w-sm">
              Add your <strong>field</strong> and <strong>skills</strong> in your profile to get AI-powered resource recommendations
            </p>
            <a
              href="/student/profile"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110"
            >
              Go to Profile
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#EAECF0] bg-white py-12 shadow-sm text-center">
            <Sparkles className="h-10 w-10 text-[#D0D5DD]" />
            <p className="mt-4 text-[15px] font-semibold text-[#101828]">Generate Your Resources</p>
            <p className="mt-1 text-[13px] text-[#667085] max-w-sm">
              Let AI find the best learning resources for your field and skills
            </p>
            <Button
              variant="ghost"
              onClick={generateResources}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-6 text-[13.5px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/25 transition-all hover:brightness-110"
            >
              <Sparkles className="h-[18px] w-[18px]" />
              Generate with AI
            </Button>
          </div>
        )}

        {/* ── Curated Library Section ──────────────────── */}
        <div className="pt-4">
          <div className="mb-4 flex items-center gap-2">
            <Library className="h-5 w-5 text-[#667085]" />
            <h2 className="text-[17px] font-semibold text-[#101828]">Resource Library</h2>
            <span className="rounded-full bg-[#F7F9FC] px-2 py-0.5 text-[11px] font-medium text-[#667085]">
              {CURATED_RESOURCES.length} resources
            </span>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
              <input
                type="text"
                placeholder="Search resources by title, skill, or keyword..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#EAECF0] bg-white pl-10 pr-4 text-[13px] text-[#101828] placeholder:text-[#98A2B3] outline-none focus:border-[#1a6fa8] focus:ring-2 focus:ring-[#1a6fa8]/10 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] text-[12px]">
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveField('all')}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all ${
                  activeField === 'all'
                    ? 'bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] text-white shadow-md shadow-[#0b3b5c]/20'
                    : 'border border-[#EAECF0] bg-white text-[#667085] hover:bg-[#F7F9FC] hover:text-[#101828]'
                }`}>
                <Library className="h-3.5 w-3.5" /> All
              </button>
              {RESOURCE_CATEGORIES.map(cat => (
                <button key={cat.slug} onClick={() => setActiveField(cat.slug)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all ${
                    activeField === cat.slug
                      ? 'bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] text-white shadow-md shadow-[#0b3b5c]/20'
                      : 'border border-[#EAECF0] bg-white text-[#667085] hover:bg-[#F7F9FC] hover:text-[#101828]'
                  }`}>
                  <span>{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setActiveType('all')}
                className={`rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-all ${
                  activeType === 'all' ? 'bg-[#101828] text-white' : 'text-[#667085] hover:bg-[#F7F9FC]'
                }`}>All Types</button>
              {(Object.entries(RESOURCE_TYPE_META) as [ResourceType, typeof RESOURCE_TYPE_META[ResourceType]][]).map(([type, meta]) => (
                <button key={type} onClick={() => setActiveType(type)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-all ${
                    activeType === type ? 'bg-[#101828] text-white' : 'text-[#667085] hover:bg-[#F7F9FC]'
                  }`}>
                  <span>{meta.icon}</span> {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] text-[#667085]">
              <strong className="text-[#101828]">{filteredResources.length}</strong> resource{filteredResources.length !== 1 ? 's' : ''} found
              {activeField !== 'all' && <> in <strong>{RESOURCE_CATEGORIES.find(c => c.slug === activeField)?.label}</strong></>}
              {search.trim() && <> for &ldquo;<strong>{search}</strong>&rdquo;</>}
            </p>
            {(activeField !== 'all' || activeType !== 'all' || search.trim()) && (
              <button onClick={() => { setActiveField('all'); setActiveType('all'); setSearch('') }}
                className="text-[12.5px] font-medium text-[#1a6fa8] hover:underline">Clear all filters</button>
            )}
          </div>

          {filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#EAECF0] bg-white py-16 shadow-sm">
              <BookOpen className="h-8 w-8 text-[#D0D5DD]" />
              <p className="mt-4 text-[15px] font-semibold text-[#101828]">No resources found</p>
              <p className="mt-1 text-[13px] text-[#667085]">
                {search.trim() ? `No results for "${search}". Try a different search term.` : 'No resources in this category yet.'}
              </p>
              <button onClick={() => { setActiveField('all'); setActiveType('all'); setSearch('') }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
                <Filter className="h-4 w-4" /> Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map(r => <ResourceCard key={r.id} resource={r} />)}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 text-center">
          <GraduationCap className="h-4 w-4 text-[#98A2B3]" />
          <p className="text-[12px] text-[#98A2B3]">
            AI resources generated by Groq. Curated library includes free & open resources. Resources update automatically when you change your profile.
          </p>
        </div>
      </div>
    </StudentDashboardLayout>
  )
}
