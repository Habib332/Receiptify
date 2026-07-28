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
    Platform,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { businessTypes } from './BusinessIcons'
import { isValidPakistaniPhone, phoneErrorMessage } from './phoneValidation'
import { API_BASE_URL, authHeaders } from '../../api/config'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'

type Props = {
    onClose: () => void
    onSave: (business: { name: string; type: string; address: string; phone: string }) => void
}

// Local shape for the picked logo, kept close to what the web version's
// `File` gave us: a uri to preview/upload plus enough metadata to build a
// multipart FormData part.
type PickedLogo = {
    uri: string
    name: string
    mimeType: string
    fileSize?: number
}

export default function AddBusinessModal({ onClose, onSave }: Props) {
    const [name, setName] = useState('')
    const [type, setType] = useState(businessTypes[0])
    const [address, setAddress] = useState('')
    const [phone, setPhone] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Field-level errors so the person sees exactly which input is wrong,
    // right under that input, instead of a single banner at the top.
    const [fieldErrors, setFieldErrors] = useState<{ name?: string; address?: string; phone?: string }>({})

    const [logo, setLogo] = useState<PickedLogo | null>(null)
    const [typePickerOpen, setTypePickerOpen] = useState(false)

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
        setLogo({
            uri: asset.uri,
            name: asset.fileName || 'logo.jpg',
            mimeType: asset.mimeType || 'image/jpeg',
            fileSize: asset.fileSize,
        })
    }

    const clearLogo = () => setLogo(null)

    const validate = () => {
        const errors: typeof fieldErrors = {}

        if (!name.trim()) {
            errors.name = 'Business name is required'
        }

        if (!address.trim()) {
            errors.address = 'Address is required'
        }

        if (!phone.trim()) {
            errors.phone = 'Phone number is required'
        } else if (!isValidPakistaniPhone(phone)) {
            errors.phone = phoneErrorMessage()
        }

        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Called after the business is created elsewhere (onSave triggers the
    // POST /business call in the parent). We need the new business's id to
    // upload the logo, so this modal does its own POST rather than relying
    // on onSave's return value, then still calls onSave for list refresh.
    const createAndMaybeUploadLogo = async () => {
        const res = await fetch(`${API_BASE_URL}/business`, {
            method: 'POST',
            headers: await authHeaders(),
            body: JSON.stringify({ name: name.trim(), type, address: address.trim(), phone: phone.trim() }),
        })

        const result = await res.json()

        if (!res.ok || !result.success) {
            // Surface field-specific validation errors from the API if it
            // returns them (e.g. { errors: { phone: '...' } }), otherwise
            // fall back to the generic message.
            if (result.errors && typeof result.errors === 'object') {
                setFieldErrors((prev) => ({ ...prev, ...result.errors }))
            }
            throw new Error(result.message || 'Failed to add business')
        }

        const newId = result.data?.id ?? result.data?.business_id

        if (logo && newId) {
            const formData = new FormData()
            // React Native's fetch/FormData accepts this { uri, name, type }
            // shape directly — equivalent to appending a web File.
            formData.append('logo', {
                uri: Platform.OS === 'ios' ? logo.uri.replace('file://', '') : logo.uri,
                name: logo.name,
                type: logo.mimeType,
            } as any)

            const headers = await authHeaders()
            delete (headers as any)['Content-Type'] // let fetch set the multipart boundary

            const logoRes = await fetch(`${API_BASE_URL}/business/${newId}/logo`, {
                method: 'POST',
                headers,
                body: formData,
            })

            const logoResult = await logoRes.json()

            if (!logoRes.ok || !logoResult.success) {
                // Business was created but logo failed — don't block the
                // flow, just surface it so the user can retry from Edit.
                throw new Error(logoResult.message || 'Business added, but logo upload failed')
            }
        }
    }

    const handleSubmit = async () => {
        setError('')

        if (!validate()) return

        setSaving(true)
        try {
            await createAndMaybeUploadLogo()
            onSave({ name: name.trim(), type, address: address.trim(), phone: phone.trim() })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Add Business</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Icon d="M6 18L18 6M6 6l12 12" size={16} color={colors.gray400} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    {error !== '' && <Text style={styles.errorBanner}>{error}</Text>}

                    <ScrollView>
                        {/* Logo picker */}
                        <View style={styles.logoRow}>
                            <View style={styles.logoPreview}>
                                {logo ? (
                                    <Image source={{ uri: logo.uri }} style={styles.logoImage} />
                                ) : (
                                    <Icon
                                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 15V8.25A2.25 2.25 0 0015.75 6H8.25A2.25 2.25 0 006 8.25v7.5A2.25 2.25 0 008.25 18h7.5A2.25 2.25 0 0018 15.75z"
                                        size={24}
                                        color={colors.gray300}
                                        strokeWidth={1.5}
                                    />
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Logo (optional)</Text>
                                <View style={styles.logoActions}>
                                    <TouchableOpacity onPress={handlePickLogo} style={styles.uploadButton}>
                                        <Text style={styles.uploadButtonText}>{logo ? 'Change' : 'Upload'}</Text>
                                    </TouchableOpacity>
                                    {logo && (
                                        <TouchableOpacity onPress={clearLogo}>
                                            <Text style={styles.removeText}>Remove</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Business name</Text>
                            <TextInput
                                value={name}
                                onChangeText={(t) => {
                                    setName(t)
                                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }))
                                }}
                                placeholder="e.g. Metro Store"
                                placeholderTextColor={colors.gray400}
                                style={[styles.input, fieldErrors.name && styles.inputError]}
                            />
                            {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Type</Text>
                            <TouchableOpacity
                                style={styles.selectInput}
                                onPress={() => setTypePickerOpen(true)}
                            >
                                <Text style={styles.selectText}>{type}</Text>
                                <Icon d="M19.5 8.25l-7.5 7.5-7.5-7.5" size={16} color={colors.gray400} strokeWidth={1.8} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Address</Text>
                            <TextInput
                                value={address}
                                onChangeText={(t) => {
                                    setAddress(t)
                                    if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: undefined }))
                                }}
                                placeholder="e.g. Main Boulevard, Lahore"
                                placeholderTextColor={colors.gray400}
                                style={[styles.input, fieldErrors.address && styles.inputError]}
                            />
                            {fieldErrors.address && <Text style={styles.fieldError}>{fieldErrors.address}</Text>}
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Phone</Text>
                            <TextInput
                                value={phone}
                                onChangeText={(t) => {
                                    setPhone(t)
                                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }))
                                }}
                                placeholder="e.g. 0300 1234567"
                                placeholderTextColor={colors.gray400}
                                keyboardType="phone-pad"
                                style={[styles.input, fieldErrors.phone && styles.inputError]}
                            />
                            {fieldErrors.phone ? (
                                <Text style={styles.fieldError}>{fieldErrors.phone}</Text>
                            ) : (
                                <Text style={styles.fieldHint}>11-digit Pakistani number, e.g. 0300 1234567</Text>
                            )}
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
                                <Text style={styles.submitText}>{saving ? 'Saving...' : 'Add Business'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>

            {/* Type picker */}
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
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.gray500,
        marginBottom: 6,
    },
    logoActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    uploadButton: {
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
    removeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray400,
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
    inputError: {
        borderWidth: 2,
        borderColor: colors.red200,
    },
    fieldError: {
        fontSize: 12,
        color: colors.red500,
        marginTop: 4,
    },
    fieldHint: {
        fontSize: 12,
        color: colors.gray400,
        marginTop: 4,
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
})
