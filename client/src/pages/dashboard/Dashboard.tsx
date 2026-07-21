import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Layout from '../../components/Layout'
import DashboardHeroImage from '../../assets/Dashboard.png'
import DeleteReceiptModal from './DeleteReceiptModal'
import EditReceiptModal, { type EditableReceiptFields } from './EditReceiptModal'
import BusinessSelector, { type BusinessOption } from './BusinessSelector'
import NotificationsModal, { type NotificationItem } from '../business/NotificationModal'
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { useLocation } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ---- Types (mirror the receipts.repository.js row shape) ----
type VerificationStatus = 'pending' | 'verified' | 'rejected'
type DuplicateStatus = 'none' | 'flagged' | 'confirmed_duplicate' | 'not_duplicate'
type BusinessRole = 'owner' | 'manager' | 'staff'

type Receipt = {
    receipt_id: string
    business_id: string
    receiver_name: string | null // merchant / vendor being paid
    sender_name: string | null
    sender_bank: string | null
    receiver_bank: string | null
    transaction_reference: string | null
    amount: string | null
    currency: string
    receipt_date: string | null
    notes: string | null
    image_url: string | null
    verification_status: VerificationStatus
    duplicate_status: DuplicateStatus
    upload_status: 'draft' | 'confirmed'
    created_at: string
}

type Stats = {
    receiptCount: number
    totalSpent: number
    pendingVerification: number
    flaggedDuplicates: number
}

// The token that actually scopes /receipts, /receipts/stats, etc. is the
// SESSION token (businessId + role baked in server-side by
// auth.service.js#selectBusiness), not the identity token issued at
// login. Switching businesses means getting a brand new session token —
// there is no query param the backend honors for this; req.user.businessId
// always comes from whichever session token is currently stored.
function getToken() {
    return sessionStorage.getItem('token')
}

function setToken(token: string) {
    sessionStorage.setItem('token', token)
}

function authHeaders() {
    const token = getToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

function jsonHeaders() {
    const token = getToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

function formatAmount(amount: number | string | null, currency: string) {
    if (amount === null) return '—'
    const n = Number(amount)
    return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
}

// Duplicate status drives the Status column now.
// "none" and "not_duplicate" are both treated as a clean/no-issue state,
// so they share the same green styling.
const DUPLICATE_STYLES: Record<DuplicateStatus, string> = {
    none: 'text-green-700 bg-green-50',
    flagged: 'text-orange-700 bg-orange-50',
    confirmed_duplicate: 'text-red-700 bg-red-50',
    not_duplicate: 'text-green-700 bg-green-50',
}

const DUPLICATE_LABELS: Record<DuplicateStatus, string> = {
    none: 'Not a duplicate',
    flagged: 'Possible duplicate',
    confirmed_duplicate: 'Confirmed duplicate',
    not_duplicate: 'Not a duplicate',
}

// Only owners/managers may edit or delete a receipt's details — staff can
// view and upload but not modify or remove existing records.
function canManageReceipts(role: BusinessRole | null) {
    return role === 'owner' || role === 'manager'
}

const PAGE_SIZE = 5

// Animates a number counting up from 0 to `value` whenever `value` changes
// (including on initial mount and on every refetch/business switch), so
// stats visibly increment rather than just popping into place.
function useCountUp(value: number, durationMs = 800) {
    const [display, setDisplay] = useState(0)
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        const from = 0
        const to = Number.isFinite(value) ? value : 0
        const start = performance.now()

        function tick(now: number) {
            const elapsed = now - start
            const progress = Math.min(1, elapsed / durationMs)
            // ease-out cubic: fast start, gentle settle
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplay(from + (to - from) * eased)
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick)
            } else {
                setDisplay(to)
            }
        }

        rafRef.current = requestAnimationFrame(tick)
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
        }
    }, [value, durationMs])

    return display
}

export default function Dashboard() {
    const location = useLocation()

    const businessIdFromNavigation =
        location.state?.businessId as string | undefined
    const [receipts, setReceipts] = useState<Receipt[]>([])
    // Unfiltered, all-confirmed-receipts list — used only to power the
    // "This Month" chart, so it stays stable regardless of whatever the
    // table above is filtered to.
    const [allReceipts, setAllReceipts] = useState<Receipt[]>([])
    const [stats, setStats] = useState<Stats | null>(null)

    const [loading, setLoading] = useState(false)
    const [statsLoading, setStatsLoading] = useState(false)
    const [error, setError] = useState('')

    // Business selector. auth.repository.js#getUserBusinesses returns
    // business_id (a Postgres integer PK) — normalized to `id` (string,
    // for consistent comparisons against dropdown state) alongside `role`
    // (not userRole — that naming was assumed wrong before; the actual
    // API field from both /auth/login's businesses[] and
    // /business's list is `role`).
    //
    // "all" has no backing sessionToken — the backend has no concept of a
    // cross-business session — so it's handled entirely client-side by
    // looping select-business + fetch across every business the user
    // belongs to and merging the results. See fetchAllBusinessesData.
    const [businesses, setBusinesses] = useState<BusinessOption[]>([])
    const [businessesLoading, setBusinessesLoading] = useState(false)
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | 'all'>('all')
    // True while a select-business call (single business) or the
    // fetch-every-business loop (all businesses) is in flight. The
    // dropdown disables itself during this window.
    const [switchingBusiness, setSwitchingBusiness] = useState(false)

    // Filters — kept to fields the API actually supports
    // (receipts.repository.js#searchReceiptsByBusiness). Start/end date now
    // live inside the filter panel alongside min/max amount.
    const [referenceSearch, setReferenceSearch] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [minAmount, setMinAmount] = useState('')
    const [maxAmount, setMaxAmount] = useState('')

    const [page, setPage] = useState(1)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    // Delete confirmation
    const [deletingReceipt, setDeletingReceipt] = useState<Receipt | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Edit details modal
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
    const [editLoading, setEditLoading] = useState(false)

    // Notifications: owners/managers get notified when someone joins their
    // business. Bell icon opens a modal listing them; badge shows unread count.
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [notificationsLoading, setNotificationsLoading] = useState(false)
    // GET /business already returns each business the user belongs to
    // with its role attached (see BusinessesPage.tsx's normalization),
    // so this list doubles as both "what shows in the dropdown" and
    // "what select-business is allowed to target".
    const fetchBusinesses = useCallback(async () => {
        setBusinessesLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/business`, {
                method: 'GET',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load businesses')
            setBusinesses(
                (data.data || [])
                    .map((b: any) => ({
                        id: String(b.id ?? b.business_id),
                        name: b.name,
                        type: b.type,
                        logoUrl: b.logoUrl ?? b.logo_url ?? null,
                        userRole: b.userRole ?? b.user_role ?? b.role ?? null,
                    }))
                    .filter((b: BusinessOption) => !!b.userRole)
            )
        } catch (err) {
            console.error(err)
        } finally {
            setBusinessesLoading(false)
        }
    }, [])
    const handleMarkNotificationRead = async (id: string) => {
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

    // Called by NotificationsModal after it approves/rejects a join request
    // inline. Flip the joinRequest status locally, then refresh whatever the
    // business selector is currently pointed at — since an approval can
    // change receipt/role counts.
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
        await refreshForCurrentSelection()
    }
    // Exchanges the current session token for one scoped to `businessId`
    // via POST /auth/select-business, and stores the result. Every
    // subsequent /receipts* call automatically picks up the new scope
    // because jsonHeaders() reads whatever token is currently stored —
    // no query params involved.
    const selectBusinessSession = useCallback(async (businessId: string) => {
        const res = await fetch(`${API_BASE_URL}/auth/select-business`, {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ businessId: Number(businessId) }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Failed to switch business')
        }
        setToken(data.data.sessionToken)
        return data.data.role as BusinessRole
    }, [])

    const fetchStats = useCallback(async () => {
        setStatsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/receipts/stats`, {
                method: 'GET',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load stats')
            setStats(data.data)
        } catch (err) {
            console.error(err)
        } finally {
            setStatsLoading(false)
        }
    }, [])

    // Unfiltered fetch — powers the "This Month" chart only.
    const fetchAllReceipts = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/receipts`, {
                method: 'GET',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load receipts')
            setAllReceipts(data.data || [])
        } catch (err) {
            console.error(err)
        }
    }, [])

    const fetchReceipts = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const params = new URLSearchParams()
            if (referenceSearch.trim()) params.set('reference', referenceSearch.trim())
            if (dateFrom) params.set('dateFrom', dateFrom)
            if (dateTo) params.set('dateTo', dateTo)
            if (minAmount) params.set('minAmount', minAmount)
            if (maxAmount) params.set('maxAmount', maxAmount)

            const res = await fetch(`${API_BASE_URL}/receipts?${params.toString()}`, {
                method: 'GET',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load receipts')
            setReceipts(data.data || [])
            setPage(1)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }, [referenceSearch, dateFrom, dateTo, minAmount, maxAmount])
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

    // Load notifications on mount and poll periodically so the bell badge
    // stays current even if the user leaves the tab idle.
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    const unreadNotificationCount = notifications.filter((n) => !n.read).length
    // "All Businesses": there's no backend session that spans more than
    // one business, so this loops select-business -> fetch -> repeat for
    // every business the user belongs to and merges the results
    // client-side. Ends by restoring the session to whichever business
    // was selected before "All" was chosen isn't attempted here — the
    // token is simply left pointed at the last business in the loop,
    // which is fine since every other fetch in this view is also scoped
    // through the same selector.
    const fetchAllBusinessesData = useCallback(async () => {
        setLoading(true)
        setStatsLoading(true)
        setError('')
        try {
            const combinedReceipts: Receipt[] = []
            let combinedStats: Stats = { receiptCount: 0, totalSpent: 0, pendingVerification: 0, flaggedDuplicates: 0 }

            for (const biz of businesses) {
                await selectBusinessSession(biz.id)

                const [receiptsRes, statsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/receipts`, { method: 'GET', headers: jsonHeaders() }),
                    fetch(`${API_BASE_URL}/receipts/stats`, { method: 'GET', headers: jsonHeaders() }),
                ])
                const receiptsData = await receiptsRes.json()
                const statsData = await statsRes.json()

                if (receiptsRes.ok && receiptsData.success) {
                    combinedReceipts.push(...(receiptsData.data || []))
                }
                if (statsRes.ok && statsData.success) {
                    combinedStats = {
                        receiptCount: combinedStats.receiptCount + (statsData.data?.receiptCount || 0),
                        totalSpent: combinedStats.totalSpent + (statsData.data?.totalSpent || 0),
                        pendingVerification: combinedStats.pendingVerification + (statsData.data?.pendingVerification || 0),
                        flaggedDuplicates: combinedStats.flaggedDuplicates + (statsData.data?.flaggedDuplicates || 0),
                    }
                }
            }

            combinedReceipts.sort((a, b) => {
                const da = a.receipt_date ? new Date(a.receipt_date).getTime() : 0
                const db = b.receipt_date ? new Date(b.receipt_date).getTime() : 0
                return db - da
            })

            setReceipts(combinedReceipts)
            setAllReceipts(combinedReceipts)
            setStats(combinedStats)
            setPage(1)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong switching businesses')
        } finally {
            setLoading(false)
            setStatsLoading(false)
        }
    }, [businesses, selectBusinessSession])

    // Central place that reloads whatever the dropdown is currently set
    // to. Called after mutations (delete/edit/etc.) instead of the raw
    // fetch* functions individually, so those call sites don't need to
    // know whether "all" mode is active.
    const refreshForCurrentSelection = useCallback(async () => {
        if (selectedBusinessId === 'all') {
            await fetchAllBusinessesData()
        } else {
            await Promise.all([fetchStats(), fetchAllReceipts(), fetchReceipts()])
        }
    }, [selectedBusinessId, fetchAllBusinessesData, fetchStats, fetchAllReceipts, fetchReceipts])

    useEffect(() => {
        fetchBusinesses()
    }, [fetchBusinesses])

    useEffect(() => {
        if (!businessIdFromNavigation) return
        if (businesses.length === 0) return

        const exists = businesses.some(
            b => b.id === String(businessIdFromNavigation)
        )

        if (exists) {
            setSelectedBusinessId(String(businessIdFromNavigation))
        }
    }, [businesses, businessIdFromNavigation])

    // Runs whenever the dropdown selection changes (including the initial
    // mount, once businesses have loaded). Single business -> one
    // select-business call, then load its data. "all" -> the loop above.
    useEffect(() => {
        if (businessesLoading) return
        if (businesses.length === 0) return

        let cancelled = false

        async function run() {
            setSwitchingBusiness(true)
            setError('')
            try {
                if (selectedBusinessId === 'all') {
                    await fetchAllBusinessesData()
                } else {
                    await selectBusinessSession(selectedBusinessId)
                    if (cancelled) return
                    await Promise.all([fetchStats(), fetchAllReceipts(), fetchReceipts()])
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to switch business')
            } finally {
                if (!cancelled) setSwitchingBusiness(false)
            }
        }

        run()
        return () => {
            cancelled = true
        }
        // Intentionally excludes fetchReceipts/fetchStats/fetchAllReceipts
        // from deps beyond what's listed — those are re-triggered by the
        // debounced search effect below once a business is selected, and
        // re-running this whole effect on every filter keystroke would
        // mean re-selecting the business on the backend unnecessarily.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBusinessId, businesses, businessesLoading])

    // Debounced re-fetch when search/filter fields change, but only once
    // a business session is actually established (not mid-switch) and
    // not in "all" mode, where filters aren't applied per-business here.
    useEffect(() => {
        if (switchingBusiness) return
        if (selectedBusinessId === 'all') return
        const t = setTimeout(fetchReceipts, 300)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [referenceSearch, dateFrom, dateTo, minAmount, maxAmount, selectedBusinessId, switchingBusiness])

    // Role for whichever business a given receipt belongs to — resolved
    // per-row since "All Businesses" mixes rows from multiple businesses.
    const roleForBusiness = useCallback(
        (businessId: string): BusinessRole | null => {
            const biz = businesses.find((b) => b.id === String(businessId))
            return (biz?.userRole as BusinessRole | undefined) ?? null
        },
        [businesses]
    )

    // Mutating a receipt (delete/edit/etc.) needs the session actually
    // pointed at that receipt's own business first — relevant only in
    // "all" mode, where the session may currently be scoped to whichever
    // business fetchAllBusinessesData last looped through, not
    // necessarily the row being acted on.
    const ensureSessionForReceipt = useCallback(
        async (businessId: string) => {
            if (selectedBusinessId !== 'all') return
            await selectBusinessSession(String(businessId))
        },
        [selectedBusinessId, selectBusinessSession]
    )

    const handleDelete = async (id: string) => {
        setError('')
        setOpenMenuId(null)
        setDeleteLoading(true)
        const prev = receipts
        setReceipts((p) => p.filter((r) => r.receipt_id !== id))
        try {
            const target = prev.find((r) => r.receipt_id === id)
            if (target) await ensureSessionForReceipt(target.business_id)

            const res = await fetch(`${API_BASE_URL}/receipts/${id}`, {
                method: 'DELETE',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete receipt')
            refreshForCurrentSelection()
        } catch (err) {
            setReceipts(prev)
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setDeleteLoading(false)
            setDeletingReceipt(null)
        }
    }

    const handleView = async (row: Receipt) => {
        setOpenMenuId(null)
        try {
            await ensureSessionForReceipt(row.business_id)
            const res = await fetch(`${API_BASE_URL}/receipts/${row.receipt_id}/image-url`, {
                method: 'GET',
                headers: jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load receipt image')
            window.open(data.data.signedUrl, '_blank', 'noopener,noreferrer')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not open receipt image')
        }
    }

    const handleResolveDuplicate = async (row: Receipt, isDuplicate: boolean) => {
        setOpenMenuId(null)
        setError('')
        try {
            await ensureSessionForReceipt(row.business_id)
            const res = await fetch(`${API_BASE_URL}/receipts/${row.receipt_id}/resolve-duplicate`, {
                method: 'PATCH',
                headers: jsonHeaders(),
                body: JSON.stringify({ isDuplicate }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to resolve duplicate')
            setReceipts((p) => p.map((r) => (r.receipt_id === row.receipt_id ? data.data : r)))
            refreshForCurrentSelection()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        }
    }

    const handleSaveEdit = async (row: Receipt, fields: EditableReceiptFields) => {
        setError('')
        setEditLoading(true)
        try {
            await ensureSessionForReceipt(row.business_id)
            const res = await fetch(`${API_BASE_URL}/receipts/${row.receipt_id}`, {
                method: 'PATCH',
                headers: jsonHeaders(),
                body: JSON.stringify(fields),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update receipt')
            setReceipts((p) => p.map((r) => (r.receipt_id === row.receipt_id ? data.data : r)))
            refreshForCurrentSelection()
            setEditingReceipt(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setEditLoading(false)
        }
    }



   const thisMonth = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    const inMonth = allReceipts.filter((r) => {
        if (!r.receipt_date) return false

        const d = new Date(r.receipt_date)

        return (
            d.getFullYear() === year &&
            d.getMonth() === month
        )
    })

    const total = inMonth.reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
    )

    // Weekly buckets (keep these if you still need them)
    const buckets = [0, 0, 0, 0, 0]

    // Number of days in this month
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // One value per day
    const dailyTotals = Array(daysInMonth).fill(0)

    inMonth.forEach((r) => {
        const d = new Date(r.receipt_date as string)

        const week = Math.min(4, Math.floor((d.getDate() - 1) / 7))
        buckets[week] += Number(r.amount || 0)

        // Add amount to its day
        dailyTotals[d.getDate() - 1] += Number(r.amount || 0)
    })

    const max = Math.max(1, ...buckets)
    const currency = inMonth[0]?.currency || 'PKR'

    return {
        total,
        buckets,
        dailyTotals,
        max,
        currency,
        count: inMonth.length,
    }
}, [allReceipts])

const dailyData = thisMonth.dailyTotals.map((value, index) => ({
    day: index + 1,
    total: value,
}))

    const totalPages = Math.max(1, Math.ceil(receipts.length / PAGE_SIZE))
    const pageReceipts = receipts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const editInitial: EditableReceiptFields | null = editingReceipt
        ? {
            receiver_name: editingReceipt.receiver_name || '',
            sender_name: editingReceipt.sender_name || '',
            transaction_reference: editingReceipt.transaction_reference || '',
            amount: editingReceipt.amount || '',
            receipt_date: editingReceipt.receipt_date ? editingReceipt.receipt_date.slice(0, 10) : '',
            notes: editingReceipt.notes || '',
        }
        : null

    // Animated "This Month" total (raw number driving the count-up); the
    // formatted currency string is computed after animation each render.
    const animatedThisMonthTotal = useCountUp(statsLoading ? 0 : thisMonth.total)

    return (
        <Layout>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
                    <p className="text-sm text-gray-400 mt-1">View, search and manage all your scanned receipts.</p>
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
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl px-8 py-8 mb-6 flex items-center justify-between">
                <div className="max-w-md">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        All your receipts, <span className="text-blue-600">organized.</span>
                    </h2>
                    <p className="text-sm text-gray-500 mb-5">
                        Keep track of every expense with ease. Search, filter and export your receipt data anytime.
                    </p>
                    <div className="flex items-center gap-3">
                        <a
                            href="/scan"
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                        >
                            <span className="text-base leading-none">+</span> Upload Receipt
                        </a>
                    </div>
                </div>
                <div className="hidden md:flex shrink-0 w-80 h-56 items-center justify-center">
                    <img
                        src={DashboardHeroImage}
                        alt="Business owner managing businesses"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Stats — Total Receipts, Total Amount, This Month */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 items-stretch">

                <StatCard
                    label="Total Receipts"
                    value={stats?.receiptCount ?? 0}
                    loading={statsLoading}
                    sub="Across your business"
                    iconColor="blue"
                    icon={
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M7 3h10v18l-2-1.5-3 1.5-3-1.5-2 1.5V3z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10 8h4M10 12h4M10 16h2"
                            />
                        </svg>
                    }
                />

                <StatCard
                    label="Total Amount"
                    value={stats?.totalSpent ?? 0}
                    loading={statsLoading}
                    sub="Across all receipts"
                    iconColor="green"
                    format={(n) => formatAmount(n, 'PKR')}
                    icon={
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.75 7.5h16.5A1.5 1.5 0 0121.75 9v6a1.5 1.5 0 01-1.5 1.5H3.75A1.5 1.5 0 012.25 15V9a1.5 1.5 0 011.5-1.5z"
                            />
                            <circle cx="12" cy="12" r="2.25" />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5.5 9.75h.01M18.5 14.25h.01"
                            />
                        </svg>
                    }
                />
                {/* This Month — total + daily mini line chart */}
                <div className="border border-gray-200 rounded-2xl p-5 flex flex-col justify-center gap-2 h-full min-h-[128px]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-500 flex items-center justify-center">
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M7 17L17 7M17 7H9M17 7v8"
                                    />
                                </svg>
                            </div>

                            <span className="text-xs text-gray-400">This Month</span>
                        </div>

                        <span className="text-xs text-gray-300">
                            {thisMonth.count} receipts
                        </span>
                    </div>
                    <div className="text-xl font-bold text-gray-900 tabular-nums">
                        {statsLoading ? '—' : formatAmount(animatedThisMonthTotal, thisMonth.currency)}
                    </div>
                    <div className="h-24 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyData}>
                                <XAxis
                                    dataKey="day"
                                    tick={{ fontSize: 10 }}
                                    interval="preserveStartEnd"
                                />

                                <Tooltip
                                    formatter={(value: number) =>
                                        formatAmount(value, thisMonth.currency)
                                    }
                                />

                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    dot={false}
                                    isAnimationActive={true}
                                    animationDuration={800}
                                    animationEasing="ease-out"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Business selector + search & filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <BusinessSelector
                    businesses={businesses}
                    selectedId={selectedBusinessId}
                    onChange={setSelectedBusinessId}
                    loading={businessesLoading}
                    switching={switchingBusiness}
                />

                <div className="relative flex-1 min-w-[220px]">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                    </svg>
                    <input
                        value={referenceSearch}
                        onChange={(e) => setReferenceSearch(e.target.value)}
                        disabled={selectedBusinessId === 'all'}
                        placeholder={selectedBusinessId === 'all' ? 'Select a business to search...' : 'Search by reference number...'}
                        className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                </div>

                <button
                    onClick={() => setShowFilterPanel((v) => !v)}
                    disabled={selectedBusinessId === 'all'}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                    </svg>
                    Filter
                </button>
            </div>

            {selectedBusinessId === 'all' && (
                <p className="text-xs text-gray-400 mb-4 -mt-2">
                    Showing receipts across all your businesses. Select a single business to search or filter.
                </p>
            )}

            {showFilterPanel && selectedBusinessId !== 'all' && (
                <div className="border border-gray-100 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="text-xs text-gray-500">
                        Start date
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <label className="text-xs text-gray-500">
                        End date
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <label className="text-xs text-gray-500">
                        Min amount
                        <input
                            type="number"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <label className="text-xs text-gray-500">
                        Max amount
                        <input
                            type="number"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </label>
                    <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                        <button
                            onClick={() => {
                                setReferenceSearch('')
                                setDateFrom('')
                                setDateTo('')
                                setMinAmount('')
                                setMaxAmount('')
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Clear all filters
                        </button>
                    </div>
                </div>
            )}

            <h3 className="text-sm font-bold text-gray-900 mb-3">
                Receipts ({receipts.length})
            </h3>

            {/* Receipts table */}
            <div className="border border-gray-100 rounded-2xl overflow-visible mb-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                            <th className="font-medium px-5 py-3">Date</th>
                            <th className="font-medium px-5 py-3">Receiver</th>
                            <th className="font-medium px-5 py-3">Sender</th>
                            <th className="font-medium px-5 py-3">Reference</th>
                            <th className="font-medium px-5 py-3">Amount</th>
                            <th className="font-medium px-5 py-3">Status</th>
                            <th className="font-medium px-5 py-3">Screenshot</th>
                            <th className="px-5 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {(loading || switchingBusiness) && receipts.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                                    {switchingBusiness ? 'Switching business...' : 'Loading receipts...'}
                                </td>
                            </tr>
                        )}

                        {!loading && !switchingBusiness && receipts.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                                    No receipts found.
                                </td>
                            </tr>
                        )}

                        {pageReceipts.map((row) => {
                            const role = roleForBusiness(row.business_id)
                            const canManage = canManageReceipts(role)
                            return (
                                <tr key={row.receipt_id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-3.5 text-gray-500">{formatDate(row.receipt_date)}</td>
                                    <td className="px-5 py-3.5">
                                        <span className="text-gray-700">{row.receiver_name || 'Unknown'}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-gray-700">{row.sender_name || 'Unknown'}</td>
                                    <td className="px-5 py-3.5 text-gray-500">{row.transaction_reference || '—'}</td>
                                    <td className="px-5 py-3.5 text-gray-700 font-medium">{formatAmount(row.amount, row.currency)}</td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${DUPLICATE_STYLES[row.duplicate_status]}`}>
                                            {DUPLICATE_LABELS[row.duplicate_status]}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <button
                                            onClick={() => handleView(row)}
                                            disabled={!row.image_url}
                                            title={row.image_url ? 'View screenshot' : 'No screenshot attached'}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            View Screenshot
                                        </button>
                                    </td>
                                    <td className="px-5 py-3.5 text-right relative">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === row.receipt_id ? null : row.receipt_id)}
                                                className="text-gray-300 hover:text-gray-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 21a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                                                </svg>
                                            </button>
                                        </div>

                                        {openMenuId === row.receipt_id && (
                                            <div className="absolute right-5 top-11 z-10 w-52 bg-white border border-gray-100 rounded-xl shadow-lg py-1 text-left">
                                                {canManage && (
                                                    <button
                                                        onClick={() => {
                                                            setOpenMenuId(null)
                                                            setEditingReceipt(row)
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                                        </svg>
                                                        Edit details
                                                    </button>
                                                )}

                                                {row.duplicate_status === 'flagged' && (
                                                    <button
                                                        onClick={() => handleResolveDuplicate(row, false)}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                                                    >
                                                        Unflag as duplicate
                                                    </button>
                                                )}

                                                {canManage && (
                                                    <>
                                                        <div className="border-t border-gray-100 my-1" />
                                                        <button
                                                            onClick={() => {
                                                                setOpenMenuId(null)
                                                                setDeletingReceipt(row)
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                            </svg>
                                                            Delete
                                                        </button>
                                                    </>
                                                )}

                                                {!canManage && row.duplicate_status !== 'flagged' && (
                                                    <div className="px-4 py-2 text-xs text-gray-400">No actions available</div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination — client-side, since the API returns the full
                matching set rather than a paginated page. */}
            {receipts.length > 0 && (
                <div className="flex items-center justify-between px-1 pb-8">
                    <span className="text-xs text-gray-400">
                        Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, receipts.length)} of {receipts.length} receipts
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                        >
                            ‹
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs ${p === page ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}

            {deletingReceipt && (
                <DeleteReceiptModal
                    receiptLabel={deletingReceipt.receiver_name || deletingReceipt.transaction_reference || 'this receipt'}
                    loading={deleteLoading}
                    onConfirm={() => handleDelete(deletingReceipt.receipt_id)}
                    onClose={() => {
                        if (!deleteLoading) setDeletingReceipt(null)
                    }}
                />
            )}

            {editingReceipt && editInitial && (
                <EditReceiptModal
                    initial={editInitial}
                    loading={editLoading}
                    onSave={(fields) => handleSaveEdit(editingReceipt, fields)}
                    onClose={() => {
                        if (!editLoading) setEditingReceipt(null)
                    }}
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
        </Layout>
    )
}

function StatCard({
    label,
    value,
    sub,
    iconColor,
    icon,
    loading,
    format,
}: {
    label: string
    value: number
    sub: string
    iconColor: 'blue' | 'green' | 'amber' | 'purple'
    icon?: React.ReactNode
    loading?: boolean
    format?: (n: number) => string
}) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-500',
        green: 'bg-green-50 text-green-500',
        amber: 'bg-amber-50 text-amber-500',
        purple: 'bg-purple-50 text-purple-500',
    }

    // Animate from 0 up to `value` every time it changes (initial load,
    // refetch after mutation, business switch, etc.)
    const animated = useCountUp(loading ? 0 : value)

    const displayValue = loading
        ? '—'
        : format
            ? format(animated)
            : Math.round(animated).toLocaleString()

    return (
        <div className="border border-gray-200 rounded-2xl p-5 flex flex-col justify-center gap-2 h-full min-h-[128px]">
            <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors[iconColor]}`}>
                    {icon ?? <span className="w-2 h-2 rounded-full bg-current" />}
                </div>
                <span className="text-xs text-gray-400">{label}</span>
            </div>

            <div className="text-xl font-bold text-gray-900 tabular-nums">{displayValue}</div>
            <div className="text-xs text-gray-400">{sub}</div>
        </div>
    )
}