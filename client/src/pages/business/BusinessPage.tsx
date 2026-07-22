import { useState, useEffect, useCallback, useMemo } from 'react'
import Layout from '../../components/Layout'
import { getBusinessIcon, businessTypes } from './BusinessIcons'
import AddBusinessModal from './AddBusinessModal'
import EditBusinessModal from './EditBusinessModal'
import ErrorModal from './ErrorModal'
import JoinBusinessModal from './JoinBusinessModal'
import TypeFilterDropdown from './TypeFilterDropdown'
import NotificationsModal, { type NotificationItem } from './NotificationModal'
import BusinessHeroImage from '../../assets/Business.png'
import DeleteConfirmModal from './DeleteConfirmModal'
import LeaveBusinessModal from './LeaveBusinessModal'
import TeamModal from './TeamModel'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

type Business = {
    id: string
    name: string
    type: string
    address: string
    phone: string
    receipts: number
    totalSpent: string
    logoUrl?: string | null
    // Current user's role for this business ('owner' | 'manager' | 'staff'),
    // or null if they're not a member yet. Drives whether "Join" shows.
    userRole?: string | null
}

type DashboardStats = {
    totalBusinesses: number
    mostUsed: { name: string; receipts: number } | null
    businessTypeCount: number
    totalReceipts: number
}

// Which slice of `businesses` is currently shown in the list.
// 'mine' = businesses the user has a role in (default).
// 'all'  = every business returned by the search/filter, joined or not.
type ViewMode = 'My Businesses' | 'All Businesses'

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

// Reads the userId claim out of the JWT payload stored in sessionStorage.
// Decode-only (no signature verification) — same trust model as the rest
// of the frontend, which already relies on the backend to reject a
// tampered/expired token on every request. Used only to build the
// "leave business" request URL (DELETE /business/:id/members/:memberId
// with the caller's own id) — never used to make an authorization
// decision on the frontend itself, since the backend re-derives role
// from business_users per-business anyway (see business.routes.js
// comments on why the token's role can't be trusted per-business).
function getCurrentUserId(): string | null {
    const token = getToken()
    if (!token) return null
    try {
        const payload = token.split('.')[1]
        // base64url -> base64
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        const decoded = JSON.parse(atob(base64))
        return decoded.userId ?? decoded.id ?? decoded.sub ?? null
    } catch {
        return null
    }
}

// Permission errors (not the owner/manager of a business) come back from
// the API as 401/403 with messages like "You do not have permission to
// perform this action" or "Only the owner or manager can...". These are
// easy to miss as a banner at the top of a long page, so they get routed
// to a modal instead. We match on status code first (reliable), then fall
// back to keyword sniffing on the message in case the API sends 400/200.
function isPermissionError(status: number, message: string) {
    if (status === 401 || status === 403) return true

    const normalized = message.toLowerCase()
    return (
        normalized.includes('permission') ||
        normalized.includes('not the owner') ||
        normalized.includes('not authorized') ||
        normalized.includes('owner or manager') ||
        normalized.includes('unauthorized')
    )
}

export default function BusinessesPage() {
    const navigate = useNavigate()
    const [businesses, setBusinesses] = useState<Business[]>([])
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('All Types')
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null)
    const [joiningBusiness, setJoiningBusiness] = useState<Business | null>(null)
    const [joinLoading, setJoinLoading] = useState(false)
    const [pendingRequestBusinessIds, setPendingRequestBusinessIds] = useState<Set<string>>(new Set())
    const [deletingBusiness, setDeletingBusiness] = useState<Business | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    // Business the user has asked to leave — separate from deletingBusiness
    // since leave (self-removal, staff/manager only) and delete (owner-only,
    // destroys the business) are different actions with different endpoints
    // and different confirmation copy.
    const [leavingBusiness, setLeavingBusiness] = useState<Business | null>(null)
    const [leaveLoading, setLeaveLoading] = useState(false)
    const [viewingTeamBusiness, setViewingTeamBusiness] = useState<Business | null>(null)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    // Default view is "My Businesses" (only ones the user has a role in).
    // Switching to "All Businesses" reveals ones they could still join.
    const [viewMode, setViewMode] = useState<ViewMode>('All Businesses')

    const [loading, setLoading] = useState(false)
    const [statsLoading, setStatsLoading] = useState(false)
    const [error, setError] = useState('')

    // Permission-style errors get their own modal so they can't be missed.
    const [permissionError, setPermissionError] = useState('')

    // Notifications: owners/managers get notified when someone joins their
    // business. Bell icon opens a modal listing them; badge shows unread count.
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [notificationsLoading, setNotificationsLoading] = useState(false)

    const navigateToReceiptsPage = (biz: Business) => {
        navigate('/dashboard', {
            state: {
                businessId: biz.id,
            },
        })
    }

    const fetchBusinesses = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            if (typeFilter !== 'All Types') params.set('type', typeFilter)

            const res = await fetch(`${API_BASE_URL}/business?${params.toString()}`, {
                method: 'GET',
                headers: authHeaders(),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to load businesses')
            }

            // Backend returns business_id (raw Postgres column), not id —
            // map it here so the rest of the component can rely on biz.id.
            // Also normalize logo_url -> logoUrl and user_role -> userRole
            // for the same reason.
            setBusinesses(
                (data.data || []).map((b: any) => ({
                    ...b,
                    id: b.id ?? b.business_id,
                    logoUrl: b.logoUrl ?? b.logo_url ?? null,
                    userRole: b.userRole ?? b.user_role ?? null,
                }))
            )
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }, [search, typeFilter])

    const fetchStats = useCallback(async () => {
        setStatsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/business/stats`, {
                method: 'GET',
                headers: authHeaders(),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to load stats')
            }

            setStats(data.data)
        } catch (err) {
            // Stats failure shouldn't block the page; surface silently in console
            console.error(err)
        } finally {
            setStatsLoading(false)
        }
    }, [])

    // Fetches the current user's notifications (e.g. "X joined your
    // business"). Normalizes id/created_at/is_read the same way the other
    // fetchers normalize raw Postgres columns.
    const fetchNotifications = useCallback(async () => {
        setNotificationsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/notifications`, {
                method: 'GET',
                headers: authHeaders(),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to load notifications')
            }

            setNotifications(
                (data.data || []).map((n: any) => ({
                    ...n,
                    id: n.id ?? n.notification_id,
                    businessName: n.businessName ?? n.business_name ?? null,
                    actorName: n.actorName ?? n.actor_name ?? null,
                    actorEmail: n.actorEmail ?? n.actor_email ?? null,
                    createdAt: n.createdAt ?? n.created_at,
                    read: n.read ?? n.is_read ?? false,
                }))
            )
        } catch (err) {
            // Notifications failure shouldn't block the page
            console.error(err)
        } finally {
            setNotificationsLoading(false)
        }
    }, [])

    // Debounce search so we don't fire a request on every keystroke
    useEffect(() => {
        const handle = setTimeout(() => {
            fetchBusinesses()
        }, 300)
        return () => clearTimeout(handle)
    }, [fetchBusinesses])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    // Load notifications on mount and poll periodically so the bell badge
    // stays current even if the user leaves the tab idle.
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    // The "Business Types" stat should reflect how many *distinct* types are
    // actually in use among the user's businesses — not the full static
    // catalog in BusinessIcons, and not silently blank if the stats API
    // doesn't return businessTypeCount. We compute this client-side from
    // the loaded businesses and prefer it, since it's always accurate for
    // what's currently loaded; the API value is used only if we have no
    // businesses loaded yet (e.g. right after login, before the list fetch
    // resolves) so the card doesn't flash 0.
    // Close the row action menu on outside click, since it's a lightweight
    // dropdown rather than a modal (no backdrop to catch the click).
    useEffect(() => {
        if (!openMenuId) return
        const handleClick = () => setOpenMenuId(null)
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [openMenuId])

    const distinctTypeCount = useMemo(() => {
        const unique = new Set(businesses.map((b) => b.type).filter(Boolean))
        return unique.size
    }, [businesses])

    const businessTypeCountDisplay = businesses.length > 0
        ? distinctTypeCount
        : stats?.businessTypeCount ?? 0

    // "My Businesses" is the default list view: only businesses the user
    // already has a role in (owner/manager/staff). "All Businesses" shows
    // everything the current search/type filter matched, joined or not —
    // that's the view used to discover and join new businesses. This is
    // computed client-side off the already-fetched `businesses` array, so
    // toggling is instant and doesn't require a new request.
    const displayedBusinesses = useMemo(() => {
        return viewMode === 'My Businesses'
            ? businesses.filter((b) => !!b.userRole)
            : businesses
    }, [businesses, viewMode])

    const unreadNotificationCount = notifications.filter((n) => !n.read).length

    const handleAddBusiness = async (data: { name: string; type: string; address: string; phone: string }) => {
        setError('')
        // AddBusinessModal already performed the POST /business (and any
        // logo upload) itself so it could get the new id for the logo
        // request. Here we just close the modal and refresh the list/stats.
        setShowAddModal(false)
        await fetchBusinesses()
        await fetchStats()
    }
    const handleDelete = async (id: string) => {
        setError('')
        setDeleteLoading(true)
        // Optimistic update
        const prevBusinesses = businesses
        setBusinesses((prev) => prev.filter((b) => b.id !== id))

        try {
            const res = await fetch(`${API_BASE_URL}/business/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
                body: JSON.stringify({ confirm: true }),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                const message = data.message || 'Failed to delete business'
                setBusinesses(prevBusinesses)

                if (isPermissionError(res.status, message)) {
                    setPermissionError(
                        "You can't delete this business because you're not the owner or manager. Ask an owner or manager to do this instead."
                    )
                    return
                }

                throw new Error(message)
            }

            await fetchStats()
        } catch (err) {
            setBusinesses(prevBusinesses)
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setDeleteLoading(false)
            setDeletingBusiness(null)
        }
    }

    // Leave flow: staff/manager only (never owner — enforced both here via
    // the menu item being hidden, and should also be enforced server-side).
    // Hits DELETE /business/:businessId/members/:memberId with the current
    // user's own id, reusing the existing "remove member" endpoint rather
    // than a dedicated /leave route — self-removal is just a member removal
    // where the actor and the target are the same person.
    const handleLeave = async (id: string) => {
        setError('')
        setLeaveLoading(true)

        const currentUserId = getCurrentUserId()
        if (!currentUserId) {
            setLeaveLoading(false)
            setError('Could not determine your account. Please sign in again.')
            return
        }

        // Optimistic update
        const prevBusinesses = businesses
        setBusinesses((prev) => prev.filter((b) => b.id !== id))

        try {
            const res = await fetch(`${API_BASE_URL}/business/${id}/members/${currentUserId}`, {
                method: 'DELETE',
                headers: authHeaders(),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                const message = data.message || 'Failed to leave business'
                setBusinesses(prevBusinesses)

                if (isPermissionError(res.status, message)) {
                    setPermissionError(
                        "You can't leave this business right now. If you're the owner, ownership must be transferred first."
                    )
                    return
                }

                throw new Error(message)
            }

            await fetchStats()
        } catch (err) {
            setBusinesses(prevBusinesses)
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLeaveLoading(false)
            setLeavingBusiness(null)
        }
    }

    const handleUpdate = async (id: string, data: Partial<{ name: string; type: string; address: string; phone: string }>) => {
        setError('')
        try {
            const res = await fetch(`${API_BASE_URL}/business/${id}`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify(data),
            })

            const result = await res.json()

            if (!res.ok || !result.success) {
                const message = result.message || 'Failed to update business'

                if (isPermissionError(res.status, message)) {
                    setEditingBusiness(null)
                    setPermissionError(
                        "You can't edit this business because you're not the owner or manager. Ask an owner or manager to make this change."
                    )
                    return
                }

                throw new Error(message)
            }

            setEditingBusiness(null)
            await fetchBusinesses()
            await fetchStats()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        }
    }

    // Join flow: clicking "Join" opens a confirmation modal first (rather
    // than joining immediately) since it changes the user's membership and
    // is not easily undone from this screen. Role defaults to "staff" on
    // the backend — there is no role picker here on purpose.
    //
    // On success, the backend is expected to create a notification for the
    // business's owner ("X joined your business"). We refresh notifications
    // here too so that if the current user shares a session with the owner
    // view (e.g. testing as owner in the same browser), the bell updates.
    const handleJoin = async (requestedRole: 'manager' | 'staff') => {
        if (!joiningBusiness) return
        setJoinLoading(true)
        setError('')

        try {
            const res = await fetch(`${API_BASE_URL}/business/${joiningBusiness.id}/join-requests`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ requestedRole }),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                const message = data.message || 'Failed to send join request'
                setJoiningBusiness(null)

                if (isPermissionError(res.status, message)) {
                    setPermissionError(message)
                    return
                }

                // "You already have a pending request" (409) lands here too —
                // surfaced as a normal inline error rather than the permission
                // modal, since it's not a permissions problem.
                setError(message)
                return
            }

            setPendingRequestBusinessIds((prev) => new Set(prev).add(joiningBusiness.id))
            setJoiningBusiness(null)
            // No fetchBusinesses/fetchStats here — a pending request doesn't
            // change membership or receipt counts yet, only approval does.
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setJoinLoading(false)
        }
    }

    const handleMarkNotificationRead = async (id: string) => {
        // Optimistic
        const prev = notifications
        setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
                method: 'PATCH',
                headers: authHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to mark notification as read')
            }
        } catch (err) {
            setNotifications(prev)
            console.error(err)
        }
    }

    const handleMarkAllNotificationsRead = async () => {
        const prev = notifications
        setNotifications((p) => p.map((n) => ({ ...n, read: true })))
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
                method: 'PATCH',
                headers: authHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to mark notifications as read')
            }
        } catch (err) {
            setNotifications(prev)
            console.error(err)
        }
    }

    // Called by NotificationsModal after it successfully approves/rejects a
    // join request inline. The API call itself already happened inside the
    // modal — this just reconciles this page's state afterward:
    //  - the notification's joinRequest.status flips so the modal stops
    //    showing Approve/Reject for it (it's already resolved)
    //  - businesses/stats refetch, since an approval changes membership
    //    (and, if it's the current user's own business list, receipt/role
    //    counts can shift too)
    const handleNotificationDecisionMade = async (notificationId: string, decision: 'approve' | 'reject') => {
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === notificationId && n.joinRequest
                    ? {
                        ...n,
                        read: true,
                        joinRequest: {
                            ...n.joinRequest,
                            status: decision === 'approve' ? 'approved' : 'rejected',
                        },
                    }
                    : n
            )
        )
        await Promise.all([fetchBusinesses(), fetchStats()])
    }

    const overviewStats = [
        {
            label: 'Total Businesses',
            value: statsLoading && businesses.length === 0 ? '—' : String(stats?.totalBusinesses ?? businesses.length),
            sub: 'Saved',
            bg: 'bg-blue-50',
            color: 'text-blue-600',
        },
        {
            label: 'Most Used',
            value: statsLoading ? '—' : stats?.mostUsed?.name ?? '—',
            sub: stats?.mostUsed ? `${stats.mostUsed.receipts} receipts` : '',
            bg: 'bg-green-50',
            color: 'text-green-600',
        },
        {
            label: 'Business Types',
            value: statsLoading && businesses.length === 0 ? '—' : String(businessTypeCountDisplay),
            sub: 'Categories',
            bg: 'bg-orange-50',
            color: 'text-orange-500',
        },
        {
            label: 'Total Receipts',
            value: statsLoading ? '—' : String(stats?.totalReceipts ?? '—'),
            sub: 'Across all businesses',
            bg: 'bg-purple-50',
            color: 'text-purple-500',
        },
    ]

    return (
        <Layout>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
                    <p className="text-sm text-gray-400 mt-1">Manage all your saved businesses in one place.</p>
                </div>
                <button
                    onClick={() => {
                        setShowNotifications(true)
                        fetchNotifications()
                    }}
                    className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    {unreadNotificationCount > 0 && (
                        <span className="absolute top-1 right-1.5 min-w-[14px] h-[14px] px-0.5 bg-red-500 rounded-full text-[9px] leading-[14px] text-white text-center">
                            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                        </span>
                    )}
                </button>
            </div>

            {error && (
                <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            {/* Hero banner */}
            <div className="bg-blue-50/60 rounded-2xl px-8 py-8 mb-6 flex items-center justify-between overflow-hidden">
                <div className="max-w-sm">
                    <h2 className="text-2xl font-bold text-gray-900">
                        All your businesses, <span className="text-blue-600">organized</span>.
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 mb-5">
                        Search, manage, and keep track of all your businesses in one place.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold rounded-lg px-4 py-2.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Business
                    </button>
                </div>
                <div className="hidden md:flex shrink-0 w-80 h-56 items-center justify-center">
                    <img
                        src={BusinessHeroImage}
                        alt="Business owner managing businesses"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {overviewStats.map((stat) => (
                    <div key={stat.label} className="border border-gray-100 rounded-2xl p-4">
                        <div className={`w-9 h-9 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-6`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25M12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                        <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Search + filter + add */}
            <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search businesses..."
                        className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                    />
                </div>

                <TypeFilterDropdown value={typeFilter} options={businessTypes} onChange={setTypeFilter} />

                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Business
                </button>
            </div>

            {/* My Businesses / All Businesses toggle. Compact segmented
               control, right-aligned under the search/filter/add row, since
               it's a view switch rather than a primary action. "My
               Businesses" (default) shows rows with a userRole; "All
               Businesses" shows everything the search/filter matched,
               including businesses not yet joined. */}
            <div className="flex justify-start mb-4">
              <div className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-300 transition-colors text-gray-800 text-sm font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap">
                    <button
                        onClick={() => setViewMode('My Businesses')}
                        aria-pressed={viewMode === 'My Businesses'}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold transition-all ${
                            viewMode === 'My Businesses'
                                ? 'bg-blue-600 text-white shadow-sm border-gray-400'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        My Businesses
                        <span
                            className={`text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                                viewMode === 'My Businesses' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'
                            }`}
                        >
                            {businesses.filter((b) => !!b.userRole).length}
                        </span>
                    </button>

                    <button
                        onClick={() => setViewMode('All Businesses')}
                        aria-pressed={viewMode === 'All Businesses'}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold transition-all ${
                            viewMode === 'All Businesses'
                                ? 'bg-blue-600 text-white shadow-sm border-gray-400'
                                : 'text-gray-500 hover:text-gray-700 border-gray-400'
                        }`}
                    >
                        All Businesses
                        <span
                            className={`text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                                viewMode === 'All Businesses' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'
                            }`}
                        >
                            {businesses.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Business list */}
            <div className="border border-gray-100 rounded-2xl divide-y divide-gray-100 mb-4">
                {loading && displayedBusinesses.length === 0 && (
                    <div className="px-5 py-10 text-center text-sm text-gray-400">Loading businesses...</div>
                )}

                {!loading && displayedBusinesses.length === 0 && (
                    <div className="px-5 py-10 text-center text-sm text-gray-400">
                        {viewMode === 'My Businesses'
                            ? "You haven't joined any businesses yet. Switch to \"All Businesses\" to find one."
                            : 'No businesses found.'}
                    </div>
                )}

                {displayedBusinesses.map((biz) => {
                    const { bg, color, icon } = getBusinessIcon(biz.type)
                    // Only show Join when the user has no role at all for this
                    // business — owners, managers, and existing staff already
                    // belong, so Join would be meaningless (or worse, a way
                    // to accidentally re-trigger membership logic) for them.
                    const hasJoined = !!biz.userRole
                    const hasPendingRequest = pendingRequestBusinessIds.has(biz.id)
                    const joinButtonDisabled = hasJoined || hasPendingRequest
                    // Leave is only meaningful (and only allowed) for
                    // managers/staff — an owner leaving their own business
                    // makes no sense without a separate ownership-transfer
                    // flow, so the option is hidden entirely for owners
                    // rather than shown-then-rejected by the API.
                    const canLeave = biz.userRole === 'manager' || biz.userRole === 'staff'
                    return (
                        <div key={biz.id} className="flex items-center gap-4 px-5 py-4">
                            <div className={`w-10 h-10 rounded-lg ${biz.logoUrl ? 'bg-gray-100' : bg} ${color} flex items-center justify-center shrink-0 overflow-hidden`}>
                                {biz.logoUrl ? (
                                    <img src={biz.logoUrl} alt={`${biz.name} logo`} className="w-full h-full object-cover" />
                                ) : (
                                    icon
                                )}
                            </div>

                            <div className="w-48 shrink-0">
                                <p className="text-sm font-semibold text-gray-900">{biz.name}</p>
                                <p className="text-xs text-gray-400">{biz.type}</p>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                    </svg>
                                    <span className="truncate">{biz.address}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                    </svg>
                                    <span>{biz.phone}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 rounded-lg px-3 py-2 shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6 15.75h-6a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25h4.5l5.25 5.25v9.75a2.25 2.25 0 01-2.25 2.25z" />
                                </svg>
                                <div className="leading-tight">
                                    <button className="text-sm font-semibold capitalize" onClick={() => navigateToReceiptsPage(biz)}>
                                        Receipts
                                    </button>
                                </div>
                            </div>

                            {biz.userRole && (
                                <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-lg px-3 py-2 shrink-0">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <div className="leading-tight">
                                        <p className="text-sm font-semibold capitalize">{biz.userRole}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    disabled={joinButtonDisabled}
                                    onClick={() => {
                                        if (!joinButtonDisabled) {
                                            setJoiningBusiness(biz)
                                        }
                                    }}
                                    className={`min-w-[96px] h-8 rounded-lg text-sm font-medium flex items-center justify-center transition-colors border
        ${joinButtonDisabled
                                            ? 'bg-white text-blue-600 border-blue-600 cursor-default'
                                            : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    {hasJoined ? 'Joined' : hasPendingRequest ? 'Pending' : 'Join'}
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setOpenMenuId(openMenuId === biz.id ? null : biz.id)
                                        }}
                                        className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 6.75a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 7.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
                                        </svg>
                                    </button>

                                    {openMenuId === biz.id && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 top-9 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 z-10"
                                        >
                                            <button
                                                onClick={() => {
                                                    setEditingBusiness(biz)
                                                    setOpenMenuId(null)
                                                }}
                                                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                                </svg>
                                                Edit details
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setViewingTeamBusiness(biz)
                                                    setOpenMenuId(null)
                                                }}
                                                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.94-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.06 2.772m0 0A6.001 6.001 0 006 18.719m6-15.219a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5zm-8.25 5.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
                                                </svg>
                                                View team
                                            </button>

                                            {canLeave && (
                                                <button
                                                    onClick={() => {
                                                        setLeavingBusiness(biz)
                                                        setOpenMenuId(null)
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                                    </svg>
                                                    Leave business
                                                </button>
                                            )}

                                            <div className="border-t border-gray-100 my-1" />
                                            <button
                                                onClick={() => {
                                                    setDeletingBusiness(biz)
                                                    setOpenMenuId(null)
                                                }}
                                                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {showAddModal && (
                <AddBusinessModal onClose={() => setShowAddModal(false)} onSave={handleAddBusiness} />
            )}

            {editingBusiness && (
                <EditBusinessModal
                    business={editingBusiness}
                    onClose={() => setEditingBusiness(null)}
                    onSave={handleUpdate}
                />
            )}

            {joiningBusiness && (
                <JoinBusinessModal
                    businessName={joiningBusiness.name}
                    loading={joinLoading}
                    onConfirm={handleJoin}
                    onClose={() => {
                        if (!joinLoading) setJoiningBusiness(null)
                    }}
                />
            )}

            {permissionError && (
                <ErrorModal
                    title="Permission required"
                    message={permissionError}
                    onClose={() => setPermissionError('')}
                />
            )}

            {showNotifications && (
                <NotificationsModal
                    notifications={notifications}
                    loading={notificationsLoading}
                    onClose={() => setShowNotifications(false)}
                    onMarkRead={handleMarkNotificationRead}
                    onMarkAllRead={handleMarkAllNotificationsRead}
                    onDecisionMade={handleNotificationDecisionMade}
                />
            )}

            {viewingTeamBusiness && (
                <TeamModal
                    businessId={viewingTeamBusiness.id}
                    businessName={viewingTeamBusiness.name}
                    currentUserRole={viewingTeamBusiness.userRole}
                    onClose={() => setViewingTeamBusiness(null)}
                />
            )}

            {deletingBusiness && (
                <DeleteConfirmModal
                    businessName={deletingBusiness.name}
                    loading={deleteLoading}
                    onConfirm={() => handleDelete(deletingBusiness.id)}
                    onClose={() => {
                        if (!deleteLoading) setDeletingBusiness(null)
                    }}
                />
            )}

            {leavingBusiness && (
                <LeaveBusinessModal
                    businessName={leavingBusiness.name}
                    loading={leaveLoading}
                    onConfirm={() => handleLeave(leavingBusiness.id)}
                    onClose={() => {
                        if (!leaveLoading) setLeavingBusiness(null)
                    }}
                />
            )}
        </Layout>
    )
}