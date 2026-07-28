import { useState } from 'react'
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
} from 'react-native'

type EditableReceiptFields = {
    receiver_name: string
    sender_name: string
    transaction_reference: string
    amount: string
    receipt_date: string
    notes: string
}

type EditReceiptModalProps = {
    initial: EditableReceiptFields
    loading: boolean
    onSave: (data: EditableReceiptFields) => void
    onClose: () => void
}

export default function EditReceiptModal({ initial, loading, onSave, onClose }: EditReceiptModalProps) {
    const [form, setForm] = useState<EditableReceiptFields>(initial)

    const update = (field: keyof EditableReceiptFields) => (value: string) => {
        setForm((f) => ({ ...f, [field]: value }))
    }

    return (
        <Modal transparent animationType="fade" visible onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                        <Text style={styles.title}>Edit receipt details</Text>
                        <Text style={styles.subtitle}>
                            Update the details extracted from this receipt's screenshot.
                        </Text>

                        <View style={styles.fields}>
                            <Field label="Receiver name" value={form.receiver_name} onChangeText={update('receiver_name')} />
                            <Field label="Sender name" value={form.sender_name} onChangeText={update('sender_name')} />

                            <View style={styles.row}>
                                <View style={styles.half}>
                                    <Field
                                        label="Amount"
                                        value={form.amount}
                                        onChangeText={update('amount')}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.half}>
                                    {/* Native date pickers vary by platform — swap in
                                        @react-native-community/datetimepicker for a proper
                                        picker; this keeps YYYY-MM-DD free-text entry for now. */}
                                    <Field
                                        label="Date (YYYY-MM-DD)"
                                        value={form.receipt_date}
                                        onChangeText={update('receipt_date')}
                                    />
                                </View>
                            </View>

                            <Field
                                label="Transaction reference"
                                value={form.transaction_reference}
                                onChangeText={update('transaction_reference')}
                            />

                            <Field
                                label="Notes"
                                value={form.notes}
                                onChangeText={update('notes')}
                                multiline
                            />
                        </View>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                onPress={onClose}
                                disabled={loading}
                                style={[styles.button, styles.cancelButton, loading && styles.disabled]}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => onSave(form)}
                                disabled={loading}
                                style={[styles.button, styles.saveButton, loading && styles.disabled]}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}

function Field({
    label,
    value,
    onChangeText,
    keyboardType,
    multiline,
}: {
    label: string
    value: string
    onChangeText: (v: string) => void
    keyboardType?: 'default' | 'numeric'
    multiline?: boolean
}) {
    return (
        <View>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                multiline={multiline}
                numberOfLines={multiline ? 2 : 1}
                style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
            />
        </View>
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
        maxWidth: 420,
        maxHeight: '90%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
    },
    title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
    subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 18 },
    fields: { gap: 12 },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    fieldLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
    fieldInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: '#111827',
    },
    fieldInputMultiline: { minHeight: 60, textAlignVertical: 'top' },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    button: { flex: 1, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    disabled: { opacity: 0.5 },
    cancelButton: { borderWidth: 1, borderColor: '#E5E7EB' },
    cancelButtonText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
    saveButton: { backgroundColor: '#2563EB' },
    saveButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },
})

export type { EditableReceiptFields }
