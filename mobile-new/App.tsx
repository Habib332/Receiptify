import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SystemBars } from 'react-native-edge-to-edge'
import { View } from 'react-native'

import SignIn from './src/pages/auth/SignIn'
import SignUp from './src/pages/auth/SignUp'
import ForgotPassword from './src/pages/auth/ForgotPassword'
import ResetPassword from './src/pages/auth/ResetPassword'
import AuthCallback from './src/pages/auth/AuthCallback'
import ScanReview from './src/pages/scan/ScanReview'
import ScanBulkReview from './src/pages/scan/ScanBulkReview'
import AboutReceiptifyPage from './src/pages/aboutTheReceiptify/AboutReceiptifyPage'
import MainTabs from './src/components/MainTabs'
import { StackScreen } from 'react-native-screens'

// Screen names below map 1:1 to the web app's route paths (see the
// comment beside each). Layout.tsx, UploadModeToggle.tsx and
// AboutTheCreatorsPage.tsx navigate using these exact names — keep them
// in sync if you rename anything here.
//
// NOTE: Businesses, Dashboard, Scan, and AboutTheCreators now live inside
// the MainTabs bottom-tab navigator (src/navigation/MainTabs.tsx) instead
// of directly on this stack. Screens still nested here can navigate into
// them via navigation.navigate('MainTabs', { screen: 'Dashboard', params: {...} }).
export type RootStackParamList = {
    SignIn: undefined // '/', '/sign-in'
    SignUp: undefined // '/sign-up'
    ForgotPassword: undefined // '/forgot-password'
    ResetPassword: undefined // '/reset-password'
    AuthCallback: undefined // '/auth/callback'
    MainTabs: { screen?: string; params?: any } | undefined // Businesses / Dashboard / Scan / AboutTheCreators
    ScanReview: { receipt: any } // '/scan/review'
    ScanBulkReview: { receipts: any[] } // '/scan/bulk/review'
    AboutReceiptify: undefined // '/about-receiptify'
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
    return (
        <SafeAreaProvider>
            <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
                <SystemBars style="dark" />
                <NavigationContainer>
                    <Stack.Navigator
                        initialRouteName="SignIn"
                        screenOptions={{ headerShown: false }}
                    >
                        <Stack.Screen name="SignIn" component={SignIn} />
                        <Stack.Screen name="SignUp" component={SignUp} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
                        <Stack.Screen name="ResetPassword" component={ResetPassword} />
                        <Stack.Screen name="AuthCallback" component={AuthCallback} />
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="ScanReview" component={ScanReview} />
                        <Stack.Screen name="ScanBulkReview" component={ScanBulkReview} />
                        <Stack.Screen name="AboutReceiptify" component={AboutReceiptifyPage} />
                    </Stack.Navigator>
                </NavigationContainer>
            </View>
        </SafeAreaProvider>
    )
}