import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ImageBackground,
    ScrollView,
    ActivityIndicator,
    Modal,
    StyleSheet,
    Linking,
    Platform,
} from 'react-native'
import * as FileSystem from 'expo-file-system'

import * as Sharing from 'expo-sharing'
import { useRoute, useFocusEffect, useNavigation, type RouteProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { MainTabParamList } from '../../components/MainTabs'
import {
    Bell,
    Plus,
    SlidersHorizontal,
    Download,
    ChevronDown,
    ChevronRight,
    MoreVertical,
    Eye,
    Pencil,
    Trash2,
    Search,
    ArrowUpRight,
    Receipt as ReceiptIcon,
    Wallet,
    FileSearch,
    ShieldCheck,
    Info,
    X,
} from 'lucide-react-native'
import Layout from '../../components/Layout'
import DeleteReceiptModal from './DeleteReceiptModal'
import EditReceiptModal, { type EditableReceiptFields } from './EditReceiptModal'
import BusinessSelector, { type BusinessOption } from './BusinessSelector'
import NotificationsModal, { type NotificationItem } from '../business/NotificationModal'
import MiniLineChart from './MiniLineChart'
import { API_BASE_URL, getToken, setToken, jsonHeaders, authHeaders } from '../../api/config'
import { Paths } from 'expo-file-system'

const DashboardHeroImage = require('../../../assets/Dashboard.png')

// ---- Types (mirror the receipts.repository.js row shape) — unchanged ----
type VerificationStatus = 'pending' | 'verified' | 'rejected'
type DuplicateStatus = 'none' | 'flagged' | 'confirmed_duplicate' | 'not_duplicate'
type BusinessRole = 'owner' | 'manager' | 'staff'

type Receipt = {
    receipt_id: string
    business_id: string
    receiver_name: string | null
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

type ExportFormat = 'csv' | 'excel' | 'pdf'

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

const DUPLICATE_STYLES: Record<DuplicateStatus, { text: string; bg: string }> = {
    none: { text: '#15803D', bg: '#F0FDF4' },
    flagged: { text: '#C2410C', bg: '#FFF7ED' },
    confirmed_duplicate: { text: '#DC2626', bg: '#FEF2F2' },
    not_duplicate: { text: '#15803D', bg: '#F0FDF4' },
}

const DUPLICATE_LABELS: Record<DuplicateStatus, string> = {
    none: 'Not a duplicate',
    flagged: 'Possible duplicate',
    confirmed_duplicate: 'Confirmed duplicate',
    not_duplicate: 'Not a duplicate',
}

function canManageReceipts(role: BusinessRole | null) {
    return role === 'owner' || role === 'manager'
}

const PAGE_SIZE = 5

// Animates a number counting up from 0 to `value` whenever `value`
// changes (initial mount, refetch, business switch), same easing as web.
function useCountUp(value: number, durationMs = 800) {
    const [display, setDisplay] = useState(0)
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        const from = 0
        const to = Number.isFinite(value) ? value : 0
        const start = Date.now()

        function tick() {
            const elapsed = Date.now() - start
            const progress = Math.min(1, elapsed / durationMs)
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

type DashboardRouteParams = {
    businessId?: string
}

type Route = RouteProp<MainTabParamList, 'Dashboard'>

export default function Dashboard() {
    // Web read this from react-router's navigate('/dashboard', { state: { businessId } }).
    // React Navigation's equivalent is a route param instead of router state.
    const route = useRoute<Route>()
    const businessIdFromNavigation = (route.params as DashboardRouteParams | undefined)?.businessId
    const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>()

    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [allReceipts, setAllReceipts] = useState<Receipt[]>([])
    const [stats, setStats] = useState<Stats | null>(null)

    const [loading, setLoading] = useState(false)
    const [statsLoading, setStatsLoading] = useState(false)
    const [error, setError] = useState('')

    const [businesses, setBusinesses] = useState<BusinessOption[]>([])
    const [businessesLoading, setBusinessesLoading] = useState(false)
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | 'all'>('all')
    const [switchingBusiness, setSwitchingBusiness] = useState(false)

    const [referenceSearch, setReferenceSearch] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [minAmount, setMinAmount] = useState('')
    const [maxAmount, setMaxAmount] = useState('')

    const [page, setPage] = useState(1)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    const [deletingReceipt, setDeletingReceipt] = useState<Receipt | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
    const [editLoading, setEditLoading] = useState(false)

    const [showExportMenu, setShowExportMenu] = useState(false)
    const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)

    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [notificationsLoading, setNotificationsLoading] = useState(false)

    const [showThisMonthChart, setShowThisMonthChart] = useState(false)

    const fetchBusinesses = useCallback(async () => {
        setBusinessesLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/business`, {
                method: 'GET',
                headers: await jsonHeaders(),
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
                headers: await authHeaders(),
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
                headers: await authHeaders(),
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

    const selectBusinessSession = useCallback(async (businessId: string) => {
        const res = await fetch(`${API_BASE_URL}/auth/select-business`, {
            method: 'POST',
            headers: await jsonHeaders(),
            body: JSON.stringify({ businessId: Number(businessId) }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Failed to switch business')
        }
        await setToken(data.data.sessionToken)
        return data.data.role as BusinessRole
    }, [])

    const fetchStats = useCallback(async () => {
        setStatsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/receipts/stats`, {
                method: 'GET',
                headers: await jsonHeaders(),
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

    const fetchAllReceipts = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/receipts`, {
                method: 'GET',
                headers: await jsonHeaders(),
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
                headers: await jsonHeaders(),
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
                headers: await authHeaders(),
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
            console.error(err)
        } finally {
            setNotificationsLoading(false)
        }
    }, [])

    // Load notifications on mount and poll periodically so the bell badge
    // stays current even if the user leaves the app idle in the background.
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    const unreadNotificationCount = notifications.filter((n) => !n.read).length

    // "All Businesses": loops select-business -> fetch -> repeat for every
    // business the user belongs to and merges the results client-side —
    // identical strategy to web, since the backend still has no
    // cross-business session concept.
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
                    fetch(`${API_BASE_URL}/receipts`, { method: 'GET', headers: await jsonHeaders() }),
                    fetch(`${API_BASE_URL}/receipts/stats`, { method: 'GET', headers: await jsonHeaders() }),
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

    const refreshForCurrentSelection = useCallback(async () => {
        if (selectedBusinessId === 'all') {
            await fetchAllBusinessesData()
        } else {
            await Promise.all([fetchStats(), fetchAllReceipts(), fetchReceipts()])
        }
    }, [selectedBusinessId, fetchAllBusinessesData, fetchStats, fetchAllReceipts, fetchReceipts])

    // FIX: previously this only ran once via a plain useEffect, which fires
    // on mount only. Because React Navigation keeps screens mounted when you
    // navigate away and back, creating a new business and returning to
    // Dashboard never re-triggered this fetch — `businesses` stayed stale,
    // so the new business (and its receipts) wouldn't show up until a full
    // app remount (e.g. logging out/in). useFocusEffect re-runs this every
    // time the Dashboard screen regains focus, which also covers the
    // initial mount, so the old plain effect can be removed.
    useFocusEffect(
        useCallback(() => {
            fetchBusinesses()
        }, [fetchBusinesses])
    )

    useEffect(() => {
        if (!businessIdFromNavigation) return
        if (businesses.length === 0) return

        const exists = businesses.some((b) => b.id === String(businessIdFromNavigation))

        if (exists) {
            setSelectedBusinessId(String(businessIdFromNavigation))
        }
    }, [businesses, businessIdFromNavigation])

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBusinessId, businesses, businessesLoading])

    useEffect(() => {
        if (switchingBusiness) return
        if (selectedBusinessId === 'all') return
        const t = setTimeout(fetchReceipts, 300)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [referenceSearch, dateFrom, dateTo, minAmount, maxAmount, selectedBusinessId, switchingBusiness])

    const roleForBusiness = useCallback(
        (businessId: string): BusinessRole | null => {
            const biz = businesses.find((b) => b.id === String(businessId))
            return (biz?.userRole as BusinessRole | undefined) ?? null
        },
        [businesses]
    )

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
                headers: await jsonHeaders(),
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

    // window.open(...) has no RN equivalent — Linking.openURL hands the
    // signed URL to the system browser/viewer, same end result.
    const handleView = async (row: Receipt) => {
        setOpenMenuId(null)
        try {
            await ensureSessionForReceipt(row.business_id)
            const res = await fetch(`${API_BASE_URL}/receipts/${row.receipt_id}/image-url`, {
                method: 'GET',
                headers: await jsonHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load receipt image')
            await Linking.openURL(data.data.signedUrl)
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
                headers: await jsonHeaders(),
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
                headers: await jsonHeaders(),
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

    // Same GET /receipts/export?format=... contract as web. The browser's
    // blob-download-via-<a> dance has no RN equivalent, so this instead
    // writes the response to a temp file with expo-file-system and hands
    // it to the OS share sheet via expo-sharing (the standard RN pattern
    // for "save/share a downloaded file").
    const handleExport = async (format: ExportFormat) => {
        setShowExportMenu(false)
        setExportingFormat(format)
        setError('')
        try {
            await ensureSessionForReceipt(selectedBusinessId === 'all' ? '' : selectedBusinessId)

            const params = new URLSearchParams()
            params.set('format', format)
            if (referenceSearch.trim()) params.set('reference', referenceSearch.trim())
            if (dateFrom) params.set('dateFrom', dateFrom)
            if (dateTo) params.set('dateTo', dateTo)
            if (minAmount) params.set('minAmount', minAmount)
            if (maxAmount) params.set('maxAmount', maxAmount)

            const token = await getToken()
            const url = `${API_BASE_URL}/receipts/export?${params.toString()}`
            const extension = format === 'excel' ? 'xlsx' : format
           const fileUri = `${Paths.cache}/receipts-export-${Date.now()}.${extension}`;

            const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })

            if (downloadRes.status < 200 || downloadRes.status >= 300) {
                throw new Error('Failed to export receipts')
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloadRes.uri)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong exporting receipts')
        } finally {
            setExportingFormat(null)
        }
    }

    const thisMonth = useMemo(() => {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()

        const inMonth = allReceipts.filter((r) => {
            if (!r.receipt_date) return false
            const d = new Date(r.receipt_date)
            return d.getFullYear() === year && d.getMonth() === month
        })

        const total = inMonth.reduce((sum, r) => sum + Number(r.amount || 0), 0)

        const buckets = [0, 0, 0, 0, 0]
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const dailyTotals = Array(daysInMonth).fill(0)

        inMonth.forEach((r) => {
            const d = new Date(r.receipt_date as string)
            const week = Math.min(4, Math.floor((d.getDate() - 1) / 7))
            buckets[week] += Number(r.amount || 0)
            dailyTotals[d.getDate() - 1] += Number(r.amount || 0)
        })

        const max = Math.max(1, ...buckets)
        const currency = inMonth[0]?.currency || 'PKR'

        return { total, buckets, dailyTotals, max, currency, count: inMonth.length }
    }, [allReceipts])

    const dailyData = thisMonth.dailyTotals.map((value, index) => ({ day: index + 1, total: value }))

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

    const animatedThisMonthTotal = useCountUp(statsLoading ? 0 : thisMonth.total)

    const menuRow = pageReceipts.find((r) => r.receipt_id === openMenuId) || null

    const isEmpty = !loading && !switchingBusiness && receipts.length === 0

    return (
        <Layout>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.h1}>Receipts</Text>
                        <Text style={styles.h1Sub}>View, search and manage all your scanned receipts.</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            setShowNotifications(true)
                            fetchNotifications()
                        }}
                        style={styles.bellButton}
                    >
                        <Bell size={20} color="#9CA3AF" />
                        {unreadNotificationCount > 0 && (
                            <View style={styles.bellBadge}>
                                <Text style={styles.bellBadgeText}>
                                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {!!error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Hero banner */}
<ImageBackground
    source={DashboardHeroImage}
    style={styles.hero}
    imageStyle={styles.heroImageBg}
    resizeMode="cover"
>
    <View style={{ flex: 1 }}>
        <Text style={styles.heroTitle}>
            All your receipts,{'\n'}
            <Text style={styles.heroTitleAccent}>organized.</Text>
        </Text>
        <Text style={styles.heroSub}>
            Keep track of every expense with ease. Search, filter and export your receipt data anytime.
        </Text>
        <TouchableOpacity
            onPress={() => navigation.navigate('Scan')}
            style={styles.heroButton}
        >
            <Plus size={16} color="#2563EB" />
            <Text style={styles.heroButtonText}>Upload Receipt</Text>
        </TouchableOpacity>
    </View>
</ImageBackground>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <StatCard
                        label="Total Receipts"
                        value={stats?.receiptCount ?? 0}
                        loading={statsLoading}
                        sub="Across your business"
                        iconColor="#2563EB"
                        iconBg="#EFF6FF"
                        icon={<ReceiptIcon size={18} color="#2563EB" />}
                    />
                    <StatCard
                        label="Total Amount"
                        value={stats?.totalSpent ?? 0}
                        loading={statsLoading}
                        sub="Across all receipts"
                        iconColor="#16A34A"
                        iconBg="#F0FDF4"
                        format={(n) => formatAmount(n, 'PKR')}
                        icon={<Wallet size={18} color="#16A34A" />}
                    />

                    {/* This Month — total only; daily breakdown chart moved
                        behind the info icon so this card matches the height
                        of the other two stat cards. */}
                    <View style={styles.statCard}>
                        <View style={styles.statCardTopRow}>
                            <View style={[styles.statIconWrap, { backgroundColor: '#FEFCE8' }]}>
                                <ArrowUpRight size={16} color="#EAB308" />
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowThisMonthChart(true)}
                                style={styles.statInfoButton}
                                accessibilityLabel="View this month's daily breakdown"
                            >
                                <Info size={14} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.statLabel}>This Month</Text>
                        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                            {statsLoading ? '—' : formatAmount(animatedThisMonthTotal, thisMonth.currency)}
                        </Text>
                        <Text style={styles.statSub}>{thisMonth.count} receipts</Text>
                    </View>
                </View>

                {/* This Month daily breakdown — moved out of the card into
                    a modal opened by the info icon, so the chart no longer
                    forces the "This Month" card to be taller than the
                    other two stat cards. */}
                <Modal
                    transparent
                    animationType="fade"
                    visible={showThisMonthChart}
                    onRequestClose={() => setShowThisMonthChart(false)}
                >
                    <TouchableOpacity
                        style={styles.menuOverlay}
                        activeOpacity={1}
                        onPress={() => setShowThisMonthChart(false)}
                    >
                        <TouchableOpacity activeOpacity={1} style={styles.chartModalCard}>
                            <View style={styles.chartModalHeader}>
                                <View>
                                    <Text style={styles.chartModalTitle}>This Month</Text>
                                    <Text style={styles.chartModalSubtitle}>
                                        {statsLoading ? '—' : formatAmount(thisMonth.total, thisMonth.currency)} · {thisMonth.count} receipts
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowThisMonthChart(false)}
                                    style={styles.chartModalClose}
                                    accessibilityLabel="Close"
                                >
                                    <X size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                            <MiniLineChart data={dailyData} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* Business selector + search */}
                <View style={styles.controlsRow}>
                    <BusinessSelector
                        businesses={businesses}
                        selectedId={selectedBusinessId}
                        onChange={setSelectedBusinessId}
                        loading={businessesLoading}
                        switching={switchingBusiness}
                    />

                    <View style={styles.searchRow}>
                        <View style={styles.searchWrap}>
                            <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
                            <TextInput
                                value={referenceSearch}
                                onChangeText={setReferenceSearch}
                                editable={selectedBusinessId !== 'all'}
                                placeholder={
                                    selectedBusinessId === 'all'
                                        ? 'Select a business to search...'
                                        : 'Search receipts...'
                                }
                                placeholderTextColor="#9CA3AF"
                                style={[styles.searchInput, selectedBusinessId === 'all' && styles.searchInputDisabled]}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowFilterPanel((v) => !v)}
                            disabled={selectedBusinessId === 'all'}
                            style={[styles.iconButton, selectedBusinessId === 'all' && styles.disabledOpacity]}
                        >
                            <SlidersHorizontal size={16} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            onPress={() => setShowFilterPanel((v) => !v)}
                            disabled={selectedBusinessId === 'all'}
                            style={[styles.filterButton, selectedBusinessId === 'all' && styles.disabledOpacity]}
                        >
                            <SlidersHorizontal size={16} color="#374151" />
                            <Text style={styles.filterButtonText}>Filter</Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                            <TouchableOpacity
                                onPress={() => setShowExportMenu((v) => !v)}
                                disabled={selectedBusinessId === 'all' || exportingFormat !== null}
                                style={[
                                    styles.exportButton,
                                    (selectedBusinessId === 'all' || exportingFormat !== null) && styles.disabledOpacity,
                                ]}
                            >
                                {exportingFormat ? (
                                    <ActivityIndicator size="small" color="#9CA3AF" />
                                ) : (
                                    <Download size={16} color="#374151" />
                                )}
                                <Text style={styles.exportButtonText}>Export</Text>
                                <ChevronDown size={14} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <Modal transparent animationType="fade" visible={showExportMenu} onRequestClose={() => setShowExportMenu(false)}>
                    <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowExportMenu(false)}>
                        <View style={styles.exportMenu}>
                            {(['csv', 'excel', 'pdf'] as ExportFormat[]).map((fmt) => (
                                <TouchableOpacity key={fmt} onPress={() => handleExport(fmt)} style={styles.exportMenuItem}>
                                    <Text style={styles.exportMenuItemText}>
                                        {fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel (XLSX)' : 'PDF'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

                {selectedBusinessId === 'all' && (
                    <Text style={styles.allBusinessesNote}>
                        Showing receipts across all your businesses. Select a single business to search, filter or export.
                    </Text>
                )}

                {showFilterPanel && selectedBusinessId !== 'all' && (
                    <View style={styles.filterPanel}>
                        <FilterField label="Start date (YYYY-MM-DD)" value={dateFrom} onChangeText={setDateFrom} />
                        <FilterField label="End date (YYYY-MM-DD)" value={dateTo} onChangeText={setDateTo} />
                        <FilterField label="Min amount" value={minAmount} onChangeText={setMinAmount} keyboardType="numeric" />
                        <FilterField label="Max amount" value={maxAmount} onChangeText={setMaxAmount} keyboardType="numeric" />
                        <TouchableOpacity
                            onPress={() => {
                                setReferenceSearch('')
                                setDateFrom('')
                                setDateTo('')
                                setMinAmount('')
                                setMaxAmount('')
                            }}
                            style={{ alignSelf: 'flex-end' }}
                        >
                            <Text style={styles.clearFiltersText}>Clear all filters</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Receipts ({receipts.length})</Text>

                {/* Receipts table — RN has no <table>, so this is a
                    horizontally-scrollable grid of fixed-width columns that
                    mirrors the web layout 1:1 (same columns, same order). */}
                <View style={styles.tableWrap}>
                    {isEmpty ? (
                        <EmptyReceiptsState onUpload={() => navigation.navigate('Scan')} />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View>
                                <View style={styles.tableHeaderRow}>
                                    <Text style={[styles.th, COL.date]}>Date</Text>
                                    <Text style={[styles.th, COL.name]}>Receiver</Text>
                                    <Text style={[styles.th, COL.name]}>Sender</Text>
                                    <Text style={[styles.th, COL.ref]}>Reference</Text>
                                    <Text style={[styles.th, COL.amount]}>Amount</Text>
                                    <Text style={[styles.th, COL.status]}>Status</Text>
                                    <Text style={[styles.th, COL.screenshot]}>Screenshot</Text>
                                    <Text style={[styles.th, COL.actions]} />
                                </View>

                                {(loading || switchingBusiness) && (
                                    <View style={styles.tableEmptyRow}>
                                        <ActivityIndicator size="small" color="#9CA3AF" />
                                        <Text style={styles.tableEmptyText}>
                                            {switchingBusiness ? 'Switching business...' : 'Loading receipts...'}
                                        </Text>
                                    </View>
                                )}

                                {pageReceipts.map((row) => {
                                    const dupStyle = DUPLICATE_STYLES[row.duplicate_status]
                                    return (
                                        <View key={row.receipt_id} style={styles.tableRow}>
                                            <Text style={[styles.td, COL.date, styles.tdMuted]}>{formatDate(row.receipt_date)}</Text>
                                            <Text style={[styles.td, COL.name]} numberOfLines={1}>{row.receiver_name || 'Unknown'}</Text>
                                            <Text style={[styles.td, COL.name]} numberOfLines={1}>{row.sender_name || 'Unknown'}</Text>
                                            <Text style={[styles.td, COL.ref, styles.tdMuted]} numberOfLines={1}>{row.transaction_reference || '—'}</Text>
                                            <Text style={[styles.td, COL.amount, styles.tdStrong]}>{formatAmount(row.amount, row.currency)}</Text>
                                            <View style={[COL.status, { justifyContent: 'center' }]}>
                                                <View style={[styles.statusPill, { backgroundColor: dupStyle.bg }]}>
                                                    <Text style={[styles.statusPillText, { color: dupStyle.text }]}>
                                                        {DUPLICATE_LABELS[row.duplicate_status]}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={[COL.screenshot, { justifyContent: 'center' }]}>
                                                <TouchableOpacity
                                                    onPress={() => handleView(row)}
                                                    disabled={!row.image_url}
                                                    style={styles.viewScreenshotButton}
                                                >
                                                    <Eye size={14} color={row.image_url ? '#2563EB' : '#D1D5DB'} />
                                                    <Text style={[styles.viewScreenshotText, !row.image_url && { color: '#D1D5DB' }]}>
                                                        View
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View style={[COL.actions, { alignItems: 'flex-end', justifyContent: 'center' }]}>
                                                <TouchableOpacity
                                                    onPress={() => setOpenMenuId(row.receipt_id)}
                                                    style={styles.moreButton}
                                                >
                                                    <MoreVertical size={16} color="#D1D5DB" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )
                                })}
                            </View>
                        </ScrollView>
                    )}
                </View>

                {/* Secure & Private trust card */}
                <TouchableOpacity style={styles.secureCard} activeOpacity={0.8}>
                    <View style={styles.secureIconWrap}>
                        <ShieldCheck size={20} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.secureTitle}>Secure & Private</Text>
                        <Text style={styles.secureSub}>Your receipts are encrypted and stored securely.</Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Row action menu */}
                <Modal transparent animationType="fade" visible={!!menuRow} onRequestClose={() => setOpenMenuId(null)}>
                    <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setOpenMenuId(null)}>
                        {menuRow && (() => {
                            const role = roleForBusiness(menuRow.business_id)
                            const canManage = canManageReceipts(role)
                            return (
                                <View style={styles.rowMenu}>
                                    {canManage && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setOpenMenuId(null)
                                                setEditingReceipt(menuRow)
                                            }}
                                            style={styles.rowMenuItem}
                                        >
                                            <Pencil size={16} color="#9CA3AF" />
                                            <Text style={styles.rowMenuItemText}>Edit details</Text>
                                        </TouchableOpacity>
                                    )}

                                    {menuRow.duplicate_status === 'flagged' && (
                                        <TouchableOpacity
                                            onPress={() => handleResolveDuplicate(menuRow, false)}
                                            style={styles.rowMenuItem}
                                        >
                                            <Text style={styles.rowMenuItemTextMuted}>Unflag as duplicate</Text>
                                        </TouchableOpacity>
                                    )}

                                    {canManage && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setOpenMenuId(null)
                                                setDeletingReceipt(menuRow)
                                            }}
                                            style={styles.rowMenuItem}
                                        >
                                            <Trash2 size={16} color="#EF4444" />
                                            <Text style={styles.rowMenuItemDanger}>Delete</Text>
                                        </TouchableOpacity>
                                    )}

                                    {!canManage && menuRow.duplicate_status !== 'flagged' && (
                                        <Text style={styles.rowMenuEmpty}>No actions available</Text>
                                    )}
                                </View>
                            )
                        })()}
                    </TouchableOpacity>
                </Modal>

                {/* Pagination */}
                {receipts.length > 0 && (
                    <View style={styles.paginationRow}>
                        <Text style={styles.paginationLabel}>
                            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, receipts.length)} of {receipts.length} receipts
                        </Text>
                        <View style={styles.paginationButtons}>
                            <TouchableOpacity
                                onPress={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={[styles.pageButton, page === 1 && styles.disabledOpacity]}
                            >
                                <Text style={styles.pageButtonText}>‹</Text>
                            </TouchableOpacity>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setPage(p)}
                                    style={[styles.pageNumButton, p === page && styles.pageNumButtonActive]}
                                >
                                    <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                style={[styles.pageButton, page === totalPages && styles.disabledOpacity]}
                            >
                                <Text style={styles.pageButtonText}>›</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>

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

function FilterField({
    label,
    value,
    onChangeText,
    keyboardType,
}: {
    label: string
    value: string
    onChangeText: (v: string) => void
    keyboardType?: 'default' | 'numeric'
}) {
    return (
        <View style={styles.filterField}>
            <Text style={styles.filterFieldLabel}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                style={styles.filterFieldInput}
            />
        </View>
    )
}

// New: shown in place of the receipts table when there is nothing to
// display — mirrors the "No receipts found" empty state in the design,
// with an icon, heading, helper copy, and a direct upload CTA.
function EmptyReceiptsState({ onUpload }: { onUpload: () => void }) {
    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
                <FileSearch size={30} color="#93C5FD" />
            </View>
            <Text style={styles.emptyTitle}>No receipts found</Text>
            <Text style={styles.emptySub}>Try adjusting your search or upload a new receipt.</Text>
            <TouchableOpacity onPress={onUpload} style={styles.emptyButton}>
                <Plus size={16} color="#fff" />
                <Text style={styles.emptyButtonText}>Upload Receipt</Text>
            </TouchableOpacity>
        </View>
    )
}

function StatCard({
    label,
    value,
    sub,
    iconColor,
    iconBg,
    icon,
    loading,
    format,
}: {
    label: string
    value: number
    sub: string
    iconColor: string
    iconBg: string
    icon?: React.ReactNode
    loading?: boolean
    format?: (n: number) => string
}) {
    const animated = useCountUp(loading ? 0 : value)

    const displayValue = loading ? '—' : format ? format(animated) : Math.round(animated).toLocaleString()

    return (
        <View style={styles.statCard}>
            <View style={styles.statCardTopRow}>
                <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
            </View>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{displayValue}</Text>
            <Text style={styles.statSub}>{sub}</Text>
        </View>
    )
}

// Fixed column widths for the receipts "table" (View-based, since RN has
// no <table>). Kept in one place so header + rows always line up.
const COL = StyleSheet.create({
    date: { width: 100 },
    name: { width: 130 },
    ref: { width: 120 },
    amount: { width: 110 },
    status: { width: 140 },
    screenshot: { width: 110 },
    actions: { width: 50 },
})

const styles = StyleSheet.create({
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },

    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
    h1: { fontSize: 22, fontWeight: '700', color: '#111827' },
    h1Sub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
    bellButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    bellBadge: {
        position: 'absolute',
        top: 4,
        right: 6,
        minWidth: 14,
        height: 14,
        paddingHorizontal: 2,
        borderRadius: 7,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bellBadgeText: { fontSize: 9, color: '#fff' },
    errorBox: {
        marginBottom: 16,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    errorText: { fontSize: 12, color: '#DC2626' },

    // Hero — dark blue gradient card. RN has no CSS gradients without an
    // extra dependency, so this uses a solid deep blue that matches the
    // gradient's dominant tone; swap for expo-linear-gradient if/when
    // that dependency is available in this project.
   hero: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
},
    heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff', lineHeight: 26, marginBottom: 10 },
    heroTitleAccent: { color: '#60A5FA' },
    heroSub: { fontSize: 13, color: '#BFDBFE', marginBottom: 16, lineHeight: 18 },
    heroButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignSelf: 'flex-start',
    },
    heroButtonText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
    heroImageBg: {
    borderRadius: 20,
    opacity: 0.15,
},

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'stretch' },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 16,
        padding: 14,
        gap: 4,
    },
    statCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    statIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    statInfoButton: { padding: 4, marginRight: -4, marginTop: -4 },
    statLabel: { fontSize: 11, color: '#9CA3AF' },
    statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
    statSub: { fontSize: 10, color: '#9CA3AF' },

    controlsRow: { gap: 12, marginBottom: 16 },
    searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    searchWrap: { flex: 1, position: 'relative', justifyContent: 'center' },
    searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
    searchInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingLeft: 36,
        paddingRight: 12,
        paddingVertical: 12,
        fontSize: 13,
        color: '#111827',
        backgroundColor: '#fff',
    },
    searchInputDisabled: { backgroundColor: '#F9FAFB', color: '#9CA3AF' },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    actionsRow: { flexDirection: 'row', gap: 12 },
    disabledOpacity: { opacity: 0.5 },
    filterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        paddingVertical: 12,
    },
    filterButtonText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
    exportButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    exportButtonText: { fontSize: 13, fontWeight: '600', color: '#374151' },
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    exportMenu: { width: 220, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 4 },
    chartModalCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
    },
    chartModalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    chartModalTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    chartModalSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    chartModalClose: { padding: 4 },
    exportMenuItem: { paddingHorizontal: 16, paddingVertical: 12 },
    exportMenuItemText: { fontSize: 14, color: '#374151' },
    allBusinessesNote: { fontSize: 12, color: '#9CA3AF', marginBottom: 16, marginTop: -4 },
    filterPanel: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, padding: 16, marginBottom: 16, gap: 12 },
    filterField: {},
    filterFieldLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
    filterFieldInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#374151' },
    clearFiltersText: { fontSize: 13, color: '#6B7280' },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
    tableWrap: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
    tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 20 },
    th: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    td: { fontSize: 13, color: '#374151' },
    tdMuted: { color: '#9CA3AF' },
    tdStrong: { fontWeight: '600', color: '#374151' },
    statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    statusPillText: { fontSize: 11, fontWeight: '500' },
    viewScreenshotButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    viewScreenshotText: { fontSize: 11, fontWeight: '500', color: '#2563EB' },
    moreButton: { padding: 8 },
    tableEmptyRow: { paddingVertical: 40, alignItems: 'center', gap: 8 },
    tableEmptyText: { fontSize: 13, color: '#9CA3AF' },

    // New empty state — icon in a soft blue circle, heading, helper
    // copy, and a filled CTA that jumps straight into the upload flow.
    emptyState: { paddingVertical: 44, paddingHorizontal: 24, alignItems: 'center' },
    emptyIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
    emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#2563EB',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    emptyButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

    // "Secure & Private" trust card
    secureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#EFF6FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    secureIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secureTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
    secureSub: { fontSize: 12, color: '#6B7280', lineHeight: 16 },

    rowMenu: { width: 208, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 4 },
    rowMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
    rowMenuItemText: { fontSize: 14, color: '#374151' },
    rowMenuItemTextMuted: { fontSize: 14, color: '#6B7280' },
    rowMenuItemDanger: { fontSize: 14, color: '#EF4444' },
    rowMenuEmpty: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 12, color: '#9CA3AF' },
    paginationRow: { alignItems: 'center', gap: 12, paddingBottom: 32 },
    paginationLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
    paginationButtons: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'center' },
    pageButton: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    pageButtonText: { fontSize: 16, color: '#9CA3AF' },
    pageNumButton: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    pageNumButtonActive: { backgroundColor: '#2563EB' },
    pageNumText: { fontSize: 12, color: '#6B7280' },
    pageNumTextActive: { color: '#fff' },
})