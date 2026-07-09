import { useState, useEffect, useCallback } from 'react'
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'
import {
  Briefcase, Search, X, MapPin, Clock, DollarSign,
  ChevronDown, Eye, RefreshCw, GraduationCap, Building2,
  Sparkles, UserCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import JobDetailModal from '@/components/student/JobDetailModal'

// ─── Types ──────────────────────────────────────────────────

interface JobMatch {
  id: string
  companyName: string
  jobTitle: string
  location: string
  employmentType: string
  workplace: string
  experienceLevel: string
  salaryType: string
  salaryMin: number
  salaryMax: number
  country: string
  city: string
  createdAt: string
  matchPercentage: number
  matchedSkills: string[]
  missingSkills: string[]
  isRecommended: boolean
}

interface FiltersState {
  employmentType: string[]
  experienceLevel: string[]
  country: string
  salaryMin: string
  salaryMax: string
  postedDays: string
}

// ─── Constants ──────────────────────────────────────────────

const EMPLOYMENT_TYPES = ['internship', 'full-time', 'part-time', 'contract'] as const
const EXPERIENCE_LEVELS = [
  { value: 'fresh', label: 'Fresh' },
  { value: '0-1-year', label: 'Junior' },
  { value: '1-3-years', label: 'Mid' },
  { value: '3-plus-years', label: 'Senior' },
] as const
const POSTED_OPTIONS = [
  { value: '1', label: 'Today' },
  { value: '7', label: 'This Week' },
  { value: '30', label: 'This Month' },
] as const

// ─── Helpers ────────────────────────────────────────────────

function formatLabel(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatSalary(salaryType: string, min: number, max: number): string {
  if (salaryType === 'unpaid') return 'Unpaid'
  if (min === 0 && max === 0) return ''
  if (salaryType === 'fixed') return `PKR ${min.toLocaleString()}`
  if (salaryType === 'range') return `PKR ${min.toLocaleString()} - ${max.toLocaleString()}`
  if (salaryType === 'stipend') return `Stipend: PKR ${min.toLocaleString()}`
  return ''
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function getDegreeList(education: any[] | undefined): string {
  if (!education || education.length === 0) return ''
  return education.map((e: any) => {
    const parts = [e.degree, e.institute].filter(Boolean)
    return parts.join(' at ')
  }).join(', ')
}

// ─── Skeleton ───────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className || ''}`} />
}

// ─── Job Card ───────────────────────────────────────────────

function JobCard({ job, onView }: { job: JobMatch; onView: () => void }) {
  return (
    <div className={`group rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
      job.isRecommended ? 'border-blue-200 hover:border-blue-300' : 'border-[#EAECF0] hover:border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-semibold text-[#101828] truncate">{job.jobTitle}</h3>
            {job.isRecommended && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                <Sparkles className="h-3 w-3" /> Recommended
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-[#667085]">{job.companyName}</p>
        </div>
        {job.isRecommended && (
          <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-bold border ${
            job.matchPercentage >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
            job.matchPercentage >= 60 ? 'bg-blue-50 text-blue-600 border-blue-200' :
            job.matchPercentage >= 40 ? 'bg-amber-50 text-amber-600 border-amber-200' :
            'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {job.matchPercentage}%
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#667085]">
        {job.employmentType && (
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-[#98A2B3]" />
            {formatLabel(job.employmentType)}
          </span>
        )}
        {job.country && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-[#98A2B3]" />
            {job.country}{job.city ? `, ${job.city}` : ''}
          </span>
        )}
        {formatSalary(job.salaryType, job.salaryMin, job.salaryMax) && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-[#98A2B3]" />
            {formatSalary(job.salaryType, job.salaryMin, job.salaryMax)}
          </span>
        )}
        {job.experienceLevel && (
          <span className="flex items-center gap-1">
            <GraduationCap className="h-3.5 w-3.5 text-[#98A2B3]" />
            {formatLabel(job.experienceLevel)}
          </span>
        )}
        {job.createdAt && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-[#98A2B3]" />
            {timeAgo(job.createdAt)}
          </span>
        )}
      </div>

      {job.matchedSkills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.matchedSkills.slice(0, 5).map((s) => (
            <span key={s} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{s}</span>
          ))}
          {job.matchedSkills.length > 5 && (
            <span className="text-[11px] text-[#98A2B3]">+{job.matchedSkills.length - 5}</span>
          )}
        </div>
      )}

      {job.missingSkills.length > 0 && job.isRecommended && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {job.missingSkills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-md bg-gray-50 px-2 py-0.5 text-[11px] text-[#98A2B3]">{s}</span>
          ))}
          {job.missingSkills.length > 3 && (
            <span className="text-[11px] text-[#98A2B3]">+{job.missingSkills.length - 3} missing</span>
          )}
        </div>
      )}

      <div className="mt-4">
        <button onClick={onView}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 py-2 text-[12.5px] font-medium text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110">
          <Eye className="h-3.5 w-3.5" /> View & Apply
        </button>
      </div>
    </div>
  )
}

// ─── Filter Dropdown ────────────────────────────────────────

function FilterDropdown({ label, icon: Icon, children, isOpen, onToggle }: {
  label: string; icon: any; children: React.ReactNode; isOpen: boolean; onToggle: () => void
}) {
  return (
    <div className="relative">
      <button onClick={onToggle}
        className="flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-[12px] font-medium text-[#344054] transition-colors hover:bg-gray-50 whitespace-nowrap">
        <Icon className="h-3.5 w-3.5 text-[#98A2B3]" />
        {label}
        <ChevronDown className={`h-3.5 w-3.5 text-[#98A2B3] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-[#EAECF0] bg-white p-3 shadow-lg">
            {children}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────

export default function JobMatches() {
  const { token, user } = useAuth()

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FiltersState>({
    employmentType: [], experienceLevel: [], country: '', salaryMin: '', salaryMax: '', postedDays: '',
  })
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [countryInput, setCountryInput] = useState('')

  // Results
  const [allMatches, setAllMatches] = useState<JobMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Derive profile data from user
  const profileSkills = user?.skills || []
  const profileEducation = user?.education || []
  const profileExperience = user?.experience || ''
  const hasProfileData = profileSkills.length > 0 || profileEducation.length > 0
  const isProfileComplete = profileSkills.length > 0 && profileEducation.length > 0

  // ── Fetch jobs on mount & when user/profile changes ───
  const fetchMatches = useCallback(async (search: string, filterState: FiltersState) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const body: any = { skills: profileSkills }

      // Always send profile data for matching
      body.profileData = {
        education: profileEducation,
        experience: profileExperience,
      }

      if (search.trim()) body.search = search.trim()

      if (filterState.employmentType.length > 0 ||
          filterState.experienceLevel.length > 0 ||
          filterState.country || filterState.salaryMin ||
          filterState.salaryMax || filterState.postedDays) {
        body.filters = {}
        if (filterState.employmentType.length > 0) body.filters.employmentType = filterState.employmentType
        if (filterState.experienceLevel.length > 0) body.filters.experienceLevel = filterState.experienceLevel
        if (filterState.country) body.filters.country = filterState.country
        if (filterState.salaryMin) body.filters.salaryMin = filterState.salaryMin
        if (filterState.salaryMax) body.filters.salaryMax = filterState.salaryMax
        if (filterState.postedDays) body.filters.postedDays = filterState.postedDays
      }

      const res = await fetch('/api/jobs/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to fetch jobs')
      const data = await res.json()
      setAllMatches(data.matches || [])
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
    setProfileLoaded(true)
  }, [token, profileSkills, profileEducation, profileExperience])

  // Initial fetch when user data is available
  useEffect(() => {
    if (token && user && !profileLoaded) {
      fetchMatches(searchQuery, filters)
    }
  }, [token, user])

  // ── Filter handlers ──────────────────────────────────
  const toggleFilter = (category: keyof FiltersState, value: string) => {
    const updated = { ...filters }
    if (category === 'employmentType' || category === 'experienceLevel') {
      const arr = [...(updated[category] as string[])]
      const idx = arr.indexOf(value)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(value)
      ;(updated as any)[category] = arr
    }
    setFilters(updated)
    fetchMatches(searchQuery, updated)
  }

  const setFilterValue = (category: keyof FiltersState, value: string) => {
    const updated = { ...filters, [category]: value }
    setFilters(updated)
    fetchMatches(searchQuery, updated)
  }

  const handleSearch = () => fetchMatches(searchQuery, filters)

  const clearAllFilters = () => {
    const cleared: FiltersState = {
      employmentType: [], experienceLevel: [], country: '', salaryMin: '', salaryMax: '', postedDays: '',
    }
    setFilters(cleared)
    setSearchQuery('')
    setCountryInput('')
    fetchMatches('', cleared)
  }

  const hasActiveFilters = Object.values(filters).some(v =>
    Array.isArray(v) ? v.length > 0 : v !== ''
  ) || searchQuery.trim() !== ''

  const activeFilterCount = [
    ...filters.employmentType, ...filters.experienceLevel,
    filters.country && '1', filters.salaryMin && '1', filters.salaryMax && '1',
    filters.postedDays && '1', searchQuery.trim() && '1',
  ].filter(Boolean).length

  const recommendedCount = allMatches.filter(j => j.isRecommended).length

  return (
    <StudentDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* ── Header ────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Job Matches</h1>
            <p className="mt-1 text-[13.5px] text-[#667085]">
              {allMatches.length > 0
                ? `${allMatches.length} job${allMatches.length > 1 ? 's' : ''} available`
                : 'Find your next opportunity'}
            </p>
          </div>
        </div>

        {/* ── Profile Status Banner ──────────────────────── */}
        {!isProfileComplete && (
          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <UserCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-amber-900">
                  Complete your profile to get personalized job recommendations
                </p>
                <p className="mt-0.5 text-[12px] text-amber-700">
                  {!profileSkills.length && !profileEducation.length
                    ? 'Add your skills and education to see which jobs match you best.'
                    : !profileSkills.length
                      ? 'Add your skills so we can match you with the right jobs.'
                      : 'Add your education details to improve your match scores.'
                  }
                </p>
              </div>
              <a
                href="/student/profile"
                className="shrink-0 rounded-lg bg-amber-100 px-4 py-2 text-[12px] font-medium text-amber-800 transition-colors hover:bg-amber-200"
              >
                Update Profile
              </a>
            </div>
          </div>
        )}

        {/* ── Profile Summary ───────────────────────────── */}
        {isProfileComplete && hasProfileData && (
          <div className="rounded-xl border border-[#EAECF0] bg-gradient-to-r from-blue-50/40 to-indigo-50/40 p-4 shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <Sparkles className="h-4 w-4 text-[#1a6fa8]" />
              </div>
              <p className="text-[13px] text-[#344054]">
                <span className="font-medium text-[#101828]">Matching with your profile</span> &mdash;
                {profileSkills.length > 0 && ` ${profileSkills.length} skills`}
                {profileEducation.length > 0 && ` · ${getDegreeList(profileEducation)}`}
                {profileExperience && profileExperience !== 'fresher' && ` · ${formatLabel(profileExperience)}`}
              </p>
              {recommendedCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-[#1a6fa8]">
                  {recommendedCount} recommended
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Skills Used For Matching (read-only) ──────── */}
        {profileSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-medium text-[#667085] mr-1">Your skills:</span>
            {profileSkills.slice(0, 8).map(s => (
              <span key={s} className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-[#1a6fa8]">{s}</span>
            ))}
            {profileSkills.length > 8 && (
              <span className="text-[11px] text-[#98A2B3]">+{profileSkills.length - 8} more</span>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
        )}

        {/* ── Search Bar ─────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              placeholder="🔍 Search jobs, companies or skills..."
              className="h-11 w-full rounded-xl border border-[#D0D5DD] bg-white pl-10 pr-4 text-[13px] text-[#101828] outline-none transition-all focus:border-[#1a6fa8] focus:ring-[3px] focus:ring-[#1a6fa8]/15 placeholder:text-[#98A2B3]"
            />
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 text-[13px] font-medium text-white shadow-lg shadow-[#0b3b5c]/30 transition-all hover:brightness-110 disabled:opacity-50">
            <Search className="h-4 w-4" /> Search
          </button>
        </div>

        {/* ── Filters Row ────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown label="Employment Type" icon={Building2}
            isOpen={openDropdown === 'employmentType'}
            onToggle={() => setOpenDropdown(openDropdown === 'employmentType' ? null : 'employmentType')}>
            <div className="space-y-1.5">
              {EMPLOYMENT_TYPES.map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.employmentType.includes(t)}
                    onChange={() => toggleFilter('employmentType', t)}
                    className="h-4 w-4 rounded border-[#D0D5DD] text-[#1a6fa8] focus:ring-[#1a6fa8]" />
                  <span className="text-[12.5px] text-[#344054]">{formatLabel(t)}</span>
                </label>
              ))}
            </div>
          </FilterDropdown>

          <FilterDropdown label="Experience" icon={GraduationCap}
            isOpen={openDropdown === 'experience'}
            onToggle={() => setOpenDropdown(openDropdown === 'experience' ? null : 'experience')}>
            <div className="space-y-1.5">
              {EXPERIENCE_LEVELS.map(exp => (
                <label key={exp.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.experienceLevel.includes(exp.value)}
                    onChange={() => toggleFilter('experienceLevel', exp.value)}
                    className="h-4 w-4 rounded border-[#D0D5DD] text-[#1a6fa8] focus:ring-[#1a6fa8]" />
                  <span className="text-[12.5px] text-[#344054]">{exp.label}</span>
                </label>
              ))}
            </div>
          </FilterDropdown>

          <FilterDropdown label="Location" icon={MapPin}
            isOpen={openDropdown === 'location'}
            onToggle={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}>
            <input value={countryInput} onChange={e => setCountryInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setFilterValue('country', countryInput); setOpenDropdown(null) }}}
              placeholder="Enter country..." className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#1a6fa8] placeholder:text-[#98A2B3]" />
            <button onClick={() => { setFilterValue('country', countryInput); setOpenDropdown(null) }}
              className="mt-2 w-full rounded-lg bg-[#1a6fa8] px-3 py-1.5 text-[12px] font-medium text-white">Apply</button>
          </FilterDropdown>

          <FilterDropdown label="Salary" icon={DollarSign}
            isOpen={openDropdown === 'salary'}
            onToggle={() => setOpenDropdown(openDropdown === 'salary' ? null : 'salary')}>
            <div className="flex items-center gap-2">
              <input value={filters.salaryMin} onChange={e => setFilterValue('salaryMin', e.target.value)}
                placeholder="Min" type="number"
                className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#1a6fa8] placeholder:text-[#98A2B3]" />
              <span className="text-[#98A2B3]">-</span>
              <input value={filters.salaryMax} onChange={e => setFilterValue('salaryMax', e.target.value)}
                placeholder="Max" type="number"
                className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#1a6fa8] placeholder:text-[#98A2B3]" />
            </div>
          </FilterDropdown>

          <FilterDropdown label="Posted" icon={Clock}
            isOpen={openDropdown === 'posted'}
            onToggle={() => setOpenDropdown(openDropdown === 'posted' ? null : 'posted')}>
            <div className="space-y-1.5">
              {POSTED_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="posted" checked={filters.postedDays === opt.value}
                    onChange={() => { setFilterValue('postedDays', opt.value); setOpenDropdown(null) }}
                    className="h-4 w-4 border-[#D0D5DD] text-[#1a6fa8] focus:ring-[#1a6fa8]" />
                  <span className="text-[12.5px] text-[#344054]">{opt.label}</span>
                </label>
              ))}
              {filters.postedDays && (
                <button onClick={() => { setFilterValue('postedDays', ''); setOpenDropdown(null) }}
                  className="mt-1 w-full text-center text-[11px] text-red-500 hover:text-red-600">Clear</button>
              )}
            </div>
          </FilterDropdown>

          {hasActiveFilters && (
            <button onClick={clearAllFilters}
              className="flex items-center gap-1 rounded-lg border border-transparent px-3 py-2 text-[12px] font-medium text-[#667085] hover:text-red-500">
              <X className="h-3.5 w-3.5" /> Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* ── Active Filter Chips ─────────────────────────── */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5">
            {searchQuery.trim() && (
              <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-[#1a6fa8] border border-blue-200">
                Search: "{searchQuery}"
                <button onClick={() => { setSearchQuery(''); fetchMatches('', filters) }}><X className="h-3 w-3" /></button>
              </span>
            )}
            {filters.employmentType.map(t => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-[#1a6fa8] border border-blue-200">
                {formatLabel(t)}
                <button onClick={() => toggleFilter('employmentType', t)}><X className="h-3 w-3" /></button>
              </span>
            ))}
            {filters.experienceLevel.map(e => (
              <span key={e} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-[#1a6fa8] border border-blue-200">
                {formatLabel(e)}
                <button onClick={() => toggleFilter('experienceLevel', e)}><X className="h-3 w-3" /></button>
              </span>
            ))}
            {filters.country && (
              <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-[#1a6fa8] border border-blue-200">
                {filters.country}
                <button onClick={() => setFilterValue('country', '')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {filters.postedDays && (
              <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-[#1a6fa8] border border-blue-200">
                {POSTED_OPTIONS.find(o => o.value === filters.postedDays)?.label}
                <button onClick={() => setFilterValue('postedDays', '')}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* ── Results ─────────────────────────────────────── */}
        {loading && !profileLoaded ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border border-[#EAECF0] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-3.5 w-32" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : !profileLoaded ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-10 w-10 animate-spin text-[#D0D5DD]" strokeWidth={1.5} />
            <p className="mt-3 text-[14px] text-[#667085]">Loading your profile...</p>
          </div>
        ) : allMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-[#D0D5DD]" strokeWidth={1.5} />
            <h3 className="mt-3 text-[15px] font-semibold text-[#101828]">No jobs found</h3>
            <p className="mt-1 text-[13px] text-[#667085] max-w-md">
              {hasActiveFilters
                ? 'Try adjusting your filters or search term.'
                : 'No jobs are available right now. Check back later!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Results info bar */}
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-[#667085]">
                <span className="font-semibold text-[#101828]">{allMatches.length}</span> job{allMatches.length > 1 ? 's' : ''}
                {recommendedCount > 0 && (
                  <> &middot; <span className="text-emerald-600 font-medium">{recommendedCount} recommended</span> for you</>
                )}
              </p>
              <button onClick={() => fetchMatches(searchQuery, filters)} disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-1.5 text-[12px] font-medium text-[#667085] hover:bg-gray-50 disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {/* Recommended section */}
            {recommendedCount > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h3 className="text-[13px] font-semibold text-[#101828]">Recommended for You</h3>
                </div>
                {allMatches.filter(j => j.isRecommended).map(job => (
                  <div key={job.id} className="mb-3">
                    <JobCard job={job} onView={() => setSelectedJobId(job.id)} />
                  </div>
                ))}
              </div>
            )}

            {/* All jobs section */}
            <div>
              {recommendedCount > 0 && (
                <div className="mb-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#98A2B3]" />
                  <h3 className="text-[13px] font-semibold text-[#667085]">All Jobs</h3>
                </div>
              )}
              {allMatches.filter(j => !j.isRecommended).length === 0 && recommendedCount > 0 ? (
                <p className="text-[12px] text-[#98A2B3] py-4 text-center">All jobs shown above as recommendations.</p>
              ) : (
                allMatches.filter(j => !j.isRecommended).map(job => (
                  <div key={job.id} className="mb-3">
                    <JobCard job={job} onView={() => setSelectedJobId(job.id)} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Job Detail Modal ──────────────────────────────── */}
        {selectedJobId && (
          <JobDetailModal
            jobId={selectedJobId}
            onClose={() => setSelectedJobId(null)}
            onApplied={() => { setSelectedJobId(null); fetchMatches(searchQuery, filters) }}
          />
        )}
      </div>
    </StudentDashboardLayout>
  )
}
