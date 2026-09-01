import { useState, useEffect, useCallback } from 'react'
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    FlatList,
    ScrollView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import Svg, { Path, Rect } from 'react-native-svg'
import Layout from '../../components/Layout'
import UploadModeToggle from './UploadModeToggle'
import BusinessSelector, { type BusinessOption } from '../dashboard/BusinessSelector'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api'
const MAX_FILES = 50 // matches upload.array("screenshots", 50) on the backend

async function getToken() {
    return AsyncStorage.getItem('token')
}

async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Raw shape returned by GET /business (same endpoint the Businesses page
// uses). Not every field is guaranteed camelCase, so both variants are
// accepted and normalized below — same pattern as BusinessesPage.tsx.
interface RawBusiness {
    business_id?: number | string
    id?: number | string
    name: string
    type?: string
    logoUrl?: string | null
    logo_url?: string | null
    userRole?: string | null
    user_role?: string | null
}

interface PendingFile {
    id: string
    uri: string
    name: string
    mimeType: string
}

// Matches the raw `SELECT * FROM receipts` row shape (pool.query results
// aren't camelCased). Only the fields the review step needs are listed
// here; see ScanReview.tsx / ScanBulkReview.tsx for the full shape.
interface Receipt {
    receipt_id: number | string
    [key: string]: unknown
}

interface BulkResult {
    batchId: number | string
    processed: number
    failed: number
    total: number
    receipts: Receipt[] // requires the backend change noted below
}

// Small header illustration — stacked documents with a cloud-upload
// badge, matching the single-upload screen's phone illustration for
// visual consistency between the two modes.
function BulkHeaderIllustration() {
    return (
        <View style={styles.headerIllustration}>
            <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
                <Rect x={6} y={10} width={22} height={26} rx={3} fill="#EFF6FF" stroke="#BFDBFE" strokeWidth={1.5} />
                <Rect x={11} y={5} width={22} height={26} rx={3} fill="#FFFFFF" stroke="#DBEAFE" strokeWidth={1.5} />
                <Rect x={15} y={11} width={14} height={2} rx={1} fill="#93C5FD" />
                <Rect x={15} y={16} width={10} height={2} rx={1} fill="#DBEAFE" />
                <Rect x={15} y={20} width={10} height={2} rx={1} fill="#DBEAFE" />
            </Svg>
            <View style={styles.headerBadge}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                    <Path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                    />
                </Svg>
            </View>
        </View>
    )
}

export default function ScanBulkUpload() {
    const navigation = useNavigation<any>()

    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{ businessId?: string; files?: string }>({})
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<BulkResult | null>(null)

    // Same business-selection dance as ScanUpload: the token from login
    // has no role/businessId claims, so we exchange it for a
    // sessionToken scoped to the chosen business right before submitting.
    const [businesses, setBusinesses] = useState<BusinessOption[]>([])
    const [businessesLoading, setBusinessesLoading] = useState(false)
    const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')

    const fetchBusinesses = useCallback(async () => {
        setBusinessesLoading(true)
        try {
            const headers = await authHeaders()
            const res = await fetch(`${API_BASE_URL}/business`, {
                method: 'GET',
                headers,
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to load businesses')
            }

            const normalized: BusinessOption[] = (data.data || []).map((b: RawBusiness) => ({
                id: String(b.id ?? b.business_id),
                name: b.name,
                type: b.type ?? '',
                logoUrl: b.logoUrl ?? b.logo_url ?? null,
                userRole: b.userRole ?? b.user_role ?? null,
            }))
            .filter((b: BusinessOption) => !!b.userRole)

            setBusinesses(normalized)
            if (normalized.length === 1) {
                setSelectedBusinessId(normalized[0].id)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setBusinessesLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBusinesses()
    }, [fetchBusinesses])

    // Note: unlike the web version there are no object URLs to revoke —
    // expo-image-picker gives us local file URIs directly, so there's no
    // equivalent cleanup needed here.

    const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
        setError('')
        setFieldErrors((prev) => ({ ...prev, files: undefined }))

        setPendingFiles((prev) => {
            const room = MAX_FILES - prev.length
            const accepted = assets.slice(0, Math.max(room, 0))
            const overflow = assets.length - accepted.length

            if (overflow > 0) {
                setError(`Only ${MAX_FILES} files can be uploaded at once — ${overflow} file(s) were skipped`)
            }

            const next: PendingFile[] = accepted.map((asset) => ({
                id: `${asset.uri}-${Math.random().toString(36).slice(2)}`,
                uri: asset.uri,
                name: asset.fileName || asset.uri.split('/').pop() || 'receipt.jpg',
                mimeType: asset.mimeType || 'image/jpeg',
            }))

            return [...prev, ...next]
        })
    }

    const pickFromLibrary = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) {
            setError('Photo library permission is required to add receipts')
            return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.9,
        })

        if (!result.canceled && result.assets?.length) {
            addAssets(result.assets)
        }
    }

    const removeFile = (id: string) => {
        setPendingFiles((prev) => prev.filter((f) => f.id !== id))
    }

    const clearAll = () => {
        setPendingFiles([])
    }

    const validate = () => {
        const errors: typeof fieldErrors = {}
        if (!selectedBusinessId) errors.businessId = 'Please select a business'
        if (pendingFiles.length === 0) errors.files = 'Add at least one receipt image'
        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    const selectBusiness = async (businessId: string): Promise<string> => {
        const headers = await authHeaders()
        const res = await fetch(`${API_BASE_URL}/auth/select-business`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify({ businessId }),
        })
        const result = await res.json()
        if (!res.ok || !result.success) {
            throw new Error(result.message || 'Failed to select business')
        }
        const sessionToken = result.data?.sessionToken
        if (!sessionToken) {
            throw new Error('No session token returned for selected business')
        }
        await AsyncStorage.setItem('token', sessionToken)
        await AsyncStorage.setItem('businessId', businessId)
        return sessionToken
    }

    const handleSubmit = async () => {
        setError('')
        setResult(null)
        if (!validate()) return

        setSubmitting(true)
        try {
            const sessionToken = await selectBusiness(selectedBusinessId)

            const formData = new FormData()
            pendingFiles.forEach(({ uri, name, mimeType }) => {
                formData.append('screenshots', { uri, name, type: mimeType } as any)
            })

            // NOTE: this awaits the full response — createBulkReceipts on
            // the backend processes every file (upload + OCR trigger)
            // before it responds, so a large batch can take a while even
            // though the route returns 202.
            const res = await fetch(`${API_BASE_URL}/receipts/bulk`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${sessionToken}`,
                },
                body: formData,
            })

            const responseBody = await res.json()

            if (!res.ok || !responseBody.success) {
                throw new Error(responseBody.message || 'Bulk upload failed')
            }

            const data: BulkResult = responseBody.data
            setResult(data)
            clearAll()

            if (data.receipts?.length) {
                navigation.navigate('ScanBulkReview', { receipts: data.receipts })
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bulk upload failed')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Layout>
            <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.headerRow}>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Bulk upload receipts</Text>
                    <Text style={styles.subtitle}>
                        Upload multiple receipt images at once — we'll read each one automatically.
                    </Text>
                </View>
                <BulkHeaderIllustration />
            </View>

            {/* Upload mode toggle */}
            <View style={styles.toggleWrap}>
                <UploadModeToggle mode="bulk" />
            </View>

            {/* Step indicator */}
            <View style={styles.stepRow}>
                <View style={styles.stepItem}>
                    <View style={[styles.stepBadge, styles.stepBadgeActive]}>
                        <Text style={styles.stepBadgeTextActive}>1</Text>
                    </View>
                    <Text style={styles.stepLabelActive}>Upload</Text>
                </View>
                <View style={styles.stepDivider} />
                <View style={styles.stepItem}>
                    <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>2</Text>
                    </View>
                    <Text style={styles.stepLabel}>Review</Text>
                </View>
            </View>

            {/* Business selector */}
            <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Business</Text>
                <BusinessSelector
                    businesses={businesses}
                    selectedId={selectedBusinessId}
                    onChange={(id) => {
                        if (id === 'all') return // not selectable here; allowAll is off
                        setSelectedBusinessId(id)
                        if (fieldErrors.businessId) setFieldErrors((prev) => ({ ...prev, businessId: undefined }))
                    }}
                    loading={businessesLoading}
                />
                {fieldErrors.businessId && <Text style={styles.errorText}>{fieldErrors.businessId}</Text>}
            </View>

            {error && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{error}</Text>
                </View>
            )}

            {result && (
                <View style={styles.resultBanner}>
                    <Text style={styles.resultTitle}>Batch submitted</Text>
                    <Text style={styles.resultText}>
                        {result.processed} of {result.total} uploaded successfully
                        {result.failed > 0 && ` · ${result.failed} failed`}. Each receipt is now a draft — review and
                        save each one from your receipts list to confirm it.
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Receipts')}>
                        <Text style={styles.resultLink}>Go to receipts</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Picker */}
            <View style={styles.dropzone}>
                <View style={styles.dropzoneIconWrap}>
                    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={1.6}>
                        <Path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                        />
                    </Svg>
                </View>
                <Text style={styles.dropzoneTitle}>Add receipts</Text>
                <Text style={styles.dropzoneSubtitle}>up to {MAX_FILES} images, JPG/PNG, 10MB each</Text>

                <TouchableOpacity onPress={pickFromLibrary} style={styles.primaryButton}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </Svg>
                    <Text style={styles.primaryButtonText}>Choose files</Text>
                </TouchableOpacity>
            </View>
            {fieldErrors.files && <Text style={styles.errorTextBlock}>{fieldErrors.files}</Text>}

            {/* Selected files grid */}
            {pendingFiles.length > 0 && (
                <View style={styles.selectedWrap}>
                    <View style={styles.selectedHeader}>
                        <Text style={styles.selectedCount}>
                            {pendingFiles.length} file{pendingFiles.length === 1 ? '' : 's'} selected
                        </Text>
                        <TouchableOpacity onPress={clearAll}>
                            <Text style={styles.clearAllText}>Clear all</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={pendingFiles}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        scrollEnabled={false}
                        columnWrapperStyle={styles.gridRow}
                        contentContainerStyle={styles.gridContainer}
                        renderItem={({ item }) => (
                            <View style={styles.thumbWrap}>
                                <Image source={{ uri: item.uri }} style={styles.thumbImage} />
                                <TouchableOpacity
                                    onPress={() => removeFile(item.id)}
                                    style={styles.thumbRemove}
                                    accessibilityLabel={`Remove ${item.name}`}
                                >
                                    <Text style={styles.thumbRemoveText}>×</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={submitting}
                        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                Upload {pendingFiles.length} receipt{pendingFiles.length === 1 ? '' : 's'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
            </ScrollView>
        </Layout>
    )
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },

    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    headerText: {
        flex: 1,
        paddingRight: 12,
    },
    headerIllustration: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    subtitle: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 4,
    },
    toggleWrap: {
        alignItems: 'center',
        marginBottom: 24,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stepBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBadgeActive: {
        backgroundColor: '#2563eb',
    },
    stepBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9ca3af',
    },
    stepBadgeTextActive: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ffffff',
    },
    stepLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#9ca3af',
    },
    stepLabelActive: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    stepDivider: {
        width: 32,
        height: 1,
        backgroundColor: '#e5e7eb',
    },
    fieldBlock: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6b7280',
        marginBottom: 6,
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    errorTextBlock: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 8,
    },
    errorBanner: {
        marginBottom: 16,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fee2e2',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    errorBannerText: {
        fontSize: 12,
        color: '#dc2626',
    },
    resultBanner: {
        marginBottom: 16,
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#dcfce7',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    resultTitle: {
        fontWeight: '600',
        color: '#166534',
        marginBottom: 4,
    },
    resultText: {
        fontSize: 12,
        color: '#15803d',
    },
    resultLink: {
        marginTop: 12,
        fontSize: 12,
        fontWeight: '600',
        color: '#166534',
        textDecorationLine: 'underline',
    },
    dropzone: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#e5e7eb',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
        backgroundColor: '#fafafa',
    },
    dropzoneIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    dropzoneTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    dropzoneSubtitle: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 24,
        textAlign: 'center',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    selectedWrap: {
        marginTop: 24,
    },
    selectedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    selectedCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    clearAllText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9ca3af',
    },
    gridContainer: {
        gap: 12,
    },
    gridRow: {
        gap: 12,
        marginBottom: 12,
    },
    thumbWrap: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        backgroundColor: '#fafafa',
        overflow: 'hidden',
        position: 'relative',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    thumbRemove: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbRemoveText: {
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 14,
    },
    submitButton: {
        marginTop: 12,
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#93c5fd',
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
})