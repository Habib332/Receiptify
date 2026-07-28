import { useState, useEffect, type ReactNode, JSX } from 'react'
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Modal,
    Pressable,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useRoute } from '@react-navigation/native'
import Svg, { Path, Circle } from 'react-native-svg'
import MainLogo from '../logo/MainLogo'
import UserProfileModal from '../pages/profile/UserProfileModal'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api'

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

// Each item maps to a screen name in the root navigator (React Navigation),
// replacing the web app's route paths.
const navItems: {
    to: string
    label: string
    icon: (active: boolean) => JSX.Element
}[] = [
    {
        to: 'Scan',
        label: 'Scan Receipts',
        icon: (active) => (
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.8}>
                <Path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38 0-.753-.116-1.076-.334a2.32 2.32 0 01-.734-.847 2.29 2.29 0 01-.239-1.089 2.31 2.31 0 01.334-1.076c.19-.319.462-.573.79-.734a2.29 2.29 0 011.089-.239h13.42a2.29 2.29 0 011.089.239c.328.161.6.415.79.734.19.319.316.68.334 1.076a2.29 2.29 0 01-.239 1.089 2.32 2.32 0 01-.734.847 2.31 2.31 0 01-1.076.334 2.31 2.31 0 01-1.641-1.055M6.827 6.175L3.75 20.25h16.5L17.173 6.175M6.827 6.175h10.346"
                    stroke={active ? '#2563eb' : '#6b7280'}
                />
                <Circle cx={12} cy={13} r={2.75} stroke={active ? '#2563eb' : '#6b7280'} />
            </Svg>
        ),
    },
    {
        to: 'Dashboard',
        label: 'See Data',
        icon: (active) => (
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.8}>
                <Path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.5l3.75-3.75L10 13l4.5-6L21 13.5M3 20.25h18M3 20.25V16.5m18 3.75V13.5"
                    stroke={active ? '#2563eb' : '#6b7280'}
                />
            </Svg>
        ),
    },
    {
        to: 'SelectBusiness',
        label: 'Businesses',
        icon: (active) => (
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.8}>
                <Path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                    stroke={active ? '#2563eb' : '#6b7280'}
                />
            </Svg>
        ),
    },
]

export default function Layout({ children }: Props) {
    const navigation = useNavigation<any>()
    const route = useRoute()

    const [user, setUser] = useState<CurrentUser | null>(null)
    const [showProfileModal, setShowProfileModal] = useState(false)
    // On mobile there's no md/desktop breakpoint to switch between a
    // static column and an off-canvas drawer — the sidebar is always a
    // drawer here, opened from the top bar's menu button.
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

    const displayName = user?.name ?? 'Loading...'
    const initials = user?.name ? getInitials(user.name) : '—'

    const closeMobileNav = () => setMobileNavOpen(false)

    const navigateTo = (screen: string) => {
        closeMobileNav()
        navigation.navigate(screen)
    }

    const sidebarContent = (
        <>
            <View style={styles.sidebarHeader}>
                <MainLogo size={30} />
                <TouchableOpacity
                    onPress={closeMobileNav}
                    accessibilityLabel="Close menu"
                    style={styles.closeButton}
                >
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </Svg>
                </TouchableOpacity>
            </View>

            <View style={styles.navList}>
                {navItems.map((item) => {
                    const isActive = route.name === item.to
                    return (
                        <TouchableOpacity
                            key={item.to}
                            onPress={() => navigateTo(item.to)}
                            style={[styles.navItem, isActive && styles.navItemActive]}
                        >
                            {item.icon(isActive)}
                            <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )
                })}
            </View>

            <View style={styles.sidebarFooter}>
                <TouchableOpacity
                    onPress={() => navigateTo('AboutTheCreators')}
                    style={[styles.navItem, route.name === 'AboutTheCreators' && styles.navItemActive]}
                >
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={1.8}>
                        <Path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                        />
                    </Svg>
                    <Text style={[styles.navItemText, route.name === 'AboutTheCreators' && styles.navItemTextActive]}>
                        About the Creators
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        setShowProfileModal(true)
                        closeMobileNav()
                    }}
                    style={styles.profileRow}
                >
                    <View style={styles.avatar}>
                        {user?.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarInitials}>{initials}</Text>
                        )}
                    </View>

                    <View style={styles.profileTextWrap}>
                        <Text style={styles.profileName} numberOfLines={1}>
                            {displayName}
                        </Text>
                        <Text style={styles.profileSubtext}>View profile</Text>
                    </View>

                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </Svg>
                </TouchableOpacity>
            </View>
        </>
    )

    return (
        <View style={styles.container}>
            {/* Top bar */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => setMobileNavOpen(true)}
                    accessibilityLabel="Open menu"
                    style={styles.menuButton}
                >
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={1.8}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                    </Svg>
                </TouchableOpacity>

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

            {/* Sidebar drawer */}
            <Modal
                visible={mobileNavOpen}
                animationType="slide"
                transparent
                onRequestClose={closeMobileNav}
            >
                <Pressable style={styles.backdrop} onPress={closeMobileNav}>
                    <Pressable style={styles.drawer} onPress={(e) => e.stopPropagation()}>
                        {sidebarContent}
                    </Pressable>
                </Pressable>
            </Modal>

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
    menuButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        flexDirection: 'row',
    },
    drawer: {
        width: 260,
        height: '100%',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 24,
    },
    sidebarHeader: {
        marginBottom: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navList: {
        flex: 1,
        gap: 4,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    navItemActive: {
        backgroundColor: '#eff6ff',
    },
    navItemText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    navItemTextActive: {
        color: '#2563eb',
    },
    sidebarFooter: {
        gap: 4,
        paddingTop: 16,
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRadius: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#dbeafe',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
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
    profileTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    profileName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    profileSubtext: {
        fontSize: 12,
        color: '#9ca3af',
    },
})
