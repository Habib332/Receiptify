import { useEffect, useState, useCallback } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function authHeaders() {
    const token = sessionStorage.getItem('token')
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

type JoinRequest = {
    request_id: number
    business_id: number
    user_id: number
    requested_role: 'manager' | 'staff'
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    user_name: string
    user_email: string
}

type Props = {
    businessId: number
}

function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

export default function JoinRequestsReviewList({ businessId }: Props) {
    const [requests, setRequests] = useState<JoinRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // Tracks which request_id currently has an approve/reject call in
    // flight, so only that row's buttons disable rather than the whole list.
    const [pendingActionId, setPendingActionId] = useState<number | null>(null)

    const fetchRequests = useCallback(async () => {
        setError(null)
        try {
            const res = await fetch(`${API_BASE_URL}/business/${businessId}/join-requests`, {
                headers: authHeaders(),
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body?.message || 'Failed to load join requests')
            setRequests(body.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }, [businessId])

    useEffect(() => {
        fetchRequests()
    }, [fetchRequests])

    async function handleDecision(requestId: number, decision: 'approve' | 'reject') {
        setPendingActionId(requestId)
        setError(null)
        try {
            const res = await fetch(
                `${API_BASE_URL}/business/${businessId}/join-requests/${requestId}/${decision}`,
                { method: 'PATCH', headers: authHeaders() },
            )
            const body = await res.json()
            if (!res.ok) throw new Error(body?.message || `Failed to ${decision} request`)

            // Optimistically drop it from the pending list rather than
            // refetching — the request is no longer 'pending' either way.
            setRequests((prev) => prev.filter((r) => r.request_id !== requestId))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setPendingActionId(null)
        }
    }

    return (
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Pending join requests</h3>
            </div>

            {error && (
                <p className="mx-5 mt-4 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="divide-y divide-gray-100">
                {loading && (
                    <div className="px-5 py-10 text-center text-sm text-gray-400">Loading requests...</div>
                )}

                {!loading && requests.length === 0 && (
                    <div className="px-5 py-10 text-center text-sm text-gray-400">No pending requests.</div>
                )}

                {requests.map((r) => {
                    const isActing = pendingActionId === r.request_id
                    return (
                        <div key={r.request_id} className="px-5 py-4 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-semibold text-sm">
                                {r.user_name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{r.user_name}</p>
                                <p className="text-xs text-gray-400 truncate">{r.user_email}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Wants to join as{' '}
                                    <span className="font-medium capitalize">{r.requested_role}</span> ·{' '}
                                    {timeAgo(r.created_at)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleDecision(r.request_id, 'reject')}
                                    disabled={isActing}
                                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleDecision(r.request_id, 'approve')}
                                    disabled={isActing}
                                    className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-colors"
                                >
                                    {isActing ? '...' : 'Approve'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}