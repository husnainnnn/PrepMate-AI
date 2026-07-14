import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  label?: string
}

export default function Pagination({ page, totalPages, total, onPageChange, label = 'items' }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-[#EAECF0] px-4 py-3">
      <p className="text-[11px] text-[#98A2B3]">
        {total} {label} total
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-[#D0D5DD] px-2.5 py-1.5 text-[11px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (page <= 3) {
              pageNum = i + 1
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = page - 2 + i
            }
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-medium transition-all duration-200 ${
                  pageNum === page
                    ? 'bg-[#1a6fa8] text-white'
                    : 'text-[#667085] hover:bg-[#F7F9FC] hover:text-[#101828]'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-[#D0D5DD] px-2.5 py-1.5 text-[11px] font-medium text-[#667085] transition-colors hover:bg-[#F7F9FC] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
