import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'

type Props = {
    title?: string
    message: string
    onClose: () => void
}

// Small, centered modal for errors the user is likely to miss if they only
// appear as a banner at the top of the page (e.g. permission errors from
// delete/edit — "You are not the owner or manager of this business").
export default function ErrorModal({ title = 'Something went wrong', message, onClose }: Props) {
    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.iconCircle}>
                        <Icon
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                            size={24}
                            color={colors.red500}
                            strokeWidth={1.8}
                        />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <TouchableOpacity style={styles.button} onPress={onClose}>
                        <Text style={styles.buttonText}>Got it</Text>
                    </TouchableOpacity>
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
        alignItems: 'center',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: colors.gray500,
        marginBottom: 24,
        textAlign: 'center',
    },
    button: {
        width: '100%',
        minHeight: 44,
        backgroundColor: colors.blue600,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
})
