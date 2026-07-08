import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'

export default function ResourcesPage() {
  return (
    <StudentDashboardLayout>
      <div className="p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Resources</h1>
        <p className="mt-1 text-[13.5px] text-[#667085]">Guides, templates, and tips from hiring professionals.</p>
      </div>
    </StudentDashboardLayout>
  )
}
