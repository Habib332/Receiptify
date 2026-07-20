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

// Matches the raw `SELECT * FROM receipts` row shape returned by
// receipts.repository.js (pool.query results are NOT camelCased —
// these are the literal Postgres column names).
interface Receipt {
    receipt_id: number | string
    amount: string | number | null
    currency: string
    receipt_date: string | null
    notes: string | null
    image_url: string | null
    sender_name: string | null
    sender_bank: string | null
    receiver_name: string | null
    receiver_bank: string | null
    transaction_reference: string | null
    duplicate_status: 'none' | 'flagged' | 'confirmed_duplicate' | 'not_duplicate' | null
}

type LocationState = {
    receipt?: Receipt
}

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

    // "Business" is just the receiver — the payee/vendor on the receipt.
    // Single field now; there's no separate vendor_name column anymore.
    const [receiverName, setReceiverName] = useState((initialReceipt.receiver_name || '').toUpperCase())
    const [amount, setAmount] = useState(
        initialReceipt.amount != null ? String(initialReceipt.amount) : '',
    )
    const [date, setDate] = useState(toDateInputValue(initialReceipt.receipt_date))
    const [notes, setNotes] = useState(initialReceipt.notes || '')

    // Sender / receiver-bank details from the transfer-style OCR schema
    const [senderName, setSenderName] = useState((initialReceipt.sender_name || '').toUpperCase())
    const [senderBank, setSenderBank] = useState(initialReceipt.sender_bank || '')
    const [receiverBank, setReceiverBank] = useState(initialReceipt.receiver_bank || '')
    const [transactionReference, setTransactionReference] = useState(
        initialReceipt.transaction_reference || '',
    )

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Track which fields the user has actually touched, so a poll update
    // never clobbers something they've already typed over.
    const touched = useRef({
        receiverName: false,
        amount: false,
        date: false,
        notes: false,
        senderName: false,
        senderBank: false,
        receiverBank: false,
        transactionReference: false,
    })

    // The receipt's image_url field (set by the backend) is only ever a
    // private Supabase Storage PATH — e.g. "42/173-abc.png" — never a
    // directly-viewable URL. Viewing it requires a short-lived signed URL,
    // fetched on demand from GET /receipts/:id/image-url and never cached
    // beyond this component's lifetime (see receiptsStorage.js).
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        if (!receipt.image_url) return

        let cancelled = false
        setImageError(false)

        const fetchImageUrl = async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/receipts/${receipt.receipt_id}/image-url`,
                    { headers: authHeaders() },
                )
                const result = await res.json()
                if (!res.ok || !result.success) throw new Error()
                if (!cancelled) setImageUrl(result.data.signedUrl)
            } catch {
                if (!cancelled) setImageError(true)
            }
        }

        fetchImageUrl()

        return () => {
            cancelled = true
        }
        // Re-fetch if the receipt swaps to a different image (e.g. once
        // OCR polling below replaces `receipt` with an updated row).
    }, [receipt.receipt_id, receipt.image_url])

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

                if (!touched.current.receiverName && updated.receiver_name) {
                    setReceiverName(updated.receiver_name.toUpperCase())
                }
                if (!touched.current.amount && updated.amount != null) {
                    setAmount(String(updated.amount))
                }
                if (!touched.current.date && updated.receipt_date) {
                    setDate(toDateInputValue(updated.receipt_date))
                }
                if (!touched.current.senderName && updated.sender_name) {
                    setSenderName(updated.sender_name.toUpperCase())
                }
                if (!touched.current.senderBank && updated.sender_bank) {
                    setSenderBank(updated.sender_bank)
                }
                if (!touched.current.receiverBank && updated.receiver_bank) {
                    setReceiverBank(updated.receiver_bank)
                }
                if (!touched.current.transactionReference && updated.transaction_reference) {
                    setTransactionReference(updated.transaction_reference)
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
    const isPossibleDuplicate = receipt.duplicate_status === 'flagged'

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')

        if (!receiverName.trim()) {
            setError('Receiver name is required')
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
                    receiverName: receiverName.trim().toUpperCase(),
                    amount: Number(amount),
                    receiptDate: date,
                    notes: notes.trim(),
                    senderName: senderName.trim().toUpperCase() || undefined,
                    senderBank: senderBank.trim() || undefined,
                    receiverBank: receiverBank.trim() || undefined,
                    transactionReference: transactionReference.trim() || undefined,
                }),
            })

            const result = await res.json()

            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Failed to save receipt')
            }

            navigate('/scan')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save receipt')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Review your receipt</h1>
                    <p className="text-sm text-gray-400 mt-1.5">Confirm the details we found, or make changes below.</p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold flex items-center justify-center ring-1 ring-blue-100">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium text-gray-400">Upload</span>
                    </div>
                    <div className="w-10 h-px bg-gray-200" />
                    <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center shadow-sm shadow-blue-200">
                            2
                        </span>
                        <span className="text-sm font-semibold text-gray-900">Review</span>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                    {/* Receipt preview */}
                    <div className="md:sticky md:top-6">
                        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 aspect-[3/4] md:aspect-auto md:h-[520px] flex items-center justify-center shadow-sm">
                            {imageUrl ? (
                                <img src={imageUrl} alt="Receipt" className="w-full h-full object-contain" />
                            ) : receipt.image_url && !imageError ? (
                                <div className="text-center px-6">
                                    <svg className="w-6 h-6 text-gray-300 mx-auto mb-2.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    <p className="text-xs text-gray-400">Loading image...</p>
                                </div>
                            ) : (
                                <div className="text-center px-6">
                                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 10.5h.008v.008H18V10.5zm-12-6h12a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0118 18.75H6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 016 4.5z" />
                                    </svg>
                                    <p className="text-xs text-gray-400">
                                        {imageError ? "Couldn't load image" : 'No image · go back to upload one'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Editable extracted data */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isPossibleDuplicate && (
                            <div className="flex items-start gap-2.5 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-3.5 py-3">
                                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                                <span>This looks similar to a receipt you've already added to this business. Double check it isn't a duplicate before saving.</span>
                            </div>
                        )}

                        {stillProcessing ? (
                            <div className="flex items-center gap-2.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
                                <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                <span>Reading your receipt — this updates automatically, usually within a few seconds.</span>
                            </div>
                        ) : showTimeoutNotice ? (
                            <div className="flex items-center gap-2.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                                <span>Couldn't read this one automatically — please fill in the details below.</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5 text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-3.5 py-3">
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286z" />
                                </svg>
                                <span>We've filled in what we could find. Double check before saving.</span>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3">
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

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
                                    placeholder="0.00"
                                    className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none transition-shadow focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
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
                                    className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none transition-shadow focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                        </div>

                        <div className="pt-1">
                            <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                                </svg>
                                Transfer details
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Receiver name</label>
                                    <input
                                        type="text"
                                        value={receiverName}
                                        onChange={(e) => {
                                            touched.current.receiverName = true
                                            setReceiverName(e.target.value.toUpperCase())
                                        }}
                                        placeholder="Who was paid"
                                        className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none transition-shadow focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Receiver bank</label>
                                    <input
                                        type="text"
                                        value={receiverBank}
                                        onChange={(e) => {
                                            touched.current.receiverBank = true
                                            setReceiverBank(e.target.value)
                                        }}
                                        placeholder="Bank name"
                                        className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none transition-shadow focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Sender name</label>
                                    <input
                                        type="text"
                                        value={senderName}
                                        onChange={(e) => {
                                            touched.current.senderName = true
                                            setSenderName(e.target.value.toUpperCase())
                                        }}
                                        placeholder="Who sent it"
                                        className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none transition-shadow focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Sender bank</label>
                                    <input
                                        type="text"
                                        value={senderBank}
                                        onChange={(e) => {
                                            touched.current.senderBank = true
                                            setSenderBank(e.target.value)
                                        }}
                                        placeholder="Bank name"
                                        className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none transition-shadow focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Transaction reference</label>
                                    <input
                                        type="text"
                                        value={transactionReference}
                                        onChange={(e) => {
                                            touched.current.transactionReference = true
                                            setTransactionReference(e.target.value)
                                        }}
                                        placeholder="Optional reference / IBAN / txn ID"
                                        className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none transition-shadow focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
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
                                className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none transition-shadow focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400 resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-3 sticky bottom-0 bg-white/80 backdrop-blur-sm -mx-1 px-1 pb-1">
                            <button
                                type="button"
                                onClick={() => navigate('/scan')}
                                className="flex-1 border border-gray-200 hover:bg-gray-50 active:scale-[0.99] transition-all text-gray-700 text-sm font-semibold rounded-lg py-2.5"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 active:scale-[0.99] transition-all text-white text-sm font-semibold rounded-lg py-2.5 shadow-sm shadow-blue-200 disabled:shadow-none"
                            >
                                {saving ? 'Saving...' : 'Save receipt'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    )
}