import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Layout from '../../components/Layout'
import Skeleton from '../../components/Skeleton'
import { colors } from '../../theme/colors'

// Full-screen loading placeholder for BusinessPage. Mirrors the real
// screen's structure 1:1 (pinned header, hero, 3 stat cards, search+filter
// row, toggle, list rows, tip banner) so there's no layout shift when the
// real data swaps in. Shown only for the initial load (businesses.length
// === 0 && loading) — not on subsequent search/filter refetches, since
// those already keep the previous list visible.
export default function BusinessSkeleton() {
    const insets = useSafeAreaInsets()

    return (
        <View style={styles.screen}>
            <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
                <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width={140} height={22} borderRadius={6} />
                    <Skeleton width={220} height={13} borderRadius={4} />
                </View>
                <Skeleton width={44} height={44} borderRadius={22} />
            </View>

            <Layout>
                {/* Hero */}
                <Skeleton width="100%" height={150} borderRadius={20} style={{ marginBottom: 20 }} />

                {/* Stats row — 3 equal cards matching statCard dims */}
                <View style={styles.statsRow}>
                    {[0, 1, 2].map((i) => (
                        <View key={i} style={styles.statCard}>
                            <Skeleton width={32} height={32} borderRadius={16} style={{ marginBottom: 8 }} />
                            <Skeleton width={70} height={11} borderRadius={4} style={{ marginBottom: 6 }} />
                            <Skeleton width={50} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                            <Skeleton width={60} height={10} borderRadius={4} />
                        </View>
                    ))}
                </View>

                {/* Search + filter row */}
                <View style={styles.controlsRow}>
                    <Skeleton width="100%" height={44} borderRadius={8} style={{ flex: 7 }} />
                    <Skeleton width="100%" height={44} borderRadius={8} style={{ flex: 3 }} />
                </View>

                {/* My/All Businesses toggle */}
                <Skeleton width="100%" height={44} borderRadius={8} style={{ marginBottom: 16 }} />

                {/* Business list rows */}
                <View style={styles.listCard}>
                    {[0, 1, 2, 3].map((i) => (
                        <View key={i} style={[styles.row, i === 0 && styles.rowFirst]}>
                            <Skeleton width={40} height={40} borderRadius={8} />
                            <View style={{ flex: 1, gap: 6 }}>
                                <Skeleton width="60%" height={14} borderRadius={4} />
                                <Skeleton width="35%" height={11} borderRadius={4} />
                            </View>
                            <Skeleton width={76} height={36} borderRadius={8} />
                        </View>
                    ))}
                </View>

                {/* Tip banner */}
                <Skeleton width="100%" height={76} borderRadius={16} />
            </Layout>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.white,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'stretch' },
    statCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray100,
        borderRadius: 16,
        padding: 14,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    listCard: {
        borderWidth: 1,
        borderColor: colors.gray100,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
    rowFirst: {
        borderTopWidth: 0,
    },
})