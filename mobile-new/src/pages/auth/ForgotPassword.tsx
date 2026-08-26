import { useState, useEffect } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    StatusBar,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../App'
import { API_BASE_URL } from '../../api/config'
import ReceiptLogo from '../../logo/MainLogo'

const illustration = require('../../../assets/sign-up.png')

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// The illustration's real dimensions (477x717, already sharp-cornered) —
// used so the hero container matches its exact aspect ratio and shows the
// full artwork with zero crop.
const IMAGE_ASPECT_RATIO = 477 / 717
const HERO_TOP_OFFSET = 0
const HERO_HEIGHT = SCREEN_WIDTH / IMAGE_ASPECT_RATIO

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>

export default function ForgotPassword() {
    const navigation = useNavigation<Nav>()
    const insets = useSafeAreaInsets()

    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [submitted, setSubmitted] = useState(false)

    // Hides the hero illustration entirely while the keyboard is open, so
    // the form gets that screen space back instead of the image just being
    // covered/overlapped.
    const [keyboardVisible, setKeyboardVisible] = useState(false)

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

        const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
        const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))

        return () => {
            showSub.remove()
            hideSub.remove()
        }
    }, [])

    const handleSubmit = async () => {
        setError('')

        if (!email) {
            setError('Please enter your email address')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(`${API_BASE_URL}/password-reset/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Something went wrong')
            }

            // Backend always returns the same generic message whether or not
            // the email exists (anti-enumeration), so we just show it as-is.
            setSubmitted(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {!keyboardVisible && (
                <View style={styles.hero}>
                    <Image source={illustration} style={styles.heroImage} resizeMode="cover" />
                </View>
            )}

            <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
                      <KeyboardAvoidingView
                    style={styles.flex}
                    behavior="padding"
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
                >
                    <ScrollView
                        contentContainerStyle={styles.screen}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View
                            style={[
                                styles.sheet,
                                keyboardVisible && styles.sheetKeyboardOpen,
                                { paddingBottom: 24 + insets.bottom },
                            ]}
                        >
                            <View style={styles.formWrap}>
                            <View style={styles.logoWrap}>
                                <ReceiptLogo size={44} />
                            </View>

                            <Text style={styles.heading}>Forgot your password?</Text>
                            <Text style={styles.subheading}>
                                {submitted
                                    ? 'Check your inbox for a reset link.'
                                    : "Enter the email associated with your account and we'll send you a link to reset your password."}
                            </Text>

                            {submitted ? (
                                <>
                                    <View style={styles.successBox}>
                                        <Feather name="check-circle" size={14} color="#15803D" />
                                        <Text style={styles.successText}>
                                            If an account exists for that email, a reset link has been sent.
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.submitButton}
                                        activeOpacity={0.85}
                                        onPress={() => navigation.navigate('SignIn')}
                                    >
                                        <Text style={styles.submitButtonText}>Back to sign in</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    {!!error && (
                                        <View style={styles.errorBox}>
                                            <Feather name="alert-circle" size={14} color="#DC2626" />
                                            <Text style={styles.errorText}>{error}</Text>
                                        </View>
                                    )}

                                    <View style={styles.inputRow}>
                                        <Feather name="mail" size={16} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="Email address"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoComplete="email"
                                            style={styles.input}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        onPress={handleSubmit}
                                        disabled={loading}
                                        activeOpacity={0.85}
                                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.submitButtonText}>Send reset link</Text>
                                        )}
                                    </TouchableOpacity>

                                    <View style={styles.bottomRow}>
                                        <Text style={styles.bottomText}>Remembered your password? </Text>
                                        <TouchableOpacity onPress={() => navigation.navigate('SignIn')} hitSlop={8}>
                                            <Text style={styles.link}>Sign in</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    )
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    flex: {
        flex: 1,
    },
    hero: {
        position: 'absolute',
        top: HERO_TOP_OFFSET,
        left: 0,
        right: 0,
        height: HERO_HEIGHT,
        backgroundColor: '#F3F4F6',
        overflow: 'hidden',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    safeArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    screen: {},
    sheet: {
        marginTop: HERO_TOP_OFFSET + HERO_HEIGHT,
        backgroundColor: '#fff',
        paddingTop: 24,
        paddingBottom: 24,
    },
    sheetKeyboardOpen: {
        marginTop: 0,
    },
    formWrap: {
        width: '100%',
        maxWidth: 384,
        alignSelf: 'center',
        paddingHorizontal: 20,
    },
    logoWrap: { marginBottom: 14 },
    heading: { fontSize: 24, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
    subheading: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 20 },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 14,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    errorText: { fontSize: 12.5, color: '#DC2626', flexShrink: 1 },
    successBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#DCFCE7',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    successText: { fontSize: 12.5, color: '#15803D', flexShrink: 1 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        minHeight: 48,
        marginBottom: 12,
    },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, color: '#111827' },
    submitButton: {
        width: '100%',
        backgroundColor: '#2563EB',
        borderRadius: 10,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 2,
    },
    submitButtonDisabled: { backgroundColor: '#93C5FD', shadowOpacity: 0 },
    submitButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    bottomText: { fontSize: 13, color: '#6B7280' },
    link: { fontSize: 13, color: '#2563EB', fontWeight: '500' },
})