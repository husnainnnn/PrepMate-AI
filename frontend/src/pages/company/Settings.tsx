import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CompanyDashboardLayout } from '@/components/company/CompanyDashboardLayout'
import { useAuth } from '@/context/AuthContext'
import { useDarkMode } from '@/context/DarkModeContext'
import {
  Bell, Volume2, Monitor, Moon, Sun, Building2, Trash2, KeyRound,
  Check, Play, AlertTriangle, Loader2, Eye, EyeOff,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  getToneList,
  getSavedToneId,
  saveToneId,
  previewTone,
  requestDesktopNotifPermission,
  getDesktopNotifEnabled,
  setDesktopNotifEnabled,
} from '@/lib/notificationSounds'

export default function CompanySettings() {
  const { user, token, logout } = useAuth()
  const { darkMode, toggleDarkMode } = useDarkMode()
  const navigate = useNavigate()
  const tones = getToneList()
  const [selectedTone, setSelectedTone] = useState(getSavedToneId())
  const [desktopNotif, setDesktopNotif] = useState(getDesktopNotifEnabled())
  const [desktopGranted, setDesktopGranted] = useState(false)
  const [activeSection, setActiveSection] = useState('notifications')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwChanging, setPwChanging] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if ('Notification' in window) {
      setDesktopGranted(Notification.permission === 'granted')
    }
  }, [])

  const handleToneChange = useCallback((id: string) => {
    setSelectedTone(id)
    saveToneId(id)
  }, [])

  const handleDesktopToggle = useCallback(async () => {
    if (!desktopNotif) {
      const granted = await requestDesktopNotifPermission()
      setDesktopGranted(granted)
      setDesktopNotif(granted)
      setDesktopNotifEnabled(granted)
      if (granted) {
        new Notification('Notifications Enabled ✅', {
          body: 'You will now receive desktop notifications.',
          icon: '/images.png',
        })
      }
    } else {
      setDesktopNotif(false)
      setDesktopNotifEnabled(false)
    }
  }, [desktopNotif])

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE' || !token) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete account')
      }
      logout()
      navigate('/login?role=company', { replace: true })
    } catch (err: any) {
      setDeleteError(err.message || 'Something went wrong.')
    }
    setDeleting(false)
  }

  const navItems = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: darkMode ? Moon : Sun },
    { id: 'password', label: 'Password', icon: KeyRound },
    { id: 'profile', label: 'Profile', icon: Building2 },
    { id: 'danger', label: 'Delete Account', icon: Trash2 },
  ]

  const inputCls = 'w-full rounded-lg border border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3.5 py-2.5 text-[13.5px] text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#98A2B3] dark:placeholder:text-[#64748B] outline-none transition-all focus:border-[#1a6fa8] focus:ring-2 focus:ring-[#1a6fa8]/20'

  return (
    <CompanyDashboardLayout>
      <div className="space-y-6 px-6 py-6 lg:px-8">
        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] shadow-lg shadow-[#0b3b5c]/30">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#101828] dark:text-[#F1F5F9]">Settings</h1>
            <p className="text-[13px] text-[#667085] dark:text-[#94A3B8]">Manage your company account</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 lg:max-h-[calc(100vh-12rem)] lg:overflow-hidden">
          {/* ── Sidebar nav ────────────────────────────── */}
          <div className="lg:col-span-1 lg:sticky lg:top-0 lg:self-start">
            <nav className="space-y-1 rounded-xl border border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-2 shadow-sm">
              {navItems.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold transition-all ${
                      activeSection === item.id
                        ? 'bg-[#1a6fa8]/10 text-[#1a6fa8] dark:bg-[#1a6fa8]/20'
                        : 'text-[#667085] dark:text-[#94A3B8] hover:bg-[#F7F9FC] dark:hover:bg-[#334155]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* ── Main panel ─────────────────────────────── */}
          <div className="space-y-5 lg:col-span-2 lg:overflow-y-auto lg:max-h-[calc(100vh-12rem)] lg:pr-2 lg:scrollbar-thin">
            {/* ════════════ NOTIFICATIONS ════════════ */}
            {activeSection === 'notifications' && (
              <>
                <Card className="rounded-xl border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                        <Volume2 className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Notification Sound</h2>
                        <p className="text-[12.5px] text-[#667085] dark:text-[#94A3B8]">Choose your preferred notification tone</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-1.5">
                      {tones.map((tone) => (
                        <button key={tone.id} onClick={() => handleToneChange(tone.id)}
                          className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                            selectedTone === tone.id
                              ? 'border-[#1a6fa8]/30 bg-gradient-to-r from-[#1a6fa8]/5 to-transparent dark:from-[#1a6fa8]/10 shadow-sm'
                              : 'border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#D0D5DD] dark:hover:border-[#475569] hover:shadow-sm'
                          }`}>
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            selectedTone === tone.id ? 'border-[#1a6fa8] bg-[#1a6fa8]' : 'border-[#D0D5DD] dark:border-[#475569] group-hover:border-[#98A2B3] dark:group-hover:border-[#64748B]'
                          }`}>
                            {selectedTone === tone.id && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13.5px] font-medium ${selectedTone === tone.id ? 'text-[#1a6fa8]' : 'text-[#101828] dark:text-[#F1F5F9]'}`}>{tone.name}</p>
                            <p className="text-[12px] text-[#667085] dark:text-[#94A3B8]">{tone.description}</p>
                          </div>
                          <span onClick={(e) => { e.stopPropagation(); previewTone(tone.id) }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#98A2B3] dark:text-[#64748B] opacity-0 transition-all hover:bg-[#F7F9FC] dark:hover:bg-[#334155] hover:text-[#1a6fa8] group-hover:opacity-100">
                            <Play className="h-4 w-4" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                          <Monitor className="h-[18px] w-[18px] text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Desktop Notifications</h2>
                          <p className="mt-0.5 text-[12.5px] text-[#667085] dark:text-[#94A3B8]">Get push notifications on your desktop.</p>
                        </div>
                      </div>
                      <button onClick={handleDesktopToggle}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${desktopNotif ? 'bg-[#1a6fa8]' : 'bg-[#EAECF0] dark:bg-[#475569]'}`}>
                        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${desktopNotif ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {desktopNotif && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3.5 py-2.5 text-[12.5px] text-green-700 dark:text-green-400">
                        <Check className="h-4 w-4 shrink-0" /> Desktop notifications are active
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ════════════ DARK MODE ════════════ */}
            {activeSection === 'appearance' && (
              <Card className="rounded-xl border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
                      {darkMode ? <Moon className="h-[18px] w-[18px] text-violet-600 dark:text-violet-400" /> : <Sun className="h-[18px] w-[18px] text-violet-600 dark:text-violet-400" />}
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Appearance</h2>
                      <p className="text-[12.5px] text-[#667085] dark:text-[#94A3B8]">Toggle between light and dark mode</p>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <button onClick={() => darkMode && toggleDarkMode()}
                      className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${!darkMode ? 'border-[#1a6fa8] bg-gradient-to-b from-[#1a6fa8]/5 to-transparent shadow-sm' : 'border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#D0D5DD] dark:hover:border-[#475569]'}`}>
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
                        <Sun className={`h-7 w-7 ${!darkMode ? 'text-amber-500' : 'text-[#98A2B3] dark:text-[#64748B]'}`} />
                      </div>
                      <span className={`text-[14px] font-semibold ${!darkMode ? 'text-[#1a6fa8]' : 'text-[#667085] dark:text-[#94A3B8]'}`}>Light</span>
                    </button>
                    <button onClick={() => !darkMode && toggleDarkMode()}
                      className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${darkMode ? 'border-[#1a6fa8] bg-gradient-to-b from-[#1a6fa8]/10 to-transparent shadow-sm' : 'border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#D0D5DD] dark:hover:border-[#475569]'}`}>
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                        <Moon className={`h-7 w-7 ${darkMode ? 'text-indigo-400' : 'text-[#98A2B3] dark:text-[#64748B]'}`} />
                      </div>
                      <span className={`text-[14px] font-semibold ${darkMode ? 'text-[#1a6fa8]' : 'text-[#667085] dark:text-[#94A3B8]'}`}>Dark</span>
                    </button>
                  </div>
                  {darkMode && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 px-3.5 py-2.5 text-[12.5px] text-indigo-700 dark:text-indigo-400">
                      <Moon className="h-4 w-4 shrink-0" /> Dark mode is active across all pages
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ════════════ CHANGE PASSWORD ════════════ */}
            {activeSection === 'password' && (
              <Card className="rounded-xl border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/30">
                      <KeyRound className="h-[18px] w-[18px] text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Change Password</h2>
                      <p className="text-[12.5px] text-[#667085] dark:text-[#94A3B8]">Update your account password</p>
                    </div>
                  </div>

                  {pwSuccess && (
                    <div className="mt-5 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3.5 py-2.5 text-[12.5px] text-green-700 dark:text-green-400">
                      <Check className="h-4 w-4 shrink-0" /> {pwSuccess}
                    </div>
                  )}

                  {!showPasswordFields ? (
                    <div className="mt-6 rounded-xl bg-[#F7F9FC] dark:bg-[#0F172A] p-5">
                      <p className="text-[13px] text-[#667085] dark:text-[#94A3B8]">
                        Your password was last set when you created your account.
                        We recommend changing it regularly for security.
                      </p>
                      <button
                        onClick={() => { setShowPasswordFields(true); setPwSuccess(''); setPwError(''); }}
                        className="mt-4 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 py-2 text-[12.5px] font-medium text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Change Password
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8]">Current Password</label>
                        <div className="relative">
                          <input type={showCurrentPw ? 'text' : 'password'}
                            value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password" className={inputCls + ' pr-10'} />
                          <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085]">
                            {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8]">New Password</label>
                        <div className="relative">
                          <input type={showNewPw ? 'text' : 'password'}
                            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters" className={inputCls + ' pr-10'} />
                          <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085]">
                            {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8]">Confirm New Password</label>
                        <div className="relative">
                          <input type={showConfirmPw ? 'text' : 'password'}
                            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password" className={inputCls + ' pr-10'} />
                          <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085]">
                            {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      {pwError && <p className="text-[12.5px] text-red-600 dark:text-red-400">{pwError}</p>}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => { setShowPasswordFields(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPwError('') }}
                          className="rounded-lg border border-[#EAECF0] dark:border-[#334155] px-4 py-2 text-[12.5px] font-medium text-[#667085] dark:text-[#94A3B8] hover:bg-[#F7F9FC] dark:hover:bg-[#334155]">Cancel</button>
                        <button
                          onClick={async () => {
                            if (!token) return
                            setPwError(''); setPwSuccess('')
                            if (!currentPassword) { setPwError('Please enter your current password.'); return }
                            if (!newPassword) { setPwError('Please enter a new password.'); return }
                            if (newPassword.length < 6) { setPwError('New password must be at least 6 characters.'); return }
                            if (newPassword !== confirmPassword) { setPwError('New passwords do not match.'); return }
                            setPwChanging(true)
                            try {
                              const res = await fetch('/api/auth/change-password', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ currentPassword, newPassword }),
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error || 'Failed to change password')
                              setPwSuccess('Password changed successfully!')
                              setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
                              setShowPasswordFields(false)
                              setTimeout(() => setPwSuccess(''), 4000)
                            } catch (err: any) { setPwError(err.message || 'Something went wrong.') }
                            setPwChanging(false)
                          }}
                          disabled={pwChanging}
                          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-5 py-2 text-[12.5px] font-semibold text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110 disabled:opacity-50">
                          {pwChanging ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                          {pwChanging ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ════════════ PROFILE ════════════ */}
            {activeSection === 'profile' && (
              <Card className="rounded-xl border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                      <Building2 className="h-[18px] w-[18px] text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Company Profile</h2>
                      <p className="text-[12.5px] text-[#667085] dark:text-[#94A3B8]">Manage your company info, logo, and branding</p>
                    </div>
                  </div>
                  <div className="mt-6 rounded-xl bg-[#F7F9FC] dark:bg-[#0F172A] p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0b3b5c] to-[#1a6fa8] text-white text-lg font-bold">
                        {user?.companyName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#101828] dark:text-[#F1F5F9]">{user?.companyName || 'Company'}</p>
                        <p className="text-[12.5px] text-[#667085] dark:text-[#94A3B8]">{user?.email}</p>
                      </div>
                      <Link to="/company/profile"
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0b3b5c] to-[#1a6fa8] px-4 py-2 text-[12.5px] font-medium text-white shadow-lg shadow-[#0b3b5c]/20 transition-all hover:brightness-110">
                        <Building2 className="h-3.5 w-3.5" /> Edit Profile
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ════════════ DELETE ACCOUNT ════════════ */}
            {activeSection === 'danger' && (
              <Card className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#1E293B] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
                      <Trash2 className="h-[18px] w-[18px] text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold text-[#101828] dark:text-[#F1F5F9]">Delete Account</h2>
                      <p className="text-[12.5px] text-[#667085] dark:text-[#94A3B8]">Permanently delete your company account and all data</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <div>
                        <p className="text-[13.5px] font-semibold text-red-800 dark:text-red-300">What happens when you delete?</p>
                        <ul className="mt-2 space-y-1 text-[12.5px] text-red-700 dark:text-red-400 list-disc list-inside">
                          <li>Your company profile and all data are permanently deleted</li>
                          <li>All your job postings are removed</li>
                          <li>Applicant data and interviews linked to your jobs are also deleted</li>
                          <li>Messages and notifications are removed</li>
                          <li>You will need to sign up again to use the platform</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="block text-[13px] font-medium text-[#344054] dark:text-[#94A3B8] mb-1.5">
                      Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm
                    </label>
                    <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder='Type "DELETE" to confirm' className={inputCls} />
                  </div>

                  {deleteError && <p className="mt-2 text-[12.5px] text-red-600 dark:text-red-400">{deleteError}</p>}

                  <button onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE' || deleting}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deleting ? 'Deleting...' : 'Permanently Delete My Account'}
                  </button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </CompanyDashboardLayout>
  )
}
