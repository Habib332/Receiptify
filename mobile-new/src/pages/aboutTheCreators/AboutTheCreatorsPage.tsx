import { useState, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Bell } from 'lucide-react-native'
import Layout from '../../components/Layout'
import ContactModal from './ContactModal'
import NotificationsModal, { type NotificationItem } from '../business/NotificationModal'
import { API_BASE_URL, authHeaders } from '../../api/config'

interface Creator {
    name: string
    role: string
    description: string
    initials: string
    github: string
    linkedin: string
}

const creators: Creator[] = [
    {
        name: 'Hamza Zeeshan',
        role: 'Frontend Developer',
        description:
            'Designed and developed the complete frontend interface using React, TypeScript and Tailwind CSS.',
        initials: 'HZ',
        github: 'https://github.com/hamzaTheZeeshan',
        linkedin: 'https://www.linkedin.com/in/hamza-zeeshan-0a1407332/',
    },
    {
        name: 'Habib Ahmed      ',
        role: 'Backend Developer',
        description:
            'Developed the backend APIs, authentication system, database structure and business logic.',
        initials: 'HA',
        github: 'https://github.com/Habib332',
        linkedin: 'https://www.linkedin.com/in/habibahmed5ba3004/',
    },
]

export default function AboutTheCreatorsPage() {
    const insets = useSafeAreaInsets()
    const navigation = useNavigation<any>()
    const [showContactModal, setShowContactModal] = useState<boolean>(false)

    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [notificationsLoading, setNotificationsLoading] = useState(false)

    const fetchNotifications = useCallback(async () => {
        setNotificationsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/notifications`, {
                method: 'GET',
                headers: await authHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to load notifications')
            }
            setNotifications(
                (data.data || []).map((n: any) => ({
                    ...n,
                    id: n.id ?? n.notification_id,
                    businessName: n.businessName ?? n.business_name ?? null,
                    actorName: n.actorName ?? n.actor_name ?? null,
                    actorEmail: n.actorEmail ?? n.actor_email ?? null,
                    createdAt: n.createdAt ?? n.created_at,
                    read: n.read ?? n.is_read ?? false,
                }))
            )
        } catch (err) {
            console.error(err)
        } finally {
            setNotificationsLoading(false)
        }
    }, [])

    // Load notifications on mount and poll periodically so the bell badge
    // stays current even if the user leaves the app idle in the background.
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    const unreadNotificationCount = notifications.filter((n) => !n.read).length

    const handleMarkNotificationRead = async (id: string) => {
        const prev = notifications
        setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
                method: 'PATCH',
                headers: await authHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to mark notification as read')
            }
        } catch (err) {
            setNotifications(prev)
            console.error(err)
        }
    }

    const handleMarkAllNotificationsRead = async () => {
        const prev = notifications
        setNotifications((p) => p.map((n) => ({ ...n, read: true })))
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
                method: 'PATCH',
                headers: await authHeaders(),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to mark notifications as read')
            }
        } catch (err) {
            setNotifications(prev)
            console.error(err)
        }
    }

    const handleNotificationDecisionMade = async (notificationId: string, decision: 'approve' | 'reject') => {
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === notificationId && n.joinRequest
                    ? {
                        ...n,
                        read: true,
                        joinRequest: {
                            ...n.joinRequest,
                            status: decision === 'approve' ? 'approved' : 'rejected',
                        },
                    }
                    : n
            )
        )
        fetchNotifications()
    }

    return (
        <View style={styles.screen}>
            {/* Pinned header: sits outside Layout's internal ScrollView, so
                it stays fixed while Layout's children (everything below)
                scroll underneath it. Matches Dashboard's headerRow/h1/h1Sub
                heading style, plus the bell notification icon. */}
            <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.h1}>About the Creators</Text>
                    <Text style={styles.h1Sub}>Meet the people behind Receiptify</Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        setShowNotifications(true)
                        fetchNotifications()
                    }}
                    style={styles.bellButton}
                >
                    <Bell size={20} color="#9CA3AF" />
                    {unreadNotificationCount > 0 && (
                        <View style={styles.bellBadge}>
                            <Text style={styles.bellBadgeText}>
                                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <Layout>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Meet the Creators</Text>
                    <Text style={styles.sectionSubtitle}>
                        The team responsible for designing and building Receiptly.
                    </Text>
                </View>

                <View style={styles.creatorsList}>
                    {creators.map((creator) => (
                        <View key={creator.name} style={styles.creatorCard}>
                            <View style={styles.creatorRow}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{creator.initials}</Text>
                                </View>
                                <View style={styles.creatorInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.creatorName}>{creator.name}</Text>
                                        <View style={styles.rolePill}>
                                            <Text style={styles.rolePillText}>{creator.role}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.creatorDescription}>{creator.description}</Text>
                                    <View style={styles.linksRow}>
                                        <TouchableOpacity
                                            onPress={() => Linking.openURL(creator.github)}
                                            style={styles.githubButton}
                                        >
                                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="#374151">
                                                <Path d="M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 008.35 22.93c.58.11.79-.25.79-.56v-2.18c-3.19.69-3.86-1.36-3.86-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.69.08-.69 1.16.08 1.76 1.19 1.76 1.19 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.22-1.28-5.22-5.69 0-1.26.45-2.3 1.18-3.11-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.19a11.05 11.05 0 015.77 0c2.19-1.5 3.16-1.19 3.16-1.19.63 1.58.24 2.75.12 3.04.73.81 1.18 1.85 1.18 3.11 0 4.42-2.68 5.39-5.24 5.68.41.36.78 1.08.78 2.18v3.23c0 .31.21.68.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
                                            </Svg>
                                            <Text style={styles.githubButtonText}>GitHub</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => Linking.openURL(creator.linkedin)}
                                            style={styles.linkedinButton}
                                        >
                                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="#ffffff">
                                                <Path d="M4.98 3.5C4.98 4.6 4.1 5.5 3 5.5S1 4.6 1 3.5 1.9 1.5 3 1.5s1.98.9 1.98 2zM1.5 8h3V22h-3V8zm7 0h2.88v1.91h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.59V22h-3v-7.21c0-1.72-.03-3.94-2.4-3.94-2.41 0-2.78 1.88-2.78 3.82V22h-3V8z" />
                                            </Svg>
                                            <Text style={styles.linkedinButtonText}>LinkedIn</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.thankYouCard}>
                    <Text style={styles.thankYouEyebrow}>THANK YOU</Text>
                    <Text style={styles.thankYouTitle}>
                        Thanks for using
                        <Text style={styles.thankYouTitleAccent}> Receiptify.</Text>
                    </Text>
                    <Text style={styles.thankYouBody}>
                        We built Receiptify with one goal in mind to make receipt
                        management faster, cleaner and easier for businesses of every
                        size. We hope this platform helps you spend less time managing
                        paperwork and more time growing your business.
                    </Text>

                    <View style={styles.ctaWrap}>
                        <TouchableOpacity
                            onPress={() => setShowContactModal(true)}
                            style={styles.contactButton}
                        >
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={1.8}>
                                <Path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21.75 6.75v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75m19.5 0l-9.75 6.75L2.25 6.75"
                                />
                            </Svg>
                            <Text style={styles.contactButtonText}>Contact Us</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('AboutReceiptify')}
                            style={styles.learnMoreButton}
                        >
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={1.8}>
                                <Path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </Svg>
                            <Text style={styles.learnMoreButtonText}>Learn More about Receiptify</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {showContactModal && (
                    <ContactModal onClose={() => setShowContactModal(false)} />
                )}
            </Layout>

            {showNotifications && (
                <NotificationsModal
                    notifications={notifications}
                    loading={notificationsLoading}
                    onClose={() => setShowNotifications(false)}
                    onMarkRead={handleMarkNotificationRead}
                    onMarkAllRead={handleMarkAllNotificationsRead}
                    onDecisionMade={handleNotificationDecisionMade}
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#ffffff',
    },

    // Pinned header — matches Dashboard's headerRow/h1/h1Sub/bellButton
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    h1: { fontSize: 22, fontWeight: '700', color: '#111827' },
    h1Sub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
    bellButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    bellBadge: {
        position: 'absolute',
        top: 4,
        right: 6,
        minWidth: 14,
        height: 14,
        paddingHorizontal: 2,
        borderRadius: 7,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bellBadgeText: { fontSize: 9, color: '#fff' },

    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 4,
    },
    creatorsList: {
        gap: 20,
        marginBottom: 32,
    },
    creatorCard: {
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderRadius: 16,
        padding: 24,
    },
    creatorRow: {
        gap: 20,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#dbeafe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2563eb',
    },
    creatorInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
    },
    creatorName: {
        fontSize: 19,
        fontWeight: '600',
        color: '#111827',
    },
    rolePill: {
        backgroundColor: '#eff6ff',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    rolePillText: {
        fontSize: 10,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontWeight: '600',
        color: '#2563eb',
    },
    creatorDescription: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 12,
        lineHeight: 22,
    },
    linksRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 20,
    },
    githubButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    githubButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    linkedinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    linkedinButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#ffffff',
    },
    thankYouCard: {
        backgroundColor: 'rgba(239,246,255,0.6)',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 28,
    },
    thankYouEyebrow: {
        fontSize: 11,
        letterSpacing: 3,
        color: '#2563eb',
        fontWeight: '600',
        marginBottom: 8,
    },
    thankYouTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#111827',
    },
    thankYouTitleAccent: {
        color: '#2563eb',
    },
    thankYouBody: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 16,
        lineHeight: 22,
    },
    ctaWrap: {
        gap: 16,
        marginTop: 32,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    contactButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '600',
    },
    learnMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    learnMoreButtonText: {
        color: '#374151',
        fontSize: 15,
        fontWeight: '600',
    },
})  