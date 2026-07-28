import { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView, Image } from 'react-native'
import { API_BASE_URL, authHeaders } from '../../api/config'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'

type TeamMember = {
    id: string
    name: string
    email?: string | null
    role: 'owner' | 'manager' | 'staff' | string
    avatarUrl?: string | null
    joinedAt?: string | null
}

type TeamModalProps = {
    businessId: string
    businessName: string
    // The viewer's own role for this business ('owner' | 'manager' | 'staff').
    // Drives whether the remove button shows at all, and on which rows —
    // the backend re-checks this regardless, this is just for a clean UI.
    currentUserRole?: string | null
    onClose: () => void
}

const roleStyles: Record<string, { bg: string; color: string }> = {
    owner: { bg: colors.green50, color: colors.green700 },
    manager: { bg: colors.blue50, color: colors.blue700 },
    staff: { bg: colors.gray100, color: colors.gray600 },
}

// Owners first, then managers, then staff — mirrors how permissions cascade
// so the most senior people are easiest to find at a glance.
const roleOrder: Record<string, number> = { owner: 0, manager: 1, staff: 2 }

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

// Mirrors the backend's rule in business.service.js removeMemberFromBusiness:
// owner can remove managers/staff, manager can remove staff only, nobody
// can remove an owner. Kept here just to decide whether to show the button —
// the server is the actual source of truth.
function canRemove(viewerRole: string | null | undefined, targetRole: string) {
    if (targetRole === 'owner') return false
    if (viewerRole === 'owner') return true
    if (viewerRole === 'manager') return targetRole === 'staff'
    return false
}

export default function TeamModal({ businessId, businessName, currentUserRole, onClose }: TeamModalProps) {
    const [members, setMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
    const [removeLoading, setRemoveLoading] = useState(false)
    const [removeError, setRemoveError] = useState('')

    useEffect(() => {
        let cancelled = false

        const fetchMembers = async () => {
            setLoading(true)
            setError('')
            try {
                const res = await fetch(`${API_BASE_URL}/business/${businessId}/members`, {
                    method: 'GET',
                    headers: await authHeaders(),
                })

                const data = await res.json()

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Failed to load team')
                }

                if (cancelled) return

                // Normalize raw Postgres columns the same way the rest of
                // this codebase does (snake_case -> camelCase).
                const normalized: TeamMember[] = (data.data || []).map((m: any) => ({
                    id: String(m.id ?? m.user_id ?? m.userId),
                    name: m.name ?? m.full_name ?? m.fullName ?? 'Unknown',
                    email: m.email ?? null,
                    role: m.role ?? 'staff',
                    avatarUrl: m.avatarUrl ?? m.avatar_url ?? null,
                    joinedAt: m.joinedAt ?? m.joined_at ?? null,
                }))

                normalized.sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99))
                setMembers(normalized)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchMembers()
        return () => {
            cancelled = true
        }
    }, [businessId])

    const handleRemove = async () => {
        if (!removeTarget) return
        setRemoveLoading(true)
        setRemoveError('')
        try {
            const res = await fetch(`${API_BASE_URL}/business/${businessId}/members/${removeTarget.id}`, {
                method: 'DELETE',
                headers: await authHeaders(),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to remove member')
            }

            setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id))
            setRemoveTarget(null)
        } catch (err) {
            setRemoveError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setRemoveLoading(false)
        }
    }

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.headerTitle}>Team</Text>
                            <Text style={styles.headerSubtitle} numberOfLines={1}>{businessName}</Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Icon d="M6 18L18 6M6 6l12 12" size={16} color={colors.gray400} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.list}>
                        {loading && <Text style={styles.emptyState}>Loading team...</Text>}

                        {!loading && error && (
                            <View style={styles.errorWrap}>
                                <Text style={styles.errorBanner}>{error}</Text>
                            </View>
                        )}

                        {!loading && !error && members.length === 0 && (
                            <Text style={styles.emptyState}>No team members yet.</Text>
                        )}

                        {!loading && !error && members.length > 0 && members.map((member) => {
                            const style = roleStyles[member.role] ?? roleStyles.staff
                            return (
                                <View key={member.id} style={styles.memberRow}>
                                    <View style={styles.avatar}>
                                        {member.avatarUrl ? (
                                            <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
                                        ) : (
                                            <Text style={styles.avatarText}>{initials(member.name)}</Text>
                                        )}
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
                                        {member.email && (
                                            <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
                                        )}
                                    </View>
                                    <View style={[styles.roleBadge, { backgroundColor: style.bg }]}>
                                        <Text style={[styles.roleBadgeText, { color: style.color }]}>{member.role}</Text>
                                    </View>
                                    {canRemove(currentUserRole, member.role) && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setRemoveError('')
                                                setRemoveTarget(member)
                                            }}
                                            style={styles.removeButton}
                                        >
                                            <Text style={styles.removeButtonText}>Remove</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )
                        })}
                    </ScrollView>
                </Pressable>
            </Pressable>

            {removeTarget && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setRemoveTarget(null)}>
                    <Pressable style={styles.backdrop} onPress={() => setRemoveTarget(null)}>
                        <Pressable style={styles.confirmCard} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.confirmIconCircle}>
                                <Icon
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                    size={20}
                                    color={colors.red500}
                                    strokeWidth={1.8}
                                />
                            </View>
                            <Text style={styles.confirmTitle}>Remove {removeTarget.name}?</Text>
                            <Text style={styles.confirmMessage}>
                                They will lose access to this business and its data. This action can't be undone.
                            </Text>
                            {removeError && <Text style={styles.confirmError}>{removeError}</Text>}
                            <View style={styles.confirmRow}>
                                <TouchableOpacity
                                    onPress={() => setRemoveTarget(null)}
                                    disabled={removeLoading}
                                    style={[styles.confirmCancel, removeLoading && styles.disabled]}
                                >
                                    <Text style={styles.confirmCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleRemove}
                                    disabled={removeLoading}
                                    style={[styles.confirmRemove, removeLoading && styles.disabled]}
                                >
                                    <Text style={styles.confirmRemoveText}>
                                        {removeLoading ? 'Removing...' : 'Remove'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: colors.overlay40,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    card: {
        width: '100%',
        maxWidth: 448,
        maxHeight: '85%',
        backgroundColor: colors.white,
        borderRadius: 16,
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
    headerSubtitle: {
        fontSize: 12,
        color: colors.gray400,
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
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
    errorWrap: {
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    errorBanner: {
        fontSize: 12,
        color: colors.red600,
        backgroundColor: colors.red50,
        borderWidth: 1,
        borderColor: colors.red100,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    memberRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        color: colors.gray500,
        fontSize: 12,
        fontWeight: '600',
    },
    memberInfo: {
        flex: 1,
        minWidth: 120,
    },
    memberName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray900,
    },
    memberEmail: {
        fontSize: 12,
        color: colors.gray400,
    },
    roleBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    removeButton: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    removeButtonText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.red500,
    },
    confirmCard: {
        width: '100%',
        maxWidth: 384,
        maxHeight: '90%',
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 20,
    },
    confirmIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.red50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 6,
    },
    confirmMessage: {
        fontSize: 14,
        color: colors.gray500,
        marginBottom: 16,
    },
    confirmError: {
        fontSize: 12,
        color: colors.red600,
        backgroundColor: colors.red50,
        borderWidth: 1,
        borderColor: colors.red100,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
    },
    confirmRow: {
        flexDirection: 'row',
        gap: 12,
    },
    confirmCancel: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray600,
    },
    confirmRemove: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        backgroundColor: colors.red600,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmRemoveText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    disabled: {
        opacity: 0.5,
    },
})
