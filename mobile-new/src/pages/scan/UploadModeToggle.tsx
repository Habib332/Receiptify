import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'

interface UploadModeToggleProps {
    mode: 'single' | 'bulk'
}

export default function UploadModeToggle({ mode }: UploadModeToggleProps) {
    const navigation = useNavigation<any>()

    return (
        <View style={styles.wrapper}>
            <TouchableOpacity
                onPress={() => navigation.navigate('ScanUpload')}
                style={[styles.button, mode === 'single' && styles.buttonActive]}
            >
                <Text style={[styles.buttonText, mode === 'single' ? styles.buttonTextActive : styles.buttonTextInactive]}>
                    Single upload
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => navigation.navigate('ScanBulkUpload')}
                style={[styles.button, mode === 'bulk' && styles.buttonActive]}
            >
                <Text style={[styles.buttonText, mode === 'bulk' ? styles.buttonTextActive : styles.buttonTextInactive]}>
                    Bulk upload
                </Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#2563eb',
        borderRadius: 999,
        padding: 4,
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
    },
    buttonActive: {
        backgroundColor: '#ffffff',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    buttonTextActive: {
        color: '#2563eb',
    },
    buttonTextInactive: {
        color: '#ffffff',
    },
})
