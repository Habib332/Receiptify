import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'

type DeleteConfirmModalProps = {
    businessName: string
    loading: boolean
    onConfirm: () => void
    onClose: () => void
}

export default function DeleteConfirmModal({ businessName, loading, onConfirm, onClose }: DeleteConfirmModalProps) {
    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.iconCircle}>
                        <Icon
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                            size={20}
                            color={colors.red500}
                            strokeWidth={1.8}
                        />
                    </View>
                    <Text style={styles.title}>Delete {businessName}?</Text>
                    <Text style={styles.message}>
                        This will permanently remove this business and its data. This action can't be undone.
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
                            style={[styles.deleteButton, loading && styles.disabled]}
                        >
                            <Text style={styles.deleteText}>{loading ? 'Deleting...' : 'Delete'}</Text>
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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.red50,
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
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
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
        fontWeight: '600',
        color: colors.gray600,
    },
    deleteButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: 8,
        backgroundColor: colors.red600,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    disabled: {
        opacity: 0.5,
    },
})
