import { useState, useRef, type FormEvent } from 'react'
import { businessTypes } from './BusinessIcons'
import { isValidPakistaniPhone, phoneErrorMessage } from './PhoneValidation'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function getToken() {
    return sessionStorage.getItem('token')
}

type Business = {
    id: string
    name: string
    type: string
    address: string
    phone: string
    logoUrl?: string | null
}

type Props = {
    business: Business
    onClose: () => void
    onSave: (id: string, business: { name: string; type: string; address: string; phone: string }) => void
}

export default function EditBusinessModal({ business, onClose, onSave }: Props) {
    const [name, setName] = useState(business.name)
    const [type, setType] = useState(business.type)
    const [address, setAddress] = useState(business.address)
    const [phone, setPhone] = useState(business.phone)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Field-level errors so the person sees exactly which input is wrong,
    // right under that input, instead of a single banner at the top.
    const [fieldErrors, setFieldErrors] = useState<{ name?: string; address?: string; phone?: string }>({})

    // Logo starts as whatever the business already has; a freshly picked
    // file gets its own local preview URL that overrides this until upload
    // succeeds (then the parent's refetch will replace it with the real URL).
    const [logoUrl, setLogoUrl] = useState<string | null>(business.logoUrl ?? null)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            setError('Logo must be 5MB or smaller')
            return
        }

        setError('')
        setLogoFile(file)
        setLogoUrl(URL.createObjectURL(file))
        setUploadingLogo(true)

        try {
            const formData = new FormData()
            formData.append('logo', file)

            const res = await fetch(`${API_BASE_URL}/business/${business.id}/logo`, {
                method: 'POST',
                headers: {
                    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
                },
                body: formData,
            })

            const result = await res.json()

            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Failed to upload logo')
            }

            // If the API returns the stored URL, prefer it over the local
            // object URL so we're showing the real, persisted image.
            if (result.data?.logoUrl) {
                setLogoUrl(result.data.logoUrl)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload logo')
        } finally {
            setUploadingLogo(false)
        }
    }

    const validate = () => {
        const errors: typeof fieldErrors = {}

        if (!name.trim()) {
            errors.name = 'Business name is required'
        }

        if (!address.trim()) {
            errors.address = 'Address is required'
        }

        if (!phone.trim()) {
            errors.phone = 'Phone number is required'
        } else if (!isValidPakistaniPhone(phone)) {
            errors.phone = phoneErrorMessage()
        }

        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        if (!validate()) return

        setSaving(true)
        await onSave(business.id, { name: name.trim(), type, address: address.trim(), phone: phone.trim() })
        setSaving(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-gray-900">Edit Business</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {/* Logo picker */}
                    <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                            ) : (
                                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 15V8.25A2.25 2.25 0 0015.75 6H8.25A2.25 2.25 0 006 8.25v7.5A2.25 2.25 0 008.25 18h7.5A2.25 2.25 0 0018 15.75z" />
                                </svg>
                            )}
                            {uploadingLogo && (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Logo</label>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingLogo}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                            >
                                {logoUrl ? 'Replace' : 'Upload'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Business name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }))
                            }}
                            placeholder="e.g. Metro Store"
                            className={`w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 placeholder:text-gray-400 ${
                                fieldErrors.name ? 'ring-2 ring-red-200' : 'focus:ring-blue-200'
                            }`}
                        />
                        {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 appearance-none"
                        >
                            {businessTypes.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Address</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => {
                                setAddress(e.target.value)
                                if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: undefined }))
                            }}
                            placeholder="e.g. Main Boulevard, Lahore"
                            className={`w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 placeholder:text-gray-400 ${
                                fieldErrors.address ? 'ring-2 ring-red-200' : 'focus:ring-blue-200'
                            }`}
                        />
                        {fieldErrors.address && <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>}
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value)
                                if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }))
                            }}
                            placeholder="e.g. 0300 1234567"
                            className={`w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 placeholder:text-gray-400 ${
                                fieldErrors.phone ? 'ring-2 ring-red-200' : 'focus:ring-blue-200'
                            }`}
                        />
                        {fieldErrors.phone ? (
                            <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
                        ) : (
                            <p className="text-xs text-gray-400 mt-1">11-digit Pakistani number, e.g. 0300 1234567</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 text-sm font-semibold rounded-lg py-2.5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-white text-sm font-semibold rounded-lg py-2.5"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}