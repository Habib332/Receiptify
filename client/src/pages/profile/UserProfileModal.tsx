import { useEffect, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

type BusinessEntry = {
    business_id: number
    name: string
    type: string | null
    logo_url: string | null
    receipts_count: number
}

type ReceiptsByBusiness = {
    business_id: number
    name: string
    receipts_count: number
}

type ProfileData = {
    user: {
        user_id: number
        name: string
        email: string
        avatar_url: string | null
        created_at: string
    }
    businesses: {
        owner: BusinessEntry[]
        manager: BusinessEntry[]
        staff: BusinessEntry[]
        owner_count: number
        manager_count: number
        staff_count: number
    }
    receipts: {
        submitted_total: number
        by_business: ReceiptsByBusiness[]
    }
}

type Props = {
    onClose: () => void
}

function getToken() {
    return sessionStorage.getItem('token')
}

function authHeaders() {
    const token = getToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatJoinDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
}

/**
 * Stat card with a hover-to-reveal dropdown listing the underlying
 * businesses. Reused for Owner / Manager & Staff / Receipts Submitted so
 * the three cards stay visually and behaviorally consistent.
 */
function HoverStatCard({
    icon,
    bg,
    color,
    label,
    value,
    sub,
    items,
    emptyLabel,
}: {
    icon: React.ReactNode
    bg: string
    color: string
    label: string
    value: number
    sub: string
    items: { key: number; name: string; meta: string }[]
    emptyLabel: string
}) {
    const [open, setOpen] = useState(false)

    return (
        <div
            className="relative border border-gray-100 rounded-2xl p-4"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <div className={`w-9 h-9 rounded-lg ${bg} ${color} flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>

            {open && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-2 max-h-64 overflow-y-auto">
                    {items.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-400">{emptyLabel}</p>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.key}
                                className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50"
                            >
                                <span className="text-xs font-medium text-gray-700 truncate">{item.name}</span>
                                <span className="text-[10px] text-gray-400 shrink-0">{item.meta}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

export default function UserProfileModal({ onClose }: Props) {
    const [data, setData] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false

        async function fetchProfile() {
            try {
                setLoading(true)
                const res = await fetch(`${API_BASE_URL}/users/me/profile`, {
                    method: 'GET',
                    headers: authHeaders(),
                })

                const json = await res.json()

                if (!res.ok || !json.success) {
                    throw new Error(json.message || 'Failed to load profile')
                }

                if (!cancelled) setData(json.data)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load profile')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchProfile()
        return () => {
            cancelled = true
        }
    }, [])

    const managerAndStaff = data
        ? [...data.businesses.manager, ...data.businesses.staff]
        : []

    return (
        <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">Profile</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading && (
                    <div className="px-6 py-14 text-center text-sm text-gray-400">Loading profile...</div>
                )}

                {!loading && error && (
                    <div className="px-6 py-6">
                        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    </div>
                )}

                {!loading && !error && data && (
                    <div className="px-6 py-5">
                        {/* Identity block */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {data.user.avatar_url ? (
                                    <img
                                        src={data.user.avatar_url}
                                        alt={data.user.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-blue-600 text-base font-semibold">
                                        {getInitials(data.user.name)}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{data.user.name}</p>
                                <p className="text-xs text-gray-400 truncate">{data.user.email}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Joined {formatJoinDate(data.user.created_at)}
                                </p>
                            </div>
                        </div>

                        {/* Stat cards */}
                        <div className="grid grid-cols-1 gap-3">
                            <HoverStatCard
                                label="Businesses Owned"
                                value={data.businesses.owner_count}
                                sub={data.businesses.owner_count === 1 ? 'business' : 'businesses'}
                                bg="bg-blue-50"
                                color="text-blue-600"
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                }
                                items={data.businesses.owner.map((b) => ({
                                    key: b.business_id,
                                    name: b.name,
                                    meta: `${b.receipts_count} receipts`,
                                }))}
                                emptyLabel="Not an owner of any business yet."
                            />

                            <HoverStatCard
                                label="Manager / Staff Roles"
                                value={data.businesses.manager_count + data.businesses.staff_count}
                                sub={`${data.businesses.manager_count} manager · ${data.businesses.staff_count} staff`}
                                bg="bg-purple-50"
                                color="text-purple-600"
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                    </svg>
                                }
                                items={managerAndStaff.map((b) => ({
                                    key: b.business_id,
                                    name: b.name,
                                    meta: b.receipts_count + ' receipts',
                                }))}
                                emptyLabel="Not a manager or staff member anywhere yet."
                            />

                            <HoverStatCard
                                label="Receipts Submitted"
                                value={data.receipts.submitted_total}
                                sub="across all businesses"
                                bg="bg-green-50"
                                color="text-green-600"
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6 15.75h-6a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25h4.5l5.25 5.25v9.75a2.25 2.25 0 01-2.25 2.25z" />
                                    </svg>
                                }
                                items={data.receipts.by_business.map((b) => ({
                                    key: b.business_id,
                                    name: b.name,
                                    meta: `${b.receipts_count} receipts`,
                                }))}
                                emptyLabel="No receipts submitted yet."
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
