import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout'

export default function AnalyticsPage() {
  return (
    <StudentDashboardLayout>
      <div className="p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Progress & Analytics</h1>
        <p className="mt-1 text-[13.5px] text-[#667085]">Track your performance and improvement over time.</p>
      </div>
    </StudentDashboardLayout>
  )
}
