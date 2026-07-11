import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'

type LocationState = {
    preview?: string
    fileName?: string
}

const categoryOptions = [
    'Office Supplies',
    'Food & Dining',
    'Travel',
    'Utilities',
    'Software',
    'Marketing',
    'Other',
]

export default function ScanReview() {
    const navigate = useNavigate()
    const location = useLocation()
    const state = (location.state as LocationState) || {}

    // TODO: replace these placeholder defaults with the real values
    // returned by the OCR/extraction API once it's wired up
    const [business, setBusiness] = useState('TechStore')
    const [amount, setAmount] = useState('2450')
    const [date, setDate] = useState('2024-07-10')
    const [category, setCategory] = useState('Office Supplies')
    const [notes, setNotes] = useState('')

    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setSaving(true)

        // TODO: POST { business, amount, date, category, notes, image } to API
        await new Promise((resolve) => setTimeout(resolve, 600))

        setSaving(false)
        navigate('/')
    }

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Review your receipt</h1>
                <p className="text-sm text-gray-400 mt-1">Confirm the details we found, or make changes below.</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    </span>
                    <span className="text-sm font-medium text-gray-400">Upload</span>
                </div>
                <div className="w-8 h-px bg-gray-200" />
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
                        2
                    </span>
                    <span className="text-sm font-semibold text-gray-900">Review</span>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
                {/* Receipt preview */}
                <div>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 h-full min-h-[320px] flex items-center justify-center">
                        {state.preview ? (
                            <img src={state.preview} alt="Receipt" className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-center px-6">
                                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 10.5h.008v.008H18V10.5zm-12-6h12a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0118 18.75H6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 016 4.5z" />
                                </svg>
                                <p className="text-xs text-gray-400">No image · go back to upload one</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Editable extracted data */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286z" />
                        </svg>
                        We've filled in what we could find. Double check before saving.
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Business</label>
                        <input
                            type="text"
                            value={business}
                            onChange={(e) => setBusiness(e.target.value)}
                            className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount (PKR)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 appearance-none"
                        >
                            {categoryOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Add any extra context..."
                            className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400 resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/scan')}
                            className="flex-1 border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 text-sm font-semibold rounded-lg py-2.5"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-white text-sm font-semibold rounded-lg py-2.5"
                        >
                            {saving ? 'Saving...' : 'Save receipt'}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    )
}