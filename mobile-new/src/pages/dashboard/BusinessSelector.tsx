import { useState } from 'react'
import { View, Text, TouchableOpacity, Image, Modal, ScrollView, StyleSheet } from 'react-native'
import { ChevronDown, LayoutGrid } from 'lucide-react-native'
import { getBusinessIcon } from '../business/BusinessIcons'

type BusinessOption = {
    id: string
    name: string
    type: string
    logoUrl?: string | null
    userRole?: string | null
}

type BusinessSelectorProps = {
    businesses: BusinessOption[]
    selectedId: string | 'all'
    onChange: (id: string | 'all') => void
    loading?: boolean
    // True while a select-business call (or the all-businesses fetch loop)
    // is in flight. The picker disables itself during this so a second
    // switch can't fire before the sessionToken from the first has landed
    // in AsyncStorage.
    switching?: boolean
}

export default function BusinessSelector({ businesses, selectedId, onChange, loading, switching }: BusinessSelectorProps) {
    const [open, setOpen] = useState(false)

    const selected = selectedId === 'all' ? null : businesses.find((b) => b.id === selectedId) || null
    const disabled = !!loading || !!switching

    return (
        <View>
            <TouchableOpacity
                onPress={() => !disabled && setOpen(true)}
                disabled={disabled}
                style={[styles.trigger, disabled && styles.triggerDisabled]}
            >
                {selected ? (
                    <View style={styles.avatarWrap}>
                        {selected.logoUrl ? (
                            <Image source={{ uri: selected.logoUrl }} style={styles.avatarImg} />
                        ) : (
                            getBusinessIcon(selected.type).icon
                        )}
                    </View>
                ) : (
                    <View style={styles.allAvatarWrap}>
                        <LayoutGrid size={14} color="#3B82F6" />
                    </View>
                )}

                <Text style={styles.triggerLabel} numberOfLines={1}>
                    {switching ? 'Switching...' : loading ? 'Loading...' : selected ? selected.name : 'All Businesses'}
                </Text>

                <ChevronDown size={14} color="#9CA3AF" />
            </TouchableOpacity>

            <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
                    <View style={styles.dropdown}>
                        <ScrollView>
                            <TouchableOpacity
                                onPress={() => {
                                    onChange('all')
                                    setOpen(false)
                                }}
                                style={styles.item}
                            >
                                <View style={styles.allAvatarWrap}>
                                    <LayoutGrid size={14} color="#3B82F6" />
                                </View>
                                <Text style={[styles.itemText, selectedId === 'all' && styles.itemTextSelected]}>
                                    All Businesses
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {businesses.length === 0 && (
                                <Text style={styles.emptyText}>No businesses yet</Text>
                            )}

                            {businesses.map((biz) => {
                                const { icon } = getBusinessIcon(biz.type)
                                const isSelected = selectedId === biz.id
                                return (
                                    <TouchableOpacity
                                        key={biz.id}
                                        onPress={() => {
                                            onChange(biz.id)
                                            setOpen(false)
                                        }}
                                        style={styles.item}
                                    >
                                        <View style={styles.avatarWrap}>
                                            {biz.logoUrl ? (
                                                <Image source={{ uri: biz.logoUrl }} style={styles.avatarImg} />
                                            ) : (
                                                icon
                                            )}
                                        </View>
                                        <Text
                                            style={[styles.itemText, isSelected && styles.itemTextSelected]}
                                            numberOfLines={1}
                                        >
                                            {biz.name}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingLeft: 8,
        paddingRight: 12,
        paddingVertical: 10,
        minWidth: 200,
    },
    triggerDisabled: { opacity: 0.6 },
    avatarWrap: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    allAvatarWrap: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    triggerLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', paddingTop: 120, paddingHorizontal: 16 },
    dropdown: {
        maxHeight: 320,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        paddingVertical: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
    itemText: { flex: 1, fontSize: 14, color: '#374151' },
    itemTextSelected: { color: '#2563EB', fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
    emptyText: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, color: '#9CA3AF' },
})

export type { BusinessOption }
