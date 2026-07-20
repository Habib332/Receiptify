import { useNavigate } from 'react-router-dom'

interface UploadModeToggleProps {
    mode: 'single' | 'bulk'
}

export default function UploadModeToggle({ mode }: UploadModeToggleProps) {
    const navigate = useNavigate()

    return (
        <div className="inline-flex items-center bg-blue-600 rounded-full p-1 shrink-0">
            <button
                onClick={() => navigate('/scan')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    mode === 'single'
                        ? 'bg-white text-blue-600'
                        : 'text-white hover:bg-blue-500'
                }`}
            >
                Single upload
            </button>
            <button
                onClick={() => navigate('/scan/bulk')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    mode === 'bulk'
                        ? 'bg-white text-blue-600'
                        : 'text-white hover:bg-blue-500'
                }`}
            >
                Bulk upload
            </button>
        </div>
    )
}