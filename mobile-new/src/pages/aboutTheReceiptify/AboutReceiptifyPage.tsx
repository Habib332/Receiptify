import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import Layout from '../../components/Layout'

export default function AboutReceiptifyPage() {
    const stats = [
        {
            label: 'Developers',
            value: '2',
            sub: 'Project Members',
            bg: '#eff6ff',
            color: '#2563eb',
        },
        {
            label: 'Technologies',
            value: '8+',
            sub: 'Modern Stack',
            bg: '#f0fdf4',
            color: '#16a34a',
        },
    ]

    const technologies = [
        'React',
        'TypeScript',
        'Node.js',
        'Express',
        'PostgreSQL',
        'Supabase',
        'Tailwind CSS',
        'OCR',
    ]

    return (
        <Layout>
            {/* Hero */}
            <View style={styles.hero}>
                <Text style={styles.eyebrow}>ABOUT RECEIPTIFY</Text>
                <Text style={styles.heroTitle}>
                    Built by students,
                    <Text style={styles.heroTitleAccent}> designed for businesses.</Text>
                </Text>
                <Text style={styles.heroBody}>
                    Receiptify is a modern receipt management platform that helps
                    businesses organize, scan and manage receipts effortlessly.
                    Our goal is to replace manual bookkeeping with a fast,
                    beautiful and intelligent experience.
                </Text>
            </View>

            {/* Statistics */}
            <View style={styles.statsGrid}>
                {stats.map((stat) => (
                    <View key={stat.label} style={styles.statCard}>
                        <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={stat.color} strokeWidth={1.8}>
                                <Path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3v18" />
                            </Svg>
                        </View>

                        <Text style={styles.statLabel}>{stat.label}</Text>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statSub}>{stat.sub}</Text>
                    </View>
                ))}
            </View>

            {/* About Project */}
            <View style={styles.aboutCard}>
                <Text style={styles.aboutEyebrow}>ABOUT RECEIPTIFY</Text>
                <Text style={styles.aboutTitle}>What is Receiptify?</Text>

                <Text style={styles.aboutBody}>
                    Receiptify is a modern receipt management platform designed to
                    simplify the way businesses organize financial records.
                    Instead of manually entering receipt information,
                    users can upload receipts, manage businesses,
                    track spending and keep all financial documents
                    in one organized dashboard.
                </Text>

                <Text style={[styles.aboutBody, styles.aboutBodySpaced]}>
                    The project was developed as a university software engineering
                    project using modern web technologies with a strong focus on
                    clean user experience, responsive design and scalable architecture.
                </Text>

                {/* Technology Stack */}
                <View style={styles.techWrap}>
                    {technologies.map((tech) => (
                        <View key={tech} style={styles.techPill}>
                            <Text style={styles.techPillText}>{tech}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Layout>
    )
}

const styles = StyleSheet.create({
    hero: {
        backgroundColor: 'rgba(239,246,255,0.6)',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 28,
        marginBottom: 24,
    },
    eyebrow: {
        fontSize: 11,
        letterSpacing: 3,
        color: '#2563eb',
        fontWeight: '600',
        marginBottom: 8,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 32,
    },
    heroTitleAccent: {
        color: '#2563eb',
    },
    heroBody: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 16,
        lineHeight: 22,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        flexBasis: '47%',
        flexGrow: 1,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderRadius: 16,
        padding: 20,
    },
    statIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    statLabel: {
        fontSize: 12,
        color: '#9ca3af',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginTop: 4,
    },
    statSub: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
    },
    aboutCard: {
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
    },
    aboutEyebrow: {
        fontSize: 11,
        letterSpacing: 3,
        color: '#9ca3af',
        fontWeight: '600',
        marginBottom: 12,
    },
    aboutTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    aboutBody: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 24,
    },
    aboutBodySpaced: {
        marginTop: 20,
    },
    techWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 32,
    },
    techPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#eff6ff',
    },
    techPillText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#2563eb',
    },
})
