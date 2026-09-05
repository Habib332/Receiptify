import { useState, useEffect, useRef } from 'react'
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
import Svg, { Path } from 'react-native-svg'
import Layout from '../../components/Layout'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://receiptify-zeta.vercel.app/api'

async function getToken() {
    return AsyncStorage.getItem('token')
}

async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Matches the raw `SELECT * FROM receipts` row shape (pool.query results
// aren't camelCased) — same shape ScanReview.tsx works with.
interface Receipt {
    receipt_id: number | string
    amount: string | number | null
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
    receipts?: Receipt[]
}

type ReceiptOutcome = 'pending' | 'saved' | 'skipped'

function toDateInputValue(value: string | null | undefined) {
    if (!value) return ''
    return value.slice(0, 10)
}

const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 30000

export default function ScanBulkReview() {
    const navigation = useNavigation<any>()
    const route = useRoute()
    const params = (route.params as RouteParams) || {}
    const initialReceipts = params.receipts

    // Nothing to review (direct nav, stale params, or a batch that
    // produced zero receipts) — bounce back rather than showing an empty
    // wizard.
    useEffect(() => {
        if (!initialReceipts || initialReceipts.length === 0) {
            navigation.replace('ScanBulkUpload')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (!initialReceipts || initialReceipts.length === 0) {
        return null
    }

    const [receipts] = useState<Receipt[]>(initialReceipts)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [outcomes, setOutcomes] = useState<ReceiptOutcome[]>(
        () => initialReceipts.map(() => 'pending'),
    )

    const total = receipts.length
    const receipt = receipts[currentIndex]
    const savedCount = outcomes.filter((o) => o === 'saved').length
    const skippedCount = outcomes.filter((o) => o === 'skipped').length

    const [receiverName, setReceiverName] = useState('')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState('')
    const [notes, setNotes] = useState('')
    const [senderName, setSenderName] = useState('')
    const [senderBank, setSenderBank] = useState('')
    const [receiverBank, setReceiverBank] = useState('')
    const [transactionReference, setTransactionReference] = useState('')

    const [polling, setPolling] = useState(true)
    const [pollTimedOut, setPollTimedOut] = useState(false)
    const [duplicateStatus, setDuplicateStatus] = useState<Receipt['duplicate_status']>(null)

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [imageError, setImageError] = useState(false)

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

    // Re-seed all local form state whenever we step to a different
    // receipt in the batch — each one gets a clean form and its own
    // "touched" tracking, same as ScanReview does for a single receipt.
    useEffect(() => {
        const r = receipts[currentIndex]
        touched.current = {
            receiverName: false,
            amount: false,
            date: false,
            notes: false,
            senderName: false,
            senderBank: false,
            receiverBank: false,
            transactionReference: false,
        }
        setReceiverName(r.receiver_name || '')
        setAmount(r.amount != null ? String(r.amount) : '')
        setDate(toDateInputValue(r.receipt_date))
        setNotes(r.notes || '')
        setSenderName(r.sender_name || '')
        setSenderBank(r.sender_bank || '')
        setReceiverBank(r.receiver_bank || '')
        setTransactionReference(r.transaction_reference || '')
        setDuplicateStatus(r.duplicate_status)
        setPolling(r.amount == null || r.receipt_date == null)
        setPollTimedOut(false)
        setError('')
        setImageUrl(null)
        setImageError(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex])

    // Signed image URL, same pattern as ScanReview — fetched per receipt,
    // never cached beyond this component.
    useEffect(() => {
        if (!receipt.image_url) return
        let cancelled = false
        setImageError(false)

        const fetchImageUrl = async () => {
            try {
                const headers = await authHeaders()
                const res = await fetch(`${API_BASE_URL}/receipts/${receipt.receipt_id}/image-url`, {
                    headers,
                })
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

    // OCR poll for the current receipt only. Stops immediately if the
    // user steps away (index change unmounts this effect via cleanup).
    useEffect(() => {
        if (!polling) return
        let cancelled = false
        const startedAt = Date.now()
        let timer: ReturnType<typeof setTimeout>

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

                if (!touched.current.receiverName && updated.receiver_name) setReceiverName(updated.receiver_name)
                if (!touched.current.amount && updated.amount != null) setAmount(String(updated.amount))
                if (!touched.current.date && updated.receipt_date) setDate(toDateInputValue(updated.receipt_date))
                if (!touched.current.senderName && updated.sender_name) setSenderName(updated.sender_name)
                if (!touched.current.senderBank && updated.sender_bank) setSenderBank(updated.sender_bank)
                if (!touched.current.receiverBank && updated.receiver_bank) setReceiverBank(updated.receiver_bank)
                if (!touched.current.transactionReference && updated.transaction_reference) {
                    setTransactionReference(updated.transaction_reference)
                }
                if (!touched.current.notes && updated.notes) setNotes(updated.notes)
                setDuplicateStatus(updated.duplicate_status)

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
                if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS)
            } catch {
                if (!cancelled && Date.now() - startedAt < POLL_TIMEOUT_MS) {
                    timer = setTimeout(tick, POLL_INTERVAL_MS)
                }
            }
        }

        timer = setTimeout(tick, POLL_INTERVAL_MS)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [polling, receipt.receipt_id])

    const setOutcome = (index: number, outcome: ReceiptOutcome) => {
        setOutcomes((prev) => {
            const next = [...prev]
            next[index] = outcome
            return next
        })
    }

    const goNext = () => {
        if (currentIndex < total - 1) {
            setCurrentIndex((i) => i + 1)
        } else {
            navigation.navigate('Dashboard')
        }
    }

    const goPrevious = () => {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1)
    }

    const handleSkip = () => {
        setOutcome(currentIndex, 'skipped')
        goNext()
    }

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
                    receiverName: receiverName.trim(),
                    amount: Number(amount),
                    receiptDate: date,
                    notes: notes.trim(),
                    senderName: senderName.trim() || undefined,
                    senderBank: senderBank.trim() || undefined,
                    receiverBank: receiverBank.trim() || undefined,
                    transactionReference: transactionReference.trim() || undefined,
                }),
            })

            const result = await res.json()
            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Failed to save receipt')
            }

            setOutcome(currentIndex, 'saved')
            goNext()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save receipt')
        } finally {
            setSaving(false)
        }
    }

    const stillProcessing = polling
    const showTimeoutNotice = pollTimedOut && (amount === '' || !date)
    const isPossibleDuplicate = duplicateStatus === 'flagged'
    const isLast = currentIndex === total - 1

    return (
        <Layout>
            <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <Text style={styles.title}>Review batch</Text>
                <Text style={styles.subtitle}>Confirm each receipt's details, or make changes below.</Text>
            </View>

            {/* Progress: counter + bar + running tally */}
            <View style={styles.progressBlock}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressCounter}>
                        Receipt {currentIndex + 1} of {total}
                    </Text>
                    <Text style={styles.progressTally}>
                        {savedCount} saved
                        {skippedCount > 0 && ` · ${skippedCount} skipped`}
                    </Text>
                </View>
                <View style={styles.progressTrack}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${((currentIndex + (outcomes[currentIndex] !== 'pending' ? 1 : 0)) / total) * 100}%`,
                            },
                        ]}
                    />
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
                        <Text style={styles.previewPlaceholderText}>{imageError ? "Couldn't load image" : 'No image'}</Text>
                    </View>
                )}
            </View>

            {/* Editable extracted data */}
            <View style={styles.form}>
                {isPossibleDuplicate && (
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>
                            This looks similar to a receipt already in this business. Double check it isn't a duplicate before saving.
                        </Text>
                    </View>
                )}

                {stillProcessing ? (
                    <View style={styles.infoBannerAmber}>
                        <ActivityIndicator size="small" color="#b45309" />
                        <Text style={styles.infoTextAmber}>
                            Reading this receipt — this updates automatically, usually within a few seconds.
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
                                    setReceiverName(v)
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
                                    setSenderName(v)
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

                <View style={styles.actionsWrap}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={saving}
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    >
                        {saving ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.saveButtonText}>{isLast ? 'Save & finish' : 'Save & next'}</Text>
                        )}
                    </TouchableOpacity>
                    <View style={styles.secondaryActionsRow}>
                        <TouchableOpacity
                            onPress={goPrevious}
                            disabled={currentIndex === 0}
                            style={[styles.backButton, currentIndex === 0 && styles.backButtonDisabled]}
                        >
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                            <Text style={styles.skipButtonText}>{isLast ? 'Skip & finish' : 'Skip'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            </ScrollView>
        </Layout>
    )
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    subtitle: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 6,
    },
    progressBlock: {
        marginBottom: 24,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressCounter: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    progressTally: {
        fontSize: 12,
        color: '#9ca3af',
    },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: '#f3f4f6',
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2563eb',
        borderRadius: 999,
    },
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
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
    },
    previewPlaceholderText: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
    },
    form: {
        gap: 20,
    },
    warningBanner: {
        backgroundColor: '#fff7ed',
        borderWidth: 1,
        borderColor: '#fed7aa',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    warningText: {
        fontSize: 12,
        color: '#c2410c',
    },
    infoBannerAmber: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fde68a',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    infoTextAmber: {
        flex: 1,
        fontSize: 12,
        color: '#b45309',
    },
    infoBannerGreen: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    infoTextGreen: {
        fontSize: 12,
        color: '#15803d',
    },
    errorBanner: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fee2e2',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    errorBannerText: {
        fontSize: 12,
        color: '#dc2626',
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    halfField: {
        flexBasis: '47%',
        flexGrow: 1,
    },
    fullField: {
        flexBasis: '100%',
    },
    section: {
        paddingTop: 4,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6b7280',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#374151',
    },
    textArea: {
        minHeight: 64,
        textAlignVertical: 'top',
    },
    actionsWrap: {
        gap: 12,
        paddingTop: 4,
    },
    saveButton: {
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#93c5fd',
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    secondaryActionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    backButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    backButtonDisabled: {
        opacity: 0.4,
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    skipButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    skipButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
})
