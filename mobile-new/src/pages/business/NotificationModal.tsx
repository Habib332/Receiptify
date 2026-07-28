import { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView, Image, BackHandler } from 'react-native'
import { API_BASE_URL, authHeaders } from '../../api/config'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'

export type NotificationItem = {
    id: string
    type: string // e.g. 'join_request'
    message: string
    businessId?: number | null
    businessName?: string | null
    actorName?: string | null // the user who joined
    actorEmail?: string | null // email of the user who joined
    actorAvatarUrl?: string | null // profile picture of the user who joined
    createdAt: string
    read: boolean
    // Present only for notifications tied to a pending business join request.
    // Lets the modal render business context and approve/reject actions inline.
    joinRequest?: {
        requestId: number
        requestedRole: 'manager' | 'staff'
        status: 'pending' | 'approved' | 'rejected'
    } | null
}

type Props = {
    notifications: NotificationItem[]
    loading: boolean
    onClose: () => void
    onMarkRead: (id: string) => void
    onMarkAllRead: () => void
    // Called after a join request is approved/rejected so the parent can
    // update or refetch its notification list.
    onDecisionMade?: (notificationId: string, decision: 'approve' | 'reject') => void
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

// Same fallback pattern used on the profile page: first + last initials,
// or the first two letters if there's only one name segment.
function getInitials(name: string) {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Same avatar pattern used on the profile page: show the real picture if
// avatarUrl is present, otherwise fall back to initials-in-a-circle.
function Avatar({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
    const displayName = name || '?'
    return (
        <View style={styles.avatar}>
            {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
                <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            )}
        </View>
    )
}

export default function NotificationsModal({
    notifications,
    loading,
    onClose,
    onMarkRead,
    onMarkAllRead,
    onDecisionMade,
}: Props) {
    // Web listened for Escape; on Android the hardware/gesture back button
    // is the equivalent, wired via BackHandler + the Modal's onRequestClose.
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            onClose()
            return true
        })
        return () => sub.remove()
    }, [onClose])

    const hasUnread = notifications.some((n) => !n.read)

    // Tracks which notification currently has an approve/reject call in
    // flight, so only that row's buttons disable rather than the whole list.
    const [pendingActionId, setPendingActionId] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)

    async function handleDecision(n: NotificationItem, decision: 'approve' | 'reject') {
        if (!n.joinRequest || n.businessId == null) return
        setPendingActionId(n.id)
        setActionError(null)
        try {
            const res = await fetch(
                `${API_BASE_URL}/business/${n.businessId}/join-requests/${n.joinRequest.requestId}/${decision}`,
                { method: 'PATCH', headers: await authHeaders() },
            )
            const body = await res.json()
            if (!res.ok) throw new Error(body?.message || `Failed to ${decision} request`)

            onDecisionMade?.(n.id, decision)
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setPendingActionId(null)
        }
    }

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Notifications</Text>
                        <View style={styles.headerActions}>
                            {hasUnread && (
                                <TouchableOpacity onPress={onMarkAllRead}>
                                    <Text style={styles.markAllRead}>Mark all read</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Icon
                                    d="M6 18L18 6M6 6l12 12"
                                    size={16}
                                    color={colors.gray400}
                                    strokeWidth={2}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {actionError && <Text style={styles.errorBanner}>{actionError}</Text>}

                    <ScrollView style={styles.list}>
                        {loading && notifications.length === 0 && (
                            <Text style={styles.emptyState}>Loading notifications...</Text>
                        )}

                        {!loading && notifications.length === 0 && (
                            <Text style={styles.emptyState}>No notifications yet.</Text>
                        )}

                        {notifications.map((n) => {
                            const isPendingJoinRequest =
                                n.type === 'join_request' && n.joinRequest?.status === 'pending'
                            const isActing = pendingActionId === n.id

                            if (isPendingJoinRequest) {
                                return (
                                    <View
                                        key={n.id}
                                        style={[styles.row, !n.read && styles.rowUnread]}
                                    >
                                        <Avatar name={n.actorName} avatarUrl={n.actorAvatarUrl} />
                                        <View style={styles.rowContent}>
                                            <Text style={styles.message}>{n.message}</Text>

                                            {n.actorEmail && (
                                                <Text style={styles.subtleText} numberOfLines={1}>{n.actorEmail}</Text>
                                            )}

                                            {n.businessName && (
                                                <Text style={styles.metaText}>
                                                    Business: <Text style={styles.metaStrong}>{n.businessName}</Text>
                                                    {n.businessId != null && (
                                                        <Text style={styles.subtleText}> (#{n.businessId})</Text>
                                                    )}
                                                </Text>
                                            )}

                                            {n.joinRequest && (
                                                <Text style={styles.metaText}>
                                                    Requested role:{' '}
                                                    <Text style={styles.metaStrong}>{n.joinRequest.requestedRole}</Text>
                                                </Text>
                                            )}

                                            <Text style={styles.timeText}>{timeAgo(n.createdAt)}</Text>

                                            <View style={styles.actionRow}>
                                                <TouchableOpacity
                                                    onPress={() => handleDecision(n, 'reject')}
                                                    disabled={isActing}
                                                    style={[styles.rejectButton, isActing && styles.disabled]}
                                                >
                                                    <Text style={styles.rejectText}>Reject</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDecision(n, 'approve')}
                                                    disabled={isActing}
                                                    style={[styles.approveButton, isActing && styles.disabled]}
                                                >
                                                    <Text style={styles.approveText}>{isActing ? '...' : 'Approve'}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        {!n.read && <View style={styles.unreadDot} />}
                                    </View>
                                )
                            }

                            return (
                                <TouchableOpacity
                                    key={n.id}
                                    onPress={() => !n.read && onMarkRead(n.id)}
                                    style={[styles.row, !n.read && styles.rowUnread]}
                                >
                                    <View style={styles.genericIconCircle}>
                                        <Icon
                                            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                                            size={16}
                                            color={colors.blue600}
                                            strokeWidth={1.8}
                                        />
                                    </View>
                                    <View style={styles.rowContent}>
                                        <Text style={styles.message}>{n.message}</Text>

                                        {n.businessName && (
                                            <Text style={styles.metaText}>
                                                Business: <Text style={styles.metaStrong}>{n.businessName}</Text>
                                                {n.businessId != null && (
                                                    <Text style={styles.subtleText}> (#{n.businessId})</Text>
                                                )}
                                            </Text>
                                        )}

                                        <Text style={styles.timeText}>{timeAgo(n.createdAt)}</Text>
                                    </View>
                                    {!n.read && <View style={styles.unreadDot} />}
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: colors.overlay20,
        alignItems: 'flex-end',
        paddingTop: 64,
        paddingHorizontal: 16,
    },
    panel: {
        width: '100%',
        maxWidth: 384,
        maxHeight: '70%',
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.gray100,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.gray900,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    markAllRead: {
        fontSize: 12,
        color: colors.blue600,
        fontWeight: '500',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorBanner: {
        marginHorizontal: 20,
        marginTop: 16,
        fontSize: 12,
        color: colors.red600,
        backgroundColor: colors.red50,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    list: {
        flexGrow: 0,
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
        alignItems: 'flex-start',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
    rowUnread: {
        backgroundColor: '#EFF6FF80',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.blue50,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginTop: 2,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        color: colors.blue600,
        fontWeight: '600',
        fontSize: 14,
    },
    genericIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.blue50,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    rowContent: {
        flex: 1,
        minWidth: 0,
    },
    message: {
        fontSize: 14,
        color: '#1F2937',
        lineHeight: 19,
    },
    subtleText: {
        fontSize: 12,
        color: colors.gray400,
    },
    metaText: {
        fontSize: 12,
        color: colors.gray500,
        marginTop: 4,
    },
    metaStrong: {
        fontWeight: '500',
        color: colors.gray700,
    },
    timeText: {
        fontSize: 12,
        color: colors.gray400,
        marginTop: 4,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    rejectButton: {
        borderWidth: 1,
        borderColor: colors.red200,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    rejectText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.red600,
    },
    approveButton: {
        backgroundColor: colors.blue600,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    approveText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.white,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.blue600,
        marginTop: 8,
    },
    disabled: {
        opacity: 0.5,
    },
})
