type Props = {
    onClose: () => void
}

export default function ContactModal({ onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

                <div className="flex items-start justify-between">

                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Contact the Developers
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            We'd love to hear from you.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <svg
                            className="w-5 h-5 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>

                </div>

                <div className="mt-6 space-y-4">

                    <a
                        href="mailto:hamza.zeeshan7163@gmail.com"
                        className="block rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors p-4"
                    >
                        <p className="text-sm text-gray-400">
                            Frontend Developer
                        </p>

                        <h3 className="font-semibold text-gray-900 mt-1">
                            Hamza Zeeshan
                        </h3>

                        <p className="text-blue-600 text-sm mt-2">
                            hamza.zeeshan7163@gmail.com
                        </p>
                    </a>

                    <a
                        href="mailto:habib.ahmed4781@gmail.com"
                        className="block rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors p-4"
                    >
                        <p className="text-sm text-gray-400">
                            Backend Developer
                        </p>

                        <h3 className="font-semibold text-gray-900 mt-1">
                            Habib Ahmed
                        </h3>

                        <p className="text-blue-600 text-sm mt-2">
                            habib.ahmed4781@gmail.com
                        </p>
                    </a>

                </div>

                <div className="mt-8 flex justify-end">

                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5 font-medium transition-colors"
                    >
                        Close
                    </button>

                </div>

            </div>

        </div>
    )
}