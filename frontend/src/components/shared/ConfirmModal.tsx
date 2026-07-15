import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  warning: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-page-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes page-enter { 0% { opacity: 0; transform: translateY(12px) scale(0.97); } 100% { opacity: 1; transform: translateY(0) scale(1); } } .animate-page-enter { animation: page-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAECF0] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-[16px] font-semibold text-[#101828]">{title}</h2>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-[#667085] hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-[14px] text-[#667085] leading-relaxed">{message}</p>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] font-medium text-red-700 flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <span>{warning}</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#EAECF0] px-6 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-[#D0D5DD] bg-white px-5 py-2.5 text-[13px] font-medium text-[#667085] transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:brightness-110 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
