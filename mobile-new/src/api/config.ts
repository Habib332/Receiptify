import AsyncStorage from '@react-native-async-storage/async-storage'

// Same backend, unchanged. Set EXPO_PUBLIC_API_URL in your .env (Expo
// exposes any EXPO_PUBLIC_* var to the client bundle, mirroring
// VITE_API_URL on web). Falls back to localhost for local dev.
//
// NOTE: on a physical device or simulator, "localhost" refers to the
// device itself, not your dev machine — use your machine's LAN IP
// (e.g. http://192.168.1.20:5000/api) or an Expo tunnel when testing
// outside a browser-based simulator.
export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_URL || 'https://receiptify-zeta.vercel.app/api'

// ---- Token storage ----
// Web used sessionStorage (tab-scoped, cleared on close). React Native
// has no equivalent of "tab" — AsyncStorage persists across app
// restarts, which is normal and expected for a mobile app.
const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export async function getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY)
}

export async function setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token)
}

export async function clearToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY)
}

export async function setStoredUser(user: unknown): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))
}

export async function getStoredUser<T = any>(): Promise<T | null> {
    const raw = await AsyncStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as T) : null
}

// authHeaders/jsonHeaders were synchronous on web (sessionStorage is
// synchronous). AsyncStorage is async, so these are now async too —
// every call site does `await authHeaders()` instead of `authHeaders()`.
export async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

export const jsonHeaders = authHeaders
