import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
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
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'
import { API_BASE_URL, authHeaders, getToken } from '../../api/config'

const BusinessHeroImage = require('../../assets/Business.png')

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
    Dashboard: { businessId: string }
    Businesses: undefined
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

export default function BusinessesPage() {
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
        navigation.navigate('Dashboard', { businessId: biz.id })
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
    // the menu item being hidden, and should also be enforced server-side).
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
                {/* Close any open row menu when tapping elsewhere on the page —
                    equivalent to the web version's document click listener. */}
                <Pressable onPress={() => openMenuId && setOpenMenuId(null)}>
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

                    {/* Search + filter + add */}
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

                        <View style={styles.controlsRight}>
                            <TypeFilterDropdown value={typeFilter} options={businessTypes} onChange={setTypeFilter} />

                            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
                                <Icon d="M12 4.5v15m7.5-7.5h-15" size={16} color={colors.white} strokeWidth={2} />
                                <Text style={styles.addButtonText}>Add Business</Text>
                            </TouchableOpacity>
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
                            const { bgColor, color, icon } = getBusinessIcon(biz.type)
                            // Only show Join when the user has no role at all for this
                            // business — owners, managers, and existing staff already
                            // belong, so Join would be meaningless for them.
                            const hasJoined = !!biz.userRole
                            const hasPendingRequest = pendingRequestBusinessIds.has(biz.id)
                            const joinButtonDisabled = hasJoined || hasPendingRequest
                            // Leave is only meaningful (and only allowed) for
                            // managers/staff — an owner leaving their own business
                            // makes no sense without a separate ownership-transfer
                            // flow, so the option is hidden entirely for owners.
                            const canLeave = biz.userRole === 'manager' || biz.userRole === 'staff'
                            return (
                                <View key={biz.id} style={styles.row}>
                                    <View style={styles.rowTop}>
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

                                        <View style={styles.rowMenuAnchor}>
                                            <TouchableOpacity
                                                style={styles.menuDotsButton}
                                                onPress={() => setOpenMenuId(openMenuId === biz.id ? null : biz.id)}
                                            >
                                                <Icon
                                                    d="M12 6.75a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 7.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
                                                    size={16}
                                                    color={colors.gray400}
                                                    variant="fill"
                                                />
                                            </TouchableOpacity>

                                            {openMenuId === biz.id && (
                                                <View style={styles.menuPanel}>
                                                    <TouchableOpacity
                                                        style={styles.menuItem}
                                                        onPress={() => {
                                                            setEditingBusiness(biz)
                                                            setOpenMenuId(null)
                                                        }}
                                                    >
                                                        <Icon
                                                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                                                            size={16}
                                                            color={colors.gray400}
                                                            strokeWidth={1.8}
                                                        />
                                                        <Text style={styles.menuItemText}>Edit details</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={styles.menuItem}
                                                        onPress={() => {
                                                            setViewingTeamBusiness(biz)
                                                            setOpenMenuId(null)
                                                        }}
                                                    >
                                                        <Icon
                                                            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.94-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.06 2.772m0 0A6.001 6.001 0 006 18.719m6-15.219a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5zm-8.25 5.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                                                            size={16}
                                                            color={colors.gray400}
                                                            strokeWidth={1.8}
                                                        />
                                                        <Text style={styles.menuItemText}>View team</Text>
                                                    </TouchableOpacity>

                                                    {canLeave && (
                                                        <TouchableOpacity
                                                            style={styles.menuItem}
                                                            onPress={() => {
                                                                setLeavingBusiness(biz)
                                                                setOpenMenuId(null)
                                                            }}
                                                        >
                                                            <Icon
                                                                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                                                                size={16}
                                                                color={colors.orange600}
                                                                strokeWidth={1.8}
                                                            />
                                                            <Text style={styles.menuItemTextOrange}>Leave business</Text>
                                                        </TouchableOpacity>
                                                    )}

                                                    <View style={styles.menuDivider} />

                                                    <TouchableOpacity
                                                        style={styles.menuItem}
                                                        onPress={() => {
                                                            setDeletingBusiness(biz)
                                                            setOpenMenuId(null)
                                                        }}
                                                    >
                                                        <Icon
                                                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                                            size={16}
                                                            color={colors.red500}
                                                            strokeWidth={1.8}
                                                        />
                                                        <Text style={styles.menuItemTextRed}>Delete</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.rowMeta}>
                                        <View style={styles.rowMetaLine}>
                                            <Icon
                                                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                                                size={14}
                                                color={colors.gray500}
                                                strokeWidth={1.8}
                                            />
                                            <Text style={styles.rowMetaText} numberOfLines={1}>{biz.address}</Text>
                                        </View>
                                        <View style={styles.rowMetaLine}>
                                            <Icon
                                                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                                                size={14}
                                                color={colors.gray500}
                                                strokeWidth={1.8}
                                            />
                                            <Text style={styles.rowMetaText}>{biz.phone}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.rowBadges}>
                                        <TouchableOpacity
                                            style={styles.receiptsBadge}
                                            onPress={() => navigateToReceiptsPage(biz)}
                                        >
                                            <Icon
                                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6 15.75h-6a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25h4.5l5.25 5.25v9.75a2.25 2.25 0 01-2.25 2.25z"
                                                size={16}
                                                color={colors.blue700}
                                                strokeWidth={1.8}
                                            />
                                            <Text style={styles.receiptsBadgeText}>Receipts</Text>
                                        </TouchableOpacity>

                                        {biz.userRole && (
                                            <View style={styles.roleBadge}>
                                                <Icon
                                                    d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                                                    size={16}
                                                    color={colors.green700}
                                                    strokeWidth={1.8}
                                                />
                                                <Text style={styles.roleBadgeText}>{biz.userRole}</Text>
                                            </View>
                                        )}
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
                                </View>
                            )
                        })}
                    </View>
                </Pressable>
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
        gap: 12,
        marginBottom: 16,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: 8,
        paddingHorizontal: 12,
        minHeight: 44,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.gray700,
    },
    controlsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    addButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.blue600,
        borderRadius: 8,
        paddingHorizontal: 16,
        minHeight: 44,
    },
    addButtonText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    toggleWrap: {
        marginBottom: 16,
    },
    toggleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        backgroundColor: colors.gray100,
        borderRadius: 8,
        padding: 6,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
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
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
    rowMenuAnchor: {
        position: 'relative',
    },
    menuDotsButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuPanel: {
        position: 'absolute',
        right: 0,
        top: 40,
        width: 170,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray100,
        borderRadius: 12,
        paddingVertical: 6,
        zIndex: 20,
        elevation: 6,
        shadowColor: colors.black,
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    menuItemText: {
        fontSize: 14,
        color: colors.gray700,
    },
    menuItemTextOrange: {
        fontSize: 14,
        color: colors.orange600,
    },
    menuItemTextRed: {
        fontSize: 14,
        color: colors.red500,
    },
    menuDivider: {
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
        marginVertical: 4,
    },
    rowMeta: {
        gap: 4,
    },
    rowMetaLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rowMetaText: {
        fontSize: 12,
        color: colors.gray500,
        flexShrink: 1,
    },
    rowBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    receiptsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.blue50,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    receiptsBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.blue700,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.green50,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    roleBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.green700,
        textTransform: 'capitalize',
    },
    joinButton: {
        alignSelf: 'flex-start',
        minWidth: 96,
        minHeight: 44,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    joinButtonActive: {
        backgroundColor: colors.blue600,
        borderColor: colors.blue600,
    },
    joinButtonDisabled: {
        backgroundColor: colors.white,
        borderColor: colors.blue600,
    },
    joinButtonTextActive: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.white,
    },
    joinButtonTextDisabled: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.blue600,
    },
})
