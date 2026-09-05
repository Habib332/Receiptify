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
    Linking,
    Dimensions,
    StatusBar,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../App'
import { API_BASE_URL, setToken, setStoredUser } from '../../api/config'
import ReceiptLogo from '../../logo/MainLogo'
import GoogleLogo from '../../logo/GoogleLogo'
import AppleLogo from '../../logo/AppleLogo'

const illustration = require('../../../assets/sign-in.png')

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const IMAGE_ASPECT_RATIO = 460 / 722
const HERO_TOP_OFFSET = 0
const HERO_HEIGHT = SCREEN_WIDTH / IMAGE_ASPECT_RATIO
const SHEET_RADIUS = 28

type Nav = NativeStackNavigationProp<RootStackParamList, 'SignIn'>

export default function SignIn() {
    const navigation = useNavigation<Nav>()
    const insets = useSafeAreaInsets()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    // Controls whether the password field's characters are masked. Off
    // (masked) by default, same as any standard sign-in form; toggled by
    // the eye icon inside the field.
    const [showPassword, setShowPassword] = useState(false)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

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

        if (!email || !password) {
            setError('Please fill in all fields')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Login failed')
            }

            const token = data.data?.identityToken
            const user = data.data?.user

            if (token) {
                await setToken(token)
            }
            if (user) {
                await setStoredUser(user)
            }

            navigation.navigate('MainTabs', { screen: 'Businesses' })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* Hero stays mounted always now — we blur it instead of unmounting it */}
            <View
                style={[
                    styles.hero,
                    keyboardVisible && styles.heroKeyboardOpen,
                ]}
            >
                <Image source={illustration} style={styles.heroImage} resizeMode="cover" />
                {keyboardVisible && (
                    <BlurView
                        intensity={40}
                        tint="light"
                        style={StyleSheet.absoluteFill}
                    />
                )}
            </View>

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

                                <Text style={styles.heading}>Sign in</Text>
                                <Text style={styles.subheading}>Sign in with Open account</Text>

                                <View style={styles.socialRow}>
                                    <TouchableOpacity
                                        style={styles.socialButton}
                                        activeOpacity={0.7}
                                        onPress={() => Linking.openURL(`${API_BASE_URL}/auth/google`)}
                                    >
                                        <GoogleLogo />
                                        <Text style={styles.socialButtonText}>Google</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                                        <AppleLogo />
                                        <Text style={styles.socialButtonText}>Apple ID</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.dividerRow}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>Or continue with email</Text>
                                    <View style={styles.dividerLine} />
                                </View>

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

                                <View style={styles.inputRow}>
                                    <Feather name="lock" size={16} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Password"
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry={!showPassword}
                                        autoComplete="password"
                                        style={[styles.input, styles.inputWithTrailingIcon]}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword((v) => !v)}
                                        hitSlop={8}
                                        style={styles.trailingIconButton}
                                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <Feather
                                            name={showPassword ? 'eye-off' : 'eye'}
                                            size={16}
                                            color="#9CA3AF"
                                        />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.forgotRow}>
                                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8}>
                                        <Text style={styles.link}>Forgot password?</Text>
                                    </TouchableOpacity>
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
                                        <Text style={styles.submitButtonText}>Start tracking</Text>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.bottomRow}>
                                    <Text style={styles.bottomText}>Don't have an account? </Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('SignUp')} hitSlop={8}>
                                        <Text style={styles.link}>Sign up</Text>
                                    </TouchableOpacity>
                                </View>
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
        backgroundColor: '#fff',
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
    heroKeyboardOpen: {
        // Shrinks the hero to a slim strip behind the sheet when keyboard is open,
        // rather than fully hiding it — gives the blurred peek-through effect.
        height: 140,
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
        borderTopLeftRadius: SHEET_RADIUS,
        borderTopRightRadius: SHEET_RADIUS,
        paddingTop: 24,
        paddingBottom: 24,
        overflow: 'hidden',
    },
    sheetKeyboardOpen: {
        marginTop: 140,
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
    socialRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        minHeight: 46,
        backgroundColor: '#fff',
    },
    socialButtonText: { fontSize: 13, fontWeight: '500', color: '#374151' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    dividerText: { fontSize: 11.5, color: '#9CA3AF' },
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
    // Extra right-padding on the password field so typed text never runs
    // underneath the eye icon that sits at the end of the row.
    inputWithTrailingIcon: { paddingRight: 8 },
    trailingIconButton: {
        paddingHorizontal: 4,
        paddingVertical: 4,
        marginLeft: 4,
    },
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
    forgotRow: { alignItems: 'flex-end', marginTop: 2, marginBottom: 16 },
})