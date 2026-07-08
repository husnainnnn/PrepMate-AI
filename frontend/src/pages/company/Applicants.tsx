import { CompanyDashboardLayout } from '@/components/company/CompanyDashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function Applicants() {
  return (
    <CompanyDashboardLayout>
      <div className="px-6 py-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Applicants</h1>
        <p className="mt-1 text-[13.5px] text-[#667085]">Review and manage all job applicants.</p>
        <Card className="mt-6 rounded-xl border-[#EAECF0] shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50">
              <Users className="h-8 w-8 text-[#1a6fa8]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#101828]">Applicants Coming Soon</h2>
            <p className="mt-2 max-w-md mx-auto text-[13.5px] text-[#667085]">Applicant management is under development. You'll be able to view, filter, and manage all candidates here.</p>
          </CardContent>
        </Card>
      </div>
    </CompanyDashboardLayout>
  )
}
