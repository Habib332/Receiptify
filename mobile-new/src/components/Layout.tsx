import { type ReactNode } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'

type Props = {
    children: ReactNode
}

// Top bar (logo + avatar) removed — navigation now lives entirely in the
// bottom tab bar (src/navigation/MainTabs.tsx), and the Profile tab covers
// what the avatar used to open. This component is now just the scrollable
// content area that wraps each tab's screen content.
export default function Layout({ children }: Props) {
    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {children}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
})