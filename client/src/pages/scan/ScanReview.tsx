// ScanReview.tsx
import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function getToken() {
    return sessionStorage.getItem('token')
}

function authHeaders() {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}

interface Receipt {
    receipt_id: number | string
    vendor_name: string
    amount: string | number | null
    currency: string
    receipt_date: string | null
    notes: string | null
    image_url: string | null
}

type LocationState = {
    receipt?: Receipt
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

// Receipts don't have a "category" column on the backend (see
// receipts.repository.js) — this stays purely local/cosmetic for now and
// is folded into notes on save so it isn't silently dropped.
function toDateInputValue(value: string | null | undefined) {
    if (!value) return ''
    // receipt_date may come back as a full ISO timestamp; <input type="date">
    // wants just YYYY-MM-DD
    return value.slice(0, 10)
}

// OCR runs fire-and-forget on the backend (runOcrForReceipt is kicked off
// after POST /receipts already responds) — so the receipt object we get
// from router state is a snapshot from before OCR finishes. We poll
// GET /receipts/:id until amount + receipt_date are populated (or we give
// up) rather than relying on that one-time snapshot forever.
const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 30000

export default function ScanReview() {
    const navigate = useNavigate()
    const location = useLocation()
    const state = (location.state as LocationState) || {}
    const initialReceipt = state.receipt

    // If someone lands here directly (refresh, back button) with no
    // receipt in router state, there's nothing to review — bounce back
    // to the upload step rather than showing fabricated placeholder data.
    if (!initialReceipt) {
        navigate('/scan', { replace: true })
        return null
    }

    const [receipt, setReceipt] = useState<Receipt>(initialReceipt)
    const [polling, setPolling] = useState(
        initialReceipt.amount == null || initialReceipt.receipt_date == null,
    )
    const [pollTimedOut, setPollTimedOut] = useState(false)

    const [business, setBusiness] = useState(initialReceipt.vendor_name || '')
    const [amount, setAmount] = useState(
        initialReceipt.amount != null ? String(initialReceipt.amount) : '',
    )
    const [date, setDate] = useState(toDateInputValue(initialReceipt.receipt_date))
    const [category, setCategory] = useState(categoryOptions[0])
    const [notes, setNotes] = useState(initialReceipt.notes || '')

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Track which fields the user has actually touched, so a poll update
    // never clobbers something they've already typed over.
    const touched = useRef({ business: false, amount: false, date: false, notes: false })

    useEffect(() => {
        if (!polling) return

        let cancelled = false
        const startedAt = Date.now()

        const tick = async () => {
            if (cancelled) return
            try {
                const res = await fetch(`${API_BASE_URL}/receipts/${receipt.receipt_id}`, {
                    headers: authHeaders(),
                })
                const result = await res.json()
                if (!res.ok || !result.success) return

                const updated: Receipt = result.data
                if (cancelled) return

                setReceipt(updated)

                if (!touched.current.business && updated.vendor_name) {
                    setBusiness(updated.vendor_name)
                }
                if (!touched.current.amount && updated.amount != null) {
                    setAmount(String(updated.amount))
                }
                if (!touched.current.date && updated.receipt_date) {
                    setDate(toDateInputValue(updated.receipt_date))
                }
                if (!touched.current.notes && updated.notes) {
                    setNotes(updated.notes)
                }

                const stillMissing = updated.amount == null || updated.receipt_date == null

                if (!stillMissing) {
                    setPolling(false)
                    return
                }

                if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
                    setPolling(false)
                    setPollTimedOut(true)
                    return
                }

                if (!cancelled) {
                    timer = setTimeout(tick, POLL_INTERVAL_MS)
                }
            } catch {
                // Network blip — keep trying until timeout rather than
                // giving up on the first failed poll.
                if (!cancelled && Date.now() - startedAt < POLL_TIMEOUT_MS) {
                    timer = setTimeout(tick, POLL_INTERVAL_MS)
                }
            }
        }

        let timer = setTimeout(tick, POLL_INTERVAL_MS)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [polling, receipt.receipt_id])

    const stillProcessing = polling
    const showTimeoutNotice = pollTimedOut && (amount === '' || !date)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        if (!business.trim()) {
            setError('Business name is required')
            return
        }
        if (!amount || Number(amount) <= 0) {
            setError('Enter a valid amount')
            return
        }
        if (!date) {
            setError('Date is required')
            return
        }

        setSaving(true)
        try {
            const res = await fetch(`${API_BASE_URL}/receipts/${receipt.receipt_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders(),
                },
                body: JSON.stringify({
                    vendorName: business.trim(),
                    amount: Number(amount),
                    receiptDate: date,
                    notes: category ? `[${category}] ${notes.trim()}`.trim() : notes.trim(),
                }),
            })

            const result = await res.json()

            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Failed to save receipt')
            }

            navigate('/')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save receipt')
        } finally {
            setSaving(false)
        }
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
                        {receipt.image_url ? (
                            <img src={receipt.image_url} alt="Receipt" className="w-full h-full object-contain" />
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
                    {stillProcessing ? (
                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Reading your receipt — this updates automatically, usually within a few seconds.
                        </div>
                    ) : showTimeoutNotice ? (
                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            Couldn't read this one automatically — please fill in the details below.
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286z" />
                            </svg>
                            We've filled in what we could find. Double check before saving.
                        </div>
                    )}

                    {error && (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Business</label>
                        <input
                            type="text"
                            value={business}
                            onChange={(e) => {
                                touched.current.business = true
                                setBusiness(e.target.value)
                            }}
                            className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount (PKR)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    touched.current.amount = true
                                    setAmount(e.target.value)
                                }}
                                className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    touched.current.date = true
                                    setDate(e.target.value)
                                }}
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
                            onChange={(e) => {
                                touched.current.notes = true
                                setNotes(e.target.value)
                            }}
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
