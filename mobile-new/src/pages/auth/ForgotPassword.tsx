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
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../App'
import { API_BASE_URL } from '../../api/config'
import ReceiptLogo from '../../logo/MainLogo'

const illustration = require('../../assets/sign-up.png')

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>

export default function ForgotPassword() {
    const navigation = useNavigation<Nav>()

    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [submitted, setSubmitted] = useState(false)

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
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
            <View style={styles.illustrationWrap}>
                <Image source={illustration} style={styles.illustration} resizeMode="cover" />
            </View>

            <View style={styles.formWrap}>
                <View style={styles.logoWrap}>
                    <ReceiptLogo size={48} />
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
                            <Text style={styles.successText}>
                                If an account exists for that email, a reset link has been sent.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={() => navigation.navigate('SignIn')}
                        >
                            <Text style={styles.submitButtonText}>Back to sign in</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
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

                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading}
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
    successBox: {
        marginBottom: 16,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#DCFCE7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    successText: { fontSize: 12, color: '#15803D' },
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
})
