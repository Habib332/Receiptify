import { useState } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../App'
import { API_BASE_URL, setToken, setStoredUser } from '../../api/config'
import ReceiptLogo from '../../logo/MainLogo'
import GoogleLogo from '../../logo/GoogleLogo'
import AppleLogo from '../../logo/AppleLogo'

// Same illustration asset used on web — update the path to wherever you
// copy your assets into the mobile project (e.g. src/assets/sign-in.png).
const illustration = require('../../../assets/sign-in.png')

type Nav = NativeStackNavigationProp<RootStackParamList, 'SignIn'>

export default function SignIn() {
    const navigation = useNavigation<Nav>()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        setError('')

        if (!email || !password) {
            setError('Please fill in all fields')
            return
        }

        setLoading(true)

        try {
            console.log("API URL:", `${API_BASE_URL}/auth/login`);
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

            navigation.navigate('SelectBusiness')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.screen}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.illustrationWrap}>
                    <Image source={illustration} style={styles.illustration} resizeMode="cover" />
                </View>

                <View style={styles.formWrap}>
                    <View style={styles.logoWrap}>
                        <ReceiptLogo size={44} />
                    </View>

                    <Text style={styles.heading}>Sign in</Text>
                    <Text style={styles.subheading}>Sign in with Open account</Text>

                    {/* Social login */}
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
                            secureTextEntry
                            autoComplete="password"
                            style={styles.input}
                        />
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
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    screen: {
        flexGrow: 1,
        backgroundColor: '#fff',
        paddingTop: 0,
        paddingBottom: 24,
    },
    illustrationWrap: {
        width: '100%',
        aspectRatio: 532 / 832,
        maxHeight: 380,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
    },
    illustration: {
        width: '100%',
        height: '100%',
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
    forgotRow: { alignItems: 'flex-end', marginTop: 2, marginBottom: 16 },
})