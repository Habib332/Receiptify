import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { API_BASE_URL, authHeaders } from '../../api/config'
import { colors } from '../../theme/colors'

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
                headers: await authHeaders(),
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
                { method: 'PATCH', headers: await authHeaders() },
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
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pending join requests</Text>
            </View>

            {error && (
                <Text style={styles.errorBanner}>{error}</Text>
            )}

            <View>
                {loading && (
                    <Text style={styles.emptyState}>Loading requests...</Text>
                )}

                {!loading && requests.length === 0 && (
                    <Text style={styles.emptyState}>No pending requests.</Text>
                )}

                {requests.map((r) => {
                    const isActing = pendingActionId === r.request_id
                    return (
                        <View key={r.request_id} style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{r.user_name?.[0]?.toUpperCase() ?? '?'}</Text>
                                </View>
                                <View style={styles.rowInfo}>
                                    <Text style={styles.userName} numberOfLines={1}>{r.user_name}</Text>
                                    <Text style={styles.userEmail} numberOfLines={1}>{r.user_email}</Text>
                                    <Text style={styles.metaText}>
                                        Wants to join as{' '}
                                        <Text style={styles.roleText}>{r.requested_role}</Text> · {timeAgo(r.created_at)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.rowActions}>
                                <TouchableOpacity
                                    onPress={() => handleDecision(r.request_id, 'reject')}
                                    disabled={isActing}
                                    style={[styles.rejectButton, isActing && styles.disabled]}
                                >
                                    <Text style={styles.rejectText}>Reject</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDecision(r.request_id, 'approve')}
                                    disabled={isActing}
                                    style={[styles.approveButton, isActing && styles.disabled]}
                                >
                                    <Text style={styles.approveText}>{isActing ? '...' : 'Approve'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )
                })}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: 512,
        alignSelf: 'center',
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.gray100,
        overflow: 'hidden',
    },
    header: {
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
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        flex: 1,
        minWidth: 0,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.blue50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: colors.blue600,
        fontWeight: '600',
        fontSize: 14,
    },
    rowInfo: {
        flex: 1,
        minWidth: 0,
    },
    userName: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.gray900,
    },
    userEmail: {
        fontSize: 12,
        color: colors.gray400,
    },
    metaText: {
        fontSize: 12,
        color: colors.gray500,
        marginTop: 4,
    },
    roleText: {
        fontWeight: '500',
    },
    rowActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rejectButton: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    rejectText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray500,
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
    disabled: {
        opacity: 0.5,
    },
})
