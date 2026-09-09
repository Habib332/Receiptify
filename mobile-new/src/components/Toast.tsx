import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { CheckCircle2, XCircle } from 'lucide-react-native'

export type ToastVariant = 'success' | 'error'

export type ToastConfig = {
    variant: ToastVariant
    message: string
} | null

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; text: string; icon: string }> = {
    success: { bg: '#111827', border: '#111827', text: '#ffffff', icon: '#4ADE80' },
    error: { bg: '#111827', border: '#111827', text: '#ffffff', icon: '#F87171' },
}

// Native-style compact pill toast: fades + slides in from the top,
// holds, then fades out. Auto-dismisses via onHide after `duration`.
export default function Toast({
    toast,
    onHide,
    duration = 2200,
    top = 8,
}: {
    toast: ToastConfig
    onHide: () => void
    duration?: number
    top?: number
}) {
    const opacity = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(-12)).current
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!toast) return

        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start()

        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: -12, duration: 180, useNativeDriver: true }),
            ]).start(() => onHide())
        }, duration)

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast])

    if (!toast) return null

    const palette = VARIANT_STYLES[toast.variant]
    const Icon = toast.variant === 'success' ? CheckCircle2 : XCircle

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.wrap,
                {
                    top,
                    opacity,
                    transform: [{ translateY }],
                    backgroundColor: palette.bg,
                    borderColor: palette.border,
                },
            ]}
        >
            <Icon size={16} color={palette.icon} />
            <Text style={[styles.text, { color: palette.text }]} numberOfLines={2}>
                {toast.message}
            </Text>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: '90%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 999,
    },
    text: {
        fontSize: 13,
        fontWeight: '600',
    },
})