import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'

type Props = {
    businessName: string
    loading: boolean
    onConfirm: () => void
    onClose: () => void
}

export default function LeaveBusinessModal({ businessName, loading, onConfirm, onClose }: Props) {
    // The web version listened for the Escape key. There's no keyboard
    // equivalent on mobile — the hardware/gesture back action is wired up
    // via the Modal's onRequestClose prop instead, guarded the same way
    // (ignored while a leave request is in flight).
    const handleClose = () => {
        if (!loading) onClose()
    }

    return (
        <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
            <Pressable style={styles.backdrop} onPress={handleClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.iconCircle}>
                        <Icon
                            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                            size={20}
                            color={colors.orange500}
                            strokeWidth={1.8}
                        />
                    </View>

                    <Text style={styles.title}>Leave business?</Text>
                    <Text style={styles.message}>
                        You're about to leave <Text style={styles.businessName}>{businessName}</Text>. You'll lose
                        access to its receipts and data, and will need to send a new join request to rejoin later.
                    </Text>

                    <View style={styles.row}>
                        <TouchableOpacity
                            onPress={onClose}
                            disabled={loading}
                            style={[styles.cancelButton, loading && styles.disabled]}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onConfirm}
                            disabled={loading}
                            style={[styles.leaveButton, loading && styles.disabled]}
                        >
                            <Text style={styles.leaveText}>{loading ? 'Leaving...' : 'Leave business'}</Text>
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
        backgroundColor: colors.overlay30,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    card: {
        width: '100%',
        maxWidth: 384,
        maxHeight: '90%',
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.gray100,
        padding: 20,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.orange50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
        marginBottom: 6,
    },
    message: {
        fontSize: 14,
        color: colors.gray500,
        marginBottom: 24,
        lineHeight: 20,
    },
    businessName: {
        fontWeight: '600',
        color: colors.gray700,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        backgroundColor: colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray600,
    },
    leaveButton: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        backgroundColor: colors.orange500,
        alignItems: 'center',
        justifyContent: 'center',
    },
    leaveText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    disabled: {
        opacity: 0.5,
    },
})
