import { useEffect } from 'react'

type Props = {
    businessName: string
    loading: boolean
    onConfirm: () => void
    onClose: () => void
}

export default function LeaveBusinessModal({ businessName, loading, onConfirm, onClose }: Props) {
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !loading) onClose()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onClose, loading])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            onClick={() => !loading && onClose()}
        >
            <div
                className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-1.5">Leave business?</h3>
                <p className="text-sm text-gray-500 mb-6">
                    You're about to leave <span className="font-semibold text-gray-700">{businessName}</span>.
                    You'll lose access to its receipts and data, and will need to send a new join request to
                    rejoin later.
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 h-10 rounded-lg text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 h-10 rounded-lg text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                        {loading ? 'Leaving...' : 'Leave business'}
                    </button>
                </div>
            </div>
        </div>
    )
}