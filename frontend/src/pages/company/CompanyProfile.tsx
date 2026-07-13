import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react'
import { CompanyDashboardLayout } from '@/components/company/CompanyDashboardLayout'
import { useAuth } from '@/context/AuthContext'
import {
  Building2,

  Globe,
  UserCircle,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Link,
  AtSign,
  ExternalLink,
  HeartHandshake,
  Users,
  Sparkles,
  Check,
  Loader2,
  Pencil,
  X,
  Plus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// ─── Industry options ──────────────────────────────────────
const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce',
  'Manufacturing', 'Media & Entertainment', 'Real Estate', 'Consulting',
  'Telecommunications', 'Transportation', 'Energy', 'Agriculture',
  'Non-Profit', 'Government', 'Other',
]

// ─── Employee count options ────────────────────────────────
const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-1000', '1000+']

export default function CompanyProfilePage() {
  const { user, token, refreshUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    companyName: '',
    email: '',
    website: '',
    description: '',
    logo: '',
    ceoName: '',
    ceoMessage: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    industry: '',
    employeeCount: '',
    foundedYear: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    culture: '',
  })
  const [benefits, setBenefits] = useState<string[]>([])
  const [newBenefit, setNewBenefit] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoPreview, setLogoPreview] = useState('')

  // Load user data into form
  useEffect(() => {
    if (user) {
      setForm({
        companyName: user.companyName || '',
        email: user.email || '',
        website: user.website || '',
        description: user.description || '',
        logo: user.logo || '',
        ceoName: user.ceoName || '',
        ceoMessage: user.ceoMessage || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        industry: user.industry || '',
        employeeCount: user.employeeCount || '',
        foundedYear: user.foundedYear || '',
        linkedin: user.linkedin || '',
        twitter: user.twitter || '',
        facebook: user.facebook || '',
        culture: user.culture || '',
      })
      setBenefits(user.benefits || [])
      setLogoPreview(user.logo || '')
    }
  }, [user])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => { setLogoPreview(ev.target?.result as string) }
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setForm(prev => ({ ...prev, logo: data.url }))
      }
    } catch { /* upload failed */ }
    setUploading(false)
  }

  const addBenefit = () => {
    const trimmed = newBenefit.trim()
    if (trimmed && !benefits.includes(trimmed)) {
      setBenefits(prev => [...prev, trimmed])
    }
    setNewBenefit('')
  }

  const removeBenefit = (index: number) => {
    setBenefits(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, benefits }),
      })
      if (res.ok) {
        setSaved(true)
        await refreshUser()
        setTimeout(() => setSaved(false), 3000)
      }
    } catch { /* save failed */ }
    setSaving(false)
  }

  // ── Input field helper ─────────────────────────────────
  const inputCls = 'w-full rounded-lg border border-[#EAECF0] bg-white px-3.5 py-2.5 text-[13.5px] text-[#101828] placeholder:text-[#98A2B3] outline-none transition-all focus:border-[#1a6fa8] focus:ring-2 focus:ring-[#1a6fa8]/20'
  const labelCls = 'block text-[13px] font-medium text-[#344054] mb-1.5'
  const sectionTitleCls = 'flex items-center gap-2 text-[15px] font-semibold text-[#101828]'

  return (
    <CompanyDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8 pb-16">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#101828]">Company Profile</h1>
              <p className="text-[13px] text-[#667085]">Manage your company information and branding</p>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-600 animate-fade-rise">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
          {/* ── Left column: Logo + Quick Info ────────────── */}
          <div className="space-y-5 lg:col-span-1">
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  {/* Logo upload */}
                  <div className="group relative">
                    <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-[#D0D5DD] bg-[#F7F9FC] overflow-hidden transition-all group-hover:border-[#1a6fa8]">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Company logo" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-10 w-10 text-[#98A2B3]" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#EAECF0] shadow-sm text-[#667085] hover:text-[#1a6fa8] hover:border-[#1a6fa8] transition-all"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </div>

                  <h2 className="mt-4 text-[16px] font-semibold text-[#101828]">{form.companyName || 'Company Name'}</h2>
                  <p className="text-[12.5px] text-[#667085]">{form.industry || 'Industry'}</p>
                  <p className="mt-1 text-[12px] text-[#98A2B3]">{form.email}</p>

                  {form.website && (
                    <a href={form.website} target="_blank" rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1.5 rounded-full bg-[#F7F9FC] px-3.5 py-1.5 text-[12px] font-medium text-[#1a6fa8] hover:bg-[#EEF4FF] transition-colors">
                      <Globe className="h-3.5 w-3.5" />
                      {form.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick stats */}
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider">Quick Info</h3>
                <div className="mt-3 space-y-2.5">
                  {form.employeeCount && (
                    <div className="flex items-center gap-2.5 text-[13px] text-[#344054]">
                      <Users className="h-4 w-4 text-[#98A2B3]" />
                      {form.employeeCount} employees
                    </div>
                  )}
                  {form.foundedYear && (
                    <div className="flex items-center gap-2.5 text-[13px] text-[#344054]">
                      <Calendar className="h-4 w-4 text-[#98A2B3]" />
                      Founded {form.foundedYear}
                    </div>
                  )}
                  {form.city && form.country && (
                    <div className="flex items-center gap-2.5 text-[13px] text-[#344054]">
                      <MapPin className="h-4 w-4 text-[#98A2B3]" />
                      {form.city}, {form.country}
                    </div>
                  )}
                  {!form.employeeCount && !form.foundedYear && !form.city && (
                    <p className="text-[12.5px] text-[#98A2B3] italic">Add details from the form</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right column: All form fields ────────────── */}
          <div className="space-y-5 lg:col-span-2">
            {/* ── Basic Information ───────────────────────── */}
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <h2 className={sectionTitleCls}>Basic Information</h2>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Company Name *</label>
                    <input name="companyName" value={form.companyName} onChange={handleChange}
                      className={inputCls} placeholder="Acme Corp" />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange}
                      className={inputCls} placeholder="info@acme.com" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Website</label>
                    <input name="website" value={form.website} onChange={handleChange}
                      className={inputCls} placeholder="https://acme.com" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Description</label>
                    <textarea name="description" value={form.description} onChange={handleChange}
                      rows={3} className={inputCls + ' resize-none'} placeholder="Tell candidates about your company..." />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Leadership ─────────────────────────────── */}
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                    <UserCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <h2 className={sectionTitleCls}>Leadership</h2>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>CEO / Founder Name</label>
                    <input name="ceoName" value={form.ceoName} onChange={handleChange}
                      className={inputCls} placeholder="John Doe" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>CEO Message</label>
                    <textarea name="ceoMessage" value={form.ceoMessage} onChange={handleChange}
                      rows={3} className={inputCls + ' resize-none'} placeholder="A message from the CEO to applicants..." />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Contact Information ────────────────────── */}
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <h2 className={sectionTitleCls}>Contact Information</h2>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input name="phone" value={form.phone} onChange={handleChange}
                      className={inputCls} placeholder="+1 (555) 123-4567" />
                  </div>
                  <div>
                    <label className={labelCls}>City</label>
                    <input name="city" value={form.city} onChange={handleChange}
                      className={inputCls} placeholder="San Francisco" />
                  </div>
                  <div>
                    <label className={labelCls}>Country</label>
                    <input name="country" value={form.country} onChange={handleChange}
                      className={inputCls} placeholder="United States" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Address</label>
                    <input name="address" value={form.address} onChange={handleChange}
                      className={inputCls} placeholder="123 Main St, Suite 100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Company Details ────────────────────────── */}
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                    <Briefcase className="h-4 w-4 text-amber-600" />
                  </div>
                  <h2 className={sectionTitleCls}>Company Details</h2>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Industry</label>
                    <select name="industry" value={form.industry} onChange={handleChange}
                      className={inputCls}>
                      <option value="">Select industry</option>
                      {INDUSTRIES.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Employee Count</label>
                    <select name="employeeCount" value={form.employeeCount} onChange={handleChange}
                      className={inputCls}>
                      <option value="">Select range</option>
                      {EMPLOYEE_RANGES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Founded Year</label>
                    <input name="foundedYear" value={form.foundedYear} onChange={handleChange}
                      className={inputCls} placeholder="2020" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Social Links ───────────────────────────── */}
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
                    <Globe className="h-4 w-4 text-sky-600" />
                  </div>
                  <h2 className={sectionTitleCls}>Social Links</h2>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>
                      <Link className="h-3.5 w-3.5 inline -mt-0.5 mr-1 text-[#0A66C2]" /> LinkedIn
                    </label>
                    <input name="linkedin" value={form.linkedin} onChange={handleChange}
                      className={inputCls} placeholder="https://linkedin.com/company/acme" />
                  </div>
                  <div>
                    <label className={labelCls}>
                      <AtSign className="h-3.5 w-3.5 inline -mt-0.5 mr-1 text-[#1DA1F2]" /> Twitter / X
                    </label>
                    <input name="twitter" value={form.twitter} onChange={handleChange}
                      className={inputCls} placeholder="https://twitter.com/acme" />
                  </div>
                  <div>
                    <label className={labelCls}>
                      <ExternalLink className="h-3.5 w-3.5 inline -mt-0.5 mr-1 text-[#1877F2]" /> Facebook
                    </label>
                    <input name="facebook" value={form.facebook} onChange={handleChange}
                      className={inputCls} placeholder="https://facebook.com/acme" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Benefits & Culture ─────────────────────── */}
            <Card className="rounded-xl border-[#EAECF0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                    <HeartHandshake className="h-4 w-4 text-rose-600" />
                  </div>
                  <h2 className={sectionTitleCls}>Benefits & Culture</h2>
                </div>

                <div className="mt-5">
                  <label className={labelCls}>Benefits & Perks</label>
                  <div className="flex flex-wrap gap-2 mb-2.5">
                    {benefits.map((b, i) => (
                      <span key={i}
                        className="flex items-center gap-1 rounded-full bg-[#EEF4FF] px-3 py-1 text-[12px] font-medium text-[#1a6fa8]">
                        <Sparkles className="h-3 w-3" />
                        {b}
                        <button type="button" onClick={() => removeBenefit(i)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-[#D6E4FF] transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newBenefit} onChange={(e) => setNewBenefit(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBenefit(); } }}
                      className={inputCls + ' flex-1'} placeholder="e.g. Health Insurance, Remote Work, Stock Options..." />
                    <button type="button" onClick={addBenefit}
                      className="flex items-center gap-1.5 rounded-lg border border-[#EAECF0] px-3.5 py-2.5 text-[13px] font-medium text-[#1a6fa8] hover:bg-[#F7F9FC] transition-colors">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <label className={labelCls}>Company Culture</label>
                  <textarea name="culture" value={form.culture} onChange={handleChange}
                    rows={3} className={inputCls + ' resize-none'} placeholder="Describe your company culture, values, and work environment..." />
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </CompanyDashboardLayout>
  )
}
