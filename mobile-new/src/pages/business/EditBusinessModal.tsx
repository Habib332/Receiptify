import { useState } from 'react'
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    StyleSheet,
    ScrollView,
    Image,
    ActivityIndicator,
    Platform,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { businessTypes } from './BusinessIcons'
import { API_BASE_URL, authHeaders } from '../../api/config'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'

type Business = {
    id: string
    name: string
    type: string
    address: string
    phone: string
    logoUrl?: string | null
}

type Props = {
    business: Business
    onClose: () => void
    onSave: (id: string, business: { name: string; type: string; address: string; phone: string }) => void
}

export default function EditBusinessModal({ business, onClose, onSave }: Props) {
    const [name, setName] = useState(business.name)
    const [type, setType] = useState(business.type)
    const [address, setAddress] = useState(business.address)
    const [phone, setPhone] = useState(business.phone)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [typePickerOpen, setTypePickerOpen] = useState(false)

    // Logo starts as whatever the business already has; a freshly picked
    // file gets its own local uri that overrides this until upload
    // succeeds (then the parent's refetch will replace it with the real URL).
    const [logoUrl, setLogoUrl] = useState<string | null>(business.logoUrl ?? null)
    const [uploadingLogo, setUploadingLogo] = useState(false)

    const handlePickLogo = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) {
            setError('Photo library permission is required to pick a logo')
            return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        })

        if (result.canceled || !result.assets?.[0]) return
        const asset = result.assets[0]

        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            setError('Logo must be 5MB or smaller')
            return
        }

        setError('')
        setLogoUrl(asset.uri)
        setUploadingLogo(true)

        try {
            const formData = new FormData()
            formData.append('logo', {
                uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
                name: asset.fileName || 'logo.jpg',
                type: asset.mimeType || 'image/jpeg',
            } as any)

            const headers = await authHeaders()
            delete (headers as any)['Content-Type']

            const res = await fetch(`${API_BASE_URL}/business/${business.id}/logo`, {
                method: 'POST',
                headers,
                body: formData,
            })

            const result = await res.json()

            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Failed to upload logo')
            }

            // If the API returns the stored URL, prefer it over the local
            // uri so we're showing the real, persisted image.
            if (result.data?.logoUrl) {
                setLogoUrl(result.data.logoUrl)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload logo')
        } finally {
            setUploadingLogo(false)
        }
    }

    const handleSubmit = async () => {
        setSaving(true)
        await onSave(business.id, { name, type, address, phone })
        setSaving(false)
    }

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Edit Business</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Icon d="M6 18L18 6M6 6l12 12" size={16} color={colors.gray400} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    {error !== '' && <Text style={styles.errorBanner}>{error}</Text>}

                    <ScrollView>
                        {/* Logo picker */}
                        <View style={styles.logoRow}>
                            <View style={styles.logoPreview}>
                                {logoUrl ? (
                                    <Image source={{ uri: logoUrl }} style={styles.logoImage} />
                                ) : (
                                    <Icon
                                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 15V8.25A2.25 2.25 0 0015.75 6H8.25A2.25 2.25 0 006 8.25v7.5A2.25 2.25 0 008.25 18h7.5A2.25 2.25 0 0018 15.75z"
                                        size={24}
                                        color={colors.gray300}
                                        strokeWidth={1.5}
                                    />
                                )}
                                {uploadingLogo && (
                                    <View style={styles.logoLoadingOverlay}>
                                        <ActivityIndicator size="small" color={colors.blue600} />
                                    </View>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Logo</Text>
                                <TouchableOpacity
                                    onPress={handlePickLogo}
                                    disabled={uploadingLogo}
                                    style={[styles.uploadButton, uploadingLogo && styles.disabled]}
                                >
                                    <Text style={styles.uploadButtonText}>{logoUrl ? 'Replace' : 'Upload'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Business name</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Metro Store"
                                placeholderTextColor={colors.gray400}
                                style={styles.input}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Type</Text>
                            <TouchableOpacity style={styles.selectInput} onPress={() => setTypePickerOpen(true)}>
                                <Text style={styles.selectText}>{type}</Text>
                                <Icon d="M19.5 8.25l-7.5 7.5-7.5-7.5" size={16} color={colors.gray400} strokeWidth={1.8} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Address</Text>
                            <TextInput
                                value={address}
                                onChangeText={setAddress}
                                placeholder="e.g. Main Boulevard, Lahore"
                                placeholderTextColor={colors.gray400}
                                style={styles.input}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Phone</Text>
                            <TextInput
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="e.g. +92 300 1234567"
                                placeholderTextColor={colors.gray400}
                                keyboardType="phone-pad"
                                style={styles.input}
                            />
                        </View>

                        <View style={styles.footerRow}>
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={saving}
                            >
                                <Text style={styles.submitText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>

            <Modal visible={typePickerOpen} transparent animationType="fade" onRequestClose={() => setTypePickerOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setTypePickerOpen(false)}>
                    <View style={styles.typePanel}>
                        {businessTypes.map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={styles.typeOption}
                                onPress={() => {
                                    setType(t)
                                    setTypePickerOpen(false)
                                }}
                            >
                                <Text style={[styles.typeOptionText, t === type && styles.typeOptionTextActive]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: colors.overlay40,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    card: {
        width: '100%',
        maxWidth: 448,
        maxHeight: '90%',
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray900,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorBanner: {
        marginBottom: 16,
        fontSize: 12,
        color: colors.red600,
        backgroundColor: colors.red50,
        borderWidth: 1,
        borderColor: colors.red100,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    logoPreview: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    logoLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.gray500,
        marginBottom: 6,
    },
    uploadButton: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    uploadButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.blue600,
    },
    field: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: colors.gray100,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: colors.gray700,
    },
    selectInput: {
        backgroundColor: colors.gray100,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectText: {
        fontSize: 14,
        color: colors.gray700,
    },
    footerRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        minHeight: 44,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray700,
    },
    submitButton: {
        flex: 1,
        minHeight: 44,
        backgroundColor: colors.blue600,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: colors.blue300,
    },
    submitText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    typePanel: {
        width: '100%',
        maxWidth: 320,
        maxHeight: 384,
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 6,
    },
    typeOption: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 8,
    },
    typeOptionText: {
        fontSize: 14,
        color: colors.gray700,
    },
    typeOptionTextActive: {
        color: colors.blue700,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.5,
    },
})
