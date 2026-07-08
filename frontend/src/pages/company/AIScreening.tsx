import { CompanyDashboardLayout } from '@/components/company/CompanyDashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Brain } from 'lucide-react'

export default function AIScreeningPage() {
  return (
    <CompanyDashboardLayout>
      <div className="px-6 py-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">AI Screening</h1>
        <p className="mt-1 text-[13.5px] text-[#667085]">Automatically screen and rank candidates with AI.</p>
        <Card className="mt-6 rounded-xl border-[#EAECF0] shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50">
              <Brain className="h-8 w-8 text-[#1a6fa8]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#101828]">AI Screening Coming Soon</h2>
            <p className="mt-2 max-w-md mx-auto text-[13.5px] text-[#667085]">AI-powered screening is under development. Candidates will be automatically evaluated and ranked based on their resumes and job requirements.</p>
          </CardContent>
        </Card>
      </div>
    </CompanyDashboardLayout>
  )
}
