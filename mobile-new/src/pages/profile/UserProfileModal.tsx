import { useEffect, useState, useCallback } from 'react'
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, CommonActions } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    X,
    ChevronRight,
    Briefcase,
    Users,
    Receipt as ReceiptIcon,
    Bell,
    Shield,
    HelpCircle,
    Info,
    LogOut,
} from 'lucide-react-native'
import { API_BASE_URL, authHeaders } from '../../api/config'
import type { MainTabParamList } from '../../components/MainTabs'
import NotificationsModal, { type NotificationItem } from '../business/NotificationModal'

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
    /** Optional: pass this if the component is rendered inside something
     *  dismissible (a sheet, a screen with a back action, etc). If omitted,
     *  no close button is rendered and the bell takes the full top-right slot. */
    onClose?: () => void
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
 * Stat row with a tap-to-expand dropdown listing the underlying
 * businesses. Visually matches the reference design (icon, label/value/sub,
 * chevron all in one row); the chevron rotates 90deg to double as an
 * expand/collapse indicator so we keep the original drill-down behavior.
 */
function ExpandableStatRow({
    icon,
    bg,
    label,
    value,
    sub,
    items,
    emptyLabel,
}: {
    icon: React.ReactNode
    bg: string
    label: string
    value: number
    sub: string
    items: { key: number; name: string; meta: string }[]
    emptyLabel: string
}) {
    const [open, setOpen] = useState(false)

    return (
        <TouchableOpacity activeOpacity={0.8} onPress={() => setOpen((prev) => !prev)} style={styles.statCard}>
            <View style={styles.statRow}>
                <View style={[styles.statIconWrap, { backgroundColor: bg }]}>{icon}</View>
                <View style={styles.statTextCol}>
                    <Text style={styles.statLabel}>{label}</Text>
                    <Text style={styles.statValue}>{value}</Text>
                    <Text style={styles.statSub}>{sub}</Text>
                </View>
                <ChevronRight
                    size={20}
                    color="#D1D5DB"
                    style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
                />
            </View>

            {open && (
                <View style={styles.statDropdown}>
                    {items.length === 0 ? (
                        <Text style={styles.statEmpty}>{emptyLabel}</Text>
                    ) : (
                        items.map((item) => (
                            <View key={item.key} style={styles.statDropdownItem}>
                                <Text style={styles.statDropdownName} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text style={styles.statDropdownMeta}>{item.meta}</Text>
                            </View>
                        ))
                    )}
                </View>
            )}
        </TouchableOpacity>
    )
}

/** Plain navigation row used in the "Account" section. */
function AccountRow({
    icon,
    bg,
    title,
    subtitle,
    onPress,
    isLast,
}: {
    icon: React.ReactNode
    bg: string
    title: string
    subtitle: string
    onPress: () => void
    isLast?: boolean
}) {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={[styles.accountRow, !isLast && styles.accountRowDivider]}
        >
            <View style={[styles.accountIconWrap, { backgroundColor: bg }]}>{icon}</View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.accountTitle}>{title}</Text>
                <Text style={styles.accountSubtitle}>{subtitle}</Text>
            </View>
            <ChevronRight size={18} color="#D1D5DB" />
        </TouchableOpacity>
    )
}

export default function UserProfileModal({ onClose }: Props) {
    const insets = useSafeAreaInsets()
    const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>()
    const [data, setData] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // --- Notifications: same fetch/poll/mark-read/decision pattern as
    // Dashboard, so the bell here behaves identically. ---
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [notificationsLoading, setNotificationsLoading] = useState(false)

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

    // Dashboard refetches receipts/stats after a join-request decision;
    // here there's no receipts list on screen, so just refresh the
    // notification list and the profile counts (a decision can change
    // e.g. staff/manager counts) instead.
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
        fetchProfile()
    }

    // Load notifications on mount and poll periodically so the bell badge
    // stays current even if the user leaves the screen open idle.
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    const unreadNotificationCount = notifications.filter((n) => !n.read).length

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch(`${API_BASE_URL}/users/me/profile`, {
                method: 'GET',
                headers: await authHeaders(),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Failed to load profile')
            }

            setData(json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profile')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    const managerAndStaff = data ? [...data.businesses.manager, ...data.businesses.staff] : []

    // Placeholder — all Account rows point here for now; swap each one's
    // onPress for its real destination once those screens exist.
    const goToPlaceholder = () => navigation.navigate('Businesses')

    // Clears everything cached locally (auth token, any persisted state)
    // and drops the user back on the sign-in screen with a reset stack so
    // they can't navigate "back" into the authenticated app.
    const handleLogout = async () => {
        try {
            await AsyncStorage.clear()
        } catch (err) {
            console.error('Failed to clear cache on logout', err)
        } finally {
            const rootNavigation = navigation.getParent() ?? navigation
            rootNavigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    // NOTE: replace 'SignIn' with whatever your auth stack's
                    // sign-in route is actually named.
                    routes: [{ name: 'SignIn' as never }],
                }),
            )
        }
    }

    return (
        <View style={styles.card}>
            {/* Header matches Dashboard's headerRow exactly: same h1/h1Sub
                text styles, same 44x44 round bell button + badge sizing,
                same paddingHorizontal/border-bottom treatment. Safe-area
                top inset is folded into paddingTop since this modal has
                no separate screen wrapper. */}
            <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.h1}>Profile</Text>
                    <Text style={styles.h1Sub}>Manage your account and view your activity.</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={() => {
                            setShowNotifications(true)
                            fetchNotifications()
                        }}
                        style={styles.bellButton}
                        accessibilityLabel="Notifications"
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
                    {onClose && (
                        <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close">
                            <X size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading && (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator color="#9CA3AF" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            )}

            {!loading && error && (
                <View style={{ padding: 20 }}>
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                </View>
            )}

            {!loading && !error && data && (
                <ScrollView contentContainerStyle={styles.body}>
                    {/* Avatar + name + email + join date are centered across
                        the full width of the card (identityCard is a
                        full-width column with alignItems: 'center'). No
                        edit/pencil icon here — profile is view-only. */}
                    <View style={styles.identityCard}>
                        <View style={styles.avatar}>
                            {data.user.avatar_url ? (
                                <Image source={{ uri: data.user.avatar_url }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarInitials}>{getInitials(data.user.name)}</Text>
                            )}
                        </View>
                        <Text style={styles.userName} numberOfLines={1}>{data.user.name}</Text>
                        <Text style={styles.userEmail} numberOfLines={1}>{data.user.email}</Text>
                        <Text style={styles.userJoined}>Joined {formatJoinDate(data.user.created_at)}</Text>
                    </View>

                    <View style={styles.statsCol}>
                        <ExpandableStatRow
                            label="Businesses Owned"
                            value={data.businesses.owner_count}
                            sub={data.businesses.owner_count === 1 ? 'business' : 'businesses'}
                            bg="#EFF6FF"
                            icon={<Briefcase size={18} color="#2563EB" />}
                            items={data.businesses.owner.map((b) => ({
                                key: b.business_id,
                                name: b.name,
                                meta: `${b.receipts_count} receipts`,
                            }))}
                            emptyLabel="Not an owner of any business yet."
                        />

                        <ExpandableStatRow
                            label="Manager / Staff Roles"
                            value={data.businesses.manager_count + data.businesses.staff_count}
                            sub={`${data.businesses.manager_count} manager · ${data.businesses.staff_count} staff`}
                            bg="#F5F3FF"
                            icon={<Users size={18} color="#7C3AED" />}
                            items={managerAndStaff.map((b) => ({
                                key: b.business_id,
                                name: b.name,
                                meta: b.receipts_count + ' receipts',
                            }))}
                            emptyLabel="Not a manager or staff member anywhere yet."
                        />

                        <ExpandableStatRow
                            label="Receipts Submitted"
                            value={data.receipts.submitted_total}
                            sub="across all businesses"
                            bg="#F0FDF4"
                            icon={<ReceiptIcon size={18} color="#16A34A" />}
                            items={data.receipts.by_business.map((b) => ({
                                key: b.business_id,
                                name: b.name,
                                meta: `${b.receipts_count} receipts`,
                            }))}
                            emptyLabel="No receipts submitted yet."
                        />
                    </View>

                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.accountCard}>
                        <AccountRow
                            icon={<Shield size={18} color="#2563EB" />}
                            bg="#EFF6FF"
                            title="Security & Privacy"
                            subtitle="Manage your security settings"
                            onPress={goToPlaceholder}
                        />
                        <AccountRow
                            icon={<Bell size={18} color="#7C3AED" />}
                            bg="#F5F3FF"
                            title="Notifications"
                            subtitle="Manage notification preferences"
                            onPress={goToPlaceholder}
                        />
                        <AccountRow
                            icon={<HelpCircle size={18} color="#2563EB" />}
                            bg="#EFF6FF"
                            title="Help & Support"
                            subtitle="Get help and contact support"
                            onPress={goToPlaceholder}
                        />
                        <AccountRow
                            icon={<Info size={18} color="#D97706" />}
                            bg="#FEF3C7"
                            title="About App"
                            subtitle="Version 1.0.0"
                            onPress={goToPlaceholder}
                            isLast
                        />
                    </View>

                    <TouchableOpacity activeOpacity={0.8} onPress={handleLogout} style={styles.logoutCard}>
                        <View style={styles.logoutIconWrap}>
                            <LogOut size={18} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.logoutTitle}>Logout</Text>
                            <Text style={styles.logoutSubtitle}>Sign out of your account</Text>
                        </View>
                        <ChevronRight size={18} color="#FCA5A5" />
                    </TouchableOpacity>
                </ScrollView>
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
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        flex: 1,
        backgroundColor: '#fff',
    },
    // Matches Dashboard's headerRow exactly (flexDirection, alignItems,
    // justifyContent, paddingHorizontal, border-bottom, background).
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    // Matches Dashboard's h1 / h1Sub text styles exactly.
    h1: { fontSize: 22, fontWeight: '700', color: '#111827' },
    h1Sub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    // Matches Dashboard's bellButton / bellBadge / bellBadgeText sizing exactly.
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
    closeButton: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    loadingWrap: { paddingVertical: 48, alignItems: 'center', gap: 8 },
    loadingText: { fontSize: 13, color: '#9CA3AF' },
    errorBox: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    errorText: { fontSize: 12, color: '#DC2626' },
    body: { padding: 20, paddingBottom: 40 },

    identityCard: {
        // Full-width column, everything centered horizontally across the
        // full width of the card (avatar on top, name/email/joined below).
        width: '100%',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EFF6FF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 10,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: { color: '#2563EB', fontSize: 18, fontWeight: '600' },
    userName: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },
    userEmail: { fontSize: 12, color: '#6B7280', marginTop: 1, textAlign: 'center' },
    userJoined: { fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

    statsCol: { gap: 12, marginBottom: 24 },
    statCard: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, padding: 16 },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    statIconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    statTextCol: { flex: 1, minWidth: 0 },
    statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
    statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
    statSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
    statDropdown: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 8,
        maxHeight: 200,
    },
    statEmpty: { fontSize: 12, color: '#9CA3AF', paddingVertical: 8 },
    statDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 8,
    },
    statDropdownName: { flex: 1, fontSize: 12, fontWeight: '500', color: '#374151' },
    statDropdownMeta: { fontSize: 10, color: '#9CA3AF' },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
    accountCard: {
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    accountRowDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    accountIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    accountTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
    accountSubtitle: { fontSize: 11.5, color: '#9CA3AF', marginTop: 1 },

    logoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    logoutIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
    logoutSubtitle: { fontSize: 11.5, color: '#EF4444', marginTop: 1 },
})