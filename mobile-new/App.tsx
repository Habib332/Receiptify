import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context' 
import { SystemBars } from 'react-native-edge-to-edge'

import SignIn from './src/pages/auth/SignIn'
import SignUp from './src/pages/auth/SignUp'
import ForgotPassword from './src/pages/auth/ForgotPassword'
import ResetPassword from './src/pages/auth/ResetPassword'
import AuthCallback from './src/pages/auth/AuthCallback'
import ScanUpload from './src/pages/scan/ScanUpload'
import ScanBulkUpload from './src/pages/scan/ScanBulkUpload'
import ScanReview from './src/pages/scan/ScanReview'
import ScanBulkReview from './src/pages/scan/ScanBulkReview'
import BusinessPage from './src/pages/business/BusinessPage'
import Dashboard from './src/pages/dashboard/Dashboard'
import AboutTheCreatorsPage from './src/pages/aboutTheCreators/AboutTheCreatorsPage'
import AboutReceiptifyPage from './src/pages/aboutTheReceiptify/AboutReceiptifyPage'

// Screen names below map 1:1 to the web app's route paths (see the
// comment beside each). Layout.tsx, UploadModeToggle.tsx and
// AboutTheCreatorsPage.tsx navigate using these exact names — keep them
// in sync if you rename anything here.
export type RootStackParamList = {
    SignIn: undefined // '/', '/sign-in'
    SignUp: undefined // '/sign-up'
    ForgotPassword: undefined // '/forgot-password'
    ResetPassword: undefined // '/reset-password'
    AuthCallback: undefined // '/auth/callback'
    ScanUpload: undefined // '/scan'
    ScanBulkUpload: undefined // '/scan/bulk'
    ScanReview: { receipt: any } // '/scan/review'
    ScanBulkReview: { receipts: any[] } // '/scan/bulk/review'
    SelectBusiness: undefined // '/select-business'
    Dashboard: { businessId?: string } // '/dashboard'
    AboutTheCreators: undefined // '/about-the-creators'
    AboutReceiptify: undefined // '/about-receiptify'
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
    return (
        <SafeAreaProvider>
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
                <Stack.Screen name="ScanUpload" component={ScanUpload} />
                <Stack.Screen name="ScanBulkUpload" component={ScanBulkUpload} />
                <Stack.Screen name="ScanReview" component={ScanReview} />
                <Stack.Screen name="ScanBulkReview" component={ScanBulkReview} />
                <Stack.Screen name="SelectBusiness" component={BusinessPage} />
                <Stack.Screen name="Dashboard" component={Dashboard} />
                <Stack.Screen name="AboutTheCreators" component={AboutTheCreatorsPage} />
                <Stack.Screen name="AboutReceiptify" component={AboutReceiptifyPage} />
            </Stack.Navigator>
        </NavigationContainer>
        </SafeAreaProvider>
    )
}
