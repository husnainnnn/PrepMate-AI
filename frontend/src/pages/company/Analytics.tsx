import { CompanyDashboardLayout } from '@/components/company/CompanyDashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

export default function CompanyAnalytics() {
  return (
    <CompanyDashboardLayout>
      <div className="px-6 py-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Analytics</h1>
        <p className="mt-1 text-[13.5px] text-[#667085]">Track hiring metrics and recruitment performance.</p>
        <Card className="mt-6 rounded-xl border-[#EAECF0] shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50">
              <BarChart3 className="h-8 w-8 text-[#1a6fa8]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#101828]">Analytics Coming Soon</h2>
            <p className="mt-2 max-w-md mx-auto text-[13.5px] text-[#667085]">Detailed analytics on your hiring funnel, source effectiveness, time-to-hire, and more.</p>
          </CardContent>
        </Card>
      </div>
    </CompanyDashboardLayout>
  )
}
