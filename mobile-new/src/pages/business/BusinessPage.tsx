import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    Dimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Layout from '../../components/Layout'
import { getBusinessIcon, businessTypes } from './BusinessIcons'
import AddBusinessModal from './AddBusinessModal'
import EditBusinessModal from './EditBusinessModal'
import ErrorModal from './ErrorModal'
import JoinBusinessModal from './JoinBusinessModal'
import TypeFilterDropdown from './TypeFilterDropdown'
import NotificationsModal, { type NotificationItem } from './NotificationModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import LeaveBusinessModal from './LeaveBusinessModal'
import TeamModal from './TeamModel'
import BusinessDetailsSheet from './BusinessDetailsSheet'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'
import { API_BASE_URL, authHeaders, getToken } from '../../api/config'

const BusinessHeroImage = require('../../../assets/Business.png')

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

type RootStackParamList = {
    MainTabs: { screen: string; params?: { businessId: string } }
}
// Reads the userId claim out of the JWT payload stored via AsyncStorage.
// Decode-only (no signature verification) — same trust model as the web
// app, which already relies on the backend to reject a tampered/expired
// token on every request. Used only to build the "leave business" request
// URL (DELETE /business/:id/members/:memberId with the caller's own id) —
// never used to make an authorization decision on the client itself, since
// the backend re-derives role from business_users per-business anyway.
function decodeBase64Url(input: string): string {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    // Hermes (RN's default JS engine since 0.70+) provides global atob.
    // If your runtime doesn't, install a polyfill such as `base-64` and
    // swap this line for `base64Decode(base64)`.
    return atob(base64)
}

async function getCurrentUserId(): Promise<string | null> {
    const token = await getToken()
    if (!token) return null
    try {
        const payload = token.split('.')[1]
        const decoded = JSON.parse(decodeBase64Url(payload))
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

const screenWidth = Dimensions.get('window').width
const isWide = screenWidth >= 768

export default function BusinessPage() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
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
    // Replaces the old per-row three-dot menu: tapping a row opens this
    // bottom sheet, which surfaces the business's details (address/phone/
    // role) plus every action — Receipts, Edit, Team, Leave, Delete, Join.
    const [detailBusiness, setDetailBusiness] = useState<Business | null>(null)

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
        navigation.navigate('MainTabs', { screen: 'Dashboard', params: { businessId: biz.id } })
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
                headers: await authHeaders(),
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
                headers: await authHeaders(),
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
    // stays current even if the user leaves the screen idle.
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

    const handleAddBusiness = async () => {
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
                headers: await authHeaders(),
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
    // the sheet hiding the option, and should also be enforced server-side).
    // Hits DELETE /business/:businessId/members/:memberId with the current
    // user's own id, reusing the existing "remove member" endpoint rather
    // than a dedicated /leave route — self-removal is just a member removal
    // where the actor and the target are the same person.
    const handleLeave = async (id: string) => {
        setError('')
        setLeaveLoading(true)

        const currentUserId = await getCurrentUserId()
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
                headers: await authHeaders(),
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
                headers: await authHeaders(),
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

    // Join flow: tapping "Join" opens a confirmation modal first (rather
    // than joining immediately) since it changes the user's membership and
    // is not easily undone from this screen. Role defaults to "staff" on
    // the backend — there is no role picker here on purpose.
    //
    // On success, the backend is expected to create a notification for the
    // business's owner ("X joined your business"). We refresh notifications
    // here too so the bell updates for shared/testing sessions.
    const handleJoin = async (requestedRole: 'manager' | 'staff') => {
        if (!joiningBusiness) return
        setJoinLoading(true)
        setError('')

        try {
            const res = await fetch(`${API_BASE_URL}/business/${joiningBusiness.id}/join-requests`, {
                method: 'POST',
                headers: await authHeaders(),
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

    // Called by NotificationsModal after it successfully approves/rejects a
    // join request inline. The API call itself already happened inside the
    // modal — this just reconciles this screen's state afterward:
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
            bg: colors.blue50,
            color: colors.blue600,
        },
        {
            label: 'Most Used',
            value: statsLoading ? '—' : stats?.mostUsed?.name ?? '—',
            sub: stats?.mostUsed ? `${stats.mostUsed.receipts} receipts` : '',
            bg: colors.green50,
            color: colors.green600,
        },
        {
            label: 'Business Types',
            value: statsLoading && businesses.length === 0 ? '—' : String(businessTypeCountDisplay),
            sub: 'Categories',
            bg: colors.orange50,
            color: colors.orange500,
        },
        {
            label: 'Total Receipts',
            value: statsLoading ? '—' : String(stats?.totalReceipts ?? '—'),
            sub: 'Across all businesses',
            bg: colors.purple50,
            color: colors.purple500,
        },
    ]

    return (
        <Layout>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.pageTitle}>Businesses</Text>
                        <Text style={styles.pageSubtitle}>Manage all your saved businesses in one place.</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.bellButton}
                        onPress={() => {
                            setShowNotifications(true)
                            fetchNotifications()
                        }}
                    >
                        <Icon
                            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                            size={20}
                            color={colors.gray400}
                            strokeWidth={1.8}
                        />
                        {unreadNotificationCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {error !== '' && <Text style={styles.errorBanner}>{error}</Text>}

                {/* Hero banner */}
                <View style={[styles.hero, isWide && styles.heroWide]}>
                    <View style={styles.heroText}>
                        <Text style={styles.heroTitle}>
                            All your businesses, <Text style={styles.heroTitleAccent}>organized</Text>.
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            Search, manage, and keep track of all your businesses in one place.
                        </Text>
                        <TouchableOpacity style={styles.heroButton} onPress={() => setShowAddModal(true)}>
                            <Icon d="M12 4.5v15m7.5-7.5h-15" size={16} color={colors.white} strokeWidth={2} />
                            <Text style={styles.heroButtonText}>Add Business</Text>
                        </TouchableOpacity>
                    </View>
                    {isWide && (
                        <View style={styles.heroImageWrap}>
                            <Image source={BusinessHeroImage} style={styles.heroImage} resizeMode="contain" />
                        </View>
                    )}
                </View>

                {/* Overview */}
                <View style={styles.statsGrid}>
                    {overviewStats.map((stat) => (
                        <View key={stat.label} style={[styles.statCard, isWide ? styles.statCardWide : styles.statCardNarrow]}>
                            <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                                <Icon
                                    d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25M12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                                    size={20}
                                    color={stat.color}
                                    strokeWidth={1.8}
                                />
                            </View>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                            <Text style={styles.statValue} numberOfLines={1}>{stat.value}</Text>
                            <Text style={styles.statSub}>{stat.sub}</Text>
                        </View>
                    ))}
                </View>

                {/* Search + filter */}
                {/* NOTE: TypeFilterDropdown renders its own trigger UI (its source
                    isn't part of this file), so this wraps it in a compact square
                    to match the mockup's icon-button look — if it still renders
                    as a full-width dropdown, that component needs a small tweak
                    to support an icon-only/compact mode. */}
                <View style={styles.controlsRow}>
                    <View style={styles.searchBox}>
                        <Icon d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" size={16} color={colors.gray400} strokeWidth={1.8} />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search businesses..."
                            placeholderTextColor={colors.gray400}
                            style={styles.searchInput}
                        />
                    </View>

                    <View style={styles.filterButtonWrap}>
                        <TypeFilterDropdown value={typeFilter} options={businessTypes} onChange={setTypeFilter} />
                    </View>
                </View>

                {/* My Businesses / All Businesses toggle */}
                <View style={styles.toggleWrap}>
                    <View style={styles.toggleGroup}>
                        <TouchableOpacity
                            onPress={() => setViewMode('My Businesses')}
                            style={[styles.toggleButton, viewMode === 'My Businesses' && styles.toggleButtonActive]}
                        >
                            <Text style={viewMode === 'My Businesses' ? styles.toggleTextActive : styles.toggleText}>
                                My Businesses
                            </Text>
                            <View style={[styles.toggleCount, viewMode === 'My Businesses' && styles.toggleCountActive]}>
                                <Text style={viewMode === 'My Businesses' ? styles.toggleCountTextActive : styles.toggleCountText}>
                                    {businesses.filter((b) => !!b.userRole).length}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setViewMode('All Businesses')}
                            style={[styles.toggleButton, viewMode === 'All Businesses' && styles.toggleButtonActive]}
                        >
                            <Text style={viewMode === 'All Businesses' ? styles.toggleTextActive : styles.toggleText}>
                                All Businesses
                            </Text>
                            <View style={[styles.toggleCount, viewMode === 'All Businesses' && styles.toggleCountActive]}>
                                <Text style={viewMode === 'All Businesses' ? styles.toggleCountTextActive : styles.toggleCountText}>
                                    {businesses.length}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Business list */}
                <View style={styles.listCard}>
                    {loading && displayedBusinesses.length === 0 && (
                        <Text style={styles.emptyState}>Loading businesses...</Text>
                    )}

                    {!loading && displayedBusinesses.length === 0 && (
                        <Text style={styles.emptyState}>
                            {viewMode === 'My Businesses'
                                ? 'You haven\'t joined any businesses yet. Switch to "All Businesses" to find one.'
                                : 'No businesses found.'}
                        </Text>
                    )}

                    {displayedBusinesses.map((biz) => {
                        const { bgColor, icon } = getBusinessIcon(biz.type)
                        // Only show Join when the user has no role at all for this
                        // business — owners, managers, and existing staff already
                        // belong, so Join would be meaningless for them.
                        const hasJoined = !!biz.userRole
                        const hasPendingRequest = pendingRequestBusinessIds.has(biz.id)
                        const joinButtonDisabled = hasJoined || hasPendingRequest
                        return (
                            <TouchableOpacity
                                key={biz.id}
                                style={styles.row}
                                activeOpacity={0.7}
                                onPress={() => setDetailBusiness(biz)}
                            >
                                <View style={[styles.rowIcon, { backgroundColor: biz.logoUrl ? colors.gray100 : bgColor }]}>
                                    {biz.logoUrl ? (
                                        <Image source={{ uri: biz.logoUrl }} style={styles.rowIconImage} />
                                    ) : (
                                        icon
                                    )}
                                </View>
                                <View style={styles.rowNameBlock}>
                                    <Text style={styles.rowName} numberOfLines={1}>{biz.name}</Text>
                                    <Text style={styles.rowType}>{biz.type}</Text>
                                </View>

                                <TouchableOpacity
                                    disabled={joinButtonDisabled}
                                    onPress={() => {
                                        if (!joinButtonDisabled) setJoiningBusiness(biz)
                                    }}
                                    style={[styles.joinButton, joinButtonDisabled ? styles.joinButtonDisabled : styles.joinButtonActive]}
                                >
                                    <Text style={joinButtonDisabled ? styles.joinButtonTextDisabled : styles.joinButtonTextActive}>
                                        {hasJoined ? 'Joined' : hasPendingRequest ? 'Pending' : 'Join'}
                                    </Text>
                                </TouchableOpacity>

                                <Icon d="M8.25 4.5l7.5 7.5-7.5 7.5" size={16} color={colors.gray300} strokeWidth={1.8} />
                            </TouchableOpacity>
                        )
                    })}
                </View>

                {/* Bottom tip banner */}
                <View style={styles.tipBanner}>
                    <View style={styles.tipIcon}>
                        <Icon
                            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                            size={20}
                            color={colors.blue600}
                            strokeWidth={1.8}
                        />
                    </View>
                    <View style={styles.tipTextBlock}>
                        <Text style={styles.tipTitle}>Stay organized</Text>
                        <Text style={styles.tipSubtitle}>
                            Keep all your business information and receipts in one secure place.
                        </Text>
                    </View>
                </View>
            </ScrollView>

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

            {permissionError !== '' && (
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

            {detailBusiness && (
                <BusinessDetailsSheet
                    business={detailBusiness}
                    hasPendingRequest={pendingRequestBusinessIds.has(detailBusiness.id)}
                    onClose={() => setDetailBusiness(null)}
                    onViewReceipts={navigateToReceiptsPage}
                    onEdit={setEditingBusiness}
                    onViewTeam={setViewingTeamBusiness}
                    onLeave={setLeavingBusiness}
                    onDelete={setDeletingBusiness}
                    onJoin={setJoiningBusiness}
                />
            )}
        </Layout>
    )
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.gray900,
    },
    pageSubtitle: {
        fontSize: 14,
        color: colors.gray400,
        marginTop: 4,
    },
    bellButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 6,
        minWidth: 14,
        height: 14,
        paddingHorizontal: 2,
        borderRadius: 7,
        backgroundColor: colors.red500,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 9,
        color: colors.white,
    },
    errorBanner: {
        marginBottom: 16,
        fontSize: 12,
        color: colors.red600,
        backgroundColor: colors.red50,
        borderWidth: 1,
        borderColor: colors.red100,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    hero: {
        backgroundColor: colors.blue50,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 24,
        marginBottom: 24,
        gap: 20,
    },
    heroWide: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroText: {
        maxWidth: 384,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.gray900,
    },
    heroTitleAccent: {
        color: colors.blue600,
    },
    heroSubtitle: {
        fontSize: 14,
        color: colors.gray500,
        marginTop: 8,
        marginBottom: 20,
    },
    heroButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        backgroundColor: colors.blue600,
        borderRadius: 8,
        paddingHorizontal: 16,
        minHeight: 44,
        justifyContent: 'center',
    },
    heroButtonText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    heroImageWrap: {
        width: 320,
        height: 224,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
    },
    statCard: {
        borderWidth: 1,
        borderColor: colors.gray100,
        borderRadius: 16,
        padding: 16,
    },
    statCardNarrow: {
        width: '47%',
    },
    statCardWide: {
        width: '23%',
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    statLabel: {
        fontSize: 12,
        color: colors.gray400,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray900,
    },
    statSub: {
        fontSize: 12,
        color: colors.gray400,
        marginTop: 4,
    },
    controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
},
searchBox: {
    flex: 7, // takes all remaining space
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    minWidth: 0,
},
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.gray700,
    },
filterButtonWrap: {
    flex: 3,
    minHeight: 44,
    minWidth: 0,
},
    toggleWrap: {
        marginBottom: 16,
    },
    toggleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.gray100,
        borderRadius: 8,
        padding: 6,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    toggleButtonActive: {
        backgroundColor: colors.blue600,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray500,
    },
    toggleTextActive: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    toggleCount: {
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleCountActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    toggleCountText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.gray500,
    },
    toggleCountTextActive: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.white,
    },
    listCard: {
        borderWidth: 1,
        borderColor: colors.gray100,
        borderRadius: 16,
        marginBottom: 16,
    },
    emptyState: {
        paddingHorizontal: 20,
        paddingVertical: 40,
        textAlign: 'center',
        fontSize: 14,
        color: colors.gray400,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
    rowIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    rowIconImage: {
        width: '100%',
        height: '100%',
    },
    rowNameBlock: {
        flex: 1,
        minWidth: 0,
    },
    rowName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray900,
    },
    rowType: {
        fontSize: 12,
        color: colors.gray400,
    },
    joinButton: {
        minWidth: 76,
        minHeight: 36,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    joinButtonActive: {
        backgroundColor: colors.blue50,
        borderColor: colors.blue50,
    },
    joinButtonDisabled: {
        backgroundColor: colors.blue50,
        borderColor: colors.blue50,
    },
    joinButtonTextActive: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.blue700,
    },
    joinButtonTextDisabled: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.blue700,
    },
    tipBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: colors.blue50,
        borderRadius: 16,
        padding: 16,
    },
    tipIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tipTextBlock: {
        flex: 1,
    },
    tipTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 2,
    },
    tipSubtitle: {
        fontSize: 13,
        color: colors.gray500,
        lineHeight: 18,
    },
})