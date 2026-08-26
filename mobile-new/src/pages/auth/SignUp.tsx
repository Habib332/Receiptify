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
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../App'
import { API_BASE_URL, setToken, setStoredUser } from '../../api/config'
import ReceiptLogo from '../../logo/MainLogo'
import GoogleLogo from '../../logo/GoogleLogo'
import AppleLogo from '../../logo/AppleLogo'

const illustration = require('../../../assets/sign-up.png')

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// The illustration's real dimensions (477x717, already sharp-cornered) —
// used so the hero container matches its exact aspect ratio and shows the
// full artwork with zero crop.
const IMAGE_ASPECT_RATIO = 477 / 717
const HERO_TOP_OFFSET = 0
const HERO_HEIGHT = SCREEN_WIDTH / IMAGE_ASPECT_RATIO

type Nav = NativeStackNavigationProp<RootStackParamList, 'SignUp'>

export default function SignUp() {
    const navigation = useNavigation<Nav>()
    const insets = useSafeAreaInsets()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

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

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        setError('')

        if (!name || !email || !password || !confirmPassword) {
            setError('Please fill in all fields')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Registration failed')
            }

            const token = data.data?.identityToken
            const user = data.data?.user

            if (token) {
                await setToken(token)
            }
            if (user) {
                await setStoredUser(user)
            }

            navigation.navigate('SelectBusiness')
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

                            <Text style={styles.heading}>Create an account</Text>
                            <Text style={styles.subheading}>Sign up with Open account</Text>

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
                                <Feather name="user" size={16} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Full name"
                                    placeholderTextColor="#9CA3AF"
                                    autoComplete="name"
                                    style={styles.input}
                                />
                            </View>

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
                                    secureTextEntry
                                    autoComplete="password-new"
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.inputRow}>
                                <Feather name="lock" size={16} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm password"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry
                                    autoComplete="password-new"
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
                                    <Text style={styles.submitButtonText}>Create account</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.bottomRow}>
                                <Text style={styles.bottomText}>Already have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('SignIn')} hitSlop={8}>
                                    <Text style={styles.link}>Sign in</Text>
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