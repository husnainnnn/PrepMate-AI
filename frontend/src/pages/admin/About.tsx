import AdminLayout from '@/components/admin/AdminLayout'
import { Info } from 'lucide-react'

export default function AdminAbout() {
  return (
    <AdminLayout>
      <div className="border-b border-[#EAECF0] bg-white px-8 py-4">
        <h1 className="text-lg font-semibold text-[#101828]">About</h1>
        <p className="text-[13px] text-[#667085]">Platform information</p>
      </div>
      <div className="flex items-center justify-center p-16">
        <div className="max-w-md rounded-xl border border-[#EAECF0] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Info className="h-8 w-8 text-[#1a6fa8]" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#101828]">🚧 Coming Soon</h2>
          <p className="mt-2 text-[13px] text-[#667085]">
            The About section is under development. Admins will soon be able to manage platform information, 
            terms of service, and other content here.
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#F7F9FC] px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] text-[#667085]">Expected soon</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
