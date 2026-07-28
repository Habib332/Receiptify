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
} from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../App'
import { API_BASE_URL } from '../../api/config'
import  ReceiptLogo from '../../logo/MainLogo'

const illustration = require('../../../assets/sign-up.png')

type Nav = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>
type Route = RouteProp<RootStackParamList, 'ResetPassword'>

export default function ResetPassword() {
    const navigation = useNavigation<Nav>()
    // On web this came from useSearchParams()'s ?token=. On mobile, the
    // deep link (e.g. myapp://reset-password?token=...) should be
    // configured to land here with `token` as a route param — see
    // navigation/types.ts.
    const route = useRoute<Route>()
    const token = ((route.params as { token?: string } | undefined)?.token) || ''

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async () => {
        setError('')

        if (!token) {
            setError('This reset link is missing or invalid. Please request a new one.')
            return
        }

        if (!password || !confirmPassword) {
            setError('Please fill in both fields')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(`${API_BASE_URL}/password-reset/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'This reset link is invalid or has expired')
            }

            setSuccess(true)
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

                <Text style={styles.heading}>{success ? 'Password reset' : 'Set a new password'}</Text>
                <Text style={styles.subheading}>
                    {success
                        ? 'Your password has been updated. You can now sign in.'
                        : 'Choose a new password for your account.'}
                </Text>

                {success ? (
                    <TouchableOpacity style={styles.submitButton} onPress={() => navigation.navigate('SignIn')}>
                        <Text style={styles.submitButtonText}>Back to sign in</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        {!!error && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        {!token && (
                            <View style={styles.warnBox}>
                                <Text style={styles.warnText}>
                                    No reset token found in the link. Please use the link from your email, or{' '}
                                    <Text
                                        style={styles.warnLink}
                                        onPress={() => navigation.navigate('ForgotPassword')}
                                    >
                                        request a new one
                                    </Text>
                                    .
                                </Text>
                            </View>
                        )}

                        <View style={styles.inputRow}>
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="New password"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry
                                style={styles.input}
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <TextInput
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Confirm new password"
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
                                <Text style={styles.submitButtonText}>Reset password</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.bottomRow}>
                            <Text style={styles.bottomText}>Remembered your password? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                                <Text style={styles.link}>Sign in</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    screen: { flexGrow: 1, backgroundColor: '#fff', padding: 16, paddingVertical: 24 },
    illustrationWrap: {
        width: '100%',
        height: 200,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
    },
    illustration: { width: '100%', height: '100%' },
    formWrap: { width: '100%', maxWidth: 384, alignSelf: 'center' },
    logoWrap: { marginBottom: 20 },
    heading: { fontSize: 24, fontWeight: '700', color: '#111827' },
    subheading: { fontSize: 12, color: '#6B7280', marginTop: 8, marginBottom: 20 },
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
    warnBox: {
        marginBottom: 12,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FEF3C7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    warnText: { fontSize: 12, color: '#B45309' },
    warnLink: { fontWeight: '600', textDecorationLine: 'underline' },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 12,
        minHeight: 44,
        marginBottom: 10,
    },
    input: { flex: 1, fontSize: 13, color: '#374151', letterSpacing: 1 },
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
})
