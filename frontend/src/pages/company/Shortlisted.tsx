import { CompanyDashboardLayout } from '@/components/company/CompanyDashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { UserCheck } from 'lucide-react'

export default function Shortlisted() {
  return (
    <CompanyDashboardLayout>
      <div className="px-6 py-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Shortlisted</h1>
        <p className="mt-1 text-[13.5px] text-[#667085]">Manage your shortlisted candidates.</p>
        <Card className="mt-6 rounded-xl border-[#EAECF0] shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50">
              <UserCheck className="h-8 w-8 text-[#1a6fa8]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#101828]">Shortlisted Coming Soon</h2>
            <p className="mt-2 max-w-md mx-auto text-[13.5px] text-[#667085]">Keep track of your top candidates and move them through the hiring pipeline.</p>
          </CardContent>
        </Card>
      </div>
    </CompanyDashboardLayout>
  )
}
