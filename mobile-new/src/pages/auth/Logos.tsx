// PLACEHOLDER — your web project imports MainLogo, GoogleLogo, and
// AppleLogo from '../../logo/*', but those files weren't included in
// this upload batch, so they aren't converted here. Drop your real
// logo components in and update the imports in the auth screens
// (SignIn.tsx, SignUp.tsx, ForgotPassword.tsx, ResetPassword.tsx).
//
// These stand-ins keep the screens compiling and visually reasonable
// in the meantime.
import { Text, View } from 'react-native'

export function ReceiptLogo({ size = 48 }: { size?: number }) {
    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size * 0.22,
                backgroundColor: '#2563EB',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: size * 0.42 }}>R</Text>
        </View>
    )
}

export function GoogleLogo() {
    return <Text style={{ fontSize: 16 }}>G</Text>
}

export function AppleLogo() {
    return <Text style={{ fontSize: 16 }}></Text>
}
