import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Route this at /auth/callback and set FRONTEND_OAUTH_CALLBACK_URL in the
// backend .env to match, e.g. http://localhost:5173/auth/callback

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function AuthCallback() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [error, setError] = useState('')

    useEffect(() => {
        const code = searchParams.get('code')
        const oauthError = searchParams.get('error')

        if (oauthError) {
            setError('Google sign-in was cancelled or failed. Please try again.')
            return
        }

        if (!code) {
            setError('Missing sign-in code. Please try again.')
            return
        }

        const exchange = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/auth/google/exchange`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                })

                const data = await res.json()

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Sign-in failed')
                }

                const token = data.data?.identityToken

                if (token) {
                    sessionStorage.setItem('token', token)
                }

                // Same as password login: identityToken has no business selected
                // yet, so route to business selection/creation next.
                navigate('/select-business')
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong')
            }
        }

        exchange()
    }, [searchParams, navigate])

    if (error) {
        return (
            <div className="h-screen w-full bg-white flex flex-col items-center justify-center gap-3">
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                </p>
                <button
                    onClick={() => navigate('/sign-in')}
                    className="text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors"
                >
                    Back to sign in
                </button>
            </div>
        )
    }

    return (
        <div className="h-screen w-full bg-white flex items-center justify-center">
            <p className="text-xs text-gray-500">Signing you in...</p>
        </div>
    )
}