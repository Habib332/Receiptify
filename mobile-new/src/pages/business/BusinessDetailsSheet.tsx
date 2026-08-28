import { View, Text, TouchableOpacity, Pressable, StyleSheet, Modal, Image } from 'react-native'
import { getBusinessIcon } from './BusinessIcons'
import Icon from '../../components/Icon'
import { colors } from '../../theme/colors'

type Business = {
    id: string
    name: string
    type: string
    address: string
    phone: string
    receipts: number
    totalSpent: string
    logoUrl?: string | null
    userRole?: string | null
}

type Props = {
    business: Business
    hasPendingRequest: boolean
    onClose: () => void
    onViewReceipts: (biz: Business) => void
    onEdit: (biz: Business) => void
    onViewTeam: (biz: Business) => void
    onLeave: (biz: Business) => void
    onDelete: (biz: Business) => void
    onJoin: (biz: Business) => void
}

// Bottom sheet opened by tapping a business row. Replaces the old
// three-dot dropdown menu with a single place that shows the business's
// full details (icon, name, type, address, phone, role) alongside every
// action that used to live in the row itself or the menu: joining,
// viewing receipts, editing, viewing the team, leaving, and deleting.
// Leave/Join/Delete visibility rules match the ones previously enforced
// inline on the row in BusinessPage.
export default function BusinessDetailsSheet({
    business,
    hasPendingRequest,
    onClose,
    onViewReceipts,
    onEdit,
    onViewTeam,
    onLeave,
    onDelete,
    onJoin,
}: Props) {
    const { bgColor, color, icon } = getBusinessIcon(business.type)
    const hasJoined = !!business.userRole
    const canLeave = business.userRole === 'manager' || business.userRole === 'staff'
    const joinDisabled = hasJoined || hasPendingRequest

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={() => {}}>
                    <View style={styles.grabber} />

                    <View style={styles.header}>
                        <View style={[styles.headerIcon, { backgroundColor: business.logoUrl ? colors.gray100 : bgColor }]}>
                            {business.logoUrl ? (
                                <Image source={{ uri: business.logoUrl }} style={styles.headerIconImage} />
                            ) : (
                                icon
                            )}
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.headerName} numberOfLines={1}>{business.name}</Text>
                            <Text style={styles.headerType}>{business.type}</Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Icon d="M6 18L18 6M6 6l12 12" size={16} color={colors.gray400} strokeWidth={1.8} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.metaBlock}>
                        <View style={styles.metaLine}>
                            <Icon
                                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                                size={14}
                                color={colors.gray500}
                                strokeWidth={1.8}
                            />
                            <Text style={styles.metaText}>{business.address}</Text>
                        </View>
                        <View style={styles.metaLine}>
                            <Icon
                                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                                size={14}
                                color={colors.gray500}
                                strokeWidth={1.8}
                            />
                            <Text style={styles.metaText}>{business.phone}</Text>
                        </View>
                        {hasJoined && (
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleBadgeText}>{business.userRole}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.actionRow}
                            onPress={() => {
                                onClose()
                                onViewReceipts(business)
                            }}
                        >
                            <Icon
                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6 15.75h-6a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25h4.5l5.25 5.25v9.75a2.25 2.25 0 01-2.25 2.25z"
                                size={18}
                                color={colors.blue700}
                                strokeWidth={1.8}
                            />
                            <Text style={styles.actionTextBlue}>View receipts</Text>
                        </TouchableOpacity>

                        {!hasJoined && (
                            <TouchableOpacity
                                style={styles.actionRow}
                                disabled={joinDisabled}
                                onPress={() => {
                                    onClose()
                                    onJoin(business)
                                }}
                            >
                                <Icon d="M12 4.5v15m7.5-7.5h-15" size={18} color={joinDisabled ? colors.gray400 : colors.blue700} strokeWidth={1.8} />
                                <Text style={joinDisabled ? styles.actionTextDisabled : styles.actionTextBlue}>
                                    {hasPendingRequest ? 'Request pending' : 'Join business'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.actionRow}
                            onPress={() => {
                                onClose()
                                onEdit(business)
                            }}
                        >
                            <Icon
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                                size={18}
                                color={colors.gray500}
                                strokeWidth={1.8}
                            />
                            <Text style={styles.actionText}>Edit details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionRow}
                            onPress={() => {
                                onClose()
                                onViewTeam(business)
                            }}
                        >
                            <Icon
                                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.94-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.06 2.772m0 0A6.001 6.001 0 006 18.719m6-15.219a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5zm-8.25 5.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                                size={18}
                                color={colors.gray500}
                                strokeWidth={1.8}
                            />
                            <Text style={styles.actionText}>View team</Text>
                        </TouchableOpacity>

                        {canLeave && (
                            <TouchableOpacity
                                style={styles.actionRow}
                                onPress={() => {
                                    onClose()
                                    onLeave(business)
                                }}
                            >
                                <Icon
                                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                                    size={18}
                                    color={colors.orange600}
                                    strokeWidth={1.8}
                                />
                                <Text style={styles.actionTextOrange}>Leave business</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.actionRow}
                            onPress={() => {
                                onClose()
                                onDelete(business)
                            }}
                        >
                            <Icon
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                size={18}
                                color={colors.red500}
                                strokeWidth={1.8}
                            />
                            <Text style={styles.actionTextRed}>Delete business</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 28,
    },
    grabber: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gray200,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    headerIconImage: {
        width: '100%',
        height: '100%',
    },
    headerText: {
        flex: 1,
        minWidth: 0,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray900,
    },
    headerType: {
        fontSize: 13,
        color: colors.gray400,
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaBlock: {
        marginTop: 16,
        gap: 6,
    },
    metaLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        color: colors.gray500,
        flexShrink: 1,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        marginTop: 4,
        backgroundColor: colors.green50,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.green700,
        textTransform: 'capitalize',
    },
    actions: {
        marginTop: 20,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
    },
    actionText: {
        fontSize: 15,
        color: colors.gray700,
    },
    actionTextBlue: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.blue700,
    },
    actionTextOrange: {
        fontSize: 15,
        color: colors.orange600,
    },
    actionTextRed: {
        fontSize: 15,
        color: colors.red500,
    },
    actionTextDisabled: {
        fontSize: 15,
        color: colors.gray400,
    },
    divider: {
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
        marginVertical: 4,
    },
})