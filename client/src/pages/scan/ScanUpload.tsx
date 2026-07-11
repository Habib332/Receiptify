import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'

export default function ScanUpload() {
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const [isDragging, setIsDragging] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const [fileName, setFileName] = useState('')
    const [error, setError] = useState('')

    const handleFile = (file: File | undefined) => {
        setError('')
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPG, PNG, or HEIC)')
            return
        }

        setFileName(file.name)
        const reader = new FileReader()
        reader.onload = () => setPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        handleFile(e.dataTransfer.files?.[0])
    }

    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        handleFile(e.target.files?.[0])
    }

    const handleContinue = () => {
        // TODO: send `preview` to backend for OCR/extraction, then navigate with real data
        navigate('/scan/review', { state: { preview, fileName } })
    }

    const handleReset = () => {
        setPreview(null)
        setFileName('')
        setError('')
    }

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Scan a receipt</h1>
                <p className="text-sm text-gray-400 mt-1">Upload a photo or take a picture to get started.</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
                        1
                    </span>
                    <span className="text-sm font-semibold text-gray-900">Upload</span>
                </div>
                <div className="w-8 h-px bg-gray-200" />
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold flex items-center justify-center">
                        2
                    </span>
                    <span className="text-sm font-medium text-gray-400">Review</span>
                </div>
            </div>

            {error && (
                <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 max-w-2xl">
                    {error}
                </div>
            )}

            {!preview ? (
                <div
                    onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`max-w-2xl border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center px-8 py-16 transition-colors ${
                        isDragging ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 bg-gray-50/50'
                    }`}
                >
                    <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                        <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                        Drag and drop your receipt here
                    </p>
                    <p className="text-xs text-gray-400 mb-6">or choose an option below · JPG, PNG up to 10MB</p>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold rounded-lg px-4 py-2.5"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            Upload file
                        </button>
                        <button
                            onClick={() => cameraInputRef.current?.click()}
                            className="inline-flex items-center gap-2 border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 text-sm font-semibold rounded-lg px-4 py-2.5"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38 0-.753-.116-1.076-.334a2.32 2.32 0 01-.734-.847 2.29 2.29 0 01-.239-1.089 2.31 2.31 0 01.334-1.076c.19-.319.462-.573.79-.734a2.29 2.29 0 011.089-.239h13.42a2.29 2.29 0 011.089.239c.328.161.6.415.79.734.19.319.316.68.334 1.076a2.29 2.29 0 01-.239 1.089 2.32 2.32 0 01-.734.847 2.31 2.31 0 01-1.076.334 2.31 2.31 0 01-1.641-1.055M6.827 6.175L3.75 20.25h16.5L17.173 6.175M6.827 6.175h10.346"
                                />
                                <circle cx="12" cy="13" r="2.75" />
                            </svg>
                            Use camera
                        </button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileInput}
                    />
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileInput}
                    />
                </div>
            ) : (
                <div className="max-w-2xl">
                    <div className="border border-gray-100 rounded-2xl overflow-hidden mb-4">
                        <img src={preview} alt="Receipt preview" className="w-full max-h-96 object-contain bg-gray-50" />
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 min-w-0">
                                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 10.5h.008v.008H18V10.5zm-12-6h12a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0118 18.75H6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 016 4.5z" />
                                </svg>
                                <span className="text-xs text-gray-500 truncate">{fileName}</span>
                            </div>
                            <button
                                onClick={handleReset}
                                className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors shrink-0"
                            >
                                Remove
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleContinue}
                        className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold rounded-lg py-3"
                    >
                        Continue to review
                    </button>
                </div>
            )}
        </Layout>
    )
}