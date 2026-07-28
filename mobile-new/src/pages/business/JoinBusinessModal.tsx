import { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'

type RequestedRole = 'manager' | 'staff'

type JoinBusinessModalProps = {
    businessName: string
    loading: boolean
    onConfirm: (requestedRole: RequestedRole) => void
    onClose: () => void
}

export default function JoinBusinessModal({
    businessName,
    loading,
    onConfirm,
    onClose,
}: JoinBusinessModalProps) {
    const [requestedRole, setRequestedRole] = useState<RequestedRole>('staff')

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.iconCircle}>
                        <Icon
                            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                            size={24}
                            color={colors.blue600}
                            strokeWidth={1.8}
                        />
                    </View>

                    <Text style={styles.title}>Request to join {businessName}?</Text>
                    <Text style={styles.message}>
                        An owner or manager will review your request. You'll be notified once it's approved or
                        declined.
                    </Text>

                    <Text style={styles.label}>Requested role</Text>
                    <View style={styles.roleRow}>
                        {(['staff', 'manager'] as RequestedRole[]).map((role) => {
                            const active = requestedRole === role
                            return (
                                <TouchableOpacity
                                    key={role}
                                    onPress={() => setRequestedRole(role)}
                                    disabled={loading}
                                    style={[styles.roleButton, active ? styles.roleButtonActive : styles.roleButtonInactive]}
                                >
                                    <Text style={active ? styles.roleTextActive : styles.roleTextInactive}>
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    <View style={styles.row}>
                        <TouchableOpacity
                            onPress={onClose}
                            disabled={loading}
                            style={[styles.cancelButton, loading && styles.disabled]}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onConfirm(requestedRole)}
                            disabled={loading}
                            style={[styles.confirmButton, loading && styles.disabled]}
                        >
                            {loading && <ActivityIndicator size="small" color={colors.white} style={styles.spinner} />}
                            <Text style={styles.confirmText}>{loading ? 'Sending...' : 'Send Request'}</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
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
        maxWidth: 384,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 24,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.blue50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: colors.gray500,
        marginBottom: 20,
        lineHeight: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.gray500,
        marginBottom: 8,
    },
    roleRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    roleButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleButtonActive: {
        backgroundColor: colors.blue600,
    },
    roleButtonInactive: {
        backgroundColor: colors.gray50,
    },
    roleTextActive: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.white,
    },
    roleTextInactive: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.gray600,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.gray600,
    },
    confirmButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: 8,
        backgroundColor: colors.blue600,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    spinner: {
        marginRight: 8,
    },
    disabled: {
        opacity: 0.5,
    },
})
