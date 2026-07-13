import { useState, useRef, type FormEvent } from 'react'
import { businessTypes } from './BusinessIcons'
import { isValidPakistaniPhone, phoneErrorMessage } from './PhoneValidation'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function getToken() {
    return sessionStorage.getItem('token')
}

type Props = {
    onClose: () => void
    onSave: (business: { name: string; type: string; address: string; phone: string }) => void
}

export default function AddBusinessModal({ onClose, onSave }: Props) {
    const [name, setName] = useState('')
    const [type, setType] = useState(businessTypes[0])
    const [address, setAddress] = useState('')
    const [phone, setPhone] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Field-level errors so the person sees exactly which input is wrong,
    // right under that input, instead of a single banner at the top.
    const [fieldErrors, setFieldErrors] = useState<{ name?: string; address?: string; phone?: string }>({})

    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            setError('Logo must be 5MB or smaller')
            return
        }

        setError('')
        setLogoFile(file)
        setLogoPreview(URL.createObjectURL(file))
    }

    const clearLogo = () => {
        setLogoFile(null)
        setLogoPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
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

    // Called after the business is created elsewhere (onSave triggers the
    // POST /business call in the parent). We need the new business's id to
    // upload the logo, so this modal does its own POST rather than relying
    // on onSave's return value, then still calls onSave for list refresh.
    const createAndMaybeUploadLogo = async () => {
        const res = await fetch(`${API_BASE_URL}/business`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
            },
            body: JSON.stringify({ name: name.trim(), type, address: address.trim(), phone: phone.trim() }),
        })

        const result = await res.json()

        if (!res.ok || !result.success) {
            // Surface field-specific validation errors from the API if it
            // returns them (e.g. { errors: { phone: '...' } }), otherwise
            // fall back to the generic message.
            if (result.errors && typeof result.errors === 'object') {
                setFieldErrors((prev) => ({ ...prev, ...result.errors }))
            }
            throw new Error(result.message || 'Failed to add business')
        }

        const newId = result.data?.id ?? result.data?.business_id

        if (logoFile && newId) {
            const formData = new FormData()
            formData.append('logo', logoFile)

            const logoRes = await fetch(`${API_BASE_URL}/business/${newId}/logo`, {
                method: 'POST',
                headers: {
                    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
                    // No Content-Type here — browser sets the multipart
                    // boundary automatically when body is FormData.
                },
                body: formData,
            })

            const logoResult = await logoRes.json()

            if (!logoRes.ok || !logoResult.success) {
                // Business was created but logo failed — don't block the
                // flow, just surface it so the user can retry from Edit.
                throw new Error(logoResult.message || 'Business added, but logo upload failed')
            }
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        if (!validate()) return

        setSaving(true)
        try {
            await createAndMaybeUploadLogo()
            onSave({ name: name.trim(), type, address: address.trim(), phone: phone.trim() })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-gray-900">Add Business</h2>
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
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                            ) : (
                                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 15V8.25A2.25 2.25 0 0015.75 6H8.25A2.25 2.25 0 006 8.25v7.5A2.25 2.25 0 008.25 18h7.5A2.25 2.25 0 0018 15.75z" />
                                </svg>
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Logo (optional)</label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                                >
                                    {logoFile ? 'Change' : 'Upload'}
                                </button>
                                {logoFile && (
                                    <button
                                        type="button"
                                        onClick={clearLogo}
                                        className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
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
                            {saving ? 'Saving...' : 'Add Business'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}