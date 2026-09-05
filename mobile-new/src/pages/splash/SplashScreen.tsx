import { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import Svg, { Path, Text as SvgText, Line } from 'react-native-svg'
import { useNavigation, CommonActions } from '@react-navigation/native'

// Same logo geometry as ReceiptLogo, but recoloured for a blue background:
// the receipt outline/fill and the "R" are white instead of blue, and the
// grey guide lines are a translucent white so they still read as subtle
// on the blue background. The red accent line is left untouched.
const ReceiptLogoInverted = ({ size = 96 }: { size?: number }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            {/* Receipt */}
            <Path
                d="M14 6H42L50 14V56L45 52L40 56L35 52L30 56L25 52L20 56L14 52V6Z"
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />

            {/* Folded Corner */}
            <Path
                d="M42 6V14H50"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />

            {/* R */}
            <SvgText
                x="32"
                y="26"
                textAnchor="middle"
                fontSize="18"
                fontWeight="700"
                fill="#FFFFFF"
                fontFamily="Inter, Arial, sans-serif"
            >
                R
            </SvgText>

            {/* Receipt Lines */}
            <Line
                x1="22"
                y1="34"
                x2="42"
                y2="34"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <Line
                x1="22"
                y1="40"
                x2="42"
                y2="40"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2"
                strokeLinecap="round"
            />

            {/* Accent Line — kept red, same as the original logo */}
            <Line
                x1="22"
                y1="46"
                x2="34"
                y2="46"
                stroke="#EF4444"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </Svg>
    )
}

type Props = {
    /** How long to show the splash before navigating away, in ms. Defaults to 2000. */
    durationMs?: number
    /** Name of the route to replace this screen with once the timer finishes. */
    nextRoute?: string
}

export default function SplashScreen({ durationMs = 2000, nextRoute = 'SignIn' }: Props) {
    const navigation = useNavigation<any>()
    const opacity = useRef(new Animated.Value(0)).current
    const scale = useRef(new Animated.Value(0.9)).current

    useEffect(() => {
        // Small fade + scale-in so the logo doesn't just snap into view.
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                friction: 5,
                tension: 80,
                useNativeDriver: true,
            }),
        ]).start()

        const timer = setTimeout(() => {
            // Reset (not push) so the splash screen can't be navigated
            // "back" to once the app has moved on.
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: nextRoute }],
                })
            )
        }, durationMs)

        return () => clearTimeout(timer)
    }, [navigation, durationMs, nextRoute])

    return (
        <View style={styles.screen}>
            <Animated.View style={{ opacity, transform: [{ scale }] }}>
                <ReceiptLogoInverted size={96} />
            </Animated.View>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
})