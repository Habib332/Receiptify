import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, LayoutChangeEvent } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'

interface UploadModeToggleProps {
    mode: 'single' | 'bulk'
}

export default function UploadModeToggle({ mode }: UploadModeToggleProps) {
    const navigation = useNavigation<any>()
    const [segmentWidth, setSegmentWidth] = useState(0)
    const translateX = useRef(new Animated.Value(0)).current

    const onLayout = (e: LayoutChangeEvent) => {
        const w = (e.nativeEvent.layout.width - 8) / 2 // minus wrapper padding (4px each side)
        setSegmentWidth(w)
    }

    useEffect(() => {
        if (!segmentWidth) return
        Animated.spring(translateX, {
            toValue: mode === 'single' ? 0 : segmentWidth,
            useNativeDriver: true,
            speed: 18,
            bounciness: 6,
        }).start()
    }, [mode, segmentWidth])

    return (
        <View style={styles.wrapper} onLayout={onLayout}>
            {segmentWidth > 0 && (
                <Animated.View
                    style={[
                        styles.indicator,
                        { width: segmentWidth, transform: [{ translateX }] },
                    ]}
                />
            )}

            <TouchableOpacity
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === 'single' }}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Scan' })}
                style={styles.button}
            >
                <Feather name="file" size={16} color={mode === 'single' ? '#ffffff' : '#2563eb'} />
                <Text style={[styles.buttonText, mode === 'single' ? styles.buttonTextActive : styles.buttonTextInactive]}>
                    Single upload
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === 'bulk' }}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('MainTabs', { screen: 'ScanBulkUpload' })}
                style={styles.button}
            >
                <Feather name="copy" size={16} color={mode === 'bulk' ? '#ffffff' : '#2563eb'} />
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
        alignSelf: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 999,
        padding: 4,
        position: 'relative',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    indicator: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: 4,
        borderRadius: 999,
        backgroundColor: '#2563eb',
        shadowColor: '#2563eb',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minWidth: 120,
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