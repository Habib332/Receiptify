import { useState, useEffect, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

export default function ScanUpload() {
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const [isDragging, setIsDragging] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [fileName, setFileName] = useState('')
    const [error, setError] = useState('')

    const [vendorName, setVendorName] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{ vendorName?: string; businessId?: string }>({})
    const [submitting, setSubmitting] = useState(false)

    // Business selector — always shown, per product decision. The token
    // stored from login is the identityToken (no role/businessId claims),
    // so it's valid for GET /business but NOT for POST /receipts. We only
    // get a role-bearing sessionToken by calling /auth/select-business,
    // which we do at submit time using whichever business is selected here.
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
            // Auto-fill the dropdown if there's exactly one option — user
            // can still change it, this just saves a click in the common case.
            if (data.data?.length === 1) {
                setSelectedBusinessId(String(data.data[0].business_id))
            }
        } catch (err) {
            // Selector failure shouldn't block the page; surface silently in console
            console.error(err)
        } finally {
            setBusinessesLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBusinesses()
    }, [fetchBusinesses])

    const handleFile = (selected: File | undefined) => {
        setError('')
        if (!selected) return

        if (!selected.type.startsWith('image/')) {
            setError('Please upload an image file (JPG, PNG, or HEIC)')
            return
        }

        setFile(selected)
        setFileName(selected.name)
        const reader = new FileReader()
        reader.onload = () => setPreview(reader.result as string)
        reader.readAsDataURL(selected)
    }

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        handleFile(e.dataTransfer.files?.[0])
    }

    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        handleFile(e.target.files?.[0])
    }

    const validate = () => {
        const errors: typeof fieldErrors = {}
        if (!vendorName.trim()) {
            errors.vendorName = 'Vendor name is required'
        }
        if (!selectedBusinessId) {
            errors.businessId = 'Please select a business'
        }
        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Exchanges the identityToken for a role-bearing sessionToken scoped to
    // the chosen business, and persists it — overwriting whatever token is
    // currently stored. Returns the fresh sessionToken so the caller can use
    // it immediately without relying on a state update having landed yet.
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

    const handleContinue = async () => {
        setError('')

        if (!validate()) return

        if (!file) {
            setError('Please attach a receipt image first')
            return
        }

        setSubmitting(true)
        try {
            // Get a sessionToken scoped to the selected business before
            // uploading — POST /receipts requires role/businessId claims
            // that only exist on the sessionToken, not the identityToken.
            const sessionToken = await selectBusiness(selectedBusinessId)

            const formData = new FormData()
            formData.append('screenshot', file)
            formData.append('vendorName', vendorName.trim())

            const res = await fetch(`${API_BASE_URL}/receipts`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${sessionToken}`,
                },
                body: formData,
            })

            const result = await res.json()

            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Failed to upload receipt')
            }

            navigate('/scan/review', { state: { receipt: result.data } })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload receipt')
        } finally {
            setSubmitting(false)
        }
    }

    const handleReset = () => {
        setPreview(null)
        setFile(null)
        setFileName('')
        setVendorName('')
        setFieldErrors({})
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

                    <div className="mb-4">
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Vendor name</label>
                        <input
                            type="text"
                            value={vendorName}
                            onChange={(e) => {
                                setVendorName(e.target.value)
                                if (fieldErrors.vendorName) setFieldErrors((prev) => ({ ...prev, vendorName: undefined }))
                            }}
                            placeholder="e.g. Metro Store"
                            className={`w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 placeholder:text-gray-400 ${
                                fieldErrors.vendorName ? 'ring-2 ring-red-200' : 'focus:ring-blue-200'
                            }`}
                        />
                        {fieldErrors.vendorName && <p className="text-xs text-red-500 mt-1">{fieldErrors.vendorName}</p>}
                    </div>

                    <button
                        onClick={handleContinue}
                        disabled={submitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-white text-sm font-semibold rounded-lg py-3"
                    >
                        {submitting ? 'Uploading...' : 'Continue to review'}
                    </button>
                </div>
            )}
        </Layout>
    )
}
