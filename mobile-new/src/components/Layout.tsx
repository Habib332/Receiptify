import { useState, useEffect, type ReactNode } from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import MainLogo from '../logo/MainLogo'
import UserProfileModal from '../pages/profile/UserProfileModal'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api'

type Props = {
    children: ReactNode
}

type CurrentUser = {
    user_id: number
    name: string
    email: string
    avatar_url: string | null
    created_at: string
}

async function getToken() {
    return AsyncStorage.getItem('token')
}

async function authHeaders() {
    const token = await getToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Navigation now lives in the bottom tab bar (src/navigation/MainTabs.tsx).
// This component is just the top bar + scrollable content area that wraps
// each tab's screen content.
export default function Layout({ children }: Props) {
    const [user, setUser] = useState<CurrentUser | null>(null)
    const [showProfileModal, setShowProfileModal] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function fetchMe() {
            try {
                const headers = await authHeaders()
                const res = await fetch(`${API_BASE_URL}/users/me/profile`, {
                    method: 'GET',
                    headers,
                })

                const json = await res.json()

                if (!res.ok || !json.success) {
                    throw new Error(json.message || 'Failed to load user')
                }

                if (!cancelled) {
                    setUser(json.data.user)
                }
            } catch (err) {
                console.error(err)
            }
        }

        fetchMe()
        return () => {
            cancelled = true
        }
    }, [])

    const initials = user?.name ? getInitials(user.name) : '—'

    return (
        <View style={styles.container}>
            {/* Top bar */}
            <View style={styles.topBar}>
                <MainLogo size={26} />

                <TouchableOpacity
                    onPress={() => setShowProfileModal(true)}
                    accessibilityLabel="View profile"
                    style={styles.avatarSmall}
                >
                    {user?.avatar_url ? (
                        <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarInitials}>{initials}</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Main content */}
            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {children}
            </ScrollView>

            {showProfileModal && (
                <UserProfileModal onClose={() => setShowProfileModal(false)} />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    topBar: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        backgroundColor: '#ffffff',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    avatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#dbeafe',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitials: {
        color: '#2563eb',
        fontSize: 12,
        fontWeight: '600',
    },
})