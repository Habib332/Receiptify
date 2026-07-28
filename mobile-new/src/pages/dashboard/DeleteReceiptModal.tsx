import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { AlertTriangle } from 'lucide-react-native'

type DeleteReceiptModalProps = {
    receiptLabel: string
    loading: boolean
    onConfirm: () => void
    onClose: () => void
}

export default function DeleteReceiptModal({ receiptLabel, loading, onConfirm, onClose }: DeleteReceiptModalProps) {
    return (
        <Modal transparent animationType="fade" visible onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <AlertTriangle size={22} color="#EF4444" />
                    </View>
                    <Text style={styles.title}>Delete {receiptLabel}?</Text>
                    <Text style={styles.body}>
                        This will permanently remove this receipt and its data. This action can't be undone.
                    </Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            onPress={onClose}
                            disabled={loading}
                            style={[styles.button, styles.cancelButton, loading && styles.disabled]}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onConfirm}
                            disabled={loading}
                            style={[styles.button, styles.deleteButton, loading && styles.disabled]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    card: {
        width: '100%',
        maxWidth: 384,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
    body: { fontSize: 13, color: '#6B7280', marginBottom: 24, lineHeight: 18 },
    buttonRow: { flexDirection: 'row', gap: 12 },
    button: { flex: 1, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    disabled: { opacity: 0.5 },
    cancelButton: { borderWidth: 1, borderColor: '#E5E7EB' },
    cancelButtonText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
    deleteButton: { backgroundColor: '#DC2626' },
    deleteButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },
})
