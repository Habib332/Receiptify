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
                onPress={() => navigation.navigate('MainTabs', { screen: 'Scan' })}
                style={[styles.button, mode === 'single' && styles.buttonActive]}
            >
                <Text style={[styles.buttonText, mode === 'single' ? styles.buttonTextActive : styles.buttonTextInactive]}>
                    Single upload
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'ScanBulkUpload' })}
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
        alignSelf: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#2563eb',
        borderRadius: 999,
        padding: 4,
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'transparent',
    },
    buttonActive: {
        backgroundColor: '#2563eb',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    buttonTextActive: {
        color: '#ffffff',
    },
    buttonTextInactive: {
        color: '#2563eb',
    },
})