import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Layout from '../../components/Layout'
import Skeleton from '../../components/Skeleton'

// Full-screen loading placeholder for Dashboard. Mirrors the real screen's
// structure 1:1 (pinned header, hero, 3 stat cards, business selector +
// search + filter/export row, receipts table header + rows, secure card)
// so there's no layout shift when real data swaps in. Shown only on the
// very first load (no receipts/stats yet) — subsequent business switches
// or filter refetches keep the existing table visible with its own
// inline "Switching business... / Loading receipts..." row instead.
export default function DashboardSkeleton() {
    const insets = useSafeAreaInsets()

    return (
        <View style={styles.screen}>
            <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
                <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width={110} height={22} borderRadius={6} />
                    <Skeleton width={240} height={13} borderRadius={4} />
                </View>
                <Skeleton width={44} height={44} borderRadius={22} />
            </View>

            <Layout>
                {/* Hero */}
                <Skeleton width="100%" height={160} borderRadius={20} style={{ marginBottom: 20 }} />

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

                {/* Business selector */}
                <Skeleton width="100%" height={44} borderRadius={12} style={{ marginBottom: 12 }} />

                {/* Search + filter icon row */}
                <View style={styles.searchRow}>
                    <Skeleton width="100%" height={44} borderRadius={12} style={{ flex: 1 }} />
                    <Skeleton width={44} height={44} borderRadius={12} />
                </View>

                {/* Filter / Export buttons row */}
                <View style={styles.actionsRow}>
                    <Skeleton width="100%" height={44} borderRadius={10} style={{ flex: 1 }} />
                    <Skeleton width="100%" height={44} borderRadius={10} style={{ flex: 1 }} />
                </View>

                {/* Section title */}
                <Skeleton width={130} height={14} borderRadius={4} style={{ marginBottom: 12 }} />

                {/* Receipts table */}
                <View style={styles.tableWrap}>
                    <View style={styles.tableHeaderRow}>
                        <Skeleton width={60} height={11} borderRadius={4} />
                        <Skeleton width={70} height={11} borderRadius={4} />
                        <Skeleton width={70} height={11} borderRadius={4} />
                        <Skeleton width={60} height={11} borderRadius={4} />
                    </View>
                    {[0, 1, 2, 3, 4].map((i) => (
                        <View key={i} style={[styles.tableRow, i === 4 && styles.tableRowLast]}>
                            <Skeleton width={70} height={13} borderRadius={4} />
                            <Skeleton width={90} height={13} borderRadius={4} />
                            <Skeleton width={80} height={13} borderRadius={4} />
                            <Skeleton width={60} height={22} borderRadius={999} />
                        </View>
                    ))}
                </View>

                {/* Secure & Private card */}
                <Skeleton width="100%" height={72} borderRadius={16} />
            </Layout>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#fff',
    },
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
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'stretch' },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 16,
        padding: 14,
    },
    searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
    actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    tableWrap: {
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    tableRowLast: {
        borderBottomWidth: 0,
    },
})