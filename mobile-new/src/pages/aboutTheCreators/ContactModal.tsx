import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, Linking, ScrollView } from 'react-native'
import Svg, { Path } from 'react-native-svg'

type Props = {
    onClose: () => void
}

export default function ContactModal({ onClose }: Props) {
    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <ScrollView bounces={false}>
                        <View style={styles.headerRow}>
                            <View style={styles.headerTextWrap}>
                                <Text style={styles.title}>Contact the Developers</Text>
                                <Text style={styles.subtitle}>We'd love to hear from you.</Text>
                            </View>

                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                                    <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </Svg>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.contactList}>
                            <TouchableOpacity
                                onPress={() => Linking.openURL('mailto:hamza.zeeshan7163@gmail.com')}
                                style={styles.contactCard}
                            >
                                <Text style={styles.contactRole}>Frontend Developer</Text>
                                <Text style={styles.contactName}>Hamza Zeeshan</Text>
                                <Text style={styles.contactEmail}>hamza.zeeshan7163@gmail.com</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => Linking.openURL('mailto:habib.ahmed4781@gmail.com')}
                                style={styles.contactCard}
                            >
                                <Text style={styles.contactRole}>Backend Developer</Text>
                                <Text style={styles.contactName}>Habib Ahmed</Text>
                                <Text style={styles.contactEmail}>habib.ahmed4781@gmail.com</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footerRow}>
                            <TouchableOpacity onPress={onClose} style={styles.closeCta}>
                                <Text style={styles.closeCtaText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
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
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    headerTextWrap: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    subtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 4,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactList: {
        marginTop: 24,
        gap: 16,
    },
    contactCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
    },
    contactRole: {
        fontSize: 13,
        color: '#9ca3af',
    },
    contactName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginTop: 4,
    },
    contactEmail: {
        fontSize: 13,
        color: '#2563eb',
        marginTop: 8,
    },
    footerRow: {
        marginTop: 32,
        alignItems: 'flex-end',
    },
    closeCta: {
        width: '100%',
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    closeCtaText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
})
