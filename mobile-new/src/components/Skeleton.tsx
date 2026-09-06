import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native'

// Base shimmering block. Renders a light gray rectangle (or circle, via
// borderRadius) whose opacity pulses/sweeps continuously — used as the
// building block for every full-screen skeleton in the app (Dashboard,
// BusinessPage, etc). Kept dependency-free (no reanimated / linear-gradient)
// so it drops into any RN project as-is.
export default function Skeleton({
    width,
    height,
    borderRadius = 8,
    style,
}: {
    width?: number | `${number}%`
    height?: number
    borderRadius?: number
    style?: ViewStyle
}) {
    const opacity = useRef(new Animated.Value(0.4)).current

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.4,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ])
        )
        loop.start()
        return () => loop.stop()
    }, [opacity])

    return (
        <Animated.View
            style={[
                styles.base,
                { width, height, borderRadius, opacity },
                style,
            ]}
        />
    )
}

// Convenience wrapper for a row of skeleton blocks (e.g. a card's icon +
// two lines of text) so screens don't have to repeat gap/flexDirection.
export function SkeletonRow({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
    return <View style={[styles.row, style]}>{children}</View>
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: '#E5E7EB',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
})