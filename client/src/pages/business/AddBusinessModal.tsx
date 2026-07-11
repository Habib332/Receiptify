import { useState, type FormEvent } from 'react'
import { businessTypes } from './BusinessIcons'

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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setSaving(true)

        // TODO: POST { name, type, address, phone } to API
        await new Promise((resolve) => setTimeout(resolve, 500))

        onSave({ name, type, address, phone })
        setSaving(false)
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Business name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Metro Store"
                            required
                            className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                        />
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
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="e.g. Main Boulevard, Lahore"
                            required
                            className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. +92 300 1234567"
                            required
                            className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                        />
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