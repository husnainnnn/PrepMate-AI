import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'

export default function SettingsPage() {
  return (
    <StudentDashboardLayout>
      <div className="p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Settings</h1>
        <p className="mt-1 text-[13.5px] text-[#667085]">Manage your account and preferences.</p>
      </div>
    </StudentDashboardLayout>
  )
}
