import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../../App'
import { API_BASE_URL, setToken } from '../../api/config'

// Route this at a deep link like myapp://auth/callback and register that
// scheme as the Google OAuth redirect URI (set
// FRONTEND_OAUTH_CALLBACK_URL in the backend .env to match). The
// `code`/`error` params below arrive from that deep link, same as the
// ?code=/?error= query params did on web.
//
// The Google button in SignIn currently opens the OAuth URL via
// Linking.openURL, which hands off to the system browser. For a smoother
// in-app flow, consider expo-web-browser's openAuthSessionAsync, which
// can capture the redirect directly instead of relying on a deep link
// re-opening the app.

type Nav = NativeStackNavigationProp<RootStackParamList, 'AuthCallback'>
type Route = RouteProp<RootStackParamList, 'AuthCallback'>

export default function AuthCallback() {
    const navigation = useNavigation<Nav>()
    const route = useRoute<Route>()
    const [error, setError] = useState('')

    useEffect(() => {
        const params = route.params as { code?: string; error?: string } | undefined
        const code = params?.code
        const oauthError = params?.error

        if (oauthError) {
            setError('Google sign-in was cancelled or failed. Please try again.')
            return
        }

        if (!code) {
            setError('Missing sign-in code. Please try again.')
            return
        }

        const exchange = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/auth/google/exchange`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                })

                const data = await res.json()

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Sign-in failed')
                }

                const token = data.data?.identityToken

                if (token) {
                    await setToken(token)
                }

                // Same as password login: identityToken has no business
                // selected yet, so route to business selection/creation next.
                navigation.navigate('SelectBusiness')
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong')
            }
        }

        exchange()
    }, [route.params, navigation])

    if (error) {
        return (
            <View style={styles.centerScreen}>
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')} style={styles.backButton}>
                    <Text style={styles.link}>Back to sign in</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <View style={styles.centerScreen}>
            <ActivityIndicator size="small" color="#2563EB" style={{ marginBottom: 12 }} />
            <Text style={styles.loadingText}>Signing you in...</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    centerScreen: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 12,
    },
    errorBox: {
        maxWidth: 384,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    errorText: { fontSize: 12, color: '#DC2626', textAlign: 'center' },
    backButton: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
    link: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
    loadingText: { fontSize: 12, color: '#6B7280' },
})
