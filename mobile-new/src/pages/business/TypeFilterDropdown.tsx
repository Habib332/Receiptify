import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ScrollView } from 'react-native'
import { getBusinessIcon } from './BusinessIcons'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'

type TypeFilterDropdownProps = {
    value: string
    options: string[]
    onChange: (value: string) => void
}

const gridIconPath =
    'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z'

// Custom dropdown (mirrors the web version's custom panel — RN's native
// pickers can't be styled to match the app's rounded/icon-per-option design
// either). Instead of a document mousedown listener for "click outside",
// this uses a full-screen transparent Modal whose backdrop press closes it.
export default function TypeFilterDropdown({ value, options, onChange }: TypeFilterDropdownProps) {
    const [open, setOpen] = useState(false)

    const isAllTypes = value === 'All Types'
    const activeIcon = !isAllTypes ? getBusinessIcon(value) : null

    return (
         <View style={{ flexShrink: 1, minWidth: 0, width: '100%' }}>
            <TouchableOpacity
    onPress={() => setOpen(true)}
    style={[styles.trigger, open && styles.triggerOpen]}
>
    <Text style={styles.triggerText} numberOfLines={1}>
        {isAllTypes ? 'Types' : value}
    </Text>
    <Icon
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
        size={16}
        color={colors.gray400}
        strokeWidth={1.8}
    />
</TouchableOpacity>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                    <View style={styles.panel}>
                        <ScrollView>
                            <TouchableOpacity
                                onPress={() => {
                                    onChange('All Types')
                                    setOpen(false)
                                }}
                                style={[styles.option, isAllTypes && styles.optionActive]}
                            >
                                <Icon d={gridIconPath} size={16} color={colors.gray400} strokeWidth={1.8} />
                                <Text style={[styles.optionText, isAllTypes && styles.optionTextActive]}>
                                    All Types
                                </Text>
                                {isAllTypes && (
                                    <Icon d="M4.5 12.75l6 6 9-13.5" size={16} color={colors.blue600} strokeWidth={2} />
                                )}
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {options.map((opt) => {
                                const { bgColor, color, icon } = getBusinessIcon(opt)
                                const active = value === opt
                                return (
                                    <TouchableOpacity
                                        key={opt}
                                        onPress={() => {
                                            onChange(opt)
                                            setOpen(false)
                                        }}
                                        style={[styles.option, active && styles.optionActive]}
                                    >
                                        <View style={[styles.optionIconBadge, { backgroundColor: bgColor }]}>
                                            {icon}
                                        </View>
                                        <Text
                                            style={[styles.optionText, active && styles.optionTextActive]}
                                            numberOfLines={1}
                                        >
                                            {opt}
                                        </Text>
                                        {active && (
                                            <Icon d="M4.5 12.75l6 6 9-13.5" size={16} color={colors.blue600} strokeWidth={2} />
                                        )}
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    width: '100%',
},
    triggerOpen: {
        borderColor: colors.blue300,
    },
    activeIconWrap: {
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    triggerText: {
        flex: 1,
        fontSize: 14,
        color: colors.gray700,
    },
    backdrop: {
        flex: 1,
        backgroundColor: colors.overlay20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    panel: {
        width: '100%',
        maxWidth: 320,
        maxHeight: 384,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray100,
        borderRadius: 12,
        padding: 6,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    optionActive: {
        backgroundColor: colors.blue50,
    },
    optionText: {
        flex: 1,
        fontSize: 14,
        color: colors.gray600,
    },
    optionTextActive: {
        color: colors.blue700,
        fontWeight: '600',
    },
    optionIconBadge: {
        width: 20,
        height: 20,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
        marginVertical: 4,
    },
})
