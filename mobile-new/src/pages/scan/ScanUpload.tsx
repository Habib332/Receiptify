import { useState, useEffect, useCallback } from 'react'
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import Layout from '../../components/Layout'
import UploadModeToggle from './UploadModeToggle'
import BusinessSelector, { type BusinessOption } from '../dashboard/BusinessSelector'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api'

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

// Local representation of the picked image — mirrors what the web File
// object gave us (uri to preview/upload + a display name), since RN has
// no File/FileReader.
interface PickedImage {
    uri: string
    name: string
    mimeType: string
}

// Small header illustration — phone with a camera badge, matching the
// bulk-upload screen's cloud illustration for visual consistency.
function ScanHeaderIllustration() {
    return (
        <View style={styles.headerIllustration}>
            <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
                <Rect x={9} y={2} width={20} height={34} rx={4} fill="#EFF6FF" stroke="#BFDBFE" strokeWidth={1.5} />
                <Rect x={13} y={8} width={12} height={2} rx={1} fill="#93C5FD" />
                <Rect x={13} y={13} width={9} height={2} rx={1} fill="#DBEAFE" />
                <Rect x={13} y={17} width={9} height={2} rx={1} fill="#DBEAFE" />
                <Rect x={13} y={21} width={6} height={2} rx={1} fill="#DBEAFE" />
            </Svg>
            <View style={styles.headerBadge}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                    <Path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38 0-.753-.116-1.076-.334a2.32 2.32 0 01-.734-.847 2.29 2.29 0 01-.239-1.089 2.31 2.31 0 01.334-1.076c.19-.319.462-.573.79-.734a2.29 2.29 0 011.089-.239h13.42a2.29 2.29 0 011.089.239c.328.161.6.415.79.734.19.319.316.68.334 1.076a2.29 2.29 0 01-.239 1.089 2.32 2.32 0 01-.734.847 2.31 2.31 0 01-1.076.334 2.31 2.31 0 01-1.641-1.055M6.827 6.175L3.75 20.25h16.5L17.173 6.175M6.827 6.175h10.346"
                    />
                    <Circle cx={12} cy={13} r={2.75} />
                </Svg>
            </View>
        </View>
    )
}

// Icons used in the "why scan" feature rows below the upload area.
function BoltIcon() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth={1.8}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
        </Svg>
    )
}

function ShieldCheckIcon() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth={1.8}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286z"
            />
        </Svg>
    )
}

function LockIcon() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth={1.8}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
        </Svg>
    )
}

export default function ScanUpload() {
    const navigation = useNavigation<any>()
    const insets = useSafeAreaInsets()

    const [preview, setPreview] = useState<string | null>(null)
    const [image, setImage] = useState<PickedImage | null>(null)
    const [fileName, setFileName] = useState('')
    const [error, setError] = useState('')

    const [fieldErrors, setFieldErrors] = useState<{ businessId?: string }>({})
    const [submitting, setSubmitting] = useState(false)

    // Business selector — always shown, per product decision. The token
    // stored from login is the identityToken (no role/businessId claims),
    // so it's valid for GET /business but NOT for POST /receipts. We only
    // get a role-bearing sessionToken by calling /auth/select-business,
    // which we do at submit time using whichever business is selected here.
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
            // Auto-fill if there's exactly one option — user can still
            // change it, this just saves a tap in the common case.
            if (normalized.length === 1) {
                setSelectedBusinessId(normalized[0].id)
            }
        } catch (err) {
            // Selector failure shouldn't block the page; surface silently in console
            console.error(err)
        } finally {
            setBusinessesLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBusinesses()
    }, [fetchBusinesses])

    const handlePicked = (asset: ImagePicker.ImagePickerAsset) => {
        setError('')

        const name = asset.fileName || asset.uri.split('/').pop() || 'receipt.jpg'
        const mimeType = asset.mimeType || 'image/jpeg'

        setImage({ uri: asset.uri, name, mimeType })
        setFileName(name)
        setPreview(asset.uri)
    }

    const pickFromLibrary = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) {
            setError('Photo library permission is required to upload a receipt')
            return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
        })

        if (!result.canceled && result.assets?.[0]) {
            handlePicked(result.assets[0])
        }
    }

    const pickFromCamera = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) {
            setError('Camera permission is required to take a picture')
            return
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
        })

        if (!result.canceled && result.assets?.[0]) {
            handlePicked(result.assets[0])
        }
    }

    const validate = () => {
        const errors: typeof fieldErrors = {}
        if (!selectedBusinessId) {
            errors.businessId = 'Please select a business'
        }
        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Exchanges the identityToken for a role-bearing sessionToken scoped to
    // the chosen business, and persists it — overwriting whatever token is
    // currently stored. Returns the fresh sessionToken so the caller can use
    // it immediately without relying on a state update having landed yet.
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

    const handleContinue = async () => {
        setError('')

        if (!validate()) return

        if (!image) {
            setError('Please attach a receipt image first')
            return
        }

        setSubmitting(true)
        try {
            // Get a sessionToken scoped to the selected business before
            // uploading — POST /receipts requires role/businessId claims
            // that only exist on the sessionToken, not the identityToken.
            const sessionToken = await selectBusiness(selectedBusinessId)

            const formData = new FormData()
            // React Native FormData accepts { uri, name, type } for files.
            formData.append('screenshot', {
                uri: image.uri,
                name: image.name,
                type: image.mimeType,
            } as any)
            // receiverName is intentionally NOT sent here. With a
            // screenshot attached, receipts.validation.js makes it
            // optional (Joi: hasScreenshot -> optional) and OCR
            // (extractReceiptFields) fills in receiver_name /
            // receiver_bank / sender_name / sender_bank / amount /
            // receipt_date / transactionReference asynchronously after
            // this request completes. See runOcrForReceipt in
            // receipts.service.js.

            const res = await fetch(`${API_BASE_URL}/receipts`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${sessionToken}`,
                },
                body: formData,
            })

            const result = await res.json()

            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Failed to upload receipt')
            }

            navigation.navigate('ScanReview', { receipt: result.data })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload receipt')
        } finally {
            setSubmitting(false)
        }
    }

    const handleReset = () => {
        setPreview(null)
        setImage(null)
        setFileName('')
        setFieldErrors({})
        setError('')
    }

    return (
        <View style={styles.screen}>
            {/* Pinned header: sits outside Layout's internal ScrollView, so
                it stays fixed while Layout's children scroll underneath it.
                Mirrors BusinessPage/UserProfileModal's header pattern. */}
            <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Scan a receipt</Text>
                    <Text style={styles.subtitle}>Upload a photo or take a picture to get started.</Text>
                </View>
                <ScanHeaderIllustration />
            </View>

            <Layout>
            {/* Upload mode toggle */}
            <View style={styles.toggleWrap}>
                <UploadModeToggle mode="single" />
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
                        if (id === 'all') return
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

            {!preview ? (
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
                    <Text style={styles.dropzoneTitle}>Add your receipt</Text>
                    <Text style={styles.dropzoneSubtitle}>Choose an option below. JPG, PNG up to 10MB.</Text>

                    <View style={styles.dropzoneButtons}>
                        <TouchableOpacity onPress={pickFromLibrary} style={styles.primaryButton}>
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                                <Path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </Svg>
                            <Text style={styles.primaryButtonText}>Upload file</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={pickFromCamera} style={styles.secondaryButton}>
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={1.8}>
                                <Path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38 0-.753-.116-1.076-.334a2.32 2.32 0 01-.734-.847 2.29 2.29 0 01-.239-1.089 2.31 2.31 0 01.334-1.076c.19-.319.462-.573.79-.734a2.29 2.29 0 011.089-.239h13.42a2.29 2.29 0 011.089.239c.328.161.6.415.79.734.19.319.316.68.334 1.076a2.29 2.29 0 01-.239 1.089 2.32 2.32 0 01-.734.847 2.31 2.31 0 01-1.076.334 2.31 2.31 0 01-1.641-1.055M6.827 6.175L3.75 20.25h16.5L17.173 6.175M6.827 6.175h10.346"
                                />
                                <Circle cx={12} cy={13} r={2.75} />
                            </Svg>
                            <Text style={styles.secondaryButtonText}>Use camera</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View>
                    <View style={styles.previewCard}>
                        <Image source={{ uri: preview }} style={styles.previewImage} resizeMode="contain" />
                        <View style={styles.previewFooter}>
                            <View style={styles.previewFileRow}>
                                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.8}>
                                    <Path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 10.5h.008v.008H18V10.5zm-12-6h12a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0118 18.75H6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 016 4.5z" />
                                </Svg>
                                <Text style={styles.previewFileName} numberOfLines={1}>{fileName}</Text>
                            </View>
                            <TouchableOpacity onPress={handleReset}>
                                <Text style={styles.removeText}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleContinue}
                        disabled={submitting}
                        style={[styles.continueButton, submitting && styles.continueButtonDisabled]}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.continueButtonText}>Continue to review</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
            </Layout>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#ffffff',
    },

    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
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
    dropzone: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#e5e7eb',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
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
    dropzoneButtons: {
        flexDirection: 'column',
        gap: 12,
        width: '100%',
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
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    secondaryButtonText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '600',
    },
    previewCard: {
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    previewImage: {
        width: '100%',
        height: 320,
        backgroundColor: '#fafafa',
    },
    previewFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    previewFileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minWidth: 0,
    },
    previewFileName: {
        fontSize: 12,
        color: '#6b7280',
        flexShrink: 1,
    },
    removeText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9ca3af',
    },
    continueButton: {
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    continueButtonDisabled: {
        backgroundColor: '#93c5fd',
    },
    continueButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },

    // "Why scan" feature rows
    featuresWrap: {
        marginTop: 24,
        gap: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    featureIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTextWrap: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    featureDescription: {
        fontSize: 12,
        color: '#9ca3af',
        lineHeight: 17,
    },
})