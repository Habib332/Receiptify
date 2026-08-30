import { useEffect, useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'

import BusinessPage from '../pages/business/BusinessPage'
import Dashboard from '../pages/dashboard/Dashboard'
import ScanUpload from '../pages/scan/ScanUpload'
import AboutTheCreatorsPage from '../pages/aboutTheCreators/AboutTheCreatorsPage'
import UserProfileModal from '../pages/profile/UserProfileModal'
import { API_BASE_URL, authHeaders } from '../api/config'
import ScanBulkUpload from '../pages/scan/ScanBulkUpload'
export type MainTabParamList = {
    Businesses: undefined
    Dashboard: { businessId?: string }
    Scan: undefined
    ScanBulkUpload: undefined
    AboutTheCreators: undefined
    Profile: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

// --- Icons -----------------------------------------------------------

function BusinessesIcon({ active }: { active: boolean }) {
    const color = active ? '#2563EB' : '#9CA3AF'
    return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2 : 1.8}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
            />
        </Svg>
    )
}

function DashboardIcon({ active }: { active: boolean }) {
    const color = active ? '#2563EB' : '#9CA3AF'
    return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2 : 1.8}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.5l3.75-3.75L10 13l4.5-6L21 13.5M3 20.25h18M3 20.25V16.5m18 3.75V13.5"
            />
        </Svg>
    )
}

function ScanIcon() {
    // Always white — this icon only ever sits on the raised blue button.
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m-4 12h2a2 2 0 002-2v-2M8 12h8"
            />
        </Svg>
    )
}

function CreatorsIcon({ active }: { active: boolean }) {
    const color = active ? '#2563EB' : '#9CA3AF'
    return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2 : 1.8}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
            <Circle cx={12} cy={6.75} r={0.01} stroke="none" />
        </Svg>
    )
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Avatar-as-tab-icon: shows the user's photo (or initials) instead of an
// SVG glyph, with a blue ring when the Profile tab is active.
function ProfileIcon({
    active,
    avatarUrl,
    name,
}: {
    active: boolean
    avatarUrl: string | null
    name: string
}) {
    return (
        <View style={[styles.profileAvatar, active && styles.profileAvatarActive]}>
            {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImg} />
            ) : (
                <Text style={styles.profileAvatarInitials}>{getInitials(name || '?')}</Text>
            )}
        </View>
    )
}

// --- Custom tab bar ----------------------------------------------------
// Renders Businesses / Dashboard / [raised Scan] / About the Creators /
// Profile as a fixed row, matching the reference layout (home / stats /
// raised scan / badge / history / profile).

const TAB_LABELS: Record<string, string> = {
    Businesses: 'Businesses',
    Dashboard: 'Dashboard',
    Scan: 'Scan',
    ScanBulkUpload: 'Scan',
    AboutTheCreators: 'About',
    Profile: 'Profile',
}

function CustomTabBar({ state, navigation, avatarUrl, name }: any) {
    const insets = useSafeAreaInsets()

    return (
        <View style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.bar}>
                {state.routes.map((route: any, index: number) => {
                    const isFocused = state.index === index
                    const isScan = route.name === 'Scan'
                      if (route.name === 'ScanBulkUpload') {
                      return null
                    }
                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        })

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name)
                        }
                    }

                    if (isScan) {
                        return (
                            <View key={route.key} style={styles.scanSlot}>
                                <TouchableOpacity
                                    onPress={onPress}
                                    activeOpacity={0.85}
                                    style={styles.scanButton}
                                    accessibilityLabel="Scan Receipts"
                                >
                                    <ScanIcon />
                                </TouchableOpacity>
                            </View>
                        )
                    }

                    if (route.name === 'Profile') {
                        return (
                            <TouchableOpacity
                                key={route.key}
                                onPress={onPress}
                                style={styles.tabItem}
                                accessibilityLabel="Profile"
                            >
                                <ProfileIcon active={isFocused} avatarUrl={avatarUrl} name={name} />
                                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                                    {TAB_LABELS[route.name]}
                                </Text>
                            </TouchableOpacity>
                        )
                    }

                    const Icon =
                        route.name === 'Businesses'
                            ? BusinessesIcon
                            : route.name === 'Dashboard'
                              ? DashboardIcon
                              : CreatorsIcon

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabItem}
                            accessibilityLabel={TAB_LABELS[route.name]}
                        >
                            <Icon active={isFocused} />
                            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                                {TAB_LABELS[route.name]}
                            </Text>
                        </TouchableOpacity>
                    )
                })}
            </View>
        </View>
    )
}

export default function MainTabs() {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [name, setName] = useState('')

    useEffect(() => {
        let cancelled = false

        async function fetchMe() {
            try {
                const res = await fetch(`${API_BASE_URL}/users/me/profile`, {
                    method: 'GET',
                    headers: await authHeaders(),
                })

                const json = await res.json()

                if (!res.ok || !json.success) {
                    throw new Error(json.message || 'Failed to load user')
                }

                if (!cancelled) {
                    setAvatarUrl(json.data.user.avatar_url)
                    setName(json.data.user.name)
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

    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} avatarUrl={avatarUrl} name={name} />}
            screenOptions={{ headerShown: false }}
            initialRouteName="Dashboard"
        >
            <Tab.Screen name="Businesses" component={BusinessPage} />
            <Tab.Screen name="Dashboard" component={Dashboard} />
            <Tab.Screen name="Scan" component={ScanUpload} />
            <Tab.Screen name="ScanBulkUpload" component={ScanBulkUpload} />
            <Tab.Screen name="AboutTheCreators" component={AboutTheCreatorsPage} />
            <Tab.Screen name="Profile" component={UserProfileModal} />
        </Tab.Navigator>
    )
}

const styles = StyleSheet.create({
    barWrap: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 10,
    },
    bar: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        minWidth: 56,
    },
    tabLabel: {
        fontSize: 10.5,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    tabLabelActive: {
        color: '#2563EB',
    },
    scanSlot: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: 64,
    },
    scanButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -28,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 6 : 0,
        borderWidth: 4,
        borderColor: '#ffffff',
    },
    profileAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    profileAvatarActive: {
        borderWidth: 1.5,
        borderColor: '#2563EB',
    },
    profileAvatarImg: {
        width: '100%',
        height: '100%',
    },
    profileAvatarInitials: {
        fontSize: 8,
        fontWeight: '700',
        color: '#2563EB',
    },
})