// Mirrors the web app's react-router-dom routes. Wire this up in your
// root stack, e.g.:
//
//   const Stack = createNativeStackNavigator<RootStackParamList>()
//
// Screens read navigation via `useNavigation<NativeStackNavigationProp<RootStackParamList>>()`
// and params via `useRoute<RouteProp<RootStackParamList, 'ScreenName'>>()`.
export type RootStackParamList = {
    SignIn: undefined
    SignUp: undefined
    ForgotPassword: undefined
    // token arrives as a deep-link query param on web
    // (?token=...); on mobile it's a deep-link param instead,
    // e.g. myapp://reset-password?token=...
    ResetPassword: { token?: string } | undefined
    AuthCallback: { code?: string; error?: string } | undefined
    SelectBusiness: undefined
    Dashboard: { businessId?: string } | undefined
    ScanReceipt: undefined
}
