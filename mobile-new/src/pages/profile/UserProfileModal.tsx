import { useEffect, useState } from 'react'
import {
    Modal,
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
} from 'react-native'
import { X, ChevronDown, Briefcase, Users, Receipt as ReceiptIcon } from 'lucide-react-native'
import { API_BASE_URL, authHeaders } from '../../api/config'

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
 * Stat card with a tap-to-expand dropdown listing the underlying
 * businesses. Web used hover; mobile has no hover, so this expands on
 * tap instead (still reused for Owner / Manager & Staff / Receipts
 * Submitted so all three stay visually and behaviorally consistent).
 */
function ExpandableStatCard({
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
        <TouchableOpacity activeOpacity={0.8} onPress={() => setOpen((prev) => !prev)} style={styles.statCard}>
            <View style={styles.statCardHeader}>
                <View style={[styles.statIconWrap, { backgroundColor: bg }]}>{icon}</View>
                <ChevronDown
                    size={16}
                    color="#D1D5DB"
                    style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
                />
            </View>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statSub}>{sub}</Text>

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
                    headers: await authHeaders(),
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

    const managerAndStaff = data ? [...data.businesses.manager, ...data.businesses.staff] : []

    return (
        <Modal transparent animationType="fade" visible onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Profile</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={16} color="#9CA3AF" />
                        </TouchableOpacity>
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
                            <View style={styles.identityRow}>
                                <View style={styles.avatar}>
                                    {data.user.avatar_url ? (
                                        <Image source={{ uri: data.user.avatar_url }} style={styles.avatarImg} />
                                    ) : (
                                        <Text style={styles.avatarInitials}>{getInitials(data.user.name)}</Text>
                                    )}
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.userName} numberOfLines={1}>{data.user.name}</Text>
                                    <Text style={styles.userEmail} numberOfLines={1}>{data.user.email}</Text>
                                    <Text style={styles.userJoined}>Joined {formatJoinDate(data.user.created_at)}</Text>
                                </View>
                            </View>

                            <View style={styles.statsCol}>
                                <ExpandableStatCard
                                    label="Businesses Owned"
                                    value={data.businesses.owner_count}
                                    sub={data.businesses.owner_count === 1 ? 'business' : 'businesses'}
                                    bg="#EFF6FF"
                                    color="#2563EB"
                                    icon={<Briefcase size={18} color="#2563EB" />}
                                    items={data.businesses.owner.map((b) => ({
                                        key: b.business_id,
                                        name: b.name,
                                        meta: `${b.receipts_count} receipts`,
                                    }))}
                                    emptyLabel="Not an owner of any business yet."
                                />

                                <ExpandableStatCard
                                    label="Manager / Staff Roles"
                                    value={data.businesses.manager_count + data.businesses.staff_count}
                                    sub={`${data.businesses.manager_count} manager · ${data.businesses.staff_count} staff`}
                                    bg="#F5F3FF"
                                    color="#7C3AED"
                                    icon={<Users size={18} color="#7C3AED" />}
                                    items={managerAndStaff.map((b) => ({
                                        key: b.business_id,
                                        name: b.name,
                                        meta: b.receipts_count + ' receipts',
                                    }))}
                                    emptyLabel="Not a manager or staff member anywhere yet."
                                />

                                <ExpandableStatCard
                                    label="Receipts Submitted"
                                    value={data.receipts.submitted_total}
                                    sub="across all businesses"
                                    bg="#F0FDF4"
                                    color="#16A34A"
                                    icon={<ReceiptIcon size={18} color="#16A34A" />}
                                    items={data.receipts.by_business.map((b) => ({
                                        key: b.business_id,
                                        name: b.name,
                                        meta: `${b.receipts_count} receipts`,
                                    }))}
                                    emptyLabel="No receipts submitted yet."
                                />
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '85%',
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
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
    body: { padding: 20 },
    identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    userName: { fontSize: 14, fontWeight: '700', color: '#111827' },
    userEmail: { fontSize: 12, color: '#9CA3AF' },
    userJoined: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    statsCol: { gap: 12 },
    statCard: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, padding: 16 },
    statCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    statIconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    statLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
    statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
    statSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
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
})
