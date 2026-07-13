type Props = {
    title?: string
    message: string
    onClose: () => void
}

// Small, centered modal for errors the user is likely to miss if they only
// appear as a banner at the top of the page (e.g. permission errors from
// delete/edit — "You are not the owner or manager of this business").
export default function ErrorModal({ title = 'Something went wrong', message, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />

            <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>

                <h2 className="text-base font-bold text-gray-900 mb-1.5">{title}</h2>
                <p className="text-sm text-gray-500 mb-6">{message}</p>

                <button
                    onClick={onClose}
                    className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold rounded-lg py-2.5"
                >
                    Got it
                </button>
            </div>
        </div>
    )
}