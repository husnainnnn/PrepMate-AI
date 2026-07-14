import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import {
  Save,
  Image,
  Loader2,
  Smartphone,
  Code2,
  Upload,
  Trash2,
  CheckCircle2,
  Plus,
  User,
  GripVertical,
} from 'lucide-react'

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

export default function AdminAbout() {
  const { token } = useAuth()
  const [about, setAbout] = useState<AboutData>({
    prepMateImage: '',
    prepMateText: '',
    developers: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch('/api/about', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.about) {
          setAbout({
            prepMateImage: data.about.prepMateImage || '',
            prepMateText: data.about.prepMateText || '',
            developers: data.about.developers || [],
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [token])

  // ─── PrepMate image handlers ──────────────────────────
  const handlePrepMateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setUploading('prepMateImage')
    const formData = new FormData()
    formData.append('photo', file)
    try {
      const res = await fetch('/api/upload/profile-picture', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
      const data = await res.json()
      if (data.url) setAbout(prev => ({ ...prev, prepMateImage: data.url }))
    } catch (err) { console.error('Upload failed:', err) }
    finally { setUploading(null) }
  }

  // ─── Developer handlers ───────────────────────────────
  const addDeveloper = () => {
    setAbout(prev => ({
      ...prev,
      developers: [...prev.developers, { name: '', image: '', text: '' }],
    }))
  }

  const removeDeveloper = (index: number) => {
    setAbout(prev => ({
      ...prev,
      developers: prev.developers.filter((_, i) => i !== index),
    }))
  }

  const updateDeveloper = (index: number, field: keyof Developer, value: string) => {
    setAbout(prev => {
      const devs = [...prev.developers]
      devs[index] = { ...devs[index], [field]: value }
      return { ...prev, developers: devs }
    })
  }

  const handleDevImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    const key = `dev-${index}`
    setUploading(key)
    const formData = new FormData()
    formData.append('photo', file)
    try {
      const res = await fetch('/api/upload/profile-picture', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
      const data = await res.json()
      if (data.url) updateDeveloper(index, 'image', data.url)
    } catch (err) { console.error('Upload failed:', err) }
    finally { setUploading(null) }
  }

  const moveDeveloper = (index: number, direction: 'up' | 'down') => {
    setAbout(prev => {
      const devs = [...prev.developers]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= devs.length) return prev
      ;[devs[index], devs[target]] = [devs[target], devs[index]]
      return { ...prev, developers: devs }
    })
  }

  // ─── Save ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch('/api/about/admin/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(about),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) { console.error('Save failed:', err) }
    finally { setSaving(false) }
  }

  const inputCls =
    'w-full rounded-lg border border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-4 py-3 text-[14px] text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1a6fa8]/30 transition-colors resize-none'

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a6fa8]" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-8 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[#101828] dark:text-[#F1F5F9]">About</h1>
          <p className="text-[13px] text-[#667085] dark:text-[#94A3B8]">Manage About PrepMate & Developer Team</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2.5 text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4 text-green-300" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-8 p-8">
        {/* ─── About PrepMate ──────────────────────────────── */}
        <div className="rounded-xl border border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[#EAECF0] dark:border-[#334155] px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1a6fa8]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">About PrepMate</h2>
              <p className="text-[12px] text-[#667085] dark:text-[#94A3B8]">Information displayed on the About Us page</p>
            </div>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#CBD5E1]">PrepMate Image</label>
              <ImageUploader
                imageUrl={about.prepMateImage}
                uploading={uploading === 'prepMateImage'}
                onUpload={handlePrepMateUpload}
                onRemove={() => setAbout(prev => ({ ...prev, prepMateImage: '' }))}
                label="PrepMate"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#CBD5E1]">PrepMate Description</label>
              <textarea
                rows={6}
                value={about.prepMateText}
                onChange={e => setAbout(prev => ({ ...prev, prepMateText: e.target.value }))}
                placeholder="Write about PrepMate — the platform's mission, vision, and what it offers..."
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ─── Developer Team ──────────────────────────────── */}
        <div className="rounded-xl border border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#EAECF0] dark:border-[#334155] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1a6fa8]">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Developer Team</h2>
                <p className="text-[12px] text-[#667085] dark:text-[#94A3B8]">Add your team members — each with a photo, name, and description</p>
              </div>
            </div>
            <button
              onClick={addDeveloper}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 py-2 text-[12px] font-medium text-white hover:brightness-110 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Developer
            </button>
          </div>

          <div className="space-y-5 px-6 py-5">
            {about.developers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#0F172A] py-12">
                <User className="h-10 w-10 text-[#98A2B3]" />
                <p className="mt-2 text-[13px] font-medium text-[#667085] dark:text-[#94A3B8]">No developers added yet</p>
                <p className="text-[11px] text-[#98A2B3]">Click "Add Developer" to start building your team</p>
              </div>
            ) : (
              about.developers.map((dev, index) => (
                <div
                  key={index}
                  className="group relative rounded-lg border border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#0F172A] p-4 transition-shadow hover:shadow-sm"
                >
                  {/* Move up/down + Remove buttons */}
                  <div className="absolute -right-2 -top-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col rounded-lg border border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden">
                      <button
                        onClick={() => moveDeveloper(index, 'up')}
                        disabled={index === 0}
                        className="px-2 py-0.5 text-[11px] text-[#667085] hover:bg-[#F7F9FC] dark:hover:bg-[#334155] disabled:opacity-30 transition-colors"
                        title="Move up"
                      >▲</button>
                      <div className="h-px bg-[#EAECF0] dark:bg-[#334155]" />
                      <button
                        onClick={() => moveDeveloper(index, 'down')}
                        disabled={index === about.developers.length - 1}
                        className="px-2 py-0.5 text-[11px] text-[#667085] hover:bg-[#F7F9FC] dark:hover:bg-[#334155] disabled:opacity-30 transition-colors"
                        title="Move down"
                      >▼</button>
                    </div>
                    <button
                      onClick={() => removeDeveloper(index)}
                      className="flex h-[43px] w-[30px] items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors"
                      title="Remove developer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Name */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#667085] dark:text-[#94A3B8] uppercase tracking-wider">Name</label>
                      <input
                        type="text"
                        value={dev.name}
                        onChange={e => updateDeveloper(index, 'name', e.target.value)}
                        placeholder="e.g. John Doe"
                        className={inputCls + ' h-10'}
                      />
                    </div>
                    {/* Image */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#667085] dark:text-[#94A3B8] uppercase tracking-wider">Photo</label>
                      <DevImageUploader
                        imageUrl={dev.image}
                        uploading={uploading === `dev-${index}`}
                        onUpload={(e) => handleDevImageUpload(e, index)}
                        onRemove={() => updateDeveloper(index, 'image', '')}
                      />
                    </div>
                    {/* Description */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#667085] dark:text-[#94A3B8] uppercase tracking-wider">Description</label>
                      <textarea
                        rows={2}
                        value={dev.text}
                        onChange={e => updateDeveloper(index, 'text', e.target.value)}
                        placeholder="Role, background, or fun fact..."
                        className={inputCls + ' min-h-[40px]'}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// ─── Image Uploader (PrepMate) ────────────────────────
function ImageUploader({
  imageUrl,
  uploading,
  onUpload,
  onRemove,
  label,
}: {
  imageUrl: string
  uploading: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
  label: string
}) {
  return (
    <div>
      {imageUrl ? (
        <div className="relative group inline-block rounded-lg overflow-hidden border border-[#EAECF0] dark:border-[#334155]">
          <img src={imageUrl} alt={label} className="max-h-48 w-auto max-w-full object-contain bg-[#F7F9FC] dark:bg-[#0F172A]" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-[12px] font-medium text-[#101828] hover:bg-white transition-colors">
              <Upload className="h-3.5 w-3.5" /> Change
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
            <button onClick={onRemove} className="flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#0F172A] py-8 px-4 hover:border-[#1a6fa8]/40 transition-colors">
          {uploading ? <Loader2 className="h-8 w-8 animate-spin text-[#1a6fa8]" /> : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                <Image className="h-6 w-6 text-[#1a6fa8]" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium text-[#344054] dark:text-[#CBD5E1]">Click to upload</p>
                <p className="text-[11px] text-[#98A2B3]">JPEG, PNG, GIF, WebP (max 5MB)</p>
              </div>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      )}
    </div>
  )
}

// ─── Developer Image Uploader (smaller) ──────────────
function DevImageUploader({
  imageUrl,
  uploading,
  onUpload,
  onRemove,
}: {
  imageUrl: string
  uploading: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}) {
  return (
    <div className="h-10">
      {imageUrl ? (
        <div className="relative group flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden border border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#0F172A]">
          <img src={imageUrl} alt="Dev" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onRemove} className="text-white"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ) : (
        <label className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#0F172A] h-10 px-3 ${uploading ? 'pointer-events-none' : ''} hover:border-[#1a6fa8]/40 transition-colors`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin text-[#1a6fa8]" /> : (
            <span className="flex items-center gap-1 text-[11px] text-[#98A2B3]"><Upload className="h-3.5 w-3.5" /> Upload</span>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      )}
    </div>
  )
}
