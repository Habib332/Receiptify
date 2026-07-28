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
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
            <View style={styles.illustrationWrap}>
                <Image source={illustration} style={styles.illustration} resizeMode="cover" />
            </View>

            <View style={styles.formWrap}>
                <View style={styles.logoWrap}>
                    <ReceiptLogo size={48} />
                </View>

                <Text style={styles.heading}>Sign in</Text>
                <Text style={styles.subheading}>Sign in with Open account</Text>

                {/* Social login */}
                <View style={styles.socialRow}>
                    <TouchableOpacity
                        style={styles.socialButton}
                        onPress={() => Linking.openURL(`${API_BASE_URL}/auth/google`)}
                    >
                        <GoogleLogo />
                        <Text style={styles.socialButtonText}>Google</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton}>
                        <AppleLogo />
                        <Text style={styles.socialButtonText}>Apple ID</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>Or continue with email address</Text>
                    <View style={styles.dividerLine} />
                </View>

                {!!error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.inputRow}>
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email address"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputRow}>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry
                        style={styles.input}
                    />
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
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
                    <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                        <Text style={styles.link}>Sign up</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.forgotRow}>
                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={styles.link}>Forgot password?</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flexGrow: 1,
        backgroundColor: '#fff',
        padding: 16,
        paddingVertical: 24,
    },
    illustrationWrap: {
        width: '100%',
        height: 200,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
    },
    illustration: {
        width: '100%',
        height: '100%',
    },
    formWrap: {
        width: '100%',
        maxWidth: 384,
        alignSelf: 'center',
    },
    logoWrap: { marginBottom: 20 },
    heading: { fontSize: 24, fontWeight: '700', color: '#111827' },
    subheading: { fontSize: 12, color: '#6B7280', marginTop: 8, marginBottom: 20 },
    socialRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        minHeight: 44,
    },
    socialButtonText: { fontSize: 12, fontWeight: '500', color: '#374151' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    dividerText: { fontSize: 11, color: '#9CA3AF' },
    errorBox: {
        marginBottom: 12,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    errorText: { fontSize: 12, color: '#DC2626' },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 12,
        minHeight: 44,
        marginBottom: 10,
    },
    input: { flex: 1, fontSize: 13, color: '#374151' },
    submitButton: {
        width: '100%',
        backgroundColor: '#2563EB',
        borderRadius: 8,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: { backgroundColor: '#93C5FD' },
    submitButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
    bottomText: { fontSize: 12, color: '#6B7280' },
    link: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
    forgotRow: { alignItems: 'flex-end', marginTop: 4 },
})
