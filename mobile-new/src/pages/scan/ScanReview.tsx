import { useState, useEffect, useRef, useCallback } from 'react'
import {
    View,
    Text,
    Image,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Bell } from 'lucide-react-native'
import Layout from '../../components/Layout'
import NotificationsModal, { type NotificationItem } from '../business/NotificationModal'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://receiptify-zeta.vercel.app/api'

async function getToken() {
    return AsyncStorage.getItem('token')
}

async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}

interface Receipt {
    receipt_id: number | string
    amount: string | number | null
    currency: string
    receipt_date: string | null
    notes: string | null
    image_url: string | null
    sender_name: string | null
    sender_bank: string | null
    receiver_name: string | null
    receiver_bank: string | null
    transaction_reference: string | null
    duplicate_status: 'none' | 'flagged' | 'confirmed_duplicate' | 'not_duplicate' | null
}

type RouteParams = {
    receipt?: Receipt
}

function toDateInputValue(value: string | null | undefined) {
    if (!value) return ''
    return value.slice(0, 10)
}

const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 30000

export default function ScanReview() {
    const navigation = useNavigation<any>()
    const route = useRoute()
    const insets = useSafeAreaInsets()
    const params = (route.params as RouteParams) || {}
    const initialReceipt = params.receipt

    // If someone lands here directly (e.g. stale/missing nav params) with
    // no receipt, there's nothing to review — bounce back to the upload
    // step rather than showing fabricated placeholder data. This check
    // MUST run before any hooks below, matching the web version and the
    // bulk-review screen, so hook order stays consistent for the
    // lifetime of this mounted screen.
    if (!initialReceipt) {
        navigation.replace('ScanUpload')
        return null
    }

    const [receipt, setReceipt] = useState<Receipt>(initialReceipt)
    const [polling, setPolling] = useState(
        initialReceipt.amount == null || initialReceipt.receipt_date == null,
    )
    const [pollTimedOut, setPollTimedOut] = useState(false)

    // "Business" is just the receiver — the payee/vendor on the receipt.
    const [receiverName, setReceiverName] = useState((initialReceipt.receiver_name || '').toUpperCase())
    const [amount, setAmount] = useState(
        initialReceipt.amount != null ? String(initialReceipt.amount) : '',
    )
    const [date, setDate] = useState(toDateInputValue(initialReceipt.receipt_date))
    const [notes, setNotes] = useState(initialReceipt.notes || '')

    const [senderName, setSenderName] = useState((initialReceipt.sender_name || '').toUpperCase())
    const [senderBank, setSenderBank] = useState(initialReceipt.sender_bank || '')
    const [receiverBank, setReceiverBank] = useState(initialReceipt.receiver_bank || '')
    const [transactionReference, setTransactionReference] = useState(
        initialReceipt.transaction_reference || '',
    )

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Track which fields the user has actually touched, so a poll update
    // never clobbers something they've already typed over.
    const touched = useRef({
        receiverName: false,
        amount: false,
        date: false,
        notes: false,
        senderName: false,
        senderBank: false,
        receiverBank: false,
        transactionReference: false,
    })

    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [imageError, setImageError] = useState(false)

    // Pinned header notification bell — same fetch/read/decision pattern
    // used on the About the Creators screen, kept local to this file.
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

    useEffect(() => {
        if (!receipt.image_url) return

        let cancelled = false
        setImageError(false)

        const fetchImageUrl = async () => {
            try {
                const headers = await authHeaders()
                const res = await fetch(
                    `${API_BASE_URL}/receipts/${receipt.receipt_id}/image-url`,
                    { headers },
                )
                const result = await res.json()
                if (!res.ok || !result.success) throw new Error()
                if (!cancelled) setImageUrl(result.data.signedUrl)
            } catch {
                if (!cancelled) setImageError(true)
            }
        }

        fetchImageUrl()

        return () => {
            cancelled = true
        }
    }, [receipt.receipt_id, receipt.image_url])

    useEffect(() => {
        if (!polling) return

        let cancelled = false
        const startedAt = Date.now()

        const tick = async () => {
            if (cancelled) return
            try {
                const headers = await authHeaders()
                const res = await fetch(`${API_BASE_URL}/receipts/${receipt.receipt_id}`, {
                    headers,
                })
                const result = await res.json()
                if (!res.ok || !result.success) return

                const updated: Receipt = result.data
                if (cancelled) return

                setReceipt(updated)

                if (!touched.current.receiverName && updated.receiver_name) {
                    setReceiverName(updated.receiver_name.toUpperCase())
                }
                if (!touched.current.amount && updated.amount != null) {
                    setAmount(String(updated.amount))
                }
                if (!touched.current.date && updated.receipt_date) {
                    setDate(toDateInputValue(updated.receipt_date))
                }
                if (!touched.current.senderName && updated.sender_name) {
                    setSenderName(updated.sender_name.toUpperCase())
                }
                if (!touched.current.senderBank && updated.sender_bank) {
                    setSenderBank(updated.sender_bank)
                }
                if (!touched.current.receiverBank && updated.receiver_bank) {
                    setReceiverBank(updated.receiver_bank)
                }
                if (!touched.current.transactionReference && updated.transaction_reference) {
                    setTransactionReference(updated.transaction_reference)
                }
                if (!touched.current.notes && updated.notes) {
                    setNotes(updated.notes)
                }

                const stillMissing = updated.amount == null || updated.receipt_date == null

                if (!stillMissing) {
                    setPolling(false)
                    return
                }

                if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
                    setPolling(false)
                    setPollTimedOut(true)
                    return
                }

                if (!cancelled) {
                    timer = setTimeout(tick, POLL_INTERVAL_MS)
                }
            } catch {
                if (!cancelled && Date.now() - startedAt < POLL_TIMEOUT_MS) {
                    timer = setTimeout(tick, POLL_INTERVAL_MS)
                }
            }
        }

        let timer = setTimeout(tick, POLL_INTERVAL_MS)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [polling, receipt.receipt_id])

    const stillProcessing = polling
    const showTimeoutNotice = pollTimedOut && (amount === '' || !date)
    const isPossibleDuplicate = receipt.duplicate_status === 'flagged'

    const handleSubmit = async () => {
        setError('')

        if (!receiverName.trim()) {
            setError('Receiver name is required')
            return
        }
        if (!amount || Number(amount) <= 0) {
            setError('Enter a valid amount')
            return
        }
        if (!date) {
            setError('Date is required')
            return
        }

        setSaving(true)
        try {
            const headers = await authHeaders()
            const res = await fetch(`${API_BASE_URL}/receipts/${receipt.receipt_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify({
                    receiverName: receiverName.trim().toUpperCase(),
                    amount: Number(amount),
                    receiptDate: date,
                    notes: notes.trim(),
                    senderName: senderName.trim().toUpperCase() || undefined,
                    senderBank: senderBank.trim() || undefined,
                    receiverBank: receiverBank.trim() || undefined,
                    transactionReference: transactionReference.trim() || undefined,
                }),
            })

            const result = await res.json()

            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Failed to save receipt')
            }

            navigation.navigate('ScanUpload')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save receipt')
        } finally {
            setSaving(false)
        }
    }

    return (
        <View style={styles.screen}>
            {/* Pinned header: sits outside Layout's internal ScrollView, so
                it stays fixed while Layout's children (everything below)
                scroll underneath it. Matches AboutTheCreators' headerRow/h1/
                h1Sub heading style, plus the bell notification icon. */}
            <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.h1}>Review your receipt</Text>
                    <Text style={styles.h1Sub}>Confirm the details we found, or make changes below.</Text>
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
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Step indicator */}
                    <View style={styles.stepRow}>
                        <View style={styles.stepItem}>
                            <View style={styles.stepDoneCircle}>
                                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={3}>
                                    <Path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </Svg>
                            </View>
                            <Text style={styles.stepLabelInactive}>Upload</Text>
                        </View>
                        <View style={styles.stepDivider} />
                        <View style={styles.stepItem}>
                            <View style={styles.stepActiveCircle}>
                                <Text style={styles.stepActiveNumber}>2</Text>
                            </View>
                            <Text style={styles.stepLabelActive}>Review</Text>
                        </View>
                    </View>

                    {/* Receipt preview */}
                    <View style={styles.previewCard}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="contain" />
                        ) : receipt.image_url && !imageError ? (
                            <View style={styles.previewPlaceholder}>
                                <ActivityIndicator color="#d1d5db" />
                                <Text style={styles.previewPlaceholderText}>Loading image...</Text>
                            </View>
                        ) : (
                            <View style={styles.previewPlaceholder}>
                                <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1.5}>
                                    <Path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 10.5h.008v.008H18V10.5zm-12-6h12a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0118 18.75H6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 016 4.5z" />
                                </Svg>
                                <Text style={styles.previewPlaceholderText}>
                                    {imageError ? "Couldn't load image" : 'No image · go back to upload one'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Editable extracted data */}
                    <View style={styles.form}>
                        {isPossibleDuplicate && (
                            <View style={styles.warningBanner}>
                                <Text style={styles.warningText}>
                                    This looks similar to a receipt you've already added to this business. Double check it isn't a duplicate before saving.
                                </Text>
                            </View>
                        )}

                        {stillProcessing ? (
                            <View style={styles.infoBannerAmber}>
                                <ActivityIndicator size="small" color="#b45309" />
                                <Text style={styles.infoTextAmber}>
                                    Reading your receipt — this updates automatically, usually within a few seconds.
                                </Text>
                            </View>
                        ) : showTimeoutNotice ? (
                            <View style={styles.infoBannerAmber}>
                                <Text style={styles.infoTextAmber}>
                                    Couldn't read this one automatically — please fill in the details below.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.infoBannerGreen}>
                                <Text style={styles.infoTextGreen}>
                                    We've filled in what we could find. Double check before saving.
                                </Text>
                            </View>
                        )}

                        {error && (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorBannerText}>{error}</Text>
                            </View>
                        )}

                        <View style={styles.row}>
                            <View style={styles.halfField}>
                                <Text style={styles.fieldLabel}>Amount (PKR)</Text>
                                <TextInput
                                    value={amount}
                                    onChangeText={(v) => {
                                        touched.current.amount = true
                                        setAmount(v)
                                    }}
                                    placeholder="0.00"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="numeric"
                                    style={styles.input}
                                />
                            </View>
                            <View style={styles.halfField}>
                                <Text style={styles.fieldLabel}>Date</Text>
                                <TextInput
                                    value={date}
                                    onChangeText={(v) => {
                                        touched.current.date = true
                                        setDate(v)
                                    }}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#9ca3af"
                                    style={styles.input}
                                />
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Transfer details</Text>
                            <View style={styles.row}>
                                <View style={styles.halfField}>
                                    <Text style={styles.fieldLabel}>Receiver name</Text>
                                    <TextInput
                                        value={receiverName}
                                        onChangeText={(v) => {
                                            touched.current.receiverName = true
                                            setReceiverName(v.toUpperCase())
                                        }}
                                        placeholder="Who was paid"
                                        placeholderTextColor="#9ca3af"
                                        style={styles.input}
                                    />
                                </View>
                                <View style={styles.halfField}>
                                    <Text style={styles.fieldLabel}>Receiver bank</Text>
                                    <TextInput
                                        value={receiverBank}
                                        onChangeText={(v) => {
                                            touched.current.receiverBank = true
                                            setReceiverBank(v)
                                        }}
                                        placeholder="Bank name"
                                        placeholderTextColor="#9ca3af"
                                        style={styles.input}
                                    />
                                </View>
                                <View style={styles.halfField}>
                                    <Text style={styles.fieldLabel}>Sender name</Text>
                                    <TextInput
                                        value={senderName}
                                        onChangeText={(v) => {
                                            touched.current.senderName = true
                                            setSenderName(v.toUpperCase())
                                        }}
                                        placeholder="Who sent it"
                                        placeholderTextColor="#9ca3af"
                                        style={styles.input}
                                    />
                                </View>
                                <View style={styles.halfField}>
                                    <Text style={styles.fieldLabel}>Sender bank</Text>
                                    <TextInput
                                        value={senderBank}
                                        onChangeText={(v) => {
                                            touched.current.senderBank = true
                                            setSenderBank(v)
                                        }}
                                        placeholder="Bank name"
                                        placeholderTextColor="#9ca3af"
                                        style={styles.input}
                                    />
                                </View>
                                <View style={styles.fullField}>
                                    <Text style={styles.fieldLabel}>Transaction reference</Text>
                                    <TextInput
                                        value={transactionReference}
                                        onChangeText={(v) => {
                                            touched.current.transactionReference = true
                                            setTransactionReference(v)
                                        }}
                                        placeholder="Optional reference / IBAN / txn ID"
                                        placeholderTextColor="#9ca3af"
                                        style={styles.input}
                                    />
                                </View>
                            </View>
                        </View>

                        <View>
                            <Text style={styles.fieldLabel}>Notes (optional)</Text>
                            <TextInput
                                value={notes}
                                onChangeText={(v) => {
                                    touched.current.notes = true
                                    setNotes(v)
                                }}
                                multiline
                                numberOfLines={2}
                                placeholder="Add any extra context..."
                                placeholderTextColor="#9ca3af"
                                style={[styles.input, styles.textArea]}
                            />
                        </View>

                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('ScanUpload')}
                                style={styles.backButton}
                            >
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={saving}
                                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save receipt</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
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

    // Pinned header — matches AboutTheCreators' headerRow/h1/h1Sub/bellButton
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

    scrollContent: { padding: 16, paddingBottom: 40 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    stepItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepDoneCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#dbeafe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepActiveCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepActiveNumber: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
    stepLabelInactive: { fontSize: 14, fontWeight: '500', color: '#9ca3af' },
    stepLabelActive: { fontSize: 14, fontWeight: '600', color: '#111827' },
    stepDivider: { width: 40, height: 1, backgroundColor: '#e5e7eb' },
    previewCard: {
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#fafafa',
        height: 320,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    previewImage: { width: '100%', height: '100%' },
    previewPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
    previewPlaceholderText: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
    form: { gap: 20 },
    warningBanner: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    warningText: { fontSize: 12, color: '#c2410c' },
    infoBannerAmber: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    infoTextAmber: { flex: 1, fontSize: 12, color: '#b45309' },
    infoBannerGreen: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    infoTextGreen: { fontSize: 12, color: '#15803d' },
    errorBanner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    errorBannerText: { fontSize: 12, color: '#dc2626' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    halfField: { flexBasis: '47%', flexGrow: 1 },
    fullField: { flexBasis: '100%' },
    section: { paddingTop: 4 },
    sectionLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 12 },
    fieldLabel: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 6 },
    input: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#374151' },
    textArea: { minHeight: 64, textAlignVertical: 'top' },
    actionsRow: { flexDirection: 'row', gap: 12, paddingTop: 4 },
    backButton: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    backButtonText: { fontSize: 14, fontWeight: '600', color: '#374151' },
    saveButton: { flex: 1, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    saveButtonDisabled: { backgroundColor: '#93c5fd' },
    saveButtonText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
})