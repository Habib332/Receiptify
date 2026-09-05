import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Layout from '../../components/Layout'

export default function AboutReceiptifyPage() {
    const navigation = useNavigation<any>()
    const insets = useSafeAreaInsets()

    const stats = [
        {
            label: 'Developers',
            value: '2',
            sub: 'Project Members',
            bg: '#eff6ff',
            color: '#2563eb',
        },
        {
            label: 'Technologies',
            value: '8+',
            sub: 'Modern Stack',
            bg: '#f0fdf4',
            color: '#16a34a',
        },
    ]

    const technologies = [
        'React',
        'TypeScript',
        'Node.js',
        'Express',
        'PostgreSQL',
        'Supabase',
        'Tailwind CSS',
        'OCR',
    ]

    // Navigates back to the tab navigator, landing on a specific tab.
    // Falls back to a plain goBack() if for some reason we can't reach
    // the parent Tab.Navigator (e.g. this screen was somehow opened as
    // the very first route with nothing to pop to).
    const goToTab = (screen: string) => {
        const rootNavigation = navigation.getParent() ?? navigation
        rootNavigation.dispatch(
            CommonActions.navigate({
                name: 'MainTabs',
                params: { screen },
            })
        )
    }

    return (
        <View style={styles.screen}>
            {/* Pinned header with back button — same treatment as
                AboutTheCreatorsPage's header, plus a back arrow that
                returns to AboutTheCreators. */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    accessibilityLabel="Back"
                >
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </Svg>
                </TouchableOpacity>
                <Text style={styles.title}>About Receiptify</Text>
            </View>

            <Layout>
                {/* Hero */}
                <View style={styles.hero}>
                    <Text style={styles.eyebrow}>ABOUT RECEIPTIFY</Text>
                    <Text style={styles.heroTitle}>
                        Built by students,
                        <Text style={styles.heroTitleAccent}> designed for businesses.</Text>
                    </Text>
                    <Text style={styles.heroBody}>
                        Receiptify is a modern receipt management platform that helps
                        businesses organize, scan and manage receipts effortlessly.
                        Our goal is to replace manual bookkeeping with a fast,
                        beautiful and intelligent experience.
                    </Text>
                </View>

                {/* Statistics */}
                <View style={styles.statsGrid}>
                    {stats.map((stat) => (
                        <View key={stat.label} style={styles.statCard}>
                            <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
                                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={stat.color} strokeWidth={1.8}>
                                    <Path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3v18" />
                                </Svg>
                            </View>

                            <Text style={styles.statLabel}>{stat.label}</Text>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statSub}>{stat.sub}</Text>
                        </View>
                    ))}
                </View>

                {/* About Project */}
                <View style={styles.aboutCard}>
                    <Text style={styles.aboutEyebrow}>ABOUT RECEIPTIFY</Text>
                    <Text style={styles.aboutTitle}>What is Receiptify?</Text>

                    <Text style={styles.aboutBody}>
                        Receiptify is a modern receipt management platform designed to
                        simplify the way businesses organize financial records.
                        Instead of manually entering receipt information,
                        users can upload receipts, manage businesses,
                        track spending and keep all financial documents
                        in one organized dashboard.
                    </Text>

                    <Text style={[styles.aboutBody, styles.aboutBodySpaced]}>
                        The project was developed as a university software engineering
                        project using modern web technologies with a strong focus on
                        clean user experience, responsive design and scalable architecture.
                    </Text>

                    {/* Technology Stack */}
                    <View style={styles.techWrap}>
                        {technologies.map((tech) => (
                            <View key={tech} style={styles.techPill}>
                                <Text style={styles.techPillText}>{tech}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </Layout>

            {/* Visual bottom tab bar — mirrors MainTabs' CustomTabBar so the
                page feels consistent with the rest of the app, even though
                this screen lives outside the real Tab.Navigator (it was
                pushed via Stack from AboutTheCreatorsPage). Tapping an item
                jumps into the actual tab navigator on that tab. Nothing is
                shown as "active" since we're not really inside the tab
                stack right now. */}
            <View style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View style={styles.bar}>
                    <TouchableOpacity
                        onPress={() => goToTab('Businesses')}
                        style={styles.tabItem}
                        accessibilityLabel="Businesses"
                    >
                        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8}>
                            <Path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                            />
                        </Svg>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => goToTab('Dashboard')}
                        style={styles.tabItem}
                        accessibilityLabel="Dashboard"
                    >
                        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8}>
                            <Path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 13.5l3.75-3.75L10 13l4.5-6L21 13.5M3 20.25h18M3 20.25V16.5m18 3.75V13.5"
                            />
                        </Svg>
                    </TouchableOpacity>

                    <View style={styles.scanSlot}>
                        <TouchableOpacity
                            onPress={() => goToTab('Scan')}
                            activeOpacity={0.85}
                            style={styles.scanButton}
                            accessibilityLabel="Scan Receipts"
                        >
                            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
                                <Path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m-4 12h2a2 2 0 002-2v-2M8 12h8"
                                />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => goToTab('AboutTheCreators')}
                        style={styles.tabItem}
                        accessibilityLabel="About"
                    >
                        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8}>
                            <Path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                            />
                        </Svg>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => goToTab('Profile')}
                        style={styles.tabItem}
                        accessibilityLabel="Profile"
                    >
                        <View style={styles.profileAvatar}>
                            <Text style={styles.profileAvatarInitials}>··</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    hero: {
        backgroundColor: 'rgba(239,246,255,0.6)',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 28,
        marginBottom: 24,
    },
    eyebrow: {
        fontSize: 11,
        letterSpacing: 3,
        color: '#2563eb',
        fontWeight: '600',
        marginBottom: 8,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 32,
    },
    heroTitleAccent: {
        color: '#2563eb',
    },
    heroBody: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 16,
        lineHeight: 22,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        flexBasis: '47%',
        flexGrow: 1,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderRadius: 16,
        padding: 20,
    },
    statIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    statLabel: {
        fontSize: 12,
        color: '#9ca3af',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginTop: 4,
    },
    statSub: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
    },
    aboutCard: {
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
    },
    aboutEyebrow: {
        fontSize: 11,
        letterSpacing: 3,
        color: '#9ca3af',
        fontWeight: '600',
        marginBottom: 12,
    },
    aboutTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    aboutBody: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 24,
    },
    aboutBodySpaced: {
        marginTop: 20,
    },
    techWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 32,
    },
    techPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#eff6ff',
    },
    techPillText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#2563eb',
    },
    // --- Bottom tab bar (visual only) ---
    barWrap: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 16,
    },
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        minHeight: 56,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 60,
        minHeight: 44,
    },
    scanSlot: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: 72,
    },
    scanButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -32,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 6 : 0,
        borderWidth: 4,
        borderColor: '#ffffff',
    },
    profileAvatar: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    profileAvatarInitials: {
        fontSize: 9,
        fontWeight: '700',
        color: '#2563EB',
    },
})