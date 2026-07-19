import { useState, useEffect, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MAX_FILES = 50 // matches upload.array("screenshots", 50) on the backend

function getToken() {
    return sessionStorage.getItem('token')
}

function authHeaders() {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}

interface Business {
    business_id: number | string
    name: string
}

interface PendingFile {
    id: string
    file: File
    preview: string
}

// Matches the raw `SELECT * FROM receipts` row shape (pool.query results
// aren't camelCased). Only the fields the review step needs are listed
// here; see ScanReview.tsx / ScanBulkReview.tsx for the full shape.
interface Receipt {
    receipt_id: number | string
    [key: string]: unknown
}

interface BulkResult {
    batchId: number | string
    processed: number
    failed: number
    total: number
    receipts: Receipt[] // requires the backend change noted below
}

export default function ScanBulkUpload() {
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isDragging, setIsDragging] = useState(false)
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{ businessId?: string; files?: string }>({})
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<BulkResult | null>(null)


    // Same business-selection dance as ScanUpload: the token from login
    // has no role/businessId claims, so we exchange it for a
    // sessionToken scoped to the chosen business right before submitting.
    const [businesses, setBusinesses] = useState<Business[]>([])
    const [businessesLoading, setBusinessesLoading] = useState(false)
    const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')

    const fetchBusinesses = useCallback(async () => {
        setBusinessesLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/business`, {
                method: 'GET',
                headers: authHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to load businesses')
            }
            setBusinesses(data.data || [])
            if (data.data?.length === 1) {
                setSelectedBusinessId(String(data.data[0].business_id))
            }
        } catch (err) {
            console.error(err)
        } finally {
            setBusinessesLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBusinesses()
    }, [fetchBusinesses])

    // Revoke object URLs on unmount / whenever the file list changes to
    // avoid leaking memory across a long multi-file session.
    useEffect(() => {
        return () => {
            pendingFiles.forEach((f) => URL.revokeObjectURL(f.preview))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const addFiles = (incoming: FileList | File[] | undefined) => {
        if (!incoming) return
        setError('')
        setFieldErrors((prev) => ({ ...prev, files: undefined }))

        const incomingArr = Array.from(incoming)
        const imagesOnly = incomingArr.filter((f) => f.type.startsWith('image/'))
        const rejectedCount = incomingArr.length - imagesOnly.length

        setPendingFiles((prev) => {
            const room = MAX_FILES - prev.length
            const accepted = imagesOnly.slice(0, Math.max(room, 0))
            const overflow = imagesOnly.length - accepted.length

            if (rejectedCount > 0) {
                setError('Some files were skipped — only image files (JPG, PNG, HEIC) are supported')
            } else if (overflow > 0) {
                setError(`Only ${MAX_FILES} files can be uploaded at once — ${overflow} file(s) were skipped`)
            }

            const next: PendingFile[] = accepted.map((file) => ({
                id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
                file,
                preview: URL.createObjectURL(file),
            }))

            return [...prev, ...next]
        })
    }

    const removeFile = (id: string) => {
        setPendingFiles((prev) => {
            const target = prev.find((f) => f.id === id)
            if (target) URL.revokeObjectURL(target.preview)
            return prev.filter((f) => f.id !== id)
        })
    }

    const clearAll = () => {
        pendingFiles.forEach((f) => URL.revokeObjectURL(f.preview))
        setPendingFiles([])
    }

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        addFiles(e.dataTransfer.files)
    }

    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        addFiles(e.target.files)
        e.target.value = '' // allow re-selecting the same file after removal
    }

    const validate = () => {
        const errors: typeof fieldErrors = {}
        if (!selectedBusinessId) errors.businessId = 'Please select a business'
        if (pendingFiles.length === 0) errors.files = 'Add at least one receipt image'
        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    const selectBusiness = async (businessId: string): Promise<string> => {
        const res = await fetch(`${API_BASE_URL}/auth/select-business`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
            },
            body: JSON.stringify({ businessId }),
        })
        const result = await res.json()
        if (!res.ok || !result.success) {
            throw new Error(result.message || 'Failed to select business')
        }
        const sessionToken = result.data?.sessionToken
        if (!sessionToken) {
            throw new Error('No session token returned for selected business')
        }
        sessionStorage.setItem('token', sessionToken)
        sessionStorage.setItem('businessId', businessId)
        return sessionToken
    }

    const handleSubmit = async () => {
        setError('')
        setResult(null)
        if (!validate()) return

        setSubmitting(true)
        try {
            const sessionToken = await selectBusiness(selectedBusinessId)

            const formData = new FormData()
            pendingFiles.forEach(({ file }) => formData.append('screenshots', file))


            // NOTE: this awaits the full response — createBulkReceipts on
            // the backend processes every file (upload + OCR trigger)
            // before it responds, so a large batch can take a while even
            // though the route returns 202.
            const res = await fetch(`${API_BASE_URL}/receipts/bulk`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${sessionToken}`,
                },
                body: formData,
            })

            const responseBody = await res.json()

            if (!res.ok || !responseBody.success) {
                throw new Error(responseBody.message || 'Bulk upload failed')
            }

            const data: BulkResult = responseBody.data
            setResult(data)
            clearAll()

            if (data.receipts?.length) {
                navigate('/scan/bulk/review', { state: { receipts: data.receipts } })
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bulk upload failed')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Layout>
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bulk upload receipts</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Upload multiple receipt images at once — we'll read each one automatically.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/scan')}
                    className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                    Single upload instead
                </button>
            </div>

            {/* Business selector */}
            <div className="mb-4 max-w-2xl">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Business</label>
                <select
                    value={selectedBusinessId}
                    onChange={(e) => {
                        setSelectedBusinessId(e.target.value)
                        if (fieldErrors.businessId) setFieldErrors((prev) => ({ ...prev, businessId: undefined }))
                    }}
                    disabled={businessesLoading}
                    className={`w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 ${
                        fieldErrors.businessId ? 'ring-2 ring-red-200' : 'focus:ring-blue-200'
                    }`}
                >
                    <option value="" disabled>
                        {businessesLoading ? 'Loading businesses...' : 'Select a business'}
                    </option>
                    {businesses.map((b) => (
                        <option key={b.business_id} value={String(b.business_id)}>
                            {b.name}
                        </option>
                    ))}
                </select>
                {fieldErrors.businessId && <p className="text-xs text-red-500 mt-1">{fieldErrors.businessId}</p>}
            </div>


            {error && (
                <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 max-w-2xl">
                    {error}
                </div>
            )}

            {result && (
                <div className="mb-4 max-w-2xl text-sm bg-green-50 border border-green-100 rounded-xl px-4 py-3.5">
                    <p className="font-semibold text-green-800 mb-1">Batch submitted</p>
                    <p className="text-green-700 text-xs">
                        {result.processed} of {result.total} uploaded successfully
                        {result.failed > 0 && ` · ${result.failed} failed`}. Each receipt is now a draft — review and
                        save each one from your receipts list to confirm it.
                    </p>
                    <button
                        onClick={() => navigate('/receipts')}
                        className="mt-3 text-xs font-semibold text-green-800 hover:text-green-900 underline"
                    >
                        Go to receipts
                    </button>
                </div>
            )}

            {/* Dropzone */}
            <div
                onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`max-w-2xl border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center px-8 py-12 transition-colors ${
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
                <p className="text-sm font-semibold text-gray-900 mb-1">Drag and drop receipts here</p>
                <p className="text-xs text-gray-400 mb-6">or choose files · up to {MAX_FILES} images, JPG/PNG, 10MB each</p>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold rounded-lg px-4 py-2.5"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Choose files
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                />
            </div>
            {fieldErrors.files && <p className="text-xs text-red-500 mt-2 max-w-2xl">{fieldErrors.files}</p>}

            {/* Selected files grid */}
            {pendingFiles.length > 0 && (
                <div className="max-w-2xl mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-700">
                            {pendingFiles.length} file{pendingFiles.length === 1 ? '' : 's'} selected
                        </p>
                        <button onClick={clearAll} className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors">
                            Clear all
                        </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
                        {pendingFiles.map(({ id, preview, file }) => (
                            <div key={id} className="relative group border border-gray-100 rounded-xl overflow-hidden aspect-square bg-gray-50">
                                <img src={preview} alt={file.name} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeFile(id)}
                                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Remove ${file.name}`}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-white text-sm font-semibold rounded-lg py-3"
                    >
                        {submitting
                            ? `Uploading ${pendingFiles.length} file${pendingFiles.length === 1 ? '' : 's'}...`
                            : `Upload ${pendingFiles.length} receipt${pendingFiles.length === 1 ? '' : 's'}`}
                    </button>
                </div>
            )}
        </Layout>
    )
}