import { CompanyDashboardLayout } from '@/components/company/CompanyDashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Briefcase } from 'lucide-react'

export default function PostJob() {
  return (
    <CompanyDashboardLayout>
      <div className="px-6 py-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Post a Job</h1>
        <p className="mt-1 text-[13.5px] text-[#667085]">Create a new job listing to attract top talent.</p>

        <Card className="mt-6 rounded-xl border-[#EAECF0] shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50">
              <Briefcase className="h-8 w-8 text-[#1a6fa8]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#101828]">Job Posting Coming Soon</h2>
            <p className="mt-2 max-w-md mx-auto text-[13.5px] text-[#667085]">
              This feature is under development. You'll be able to create detailed job listings with AI-powered descriptions, set requirements, and manage applications.
            </p>
          </CardContent>
        </Card>
      </div>
    </CompanyDashboardLayout>
  )
}
